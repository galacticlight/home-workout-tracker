# Home Workout Tracker

**Custom offline-first workout tracker for home use only.**  
No internet required after initial load. All data stored locally in your browser.

Inspired by top apps like [Hevy](https://www.hevyapp.com/features/gym-progress/), Strong, FitNotes, JEFIT, Boostcamp, and others researched in 2026.

## Research Summary: Top Apps Like Hevy (Gym Progress Focus)

From analysis of 2026 reviews and comparisons:

1. **Hevy** – Modern logger with excellent progress stats, PRs, muscle graphs, calendar, monthly/yearly reports, social feed. Strong free tier. Live PR notifications.
2. **Strong** – Fastest tap-to-log interface, excellent Apple Watch, clean charts, routines. Best minimalist polish.
3. **FitNotes** (Android) – Fully free, truly offline, simple progress graphs, no ads/paywalls. Best pure free offline option.
4. **JEFIT** – Massive exercise library (1400+), community programs, detailed tracking.
5. **Boostcamp** – Huge free program library (11k+), good tracker + structured programs.
6. **Fitbod** – AI-generated workouts based on recovery/equipment.
7. **LIFTAG** – NFC/QR machine integration + free core tracking + PRs.
8. **Gym Note Plus** – Plain-text logging that auto-generates charts & PRs. Extremely fast.
9. **Slate / Load Muscle** – Advanced analytics, AI, muscle recovery maps.
10. **Personal Trainer / Gym Notebook** – Strong offline-first options with custom plans.

**Common must-haves extracted:**
- Fast set logging (weight × reps)
- Routines / templates
- Custom exercises
- Automatic Personal Records (weight, volume, reps)
- Progress charts & heuristics (volume by muscle, consistency, 1RM estimates)
- History + calendar
- Rest timer
- Fully offline capability

**This app prioritizes:**
- 100% offline / local-only (home use, no accounts, no sync, no web dependency)
- **New PRs are highlighted** with clear visual feedback when achieved
- **PRs are pinned** at the top of the Heuristics / Progress view so your bests are always front-and-center
- Clean dark UI optimized for quick logging during home sessions
- Progressive overload visibility

## Features (MVP)

- Log workouts (free-form or from routines)
- Exercise library + create custom exercises (home-friendly: bodyweight, dumbbells, bands, etc.)
- Routines / templates
- Automatic PR detection & celebration (max weight, best set volume, most reps)
- **Pinned PRs section** in Progress/Heuristics
- Workout history
- Simple progress charts (volume & weight over time per exercise)
- Rest timer
- Dark mode by default
- Export/import data (JSON) for backup
- PWA-ready (installable, works offline)

## How to Run (Fully Offline)

1. Clone or download this repo
2. Open `index.html` in any modern browser (Chrome, Safari, Firefox, Edge)
3. Or serve locally: `npx serve .` or `python -m http.server`
4. Add to home screen for app-like experience (PWA)

All data stays on your device. Clear browser data = lose history (use Export regularly).

## Tech

- Pure HTML / CSS / Vanilla JS (no build step required)
- Chart.js for visualizations (loaded from CDN on first use; browser cache helps offline)
- localStorage for persistence
- Service Worker for offline caching

## Roadmap Ideas

- IndexedDB for larger history
- Body measurements + progress photos (local only)
- Muscle group volume heatmaps
- Estimated 1RM calculator
- Plate calculator for home gym
- CSV export
- Better mobile gestures

---

Built for personal home training. No tracking, no accounts, no cloud.
