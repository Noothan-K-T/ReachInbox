# ReachInbox Email Scheduler

A distributed email job scheduling service and dashboard designed for outbound outreach workflows. Built with Node.js/Express, TypeScript, BullMQ, Redis, PostgreSQL, Elasticsearch, and React.

---

## Architectural Overview

Cold email platforms require dependable execution at scale, avoiding provider rate limits, surviving unexpected server restarts, and preventing accidental duplicate deliveries.

```
                  ┌───────────────────────────────┐
                  │   React + Vite SPA Dashboard   │
                  └───────────────┬───────────────┘
                                  │ REST
                                  ▼
                  ┌───────────────────────────────┐
                  │    Express API (TypeScript)   │
                  └──────┬────────────────┬───────┘
                         │                │
            ┌────────────┴────┐     ┌─────┴─────────────┐
            ▼                 ▼     ▼                   ▼
    ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
    │  PostgreSQL   │ │     Redis     │ │ Elasticsearch │ │     Slack     │
    │  (Prisma ORM) │ │ (BullMQ Queue)│ │ (Fuzzy Search)│ │ (Webhooks API)│
    └───────────────┘ └───────┬───────┘ └───────────────┘ └───────────────┘
                              │
                              ▼
                  ┌───────────────────────┐
                  │ BullMQ Worker Process │
                  │  - Idempotency check  │
                  │  - Hourly rate limit  │
                  │  - Min spacing delay  │
                  └───────────┬───────────┘
                              │
                              ▼
                  ┌───────────────────────┐
                  │ Ethereal SMTP Server  │
                  └───────────────────────┘
```

### Core Components
- **API Server (`backend/src/app.ts`)**: Handles Google OAuth authentication, email scheduling requests, CSV uploads, queue stats, and mounts the live BullMQ board.
- **BullMQ Queue & Worker (`emailQueue.ts`, `emailWorker.ts`)**: Manages delayed jobs in Redis. When an email is scheduled for a future time $T$, BullMQ schedules a delayed job with delay `scheduledAt - Date.now()`.
- **Relational Storage (PostgreSQL)**: Source of truth for users, senders, scheduled jobs, delivery timestamps, failure diagnostics, and Slack tokens.
- **Search Engine (Elasticsearch)**: Provides full-text and fuzzy search across email recipients, subjects, bodies, and sender addresses.
- **Web Dashboard (`frontend/`)**: React application styled with Tailwind, matching the Figma spec with real-time queue badges, schedule configuration modal, CSV recipient parsing, and sent logs.

---

## Key Technical Decisions

### 1. Queue-Driven Scheduling vs Polling Cron
Rather than running a `setInterval` or cron query like `SELECT * FROM emails WHERE scheduled_at <= NOW() AND status = 'SCHEDULED'`, this system uses **BullMQ delayed jobs**:
- **Zero Polling Overhead**: No repetitive database scans every few seconds.
- **Millisecond Precision**: Redis timers wake the worker precisely when the delay expires.
- **Horizontal Scalability**: Additional worker processes can be spun up across containers without causing duplicate query race conditions.

### 2. Restart Recovery & Crash Resilience
Job state is stored inside Redis sorted sets, not in Node.js process memory.
- If the server restarts or crashes, pending and delayed jobs stay intact in Redis.
- When the worker boots back up, it automatically reconnects and resumes queued jobs at their scheduled execution time.
- PostgreSQL tracks the business state (`SCHEDULED` -> `PROCESSING` -> `SENT` / `FAILED`).

### 3. Rate Limiting Strategy
Outbound SMTP providers enforce strict limits on both throughput and burst rates. We enforce three layers of control:
1. **Worker Concurrency (`WORKER_CONCURRENCY`)**: Limits the number of parallel jobs processed simultaneously by a worker instance.
2. **Minimum Inter-Email Delay (`EMAIL_MIN_DELAY_MS`)**: Enforces a throttling pause between subsequent SMTP transmissions.
3. **Hourly Rate Window (`MAX_EMAILS_PER_HOUR`)**: Uses atomic Redis increment keys (`rate:email:{senderId}:{YYYY-MM-DDTHH}`). If a sender exhausts their quota:
   - The job is **not dropped or marked failed**.
   - The worker calculates the remaining milliseconds until the next hour window and re-delays the job using BullMQ's `moveToDelayed()`.
   - An asynchronous notification is dispatched to the user's connected Slack webhook.

