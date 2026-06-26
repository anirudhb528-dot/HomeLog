# HomeLog

A home-management app for homeowners: track maintenance, log expenses, and find local services. This repository is a **working full-stack application** — a real, runnable starting point you can keep building on.

This first version delivers the core features:

- **Maintenance tracker** — schedule tasks, **create/edit/complete/delete**, and auto-generate the next occurrence for recurring upkeep.
- **Expense tracker** — log/edit/categorize home spending with category totals and a monthly trend (MongoDB aggregation), with optional **receipt photos**.
- **Local services directory** — search/filter providers by trade, see ratings & reviews, and request bookings.
- **Accounts, profile & dashboard** — including an optional **profile avatar**.
- **Image uploads** — receipt and avatar images stored in **Supabase Storage** (optional; the app runs without it).

Community forum, DIY guides, and the inspiration gallery from the original spec are intentionally left out and noted under [next steps](#suggested-next-steps).

---

## Architecture

```
new-app/  (HomeLog root)
├── backend/             Node.js + Express REST API, MongoDB via Mongoose
│   ├── app.js               Express app (security, routes, Swagger) — exported for tests
│   ├── server.js            Validates env → connects DB → starts listening
│   ├── openapi.js           OpenAPI 3 spec served at /api/docs
│   ├── test/                Mocha + Supertest smoke tests (no DB required)
│   └── src/
│       ├── config/          env validation + Mongo connection
│       ├── models/          User, MaintenanceTask, Expense, ServiceProvider, Booking
│       ├── controllers/     Request handlers per feature
│       ├── routes/          Express routers + express-validator chains
│       ├── middleware/      JWT auth, validation, 404, central error handler
│       └── utils/           token, ApiError, asyncHandler, seed script
├── frontend/            Expo (React Native) app
│   └── src/
│       ├── api/             Axios client w/ token interceptor + endpoint wrappers
│       ├── context/         AuthContext (thin session state)
│       ├── navigation/      Auth stack + bottom-tab navigator + services stack
│       ├── screens/         Login, Signup, Dashboard, Maintenance, Expenses, Services, Profile
│       ├── components/      Shared UI kit (Card, Button, Field, Pill, Empty, Screen)
│       ├── theme/           Color palette, spacing, type scale
│       └── utils/           Formatting helpers
└── .github/workflows/   CI (lint + test the backend)
```

**Tech stack:** React Native (Expo SDK 51) · Node/Express · MongoDB/Mongoose · JWT + bcrypt · Axios. Hardening: helmet, CORS, rate limiting, request logging, and Swagger API docs.

### A note on authentication

Auth is intentionally **thin and isolated** (JWT + bcrypt in the Node backend) so the whole app runs with no third-party account. The frontend `AuthContext` only does `login`/`register`/`logout`; the backend verifies tokens in [`backend/src/middleware/auth.js`](backend/src/middleware/auth.js). Swapping in Firebase Auth later means replacing those two seams and nothing else.

---

## Prerequisites

- **Node.js** 18+ and npm
- **MongoDB** — *optional!* By default the backend runs a zero-setup **in-memory MongoDB** (see below). Provide your own only if you want data to persist.
- **Expo** — no global install needed; `npx expo` is used. Use Expo Go on a phone, an emulator, or the web target.

---

## Database (zero setup by default)

If `MONGO_URI` is left **blank** in `backend/.env`, the server automatically starts an **in-memory MongoDB** (`mongodb-memory-server`) and seeds it with the demo account on every boot — no install, no account, nothing to configure. The first run downloads the MongoDB binary once.

> Caveat: in-memory data is **ephemeral** — it resets each time the server restarts (it re-seeds automatically, so the demo login always works).

**To persist data,** set `MONGO_URI` in `backend/.env` to a real database and run `npm run seed` once:

- **Local:** install MongoDB Community Server → `mongodb://127.0.0.1:27017/homelog`
- **Atlas:** create a free cluster at <https://www.mongodb.com/atlas/database>, add a DB user, allow your IP, then use `mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/homelog?retryWrites=true&w=majority`

In production, `MONGO_URI` and `JWT_SECRET` are **required** (the in-memory fallback is disabled).

---

## 1. Run the backend

```bash
cd backend
npm install
cp .env.example .env          # Windows: copy .env.example .env
npm run dev                   # starts API on http://localhost:5000
```

That's it — with `MONGO_URI` blank, `npm run dev` boots an in-memory MongoDB, seeds the demo data automatically, and starts the API. (Using a real database? Set `MONGO_URI` in `.env` and run `npm run seed` once first.)

Verify it's up:

```bash
curl http://localhost:5000/api/health     # {"status":"ok", ...}
```

- **Interactive API docs:** open <http://localhost:5000/api/docs> (Swagger UI).
- **Demo login:** `demo@homelog.app` / `password123`

### Backend scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start with auto-reload (nodemon) |
| `npm start` | Start once (production-style) |
| `npm run seed` | Reset + populate demo data (for a **persistent** `MONGO_URI`; the in-memory DB auto-seeds itself) |
| `npm test` | Mocha smoke tests (health, 404, auth-gating) — **no DB needed** |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

---

## 2. Run the frontend

```bash
cd frontend
npm install
npx expo start
```

Then press `w` for web, `a` for Android, `i` for iOS, or scan the QR code with Expo Go.

**Important — API URL:** the app reads `extra.apiBaseUrl` from [`frontend/app.json`](frontend/app.json) (default `http://localhost:5000/api`). `localhost` works for web and the iOS simulator. On a **physical device or Android emulator**, change it to your computer's LAN IP, e.g. `http://192.168.1.20:5000/api`.

> **Expo SDK note:** the dependencies are pinned to **Expo SDK 51** as specified. If you're on a newer Expo CLI and installs complain, run `npx expo install --fix` to align versions, or bump to the latest SDK.

---

## API reference (summary)

Full, interactive docs live at `/api/docs`. Summary:

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/auth/register` | — | Create account, returns JWT |
| POST | `/api/auth/login` | — | Log in, returns JWT |
| GET / PATCH | `/api/auth/me` | ✓ | Get / update profile + home |
| GET / POST | `/api/maintenance` | ✓ | List (`?status=`, `?upcoming=true`) / create task |
| PATCH / DELETE | `/api/maintenance/:id` | ✓ | Update / delete task |
| POST | `/api/maintenance/:id/complete` | ✓ | Complete (+ spawn next if recurring) |
| GET | `/api/expenses` | ✓ | List (`?category=`, `?from=`, `?to=`) |
| GET | `/api/expenses/summary` | ✓ | Totals by category + monthly trend |
| POST | `/api/expenses` | ✓ | Log expense |
| PATCH / DELETE | `/api/expenses/:id` | ✓ | Update / delete expense |
| GET | `/api/services` | — | Search providers (`?trade=`, `?city=`, `?q=`) |
| GET | `/api/services/:id` | — | Provider detail + reviews |
| POST | `/api/services/:id/reviews` | ✓ | Add a rating/review |
| POST | `/api/services/:id/book` | ✓ | Request a booking |
| GET | `/api/services/bookings/mine` | ✓ | List my bookings |
| POST | `/api/uploads/image` | ✓ | Upload an image (`?folder=receipts\|avatars\|misc`) → `{ url, path }` |
| GET | `/api/health` | — | Liveness probe (+ db/storage status) |

All authenticated requests expect `Authorization: Bearer <token>` (the frontend Axios client adds this automatically). Errors use a consistent shape: `{ "error": { "message": "...", "details": [...] } }`. List endpoints accept `?page=` / `?limit=` and return a `meta` object alongside the array.

---

## How this maps to a full-stack checklist

| # | Concern | Where it lives in this repo |
|---|---------|------------------------------|
| 1 | **Frontend** | Expo RN app: navigation (`src/navigation`), state (`AuthContext` + hooks), Axios client w/ token interceptor (`src/api`), UI kit + theme (`src/components`, `src/theme`), forms/validation in screens, AsyncStorage session. |
| 2 | **Backend** | Express (`app.js`), routing (`src/routes`), controllers (`src/controllers`), middleware (auth/validate/error/CORS/logging), `.env` config. |
| 3 | **Data layer** | Mongoose models + indexes (`src/models`), seeding (`npm run seed` / auto-seed for the in-memory dev DB), aggregation for expense summaries. |
| 4 | **Auth & authz** | JWT + bcrypt; per-user data scoping (`user: req.user._id`); hashes never returned (`select:false` + `toJSON`). |
| 5 | **API contract** | REST, structured JSON errors, status codes, CORS, **Swagger/OpenAPI** at `/api/docs`. |
| 6 | **Security** | helmet, rate limiting, **mongo-sanitize** (NoSQL-injection guard), input validation & sanitized regex search, secrets via env, least-privilege queries. *(TLS terminates at your host/proxy in prod.)* |
| 7 | **Testing & quality** | Mocha + Chai + Supertest — smoke tests **plus integration tests** (in-memory Mongo); ESLint + Prettier. |
| 8 | **Tooling** | Git, npm, `.gitignore`, documented setup (this README). |
| 9 | **Build/deploy** | GitHub Actions CI (`.github/workflows`); `render.yaml` (backend) + `eas.json` (app builds). See below. |
| 10 | **Observability** | Request logging (morgan) + central error logging + `/api/health` (db/storage status); Sentry/Datadog are next steps. |
| 11 | **Supporting** | **Supabase Storage** for image uploads; Booking model ready for payments; push/Redis are next steps. |

---

## Production: deploy & build

### Backend → Render + MongoDB Atlas

A [`render.yaml`](render.yaml) blueprint is included. In Render: **New + → Blueprint → pick this
repo**. It builds `backend/` and runs `npm start` with a health check at `/api/health`. Set the
dashboard secrets (`MONGO_URI`, `CORS_ORIGIN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`);
`JWT_SECRET` is auto-generated. (Any Node host works — Railway/Fly.io/AWS — just set the same env.)

### Image storage → Supabase

1. Create a project at <https://supabase.com>, then **Storage → New bucket** (e.g. `homelog-uploads`; make it public for simple read URLs).
2. **Settings → API**: copy the project URL and the **service_role** key.
3. Put them in `backend/.env` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET`). Leave them blank to disable uploads (the app still runs; `/api/uploads/image` returns `503`).

