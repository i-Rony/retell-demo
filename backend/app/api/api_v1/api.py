from fastapi import APIRouter
from app.api.api_v1.endpoints import agents, calls, webhooks
# DEMO IMPORTS - DELETE WHEN REAL INTEGRATION IS READY
from app.api.api_v1.endpoints import demo_agents, demo_calls

api_router = APIRouter()

# DEMO ENDPOINTS - Keep for reference/testing
api_router.include_router(demo_agents.router, prefix="/demo/agents", tags=["agents-demo"])
api_router.include_router(demo_calls.router, prefix="/demo/calls", tags=["calls-demo"])

# REAL ENDPOINTS - Now enabled for Retell integration
api_router.include_router(agents.router, prefix="/agents", tags=["agents"])
api_router.include_router(calls.router, prefix="/calls", tags=["calls"])

# Real webhook endpoints
api_router.include_router(webhooks.router, prefix="", tags=["webhooks"])
