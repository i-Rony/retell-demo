from fastapi import APIRouter
from app.api.api_v1.endpoints import agents, calls, webhooks, voices

api_router = APIRouter()

# API endpoints for Retell integration
api_router.include_router(agents.router, prefix="/agents", tags=["agents"])
api_router.include_router(calls.router, prefix="/calls", tags=["calls"])
api_router.include_router(voices.router, prefix="/voices", tags=["voices"])

# Webhook endpoints
api_router.include_router(webhooks.router, prefix="", tags=["webhooks"])
