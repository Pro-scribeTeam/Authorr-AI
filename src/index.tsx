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
  return c.json({ message: 'Hello from Hono!' })
})

// Main page
app.get('/', (c) => {
  return c.html(`
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