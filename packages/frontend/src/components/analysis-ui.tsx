import type { ReactNode } from 'react';

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="card p-5 space-y-3">
      <h3 className="font-semibold text-slate-800">{title}</h3>
      {children}
    </div>
  );
}

export function BulletList({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) return <p className="text-sm text-slate-400">{empty}</p>;
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="text-sm text-slate-600 flex gap-2.5">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-400" aria-hidden="true" />
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function Chips({ items, color }: { items: string[]; color: string }) {
  if (!items.length) return <p className="text-sm text-slate-400">Không có</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span key={i} className={`badge ${color}`}>
          {item}
        </span>
      ))}
    </div>
  );
}
