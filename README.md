# StudyHub API

The backend service for **StudyHub** — a collaborative academic platform where students share lecture notes, past papers, and course resources, plan their studies, earn reputation, and climb a community leaderboard.

This is a [NestJS](https://nestjs.com/) (v11) REST + WebSocket API backed by PostgreSQL, Redis, and Cloudflare R2 object storage.

It powers two clients:

| Client | Repo | Stack |
| --- | --- | --- |
| Web | `Studyhub-web` | Next.js (deployed on Vercel) |
| Mobile | `studyhub-app` | Expo / React Native |

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database & migrations](#database--migrations)
- [NPM scripts](#npm-scripts)
- [Authentication](#authentication)
- [Roles & permissions](#roles--permissions)
- [File storage (Cloudflare R2)](#file-storage-cloudflare-r2)
- [Real-time (WebSocket)](#real-time-websocket)
- [Background jobs & caching](#background-jobs--caching)
- [API reference](#api-reference)
- [Deployment](#deployment)
- [Testing](#testing)

---

## Features

- **Auth** — email/password registration with **OTP email verification**, JWT **access + refresh** tokens, refresh-token rotation, multi-device sessions, "log out everywhere", password reset by OTP.
- **Notes** — upload, browse, search, trending, reactions, ratings/reviews, view & download counters, moderation queue (pending → approved/rejected).
- **Resources** — official/academic course materials, grouped by course, trending, moderation.
- **Reviews & ratings** — star ratings and threaded comments on notes, with likes/dislikes and mentions.
- **Reputation & leaderboard** — points for contributions, monthly leaderboard, best-rank tracking.
- **Bookmarks & follows** — save notes/resources, follow other users.
- **Notifications** — in-app notifications over WebSocket + **Expo push notifications** to the mobile app.
- **App releases** — admins upload Android (`.apk`) / iOS (`.ipa`) builds (stored in R2) with versioning, release notes, and download counts, surfaced on the landing page.
- **Real-time presence** — track which accounts are online right now, separated by client (**web / android / ios**).
- **Activity tracking** — per-user last-active timestamp and last-active client platform; daily and live active-user views.
- **Admin** — platform stats, analytics, user management (ban/role), settings, moderator permission toggles, theme configuration.
- **Cross-cutting** — Redis caching, BullMQ background jobs, rate limiting (Throttler), Helmet security headers, Sentry error tracking, global validation & exception filters.

---

## Tech stack

| Concern | Technology |
| --- | --- |
| Framework | NestJS 11 (Express platform) |
| Language | TypeScript |
| Database | PostgreSQL via TypeORM 0.3 |
| Cache / pub-sub | Redis (ioredis) |
| Background jobs | BullMQ (`@nestjs/bullmq`) |
| Realtime | Socket.IO (`@nestjs/websockets`) |
| Auth | Passport JWT (`passport-jwt`), bcrypt |
| Object storage | Cloudflare R2 via AWS S3 SDK v3 + presigned URLs |
| Email | Nodemailer + Gmail OAuth2 (googleapis) |
| Push | `expo-server-sdk` |
| Validation | class-validator / class-transformer |
| Scheduling | `@nestjs/schedule` |
| Monitoring | Sentry (`@sentry/nestjs`) |
| Testing | Jest, Supertest (SQLite in-memory for tests) |

---

## Architecture

```
                 ┌──────────────┐        ┌──────────────┐
   Web (Vercel)  │              │  REST  │              │
   App (Expo) ───┤  StudyHub    ├────────┤  PostgreSQL  │
                 │     API      │        └──────────────┘
                 │  (NestJS)    │        ┌──────────────┐
   Socket.IO ────┤              ├────────┤    Redis     │ cache + BullMQ
                 │              │        └──────────────┘
                 └──────┬───────┘        ┌──────────────┐
                        └────────────────┤ Cloudflare R2│ files (presigned)
                                         └──────────────┘
```

- **Direct-to-R2 uploads**: the client asks the API for a presigned `PUT` URL (`/storage/upload-url`), uploads the file straight to R2, then saves the returned object key on the relevant record. Files never stream through the API.
- **Realtime**: clients open an authenticated Socket.IO connection (JWT in the handshake). Used for notifications and admin live presence/active-user feeds.
- **Tests** run against an in-memory SQLite DB (`NODE_ENV=test`); dev/production use PostgreSQL with migrations (`synchronize: false`).

---

## Project structure

```
src/
├── main.ts                 # Bootstrap: Helmet, CORS, cookies, global pipes/filters, port 3001
├── instrument.ts           # Sentry init (imported first)
├── app.module.ts           # Root module: TypeORM, Redis, BullMQ, Throttler wiring
├── data-source.ts          # TypeORM CLI datasource (migrations)
├── auth/                   # Register, OTP verify, login, refresh, sessions, JWT strategies, guards
├── users/                  # Users, profiles, leaderboard, activity/presence tracking
├── notes/                  # Notes CRUD, reactions, trending, moderation
├── resources/              # Academic resources CRUD, courses, trending, moderation
├── reviews/                # Ratings, comments, likes
├── bookmarks/              # Saved notes/resources
├── follows/                # Follow graph
├── notifications/          # In-app notifications + push-tokens/ (Expo push)
├── app-releases/           # Android/iOS build uploads + download counts
├── storage/                # Cloudflare R2 presigned URLs, object proxy, CORS setup, cleanup
├── admin/                  # Stats, analytics, settings, permissions
├── websocket/              # Socket.IO gateway, presence service
├── mail/                   # Nodemailer (Gmail OAuth2) — OTP & notification emails
├── queue/                  # BullMQ queues (moderation, etc.)
├── redis/                  # Redis service (cache wrap, invalidation)
├── health/                 # Health/readiness endpoint
├── common/                 # Guards, filters, pagination, repositories, constants, events
└── migrations/             # TypeORM migrations (run manually)
```

---

## Getting started

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Redis 6+
- A Cloudflare R2 bucket (+ S3 API credentials)
- A Gmail account with OAuth2 credentials (for sending OTP / emails)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Create your .env (see "Environment variables" below)

# 3. Create the database schema
npm run migration:run

# 4. Start in watch mode
npm run start:dev
```

The API listens on **`http://localhost:3001`** by default (override with `PORT`).

> **Note:** `synchronize` is **off** for PostgreSQL — you must run `npm run migration:run` after pulling new migrations, or the new columns/tables won't exist and related queries will 500.

---

## Environment variables

Create a `.env` in the project root.

### Core

| Variable | Description | Example / default |
| --- | --- | --- |
| `PORT` | HTTP port | `3001` |
| `NODE_ENV` | `development` \| `production` \| `test` | `development` |
| `FRONTEND_URL` | Web origin(s) for CORS & R2 bucket CORS. **Comma-separated list supported.** | `https://studyhubbd.vercel.app` |

### Database (use `DATABASE_URL` **or** the discrete vars)

| Variable | Description |
| --- | --- |
| `DATABASE_TYPE` | `postgres` (default) or `sqlite` |
| `DATABASE_URL` | Full Postgres connection string (takes precedence) |
| `DATABASE_HOST` / `DATABASE_PORT` | Host / port |
| `DATABASE_USERNAME` / `DATABASE_PASSWORD` | Credentials |
| `DATABASE_NAME` | Database name |
| `DATABASE` | SQLite file path (test only, e.g. `:memory:`) |

### Auth

| Variable | Description |
| --- | --- |
| `JWT_ACCESS_SECRET` | Access-token signing secret |
| `JWT_REFRESH_SECRET` | Refresh-token signing secret |
| `JWT_ACCESS_EXPIRATION` | Access token TTL (e.g. `15m`) |
| `JWT_REFRESH_EXPIRATION` | Refresh token TTL (e.g. `7d`) |
| `BCRYPT_SALT_ROUNDS` | Password hashing cost (e.g. `10`) |
| `OTP_EXPIRATION_MINUTES` | OTP validity window |
| `SESSION_DURATION_DAYS` | Session lifetime |

### Redis

| Variable | Description |
| --- | --- |
| `REDIS_URL` | Full Redis URL (takes precedence) |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | Discrete config |

### Cloudflare R2 (S3 API)

| Variable | Description |
| --- | --- |
| `R2_ENDPOINT` | R2 S3 endpoint URL |
| `R2_ACCESS_KEY_ID` | Access key |
| `R2_SECRET_ACCESS_KEY` | Secret key |
| `R2_BUCKET` | Bucket name |
| `R2_PUBLIC_URL` | Public base URL for objects (e.g. `https://pub-xxxx.r2.dev`) |

### Mail (Gmail OAuth2)

| Variable | Description |
| --- | --- |
| `MAIL_USER` | Sending Gmail address |
| `MAIL_FROM` | "From" header |
| `MAIL_CLIENT_ID` / `MAIL_CLIENT_SECRET` | Google OAuth2 client |
| `MAIL_REFRESH_TOKEN` | Google OAuth2 refresh token |

### Rate limiting & monitoring

| Variable | Description |
| --- | --- |
| `THROTTLE_TTL` | Rate-limit window |
| `THROTTLE_LIMIT` | Max requests per window |
| `SENTRY_DSN` | Sentry DSN (disabled if unset) |
| `SENTRY_TRACES_SAMPLE_RATE` | Tracing sample rate (e.g. `0.1`); `0` = off |

---

## Database & migrations

TypeORM CLI is wired through `src/data-source.ts`. PostgreSQL runs with `synchronize: false`, so schema changes are applied via migrations.

```bash
# Apply all pending migrations
npm run migration:run

# Generate a migration from entity changes
npm run migration:generate src/migrations/MyChange

# Revert the last migration
npm run migration:revert
```

### Tables

`users`, `sessions`, `pending_users`, `notes`, `note_reactions`, `resources`, `reviews`, `review_likes`, `bookmarks`, `follows`, `notifications`, `push_tokens`, `settings`, `app_releases`

### Migration history

```
1780311339702-InitialSchema
1780312313548-AddPerformanceIndexes
1780914740824-AddRejectedAtToNotes
1781194182339-AddViewsToNotes
1781350406657-AddPushTokensTable
1781360459184-AddMentionedUserIdToReviews
1781400000000-CreateFollows
1781450000000-AddBestRankToUsers
1781460000000-AddBestRankPointsToUsers
1781470000000-CreateAppReleases
1781480000000-AddDownloadsToAppReleases
1781490000000-AddLastActivePlatformToUsers
```

---

## NPM scripts

| Script | Purpose |
| --- | --- |
| `npm run start:dev` | Start with hot-reload |
| `npm run start:debug` | Start with debugger + watch |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run compiled build (`node dist/main.js`) |
| `npm run lint` | ESLint (with `--fix`) |
| `npm run format` | Prettier |
| `npm test` / `test:watch` / `test:cov` | Unit tests |
| `npm run test:e2e` | End-to-end tests |
| `npm run migration:run` / `generate` / `revert` | Migrations |

---

## Authentication

JWT-based with access + refresh tokens.

1. **Register** (`POST /auth/register`) → creates a `pending_users` record and emails a 6-digit OTP.
2. **Verify** (`POST /auth/verify-email`) → validates the OTP, promotes to a real `users` row.
3. **Login** (`POST /auth/login`) → returns an **access token** and a **refresh token**; a `sessions` row is created.
4. **Authenticated requests** send `Authorization: Bearer <access_token>`.
5. **Refresh** (`POST /auth/refresh`) → rotates tokens when the access token expires.
6. **Logout** (`POST /auth/logout`) ends the session; **logout-all** ends every session for the user.
7. **Password reset** via `POST /auth/forgot-password` → OTP → `POST /auth/reset-password`.

Clients also send an **`X-Client-Platform`** header (`web` | `android` | `ios`) so the API records each user's last-active platform.

> Routes are protected with `JwtAuthGuard`; role-restricted routes add `RolesGuard` + `@Roles(...)`. Public routes are marked with `@Public()`.

---

## Roles & permissions

Three roles (`UserRole`): **student**, **moderator**, **admin**.

- **student** — default; upload/browse/contribute.
- **moderator** — moderation queues + selected admin views (gated by toggleable settings, e.g. `perm_view_active_users`).
- **admin** — full access: user management, analytics, settings, app releases, online presence.

Moderator capabilities are configurable by admins through `settings` (`/admin/permissions`).

---

## File storage (Cloudflare R2)

Uploads go **directly from the client to R2** using presigned URLs:

1. `POST /storage/upload-url` → `{ uploadUrl, publicUrl }` (publicUrl is the raw object key).
2. Client `PUT`s the file to `uploadUrl`.
3. Client saves the key on the record (e.g. note `file_path`, or `POST /app-releases`).
4. Public access uses `R2_PUBLIC_URL` + key, or the proxy `GET /storage/object?key=...`.

### Browser CORS

Because browsers upload straight to R2, the **bucket** must allow your web origin. `StorageService.setupCors()` configures it with `localhost` dev origins, the production Vercel origin, and any origins in `FRONTEND_URL` (comma-separated). Apply it once after deploy / origin change:

```bash
curl -X POST https://<api-host>/storage/cors-setup
```

App-release builds are stored under the key prefix: `apks/{platform}/{version}/{filename}`.

---

## Real-time (WebSocket)

Socket.IO gateway (default namespace). Authenticate by passing the access token (and platform) in the handshake:

```js
io(API_URL, { auth: { token: accessToken, platform: 'web' } }); // 'web' | 'android' | 'ios'
```

On connect, the socket joins `user:{id}` (and `moderators` for staff) and is registered in the **presence** registry by platform.

**Server → client events**

| Event | Audience | Payload |
| --- | --- | --- |
| `notification:new` | the user | new notification |
| `live-users:updated` | moderators/admins | users active in the last 5 min |
| `online-presence:updated` | moderators/admins | online users grouped by `web` / `android` / `ios` |

Presence is in-memory (single instance). For multi-instance deployments, add the Socket.IO Redis adapter.

---

## Background jobs & caching

- **BullMQ** (Redis-backed) runs async work such as moderation processing (`queue/`). Job status: `GET /moderation/jobs/status`.
- **Redis** caches hot reads (leaderboard, active users, listings) with pattern-based invalidation on writes.
- **Scheduling** (`@nestjs/schedule`) drives periodic tasks (e.g. cleanup, live pushes).

---

## API reference

Base URL: `http://localhost:3001` (dev) · `https://studyhub-api-a7ou.onrender.com` (prod).
All routes require a Bearer access token unless marked **Public**.

### Health
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/` | Public — hello |
| GET | `/health` | Public — readiness |

### Auth — `/auth`
| Method | Path | Notes |
| --- | --- | --- |
| POST | `/auth/register` | Public — start signup, sends OTP |
| POST | `/auth/verify-email` | Public — confirm OTP |
| POST | `/auth/login` | Public — returns tokens |
| POST | `/auth/refresh` | Public — rotate tokens |
| POST | `/auth/logout` | End current session |
| POST | `/auth/logout-all` | End all sessions |
| GET | `/auth/me` | Current user |
| POST | `/auth/forgot-password` | Public — send reset OTP |
| POST | `/auth/reset-password` | Public — set new password |

### Users — `/users`
| Method | Path | Notes |
| --- | --- | --- |
| POST | `/users` | Create user (admin) |
| GET | `/users` | List users (admin/permission) |
| GET | `/users/:id` | Get user |
| GET | `/users/:id/public-profile` | Public profile |
| PATCH | `/users/profile` | Update own profile |
| PATCH | `/users/:id` | Update user (admin) |
| DELETE | `/users/:id` | Delete user (admin) |
| GET | `/users/leaderboard` | Reputation leaderboard |
| GET | `/users/active` | Daily active users |
| GET | `/users/active/now` | Currently-active users (live) |
| POST | `/users/:id/ban` · `/unban` | Ban / unban (admin) |
| POST | `/users/:id/promote` · `/demote` | Change role (admin) |

### Notes — `/notes`
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/notes` | Browse / search (paginated) |
| POST | `/notes` | Create note |
| GET | `/notes/my-notes` | Own uploads |
| GET | `/notes/trending` | Trending |
| GET | `/notes/pending` | Moderation queue |
| GET | `/notes/:id` | Detail |
| PATCH | `/notes/:id` | Update |
| PATCH | `/notes/:id/status` | Approve/reject (moderation) |
| DELETE | `/notes/:id` | Delete |
| POST | `/notes/:id/view` · `/download` | Increment counters |
| POST/GET | `/notes/:id/reactions` | Add / list reactions |

### Resources — `/resources`
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/resources` | Browse |
| GET | `/resources/courses` | Grouped by course |
| GET | `/resources/trending` | Trending |
| GET | `/resources/admin/pending` | Moderation queue |
| GET | `/resources/:id` | Detail |
| POST | `/resources` | Create |
| PATCH | `/resources/:id` · `/:id/status` | Update / moderate |
| POST | `/resources/:id/download` | Increment downloads |
| DELETE | `/resources/:id` | Delete |

### Reviews — `/reviews`
| Method | Path | Notes |
| --- | --- | --- |
| POST | `/reviews/note/:noteId/rate` | Rate a note |
| POST | `/reviews/note/:noteId/comment` | Comment |
| GET | `/reviews/note/:noteId` · `/me` | List / own review |
| POST | `/reviews/:id/like` · `/dislike` | React to a review |
| PUT | `/reviews/:id` | Edit |
| DELETE | `/reviews/:id` · `/note/:noteId` | Delete |

### Bookmarks — `/bookmarks`
`POST /bookmarks`, `POST /bookmarks/toggle`, `GET /bookmarks`, `DELETE /bookmarks/:id`

### Follows — `/follows`
`GET /follows/:userId/status|followers|following`, `POST /follows/:userId | /:userId/toggle`, `DELETE /follows/:userId`

### Notifications — `/notifications`
`GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/read-all`, `PATCH /notifications/:id/read`, `DELETE /notifications/:id`

### Push tokens — `/push-tokens`
`POST /push-tokens` (register device), `DELETE /push-tokens`

### App releases — `/app-releases`
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/app-releases` | Public — list builds |
| POST | `/app-releases/:id/download` | Public — count a download |
| POST | `/app-releases` | Admin — register a build |
| PATCH | `/app-releases/:id` | Admin — edit version/notes |
| DELETE | `/app-releases/:id` | Admin — delete build + R2 file |

### Storage — `/storage`
| Method | Path | Notes |
| --- | --- | --- |
| POST | `/storage/upload-url` | Presigned PUT URL |
| DELETE | `/storage/objects` | Delete object |
| GET | `/storage/object?key=` | Public — proxy/stream object |
| POST | `/storage/cors-setup` | Public — (re)apply bucket CORS |

### Admin — `/admin` (admin only)
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/admin/stats` | Platform stats |
| GET | `/admin/active-users` | Active users |
| GET | `/admin/online-users` | Live presence by web/android/ios |
| GET | `/admin/report` | Summary report |
| GET / POST | `/admin/settings/:key` · `/settings` | Read / write settings |
| GET / PATCH | `/admin/permissions` · `/permissions/:key` | Moderator permissions |
| GET | `/admin/analytics/overview\|users\|activity\|content` | Analytics |

### Moderation — `/moderation`
`GET /moderation/jobs/status` — BullMQ job status.

---

## Deployment

Deployed on **Render** (API) with **Vercel** (web). Build/run:

```bash
npm run build        # -> dist/
npm run start:prod   # node dist/main.js
```

Production checklist:

1. Set all environment variables (DB, Redis, R2, JWT secrets, mail, `FRONTEND_URL`, `SENTRY_DSN`).
2. Run `npm run migration:run` against the production database.
3. Hit `POST /storage/cors-setup` once so R2 allows the production web origin.
4. `dns.setDefaultResultOrder('ipv4first')` is set in `main.ts` to avoid `ENETUNREACH` on Render.

---

## Testing

```bash
npm test          # unit tests (Jest)
npm run test:cov  # coverage
npm run test:e2e  # e2e
```

Tests run against an in-memory SQLite database (`NODE_ENV=test`, `synchronize: true`), so no external services are required.

---

## License

UNLICENSED — private project.
