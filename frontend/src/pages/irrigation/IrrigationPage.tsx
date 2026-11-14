import { Bot, Droplets, History, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PumpCard } from "../../components/actuators/PumpCard";
import { ActuatorFormModal } from "../../components/actuators/ActuatorFormModal";
import { AutomationPanel } from "../../components/automation/AutomationPanel";
import { formatFailureReason, manualCommandFeedback } from "../../utils/irrigation-control";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { PageHeader } from "../../components/common/PageHeader";
import { usePolling } from "../../hooks/usePolling";
import { useAuth } from "../../hooks/useAuth";
import { actuatorService, commandService } from "../../services/actuator.service";
import { automationService } from "../../services/automation.service";
import { getApiErrorMessage } from "../../services/api";
import { deviceService } from "../../services/device.service";
import { farmService } from "../../services/farm.service";
import { zoneService } from "../../services/zone.service";
import type { Actuator, ActuatorInput, ActuatorSummary, DeviceCommand, DeviceCommandType } from "../../types/actuator";
import { commandLabels, commandStatusLabels } from "../../types/actuator";
import type { AutomationRule } from "../../types/automation";
import type { Device } from "../../types/device";
import type { Farm, Zone } from "../../types/farm";

type IrrigationTab = "manual" | "automation" | "history";
const emptySummary: ActuatorSummary = { total: 0, active: 0, on: 0, off: 0, unknown: 0, unavailable: 0 };
const time = (value: string | null) => value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "—";

