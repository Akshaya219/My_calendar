# StudySync

> **Your personal command center for GATE prep, DSA practice, placement planning, and budget tracking — built for B.Tech AI & DS final-year students.**

[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite)](https://vitejs.dev)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.x-38BDF8?logo=tailwindcss)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000?logo=vercel)](https://vercel.com)

---

## Features

### 📋 Calendar / Tasks
- Browse tasks by day with prev/next navigation
- Add tasks with **title, time, priority** (Low / Medium / High), **category**, and optional notes
- **Daily checklist** section pinned at the top
- Mark complete (checkbox with strikethrough), delete on hover
- **Reminder system** — set a time for a native browser push notification
- Filter: All · Pending · Completed
- Skeleton loading + empty state

### 📚 GATE Tracker
- Add topics under any subject (preset list + free-text)
- **Spaced repetition** — mark complete → auto-schedules revision on days 1, 4, 7, 30, 60
- **Confidence stars** (1–5) editable inline
- **Revision Queue** tab with red badge count for topics due today
- Tap "Revised ✓" → updates revision count + schedules next session
- Subject filter pills with progress %

### 💻 DSA Tracker
- **Daily target counters** — LeetCode + CodeChef +/− buttons, goal: 3/day
- Progress bar turns green when target met
- **Problem log** — platform, difficulty, topic, time taken, URL
- Difficulty breakdown stats (Easy / Medium / Hard)
- Search + difficulty filter
- Platform-coloured badges (LeetCode orange, GFG green, etc.)

### 💰 Finance
- Month selector (prev/next)
- **Set Budget** with per-category limits (JSON stored in Supabase)
- Add income / expense transactions with category + description
- **Budget progress bar** (colour-coded: indigo → amber → red)
- **Category breakdown** bars (pure CSS, no chart library)
- Running income / spent / remaining cards

### 🏠 Dashboard
- Greeting with time-of-day awareness
- 4 stat cards: Today's tasks, GATE revisions due, Task streak 🔥, Budget used %
- Task streak uses **consecutive days with ≥1 completed task** (correct calculation)
- Today's task list preview + GATE revision alerts

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend framework | React 19 + Vite 8 |
| Styling | TailwindCSS 4 (utility-first) |
| Icons | lucide-react |
| Backend / DB | Supabase (PostgreSQL + Auth) |
| Auth | Google OAuth + Email/Password |
| Notifications | Web Notifications API (native, no library) |
| Deployment | Vercel |

---

## Project Structure

```
src/
├── App.jsx                        # Root — session detection, notification init, routes
├── main.jsx                       # Entry — wraps app in <ToastProvider>
│
├── components/
│   ├── Layout.jsx                 # App shell — desktop top nav + mobile bottom nav
│   ├── ProtectedRoute.jsx         # Redirects unauthenticated users to /login
│   └── ui/
│       ├── Skeleton.jsx           # Skeleton, SkeletonCard, SkeletonRow
│       └── Toast.jsx              # ToastProvider + useToast() — auto-dismiss 3s
│
├── hooks/
│   └── useAuth.js                 # useAuth() — user, loading via onAuthStateChange
│
├── lib/
│   ├── supabase.js                # Supabase client (reads VITE_ env vars)
│   ├── spacedRepetition.js        # getNextRevisionDate(), markRevisionDone()
│   └── notifications.js           # requestPermission(), scheduleLocalReminder(),
│                                  # scheduleDailyMorningReminder(), scheduleUpcomingReminders()
│
└── pages/
    ├── Login.jsx                  # Google OAuth + Email/Password, sign-up toggle
    ├── Dashboard.jsx              # Summary cards, task preview, revision alerts
    ├── Tasks.jsx                  # Calendar tab — date-based task manager
    ├── GateTracker.jsx            # GATE tab — topics + revision queue
    ├── DSATracker.jsx             # DSA tab — daily targets + problem log
    └── Finance.jsx                # Finance tab — budget + transactions

supabase/migrations/
├── 001_tasks.sql
├── 002_gate_topics.sql
├── 003_dsa_problems.sql
└── 004_finance.sql
```

---

## Routes

| URL | Component | Description |
|---|---|---|
| `/` | → `/login` | Root redirect |
| `/login` | `Login.jsx` | Auth page |
| `/app` | `Dashboard.jsx` | Dashboard (default after login) |
| `/app/calendar` | `Tasks.jsx` | Calendar / task manager |
| `/app/tasks` | → `/app/calendar` | Alias redirect |
| `/app/gate` | `GateTracker.jsx` | GATE tracker |
| `/app/dsa` | `DSATracker.jsx` | DSA tracker |
| `/app/finance` | `Finance.jsx` | Finance manager |

---

## Database Schema (Supabase)

All tables have `user_id UUID REFERENCES auth.users(id)` and RLS enabled — users only see their own data.

### `tasks`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID | FK → auth.users |
| title | TEXT NOT NULL | |
| description | TEXT | |
| date | DATE NOT NULL | |
| time | TIME | |
| priority | TEXT | `low` \| `medium` \| `high` |
| category | TEXT | `placement` \| `gate` \| `dsa` \| `personal` \| `finance` |
| is_completed | BOOLEAN | default false |
| is_daily_checklist | BOOLEAN | default false |
| reminder_at | TIMESTAMPTZ | ISO timestamp for notification |
| reminder_sent | BOOLEAN | default false |
| created_at | TIMESTAMPTZ | |

### `gate_topics`
`subject · topic · is_completed · completed_at · next_revision_date · revision_count · revision_dates (JSONB) · confidence_level · notes`

### `dsa_problems`
`platform · problem_title · problem_url · difficulty · topic · date_solved · is_solved · notes · time_taken_mins`

### `dsa_daily_targets`
`date · leetcode_solved · codechef_solved · target_met`

### `finance_entries`
`type (income|expense) · category · amount · description · date`

### `finance_budget`
`month (YYYY-MM) · total_budget · categories (JSONB)`

---

## Local Development

### 1. Clone and install
```bash
git clone <your-repo-url>
cd "My Planner"
npm install
```

### 2. Set up environment variables
Create `.env.local` in the project root:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Supabase migrations
In your Supabase SQL editor, run each file in order:
```
supabase/migrations/001_tasks.sql
supabase/migrations/002_gate_topics.sql
supabase/migrations/003_dsa_problems.sql
supabase/migrations/004_finance.sql
```

### 4. Configure Google OAuth (optional)
1. In Google Cloud Console → APIs & Services → Credentials → create OAuth 2.0 Client ID
2. Add `https://<your-supabase-project>.supabase.co/auth/v1/callback` as an Authorized redirect URI
3. In Supabase Dashboard → Authentication → Providers → enable Google, paste Client ID + Secret

### 5. Start the dev server
```bash
npm run dev
# → http://localhost:5173
```

---

## Deployment (Vercel)

The `vercel.json` is already configured:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Steps
1. Push to GitHub
2. Import the repo in [vercel.com/new](https://vercel.com/new)
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy — Vercel auto-detects Vite

> **Important:** Add your Vercel deployment URL (`https://your-app.vercel.app`) to:
> - Supabase → Authentication → URL Configuration → **Site URL** and **Redirect URLs**
> - Google Cloud Console → Authorized JavaScript Origins + Redirect URIs

---

## Notification System

StudySync uses the native **Web Notifications API** — no third-party push service.

| Notification | When it fires |
|---|---|
| ⏰ Task reminder | At the exact `reminder_at` timestamp you set when creating the task |
| 📋 Good morning | Every day at **9:00 AM local time** (scheduled on app load) |

- Permission is requested once on first login — if denied, the app never asks again
- Reminders are scheduled in-memory via `setTimeout` on each page load
- After firing, `reminder_sent = true` is saved to Supabase to prevent duplicates on reload
- Works in all modern browsers; gracefully skipped in unsupported environments

---

## Spaced Repetition (GATE)

Revision intervals: **1 → 4 → 7 → 30 → 60 days**

When you mark a topic complete:
1. `is_completed = true`, `completed_at = now()`
2. `next_revision_date` = today + 1 day
3. Each time you click "Revised ✓": interval advances to the next step
4. After all 5 revisions: `next_revision_date = null` (fully learned)

---

## Design System

| Token | Value |
|---|---|
| Accent | `#4F46E5` (indigo-600) |
| Accent hover | `#4338CA` (indigo-700) |
| Accent light | `#EEF2FF` (indigo-50) |
| Success | `#10B981` |
| Warning | `#F59E0B` |
| Danger | `#EF4444` |
| Heading | `#111827` |
| Subtext | `#6B7280` |
| Border | `#E5E7EB` |
| Background | `#F9FAFB` / `#FFFFFF` |
| Font | System `font-sans` |
| Max-width | `900px` centered |
| Radii | max `rounded-xl` |

---

## License

MIT — free to use, modify, and deploy.