### App → EAS test builds

The app uses [`app.config.js`](frontend/app.config.js) (reads `EXPO_PUBLIC_API_URL`, defaults to localhost) and [`eas.json`](frontend/eas.json) build profiles. To produce installable test builds:

```bash
cd frontend
npm install -g eas-cli       # once
eas login                    # your Expo account
# edit eas.json → set EXPO_PUBLIC_API_URL to your deployed backend
eas build --profile preview --platform android   # or ios (needs Apple Developer)
```

`preview` builds are shareable internally (Android `.apk` / iOS TestFlight). Regenerate the
placeholder icon/splash with `node assets/generate-assets.js` after editing `assets/logo` — and
replace them with real artwork before a public launch.

### Environments

Keep separate values per dev / staging / production (`.env` for the backend, `EXPO_PUBLIC_API_URL`
for the app). A [privacy policy template](PRIVACY.md) is included — stores require a hosted policy URL.

---

## Suggested next steps

1. **Push notifications** for due tasks (Expo Notifications + a scheduled backend job).
2. **Payments** for bookings (Stripe) — the `Booking` model is ready to extend (note Apple's IAP rules).
3. **Observability** — wire Sentry (errors) and a metrics/uptime monitor.
4. **Harden further** — refresh tokens, Docker Compose, Redis caching.
5. **Store submission** — Apple Developer ($99/yr) / Google Play ($25), screenshots, listing copy.
6. **Remaining spec features** — community forum, DIY guides, inspiration gallery, emergency resources.

## License

MIT — use freely.
