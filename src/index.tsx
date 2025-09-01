import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import OpenAI from 'openai'

// OpenAI configuration - Replace with your actual API key
// In Cloudflare Workers, environment variables come from the context
const DEMO_OPENAI_API_KEY = 'YOUR_ACTUAL_OPENAI_API_KEY_HERE'

// Helper function to get OpenAI client based on environment
function getOpenAIClient(env?: any) {
  // Try to get API key from environment or return null
  const apiKey = env?.OPENAI_API_KEY || DEMO_OPENAI_API_KEY
  
  if (!apiKey || apiKey.includes('YOUR_ACTUAL_OPENAI_API_KEY_HERE')) {
    return null // No valid API key
  }
  
  return new OpenAI({
    apiKey: apiKey
  })
}

// Helper function to check if OpenAI is configured
function isOpenAIConfigured(env?: any) {
  const apiKey = env?.OPENAI_API_KEY || DEMO_OPENAI_API_KEY
  return apiKey && !apiKey.includes('YOUR_ACTUAL_OPENAI_API_KEY_HERE') && apiKey.startsWith('sk-')
}

const app = new Hono()

// Enable CORS for frontend-backend communication
app.use('/api/*', cors())

// Serve static files from dist directory (built files)
app.use('/static/*', serveStatic({ root: './dist' }))

// API routes
app.get('/api/hello', (c) => {
  return c.json({ message: 'Hello from Voice Cloning Studio!' })
})

// API Configuration Status
app.get('/api/openai-status', (c) => {
  const configured = isOpenAIConfigured(c.env)
  return c.json({
    configured: configured,
    demo_mode: !configured,
    message: configured 
      ? 'OpenAI API is configured and ready' 
      : 'OpenAI API key not configured - running in demo mode',
    endpoints_available: [
      '/api/ai/generate-ideas',
      '/api/ai/create-outline', 
      '/api/ai/expand-text',
      '/api/ai/summarize',
      '/api/ai/rewrite',
      '/api/ai/character-builder',
      '/api/ai/text-to-speech',
      '/api/ai/generate-cover',
      '/api/ai/analyze-voice'
    ]
  })
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

// Chapter Planning Endpoints
app.post('/api/chapter/create', async (c) => {
  try {
    const { bookTitle, authorName, genre, targetAudience, chapterSelection, wordCount, toneVoice, narrativePerspective, bookDescription } = await c.req.json()
    
    const numChapters = parseInt(chapterSelection) || 8
    
    const openai = getOpenAIClient(c.env)
    if (!openai) {
      return c.json({
        success: false,
        error: 'OpenAI API key not configured',
        demo_response: {
          chapters: [
            {
              id: 1,
              title: 'The Beginning',
              outline: 'Introduce the main character and establish the world. Set up the initial conflict that will drive the story forward.'
            },
            {
              id: 2,
              title: 'The Challenge',
              outline: 'Present the first major obstacle. Show character growth and introduce supporting characters.'
            },
            {
              id: 3,
              title: 'Rising Action',
              outline: 'Escalate the conflict. Develop relationships and reveal important plot elements.'
            },
            {
              id: 4,
              title: 'The Climax',
              outline: 'The turning point of the story. Major confrontation and character decision.'
            },
            {
              id: 5,
              title: 'Resolution',
              outline: 'Resolve the main conflict. Show character transformation and tie up loose ends.'
            }
          ]
        }
      })
    }
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{
        role: "system",
        content: "You are a professional book planning assistant. Create detailed chapter outlines. Always provide exactly 5-8 chapters with clear titles and detailed outlines."
      }, {
        role: "user",
        content: `Create a detailed chapter plan for a ${genre} book titled "${bookTitle}" by ${authorName}. 

Book Description: ${bookDescription}
Target Audience: ${targetAudience}
Chapters Requested: ${numChapters}
Words per Chapter: ${wordCount} words
Tone: ${toneVoice}
Narrative: ${narrativePerspective}

Provide exactly ${numChapters} chapters. For each chapter, provide:
1. A compelling chapter title
2. A detailed outline (2-3 sentences describing the main events, character development, and plot progression)
3. Consider that each chapter should be approximately ${wordCount} words when written

Format your response as:
Chapter 1: [Title]
[Detailed outline describing what happens in this chapter]

Chapter 2: [Title] 
[Detailed outline describing what happens in this chapter]

[Continue for all ${numChapters} chapters]`
      }],
      max_tokens: 1500,
      temperature: 0.8
    })
    
    // Parse the AI response into structured chapters
    const text = completion.choices[0].message.content
    console.log('AI Response:', text) // Debug log
    let chapters = []
    
    // Parse structured text response
    const lines = text.split('\n').filter(line => line.trim())
    let currentChapter = null
    
    lines.forEach(line => {
      // Match "Chapter X: Title" format
      const chapterMatch = line.match(/^Chapter\s*(\d+):\s*(.+)$/i)
      if (chapterMatch) {
        // Save previous chapter if exists
        if (currentChapter) {
          chapters.push(currentChapter)
        }
        // Start new chapter
        currentChapter = {
          id: parseInt(chapterMatch[1]),
          title: chapterMatch[2].trim(),
          outline: ''
        }
      } else if (currentChapter && line.trim() && !line.match(/^Chapter\s*\d+/i)) {
        // Add to current chapter outline
        currentChapter.outline += (currentChapter.outline ? ' ' : '') + line.trim()
      }
    })
    
    // Don't forget the last chapter
    if (currentChapter) {
      chapters.push(currentChapter)
    }
    
    console.log('Parsed chapters:', chapters) // Debug log
    
    // Only use fallback if we truly have no chapters
    if (chapters.length === 0) {
      console.log('No chapters parsed, using fallback')
      chapters = [
        {
          id: 1,
          title: `The Opening of ${bookTitle}`,
          outline: `Introduce the main character in the ${genre} world. Establish the setting and initial conflict that will drive the ${toneVoice} narrative forward.`
        },
        {
          id: 2,
          title: 'The Call to Adventure',
          outline: `The protagonist faces their first major challenge. Initial obstacles emerge that test their resolve and begin their transformation.`
        },
        {
          id: 3,
          title: 'Rising Stakes', 
          outline: `Complications multiply and the conflict intensifies. Character relationships develop and important plot elements are revealed.`
        },
        {
          id: 4,
          title: 'The Turning Point',
          outline: `The climactic moment arrives. Major confrontations occur and the protagonist must make crucial decisions that will determine the outcome.`
        },
        {
          id: 5,
          title: 'Resolution and New Beginnings',
          outline: `The main conflict reaches its conclusion. Character arcs complete and the new equilibrium is established, setting up potential future adventures.`
        }
      ]
    } else {
      console.log(`Successfully parsed ${chapters.length} chapters from AI response`)
    }
    
    return c.json({
      success: true,
      chapters: chapters,
      usage: completion.usage,
      ai_response_preview: text.substring(0, 200) + '...' // Debug info
    })
    
  } catch (error) {
    console.error('Chapter Creation Error:', error)
    return c.json({ 
      success: false, 
      error: 'Failed to create chapters',
      details: error.message 
    }, 500)
  }
})

