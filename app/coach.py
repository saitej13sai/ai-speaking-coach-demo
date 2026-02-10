from __future__ import annotations

import os
import json
from typing import List, Dict

from openai import OpenAI
from pydantic import BaseModel, Field

# Create client at import-time; env is loaded in main.py before import
api_key = os.environ.get("OPENAI_API_KEY")
if not api_key:
    raise RuntimeError("OPENAI_API_KEY is not set. Put it in .env or your environment.")

client = OpenAI(api_key=api_key)


class CoachResult(BaseModel):
    coach_reply: str = Field(..., description="What the coach says to the student (friendly, structured).")
    correction: str = Field(..., description="What was wrong (grammar/pronunciation/word choice).")
    better_sentence: str = Field(..., description="A better suggested sentence.")
    explanation: str = Field(..., description="Short, simple explanation.")


SYSTEM_INSTRUCTIONS = """You are an AI Speaking Coach.
Goal: help a student speak English more naturally and clearly.

Rules:
- Be concise, kind, and practical.
- Always include:
  1) a correction (grammar/pronunciation/word choice),
  2) a better suggested sentence,
  3) a short explanation in simple language.
- Output MUST be valid JSON with keys:
  coach_reply, correction, better_sentence, explanation
"""


def _build_messages(history: List[Dict[str, str]], user_message: str) -> List[Dict[str, str]]:
    msgs: List[Dict[str, str]] = [{"role": "system", "content": SYSTEM_INSTRUCTIONS}]
    # small history window for demo
    msgs.extend(history[-6:])
    msgs.append({"role": "user", "content": user_message})
    return msgs


def _safe_json_parse(text: str) -> dict:
    """
    Try to parse JSON even if model adds extra text.
    """
    text = text.strip()
    # Try direct parse
    try:
        return json.loads(text)
    except Exception:
        pass

    # Fallback: extract first {...} block
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return json.loads(text[start : end + 1])

    raise ValueError("Model did not return valid JSON.")


def coach_reply(history: List[Dict[str, str]], user_message: str, model: str) -> CoachResult:
    resp = client.chat.completions.create(
        model=model,
        messages=_build_messages(history, user_message),
        temperature=0.3,
    )

    content = resp.choices[0].message.content or ""
    data = _safe_json_parse(content)

    # Validate fields
    return CoachResult.model_validate(data)
