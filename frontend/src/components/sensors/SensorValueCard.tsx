import { Droplets, Sun, Thermometer } from "lucide-react";
import type { AlertSeverity } from "../../types/alert";
import { severityLabels } from "../../types/alert";
import type { SensorType } from "../../types/sensor";
import { sensorMetadata } from "../../types/sensor";
interface Props { type: SensorType; value: number | null; recordedAt: string | null; name?: string; alertSeverity?: AlertSeverity }
const icons = { TEMP: Thermometer, AIR_HUMIDITY: Droplets, SOIL_MOISTURE: Droplets, LIGHT: Sun };
const tones: Record<AlertSeverity, string> = { INFO: "bg-blue-50 text-blue-700", WARNING: "bg-amber-50 text-amber-700", CRITICAL: "bg-red-50 text-red-700" };
export function SensorValueCard({ type, value, recordedAt, name, alertSeverity }: Props) {
  const Icon = icons[type], meta = sensorMetadata[type];
  const hasValue = value !== null && Number.isFinite(value);
  const measured = recordedAt ? new Date(recordedAt) : null;
  const validTime = measured !== null && Number.isFinite(measured.getTime());
  return <article className="min-w-0 rounded-2xl border border-slate-100 bg-white p-4">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><Icon className="h-5 w-5" aria-hidden="true" /></span>
        <div className="min-w-0"><p className="break-words text-xs font-bold uppercase tracking-wide text-slate-400">{name || meta.label}</p><p className="mt-1 text-xl font-bold">{hasValue ? `${value} ${meta.unit}` : "Chưa nhận dữ liệu"}</p></div>
      </div>
      <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${!hasValue ? "bg-slate-100 text-slate-600" : alertSeverity ? tones[alertSeverity] : "bg-emerald-50 text-emerald-700"}`}>{!hasValue ? "Chưa có dữ liệu" : alertSeverity ? severityLabels[alertSeverity] : "Ổn định"}</span>
    </div>
    <p className="mt-3 text-xs text-slate-500">{validTime ? `Cập nhật lúc ${new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "medium" }).format(measured)} (UTC+7)` : recordedAt ? "Thời gian đo không hợp lệ" : "Chưa có thời gian đo"}</p>
  </article>;
}
