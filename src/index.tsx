import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

const app = new Hono()

// Enable CORS for frontend-backend communication
app.use('/api/*', cors())

// Serve static files from public directory
app.use('/static/*', serveStatic({ root: './public' }))

// API routes
app.get('/api/hello', (c) => {
  return c.json({ message: 'Hello from Voice Cloning Studio!' })
})

app.get('/api/voices', (c) => {
  return c.json({
    voices: [
      { id: 'actor1', name: 'Professional Narrator', type: 'Male' },
      { id: 'actor2', name: 'Storyteller', type: 'Female' },
      { id: 'actor3', name: 'Documentary Voice', type: 'Male' }
    ]
  })
})

app.post('/api/voice-clone', async (c) => {
  const body = await c.req.json()
  return c.json({ 
    success: true, 
    message: 'Voice cloning initiated',
    voice_id: `clone_${Date.now()}`,
    ...body 
  })
})

app.post('/api/project/create', async (c) => {
  const body = await c.req.json()
  return c.json({
    success: true,
    project_id: `proj_${Date.now()}`,
    message: 'Project created successfully',
    ...body
  })
})

app.get('/api/projects', (c) => {
  return c.json({
    projects: [
      {
        id: 'proj_1',
        title: 'My First Audiobook',
        author: 'John Doe',
        status: 'In Progress',
        created: '2024-01-15'
      },
      {
        id: 'proj_2', 
        title: 'Science Fiction Novel',
        author: 'Jane Smith',
        status: 'Complete',
        created: '2024-01-10'
      }
    ]
  })
})

