import os
import re
import json
import httpx
import asyncio
import logging
from dotenv import load_dotenv
from sarvamai import SarvamAI

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("SarvamLLM")

load_dotenv()

# CONFIG
USE_SARVAM     = os.getenv("USE_SARVAM", "false").lower() == "true"
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")
SARVAM_URL     = "https://api.sarvam.ai/v1/chat/completions"
SARVAM_MODEL   = os.getenv("SARVAM_LLM_MODEL", "sarvam-1")

# Initialize Sarvam client if needed
sarvam_client = None
if USE_SARVAM and SARVAM_API_KEY:
    sarvam_client = SarvamAI(api_subscription_key=SARVAM_API_KEY)
    logger.info(f"Using Sarvam AI Cloud (Model: {SARVAM_MODEL}) | Key: {SARVAM_API_KEY[:7]}***")
else:
    logger.info(f"Using Local Ollama (Model: {SARVAM_MODEL})")

MAX_INPUT_CHARS  = 8000 if USE_SARVAM else 4000
MAX_OUTPUT_TOKENS = 2000 if USE_SARVAM else 1000 # Strictly capped at 2000 for Sarvam Starter


# BASE LLM CALL
async def _call_llm(system_prompt: str, user_prompt: str, max_tokens: int = MAX_OUTPUT_TOKENS, is_json: bool = False) -> str:
    """
    Core function to communicate with Ollama or Sarvam API.
    """
    if not user_prompt or not user_prompt.strip():
        logger.warning("Empty user_prompt received, skipping LLM call.")
        return ""
    
    try:
        if USE_SARVAM:
            headers = {
                "api-subscription-key": SARVAM_API_KEY,
                "Content-Type": "application/json"
            }
            payload = {
                "model": SARVAM_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user",   "content": user_prompt},
                ],
                "max_tokens": max_tokens
            }

            for attempt in range(3):
                try:
                    async with httpx.AsyncClient(timeout=180.0) as client:
                        response = await client.post(SARVAM_URL, json=payload, headers=headers)

                        if response.status_code == 200:
                            data = response.json()
                            if "choices" in data:
                                raw_text = data["choices"][0]["message"]["content"].strip()
                            else:
                                raw_text = str(data).strip()

                            print(f"\n[LLM DEBUG] Model: {SARVAM_MODEL}")
                            print(f"[LLM DEBUG] System Prompt: {system_prompt[:100]}...")
                            print(f"[LLM DEBUG] User Prompt Length: {len(user_prompt)}")
                            print(f"[LLM DEBUG] Raw Output: {raw_text[:200]}...")

                            # --- Robust Cleaning ---
                            clean_text = re.sub(r'<think>.*?(?:</think>|$)', '', raw_text, flags=re.DOTALL | re.IGNORECASE).strip()

                            for tag in ["result", "summary", "cleaned_transcript", "output"]:
                                tag_pattern = rf'<{tag}>(.*?)(?:</{tag}>|$)'
                                tag_match = re.search(tag_pattern, clean_text, flags=re.DOTALL | re.IGNORECASE)
                                if tag_match:
                                    content = tag_match.group(1).strip()
                                    if content:
                                        return re.sub(r'</?(?:result|summary|cleaned_transcript|output|think)>', '', content, flags=re.IGNORECASE).strip()

                            clean_text = re.sub(r'</?(?:result|summary|cleaned_transcript|output|think)>', '', clean_text, flags=re.IGNORECASE).strip()
                            if len(clean_text) > 2:
                                return clean_text
                        else:
                            logger.error(f"Sarvam API Error {response.status_code} (Attempt {attempt+1})")
                except Exception as e:
                    logger.error(f"Cloud attempt {attempt+1} Exception: {e}")
                
                if attempt < 2:
                    await asyncio.sleep(2)
            
            logger.error("All cloud LLM attempts failed.")
            return ""

        # Route to Local Ollama (Fallback)
        payload = {
            "model": SARVAM_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt[:4000]},
            ],
            "stream": False,
            "options": {"temperature": 0.1, "num_predict": max_tokens}
        }
        LOCAL_URL = "http://localhost:11434/api/chat"
        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(LOCAL_URL, json=payload)
            if response.status_code == 200:
                result = response.json()
                return result.get("message", {}).get("content", "").strip()
            return ""

    except Exception as e:
        logger.error(f"LLM Error: {e}")
        return ""


# RETRY WRAPPER
async def _safe_llm(system: str, user: str, max_tokens: int = MAX_OUTPUT_TOKENS, is_json: bool = False) -> str:
    for attempt in range(2):
        result = await _call_llm(system, user, max_tokens, is_json)
        if result:
            return result
    return ""


