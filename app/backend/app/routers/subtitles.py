from fastapi import APIRouter, HTTPException, Query
from ..config import get_settings
from ..gemini.subtitle_explainer import explain_expression, extract_youtube_subtitles
from ..models.domain import ExplainRequest, ExpressionNuance, SubtitleTrack

router = APIRouter(prefix="/api/subtitles", tags=["subtitles"])


@router.get("/{video_id}", response_model=SubtitleTrack)
async def get_subtitles(
    video_id: str,
    extract: bool = Query(
        default=False,
        description="If true and no static JSON exists, extract subtitles live from YouTube via Gemini 4 Argon",
    ),
) -> SubtitleTrack:
    s = get_settings()
    path = s.assets_dir / "subtitles" / f"{video_id}.json"
    if path.exists():
        return SubtitleTrack.model_validate_json(path.read_text("utf-8"))

    if extract:
        extracted = await extract_youtube_subtitles(video_id)
        if extracted:
            return extracted

    fallback_path = s.assets_dir / "subtitles" / f"{s.DEMO_VIDEO_ID}.json"
    if not fallback_path.exists():
        raise HTTPException(404, f"No subtitle track found for {video_id}")
    track = SubtitleTrack.model_validate_json(fallback_path.read_text("utf-8"))
    track.video_id = video_id
    return track


@router.post("/explain", response_model=ExpressionNuance)
async def post_explain(req: ExplainRequest) -> ExpressionNuance:
    return await explain_expression(req)
