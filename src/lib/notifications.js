/**
 * notifications.js — Web Notifications API helpers for StudySync.
 *
 * Uses only the native browser Notifications API. No third-party library.
 * All functions are safe to call even when permission is denied — they fail
 * silently and never prompt the user more than once per session.
 */

import { supabase } from './supabase';

// ── Permission ────────────────────────────────────────────────────────────────

/**
 * Request notification permission once. Safe to call on every mount:
 * if already granted/denied the browser resolves immediately without a prompt.
 * Returns the resulting permission string: 'granted' | 'denied' | 'default'
 */
export async function requestPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';

  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

/** Returns true only when we can actually fire notifications. */
function canNotify() {
  return 'Notification' in window && Notification.permission === 'granted';
}

// ── Task reminders ────────────────────────────────────────────────────────────

/**
 * Schedule a local reminder for a single task.
 *
 * @param {string} taskId      - UUID of the task row
 * @param {string} title       - Notification title (task title)
 * @param {string} body        - Notification body text
 * @param {string} reminderAt  - ISO 8601 timestamp string (the reminder_at value)
 *
 * Fires a native Notification at the right moment, then marks
 * `reminder_sent = true` in Supabase so we don't repeat it on refresh.
 */
export function scheduleLocalReminder(taskId, title, body, reminderAt) {
  if (!canNotify()) return;

  const fireAt = new Date(reminderAt).getTime();
  const now = Date.now();
  const msUntil = fireAt - now;

  // Don't schedule if already past (or within the next second — fire now)
  if (msUntil < -1000) return;

  const delay = Math.max(0, msUntil);

  setTimeout(async () => {
    if (!canNotify()) return; // permission may have changed

    try {
      new Notification(`⏰ ${title}`, {
        body,
        icon: '/favicon.ico',
        tag: `task-${taskId}`, // prevents duplicate notifications for same task
      });
    } catch {
      // Notification constructor can throw in some contexts (e.g. iframes)
    }

    // Mark as sent in Supabase so this never fires again on reload
    await supabase
      .from('tasks')
      .update({ reminder_sent: true })
      .eq('id', taskId);
  }, delay);
}

// ── Daily good-morning notification ──────────────────────────────────────────

/**
 * Schedule a daily 9 AM "check your tasks" notification.
 * Calculates ms until the next occurrence of 9:00 AM local time.
 * Only schedules one timeout — it will re-schedule itself on the next app load.
 */
export function scheduleDailyMorningReminder() {
  if (!canNotify()) return;

  const now = new Date();
  const next9am = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    9, 0, 0, 0
  );

  // If 9 AM has already passed today, target tomorrow
  if (next9am <= now) {
    next9am.setDate(next9am.getDate() + 1);
  }

  const msUntil = next9am.getTime() - now.getTime();

  setTimeout(() => {
    if (!canNotify()) return;
    try {
      new Notification('📋 StudySync', {
        body: "Good morning! Open the app to check today's tasks.",
        icon: '/favicon.ico',
        tag: 'studysync-morning',
      });
    } catch {
      // Silently ignore — notification context may be unavailable
    }
  }, msUntil);
}

// ── Bulk loader (called from App.jsx on auth) ─────────────────────────────────

/**
 * Fetch all tasks with a reminder due within the next 24 hours (not yet sent)
 * and schedule a local notification for each.
 *
 * @param {string} userId - Supabase auth uid
 */
export async function scheduleUpcomingReminders(userId) {
  if (!canNotify()) return;

  const now = new Date().toISOString();
  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, description, reminder_at')
    .eq('user_id', userId)
    .eq('reminder_sent', false)
    .gte('reminder_at', now)
    .lte('reminder_at', in24h);

  if (!tasks?.length) return;

  for (const task of tasks) {
    scheduleLocalReminder(
      task.id,
      task.title,
      task.description || 'You have a task coming up!',
      task.reminder_at
    );
  }
}
