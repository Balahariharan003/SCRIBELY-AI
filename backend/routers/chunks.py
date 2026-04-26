import json
import asyncio
import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from session.store import save_chunk, get_session, create_session, get_chunk
from services.sarvam_stt import transcribe_chunk
from services.sarvam_llm import clean_transcript, summarise_chunk
from routers.finalize import run_pipeline

OUTPUTS_DIR = os.path.join(os.path.dirname(__file__), "..", "outputs")

router = APIRouter()


# ── POST /upload-chunk ─────────────────────────────────────────
@router.post("/upload-chunk")
async def upload_chunk(
    audio:           UploadFile = File(...),
    session_id:      str        = Form(...),
    chunk_index:     int        = Form(...),
    speaker_timeline: str       = Form(default="[]"),
    participants:    str        = Form(default="[]"),
):
    """
    Receives one 3-min audio chunk from the extension.
    Immediately starts STT + cleaning + summary in background.
    Returns instantly so the extension is not blocked.
    """
    print(f"\n[RECEIVE] >>> Session: {session_id} | Chunk: {chunk_index} | Size: {audio.size} bytes")

    # ── Validate ───────────────────────────────────────────────
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")

    # ── Parse JSON strings from form fields ───────────────────
    try:
        timeline     = json.loads(speaker_timeline)
        participants_list = json.loads(participants)
    except json.JSONDecodeError:
        timeline          = []
        participants_list = []

    # ── Create session if first chunk ─────────────────────────
    session = get_session(session_id)
    if not session:
        create_session(session_id, participants_list, timeline)

    # ── Read audio bytes ───────────────────────────────────────
    audio_bytes = await audio.read()

    if len(audio_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty audio file received")

    # ── Save chunk as pending immediately ─────────────────────
    save_chunk(session_id, chunk_index, {
        "chunk_index": chunk_index,
        "raw":         "",
        "clean":       "",
        "summary":     "",
        "words":       [],
        "status":      "pending",
    })
    print(f"[STORE]   >>> Chunk {chunk_index} saved as PENDING in memory.")

    # ── Process chunk in background ───────────────────────────
    # Fire and forget — extension does not wait for this
    asyncio.create_task(
        process_chunk(session_id, chunk_index, audio_bytes)
    )

    return {
        "message":     "Chunk received",
        "session_id":  session_id,
        "chunk_index": chunk_index,
    }


# ── Background task: STT → clean → summarise ──────────────────
async def process_chunk(session_id: str, chunk_index: int, audio_bytes: bytes):
    """
    Runs in the background while the meeting continues.
    Steps:
        1. STT  — get raw transcript + word timestamps
        2. Clean — remove fillers and ASR errors
        3. Summarise — 3-5 bullet summary with context carryover
    """
    try:
        # ── Step 1: Speech to text ─────────────────────────────
        stt_result = await transcribe_chunk(audio_bytes, chunk_index, session_id)

        if stt_result["status"] == "failed":
            save_chunk(session_id, chunk_index, {
                "chunk_index": chunk_index,
                "raw":         "",
                "clean":       "",
                "summary":     "",
                "words":       [],
                "status":      "failed",
            })
            return

        raw_transcript = stt_result["transcript"]
        words          = stt_result["words"]

        # ── Step 2: Clean transcript ───────────────────────────
        cleaned = await clean_transcript(raw_transcript)

        # ── Step 3: Get previous chunk summary for context ─────
        prev_summary = _get_prev_summary(session_id, chunk_index)

        # ── Step 4: Summarise this chunk ───────────────────────
        summary = await summarise_chunk(
            clean_transcript=cleaned,
            prev_summary=prev_summary,
            chunk_index=chunk_index,
        )

        # ── Save all results ───────────────────────────────────
        save_chunk(session_id, chunk_index, {
            "chunk_index": chunk_index,
            "raw":         raw_transcript,
            "clean":       cleaned,
            "summary":     summary,
            "words":       words,
            "status":      "ok",
        })

        # ── Save raw transcript to TXT file ────────────────────
        _save_chunk_txt(session_id, chunk_index, raw_transcript, cleaned, summary)

        # ── Auto-generate DOCX immediately ─────────────────────
        await run_pipeline(session_id)

        print(f"Chunk {chunk_index} processed successfully for session {session_id}")

    except Exception as e:
        print(f"Chunk {chunk_index} processing error: {e}")
        save_chunk(session_id, chunk_index, {
            "chunk_index": chunk_index,
            "raw":         "",
            "clean":       "",
            "summary":     "",
            "words":       [],
            "status":      "failed",
        })


# ── Get previous chunk summary for context carryover ──────────
def _get_prev_summary(session_id: str, chunk_index: int) -> str:
    if chunk_index == 0:
        return ""
    prev = get_chunk(session_id, chunk_index - 1)
    return prev.get("summary", "")


# ── Save chunk transcript to TXT file ─────────────────────────
def _save_chunk_txt(session_id: str, chunk_index: int, raw: str, clean: str, summary: str):
    """Save chunk processing output to TXT file for debugging/viewing."""
    os.makedirs(OUTPUTS_DIR, exist_ok=True)
    filename = f"chunk_{chunk_index}_{session_id[:8]}.txt"
    filepath = os.path.join(OUTPUTS_DIR, filename)

    lines = [
        f"Chunk {chunk_index} - Session {session_id}",
        "=" * 60,
        "",
        "CLEANED CONVERSATION:",
        "-" * 40,
        clean,
        "",
        "SUMMARY:",
        "-" * 40,
        summary,
        "",
        "=" * 60,
    ]

    with open(filepath, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


# ── GET /chunk-output ─────────────────────────────────────────
@router.get("/chunk-output")
async def get_chunk_output(session_id: str, chunk_index: int):
    """
    View the processed output for a specific chunk.
    Returns the TXT file for download.
    """
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    chunk = get_chunk(session_id, chunk_index)
    if not chunk or chunk.get("status") != "ok":
        raise HTTPException(status_code=404, detail="Chunk not found or not processed")

    filename = f"chunk_{chunk_index}_{session_id[:8]}.txt"
    filepath = os.path.join(OUTPUTS_DIR, filename)

    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Output file not found")

    return FileResponse(
        path=filepath,
        filename=filename,
        media_type="text/plain",
    )


# ── GET /chunk-data ───────────────────────────────────────────
@router.get("/chunk-data")
async def get_chunk_data(session_id: str, chunk_index: int):
    """
    View the chunk data as JSON (for debugging in Swagger).
    Returns raw transcript, cleaned transcript, and summary.
    """
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    chunk = get_chunk(session_id, chunk_index)
    if not chunk:
        raise HTTPException(status_code=404, detail="Chunk not found")

    return {
        "session_id": session_id,
        "chunk_index": chunk_index,
        "status": chunk.get("status"),
        "raw_transcript": chunk.get("raw", ""),
        "cleaned_transcript": chunk.get("clean", ""),
        "summary": chunk.get("summary", ""),
    }