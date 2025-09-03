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
            print("⚠️  No signature found in webhook headers - proceeding without verification")
            return True
            
        if not settings.RETELL_API_KEY:
            print("⚠️  No RETELL_API_KEY found - skipping signature verification")
            return True
            
        try:
            # Use the official Retell SDK verification method
            is_valid = Retell.verify(
                body.decode('utf-8'),
                settings.RETELL_API_KEY,
                signature
            )
            
            if is_valid:
                print(f"✅ Webhook signature verified successfully")
            else:
                print(f"❌ Invalid webhook signature")
                
            return is_valid
            
        except Exception as e:
            print(f"⚠️  Webhook signature verification error: {e}")
            # For development, allow webhooks through even if verification fails
            print("🔧 Allowing webhook for development purposes")
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
                print(f"Unknown event type: {event_type}")
                return {"status": "unknown_event", "event_type": event_type}
                
        except Exception as e:
            print(f"Error processing call webhook: {e}")
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
            print(f"Error processing inbound call webhook: {e}")
            raise
    
    async def _handle_call_started(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle call started event"""
        call_data = payload.get("call", {})
        call_id = call_data.get("call_id")
        from_number = call_data.get("from_number", "Unknown")
        to_number = call_data.get("to_number", "Unknown")
        direction = call_data.get("direction", "Unknown")
        
        print("=" * 60)
        print("🔵 CALL STARTED")
        print("=" * 60)
        print(f"📞 Call ID: {call_id}")
        print(f"📱 From: {from_number}")
        print(f"📱 To: {to_number}")
        print(f"🔄 Direction: {direction}")
        print(f"⏰ Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)
        
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
        
        print("\n" + "=" * 60)
        print("🔴 CALL ENDED")
        print("=" * 60)
        print(f"📞 Call ID: {call_id}")
        print(f"❌ Reason: {disconnection_reason}")
        print(f"⏱️  Duration: {duration:.1f} seconds")
        print(f"⏰ End Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Extract transcript if available
        transcript_data = call_data.get("transcript_object", [])
        transcript_entries = []
        
        print(f"\n📝 TRANSCRIPT ({len(transcript_data)} entries):")
        print("-" * 40)
        
        for entry in transcript_data:
            role = entry.get("role", "unknown")
            content = entry.get("content", "")
            speaker = "🤖 Agent" if role == "agent" else "👤 User"
            
            print(f"{speaker}: {content}")
            
            transcript_entries.append(CallTranscriptEntry(
                speaker="Agent" if role == "agent" else "User",
                text=content,
                timestamp=str(entry.get("start", "00:00"))
            ))
        
        # Process transcript to extract structured data
        if transcript_entries:
            extracted_data = self.transcript_processor.process_transcript(transcript_entries)
            print(f"\n🧠 EXTRACTED DATA:")
            print("-" * 40)
            print(f"{extracted_data}")
        else:
            extracted_data = None
            print("\n⚠️  No transcript data available")
        
        print("=" * 60)
        
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
        
        print("\n" + "=" * 60)
        print("🧠 CALL ANALYZED")
        print("=" * 60)
        print(f"📞 Call ID: {call_id}")
        
        # Extract additional insights from Retell's analysis
        call_summary = call_analysis.get("call_summary", "Not available")
        user_sentiment = call_analysis.get("user_sentiment", "Not analyzed")
        call_successful = call_analysis.get("call_successful", False)
        
        success_emoji = "✅" if call_successful else "❌"
        print(f"{success_emoji} Success: {call_successful}")
        print(f"😊 Sentiment: {user_sentiment}")
        print(f"📋 Summary: {call_summary}")
        print(f"⏰ Analysis Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)
        
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
