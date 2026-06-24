# 09 · Deployment — Render + MongoDB Atlas

Target: **one Render Web Service** (serves API + built React app) and **one Render Cron Job** (SLA sweep). Database on **MongoDB Atlas**. No other infrastructure.

---

## 1. MongoDB Atlas (one-time)

1. Create a free **M0** cluster (any region close to your Render region).
2. Create a database user (username + strong password).
3. Network access: allow Render's egress. Simplest start: allow `0.0.0.0/0` (open) — acceptable for launch with a strong DB password; tighten later with Render static IPs if needed.
4. Copy the **connection string** (SRV), set the DB name (e.g. `luc_crm`):
   `mongodb+srv://<user>:<pass>@<cluster>/luc_crm?retryWrites=true&w=majority`
5. This becomes `MONGODB_URI`.

---

## 2. Environment variables

| Variable | Where | Example / notes |
|----------|-------|-----------------|
| `NODE_ENV` | web + cron | `production` |
| `PORT` | web | Render injects it; the app must read `process.env.PORT` |
| `MONGODB_URI` | web + cron | Atlas SRV string (secret) |
| `JWT_SECRET` | web | long random string (secret) |
| `COOKIE_SECURE` | web | `true` in production |
| `CLIENT_ORIGIN` | web | the Render URL (same origin; used for cookie/CORS config) |
| `INGEST_API_KEY` | web | key for `/api/webhooks/leads` (secret) |
| `MESSAGING_DRIVER` | web + cron | `console` (default) |
| `CRON_SECRET` | cron | only if the sweep is triggered via HTTP |
| `SEED_ON_BOOT` | web | `false` (seed via one-off job instead) |

Keep secrets in Render's dashboard, never in the repo. `.env.example` documents all of them.

---

## 3. `render.yaml` (Blueprint)

Place at repo root. Adjust `name`/region as needed.

```yaml
services:
  # --- Web service: API + built React SPA ---
  - type: web
    name: luc-crm
    runtime: node
    region: oregon            # pick the region near your Atlas cluster
    plan: free                # upgrade later for always-on
    buildCommand: npm install && npm run build   # installs workspaces, builds client
    startCommand: npm run start                  # starts server, serves client/dist
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: COOKIE_SECURE
        value: "true"
      - key: MESSAGING_DRIVER
        value: console
      - key: MONGODB_URI
        sync: false           # set in dashboard (secret)
      - key: JWT_SECRET
        sync: false
      - key: INGEST_API_KEY
        sync: false
      - key: CLIENT_ORIGIN
        sync: false

  # --- Cron job: SLA / automation sweep every 15 min ---
  - type: cron
    name: luc-crm-sla-sweep
    runtime: node
    region: oregon
    plan: free
    schedule: "*/15 * * * *"
    buildCommand: npm install
    startCommand: node server/src/jobs/slaSweep.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: MESSAGING_DRIVER
        value: console
      - key: MONGODB_URI
        sync: false
```

> Root `package.json` scripts must support this:
> - `"build"`: build the client (`npm --workspace client run build`) — server needs no build step (plain Node).
> - `"start"`: `node server/src/index.js` (serves `/api` + static `client/dist`).
> - `"seed"`: `node server/src/seed/seed.js`.

---

## 4. Serving the SPA from Express (production)

In `server/src/index.js`, after mounting `/api` routes:
```js
if (process.env.NODE_ENV === 'production') {
  const dist = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html'))); // SPA fallback
}
app.listen(process.env.PORT || 4000);
```
This makes API and app the **same origin**, so the auth cookie just works and there's no production CORS.

---

## 5. First deploy checklist

1. Push repo with `render.yaml` → Render → **New > Blueprint** → select the repo.
2. Render creates the web service + cron from the blueprint.
3. In each service's **Environment**, set the `sync:false` secrets (`MONGODB_URI`, `JWT_SECRET`, `INGEST_API_KEY`, `CLIENT_ORIGIN`).
4. Wait for the web build; confirm `/api/health` returns ok at the Render URL.
5. **Seed once:** run `npm run seed` via a Render one-off job/shell (or temporarily set `SEED_ON_BOOT=true`, deploy, then turn it off). Don't seed on every boot.
6. Open the URL, log in as the seeded admin, walk a lead to Won.
7. Check the cron service logs after ~15 min for a sweep summary line.

---

## 6. Render free-tier notes

- Free web services **sleep** when idle and cold-start on the next request — fine for internal/demo use; upgrade to a paid instance for always-on counsellor use.
- Free cron jobs run on schedule regardless of web sleep.
- Atlas M0 has limited storage/connections — plenty for launch; monitor and upgrade as lead volume grows.

---

## 7. Production hardening (after launch)

- Restrict Atlas network access to Render's static outbound IPs.
- Rotate `JWT_SECRET` and DB password periodically.
- Add a real `MESSAGING_DRIVER` (Nodemailer SMTP / Twilio / Meta WhatsApp) by implementing the adapter — no business-logic changes.
- Add request logging/metrics and an uptime check on `/api/health`.
- Consider a paid Render plan to remove cold starts before heavy daily use.