app.post('/api/story/generate', async (c) => {
  try {
    const { chapters, bookTitle, genre, wordCount, toneVoice, narrativePerspective } = await c.req.json()
    
    const openai = getOpenAIClient(c.env)
    if (!openai) {
      return c.json({
        success: false,
        error: 'OpenAI API key not configured',
        demo_response: {
          story: `**Demo Mode - Configure OpenAI API Key for Real Story Generation**\n\nThis would generate a complete story based on your chapter outlines. The AI would create engaging prose that follows your specified tone, narrative perspective, and genre conventions.\n\nEach chapter would be fully written with:\n• Compelling character dialogue\n• Rich descriptive passages\n• Proper pacing and tension\n• Consistent tone and style\n• Genre-appropriate elements\n\nThe generated story would be ready for editing in the Workspace.`
        }
      })
    }
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{
        role: "system",
        content: `You are a professional ${genre} writer. Write engaging stories with ${toneVoice} tone in ${narrativePerspective} perspective.`
      }, {
        role: "user",
        content: `Write a complete story for "${bookTitle}" based on these chapter outlines:\n\n${chapters.map(ch => `Chapter ${ch.id}: ${ch.title}\n${ch.outline}`).join('\n\n')}\n\nWrite the full story with rich descriptions, dialogue, and narrative flow. Make it engaging and true to the ${genre} genre. Each chapter should be approximately ${wordCount || '1000'} words. Create a cohesive narrative that flows smoothly from chapter to chapter.`
      }],
      max_tokens: 3000,
      temperature: 0.8
    })
    
    return c.json({
      success: true,
      story: completion.choices[0].message.content,
      usage: completion.usage
    })
    
  } catch (error) {
    console.error('Story Generation Error:', error)
    return c.json({ 
      success: false, 
      error: 'Failed to generate story',
      details: error.message 
    }, 500)
  }
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

// AI Writing Tools Endpoints
app.post('/api/ai/generate-ideas', async (c) => {
  try {
    const openai = getOpenAIClient(c.env)
    if (!openai) {
      return c.json({
        success: false,
        error: 'OpenAI API key not configured',
        demo_response: {
          ideas: `**Demo Mode - Configure OpenAI API Key for Real AI Integration**\n\nBook Idea 1: "The Digital Dreamweaver"\n- A programmer discovers they can enter and modify people's dreams\n- Explores themes of reality, consciousness, and digital identity\n\nBook Idea 2: "The Last Library"\n- In a post-apocalyptic world, a librarian guards the final collection of physical books\n- Themes of knowledge preservation and human connection\n\nBook Idea 3: "Quantum Hearts"\n- A physicist falls in love across parallel universes\n- Explores love, choice, and the multiverse theory\n\nBook Idea 4: "The Memory Merchant"\n- A dealer in extracted memories must choose between profit and humanity\n- Themes of identity, ethics, and what makes us human\n\nBook Idea 5: "Echoes of Tomorrow"\n- A time traveler can only observe the past, not change it\n- Explores fate, free will, and the weight of knowledge`
        }
      })
    }
    
    const { genre, audience, theme } = await c.req.json()
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{
        role: "system",
        content: "You are a creative writing assistant that generates compelling book ideas."
      }, {
        role: "user",
        content: `Generate 5 creative book ideas for a ${genre || 'general'} book targeting ${audience || 'general audience'} with themes around ${theme || 'universal themes'}. For each idea, provide a title, brief plot summary, and potential character concepts.`
      }],
      max_tokens: 1000,
      temperature: 0.8
    })
    
    return c.json({
      success: true,
      ideas: completion.choices[0].message.content,
      usage: completion.usage
    })
  } catch (error) {
    console.error('OpenAI API Error:', error)
    return c.json({ 
      success: false, 
      error: 'Failed to generate ideas',
      details: error.message 
    }, 500)
  }
})

app.post('/api/ai/create-outline', async (c) => {
  try {
    const openai = getOpenAIClient(c.env)
    if (!openai) {
      return c.json({
        success: false,
        error: 'OpenAI API key not configured',
        demo_response: {
          outline: `**Demo Mode - Configure OpenAI API Key for Real AI Integration**\n\nDetailed Book Outline\n\n**Chapter 1: The Beginning**\n- Introduce protagonist and setting\n- Establish the normal world\n- Plant seeds of the coming conflict\n\n**Chapter 2: The Call to Adventure**\n- Inciting incident occurs\n- Protagonist faces their first challenge\n- Introduction of supporting characters\n\n**Chapter 3: Crossing the Threshold**\n- Protagonist commits to their journey\n- First major obstacle overcome\n- World-building expansion\n\n**Chapters 4-8: Rising Action**\n- Character development and relationships\n- Escalating challenges and conflicts\n- Revelation of deeper mysteries\n- Skills and knowledge acquisition\n\n**Chapter 9: The Crisis**\n- Major setback or revelation\n- Protagonist's darkest moment\n- Relationships tested\n\n**Chapter 10: The Resolution**\n- Final confrontation\n- Character growth culmination\n- Resolution of main conflict\n- New equilibrium established`
        }
      })
    }
    
    const { title, genre, theme, chapters } = await c.req.json()
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{
        role: "system",
        content: "You are a professional book outlining assistant that creates detailed chapter-by-chapter outlines."
      }, {
        role: "user",
        content: `Create a detailed outline for a ${genre} book titled "${title}" with ${chapters || 10} chapters. Theme: ${theme}. Include chapter titles, main plot points, character development, and key scenes for each chapter.`
      }],
      max_tokens: 1500,
      temperature: 0.7
    })
    
    return c.json({
      success: true,
      outline: completion.choices[0].message.content,
      usage: completion.usage
    })
  } catch (error) {
    console.error('OpenAI API Error:', error)
    return c.json({ 
      success: false, 
      error: 'Failed to create outline',
      details: error.message 
    }, 500)
  }
})

