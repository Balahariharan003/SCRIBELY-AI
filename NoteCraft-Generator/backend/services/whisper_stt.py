import os
import tempfile
import subprocess
from faster_whisper import WhisperModel

# Use "base" or "small" for faster local processing on CPU
# Use "medium" or "large-v3" for better quality if GPU is available
MODEL_SIZE = "base"

# Initialize model (this will download it on first run)
print(f"Loading Whisper model ({MODEL_SIZE})...")
model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")

# ── Transcribe one audio chunk ─────────────────────────────────
async def transcribe_chunk(audio_bytes: bytes, chunk_index: int) -> dict:
    if len(audio_bytes) < 1000:
        print(f"STT chunk {chunk_index}: too small, skipping")
        return _failed_result()

    # Convert to WAV first (Whisper likes 16kHz mono)
    wav_path = _convert_to_wav_file(audio_bytes, chunk_index)
    if not wav_path:
        return _failed_result()

    try:
        print(f"STT chunk {chunk_index}: transcribing with local Whisper...")
        segments, info = model.transcribe(wav_path, beam_size=5)
        
        full_transcript = ""
        all_words = []
        
        for segment in segments:
            full_transcript += segment.text + " "
            # If word timestamps are needed, we'd need to set word_timestamps=True in transcribe()
            # and map them. For now, we'll just send the text.
            
        full_transcript = full_transcript.strip()
        
        print(f"STT chunk {chunk_index}: {len(full_transcript)} chars transcribed")
        return {
            "transcript": full_transcript,
            "words":      [], # local whisper segments don't map 1:1 to Sarvam word objects easily here
            "status":     "ok",
        }

    except Exception as e:
        print(f"STT error chunk {chunk_index}: {e}")
        return _failed_result()
    finally:
        if os.path.exists(wav_path):
            os.remove(wav_path)

# ── Convert audio bytes to temporary WAV file ──────────────────
def _convert_to_wav_file(audio_bytes: bytes, chunk_index: int) -> str:
    tmp_in = tmp_out = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
            f.write(audio_bytes)
            tmp_in = f.name

        tmp_out = tmp_in.replace(".webm", ".wav")

        result = subprocess.run(
            ["ffmpeg", "-y", "-i", tmp_in, "-ar", "16000", "-ac", "1", "-f", "wav", tmp_out],
            capture_output=True, timeout=60,
        )

        if result.returncode != 0:
            print(f"ffmpeg error chunk {chunk_index}:", result.stderr.decode()[-300:])
            return None

        return tmp_out

    except Exception as e:
        print(f"WAV conversion error chunk {chunk_index}: {e}")
        return None
    finally:
        if tmp_in and os.path.exists(tmp_in):
            os.remove(tmp_in)

def _failed_result() -> dict:
    return {"transcript": "", "words": [], "status": "failed"}