export function IrrigationPage() {
  const commandGeneration = useRef(0);
  const [watchedCommandId, setWatchedCommandId] = useState<string | null>(null);
  const { user } = useAuth(); const canManage = user?.role !== "STAFF"; const [tab, setTab] = useState<IrrigationTab>("manual"); const [items, setItems] = useState<Actuator[]>([]); const [rules, setRules] = useState<AutomationRule[]>([]); const [commands, setCommands] = useState<DeviceCommand[]>([]); const [summary, setSummary] = useState(emptySummary); const [farms, setFarms] = useState<Farm[]>([]); const [zones, setZones] = useState<Zone[]>([]); const [devices, setDevices] = useState<Device[]>([]); const [farmId, setFarmId] = useState(""); const [zoneId, setZoneId] = useState(""); const [deviceId, setDeviceId] = useState(""); const [feedback, setFeedback] = useState(""); const [confirm, setConfirm] = useState<{ actuator: Actuator; command: DeviceCommandType; rule?: AutomationRule } | null>(null); const [form, setForm] = useState<Actuator | null | undefined>(undefined); const [submitting, setSubmitting] = useState(false); const [modalError, setModalError] = useState("");
  const request = useCallback(async (signal: AbortSignal) => {
    const generation = commandGeneration.current;
    const [data, totals, history] = await Promise.all([actuatorService.list({ farmId, zoneId, deviceId, type: "PUMP", limit: 100 }, signal), actuatorService.summary({ farmId, zoneId, deviceId, type: "PUMP" }, signal), tab === "history" ? commandService.list({ farmId, zoneId, deviceId, limit: 100 }, signal) : Promise.resolve({ items: [] as DeviceCommand[] })]);
    return { data, totals, history, generation };
  }, [farmId, zoneId, deviceId, tab]);
  const { loading, error, refresh: load } = usePolling(request, { enabled: tab === "manual" || tab === "history", intervalMs: 2000, onSuccess: ({ data, totals, history, generation }) => {
    if (generation === commandGeneration.current) {
      setItems(data.items); setSummary(totals); setCommands(history.items);
      const watched = watchedCommandId ? data.items.find(item => item.latestCommand?.id === watchedCommandId)?.latestCommand : null;
      if (watched) setFeedback(manualCommandFeedback(watched));
    }
  }, onReset: () => { setItems([]); setCommands([]); setSummary(emptySummary); } });
  useEffect(() => { let active = true; void automationService.list({ farmId, zoneId, limit: 100 }).then(data => { if (active) setRules(data.items); }).catch(() => {}); return () => { active = false; }; }, [farmId, zoneId]);
  useEffect(() => { const controller = new AbortController(); void farmService.list({ status: "ACTIVE", limit: 100 }, controller.signal).then(data => { if (!controller.signal.aborted) setFarms(data.items); }).catch(() => {}); return () => controller.abort(); }, []);
  useEffect(() => { const controller = new AbortController(); setZones([]); if (farmId) void zoneService.list({ farmId, limit: 100 }, controller.signal).then(data => { if (!controller.signal.aborted) setZones(data.items); }).catch(() => {}); return () => controller.abort(); }, [farmId]);
  useEffect(() => { const controller = new AbortController(); setDevices([]); if (zoneId) void deviceService.list({ zoneId, limit: 100 }, controller.signal).then(data => { if (!controller.signal.aborted) setDevices(data.items); }).catch(() => {}); return () => controller.abort(); }, [zoneId]);
  const control = async () => {
    if (!confirm) return;
    commandGeneration.current++; setSubmitting(true); setModalError(""); setFeedback(""); setWatchedCommandId(null);
    try {
      const result = await actuatorService.command(confirm.actuator.id, confirm.command);
      setWatchedCommandId(result.command.id);
      if (result.command.status === "FAILED") throw new Error(manualCommandFeedback(result.command));
      setFeedback(manualCommandFeedback(result.command));
      commandGeneration.current++;
      setItems(current => current.map(item => item.id === result.actuator.id ? { ...item, ...result.actuator, latestCommand: result.command } : item));
      setConfirm(null);
      const ruleData = await automationService.list({ farmId, zoneId, limit: 100 }); setRules(ruleData.items);
      await load();
    } catch (requestError) {
      setModalError(getApiErrorMessage(requestError, requestError instanceof Error ? requestError.message : "Không thể thực hiện lệnh"));
    } finally { commandGeneration.current++; setSubmitting(false); }
  };
  const toggleRule = async (rule: AutomationRule) => {
    try {
      await automationService.update(rule.id, { enabled: !rule.enabled });
      setFeedback(rule.enabled ? "Đã tắt chế độ tưới tự động" : "Đã bật chế độ tưới tự động");
      const data = await automationService.list({ farmId, zoneId, limit: 100 }); setRules(data.items);
    } catch (requestError) { setFeedback(getApiErrorMessage(requestError)); }
  };
  const resumeAuto = async (rule: AutomationRule) => {
    try {
      await automationService.update(rule.id, { enabled: true });
      setFeedback("Đã chuyển lại sang chế độ tưới tự động");
      const data = await automationService.list({ farmId, zoneId, limit: 100 }); setRules(data.items);
    } catch (requestError) { setFeedback(getApiErrorMessage(requestError)); }
  };
  const save = async (input: ActuatorInput) => { setSubmitting(true); setModalError(""); try { if (form) await actuatorService.update(form.id, input); else await actuatorService.create(input); setFeedback(form ? "Đã cập nhật thông tin máy bơm" : "Đã thêm máy bơm mới"); setForm(undefined); await load(); } catch (requestError) { setModalError(getApiErrorMessage(requestError)); } finally { setSubmitting(false); } };
  const ruleByActuator = new Map<string, AutomationRule>();
  for (const rule of rules) if (!ruleByActuator.has(rule.actuatorId) || rule.enabled) ruleByActuator.set(rule.actuatorId, rule);
  const tabs: Array<{ id: IrrigationTab; label: string; icon: typeof Droplets }> = [{ id: "manual", label: "Điều khiển thủ công", icon: Droplets }, { id: "automation", label: "Tự động tưới", icon: Bot }, { id: "history", label: "Lịch sử lệnh", icon: History }];
  return <div className="space-y-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><PageHeader title="Điều khiển tưới" description="Điều khiển máy bơm trực tiếp, thiết lập tưới tự động theo độ ẩm đất và theo dõi lịch sử vận hành." eyebrow="Hệ thống tưới tiêu" />{tab === "manual" && canManage && <button onClick={() => { setModalError(""); setForm(null); }} className="flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-bold text-white"><Plus className="h-4 w-4" />Thêm máy bơm</button>}</div>
    <nav className="surface-card flex gap-2 overflow-x-auto p-2" aria-label="Chế độ tưới">{tabs.map(item => <button key={item.id} onClick={() => setTab(item.id)} className={`flex min-w-max items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ${tab === item.id ? "bg-brand-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}><item.icon className="h-4 w-4" />{item.label}</button>)}</nav>
    {feedback && <div role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{feedback}</div>}
    {error && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{error}</p>}{tab === "automation" ? <AutomationPanel farms={farms} onChanged={async () => { const data = await automationService.list({ farmId, zoneId, limit: 100 }); setRules(data.items); await load(); }} /> : <>{tab === "manual" && <><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Tổng máy bơm", summary.total], ["Đang bật", summary.on], ["Đang tắt", summary.off], ["Không khả dụng", summary.unavailable]].map(([label, value]) => <article key={label} className="surface-card p-5"><p className="text-xs font-bold uppercase text-slate-400">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></article>)}</section><Filters farms={farms} zones={zones} devices={devices} farmId={farmId} zoneId={zoneId} deviceId={deviceId} onFarm={value => { setFarmId(value); setZoneId(""); setDeviceId(""); }} onZone={value => { setZoneId(value); setDeviceId(""); }} onDevice={setDeviceId} />{loading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map(item => <div key={item} className="h-64 animate-pulse rounded-2xl bg-slate-100" />)}</div> : items.length === 0 ? <div className="surface-card p-10 text-center"><Droplets className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-bold">Chưa có máy bơm nào được cấu hình.</p></div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map(actuator => <PumpCard key={actuator.id} actuator={actuator} rule={ruleByActuator.get(actuator.id)} canManage={canManage} onEdit={() => { setModalError(""); setForm(actuator); }} onToggleRule={toggleRule} onResumeAuto={resumeAuto} onCommand={command => { setModalError(""); setConfirm({ actuator, command, rule: ruleByActuator.get(actuator.id)?.enabled ? ruleByActuator.get(actuator.id) : undefined }); }} />)}</div>}</>}{tab === "history" && <CommandHistory commands={commands} loading={loading} error={error} />}</>}
    {form !== undefined && <ActuatorFormModal actuator={form} farms={farms} loading={submitting} error={modalError} onClose={() => setForm(undefined)} onSubmit={save} />}{confirm && <ConfirmDialog title={confirm.command === "TURN_ON" ? "Bật hệ thống tưới?" : "Tắt hệ thống tưới?"} description={`Bạn sắp ${confirm.command === "TURN_ON" ? "bật" : "tắt"} máy bơm "${confirm.actuator.name}".${confirm.rule ? " Máy bơm đang bật chế độ tự động; thao tác thủ công sẽ tạm dừng chế độ tự động trong thời gian ưu tiên." : ""}`} confirmLabel={confirm.command === "TURN_ON" ? "Bật tưới" : "Tắt tưới"} tone={confirm.command === "TURN_ON" ? "warning" : "danger"} loading={submitting} error={modalError} onCancel={() => setConfirm(null)} onConfirm={control} />}
  </div>;
}

function Filters({ farms, zones, devices, farmId, zoneId, deviceId, onFarm, onZone, onDevice }: { farms: Farm[]; zones: Zone[]; devices: Device[]; farmId: string; zoneId: string; deviceId: string; onFarm: (value: string) => void; onZone: (value: string) => void; onDevice: (value: string) => void }) { return <section className="surface-card p-4"><div className="grid gap-3 md:grid-cols-3"><select aria-label="Trang trại tưới" className="h-10 rounded-xl border px-3 text-sm" value={farmId} onChange={event => onFarm(event.target.value)}><option value="">Tất cả trang trại</option>{farms.map(farm => <option key={farm.id} value={farm.id}>{farm.name}</option>)}</select><select aria-label="Khu vực tưới" disabled={!farmId} className="h-10 rounded-xl border px-3 text-sm" value={zoneId} onChange={event => onZone(event.target.value)}><option value="">Tất cả khu vực</option>{zones.map(zone => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select><select aria-label="Device tưới" disabled={!zoneId} className="h-10 rounded-xl border px-3 text-sm" value={deviceId} onChange={event => onDevice(event.target.value)}><option value="">Tất cả thiết bị</option>{devices.map(device => <option key={device.id} value={device.id}>{device.deviceCode}</option>)}</select></div></section>; }

function CommandHistory({ commands, loading, error }: { commands: DeviceCommand[]; loading: boolean; error: string }) { return <section className="surface-card overflow-hidden"><div className="flex items-center gap-2 border-b p-5"><History className="h-5 w-5 text-brand-600" /><div><h2 className="text-lg font-bold">Lịch sử lệnh</h2><p className="text-xs text-slate-400">Nhật ký các lệnh điều khiển máy bơm thủ công và tự động.</p></div></div>{loading ? <div className="h-48 animate-pulse bg-slate-50" /> : error ? <p className="p-8 text-center text-red-600">{error}</p> : commands.length === 0 ? <p className="p-8 text-center text-sm text-slate-400">Chưa có lịch sử điều khiển.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left"><thead className="bg-slate-50 text-xs uppercase text-slate-400"><tr><th className="px-4 py-3">Thời gian</th><th className="px-4 py-3">Trang trại / Khu vực</th><th className="px-4 py-3">Máy bơm</th><th className="px-4 py-3">Lệnh</th><th className="px-4 py-3">Nguồn</th><th className="px-4 py-3">Người / Quy tắc</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Hoàn thành</th></tr></thead><tbody className="divide-y">{commands.map(command => <tr key={command.id}><td className="px-4 py-3 text-xs">{time(command.requestedAt)}</td><td className="px-4 py-3 text-sm">{command.actuator.device.zone.farm.name} / {command.actuator.device.zone.name}</td><td className="px-4 py-3"><code>{command.actuator.actuatorCode}</code></td><td className="px-4 py-3 text-sm font-bold">{commandLabels[command.command]}</td><td className="px-4 py-3 text-sm">{command.source === "MANUAL" ? "Thủ công" : "Tự động"}</td><td className="px-4 py-3 text-sm">{command.source === "AUTOMATION" ? command.automationRule?.name ?? "Quy tắc đã xóa" : command.requestedBy?.fullName ?? "Hệ thống"}</td><td className="px-4 py-3 text-sm">{command.transport === "MOCK" ? "Mô phỏng · " : ""}{commandStatusLabels[command.status]}{command.failureReason && <p className="text-xs text-red-600">{formatFailureReason(command.failureReason)}</p>}</td><td className="px-4 py-3 text-xs">{time(command.completedAt)}</td></tr>)}</tbody></table></div>}</section>; }
