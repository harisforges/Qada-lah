# Qada Lah 🕌

**Langsaikan hutang solat, satu demi satu.** A simple, friendly web app for Malaysian Muslims to calculate and track their qada (missed) prayers.

## Features

- **Calculator** – pick a date range and instantly see how many prayers (and rakaat) need to be made up.
  - Assumes all 5 daily prayers were missed each day: Subuh (2), Zohor (4), Asar (4), Maghrib (3), Isyak (4).
  - **Custom filter** – tick any prayer you're sure you always performed in that period; it's excluded.
  - Optional: average excluded days per month (e.g. haid/nifas).
  - Quick presets (until today, 1 / 5 / 10 years) and an estimated finish date.
  - "Add to existing plan" lets you combine several periods.
- **Tracker**
  - Animated progress ring and journey bar, motivational messages.
  - Daily checklist: tick Subuh → Isyak as you complete each qada; finishing all five clears one full day 🎉.
  - Per-prayer progress cards with +1 / −1 and "Set" (for qada done before using the app).
  - Daily target with projected finish date, streak counter, 20-week activity heatmap and 14 achievement badges.
- **Backup** – progress lives in the browser (localStorage). Download a `.json` backup file or copy a backup code, then restore it on any device. Reminders nudge you when you haven't backed up.
- Bahasa Melayu / English toggle, light & dark mode, mobile-first layout, works offline (PWA).

## Running locally

No build step or dependencies — it's plain HTML, CSS and JavaScript.

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

(Opening `index.html` directly also works; offline caching just needs an `http(s)` URL.)

## Deploying

Enable **GitHub Pages** (Settings → Pages → deploy from branch, root folder) or drop the folder onto any static host (Netlify, Vercel, Cloudflare Pages).

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure |
| `style.css` | Styling, themes, responsive layout |
| `app.js` | Calculator, tracker, badges, backup/restore, translations |
| `sw.js`, `manifest.webmanifest` | Offline support & installable app |
| `assets/icon.svg` | App icon |

> Kiraan ini adalah anggaran. Untuk hukum terperinci, sila rujuk ustaz atau pejabat agama Islam negeri anda.
