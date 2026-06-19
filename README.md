# Plannr

A tiny, Kindle-friendly life planner that turns mundane tasks into daily quests.

Plannr is a static mobile web app/PWA. It stores everything locally in the
browser, works offline after the first load, and avoids heavy dependencies so it
can run on older devices.

## Features

- Daily "quest board" for tasks
- XP, levels, streaks, and celebratory micro-copy
- Quick-add task form with life area, energy level, and reward value
- Morning and evening rituals
- Reward jar for planning a small treat after enough points
- Local-only persistence through `localStorage`
- Offline app shell through a small service worker
- High-contrast, e-ink-aware design for old Kindle screens

## Run locally

Any static file server works:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

You can also open `index.html` directly, though service-worker offline caching
only works when served over HTTP(S).
