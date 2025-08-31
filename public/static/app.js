// AI Audiobook Creator - Voice Cloning Studio JavaScript

// Global variables for voice recording and cloning
let mediaRecorder;
let recordedChunks = [];
let isRecording = false;
let recordingTimer;
let recordingStartTime;
let audioContext;
let analyser;
let microphone;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApplication();
});

function initializeApplication() {
    console.log('🎵 AUTHORR AI - Complete Platform Initialized');
    
    // Detect current page and initialize accordingly
    const currentPage = getCurrentPage();
    console.log(`Current page: ${currentPage}`);
    
    // Initialize common functionality
    initializeCommonFeatures();
    
    // Initialize page-specific functionality
    switch(currentPage) {
        case 'dashboard':
            initializeDashboard();
            break;
        case 'workspace':
            initializeWorkspace();
            break;
        case 'narration':
            initializeNarration();
            break;
        case 'export':
            initializeExport();
            break;
        default:
            initializeDashboard(); // Default to dashboard
    }
}

function getCurrentPage() {
    const path = window.location.pathname;
    if (path === '/' || path === '/dashboard') return 'dashboard';
    if (path.startsWith('/workspace')) return 'workspace';
    if (path.startsWith('/narration')) return 'narration';
    if (path.startsWith('/export')) return 'export';
    return 'dashboard';
}

function initializeCommonFeatures() {
    console.log('🔧 Initializing common features...');
    
    // Add any common functionality that works across all pages
    setupGlobalEventListeners();
}

function initializeDashboard() {
    console.log('📊 Initializing Dashboard...');
    
    // Load recent projects
    loadRecentProjects();
    
    // Setup project creation form
    setupProjectCreationForm();
}

function initializeWorkspace() {
    console.log('✍️ Initializing Workspace...');
    
    // Initialize writing tools
    setupWritingTools();
    
    // Initialize manuscript editor
    setupManuscriptEditor();
    
    // Initialize writing statistics
    setupWritingStatistics();
    
    // Initialize new workspace buttons
    setupWorkspaceButtons();
}

function initializeNarration() {
    console.log('🎙️ Initializing Narration Studio...');
    
    // Initialize audio visualizer
    initializeAudioVisualizer();
    
    // Initialize voice recording
    initializeVoiceRecording();
    
    // Initialize file upload
    initializeFileUpload();
    
    // Initialize voice cloning
    initializeVoiceCloning();
    
    // Initialize TTS providers and voices
    loadTTSProviders();
    loadVoices();
    
    // Initialize enhanced lighting effects
    initializeNarrationLighting();
    
    // Initialize character counter
    initializeCharacterCounter();
}

// Audio Visualizer Functions
function initializeAudioVisualizer() {
    const visualizer = document.getElementById('audio-visualizer');
    if (visualizer) {
        // Start the equalizer animation
        startEqualizerAnimation();
    }
}

function startEqualizerAnimation() {
    const bars = document.querySelectorAll('.eq-bar');
    bars.forEach((bar, index) => {
        // Add random height variations to make it more dynamic
        setInterval(() => {
            const randomHeight = Math.random() * 35 + 5;
            bar.style.height = randomHeight + 'px';
        }, 150 + (index * 50));
    });
}

// Voice Recording Functions
function initializeVoiceRecording() {
    const recordBtn = document.getElementById('record-btn');
    const playBtn = document.getElementById('play-btn');
    const stopBtn = document.getElementById('stop-btn');
    
    if (recordBtn) {
        recordBtn.addEventListener('click', toggleRecording);
    }
    if (playBtn) {
        playBtn.addEventListener('click', playRecording);
    }
    if (stopBtn) {
        stopBtn.addEventListener('click', stopRecording);
    }
}

async function toggleRecording() {
    if (!isRecording) {
        await startRecording();
    } else {
        await stopRecording();
    }
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 44100
            } 
        });
        
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
        });
        
        recordedChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'audio/webm' });
            const audioUrl = URL.createObjectURL(blob);
            
            // Enable play button
            const playBtn = document.getElementById('play-btn');
            if (playBtn) {
                playBtn.disabled = false;
                playBtn.setAttribute('data-audio-url', audioUrl);
            }
            
            updateRecordingStatus('Recording completed. Ready for voice analysis.');
            analyzeVoiceCharacteristics();
        };
        
        mediaRecorder.start(100);
        isRecording = true;
        
        // Update UI
        updateRecordingUI(true);
        startRecordingTimer();
        startWaveformAnimation();
        
        updateRecordingStatus('Recording in progress...');
        
    } catch (error) {
        console.error('Error starting recording:', error);
        updateRecordingStatus('Error: Could not access microphone');
    }
}

async function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        isRecording = false;
        
        // Update UI
        updateRecordingUI(false);
        stopRecordingTimer();
        stopWaveformAnimation();
    }
}

