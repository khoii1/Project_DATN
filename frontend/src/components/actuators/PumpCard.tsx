import { Pencil, Power, WifiOff } from "lucide-react";
import type { Actuator, DeviceCommandType } from "../../types/actuator";
import { actuatorStateLabels, actuatorStatusLabels } from "../../types/actuator";
import type { AutomationRule } from "../../types/automation";
import { pumpPresentation, visibleCommandNotice } from "../../utils/irrigation-control";

const time = (value: string | null) => value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "—";

export function PumpCard({ actuator, rule, canManage, onEdit, onCommand, onToggleRule, onResumeAuto }: {
  actuator: Actuator; rule?: AutomationRule; canManage: boolean;
  onEdit: () => void; onCommand: (command: DeviceCommandType) => void;
  onToggleRule?: (rule: AutomationRule) => void; onResumeAuto?: (rule: AutomationRule) => void;
}) {
  const { state, available, canOn, canOff } = pumpPresentation(actuator);
  const notice = visibleCommandNotice(actuator);
  return <article className="surface-card p-5">
    <div className="flex justify-between gap-3"><div>
      <div className="flex items-center gap-2"><p className="text-xs font-bold uppercase text-brand-600">{actuator.actuatorCode}</p>{rule && <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${rule.enabled ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500"}`}>{rule.enabled ? "Tự động: Bật" : "Tự động: Tắt"}</span>}</div>
      <h2 className="mt-1 text-lg font-bold">{actuator.name}</h2>
      <p className="mt-1 text-xs text-slate-400">{actuator.device.deviceCode} · {actuator.device.zone.name}</p>
    </div>{canManage && <button aria-label={`Chỉnh sửa ${actuator.actuatorCode}`} onClick={onEdit} className="h-9 rounded-lg p-2 text-slate-500"><Pencil className="h-4 w-4" /></button>}</div>
    <div className={`mx-auto my-6 grid h-28 w-28 place-items-center rounded-full border-[9px] ${state === "ON" ? "border-brand-100 bg-brand-50 text-brand-700" : "border-slate-100 text-slate-400"}`}><Power className="h-10 w-10" /></div>
    <div className="flex items-center justify-between text-sm"><span>{actuatorStatusLabels[actuator.status]}</span><b>{actuatorStateLabels[state]}</b></div>
    <p className="mt-2 text-xs text-slate-400">Cập nhật trạng thái: {time(actuator.lastStateChangedAt)}</p>
    {rule && <div className={`mt-3 rounded-xl p-3 text-xs ${rule.enabled ? "bg-blue-50 text-blue-700" : "bg-slate-50 text-slate-600"}`}>
      <div className="flex items-center justify-between gap-2">
        <span>Tự động: dưới <b>{rule.startThreshold}%</b> bật · từ <b>{rule.stopThreshold}%</b> tắt</span>
        {canManage && onToggleRule && <button type="button" onClick={() => onToggleRule(rule)} className="shrink-0 rounded-lg border bg-white px-2.5 py-1 font-bold text-slate-700 hover:bg-slate-50">{rule.enabled ? "Tắt tự động" : "Bật tự động"}</button>}
      </div>
      {rule.enabled && rule.manualOverrideActive && <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-blue-100 pt-2 text-amber-800">
        <span>Đang ưu tiên thủ công đến {time(rule.manualOverrideUntil)}</span>
        {canManage && onResumeAuto && <button type="button" onClick={() => onResumeAuto(rule)} className="rounded-lg bg-blue-600 px-2.5 py-1 font-bold text-white hover:bg-blue-700">Chuyển về tự động ngay</button>}
      </div>}
    </div>}
    {actuator.lastCommandAt && <p className="mt-2 text-xs text-slate-400">Lệnh gần nhất: {time(actuator.lastCommandAt)}</p>}
    {notice && <p role="status" className="mt-2 text-xs font-medium text-amber-700">{notice}</p>}
    {!available ? <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-100 p-3 text-xs font-bold text-slate-600"><WifiOff className="h-4 w-4" />Thiết bị đang ngoại tuyến hoặc điều khiển từ xa chưa sẵn sàng</div>
      : !actuator.canControl ? <p className="mt-4 rounded-xl bg-slate-50 p-3 text-center text-xs text-slate-500">Chỉ xem · Chưa được cấp quyền điều khiển tưới</p>
      : <div className="mt-4 grid grid-cols-2 gap-2">
        <button disabled={!canOn} onClick={() => onCommand("TURN_ON")} className="rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white disabled:opacity-50">Bật</button>
        <button disabled={!canOff} onClick={() => onCommand("TURN_OFF")} className="rounded-xl border border-red-200 py-2.5 text-sm font-bold text-red-700 disabled:opacity-50">Tắt</button>
      </div>}
    {available && actuator.canControl && <p className="mt-2 text-xs text-slate-500">Nhấn Bật để mở máy bơm và nhấn Tắt khi muốn dừng tưới.</p>}
  </article>;
}
