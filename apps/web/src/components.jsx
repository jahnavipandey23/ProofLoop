import React, { useMemo } from 'react';
import { BookOpen, Code2, Play, Laptop } from 'lucide-react';
import { key, runLengths } from './utils.js';

export function EIcon({ type, size = 16 }) {
  const I = type === 'book' ? BookOpen : type === 'code' ? Code2 : type === 'play' ? Play : Laptop;
  return <I size={size} />;
}

export function Heatmap({ year, entries, goals, selected, onSelect }) {
  const days = useMemo(() => {
    const d = new Date(year, 0, 1);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const out = [];
    for (const x = new Date(d); out.length < 371; x.setDate(x.getDate() + 1)) out.push(new Date(x));
    return out;
  }, [year]);
const proofCounts = useMemo(() => {
  const counts = {};

  entries.forEach((entry) => {
    counts[entry.date] = (counts[entry.date] || 0) + 1;
  });

  return counts;
}, [entries]);

const goalDates = useMemo(
  () => new Set(goals.map((g) => g.date)),
  [goals]
);

const inYear = entries.filter(
  (e) => e.date.startsWith(String(year))
).length;
  return (
    <div className="heat-wrap">
      <div className="months"><span></span>{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m) => <span key={m}>{m}</span>)}</div>
      <div className="heat-layout">
        <div className="weekdays">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => <span key={d}>{i % 2 === 0 ? d : ''}</span>)}</div>
        <div className="heat-cells">
          {days.map((d, i) => {
            const k = key(d);
const valid = d.getFullYear() === year;
const count = proofCounts[k] || 0;

const lvl = valid
  ? Math.min(4, count)
  : 0;

const green = lvl > 0;
const label = green
  ? `${count} task${count === 1 ? '' : 's'} completed`
  : goalDates.has(k)
    ? 'Goal set, no proof yet'
    : 'No task';
            return <button key={i} title={`${k} · ${label}`} disabled={!valid} onClick={() => onSelect(k)} className={`cell ${lvl ? 'lv' + lvl : ''} ${valid ? '' : 'outside'} ${selected === k ? 'selected' : ''}`} />;
          })}
        </div>
      </div>
      <div className="heat-foot"><span>Less <i /><i className="lv1" /><i className="lv2" /><i className="lv3" /><i className="lv4" /> More</span><span>{inYear} proof entries in {year} · keep showing up</span></div>
    </div>
  );
}