// Route handlers for different pages
function getPageLayout(title: string, content: string, activePage: string = '') {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/styles.css" rel="stylesheet">
    </head>
    <body class="bg-gray-900 text-white min-h-screen">
        <!-- Header -->
        <header class="bg-gray-800 border-b border-gray-700 p-4">
            <div class="max-w-7xl mx-auto flex items-center justify-between">
                <div class="flex items-center space-x-3">
                    <div class="logo-icon">
                        <i class="fas fa-book-reader text-3xl text-cyan-400"></i>
                    </div>
                    <h1 class="text-2xl font-bold text-glow">AUTHORR AI</h1>
                </div>
                <nav class="flex space-x-6">
                    <a href="/" class="nav-link ${activePage === 'dashboard' ? 'active' : ''}">
                        <i class="fas fa-tachometer-alt mr-2"></i>Dashboard
                    </a>
                    <a href="/workspace" class="nav-link ${activePage === 'workspace' ? 'active' : ''}">
                        <i class="fas fa-pencil-alt mr-2"></i>Workspace
                    </a>
                    <a href="/narration" class="nav-link ${activePage === 'narration' ? 'active' : ''}">
                        <i class="fas fa-microphone mr-2"></i>Narration
                    </a>
                    <a href="/export" class="nav-link ${activePage === 'export' ? 'active' : ''}">
                        <i class="fas fa-download mr-2"></i>Export
                    </a>
                </nav>
            </div>
        </header>

        <!-- Main Content -->
        <main class="max-w-7xl mx-auto p-6">
            ${content}
        </main>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `
}

// Dashboard page (homepage)
app.get('/', (c) => {
  const dashboardContent = `
    <div class="space-y-8">
      <!-- Welcome Section -->
      <div class="text-center mb-8">
        <h2 class="text-4xl font-bold text-glow mb-4">Transform Text into Premium Audiobooks</h2>
        <p class="text-xl text-gray-300 max-w-3xl mx-auto">
          Create professional audiobooks with AI-powered writing assistance, advanced narration, and voice cloning technology
        </p>
      </div>

      <!-- Project Initialization -->
      <div class="bg-gray-800 rounded-lg border border-gray-700 p-8">
        <h3 class="text-2xl font-bold mb-6 text-cyan-400">
          <i class="fas fa-rocket mr-3"></i>Start New Project
        </h3>
        
        <form id="project-form" class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Book Title *</label>
              <input type="text" id="book-title" placeholder="Enter your book title..." 
                class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-cyan-400">
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Author Name *</label>
              <input type="text" id="author-name" placeholder="Your name..." 
                class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-cyan-400">
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Target Audience</label>
              <select id="target-audience" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white">
                <option value="">Select audience...</option>
                <option value="children">Children (5-12)</option>
                <option value="young-adult">Young Adult (13-18)</option>
                <option value="adult">Adult (18+)</option>
                <option value="all-ages">All Ages</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Genre</label>
              <select id="genre" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white">
                <option value="">Select genre...</option>
                <option value="fiction">Fiction</option>
                <option value="non-fiction">Non-Fiction</option>
                <option value="mystery">Mystery & Thriller</option>
                <option value="romance">Romance</option>
                <option value="fantasy">Fantasy</option>
                <option value="sci-fi">Science Fiction</option>
                <option value="biography">Biography</option>
                <option value="self-help">Self Help</option>
              </select>
            </div>
          </div>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Tone/Voice</label>
              <select id="tone-voice" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white">
                <option value="">Select tone...</option>
                <option value="professional">Professional</option>
                <option value="conversational">Conversational</option>
                <option value="formal">Formal</option>
                <option value="humorous">Humorous</option>
                <option value="dramatic">Dramatic</option>
                <option value="educational">Educational</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Narrative Perspective</label>
              <select id="narrative-perspective" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white">
                <option value="">Select perspective...</option>
                <option value="first-person">First Person</option>
                <option value="third-person">Third Person</option>
                <option value="omniscient">Omniscient</option>
                <option value="multiple">Multiple Perspectives</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Theme or Message</label>
              <textarea id="theme-message" placeholder="Describe the main theme or message of your book..." 
                class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white h-24 resize-none focus:border-cyan-400"></textarea>
            </div>
            
            <button type="submit" class="btn-glow w-full bg-cyan-600 hover:bg-cyan-500 text-white py-3 px-6 rounded-lg font-semibold transition-all mt-6">
              <i class="fas fa-plus mr-2"></i>Create Project
            </button>
          </div>
        </form>
      </div>

      <!-- Recent Projects -->
      <div class="bg-gray-800 rounded-lg border border-gray-700 p-8">
        <h3 class="text-2xl font-bold mb-6 text-cyan-400">
          <i class="fas fa-history mr-3"></i>Recent Projects
        </h3>
        
        <div id="projects-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <!-- Projects will be loaded dynamically -->
        </div>
      </div>
    </div>
  `
  
  return c.html(getPageLayout('AUTHORR AI - Dashboard', dashboardContent, 'dashboard'))
})

// Workspace page
app.get('/workspace', (c) => {
  const workspaceContent = `
    <div class="space-y-8">
      <div class="text-center mb-8">
        <h2 class="text-3xl font-bold text-glow mb-2">AI-Powered Writing Workspace</h2>
        <p class="text-gray-400">Create and refine your manuscript with advanced AI writing tools</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <!-- AI Writing Tools Sidebar -->
        <div class="lg:col-span-1 space-y-6">
          <div class="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h3 class="text-lg font-bold mb-4 text-purple-400">
              <i class="fas fa-magic mr-2"></i>AI Writing Tools
            </h3>
            
            <div class="space-y-3">
              <button class="w-full bg-purple-600 hover:bg-purple-500 text-white py-2 px-4 rounded transition-all text-left">
                <i class="fas fa-lightbulb mr-2"></i>Generate Ideas
              </button>
              <button class="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded transition-all text-left">
                <i class="fas fa-list mr-2"></i>Create Outline
              </button>
              <button class="w-full bg-green-600 hover:bg-green-500 text-white py-2 px-4 rounded transition-all text-left">
                <i class="fas fa-expand mr-2"></i>Expand Text
              </button>
              <button class="w-full bg-orange-600 hover:bg-orange-500 text-white py-2 px-4 rounded transition-all text-left">
                <i class="fas fa-compress mr-2"></i>Summarize
              </button>
              <button class="w-full bg-red-600 hover:bg-red-500 text-white py-2 px-4 rounded transition-all text-left">
                <i class="fas fa-edit mr-2"></i>Rewrite
              </button>
              <button class="w-full bg-teal-600 hover:bg-teal-500 text-white py-2 px-4 rounded transition-all text-left">
                <i class="fas fa-users mr-2"></i>Character Builder
              </button>
            </div>
          </div>
          
          <div class="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h3 class="text-lg font-bold mb-4 text-yellow-400">
              <i class="fas fa-chart-line mr-2"></i>Writing Statistics
            </h3>
            
            <div class="space-y-3 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-300">Word Count:</span>
                <span id="word-count" class="text-yellow-400">0</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-300">Characters:</span>
                <span id="char-count" class="text-yellow-400">0</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-300">Paragraphs:</span>
                <span id="para-count" class="text-yellow-400">0</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-300">Reading Time:</span>
                <span id="reading-time" class="text-yellow-400">0 min</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Editor -->
        <div class="lg:col-span-3">
          <div class="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-bold text-cyan-400">
                <i class="fas fa-pen mr-2"></i>Manuscript Editor
              </h3>
              <div class="flex space-x-2">
                <button class="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-all">
                  <i class="fas fa-save mr-1"></i>Save
                </button>
                <button class="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-all">
                  <i class="fas fa-undo mr-1"></i>Undo
                </button>
                <button class="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-all">
                  <i class="fas fa-redo mr-1"></i>Redo
                </button>
              </div>
            </div>
            
            <div class="space-y-4">
              <input type="text" id="chapter-title" placeholder="Chapter Title..." 
                class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-xl font-semibold focus:border-cyan-400">
              
              <textarea id="manuscript-editor" placeholder="Start writing your story here..." 
                class="w-full bg-gray-700 border border-gray-600 rounded px-4 py-3 text-white h-96 resize-none focus:border-cyan-400 font-mono"></textarea>
            </div>
            
            <div class="flex justify-between items-center mt-4">
              <div class="text-sm text-gray-400">
                <i class="fas fa-clock mr-1"></i>
                Auto-saved 2 minutes ago
              </div>
              <div class="flex space-x-2">
                <button class="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded transition-all">
                  <i class="fas fa-arrow-right mr-1"></i>Continue to Narration
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
  
  return c.html(getPageLayout('AUTHORR AI - Workspace', workspaceContent, 'workspace'))
})