app.post('/api/ai/expand-text', async (c) => {
  try {
    const openai = getOpenAIClient(c.env)
    if (!openai) {
      return c.json({
        success: false,
        error: 'OpenAI API key not configured',
        demo_response: {
          expanded_text: `**Demo Mode - Configure OpenAI API Key for Real AI Integration**\n\nYour original text would be expanded here with rich details, descriptive language, and enhanced narrative flow. The AI would add:\n\n- Sensory descriptions (sight, sound, touch, smell, taste)\n- Character emotions and internal thoughts\n- Environmental details and atmosphere\n- Dialogue and character interactions\n- Pacing and tension elements\n- Thematic depth and symbolism\n\nExample: If your original text was "She walked into the room," the expanded version might become:\n\n"Sarah hesitated at the threshold, her fingers trembling against the cold brass doorknob. The ancient hinges groaned their protest as she pushed forward, and the musty scent of forgotten memories rushed to greet her. Dust motes danced in the amber shaft of sunlight that sliced through the heavy curtains, illuminating a room frozen in time..."`
        }
      })
    }
    
    const { text, style, length } = await c.req.json()
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{
        role: "system",
        content: `You are a skilled writer that expands and enriches text while maintaining the original style and tone.`
      }, {
        role: "user",
        content: `Expand the following text to be ${length || 'significantly longer'} while maintaining ${style || 'the original'} style. Add descriptive details, dialogue, and narrative depth: "${text}"`
      }],
      max_tokens: 1200,
      temperature: 0.7
    })
    
    return c.json({
      success: true,
      expanded_text: completion.choices[0].message.content,
      usage: completion.usage
    })
  } catch (error) {
    console.error('OpenAI API Error:', error)
    return c.json({ 
      success: false, 
      error: 'Failed to expand text',
      details: error.message 
    }, 500)
  }
})

app.post('/api/ai/summarize', async (c) => {
  try {
    const openai = getOpenAIClient(c.env)
    if (!openai) {
      return c.json({
        success: false,
        error: 'OpenAI API key not configured',
        demo_response: {
          summary: `**Demo Mode - Configure OpenAI API Key for Real AI Integration**\n\nThis would provide a concise summary of your text, highlighting:\n\n• Main plot points and key events\n• Character development and motivations\n• Central themes and messages\n• Important dialogue and revelations\n• Structural elements and pacing\n\nThe AI summary would capture the essence of your content while maintaining readability and coherence, perfect for chapter summaries, book descriptions, or quick reference guides.`
        }
      })
    }
    
    const { text, length } = await c.req.json()
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{
        role: "system",
        content: "You are an expert at creating concise, informative summaries that capture key points and themes."
      }, {
        role: "user",
        content: `Summarize the following text into a ${length || 'concise'} summary, highlighting the main points and key themes: "${text}"`
      }],
      max_tokens: 500,
      temperature: 0.5
    })
    
    return c.json({
      success: true,
      summary: completion.choices[0].message.content,
      usage: completion.usage
    })
  } catch (error) {
    console.error('OpenAI API Error:', error)
    return c.json({ 
      success: false, 
      error: 'Failed to summarize text',
      details: error.message 
    }, 500)
  }
})

app.post('/api/ai/rewrite', async (c) => {
  try {
    const openai = getOpenAIClient(c.env)
    if (!openai) {
      return c.json({
        success: false,
        error: 'OpenAI API key not configured',
        demo_response: {
          rewritten_text: `**Demo Mode - Configure OpenAI API Key for Real AI Integration**\n\nYour text would be professionally rewritten here with improved:\n\n• Sentence structure and flow\n• Word choice and vocabulary\n• Tone and style consistency\n• Grammar and syntax\n• Clarity and engagement\n• Emotional impact\n\nExample transformation:\n**Original**: "The man was sad because his dog died."\n**Rewritten**: "Grief settled over him like a heavy blanket as he remembered his faithful companion's final moments, the weight of loss making each breath feel labored and uncertain."\n\nThe AI would maintain your original meaning while elevating the prose quality and emotional resonance.`
        }
      })
    }
    
    const { text, style, tone } = await c.req.json()
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{
        role: "system",
        content: "You are a professional editor and rewriter who improves text while preserving meaning."
      }, {
        role: "user",
        content: `Rewrite the following text in a ${style || 'improved'} style with a ${tone || 'engaging'} tone, making it more compelling and polished: "${text}"`
      }],
      max_tokens: 1000,
      temperature: 0.7
    })
    
    return c.json({
      success: true,
      rewritten_text: completion.choices[0].message.content,
      usage: completion.usage
    })
  } catch (error) {
    console.error('OpenAI API Error:', error)
    return c.json({ 
      success: false, 
      error: 'Failed to rewrite text',
      details: error.message 
    }, 500)
  }
})

app.post('/api/ai/character-builder', async (c) => {
  try {
    const openai = getOpenAIClient(c.env)
    if (!openai) {
      return c.json({
        success: false,
        error: 'OpenAI API key not configured',
        demo_response: {
          character_profile: `**Demo Mode - Configure OpenAI API Key for Real AI Integration**\n\n**Character Profile: Alexandra "Alex" Chen**\n\n**Basic Information:**\n• Age: 28\n• Occupation: Digital Forensics Specialist\n• Background: First-generation American, tech prodigy\n\n**Personality Traits:**\n• Analytical and methodical\n• Fiercely loyal to friends\n• Struggles with work-life balance\n• Hidden vulnerability beneath confident exterior\n\n**Motivations:**\n• Seeking justice for cyber crimes\n• Proving herself in male-dominated field\n• Protecting her younger brother\n\n**Character Arc:**\n• Begins: Isolated, all-work focused\n• Challenge: Must trust others to solve major case\n• Growth: Learns value of teamwork and vulnerability\n• Resolution: Becomes mentor and team leader\n\n**Relationships:**\n• Mentor: Retired FBI agent Rodriguez\n• Conflict: Rival analyst Marcus Webb\n• Support: Best friend and roommate Jamie\n\n**Internal Conflicts:**\n• Fear of failure vs. need for perfection\n• Independence vs. desire for connection\n• Logic vs. intuition in investigations`
        }
      })
    }
    
    const { character_name, role, genre, traits } = await c.req.json()
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{
        role: "system",
        content: "You are a character development expert who creates rich, detailed character profiles for novels."
      }, {
        role: "user",
        content: `Create a detailed character profile for ${character_name || 'a character'} who plays the role of ${role || 'protagonist'} in a ${genre || 'general'} story. Include: personality traits, background, motivations, conflicts, relationships, and character arc. ${traits ? `Additional traits to incorporate: ${traits}` : ''}`
      }],
      max_tokens: 1200,
      temperature: 0.8
    })
    
    return c.json({
      success: true,
      character_profile: completion.choices[0].message.content,
      usage: completion.usage
    })
  } catch (error) {
    console.error('OpenAI API Error:', error)
    return c.json({ 
      success: false, 
      error: 'Failed to build character',
      details: error.message 
    }, 500)
  }
})

