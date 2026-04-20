/* ══════════════════════════════════════════════════════════════
   NoteCraft AI — Application Logic
   ══════════════════════════════════════════════════════════════ */

const BACKEND_URL = 'http://localhost:8000';

// ═══════════════════ STATE ═══════════════════
const state = {
    notes: [],
    folders: [],
    currentNote: null,
    editingNote: null,
    selectedEmoji: '📝',
    selectedColor: '#4A90D9',
    isRecording: false,
    mediaRecorder: null,
    audioChunks: [],
    recordingTimer: null,
    recordingSeconds: 0,
    audioContext: null,
    analyser: null,
    waveformAnimId: null,
    currentPage: 'all-notes',
};

// ═══════════════════ INIT ═══════════════════
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initSplash();
    initNavigation();
    initTabs();
    initSearch();
    initFAB();
    initNoteDetail();
    initEditor();
    initRecording();
    initAssistant();
    initUpload();
    initFolders();
    renderNotes();
    renderFolders();
});

// ═══════════════════ LOCAL STORAGE ═══════════════════
function loadData() {
    try {
        state.notes = JSON.parse(localStorage.getItem('notecraft_notes') || '[]');
        state.folders = JSON.parse(localStorage.getItem('notecraft_folders') || '[]');
    } catch {
        state.notes = [];
        state.folders = [];
    }
    // Seed demo notes if empty
    if (state.notes.length === 0) {
        state.notes = getDemoNotes();
        saveData();
    }
    if (state.folders.length === 0) {
        state.folders = getDemoFolders();
        saveData();
    }
}

function saveData() {
    localStorage.setItem('notecraft_notes', JSON.stringify(state.notes));
    localStorage.setItem('notecraft_folders', JSON.stringify(state.folders));
}

function getDemoNotes() {
    return [
        {
            id: generateId(),
            title: 'Healthy Nutrition',
            emoji: '🍎',
            color: '#2ECC71',
            body: `The core principles of healthy nutrition emphasize a balanced intake of essential food groups, including proteins, carbohydrates, fats, vitamins, and minerals, to ensure the body receives all necessary nutrients. Prioritizing fresh and natural foods such as fruits, vegetables, whole grains, legumes, and healthy fats is crucial, as these options provide the most nutritional benefits without added harmful substances.\n\nAvoiding processed foods, fast food, processed sugars, and high-salt items is also key, as these can lead to various health issues and nutritional imbalances.\n\nAdequate water intake is another cornerstone of healthy nutrition, ensuring the body remains properly hydrated to support all its functions. By adhering to these principles, individuals can promote overall well-being and long-term health.\n\nEmbracing these guidances can lead to a healthier lifestyle.`,
            folder: null,
            createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
            updatedAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
            id: generateId(),
            title: 'Meeting Notes - Q2 Planning',
            emoji: '💼',
            color: '#4A90D9',
            body: `Quarterly planning meeting with the product team.\n\nKey Discussion Points:\n• Review of Q1 metrics and performance indicators\n• Product roadmap priorities for Q2\n• Resource allocation and team capacity\n• Customer feedback themes and action items\n\nAction Items:\n1. Finalize feature prioritization by Friday\n2. Schedule design reviews for top 3 features\n3. Prepare customer interview summary\n4. Update OKRs with new targets\n\nNext Steps:\n- Follow up meeting scheduled for next Tuesday\n- Individual team leads to submit resource requests\n- Engineering to provide effort estimates`,
            folder: null,
            createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
            updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        },
        {
            id: generateId(),
            title: 'Machine Learning Concepts',
            emoji: '🔬',
            color: '#9B59B6',
            body: `Introduction to Machine Learning\n\nSupervised Learning:\nAlgorithms that learn from labeled training data to make predictions. Common examples include classification and regression.\n\nUnsupervised Learning:\nAlgorithms that find patterns in data without pre-existing labels. Includes clustering and dimensionality reduction.\n\nKey Algorithms:\n• Linear Regression - Predicting continuous values\n• Decision Trees - Tree-based classification\n• Neural Networks - Deep learning architectures\n• K-Means - Clustering similar data points\n\nImportant Concepts:\n- Training vs Testing data split\n- Overfitting and underfitting\n- Cross-validation techniques\n- Feature engineering and selection`,
            folder: null,
            createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
            updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
        },
        {
            id: generateId(),
            title: 'Weekly Goals & Tasks',
            emoji: '🎯',
            color: '#F39C12',
            body: `Weekly Planning\n\nPriority Tasks:\n☐ Complete project proposal draft\n☐ Review code pull requests\n☐ Prepare presentation slides\n☐ Schedule one-on-ones with team\n\nPersonal Goals:\n☐ Read 2 chapters of current book\n☐ Exercise 3 times this week\n☐ Learn new React patterns\n\nNotes:\n- Deadline for proposal: Thursday EOD\n- Team standup moved to 10 AM\n- Friday is a half day`,
            folder: null,
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            updatedAt: new Date().toISOString(),
        },
    ];
}

