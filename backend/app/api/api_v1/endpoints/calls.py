from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from app.models.call import Call, CallCreate
from app.services.retell_service import RetellService
from app.core.config import settings

router = APIRouter()

# Initialize with debug logging
print(f"🔧 Initializing RetellService with API key: {'✅ Present' if settings.RETELL_API_KEY else '❌ Missing'}")
print(f"🔧 API key length: {len(settings.RETELL_API_KEY) if settings.RETELL_API_KEY else 0}")
retell_service = RetellService(settings.RETELL_API_KEY)

@router.get("/", response_model=List[Call])
async def get_calls():
    """Get all calls from Retell AI - simplified to match Retell AI documentation"""
    try:
        print(f"🔗 API endpoint called: GET /calls/ - fetching all calls from Retell AI")
        calls = await retell_service.list_calls()
        print(f"✅ Returning {len(calls)} calls to frontend")
        return calls
    except Exception as e:
        print(f"❌ Error in get_calls endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{call_id}", response_model=Call)
async def get_call(call_id: str):
    """Get a specific call by ID"""
    try:
        call = await retell_service.get_call(call_id)
        if not call:
            raise HTTPException(status_code=404, detail="Call not found")
        return call
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=Call)
async def create_call(call_data: CallCreate):
    """Create/initiate a new phone call"""
    try:
        call = await retell_service.create_phone_call(call_data)
        return call
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/web-call")
async def create_web_call(
    agent_id: str = "agent_afb90a0fbe9473fc964f9cf979", 
    driver_name: str = None,
    phone_number: str = None,
    load_number: str = None
):
    """Create a web call for browser-based calling"""
    try:
        dynamic_variables = {}
        if driver_name:
            dynamic_variables["driver_name"] = driver_name
        if phone_number:
            dynamic_variables["phone_number"] = phone_number
        if load_number:
            dynamic_variables["load_number"] = load_number
            
        web_call = await retell_service.create_web_call(agent_id, dynamic_variables)
        return web_call
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/trigger-call")
async def trigger_simple_call(to_number: str, agent_id: str = "agent_afb90a0fbe9473fc964f9cf979"):
    """Simple endpoint to trigger a call to any number"""
    try:
        result = await retell_service.create_simple_phone_call(
            to_number=to_number,
            agent_id=agent_id
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/start-test-call")
async def start_test_call(
    driver_name: str,
    phone_number: str, 
    load_number: str,
    agent_id: str = "agent_afb90a0fbe9473fc964f9cf979"
):
    """Dashboard endpoint to start a test call with driver context"""
    try:
        # Prepare dynamic variables for the agent
        dynamic_variables = {
            "driver_name": driver_name,
            "load_number": load_number,
            "context": "test_call"
        }
        
        result = await retell_service.create_simple_phone_call(
            to_number=phone_number,
            agent_id=agent_id,
            dynamic_variables=dynamic_variables
        )
        
        return {
            "success": True,
            "call_id": result["call_id"],
            "message": f"Test call initiated to {driver_name} at {phone_number}",
            "context": {
                "driver_name": driver_name,
                "load_number": load_number,
                "phone_number": phone_number
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats/summary")
async def get_call_stats():
    """Get call statistics summary"""
    try:
        stats = await retell_service.get_call_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/debug/retell-api")
async def debug_retell_api():
    """Debug endpoint to test Retell AI API directly"""
    try:
        print("🔍 Testing direct Retell AI API access...")
        
        # Test if we can connect to Retell AI
        raw_response = retell_service.client.call.list()
        response_list = list(raw_response)
        
        return {
            "success": True,
            "api_key_configured": bool(retell_service.client.api_key),
            "api_key_length": len(retell_service.client.api_key) if retell_service.client.api_key else 0,
            "calls_count": len(response_list),
            "sample_call": response_list[0] if response_list else None,
            "message": f"Found {len(response_list)} calls in Retell AI account"
        }
    except Exception as e:
        print(f"❌ Debug API error: {e}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to connect to Retell AI API"
        }