function playRecording() {
    const playBtn = document.getElementById('play-btn');
    const audioUrl = playBtn?.getAttribute('data-audio-url');
    
    if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.play().catch(error => {
            console.error('Error playing audio:', error);
            updateRecordingStatus('Error playing recorded audio');
        });
    }
}

function updateRecordingUI(recording) {
    const recordBtn = document.getElementById('record-btn');
    const recordText = document.getElementById('record-text');
    const stopBtn = document.getElementById('stop-btn');
    const recordingVisual = document.getElementById('recording-visual');
    
    if (recording) {
        recordBtn?.classList.add('recording');
        if (recordText) recordText.textContent = 'Recording...';
        stopBtn?.classList.remove('hidden');
        recordingVisual?.classList.add('recording');
        
        // Activate enhanced waveform
        animateVoiceWaveform('recording-visual', true);
        updateStatusLight('record-btn', 'processing');
        
        // Show pulse ring effect during recording
        const pulseRing = document.querySelector('.pulse-ring');
        if (pulseRing) {
            pulseRing.style.display = 'block';
        }
        
        // Show and start recording timer
        const recordingTimer = document.getElementById('recording-timer');
        if (recordingTimer) {
            recordingTimer.style.display = 'block';
        }
        
        // Add recording glow effect to record button
        if (recordBtn) {
            recordBtn.style.boxShadow = `
                0 0 20px rgba(239, 68, 68, 0.8),
                0 0 40px rgba(239, 68, 68, 0.4)
            `;
        }
    } else {
        recordBtn?.classList.remove('recording');
        if (recordText) recordText.textContent = 'Start Recording';
        stopBtn?.classList.add('hidden');
        recordingVisual?.classList.remove('recording');
        
        // Deactivate waveform
        animateVoiceWaveform('recording-visual', false);
        updateStatusLight('record-btn', 'ready');
        
        // Hide pulse ring effect
        const pulseRing = document.querySelector('.pulse-ring');
        if (pulseRing) {
            pulseRing.style.display = 'none';
        }
        
        // Hide recording timer
        const recordingTimer = document.getElementById('recording-timer');
        if (recordingTimer) {
            recordingTimer.style.display = 'none';
        }
        
        // Remove recording glow effect
        if (recordBtn) {
            recordBtn.style.boxShadow = '';
        }
    }
}

function startRecordingTimer() {
    recordingStartTime = Date.now();
    recordingTimer = setInterval(updateRecordingTimer, 100);
}

function stopRecordingTimer() {
    if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
    }
}

function updateRecordingTimer() {
    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const timerElement = document.getElementById('recording-timer');
    
    if (timerElement) {
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

function startWaveformAnimation() {
    const waveformContainer = document.querySelector('.waveform-container');
    if (waveformContainer) {
        waveformContainer.innerHTML = generateWaveform();
        animateWaveform();
    }
}

function stopWaveformAnimation() {
    const waveformContainer = document.querySelector('.waveform-container');
    if (waveformContainer) {
        waveformContainer.innerHTML = '<span class="text-gray-400 text-sm">Recording completed</span>';
    }
}

function generateWaveform() {
    let waveform = '';
    for (let i = 0; i < 20; i++) {
        const height = Math.random() * 30 + 5;
        waveform += `<div class="waveform-bar" style="height: ${height}px; width: 3px; background: #06b6d4; margin: 0 1px; display: inline-block; animation: waveform-pulse 0.5s infinite alternate;"></div>`;
    }
    return waveform;
}

function animateWaveform() {
    const bars = document.querySelectorAll('.waveform-bar');
    bars.forEach((bar, index) => {
        setInterval(() => {
            if (isRecording) {
                const height = Math.random() * 30 + 5;
                bar.style.height = height + 'px';
            }
        }, 100 + (index * 20));
    });
}

function updateRecordingStatus(message) {
    const statusElement = document.getElementById('recording-status');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

// File Upload Functions
function initializeFileUpload() {
    const uploadInput = document.getElementById('voice-upload');
    const uploadZone = document.querySelector('.upload-zone');
    
    if (uploadInput && uploadZone) {
        uploadZone.addEventListener('click', () => uploadInput.click());
        uploadInput.addEventListener('change', handleVoiceUpload);
        
        // Drag and drop functionality
        uploadZone.addEventListener('dragover', handleDragOver);
        uploadZone.addEventListener('drop', handleDrop);
    }
}

function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.style.borderColor = '#06b6d4';
}

function handleDrop(event) {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        processUploadedFile(files[0]);
    }
}

function handleVoiceUpload(event) {
    const file = event.target.files[0];
    if (file) {
        processUploadedFile(file);
    }
}

function processUploadedFile(file) {
    if (!file.type.startsWith('audio/')) {
        updateUploadStatus('Error: Please select an audio file');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
        updateUploadStatus('Error: File size must be less than 10MB');
        return;
    }
    
    updateUploadStatus('Uploading and analyzing audio file...');
    showUploadProgress();
    
    // Simulate upload progress
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
            progress = 100;
            clearInterval(progressInterval);
            setTimeout(() => {
                updateUploadStatus('Audio file uploaded successfully!');
                hideUploadProgress();
                analyzeVoiceCharacteristics();
            }, 500);
        }
        updateUploadProgress(progress);
    }, 200);
}

