# lick.me — daily guitar lick trainer (static / GitHub Pages)

`lick.me` is a tiny, static “lick-of-the-day” guitar practice app designed to run on **GitHub Pages** with **no backend**.

Every day (based on your **local date**) it selects a short, high-quality 2–4 bar lick from a curated JSON library and displays it as **ASCII tab**. Same lick all day; new lick tomorrow.

## Features (MVP)
- Daily “sticky” lick selection (deterministic, local-date based)
- Curated lick library stored in `/data/licks.json`
- ASCII tab rendering in the browser (no dependencies)
- 100% static: HTML + CSS + JS, deploys via GitHub Pages

## Project structure
- `index.html` — UI shell
- `assets/app.js` — daily picker + tab renderer
- `assets/style.css` — styling
- `data/licks.json` — lick library

## How the daily lick works
The app computes today’s local date (`YYYY-MM-DD`), hashes it, then picks:
`index = hash(date) % licks.length`

No storage required, so it works on GitHub Pages and even offline once cached.

## Development
Just open `index.html` in a browser, or run a static server:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploy (GitHub Pages)
1. Repo Settings → Pages
2. Source: “Deploy from a branch”
3. Branch: `main` / root (`/`)

Your site will be available at:
`https://<username>.github.io/lick.me/`

## Roadmap ideas
- Fretboard/diagram view (SVG)
- Audio playback (MIDI/WebAudio)
- Difficulty/style filters + favorites/streak
- Generated licks (rule-based, deterministic seed)
