from fastapi import APIRouter, HTTPException
from typing import List
from app.services.retell_service import RetellService
from app.core.config import settings

router = APIRouter()
retell_service = RetellService(settings.RETELL_API_KEY)

@router.get("/")
async def list_voices():
    """Get all available voices from Retell API"""
    try:
        voices = await retell_service.list_voices()
        return voices
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{voice_id}")
async def get_voice(voice_id: str):
    """Get a specific voice by ID"""
    try:
        voice = await retell_service.get_voice(voice_id)
        if not voice:
            raise HTTPException(status_code=404, detail="Voice not found")
        return voice
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

