// Supabase client is initialized globally in index.html
// Access it via window.supabaseClient
export const supabase = window.supabaseClient || {
  auth: {
    signUp: () => Promise.reject(new Error('Supabase not initialized')),
    signInWithPassword: () => Promise.reject(new Error('Supabase not initialized')),
    signOut: () => Promise.reject(new Error('Supabase not initialized')),
    getUser: () => Promise.reject(new Error('Supabase not initialized')),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
  },
  from: () => ({
    select: () => Promise.reject(new Error('Supabase not initialized')),
    insert: () => Promise.reject(new Error('Supabase not initialized')),
    upsert: () => Promise.reject(new Error('Supabase not initialized'))
  })
}

// Authentication helpers
export const auth = {
  // Sign up new user
  async signUp(email, password, userData = {}) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    })
    return { data, error }
  },

  // Sign in user
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  // Sign out user
  async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Get current user
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  // Listen to auth changes
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// Database helpers
export const db = {
  // Stories
  async getStories() {
    const { data, error } = await supabase
      .from('stories')
      .select(`
        *,
        chapters (
          id,
          chapter_number,
          title,
          word_count
        )
      `)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async getStory(storyId) {
    const { data, error } = await supabase
      .from('stories')
      .select(`
        *,
        chapters (
          *,
          dialogue_lines (
            *,
            characters (name, speaking_style)
          )
        ),
        characters (*)
      `)
      .eq('id', storyId)
      .single()
    return { data, error }
  },

  // Chapters
  async getChapter(chapterId) {
    const { data, error } = await supabase
      .from('chapters')
      .select(`
        *,
        dialogue_lines (
          *,
          characters (name, speaking_style, personality_traits)
        )
      `)
      .eq('id', chapterId)
      .single()
    return { data, error }
  },

  // Characters
  async getStoryCharacters(storyId) {
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .eq('story_id', storyId)
      .order('name')
    return { data, error }
  },

  // User Progress
  async saveProgress(userId, storyId, progressData) {
    const { data, error } = await supabase
      .from('user_story_progress')
      .upsert({
        user_id: userId,
        story_id: storyId,
        current_chapter: progressData.currentChapter,
        current_position: progressData.currentPosition,
        last_read_at: new Date().toISOString()
      })
    return { data, error }
  },

  async getProgress(userId, storyId) {
    const { data, error } = await supabase
      .from('user_story_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('story_id', storyId)
      .single()
    return { data, error }
  },

  // Save Games
  async createSaveGame(userId, storyId, saveName, gameState) {
    const { data, error } = await supabase
      .from('save_games')
      .insert({
        user_id: userId,
        story_id: storyId,
        save_name: saveName,
        game_state: gameState
      })
    return { data, error }
  },

  async getSaveGames(userId, storyId) {
    const { data, error } = await supabase
      .from('save_games')
      .select('*')
      .eq('user_id', userId)
      .eq('story_id', storyId)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async loadSaveGame(saveId) {
    const { data, error } = await supabase
      .from('save_games')
      .select('*')
      .eq('id', saveId)
      .single()
    return { data, error }
  },

  // Bookmarks
  async createBookmark(userId, storyId, chapterId, position, note = '') {
    const { data, error } = await supabase
      .from('bookmarks')
      .insert({
        user_id: userId,
        story_id: storyId,
        chapter_id: chapterId,
        position: position,
        note: note
      })
    return { data, error }
  },

  async getBookmarks(userId, storyId) {
    const { data, error } = await supabase
      .from('bookmarks')
      .select(`
        *,
        chapters (title)
      `)
      .eq('user_id', userId)
      .eq('story_id', storyId)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  // User Preferences
  async savePreferences(userId, preferences) {
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        ...preferences
      })
    return { data, error }
  },

  async getPreferences(userId) {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()
    return { data, error }
  }
}