import { Pencil, Power, WifiOff } from "lucide-react";
import type { Actuator, DeviceCommandType } from "../../types/actuator";
import { actuatorStateLabels, actuatorStatusLabels, commandStatusLabels } from "../../types/actuator";
import type { AutomationRule } from "../../types/automation";
import { pumpPresentation } from "../../utils/irrigation-control";

const time = (value: string | null) => value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "—";

export function PumpCard({ actuator, rule, canManage, onEdit, onCommand }: {
  actuator: Actuator; rule?: AutomationRule; canManage: boolean;
  onEdit: () => void; onCommand: (command: DeviceCommandType) => void;
}) {
  const { state, available, canOn, canOff } = pumpPresentation(actuator);
  return <article className="surface-card p-5">
    <div className="flex justify-between gap-3"><div>
      <div className="flex items-center gap-2"><p className="text-xs font-bold uppercase text-brand-600">{actuator.actuatorCode}</p>{rule && <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">AUTO</span>}</div>
      <h2 className="mt-1 text-lg font-bold">{actuator.name}</h2>
      <p className="mt-1 text-xs text-slate-400">{actuator.device.deviceCode} · {actuator.device.zone.name}</p>
    </div>{canManage && <button aria-label={`Chỉnh sửa ${actuator.actuatorCode}`} onClick={onEdit} className="h-9 rounded-lg p-2 text-slate-500"><Pencil className="h-4 w-4" /></button>}</div>
    <div className={`mx-auto my-6 grid h-28 w-28 place-items-center rounded-full border-[9px] ${state === "ON" ? "border-brand-100 bg-brand-50 text-brand-700" : "border-slate-100 text-slate-400"}`}><Power className="h-10 w-10" /></div>
    <div className="flex items-center justify-between text-sm"><span>{actuatorStatusLabels[actuator.status]}</span><b>{actuatorStateLabels[state]}</b></div>
    <p className="mt-2 text-xs text-slate-400">Báo cáo GPIO: {time(actuator.lastStateChangedAt)} · Không xác nhận động cơ hoặc nước chảy.</p>
    {rule && <p className="mt-2 rounded-lg bg-blue-50 p-2 text-xs text-blue-700">Tự động: dưới {rule.startThreshold}% bật · từ {rule.stopThreshold}% tắt{rule.manualOverrideActive ? ` · Tạm dừng đến ${time(rule.manualOverrideUntil)}` : ""}</p>}
    <p className="mt-2 text-xs text-slate-400">Lệnh cuối: {time(actuator.lastCommandAt)}</p>
    {actuator.latestCommand && <p role="status" className="mt-2 text-xs text-amber-700">{commandStatusLabels[actuator.latestCommand.status]}{actuator.latestCommand.failureReason ? `: ${actuator.latestCommand.failureReason}` : ""}</p>}
    {!available ? <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-100 p-3 text-xs font-bold text-slate-600"><WifiOff className="h-4 w-4" />Thiết bị không khả dụng hoặc điều khiển MQTT chưa được bật</div>
      : !actuator.canControl ? <p className="mt-4 rounded-xl bg-slate-50 p-3 text-center text-xs text-slate-500">Chỉ xem · Chưa được cấp quyền điều khiển tưới</p>
      : <div className="mt-4 grid grid-cols-2 gap-2">
        <button disabled={!canOn} onClick={() => onCommand("TURN_ON")} className="rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white disabled:opacity-50">Bật thử 1 giây</button>
        <button disabled={!canOff} onClick={() => onCommand("TURN_OFF")} className="rounded-xl border border-red-200 py-2.5 text-sm font-bold text-red-700 disabled:opacity-50">Tắt</button>
      </div>}
    {available && actuator.canControl && <p className="mt-2 text-xs text-slate-500">Lệnh bật giới hạn 1 giây và tự tắt trên ESP32. Có thể yêu cầu Tắt khi đang chờ ACK bật.</p>}
  </article>;
}
