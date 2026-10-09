import React, { useState } from 'react';
import AuthScreen from './AuthScreen.jsx';
import Dashboard from './Dashboard.jsx';

const KEY = 'proofloop-session';
const readSession = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };

export default function App() {
  const [session, setSession] = useState(readSession);
  const save = (next) => { localStorage.setItem(KEY, JSON.stringify(next)); setSession(next); };
  const logout = () => { localStorage.removeItem(KEY); setSession(null); };
  if (!session?.token) return <AuthScreen onAuth={(token, user) => save({ token, user })} />;
  return <Dashboard user={session.user} token={session.token} onLogout={logout} onUserUpdate={(user) => save({ ...session, user })} />;
}