# JSON PARSER
def _parse_json(raw: str) -> dict | None:
    if not raw:
        return None

    def _try_extract(text: str) -> dict | None:
        """Try to parse a JSON object from text."""
        if not text:
            return None
        
        # Clean markdown code blocks if present (e.g. ```json ... ```)
        text = re.sub(r'```(?:json)?\s*(.*?)\s*```', r'\1', text, flags=re.DOTALL | re.IGNORECASE).strip()
        
        # Strategy 1: Direct parse
        try:
            return json.loads(text)
        except Exception:
            pass
            
        # Strategy 2: Find outermost { }
        # We use a non-greedy search for the first { and greedy for the last }
        try:
            match = re.search(r'(\{.*\})', text, re.DOTALL)
            if match:
                json_str = match.group(1)
                # Fix common LLM errors like trailing commas
                json_str = re.sub(r',\s*([\]}])', r'\1', json_str)
                try:
                    return json.loads(json_str)
                except Exception:
                    # Strategy 3: Handle truncated JSON by adding closing braces
                    # This is common with reasoning models that run out of tokens
                    for i in range(1, 5):
                        try:
                            return json.loads(json_str + "}" * i)
                        except:
                            continue

                    # Strategy 4: Handle "Extra data" by finding the first valid object
                    start_idx = json_str.find('{')
                    if start_idx != -1:
                        for end_idx in range(len(json_str), start_idx, -1):
                            try:
                                candidate = json_str[start_idx:end_idx]
                                return json.loads(candidate)
                            except:
                                continue
        except Exception as e:
            logger.error(f"JSON Parse Error: {e}")
        return None

    # Strategy: Pass result through double-encoding check
    def _finalize(res):
        if isinstance(res, str):
            try:
                second_pass = json.loads(res)
                if isinstance(second_pass, dict):
                    return second_pass
            except:
                pass
        return res if isinstance(res, dict) else None

    # Pass 1: Text with <think> blocks stripped
    clean = re.sub(r'<think>.*?(</think>|$)', '', raw, flags=re.DOTALL).strip()
    result = _finalize(_try_extract(clean))
    if result:
        return result

    # Pass 2: Search for <result> tags specifically (case insensitive)
    tag_match = re.search(r'<(result|summary|output)>(.*?)(</\1>|$)', raw, flags=re.DOTALL | re.IGNORECASE)
    if tag_match:
        result = _finalize(_try_extract(tag_match.group(2)))
        if result:
            return result

    # Pass 3: Full raw text (searches INSIDE think blocks)
    result = _finalize(_try_extract(raw))
    if result:
        return result

    logger.error(f"_parse_json: All strategies failed. Raw length: {len(raw)}")
    return None


# JOB 1: CLEAN TRANSCRIPT
async def clean_transcript(raw_transcript: str) -> str:
    if not raw_transcript.strip():
        return ""

    system = (
        "You are a transcript cleaner. Reformat the text into a natural conversation in English.\n"
        "STRICT: NO HALLUCINATION. Use ONLY provided text.\n"
        "TECHNICAL AWARENESS: Correct common ASR errors for technical terms (e.g., 'RAG' instead of 'RAKE', 'LLM' instead of 'elements').\n"
        "CRITICAL: DO NOT use <think> tags. DO NOT reason. Output ONLY the cleaned conversation.\n"
        "Your final output MUST be wrapped entirely inside <result> tags."
    )
    user = raw_transcript[:MAX_INPUT_CHARS]
    result = await _safe_llm(system, user)
    return result if result else raw_transcript


# JOB 2: CHUNK SUMMARY
async def summarise_chunk(clean_transcript: str, prev_summary: str = "", chunk_index: int = 0) -> str:
    if not clean_transcript.strip():
        return ""

    system = (
        "You are an assistant. Summarize this transcript chunk into concise English bullet points.\n"
        "STRICT: Use ONLY provided text. NO assumptions.\n"
        "TECHNICAL AWARENESS: Maintain accuracy for technical acronyms (RAG, API, LLM).\n"
        "CRITICAL: DO NOT use <think> tags. DO NOT reason. Output ONLY the bullet points.\n"
        "Your final output MUST be wrapped entirely inside <result> tags."
    )
    user = clean_transcript[:MAX_INPUT_CHARS]
    return await _safe_llm(system, user)


# JOB 3a: BLOCK AGGREGATION
async def aggregate_block(chunk_summaries: list, block_index: int) -> str:
    if not chunk_summaries:
        return ""

    system = "Merge these summaries into one paragraph while preserving technical terms and acronyms."
    summaries_text = "\n".join([str(s) for s in chunk_summaries if s])[:MAX_INPUT_CHARS]
    return await _safe_llm(system, summaries_text)


