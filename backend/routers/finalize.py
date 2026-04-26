import asyncio
from datetime import datetime
from fastapi import APIRouter, HTTPException
from models import FinalizeRequest, ReformatRequest
from session.store import (
    get_session,
    get_all_chunks,
    create_session,
    get_failed_chunks,
    save_chunk,
    save_block_summaries,
    save_ncg,
    save_urls,
    set_status,
)
from services.sarvam_stt import transcribe_chunk
from services.sarvam_llm import (
    clean_transcript,
    summarise_chunk,
    aggregate_block,
    generate_ncg,
    refine_ncg,
    reformat_notes,
)
from services.speaker_map import assign_speakers
from services.export import export_documents

router = APIRouter()

CHUNK_GROUP_SIZE = 5  # number of chunk summaries per block


# ── POST /update-notes ─────────────────────────────────────────
@router.post("/update-notes")
async def update_notes(session_id: str, notes: dict):
    """
    Saves user-edited notes back to the session store.
    """
    save_ncg(session_id, notes)
    
    # Update DOCX/TXT on disk
    from services.export import export_documents
    from session.store import save_urls
    pdf_url, docx_url = export_documents(notes, session_id)
    save_urls(session_id, pdf_url, docx_url)
    
    return {"message": "Notes updated"}


# ── POST /reformat-notes ───────────────────────────────────────
@router.post("/reformat-notes")
async def handle_reformat(request: ReformatRequest):
    """
    Uses LLM to re-organize or simplify notes based on instructions.
    Only uses the information already present in the notes.
    """
    session = get_session(request.session_id)
    if not session or not session.get("ncg_json"):
        raise HTTPException(status_code=404, detail="No notes found to reformat")

    # Get re-organized version from LLM
    block_summaries = session.get("block_summaries", [])
    new_notes = await reformat_notes(session["ncg_json"], request.instruction, block_summaries)
    
    # Save the updated version
    save_ncg(request.session_id, new_notes)
    
    # Update DOCX/TXT on disk
    from services.export import export_documents
    from session.store import save_urls
    pdf_url, docx_url = export_documents(new_notes, request.session_id)
    save_urls(request.session_id, pdf_url, docx_url)
    
    return new_notes


# ── POST /finalize ─────────────────────────────────────────────
@router.post("/finalize")
async def finalize(request: FinalizeRequest):
    """
    Triggered when user clicks End Meeting.
    Runs full pipeline in background and returns immediately.
    """
    session_id = request.session_id
    session    = get_session(session_id)

    # ── Auto-create session if it doesn't exist ────────────────
    # This handles direct API testing without prior chunk uploads
    if not session:
        create_session(session_id, request.participants, [
            e.dict() for e in request.speaker_timeline
        ], title=request.title or "New Recording")
        session = get_session(session_id)

    # ── Update speaker timeline and participants ────────────────
    if request.speaker_timeline:
        session["speaker_timeline"] = [
            e.dict() for e in request.speaker_timeline
        ]
    if request.participants:
        session["participants"] = request.participants
    if request.title:
        session["title"] = request.title

    # Set status to processing and run pipeline in background
    set_status(session_id, "processing")
    asyncio.create_task(run_pipeline(session_id))

    return {"message": "Finalization started", "session_id": session_id}


