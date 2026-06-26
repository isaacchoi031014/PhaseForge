from typing import Any
from uuid import UUID
from pydantic import BaseModel, Field

from app.models.phase2_contracts import DifficultyBand, QuestionType


class CategoryPlan(BaseModel):
    """How many questions to generate for one topic, per difficulty band."""
    id: UUID
    name: str = Field(min_length=1)
    easy: int = Field(default=0, ge=0, le=50)
    medium: int = Field(default=0, ge=0, le=50)
    hard: int = Field(default=0, ge=0, le=50)

    @property
    def total(self) -> int:
        return self.easy + self.medium + self.hard


class GenerateRequest(BaseModel):
    course_id: UUID
    # One plan per selected topic, each with per-band counts.
    plans: list[CategoryPlan] = Field(min_length=1)
    # Auto-gradable types only — an adaptive exam branches on instant scoring.
    types: list[QuestionType] = Field(default_factory=lambda: ["mcq", "short_answer"])
    instructions: str | None = None
    assessment_id: UUID | None = None

    @property
    def total_questions(self) -> int:
        return sum(plan.total for plan in self.plans)


# What Claude fills in (the content). IDs/provenance/status are added on persist.
# No min_length here: structured outputs don't always enforce it, and a single
# empty field shouldn't fail a whole batch — to_contract_question fills fallbacks.
class QuestionDraft(BaseModel):
    question_type: QuestionType
    topic: str  # should equal one of the requested topic names
    difficulty: DifficultyBand
    learning_objective: str
    prompt: str
    options: list[str]
    answer: str
    explanation: str
    rubric: list[str]


class GeneratedQuestionSet(BaseModel):
    questions: list[QuestionDraft]


class GenerateResponse(BaseModel):
    course_id: UUID
    count: int
    # Each item is a phase2.generated_question.v1 contract object.
    questions: list[dict[str, Any]]


class RegenerateRequest(BaseModel):
    question_id: UUID
    instructions: str | None = None


class ApplyQuestionRequest(BaseModel):
    question_id: UUID
    question_type: QuestionType
    topic: str = Field(min_length=1)
    difficulty: DifficultyBand
    prompt: str
    options: list[str]
    answer: str
    explanation: str
    rubric: list[str]
    learning_objective: str
