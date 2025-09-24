# Supabase Setup Guide

This guide will walk you through setting up Supabase for your Interactive Fiction Story Engine.

## Prerequisites

- A Supabase account (sign up at [supabase.com](https://supabase.com))
- Basic understanding of SQL and database concepts

## Step 1: Create a New Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose your organization
4. Fill in project details:
   - **Project Name**: `interactive-fiction-engine`
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose the region closest to your users
5. Click "Create new project"
6. Wait for the project to be provisioned (usually 2-3 minutes)

## Step 2: Get Your Project Credentials

1. In your project dashboard, go to **Settings → API**
2. Copy the following values:
   - **Project URL** (looks like: `https://abcdefghijklmnop.supabase.co`)
   - **Anon Public Key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
   - **Service Role Key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

⚠️ **Security Note**: Keep your Service Role Key secret - it has admin privileges!

## Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and replace the Supabase values:
   ```env
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

## Step 4: Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the contents of `supabase-schema.sql` and paste it into the editor
4. Click "Run" to execute the schema
5. Verify that tables were created by checking the **Table Editor**

## Step 5: Populate with Sample Data (Optional)

1. In the **SQL Editor**, create another new query
2. Copy the contents of `sample-data.sql` and paste it
3. Click "Run" to insert the sample data
4. Check the **Table Editor** to see the sample stories and characters

## Step 6: Configure Authentication

1. Go to **Authentication → Settings**
2. Configure your authentication providers:
   - **Email**: Enable if you want email/password auth
   - **Magic Links**: Enable for passwordless login
   - **Social Providers**: Configure Google, GitHub, etc. as needed

3. Set up email templates:
   - Go to **Authentication → Email Templates**
   - Customize confirmation and recovery email templates

## Step 7: Set Up Row Level Security (RLS)

The schema already includes RLS policies, but you can customize them:

1. Go to **Authentication → Policies**
2. Review the automatically created policies
3. Modify as needed for your security requirements

## Step 8: Install Dependencies and Test

1. Install the Supabase JavaScript client:
   ```bash
   npm install @supabase/supabase-js
   ```

2. Test the connection by running your application:
   ```bash
   npm run dev
   ```

3. Check the browser console for any connection errors

## Database Schema Overview

### Core Tables

- **`stories`**: Main story content and metadata
- **`chapters`**: Story content broken into chapters
- **`characters`**: Character profiles and traits
- **`dialogue_lines`**: Individual dialogue entries with character attribution

### User Management

- **`user_profiles`**: Extended user information
- **`user_preferences`**: Reading preferences and settings
- **`user_story_progress`**: Reading progress tracking
- **`save_games`**: Multiple save slots per user
- **`bookmarks`**: User bookmarks and annotations

### Analytics

- **`reading_sessions`**: Track reading sessions for analytics
- **`character_relationships`**: Character relationships and interactions

## Key Features Enabled

### 🔐 Authentication
- User registration and login
- Social authentication (configurable)
- Password reset and email verification

### 📚 Story Management
- Dynamic story loading from database
- Character-aware dialogue system
- Multi-chapter story organization

### 💾 Progress Tracking
- Auto-save reading progress
- Multiple save game slots
- Cross-device synchronization

### 🎨 Personalization
- User preferences (theme, font size, etc.)
- Bookmarks and annotations
- Reading history and analytics

### 🔒 Security
- Row Level Security (RLS) policies
- User data isolation
- Public access to published content only

## API Usage Examples

### Fetch Stories
```javascript
import { db } from './src/supabase.js'

// Get all published stories
const { data: stories, error } = await db.getStories()

// Get specific story with chapters and characters
const { data: story, error } = await db.getStory(storyId)
```

### User Progress
```javascript
// Save reading progress
await db.saveProgress(userId, storyId, {
  currentChapter: 2,
  currentPosition: 1500
})

// Load progress
const { data: progress } = await db.getProgress(userId, storyId)
```

### Authentication
```javascript
import { auth } from './src/supabase.js'

// Sign up
const { data, error } = await auth.signUp('user@example.com', 'password')

// Sign in
const { data, error } = await auth.signIn('user@example.com', 'password')

// Get current user
const user = await auth.getCurrentUser()
```

## Troubleshooting

### Common Issues

1. **"relation does not exist" error**
   - Make sure you ran the schema SQL completely
   - Check that you're connected to the right database

2. **Authentication errors**
   - Verify your API keys in `.env`
   - Check that RLS policies allow the operation

3. **CORS errors**
   - Supabase automatically handles CORS for web applications
   - Make sure you're using the correct project URL

4. **Performance issues**
   - Check that proper indexes exist (included in schema)
   - Consider enabling real-time subscriptions only where needed

### Getting Help

- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Discord Community**: [discord.supabase.com](https://discord.supabase.com)
- **GitHub Issues**: [github.com/supabase/supabase](https://github.com/supabase/supabase)

## Next Steps

1. **Integrate with Your App**: Update your existing code to use Supabase
2. **Add Content**: Use the admin interface or direct SQL to add your stories
3. **Customize UI**: Build user authentication and progress tracking interfaces
4. **Deploy**: Configure environment variables for production deployment
5. **Monitor**: Use Supabase dashboard to monitor usage and performance

## Security Checklist

- [ ] RLS is enabled on all tables
- [ ] Service role key is kept secret
- [ ] Authentication is properly configured
- [ ] User data access is restricted by user ID
- [ ] Published content is accessible to anonymous users
- [ ] Private user data (saves, preferences) is protected

---

Your Interactive Fiction Story Engine is now powered by Supabase! 🚀