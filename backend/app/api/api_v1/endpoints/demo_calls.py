"""
DEMO ENDPOINTS - DELETE WHEN REAL RETELL INTEGRATION IS READY
Simple call operations for testing frontend-backend connectivity
"""
from fastapi import APIRouter, HTTPException
from typing import List, Optional
from datetime import datetime
import json
import time
import random

router = APIRouter()

# DEMO DATA - Mock calls for testing
demo_calls = [
    {
        "id": "demo-call-1",
        "driver_name": "John Doe",
        "phone_number": "+1 (555) 123-4567",
        "load_number": "LD-2024-001",
        "agent_id": "demo-agent-1",
        "scenario": "driver_checkin",
        "status": "completed",
        "duration": "2:34",
        "timestamp": "2024-01-15T14:30:00Z",
        "outcome": "Driver confirmed pickup location and ETA",
        "confidence": 0.95,
        "extracted_data": {
            "current_location": "Rest Stop Mile 245, I-80",
            "estimated_arrival": "3:45 PM",
            "driver_status": "On schedule",
            "issues": "None reported"
        },
        "transcript": [
            {"speaker": "Agent", "text": "Hello, this is Sarah from Dispatch...", "timestamp": "00:02"},
            {"speaker": "Driver", "text": "Yes, this is John. Everything's going smoothly.", "timestamp": "00:08"}
        ]
    },
    {
        "id": "demo-call-2",
        "driver_name": "Sarah Wilson", 
        "phone_number": "+1 (555) 987-6543",
        "load_number": "LD-2024-002",
        "agent_id": "demo-agent-2",
        "scenario": "emergency_protocol",
        "status": "failed",
        "duration": "0:45",
        "timestamp": "2024-01-15T13:15:00Z",
        "outcome": "Call disconnected - driver did not answer",
        "confidence": 0.00,
        "extracted_data": {
            "current_location": "Unknown",
            "estimated_arrival": "Unknown", 
            "driver_status": "No response",
            "issues": "Driver not reachable"
        },
        "transcript": []
    }
]

@router.get("/", response_model=List[dict])
async def get_demo_calls(
    status: Optional[str] = None,
    agent_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """DEMO: Get all calls with optional filtering"""
    print("🔧 DEMO API: GET /calls called")
    print(f"📋 Filters - status: {status}, agent_id: {agent_id}, limit: {limit}, offset: {offset}")
    
    filtered_calls = demo_calls.copy()
    
    # Apply filters
    if status:
        filtered_calls = [c for c in filtered_calls if c["status"] == status]
        print(f"🔍 Filtered by status '{status}': {len(filtered_calls)} calls")
    
    if agent_id:
        filtered_calls = [c for c in filtered_calls if c["agent_id"] == agent_id]
        print(f"🔍 Filtered by agent_id '{agent_id}': {len(filtered_calls)} calls")
    
    # Apply pagination
    paginated_calls = filtered_calls[offset:offset + limit]
    print(f"📄 Returning {len(paginated_calls)} calls (offset: {offset}, limit: {limit})")
    
    return paginated_calls

@router.get("/{call_id}", response_model=dict)
async def get_demo_call(call_id: str):
    """DEMO: Get a specific call by ID"""
    print(f"🔧 DEMO API: GET /calls/{call_id} called")
    
    call = next((c for c in demo_calls if c["id"] == call_id), None)
    if not call:
        print(f"❌ Call {call_id} not found")
        raise HTTPException(status_code=404, detail="Call not found")
    
    print(f"✅ Found call: {call['driver_name']} - {call['load_number']}")
    return call

@router.post("/", response_model=dict)
async def create_demo_call(call_data: dict):
    """DEMO: Create/initiate a new call"""
    print("🔧 DEMO API: POST /calls called - Creating demo call")
    print(f"📞 Call data received: {json.dumps(call_data, indent=2)}")
    
    # Simulate call creation with random outcome
    call_id = f"demo-call-{int(time.time())}"
    
    # Simulate different call outcomes
    outcomes = [
        ("completed", "Driver confirmed status and location", 0.92),
        ("completed", "Emergency protocol activated successfully", 0.88), 
        ("failed", "Driver did not answer", 0.0),
        ("in-progress", "Call in progress...", 0.5)
    ]
    
    status, outcome, confidence = random.choice(outcomes)
    
    new_call = {
        "id": call_id,
        **call_data,
        "status": status,
        "duration": "2:15" if status == "completed" else "0:30",
        "timestamp": datetime.now().isoformat() + "Z",
        "outcome": outcome,
        "confidence": confidence,
        "extracted_data": {
            "current_location": "Highway Mile 234",
            "estimated_arrival": "4:30 PM",
            "driver_status": "On route" if status == "completed" else "Unknown",
            "issues": "None reported" if status == "completed" else "Call failed"
        },
        "transcript": [
            {"speaker": "Agent", "text": f"Hello, this is calling about load {call_data.get('load_number', '')}", "timestamp": "00:02"},
            {"speaker": "Driver", "text": "Yes, speaking." if status == "completed" else "", "timestamp": "00:06"}
        ] if status == "completed" else []
    }
    
    demo_calls.insert(0, new_call)  # Add to beginning for chronological order
    
    print(f"📞 Demo call created: {new_call['id']} - Status: {status}")
    print(f"🎯 Outcome: {outcome}")
    
    return new_call

@router.get("/stats/summary")
async def get_demo_call_stats():
    """DEMO: Get call statistics summary"""
    print("🔧 DEMO API: GET /calls/stats/summary called")
    
    total = len(demo_calls)
    completed = len([c for c in demo_calls if c["status"] == "completed"])
    failed = len([c for c in demo_calls if c["status"] == "failed"])
    in_progress = len([c for c in demo_calls if c["status"] == "in-progress"])
    
    success_rate = round((completed / total * 100) if total > 0 else 0)
    
    stats = {
        "total": total,
        "completed": completed,
        "failed": failed,
        "in_progress": in_progress,
        "success_rate": success_rate,
        "avg_duration": "2:31"
    }
    
    print(f"📊 Demo stats: {json.dumps(stats, indent=2)}")
    return stats
