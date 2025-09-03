from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class CallTranscriptEntry(BaseModel):
    speaker: str  # "Agent", "Driver", "System"
    text: str
    timestamp: str

# Scenario 1: Driver Check-in Extracted Data
class DriverCheckinData(BaseModel):
    call_outcome: Optional[str] = None  # "In-Transit Update" OR "Arrival Confirmation"
    driver_status: Optional[str] = None  # "Driving" OR "Delayed" OR "Arrived" OR "Unloading"
    current_location: Optional[str] = None  # e.g., "I-10 near Indio, CA"
    eta: Optional[str] = None  # e.g., "Tomorrow, 8:00 AM"
    delay_reason: Optional[str] = None  # e.g., "Heavy Traffic", "Weather", "None"
    unloading_status: Optional[str] = None  # e.g., "In Door 42", "Waiting for Lumper", "Detention", "N/A"
    pod_reminder_acknowledged: Optional[bool] = None

# Scenario 2: Emergency Protocol Extracted Data
class EmergencyData(BaseModel):
    call_outcome: str = "Emergency Escalation"
    emergency_type: Optional[str] = None  # "Accident" OR "Breakdown" OR "Medical" OR "Other"
    safety_status: Optional[str] = None  # e.g., "Driver confirmed everyone is safe"
    injury_status: Optional[str] = None  # e.g., "No injuries reported"
    emergency_location: Optional[str] = None  # e.g., "I-15 North, Mile Marker 123"
    load_secure: Optional[bool] = None
    escalation_status: str = "Connected to Human Dispatcher"

# Generic Extracted Data (for backwards compatibility)
class ExtractedData(BaseModel):
    current_location: Optional[str] = None
    estimated_arrival: Optional[str] = None
    driver_status: Optional[str] = None
    issues: Optional[str] = None
    
    # Scenario-specific data
    driver_checkin_data: Optional[DriverCheckinData] = None
    emergency_data: Optional[EmergencyData] = None
    scenario_type: Optional[str] = None  # "driver_checkin", "emergency_protocol"

class CallBase(BaseModel):
    driver_name: str
    phone_number: str
    load_number: str
    agent_id: str
    scenario: str
    pickup_location: Optional[str] = None
    delivery_location: Optional[str] = None
    estimated_pickup_time: Optional[str] = None
    notes: Optional[str] = None

class CallCreate(CallBase):
    pass

class CallFilter(BaseModel):
    status: Optional[str] = None
    agent_id: Optional[str] = None
    limit: int = 50
    offset: int = 0

class Call(CallBase):
    id: str
    retell_call_id: Optional[str] = None
    status: str  # pending, in-progress, completed, failed, cancelled
    duration: Optional[str] = None
    timestamp: datetime
    outcome: Optional[str] = None
    confidence: float = 0.0
    extracted_data: ExtractedData = ExtractedData()
    transcript: List[CallTranscriptEntry] = []

    class Config:
        from_attributes = True
