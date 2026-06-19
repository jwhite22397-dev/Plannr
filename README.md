# Plannr

A dopamine-powered life planner built for your old Kindle. Turn mundane to-dos into small wins with XP, streaks, celebrations, and achievements.

## Features

- **Today's Plan** — Morning, afternoon, and evening time blocks for today only
- **Plan Ahead** — Daily, weekly, monthly, quarterly, and yearly planning with period navigation
- **Goals** — Monthly, quarterly, and yearly goals with milestones, progress bars, and linked tasks
- **Daily habits** — Build streaks and earn bonus XP for consistency
- **Gamification** — Levels, titles, achievements, confetti celebrations, and motivational nudges
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

Push this repo and enable GitHub Pages. Open the URL on your Kindle browser and bookmark it.

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

## Project structure

```
├── index.html          # Main app shell
├── css/styles.css      # Kindle-optimized styles
├── js/
│   ├── app.js          # UI and interactions
│   ├── store.js        # localStorage data layer
│   └── gamification.js # XP, levels, streaks, celebrations
├── manifest.json       # PWA manifest
├── sw.js               # Service worker (offline cache)
└── icons/              # App icons
```

## License

MIT
