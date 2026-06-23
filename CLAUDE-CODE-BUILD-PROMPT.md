# HomeLog — Build Prompt for Claude Code

> Copy everything below the line into Claude Code as your first message. It is self-contained.

---

You are building **HomeLog**, a cross-platform mobile app that helps homeowners manage home maintenance, track expenses, and find local services. Build it as a working full-stack application that I can run locally. Work autonomously: scaffold the project, implement all features below, write tests, and verify the app runs before reporting done.

## Tech stack (use exactly this)
- **Frontend:** React Native via **Expo (SDK 51)**, JavaScript. React Navigation (native-stack + bottom-tabs), Axios, AsyncStorage for session persistence.
- **Backend:** **Node.js + Express** (CommonJS). REST API.
- **Database:** **MongoDB** with **Mongoose**.
- **Auth:** **JWT + bcryptjs** (email/password). Keep the auth layer thin and isolated so Firebase Auth could replace it later.
- **Validation:** express-validator with a central error handler.
- **Tests:** Mocha + Chai + Supertest for the API.

## Repository layout
```
homelog/
├── backend/   (Express API; app.js exported for tests, server.js boots DB then listens)
│   └── src/{config,models,controllers,routes,middleware,utils}
└── frontend/  (Expo app)
    └── src/{api,context,navigation,screens,components,theme}
```
Add `.env.example`, `.gitignore`, and a root `README.md` with exact run instructions.

## Scope — build these v1 features
1. **Accounts & profile** — register, login, persistent session, view/edit profile + home details (nickname, type, size, location), logout. Passwords hashed with bcrypt; never returned in responses. All data endpoints require a Bearer token and only return the current user's data.
2. **Maintenance tracker** — create tasks (title, category, priority, due date, recurrence: none/monthly/quarterly/biannual/annual); list sorted by due date; mark complete; **completing a recurring task auto-creates the next occurrence with the correctly advanced due date**; edit/delete; flag overdue tasks distinctly.
3. **Expense tracker** — log expenses (description, amount, category, date); categories: maintenance, utilities, improvement, insurance, taxes, services, other; edit/delete; **summary endpoint** returning totals by category and monthly trend (use MongoDB aggregation); show a simple visual breakdown in the UI.
4. **Local services directory** — browse/search providers (filter by trade, search by keyword/city); provider detail with average rating + reviews; add a 1–5 review (recompute the provider's average); request a booking (status: requested); list "my bookings".
5. **Dashboard** — upcoming/overdue maintenance at a glance + a spending snapshot (total + top categories); pull-to-refresh.

> Out of scope for v1 (do NOT build, but leave the data models extensible): community forum, DIY guides, inspiration gallery, emergency resources, in-app payments, push notifications, smart-home integration.

## Data models
- **User**: name, email (unique, lowercased), passwordHash (select:false), home { nickname, type, sizeSqFt, yearBuilt, address, city, state, postalCode }, timestamps. Methods: setPassword, comparePassword; strip passwordHash in toJSON.
- **MaintenanceTask**: user(ref), title, notes, category(enum), dueDate, recurrence(enum), priority(low/medium/high), status(pending/done/skipped), completedAt. Method to compute next due date from recurrence.
- **Expense**: user(ref), description, amount(min 0), currency(default USD), category(enum), date, relatedTask(ref optional).
- **ServiceProvider**: name, trade(enum), phone, email, city, state, description, avgRating, reviewCount, reviews[{ user, authorName, rating 1–5, comment }]. Method to recompute rating summary.
- **Booking**: user(ref), provider(ref), scheduledFor, notes, status(requested/confirmed/completed/cancelled).

## API endpoints
```
POST   /api/auth/register            POST /api/auth/login
GET    /api/auth/me                  PATCH /api/auth/me
GET    /api/maintenance              POST /api/maintenance
PATCH  /api/maintenance/:id          DELETE /api/maintenance/:id
POST   /api/maintenance/:id/complete
GET    /api/expenses                 GET  /api/expenses/summary
POST   /api/expenses                 PATCH/DELETE /api/expenses/:id
GET    /api/services                 GET  /api/services/:id
POST   /api/services/:id/reviews     POST /api/services/:id/book
GET    /api/services/bookings/mine
GET    /api/health
```
Public: register, login, services browse/detail, health. Everything else requires auth.

## Frontend screens
Login, Signup, Dashboard, Maintenance (with add/complete/delete + a create modal), Expenses (with summary bars + add/delete modal), Services (search/filter + book + reviews), Profile (edit + logout). Use a small shared UI kit (Card, Button, Field, Pill, Empty) and a single color theme. Bottom-tab navigation once authenticated; auth stack when logged out. The Axios client must read the API base URL from `app.json` `extra.apiBaseUrl` and attach the JWT automatically.

## Seed data
Add `npm run seed` that creates a demo user `demo@homelog.app` / `password123` with sample maintenance tasks, expenses across categories, and ~5 service providers with reviews.

## Acceptance criteria — verify ALL before finishing
- `cd backend && npm install && npm test` passes (health returns ok, unknown route 404s, a protected route without a token returns 401).
- Backend starts with `npm run dev`; `curl http://localhost:5000/api/health` returns `{"status":"ok"}`.
- `npm run seed` populates demo data without errors.
- `cd frontend && npm install && npx expo start` boots with no Metro errors; the app compiles for web (`w`).
- Logging in as the demo user shows real seeded tasks, expenses (with category totals), and providers.
- Completing a recurring task creates a new future task. Adding an expense updates the category summary.

## How to work
1. Scaffold both apps and install dependencies.
2. Implement backend (models → middleware → controllers → routes → seed → tests), then run the tests and fix failures.
3. Implement frontend (theme → api client → auth context → navigation → screens), then start Expo and resolve any compile errors.
4. Run through the acceptance criteria, fix anything that fails, and only then summarize.
5. Keep code clean and commented where non-obvious. Use environment variables for secrets (`MONGO_URI`, `JWT_SECRET`); never hardcode them.

Pin compatible versions for Expo SDK 51: react-native 0.74.x, @react-navigation v6, @react-native-async-storage/async-storage 1.23.x, react-native-screens 3.31.x, react-native-safe-area-context 4.10.x, expo-constants ~16. If MongoDB isn't installed locally, tell me how to install it or use a MongoDB Atlas connection string.

Start now. If you must make an assumption, state it briefly and proceed rather than stopping to ask.
