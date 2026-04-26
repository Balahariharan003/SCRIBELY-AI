# Scribely AI 🎙️✨

> **AI-Powered Note Taker** — Capture, Transcribe, and Transform your audio into premium professional notes instantly.

Scribely AI is a modern, high-performance note-taking ecosystem designed to turn meetings, lectures, and casual conversations into structured, actionable documents. Powered by **Sarvam AI**, it offers industry-leading transcription and intelligent summarization wrapped in a premium mobile-first experience.

---

## 🌟 Key Features

- 🎙️ **Live AI Recording** — Real-time audio capture with high-fidelity chunking using `expo-audio`.
- ⚡ **Sarvam AI Core** — Lightning-fast transcription (`saaras:v3`) and intelligent reasoning (`sarvam-m`).
- 🎨 **Premium Slate UI** — Sleek, modern dark-themed interface built for focus and clarity.
- 📄 **Beautiful Exports** — Generate professional **PDF** and **DOCX** documents with custom branding.
- 📤 **Native Sharing** — Instantly send your notes to WhatsApp, Google Drive, or Email via the Android share sheet.
- 🤖 **Ask AI Assistant** — Reformat, translate, or query your notes using natural language.
- 🔒 **Secure Processing** — Robust LLM orchestration with intelligent JSON parsing and error recovery.

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | React Native (Expo SDK 54), TypeScript |
| **Backend** | Python 3.11+, FastAPI, Uvicorn |
| **STT Engine** | [Sarvam AI](https://www.sarvam.ai/) (Cloud) / Faster-Whisper (Local Fallback) |
| **LLM Orchestrator** | [Sarvam AI](https://www.sarvam.ai/) (sarvam-m) / Ollama (Local Fallback) |
| **PDF Generation** | ReportLab (Styled A4) |
| **DOCX Export** | python-docx |

---

## 📂 Project Structure

```text
.
├── frontend/               # React Native (Expo) Mobile App
│   ├── src/
│   │   ├── screens/        # Login, Home, Recorder, Notes, History
│   │   └── components/     # Reusable UI components
│   └── assets/             # Branding & App Icons
│
├── backend/                # FastAPI High-Performance Server
│   ├── main.py             # Entry point & Static File Mounting
│   ├── routers/            # API Endpoints (Chunks, Finalize, Status)
│   ├── services/           # Core Logic (STT, LLM, Export, Cleaning)
│   ├── session/            # In-memory session state management
│   └── outputs/            # Generated PDF/DOCX/TXT files
│
└── Readme.md
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Python 3.11+**
- **Node.js & npm**
- **FFmpeg** (Required for audio processing. Ensure it's in your system PATH)
- **Expo Go** app installed on your Android/iOS device
- **Sarvam AI API Key** (Add your key to `backend/.env`)

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Create a `.env` file in the `backend/` folder:
   ```env
   SARVAM_API_KEY=your_key_here
   ```
4. Start the server (using 0.0.0.0 allows your phone to connect over Wi-Fi):
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8001
   ```

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Update `API_BASE_URL` in your screens to your computer's local IP address.
4. Start the app:
   ```bash
   npm start
   ```
Scan the QR code with **Expo Go** to launch the app on your phone.

---

## 📋 API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/upload-chunk` | Stream audio bytes to the server |
| `POST` | `/finalize` | Trigger the AI transcription & summarization pipeline |
| `GET`  | `/status` | Poll for real-time processing updates and URLs |
| `POST` | `/reformat-notes` | Ask AI to transform existing notes (translate, shorten, etc.) |
| `GET`  | `/outputs/{file}` | Download generated PDF or DOCX documents |

---

## 🛡️ License
Scribely AI is designed for professional note-taking and productivity. All rights reserved.