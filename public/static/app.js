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
        case 'config':
            initializeConfig();
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
    if (path.startsWith('/config')) return 'config';
    return 'dashboard';
}

function initializeCommonFeatures() {
    console.log('🔧 Initializing common features...');
    
    // Initialize theme (check localStorage or default to dark)
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.add('dark-theme');
    }
    
    // Add any common functionality that works across all pages
    setupGlobalEventListeners();
}

function initializeDashboard() {
    console.log('📊 Initializing Dashboard...');
    
    // Initialize theme toggle
    initializeThemeToggle();
    
    // Load recent projects
    loadRecentProjects();
    
    // Setup chapter creation form
    setupChapterCreationForm();
    
    // Setup chapter planning workflow
    setupChapterWorkflow();
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

// Configuration Page Initialization
function initializeConfig() {
    console.log('⚙️ Initializing Configuration...');
    
    // Check API status on load
    checkOpenAIStatus();
    
    // Setup test API button
    setupTestAPIButton();
}

// Check OpenAI API Status
async function checkOpenAIStatus() {
    try {
        const response = await axios.get('/api/openai-status');
        const data = response.data;
        
        const statusElement = document.getElementById('api-status');
        if (statusElement) {
            const indicator = statusElement.querySelector('.status-indicator');
            const textSpan = statusElement.querySelector('span');
            
            if (data.configured) {
                indicator.className = 'status-indicator w-3 h-3 rounded-full bg-green-500';
                textSpan.textContent = 'OpenAI API is configured and ready!';
                
                // Hide demo mode warning
                const demoWarning = document.querySelector('.border-yellow-500');
                if (demoWarning) {
                    demoWarning.style.display = 'none';
                }
            } else {
                indicator.className = 'status-indicator w-3 h-3 rounded-full bg-red-500';
                textSpan.textContent = 'OpenAI API key not configured - Demo mode active';
            }
        }
        
        console.log('OpenAI Status:', data);
    } catch (error) {
        console.error('Failed to check OpenAI status:', error);
    }
}

// Setup Test API Button
function setupTestAPIButton() {
    const testBtn = document.getElementById('test-api');
    if (testBtn) {
        testBtn.addEventListener('click', async () => {
            await testOpenAIAPI();
        });
    }
}

// Test OpenAI API
async function testOpenAIAPI() {
    try {
        const testBtn = document.getElementById('test-api');
        const originalText = testBtn.textContent;
        testBtn.textContent = 'Testing...';
        testBtn.disabled = true;
        
        // Test with a simple summarization request
        const response = await axios.post('/api/ai/summarize', {
            text: 'This is a test to verify that the OpenAI API integration is working correctly.',
            length: 'brief'
        });
        
        if (response.data.success) {
            alert('OpenAI API Test Successful!\n\nThe API is working correctly and ready for use.');
        } else {
            alert(`OpenAI API Test Failed:\n\n${response.data.error}\n\nDetails: ${response.data.details || 'No additional details available'}`);
        }
        
    } catch (error) {
        console.error('OpenAI API Test Error:', error);
        alert(`OpenAI API Test Failed:\n\nError: ${error.response?.data?.error || error.message}`);
    } finally {
        const testBtn = document.getElementById('test-api');
        testBtn.textContent = 'Test API Configuration';
        testBtn.disabled = false;
    }
}

// AI Writing Tools Integration
function setupWritingTools() {
    console.log('🤖 Setting up AI Writing Tools...');
    
    // Setup all AI writing tool buttons
    setupAIButton('Generate Ideas', generateAIIdeas);
    setupAIButton('Create Outline', createAIOutline);
    setupAIButton('Expand Text', expandText);
    setupAIButton('Summarize', summarizeText);
    setupAIButton('Rewrite', rewriteText);
    setupAIButton('Character Builder', buildCharacter);
}

// Generic AI Button Setup
function setupAIButton(buttonText, handlerFunction) {
    const buttons = Array.from(document.querySelectorAll('button')).filter(btn => 
        btn.textContent.includes(buttonText));
    
    buttons.forEach(button => {
        button.addEventListener('click', async () => {
            await handlerFunction();
        });
    });
}

// Generate AI Ideas
async function generateAIIdeas() {
    try {
        const response = await axios.post('/api/ai/generate-ideas', {
            genre: 'general',
            audience: 'adult',
            theme: 'creativity and innovation'
        });
        
        if (response.data.success) {
            const ideas = response.data.ideas || response.data.demo_response?.ideas;
            showAIResponse('Generated Ideas', ideas);
        } else {
            showAIResponse('Generated Ideas (Demo Mode)', response.data.demo_response?.ideas);
        }
        
    } catch (error) {
        console.error('Generate Ideas Error:', error);
        alert('Failed to generate ideas. Please try again.');
    }
}

// Create AI Outline  
async function createAIOutline() {
    try {
        const response = await axios.post('/api/ai/create-outline', {
            title: 'My Story',
            genre: 'fiction',
            theme: 'adventure',
            chapters: 10
        });
        
        if (response.data.success) {
            const outline = response.data.outline || response.data.demo_response?.outline;
            showAIResponse('Story Outline', outline);
        } else {
            showAIResponse('Story Outline (Demo Mode)', response.data.demo_response?.outline);
        }
        
    } catch (error) {
        console.error('Create Outline Error:', error);
        alert('Failed to create outline. Please try again.');
    }
}

// Expand Text
async function expandText() {
    const selectedText = getSelectedOrPromptText();
    if (!selectedText) return;
    
    try {
        const response = await axios.post('/api/ai/expand-text', {
            text: selectedText,
            style: 'descriptive',
            length: 'detailed'
        });
        
        if (response.data.success) {
            const expandedText = response.data.expanded_text || response.data.demo_response?.expanded_text;
            showAIResponse('Expanded Text', expandedText);
        } else {
            showAIResponse('Expanded Text (Demo Mode)', response.data.demo_response?.expanded_text);
        }
        
    } catch (error) {
        console.error('Expand Text Error:', error);
        alert('Failed to expand text. Please try again.');
    }
}

// Summarize Text
async function summarizeText() {
    const selectedText = getSelectedOrPromptText();
    if (!selectedText) return;
    
    try {
        const response = await axios.post('/api/ai/summarize', {
            text: selectedText,
            length: 'concise'
        });
        
        if (response.data.success) {
            const summary = response.data.summary || response.data.demo_response?.summary;
            showAIResponse('Text Summary', summary);
        } else {
            showAIResponse('Text Summary (Demo Mode)', response.data.demo_response?.summary);
        }
        
    } catch (error) {
        console.error('Summarize Text Error:', error);
        alert('Failed to summarize text. Please try again.');
    }
}

// Rewrite Text
async function rewriteText() {
    const selectedText = getSelectedOrPromptText();
    if (!selectedText) return;
    
    try {
        const response = await axios.post('/api/ai/rewrite', {
            text: selectedText,
            style: 'improved',
            tone: 'engaging'
        });
        
        if (response.data.success) {
            const rewrittenText = response.data.rewritten_text || response.data.demo_response?.rewritten_text;
            showAIResponse('Rewritten Text', rewrittenText);
        } else {
            showAIResponse('Rewritten Text (Demo Mode)', response.data.demo_response?.rewritten_text);
        }
        
    } catch (error) {
        console.error('Rewrite Text Error:', error);
        alert('Failed to rewrite text. Please try again.');
    }
}

// Build Character
async function buildCharacter() {
    const characterName = prompt('Enter character name (optional):');
    
    try {
        const response = await axios.post('/api/ai/character-builder', {
            character_name: characterName || 'New Character',
            role: 'protagonist',
            genre: 'fiction',
            traits: 'intelligent, brave, curious'
        });
        
        if (response.data.success) {
            const characterProfile = response.data.character_profile || response.data.demo_response?.character_profile;
            showAIResponse('Character Profile', characterProfile);
        } else {
            showAIResponse('Character Profile (Demo Mode)', response.data.demo_response?.character_profile);
        }
        
    } catch (error) {
        console.error('Build Character Error:', error);
        alert('Failed to build character. Please try again.');
    }
}

// Helper Functions
function getSelectedOrPromptText() {
    // Try to get selected text from manuscript editor
    const editor = document.getElementById('manuscript-editor');
    if (editor) {
        const selectedText = editor.value.substring(editor.selectionStart, editor.selectionEnd);
        if (selectedText.trim()) {
            return selectedText;
        }
        
        // If no selection, get all text or prompt for input
        if (editor.value.trim()) {
            const useAllText = confirm('No text selected. Use all text from editor?');
            if (useAllText) {
                return editor.value;
            }
        }
    }
    
    // Prompt for text input
    const inputText = prompt('Enter text to process:');
    return inputText?.trim();
}

function showAIResponse(title, content) {
    // Create a modal or alert to show AI response
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-gray-800 rounded-lg p-6 max-w-2xl max-h-96 overflow-y-auto border border-gray-700">
            <div class="flex justify-between items-start mb-4">
                <h3 class="text-xl font-bold text-cyan-400">${title}</h3>
                <button id="close-modal" class="text-gray-400 hover:text-white">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="text-gray-300 whitespace-pre-wrap">${content}</div>
            <div class="mt-4 flex gap-2">
                <button id="copy-response" class="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded">
                    <i class="fas fa-copy mr-2"></i>Copy
                </button>
                <button id="insert-response" class="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded">
                    <i class="fas fa-plus mr-2"></i>Insert to Editor
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Setup modal event listeners
    modal.querySelector('#close-modal').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.querySelector('#copy-response').addEventListener('click', () => {
        navigator.clipboard.writeText(content);
        alert('Response copied to clipboard!');
    });
    
    modal.querySelector('#insert-response').addEventListener('click', () => {
        const editor = document.getElementById('manuscript-editor');
        if (editor) {
            editor.value += '\n\n' + content;
            updateWritingStatistics();
        }
        document.body.removeChild(modal);
    });
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

// Theme Toggle Functionality
function initializeThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
        
        // Set initial state based on current theme
        const isLight = document.body.classList.contains('light-theme');
        updateThemeToggleUI(isLight);
    }
}

