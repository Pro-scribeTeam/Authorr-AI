# Authorr AI — Pre-Launch Checklist

## 🐳 RunPod / Chatterbox TTS

### Before Launch — Pin Docker Image Tag
Currently the RunPod endpoint uses `:latest` which is fine for development but should be pinned before going live.

**Steps:**
1. Go to `github.com/Pro-scribeTeam/Authorr-AI/actions`
2. Open the last successful **"Build and Push Chatterbox TTS"** run
3. Note the commit SHA from the image tag (e.g. `ghcr.io/pro-scribeteam/chatterbox-tts:abc1234`)
4. Go to **runpod.io → Serverless → your Chatterbox endpoint → Edit**
5. Change the container image from `:latest` to the specific SHA tag
6. Save & redeploy

**Why:** Pins production to a known good build. Future code changes won't accidentally affect live users until you deliberately update the endpoint.

---

## ⚡ RunPod Worker Cold Start — Decide Before Launch

Currently **Min Workers = 0** (scales to zero when idle). This means:
- First request after idle: worker takes 30-60 seconds to spin up and load the model
- All subsequent requests: instant
- After 5 seconds idle: scales back to zero (free)

**Before launch, decide which option fits your users best:**

| Option | Setting | Cost | Response Time |
|--------|---------|------|---------------|
| **Always warm** | Min Workers = 1 | ~$0.50-1/day always on | Instant every time |
| **Scale to zero** | Min Workers = 0 | Free when idle | 30-60s cold start |

**To change:** runpod.io → Serverless → physical_lavender_frog → Manage → Edit → Min Workers

**Recommendation:** Use Min Workers = 0 during development. Switch to Min Workers = 1 when real users are on the app.

---

## Other Pre-Launch Items
- [ ] Pin RunPod Docker image to specific SHA (see above)
- [ ] Decide on Min Workers setting (always warm vs scale to zero)
- [ ] Add RunPod Endpoint ID to settings (not hardcoded)
- [ ] Set up production database (Cloudflare D1)
- [ ] Enable user authentication
- [ ] Set Cloudflare environment variables (OPENAI_API_KEY etc.)
- [ ] Test full narration flow end-to-end with Chatterbox
