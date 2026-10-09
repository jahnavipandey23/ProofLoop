import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ArrowRight, BarChart3, Bell, CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, FileText, Flame, Headphones, Home, Image, Link2, Menu, MoreHorizontal, Plus, Search, Settings, ShieldCheck, Sun, Target, X, Zap, LogOut } from 'lucide-react';
import { api, fileUrl, proofFileUrl } from './api.js';
import { EIcon, Heatmap } from './components.jsx';
import { Analytics, CalendarPage, FocusRoom, MyGoals, SettingsPage } from './pages.jsx';
import { byDateDesc, cats, completion, currentStreak, full, longestStreak, nowTime, pretty, short, todayKey, parse } from './utils.js';

const NAV = [['Home', Home], ['Calendar', CalendarDays], ['My Goals', Target], ['Analytics', BarChart3], ['Focus Room', Headphones], ['Settings', Settings]];
const SUBTITLE = { Calendar: 'Pick a day to plan it or review its proof.', 'My Goals': 'Every goal you have set, in one place.', Analytics: 'Your streaks, totals and every proof entry.', 'Focus Room': 'Work in focused rounds, then submit your proof.', Settings: 'Manage your profile and preferences.' };
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

function ProofImage({ id, token, alt = 'Submitted proof' }) {
  const [src, setSrc] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    let objectUrl = '';
    setSrc(''); setError('');
    (async () => {
      try {
        const response = await fetch(proofFileUrl(id), { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw new Error('The uploaded proof could not be fetched.');
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        if (active) setSrc(objectUrl);
      } catch (e) { if (active) setError(e.message); }
    })();
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [id, token]);
  if (error) return <div className="proof-img-error">Proof image unavailable.<small>{error}</small></div>;
  if (!src) return <div className="proof-img-loading">Loading submitted proof…</div>;
  return <a href={src} target="_blank" rel="noreferrer"><img className="proof-img" src={src} alt={alt} /></a>;
}

function ProofThumb({ id, token }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let active = true; let objectUrl = '';
    fetch(proofFileUrl(id), { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => { if (!r.ok) throw new Error(); return r.blob(); })
      .then((blob) => { objectUrl = URL.createObjectURL(blob); if (active) setSrc(objectUrl); })
      .catch(() => {});
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [id, token]);
  return src ? <img src={src} alt="" /> : <FileText size={15} />;
}

export default function Dashboard({ user, token, onLogout, onUserUpdate }) {
  const [page, setPage] = useState('Home');
  const [date, setDate] = useState(todayKey());
  const [year, setYear] = useState(new Date().getFullYear());
  const [goal, setGoal] = useState('');               // draft shown in both goal editors
  const [goals, setGoals] = useState([]);             // [{date,title}]
  const [entries, setEntries] = useState([]);         // proofs
  const [category, setCategory] = useState('Learning');
  const [tab, setTab] = useState('image');
  const [proof, setProof] = useState('');
  const [file, setFile] = useState(null);
  const [toast, setToast] = useState('');
  const [showGoal, setShowGoal] = useState(false);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [dark, setDarkState] = useState(() => localStorage.getItem('proofloop-dark') === '1');
  const [mobile, setMobile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState(null);
  const fileRef = useRef(null), searchRef = useRef(null), editorRef = useRef(null), toastTimer = useRef(null);

  const goalMap = useMemo(() => Object.fromEntries(goals.map((g) => [g.date, g.title])), [goals]);
  const today = todayKey();
  const isToday = date === today;
  const goalForDate = goalMap[date] || '';
  const entry = entries.find((e) => e.date === date);
  const dayWord = isToday ? 'Today’s' : `${short(date)}`;
  const say = (t) => { setToast(t); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(''), 3200); };
  const fail = (e) => { say(e.message || 'Something went wrong.'); if (e.status === 401) setTimeout(onLogout, 1500); };
  const setDark = (v) => { setDarkState(v); localStorage.setItem('proofloop-dark', v ? '1' : '0'); };
  useEffect(() => { document.body.classList.toggle('proofloop-dark', dark); return () => document.body.classList.remove('proofloop-dark'); }, [dark]);

  /* ---------- load from MongoDB (via API) ---------- */
  const load = async () => {
    setLoading(true); setLoadError('');
    try {
      const [p, g] = await Promise.all([api('/proofs', { token }), api('/goals', { token })]);
      setEntries((p.proofs || []).sort(byDateDesc));
      setGoals((g.goals || []).map((x) => ({ date: x.date, title: x.title })));
    } catch (e) { setLoadError(e.message); if (e.status === 401) setTimeout(onLogout, 1500); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [token]);

  // Keep the goal draft in sync with the selected day's saved goal (this is what makes "Edit" work).
  useEffect(() => { setGoal(goalForDate); }, [date, goalForDate]);
  useEffect(() => { if (showGoal) editorRef.current?.focus(); }, [showGoal]);

  // Ctrl/Cmd+K focuses search; clicking elsewhere closes menus.
  useEffect(() => {
    const onKey = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); searchRef.current?.focus(); } if (e.key === 'Escape') { setMenu(null); setSearchOpen(false); } };
    const onClick = (e) => { if (!e.target.closest('.search')) setSearchOpen(false); if (!e.target.closest('.row-menu-wrap')) setMenu(null); };
    window.addEventListener('keydown', onKey); document.addEventListener('click', onClick);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('click', onClick); };
  }, []);

  /* ---------- goal actions ---------- */
  const saveGoalFor = async (d, raw) => {
    const title = raw.trim();
    if (!title) { say('Add a goal before saving.'); return false; }
    if (goalMap[d] === title) { say('No changes to save.'); return true; }
    try {
      await api('/goals', { method: 'POST', token, body: { date: d, title } });
      setGoals((p) => [{ date: d, title }, ...p.filter((x) => x.date !== d)]);
      say(entries.some((e) => e.date === d) ? 'Goal updated.' : 'Goal saved. Submit proof to turn this day green.');
      return true;
    } catch (e) { fail(e); return false; }
  };
  const saveGoal = async () => { if (await saveGoalFor(date, goal)) setShowGoal(false); };
  const deleteGoal = async (d) => {
    if (!window.confirm(`Delete the goal for ${full(d)}?`)) return;
    try { await api(`/goals/${d}`, { method: 'DELETE', token }); setGoals((p) => p.filter((x) => x.date !== d)); if (d === date) setGoal(''); say('Goal deleted.'); } catch (e) { fail(e); }
  };
  const deleteProof = async (e) => {
    if (!window.confirm(`Delete the proof for ${full(e.date)}? This also removes the uploaded file.`)) return;
    try { await api(`/proofs/${e.id}`, { method: 'DELETE', token }); setEntries((p) => p.filter((x) => x.id !== e.id)); say('Proof deleted.'); } catch (err) { fail(err); }
  };
  const startEdit = () => { setPage('Home'); setShowGoal(true); setGoal(goalForDate); };
  const openDay = (d) => { setDate(d); setYear(parse(d).getFullYear()); setPage('Home'); setSearchOpen(false); setMenu(null); };

  /* ---------- proof submit ---------- */
  const checkFile = (f, t = tab) => {
    if (!f) return '';
    if (t === 'image' && !/\.(png|jpe?g|webp)$/i.test(f.name)) return 'Choose a PNG, JPG, or WebP image.';
    if (t === 'file' && !/\.(pdf|docx?|txt)$/i.test(f.name)) return 'Choose a PDF, DOC, DOCX, or TXT file.';
    if (f.size > (t === 'image' ? 5 : 10) * 1024 * 1024) return `File size must be ${t === 'image' ? 5 : 10} MB or less.`;
    return '';
  };
  const pickFile = (f) => { const err = checkFile(f); if (err) { say(err); return; } setFile(f); };
  const changeTab = (v) => { setTab(v); setFile(null); if (fileRef.current) fileRef.current.value = ''; };
  const submit = async () => {
    const g = (goal.trim() || goalForDate).trim();
    if (date > today) return say('You can only submit proof for today or past days.');
    if (!g) return say('Set your goal first, then submit proof.');
    if ((tab === 'link' || tab === 'note') && !proof.trim()) return say(tab === 'link' ? 'Paste a link to your proof.' : 'Write a short proof note.');
    if (tab === 'link') { try { const u = new URL(proof.trim()); if (!['http:', 'https:'].includes(u.protocol)) throw Error(); } catch { return say('Enter a valid http:// or https:// link.'); } }
    if ((tab === 'image' || tab === 'file') && !file) return say('Choose a file to upload.');
    const ferr = checkFile(file); if (ferr) return say(ferr);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('date', date); fd.append('title', g); fd.append('category', category); fd.append('proofType', tab); fd.append('time', nowTime());
      if (tab === 'link' || tab === 'note') fd.append('proof', proof.trim());
      if (file) fd.append('file', file);
      const data = await api('/proofs', { method: 'POST', token, body: fd });   // the server also upserts the goal
      setEntries((p) => [data.proof, ...p.filter((x) => x.date !== date)].sort(byDateDesc));
      setGoals((p) => [{ date, title: g }, ...p.filter((x) => x.date !== date)]);
      setProof(''); setFile(null); if (fileRef.current) fileRef.current.value = '';
      say('Proof saved to your database — this day is now green!');
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const move = (n) => { const d = parse(date); d.setDate(d.getDate() + n); setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`); setProof(''); setFile(null); };

  /* ---------- derived ---------- */
  const q = search.trim().toLowerCase();
  const results = q ? [...new Map([...entries.map((e) => [e.date, e.title + ' ' + e.category]), ...goals.map((g) => [g.date, g.title])]).entries()].filter(([d, t]) => (t + d).toLowerCase().includes(q)).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 6) : [];
  const filtered = entries.filter((e) => !q || (e.title + e.category + e.date).toLowerCase().includes(q));
  const c = completion(goals, entries);
  const pendingToday = !entries.some((e) => e.date === today);
  const notify = () => say(!goalMap[today] ? 'You haven’t set today’s goal yet.' : pendingToday ? 'Today’s goal is set. Submit proof to turn the day green.' : 'You’re all caught up!');
  const showPanel = page === 'Home' || page === 'Calendar';
  const stats = [[Flame, currentStreak(entries), 'Current Streak', 'Keep it up', 'orange'], [Target, `${c.pct}%`, 'Completion Rate', `${c.done}/${c.total} goals`, 'green'], [BarChart3, entries.length, 'Total Proofs', 'Saved proofs', 'blue'], [Zap, longestStreak(entries), 'Longest Streak', 'Personal best', 'gold']];

  return (
    <div className={'app ' + (dark ? 'dark' : '')}>
      <aside className={'sidebar ' + (mobile ? 'open' : '')}>
        <div className="brand"><span className="brand-icon"><ShieldCheck /></span><div><b>ProofLoop</b><small>Show your proof.<br />Build a better you.</small></div><button className="mobile-close" onClick={() => setMobile(false)}><X /></button></div>
        <nav>{NAV.map(([n, I]) => <button key={n} className={page === n ? 'active' : ''} onClick={() => { setPage(n); setMobile(false); }}><I size={18} />{n}</button>)}</nav>
        <div className="quote"><p>“Discipline<br />today creates<br />freedom tomorrow.”</p><button className="quote-go" title="Open Focus Room" onClick={() => { setPage('Focus Room'); setMobile(false); }}>→</button><div className="mountain"><i /></div></div>
        <button className="help" onClick={() => say('Set a goal, then submit an image, link, note or file as proof. Only days with proof turn green.')}>ⓘ Need a little help?</button>
      </aside>

      <main>
        <header>
          <button className="hamb" onClick={() => setMobile(true)}><Menu /></button>
          <label className="search"><Search size={16} />
            <input ref={searchRef} placeholder="Search goals, proofs, or anything..." value={search} onFocus={() => setSearchOpen(true)} onChange={(e) => { setSearch(e.target.value); setSearchOpen(true); }} />
            {search ? <button type="button" className="clear-search" title="Clear" onClick={() => setSearch('')}><X size={14} /></button> : <kbd>Ctrl K</kbd>}
            {searchOpen && q && <div className="search-results">{results.length === 0 ? <div className="sr-empty">No matches</div> : results.map(([d, t]) => <button type="button" key={d} onClick={() => openDay(d)}><b>{short(d)}</b><span>{t}</span></button>)}</div>}
          </label>
          <div className="top-actions">
            <button title="Toggle dark mode" onClick={() => setDark(!dark)}><Sun /></button>
            <button title="Notifications" onClick={notify} className="bell"><Bell />{pendingToday && <i />}</button>
            <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=faces" alt="Profile" onClick={() => setPage('Settings')} />
            <span>{user?.name || user?.email || 'Account'}</span>
            <button title="Log out" onClick={onLogout}><LogOut size={16} /></button>
          </div>
        </header>

        {loadError && <div className="load-error"><div><b>Can’t load your data.</b><small>{loadError}</small></div><button className="primary small" onClick={load}>Retry</button></div>}

        <div className={'layout ' + (showPanel ? '' : 'single')}>
          <section className="left">
            <div className="welcome"><h1>{page === 'Home' ? `${greeting()}, ${(user?.name || 'there').split(' ')[0]}! 👋` : page}</h1><p>{page === 'Home' ? 'Small steps with proof create big results.' : SUBTITLE[page]}</p></div>

            {page === 'My Goals' && <MyGoals goals={goals} entries={entries} search={search} onSaveGoal={saveGoalFor} onDeleteGoal={deleteGoal} onOpen={openDay} />}
            {page === 'Analytics' && <Analytics goals={goals} entries={entries} search={search} onOpen={openDay} onDeleteProof={deleteProof} />}
            {page === 'Calendar' && <CalendarPage date={date} goals={goals} entries={entries} onSelect={setDate} />}
            {page === 'Focus Room' && <FocusRoom say={say} />}
           
            {page === 'Settings' && <SettingsPage user={user} dark={dark} setDark={setDark} onUpdate={async (body) => { const d = await api('/auth/me', { method: 'PATCH', token, body }); onUserUpdate(d.user); }} onLogout={onLogout} say={say} />}

            {page === 'Home' && <>
              <section className="goal-banner">
                <span className="big-icon"><CalendarDays /></span>
                <div>
                  <h3>{goalForDate ? 'Your goal is ready!' : `Add ${isToday ? 'your today’s' : 'a'} goal`}</h3>
                  <p>{goalForDate || (isToday ? 'Haven’t set a goal for today yet. Set it now and stay consistent!' : `No goal set for ${pretty(date)}.`)}</p>
                  <button className="primary compact" onClick={() => (showGoal ? setShowGoal(false) : startEdit())}><Plus size={15} />{goalForDate ? (isToday ? 'Edit Today’s Goal' : 'Edit Goal') : (isToday ? 'Add Today’s Goal' : 'Add Goal')}</button>
                </div>
                <CalendarDays className="banner-cal" />
              </section>
              {showGoal && <div className="goal-editor"><b>{goalForDate ? 'Edit your goal' : 'Set a realistic goal'} · {pretty(date)}</b>
                <textarea ref={editorRef} maxLength={200} placeholder="e.g. Solve 2 DSA problems, read 20 pages..." value={goal} onChange={(e) => setGoal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveGoal(); }} />
                <div><small>{goal.length}/200</small><span className="editor-actions">{goalForDate && <button className="ghost" onClick={() => deleteGoal(date)}>Delete</button>}<button className="ghost" onClick={() => { setGoal(goalForDate); setShowGoal(false); }}>Cancel</button><button className="primary" onClick={saveGoal}>Save goal</button></span></div></div>}

              <div className="stats">{stats.map(([I, v, l, t, col]) => <div className="stat" key={l}><span className={'stat-icon ' + col}><I /></span><div><b>{v}</b><small>{l}</small></div><em>{t}</em></div>)}</div>

              <section className="panel consistency">
                <div className="section-head"><div className="section-title"><CalendarDays /><div><h2>Your Consistency</h2><p>Each green cell represents a day you submitted proof.</p></div></div>
                  <div className="year-controls"><div><button onClick={() => setYear(year - 1)}><ChevronLeft /></button><b>{year}</b><button onClick={() => setYear(year + 1)}><ChevronRight /></button></div><button className="today" onClick={() => { setYear(new Date().getFullYear()); setDate(todayKey()); setProof(''); setFile(null); }}>Today</button></div></div>
                <Heatmap year={year} entries={entries} goals={goals} selected={date} onSelect={setDate} />
              </section>

              <div className="bottom">
                <section className="panel today-card">
                  <div className="card-title"><BarChart3 /><h2>{isToday ? 'Today’s Goal' : `Goal for ${short(date)}`}</h2></div>
                  <div className="goal-progress"><div className={'ring ' + (entry ? 'done' : '')}><b>{entry ? '100' : '0'}<small>%</small></b></div>
                    <div><b>{goalForDate || entry?.title || 'No goal set yet'}</b><p>{entry ? 'Proof submitted for this day.' : 'Set your goal and submit proof to start your day.'}</p>
                      <button className="primary small" onClick={startEdit}><Plus size={14} /> {goalForDate ? 'Edit' : 'Add'} {isToday ? 'Today’s ' : ''}Goal</button></div></div>
                </section>
                <section className="panel activity">
                  <div className="activity-head"><h2>Recent Activity</h2><button onClick={() => setPage('Analytics')}>View all <ArrowRight size={14} /></button></div>
                  {loading ? <div className="sr-empty">Loading…</div> : filtered.length === 0 ? <div className="sr-empty">{entries.length ? 'No matches for your search.' : 'No proofs yet — submit your first one!'}</div> : filtered.slice(0, 4).map((e) => (
                    <div className="activity-row" key={e.id || e.date}>
                      <button className="round" onClick={() => setDate(e.date)}><EIcon type={e.type} /></button>
                      <button className="activity-name" onClick={() => setDate(e.date)}><b>{e.date === today ? 'Today' : short(e.date)}</b><small>{e.title}</small></button>
                      <span className="status">Proof submitted</span><time>{e.time}</time>
                      <span className="row-menu-wrap">
                        <button className="more" onClick={() => setMenu(menu === e.id ? null : e.id)}><MoreHorizontal /></button>
                        {menu === e.id && <div className="row-menu"><button onClick={() => openDay(e.date)}>Open day</button>{(e.fileUrl || (e.proofType === 'link' && e.proof)) && <a href={e.fileUrl ? fileUrl(e.fileUrl) : e.proof} target="_blank" rel="noreferrer">Open proof</a>}<button className="danger" onClick={() => { setMenu(null); deleteProof(e); }}>Delete proof</button></div>}
                      </span>
                    </div>))}
                </section>
              </div>
            </>}
          </section>

          {showPanel && <aside className="panel proof-panel">
            <div className="proof-head"><div><h2>{pretty(date)}</h2><small>Plan your day and submit proof</small></div><div><button onClick={() => move(-1)}><ChevronLeft /></button><button onClick={() => move(1)}><ChevronRight /></button></div></div>
            
            <div className="step"><span>1</span><div><b>{goalForDate ? 'Today’s goal' : 'No goal set'}</b><small>{goalForDate ? 'This is the goal you set from Add Goal.' : 'Set a goal from the goal card on the left.'}</small></div></div>
            <div className={`saved-goal ${goalForDate ? '' : 'empty'}`}>
              <div className="saved-goal-text">{goalForDate || 'No goal has been set for this day.'}</div>
              <button type="button" className="goal-edit-btn" onClick={startEdit}>{goalForDate ? 'Edit Goal' : 'Add Goal'}</button>
            </div>
            <div className="categories">{cats.map(([n, emoji]) => <button key={n} className={category === n ? 'chosen' : ''} onClick={() => setCategory(n)}><span>{emoji}</span>{n}</button>)}</div>

            <div className="step second"><span>2</span><div><b>Submit proof</b><small>Add a screenshot, link, or a short note.</small></div></div>
            <div className="proof-tabs">{[['image', Image, 'Upload Image'], ['link', Link2, 'Add Link'], ['note', ShieldCheck, 'Write Note'], ['file', FileText, 'Upload File']].map(([v, I, l]) => <button key={v} className={tab === v ? 'chosen' : ''} onClick={() => changeTab(v)}><I />{l}</button>)}</div>
            {tab === 'image' || tab === 'file'
              ? <button type="button" className="upload" onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0]); }}>
                  <input hidden ref={fileRef} type="file" accept={tab === 'image' ? '.png,.jpg,.jpeg,.webp' : '.pdf,.doc,.docx,.txt'} onChange={(e) => pickFile(e.target.files?.[0] || null)} />
                  <Image size={24} /><span>{file ? file.name : <>Drag & drop {tab === 'image' ? 'an image' : 'a file'}, or <b>click to upload</b></>}</span><small>{file ? 'Ready to submit' : tab === 'image' ? 'PNG, JPG, or WebP (max 5MB)' : 'PDF, DOC, DOCX, or TXT (max 10MB)'}</small></button>
              : <textarea className="proof-text" placeholder={tab === 'link' ? 'Paste the URL to your proof...' : 'What did you do today? Add a few details...'} value={proof} onChange={(e) => setProof(e.target.value)} />}

            {entry && <div className="server-proof"><b><CheckCircle2 size={15} /> Proof submitted{entry.time ? ` · ${entry.time}` : ''}</b><p>{entry.title}</p>
              {entry.proofType === 'image' && entry.fileUrl && <ProofImage id={entry.id} token={token} />}
              {entry.proofType === 'link' && entry.proof ? <a href={entry.proof} target="_blank" rel="noreferrer">Open submitted proof <ArrowRight size={13} /></a>
                : entry.proofType === 'file' && entry.fileUrl ? <a href={fileUrl(entry.fileUrl)} target="_blank" rel="noreferrer">Open {entry.fileName || 'uploaded file'} <ArrowRight size={13} /></a>
                : entry.proofType === 'note' && entry.proof ? <small>{entry.proof}</small> : null}
              <button className="delete-proof-btn" onClick={() => deleteProof(entry)}>Delete this proof</button></div>}

            <button className="primary submit" onClick={submit} disabled={busy}>{busy ? 'Saving…' : <><CheckCircle2 /> {entry ? 'Replace Proof' : 'Submit Proof'}</>}</button>
            <div className="info"><b>i</b>Only after submitting proof, this day’s heatmap cell will turn green.</div>

            <div className="previous-head"><h3>Previous Entries</h3><button onClick={() => setPage('Analytics')}>View all <ArrowRight size={14} /></button></div>
            <div className="previous">
              {entries.length === 0 && <div className="sr-empty">Nothing yet.</div>}
              {entries.slice(0, 5).map((e) => (
                <button key={e.id || e.date} onClick={() => setDate(e.date)}>
                  <span className="previous-icon"><EIcon type={e.type} /></span>
                  <span className="previous-text"><b>{full(e.date)}</b><small>{e.title}</small></span>
                  <span className="thumb">{e.proofType === 'image' && e.fileUrl ? <ProofThumb id={e.id} token={token} /> : <EIcon type={e.type} />}</span>
                  <span className="check"><Check /></span>
                </button>))}
            </div>
          </aside>}
        </div>
      </main>
      {toast && <div className="toast"><CheckCircle2 size={17} />{toast}</div>}
    </div>
  );
}
