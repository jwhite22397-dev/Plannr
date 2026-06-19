# Plannr

A dopamine-powered life planner built for your old Kindle. Turn mundane to-dos into small wins with XP, streaks, celebrations, and achievements.

## Features

- **Today's Plan** — Morning, afternoon, and evening time blocks for today only
- **Plan Ahead** — Daily, weekly, monthly, quarterly, and yearly planning with period navigation
- **Goals** — Monthly, quarterly, and yearly goals with milestones, progress bars, and linked tasks
- **Daily habits** — Build streaks and earn bonus XP for consistency
- **Gamification** — Levels, titles, achievements, confetti celebrations, and motivational nudges
- **AI Coach** — OpenAI-powered plan analysis and per-task how-to advice (optional)
- **Offline-first PWA** — Works without internet after first load; data stays on your device

## Kindle Setup

### Option 1: Fire Tablet / Kindle with Silk Browser

1. Host the app on a simple web server, or copy files to the device
2. Open `index.html` in the Silk browser
3. Bookmark the page for quick access

### Option 2: Local server (recommended for development)

```bash
# Python 3
python3 -m http.server 8080

# Then on your Kindle, open:
# http://<your-computer-ip>:8080
```

### Option 3: Deploy to GitHub Pages / Netlify

**GitHub Pages (app only):** https://jwhite22397-dev.github.io/Plannr/

**Netlify (app + AI Coach proxy):** Connect this repo at [netlify.com](https://netlify.com), set `OPENAI_API_KEY` in Site settings → Environment variables, then open your Netlify URL.

### Kindle tips

- The UI uses large touch targets (48px+) for easy tapping
- High-contrast dark theme works well on e-ink; light mode activates automatically if your device prefers it
- All data is stored in `localStorage` — no account needed
- Add to home screen if your browser supports "Add to Home Screen" for an app-like experience

## How the dopamine system works

| Action | XP Reward |
|--------|-----------|
| Low priority task | +5 XP |
| Medium priority task | +10 XP |
| High priority ("boss") task | +20 XP |
| Daily habit | +15 XP (+bonuses at 7 & 30 day streaks) |

- **Levels** scale with total XP — each level needs 1.5× more XP than the last
- **Day streak** increments when you complete at least one task per day
- **Achievements** unlock in the Trophy Case as you hit milestones
- **Confetti + messages** fire every time you check something off

## AI Coach setup

**Never commit your OpenAI API key to GitHub.** If you shared a key publicly, revoke it at [platform.openai.com](https://platform.openai.com/api-keys) and create a new one.

### Option A — Netlify (recommended)

1. Deploy this repo on Netlify (it picks up `netlify.toml` automatically)
2. In Netlify → Site settings → Environment variables, add `OPENAI_API_KEY`
3. Open the app on your Netlify URL → **Coach** tab → leave the key blank → tap **Analyze my plan**

### Option B — GitHub Pages + key on your phone

Browsers cannot call OpenAI directly (CORS). You still need the Netlify proxy:

1. Deploy the same repo on Netlify (free) and set `OPENAI_API_KEY` there
2. On your phone in Plannr → **Coach** → paste the proxy URL:  
   `https://YOUR-SITE.netlify.app/.netlify/functions/coach`
3. Optionally paste your API key too (stored only in your phone's browser)
4. Tap **Save settings**

### What the Coach does

- **Analyze my plan** — Reviews today's tasks, habits, goals, and upcoming plans; suggests order, what to defer, and motivation
- **How do I do this?** — Step-by-step advice for a specific task

Uses `gpt-4o-mini` for fast, low-cost responses. Responses are cached for 1 hour.

## Project structure

```
├── index.html          # Main app shell
├── css/styles.css      # Kindle-optimized styles
├── js/
│   ├── app.js          # UI and interactions
│   ├── store.js        # localStorage data layer
│   ├── gamification.js # XP, levels, streaks, celebrations
│   ├── planning.js     # Daily/weekly/monthly horizons
│   └── ai-coach.js     # OpenAI coach client
├── netlify/functions/coach.js  # CORS proxy for OpenAI (optional)
├── manifest.json       # PWA manifest
├── sw.js               # Service worker (offline cache)
└── icons/              # App icons
```

## License

MIT
