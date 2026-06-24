# LUC CRM — Operations Runbook

Operational guide for running, seeding, deploying and troubleshooting the LUC CRM.

## Architecture (single $7 service)
- **Web service** (`server/src/index.js`) — Express serves the JSON API at `/api/*`
  and the built React SPA (`client/dist`) for everything else, **same origin**.
- **SLA sweep** (`server/src/jobs/slaSweep.js`) — flips SLA breaches, notifies
  owner+managers, delivers due reminders, raises payment-due alerts. Idempotent.
  Runs **in-process** every 15 min when `RUN_SWEEP_IN_PROCESS=true` (one always-on
  Starter service does everything — cheapest), or as a separate Render Cron Job
  if you prefer (`RUN_SWEEP_IN_PROCESS=false` + a `type: cron` service).
- **Database** — MongoDB Atlas. App uses the `luc_crm_dev` database; tests use a
  separate `luc_crm_test` database on the same cluster. (Other databases on the
  cluster are never touched.)
- **Document storage** — AWS S3 (`STORAGE_DRIVER=s3`); uploads go to the bucket,
  downloads use freshly-signed URLs. `STORAGE_DRIVER=stub` needs no AWS account.

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

## Deploy to Render (single $7 Starter service)
1. Push the repo (incl. `render.yaml`).
2. Render → **New → Blueprint** → select `viditkbhatnagar/LUC-CRM`. It creates
   one **web service** on the **Starter** plan ($7/mo, always-on).
3. Set the `sync:false` secrets in the service's **Environment** tab (values in
   the deploy note / your local `server/.env`): `MONGODB_URI`, `JWT_SECRET`,
   `INGEST_API_KEY`, `CLIENT_ORIGIN`, `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`,
   `AWS_SECRET_ACCESS_KEY`.
4. Wait for the build; confirm `GET /api/health` → `{ok:true}` at the Render URL.
   Set `CLIENT_ORIGIN` to that URL and redeploy.
5. **Seed once** via the service **Shell** tab: `npm run seed` (not on every boot).
6. Log in as `admin@luc.edu`, capture a lead, walk it to Won.
7. Watch the service **Logs** for `[sla-sweep:in-process]` lines (every 15 min).

> The SLA sweep runs in-process (`RUN_SWEEP_IN_PROCESS=true`) so there is no
> second billable service. To split it into a separate Render Cron Job instead,
> set `RUN_SWEEP_IN_PROCESS=false` and add a `type: cron` service with
> `startCommand: node server/src/jobs/slaSweep.js`, schedule `*/15 * * * *`.

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
