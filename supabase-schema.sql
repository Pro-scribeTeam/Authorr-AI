-- Interactive Fiction Story Engine Database Schema
-- This file contains the complete database schema for Supabase

-- Enable Row Level Security (RLS) on all tables
-- Create custom types for enums

-- Stories table - Main story content
CREATE TABLE IF NOT EXISTS public.stories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    author TEXT,
    genre TEXT,
    tags TEXT[],
    difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
    estimated_reading_time INTEGER, -- in minutes
    word_count INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT false,
    cover_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Chapters table - Story content broken into chapters
CREATE TABLE IF NOT EXISTS public.chapters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    chapter_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    word_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(story_id, chapter_number)
);

-- Characters table - Story characters
CREATE TABLE IF NOT EXISTS public.characters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    personality_traits TEXT[],
    speaking_style TEXT,
    voice_characteristics JSONB, -- For future voice cloning integration
    appearance_description TEXT,
    background_story TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(story_id, name)
);

-- Dialogue lines table - Individual dialogue entries
CREATE TABLE IF NOT EXISTS public.dialogue_lines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    character_id UUID REFERENCES public.characters(id) ON DELETE SET NULL,
    line_text TEXT NOT NULL,
    position_in_story INTEGER NOT NULL, -- Character position in the story text
    dialogue_type TEXT DEFAULT 'speech' CHECK (dialogue_type IN ('speech', 'thought', 'narration')),
    emotional_context TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Character relationships table - How characters relate to each other
CREATE TABLE IF NOT EXISTS public.character_relationships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    character1_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
    character2_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL, -- e.g., 'friend', 'enemy', 'family', 'romantic'
    relationship_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CHECK (character1_id != character2_id),
    UNIQUE(story_id, character1_id, character2_id)
);

-- User profiles table - Extended user information
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    reading_streak INTEGER DEFAULT 0,
    total_reading_time INTEGER DEFAULT 0, -- in minutes
    favorite_genres TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- User preferences table - Reading preferences and settings
CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    font_size INTEGER DEFAULT 16 CHECK (font_size >= 12 AND font_size <= 24),
    theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'sepia')),
    auto_save_enabled BOOLEAN DEFAULT true,
    reading_speed INTEGER DEFAULT 200, -- words per minute
    audio_enabled BOOLEAN DEFAULT true,
    voice_preference TEXT DEFAULT 'default',
    background_music_enabled BOOLEAN DEFAULT false,
    notification_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- User story progress table - Track reading progress
CREATE TABLE IF NOT EXISTS public.user_story_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    current_chapter INTEGER DEFAULT 1,
    current_position INTEGER DEFAULT 0, -- Character position in current chapter
    completion_percentage DECIMAL(5,2) DEFAULT 0.00,
    reading_time_minutes INTEGER DEFAULT 0,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, story_id)
);

-- Save games table - Multiple save slots per user/story
CREATE TABLE IF NOT EXISTS public.save_games (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    save_name TEXT NOT NULL,
    game_state JSONB NOT NULL, -- Stores complete reading state
    screenshot_url TEXT, -- Optional screenshot of current reading position
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bookmarks table - User bookmarks and annotations
CREATE TABLE IF NOT EXISTS public.bookmarks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    position INTEGER NOT NULL, -- Character position in the chapter
    note TEXT,
    highlight_color TEXT DEFAULT '#ffff00',
    is_private BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Reading sessions table - Track reading sessions for analytics
CREATE TABLE IF NOT EXISTS public.reading_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
    session_start TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    session_end TIMESTAMP WITH TIME ZONE,
    pages_read INTEGER DEFAULT 0,
    words_read INTEGER DEFAULT 0,
    device_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chapters_story_id ON public.chapters(story_id);
CREATE INDEX IF NOT EXISTS idx_chapters_story_chapter ON public.chapters(story_id, chapter_number);
CREATE INDEX IF NOT EXISTS idx_characters_story_id ON public.characters(story_id);
CREATE INDEX IF NOT EXISTS idx_dialogue_lines_chapter_id ON public.dialogue_lines(chapter_id);
CREATE INDEX IF NOT EXISTS idx_dialogue_lines_character_id ON public.dialogue_lines(character_id);
CREATE INDEX IF NOT EXISTS idx_user_story_progress_user_id ON public.user_story_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_story_progress_story_id ON public.user_story_progress(story_id);
CREATE INDEX IF NOT EXISTS idx_save_games_user_story ON public.save_games(user_id, story_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_story ON public.bookmarks(user_id, story_id);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_user_id ON public.reading_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_published ON public.stories(is_published) WHERE is_published = true;

-- Enable Row Level Security (RLS)
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dialogue_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_story_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.save_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Stories: Public read for published stories
CREATE POLICY "Published stories are viewable by everyone" ON public.stories
    FOR SELECT USING (is_published = true);

-- Chapters: Public read for published story chapters
CREATE POLICY "Published story chapters are viewable by everyone" ON public.chapters
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.stories 
            WHERE stories.id = chapters.story_id AND stories.is_published = true
        )
    );

-- Characters: Public read for published story characters
CREATE POLICY "Published story characters are viewable by everyone" ON public.characters
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.stories 
            WHERE stories.id = characters.story_id AND stories.is_published = true
        )
    );

-- Dialogue lines: Public read for published story dialogue
CREATE POLICY "Published story dialogue is viewable by everyone" ON public.dialogue_lines
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.chapters 
            JOIN public.stories ON stories.id = chapters.story_id
            WHERE chapters.id = dialogue_lines.chapter_id AND stories.is_published = true
        )
    );

-- Character relationships: Public read for published stories
CREATE POLICY "Published story relationships are viewable by everyone" ON public.character_relationships
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.stories 
            WHERE stories.id = character_relationships.story_id AND stories.is_published = true
        )
    );

-- User profiles: Users can view and update their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- User preferences: Users can manage their own preferences
CREATE POLICY "Users can manage own preferences" ON public.user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- User story progress: Users can manage their own progress
CREATE POLICY "Users can manage own progress" ON public.user_story_progress
    FOR ALL USING (auth.uid() = user_id);

-- Save games: Users can manage their own save games
CREATE POLICY "Users can manage own saves" ON public.save_games
    FOR ALL USING (auth.uid() = user_id);

-- Bookmarks: Users can manage their own bookmarks
CREATE POLICY "Users can manage own bookmarks" ON public.bookmarks
    FOR ALL USING (auth.uid() = user_id);

-- Reading sessions: Users can manage their own sessions
CREATE POLICY "Users can manage own sessions" ON public.reading_sessions
    FOR ALL USING (auth.uid() = user_id);

-- Functions for automatic updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.stories
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.chapters
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.characters
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.save_games
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, display_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', 'Reader'));
    
    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ language 'plpgsql' security definer;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();