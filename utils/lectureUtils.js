/**
 * lectureUtils.js
 *
 * Weekly lectures compute karne ka ek hi jagah rule.
 * Baad mein sirf yahan badlo, poori system update ho jayegi.
 *
 * Rules (current):
 *   - Theory:    1 credit = 1 lecture/week
 *   - Practical: 1 credit = 2 periods/week  (lab sessions)
 *   - Manual override: semesterSubject.weeklyLectures null na ho to wahi use karo
 */

export const THEORY_CREDIT_MULTIPLIER    = 1; // 1 credit = 1 lecture
export const PRACTICAL_CREDIT_MULTIPLIER = 2; // 1 credit = 2 periods

/**
 * Ek SemesterSubject object (plain ya populated) leke
 * required weekly lectures return karta hai.
 *
 * @param {object} ss  SemesterSubject (fields: weeklyLectures, theoryHours, practicalHours, creditHours)
 * @returns {number}
 */
export function computeWeeklyLectures(ss) {
  // 1. Manual override hai to wahi use karo
  if (ss.weeklyLectures != null) return ss.weeklyLectures;

  const th = ss.theoryHours    ?? null;
  const ph = ss.practicalHours ?? null;

  // 2. Dono null hain to creditHours hi weekly lectures hain
  if (th === null && ph === null) {
    return ss.creditHours ?? 0;
  }

  // 3. Formula: theory + (practical * multiplier)
  const theoryPeriods    = (th ?? 0) * THEORY_CREDIT_MULTIPLIER;
  const practicalPeriods = (ph ?? 0) * PRACTICAL_CREDIT_MULTIPLIER;
  return theoryPeriods + practicalPeriods;
}
