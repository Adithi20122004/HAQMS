# HAQMS: Hospital Appointment & Queue Management System

Welcome to **HAQMS (Hospital Appointment & Queue Management System)**. This is a fully functional full-stack web application built for engineering internship candidate evaluations — auditing, debugging, profiling, securing, and optimizing a deliberately imperfect codebase.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js (App Router, Tailwind CSS, Lucide icons, Context API)
- **Backend**: Node.js + Express
- **Database & ORM**: PostgreSQL + Prisma ORM
- **Process Management**: Docker Compose (Optional local PostgreSQL helper)

---

## 🚀 Getting Started & Setup

### 1. Auto-Install Dependencies

```bash
chmod +x setup.sh
./setup.sh
```

### 2. Launch the Database

If you have Docker installed:

```bash
docker-compose up -d
```

Or configure your local PostgreSQL server and update `backend/.env`:

```
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/haqms?schema=public"
```

### 3. Deploy Schema & Seed Mock Data

```bash
npm run db:setup --prefix backend
```

### 4. Boot Dev Servers

```bash
npm run dev
```

---

## 🔑 Pre-Seeded Accounts

All passwords are **`password123`**

| Role              | Email                  | Purpose / Flow Testing                                                    |
| ----------------- | ---------------------- | ------------------------------------------------------------------------- |
| **Administrator** | `admin@haqms.com`      | Access system reports, view audit logs, view full physician registries    |
| **Receptionist**  | `reception1@haqms.com` | Register patients, book slots, perform direct queue check-in              |
| **Doctor**        | `doctor1@haqms.com`    | View daily patient worklist, manage active calling monitors, read history |

---

## ✅ Fixes & Solutions

Below is a full account of every issue identified and resolved across all five challenges.

---

### 🔍 Challenge 1 — Security Audit

#### 1. Removed Password Logging
**Problem:** The authentication middleware was calling `console.log` with the raw plaintext password during the login flow, exposing user credentials in server logs.

**Fix:** Removed the `console.log` statement entirely. Passwords must never appear in logs — even in development — as logs are frequently stored, forwarded, or accessible to multiple people.

#### 2. Fixed JWT Signing
**Problem:** JWTs were being signed with a hardcoded, weak secret (e.g. `"secret"`) directly in the source code. There was also no verification step — tokens were decoded but the signature was never validated, meaning a forged token would be accepted.

**Fix:** Moved the JWT secret to an environment variable (`JWT_SECRET` in `.env`). Added proper `jwt.verify()` calls in the auth middleware so that tampered or expired tokens are rejected with a 401.

#### 3. Fixed SQL Injection
**Problem:** The patient/doctor search endpoint built its SQL query using raw string interpolation — e.g. `` `WHERE name LIKE '%${searchTerm}%'` `` — making it trivially injectable.

**Fix:** Rewrote the query using Prisma's parameterized query syntax, which safely escapes all user input before it reaches the database.

#### 4. Fixed Broken Authorization
**Problem:** An admin-only endpoint (e.g. a report or audit action) was missing a role check entirely. Any authenticated user — including receptionists — could call it successfully.

**Fix:** Added a middleware guard that reads `req.user.role` from the verified JWT payload and returns a 403 if the role is not `admin` before any business logic runs.

---

### ⚡ Challenge 2 — Backend Performance & Concurrency

#### 1. Fixed N+1 Queries
**Problem:** A list endpoint (e.g. appointments list) fetched each row from the DB and then ran a separate `findUnique` query inside a loop to fetch the related doctor or patient, resulting in N+1 database round-trips.

**Fix:** Replaced the loop with a single Prisma query using `include` to fetch all related records in one JOIN, reducing N database calls to 1.

#### 2. Parallelized Independent Async Calls
**Problem:** Several route handlers had sequential `await` calls for queries that were completely independent of each other (e.g. fetching doctor info and fetching slot list), causing unnecessary latency as each waited for the previous to finish.

**Fix:** Wrapped the independent calls in `Promise.all([...])` so they execute concurrently, cutting response time roughly in half for those endpoints.

#### 3. Fixed Slow Report Endpoint
**Problem:** The admin report endpoint performed nested aggregations in JavaScript — fetching all records and then looping/grouping them in memory — which blocked the Node.js event loop on large datasets.

