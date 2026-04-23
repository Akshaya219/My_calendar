<h1 align="center">
  <br>
  📚 StudySync
  <br>
</h1>

<h4 align="center">Your all-in-one study & placement prep companion for B.Tech AI & DS students.</h4>

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

## ✨ Features

StudySync is a full-stack productivity web application built specifically for engineering students preparing for placements and competitive exams. It combines task management, study tracking, and financial monitoring into a single, unified dashboard.

### 📋 Task & Calendar Manager
- Create, update, and delete tasks with **due dates**, **time**, and **priority levels** (low / medium / high)
- Categorize tasks by type: `placement`, `gate`, `dsa`, `exam`, `personal`, or `finance`
- Mark tasks as daily checklist items for recurring routines
- Toggleable **Monthly Calendar View** to visualize and manage all tasks by date

### 🔔 Smart Reminder System
- **Browser-native push notifications** for upcoming tasks
- Reminders are scheduled automatically on login via the Web Notifications API
- Daily morning reminder to kickstart the study session
- Permission is requested once and gracefully handled if denied

### 🎯 GATE Tracker
- Track GATE exam syllabus topics subject-by-subject
- Mark topics as **completed** and automatically schedule revisions
- Built-in **Spaced Repetition algorithm** with intervals: `1 → 4 → 7 → 30 → 60` days
- View topics due for revision today at a glance
- Progress bars per subject showing completion percentage

### 💻 DSA Tracker
- Track Data Structures & Algorithms problems (LeetCode-style)
- Log problems with difficulty, topic, and status
- Filter by topic or difficulty for focused practice sessions
- Track solve streaks and overall progress

### 💰 Finance Tracker
- Log daily income and expenses with categories
- View monthly summaries and spending breakdowns
- Track savings goals and monitor financial health during college

### 📊 Dashboard
- Centralized overview of all modules
- Today's tasks, due revisions, and recent activity
- Quick-access shortcuts to all sections

### 🌗 Cloud-Synced Theming
- Fully polished **Dark/Light Mode** across all modules
- Theme preference is saved securely to your Supabase User Profile
- Instantly restores your preferred theme across different browsers and devices

### 🔐 Authentication
- Google OAuth via **Supabase Auth**
- Protected routes — all app data is private per user
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
│   │   ├── Layout/          # Sidebar, nav, shell components
│   │   ├── Layout.jsx       # Main app shell with navigation
│   │   ├── ProtectedRoute.jsx  # Auth guard for private routes
│   │   └── ui/              # Reusable UI components (Toast, Skeleton, etc.)
│   ├── hooks/
│   │   └── useAuth.js       # Custom hook for Supabase session state
│   ├── lib/
│   │   ├── supabase.js      # Supabase client initialization
│   │   ├── notifications.js # Browser notification scheduling logic
│   │   └── spacedRepetition.js  # Spaced repetition algorithm (SM-2 inspired)
│   ├── pages/
│   │   ├── Login.jsx        # Google OAuth login page
│   │   ├── Dashboard.jsx    # Main overview dashboard
│   │   ├── Tasks.jsx        # Calendar & task management
│   │   ├── GateTracker.jsx  # GATE exam topic tracker
│   │   ├── DSATracker.jsx   # DSA problem tracker
│   │   └── Finance.jsx      # Personal finance tracker
│   ├── App.jsx              # Root component with routing & session logic
│   ├── main.jsx             # React DOM entry point
│   └── index.css            # Global styles
├── supabase/
│   └── migrations/          # SQL migration files
│       ├── 001_tasks.sql
│       ├── 002_gate_topics.sql
│       ├── 003_dsa_problems.sql
│       ├── 004_finance.sql
│       ├── 005_update_tasks.sql
│       └── 006_update_dsa_problems.sql
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
```

Each migration creates the table and enables Row Level Security (RLS) so users can only access their own data.

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
