import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const NAV: Record<string, { to: string; label: string }[]> = {
  participant: [
    { to: '/', label: 'Home' },
    { to: '/quiz', label: 'Quizzes' },
    { to: '/drills', label: 'Drills Arena' },
    { to: '/audio', label: 'Audio Studio' },
    { to: '/resume', label: 'Resume Tools' },
    { to: '/report', label: 'My Report' },
    { to: '/profile', label: 'Profile & Badges' },
    { to: '/feedback', label: 'Feedback' },
    { to: '/certificate', label: '🎓 Certificate' },
  ],
  trainer: [
    { to: '/trainer', label: 'Batch Dashboard' },
    { to: '/sessions', label: 'Session Control' },
    { to: '/enrollment', label: 'Enrollment & Content' },
    { to: '/analytics', label: 'Analytics' },
    { to: '/nba', label: 'NBA / OBE Report' },
  ],
  admin: [
    { to: '/admin', label: 'Admin' },
    { to: '/activity', label: '🟢 Activity' },
    { to: '/certadmin', label: 'Certificates' },
    { to: '/enrollment', label: 'Enrollment & Content' },
    { to: '/sessions', label: 'Session Control' },
    { to: '/analytics', label: 'Analytics' },
    { to: '/nba', label: 'NBA / OBE Report' },
    { to: '/trainer', label: 'All Results' },
  ],
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const links = user ? NAV[user.role] : [];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="font-extrabold text-brand">iPEC <span className="text-slate-800">Employability Edge</span></div>
          <nav className="hidden md:flex items-center gap-1">
            {links.map(l => (
              <NavLink key={l.to} to={l.to} end
                className={({ isActive }) => `px-3 py-1.5 rounded-lg text-sm font-semibold ${isActive ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 capitalize hidden sm:block">{user?.name} · {user?.role}</span>
            <button onClick={() => { logout(); nav('/'); }} className="text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50">Logout</button>
          </div>
        </div>
        {/* mobile nav */}
        <nav className="md:hidden flex overflow-x-auto gap-1 px-3 pb-2">
          {links.map(l => (
            <NavLink key={l.to} to={l.to} end
              className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold ${isActive ? 'bg-brand text-white' : 'text-slate-600 bg-slate-100'}`}>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 fade-in">{children}</main>
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        iPEC Solutions Pvt. Ltd. · Free for students · www.ipecsoftskill-platform.com
      </footer>
    </div>
  );
}
