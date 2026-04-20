import streamlit as st
import httpx
import time
import os
import json
import asyncio

# --- Configuration ---
BACKEND_URL = "http://localhost:8000"

st.set_page_config(page_title="NoteCraft - AI Meeting Notes", page_icon="📝", layout="centered")

# Custom CSS for a better look
st.markdown("""
    <style>
    .main {
        background-color: #f8f9fa;
    }
    .stButton>button {
        width: 100%;
        border-radius: 10px;
        height: 3em;
        background-color: #4CAF50;
        color: white;
    }
    .stFileUploader {
        border: 2px dashed #4CAF50;
        padding: 10px;
        border-radius: 10px;
    }
    </style>
    """, unsafe_allow_html=True)

st.title("📝 NoteCraft Generator")
tab1, tab2 = st.tabs(["📝 Note Generator", "🤖 AI Assistant"])

with tab1:
    st.markdown("### Upload your meeting audio and get AI-generated notes instantly.")
    uploaded_file = st.file_uploader("Choose an audio file", type=['webm', 'wav', 'mp3', 'm4a'])

    if uploaded_file is not None:
        st.audio(uploaded_file, format='audio/wav')
        
        if st.button("Generate Smart Notes"):
            session_id = f"st-session-{int(time.time())}"
            
            with st.status("🚀 Processing your meeting...", expanded=True) as status:
                async def run_process():
                    async with httpx.AsyncClient(timeout=300.0) as client:
                        # 1. Upload
                        st.write("📤 Uploading audio to server...")
                        files = {"audio": (uploaded_file.name, uploaded_file.getvalue(), "audio/wav")}
                        data = {
                            "session_id": session_id,
                            "chunk_index": 0,
                            "speaker_timeline": json.dumps([]),
                            "participants": json.dumps([])
                        }
                        await client.post(f"{BACKEND_URL}/upload-chunk", files=files, data=data)
                        
                        # 2. Finalize
                        st.write("🤖 AI is analyzing and summarizing...")
                        finalize_data = {
                            "session_id": session_id,
                            "participants": ["Participant 1"],
                            "speaker_timeline": []
                        }
                        await client.post(f"{BACKEND_URL}/finalize", json=finalize_data)
                        
                        # 3. Poll
                        while True:
                            resp = await client.get(f"{BACKEND_URL}/status", params={"session_id": session_id})
                            status_data = resp.json()
                            current_status = status_data.get("status")
                            
                            if current_status == "ready":
                                return status_data
                            elif current_status == "failed":
                                return None
                            
                            st.write(f"🔄 Current state: {current_status}...")
                            await asyncio.sleep(5)

                results = asyncio.run(run_process())
                
                if results:
                    status.update(label="✅ Notes Generated Successfully!", state="complete", expanded=False)
                    st.success("Your smart notes are ready for download!")
                    
                    # Download Button
                    docx_url = f"{BACKEND_URL}/{results.get('docx_url')}"
                    st.markdown(f"#### [📥 Download DOCX Notes]({docx_url})")
                else:
                    status.update(label="❌ Failed to generate notes", state="error")
                    st.error("Something went wrong during processing. Please check backend logs.")

with tab2:
    st.markdown("### Ask anything and get structured AI responses.")
    assistant_query = st.text_input("Enter your request:", placeholder="e.g., Explain quantum physics and show me an atom")
    
    if st.button("Query Assistant"):
        if assistant_query:
            with st.spinner("🤖 Assistant is thinking..."):
                async def call_assistant():
                    async with httpx.AsyncClient(timeout=60.0) as client:
                        resp = await client.post(
                            f"{BACKEND_URL}/assistant/query",
                            json={"query": assistant_query}
                        )
                        return resp.json()
                
                try:
                    res = asyncio.run(call_assistant())
                    st.subheader(f"Response (Type: {res.get('type')})")
                    st.write(res.get("answer"))
                    
                    if res.get("image_prompt"):
                        st.info(f"🎨 **Image Prompt Generated:**\n{res.get('image_prompt')}")
                        st.caption("This prompt can be used to generate an image in a stable diffusion model.")
                    
                    with st.expander("View Full JSON Metadata"):
                        st.json(res)
                except Exception as e:
                    st.error(f"Error connecting to assistant: {e}")
        else:
            st.warning("Please enter a query.")

st.divider()
st.info("Note: This app runs locally. Your data is processed on your computer using Whisper and Ollama.")