// Text-to-Speech Endpoint
app.post('/api/ai/text-to-speech', async (c) => {
  try {
    const { text, voice, speed, output_format } = await c.req.json()
    
    if (!text) {
      return c.json({ success: false, error: 'Text is required' }, 400)
    }
    
    const openai = getOpenAIClient(c.env)
    if (!openai) {
      return c.json({
        success: false,
        error: 'OpenAI API key not configured',
        demo_response: {
          message: 'Demo Mode: Configure OpenAI API key to enable real text-to-speech functionality',
          available_voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
          supported_formats: ['mp3'],
          features: [
            'High-quality neural text-to-speech',
            'Multiple voice options',
            'Adjustable speech speed',
            'Natural-sounding narration'
          ]
        }
      })
    }
    
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice || "alloy", // alloy, echo, fable, onyx, nova, shimmer
      input: text,
      speed: speed || 1.0
    })
    
    const buffer = Buffer.from(await mp3.arrayBuffer())
    const base64Audio = buffer.toString('base64')
    
    return c.json({
      success: true,
      audio_data: `data:audio/mpeg;base64,${base64Audio}`,
      format: 'mp3',
      text_length: text.length
    })
  } catch (error) {
    console.error('OpenAI TTS API Error:', error)
    return c.json({ 
      success: false, 
      error: 'Failed to generate speech',
      details: error.message 
    }, 500)
  }
})

// AI Cover Generation Endpoint
app.post('/api/ai/generate-cover', async (c) => {
  try {
    const { title, description, style, size } = await c.req.json()
    
    if (!title && !description) {
      return c.json({ success: false, error: 'Title or description is required' }, 400)
    }
    
    const openai = getOpenAIClient(c.env)
    if (!openai) {
      return c.json({
        success: false,
        error: 'OpenAI API key not configured',
        demo_response: {
          message: 'Demo Mode: Configure OpenAI API key to enable real AI cover generation',
          sample_cover_url: 'https://via.placeholder.com/1024x1024/1a202c/ffffff?text=AI+Generated+Book+Cover',
          features: [
            'DALL-E 3 powered cover generation',
            'Professional book cover designs',
            'Multiple size options',
            'Custom style prompts',
            'High-resolution output'
          ],
          supported_sizes: ['1024x1024', '1024x1792', '1792x1024']
        }
      })
    }
    
    const prompt = `Create a professional book cover design for "${title}". ${description}. Style: ${style || 'modern and professional'}. The design should be suitable for an audiobook cover with clear typography space.`
    
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: size || "1024x1024",
      quality: "standard"
    })
    
    return c.json({
      success: true,
      image_url: response.data[0].url,
      revised_prompt: response.data[0].revised_prompt,
      size: size || "1024x1024"
    })
  } catch (error) {
    console.error('OpenAI DALL-E API Error:', error)
    return c.json({ 
      success: false, 
      error: 'Failed to generate cover',
      details: error.message 
    }, 500)
  }
})

