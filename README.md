# Plannr

A dopamine-forward mobile life planner designed to keep motivation high for mundane tasks.

## Features

- Mobile-first interface that runs smoothly on low-power devices.
- Task "missions" with XP rewards (easy/medium/hard).
- Leveling system, streak tracking, and momentum percentage.
- Quest board filters: Today, Week, All, Done.
- Daily habits with per-habit streaks.
- Morning / Afternoon / Evening planner map.
- Local-first persistence (`localStorage`) so your plans remain on-device.
- Offline/PWA support through a service worker.

## Run

Because this is a static app, use any small HTTP server:

```bash
python3 -m http.server 4173
```

Then open:

```
http://localhost:4173
```

## Kindle install (old Fire / Android-based Kindle)

1. Host this app somewhere reachable by the Kindle browser (local network or static hosting).
2. Open the app URL in Silk browser.
3. Use browser menu -> **Add to Home Screen** (if available).
4. Launch from home screen for app-like fullscreen behavior.

## Notes

- All data is stored in the browser on that device.
- Clearing browser storage removes planner data.