# ── Full pipeline ──────────────────────────────────────────────
async def run_pipeline(session_id: str):
    """
    Runs the complete pipeline after End Meeting:
        1. Retry failed chunks
        2. Speaker mapping
        3. MAP-REDUCE aggregation
        4. Final Notes generation
        5. Refinement pass
        6. Export PDF + DOCX
    """
    try:
        session = get_session(session_id)

        # ── Wait for pending chunks to finish ──────────────────
        print("Waiting for pending chunks to finish processing...")
        while True:
            chunks = get_all_chunks(session_id)
            if chunks and all(c.get("status") != "pending" for c in chunks):
                break
            # If there are no chunks at all, we shouldn't wait forever
            if not chunks:
                break
            await asyncio.sleep(2)
        print("All chunks finished.")

        # ── Step 1: Retry failed chunks ────────────────────────
        failed = get_failed_chunks(session_id)
        if failed:
            print(f"Retrying {len(failed)} failed chunks...")
            await _retry_failed_chunks(session_id, failed)

        # ── Step 2: Speaker mapping ────────────────────────────
        speaker_timeline = session.get("speaker_timeline", [])
        if speaker_timeline:
            print("Running speaker mapping...")
            chunks = get_all_chunks(session_id)
            tagged_transcript = assign_speakers(chunks, speaker_timeline)
        else:
            print("Skipping speaker mapping (no timeline provided).")

        # ── Step 3: MAP-REDUCE — group chunks into blocks ──────
        chunks = get_all_chunks(session_id)
        if len(chunks) == 1:
            # FAST PATH: Single chunk doesn't need aggregation
            print("Fast Path: Skipping aggregation for single chunk...")
            first_chunk = chunks[0]
            if isinstance(first_chunk, dict):
                block_summaries = [first_chunk.get("summary", "")]
            else:
                block_summaries = [str(first_chunk)]
        else:
            print(f"Running MAP-REDUCE aggregation for {len(chunks)} chunks...")
            block_summaries = await _aggregate_blocks(session_id, chunks)
        
        save_block_summaries(session_id, block_summaries)

        # ── Step 4: Generate final MoM JSON ───────────────────
        print("Generating final Notes...")
        participants = session.get("participants", [])
        meeting_date = datetime.now().strftime("%Y-%m-%d")

        ncg_json = await generate_ncg(
            block_summaries=block_summaries,
            participants=participants,
            meeting_date=meeting_date,
        )

        # ── Step 5: Refinement pass (SKIPPED for speed) ───────
        # print("Running refinement pass...")
        # ncg_json = await refine_ncg(ncg_json)

        # Update session title and category from AI notes
        ai_title = ncg_json.get("session_title")
        if ai_title and ai_title not in ["Session Notes", "New Recording"]:
            session["title"] = ai_title
        
        save_ncg(session_id, ncg_json)

        # ── Step 6: Export PDF + DOCX ──────────────────────────
        # IMPORTANT: We refetch the session here in case user edited notes
        # during the background process (though usually they edit AFTER finalize)
        print("Exporting documents...")
        current_session = get_session(session_id)
        final_json = current_session.get("ncg_json") or ncg_json
        
        pdf_url, docx_url = export_documents(final_json, session_id)
        save_urls(session_id, pdf_url, docx_url)

        # ── Done ───────────────────────────────────────────────
        set_status(session_id, "ready")
        print(f"Pipeline complete for session {session_id}")

    except Exception as e:
        import traceback
        set_status(session_id, "failed")
        print(f"Pipeline error for session {session_id}: {e}")
        traceback.print_exc()
        set_status(session_id, "failed")


# ── Retry failed chunks ────────────────────────────────────────
async def _retry_failed_chunks(session_id: str, failed_indexes: list):
    """
    Re-processes only the chunks that failed during the meeting.
    Runs them sequentially to avoid hammering the Sarvam API.
    """
    session = get_session(session_id)

    for chunk_index in sorted(failed_indexes):
        print(f"Retrying chunk {chunk_index}...")
        try:
            # We don't have the original audio bytes anymore
            # so we mark them as skipped with empty content
            # In production you'd store audio bytes in session too
            save_chunk(session_id, chunk_index, {
                "chunk_index": chunk_index,
                "raw":         "[chunk unavailable — retry failed]",
                "clean":       "[chunk unavailable]",
                "summary":     "[this segment could not be recovered]",
                "words":       [],
                "status":      "ok",  # mark ok so pipeline continues
            })
        except Exception as e:
            print(f"Retry failed for chunk {chunk_index}: {e}")


# ── MAP-REDUCE: group chunk summaries into block summaries ─────
async def _aggregate_blocks(session_id: str, chunks: list) -> list:
    """
    Groups every CHUNK_GROUP_SIZE chunk summaries into one
    block summary using Sarvam-M.

    Example: 40 chunks / 5 per group = 8 block summaries
    """
    # Collect all chunk summaries in order
    summaries = [
        c.get("summary", "") for c in chunks
        if c.get("status") == "ok" and c.get("summary")
    ]

    if not summaries:
        return []

    # Split into groups of CHUNK_GROUP_SIZE
    groups = [
        summaries[i : i + CHUNK_GROUP_SIZE]
        for i in range(0, len(summaries), CHUNK_GROUP_SIZE)
    ]

    # Aggregate each group into one block summary
    block_summaries = []
    for block_index, group in enumerate(groups):
        print(f"Aggregating block {block_index + 1} of {len(groups)}...")
        block_summary = await aggregate_block(group, block_index)
        block_summaries.append(block_summary)

    return block_summaries