function toggleTheme() {
    const body = document.body;
    const isDark = body.classList.contains('dark-theme');
    
    if (isDark) {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
        updateThemeToggleUI(true);
        localStorage.setItem('theme', 'light');
    } else {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
        updateThemeToggleUI(false);
        localStorage.setItem('theme', 'dark');
    }
}

function updateThemeToggleUI(isLight) {
    const toggle = document.getElementById('theme-toggle');
    const slider = toggle?.querySelector('.theme-toggle-slider');
    const icon = slider?.querySelector('i');
    
    if (isLight) {
        toggle.classList.add('light');
        icon.className = 'fas fa-sun';
    } else {
        toggle.classList.remove('light');
        icon.className = 'fas fa-moon';
    }
}

// Chapter Creation Workflow
function setupChapterCreationForm() {
    const form = document.getElementById('chapter-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await createChapterPlan();
        });
    }
}

function setupChapterWorkflow() {
    // Setup regenerate chapters button
    const regenerateBtn = document.getElementById('regenerate-chapters');
    if (regenerateBtn) {
        regenerateBtn.addEventListener('click', async () => {
            await regenerateChapters();
        });
    }
    
    // Setup create story button
    const createStoryBtn = document.getElementById('create-story-btn');
    if (createStoryBtn) {
        createStoryBtn.addEventListener('click', async () => {
            await generateStory();
        });
    }
    
    // Setup regenerate story button
    const regenerateStoryBtn = document.getElementById('regenerate-story');
    if (regenerateStoryBtn) {
        regenerateStoryBtn.addEventListener('click', async () => {
            await regenerateStory();
        });
    }
    
    // Setup continue to workspace button
    const continueBtn = document.getElementById('continue-to-workspace');
    if (continueBtn) {
        continueBtn.addEventListener('click', () => {
            continueToWorkspace();
        });
    }
}

