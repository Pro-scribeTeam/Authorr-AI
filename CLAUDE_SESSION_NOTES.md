# Authorr AI — Claude Session Notes
**Last updated:** 2026-06-23

---

## Project Overview
- **File:** `/Users/mrmac/Documents/Authorr-AI-backup-20260401/index.html` — single-file app
- **Live URL:** `https://authorr-ai.vercel.app`
- **Deployment:** Vercel (manual via `npx vercel --prod` from project directory when GitHub webhook misses)
- **Git branch:** `main`
- **Git repo:** `/Users/mrmac/Documents/Authorr-AI-backup-20260401`

---

## Features Built (This Session Series)

### 1. Export Page — Publishing Hub
- Replaced single "Audible Ready" card with 10-platform publishing hub
- `PUBLISH_PLATFORMS` config object: name, icon, specs, filenameFn, notesFn, uploadUrl per platform
- `selectPublishPlatform(id)` renders detail panel with specs + notes
- `exportForPlatform(id)` packages and downloads
- Platforms: Audible/ACX, Spotify, Apple Books, Google Play, OverDrive, Findaway, Kobo, B&N Press, YouTube, Podcast
- `updateExportSummary()` called from `showPage()` when Export tab opens

### 2. Login Redirect to Workspace
- `signInUser()` calls `showPage('workspace')` after successful sign-in
- `getSession()` on page load calls `showPage('workspace')` when existing session found

### 3. Dashboard Landing Page Redesign
Full 10-section high-conversion landing page:
1. Hero — headline, sub-headline, trust copy, dual CTA
2. Platform bar — auto-scrolling with glow per-icon (CSS `@keyframes scroll-platforms`)
3. Pain vs Solution — "The Old Way" vs "With Authorr AI" + video placeholder
4. How It Works — 5-step process (DAW as step 3) + video placeholder
5. Features grid — 6 cards (AI Writing, Multi-Voice, Voice Clone, DAW, Cover Art, Publishing)
6. Outcome Stats — <1hr / 10+ / $0 / 100%
7. Demo video — VidMingo embed
8. Testimonials — 2 video slots + 3 written quote cards (Marcus T., Alexis R., David K.)
9. FAQ accordion — 6 questions, JS accordion toggle
10. Final CTA banner — deep teal gradient, radial glow

### 4. Dashboard i18n — All 16 Languages
- 80 `data-i18n="dash_*"` attributes across all 10 dashboard sections
- ~65 new `dash_*` keys added to all 16 language objects in `UI_TRANSLATIONS`:
  en, es, fr, de, pt, it, hi, ar, zh, ja, ko, ru, nl, pl, sv, tr
- `setUILanguage(lang)` scans all `[data-i18n]` elements and sets `el.textContent = t[key]`
- Pattern for mixed content (icons + text): wrap text in `<span data-i18n="key">text</span>`, NOT the outer element (avoids destroying icon HTML)

### 5. Story Translation Feature (Workspace)
- "Translate" button in Story Editor toolbar (next to Undo/Redo/Save)
- Translation panel:
  - "Written in" dropdown — auto-syncs with `#storyLanguage`
  - "Translate to" dropdown — 18 languages
  - Chunks story into ~3,500 char paragraph groups for any length
  - Progress bar + "chunk X of Y" counter
  - Preview before applying
  - Apply to Editor — replaces content, updates `#storyLanguage`, saves undo state
  - Copy to clipboard / Discard options
- Key functions: `toggleTranslatePanel()`, `translateStory()`, `applyTranslation()`,
  `copyTranslation()`, `discardTranslation()`, `splitIntoChunks(text, maxChars)`
- `saveStoryLanguage()` syncs `#translateFromLang` whenever story language changes

---

## Key Code Locations (index.html)

| Section | ~Line |
|---|---|
| Dashboard `#dashboard` div start | 1033 |
| Platform bar CSS `@keyframes scroll-platforms` | ~1100 |
| How-It-Works 5-step section | ~1340 |
| Workspace `#workspace` div | 1677 |
| Translation panel HTML | ~1920 |
| `UI_TRANSLATIONS` object | 17657 |
| `setUILanguage()` function | ~19100 |
| `toggleTranslatePanel()` / `translateStory()` | just before `humanizeText` |
| `humanizeText()` function | ~302100 |
| `saveStoryLanguage()` function | ~302500 |
| `callOpenAI()` / `callOpenRouter()` | ~301432 |
| `signInUser()` function | ~16900 |
| `showPage()` function | ~2686 |

---

## API Pattern
```js
const result = await callOpenAI([
  { role: 'system', content: '...' },
  { role: 'user',   content: '...' }
]);
// On live site -> callOpenRouter -> POST /api/generate
// { provider: 'openrouter', model, messages, temperature: 0.7, max_tokens: 3000 }
```

---

## i18n Key Prefixes
- `nav_` — navigation
- `ws_`  — workspace
- `nar_` — narration
- `cov_` — covers
- `exp_` — export
- `cfg_` — config
- `dash_` — dashboard landing page (added this session)

---

## Dashboard Platform Bar CSS (inline inside dashboard section)
```css
@keyframes scroll-platforms {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
}
.platform-scroll-wrap { overflow: hidden; mask-image: linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%); }
.platform-scroll-track { display: flex; gap: 3.5rem; width: max-content; animation: scroll-platforms 22s linear infinite; }
.platform-scroll-track:hover { animation-play-state: paused; }
.pub-icon { filter: drop-shadow(0 0 10px var(--glow-color)); }
```
Icons are duplicated (Set 1 + Set 2) for seamless infinite loop.

---

## Gotchas / Notes
- Body-scroll app: use `document.body.scrollTo()` not `window.scrollTo()` — `window.scrollY` is always 0
- Vercel webhook sometimes misses pushes — force deploy with `npx vercel --prod` from project dir
- Translation chunking: `splitIntoChunks(text, 3500)` splits on `\n\n` paragraph breaks
- FAQ accordion script is an inline `<script>` tag inside the dashboard section
- Translation prompts instruct AI to preserve character names, chapter headings, dialogue formatting, and author voice

---

## Recent Git Commits
```
04e424e  Add story translation feature to Workspace
53f3e9f  Add i18n to dashboard landing page — all 16 languages
090e37d  Target specific agents in War Room by name
dac404b  Add Google Calendar event creation via Tupac chat
f879a61  Fix Google Calendar integration and voice fallback
c198879  Fix calendar token refresh
6f32f30  Add media lifecycle archive system
```