// Narration page (our restored page)
app.get('/narration', (c) => {
  const narrationContent = `
    <div class="space-y-12">
      
      <!-- AI Narration Engine Section -->
      <section class="space-y-6">
          <div class="text-center">
              <h2 class="text-2xl font-bold text-glow mb-2">🎙️ AI Narration Engine</h2>
              <p class="text-gray-400">Convert text to professional narration with our advanced AI voices</p>
          </div>

          <!-- 3-Column Layout: Voice Controls | Audio Preview | Generation Status -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              <!-- Voice Controls Column -->
              <div class="space-y-6">
                  <h3 class="text-lg font-semibold mb-4">🎛️ Voice Controls</h3>
                  
                  <!-- Voice Actor Selection -->
                  <div class="card-glow bg-gray-800 p-6 rounded-lg border border-gray-700">
                      <label class="block text-sm font-medium text-gray-300 mb-2">Voice Actors</label>
                      <select id="voice-select" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white mb-4">
                          <option value="">Loading voices...</option>
                      </select>
                      <button id="voice-preview-btn" class="btn-glow w-full bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded transition-all">
                          <i class="fas fa-play mr-1"></i>Preview Voice Actor
                      </button>
                  </div>

                  <!-- Text Input -->
                  <div class="card-glow bg-gray-800 p-6 rounded-lg border border-gray-700">
                      <label class="block text-sm font-medium text-gray-300 mb-2">Text to Narrate</label>
                      <textarea id="text-input" placeholder="Enter your text here..." 
                          class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white h-32 resize-none"></textarea>
                  </div>

                  <!-- Generation Button -->
                  <button id="generate-btn" class="btn-glow w-full bg-green-600 hover:bg-green-500 text-white py-3 px-6 rounded-lg font-semibold transition-all">
                      <i class="fas fa-magic mr-2"></i>Generate Narration
                  </button>
              </div>

              <!-- Audio Preview Column -->
              <div class="space-y-6">
                  <h3 class="text-lg font-semibold mb-4">🎵 Audio Preview</h3>
                  
                  <!-- Main Illuminating Display -->
                  <div class="audio-preview-card card-glow bg-gray-800 p-8 rounded-lg border border-gray-700 text-center">
                      <div class="illuminating-display mb-6">
                          <div class="audio-visualizer" id="audio-visualizer">
                              <div class="eq-bar" style="animation-delay: 0s;"></div>
                              <div class="eq-bar" style="animation-delay: 0.1s;"></div>
                              <div class="eq-bar" style="animation-delay: 0.2s;"></div>
                              <div class="eq-bar" style="animation-delay: 0.3s;"></div>
                              <div class="eq-bar" style="animation-delay: 0.4s;"></div>
                              <div class="eq-bar" style="animation-delay: 0.5s;"></div>
                              <div class="eq-bar" style="animation-delay: 0.6s;"></div>
                              <div class="eq-bar" style="animation-delay: 0.7s;"></div>
                          </div>
                      </div>
                      
                      <audio id="audio-player" controls class="w-full mb-4" style="display: none;">
                          <source src="" type="audio/mp3">
                      </audio>
                      
                      <div id="audio-status" class="text-gray-400 mb-4">
                          <i class="fas fa-headphones mr-2"></i>
                          Ready to generate audio
                      </div>
                      
                      <div class="flex gap-4 justify-center">
                          <button id="play-btn" class="btn-glow bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded transition-all" disabled>
                              <i class="fas fa-play mr-1"></i>Play
                          </button>
                          <button id="download-btn" class="btn-glow bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded transition-all" disabled>
                              <i class="fas fa-download mr-1"></i>Download
                          </button>
                      </div>
                  </div>
              </div>

              <!-- Generation Status Column -->
              <div class="space-y-6">
                  <h3 class="text-lg font-semibold mb-4">📊 Generation Status</h3>
                  
                  <div class="card-glow bg-gray-800 p-6 rounded-lg border border-gray-700">
                      <div class="mb-4">
                          <div class="flex justify-between text-sm text-gray-300 mb-2">
                              <span>Progress</span>
                              <span id="progress-percent">0%</span>
                          </div>
                          <div class="progress-bar bg-gray-700 rounded-full h-2">
                              <div id="progress-fill" class="progress-fill h-full rounded-full transition-all duration-300" style="width: 0%"></div>
                          </div>
                      </div>
                      
                      <div id="status-log" class="space-y-2 text-sm">
                          <div class="text-gray-400">
                              <i class="fas fa-circle text-gray-600 mr-2"></i>
                              Ready to start generation
                          </div>
                      </div>
                  </div>

                  <!-- Audio Settings -->
                  <div class="card-glow bg-gray-800 p-6 rounded-lg border border-gray-700">
                      <h4 class="text-sm font-semibold text-gray-300 mb-4">Audio Settings</h4>
                      
                      <div class="space-y-3">
                          <div>
                              <label class="block text-xs text-gray-400 mb-1">Speed</label>
                              <input type="range" id="speed-slider" min="0.5" max="2" step="0.1" value="1" class="w-full">
                              <span id="speed-value" class="text-xs text-gray-400">1.0x</span>
                          </div>
                          
                          <div>
                              <label class="block text-xs text-gray-400 mb-1">Pitch</label>
                              <input type="range" id="pitch-slider" min="-12" max="12" step="1" value="0" class="w-full">
                              <span id="pitch-value" class="text-xs text-gray-400">0</span>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </section>

      <!-- Voice Cloning Studio Section -->
      <section class="space-y-6">
          <div class="text-center">
              <h2 class="text-2xl font-bold text-glow mb-2">🧬 Voice Cloning Studio</h2>
              <p class="text-gray-400">Create custom AI voices from audio samples</p>
          </div>

          <!-- 2-Column Layout: Voice Input Methods | Voice Analysis & Cloning -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              <!-- Voice Input Methods Column -->
              <div class="space-y-6">
                  <h3 class="text-lg font-semibold mb-4">🎤 Voice Input Methods</h3>
                  
                  <!-- Live Recording -->
                  <div class="card-glow bg-gray-800 p-6 rounded-lg border border-gray-700">
                      <h4 class="font-semibold mb-4 text-green-400">
                          <i class="fas fa-microphone mr-2"></i>Live Recording
                      </h4>
                      
                      <div class="text-center mb-4">
                          <div id="recording-display" class="recording-waveform mb-4">
                              <div class="wave-bar" style="animation-delay: 0s;"></div>
                              <div class="wave-bar" style="animation-delay: 0.1s;"></div>
                              <div class="wave-bar" style="animation-delay: 0.2s;"></div>
                              <div class="wave-bar" style="animation-delay: 0.3s;"></div>
                              <div class="wave-bar" style="animation-delay: 0.4s;"></div>
                          </div>
                          
                          <button id="record-btn" class="btn-glow bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-lg font-semibold transition-all">
                              <i class="fas fa-microphone mr-2"></i>Start Recording
                          </button>
                      </div>
                      
                      <div id="recording-info" class="text-sm text-gray-400 text-center">
                          <i class="fas fa-info-circle mr-1"></i>
                          Record at least 30 seconds for best results
                      </div>
                  </div>

                  <!-- File Upload -->
                  <div class="card-glow bg-gray-800 p-6 rounded-lg border border-gray-700">
                      <h4 class="font-semibold mb-4 text-blue-400">
                          <i class="fas fa-upload mr-2"></i>Upload Audio File
                      </h4>
                      
                      <div class="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                          <i class="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-4"></i>
                          <p class="text-gray-300 mb-2">Drag & drop audio files here</p>
                          <p class="text-sm text-gray-400 mb-4">Supports MP3, WAV, M4A (Max 10MB)</p>
                          <input type="file" id="audio-upload" accept=".mp3,.wav,.m4a" class="hidden">
                          <button id="upload-btn" class="btn-glow bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded transition-all">
                              <i class="fas fa-folder-open mr-1"></i>Select Files
                          </button>
                      </div>
                      
                      <div id="upload-progress" class="mt-4" style="display: none;">
                          <div class="flex justify-between text-sm text-gray-300 mb-2">
                              <span>Uploading...</span>
                              <span id="upload-percent">0%</span>
                          </div>
                          <div class="progress-bar bg-gray-700 rounded-full h-2">
                              <div id="upload-fill" class="bg-blue-500 h-full rounded-full transition-all duration-300" style="width: 0%"></div>
                          </div>
                      </div>
                  </div>
              </div>

              <!-- Voice Analysis & Cloning Column -->
              <div class="space-y-6">
                  <h3 class="text-lg font-semibold mb-4">🔬 Voice Analysis & Cloning</h3>
                  
                  <!-- Voice Analysis Results -->
                  <div class="card-glow bg-gray-800 p-6 rounded-lg border border-gray-700">
                      <h4 class="font-semibold mb-4 text-purple-400">
                          <i class="fas fa-chart-line mr-2"></i>Voice Analysis
                      </h4>
                      
                      <div id="analysis-results" class="space-y-3">
                          <div class="flex justify-between">
                              <span class="text-gray-300">Voice Quality:</span>
                              <span id="voice-quality" class="text-gray-400">-</span>
                          </div>
                          <div class="flex justify-between">
                              <span class="text-gray-300">Clarity Score:</span>
                              <span id="clarity-score" class="text-gray-400">-</span>
                          </div>
                          <div class="flex justify-between">
                              <span class="text-gray-300">Duration:</span>
                              <span id="audio-duration" class="text-gray-400">-</span>
                          </div>
                          <div class="flex justify-between">
                              <span class="text-gray-300">Sample Rate:</span>
                              <span id="sample-rate" class="text-gray-400">-</span>
                          </div>
                      </div>
                  </div>

                  <!-- Voice Cloning Settings -->
                  <div class="card-glow bg-gray-800 p-6 rounded-lg border border-gray-700">
                      <h4 class="font-semibold mb-4 text-orange-400">
                          <i class="fas fa-cogs mr-2"></i>Cloning Settings
                      </h4>
                      
                      <div class="space-y-4">
                          <div>
                              <label class="block text-sm text-gray-300 mb-2">Voice Name</label>
                              <input type="text" id="voice-name" placeholder="Enter custom voice name..." 
                                  class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white">
                          </div>
                          
                          <div>
                              <label class="block text-sm text-gray-300 mb-2">Description</label>
                              <textarea id="voice-description" placeholder="Describe this voice..." 
                                  class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white h-20 resize-none"></textarea>
                          </div>

                          <div>
                              <label class="block text-sm text-gray-300 mb-2">Clone Quality</label>
                              <select id="clone-quality" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white">
                                  <option value="standard">Standard (Faster)</option>
                                  <option value="high">High Quality (Slower)</option>
                                  <option value="premium">Premium (Slowest, Best)</option>
                              </select>
                          </div>
                      </div>
                  </div>

                  <!-- Clone Voice Button -->
                  <button id="clone-voice-btn" class="btn-glow w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white py-3 px-6 rounded-lg font-semibold transition-all" disabled>
                      <i class="fas fa-dna mr-2"></i>Create Voice Clone
                  </button>

                  <!-- Cloning Progress -->
                  <div id="cloning-progress" class="card-glow bg-gray-800 p-6 rounded-lg border border-gray-700" style="display: none;">
                      <h4 class="font-semibold mb-4 text-green-400">
                          <i class="fas fa-spinner fa-spin mr-2"></i>Cloning in Progress
                      </h4>
                      
                      <div class="mb-4">
                          <div class="flex justify-between text-sm text-gray-300 mb-2">
                              <span>Progress</span>
                              <span id="clone-progress-percent">0%</span>
                          </div>
                          <div class="progress-bar bg-gray-700 rounded-full h-2">
                              <div id="clone-progress-fill" class="progress-fill h-full rounded-full transition-all duration-300" style="width: 0%"></div>
                          </div>
                      </div>
                      
                      <div id="clone-status-log" class="space-y-2 text-sm">
                          <div class="text-gray-400">
                              <i class="fas fa-circle text-blue-500 mr-2"></i>
                              Starting voice analysis...
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </section>
    </div>
  `
  
  return c.html(getPageLayout('AUTHORR AI - Narration Studio', narrationContent, 'narration'))
})

