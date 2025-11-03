import asyncio
import random
from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from prediction import CLASS_NAMES, make_prediction

from core.config import get_settings

api_router = APIRouter()


class PredictionPayload(BaseModel):
    image: str


async def generate_items(limit: int = 4) -> List[str]:
    lst = list(CLASS_NAMES)
    random.shuffle(lst)
    return lst[:limit]

@api_router.get("/health", tags=["Health"])
async def health_check() -> dict[str, str]:
    settings = get_settings()
    return {"status": "ok", "service": settings.app_name, "version": settings.version}

@api_router.get('/get_random_prompts')
async def get_prompts() -> List[str]:
    return await generate_items()

@api_router.post('/predict_file')
async def predict_file(payload: PredictionPayload) -> dict[str, str]:
    loop = asyncio.get_running_loop()
    try:
        result = await loop.run_in_executor(None, make_prediction, payload.image)
    except Exception as exc:  # pragma: no cover - defensive path
        raise HTTPException(status_code=500, detail="Failed to run prediction.") from exc

    top = result.get("top")
    if not isinstance(top, dict) or "label" not in top:
        raise HTTPException(status_code=500, detail="Prediction result malformed.")
    print(result)
    return {"label": str(top["label"])}