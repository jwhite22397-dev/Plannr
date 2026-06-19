# ✨ Life Planner — Kindle Edition

A gamified life planner designed for old Kindle Fire tablets. Everything in one HTML file — no internet required.

## Features

- **Tasks** — Priority-sorted to-dos with categories (Personal, Work, Health, Shopping, Home)
- **Habits** — Daily habit tracker with 7-day streak calendar
- **Goals** — Long-term goals with progress bars and +1/−1 controls
- **XP & Levels** — Earn XP for every task/habit completed; level up through 10 titles
- **Streaks** — Daily streak counter that rewards consistency
- **Achievements** — 15 unlockable badges (First Step, Century Club, Habit Hero, etc.)
- **Confetti** — Celebratory bursts when completing high-priority tasks or leveling up
- **Daily Quotes** — Fresh motivational quote each day
- **100% offline** — All data stored in browser localStorage

## Getting It On Your Kindle Fire

### Option 1 — USB Transfer (recommended)
1. Connect your Kindle Fire to your computer via USB
2. Copy `index.html` to the Kindle's internal storage (e.g. `Documents/`)
3. On the Kindle, open the **Docs** app, find `index.html`, and tap it
4. It will open in the Silk browser

### Option 2 — Email to Kindle
1. Email `index.html` as an attachment to your Kindle's Send-to-Kindle address
2. Open it from the **Docs** section

### Option 3 — Local network
1. On a computer on the same Wi-Fi, run: `python3 -m http.server 8080` in this folder
2. On the Kindle Silk browser, navigate to `http://[YOUR-COMPUTER-IP]:8080`

### Tip — Add to Home Screen
In Silk browser, tap the menu → **Add to Home Screen** for an app-like shortcut.

## XP System

| Action | XP Gained |
|---|---|
| Complete Low task | +10 XP |
| Complete Medium task | +20 XP |
| Complete High task | +35 XP |
| Complete Urgent task | +55 XP |
| Complete a daily habit | +15 XP |
| 7-day habit streak | +50 XP bonus |
| Complete a goal | +100 XP |
| Unlock an achievement | +20–500 XP |

## Level Titles

1 Rookie → 2 Apprentice → 3 Explorer → 4 Achiever → 5 Champion → 6 Legend → 7 Titan → 8 Master → 9 Grandmaster → 10 Life Architect
