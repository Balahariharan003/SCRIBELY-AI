import os
import json
import httpx
from services.ollama_llm import _call_llm, _parse_json

SYSTEM_PROMPT = """
You are an advanced multi-modal AI assistant.

Your responsibilities:
1. Understand user input (text, voice-transcribed text, or image-related queries)
2. Decide the intent of the request
3. Respond clearly and concisely
4. Generate structured output for system processing

---

### TASKS YOU MUST PERFORM:

You must classify the user request into ONE of the following types:

1. "text" → General question or explanation
2. "image_generation" → User wants an image to be created
3. "image_analysis" → User provides or refers to an image
4. "multi" → Needs both explanation + image

---

### OUTPUT FORMAT (STRICT JSON ONLY)

Return ONLY valid JSON:

{
  "type": "text | image_generation | image_analysis | multi",
  "answer": "clear explanation for the user",
  "image_prompt": "detailed prompt for image generation or null",
  "extra": {
    "confidence": "high/medium/low",
    "notes": "optional reasoning"
  }
}

---

### RULES:

- Always explain in simple, human-friendly language
- If user asks "show me", "generate", "draw", "create image" → use image_generation
- If user uploads or refers to an image → use image_analysis
- If both explanation + image needed → use multi
- image_prompt must be:
  - detailed
  - descriptive
  - optimized for Stable Diffusion
- If no image needed → image_prompt = null
- NEVER return text outside JSON
"""

async def process_assistant_query(user_query: str) -> dict:
    """
    Processes a user query and returns a structured JSON response
    following the multi-modal classification logic.
    """
    raw_response = await _call_llm(SYSTEM_PROMPT, user_query)
    parsed = _parse_json(raw_response)
    
    if not parsed:
        # Fallback if LLM fails to return valid JSON
        return {
            "type": "text",
            "answer": "I'm sorry, I couldn't process that request properly.",
            "image_prompt": None,
            "extra": {
                "confidence": "low",
                "notes": "Failed to parse LLM response"
            }
        }
    
    return parsed
