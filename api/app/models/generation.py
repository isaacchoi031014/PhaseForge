from typing import Any, Literal
from uuid import UUID
from pydantic import BaseModel, Field

QuestionType = Literal["mcq", "short_answer", "essay"]

class GenerateRequest(BaseModel):
    course_id: UUID
    num_questions: int = Field(default=12, ge=1, le=50)
    # Auto-gradable types only — an adaptive exam branches on instant scoring.
    types: list[QuestionType] = Field(default_factory=lambda: ["mcq", "short_answer"])
    # Bands to stock the question pool with; generation spreads across them and
    # tags each question, so the exam engine can pick by difficulty at runtime.
    difficulties: list[str] = Field(default_factory=lambda: ["Easy", "Medium", "Hard"])
    topics: list[str] = Field(default_factory=list)
    instructions: str | None = None
    assessment_id: UUID | None = None

# Schema Claude is constrained to (structured outputs). Every field is required
# and uses empty list/string for "not applicable" so the JSON schema stays flat
# (all-required + additionalProperties:false), which structured outputs prefers.
class GeneratedQuestion(BaseModel):
    type: QuestionType
    topic: str
    difficulty: str
    prompt: str
    options: list[str]   # mcq choices; empty for written questions
    answer: str          # correct option text / model answer
    explanation: str     # answer-key rationale
    rubric: list[str]    # grading criteria; empty for mcq

class GeneratedQuestionSet(BaseModel):
    questions: list[GeneratedQuestion]

class GenerateResponse(BaseModel):
    course_id: UUID
    count: int
    questions: list[dict[str, Any]]
