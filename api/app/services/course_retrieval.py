from typing import Any, cast
from uuid import UUID
from app.core.config import get_settings
from app.core.supabase import get_supabase_client
from app.services.embeddings import generate_embeddings

# Used when the caller gives no topics: a generic probe that pulls the most
# salient chunks across the course rather than nothing.
DEFAULT_QUERIES = ["key concepts, definitions, and important results"]

def retrieve_course_context(course_id: UUID, topics: list[str]) -> list[dict[str, Any]]:
    """Fan retrieval across every material in the course, one query per topic,
    de-duplicated by chunk id. Each topic contributes its own top-k chunks so a
    multi-topic exam is grounded on all of them, not just the dominant one."""
    settings = get_settings()
    supabase = get_supabase_client()

    queries = [topic.strip() for topic in topics if topic.strip()] or DEFAULT_QUERIES
    embeddings = generate_embeddings(queries)

    chunks_by_id: dict[str, dict[str, Any]] = {}
    for embedding in embeddings:
        response = (
            supabase.rpc(
                "match_material_chunks_for_course",
                {
                    "target_course_id": str(course_id),
                    "query_embedding": embedding,
                    "match_count": settings.generation_retrieval_k,
                },
            )
            .execute()
        )
        for row in cast(list[dict[str, Any]], response.data or []):
            # Drop off-topic chunks so unrelated material can't ground generation.
            distance = row.get("distance")
            if distance is not None and distance > settings.generation_max_distance:
                continue
            chunks_by_id[str(row["id"])] = row

    return list(chunks_by_id.values())
