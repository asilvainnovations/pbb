# PBB — Partido Bangon Bangsamoro

Platform repository for the 2026 BARMM Parliamentary Elections (14 September 2026).

Three things live here:

1. **Public campaign site** (`public/home.html`) — the BANGON platform, 2026 election content, and every public sign-up form. Static HTML/CSS/JS, no build step.
2. **Onboarding backend** (`supabase/`) — Postgres schema, RLS policies, and the `submit-lead` Edge Function that every public form writes through.
3. **INFORM dashboard** (`src/`) — React + TypeScript + Vite SPA showing BARMM conflict/risk intelligence built on the ACAPS INFORM Risk Index methodology. Gated behind sign-in, with a credential-free sample-data preview.

---

## Getting started

```bash
npm install
cp .env.example .env      # fill in real values — every var is explained in the file
npm run dev               # dashboard at /, campaign site at /home.html
```

Before opening a pull request:

```bash
npm run verify            # typecheck + lint + build — the same gates CI runs
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server. Proxies `/api/acaps` → `api.acaps.org` to avoid CORS. |
| `npm run build` | `tsc && vite build`. Fails loudly on type errors. |
| `npm run preview` | Serve the production build locally. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run lint` | ESLint, zero warnings tolerated. |
| `npm run verify` | All three, in order. Run this before pushing. |

---

## Deploying the backend

The forms on the public site do nothing until the database and Edge Function exist. Order matters.

```bash
# 1. Apply the schema (three migrations, in timestamp order)
supabase db push

# 2. Set the Edge Function secrets — these are server-side only and must
#    never appear in .env or in any file that reaches the browser
supabase secrets set TURNSTILE_SECRET_KEY=...
supabase secrets set SEMAPHORE_API_KEY=...
supabase secrets set SEMAPHORE_SENDER_NAME=PBB
supabase secrets set IP_HASH_SALT="$(openssl rand -hex 32)"

# 3. Deploy the write path
supabase functions deploy submit-lead

# 4. Point the public site at the project — edit the configuration block
#    near the bottom of public/home.html:
#      window.PBB_SUPABASE_URL       = "https://<project>.supabase.co";
#      window.PBB_SUPABASE_ANON_KEY  = "<publishable anon key>";
#      window.PBB_TURNSTILE_SITE_KEY = "<turnstile site key>";

# 5. Seed the chapter coordinators, so leads have an owner on arrival
#    (migration 20260813000000 creates one chapter per province with a null
#    coordinator; assign real staff_profiles rows to them)
```

**Verify it worked** before trusting it: submit a test sign-up on the live site, then check that a row appeared.

```sql
select full_name, phone, chapter_id, onboarding_stage, submitted_at
from public.coordinator_queue
order by submitted_at desc
limit 5;
```

If that query returns nothing after a test submission, the forms are silently failing — do not assume otherwise. This exact failure mode is what the 13 August 2026 audit found in production.

---

## How a sign-up flows

```
  Visitor fills a form on home.html
            │
            ▼
  submitLead()  ──── fails ────►  localStorage outbox
            │                     retried on 'online' + next page load
            │                     user is told it is QUEUED, never "received"
            ▼
  POST /functions/v1/submit-lead
            │
            ├─ origin allowlist
            ├─ Cloudflare Turnstile verification
            ├─ per-IP rate limit (5 / 10 min, salted hash, never a raw IP)
            ├─ validation + PH mobile normalisation to E.164
            ├─ de-duplication on the normalised number
            ├─ consent_log entry
            ▼
  volunteer_leads / form_submissions / partnership_agreements
            │
            ├─ trigger: auto-assign to the chapter for that province
            ▼
  coordinator_queue  ──►  coordinator contacts within 48h (breached_sla flags misses)
            │
            ▼
  SMS confirmation to the volunteer
```

The browser never writes to the database directly. Anonymous `INSERT` grants were revoked in `20260813000000_onboarding_pipeline.sql`; the Edge Function holds the only key that can write.

---

## Onboarding stages

`volunteer_leads.onboarding_stage` tracks where each person is:

