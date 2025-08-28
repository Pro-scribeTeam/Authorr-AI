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
    console.log('🎵 AI Audiobook Creator - Voice Cloning Studio Initialized');
    
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
    } else {
        recordBtn?.classList.remove('recording');
        if (recordText) recordText.textContent = 'Start Recording';
        stopBtn?.classList.add('hidden');
        recordingVisual?.classList.remove('recording');
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
    
    if (previewBtn) {
        previewBtn.addEventListener('click', previewAudio);
    }
    if (voicePreviewBtn) {
        voicePreviewBtn.addEventListener('click', previewVoiceActor);
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
});

console.log('🚀 AI Audiobook Creator - Voice Cloning Studio Ready!');