function getDemoFolders() {
    return [
        { id: generateId(), name: 'Work', icon: 'work', noteCount: 0 },
        { id: generateId(), name: 'Personal', icon: 'person', noteCount: 0 },
        { id: generateId(), name: 'Study', icon: 'school', noteCount: 0 },
    ];
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// ═══════════════════ SPLASH ═══════════════════
function initSplash() {
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        const main = document.getElementById('main-app');
        splash.style.animation = 'splashFadeOut 0.4s ease forwards';
        setTimeout(() => {
            splash.style.display = 'none';
            main.style.display = 'flex';
        }, 400);
    }, 2000);
}

// ═══════════════════ NAVIGATION ═══════════════════
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const nav = item.dataset.nav;
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            if (nav === 'home') {
                navigateTo('all-notes');
                showMainUI();
            } else if (nav === 'record') {
                startRecording();
            } else if (nav === 'assistant') {
                navigateTo('assistant');
                hideMainUI();
            }
        });
    });
}

function navigateTo(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`page-${pageId}`);
    if (target) target.classList.add('active');
    state.currentPage = pageId;
}

function showMainUI() {
    document.getElementById('app-header').style.display = 'flex';
    document.getElementById('tab-bar').style.display = 'flex';
    document.getElementById('fab-btn').style.display = 'flex';
    document.getElementById('bottom-nav').style.display = 'flex';
}

function hideMainUI() {
    document.getElementById('app-header').style.display = 'none';
    document.getElementById('tab-bar').style.display = 'none';
    document.getElementById('fab-btn').style.display = 'none';
}

// ═══════════════════ TABS ═══════════════════
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.dataset.tab;
            if (tab === 'all-notes') {
                navigateTo('all-notes');
            } else if (tab === 'folders') {
                navigateTo('folders');
            }
        });
    });
}

// ═══════════════════ SEARCH ═══════════════════
function initSearch() {
    const btnSearch = document.getElementById('btn-search');
    const searchOverlay = document.getElementById('search-overlay');
    const btnCloseSearch = document.getElementById('btn-close-search');
    const searchInput = document.getElementById('search-input');

    btnSearch.addEventListener('click', () => {
        searchOverlay.style.display = 'flex';
        searchInput.focus();
    });

    btnCloseSearch.addEventListener('click', () => {
        searchOverlay.style.display = 'none';
        searchInput.value = '';
        renderNotes();
    });

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        renderNotes(query);
    });
}

// ═══════════════════ RENDER NOTES ═══════════════════
function renderNotes(searchQuery = '') {
    const list = document.getElementById('notes-list');
    const empty = document.getElementById('empty-state');

    let filtered = state.notes;
    if (searchQuery) {
        filtered = state.notes.filter(n =>
            n.title.toLowerCase().includes(searchQuery) ||
            n.body.toLowerCase().includes(searchQuery)
        );
    }

    if (filtered.length === 0) {
        list.innerHTML = '';
        empty.style.display = 'flex';
        return;
    }

    empty.style.display = 'none';

    // Sort by updatedAt descending
    filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    list.innerHTML = filtered.map((note, i) => `
        <div class="note-card" data-id="${note.id}" style="animation-delay: ${i * 0.05}s">
            <div class="note-card-header">
                <span class="note-card-emoji">${note.emoji || '📝'}</span>
                <div class="note-card-info">
                    <div class="note-card-title">${escapeHtml(note.title)}</div>
                    <div class="note-card-meta">
                        <span class="note-card-words">
                            <span class="material-icons-round">text_fields</span>
                            ${countWords(note.body)} Words
                        </span>
                        <span>Last Modified: ${formatDate(note.updatedAt)}</span>
                    </div>
                </div>
            </div>
            <div class="note-card-preview">${escapeHtml(note.body)}</div>
        </div>
    `).join('');

    // Attach click handlers
    list.querySelectorAll('.note-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.dataset.id;
            openNoteDetail(id);
        });
    });
}

