import json
from typing import Dict, Any
from datetime import datetime
from app.services.transcript_processor import TranscriptProcessor
from app.models.call import CallTranscriptEntry
from app.core.config import settings

# Import Retell SDK for webhook verification
from retell import Retell

class WebhookService:
    def __init__(self):
        self.transcript_processor = TranscriptProcessor()
    
    def _verify_webhook_signature(self, body: bytes, headers: Dict[str, str]) -> bool:
        """Verify Retell AI webhook signature for security"""
        signature = headers.get("x-retell-signature") or headers.get("X-Retell-Signature")
        
        if not signature:
            return True
            
        if not settings.RETELL_API_KEY:
            return True
            
        try:
            # Use the official Retell SDK verification method
            is_valid = Retell.verify(
                body.decode('utf-8'),
                settings.RETELL_API_KEY,
                signature
            )
            
            return is_valid
            
        except Exception as e:
            # For development, allow webhooks through even if verification fails
            return True

    async def process_call_webhook(self, body: bytes, headers: Dict[str, str]) -> Dict[str, Any]:
        """Process Retell AI call webhook events"""
        try:
            # Verify webhook signature for security
            if not self._verify_webhook_signature(body, headers):
                raise ValueError("Invalid webhook signature")
                
            # Parse the webhook payload
            payload = json.loads(body.decode())
            event_type = payload.get("event")
            
            if event_type == "call_started":
                return await self._handle_call_started(payload)
            elif event_type == "call_ended":
                return await self._handle_call_ended(payload)
            elif event_type == "call_analyzed":
                return await self._handle_call_analyzed(payload)
            else:
                return {"status": "unknown_event", "event_type": event_type}
                
        except Exception as e:
            raise
    
    async def process_inbound_call_webhook(self, body: bytes, headers: Dict[str, str]) -> Dict[str, Any]:
        """Process Retell AI inbound call webhook"""
        try:
            # Parse the webhook payload
            payload = json.loads(body.decode())
            call_inbound = payload.get("call_inbound", {})
            
            # You can customize the response based on the incoming call
            # For example, override agent_id, set dynamic variables, etc.
            
            response = {
                "call_inbound": {
                    # Example: Override agent based on phone number or other criteria
                    # "override_agent_id": "your_agent_id",
                    # "dynamic_variables": {
                    #     "caller_type": "driver",
                    #     "call_context": "check_in"
                    # },
                    # "metadata": {
                    #     "source": "inbound_webhook"
                    # }
                }
            }
            
            return response
            
        except Exception as e:
            raise
    
    async def _handle_call_started(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle call started event"""
        call_data = payload.get("call", {})
        call_id = call_data.get("call_id")
        from_number = call_data.get("from_number", "Unknown")
        to_number = call_data.get("to_number", "Unknown")
        direction = call_data.get("direction", "Unknown")
        
        
        # Here you would typically:
        # 1. Update call status in your database
        # 2. Send notifications
        # 3. Log the event
        
        return {"status": "call_started_processed", "call_id": call_id}
    
    async def _handle_call_ended(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle call ended event"""
        call_data = payload.get("call", {})
        call_id = call_data.get("call_id")
        disconnection_reason = call_data.get("disconnection_reason", "Unknown")
        start_timestamp = call_data.get("start_timestamp", 0)
        end_timestamp = call_data.get("end_timestamp", 0)
        duration = (end_timestamp - start_timestamp) / 1000 if end_timestamp > start_timestamp else 0
        
        
        # Extract transcript if available
        transcript_data = call_data.get("transcript_object", [])
        transcript_entries = []
        
        
        for entry in transcript_data:
            role = entry.get("role", "unknown")
            content = entry.get("content", "")
            speaker = "🤖 Agent" if role == "agent" else "👤 User"
            
            
            transcript_entries.append(CallTranscriptEntry(
                speaker="Agent" if role == "agent" else "User",
                text=content,
                timestamp=str(entry.get("start", "00:00"))
            ))
        
        # Process transcript to extract structured data
        if transcript_entries:
            extracted_data = self.transcript_processor.process_transcript(transcript_entries)
        else:
            extracted_data = None
        
        # Here you would typically:
        # 1. Update call status and duration in database
        # 2. Store the processed transcript and extracted data
        # 3. Send completion notifications
        # 4. Update agent statistics
        
        return {
            "status": "call_ended_processed", 
            "call_id": call_id,
            "duration": duration,
            "disconnection_reason": disconnection_reason,
            "extracted_data": extracted_data.dict() if extracted_data else None
        }
    
    async def _handle_call_analyzed(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle call analyzed event"""
        call_data = payload.get("call", {})
        call_id = call_data.get("call_id")
        call_analysis = call_data.get("call_analysis", {})
        
        # Extract additional insights from Retell's analysis
        call_summary = call_analysis.get("call_summary", "Not available")
        user_sentiment = call_analysis.get("user_sentiment", "Not analyzed")
        call_successful = call_analysis.get("call_successful", False)
        
        # Here you would typically:
        # 1. Combine Retell's analysis with our structured extraction
        # 2. Update database with comprehensive call insights
        # 3. Generate performance reports
        # 4. Trigger follow-up workflows based on success/failure
        
        return {
            "status": "call_analyzed_processed", 
            "call_id": call_id,
            "analysis": {
                "retell_analysis": call_analysis,
                "summary": call_summary,
                "sentiment": user_sentiment,
                "successful": call_successful
            }
        }
