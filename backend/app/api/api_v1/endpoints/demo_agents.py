"""
DEMO ENDPOINTS - DELETE WHEN REAL RETELL INTEGRATION IS READY
Simple CRUD operations for testing frontend-backend connectivity
"""
from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime
import json

router = APIRouter()

# DEMO DATA - Mock agents for testing
demo_agents = [
    {
        "id": "demo-agent-1",
        "name": "Driver Check-in Agent (DEMO)",
        "description": "Demo agent for driver check-ins",
        "voice": "nova",
        "temperature": 0.7,
        "speed": 1.0,
        "volume": 1.0,
        "prompt": "Demo prompt for driver check-ins...",
        "backchannel_enabled": True,
        "backchannel_frequency": 0.8,
        "backchannel_words": ["mm-hmm", "okay"],
        "interruption_sensitivity": 0.7,
        "responsiveness": 0.9,
        "pronunciation": [],
        "boosted_keywords": ["delivery", "pickup"],
        "status": "active",
        "created_at": "2024-01-14T10:00:00Z",
        "updated_at": "2024-01-15T14:30:00Z",
        "calls_today": 24
    },
    {
        "id": "demo-agent-2", 
        "name": "Emergency Protocol Agent (DEMO)",
        "description": "Demo agent for emergency handling",
        "voice": "alloy",
        "temperature": 0.5,
        "speed": 1.0,
        "volume": 1.0,
        "prompt": "Demo prompt for emergency protocol...",
        "backchannel_enabled": True,
        "backchannel_frequency": 0.9,
        "backchannel_words": ["understood", "yes"],
        "interruption_sensitivity": 0.8,
        "responsiveness": 0.95,
        "pronunciation": [],
        "boosted_keywords": ["emergency", "help"],
        "status": "active",
        "created_at": "2024-01-13T09:15:00Z",
        "updated_at": "2024-01-14T16:45:00Z",
        "calls_today": 3
    }
]

@router.get("/", response_model=List[dict])
async def get_demo_agents():
    """DEMO: Get all agents"""
    print("🔧 DEMO API: GET /agents called")
    print(f"📊 Returning {len(demo_agents)} demo agents")
    return demo_agents

@router.get("/{agent_id}", response_model=dict)
async def get_demo_agent(agent_id: str):
    """DEMO: Get a specific agent by ID"""
    print(f"🔧 DEMO API: GET /agents/{agent_id} called")
    
    agent = next((a for a in demo_agents if a["id"] == agent_id), None)
    if not agent:
        print(f"❌ Agent {agent_id} not found")
        raise HTTPException(status_code=404, detail="Agent not found")
    
    print(f"✅ Found agent: {agent['name']}")
    return agent

@router.post("/", response_model=dict)
async def create_demo_agent(agent_data: dict):
    """DEMO: Create a new agent"""
    print("🔧 DEMO API: POST /agents called")
    print(f"📝 Agent data received: {json.dumps(agent_data, indent=2)}")
    
    # Create new agent with demo ID
    new_agent = {
        **agent_data,
        "id": f"demo-agent-{len(demo_agents) + 1}",
        "created_at": datetime.now().isoformat() + "Z",
        "updated_at": datetime.now().isoformat() + "Z",
        "calls_today": 0,
        "status": "draft"
    }
    
    demo_agents.append(new_agent)
    print(f"✅ Created new demo agent: {new_agent['name']} (ID: {new_agent['id']})")
    return new_agent

@router.put("/{agent_id}", response_model=dict)
async def update_demo_agent(agent_id: str, agent_data: dict):
    """DEMO: Update an existing agent"""
    print(f"🔧 DEMO API: PUT /agents/{agent_id} called")
    print(f"📝 Update data: {json.dumps(agent_data, indent=2)}")
    
    agent_index = next((i for i, a in enumerate(demo_agents) if a["id"] == agent_id), None)
    if agent_index is None:
        print(f"❌ Agent {agent_id} not found for update")
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Update agent
    demo_agents[agent_index].update(agent_data)
    demo_agents[agent_index]["updated_at"] = datetime.now().isoformat() + "Z"
    
    print(f"✅ Updated demo agent: {demo_agents[agent_index]['name']}")
    return demo_agents[agent_index]

@router.delete("/{agent_id}")
async def delete_demo_agent(agent_id: str):
    """DEMO: Delete an agent"""
    print(f"🔧 DEMO API: DELETE /agents/{agent_id} called")
    
    agent_index = next((i for i, a in enumerate(demo_agents) if a["id"] == agent_id), None)
    if agent_index is None:
        print(f"❌ Agent {agent_id} not found for deletion")
        raise HTTPException(status_code=404, detail="Agent not found")
    
    deleted_agent = demo_agents.pop(agent_index)
    print(f"🗑️ Deleted demo agent: {deleted_agent['name']}")
    return {"message": f"Agent {deleted_agent['name']} deleted successfully"}
