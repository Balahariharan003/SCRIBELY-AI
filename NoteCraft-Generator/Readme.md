# NoteCraft AI

> AI-Powered Note Taker — Record, Transcribe & Generate Smart Notes locally.

Transform meetings, lectures, and conversations into professional AI-generated notes. Everything runs **100% locally** on your machine using Ollama and faster-whisper — your data never leaves your computer.

---

## ✨ Features

- 📝 **Create & Manage Notes** — rich text editor with emoji icons and color coding
- 🎙️ **Record & Transcribe** — record audio directly in the browser with live waveform visualization
- 📤 **Upload Audio** — drag & drop audio files (WAV, MP3, WEBM, M4A) for processing
- 🤖 **AI Assistant** — ask questions, summarize notes, generate flashcards, quizzes, and more
- 🛠️ **Note Tools** — Summarize, Flashcards, Quiz, Translate, Key Points, Rewrite
- 📁 **Folders** — organize notes into custom folders
- 🔍 **Search** — instant search across all notes
- 📥 **DOCX Export** — download professional formatted documents
- 🔒 **Privacy-first** — all processing happens locally, files auto-deleted after download

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML, CSS, JavaScript (Vanilla — no build tools) |
| Backend | Python, FastAPI |
| Speech-to-Text | [faster-whisper](https://github.com/SYSTRAN/faster-whisper) (Local) |
| LLM | [Ollama](https://ollama.com/) / Llama 3 (Local) |
| DOCX Export | python-docx |

---

## Project Structure

```
NoteCraft-Generator/
├── frontend/               # Web UI (plain HTML/CSS/JS)
│   ├── index.html          # Single-page application
│   ├── styles.css          # Design system
│   └── app.js              # Application logic
│
├── backend/                # FastAPI server
│   ├── main.py             # Entry point & CORS config
│   ├── models.py           # Pydantic data models
│   ├── routers/
│   │   ├── chunks.py       # /upload-chunk endpoint
│   │   ├── finalize.py     # /finalize endpoint
│   │   ├── status.py       # /status & /outputs endpoints
│   │   └── assistant_router.py  # /assistant/query endpoint
│   ├── services/
│   │   ├── whisper_stt.py  # Speech-to-text (faster-whisper)
│   │   ├── ollama_llm.py   # LLM calls (Ollama)
│   │   ├── assistant_service.py # AI assistant logic
│   │   ├── export.py       # DOCX generation
│   │   └── speaker_map.py  # Speaker diarization
│   ├── session/            # Session state management
│   ├── outputs/            # Generated files (auto-cleaned)
│   └── requirements.txt
│
├── app.py                  # Streamlit app (legacy)
└── Readme.md
```

---

## Prerequisites

- **Python 3.11+**
- **ffmpeg** installed and added to PATH ([download](https://ffmpeg.org/download.html))
- **[Ollama](https://ollama.com/)** installed and running
- At least **8GB RAM** (16GB recommended for local LLM)

---

## Setup — Step by Step

### 1. Install Ollama

Download and install from [ollama.com](https://ollama.com/download).

Then pull the LLM model (~4.7GB):

```bash
ollama pull llama3
```

Ollama runs as a background service on `http://localhost:11434`.

### 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Verify: open `http://localhost:8000` — should return `{"status": "Notes Generator API is running"}`.

### 3. Frontend Setup

The frontend is **plain HTML/CSS/JS** — no `npm install` needed.

Simply serve the files with any static server:

```bash
npx -y http-server frontend -p 3000
```

Then open **http://localhost:3000** in your browser.

---

## Quick Start

```bash
# Terminal 1 — Backend
cd backend
uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
npx -y http-server frontend -p 3000
```

| Service | URL |
|---------|-----|
| Ollama | http://localhost:11434 |
| Backend API | http://localhost:8000 |
| Frontend | http://localhost:3000 |

---

## How to Use

1. **Start** both the Backend and Frontend servers
2. **Open** `http://localhost:3000` in your browser
3. **Create notes** — tap the ✚ button → "New Note" to write manually
4. **Record audio** — tap the ✚ button → "Record & Transcribe" or use the mic icon in the bottom nav
5. **Upload audio** — tap the ✚ button → "Upload Audio" to process a file
6. **AI Assistant** — tap the ✨ AI icon in the bottom nav to chat with the AI
7. **Note Tools** — open any note → tap "Note Tools" for Summarize, Flashcards, Quiz, etc.
8. **Download** generated DOCX notes after audio processing completes

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload-chunk` | Upload audio chunk with session metadata |
| POST | `/finalize` | Trigger transcription & note generation |
| GET | `/status?session_id=...` | Poll processing status |
| GET | `/outputs/{filename}` | Download generated DOCX file |
| POST | `/assistant/query` | AI assistant query |

---

## License

This project is for educational and personal use.