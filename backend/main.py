import os
import json
import traceback
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from groq import Groq

from solver import ConstraintSolver

# Load environment variables from .env file
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

app = FastAPI(
    title="Evalvia Smart Question Paper Generator API",
    description="Constraint-driven question paper generation using deterministic logic + Groq GPT-OSS",
    version="1.0.0"
)

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Request & Response Schemas ---

class PaperConfigRequest(BaseModel):
    subject: str = Field(default="Mathematics", description="Mathematics or Science")
    total_marks: int = Field(default=40, ge=10, le=100)
    difficulty_mix: Dict[str, float] = Field(
        default={"Easy": 0.3, "Medium": 0.5, "Hard": 0.2}
    )
    topic_weightage: Dict[str, float] = Field(
        default={"Algebra": 0.4, "Geometry": 0.3, "Trigonometry": 0.3}
    )
    question_types: Dict[str, float] = Field(
        default={"MCQ": 0.4, "Short Answer": 0.4, "Long Answer": 0.2}
    )

class SwapRequest(BaseModel):
    subject: str
    slot: Dict[str, Any]  # Contains slot_id, type, marks, topic, difficulty
    current_question: str
    existing_questions: List[str] = []

# --- Endpoints ---

@app.get("/")
def read_root():
    return {
        "status": "ok",
        "message": "Evalvia Generator API is live",
        "groq_configured": bool(GROQ_API_KEY)
    }

@app.post("/api/generate-paper")
def generate_paper(config: PaperConfigRequest):
    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY is not configured on the backend server. Check your .env file."
        )

    try:
        # 1. Run deterministic constraint solver to compute exact slot matrix
        solver = ConstraintSolver(
            total_marks=config.total_marks,
            difficulty_mix=config.difficulty_mix,
            topic_weightage=config.topic_weightage,
            question_types=config.question_types
        )
        solver_result = solver.solve()
        slots = solver_result["slots"]

        # 2. Query Groq API to populate question content per solved slot
        client = Groq(api_key=GROQ_API_KEY)

        prompt = f"""
You are an expert assessment compiler for {config.subject}.
Generate a full question paper matching the following pre-calculated slot array:
{json.dumps(slots, indent=2)}

Strict Generation Rules:
1. For each slot, output valid question text and model answer matching the slot's specified topic, difficulty, and mark value.
2. If type is "MCQ", provide exactly 4 options formatted as ["A) ...", "B) ...", "C) ...", "D) ..."].
3. If type is "Short Answer" or "Long Answer", set "options" to null.
4. Ensure question content is accurate, clear, and pedagogical for {config.subject}.

Return ONLY a JSON object with a single root key "questions" containing an array of objects structured as follows:
{{
  "questions": [
    {{
      "slot_id": 1,
      "type": "MCQ",
      "marks": 1,
      "topic": "Algebra",
      "difficulty": "Easy",
      "question": "Question text here...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "answer": "Correct answer / marking scheme"
    }}
  ]
}}
"""

        completion = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {"role": "system", "content": "You are a precise educational content generator that responds strictly in valid JSON format."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.5,
        )

        raw_data = json.loads(completion.choices[0].message.content)
        questions = raw_data.get("questions", [])

        return {
            "status": "success",
            "subject": config.subject,
            "total_marks": config.total_marks,
            "warnings": solver_result["warnings"],
            "questions": questions,
            "solver_summary": {
                "total_questions": len(questions),
                "requested_config": config.model_dump()
            }
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Paper Generation Failed: {str(e)}")


@app.post("/api/swap-question")
def swap_question(payload: SwapRequest):
    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY is not configured on the backend server."
        )

    try:
        client = Groq(api_key=GROQ_API_KEY)
        slot = payload.slot
        is_mcq = (slot.get("type") == "MCQ")

        options_schema_str = '["A) ...", "B) ...", "C) ...", "D) ..."]' if is_mcq else "null"

        prompt = f"""
Generate ONE replacement question for a {payload.subject} assessment matching these exact constraints:
- Slot ID: {slot.get('slot_id')}
- Type: {slot.get('type')}
- Marks: {slot.get('marks')}
- Topic: {slot.get('topic')}
- Difficulty: {slot.get('difficulty')}

CRITICAL CONSTRAINTS:
1. DO NOT generate this question: "{payload.current_question}"
2. DO NOT duplicate any of these existing paper questions: {json.dumps(payload.existing_questions)}

Return ONLY a valid JSON object matching this structure:
{{
  "slot_id": {slot.get('slot_id')},
  "type": "{slot.get('type')}",
  "marks": {slot.get('marks')},
  "topic": "{slot.get('topic')}",
  "difficulty": "{slot.get('difficulty')}",
  "question": "New replacement question text...",
  "options": {options_schema_str},
  "answer": "Answer key / Marking rubric"
}}
"""

        completion = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {"role": "system", "content": "You are an educational assessment writer that outputs strictly valid JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
        )

        replacement = json.loads(completion.choices[0].message.content)
        return {"status": "success", "replacement": replacement}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Question Swap Failed: {str(e)}")