from pydantic import BaseModel, Field


class SuggestedTopics(BaseModel):
    """Topic names Claude found in a material, excluding ones already known."""
    topics: list[str] = Field(default_factory=list)
