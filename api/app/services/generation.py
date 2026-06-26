from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
from typing import Any
from anthropic import Anthropic
from app.core.config import get_settings
from app.models.generation import (
    CategoryPlan,
    GenerateRequest,
    GeneratedQuestionSet,
    QuestionDraft,
)

# Generate in small batches so long exams never hit the output-token ceiling,
# the per-band counts come out exact, and batches run concurrently.
MAX_QUESTIONS_PER_CALL = 6
MAX_PARALLEL_CALLS = 5
# Per-batch output cap. Kept under the SDK's ~10-minute non-streaming guard
# (which trips at higher max_tokens) — a 6-question batch fits easily.
BATCH_MAX_TOKENS = 16000

SYSTEM_PROMPT = (
    "You are an expert exam author for university instructors. You write ORIGINAL, "
    "exam-ready questions grounded strictly in the provided course material, each with "
    "a complete answer key.\n"
    "Rules:\n"
    "- Ground every question STRICTLY in the supplied material. Use only concepts, "
    "terminology, notation, and examples that actually appear in it. Do NOT pull in "
    "outside knowledge of the topic, and do not invent facts beyond the material.\n"
    "- Mirror the instructor's style as shown in the material — match the phrasing, "
    "format, notation, and the kind/difficulty of problems they use (especially any "
    "past-exam or worked examples present). The questions should feel like they came "
    "from this instructor's own exams.\n"
    "- Do not copy any past-exam text verbatim — produce fresh questions in that style.\n"
    "- For mcq: put 3-5 plausible choices in `options`, set `answer` to the exact text of "
    "the correct choice, give a one-paragraph `explanation`, and leave `rubric` empty.\n"
    "- For short_answer: leave `options` empty, put a concise model answer in `answer`, "
    "and list concrete grading criteria in `rubric`.\n"
    "- ALWAYS fill `explanation` with a brief non-empty rationale for the answer, for "
    "every question type.\n"
    "- Set `learning_objective` to a one-sentence statement of what the question tests."
)


@lru_cache
def get_anthropic_client() -> Anthropic:
    settings = get_settings()
    return Anthropic(api_key=settings.anthropic_api_key)


def build_context(chunks: list[dict[str, Any]]) -> str:
    blocks: list[str] = []
    for index, chunk in enumerate(chunks, start=1):
        blocks.append(f"[Source {index}]\n{chunk['content']}")
    return "\n\n".join(blocks)


def _build_batches(request: GenerateRequest) -> list[tuple[CategoryPlan, str, int]]:
    """Split the request into (topic, difficulty band, count) batches, each no
    larger than MAX_QUESTIONS_PER_CALL."""
    batches: list[tuple[CategoryPlan, str, int]] = []
    for plan in request.plans:
        for band, count in (("Easy", plan.easy), ("Medium", plan.medium), ("Hard", plan.hard)):
            remaining = count
            while remaining > 0:
                n = min(remaining, MAX_QUESTIONS_PER_CALL)
                batches.append((plan, band, n))
                remaining -= n
    return batches


def _build_batch_prompt(
    request: GenerateRequest, plan: CategoryPlan, band: str, count: int, context: str
) -> str:
    types = ", ".join(request.types)
    parts = [
        f"Generate EXACTLY {count} {band}-difficulty exam question(s) on the topic "
        f'"{plan.name}".',
        f"Question types to use (mix across them): {types}.",
        f'Set every question\'s `topic` to "{plan.name}" verbatim and its `difficulty` to '
        f'"{band}".',
    ]
    if request.instructions:
        parts.append(f"Additional instructions: {request.instructions}")
    parts.append("\nCourse material:\n" + context)
    return "\n".join(parts)


def _generate_batch(
    request: GenerateRequest, plan: CategoryPlan, band: str, count: int, context: str
) -> list[QuestionDraft]:
    settings = get_settings()
    client = get_anthropic_client()

    response = client.messages.parse(
        model=settings.generation_model,
        max_tokens=min(settings.generation_max_tokens, BATCH_MAX_TOKENS),
        thinking={"type": "adaptive"},
        system=SYSTEM_PROMPT,
        messages=[
            {"role": "user", "content": _build_batch_prompt(request, plan, band, count, context)}
        ],
        output_format=GeneratedQuestionSet,
    )

    if response.stop_reason == "refusal":
        raise RuntimeError("Question generation was refused by the safety system")
    if response.stop_reason == "max_tokens":
        raise RuntimeError(
            f"Hit the output token limit on {plan.name}/{band} — raise GENERATION_MAX_TOKENS."
        )

    result = response.parsed_output
    if result is None:
        raise RuntimeError(f"Model did not return a parseable batch for {plan.name}/{band}")

    return result.questions


def _build_regenerate_prompt(
    question: dict[str, Any], instructions: str | None, context: str
) -> str:
    parts = [
        f'The instructor wants to REPLACE this {question["type"]} question on the topic '
        f'"{question["topic"]}":',
        f'"""\n{question["prompt"]}\n"""',
        "Write a genuinely DIFFERENT question — a different scenario, structure, or "
        "sub-skill. Do NOT just reuse the same setup with different numbers; it should "
        "feel like a distinct problem.",
        f'By default keep the same topic ("{question["topic"]}"), difficulty '
        f'({question["difficulty"]}), and type ({question["type"]}). BUT if the '
        "instructor's guidance asks to change the difficulty or topic, follow it and set "
        "the `difficulty`, `topic`, and `question_type` fields to match what you produced.",
        "Set `difficulty` to one of: Easy, Medium, Hard. Ground the question in the "
        "material below.",
    ]
    if instructions and instructions.strip():
        parts.append(
            "MOST IMPORTANT — follow the instructor's guidance, even if it means a "
            f"different topic, harder difficulty, or different style: {instructions.strip()}"
        )
    parts.append("\nCourse material:\n" + context)
    return "\n".join(parts)


def regenerate_one(
    question: dict[str, Any], instructions: str | None, chunks: list[dict[str, Any]]
) -> QuestionDraft:
    settings = get_settings()
    client = get_anthropic_client()

    # Bounded thinking budget (not adaptive) so a deep rewrite can't consume the
    # whole token cap and truncate the output — one question needs little thinking.
    response = client.messages.parse(
        model=settings.generation_model,
        max_tokens=min(settings.generation_max_tokens, BATCH_MAX_TOKENS),
        thinking={"type": "enabled", "budget_tokens": 4000},
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": _build_regenerate_prompt(
                    question, instructions, build_context(chunks)
                ),
            }
        ],
        output_format=QuestionDraft,
    )

    if response.stop_reason == "refusal":
        raise RuntimeError("Question regeneration was refused by the safety system")
    if response.stop_reason == "max_tokens":
        raise RuntimeError("Hit the output token limit — try shorter instructions.")

    result = response.parsed_output
    if result is None:
        raise RuntimeError("Model did not return a parseable question")

    return result


def generate_questions(
    request: GenerateRequest, chunks: list[dict[str, Any]]
) -> GeneratedQuestionSet:
    context = build_context(chunks)
    batches = _build_batches(request)
    if not batches:
        return GeneratedQuestionSet(questions=[])

    # Run batches concurrently; each call is small so it never truncates.
    with ThreadPoolExecutor(max_workers=MAX_PARALLEL_CALLS) as executor:
        results = executor.map(
            lambda b: _generate_batch(request, b[0], b[1], b[2], context), batches
        )
        questions: list[QuestionDraft] = []
        for batch_questions in results:
            questions.extend(batch_questions)

    return GeneratedQuestionSet(questions=questions)
