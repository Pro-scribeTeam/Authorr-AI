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
        <header class="authorr-header p-4">
            <div class="max-w-7xl mx-auto flex items-center justify-between">
                <div class="flex items-center space-x-3">
                    <div class="logo-container">
                        <img src="https://page.gensparksite.com/v1/base64_upload/6a18a03a0473af4977f9af6b7e149097" 
                             alt="Authorr AI" 
                             class="logo-image h-12 w-auto">
                    </div>
                    <div class="brand-text">
                        <h1 class="text-2xl font-bold authorr-brand-text">AUTHOrr AI</h1>
                        <p class="text-xs text-teal-300 font-medium">Advanced Narration Platform</p>
                    </div>
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
        <h3 class="text-2xl font-bold mb-6 authorr-accent-text">
          <i class="fas fa-rocket mr-3"></i>Start New Project
        </h3>
        
        <form id="project-form" class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Book Title *</label>
              <input type="text" id="book-title" placeholder="Enter your book title..." 
                class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-teal-300 focus:shadow-teal">
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Author Name *</label>
              <input type="text" id="author-name" placeholder="Your name..." 
                class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-teal-300 focus:shadow-teal">
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
                class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white h-24 resize-none focus:border-teal-300 focus:shadow-teal"></textarea>
            </div>
            
            <button type="submit" class="btn-glow w-full bg-cyan-600 hover:bg-cyan-500 text-white py-3 px-6 rounded-lg font-semibold transition-all mt-6">
              <i class="fas fa-plus mr-2"></i>Create Project
            </button>
          </div>
        </form>
      </div>

      <!-- Recent Projects -->
      <div class="bg-gray-800 rounded-lg border border-gray-700 p-8">
        <h3 class="text-2xl font-bold mb-6 authorr-accent-text">
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
              <h3 class="text-lg font-bold authorr-accent-text">
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
                class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-xl font-semibold focus:border-teal-300 focus:shadow-teal">
              
              <textarea id="manuscript-editor" placeholder="Start writing your story here..." 
                class="w-full bg-gray-700 border border-gray-600 rounded px-4 py-3 text-white h-96 resize-none focus:border-teal-300 focus:shadow-teal font-mono"></textarea>
            </div>
            
            <div class="flex justify-between items-center mt-4">
              <div class="text-sm text-gray-400">
                <i class="fas fa-clock mr-1"></i>
                Auto-saved 2 minutes ago
              </div>
              <div class="flex space-x-2">
                <button id="save-story-btn" class="btn btn-primary">
                  <i class="fas fa-save mr-1"></i>Save Story
                </button>
                <button class="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded transition-all">
                  <i class="fas fa-arrow-right mr-1"></i>Continue to Narration
                </button>
              </div>
            </div>
            
            <!-- Generate Full Audiobook Section -->
            <div class="mt-8 text-center">
              <button id="chapter-review-workspace-btn" class="btn btn-primary mb-3 mr-3">
                <i class="fas fa-book-open mr-2"></i>Review Chapters
              </button>
              <button id="generate-full-audiobook-btn" class="btn-glow bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all">
                <i class="fas fa-magic mr-2"></i>Generate Full Audiobook
              </button>
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
                  <h3 class="text-lg font-semibold mb-4 authorr-accent-text">
                      <span class="status-light ready"></span>🎛️ Voice Controls
                  </h3>
                  
                  <!-- Voice Actor Selection -->
                  <div class="futuristic-panel card-glow bg-gray-800 p-6 rounded-lg border border-gray-700">
                      <label class="block text-sm font-medium text-gray-300 mb-2">
                          <span class="status-light ready"></span>Voice Actors
                      </label>
                      <select id="voice-select" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white mb-4 focus:border-teal-300 focus:shadow-teal">
                          <option value="">Loading voices...</option>
                      </select>
                      <button id="voice-preview-btn" class="btn-glow w-full bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded transition-all mb-2">
                          <i class="fas fa-play mr-1"></i>Preview Voice Actor
                      </button>
                      <button id="voice-review-btn" class="btn btn-primary w-full">
                          <i class="fas fa-microphone-alt mr-2"></i>Review Voice Configuration
                      </button>
                  </div>

                  <!-- Advanced Voice Controls -->
                  <div class="futuristic-panel card-glow bg-gray-800 p-6 rounded-lg border border-gray-700">
                      <label class="block text-sm font-medium text-gray-300 mb-4">
                          <span class="status-light ready"></span>Voice Settings
                      </label>
                      <div class="space-y-4">
                          <div>
                              <label class="block text-xs text-gray-400 mb-2">Speed</label>
                              <input type="range" min="0.5" max="2" step="0.1" value="1" class="w-full accent-light-blue">
                              <div class="flex justify-between text-xs text-gray-500">
                                  <span>0.5x</span>
                                  <span>Normal</span>
                                  <span>2x</span>
                              </div>
                          </div>
                          <div>
                              <label class="block text-xs text-gray-400 mb-2">Pitch</label>
                              <input type="range" min="-12" max="12" step="1" value="0" class="w-full accent-light-blue">
                              <div class="flex justify-between text-xs text-gray-500">
                                  <span>Low</span>
                                  <span>Normal</span>
                                  <span>High</span>
                              </div>
                          </div>
                      </div>
                  </div>

                  <!-- Text Input -->
                  <div class="futuristic-panel card-glow bg-gray-800 p-6 rounded-lg border border-gray-700">
                      <label class="block text-sm font-medium text-gray-300 mb-2">
                          <span class="status-light ready"></span>Text to Narrate
                      </label>
                      <textarea id="text-input" placeholder="Enter your text here..." 
                          class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white h-32 resize-none focus:border-teal-300 focus:shadow-teal"></textarea>
                      <div class="mt-2 text-xs text-gray-500">
                          Characters: <span id="char-count">0</span> | Est. Duration: <span id="duration-est">0s</span>
                      </div>
                  </div>

                  <!-- Generation Button -->
                  <button id="generate-btn" class="btn-glow w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white py-4 px-8 rounded-lg font-bold text-lg transition-all shadow-lg">
                      <span class="status-light ready"></span>
                      <i class="fas fa-magic mr-2"></i>Generate Narration
                  </button>
              </div>
              
              <!-- Audio Preview Column -->
              <div class="space-y-6">
                  <h3 class="text-lg font-semibold mb-4 authorr-accent-text">
                      <span class="status-light ready"></span>🔊 Audio Preview
                  </h3>
                  
                  <!-- MAIN Illuminating Light Display -->
                  <div class="illuminating-display futuristic-panel card-glow bg-gray-800 p-8 rounded-xl border border-cyan-500/30 relative overflow-hidden">
                      <!-- Spinning Light Ring Background -->
                      <div class="light-ring"></div>
                      
                      <!-- Pulse Ring Effects -->
                      <div class="pulse-ring"></div>
                      
                      <!-- Main Content -->
                      <div class="relative z-10">
                          <div class="text-center mb-6">
                              <p class="text-cyan-300 mb-3 text-lg font-medium">Click to preview current chapter narration</p>
                              <div class="text-3xl font-mono text-cyan-400 font-bold glow-text">
                                  <span id="current-time">0:00</span> / <span id="total-time">0:00</span>
                              </div>
                          </div>
                          
                          <!-- Enhanced Audio Visualizer with Glow -->
                          <div id="audio-visualizer" class="audio-visualizer mb-6 relative">
                              <div class="eq-bar"></div>
                              <div class="eq-bar"></div>
                              <div class="eq-bar"></div>
                              <div class="eq-bar"></div>
                              <div class="eq-bar"></div>
                              <div class="eq-bar"></div>
                              <div class="eq-bar"></div>
                              <div class="eq-bar"></div>
                              <div class="eq-bar"></div>
                              <div class="eq-bar"></div>
                              <div class="eq-bar"></div>
                              <div class="eq-bar"></div>
                          </div>
                          
                          <!-- Waveform Progress Bar -->
                          <div class="waveform-progress mb-6">
                              <div class="bg-gray-700 rounded-full h-2 relative overflow-hidden">
                                  <div class="progress-shimmer"></div>
                                  <div class="bg-gradient-to-r from-cyan-400 to-teal-400 h-full rounded-full w-0 transition-all duration-300 shadow-glow"></div>
                              </div>
                          </div>
                          
                          <button id="preview-audio-btn" class="glow-button w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white py-4 px-8 rounded-lg font-bold text-lg transition-all shadow-xl">
                              <i class="fas fa-play mr-3"></i>Preview Audio
                          </button>
                          
                          <!-- Chapter Selector -->
                          <div class="mt-4">
                              <select class="w-full bg-gray-700 border border-cyan-500/30 rounded px-3 py-2 text-white text-sm">
                                  <option>Chapter 1: Introduction</option>
                                  <option>Chapter 2: The Journey Begins</option>
                                  <option>Chapter 3: Challenges Ahead</option>
                              </select>
                          </div>
                      </div>
                      
                      <!-- Animated Background Gradient -->
                      <div class="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-teal-500/5 animated-gradient"></div>
                  </div>
              </div>
              
              <!-- Generation Status Column -->
              <div class="space-y-6">
                  <h3 class="text-lg font-semibold mb-4 authorr-accent-text">
                      <span class="status-light ready"></span>⚡ Generation Status
                  </h3>
                  
                  <!-- Status Display -->
                  <div class="futuristic-panel card-glow bg-gray-800 p-6 rounded-lg border border-gray-700">
                      <div class="flex items-center mb-6">
                          <div class="status-light ready mr-3"></div>
                          <span class="text-green-400 font-medium text-lg">Ready to generate audio</span>
                      </div>
                      
                      <!-- Progress Visualization -->
                      <div class="space-y-4 mb-6">
                          <div class="flex justify-between items-center">
                              <span class="text-gray-300 font-medium">Progress:</span>
                              <span class="text-white font-bold text-lg">0%</span>
                          </div>
                          
                          <div class="progress-container bg-gray-700 rounded-full h-4 relative overflow-hidden">
                              <div class="progress-shimmer"></div>
                              <div id="progress-bar" class="progress-bar bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 h-full rounded-full w-0 transition-all duration-500 shadow-lg"></div>
                              <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                          </div>
                          
                          <div class="text-xs text-gray-400 text-center">
                              Estimated time remaining: <span id="time-remaining">--</span>
                          </div>
                      </div>
                      
                      <!-- Action Buttons -->
                      <div class="space-y-3">
                          <button id="download-btn" class="btn-glow w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white py-3 px-6 rounded-lg font-semibold transition-all" disabled>
                              <i class="fas fa-download mr-2"></i>Download Audio
                          </button>
                          
                          <button id="save-project-btn" class="btn-glow w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white py-2 px-4 rounded-lg font-medium transition-all">
                              <i class="fas fa-save mr-2"></i>Save Project
                          </button>
                      </div>
                  </div>
                  
                  <!-- Generation Queue -->
                  <div class="futuristic-panel card-glow bg-gray-800 p-6 rounded-lg border border-gray-700">
                      <h4 class="text-md font-semibold text-gray-300 mb-4">
                          <span class="status-light processing"></span>Generation Queue
                      </h4>
                      <div class="space-y-3 text-sm">
                          <div class="flex justify-between items-center">
                              <span class="text-gray-400">Position in queue:</span>
                              <span class="text-cyan-400 font-semibold">#1</span>
                          </div>
                          <div class="flex justify-between items-center">
                              <span class="text-gray-400">Estimated wait:</span>
                              <span class="text-teal-400 font-semibold">< 1 minute</span>
                          </div>
                          <div class="flex justify-between items-center">
                              <span class="text-gray-400">Voice model:</span>
                              <span class="text-gray-300">Premium</span>
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
                  <h3 class="text-lg font-semibold mb-4 authorr-accent-text">
                      <span class="status-light ready"></span>🎤 Voice Input Methods
                  </h3>
                  
                  <!-- Live Recording -->
                  <div class="futuristic-panel card-glow bg-gray-800 p-6 rounded-lg border border-gray-700 relative overflow-hidden">
                      <!-- Pulse Ring for Recording -->
                      <div class="pulse-ring" style="display: none;"></div>
                      
                      <h4 class="font-semibold mb-4 text-green-400">
                          <span class="status-light ready"></span>
                          <i class="fas fa-microphone mr-2"></i>Live Recording
                      </h4>
                      
                      <div class="text-center mb-4">
                          <!-- Enhanced Recording Waveform -->
                          <div id="recording-visual" class="voice-waveform mb-6">
                              <div class="waveform-bar"></div>
                              <div class="waveform-bar"></div>
                              <div class="waveform-bar"></div>
                              <div class="waveform-bar"></div>
                              <div class="waveform-bar"></div>
                              <div class="waveform-bar"></div>
                              <div class="waveform-bar"></div>
                              <div class="waveform-bar"></div>
                              <div class="waveform-bar"></div>
                              <div class="waveform-bar"></div>
                          </div>
                          
                          <!-- Recording Timer -->
                          <div id="recording-timer" class="text-2xl font-mono text-cyan-400 mb-4" style="display: none;">
                              00:00
                          </div>
                          
                          <div class="space-y-3">
                              <button id="record-btn" class="btn-glow bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white px-6 py-3 rounded-lg font-semibold transition-all">
                                  <i class="fas fa-microphone mr-2"></i>Start Recording
                              </button>
                              
                              <div class="flex gap-2 justify-center">
                                  <button id="play-btn" class="btn-glow bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded transition-all" disabled>
                                      <i class="fas fa-play mr-1"></i>Play
                                  </button>
                                  <button id="stop-btn" class="btn-glow bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded transition-all" disabled>
                                      <i class="fas fa-stop mr-1"></i>Stop
                                  </button>
                              </div>
                          </div>
                      </div>
                      
                      <div id="recording-info" class="text-sm text-gray-400 text-center">
                          <span class="status-light ready"></span>
                          <i class="fas fa-info-circle mr-1"></i>
                          Record at least 30 seconds for best results
                      </div>
                  </div>

                  <!-- File Upload -->
                  <div class="futuristic-panel card-glow bg-gray-800 p-6 rounded-lg border border-gray-700">
                      <h4 class="font-semibold mb-4 text-blue-400">
                          <span class="status-light ready"></span>
                          <i class="fas fa-upload mr-2"></i>Upload Audio File
                      </h4>
                      
                      <div id="upload-zone" class="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 transition-all cursor-pointer">
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
        
        <!-- Chapter Review Button -->
        <button id="chapter-review-btn" class="btn btn-primary w-full mb-4">
          <i class="fas fa-book-open mr-2"></i>Review Chapters
        </button>
        
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
          <h4 class="font-semibold mb-4 authorr-accent-text">
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

