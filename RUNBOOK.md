# LUC CRM — Operations Runbook

Operational guide for running, seeding, deploying and troubleshooting the LUC CRM.

## Architecture (one service + one cron)
- **Web service** (`server/src/index.js`) — Express serves the JSON API at `/api/*`
  and the built React SPA (`client/dist`) for everything else, **same origin**.
- **Cron job** (`server/src/jobs/slaSweep.js`) — runs every 15 min: flips SLA
  breaches, notifies owner+managers, delivers due reminders, raises payment-due
  alerts. Idempotent (safe to re-run).
- **Database** — MongoDB Atlas. App uses the `luc_crm_dev` database; tests use a
  separate `luc_crm_test` database on the same cluster. (Other databases on the
  cluster are never touched.)

## Environment variables
Copy `.env.example` → `server/.env` (gitignored) and fill:

| Var | Where | Notes |
|-----|-------|-------|
| `NODE_ENV` | web + cron | `production` on Render |
| `PORT` | web | Render injects it; app reads `process.env.PORT` |
| `MONGODB_URI` | web + cron | Atlas SRV string ending in `/luc_crm_dev` (secret) |
| `MONGODB_URI_TEST` | local/CI | ends in `/luc_crm_test` (tests only) |
| `JWT_SECRET` | web | long random string (secret) |
| `JWT_EXPIRES_IN` | web | default `8h` |
| `COOKIE_SECURE` | web | `true` in production (https) |
| `CLIENT_ORIGIN` | web | the Render URL |
| `MESSAGING_DRIVER` | web + cron | `console` (default) |
| `STORAGE_DRIVER` | web | `stub` (default) or `s3` |
| `AWS_REGION` / `AWS_S3_BUCKET` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | web | only when `STORAGE_DRIVER=s3` |
| `INGEST_API_KEY` | web | webhook key (secret) |
| `SEED_ON_BOOT` | web | keep `false`; seed via a one-off job |

> **Secrets** live only in Render's dashboard / local `.env`. Never commit them.
> Rotate `JWT_SECRET` and the DB password periodically.

## Local development
```bash
npm install            # installs server + client workspaces
# create server/.env from .env.example, then:
npm run seed           # 1 admin + 1 team lead + 3 counsellors + ~18 leads
npm run dev            # Express :4000 + Vite :5173 (proxies /api)
npm test               # Vitest + supertest against luc_crm_test
```
Production build locally:
```bash
npm run build                       # client → client/dist
NODE_ENV=production npm run start    # API + SPA on http://localhost:4000
```

## Seed accounts
All seeded users share the password **`Passw0rd!`**:
- `admin@luc.edu` (admin) · `mariam@luc.edu` (team lead)
- `sara@luc.edu` · `nadia@luc.edu` · `ibrahim@luc.edu` (counsellors)

Re-running `npm run seed` **wipes** the `luc_crm_dev` collections and reloads
the sample data. Do not run it against production once real data exists.

## Add a user
Admin-only: `POST /api/auth/users { name, email, password, role }`
(roles: `counsellor` | `team_lead` | `admin`). Or via the seed for bulk setup.

## Run the SLA sweep manually
```bash
npm run sweep          # node server/src/jobs/slaSweep.js
# logs: [sla-sweep] {"overdue":N,"breaches":N,"reminders":N,"paymentDue":N}
```
On Render this runs automatically every 15 min via the cron service.

## Deploy to Render (Blueprint)
1. Push the repo (incl. `render.yaml`).
2. Render → **New → Blueprint** → select the repo. It creates the web service
   + the cron job.
3. In each service's **Environment**, set the `sync:false` secrets:
   `MONGODB_URI`, `JWT_SECRET`, `INGEST_API_KEY`, `CLIENT_ORIGIN`.
4. Wait for the web build; confirm `GET /api/health` → `{ok:true}` at the URL.
5. **Seed once** via a one-off shell (`npm run seed`) — not on every boot.
6. Log in as `admin@luc.edu`, walk a lead to Won.
7. After ~15 min, check the cron service logs for an `[sla-sweep]` summary.

## Closing a lead to "Won" (the money gate)
1. Advance the lead through the stages (each gate requires its fields).
2. At **Documents / Verification**: mark documents received + **verified**
   (`docsVerified` unlocks docs → payment).
3. At **Payment Pending**: a **team lead/admin** confirms payment
   (`POST /payment/confirm { reference }`) — the only way `payment.status='paid'`.
4. Advance to **Admission Closed - Won**: blocked unless docs verified AND
   payment paid. On success the system generates `admissionId` + `receiptNo`,
   writes an onboarding handoff, and stops SLA tracking.

## Troubleshooting
- **`/api/health` fails** → check `MONGODB_URI` and Atlas network access (allow
  Render egress / `0.0.0.0/0`).
- **401 on every request** → cookie not set: verify `COOKIE_SECURE` matches the
  scheme (https→true) and the SPA is same-origin.
- **Counsellor sees no leads** → leads are owner-scoped; assign via capture or
  `POST /leads/:id/reassign` (manager).
- **Won blocked** → confirm `docsVerified===true` and `payment.status==='paid'`.
- **Switch to real email/WhatsApp/S3** → implement the adapter interface
  (`adapters/messaging.js`, `adapters/s3Storage.js`) and set the driver env var;
  no business-logic changes.
