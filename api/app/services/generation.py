from functools import lru_cache
from typing import Any
from anthropic import Anthropic
from app.core.config import get_settings
from app.models.generation import GenerateRequest, GeneratedQuestionSet

SYSTEM_PROMPT = (
    "You are an expert exam author for university instructors. You write ORIGINAL, "
    "exam-ready questions grounded strictly in the provided course material, each with "
    "a complete answer key.\n"
    "These questions form a POOL for an adaptive exam, so spread them evenly across the "
    "requested difficulty bands and label each question's band accurately — the exam "
    "engine picks questions by difficulty at runtime based on the student's performance.\n"
    "Rules:\n"
    "- Ground every question in the supplied material. Do not invent facts beyond it, "
    "and do not copy any past-exam text verbatim — produce fresh questions.\n"
    "- Honor the requested question types and topics, and spread questions across the "
    "requested types and difficulty bands.\n"
    "- For mcq: put 3-5 plausible choices in `options`, set `answer` to the exact text of "
    "the correct choice, give a one-paragraph `explanation`, and leave `rubric` empty.\n"
    "- For short_answer: leave `options` empty, put a concise model answer in `answer`, "
    "and list concrete grading criteria in `rubric`.\n"
    "- Set `topic` on every question, and set `difficulty` to one of the requested bands."
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
    difficulties = ", ".join(request.difficulties) if request.difficulties else "Medium"
    parts = [
        f"Generate a question pool of {request.num_questions} exam questions.",
        f"Question types to use: {types}.",
        f"Difficulty bands to cover (spread questions evenly across these): {difficulties}.",
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