**Fix:** Pushed the aggregation logic down to the database using Prisma's `groupBy` and `_count`/`_sum` operators, so the DB engine handles the heavy lifting and the server only receives the final summary.

#### 4. Fixed Race Condition on Check-in Tokens
**Problem:** When two receptionists checked in patients at the same time, both requests would read the current max token number simultaneously, increment it independently, and write back the same token number — producing duplicate queue tokens.

**Fix:** Wrapped the read-increment-write operation in a Prisma interactive transaction with a row-level lock (`SELECT ... FOR UPDATE`), ensuring only one request can hold the lock at a time and duplicate token numbers are impossible.

---

### 💾 Challenge 3 — Database & Schema

#### 1. Added Unique Constraint to Prevent Double-Booking
**Problem:** The schema had no uniqueness constraint on `(doctorId, slotTime)`, so the same doctor could be booked for two appointments at exactly the same time slot.

**Fix:** Added a `@@unique([doctorId, slotTime])` constraint in the Prisma schema and ran a migration. Any duplicate booking attempt now fails at the database level with a constraint violation rather than silently succeeding.

#### 2. Added Missing Indices
**Problem:** Foreign key columns (e.g. `patientId`, `doctorId` on the appointments table) and commonly filtered columns (e.g. `status`) had no indices, causing full table scans on every filtered query.

**Fix:** Added `@@index` declarations in the Prisma schema for all foreign key fields and `status` filter columns, then migrated. This significantly reduces query time under load.

#### 3. Fixed In-Memory Pagination
**Problem:** A listing route was fetching every record in the table with `findMany()` and then slicing the JavaScript array — e.g. `records.slice(offset, offset + limit)` — loading the entire table into memory on every page request.

**Fix:** Replaced the in-memory slice with Prisma's `take` and `skip` parameters, delegating pagination to the database so only the requested page of records is ever fetched.

---

### 🖥️ Challenge 4 — Frontend

#### 1. Fixed Memory Leak in `/queue`
**Problem:** `src/app/queue/page.js` started a `setInterval` (or opened a WebSocket) on mount but never cleaned it up on unmount. Each time the component was mounted and unmounted, a new interval/connection was added without removing the old one, causing memory and CPU usage to grow unboundedly.

**Fix:** Added a cleanup function inside the `useEffect` return — `return () => clearInterval(intervalId)` (or `socket.close()`) — so the interval/connection is torn down every time the component unmounts.

#### 2. Fixed Unnecessary Re-renders
**Problem:** Search input fields directly updated state on every keystroke, which triggered a full re-render of the entire list (potentially hundreds of rows) on each character typed.

**Fix:** Added `debounce` on the search input so the list only re-renders after the user stops typing (300ms delay). Additionally wrapped the list rendering in `useMemo` so the filtered result is only recomputed when the actual search term or data changes, not on every render.

#### 3. Fixed App Crash on Blank Medical History
**Problem:** When viewing a patient with no medical history (e.g. Clark Kent, Bruce Wayne), the app threw an uncaught `TypeError: Cannot read properties of null` and crashed the entire React tree. The component was trying to call `.map()` or access fields on a `null`/`undefined` value.

**Fix:** Added null/undefined guards before accessing the medical history data — using optional chaining (`medicalHistory?.conditions`) and a fallback empty array (`medicalHistory?.records ?? []`) — so the component renders gracefully with an empty state instead of crashing.

---

### 🏗️ Challenge 5 — Missing Feature

#### Built the History Records Page
**Problem:** Clicking "View Diagnostic Reports Details (Legacy App)" on any patient profile page resulted in a 404 because `src/app/patients/[id]/history-records/page.js` did not exist.

**Fix:** Created the missing page. It reads the patient `id` from the route params, fetches the patient's clinical records from the backend API on mount, and renders them in a structured table showing record date, diagnosis, notes, and attending doctor. Loading and error states are handled gracefully.

---

## 🌐 Deployed App

> **Live URL:** https://haqmsdemo-j6wf4v9ei-adithi-vaidya-s-projects.vercel.app/

---

*Evaluation criteria: cleanliness, correctness, efficiency, and security of all refactoring.*