// ═══════════════════ RENDER FOLDERS ═══════════════════
function renderFolders() {
    const list = document.getElementById('folders-list');
    const folderIcons = {
        work: 'work',
        person: 'person',
        school: 'school',
        default: 'folder'
    };

    list.innerHTML = state.folders.map(folder => {
        const noteCount = state.notes.filter(n => n.folder === folder.id).length;
        const icon = folderIcons[folder.icon] || 'folder';
        return `
            <div class="folder-card" data-id="${folder.id}">
                <div class="folder-card-icon">
                    <span class="material-icons-round">${icon}</span>
                </div>
                <div class="folder-card-info">
                    <div class="folder-card-name">${escapeHtml(folder.name)}</div>
                    <div class="folder-card-count">${noteCount} note${noteCount !== 1 ? 's' : ''}</div>
                </div>
                <span class="material-icons-round folder-card-arrow">chevron_right</span>
            </div>
        `;
    }).join('');
}

// ═══════════════════ NOTE DETAIL ═══════════════════
function initNoteDetail() {
    document.getElementById('btn-back-from-detail').addEventListener('click', () => {
        navigateTo('all-notes');
        showMainUI();
    });

    document.getElementById('btn-edit-note').addEventListener('click', () => {
        openEditor(state.currentNote);
    });

    document.getElementById('btn-note-tools').addEventListener('click', () => {
        document.getElementById('note-tools-panel').style.display = 'flex';
    });

    document.getElementById('tools-overlay').addEventListener('click', () => {
        document.getElementById('note-tools-panel').style.display = 'none';
    });

    document.getElementById('btn-note-menu').addEventListener('click', () => {
        if (state.currentNote) {
            if (confirm('Delete this note?')) {
                state.notes = state.notes.filter(n => n.id !== state.currentNote.id);
                saveData();
                renderNotes();
                navigateTo('all-notes');
                showMainUI();
                showToast('Note deleted');
            }
        }
    });

    // Tool cards
    document.querySelectorAll('.tool-card').forEach(card => {
        card.addEventListener('click', () => {
            const tool = card.dataset.tool;
            document.getElementById('note-tools-panel').style.display = 'none';
            handleNoteTool(tool);
        });
    });
}

function openNoteDetail(noteId) {
    const note = state.notes.find(n => n.id === noteId);
    if (!note) return;

    state.currentNote = note;
    hideMainUI();
    navigateTo('note-detail');

    document.getElementById('note-detail-emoji').textContent = note.emoji || '📝';
    document.getElementById('note-detail-title').textContent = note.title;
    document.getElementById('note-detail-words').querySelector('.word-count').textContent = `${countWords(note.body)} Words`;
    document.getElementById('note-detail-date').textContent = `Last Modified: ${formatDate(note.updatedAt)}`;
    document.getElementById('note-detail-body').textContent = note.body;
}

