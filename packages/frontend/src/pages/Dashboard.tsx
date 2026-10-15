import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';
import { AppHeader } from '../components/AppHeader.js';
import { resumeApi } from '../api/resumes.js';
import { jobAnalysisApi } from '../api/job-analyses.js';

interface FeatureCard {
  to: string;
  icon: string;
  iconBg: string;
  title: string;
  desc: string;
}

const FEATURES: FeatureCard[] = [
  {
    to: '/resumes',
    icon: '📄',
    iconBg: 'bg-primary-100',
    title: 'Quản lý CV',
    desc: 'Tải CV PDF lên để AI phân tích kỹ năng, kinh nghiệm và điểm mạnh.',
  },
  {
    to: '/analyze',
    icon: '🎯',
    iconBg: 'bg-accent-100',
    title: 'Phân tích theo JD',
    desc: 'So sánh CV với Job Description để biết mức độ phù hợp.',
  },
  {
    to: '/chat',
    icon: '💬',
    iconBg: 'bg-emerald-100',
    title: 'Career Assistant',
    desc: 'Hỏi AI về CV, công việc và hướng phát triển nghề nghiệp.',
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [resumeCount, setResumeCount] = useState<number | null>(null);
  const [analysisCount, setAnalysisCount] = useState<number | null>(null);

  useEffect(() => {
    resumeApi.list().then((r) => setResumeCount(r.length)).catch(() => setResumeCount(0));
    jobAnalysisApi.list().then((a) => setAnalysisCount(a.length)).catch(() => setAnalysisCount(0));
  }, []);

  const firstName = (user?.fullName ?? 'bạn').split(' ').slice(-1)[0];

  return (
    <div className="min-h-screen bg-mesh">
      <AppHeader />

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-600 to-accent-600 p-8 sm:p-10 text-white shadow-lg">
          <div className="relative z-10 space-y-2">
            <p className="text-sm font-medium text-white/70">Chào mừng trở lại 👋</p>
            <h1 className="text-3xl font-bold">Xin chào, {firstName}!</h1>
            <p className="text-white/80 max-w-lg">
              Phân tích và cải thiện CV của bạn với sức mạnh của AI. Bắt đầu bằng cách tải CV lên.
            </p>
            <div className="flex flex-wrap gap-3 pt-3">
              <Link
                to="/resumes"
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-primary-700 shadow-sm hover:bg-white/90 transition"
              >
                Tải CV lên
              </Link>
              <Link
                to="/analyze"
                className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/30 hover:bg-white/25 transition backdrop-blur-sm"
              >
                Phân tích theo JD
              </Link>
            </div>
          </div>
          {/* Trang trí */}
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-accent-400/20 blur-2xl" />
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 gap-4">
          <div className="card p-5 flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-2xl">
              📄
            </span>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {resumeCount ?? '—'}
              </p>
              <p className="text-sm text-slate-500">CV đã tải lên</p>
            </div>
          </div>
          <div className="card p-5 flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-100 text-2xl">
              🎯
            </span>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {analysisCount ?? '—'}
              </p>
              <p className="text-sm text-slate-500">Lượt phân tích JD</p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Tính năng</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <Link
                key={f.to}
                to={f.to}
                className="card p-5 space-y-3 transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover group"
              >
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${f.iconBg}`}
                >
                  {f.icon}
                </span>
                <div className="space-y-1">
                  <h3 className="font-semibold text-slate-800">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 group-hover:gap-2 transition-all">
                  Bắt đầu
                  <span aria-hidden="true">→</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
