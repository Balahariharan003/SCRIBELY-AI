import os
import json
import httpx
import logging
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("OllamaLLM")

load_dotenv()

# ── CONFIG ────────────────────────────────────────────────────
OLLAMA_URL   = "http://localhost:11434/api/chat"
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "phi3")

# Decreased for maximum stability on low-resource systems
MAX_INPUT_CHARS = 4000 
MAX_OUTPUT_TOKENS = 600

# ── BASE LLM CALL ─────────────────────────────────────────────
async def _call_llm(system_prompt: str, user_prompt: str, max_tokens: int = MAX_OUTPUT_TOKENS) -> str:
    """
    Core function to communicate with Ollama API.
    """
    try:
        # Limit input size to prevent context overflow crashes
        safe_user_prompt = user_prompt[:MAX_INPUT_CHARS]

        payload = {
            "model": OLLAMA_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": safe_user_prompt},
            ],
            "stream": False,
            "options": {
                "temperature": 0.1, # More deterministic
                "num_predict": max_tokens,
                "num_ctx": 2048,    # Very safe context window
            }
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(OLLAMA_URL, json=payload)
            
            if response.status_code != 200:
                logger.error(f"Ollama returned error {response.status_code}: {response.text}")
                return ""

            result = response.json()
            content = result.get("message", {}).get("content", "")
            return content.strip()

    except httpx.ConnectError:
        logger.error("Failed to connect to Ollama. Is it running?")
        return ""
    except httpx.TimeoutException:
        logger.error("Ollama request timed out.")
        return ""
    except Exception as e:
        logger.error(f"Unexpected error calling Ollama: {type(e).__name__}")
        return ""

# ── RETRY WRAPPER ─────────────────────────────────────────────
async def _safe_llm(system: str, user: str, max_tokens: int = MAX_OUTPUT_TOKENS) -> str:
    """
    Retry logic to handle transient Ollama failures.
    """
    for attempt in range(2):
        result = await _call_llm(system, user, max_tokens)
        if result:
            return result
    return ""

# ── JSON PARSER ───────────────────────────────────────────────
def _parse_json(raw: str) -> dict | None:
    if not raw:
        return None

    clean = raw.strip()
    
    if clean.startswith("```"):
        try:
            start = clean.index("{")
            end = clean.rindex("}") + 1
            return json.loads(clean[start:end])
        except:
            pass

    try:
        return json.loads(clean)
    except json.JSONDecodeError:
        try:
            start = clean.index("{")
            end   = clean.rindex("}") + 1
            return json.loads(clean[start:end])
        except Exception:
            return None

# ── JOB 1: CLEAN TRANSCRIPT ───────────────────────────────────
async def clean_transcript(raw_transcript: str) -> str:
    if not raw_transcript.strip():
        return ""
    
    # Tiny prompt for low-resource stability
    system = "Clean this transcript. Remove filler and repeats. Return text only."
    user = raw_transcript[:MAX_INPUT_CHARS]

    result = await _safe_llm(system, user)
    return result if result else raw_transcript

# ── JOB 2: CHUNK SUMMARY ──────────────────────────────────────
async def summarise_chunk(clean_transcript: str, prev_summary: str = "", chunk_index: int = 0) -> str:
    if not clean_transcript.strip():
        return ""

    system = "Summarize this into 3-5 bullet points."
    user = clean_transcript[:MAX_INPUT_CHARS]

    return await _safe_llm(system, user)

# ── JOB 3a: BLOCK AGGREGATION ─────────────────────────────────
async def aggregate_block(chunk_summaries: list, block_index: int) -> str:
    if not chunk_summaries:
        return ""

    system = "Merge these summaries into one paragraph."
    summaries_text = "\n".join([str(s) for s in chunk_summaries if s])[:MAX_INPUT_CHARS]

    return await _safe_llm(system, summaries_text)

# ── JOB 3b: GENERATE NOTES JSON ───────────────────────────────
async def generate_mom(block_summaries: list, participants: list, meeting_date: str) -> dict:
    if not block_summaries:
        return _fallback_notes(participants, meeting_date)

    system = "Generate class notes JSON. Keys: session_title, course_name, subject_topic, date, time, platform, instructor_name, session_overview, learning_objectives, topics_covered, concepts, examples, key_takeaways, formulas_definitions, questions_answers, assignments, study_resources, additional_notes, revision_summary."
    summaries_text = "\n".join([str(s) for s in block_summaries if s])[:MAX_INPUT_CHARS]

    raw = await _safe_llm(system, summaries_text, max_tokens=1000)
    parsed = _parse_json(raw)

    if parsed:
        parsed["prepared_by"] = f"NoteCraft AI ({OLLAMA_MODEL})"
        return parsed

    return _fallback_notes(participants, meeting_date)

# ── JOB 4: REFINEMENT ─────────────────────────────────────────
async def refine_mom(mom_json: dict) -> dict:
    # Skip refinement in low-resource mode to save overhead
    return mom_json

# ── FALLBACK ──────────────────────────────────────────────────
def _fallback_notes(participants: list, date: str) -> dict:
    return {
        "session_title":    "Processed Class Notes",
        "date":             date,
        "platform":         "NoteCraft Local",
        "prepared_by":      "NoteCraft AI",
        "session_overview": ["Transcription completed. Summary generation failed due to system resource limits."],
    }