async function handleNoteTool(tool) {
    if (!state.currentNote) return;

    const toolNames = {
        summarize: 'Summarize',
        flashcards: 'Create Flashcards',
        quiz: 'Generate Quiz',
        translate: 'Translate',
        keypoints: 'Extract Key Points',
        rewrite: 'Rewrite',
    };

    showToast(`${toolNames[tool] || tool}: Processing...`);

    try {
        const resp = await fetch(`${BACKEND_URL}/assistant/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: `${toolNames[tool]} the following note:\n\n${state.currentNote.body}`
            }),
        });

        if (!resp.ok) throw new Error('Request failed');

        const data = await resp.json();
        const answer = data.answer || 'No response received';

        // Create a new note with the result
        const newNote = {
            id: generateId(),
            title: `${toolNames[tool]}: ${state.currentNote.title}`,
            emoji: '✨',
            color: '#9B59B6',
            body: answer,
            folder: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        state.notes.unshift(newNote);
        saveData();
        renderNotes();
        showToast(`${toolNames[tool]} completed! New note created.`);
        openNoteDetail(newNote.id);
    } catch (err) {
        showToast('AI processing failed. Is the backend running?');
        console.error(err);
    }
}

// ═══════════════════ EDITOR ═══════════════════
function initEditor() {
    document.getElementById('btn-cancel-edit').addEventListener('click', () => {
        if (state.editingNote) {
            openNoteDetail(state.editingNote.id);
        } else {
            navigateTo('all-notes');
            showMainUI();
        }
    });

    document.getElementById('btn-save-edit').addEventListener('click', saveNote);

    // Emoji picker
    document.querySelectorAll('.emoji-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            state.selectedEmoji = btn.dataset.emoji;
        });
    });

    // Color picker
    document.querySelectorAll('.color-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
            dot.classList.add('selected');
            state.selectedColor = dot.dataset.color;
        });
    });
}

function openEditor(note = null) {
    state.editingNote = note;
    hideMainUI();
    navigateTo('note-editor');

    const titleInput = document.getElementById('editor-title-input');
    const bodyInput = document.getElementById('editor-body-input');

    if (note) {
        titleInput.value = note.title;
        bodyInput.value = note.body;
        state.selectedEmoji = note.emoji || '📝';
        state.selectedColor = note.color || '#4A90D9';

        // Set emoji selection
        document.querySelectorAll('.emoji-btn').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.emoji === state.selectedEmoji);
        });

        // Set color selection
        document.querySelectorAll('.color-dot').forEach(dot => {
            dot.classList.toggle('selected', dot.dataset.color === state.selectedColor);
        });
    } else {
        titleInput.value = '';
        bodyInput.value = '';
        state.selectedEmoji = '📝';
        state.selectedColor = '#4A90D9';

        document.querySelectorAll('.emoji-btn').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.emoji === '📝');
        });
        document.querySelectorAll('.color-dot').forEach(dot => {
            dot.classList.toggle('selected', dot.dataset.color === '#4A90D9');
        });
    }

    titleInput.focus();
}

function saveNote() {
    const title = document.getElementById('editor-title-input').value.trim();
    const body = document.getElementById('editor-body-input').value.trim();

    if (!title && !body) {
        showToast('Please add a title or content');
        return;
    }

    if (state.editingNote) {
        // Update existing
        const idx = state.notes.findIndex(n => n.id === state.editingNote.id);
        if (idx !== -1) {
            state.notes[idx].title = title || 'Untitled';
            state.notes[idx].body = body;
            state.notes[idx].emoji = state.selectedEmoji;
            state.notes[idx].color = state.selectedColor;
            state.notes[idx].updatedAt = new Date().toISOString();
        }
        saveData();
        renderNotes();
        showToast('Note updated');
        openNoteDetail(state.editingNote.id);
    } else {
        // New note
        const newNote = {
            id: generateId(),
            title: title || 'Untitled',
            emoji: state.selectedEmoji,
            color: state.selectedColor,
            body: body,
            folder: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        state.notes.unshift(newNote);
        saveData();
        renderNotes();
        showToast('Note saved');
        navigateTo('all-notes');
        showMainUI();
    }
}

// ═══════════════════ FAB ═══════════════════
function initFAB() {
    const fabBtn = document.getElementById('fab-btn');
    const fabMenu = document.getElementById('fab-menu');
    const fabOverlay = document.getElementById('fab-menu-overlay');

    fabBtn.addEventListener('click', () => {
        const isOpen = fabMenu.style.display === 'flex';
        if (isOpen) {
            closeFABMenu();
        } else {
            openFABMenu();
        }
    });

    fabOverlay.addEventListener('click', closeFABMenu);

    document.getElementById('fab-new-text').addEventListener('click', () => {
        closeFABMenu();
        openEditor();
    });

    document.getElementById('fab-record').addEventListener('click', () => {
        closeFABMenu();
        startRecording();
    });

    document.getElementById('fab-upload').addEventListener('click', () => {
        closeFABMenu();
        hideMainUI();
        navigateTo('upload');
    });
}

function openFABMenu() {
    document.getElementById('fab-menu').style.display = 'flex';
    document.getElementById('fab-menu-overlay').style.display = 'block';
    document.getElementById('fab-btn').classList.add('active');
}

function closeFABMenu() {
    document.getElementById('fab-menu').style.display = 'none';
    document.getElementById('fab-menu-overlay').style.display = 'none';
    document.getElementById('fab-btn').classList.remove('active');
}

// ═══════════════════ RECORDING ═══════════════════
function initRecording() {
    document.getElementById('btn-back-from-recording').addEventListener('click', stopRecording);
    document.getElementById('btn-cancel-recording').addEventListener('click', stopRecording);
    document.getElementById('btn-done-recording').addEventListener('click', finishRecording);
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        state.mediaRecorder = new MediaRecorder(stream);
        state.audioChunks = [];

        state.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) state.audioChunks.push(e.data);
        };

        state.mediaRecorder.start(1000);
        state.isRecording = true;
        state.recordingSeconds = 0;

        hideMainUI();
        navigateTo('recording');

        // Timer
        state.recordingTimer = setInterval(() => {
            state.recordingSeconds++;
            document.getElementById('recording-timer').textContent = formatTime(state.recordingSeconds);
        }, 1000);

        // Waveform
        setupWaveform(stream);

        // Update transcript area
        document.getElementById('recording-transcript').innerHTML =
            '<p class="transcript-placeholder">Speak now... Your words will appear here in real-time.</p>';

    } catch (err) {
        showToast('Microphone access denied');
        console.error(err);
    }
}

function setupWaveform(stream) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 256;

    state.audioContext = audioCtx;
    state.analyser = analyser;

    const canvas = document.getElementById('waveform-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
        state.waveformAnimId = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
            const y = (canvas.height - barHeight) / 2;

            const hue = 0;
            const sat = 0;
            const light = 20 + (dataArray[i] / 255) * 30;

            ctx.fillStyle = `hsl(${hue}, ${sat}%, ${light}%)`;
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth - 1, barHeight, 2);
            ctx.fill();

            x += barWidth;
        }
    }

    draw();
}

function stopRecording() {
    if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
        state.mediaRecorder.stop();
        state.mediaRecorder.stream.getTracks().forEach(t => t.stop());
    }

    clearInterval(state.recordingTimer);
    cancelAnimationFrame(state.waveformAnimId);

    if (state.audioContext) {
        state.audioContext.close();
    }

    state.isRecording = false;
    state.recordingSeconds = 0;
    document.getElementById('recording-timer').textContent = '00:00:00';

    navigateTo('all-notes');
    showMainUI();

    // Reset bottom nav
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector('.nav-item[data-nav="home"]').classList.add('active');
}

async function finishRecording() {
    if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
        state.mediaRecorder.stop();
        state.mediaRecorder.stream.getTracks().forEach(t => t.stop());
    }

    clearInterval(state.recordingTimer);
    cancelAnimationFrame(state.waveformAnimId);

    if (state.audioContext) {
        state.audioContext.close();
    }

    state.isRecording = false;

    showToast('Processing recording...');

    // Create audio blob
    const audioBlob = new Blob(state.audioChunks, { type: 'audio/webm' });

    // Try uploading to backend
    try {
        const sessionId = `web-${Date.now()}`;
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        formData.append('session_id', sessionId);
        formData.append('chunk_index', '0');
        formData.append('speaker_timeline', '[]');
        formData.append('participants', '[]');

        await fetch(`${BACKEND_URL}/upload-chunk`, {
            method: 'POST',
            body: formData,
        });

        await fetch(`${BACKEND_URL}/finalize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: sessionId,
                participants: ['User'],
                speaker_timeline: [],
            }),
        });

        // Poll status
        const pollStatus = async () => {
            const resp = await fetch(`${BACKEND_URL}/status?session_id=${sessionId}`);
            const data = await resp.json();

            if (data.status === 'ready') {
                // Create note from transcript
                const newNote = {
                    id: generateId(),
                    title: `Recording - ${new Date().toLocaleDateString()}`,
                    emoji: '🎙️',
                    color: '#E74C3C',
                    body: `Audio recording transcribed and processed.\n\nDownload your detailed notes: ${BACKEND_URL}${data.docx_url}`,
                    folder: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                state.notes.unshift(newNote);
                saveData();
                renderNotes();
                showToast('Recording processed! Notes generated.');
                openNoteDetail(newNote.id);
                return;
            } else if (data.status === 'failed') {
                showToast('Processing failed');
                navigateTo('all-notes');
                showMainUI();
                return;
            }

            setTimeout(pollStatus, 3000);
        };

        pollStatus();
    } catch (err) {
        // Save locally as transcript
        const newNote = {
            id: generateId(),
            title: `Recording - ${new Date().toLocaleDateString()}`,
            emoji: '🎙️',
            color: '#E74C3C',
            body: `Audio recorded for ${formatTime(state.recordingSeconds)}.\n\n(Backend not available for transcription. Start the backend to process recordings.)`,
            folder: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        state.notes.unshift(newNote);
        saveData();
        renderNotes();
        showToast('Recording saved locally');
    }

    state.recordingSeconds = 0;
    document.getElementById('recording-timer').textContent = '00:00:00';
    navigateTo('all-notes');
    showMainUI();

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector('.nav-item[data-nav="home"]').classList.add('active');
}

