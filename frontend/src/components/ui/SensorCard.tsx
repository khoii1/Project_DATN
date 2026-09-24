import type { LucideIcon } from "lucide-react";
import { StatusBadge } from "./StatusBadge";

interface SensorCardProps {
  label: string;
  value: string;
  unit: string;
  status: "Normal" | "Warning";
  icon: LucideIcon;
  iconStyle: string;
}

export function SensorCard({ label, value, unit, status, icon: Icon, iconStyle }: SensorCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className={`rounded-lg p-2.5 ${iconStyle}`}><Icon className="h-5 w-5" aria-hidden="true" /></span>
        <StatusBadge label={status} tone={status === "Normal" ? "success" : "warning"} />
      </div>
      <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{value} <span className="text-sm font-semibold text-slate-400">{unit}</span></p>
      <p className="mt-3 text-xs text-slate-400">Cập nhật 10 giây trước</p>
    </article>
  );
}

