from fastapi import APIRouter, Request, HTTPException
from app.services.webhook_service import WebhookService
from app.core.config import settings

router = APIRouter()
webhook_service = WebhookService()

@router.post("/retell/call-events")
async def handle_call_webhook(request: Request):
    """Handle Retell AI call events webhook"""
    try:
        # Get raw body for signature verification
        body = await request.body()
        headers = dict(request.headers)
        
        # Process the webhook
        result = await webhook_service.process_call_webhook(body, headers)
        return {"message": "Webhook processed successfully", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/retell/inbound-call")
async def handle_inbound_call_webhook(request: Request):
    """Handle Retell AI inbound call webhook"""
    try:
        # Get raw body
        body = await request.body()
        headers = dict(request.headers)
        
        # Process the inbound call
        result = await webhook_service.process_inbound_call_webhook(body, headers)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