// ═══════════════════ ASSISTANT ═══════════════════
function initAssistant() {
    document.getElementById('btn-back-from-assistant').addEventListener('click', () => {
        navigateTo('all-notes');
        showMainUI();
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelector('.nav-item[data-nav="home"]').classList.add('active');
    });

    document.getElementById('btn-send-assistant').addEventListener('click', sendAssistantMessage);

    document.getElementById('assistant-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendAssistantMessage();
    });

    // Suggestion chips
    document.querySelectorAll('.suggestion-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.getElementById('assistant-input').value = chip.dataset.query;
            sendAssistantMessage();
        });
    });
}

async function sendAssistantMessage() {
    const input = document.getElementById('assistant-input');
    const query = input.value.trim();
    if (!query) return;

    const messages = document.getElementById('assistant-messages');

    // Remove welcome screen
    const welcome = messages.querySelector('.assistant-welcome');
    if (welcome) welcome.remove();

    // Add user message
    appendMessage('user', query);
    input.value = '';

    // Add typing indicator
    const typingId = 'typing-' + Date.now();
    messages.insertAdjacentHTML('beforeend', `
        <div class="chat-message assistant" id="${typingId}">
            <div class="chat-bubble">
                <div class="typing-indicator">
                    <span></span><span></span><span></span>
                </div>
            </div>
        </div>
    `);
    messages.scrollTop = messages.scrollHeight;

    try {
        const resp = await fetch(`${BACKEND_URL}/assistant/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
        });

        if (!resp.ok) throw new Error('Request failed');

        const data = await resp.json();
        const answer = data.answer || 'No response received';

        // Remove typing indicator
        const typingEl = document.getElementById(typingId);
        if (typingEl) typingEl.remove();

        appendMessage('assistant', answer);
    } catch (err) {
        const typingEl = document.getElementById(typingId);
        if (typingEl) typingEl.remove();

        appendMessage('assistant', 'Sorry, I couldn\'t connect to the AI backend. Make sure the server is running on localhost:8000.');
    }
}

function appendMessage(role, content) {
    const messages = document.getElementById('assistant-messages');
    messages.insertAdjacentHTML('beforeend', `
        <div class="chat-message ${role}">
            <div class="chat-bubble">${escapeHtml(content)}</div>
        </div>
    `);
    messages.scrollTop = messages.scrollHeight;
}

// ═══════════════════ UPLOAD ═══════════════════
function initUpload() {
    const dropzone = document.getElementById('upload-dropzone');
    const fileInput = document.getElementById('audio-file-input');
    const fileInfo = document.getElementById('upload-file-info');
    const filenameSpan = document.getElementById('upload-filename');
    const generateBtn = document.getElementById('btn-generate-notes');

    document.getElementById('btn-back-from-upload').addEventListener('click', () => {
        navigateTo('all-notes');
        showMainUI();
        resetUpload();
    });

    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--accent)';
        dropzone.style.background = 'var(--accent-soft)';
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = '';
        dropzone.style.background = '';
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = '';
        dropzone.style.background = '';
        if (e.dataTransfer.files.length) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
            handleFileSelect(fileInput.files[0]);
        }
    });

    document.getElementById('btn-remove-file').addEventListener('click', resetUpload);

    generateBtn.addEventListener('click', generateNotesFromUpload);

    function handleFileSelect(file) {
        const validTypes = ['.webm', '.wav', '.mp3', '.m4a'];
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        if (!validTypes.includes(ext)) {
            showToast('Invalid file type. Use WAV, MP3, WEBM, or M4A');
            return;
        }

        state.uploadedFile = file;
        dropzone.style.display = 'none';
        fileInfo.style.display = 'flex';
        filenameSpan.textContent = file.name;
        generateBtn.disabled = false;
    }
}

function resetUpload() {
    state.uploadedFile = null;
    document.getElementById('upload-dropzone').style.display = 'flex';
    document.getElementById('upload-file-info').style.display = 'none';
    document.getElementById('btn-generate-notes').disabled = true;
    document.getElementById('audio-file-input').value = '';
    document.getElementById('processing-card').style.display = 'none';
    document.getElementById('result-card').style.display = 'none';
    document.querySelector('.upload-card').style.display = 'block';
}

async function generateNotesFromUpload() {
    if (!state.uploadedFile) return;

    const uploadCard = document.querySelector('.upload-card');
    const processingCard = document.getElementById('processing-card');
    const resultCard = document.getElementById('result-card');
    const bar = document.getElementById('processing-bar');
    const statusText = document.getElementById('processing-status');

    uploadCard.style.display = 'none';
    processingCard.style.display = 'block';
    bar.style.width = '10%';
    statusText.textContent = 'Uploading audio to server...';

    const sessionId = `web-upload-${Date.now()}`;

    try {
        // Upload
        const formData = new FormData();
        formData.append('audio', state.uploadedFile, state.uploadedFile.name);
        formData.append('session_id', sessionId);
        formData.append('chunk_index', '0');
        formData.append('speaker_timeline', '[]');
        formData.append('participants', '[]');

        bar.style.width = '30%';
        statusText.textContent = 'Uploading audio...';

        await fetch(`${BACKEND_URL}/upload-chunk`, {
            method: 'POST',
            body: formData,
        });

        bar.style.width = '50%';
        statusText.textContent = 'AI is analyzing and summarizing...';

        // Finalize
        await fetch(`${BACKEND_URL}/finalize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: sessionId,
                participants: ['User'],
                speaker_timeline: [],
            }),
        });

        bar.style.width = '70%';
        statusText.textContent = 'Generating smart notes...';

        // Poll
        const poll = async () => {
            const resp = await fetch(`${BACKEND_URL}/status?session_id=${sessionId}`);
            const data = await resp.json();

            if (data.status === 'ready') {
                bar.style.width = '100%';
                statusText.textContent = 'Complete!';

                setTimeout(() => {
                    processingCard.style.display = 'none';
                    resultCard.style.display = 'block';
                    document.getElementById('download-link').href = `${BACKEND_URL}${data.docx_url}`;
                }, 500);

                // Create a note entry
                const newNote = {
                    id: generateId(),
                    title: `Uploaded Audio Notes - ${new Date().toLocaleDateString()}`,
                    emoji: '📝',
                    color: '#4A90D9',
                    body: `Smart notes generated from uploaded audio file: ${state.uploadedFile.name}\n\nNotes have been exported as DOCX.`,
                    folder: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                state.notes.unshift(newNote);
                saveData();
                renderNotes();
                return;
            } else if (data.status === 'failed') {
                processingCard.style.display = 'none';
                showToast('Processing failed. Check backend logs.');
                uploadCard.style.display = 'block';
                resetUpload();
                return;
            }

            bar.style.width = `${70 + Math.random() * 15}%`;
            statusText.textContent = `Processing: ${data.status}...`;
            setTimeout(poll, 3000);
        };

        poll();
    } catch (err) {
        processingCard.style.display = 'none';
        uploadCard.style.display = 'block';
        showToast('Failed to connect to backend server');
        resetUpload();
        console.error(err);
    }
}

