# Plannr

A dopamine-driven life planner built for **old Kindle e-ink devices**.

Plannr turns the mundane stuff you have to do into a game: every task you check
off earns XP, grows your level, feeds a daily streak, and makes an ASCII growth
tree blossom from a tiny seed into an ancient guardian. It is designed to make
"do the boring thing" feel rewarding.

It is a single, self-contained `index.html` file. No internet, no accounts, no
servers. Everything is stored locally on the device.

## Why it looks the way it does (e-ink design notes)

Old Kindle browsers are slow, grayscale, and run a very old version of WebKit.
Plannr is built specifically for that:

- **Pure black & white, high contrast** — no color is needed and none is wasted.
- **Big touch targets** — easy to tap with a finger on a small screen.
- **No webfonts, no images, no emoji** — old Kindles render emoji as empty
  boxes, so all icons are drawn with CSS or plain text/ASCII.
- **Bold instant state changes instead of animations** — e-ink refresh is slow,
  so completing a task flips a big checkbox to solid black. That hard, satisfying
  flip is the reward.
- **Old-browser-safe code** — ES5 JavaScript only (no arrow functions, template
  literals, flexbox, or grid). Works offline via `localStorage` with an
  in-memory fallback.

## Features (the dopamine engine)

- **Today view** — a focused to-do list with TOP / NORMAL / LATER priorities and
  a live "X of Y done" progress bar.
- **Daily habits** — recurring check-ins with a rolling 7-day streak strip.
- **XP & levels** — every completion earns XP; fill the bar to level up.
- **Streaks** — complete something every day to build (and protect) your streak.
- **Growth tree** — an ASCII tree that visibly grows as you level up.
- **Achievements** — unlockable badges (First Step, Week Warrior, Perfect Day...).
- **Perfect Day bonus** — finish every task and habit for a big XP reward.
- **Celebration popups & toasts** — instant feedback when you earn XP, level up,
  or unlock a badge.
- **Auto day rollover** — finished to-dos clear at midnight; unfinished ones
  carry over.
- **Backup / restore** — copy your data text out (and paste it back) from the
  Menu tab. No cloud required.

## How to put it on an old Kindle

You have two easy options.

### Option A — open the file directly (fully offline)

1. Connect the Kindle to your computer with a USB cable. It shows up as a USB
   drive.
2. Copy `index.html` onto the Kindle (the root folder or `documents` is fine).
3. Eject / unplug the Kindle.
4. Open the **Experimental Browser** (on older Kindles: *Menu → Experimental
   → Web Browser*, or search for "browser").
5. In the address bar, type the local file path, for example:
   `file:///mnt/us/index.html`
   (On most Kindles the USB storage is mounted at `/mnt/us/`. If you put the file
   in a folder, include it, e.g. `file:///mnt/us/documents/index.html`.)
6. Bookmark it so you can reopen it in one tap.

> Tip: if `file://` is blocked on your particular Kindle model, use Option B.

### Option B — host it and open the URL

1. Put `index.html` anywhere it can be served over HTTP(S): a tiny local web
   server on your home network, GitHub Pages, Netlify, etc.
2. On a phone/computer:

```bash
# from inside this folder
python3 -m http.server 8000
```

3. On the Kindle's browser, go to `http://<your-computer-ip>:8000/`.
4. Bookmark it. Because all data is stored locally in the browser, it keeps
   working even if the host goes away — just keep using the same URL.

### Make it feel like an app

Use the Kindle browser's bookmark / "add to home" feature so Plannr is one tap
away. The layout is tuned for a portrait 6" e-ink screen.

## Using it

- Tap the **big square** on the left of any row to complete it (tap again to
  undo). The square fills solid black with a check — that's your reward.
- Use the bottom tabs to move between **Today**, **Habits**, **Growth**, and
  **Menu**.
- Pick a priority before adding a task, or just hit **ADD +** for a normal one.
- Visit **Menu** to leave yourself a motivating note, run a manual day reset, or
  back up your data.

## Data & privacy

All your data lives only in the browser on the device. Nothing is sent anywhere.
To move data between devices, use **Menu → Backup & restore**.

## Development

It's one file — just open `index.html` in any browser to work on it. To preview
locally:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000/
```
