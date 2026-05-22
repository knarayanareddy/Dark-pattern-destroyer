# main.py — FastAPI Backend
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from vision_analyzer import router as vision_router, VisionAnalysisRequest
from bypass_planner import CancelJourneyPlanner, CancelRequest
import uvicorn
import os
import json

app = FastAPI(title="Dark Pattern Destroyer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

planner = CancelJourneyPlanner()

# Mock Redis caching logic
class MemoryCache:
    def __init__(self):
        self._data = {}
    def get(self, key):
        return self._data.get(key)
    def setex(self, key, time, value):
        self._data[key] = value

try:
    import redis
    redis_client = redis.Redis(host=os.getenv('REDIS_HOST', 'localhost'), port=6379, decode_responses=True)
    # Test connection
    redis_client.ping()
    print("Connected to Redis")
except Exception:
    print("Redis not available, using in-memory cache")
    redis_client = MemoryCache()

# Include the vision router
app.include_router(vision_router, prefix="/api")

@app.post("/api/plan-cancel-journey")
async def plan_cancel(request: CancelRequest):
    try:
        plan = await planner.generate_plan(request)
        return plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/report-pattern")
async def report_pattern(payload: dict):
    print(f"Received report: {payload}")
    return {"status": "success"}

@app.get("/")
async def root():
    return {"status": "online", "message": "Dark Pattern Destroyer API is active"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