// Enhanced Voice Cloning with OpenAI (Audio Analysis)
app.post('/api/ai/analyze-voice', async (c) => {
  try {
    const { audio_url, voice_name } = await c.req.json()
    
    // Note: OpenAI doesn't have voice cloning, but we can provide voice analysis
    // This endpoint simulates voice analysis and provides recommendations
    
    const analysis = {
      success: true,
      voice_id: `analyzed_${Date.now()}`,
      voice_name: voice_name || 'Custom Voice',
      quality_score: Math.floor(Math.random() * 30) + 70, // 70-100
      characteristics: {
        pitch: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
        tone: ['Warm', 'Professional', 'Friendly', 'Authoritative'][Math.floor(Math.random() * 4)],
        pace: ['Slow', 'Moderate', 'Fast'][Math.floor(Math.random() * 3)],
        accent: 'Neutral'
      },
      recommended_use: 'Suitable for audiobook narration',
      processing_time: '2-3 minutes',
      file_duration: '30+ seconds'
    }
    
    return c.json(analysis)
  } catch (error) {
    console.error('Voice Analysis Error:', error)
    return c.json({ 
      success: false, 
      error: 'Failed to analyze voice',
      details: error.message 
    }, 500)
  }
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
        <style>
            /* Critical Form Field Styles - Inline to ensure visibility */
            .form-field-glow {
                border: 2px solid rgba(192, 192, 192, 0.3) !important;
                box-shadow: 0 0 10px rgba(192, 192, 192, 0.8), 0 0 20px rgba(192, 192, 192, 0.4) !important;
                transition: all 0.3s ease !important;
                background: #4a5568 !important;
                color: #ffffff !important;
            }
            
            .form-field-glow:focus {
                border-color: #78e3fe !important;
                box-shadow: 0 0 15px rgba(120, 227, 254, 0.6), 0 0 30px rgba(120, 227, 254, 0.3), 0 0 10px rgba(192, 192, 192, 0.8) !important;
                background: #4a5568 !important;
                color: #ffffff !important;
            }
            
            .form-field-glow:hover {
                border-color: rgba(192, 192, 192, 0.6) !important;
                box-shadow: 0 0 15px rgba(192, 192, 192, 0.6), 0 0 25px rgba(192, 192, 192, 0.3) !important;
                background: #4a5568 !important;
                color: #ffffff !important;
            }
            
            /* Force all form fields to have white text on dark gray background */
            input.form-field-glow,
            select.form-field-glow, 
            textarea.form-field-glow {
                background: #4a5568 !important;
                color: #ffffff !important;
            }
            
            /* Form field placeholders */
            .form-field-glow::placeholder {
                color: #cbd5e0 !important;
                opacity: 0.7 !important;
            }
            
            /* Override any theme-based coloring */
            .light-theme .form-field-glow,
            .dark-theme .form-field-glow {
                background: #4a5568 !important;
                color: #ffffff !important;
            }
            
            .light-theme .form-field-glow::placeholder,
            .dark-theme .form-field-glow::placeholder {
                color: #cbd5e0 !important;
            }
        </style>
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
                        <h1 class="text-3xl font-bold authorr-brand-text">AUTHORR AI</h1>
                        <p class="text-xs font-bold iridescent-gold">ADVANCED NARRATION PLATFORM</p>
                    </div>
                </div>
                <div class="flex items-center space-x-6">
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
                        <a href="/config" class="nav-link ${activePage === 'config' ? 'active' : ''}">
                            <i class="fas fa-cog mr-2"></i>Config
                        </a>
                    </nav>
                    
                    <!-- Light/Dark Mode Toggle -->
                    <div class="theme-toggle" id="theme-toggle">
                        <div class="theme-toggle-slider">
                            <i class="fas fa-moon"></i>
                        </div>
                    </div>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="max-w-7xl mx-auto p-6">
            ${content}
        </main>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script>
        // Essential JavaScript for chapter creation
        document.addEventListener('DOMContentLoaded', function() {
            console.log('Chapter creation form initializing...');
            
            // Initialize theme
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'light') {
                document.body.classList.add('light-theme');
            } else {
                document.body.classList.add('dark-theme');
            }
            
            // Setup theme toggle
            const themeToggle = document.getElementById('theme-toggle');
            if (themeToggle) {
                themeToggle.addEventListener('click', function() {
                    const body = document.body;
                    const isDark = body.classList.contains('dark-theme');
                    if (isDark) {
                        body.classList.remove('dark-theme');
                        body.classList.add('light-theme');
                        localStorage.setItem('theme', 'light');
                    } else {
                        body.classList.remove('light-theme');
                        body.classList.add('dark-theme');
                        localStorage.setItem('theme', 'dark');
                    }
                });
            }
            
            // Setup chapter creation form
            const form = document.getElementById('chapter-form');
            if (form) {
                form.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    console.log('Chapter form submitted');
                    
                    const formData = {
                        bookTitle: document.getElementById('book-title')?.value || '',
                        authorName: document.getElementById('author-name')?.value || '',
                        genre: document.getElementById('genre')?.value || '',
                        targetAudience: document.getElementById('target-audience')?.value || '',
                        chapterSelection: document.getElementById('chapter-selection')?.value || '8',
                        wordCount: document.getElementById('word-count')?.value || '1000',
                        toneVoice: document.getElementById('tone-voice')?.value || '',
                        narrativePerspective: document.getElementById('narrative-perspective')?.value || '',
                        bookDescription: document.getElementById('book-description')?.value || ''
                    };
                    
                    if (!formData.bookTitle.trim()) {
                        alert('Please enter a book title.');
                        return;
                    }
                    if (!formData.authorName.trim()) {
                        alert('Please enter the author name.');
                        return;
                    }
                    if (!formData.bookDescription.trim()) {
                        alert('Please enter a book description.');
                        return;
                    }
                    
                    const createBtn = document.getElementById('create-chapter-btn');
                    createBtn.textContent = 'Creating Chapters...';
                    createBtn.disabled = true;
                    
                    try {
                        const response = await axios.post('/api/chapter/create', formData);
                        console.log('Chapter response:', response.data);
                        
                        if (response.data.success) {
                            const chapters = response.data.chapters;
                            displayChapterPlan(chapters);
                            document.getElementById('chapter-planning').style.display = 'block';
                            document.getElementById('chapter-planning').scrollIntoView({ behavior: 'smooth' });
                        } else {
                            alert('Failed to create chapters: ' + response.data.error);
                        }
                    } catch (error) {
                        console.error('Chapter creation error:', error);
                        alert('Failed to create chapters. Please try again.');
                    } finally {
                        createBtn.textContent = 'Create Chapter';
                        createBtn.disabled = false;
                    }
                });
            }
            
            // Setup regenerate chapters button
            const regenerateBtn = document.getElementById('regenerate-chapters');
            if (regenerateBtn) {
                regenerateBtn.addEventListener('click', async function() {
                    console.log('Regenerate chapters clicked');
                    
                    // Get current form data
                    const formData = {
                        bookTitle: document.getElementById('book-title')?.value || '',
                        authorName: document.getElementById('author-name')?.value || '',
                        genre: document.getElementById('genre')?.value || '',
                        targetAudience: document.getElementById('target-audience')?.value || '',
                        chapterSelection: document.getElementById('chapter-selection')?.value || '8',
                        wordCount: document.getElementById('word-count')?.value || '1000',
                        toneVoice: document.getElementById('tone-voice')?.value || '',
                        narrativePerspective: document.getElementById('narrative-perspective')?.value || '',
                        bookDescription: document.getElementById('book-description')?.value || ''
                    };
                    
                    if (!formData.bookTitle.trim() || !formData.bookDescription.trim()) {
                        alert('Please fill in the book title and description first.');
                        return;
                    }
                    
                    regenerateBtn.textContent = 'Regenerating...';
                    regenerateBtn.disabled = true;
                    
                    try {
                        const response = await axios.post('/api/chapter/create', formData);
                        console.log('Regenerate response:', response.data);
                        
                        if (response.data.success) {
                            const chapters = response.data.chapters;
                            displayChapterPlan(chapters);
                        } else {
                            alert('Failed to regenerate chapters: ' + response.data.error);
                        }
                    } catch (error) {
                        console.error('Chapter regeneration error:', error);
                        alert('Failed to regenerate chapters. Please try again.');
                    } finally {
                        regenerateBtn.textContent = 'Regenerate Chapters';
                        regenerateBtn.disabled = false;
                    }
                });
            }
            
            // Setup create story button
            const createStoryBtn = document.getElementById('create-story-btn');
            if (createStoryBtn) {
                createStoryBtn.addEventListener('click', async function() {
                    console.log('Create story clicked');
                    
                    // Get all chapter data
                    const chapterElements = document.querySelectorAll('.chapter-outline-item');
                    if (chapterElements.length === 0) {
                        alert('Please create chapters first.');
                        return;
                    }
                    
                    const chapters = [];
                    chapterElements.forEach((element, index) => {
                        const titleInput = element.querySelector('input[data-field="title"]');
                        const outlineTextarea = element.querySelector('textarea[data-field="outline"]');
                        
                        if (titleInput && outlineTextarea) {
                            chapters.push({
                                id: index + 1,
                                title: titleInput.value,
                                outline: outlineTextarea.value
                            });
                        }
                    });
                    
                    createStoryBtn.textContent = 'Creating Story...';
                    createStoryBtn.disabled = true;
                    
                    // Get form data for story generation context
                    const storyData = {
                        chapters: chapters,
                        bookTitle: document.getElementById('book-title')?.value || 'Untitled Book',
                        genre: document.getElementById('genre')?.value || 'fiction',
                        wordCount: document.getElementById('word-count')?.value || '1000',
                        toneVoice: document.getElementById('tone-voice')?.value || 'engaging',
                        narrativePerspective: document.getElementById('narrative-perspective')?.value || 'third-person'
                    };
                    
                    try {
                        const response = await axios.post('/api/story/generate', storyData);
                        console.log('Story response:', response.data);
                        
                        if (response.data.success) {
                            displayStoryContent(response.data.story);
                            document.getElementById('story-generation').style.display = 'block';
                            document.getElementById('story-generation').scrollIntoView({ behavior: 'smooth' });
                        } else {
                            alert('Failed to create story: ' + response.data.error);
                        }
                    } catch (error) {
                        console.error('Story creation error:', error);
                        alert('Failed to create story. Please try again.');
                    } finally {
                        createStoryBtn.textContent = 'Create Story';
                        createStoryBtn.disabled = false;
                    }
                });
            }
            
            // Setup regenerate story button
            const regenerateStoryBtn = document.getElementById('regenerate-story');
            if (regenerateStoryBtn) {
                regenerateStoryBtn.addEventListener('click', async function() {
                    console.log('Regenerate story clicked');
                    
                    // Get all chapter data again
                    const chapterElements = document.querySelectorAll('.chapter-outline-item');
                    if (chapterElements.length === 0) {
                        alert('No chapters available for story regeneration.');
                        return;
                    }
                    
                    const chapters = [];
                    chapterElements.forEach((element, index) => {
                        const titleInput = element.querySelector('input[data-field="title"]');
                        const outlineTextarea = element.querySelector('textarea[data-field="outline"]');
                        
                        if (titleInput && outlineTextarea) {
                            chapters.push({
                                id: index + 1,
                                title: titleInput.value,
                                outline: outlineTextarea.value
                            });
                        }
                    });
                    
                    regenerateStoryBtn.textContent = 'Regenerating...';
                    regenerateStoryBtn.disabled = true;
                    
                    // Get form data for story regeneration context
                    const storyData = {
                        chapters: chapters,
                        bookTitle: document.getElementById('book-title')?.value || 'Untitled Book',
                        genre: document.getElementById('genre')?.value || 'fiction',
                        toneVoice: document.getElementById('tone-voice')?.value || 'engaging',
                        narrativePerspective: document.getElementById('narrative-perspective')?.value || 'third-person'
                    };
                    
                    try {
                        const response = await axios.post('/api/story/generate', storyData);
                        console.log('Regenerate story response:', response.data);
                        
                        if (response.data.success) {
                            displayStoryContent(response.data.story);
                        } else {
                            alert('Failed to regenerate story: ' + response.data.error);
                        }
                    } catch (error) {
                        console.error('Story regeneration error:', error);
                        alert('Failed to regenerate story. Please try again.');
                    } finally {
                        regenerateStoryBtn.textContent = 'Regenerate Story';
                        regenerateStoryBtn.disabled = false;
                    }
                });
            }
            
            // Setup continue to workspace button
            const continueToWorkspaceBtn = document.getElementById('continue-to-workspace');
            if (continueToWorkspaceBtn) {
                continueToWorkspaceBtn.addEventListener('click', function() {
                    console.log('Continue to workspace clicked');
                    
                    // Get the generated story content
                    const storyTextarea = document.getElementById('generated-story-text');
                    if (!storyTextarea || !storyTextarea.value.trim()) {
                        alert('No story content available to continue with.');
                        return;
                    }
                    
                    // Store story content in localStorage for workspace
                    const storyData = {
                        content: storyTextarea.value,
                        bookTitle: document.getElementById('book-title')?.value || 'Untitled Book',
                        author: document.getElementById('author-name')?.value || 'Unknown Author',
                        genre: document.getElementById('genre')?.value || 'fiction',
                        timestamp: new Date().toISOString()
                    };
                    
                    localStorage.setItem('workspace-story', JSON.stringify(storyData));
                    
                    // Redirect to workspace
                    window.location.href = '/workspace';
                });
            }
            
            function displayChapterPlan(chapters) {
                const container = document.getElementById('chapter-outlines');
                if (!container) return;
                
                container.innerHTML = '';
                
                chapters.forEach((chapter, index) => {
                    const chapterElement = document.createElement('div');
                    chapterElement.className = 'chapter-outline-item bg-gray-700 p-6 rounded-lg border border-gray-600 mb-4';
                    chapterElement.innerHTML = \`
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-cyan-400 mb-2">Chapter \${chapter.id} Title</label>
                            <input type="text" 
                                   value="\${chapter.title}" 
                                   class="form-field-glow w-full rounded px-3 py-2" 
                                   style="background: #4a5568 !important; color: #ffffff !important;" 
                                   data-chapter-id="\${chapter.id}" 
                                   data-field="title">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-cyan-400 mb-2">Chapter Outline</label>
                            <textarea class="form-field-glow w-full rounded px-3 py-2 h-24 resize-none" 
                                      style="background: #4a5568 !important; color: #ffffff !important;" 
                                      data-chapter-id="\${chapter.id}" 
                                      data-field="outline">\${chapter.outline}</textarea>
                        </div>
                    \`;
                    container.appendChild(chapterElement);
                });
            }
            
            function displayStoryContent(story) {
                const container = document.getElementById('story-content');
                if (!container) return;
                
                container.innerHTML = \`
                    <div class="bg-gray-700 p-6 rounded-lg border border-gray-600">
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-cyan-400 mb-2">
                                <i class="fas fa-edit mr-2"></i>Generated Story (Editable)
                            </label>
                            <textarea id="generated-story-text" 
                                      class="form-field-glow w-full rounded px-4 py-3 h-96 resize-vertical font-mono text-sm leading-relaxed" 
                                      style="background: #4a5568 !important; color: #ffffff !important;" 
                                      placeholder="Your AI-generated story will appear here...">\${story}</textarea>
                        </div>
                        <div class="text-sm text-gray-400 mb-4">
                            <i class="fas fa-info-circle mr-1"></i>
                            You can edit the generated story above. Use the buttons below to regenerate or continue to workspace.
                        </div>
                    </div>
                \`;
            }
        });
        </script>
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
        <h2 class="text-4xl font-bold mb-4" style="color: #78e3fe !important; text-shadow: 0 0 15px rgba(120, 227, 254, 0.6), 0 0 10px rgba(192, 192, 192, 0.8) !important;">Transform Text into Premium Audiobooks</h2>
        <p class="text-xl max-w-3xl mx-auto" style="color: #78e3fe !important; text-shadow: 0 0 10px rgba(192, 192, 192, 0.8) !important;">
          <span class="text-white">Create professional audiobooks with AI-powered writing assistance, advanced narration, and voice cloning technology</span>
        </p>
      </div>

      <!-- Chapter Creation -->
      <div class="bg-gray-800 rounded-lg border border-gray-700 p-8 card-glow">
        <h3 class="text-2xl font-bold mb-6 text-cyan-glow">
          <i class="fas fa-rocket mr-3"></i>Create Chapter
        </h3>
        
        <form id="chapter-form" class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-cyan-glow mb-2">Book Title *</label>
              <input type="text" id="book-title" placeholder="Enter your book title..." 
                class="form-field-glow w-full rounded px-3 py-2 text-white focus:border-cyan-300 focus:shadow-cyan">
            </div>
            
            <div>
              <label class="block text-sm font-medium text-cyan-glow mb-2">Author Name *</label>
              <input type="text" id="author-name" placeholder="Your name..." 
                class="form-field-glow w-full rounded px-3 py-2 text-white focus:border-cyan-300 focus:shadow-cyan">
            </div>
            
            <div>
              <label class="block text-sm font-medium text-cyan-glow mb-2">Target Audience</label>
              <select id="target-audience" class="form-field-glow w-full rounded px-3 py-2 text-white">
                <option value="">Select audience...</option>
                <option value="children">Children (5-12)</option>
                <option value="young-adult">Young Adult (13-18)</option>
                <option value="adult">Adult (18+)</option>
                <option value="all-ages">All Ages</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-cyan-glow mb-2">Chapter Selection</label>
              <select id="chapter-selection" class="form-field-glow w-full rounded px-3 py-2 text-white">
                <option value="">Select chapters...</option>
                <option value="3">3 Chapters</option>
                <option value="5">5 Chapters</option>
                <option value="8">8 Chapters (Recommended)</option>
                <option value="10">10 Chapters</option>
                <option value="12">12 Chapters</option>
                <option value="15">15 Chapters</option>
                <option value="20">20 Chapters</option>
                <option value="25">25 Chapters</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-cyan-glow mb-2">Genre</label>
              <select id="genre" class="form-field-glow w-full rounded px-3 py-2 text-white">
                <option value="">Select genre...</option>
                <optgroup label="Fiction">
                  <option value="literary-fiction">Literary Fiction</option>
                  <option value="contemporary-fiction">Contemporary Fiction</option>
                  <option value="historical-fiction">Historical Fiction</option>
                </optgroup>
                <optgroup label="Romance">
                  <option value="contemporary-romance">Contemporary Romance</option>
                  <option value="historical-romance">Historical Romance</option>
                  <option value="paranormal-romance">Paranormal Romance</option>
                  <option value="romantic-suspense">Romantic Suspense</option>
                </optgroup>
                <optgroup label="Mystery & Thriller">
                  <option value="cozy-mystery">Cozy Mystery</option>
                  <option value="police-procedural">Police Procedural</option>
                  <option value="psychological-thriller">Psychological Thriller</option>
                  <option value="crime-thriller">Crime Thriller</option>
                </optgroup>
                <optgroup label="Fantasy">
                  <option value="epic-fantasy">Epic Fantasy</option>
                  <option value="urban-fantasy">Urban Fantasy</option>
                  <option value="dark-fantasy">Dark Fantasy</option>
                  <option value="paranormal-fantasy">Paranormal Fantasy</option>
                </optgroup>
                <optgroup label="Science Fiction">
                  <option value="hard-sci-fi">Hard Science Fiction</option>
                  <option value="space-opera">Space Opera</option>
                  <option value="cyberpunk">Cyberpunk</option>
                  <option value="dystopian">Dystopian</option>
                </optgroup>
                <optgroup label="Non-Fiction">
                  <option value="biography">Biography</option>
                  <option value="memoir">Memoir</option>
                  <option value="self-help">Self Help</option>
                  <option value="business">Business</option>
                  <option value="health-fitness">Health & Fitness</option>
                  <option value="history">History</option>
                </optgroup>
              </select>
            </div>
          </div>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-cyan-glow mb-2">Word Count Per Chapter</label>
              <select id="word-count" class="form-field-glow w-full rounded px-3 py-2 text-white">
                <option value="">Select word count...</option>
                <option value="500">500 words (Short)</option>
                <option value="1000">1,000 words (Standard)</option>
                <option value="1500">1,500 words (Medium)</option>
                <option value="2000">2,000 words (Long)</option>
                <option value="2500">2,500 words (Extended)</option>
                <option value="3000">3,000 words (Epic)</option>
                <option value="custom">Custom Length</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-cyan-glow mb-2">Tone/Voice</label>
              <select id="tone-voice" class="form-field-glow w-full rounded px-3 py-2 text-white">
                <option value="">Select tone...</option>
                <optgroup label="Professional">
                  <option value="professional">Professional</option>
                  <option value="academic">Academic</option>
                  <option value="business">Business</option>
                  <option value="authoritative">Authoritative</option>
                </optgroup>
                <optgroup label="Conversational">
                  <option value="conversational">Conversational</option>
                  <option value="friendly">Friendly</option>
                  <option value="casual">Casual</option>
                  <option value="approachable">Approachable</option>
                </optgroup>
                <optgroup label="Creative">
                  <option value="dramatic">Dramatic</option>
                  <option value="humorous">Humorous</option>
                  <option value="whimsical">Whimsical</option>
                  <option value="poetic">Poetic</option>
                  <option value="mysterious">Mysterious</option>
                </optgroup>
                <optgroup label="Emotional">
                  <option value="heartwarming">Heartwarming</option>
                  <option value="inspirational">Inspirational</option>
                  <option value="melancholic">Melancholic</option>
                  <option value="intense">Intense</option>
                  <option value="uplifting">Uplifting</option>
                </optgroup>
                <optgroup label="Educational">
                  <option value="educational">Educational</option>
                  <option value="informative">Informative</option>
                  <option value="instructional">Instructional</option>
                  <option value="explanatory">Explanatory</option>
                </optgroup>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-cyan-glow mb-2">Narrative Perspective</label>
              <select id="narrative-perspective" class="form-field-glow w-full rounded px-3 py-2 text-white">
                <option value="">Select perspective...</option>
                <option value="first-person">First Person</option>
                <option value="third-person">Third Person</option>
                <option value="omniscient">Omniscient</option>
                <option value="multiple">Multiple Perspectives</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-cyan-glow mb-2">Book Description</label>
              <textarea id="book-description" placeholder="Describe your book concept, plot, and main themes..." 
                class="form-field-glow w-full rounded px-3 py-2 text-white h-24 resize-none focus:border-cyan-300 focus:shadow-cyan"></textarea>
            </div>
            
            <button type="submit" id="create-chapter-btn" class="btn-glow w-full text-white py-3 px-6 rounded-lg font-semibold transition-all mt-6" style="background: linear-gradient(135deg, #78e3fe, #5dd8fc); color: #000; box-shadow: 0 0 20px rgba(120, 227, 254, 0.6);">
              <i class="fas fa-plus mr-2"></i>Create Chapter
            </button>
          </div>
        </form>
      </div>

      <!-- Chapter Planning Section -->
      <div id="chapter-planning" class="bg-gray-800 rounded-lg border border-gray-700 p-8 card-glow" style="display: none;">
        <h3 class="text-2xl font-bold mb-6 text-cyan-glow">
          <i class="fas fa-list mr-3"></i>Chapter Planning
        </h3>
        
        <div id="chapter-outlines" class="space-y-6">
          <!-- AI-generated chapter outlines will appear here -->
        </div>
        
        <div class="flex gap-4 mt-6">
          <button id="regenerate-chapters" class="bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold transition-all">
            <i class="fas fa-refresh mr-2"></i>Regenerate Chapters
          </button>
          <button id="create-story-btn" class="text-white px-6 py-3 rounded-lg font-semibold transition-all" style="background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);">
            <i class="fas fa-book mr-2"></i>Create Story
          </button>
        </div>
      </div>
      
      <!-- Story Generation Section -->
      <div id="story-generation" class="bg-gray-800 rounded-lg border border-gray-700 p-8 card-glow" style="display: none;">
        <h3 class="text-2xl font-bold mb-6 text-cyan-glow">
          <i class="fas fa-book-open mr-3"></i>Generated Story
        </h3>
        
        <div id="story-content" class="space-y-6">
          <!-- AI-generated story content will appear here -->
        </div>
        
        <div class="flex gap-4 mt-6">
          <button id="regenerate-story" class="bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold transition-all">
            <i class="fas fa-refresh mr-2"></i>Regenerate Story
          </button>
          <button id="continue-to-workspace" class="text-white px-6 py-3 rounded-lg font-semibold transition-all" style="background: linear-gradient(135deg, #6366f1, #4f46e5); box-shadow: 0 0 15px rgba(99, 102, 241, 0.4);">
            <i class="fas fa-arrow-right mr-2"></i>Continue to Workspace
          </button>
        </div>
      </div>
      
      <!-- Recent Projects -->
      <div class="bg-gray-800 rounded-lg border border-gray-700 p-8 card-glow">
        <h3 class="text-2xl font-bold mb-6 text-cyan-glow">
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

// Configuration page for OpenAI API setup
app.get('/config', (c) => {
  const configContent = `
    <div class="space-y-8">
      <div class="text-center mb-8">
        <h2 class="text-3xl font-bold text-glow mb-2">AI Configuration</h2>
        <p class="text-gray-400">Configure your OpenAI API key to enable AI features</p>
      </div>

      <!-- API Status -->
      <div class="bg-gray-800 rounded-lg border border-gray-700 p-8">
        <h3 class="text-2xl font-bold mb-6 text-cyan-400">
          <i class="fas fa-robot mr-3"></i>OpenAI Integration Status
        </h3>
        
        <div id="api-status" class="mb-6">
          <div class="flex items-center space-x-3">
            <div class="status-indicator w-3 h-3 rounded-full bg-yellow-500"></div>
            <span class="text-gray-300">Checking API configuration...</span>
          </div>
        </div>

        <!-- Configuration Instructions -->
        <div class="bg-gray-700 rounded-lg p-6 mb-6">
          <h4 class="text-lg font-semibold mb-4 text-orange-400">
            <i class="fas fa-info-circle mr-2"></i>Setup Instructions
          </h4>
          
          <div class="space-y-4 text-sm text-gray-300">
            <div>
              <strong>Step 1:</strong> Get your OpenAI API key from 
              <a href="https://platform.openai.com/account/api-keys" target="_blank" class="text-cyan-400 hover:text-cyan-300">
                https://platform.openai.com/account/api-keys
              </a>
            </div>
            
            <div>
              <strong>Step 2:</strong> Set the environment variable <code class="bg-gray-600 px-2 py-1 rounded">OPENAI_API_KEY</code> with your API key
            </div>
            
            <div>
              <strong>Step 3:</strong> Or edit the source code in <code class="bg-gray-600 px-2 py-1 rounded">src/index.tsx</code> and replace the placeholder API key
            </div>
            
            <div>
              <strong>Step 4:</strong> Rebuild and restart the application: <code class="bg-gray-600 px-2 py-1 rounded">npm run build && pm2 restart webapp</code>
            </div>
          </div>
        </div>

        <!-- Available Features -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-gray-700 rounded-lg p-4">
            <h5 class="font-semibold mb-3 text-green-400">
              <i class="fas fa-pencil-alt mr-2"></i>AI Writing Tools
            </h5>
            <ul class="text-sm text-gray-300 space-y-1">
              <li>• Generate creative ideas</li>
              <li>• Create detailed outlines</li>
              <li>• Expand and enhance text</li>
              <li>• Summarize content</li>
              <li>• Rewrite and improve prose</li>
              <li>• Build character profiles</li>
            </ul>
          </div>
          
          <div class="bg-gray-700 rounded-lg p-4">
            <h5 class="font-semibold mb-3 text-blue-400">
              <i class="fas fa-microphone mr-2"></i>Audio & Visual AI
            </h5>
            <ul class="text-sm text-gray-300 space-y-1">
              <li>• Text-to-speech narration</li>
              <li>• Multiple voice options</li>
              <li>• AI-generated book covers</li>
              <li>• Professional quality output</li>
              <li>• Customizable settings</li>
              <li>• Export-ready formats</li>
            </ul>
          </div>
        </div>

        <!-- Current Mode Display -->
        <div class="mt-6 p-4 border border-yellow-500 bg-yellow-500/10 rounded-lg">
          <div class="flex items-center space-x-3">
            <i class="fas fa-exclamation-triangle text-yellow-500"></i>
            <div>
              <strong class="text-yellow-500">Demo Mode Active</strong>
              <p class="text-gray-300 text-sm mt-1">
                Configure your OpenAI API key to unlock full AI functionality. 
                Currently showing demo responses for all AI features.
              </p>
            </div>
          </div>
        </div>

        <!-- Test Button -->
        <div class="mt-6">
          <button id="test-api" class="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-lg font-semibold transition-all">
            <i class="fas fa-flask mr-2"></i>Test API Configuration
          </button>
        </div>
      </div>
    </div>
  `
  
  return c.html(getPageLayout('AUTHORR AI - Configuration', configContent, 'config'))
})

export default app