// API Endpoints
app.post('/api/export-text', async (c) => {
  try {
    const { text, format } = await c.req.json()
    
    // Simulate text export processing
    const exportData = {
      success: true,
      message: 'Text exported successfully',
      data: {
        format: format || 'txt',
        size: text?.length || 0,
        exportId: `export_${Date.now()}`,
        downloadUrl: `/api/download/export_${Date.now()}.${format || 'txt'}`
      }
    }
    
    return c.json(exportData)
  } catch (error) {
    return c.json({ success: false, message: 'Export failed', error: error.message }, 500)
  }
})

app.post('/api/save-story', async (c) => {
  try {
    const { title, content, chapterTitle } = await c.req.json()
    
    // Simulate story saving
    const saveData = {
      success: true,
      message: 'Story saved successfully',
      data: {
        storyId: `story_${Date.now()}`,
        title: title,
        chapterTitle: chapterTitle || 'Untitled Chapter',
        wordCount: content?.split(' ').length || 0,
        savedAt: new Date().toISOString(),
        autoSave: true
      }
    }
    
    return c.json(saveData)
  } catch (error) {
    return c.json({ success: false, message: 'Save failed', error: error.message }, 500)
  }
})

app.post('/api/continue-to-narration', async (c) => {
  try {
    const { storyId, text, settings } = await c.req.json()
    
    // Prepare narration data
    const narrationData = {
      success: true,
      message: 'Ready for narration',
      data: {
        narrationId: `narration_${Date.now()}`,
        storyId: storyId,
        textLength: text?.length || 0,
        estimatedDuration: Math.ceil((text?.split(' ').length || 0) / 150), // ~150 WPM
        redirectUrl: '/narration',
        settings: settings || {}
      }
    }
    
    return c.json(narrationData)
  } catch (error) {
    return c.json({ success: false, message: 'Narration preparation failed', error: error.message }, 500)
  }
})