| Stage | Meaning |
|---|---|
| `captured` | Form submitted. Nothing sent yet. |
| `confirmed` | Auto-reply delivered on their preferred channel. |
| `verified` | OTP proved the number belongs to them. |
| `assigned` | Routed to a chapter coordinator. |
| `activated` | Completed a first task. |
| `trained` | Finished role-based micro-modules. |
| `deployed` | Holds a precinct/barangay assignment. |
| `inactive` | Lapsed or opted out. |

`public.onboarding_funnel` reports conversion between stages per chapter — the weekly organising review should read from it.

---

## Project structure

```
public/
  home.html          ← public campaign site; forms + runtime config near the bottom
  privacy.html, terms.html, cookies.html, accessibility.html
  robots.txt, sitemap.xml
  assets/            images, legal.css, site-widgets.js (cookie + a11y widget)
docs/
  internal/          personas, Messenger scripts — NOT served publicly
index.html           ← Vite entry point for the dashboard (mounts src/main.tsx)
src/
  App.tsx            Routing: login form vs dashboard vs redirect to the campaign site
  main.tsx           React root
  index.css          PBB brand tokens (Poppins/Montserrat/Roboto Condensed,
                       forest green / metallic gold / white) + Tailwind layers
  contexts/
    ACAPSContext.tsx   ACAPS data-source config (credentials, base URL,
                       sample-data toggle) — NOT user auth
    Auth.tsx           User authentication state — separate from the above
  hooks/
    useAuth.ts         Thin wrapper over contexts/Auth.tsx
    useACAPS.ts        ACAPS API client (token auth, bounded paginated fetches)
  components/        Dashboard, Header, LoginForm, and the chart components
  data/realData.ts   Compiled reference dataset (INFORM Severity, ACLED,
                       World Bank, OCHA) used in sample-data mode
  types/, utils/     Shared TS types and INFORM risk methodology helpers
supabase/
  migrations/
    20260811123735_comprehensive_schema.sql   roles, leads, content, risk data, audit
    20260812000000_pillar_cta_forms.sql       BANGON pillar CTA forms + grants
    20260813000000_onboarding_pipeline.sql    chapters, onboarding stages, lockdown
  functions/submit-lead/index.ts              the only public write path
.github/workflows/ci.yml                      typecheck, lint, build, secret scan
```

---

## Data protection

Volunteer records reveal **political affiliation**, which is *sensitive personal information* under the Data Privacy Act of 2012 (RA 10173). Treat this data accordingly:

- Contact details are collected only with affirmative, logged consent (`consent_log`).
- IP addresses are stored as salted SHA-256 hashes, never in the clear.
- No client-side surface may enumerate or export leads. Coordinators read `coordinator_queue` under RLS; every export is written to `audit_log`.
- Minors (under 18) require guardian consent — enforced in the form, in the Edge Function, and by a `check` constraint on the table.
- `purge_opted_out_leads()` removes opted-out records 30 days after opt-out. Schedule it, and agree a post-election retention decision for the rest.

**Never commit `.env`.** Never place a `service_role` key anywhere a browser can reach it. CI fails the build if either appears.

---

## Contributing

`main` is the source of truth. Edits made directly in the Bolt host must be pushed back here, or the two will drift — which is what happened before August 2026, and made it impossible to reason about what was actually live.

1. Branch from `main`.
2. Make the change.
3. `npm run verify`.
4. Open a PR. CI must be green before merge.

---

## A note on "ACAPS" in this codebase

ACAPS is the actual upstream data source and risk methodology (INFORM Risk Index) this dashboard is built on — references to it in data attribution, chart naming (`acaps-severity`, `acaps-access` color tokens), and API integration code are legitimate and should stay. What was cleaned up is *visual branding* that made the tool look like it belonged to ACAPS rather than PBB (emoji, off-palette accent colors used decoratively, page titles). If you are touching this code and unsure which category something falls into: data attribution and methodology naming stays; anything purely cosmetic should use the PBB brand tokens in `index.css`.

---

## License

MIT — see [LICENSE](LICENSE).