### 4. Idempotency Protection
To guard against network retries or worker restarts executing the same email twice:
- Each email record generates a unique `idempotencyKey` derived from the batch and payload.
- PostgreSQL enforces a `UNIQUE` constraint on `idempotencyKey`.
- Before sending, the worker performs an atomic status check. If the record is already `SENT`, it terminates early.

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Docker Desktop (for Postgres, Redis, and Elasticsearch)

### 1. Clone and Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Start Infrastructure via Docker Compose

From the root directory:
```bash
docker compose up -d
```
This boots:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`
- Elasticsearch on `localhost:9200`

### 3. Database Setup

```bash
cd backend
npx prisma db push
npm run db:seed
```
The seed command initializes demo outreach emails, an Ethereal SMTP test sender, and sample scheduled records.

### 4. Running Locally

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```
Backend API will listen on `http://localhost:3001`.  
BullMQ Live Monitoring Board is available at `http://localhost:3001/admin/queues`.

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Testing & Verification Walkthrough

1. **Quick Evaluation Login**:
   - On `http://localhost:5173/login`, click **⚡ 1-Click Demo Login (Test Mode)** to immediately enter the dashboard with preconfigured credentials and test senders.
   - (Optional) Sign in via Google OAuth once your GCP credentials are added to `backend/.env`.

2. **Scheduling Outbound Emails**:
   - Click the **Compose** button in the sidebar or header.
   - Enter one or more recipient emails (or upload a `.csv` file).
   - Provide a subject and email body.
   - Under **Send Later**, pick a future schedule time, set inter-email delay (e.g., 2 seconds), and submit.
   - Check the **Scheduled** tab to see your pending emails.

3. **Verifying Queue Execution**:
   - Navigate to `http://localhost:3001/admin/queues`.
   - You can watch the job transition from `delayed` -> `active` -> `completed`.
   - Once executed, the email shifts to the **Sent** tab in the dashboard, showing the generated Ethereal test inbox link.

4. **Testing Crash Recovery**:
   - Schedule an email 3 minutes in the future.
   - Stop the backend process (`Ctrl+C`).
   - Wait 1 minute and restart (`npm run dev`).
   - The worker resumes from Redis and sends the email on schedule.

5. **Testing Rate Limiting**:
   - Set `MAX_EMAILS_PER_HOUR=2` in `backend/.env` and restart the backend.
   - Schedule 4 emails at the same timestamp.
   - The first 2 send immediately; the remaining 2 are re-delayed to the next hourly window, preserving queue integrity.

---

## API Summary

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/dev-login` | POST | 1-click test login for review/evaluation |
| `/api/auth/google` | GET | Initiates Google OAuth consent flow |
| `/api/auth/me` | GET | Returns authenticated user details |
| `/api/emails/schedule` | POST | Enqueues and schedules a batch of emails |
| `/api/emails/upload-csv` | POST | Extracts and deduplicates emails from uploaded CSV |
| `/api/emails/scheduled` | GET | Paginated list of upcoming scheduled jobs |
| `/api/emails/sent` | GET | Paginated list of successfully sent emails |
| `/api/emails/search?q=` | GET | Elasticsearch full-text fuzzy query |
| `/api/emails/senders/list` | GET | Fetches active SMTP senders for current user |
| `/api/queue/stats` | GET | Real-time BullMQ queue metrics (waiting, active, delayed) |
| `/api/slack/connect` | GET | Generates Slack OAuth authorization link |
| `/api/health` | GET | Service heartbeat endpoint |
