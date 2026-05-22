# bypass_planner.py — Local Ollama Cancel Path Agent
import httpx
import json
from typing import List, TypedDict, Optional
from pydantic import BaseModel

OLLAMA_URL = "http://localhost:11434/api/chat"
PLANNER_MODEL = "qwen2.5:3b" # Optimized local model for fast planning

class Step(TypedDict):
    action: str        # 'CLICK', 'NAVIGATE', or 'WAIT'
    selector: str      # CSS Selector for targeted button/link
    text: Optional[str] # Visible text to locate
    description: str   # Informational tip for the user
    url: Optional[str]  # URL if action is NAVIGATE

class Plan(TypedDict):
    steps: List[Step]
    auto_navigable: bool
    confidence: float
    goal: str

class CancelRequest(BaseModel):
    url: str
    dom_snapshot: str
    goal: str

PLANNER_SYSTEM_PROMPT = """You are an agentic subscription cancellation planner. 
Your task is to analyze the provided HTML DOM snapshot of a webpage and outline the exact list of browser steps needed to cancel or unsubscribe the user.

Support actions:
- NAVIGATE: Go to a specific absolute URL.
- CLICK: Click a specific element. You MUST provide an accurate CSS selector or target element text.
- WAIT: Pause execution.

You must respond in strict JSON matching this structure:
{
  "goal": "Unsubscribe or Cancel Account",
  "steps": [
    {
      "action": "NAVIGATE" | "CLICK" | "WAIT",
      "selector": "CSS selector or empty string",
      "text": "Element label text or empty string",
      "description": "Short explanation of what this step does",
      "url": "Target URL if NAVIGATE"
    }
  ],
  "auto_navigable": boolean (true if all selectors and steps are reliable),
  "confidence": float (0.0 to 1.0)
}"""

class CancelJourneyPlanner:
    async def generate_plan(self, request: CancelRequest) -> Plan:
        # Build contextual query
        user_prompt = f"""Target Hostname: {request.url}
User Goal: {request.goal}

Analyze this DOM snapshot and return the steps:
```html
{request.dom_snapshot[:25000]}
```"""

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                payload = {
                    "model": PLANNER_MODEL,
                    "messages": [
                        {
                            "role": "system",
                            "content": PLANNER_SYSTEM_PROMPT
                        },
                        {
                            "role": "user",
                            "content": user_prompt
                        }
                    ],
                    "stream": False,
                    "format": "json" # Forces local planner LLM to return valid JSON
                }

                response = await client.post(OLLAMA_URL, json=payload)
                response.raise_for_status()

                result_json = response.json()
                content = result_json.get("message", {}).get("content", "{}")
                plan_data = json.loads(content)
                return plan_data

        except Exception as e:
            print(f"[Ollama Planner Error]: {str(e)}")
            # Fail gracefully with a basic manual search recommendation
            return {
                "goal": request.goal,
                "steps": [
                    {
                        "action": "CLICK",
                        "selector": "a[href*='settings'], a[href*='account']",
                        "text": "Settings",
                        "description": "Locally failed to trace DOM. Manually go to Settings to find unsubscribe paths."
                    }
                ],
                "auto_navigable": False,
                "confidence": 0.3
            }
