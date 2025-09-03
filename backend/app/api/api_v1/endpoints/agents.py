from fastapi import APIRouter, HTTPException, Depends
from typing import List
from app.models.agent import Agent, AgentCreate, AgentUpdate
from app.services.retell_service import RetellService
from app.core.config import settings

router = APIRouter()
retell_service = RetellService(settings.RETELL_API_KEY)

@router.get("/")
async def get_agents():
    """Get all agents from Retell API"""
    try:
        # Return raw Retell API response for frontend to map
        agents = await retell_service.list_agents_raw()
        return agents
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{agent_id}", response_model=Agent)
async def get_agent(agent_id: str):
    """Get a specific agent by ID"""
    try:
        agent = await retell_service.get_agent(agent_id)
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        return agent
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=Agent)
async def create_agent(agent_data: AgentCreate):
    """Create a new agent"""
    try:
        agent = await retell_service.create_agent(agent_data)
        return agent
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{agent_id}", response_model=Agent)
async def update_agent(agent_id: str, agent_data: AgentUpdate):
    """Update an existing agent"""
    try:
        agent = await retell_service.update_agent(agent_id, agent_data)
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        return agent
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{agent_id}")
async def delete_agent(agent_id: str):
    """Delete an agent"""
    try:
        success = await retell_service.delete_agent(agent_id)
        if not success:
            raise HTTPException(status_code=404, detail="Agent not found")
        return {"message": "Agent deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{agent_id}/versions")
async def get_agent_versions(agent_id: str):
    """Get all versions of an agent"""
    try:
        versions = await retell_service.get_agent_versions(agent_id)
        return versions
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/llm")
async def create_retell_llm(llm_data: dict):
    """Create a new Retell LLM"""
    try:
        llm_id = await retell_service.create_retell_llm(
            prompt=llm_data.get("general_prompt", "You are a helpful AI assistant."),
            model=llm_data.get("model", "gpt-4o"),
            temperature=llm_data.get("model_temperature", 0.1)
        )
        return {"llm_id": llm_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
