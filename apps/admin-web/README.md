# ViaClara — Admin Web

Companion web app for ViaClara's municipal pilot (Almuñécar, Salobreña, Motril): operators and administrators use it to view, triage, change the status of, and delete citizen-reported incidents (broken streetlights, potholes, etc.) coming from the ViaClara mobile app. It is a fresh Vite + React + TypeScript scaffold with an in-memory mock data store — there is no backend yet (see `DOCUMENTO_VIACLARA.md` §8.2 and §14 at the repo root for the full product spec and planned API).

## Running it

```bash
npm install
npm run dev
```

Then open the printed local URL. Log in with any placeholder credentials (there is no real authentication yet) to reach the incident dashboard.

Other scripts: `npm run build` (typecheck + production build), `npm run preview` (preview the production build), `npm run typecheck`.
