const DEFAULT_INTERVALS = [1, 4, 7, 30, 60];

/**
 * Calculate the next revision date based on the completion date and revision count.
 * Uses spaced repetition intervals — customizable per user.
 *
 * @param {Date|string} completedAt   - The date the topic was completed or last revised.
 * @param {number}      revisionCount - How many revisions have been done so far.
 * @param {number[]}    [intervals]   - Custom day offsets. Falls back to [1,4,7,30,60].
 * @returns {string|null} - The next revision date as YYYY-MM-DD, or null if all done.
 */
export function getNextRevisionDate(completedAt, revisionCount, intervals) {
  const schedule = (intervals && intervals.length > 0) ? intervals : DEFAULT_INTERVALS;
  if (revisionCount >= schedule.length) return null;
  const interval = schedule[revisionCount];
  const next = new Date(completedAt);
  next.setDate(next.getDate() + interval);
  return next.toISOString().split('T')[0];
}

/**
 * Filter topics that are due for revision today or earlier.
 * @param {Array} topics - Array of gate_topics objects.
 * @returns {Array} - Topics that need revision today.
 */
export function getDueRevisions(topics) {
  const today = new Date().toISOString().split('T')[0];
  return topics.filter(
    (t) => t.is_completed && t.next_revision_date && t.next_revision_date <= today
  );
}

/**
 * Mark a revision as done and return the updated fields.
 *
 * @param {Object}   topic         - The progress object being revised.
 * @param {number[]} [intervals]   - Custom day offsets. Falls back to [1,4,7,30,60].
 * @returns {Object} - Updated fields: revision_count, next_revision_date, revision_dates.
 */
export function markRevisionDone(topic, intervals) {
  const newCount = topic.revision_count + 1;
  const nextDate = getNextRevisionDate(new Date(), newCount, intervals);
  return {
    revision_count: newCount,
    next_revision_date: nextDate,
    revision_dates: [...(topic.revision_dates || []), new Date().toISOString()],
  };
}

/** The default schedule, exported so the UI can reset to it. */
export const DEFAULT_REVISION_INTERVALS = DEFAULT_INTERVALS;

