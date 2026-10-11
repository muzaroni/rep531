<img src="public/icon-192.png" width="96" height="96" alt="REP531 logo">

# REP531

A mobile-first, offline workout tracker for **5/3/1 Boring But Big**. Built for the gym, with local storage and no account required.

## Features

- **5/3/1 + BBB:** four-week cycles, Normal BBB or BBB Swap, optional warmups and deloads.
- **Automatic loads:** training max calculations, lb/kg conversion, and plate loading based on your equipment.
- **Workout logging:** editable weights and reps, completion tracking, accessories, and rest timers.
- **Planning and history:** weekly calendar, past workouts, corrections, cardio, and progression charts for all four lifts.
- **Personalization:** per-day accessories, exercise order, percentages, timers, and five space-inspired themes.
- **Offline and private:** installable PWA, automatic local saves, JSON backups, and Markdown history exports.

## Run locally

Requires **Node.js 22.18+**. Run these commands in PowerShell or your terminal:

```sh
npm ci
npm run dev
```

To check the app and preview the production build:

```sh
npm test
npm run build
npm run test:e2e
npm run preview
```

Browser tests use Microsoft Edge. Offline functionality requires a production build served over HTTPS or localhost.

## Publish with GitHub Pages

1. In this repository's **Settings → Pages**, select **GitHub Actions** as the source.
2. Open **Actions → Test and deploy to GitHub Pages → Run workflow**.
3. Wait for the tests, build, and deployment to finish, then open the reported site URL.

Deployment is manual; pushing a commit does not publish the app.

On your phone, open the published site and choose **Add to Home Screen** in Safari or **Install app** in Chrome. Load it online once before using it offline.

## Your data

Workouts and settings stay in your browser using IndexedDB. Export a JSON backup regularly, especially before clearing browser data or switching devices. Importing a backup restores your saved training data.

## Built with

React · TypeScript · Vite · Dexie · vite-plugin-pwa · Vitest · Playwright

Project conventions, calculation rules, and storage architecture are documented in [AGENTS.md](AGENTS.md).