// Export page
app.get('/export', (c) => {
  const exportContent = `
    <div class="space-y-8">
      <div class="text-center mb-8">
        <h2 class="text-3xl font-bold text-glow mb-2">Export & Publishing</h2>
        <p class="text-gray-400">Generate covers and publish your audiobook to the world</p>
      </div>

      <!-- AI Cover Generation -->
      <section class="bg-gray-800 rounded-lg border border-gray-700 p-8">
        <h3 class="text-2xl font-bold mb-6 text-purple-400">
          <i class="fas fa-image mr-3"></i>AI Cover Generation
        </h3>
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <!-- Cover Customization -->
          <div class="space-y-6">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Book Description</label>
              <textarea id="cover-description" placeholder="Describe your book for AI cover generation..." 
                class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white h-32 resize-none focus:border-purple-400"></textarea>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Cover Style</label>
                <select id="cover-style" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white">
                  <option value="">Select style...</option>
                  <option value="photorealistic">Photorealistic</option>
                  <option value="illustration">Illustration</option>
                  <option value="minimal">Minimal</option>
                  <option value="vintage">Vintage</option>
                  <option value="modern">Modern</option>
                  <option value="abstract">Abstract</option>
                </select>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Format</label>
                <select id="cover-format" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white">
                  <option value="square">Square (Audible/Spotify)</option>
                  <option value="portrait">Portrait (Web/Mobile)</option>
                  <option value="landscape">Landscape (Desktop)</option>
                </select>
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Typography Style</label>
              <select id="typography-style" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white">
                <option value="">Select typography...</option>
                <option value="elegant">Elegant Serif</option>
                <option value="modern">Modern Sans-Serif</option>
                <option value="bold">Bold Display</option>
                <option value="handwritten">Handwritten</option>
                <option value="typewriter">Typewriter</option>
              </select>
            </div>
            
            <button id="generate-cover-btn" class="btn-glow w-full bg-purple-600 hover:bg-purple-500 text-white py-3 px-6 rounded-lg font-semibold transition-all">
              <i class="fas fa-magic mr-2"></i>Generate Cover
            </button>
          </div>
          
          <!-- Cover Preview -->
          <div class="bg-gray-700 rounded-lg p-6 text-center">
            <div id="cover-preview" class="bg-gray-600 rounded-lg mb-4 flex items-center justify-center h-80">
              <div class="text-gray-400">
                <i class="fas fa-image text-4xl mb-4"></i>
                <p>Cover preview will appear here</p>
              </div>
            </div>
            <div class="flex gap-2 justify-center">
              <button id="download-cover-btn" class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded transition-all" disabled>
                <i class="fas fa-download mr-1"></i>Download
              </button>
              <button id="regenerate-cover-btn" class="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded transition-all" disabled>
                <i class="fas fa-redo mr-1"></i>Regenerate
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Export Formats -->
      <section class="bg-gray-800 rounded-lg border border-gray-700 p-8">
        <h3 class="text-2xl font-bold mb-6 text-green-400">
          <i class="fas fa-file-export mr-3"></i>Export Formats
        </h3>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div class="bg-gray-700 rounded-lg p-6 text-center">
            <i class="fas fa-music text-3xl text-green-400 mb-4"></i>
            <h4 class="font-semibold mb-2">MP3 Audio</h4>
            <p class="text-sm text-gray-400 mb-4">Standard audio format, widely compatible</p>
            <label class="flex items-center justify-center">
              <input type="checkbox" class="mr-2" checked>
              <span class="text-sm">Include MP3</span>
            </label>
          </div>
          
          <div class="bg-gray-700 rounded-lg p-6 text-center">
            <i class="fas fa-headphones text-3xl text-blue-400 mb-4"></i>
            <h4 class="font-semibold mb-2">M4B Audiobook</h4>
            <p class="text-sm text-gray-400 mb-4">Native audiobook format with chapters</p>
            <label class="flex items-center justify-center">
              <input type="checkbox" class="mr-2" checked>
              <span class="text-sm">Include M4B</span>
            </label>
          </div>
          
          <div class="bg-gray-700 rounded-lg p-6 text-center">
            <i class="fas fa-wave-square text-3xl text-purple-400 mb-4"></i>
            <h4 class="font-semibold mb-2">WAV High Quality</h4>
            <p class="text-sm text-gray-400 mb-4">Uncompressed format for best quality</p>
            <label class="flex items-center justify-center">
              <input type="checkbox" class="mr-2">
              <span class="text-sm">Include WAV</span>
            </label>
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Audio Quality</label>
            <select id="audio-quality" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white">
              <option value="128">128 kbps (Standard)</option>
              <option value="192" selected>192 kbps (High)</option>
              <option value="320">320 kbps (Premium)</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Chapter Structure</label>
            <select id="chapter-structure" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white">
              <option value="single">Single File</option>
              <option value="chapters" selected>Split by Chapters</option>
              <option value="custom">Custom Segments</option>
            </select>
          </div>
        </div>
        
        <button id="export-audio-btn" class="btn-glow w-full bg-green-600 hover:bg-green-500 text-white py-3 px-6 rounded-lg font-semibold transition-all">
          <i class="fas fa-file-export mr-2"></i>Export Audio Files
        </button>
      </section>

      <!-- Publishing Platforms -->
      <section class="bg-gray-800 rounded-lg border border-gray-700 p-8">
        <h3 class="text-2xl font-bold mb-6 text-orange-400">
          <i class="fas fa-globe mr-3"></i>Publishing Platforms
        </h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div class="bg-gray-700 rounded-lg p-6 text-center">
            <i class="fab fa-amazon text-3xl text-orange-400 mb-4"></i>
            <h4 class="font-semibold mb-2">Audible</h4>
            <button class="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded transition-all text-sm">
              Connect Account
            </button>
          </div>
          
          <div class="bg-gray-700 rounded-lg p-6 text-center">
            <i class="fab fa-apple text-3xl text-gray-400 mb-4"></i>
            <h4 class="font-semibold mb-2">Apple Books</h4>
            <button class="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded transition-all text-sm">
              Connect Account
            </button>
          </div>
          
          <div class="bg-gray-700 rounded-lg p-6 text-center">
            <i class="fab fa-spotify text-3xl text-green-400 mb-4"></i>
            <h4 class="font-semibold mb-2">Spotify</h4>
            <button class="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded transition-all text-sm">
              Connect Account
            </button>
          </div>
          
          <div class="bg-gray-700 rounded-lg p-6 text-center">
            <i class="fab fa-google text-3xl text-blue-400 mb-4"></i>
            <h4 class="font-semibold mb-2">Google Play</h4>
            <button class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded transition-all text-sm">
              Connect Account
            </button>
          </div>
        </div>
        
        <div class="bg-gray-700 rounded-lg p-6">
          <h4 class="font-semibold mb-4 text-cyan-400">
            <i class="fas fa-check-circle mr-2"></i>Project Complete
          </h4>
          <div class="text-center">
            <div class="mb-6">
              <i class="fas fa-trophy text-6xl text-yellow-400 mb-4"></i>
              <h3 class="text-2xl font-bold text-glow mb-2">Your audiobook is ready for the world!</h3>
              <p class="text-gray-400">Congratulations on completing your audiobook project</p>
            </div>
            
            <div class="flex flex-wrap gap-4 justify-center">
              <button class="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-lg font-semibold transition-all">
                <i class="fas fa-download mr-2"></i>Download All Files
              </button>
              <button class="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-semibold transition-all">
                <i class="fas fa-share mr-2"></i>Share Project
              </button>
              <button class="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg font-semibold transition-all">
                <i class="fas fa-plus mr-2"></i>Start New Project
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  `
  
  return c.html(getPageLayout('AUTHORR AI - Export & Publishing', exportContent, 'export'))
})