function updateUploadStatus(message) {
    const statusElement = document.getElementById('upload-status');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

function showUploadProgress() {
    const progressElement = document.getElementById('upload-progress');
    if (progressElement) {
        progressElement.classList.remove('hidden');
    }
}

function hideUploadProgress() {
    const progressElement = document.getElementById('upload-progress');
    if (progressElement) {
        progressElement.classList.add('hidden');
    }
}

function updateUploadProgress(percentage) {
    const progressBar = document.getElementById('upload-progress-bar');
    if (progressBar) {
        progressBar.style.width = percentage + '%';
    }
}

// Voice Analysis Functions
function analyzeVoiceCharacteristics() {
    updateAnalysisProgress(0);
    
    // Simulate voice analysis with realistic progression
    const characteristics = [
        { id: 'voice-pitch', values: ['Low', 'Medium-Low', 'Medium', 'Medium-High', 'High'] },
        { id: 'voice-tone', values: ['Cold', 'Neutral', 'Warm', 'Rich', 'Bright'] },
        { id: 'voice-accent', values: ['British', 'American', 'Neutral American', 'Australian', 'Canadian'] },
        { id: 'voice-quality', values: ['Rough', 'Clear', 'Crisp', 'Smooth', 'Professional'] }
    ];
    
    let progress = 0;
    const analysisInterval = setInterval(() => {
        progress += Math.random() * 10 + 5;
        if (progress >= 100) {
            progress = 100;
            clearInterval(analysisInterval);
            
            // Update characteristics with random values
            characteristics.forEach(char => {
                const element = document.getElementById(char.id);
                if (element) {
                    const randomValue = char.values[Math.floor(Math.random() * char.values.length)];
                    element.textContent = randomValue;
                }
            });
        }
        updateAnalysisProgress(progress);
    }, 300);
}

function updateAnalysisProgress(percentage) {
    const progressBar = document.getElementById('analysis-progress');
    const percentageElement = document.getElementById('analysis-percentage');
    
    if (progressBar) {
        progressBar.style.width = percentage + '%';
    }
    if (percentageElement) {
        percentageElement.textContent = Math.round(percentage) + '%';
    }
}

// Voice Cloning Functions
function initializeVoiceCloning() {
    const cloneButton = document.querySelector('.clone-button');
    const testButton = document.querySelector('.test-button');
    const saveButton = document.querySelector('.save-button');
    
    if (cloneButton) {
        cloneButton.addEventListener('click', createVoiceClone);
    }
    if (testButton) {
        testButton.addEventListener('click', testClonedVoice);
    }
    if (saveButton) {
        saveButton.addEventListener('click', saveToVoiceLibrary);
    }
}

function createVoiceClone() {
    const voiceName = document.getElementById('voice-name')?.value || 'Custom Voice';
    const similarity = document.getElementById('similarity-strength')?.value || 0.8;
    const stability = document.getElementById('voice-stability')?.value || 0.7;
    
    console.log(`🔬 Creating voice clone: ${voiceName}`);
    console.log(`📊 Settings - Similarity: ${similarity}, Stability: ${stability}`);
    
    // Simulate voice cloning process
    alert(`🎭 Creating voice clone "${voiceName}"...\n\n📊 Similarity: ${(similarity * 100).toFixed(0)}%\n🎯 Stability: ${(stability * 100).toFixed(0)}%\n\n⏳ This would normally take 2-3 minutes to process.`);
}

function testClonedVoice() {
    console.log('🎤 Testing cloned voice...');
    alert('🔊 Playing test sample of cloned voice...\n\nThis would play a sample of your cloned voice saying a test phrase.');
}

function saveToVoiceLibrary() {
    const voiceName = document.getElementById('voice-name')?.value || 'Custom Voice';
    console.log(`💾 Saving voice "${voiceName}" to library...`);
    alert(`✅ Voice "${voiceName}" saved to your voice library!\n\nYou can now use this voice for audiobook generation.`);
}

// TTS Provider and Voice Loading
function loadTTSProviders() {
    const providerSelect = document.getElementById('provider-select');
    if (providerSelect) {
        const providers = [
            'OpenAI TTS',
            'ElevenLabs',
            'Google Cloud TTS',
            'Amazon Polly',
            'Microsoft Azure'
        ];
        
        providerSelect.innerHTML = providers.map(provider => 
            `<option value="${provider.toLowerCase().replace(/\s+/g, '-')}">${provider}</option>`
        ).join('');
    }
}

function loadVoices() {
    const voiceSelect = document.getElementById('voice-select');
    if (voiceSelect) {
        const voices = [
            'Sarah - Professional Female',
            'David - Authoritative Male',
            'Emily - Warm Female',
            'James - Deep Male',
            'Lisa - Energetic Female',
            'Michael - Narrative Male',
            'Custom Cloned Voice'
        ];
        
        voiceSelect.innerHTML = voices.map(voice => 
            `<option value="${voice.toLowerCase().replace(/\s+/g, '-')}">${voice}</option>`
        ).join('');
    }
}

// Preview Functions
function initializePreviewButton() {
    const previewBtn = document.getElementById('preview-audio-btn');
    const voicePreviewBtn = document.getElementById('voice-preview-btn');
    const voiceReviewBtn = document.getElementById('voice-review-btn');
    
    if (previewBtn) {
        previewBtn.addEventListener('click', previewAudio);
    }
    if (voicePreviewBtn) {
        voicePreviewBtn.addEventListener('click', previewVoiceActor);
    }
    if (voiceReviewBtn) {
        voiceReviewBtn.addEventListener('click', reviewVoiceConfiguration);
    }
}

function previewAudio() {
    console.log('🔊 Previewing audio...');
    
    // Animate the audio visualizer more intensely
    const bars = document.querySelectorAll('.eq-bar');
    bars.forEach(bar => {
        bar.style.animationDuration = '0.5s';
    });
    
    // Reset animation after preview
    setTimeout(() => {
        bars.forEach(bar => {
            bar.style.animationDuration = '1.5s';
        });
    }, 3000);
    
    alert('🎵 Playing audio preview...\n\nThis would play a sample of the current chapter with selected voice settings.');
}

function previewVoiceActor() {
    const selectedVoice = document.getElementById('voice-select')?.value;
    console.log(`🎭 Previewing voice actor: ${selectedVoice}`);
    alert(`🎤 Playing voice actor sample...\n\nVoice: ${selectedVoice}\n\nThis would play a sample phrase in the selected voice.`);
}

// Utility Functions
function showElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.remove('hidden');
    }
}

function hideElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.add('hidden');
    }
}

function updateElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
    }
}

// Initialize additional features when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializePreviewButton();
    
    // Add smooth scrolling for navigation
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Character Counter and Duration Estimator
function initializeCharacterCounter() {
    const textInput = document.getElementById('text-input');
    const charCount = document.getElementById('char-count');
    const durationEst = document.getElementById('duration-est');
    
    if (textInput && charCount && durationEst) {
        textInput.addEventListener('input', function() {
            const text = this.value;
            const characters = text.length;
            const words = text.trim() ? text.trim().split(/\s+/).length : 0;
            
            // Update character count
            charCount.textContent = characters;
            
            // Estimate duration (average 150 WPM reading speed)
            const estimatedMinutes = words / 150;
            const totalSeconds = Math.round(estimatedMinutes * 60);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            
            if (totalSeconds > 0) {
                durationEst.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            } else {
                durationEst.textContent = '0s';
            }
            
            // Update status light based on content
            if (characters > 0) {
                updateStatusLight('text-input', 'ready');
            } else {
                updateStatusLight('text-input', 'error');
            }
        });
    }
});

console.log('🚀 AI Audiobook Creator - Voice Cloning Studio Ready!');

// =============================================================================
// DASHBOARD PAGE FUNCTIONS
// =============================================================================

function loadRecentProjects() {
    axios.get('/api/projects')
        .then(response => {
            const projects = response.data.projects;
            const projectsList = document.getElementById('projects-list');
            if (projectsList && projects) {
                projectsList.innerHTML = projects.map(project => `
                    <div class="bg-gray-700 rounded-lg p-6 hover:bg-gray-600 transition-colors cursor-pointer">
                        <div class="flex justify-between items-start mb-3">
                            <h4 class="font-semibold text-white">${project.title}</h4>
                            <span class="text-xs px-2 py-1 rounded ${project.status === 'Complete' ? 'bg-green-600' : 'bg-yellow-600'} text-white">
                                ${project.status}
                            </span>
                        </div>
                        <p class="text-sm text-gray-300 mb-2">by ${project.author}</p>
                        <p class="text-xs text-gray-400">Created: ${project.created}</p>
                        <div class="mt-4 flex gap-2">
                            <button class="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1 rounded text-xs transition-all">
                                <i class="fas fa-edit mr-1"></i>Edit
                            </button>
                            <button class="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded text-xs transition-all">
                                <i class="fas fa-microphone mr-1"></i>Narrate
                            </button>
                        </div>
                    </div>
                `).join('');
            }
        })
        .catch(error => {
            console.error('Failed to load projects:', error);
        });
}

