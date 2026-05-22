# vision_analyzer.py — Local Ollama Multimodal Scanner
import httpx
import re
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

OLLAMA_URL = "http://localhost:11434/api/chat"
VISION_MODEL = "llama3.2-vision:latest" # Explicitly use the pulled latest tag

class VisionAnalysisRequest(BaseModel):
    screenshot: str  # data:image/png;base64,...
    page_url: str
    element_bounds: Optional[dict] = None
    html_context: Optional[str] = None

DARK_PATTERN_SYSTEM_PROMPT = """You are an expert dark pattern detection system. 
Analyze the provided UI screenshot and the surrounding HTML context, then classify any dark patterns present.

Classifications:
01. URGENCY_SCARCITY: Fake countdown timers, artificial scarcity claims.
02. HIDDEN_COST: Prices that change or inject fees late in the flow.
03. CONFIRM_SHAME: Guilt-tripping opt-out button text.
04. ROACH_MOTEL: Subscription setups that make it difficult to unsubscribe.
05. TRICK_QUESTION: Intentionally confusing or double-negative checkboxes.
06. FORCED_CONTINUITY: Hidden auto-renewals.

You MUST respond in strict raw JSON format containing these exact keys. Do not include markdown code block formatting:
{
  "is_dark_pattern": boolean,
  "pattern_type": "CATEGORY_NAME_OR_NULL",
  "confidence": float (0.0 to 1.0),
  "affected_element_description": "string describing the target element",
  "user_impact": "string explaining how this manipulates the user",
  "bypass_strategy": "actionable tip on how to avoid it",
  "regulatory_violation": "GDPR/CCPA/EU_DSA or null"
}"""

@router.post("/analyze-vision")
async def analyze_vision(request: VisionAnalysisRequest):
    try:
        # 1. Cleanse base64 prefix
        base64_image = re.sub(r'^data:image/.+;base64,', '', request.screenshot)

        # 2. Build prompt context
        user_prompt = f"Page URL: {request.page_url}\n"
        
        if request.element_bounds:
            user_prompt += (
                f"We are specifically analyzing a target element located at these viewport coordinates on the screenshot:\n"
                f"- X (left offset): {request.element_bounds.get('x')}px\n"
                f"- Y (top offset): {request.element_bounds.get('y')}px\n"
                f"- Width: {request.element_bounds.get('width')}px\n"
                f"- Height: {request.element_bounds.get('height')}px\n"
                f"Please visually inspect the region at these coordinates in the screenshot to see if it represents a dark pattern.\n"
            )
            
        if request.html_context:
            user_prompt += f"Surrounding target DOM Context:\n```html\n{request.html_context}\n```\n"
            
        user_prompt += (
            "Analyze the screenshot (particularly focusing on the specified element area, if provided) "
            "and the DOM context. Determine if it contains any manipulative dark patterns (like urgency, "
            "hidden costs, confirm shaming, forced continuity, pre-ticked checkboxes, or trick questions) "
            "and classify it according to the system rules."
        )

        # 3. Query local Ollama Multimodal Chat API
        async with httpx.AsyncClient(timeout=60.0) as client:
            payload = {
                "model": VISION_MODEL,
                "messages": [
                    {
                        "role": "system",
                        "content": DARK_PATTERN_SYSTEM_PROMPT
                    },
                    {
                        "role": "user",
                        "content": user_prompt,
                        "images": [base64_image]
                    }
                ],
                "stream": False,
                "format": "json" # Forces Ollama model to yield valid JSON structure
            }

            response = await client.post(OLLAMA_URL, json=payload)
            response.raise_for_status()
            
            result_json = response.json()
            model_response_text = result_json.get("message", {}).get("content", "{}")
            
            # Parse model output string into a dictionary
            classification_data = json.loads(model_response_text)
            return classification_data

    except Exception as e:
        print(f"[Ollama Vision Error]: {str(e)}")
        # Fallback to a safe negative if model fails
        return {
            "is_dark_pattern": False,
            "pattern_type": None,
            "confidence": 0.0,
            "affected_element_description": "Failed to analyze locally",
            "user_impact": str(e),
            "bypass_strategy": "Proceed with caution",
            "regulatory_violation": None
        }