export default app
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AUTHORR AI - Transform Text into Premium Audiobooks</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/styles.css" rel="stylesheet">
    </head>
    <body className="dark-theme bg-gray-900 text-white" data-theme="dark">
      <div className="app-container">
        {/* Header */}
        <header className="header bg-gray-800 border-b border-gray-700">
          <div className="header-content max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="logo-section flex items-center">
                <div className="logo-icon mr-3">
                  <i className="fas fa-book-reader text-3xl text-cyan-400"></i>
                </div>
                <h1 className="text-2xl font-bold">AUTHORR AI</h1>
              </div>
              <nav className="main-nav">
                <ul className="flex space-x-6">
                  <li><a href="#dashboard" className="nav-link">Dashboard</a></li>
                  <li><a href="#workspace" className="nav-link">Workspace</a></li>
                  <li><a href="#narration" className="nav-link">Narration</a></li>
                  <li><a href="#export" className="nav-link">Export</a></li>
                </ul>
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="main-content">
          
          {/* Narration Section with AI Engine and Voice Cloning Studio */}
          <section id="narration" className="content-section min-h-screen bg-gray-900 py-12">
            <div className="max-w-7xl mx-auto px-6">
              
              {/* AI Narration Engine */}
              <div className="mb-12">
                <div className="card-glow bg-gray-800 rounded-xl p-8 border border-cyan-500/20">
                  <h2 className="text-3xl font-bold mb-6 text-center text-glow">
                    <i className="fas fa-microphone mr-3"></i>AI Narration Engine
                  </h2>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Voice Controls */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">🎛️ Voice Controls</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">TTS Provider</label>
                          <select id="provider-select" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:border-cyan-400 focus:outline-none">
                            <option value="">Loading providers...</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Voice Actors</label>
                          <select id="voice-select" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:border-cyan-400 focus:outline-none">
                            <option>Loading voices...</option>
                          </select>
                          <button id="voice-preview-btn" className="w-full mt-2 py-1 bg-blue-600 rounded hover:bg-blue-700 transition-colors text-sm">
                            <i className="fas fa-play mr-1"></i>Preview Voice Actor
                          </button>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Speed</label>
                          <input type="range" id="speed-control" min="0.5" max="2" step="0.1" value="1" className="w-full accent-cyan-400" />
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>0.5x</span>
                            <span>1.0x</span>
                            <span>2.0x</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Audio Preview */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">🔊 Audio Preview</h3>
                      <div className="space-y-4">
                        <div className="audio-preview-card card-glow bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-cyan-500/30">
                          <div className="illuminating-display">
                            <div className="glow-effect"></div>
                            <div className="audio-visualizer" id="audio-visualizer">
                              <div className="eq-bar" style="animation-delay: 0s;"></div>
                              <div className="eq-bar" style="animation-delay: 0.1s;"></div>
                              <div className="eq-bar" style="animation-delay: 0.2s;"></div>
                              <div className="eq-bar" style="animation-delay: 0.3s;"></div>
                              <div className="eq-bar" style="animation-delay: 0.4s;"></div>
                              <div className="eq-bar" style="animation-delay: 0.5s;"></div>
                            </div>
                          </div>
                          
                          <div className="audio-controls mt-4 text-center">
                            <button id="preview-audio-btn" className="btn btn-primary">
                              <i className="fas fa-play mr-2"></i>Preview Voice
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Generation Status */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">📊 Generation Status</h3>
                      <div className="space-y-4">
                        <div className="status-card bg-gray-800/50 rounded-lg p-4 border border-green-500/20">
                          <div className="flex items-center justify-between">
                            <span className="text-green-400">
                              <i className="fas fa-check-circle mr-2"></i>Ready
                            </span>
                            <span className="text-xs text-gray-400">System Status</span>
                          </div>
                        </div>
                        
                        <div className="progress-display">
                          <div className="progress-info flex justify-between text-sm mb-2">
                            <span>Queue Position</span>
                            <span className="text-cyan-400">#1</span>
                          </div>
                          <div className="progress-bar-bg">
                            <div className="progress-bar-fill" style="width: 0%;"></div>
                          </div>
                        </div>

                        <button className="btn btn-success btn-full">
                          <i className="fas fa-robot mr-2"></i>Generate Audiobook
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Voice Cloning Studio */}
              <div className="mb-12">
                <div className="card-glow bg-gray-800 rounded-xl p-8 border border-cyan-500/20">
                  <h2 className="text-3xl font-bold mb-6 text-center text-glow">
                    <i className="fas fa-microphone-alt mr-3"></i>Voice Cloning Studio
                  </h2>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Voice Input Methods */}
                    <div>
                      <h3 className="text-xl font-semibold mb-4">🎙️ Voice Input Methods</h3>
                      <div className="space-y-6">
                        
                        {/* Recommended Script */}
                        <div className="script-card bg-gray-700/50 rounded-lg p-4 border border-cyan-500/30">
                          <h4 className="font-semibold mb-2 text-cyan-400 flex items-center">
                            <i className="fas fa-scroll mr-2"></i>📝 Recommended Script
                          </h4>
                          <div className="script-content bg-gray-800 rounded p-3 text-sm text-gray-300 leading-relaxed border-l-4 border-cyan-400">
                            "The quick brown fox jumps over the lazy dog. Peter Piper picked a peck of pickled peppers. 
                            She sells seashells by the seashore. How much wood would a woodchuck chuck if a woodchuck could chuck wood? 
                            The rain in Spain stays mainly in the plain."
                          </div>
                          <p className="text-xs text-gray-500 mt-2 italic">This script contains key phonemes for accurate voice cloning.</p>
                        </div>

                        {/* File Upload */}
                        <div className="upload-card tool-card rounded-lg p-6">
                          <h4 className="font-semibold mb-3 flex items-center">
                            <i className="fas fa-upload mr-2 text-blue-400"></i>Upload Audio File
                          </h4>
                          <div className="upload-zone border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-cyan-400 transition-all duration-300">
                            <input type="file" id="voice-upload" accept="audio/*" className="hidden" />
                            <label for="voice-upload" className="cursor-pointer">
                              <div className="upload-icon">
                                <i className="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-2 transition-colors"></i>
                              </div>
                              <p className="text-sm text-gray-300">Click to upload audio file</p>
                              <p className="text-xs text-gray-500 mt-1">Supports MP3, WAV, M4A (max 10MB)</p>
                            </label>
                          </div>
                          <div id="upload-status" className="mt-3 text-sm text-gray-400"></div>
                          <div id="upload-progress" className="mt-2 hidden">
                            <div className="progress-container">
                              <div className="progress-bar-bg">
                                <div id="upload-progress-bar" className="progress-bar-fill" style="width: 0%;"></div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Voice Recording */}
                        <div className="recording-card tool-card rounded-lg p-6">
                          <h4 className="font-semibold mb-3 flex items-center">
                            <i className="fas fa-microphone mr-2 text-red-400"></i>Record Voice Sample
                          </h4>
                          <div className="space-y-4">
                            {/* Voice Waveform Display */}
                            <div className="voice-waveform bg-gray-900 rounded-lg p-4 h-24" id="recording-visual">
                              <div className="waveform-container flex items-center justify-center h-full">
                                <span className="text-gray-400 text-sm">Click record to begin</span>
                              </div>
                            </div>
                            
                            {/* Recording Controls */}
                            <div className="recording-controls flex justify-center space-x-4">
                              <button id="record-btn" className="record-button px-6 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-all duration-300 flex items-center">
                                <i className="fas fa-microphone mr-2"></i>
                                <span id="record-text">Start Recording</span>
                              </button>
                              <button id="play-btn" className="px-6 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center disabled:opacity-50" disabled>
                                <i className="fas fa-play mr-2"></i>Play
                              </button>
                              <button id="stop-btn" className="px-6 py-2 bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors flex items-center hidden">
                                <i className="fas fa-stop mr-2"></i>Stop
                              </button>
                            </div>
                            
                            {/* Recording Timer */}
                            <div className="recording-timer text-center">
                              <span id="recording-timer" className="text-lg font-mono text-cyan-400">00:00</span>
                            </div>
                            
                            <div id="recording-status" className="text-sm text-gray-400 text-center"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Voice Analysis & Cloning */}
                    <div>
                      <h3 className="text-xl font-semibold mb-4">🧬 Voice Analysis & Cloning</h3>
                      <div className="space-y-6">
                        {/* Voice Characteristics */}
                        <div className="analysis-card tool-card rounded-lg p-6">
                          <h4 className="font-semibold mb-3 flex items-center">
                            <i className="fas fa-chart-line mr-2 text-green-400"></i>Voice Characteristics
                          </h4>
                          <div className="characteristics-grid grid grid-cols-2 gap-4 text-sm">
                            <div className="characteristic-item">
                              <span className="text-gray-400">Pitch:</span>
                              <span className="text-green-400 ml-2 font-semibold" id="voice-pitch">Medium-High</span>
                            </div>
                            <div className="characteristic-item">
                              <span className="text-gray-400">Tone:</span>
                              <span className="text-blue-400 ml-2 font-semibold" id="voice-tone">Warm</span>
                            </div>
                            <div className="characteristic-item">
                              <span className="text-gray-400">Accent:</span>
                              <span className="text-purple-400 ml-2 font-semibold" id="voice-accent">Neutral American</span>
                            </div>
                            <div className="characteristic-item">
                              <span className="text-gray-400">Quality:</span>
                              <span className="text-yellow-400 ml-2 font-semibold" id="voice-quality">Clear</span>
                            </div>
                          </div>
                          <div className="mt-4">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm text-gray-400">Analysis Progress</span>
                              <span id="analysis-percentage" className="text-sm text-cyan-400">85%</span>
                            </div>
                            <div className="progress-container">
                              <div className="progress-bar-bg">
                                <div id="analysis-progress" className="progress-bar-fill analyzing" style="width: 85%;"></div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Cloning Settings */}
                        <div className="settings-card tool-card rounded-lg p-6">
                          <h4 className="font-semibold mb-3 flex items-center">
                            <i className="fas fa-sliders-h mr-2 text-purple-400"></i>Cloning Settings
                          </h4>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium mb-2">Voice Name</label>
                              <input type="text" id="voice-name" placeholder="My Custom Voice" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:border-cyan-400 focus:outline-none transition-colors" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">Similarity Strength</label>
                              <input type="range" id="similarity-strength" min="0.5" max="1" step="0.1" value="0.8" className="w-full accent-cyan-400" />
                              <div className="flex justify-between text-xs text-gray-400">
                                <span>More Natural</span>
                                <span>More Similar</span>
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">Stability</label>
                              <input type="range" id="voice-stability" min="0" max="1" step="0.1" value="0.7" className="w-full accent-cyan-400" />
                              <div className="flex justify-between text-xs text-gray-400">
                                <span>More Variable</span>
                                <span>More Stable</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="actions-section space-y-3">
                          <button className="clone-button w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105">
                            <i className="fas fa-magic mr-2"></i>Create Voice Clone
                          </button>
                          <button className="test-button w-full py-2 bg-blue-600 rounded hover:bg-blue-700 transition-colors glow-button">
                            <i className="fas fa-play mr-2"></i>Test Cloned Voice
                          </button>
                          <button className="save-button w-full py-2 bg-green-600 rounded hover:bg-green-700 transition-colors glow-button">
                            <i className="fas fa-save mr-2"></i>Save to Voice Library
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
          </section>

        </main>
      </div>
      
      <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
      <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app