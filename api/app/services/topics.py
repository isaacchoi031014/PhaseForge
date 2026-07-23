from typing import Any, cast
from uuid import UUID
from app.core.config import get_settings
from app.core.supabase import get_supabase_client
from app.models.topics import SuggestedTopics
from app.services.generation import get_anthropic_client

# Safety bound on prompt size for a single material — topic extraction doesn't
# need the whole document, and this keeps cost/latency predictable even for an
# unusually long lecture deck.
MAX_TOPIC_SOURCE_CHARS = 40_000

SYSTEM_PROMPT = (
    "You identify the distinct topics/units covered in a piece of course material, "
    "so an instructor can organize an exam question bank by topic.\n"
    "Rules:\n"
    "- Topic names should read like course units an instructor would recognize, e.g. "
    "'Binary Search Trees', 'Newton's Laws of Motion', 'Supply and Demand'.\n"
    "- Keep each name short (2-5 words), Title Case, no numbering or bullet punctuation.\n"
    "- The instructor's EXISTING topics are listed below — do not repeat or closely "
    "paraphrase any of them. Only propose topics that are genuinely new.\n"
    "- Propose at most 12 topics. If the material doesn't clearly contain any topic "
    "beyond what's already listed, return an empty list — do not force it.\n"
)


def _build_prompt(material_text: str, existing_topics: list[str]) -> str:
    existing_block = "\n".join(f"- {t}" for t in existing_topics) or "(none yet)"
    excerpt = material_text[:MAX_TOPIC_SOURCE_CHARS]
    return (
        f"Existing topics for this course:\n{existing_block}\n\n"
        f"Course material:\n{excerpt}"
    )


def suggest_new_topics(material_text: str, existing_topics: list[str]) -> list[str]:
    """Asks Claude for topics in `material_text` not already covered by
    `existing_topics`. Returns a de-duplicated (case-insensitive) list of new
    topic names — empty if the model found nothing new or was refused."""
    if not material_text.strip():
        return []

    settings = get_settings()
    client = get_anthropic_client()
    response = client.messages.parse(
        model=settings.generation_model,
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": _build_prompt(material_text, existing_topics)}],
        output_format=SuggestedTopics,
    )

    if response.stop_reason == "refusal":
        return []
    result = response.parsed_output
    if result is None:
        return []

    seen = {t.strip().lower() for t in existing_topics}
    new_topics: list[str] = []
    for name in result.topics:
        cleaned = name.strip()
        key = cleaned.lower()
        if not cleaned or key in seen:
            continue
        seen.add(key)
        new_topics.append(cleaned)
    return new_topics


def suggest_and_save_topics_for_material(course_id: UUID, material_text: str) -> list[str]:
    """Suggests new topics for `course_id` from one material's extracted text and
    inserts them as categories. Best-effort by design — callers should catch and
    log, never let this fail the ingestion job it runs alongside."""
    supabase = get_supabase_client()
    existing_response = (
        supabase.table("categories").select("name").eq("course_id", str(course_id)).execute()
    )
    existing_names = [
        row["name"] for row in cast(list[dict[str, Any]], existing_response.data or [])
    ]

    new_topics = suggest_new_topics(material_text, existing_names)
    if new_topics:
        supabase.table("categories").insert(
            [{"course_id": str(course_id), "name": name} for name in new_topics]
        ).execute()
    return new_topics
