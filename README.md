# PBB — Partido Bangon Bangsamoro

Monorepo for two things:

1. **Public campaign site** (`public/home.html`) — the BANGON platform, 2026 election content, volunteer lead capture. Static HTML/CSS/JS, no build step required for that file on its own.
2. **INFORM dashboard** (`src/`) — a React + TypeScript + Vite single-page app showing BARMM conflict/risk intelligence, built on the ACAPS INFORM Risk Index methodology. Gated behind sign-in (or a "Sample Data" preview mode that needs no credentials).

## Getting started

```bash
npm install
cp .env.example .env   # fill in real values — see comments in the file
npm run dev
```

The dev server serves both the dashboard (`/`) and the public site (`/home.html`) from the same Vite instance. `vite.config.ts` also proxies `/api/acaps` to `api.acaps.org` in development to avoid CORS.

## Building for production

```bash
npm run build   # runs `tsc` then `vite build` — fails loudly on type errors
npm run preview # serve the production build locally to sanity-check it
```

## Project structure

```
public/
  home.html         ← the public campaign site (see its own inline comments)
  robots.txt, sitemap.xml
index.html           ← Vite entry point for the React dashboard (mounts src/main.tsx)
src/
  App.tsx             Routing logic: who sees the login form vs the dashboard vs
                       gets redirected to the public site
  main.tsx            React root
  index.css           PBB brand tokens (Poppins/Montserrat/Roboto Condensed,
                       forest green/metallic gold/white) + Tailwind layers
  contexts/
    ACAPSContext.tsx   Holds the ACAPS data-source config (credentials, base URL,
                       sample-data toggle) — NOT user auth
    Auth.tsx           User authentication state (separate from the above —
                       see the note in App.tsx about how these two relate)
  hooks/
    useAuth.ts          Thin hook wrapping contexts/Auth.tsx
    useACAPS.ts         ACAPS API client (token auth, paginated fetches)
  components/          Dashboard, Header, LoginForm, and the individual chart
                       components (RiskMatrix, SeverityTimeline, etc.)
  data/realData.ts     Compiled reference dataset (INFORM Severity, ACLED,
                       World Bank, OCHA) used when sample-data mode is on
  types/, utils/        Shared TS types and the ACAPS risk methodology helpers
assets/                Shared images used by both the dashboard and public site
```

## Environment variables

See `.env.example` for the full list with explanations. Nothing in `.env` should
ever be committed — it's gitignored.

## A note on "ACAPS" in this codebase

ACAPS is the actual upstream data source and risk methodology (INFORM Risk
Index) this dashboard is built on — references to it in data attribution,
chart naming (`acaps-severity`, `acaps-access` color tokens), and API
integration code are legitimate and should stay. What was cleaned up is
*visual branding* that made the tool look like it belonged to ACAPS rather
than PBB (emoji, off-palette accent colors used decoratively, page titles).
If you're touching this code and unsure which category something falls into:
data attribution and methodology naming stays; anything purely cosmetic
should use the PBB brand tokens in `index.css`.
