-- ============================================
-- AUTHORR AI — Supabase Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USER PROFILES
-- Extended info beyond Supabase auth.users
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- PROJECTS
-- Each audiobook project a user creates
-- ============================================
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    author TEXT,
    genre TEXT,
    tone TEXT,
    outline TEXT,
    cover_image_url TEXT,
    word_count INTEGER DEFAULT 0,
    chapter_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'complete', 'published')),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own projects" ON public.projects FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- CHAPTERS
-- Individual chapters within a project
-- ============================================
CREATE TABLE IF NOT EXISTS public.chapters (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    chapter_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    content TEXT,
    key_points JSONB DEFAULT '[]',
    word_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'generated', 'edited', 'complete')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    UNIQUE(project_id, chapter_number)
);
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own chapters" ON public.chapters FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- AUDIO FILES
-- Generated narration audio references
-- ============================================
CREATE TABLE IF NOT EXISTS public.audio_files (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
    file_name TEXT NOT NULL,
    file_url TEXT,
    file_size INTEGER,
    duration_seconds FLOAT,
    voice_provider TEXT, -- 'chatterbox', 'openai', 'elevenlabs'
    voice_id TEXT,
    format TEXT DEFAULT 'mp3',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);
ALTER TABLE public.audio_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own audio files" ON public.audio_files FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- VOICE PROFILES
-- Custom cloned voices per user
-- ============================================
CREATE TABLE IF NOT EXISTS public.voice_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    provider TEXT NOT NULL, -- 'chatterbox', 'elevenlabs'
    provider_voice_id TEXT,
    sample_url TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);
ALTER TABLE public.voice_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own voice profiles" ON public.voice_profiles FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- AUTO SAVES
-- Rolling auto-save of work in progress
-- ============================================
CREATE TABLE IF NOT EXISTS public.auto_saves (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    save_data JSONB NOT NULL, -- full snapshot of storyData
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);
ALTER TABLE public.auto_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own auto saves" ON public.auto_saves FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_chapters_project_id ON public.chapters(project_id);
CREATE INDEX IF NOT EXISTS idx_audio_files_project_id ON public.audio_files(project_id);
CREATE INDEX IF NOT EXISTS idx_auto_saves_user_id ON public.auto_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_saves_project_id ON public.auto_saves(project_id);

-- ============================================
-- AUTO-UPDATE updated_at timestamps
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = timezone('utc', now()); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_chapters_updated_at BEFORE UPDATE ON public.chapters FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