// Create Chapter Plan
async function createChapterPlan() {
    try {
        const formData = getChapterFormData();
        
        if (!validateChapterForm(formData)) {
            return;
        }
        
        // Show loading state
        const createBtn = document.getElementById('create-chapter-btn');
        const originalText = createBtn.textContent;
        createBtn.textContent = 'Creating Chapters...';
        createBtn.disabled = true;
        
        // Call API
        const response = await axios.post('/api/chapter/create', formData);
        
        if (response.data.success) {
            const chapters = response.data.chapters || response.data.demo_response?.chapters;
            displayChapterPlan(chapters);
            
            // Show chapter planning section
            document.getElementById('chapter-planning').style.display = 'block';
            
            // Scroll to chapter planning
            document.getElementById('chapter-planning').scrollIntoView({ behavior: 'smooth' });
        } else {
            alert('Failed to create chapter plan: ' + (response.data.error || 'Unknown error'));
        }
        
    } catch (error) {
        console.error('Chapter Creation Error:', error);
        alert('Failed to create chapter plan. Please try again.');
    } finally {
        // Restore button
        const createBtn = document.getElementById('create-chapter-btn');
        createBtn.textContent = 'Create Chapter';
        createBtn.disabled = false;
    }
}

function getChapterFormData() {
    return {
        bookTitle: document.getElementById('book-title')?.value || '',
        authorName: document.getElementById('author-name')?.value || '',
        genre: document.getElementById('genre')?.value || '',
        targetAudience: document.getElementById('target-audience')?.value || '',
        toneVoice: document.getElementById('tone-voice')?.value || '',
        narrativePerspective: document.getElementById('narrative-perspective')?.value || '',
        bookDescription: document.getElementById('book-description')?.value || ''
    };
}

