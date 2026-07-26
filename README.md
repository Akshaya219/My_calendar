<h1 align="center">
  <br>
  📚 StudySync
  <br>
</h1>

<h4 align="center">A modular study, placement, and personal planning workspace for B.Tech AI & DS students.</h4>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite 8" />
  <img src="https://img.shields.io/badge/Supabase-2-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/TailwindCSS-4-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="TailwindCSS 4" />
  <img src="https://img.shields.io/badge/Deployed-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-project-structure">Structure</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-database-schema">Database</a> •
  <a href="#-deployment">Deployment</a>
</p>

---

> [!CAUTION]
> ### ⚠️ Security & Usage Warnings
> - **Environment Security**: Never commit your `.env.local` file to any public repository. It contains your Supabase API keys which grant access to your database.
> - **Notification Permissions**: Browser-native reminders require explicit user permission. If notifications are blocked in your browser settings, the reminder system will fail silently.
> - **Database Migrations**: Always execute SQL migrations in their numerical order. Skipping migrations may lead to schema mismatches and application crashes.
> - **Data Persistence**: This application relies on Supabase Row Level Security (RLS). Ensure your RLS policies are active to prevent unauthorized data access between users.

---

## ✨ Features

StudySync is a full-stack productivity web application built for engineering students preparing for placements, GATE, coding practice, and day-to-day planning. It combines task management, study tracking, notes, finance monitoring, and an AI coach into a single dashboard.

### 📋 Task & Calendar Manager
- Create, update, and delete tasks with **due dates**, **time**, and **priority levels** (`low` / `medium` / `high`)
- Categorize tasks by type: `placement`, `gate`, `dsa`, `exam`, `personal`, or `finance`
- Mark tasks as daily checklist items for recurring routines
- Use the calendar view to visualize and manage tasks by date

### 🔔 Smart Reminder System
- **Browser-native notifications** for upcoming tasks
- Reminders are scheduled automatically after login when notification permission is granted
- Daily morning reminder to kickstart the study session
- Permission is requested once and gracefully handled if denied

### 🎯 GATE Tracker
- Track GATE exam syllabus topics subject-by-subject
- Mark topics as **completed** and automatically schedule revisions
- Built-in **spaced repetition** scheduler with intervals: `1 → 4 → 7 → 30 → 60` days
- View topics due for revision today at a glance
- Progress bars per subject showing completion percentage

### 💻 DSA Tracker
- Track Data Structures & Algorithms problems in a LeetCode-style workflow
- Log problems with difficulty, topic, platform, and status
- Filter by topic or difficulty for focused practice sessions
- Track solve streaks and overall progress
- Add daily coding targets directly into the plan

### 💰 Finance Tracker
- Log daily income and expenses with standard and custom categories
- View monthly summaries and detailed category spending breakdowns
- Track savings goals and configure monthly budgets with custom category limits
- Use ledger tools for search, payment method filters, and CSV export

### 📊 Dashboard
- Centralized overview of all modules
- Today's tasks, due revisions, and recent activity
- Quick-access shortcuts to all enabled sections

### 🚀 Onboarding Workspace Customizer
- Custom onboarding wizard shown on first Google OAuth login
- Choose from optional modules (`DSA Practice`, `GATE Prep`, `Finances`, `Placement Prep`, `Daily Notes`)
- Selected modules dynamically shape the layout shell and dashboard experience

### 🤖 AI Day Manager & Coach
- Compile tasks, study tracks, and finances context dynamically
- Try a client-side Gemini key first, then fall back to a simulated offline coach when needed
- Generate study schedules, placement preparation checklists, and budget advice

### 💼 Placement Prep
- Track recruitment pipelines with target companies, deadlines, and statuses (`interested`, `applied`, `interviewing`, `offer`, `rejected`)
- Keep preparation benchmarks tied to roadmap advice
- Surface placement-specific task filters in the daily planner

