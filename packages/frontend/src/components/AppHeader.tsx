import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';

export function AppHeader() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navLink = (to: string, label: string) => {
    const active = location.pathname === to;
    return (
      <Link
        to={to}
        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
          active
            ? 'bg-primary-50 text-primary-700'
            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
        }`}
      >
        {label}
      </Link>
    );
  };

  const displayName = user?.fullName ?? user?.email ?? '';
  const initial = displayName.trim().charAt(0).toUpperCase() || 'U';

  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-600 text-white font-bold text-sm shadow-sm">
              CV
            </span>
            <span className="text-base font-bold text-slate-800 hidden sm:block">
              CV Coach AI
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {navLink('/', 'Dashboard')}
            {navLink('/resumes', 'CV của tôi')}
            {navLink('/job-analyses', 'Phân tích JD')}
            {navLink('/chat', 'Trợ lý AI')}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-sm font-semibold">
              {initial}
            </span>
            <span className="text-sm text-slate-600 max-w-[160px] truncate">{displayName}</span>
          </div>
          <button
            onClick={logout}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </header>
  );
}