function setupProjectCreationForm() {
    const projectForm = document.getElementById('project-form');
    if (projectForm) {
        projectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                title: document.getElementById('book-title')?.value,
                author: document.getElementById('author-name')?.value,
                audience: document.getElementById('target-audience')?.value,
                genre: document.getElementById('genre')?.value,
                tone: document.getElementById('tone-voice')?.value,
                perspective: document.getElementById('narrative-perspective')?.value,
                theme: document.getElementById('theme-message')?.value
            };
            
            if (!formData.title || !formData.author) {
                alert('Please fill in the required fields (Title and Author)');
                return;
            }
            
            try {
                const response = await axios.post('/api/project/create', formData);
                console.log('Project created:', response.data);
                alert('Project created successfully! Redirecting to workspace...');
                window.location.href = '/workspace';
            } catch (error) {
                console.error('Failed to create project:', error);
                alert('Failed to create project. Please try again.');
            }
        });
    }
}

// =============================================================================
// WORKSPACE PAGE FUNCTIONS
// =============================================================================

function setupWritingTools() {
    // AI Writing Tools buttons
    const toolButtons = document.querySelectorAll('[class*="bg-purple-600"], [class*="bg-blue-600"], [class*="bg-green-600"], [class*="bg-orange-600"], [class*="bg-red-600"], [class*="bg-teal-600"]');
    
    toolButtons.forEach(button => {
        if (button.textContent.includes('Generate Ideas')) {
            button.addEventListener('click', () => {
                console.log('Generate Ideas clicked');
                alert('AI Ideas Generator coming soon!');
            });
        } else if (button.textContent.includes('Create Outline')) {
            button.addEventListener('click', () => {
                console.log('Create Outline clicked');
                alert('AI Outline Creator coming soon!');
            });
        } else if (button.textContent.includes('Expand Text')) {
            button.addEventListener('click', () => {
                console.log('Expand Text clicked');
                alert('AI Text Expander coming soon!');
            });
        } else if (button.textContent.includes('Summarize')) {
            button.addEventListener('click', () => {
                console.log('Summarize clicked');
                alert('AI Summarizer coming soon!');
            });
        } else if (button.textContent.includes('Rewrite')) {
            button.addEventListener('click', () => {
                console.log('Rewrite clicked');
                alert('AI Rewriter coming soon!');
            });
        } else if (button.textContent.includes('Character Builder')) {
            button.addEventListener('click', () => {
                console.log('Character Builder clicked');
                alert('AI Character Builder coming soon!');
            });
        }
    });
}

function setupManuscriptEditor() {
    const editor = document.getElementById('manuscript-editor');
    const chapterTitle = document.getElementById('chapter-title');
    
    if (editor) {
        editor.addEventListener('input', updateWritingStatistics);
        
        // Auto-save functionality
        let saveTimeout;
        editor.addEventListener('input', () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                console.log('Auto-saving manuscript...');
                // Implement auto-save here
            }, 2000);
        });
    }
    
    if (chapterTitle) {
        chapterTitle.addEventListener('input', () => {
            console.log('Chapter title updated:', chapterTitle.value);
        });
    }
}

function setupWritingStatistics() {
    updateWritingStatistics();
}

function updateWritingStatistics() {
    const editor = document.getElementById('manuscript-editor');
    if (!editor) return;
    
    const text = editor.value || '';
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    const charCount = text.length;
    const paraCount = text.split('\n\n').filter(p => p.trim()).length;
    const readingTime = Math.ceil(wordCount / 200); // Average reading speed
    
    const updateElement = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };
    
    updateElement('word-count', wordCount.toLocaleString());
    updateElement('char-count', charCount.toLocaleString());
    updateElement('para-count', paraCount);
    updateElement('reading-time', `${readingTime} min`);
}

// =============================================================================
// EXPORT PAGE FUNCTIONS
// =============================================================================

function initializeExport() {
    console.log('📤 Initializing Export & Publishing...');
    
    // Initialize cover generation
    setupCoverGeneration();
    
    // Initialize export formats
    setupExportFormats();
    
    // Initialize publishing platforms
    setupPublishingPlatforms();
    
    // Initialize new export buttons
    setupExportButtons();
}

function setupCoverGeneration() {
    const generateBtn = document.getElementById('generate-cover-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', () => {
            console.log('🎨 Generating AI cover...');
            
            const description = document.getElementById('cover-description')?.value;
            const style = document.getElementById('cover-style')?.value;
            const format = document.getElementById('cover-format')?.value;
            
            if (!description) {
                alert('Please provide a book description for cover generation');
                return;
            }
            
            // Simulate cover generation
            const preview = document.getElementById('cover-preview');
            if (preview) {
                preview.innerHTML = `
                    <div class="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg h-80 flex items-center justify-center text-white">
                        <div class="text-center">
                            <i class="fas fa-image text-6xl mb-4 opacity-50"></i>
                            <p class="font-bold text-lg">Generated Cover</p>
                            <p class="text-sm opacity-75">${style} style</p>
                        </div>
                    </div>
                `;
                
                // Enable download and regenerate buttons
                document.getElementById('download-cover-btn').disabled = false;
                document.getElementById('regenerate-cover-btn').disabled = false;
            }
            
            console.log('Cover generated with:', { description, style, format });
        });
    }
}

