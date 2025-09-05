# OpenAI API Key Setup Guide

This guide explains how to configure your OpenAI API key for the AUTHORR AI platform.

## 🔑 Getting Your OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/account/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (it starts with `sk-proj-` or `sk-`)
5. **Important**: Save it securely - you won't be able to see it again!

## 🛠️ Local Development Setup

### Step 1: Configure Environment Variables

You need to add your API key to the `.dev.vars` file for Wrangler development:

```bash
# Edit the .dev.vars file
nano .dev.vars

# Replace the placeholder with your real API key:
OPENAI_API_KEY=sk-proj-your-actual-api-key-here
```

### Step 2: Rebuild and Restart

```bash
# Rebuild the application
npm run build

# Restart the PM2 service
pm2 restart webapp

# Check if it's working
pm2 logs webapp --nostream
```

### Step 3: Verify Setup

1. Open your AUTHORR AI application
2. Try creating chapters - you should no longer see "demo mode" messages
3. The application will now use real AI to generate content

## 🚀 Production Deployment

### Cloudflare Pages Deployment

1. **Via Cloudflare Dashboard:**
   - Go to your Cloudflare Pages project
   - Navigate to Settings > Environment Variables
   - Add: `OPENAI_API_KEY = your-api-key-here`

2. **Via Wrangler CLI:**
   ```bash
   wrangler secret put OPENAI_API_KEY
   # Enter your API key when prompted
   ```

### Other Hosting Platforms

- **Vercel**: Add to Environment Variables in project settings
- **Netlify**: Add to Site settings > Environment variables  
- **Railway**: Add to Variables tab in project
- **Heroku**: Use `heroku config:set OPENAI_API_KEY=your-key`

## 🔒 Security Best Practices

### ✅ What We Did Right
- ✅ API key stored in environment variables (not in code)
- ✅ `.env` and `.dev.vars` files excluded from git
- ✅ Backend-only access (users don't need their own keys)
- ✅ Proper error handling and logging

### 🚫 Never Do This
- ❌ Don't put API keys directly in source code
- ❌ Don't commit `.env` or `.dev.vars` files to git
- ❌ Don't expose API keys in client-side JavaScript
- ❌ Don't share API keys in chat or email

## 🧪 Testing Your Setup

### Test Chapter Creation
1. Fill out the chapter creation form
2. Click "Create Chapter"
3. You should see AI-generated chapters (not demo content)

### Test Story Generation  
1. Create chapters first
2. Click "Create Story"
3. You should get a full AI-generated story with accurate word counts

### Debug Issues
Check the PM2 logs for API key status:
```bash
pm2 logs webapp --nostream | grep "API Key"
```

You should see:
```
Found key starting with: sk-proj-...
OpenAI client initialized successfully
```

## 📋 File Structure

```
/home/user/webapp/
├── .env                 # Local development (Node.js)
├── .dev.vars           # Wrangler development  
├── .env.example        # Template file
├── .gitignore          # Excludes .env files
└── src/index.tsx       # Backend with API key logic
```

## 💡 How It Works

1. **Development**: Wrangler reads from `.dev.vars`
2. **Production**: Cloudflare Workers reads from environment variables
3. **Fallback**: Local Node.js reads from `.env` via dotenv
4. **Security**: All sensitive files excluded from git

## 🆘 Troubleshooting

### "Demo Mode" Still Showing
- Check that your API key is in `.dev.vars`
- Verify the key starts with `sk-`
- Restart the application: `npm run build && pm2 restart webapp`

### "Invalid API Key" Errors
- Ensure there are no extra spaces in the key
- Verify the key is active in OpenAI dashboard
- Check you have sufficient OpenAI credits

### "API Key Not Found"
- Confirm `.dev.vars` file exists and has the right content
- Check PM2 logs: `pm2 logs webapp`
- Make sure you rebuilt after adding the key

## 📞 Need Help?

If you encounter issues:
1. Check the PM2 logs: `pm2 logs webapp`
2. Verify your OpenAI account has credits
3. Test your API key directly via OpenAI's API playground
4. Ensure the key has the necessary permissions (text generation)

---

**✅ Once configured, all AUTHORR AI features will work with real AI generation!**