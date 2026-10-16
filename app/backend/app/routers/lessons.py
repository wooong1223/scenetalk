from fastapi import APIRouter, HTTPException, Query
from ..gemini.lesson_builder import build_lesson
from ..models.domain import Lesson

router = APIRouter(prefix="/api/lessons", tags=["lessons"])


@router.get("/{video_id}", response_model=Lesson)
async def get_lesson(
    video_id: str,
    force: bool = Query(default=False, description="Regenerate even if cached"),
) -> Lesson:
    if not video_id or len(video_id) > 32:
        raise HTTPException(400, "invalid video_id")
    return await build_lesson(video_id, force=force)
