from __future__ import annotations

import os
from typing import List, Dict

from dotenv import load_dotenv

# ✅ Load .env BEFORE importing anything that reads env vars at import-time (e.g., app.coach)
load_dotenv()

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from app.coach import coach_reply


app = FastAPI(title="AI Speaking Coach Demo")

# Serve frontend files
app.mount("/static", StaticFiles(directory="app/static"), name="static")


class CoachRequest(BaseModel):
    message: str = Field(..., min_length=1)
    history: List[Dict[str, str]] = Field(default_factory=list)


class CoachResponse(BaseModel):
    coach_reply: str
    correction: str
    better_sentence: str
    explanation: str


@app.get("/")
def index():
    return FileResponse("app/static/index.html")


@app.post("/api/coach", response_model=CoachResponse)
def api_coach(req: CoachRequest):
    model = os.environ.get("OPENAI_MODEL", "gpt-5-mini")
    result = coach_reply(req.history, req.message, model=model)
    return CoachResponse(**result.model_dump())