function setupExportFormats() {
    const exportBtn = document.getElementById('export-audio-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            console.log('📁 Starting audio export...');
            
            const quality = document.getElementById('audio-quality')?.value;
            const structure = document.getElementById('chapter-structure')?.value;
            
            // Get selected formats
            const formats = [];
            const checkboxes = document.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                if (checkbox.checked) {
                    const label = checkbox.parentNode.textContent;
                    if (label.includes('MP3')) formats.push('MP3');
                    if (label.includes('M4B')) formats.push('M4B');
                    if (label.includes('WAV')) formats.push('WAV');
                }
            });
            
            console.log('Exporting audio:', { quality, structure, formats });
            alert('Audio export started! You will be notified when complete.');
        });
    }
}

function setupPublishingPlatforms() {
    // Setup platform connection buttons
    const connectButtons = document.querySelectorAll('button');
    connectButtons.forEach(button => {
        if (button.textContent.includes('Connect Account')) {
            button.addEventListener('click', () => {
                const platform = button.closest('.bg-gray-700').querySelector('h4').textContent;
                console.log(`Connecting to ${platform}...`);
                alert(`${platform} integration coming soon!`);
            });
        }
    });
}

// =============================================================================
// COMMON FUNCTIONS
// =============================================================================

function setupGlobalEventListeners() {
    // Add any global event listeners here
    console.log('🌐 Global event listeners initialized');
    
    // Initialize enhanced button effects
    initializeEnhancedButtonEffects();
    
    // Initialize status lights
    initializeStatusLights();
}

// =============================================================================
// ENHANCED LIGHTING AND VISUAL EFFECTS
// =============================================================================

function initializeEnhancedButtonEffects() {
    // Add glow effects to all buttons
    const buttons = document.querySelectorAll('button, .btn');
    buttons.forEach(button => {
        if (!button.classList.contains('btn-glow')) {
            button.classList.add('btn-glow');
        }
        
        // Add click ripple effect
        button.addEventListener('click', createRippleEffect);
        
        // Add enhanced hover effects
        button.addEventListener('mouseenter', enhanceGlow);
        button.addEventListener('mouseleave', normalizeGlow);
    });
}

function createRippleEffect(e) {
    const button = e.target;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    const ripple = document.createElement('span');
    ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: radial-gradient(circle, rgba(135, 206, 235, 0.6) 0%, transparent 70%);
        border-radius: 50%;
        pointer-events: none;
        transform: scale(0);
        animation: ripple 0.6s ease-out forwards;
    `;
    
    // Add ripple keyframes if not exists
    if (!document.querySelector('#ripple-style')) {
        const style = document.createElement('style');
        style.id = 'ripple-style';
        style.textContent = `
            @keyframes ripple {
                0% { transform: scale(0); opacity: 1; }
                100% { transform: scale(2); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    button.style.position = 'relative';
    button.appendChild(ripple);
    
    setTimeout(() => {
        if (ripple.parentNode) {
            ripple.parentNode.removeChild(ripple);
        }
    }, 600);
}

function enhanceGlow(e) {
    const button = e.target;
    button.style.boxShadow = `
        0 8px 25px rgba(135, 206, 235, 0.6),
        0 0 40px rgba(135, 206, 235, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.2)
    `;
}

function normalizeGlow(e) {
    const button = e.target;
    button.style.boxShadow = '';
}

function initializeStatusLights() {
    // Add status lights to various elements
    addStatusLight('voice-select', 'ready');
    addStatusLight('text-input', 'ready');
    addStatusLight('record-btn', 'ready');
}

function addStatusLight(elementId, status = 'ready') {
    const element = document.getElementById(elementId);
    if (element && !element.querySelector('.status-light')) {
        const statusLight = document.createElement('span');
        statusLight.className = `status-light ${status}`;
        
        const container = element.parentNode;
        if (container) {
            const label = container.querySelector('label');
            if (label) {
                label.insertBefore(statusLight, label.firstChild);
            }
        }
    }
}

function updateStatusLight(elementId, status) {
    const element = document.getElementById(elementId);
    if (element) {
        const container = element.parentNode;
        const statusLight = container?.querySelector('.status-light');
        if (statusLight) {
            statusLight.className = `status-light ${status}`;
        }
    }
}

// Enhanced Voice Waveform Visualization
function createVoiceWaveform(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Clear existing content
    container.innerHTML = '';
    container.className = 'voice-waveform';
    
    // Create waveform bars
    for (let i = 0; i < 10; i++) {
        const bar = document.createElement('div');
        bar.className = 'waveform-bar';
        bar.style.height = Math.random() * 30 + 3 + 'px';
        container.appendChild(bar);
    }
}

function animateVoiceWaveform(containerId, active = true) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const bars = container.querySelectorAll('.waveform-bar');
    bars.forEach((bar, index) => {
        if (active) {
            bar.style.animation = `waveform ${1.2 + Math.random() * 0.8}s ease-in-out infinite alternate`;
            bar.style.animationDelay = `${index * 0.1}s`;
        } else {
            bar.style.animation = 'none';
            bar.style.height = '3px';
        }
    });
}

// Enhanced Audio Visualizer
function enhanceAudioVisualizer() {
    const visualizer = document.querySelector('.audio-visualizer');
    if (!visualizer) return;
    
    // Add pulse ring effect
    const pulseRing = document.createElement('div');
    pulseRing.className = 'pulse-ring';
    visualizer.appendChild(pulseRing);
    
    // Add spinning light ring
    const lightRing = document.createElement('div');
    lightRing.className = 'light-ring';
    visualizer.appendChild(lightRing);
}

// Initialize enhanced lighting effects for narration page
function initializeNarrationLighting() {
    console.log('✨ Initializing enhanced narration lighting...');
    
    // Create voice waveform in recording area
    setTimeout(() => {
        const recordingVisual = document.getElementById('recording-visual');
        if (recordingVisual) {
            createVoiceWaveform('recording-visual');
        }
        
        // Enhance main audio visualizer
        enhanceAudioVisualizer();
        
        // Add glow effects to cards
        const cards = document.querySelectorAll('.card-glow, .bg-gray-800');
        cards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.boxShadow = `
                    0 0 30px rgba(135, 206, 235, 0.4),
                    0 0 60px rgba(192, 192, 192, 0.3),
                    0 8px 40px -8px rgba(0, 0, 0, 0.4)
                `;
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.boxShadow = '';
            });
        });
    }, 500);
}