app.post('/api/voice-review', async (c) => {
  try {
    const { voiceId, settings, sampleText } = await c.req.json()
    
    // Simulate voice review
    const reviewData = {
      success: true,
      message: 'Voice configuration reviewed successfully',
      data: {
        voiceId: voiceId,
        quality: Math.floor(Math.random() * 20) + 80, // 80-100 quality score
        compatibility: ['audiobook', 'narration', 'storytelling'],
        settings: settings || {},
        sampleAudioUrl: `/api/audio/sample_${voiceId}_${Date.now()}.mp3`,
        estimatedTime: Math.ceil((sampleText?.split(' ').length || 0) / 2.5) // ~2.5 WPS
      }
    }
    
    return c.json(reviewData)
  } catch (error) {
    return c.json({ success: false, message: 'Voice review failed', error: error.message }, 500)
  }
})

app.post('/api/chapter-review', async (c) => {
  try {
    const { chapters, storyId } = await c.req.json()
    
    // Simulate chapter analysis
    const reviewData = {
      success: true,
      message: 'Chapter review completed',
      data: {
        totalChapters: chapters?.length || 0,
        totalWords: chapters?.reduce((sum, ch) => sum + (ch.content?.split(' ').length || 0), 0) || 0,
        estimatedAudioLength: Math.ceil((chapters?.reduce((sum, ch) => sum + (ch.content?.split(' ').length || 0), 0) || 0) / 150), // minutes
        chapters: chapters?.map((ch, idx) => ({
          id: idx + 1,
          title: ch.title || `Chapter ${idx + 1}`,
          wordCount: ch.content?.split(' ').length || 0,
          estimatedDuration: Math.ceil((ch.content?.split(' ').length || 0) / 150),
          status: 'ready'
        })) || []
      }
    }
    
    return c.json(reviewData)
  } catch (error) {
    return c.json({ success: false, message: 'Chapter review failed', error: error.message }, 500)
  }
})

export default app
