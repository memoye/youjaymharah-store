const HOUR_MS = 60 * 60 * 1000;

/**
 * How late a reminder may still go out. Past this, it is skipped rather than
 * sent at an odd moment, so turning reminders on, or the job being down for a
 * while, never sends a burst of stale emails.
 */
export const LATE_LIMIT_HOURS = 48;

type DelaySettings = {
  first_delay_hours: number;
  second_delay_hours: number | null;
  third_delay_hours: number | null;
};

/**
 * The reminder delays in hours, in order. A later delay counts only when every
 * earlier one is set and it comes after them; validation enforces that on
 * save, and this guards rows edited by other means.
 */
export function reminderDelaysHours(settings: DelaySettings): number[] {
  const delays = [settings.first_delay_hours];

  for (const next of [
    settings.second_delay_hours,
    settings.third_delay_hours,
  ]) {
    if (next === null || !(next > delays[delays.length - 1])) {
      break;
    }

    delays.push(next);
  }

  return delays;
}

export type DueReminder = { stage: number } | { finished: true } | null;

/**
 * Which reminder, if any, is due for a bag.
 *
 * Each reminder is due its delay after the bag's last change, so a shopper
 * who comes back and edits the bag pushes the next reminder out. When several
 * are overdue (the job was down, or reminders were just turned on), only the
 * latest is sent, and only within LATE_LIMIT_HOURS of its due time.
 *
 * Returns `{ stage }` (0-based) to send, `{ finished: true }` when nothing
 * will ever be due again, or null to wait.
 */
export function dueReminder(
  lastActivity: Date,
  remindersSent: number,
  delaysHours: number[],
  now: Date,
): DueReminder {
  if (remindersSent >= delaysHours.length) {
    return { finished: true };
  }

  const dueAt = (stage: number) =>
    lastActivity.getTime() + delaysHours[stage] * HOUR_MS;

  let stage = -1;

  for (let index = remindersSent; index < delaysHours.length; index++) {
    if (now.getTime() >= dueAt(index)) {
      stage = index;
    }
  }

  if (stage < 0) {
    return null;
  }

  if (now.getTime() - dueAt(stage) > LATE_LIMIT_HOURS * HOUR_MS) {
    return stage === delaysHours.length - 1 ? { finished: true } : null;
  }

  return { stage };
}

/**
 * The range of last-change times worth looking at: bags changed too recently
 * for the first reminder are skipped, and bags too old for even the last one
 * are never scanned again.
 */
export function scanWindow(
  delaysHours: number[],
  now: Date,
): { from: Date; to: Date } {
  const first = delaysHours[0];
  const last = delaysHours[delaysHours.length - 1];

  return {
    from: new Date(now.getTime() - (last + LATE_LIMIT_HOURS) * HOUR_MS),
    to: new Date(now.getTime() - first * HOUR_MS),
  };
}
