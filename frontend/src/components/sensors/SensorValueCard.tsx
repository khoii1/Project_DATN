import { Droplets, Sun, Thermometer } from "lucide-react";
import type { AlertSeverity } from "../../types/alert";
import { severityLabels } from "../../types/alert";
import type { SensorType } from "../../types/sensor";
import { sensorMetadata } from "../../types/sensor";
interface Props { type: SensorType; value: number | null; recordedAt: string | null; name?: string; alertSeverity?: AlertSeverity }
const icons = { TEMP: Thermometer, AIR_HUMIDITY: Droplets, SOIL_MOISTURE: Droplets, LIGHT: Sun };
const tones: Record<AlertSeverity, string> = { INFO: "bg-blue-50 text-blue-700", WARNING: "bg-amber-50 text-amber-700", CRITICAL: "bg-red-50 text-red-700" };
export function SensorValueCard({ type, value, recordedAt, name, alertSeverity }: Props) { const Icon = icons[type], meta = sensorMetadata[type]; return <article className="rounded-2xl border border-slate-100 bg-white p-4"><div className="flex items-start justify-between gap-2"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700"><Icon className="h-5 w-5" /></span><div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{name || meta.label}</p><p className="mt-1 text-xl font-bold">{value === null ? "Chưa nhận dữ liệu" : `${value} ${meta.unit}`}</p></div></div><span className={`whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-bold ${alertSeverity ? tones[alertSeverity] : "bg-emerald-50 text-emerald-700"}`}>{alertSeverity ? severityLabels[alertSeverity] : "Bình thường"}</span></div><p className="mt-3 text-xs text-slate-400">{recordedAt ? `Cập nhật ${new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(recordedAt))}` : "Chưa có dữ liệu đo"}</p></article>; }