function validateChapterForm(formData) {
    if (!formData.bookTitle.trim()) {
        alert('Please enter a book title.');
        return false;
    }
    if (!formData.authorName.trim()) {
        alert('Please enter the author name.');
        return false;
    }
    if (!formData.bookDescription.trim()) {
        alert('Please enter a book description.');
        return false;
    }
    return true;
}

function displayChapterPlan(chapters) {
    const container = document.getElementById('chapter-outlines');
    if (!container) return;
    
    container.innerHTML = '';
    
    chapters.forEach((chapter, index) => {
        const chapterElement = document.createElement('div');
        chapterElement.className = 'chapter-outline-item bg-gray-700 p-6 rounded-lg border border-gray-600';
        chapterElement.innerHTML = `
            <div class="mb-4">
                <label class="block text-sm font-medium text-cyan-400 mb-2">Chapter ${chapter.id} Title</label>
                <input type="text" 
                       value="${chapter.title}" 
                       class="form-field-glow w-full rounded px-3 py-2 text-white" 
                       data-chapter-id="${chapter.id}" 
                       data-field="title">
            </div>
            <div>
                <label class="block text-sm font-medium text-cyan-400 mb-2">Chapter Outline</label>
                <textarea class="form-field-glow w-full rounded px-3 py-2 text-white h-24 resize-none" 
                          data-chapter-id="${chapter.id}" 
                          data-field="outline">${chapter.outline}</textarea>
            </div>
        `;
        container.appendChild(chapterElement);
    });
    
    // Store chapters data globally
    window.currentChapters = chapters;
}

// Generate and Continue Functions
async function generateStory() {
    try {
        const updatedChapters = getCurrentChaptersFromForm();
        const formData = getChapterFormData();
        
        const createStoryBtn = document.getElementById('create-story-btn');
        createStoryBtn.textContent = 'Creating Story...';
        createStoryBtn.disabled = true;
        
        const response = await axios.post('/api/story/generate', {
            chapters: updatedChapters,
            bookTitle: formData.bookTitle,
            genre: formData.genre,
            toneVoice: formData.toneVoice,
            narrativePerspective: formData.narrativePerspective
        });
        
        if (response.data.success) {
            const story = response.data.story || response.data.demo_response?.story;
            displayGeneratedStory(story);
            document.getElementById('story-generation').style.display = 'block';
            document.getElementById('story-generation').scrollIntoView({ behavior: 'smooth' });
        }
        
    } catch (error) {
        console.error('Story Generation Error:', error);
        alert('Failed to generate story.');
    } finally {
        const createStoryBtn = document.getElementById('create-story-btn');
        createStoryBtn.textContent = 'Create Story';
        createStoryBtn.disabled = false;
    }
}

function getCurrentChaptersFromForm() {
    const chapters = [];
    const chapterElements = document.querySelectorAll('.chapter-outline-item');
    
    chapterElements.forEach((element, index) => {
        const titleInput = element.querySelector('[data-field="title"]');
        const outlineTextarea = element.querySelector('[data-field="outline"]');
        
        chapters.push({
            id: index + 1,
            title: titleInput.value,
            outline: outlineTextarea.value
        });
    });
    
    return chapters;
}

function displayGeneratedStory(story) {
    const container = document.getElementById('story-content');
    if (!container) return;
    
    container.innerHTML = `
        <div class="bg-gray-700 p-6 rounded-lg border border-gray-600">
            <label class="block text-sm font-medium text-cyan-400 mb-2">Generated Story</label>
            <textarea id="generated-story-text" 
                      class="form-field-glow w-full rounded px-3 py-2 text-white resize-none" 
                      rows="20">${story}</textarea>
        </div>
    `;
    window.currentStory = story;
}

function continueToWorkspace() {
    const storyText = document.getElementById('generated-story-text')?.value;
    const formData = getChapterFormData();
    
    if (storyText) {
        localStorage.setItem('workspaceStory', JSON.stringify({
            title: formData.bookTitle,
            author: formData.authorName,
            content: storyText,
            timestamp: Date.now()
        }));
        window.location.href = '/workspace';
    } else {
        alert('No story content to transfer to workspace.');
    }
}