# JOB 3b: GENERATE NOTES JSON (Dynamic based on length)
async def generate_ncg(block_summaries: list, participants: list, meeting_date: str) -> dict:
    if not block_summaries:
        return _fallback_notes(participants, meeting_date)

    summaries_text = "\n".join([str(s) for s in block_summaries if s])[:MAX_INPUT_CHARS]
    
    # --- DYNAMIC LOGIC: Short vs Long Sessions ---
    is_long_session = len(block_summaries) > 2 # More than ~9 minutes (approx 10-12 mins audio)
    
    if not is_long_session:
        # CONCISE MODE for short audio
        print(f"[NCG] Short Session detected ({len(block_summaries)} blocks). Using concise generation...")
        system = (
            f"Generate a concise one-page summary. Use date: {meeting_date} if not mentioned. "
            "Focus on the main points so the user remembers the staff's words. "
            "Return ONLY JSON in <result> tags with keys: session_title, session_details, session_overview, "
            "topics_covered, key_takeaways."
        )
        res = await _safe_llm(system, summaries_text, max_tokens=1500, is_json=True)
        final_notes = _parse_json(res) or _fallback_notes(participants, meeting_date)
        final_notes["prepared_by"] = f"Scribely AI ({SARVAM_MODEL})"
        return final_notes

    # VERBOSE MODE for 1-hour sessions
    print(f"[NCG] Long Session detected ({len(block_summaries)} blocks). Using multi-part detailed generation...")

    # --- PART 1: Core Metadata & Overview ---
    system1 = (
        f"Part 1: Session Metadata. Use date: {meeting_date} if not mentioned. "
        "Generate 'session_title', 'session_details', and a detailed 'session_overview'. "
        "Return ONLY JSON in <result> tags."
    )
    res1 = await _safe_llm(system1, summaries_text, max_tokens=1500, is_json=True)
    part1 = _parse_json(res1) or {}

    # --- PART 2: Deep Dive Topics ---
    system2 = (
        "Part 2: Detailed Content. Generate 'topics_covered' and 'concept_notes'. "
        "BE VERY VERBOSE. Explain the staff's words in detail. "
        "Return ONLY JSON in <result> tags."
    )
    res2 = await _safe_llm(system2, summaries_text, max_tokens=2000, is_json=True)
    part2 = _parse_json(res2) or {}

    # --- PART 3: Conclusions ---
    system3 = (
        "Part 3: Takeaways. Generate 'key_takeaways', 'qa_section', and 'practice_work'. "
        "Return ONLY JSON in <result> tags."
    )
    res3 = await _safe_llm(system3, summaries_text, max_tokens=1500, is_json=True)
    part3 = _parse_json(res3) or {}

    # --- MERGE ---
    return {
        "session_title":    part1.get("session_title", "Detailed Session Notes"),
        "session_details":  part1.get("session_details", {"participants": participants, "date": meeting_date}),
        "session_overview": part1.get("session_overview", []),
        "topics_covered":   part2.get("topics_covered", []),
        "concept_notes":    part2.get("concept_notes", []),
        "key_takeaways":    part3.get("key_takeaways", []),
        "qa_section":       part3.get("qa_section", []),
        "practice_work":    part3.get("practice_work", []),
        "prepared_by":      f"Scribely AI ({SARVAM_MODEL})"
    }


# JOB 4: REFINEMENT (skipped for speed)
async def refine_ncg(ncg_json: dict) -> dict:
    return ncg_json


# JOB 5: CUSTOM REFORMAT
async def reformat_notes(current_notes: dict, instruction: str, block_summaries: list = None) -> dict:
    """
    Takes existing notes and reformats them based on a custom user prompt.
    Uses a compact prompt and returns the full raw response so _parse_json
    can find JSON even if the model hid it inside <think> blocks.
    """
    if not current_notes:
        return {}

    # Use both current notes and raw summaries for maximum context
    context_data = {
        "current_structured_notes": current_notes,
        "original_transcription_summaries": block_summaries[:10] if block_summaries else "Not provided"
    }
    context_str = json.dumps(context_data, ensure_ascii=False)
    if len(context_str) > 4000:
        context_str = context_str[:4000] + "..."

    system = (
        "You are an expert editor. Your total output (including thinking) MUST stay under 2000 tokens.\n"
        "CRITICAL: Minimize internal reasoning/thinking. Prioritize the final JSON translation.\n"
        "1. USE ONLY content found in the original notes. ZERO hallucination.\n"
        "2. Output MUST be a valid JSON object wrapped in <result> tags.\n"
        "3. PRESERVE ALL SECTIONS: Translate every value in the JSON while keeping keys IDENTICAL.\n"
        "4. DO NOT translate the keys themselves (e.g., keep 'session_title', 'topics_covered' as they are).\n"
        "5. ENSURE 'session_title' and 'date' are present in the final JSON.\n"
        "6. BE CONCISE: Use direct language to ensure the full document fits in one response."
    )

    user_content = f"User Instruction: {instruction}\n\nOriginal Content Context:\n{context_str}"

    raw = await _safe_llm(system, user_content, max_tokens=MAX_OUTPUT_TOKENS, is_json=True)
    
    parsed = _parse_json(raw)

    if not parsed:
        print(f"WARNING: reformat_notes failed to parse JSON. Raw length: {len(raw)}")

    return parsed if parsed else current_notes


# FALLBACK
def _fallback_notes(participants: list, date: str) -> dict:
    return {
        "session_title":    "Processed Class Notes",
        "date":             date,
        "platform":         "Scribely Local",
        "prepared_by":      "Scribely AI",
        "session_overview": ["Transcription completed. Summary generation failed due to system resource limits."],
    }