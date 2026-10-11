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
| `assets/icon*.svg/png`, `apple-touch-icon.png` | App & home-screen icons |
| `assets/og-image.jpg` | Link preview image (WhatsApp, Telegram, etc.) |
| `assets/fonts/` | Self-hosted Plus Jakarta Sans & Amiri (SIL Open Font License) |

## Privacy & security

- **No server, no accounts, no database.** Everything is static files; each person's progress is saved only in their own browser. There is nothing central to break into or leak.
- **No third-party requests.** Fonts are self-hosted and there are no analytics or trackers.
- **Strict Content-Security-Policy**: the page may only run its own script, styles and fonts — injected scripts, plugins, `<base>` tricks and form posts are blocked.
- **Backup files are untrusted input**: they are size-limited, every field is type-checked and clamped, unknown fields are dropped, and nothing from a backup is ever inserted as HTML.
- **Clickjacking guard**: the app refuses to render inside another site's frame.
- `Referrer-Policy: no-referrer`; HTTPS is enforced by GitHub Pages.

The main thing to protect is **the GitHub account** that can change the site: keep two-factor authentication on, and consider protecting the deployed branch.

> Kiraan ini adalah anggaran. Untuk hukum terperinci, sila rujuk ustaz atau pejabat agama Islam negeri anda.
