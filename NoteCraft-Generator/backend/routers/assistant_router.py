from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.assistant_service import process_assistant_query

router = APIRouter()

class AssistantRequest(BaseModel):
    query: str

@router.post("/assistant/query")
async def assistant_query(request: AssistantRequest):
    """
    Endpoint for the AI Assistant multi-modal classification.
    """
    if not request.query:
        raise HTTPException(status_code=400, detail="Query is required")
    
    result = await process_assistant_query(request.query)
    return result
