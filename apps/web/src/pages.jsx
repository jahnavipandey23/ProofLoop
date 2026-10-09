import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Trash2, Pencil, X, Users } from 'lucide-react';
import { EIcon } from './components.jsx';
import { fileUrl } from './api.js';
import { byDateDesc, cats, completion, currentStreak, full, key, longestStreak, parse, pretty, short, todayKey } from './utils.js';

const Empty = ({ title, hint }) => <div className="empty"><b>{title}</b><small>{hint}</small></div>;

/* ---------------- My Goals ---------------- */
export function MyGoals({ goals, entries, search, onSaveGoal, onDeleteGoal, onOpen }) {
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [text, setText] = useState('');
  const proofDates = useMemo(() => new Set(entries.map((e) => e.date)), [entries]);
  const today = todayKey();
  const status = (g) => (proofDates.has(g.date) ? 'done' : g.date < today ? 'missed' : 'pending');
  const q = search.trim().toLowerCase();
  const rows = [...goals].sort(byDateDesc).filter((g) => (filter === 'all' || status(g) === filter) && (!q || (g.title + g.date).toLowerCase().includes(q)));
  const counts = { all: goals.length, done: goals.filter((g) => status(g) === 'done').length, pending: goals.filter((g) => status(g) === 'pending').length, missed: goals.filter((g) => status(g) === 'missed').length };
  const save = async (g) => { if (await onSaveGoal(g.date, text)) setEditing(null); };
  return (
    <section className="panel page-card">
      <div className="section-head"><div className="section-title"><div><h2>All goals</h2><p>Every goal you've set, with its proof status.</p></div></div></div>
      <div className="filter-tabs">{[['all', 'All'], ['done', 'Completed'], ['pending', 'Pending'], ['missed', 'Missed']].map(([v, l]) => <button key={v} className={filter === v ? 'on' : ''} onClick={() => setFilter(v)}>{l} <em>{counts[v]}</em></button>)}</div>
      {rows.length === 0 ? <Empty title={goals.length ? 'No goals match this filter' : 'No goals yet'} hint={goals.length ? 'Try another filter or clear the search.' : 'Go to Home and add your first goal.'} /> : (
        <div className="list">
          {rows.map((g) => (
            <div className="list-row" key={g.date}>
              <div className="list-date"><b>{short(g.date)}</b><small>{parse(g.date).getFullYear()}</small></div>
              {editing === g.date
                ? <input className="inline-input" autoFocus maxLength={200} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') save(g); if (e.key === 'Escape') setEditing(null); }} />
                : <button className="list-title" onClick={() => onOpen(g.date)} title="Open this day">{g.title}</button>}
              <span className={`chip ${status(g)}`}>{status(g) === 'done' ? 'Proof submitted' : status(g) === 'missed' ? 'Missed' : 'Pending'}</span>
              <div className="row-actions">
                {editing === g.date
                  ? <><button title="Save" onClick={() => save(g)}><Check size={15} /></button><button title="Cancel" onClick={() => setEditing(null)}><X size={15} /></button></>
                  : <><button title="Edit goal" onClick={() => { setEditing(g.date); setText(g.title); }}><Pencil size={14} /></button><button title="Delete goal" onClick={() => onDeleteGoal(g.date)}><Trash2 size={14} /></button></>}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------------- Analytics (+ "View all" proofs) ---------------- */
export function Analytics({ goals, entries, search, onOpen, onDeleteProof }) {
  const c = completion(goals, entries);
  const byCat = cats.map(([n, e]) => [n, e, entries.filter((x) => x.category === n).length]);
  const maxCat = Math.max(1, ...byCat.map((x) => x[2]));
  const weeks = useMemo(() => {
    const monday = new Date(); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const set = new Set(entries.map((e) => e.date));
    return Array.from({ length: 8 }, (_, i) => {
      const start = new Date(monday); start.setDate(start.getDate() - (7 - i) * 7);
      let n = 0; for (let d = 0; d < 7; d++) { const x = new Date(start); x.setDate(x.getDate() + d); if (set.has(key(x))) n++; }
      return [short(key(start)), n];
    });
  }, [entries]);
  const q = search.trim().toLowerCase();
  const list = entries.filter((e) => !q || (e.title + e.category + e.date).toLowerCase().includes(q)).sort(byDateDesc);
  return (
    <>
      <div className="stats">
        {[['Current streak', currentStreak(entries) + ' days'], ['Longest streak', longestStreak(entries) + ' days'], ['Total proofs', entries.length], ['Completion', `${c.pct}% (${c.done}/${c.total})`]].map(([l, v]) => <div className="stat" key={l}><div><b>{v}</b><small>{l}</small></div></div>)}
      </div>
      <div className="two-col">
        <section className="panel page-card"><h2 className="card-h">Last 8 weeks</h2><div className="bars">{weeks.map(([l, n]) => <div className="bar-col" key={l}><span className="bar-val">{n}</span><i style={{ height: `${(n / 7) * 100}%` }} /><small>{l}</small></div>)}</div></section>
        <section className="panel page-card"><h2 className="card-h">By category</h2>{byCat.map(([n, e, v]) => <div className="hbar" key={n}><span>{e} {n}</span><div><i style={{ width: `${(v / maxCat) * 100}%` }} /></div><b>{v}</b></div>)}</section>
      </div>
      <section className="panel page-card" id="all-proofs">
        <h2 className="card-h">All proof entries <small>({list.length})</small></h2>
        {list.length === 0 ? <Empty title="No proofs yet" hint="Submit proof on the Home page and it will appear here." /> : (
          <div className="list">{list.map((e) => (
            <div className="list-row" key={e.id || e.date}>
              <span className="previous-icon"><EIcon type={e.type} /></span>
              <button className="list-title" onClick={() => onOpen(e.date)}><b>{full(e.date)} · {e.category}</b><small>{e.title}</small></button>
              <span className="chip done">{e.proofType}</span>
              <div className="row-actions">
                {e.fileUrl && <a title="Open file" href={fileUrl(e.fileUrl)} target="_blank" rel="noreferrer"><ArrowRight size={14} /></a>}
                {e.proofType === 'link' && e.proof && <a title="Open link" href={e.proof} target="_blank" rel="noreferrer"><ArrowRight size={14} /></a>}
                <button title="Delete proof" onClick={() => onDeleteProof(e)}><Trash2 size={14} /></button>
              </div>
            </div>))}</div>
        )}
      </section>
    </>
  );
}

/* ---------------- Calendar ---------------- */
export function CalendarPage({ date, goals, entries, onSelect }) {
  const [month, setMonth] = useState(() => { const d = parse(date); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const proofDates = useMemo(() => new Set(entries.map((e) => e.date)), [entries]);
  const goalDates = useMemo(() => new Set(goals.map((g) => g.date)), [goals]);
  const first = new Date(month); first.setDate(1 - ((first.getDay() + 6) % 7));
  const cells = Array.from({ length: 42 }, (_, i) => { const d = new Date(first); d.setDate(first.getDate() + i); return d; });
  const shift = (n) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  return (
    <section className="panel page-card">
      <div className="section-head">
        <h2 className="card-h">{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
        <div className="year-controls"><div><button onClick={() => shift(-1)}><ChevronLeft /></button><button onClick={() => shift(1)}><ChevronRight /></button></div><button className="today" onClick={() => { const n = new Date(); setMonth(new Date(n.getFullYear(), n.getMonth(), 1)); onSelect(todayKey()); }}>Today</button></div>
      </div>
      <div className="cal-grid cal-head">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <span key={d}>{d}</span>)}</div>
      <div className="cal-grid">
        {cells.map((d) => { const k = key(d); const out = d.getMonth() !== month.getMonth();
          return <button key={k} onClick={() => onSelect(k)} className={`cal-cell ${out ? 'out' : ''} ${proofDates.has(k) ? 'proof' : goalDates.has(k) ? 'goal' : ''} ${k === todayKey() ? 'is-today' : ''} ${k === date ? 'sel' : ''}`}>{d.getDate()}</button>; })}
      </div>
      <div className="cal-legend"><span><i className="proof" /> Proof submitted</span><span><i className="goal" /> Goal set, no proof</span></div>
    </section>
  );
}

/* ---------------- Focus Room (working timer) ---------------- */
const MODES = { Focus: 25, 'Short break': 5, 'Long break': 15 };
export function FocusRoom({ say }) {
  const [mode, setMode] = useState('Focus');
  const [left, setLeft] = useState(MODES.Focus * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(() => { try { const s = JSON.parse(localStorage.getItem('proofloop-focus') || '{}'); return s.day === todayKey() ? s.n : 0; } catch { return 0; } });
  const sayRef = useRef(say); sayRef.current = say;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setLeft((t) => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [running]);
  useEffect(() => {
    if (running && left === 0) {
      setRunning(false);
      if (mode === 'Focus') { const n = sessions + 1; setSessions(n); localStorage.setItem('proofloop-focus', JSON.stringify({ day: todayKey(), n })); sayRef.current('Focus session complete. Take a break, then submit your proof!'); } else sayRef.current('Break over. Ready for another round?');
    }
  }, [left, running, mode, sessions]);
  useEffect(() => { document.title = running ? `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')} · ProofLoop` : 'ProofLoop — Show your proof'; return () => { document.title = 'ProofLoop — Show your proof'; }; }, [left, running]);
  const choose = (m) => { setMode(m); setRunning(false); setLeft(MODES[m] * 60); };
  const mm = String(Math.floor(left / 60)).padStart(2, '0'), ss = String(left % 60).padStart(2, '0');
  const pct = 1 - left / (MODES[mode] * 60);
  return (
    <section className="panel page-card focus">
      <div className="filter-tabs">{Object.keys(MODES).map((m) => <button key={m} className={mode === m ? 'on' : ''} onClick={() => choose(m)}>{m}</button>)}</div>
      <div className="timer-ring" style={{ background: `conic-gradient(#1e6a47 ${pct * 360}deg,#ddd8ca 0)` }}><div><b>{mm}:{ss}</b><small>{mode}</small></div></div>
      <div className="timer-actions">
        <button className="primary" onClick={() => setRunning(!running)}>{running ? <><Pause size={15} /> Pause</> : <><Play size={15} /> {left === 0 ? 'Restart' : 'Start'}</>}</button>
        <button className="ghost" onClick={() => { setRunning(false); setLeft(MODES[mode] * 60); }}><RotateCcw size={15} /> Reset</button>
      </div>
      <p className="focus-count">Focus sessions completed today: <b>{sessions}</b></p>
    </section>
  );
}

// /* ---------------- Friends (honest placeholder - needs backend) ---------------- */
// export function Friends() {
//   return <section className="panel page-card"><div className="empty"><Users size={28} /><b>Friends & shared streaks are not built yet</b><small>This needs backend support (friend requests, shared visibility). It is intentionally not faked here.</small></div></section>;
// }

/* ---------------- Settings ---------------- */
export function SettingsPage({ user, dark, setDark, onUpdate, onLogout, say }) {
  const [name, setName] = useState(user?.name || '');
  const [cur, setCur] = useState(''); const [next, setNext] = useState(''); const [busy, setBusy] = useState(false);
  const run = async (body, ok) => { setBusy(true); try { await onUpdate(body); say(ok); return true; } catch (e) { say(e.message); return false; } finally { setBusy(false); } };
  return (
    <div className="two-col">
      <section className="panel page-card settings">
        <h2 className="card-h">Profile</h2>
        <label>Email<input value={user?.email || ''} disabled /></label>
        <label>Name<input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></label>
        <button className="primary" disabled={busy || name.trim() === user?.name} onClick={() => run({ name: name.trim() }, 'Name updated.')}>Save name</button>
        <h2 className="card-h" style={{ marginTop: 22 }}>Change password</h2>
        <label>Current password<input type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" /></label>
        <label>New password<input type="password" value={next} onChange={(e) => setNext(e.target.value)} minLength={8} autoComplete="new-password" /></label>
        <button className="primary" disabled={busy || !cur || next.length < 8} onClick={async () => { if (await run({ currentPassword: cur, newPassword: next }, 'Password changed.')) { setCur(''); setNext(''); } }}>Update password</button>
      </section>
      <section className="panel page-card settings">
        <h2 className="card-h">Appearance</h2>
        <label className="switch"><input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} /> Dark mode</label>
        <h2 className="card-h" style={{ marginTop: 22 }}>Session</h2>
        <button className="ghost" onClick={onLogout}>Log out</button>
      </section>
    </div>
  );
}