// ═══════════════════ FOLDERS ═══════════════════
function initFolders() {
    const modal = document.getElementById('new-folder-modal');
    const nameInput = document.getElementById('folder-name-input');

    document.getElementById('btn-new-folder').addEventListener('click', () => {
        modal.style.display = 'flex';
        nameInput.value = '';
        nameInput.focus();
    });

    document.getElementById('btn-cancel-folder').addEventListener('click', () => {
        modal.style.display = 'none';
    });

    document.getElementById('btn-create-folder').addEventListener('click', () => {
        const name = nameInput.value.trim();
        if (!name) {
            showToast('Enter a folder name');
            return;
        }

        const newFolder = {
            id: generateId(),
            name: name,
            icon: 'folder',
            noteCount: 0,
        };

        state.folders.push(newFolder);
        saveData();
        renderFolders();
        modal.style.display = 'none';
        showToast(`Folder "${name}" created`);
    });

    // Close modal by clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });
}

// ═══════════════════ UTILS ═══════════════════
function countWords(text) {
    if (!text) return 0;
    return text.split(/\s+/).filter(w => w.length > 0).length;
}

function formatDate(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function formatTime(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, duration = 2500) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.display = 'block';

    clearTimeout(state.toastTimeout);
    state.toastTimeout = setTimeout(() => {
        toast.style.display = 'none';
    }, duration);
}
