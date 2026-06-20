from typing import Any, TypeAlias, cast
from uuid import UUID
from app.core.supabase import get_supabase_client
from app.models.generation import GeneratedQuestionSet

JSON: TypeAlias = str | int | float | bool | None | list["JSON"] | dict[str, "JSON"]

def get_owned_course(course_id: UUID, professor_id: str) -> dict[str, Any] | None:
    supabase = get_supabase_client()
    response = (
        supabase.table("courses")
        .select("id, professor_id, title")
        .eq("id", str(course_id))
        .single()
        .execute()
    )
    course = response.data

    if not course:
        return None

    course_row = cast(dict[str, Any], course)

    if course_row["professor_id"] != professor_id:
        return None

    return course_row

def insert_questions(
    course_id: UUID,
    assessment_id: UUID | None,
    question_set: GeneratedQuestionSet,
    source_chunk_ids: list[str],
) -> list[dict[str, Any]]:
    if not question_set.questions:
        return []

    supabase = get_supabase_client()
    rows: list[JSON] = [
        {
            "course_id": str(course_id),
            "assessment_id": str(assessment_id) if assessment_id else None,
            "type": question.type,
            "difficulty": question.difficulty,
            "topic": question.topic,
            "prompt": question.prompt,
            "options": cast(JSON, question.options),
            "answer": question.answer,
            "explanation": question.explanation,
            "rubric": cast(JSON, question.rubric),
            "source_chunk_ids": cast(JSON, source_chunk_ids),
        }
        for question in question_set.questions
    ]

    response = (
        supabase.table("questions")
        .insert(rows)
        .execute()
    )

    return cast(list[dict[str, Any]], response.data or [])
