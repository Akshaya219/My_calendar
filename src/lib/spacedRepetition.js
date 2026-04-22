const REVISION_INTERVALS = [1, 4, 7, 30, 60];

/**
 * Calculate the next revision date based on the completion date and revision count.
 * Uses spaced repetition intervals: 1, 4, 7, 30, 60 days.
 * @param {Date|string} completedAt - The date the topic was completed or last revised.
 * @param {number} revisionCount - How many revisions have been done so far.
 * @returns {string|null} - The next revision date as YYYY-MM-DD, or null if all revisions are done.
 */
export function getNextRevisionDate(completedAt, revisionCount) {
  if (revisionCount >= REVISION_INTERVALS.length) return null;
  const interval = REVISION_INTERVALS[revisionCount];
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
 * @param {Object} topic - The gate_topic object being revised.
 * @returns {Object} - Updated fields: revision_count, next_revision_date, revision_dates.
 */
export function markRevisionDone(topic) {
  const newCount = topic.revision_count + 1;
  const nextDate = getNextRevisionDate(new Date(), newCount);
  return {
    revision_count: newCount,
    next_revision_date: nextDate,
    revision_dates: [...(topic.revision_dates || []), new Date().toISOString()],
  };
}
