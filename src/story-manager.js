// Story Manager - Integrates Supabase with the Interactive Fiction Engine
import { supabase, db, auth } from './supabase.js'

export class StoryManager {
  constructor() {
    this.currentUser = null
    this.currentStory = null
    this.currentProgress = null
    this.isOnline = navigator.onLine
    
    // Listen for online/offline changes
    window.addEventListener('online', () => {
      this.isOnline = true
      this.syncOfflineData()
    })
    
    window.addEventListener('offline', () => {
      this.isOnline = false
    })
    
    // Listen for auth changes
    auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        this.currentUser = session.user
        this.loadUserPreferences()
      } else if (event === 'SIGNED_OUT') {
        this.currentUser = null
        this.currentStory = null
        this.currentProgress = null
      }
    })
  }

  // Authentication Methods
  async signUp(email, password, displayName) {
    try {
      const { data, error } = await auth.signUp(email, password, {
        display_name: displayName
      })
      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Sign up error:', error)
      return { success: false, error: error.message }
    }
  }

  async signIn(email, password) {
    try {
      const { data, error } = await auth.signIn(email, password)
      if (error) throw error
      
      // Load user preferences after successful login
      await this.loadUserPreferences()
      
      return { success: true, data }
    } catch (error) {
      console.error('Sign in error:', error)
      return { success: false, error: error.message }
    }
  }

  async signOut() {
    try {
      const { error } = await auth.signOut()
      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Sign out error:', error)
      return { success: false, error: error.message }
    }
  }

  // Story Loading Methods
  async loadStories() {
    try {
      const { data: stories, error } = await db.getStories()
      if (error) throw error
      
      // Cache stories for offline use
      if (this.isOnline) {
        localStorage.setItem('cached_stories', JSON.stringify(stories))
      }
      
      return { success: true, stories }
    } catch (error) {
      console.error('Load stories error:', error)
      
      // Try to load from cache if offline
      if (!this.isOnline) {
        const cached = localStorage.getItem('cached_stories')
        if (cached) {
          return { success: true, stories: JSON.parse(cached) }
        }
      }
      
      return { success: false, error: error.message }
    }
  }

  async loadStory(storyId) {
    try {
      const { data: story, error } = await db.getStory(storyId)
      if (error) throw error
      
      this.currentStory = story
      
      // Load user progress if logged in
      if (this.currentUser) {
        await this.loadProgress(storyId)
      }
      
      // Cache story for offline use
      if (this.isOnline) {
        localStorage.setItem(`cached_story_${storyId}`, JSON.stringify(story))
      }
      
      return { success: true, story }
    } catch (error) {
      console.error('Load story error:', error)
      
      // Try to load from cache if offline
      if (!this.isOnline) {
        const cached = localStorage.getItem(`cached_story_${storyId}`)
        if (cached) {
          this.currentStory = JSON.parse(cached)
          return { success: true, story: this.currentStory }
        }
      }
      
      return { success: false, error: error.message }
    }
  }

  // Progress Management
  async saveProgress(storyId, progressData) {
    if (!this.currentUser) {
      // Save to localStorage for anonymous users
      localStorage.setItem(`progress_${storyId}`, JSON.stringify(progressData))
      return { success: true }
    }

    try {
      const { data, error } = await db.saveProgress(
        this.currentUser.id,
        storyId,
        progressData
      )
      if (error) throw error
      
      this.currentProgress = progressData
      
      // Also save to localStorage as backup
      localStorage.setItem(`progress_${storyId}_${this.currentUser.id}`, JSON.stringify(progressData))
      
      return { success: true, data }
    } catch (error) {
      console.error('Save progress error:', error)
      
      // Save to localStorage as fallback
      localStorage.setItem(`offline_progress_${storyId}`, JSON.stringify({
        ...progressData,
        userId: this.currentUser.id,
        timestamp: Date.now()
      }))
      
      return { success: false, error: error.message }
    }
  }

  async loadProgress(storyId) {
    if (!this.currentUser) {
      // Load from localStorage for anonymous users
      const saved = localStorage.getItem(`progress_${storyId}`)
      this.currentProgress = saved ? JSON.parse(saved) : null
      return this.currentProgress
    }

    try {
      const { data: progress, error } = await db.getProgress(this.currentUser.id, storyId)
      if (error && error.code !== 'PGRST116') throw error // Ignore "not found" errors
      
      this.currentProgress = progress
      return progress
    } catch (error) {
      console.error('Load progress error:', error)
      
      // Try to load from localStorage as fallback
      const cached = localStorage.getItem(`progress_${storyId}_${this.currentUser.id}`)
      this.currentProgress = cached ? JSON.parse(cached) : null
      return this.currentProgress
    }
  }

  // Save Game Management
  async createSaveGame(storyId, saveName, gameState) {
    if (!this.currentUser) {
      return { success: false, error: 'Must be logged in to create save games' }
    }

    try {
      const { data, error } = await db.createSaveGame(
        this.currentUser.id,
        storyId,
        saveName,
        gameState
      )
      if (error) throw error
      
      return { success: true, data }
    } catch (error) {
      console.error('Create save game error:', error)
      return { success: false, error: error.message }
    }
  }

  async loadSaveGames(storyId) {
    if (!this.currentUser) {
      return { success: false, error: 'Must be logged in to load save games' }
    }

    try {
      const { data: saves, error } = await db.getSaveGames(this.currentUser.id, storyId)
      if (error) throw error
      
      return { success: true, saves }
    } catch (error) {
      console.error('Load save games error:', error)
      return { success: false, error: error.message }
    }
  }

  // User Preferences
  async savePreferences(preferences) {
    if (!this.currentUser) {
      localStorage.setItem('user_preferences', JSON.stringify(preferences))
      return { success: true }
    }

    try {
      const { data, error } = await db.savePreferences(this.currentUser.id, preferences)
      if (error) throw error
      
      // Also save to localStorage for faster access
      localStorage.setItem('user_preferences', JSON.stringify(preferences))
      
      return { success: true, data }
    } catch (error) {
      console.error('Save preferences error:', error)
      return { success: false, error: error.message }
    }
  }

  async loadUserPreferences() {
    if (!this.currentUser) {
      const saved = localStorage.getItem('user_preferences')
      return saved ? JSON.parse(saved) : this.getDefaultPreferences()
    }

    try {
      const { data: preferences, error } = await db.getPreferences(this.currentUser.id)
      if (error && error.code !== 'PGRST116') throw error
      
      const prefs = preferences || this.getDefaultPreferences()
      localStorage.setItem('user_preferences', JSON.stringify(prefs))
      
      return prefs
    } catch (error) {
      console.error('Load preferences error:', error)
      const cached = localStorage.getItem('user_preferences')
      return cached ? JSON.parse(cached) : this.getDefaultPreferences()
    }
  }

  getDefaultPreferences() {
    return {
      fontSize: 16,
      theme: 'light',
      autoSaveEnabled: true,
      readingSpeed: 200,
      audioEnabled: true,
      voicePreference: 'default',
      backgroundMusicEnabled: false
    }
  }

  // Character and Dialogue Methods
  async getStoryCharacters(storyId) {
    try {
      const { data: characters, error } = await db.getStoryCharacters(storyId)
      if (error) throw error
      
      return { success: true, characters }
    } catch (error) {
      console.error('Get characters error:', error)
      return { success: false, error: error.message }
    }
  }

  // Enhanced dialogue scanning with database integration
  async scanForDialogueWithDatabase(content, storyId) {
    // Use the robust dialogue patterns you provided
    const dialoguePatterns = [
      /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s*(?:said|asked|replied|whispered|shouted|called|interrupted)\s*,?\s*[""]([^""]*?)[""]/gi,
      /[""]([^""]*?)[""]\s*,?\s*(?:said|asked|replied|whispered|shouted|called|interrupted)\s*,?\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+)*?)\.?/gi,
      /[""]([^""]*?)[""]\s*,?\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+)*?)\s*(?:said|asked|replied|whispered|shouted|called|interrupted)/gi,
      /[""]([^""]*?)[""](?=\s+—\s+|(?=.*\b(?:Mia|Jake|Tom|Ethan|Liam|Clara)\b))/gi
    ];

    let allMatches = []
    
    // Get story characters for better matching
    const { characters } = await this.getStoryCharacters(storyId)
    const characterNames = characters ? characters.map(c => c.name) : []

    for (const pattern of dialoguePatterns) {
      let match
      while ((match = pattern.exec(content)) !== null) {
        const character = match[1] || match[2]
        const dialogue = match[2] || match[1]
        
        // Try to match against known characters
        let matchedCharacter = null
        if (character && characterNames.length > 0) {
          matchedCharacter = characterNames.find(name => 
            name.toLowerCase() === character.toLowerCase()
          )
        }
        
        allMatches.push({
          fullMatch: match[0],
          character: matchedCharacter || character,
          dialogue: dialogue,
          position: match.index,
          confidence: matchedCharacter ? 0.9 : 0.7
        })
      }
    }

    return allMatches
  }

  // Offline Data Sync
  async syncOfflineData() {
    if (!this.currentUser || !this.isOnline) return

    // Sync offline progress
    const offlineKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('offline_progress_')
    )

    for (const key of offlineKeys) {
      try {
        const data = JSON.parse(localStorage.getItem(key))
        const storyId = key.replace('offline_progress_', '')
        
        await this.saveProgress(storyId, {
          currentChapter: data.currentChapter,
          currentPosition: data.currentPosition
        })
        
        localStorage.removeItem(key) // Remove after successful sync
      } catch (error) {
        console.error('Sync offline progress error:', error)
      }
    }
  }

  // Utility Methods
  getCurrentUser() {
    return this.currentUser
  }

  getCurrentStory() {
    return this.currentStory
  }

  getCurrentProgress() {
    return this.currentProgress
  }

  isLoggedIn() {
    return !!this.currentUser
  }

  isOffline() {
    return !this.isOnline
  }
}

// Export singleton instance
export const storyManager = new StoryManager()