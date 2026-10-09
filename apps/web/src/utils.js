export const cats = [['Learning', '📚'], ['Project', '🛠️'], ['Fitness', '💪'], ['Reading', '📖'], ['Other', '⭐']];
export const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const todayKey = () => key(new Date());
export const parse = (s) => new Date(`${s}T12:00:00`);
export const pretty = (s) => parse(s).toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
export const short = (s) => parse(s).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
export const full = (s) => parse(s).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
export const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
export const byDateDesc = (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);

// Streak = consecutive days with proof, ending today (or yesterday if today's proof isn't in yet).
export function currentStreak(entries) {
  const dates = new Set(entries.map((e) => e.date));
  const d = new Date();
  if (!dates.has(key(d))) d.setDate(d.getDate() - 1);
  let count = 0;
  while (dates.has(key(d))) { count++; d.setDate(d.getDate() - 1); }
  return count;
}
export function longestStreak(entries) {
  const dates = [...new Set(entries.map((e) => e.date))].sort();
  let best = 0, run = 0, prev = null;
  for (const v of dates) {
    const d = parse(v);
    run = prev && Math.round((d - prev) / 86400000) === 1 ? run + 1 : 1;
    best = Math.max(best, run); prev = d;
  }
  return best;
}
// Map of date -> length of the streak run that day belongs to (used for heatmap shading).
export function runLengths(entries) {
  const dates = [...new Set(entries.map((e) => e.date))].sort();
  const map = {}; let run = 0, prev = null;
  for (const v of dates) {
    const d = parse(v);
    run = prev && Math.round((d - prev) / 86400000) === 1 ? run + 1 : 1;
    map[v] = run; prev = d;
  }
  return map;
}
export function completion(goals, entries) {
  const proofDates = new Set(entries.map((e) => e.date));
  const total = goals.length, done = goals.filter((g) => proofDates.has(g.date)).length;
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}
