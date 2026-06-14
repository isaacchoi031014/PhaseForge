from fastapi import FastAPI, Depends, HTTPException, status
from app.core.config import get_settings
from app.core.auth import AuthenticatedUser, get_current_user
from app.core.supabase import get_supabase_client
from app.models.ingest import IngestRequest, IngestResponse

settings = get_settings()

app = FastAPI(title="PhaseForge API")

@app.get("/health")
async def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "environment": settings.environment
    }

@app.post("/ingest", response_model=IngestResponse, status_code=status.HTTP_202_ACCEPTED)
async def ingest(request: IngestRequest, current_user: AuthenticatedUser = Depends(get_current_user)) -> IngestResponse:
    return IngestResponse(material_id=request.material_id, status="processing")

@app.get("/debug/me")
async def debug_me(current_user: AuthenticatedUser = Depends(get_current_user),) -> dict[str, str | None]:
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role
    }