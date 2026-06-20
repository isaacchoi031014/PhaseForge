from functools import lru_cache
from typing import Any
from anthropic import Anthropic
from app.core.config import get_settings
from app.models.generation import GenerateRequest, GeneratedQuestionSet

SYSTEM_PROMPT = (
    "You are an expert exam author for university instructors. You write ORIGINAL, "
    "exam-ready questions grounded strictly in the provided course material, each with "
    "a complete answer key.\n"
    "Rules:\n"
    "- Ground every question in the supplied material. Do not invent facts beyond it, "
    "and do not copy any past-exam text verbatim — produce fresh questions.\n"
    "- Honor the requested question types, difficulty, and topics. If multiple types are "
    "requested, spread questions across them.\n"
    "- For mcq: put 3-5 plausible choices in `options`, set `answer` to the exact text of "
    "the correct choice, give a one-paragraph `explanation`, and leave `rubric` empty.\n"
    "- For short_answer / essay: leave `options` empty, put a model answer in `answer`, "
    "and list concrete grading criteria in `rubric`.\n"
    "- Set `topic` and `difficulty` on every question."
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

def build_user_prompt(request: GenerateRequest, context: str) -> str:
    topics = ", ".join(request.topics) if request.topics else "any salient topics in the material"
    types = ", ".join(request.types)
    parts = [
        f"Generate {request.num_questions} exam questions.",
        f"Question types to use: {types}.",
        f"Difficulty: {request.difficulty}.",
        f"Topics to cover: {topics}.",
    ]
    if request.instructions:
        parts.append(f"Additional instructions: {request.instructions}")
    parts.append("\nCourse material:\n" + context)
    return "\n".join(parts)

def generate_questions(
    request: GenerateRequest, chunks: list[dict[str, Any]]
) -> GeneratedQuestionSet:
    settings = get_settings()
    client = get_anthropic_client()

    response = client.messages.parse(
        model=settings.generation_model,
        max_tokens=settings.generation_max_tokens,
        thinking={"type": "adaptive"},
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": build_user_prompt(request, build_context(chunks))}],
        output_format=GeneratedQuestionSet,
    )

    if response.stop_reason == "refusal":
        raise RuntimeError("Question generation was refused by the safety system")

    result = response.parsed_output
    if result is None:
        raise RuntimeError("Model did not return a parseable question set")

    return result