// =============================================================================
// NEW BUTTON HANDLERS
// =============================================================================

function setupWorkspaceButtons() {
    const saveStoryBtn = document.getElementById('save-story-btn');
    const chapterReviewWorkspaceBtn = document.getElementById('chapter-review-workspace-btn');
    const generateFullAudiobookBtn = document.getElementById('generate-full-audiobook-btn');
    
    if (saveStoryBtn) {
        saveStoryBtn.addEventListener('click', saveStory);
    }
    if (chapterReviewWorkspaceBtn) {
        chapterReviewWorkspaceBtn.addEventListener('click', reviewChapters);
    }
    if (generateFullAudiobookBtn) {
        generateFullAudiobookBtn.addEventListener('click', generateFullAudiobook);
    }
}

function setupExportButtons() {
    const chapterReviewBtn = document.getElementById('chapter-review-btn');
    
    if (chapterReviewBtn) {
        chapterReviewBtn.addEventListener('click', reviewChapters);
    }
}

// Voice Review Handler
async function reviewVoiceConfiguration() {
    console.log('🎤 Reviewing voice configuration...');
    
    try {
        const voiceSelect = document.getElementById('voice-select');
        const textInput = document.getElementById('text-input');
        
        const voiceId = voiceSelect?.value;
        const sampleText = textInput?.value || 'This is a sample text for voice review.';
        
        if (!voiceId) {
            alert('Please select a voice actor first.');
            return;
        }
        
        // Show loading state
        const reviewBtn = document.getElementById('voice-review-btn');
        const originalText = reviewBtn.textContent;
        reviewBtn.textContent = 'Reviewing...';
        reviewBtn.disabled = true;
        
        // Call API
        const response = await axios.post('/api/voice-review', {
            voiceId: voiceId,
            sampleText: sampleText,
            settings: {
                speed: 1.0,
                pitch: 1.0,
                emphasis: 'normal'
            }
        });
        
        if (response.data.success) {
            const data = response.data.data;
            
            // Show review results
            alert(`Voice Review Complete!
            
Quality Score: ${data.quality}/100
Estimated Generation Time: ${data.estimatedTime} seconds
Compatibility: ${data.compatibility.join(', ')}
            
Voice configuration is ready for use!`);
            
            console.log('Voice review data:', data);
        }
        
    } catch (error) {
        console.error('Voice review error:', error);
        alert('Voice review failed. Please try again.');
    } finally {
        // Restore button
        const reviewBtn = document.getElementById('voice-review-btn');
        reviewBtn.textContent = originalText;
        reviewBtn.disabled = false;
    }
}

