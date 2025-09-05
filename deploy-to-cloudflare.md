# 🚀 Cloudflare Deployment Guide

## Prerequisites
1. Cloudflare account
2. Wrangler CLI installed: `npm install -g wrangler`
3. OpenAI API key

## Deployment Steps

### 1. Login to Cloudflare
```bash
wrangler auth login
```

### 2. Set Environment Variables (Choose One Method)

#### Method A: Via Wrangler CLI
```bash
wrangler secret put OPENAI_API_KEY
# Paste your API key when prompted
```

#### Method B: Via Cloudflare Dashboard
1. Go to https://dash.cloudflare.com
2. Navigate to Workers & Pages
3. Find your worker "authorr-ai-audiobook"
4. Go to Settings > Environment Variables
5. Add variable:
   - Name: `OPENAI_API_KEY`
   - Value: `your-actual-openai-api-key-here`
   - Type: Secret

### 3. Build and Deploy
```bash
npm run build
wrangler deploy
```

### 4. Verify Deployment
Test the deployed worker:
```bash
curl https://authorr-ai-audiobook.your-subdomain.workers.dev/api/openai-status
```

Expected response:
```json
{
  "configured": true,
  "demo_mode": false,
  "message": "OpenAI API is configured and ready"
}
```

## Security Notes
- Never commit API keys to Git
- Use Cloudflare's secret management
- Monitor OpenAI usage and billing
- Set up usage limits in OpenAI dashboard

## Troubleshooting
- If API key not recognized, wait 2-3 minutes after setting
- Ensure environment variable name is exactly `OPENAI_API_KEY`
- Check deployment logs with `wrangler tail`