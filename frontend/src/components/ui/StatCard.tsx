import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
  tone: "green" | "blue" | "amber" | "violet";
}

const tones = {
  green: "bg-emerald-50 text-emerald-700",
  blue: "bg-sky-50 text-sky-700",
  amber: "bg-amber-50 text-amber-700",
  violet: "bg-violet-50 text-violet-700",
};

export function StatCard({ label, value, note, icon: Icon, tone }: StatCardProps) {
  return (
    <article className="surface-card flex min-w-0 items-start justify-between gap-3 p-5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{value}</p>
        <p className="mt-2 text-xs font-medium text-slate-400">{note}</p>
      </div>
      <div className={`shrink-0 rounded-xl p-3 ${tones[tone]}`}><Icon className="h-5 w-5" aria-hidden="true" /></div>
    </article>
  );
}