// Save Story Handler
async function saveStory() {
    console.log('💾 Saving story...');
    
    try {
        const titleInput = document.getElementById('chapter-title');
        const editorTextarea = document.getElementById('manuscript-editor');
        
        const title = titleInput?.value || 'Untitled Story';
        const content = editorTextarea?.value || '';
        
        if (!content.trim()) {
            alert('Please write some content before saving.');
            return;
        }
        
        // Show loading state
        const saveBtn = document.getElementById('save-story-btn');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;
        
        // Call API
        const response = await axios.post('/api/save-story', {
            title: title,
            content: content,
            chapterTitle: title
        });
        
        if (response.data.success) {
            const data = response.data.data;
            
            alert(`Story Saved Successfully!
            
Story ID: ${data.storyId}
Word Count: ${data.wordCount} words
Saved At: ${new Date(data.savedAt).toLocaleString()}
            
Your story is now safely stored!`);
            
            // Update auto-save indicator
            const autoSaveIndicator = document.querySelector('.text-gray-400');
            if (autoSaveIndicator) {
                autoSaveIndicator.innerHTML = '<i class="fas fa-check-circle mr-1 text-green-400"></i>Saved just now';
            }
            
            console.log('Story saved:', data);
        }
        
    } catch (error) {
        console.error('Save story error:', error);
        alert('Failed to save story. Please try again.');
    } finally {
        // Restore button
        const saveBtn = document.getElementById('save-story-btn');
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    }
}

// Chapter Review Handler
async function reviewChapters() {
    console.log('📖 Reviewing chapters...');
    
    try {
        const editorTextarea = document.getElementById('manuscript-editor');
        const titleInput = document.getElementById('chapter-title');
        
        const content = editorTextarea?.value || '';
        const title = titleInput?.value || 'Chapter 1';
        
        if (!content.trim()) {
            alert('Please write some content before reviewing chapters.');
            return;
        }
        
        // Create chapters array (split by paragraphs for demo)
        const paragraphs = content.split('\n\n').filter(p => p.trim());
        const chapters = paragraphs.map((paragraph, index) => ({
            title: index === 0 ? title : `Section ${index + 1}`,
            content: paragraph
        }));
        
        // Show loading state
        const reviewBtns = document.querySelectorAll('#chapter-review-btn, #chapter-review-workspace-btn');
        reviewBtns.forEach(btn => {
            btn.textContent = 'Reviewing...';
            btn.disabled = true;
        });
        
        // Call API
        const response = await axios.post('/api/chapter-review', {
            chapters: chapters,
            storyId: `story_${Date.now()}`
        });
        
        if (response.data.success) {
            const data = response.data.data;
            
            // Create detailed review display
            let reviewText = `Chapter Review Complete!
            
Total Chapters: ${data.totalChapters}
Total Words: ${data.totalWords}
Estimated Audio Length: ${data.estimatedAudioLength} minutes

Chapter Breakdown:
`;
            
            data.chapters.forEach(chapter => {
                reviewText += `• ${chapter.title}: ${chapter.wordCount} words (~${chapter.estimatedDuration} min)
`;
            });
            
            alert(reviewText);
            console.log('Chapter review data:', data);
        }
        
    } catch (error) {
        console.error('Chapter review error:', error);
        alert('Chapter review failed. Please try again.');
    } finally {
        // Restore buttons
        const reviewBtns = document.querySelectorAll('#chapter-review-btn, #chapter-review-workspace-btn');
        reviewBtns.forEach(btn => {
            btn.textContent = btn.id.includes('workspace') ? 'Review Chapters' : 'Review Chapters';
            btn.disabled = false;
        });
    }
}

// Generate Full Audiobook Handler
async function generateFullAudiobook() {
    console.log('🎵 Generating full audiobook...');
    
    try {
        const editorTextarea = document.getElementById('manuscript-editor');
        const titleInput = document.getElementById('chapter-title');
        
        const content = editorTextarea?.value || '';
        const title = titleInput?.value || 'My Audiobook';
        
        if (!content.trim()) {
            alert('Please write your story content first.');
            return;
        }
        
        // Show loading state
        const generateBtn = document.getElementById('generate-full-audiobook-btn');
        const originalText = generateBtn.textContent;
        generateBtn.textContent = 'Generating...';
        generateBtn.disabled = true;
        
        // Simulate audiobook generation process
        alert(`Starting Full Audiobook Generation!
        
Story: ${title}
Content Length: ${content.split(' ').length} words
Estimated Audio Duration: ${Math.ceil(content.split(' ').length / 150)} minutes
        
This process will:
1. Process your manuscript
2. Apply voice narration
3. Generate chapter breaks
4. Create final audio files

Generation will continue in the background.
You'll be redirected to the Export page to monitor progress.`);
        
        // Simulate API call
        const response = await axios.post('/api/continue-to-narration', {
            text: content,
            storyId: `story_${Date.now()}`,
            settings: {
                title: title,
                chapters: 'auto-detect',
                voice: 'default'
            }
        });
        
        if (response.data.success) {
            // Redirect to narration page
            window.location.href = '/narration';
        }
        
    } catch (error) {
        console.error('Generate audiobook error:', error);
        alert('Failed to start audiobook generation. Please try again.');
    } finally {
        // Restore button
        const generateBtn = document.getElementById('generate-full-audiobook-btn');
        generateBtn.textContent = originalText;
        generateBtn.disabled = false;
    }
}