### 📝 Daily Notes
- Capture private daily notes with titles, rich content, and pinning
- Search notes quickly from the notes page
- Keep personal reminders separate from tasks and placement work

### ⚙️ Settings & Profile
- Toggle enabled modules after onboarding
- Switch theme preference between light and dark mode
- Grant notification permission from the app
- Link coding profile usernames and export user data
- Re-open onboarding setup when you want to reconfigure the workspace

### 🌗 Cloud-Synced Theming
- Fully polished **dark/light mode** across all modules
- Theme preference is saved securely to your Supabase user profile
- Restores your preferred theme across browsers and devices

### 🔐 Authentication
- Google OAuth via **Supabase Auth**
- Protected routes keep app data private per user
- Persistent sessions with graceful redirect handling after OAuth flow

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, React Router DOM v7 |
| **Build Tool** | Vite 8 |
| **Styling** | TailwindCSS 4, Lucide React Icons |
| **Backend / DB** | Supabase (PostgreSQL + Auth + RLS) |
| **Notifications** | Web Notifications API (browser-native) |
| **Deployment** | Vercel |
| **Linting** | ESLint 9 with React Hooks plugin |

---

## 📁 Project Structure

```
studysync/
├── public/                  # Static assets (favicon, etc.)
├── src/
│   ├── components/
│   │   ├── CalendarView.jsx
│   │   ├── CodingStatsWidget.jsx
│   │   ├── DSAHeatmap.jsx
│   │   ├── Layout.jsx
│   │   ├── ModuleGuard.jsx
│   │   ├── ProtectedRoute.jsx
│   │   ├── Layout/AppShell.jsx
│   │   └── ui/              # Reusable UI components (Toast, Skeleton, etc.)
│   ├── hooks/
│   │   └── useAuth.jsx      # Supabase session state
│   ├── lib/
│   │   ├── codingStats.js
│   │   ├── notifications.js
│   │   ├── spacedRepetition.js
│   │   └── supabase.js
│   ├── pages/
│   │   ├── AiManager.jsx
│   │   ├── Dashboard.jsx
│   │   ├── DSATracker.jsx
│   │   ├── Finance.jsx
│   │   ├── GateTracker.jsx
│   │   ├── Login.jsx
│   │   ├── Notes.jsx
│   │   ├── Onboarding.jsx
│   │   ├── PlacementPrep.jsx
│   │   ├── Settings.jsx
│   │   └── Tasks.jsx
│   ├── App.jsx              # Router and notification bootstrap
│   ├── main.jsx             # React DOM entry point
│   └── index.css            # Global styles
├── supabase/
│   └── migrations/          # SQL migration files
│       ├── 001_tasks.sql
│       ├── 002_gate_topics.sql
│       ├── 003_dsa_problems.sql
│       ├── 004_finance.sql
│       ├── 005_update_tasks.sql
│       ├── 006_update_dsa_problems.sql
│       ├── 007_syllabus_system.sql
│       ├── 008_add_payment_method.sql
│       ├── 009_daily_targets.sql
│       ├── 010_task_sync_functions.sql
│       ├── 011_user_preferences.sql
│       ├── 012_placement_prep.sql
│       ├── 013_coding_profiles.sql
│       └── 014_daily_notes.sql
├── index.html               # HTML entry point
├── vite.config.js           # Vite configuration
├── vercel.json              # Vercel SPA routing config
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher
- A **Supabase** project ([create one free](https://supabase.com))
- A **Google Cloud** project with OAuth credentials (for Google Login)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/studysync.git
cd studysync
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

> ⚠️ **Never commit `.env.local` to Git.** It is already listed in `.gitignore`.

You can find these values in your Supabase project under **Settings → API**.

### 4. Set Up the Database

Run the SQL migrations in your Supabase SQL editor **in order**:

```
supabase/migrations/001_tasks.sql
supabase/migrations/002_gate_topics.sql
supabase/migrations/003_dsa_problems.sql
supabase/migrations/004_finance.sql
supabase/migrations/005_update_tasks.sql
supabase/migrations/006_update_dsa_problems.sql
supabase/migrations/007_syllabus_system.sql
supabase/migrations/008_add_payment_method.sql
supabase/migrations/009_daily_targets.sql
supabase/migrations/010_task_sync_functions.sql
supabase/migrations/011_user_preferences.sql
supabase/migrations/012_placement_prep.sql
supabase/migrations/013_coding_profiles.sql
supabase/migrations/014_daily_notes.sql
```

Each migration adds or extends the tables, functions, and preferences used by the app. The schema is protected with Row Level Security (RLS) so users can only access their own data.

### 5. Configure Google OAuth

1. Go to **Supabase Dashboard → Authentication → Providers → Google**
2. Enable Google provider and copy the **Callback URL**
3. In [Google Cloud Console](https://console.cloud.google.com), create OAuth 2.0 credentials
4. Add the Supabase callback URL to **Authorized redirect URIs**
5. Paste the **Client ID** and **Client Secret** back into Supabase

### 6. Run Locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🗃 Database Schema

All tables use **Row Level Security (RLS)** — each user can only see and modify their own rows.

### Core Tables

- `tasks` for planner items, reminders, priorities, and checklist entries
- `gate_topics` and related progress data for GATE syllabus tracking
- `dsa_problems` for coding practice logs and status tracking
- `finance` for income and expense entries
- `user_preferences` for modules, theme, onboarding state, and coding profile links
- `placement_prep` for recruitment pipeline tracking
- `daily_notes` for pinned personal notes and journaling
- `coding_profiles` for competitive programming usernames

### `tasks`
| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | References `auth.users` |
| `title` | TEXT | Task title |
| `description` | TEXT | Optional details |
| `date` | DATE | Due date |
| `time` | TIME | Optional due time |
| `priority` | TEXT | `low` / `medium` / `high` |
| `category` | TEXT | `placement` / `gate` / `dsa` / `exam` / `personal` / `finance` |
| `is_completed` | BOOLEAN | Completion status |
| `is_daily_checklist` | BOOLEAN | Daily recurring item flag |
| `reminder_at` | TIMESTAMPTZ | Scheduled reminder timestamp |
| `reminder_sent` | BOOLEAN | Whether reminder was fired |

### `gate_topics`
Tracks GATE syllabus topics with spaced repetition fields: `is_completed`, `revision_count`, `next_revision_date`, `revision_dates[]`.

### `dsa_problems`
Tracks DSA problems with `difficulty`, `topic`, `platform`, and `status`.

### `finance`
Tracks income/expense entries with `amount`, `type`, `category`, and `date`.

---

## 🔁 Spaced Repetition Algorithm

The GATE tracker uses a custom spaced repetition scheduler inspired by the SM-2 algorithm. When a topic is marked as completed, revision sessions are automatically scheduled at increasing intervals:

```
Revision 1  → +1 day
Revision 2  → +4 days
Revision 3  → +7 days
Revision 4  → +30 days
Revision 5  → +60 days (final)
```

This ensures topics are reviewed at scientifically-optimal intervals to maximize long-term retention.

---

## 🚢 Deployment

This project is configured for **zero-config deployment on Vercel**.

```bash
# Install Vercel CLI (optional)
npm i -g vercel

# Deploy
vercel
```

**Environment Variables on Vercel:**

Add the following in your Vercel project settings under **Settings → Environment Variables**:

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

The `vercel.json` file already handles SPA routing (redirects all paths to `index.html`).

---

## 📜 Available Scripts

```bash
npm run dev       # Start local development server
npm run build     # Build for production
npm run preview   # Preview the production build locally
npm run lint      # Run ESLint
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/your-username/studysync/issues).

1. Fork the project
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'feat: add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">
  Made with ❤️ for B.Tech AI & DS students
</p>
