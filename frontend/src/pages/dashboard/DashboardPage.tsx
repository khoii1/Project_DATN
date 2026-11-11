import { pumpPresentation } from "../../utils/irrigation-control";
import { usePolling } from "../../hooks/usePolling";
import { Activity, BellRing, Cpu, Droplets, Map, Power, Tractor } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { SensorValueCard } from "../../components/sensors/SensorValueCard";
import { StatCard } from "../../components/ui/StatCard";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { getApiHealth } from "../../services/health.service";
import { deviceService } from "../../services/device.service";
import type { DeviceSummary } from "../../types/device";
import { farmService } from "../../services/farm.service";
import { zoneService } from "../../services/zone.service";
import { sensorService } from "../../services/sensor.service";
import type { Farm, Zone } from "../../types/farm";
import type { ZoneLatestReading } from "../../types/sensor";
import { alertService } from "../../services/alert.service";
import type { Alert, AlertSeverity, AlertSummary } from "../../types/alert";
import { severityLabels } from "../../types/alert";
import { actuatorService } from "../../services/actuator.service";
import type { Actuator, DeviceCommandType } from "../../types/actuator";
import { actuatorStateLabels } from "../../types/actuator";
import { getApiErrorMessage } from "../../services/api";
import { automationService } from "../../services/automation.service";
import type { AutomationRule } from "../../types/automation";
import { reportService } from '../../services/report.service';
import type { ReportOverview } from '../../types/report';
import { activityLogService } from '../../services/activity-log.service';
import type { ActivityLog } from '../../types/activity-log';

type ApiStatus = "checking" | "connected" | "disconnected";

const emptyAlertSummary: AlertSummary = { active: 0, open: 0, acknowledged: 0, critical: 0, warning: 0, resolvedToday: 0 };
const alertRank: Record<AlertSeverity, number> = { INFO: 1, WARNING: 2, CRITICAL: 3 };

export function DashboardPage() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>("checking");
  const [deviceSummary, setDeviceSummary] = useState<DeviceSummary | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [zonesLoadedFor, setZonesLoadedFor] = useState("");
  const [farmId, setFarmId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [latest, setLatest] = useState<ZoneLatestReading[]>([]);
  const [sensorError, setSensorError] = useState("");
  const [alertSummary, setAlertSummary] = useState(emptyAlertSummary);
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
  const [zoneAlerts, setZoneAlerts] = useState<Alert[]>([]);
  const commandGeneration = useRef(0);
  const [pumps, setPumps] = useState<Actuator[]>([]);
  const [pumpConfirm, setPumpConfirm] = useState<{ actuator: Actuator; command: DeviceCommandType } | null>(null);
  const [pumpLoading, setPumpLoading] = useState(false);
  const [pumpError, setPumpError] = useState("");
  const [pumpFeedback, setPumpFeedback] = useState("");
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [overview, setOverview] = useState<ReportOverview | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);

  useEffect(() => {
    let active = true;
    getApiHealth()
      .then((health) => { if (active) setApiStatus(health.success ? "connected" : "disconnected"); })
      .catch(() => { if (active) setApiStatus("disconnected"); });
    const now = new Date(); const today = new Date(now); today.setHours(0, 0, 0, 0);
    reportService.overview({ from: today.toISOString(), to: now.toISOString() }).then((data) => { if (active) setOverview(data); }).catch(() => undefined);
    activityLogService.list({ page: 1, limit: 5 }).then((data) => { if (active) setRecentActivity(data.items); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const fetchSummary = useCallback((signal: AbortSignal) => Promise.all([
    deviceService.summary({}, signal), alertService.summary(signal), alertService.list({ active: true, limit: 5 }, signal),
  ]), []);
  const { error: summaryError } = usePolling(fetchSummary, {
    onSuccess: ([devices, summary, alerts]) => { setDeviceSummary(devices); setAlertSummary(summary); setRecentAlerts(alerts.items); setApiStatus("connected"); },
  });
  // Retry initial lookup failures too, then stop fetching dropdown metadata.
  const fetchFarms = useCallback((signal: AbortSignal) => farmService.list({ status: "ACTIVE", limit: 100 }, signal), []);
  const { error: farmLookupError } = usePolling(fetchFarms, {
    enabled: farms.length === 0,
    onSuccess: data => { setFarms(data.items); setFarmId(current => current || data.items[0]?.id || ""); },
  });
  useEffect(() => { setZones([]); setZoneId(""); setZonesLoadedFor(""); setSensorError(""); }, [farmId]);
  const fetchZones = useCallback((signal: AbortSignal) => zoneService.list({ farmId, status: "ACTIVE", limit: 100 }, signal), [farmId]);
  const { error: zoneLookupError } = usePolling(fetchZones, {
    enabled: !!farmId && zonesLoadedFor !== farmId,
    onSuccess: data => { setZones(data.items); setZoneId(current => data.items.some(zone => zone.id === current) ? current : data.items[0]?.id || ""); setZonesLoadedFor(farmId); },
  });
  const monitoredZoneId = zones.find(zone => zone.id === zoneId && zone.farmId === farmId)?.id ?? "";
  const fetchMonitoring = useCallback(async (signal: AbortSignal) => { const generation = commandGeneration.current; const values = await Promise.all([
    sensorService.zoneLatest(monitoredZoneId, signal),
    alertService.list({ zoneId: monitoredZoneId, active: true, limit: 100 }, signal),
    actuatorService.list({ zoneId: monitoredZoneId, type: "PUMP", limit: 20 }, signal),
    automationService.list({ zoneId: monitoredZoneId, enabled: true, limit: 100 }, signal),
  ]); return { values, generation }; }, [monitoredZoneId]);
  const { loading: sensorLoading, error: monitoringError } = usePolling(fetchMonitoring, {
    enabled: !!monitoredZoneId,
    onReset: () => { setLatest([]); setZoneAlerts([]); setPumps([]); setAutomationRules([]); },
    onSuccess: ({ values: [data, alerts, actuators, automation], generation }) => {
      setLatest(data.sensors); setZoneAlerts(alerts.items); if (generation === commandGeneration.current) setPumps(actuators.items); setAutomationRules(automation.items);
    },
  });
  const severityBySensor = (monitoredZoneId ? zoneAlerts : []).reduce<Record<string, AlertSeverity>>((result, alert) => { const current = result[alert.sensorId]; if (!current || alertRank[alert.severitySnapshot] > alertRank[current]) result[alert.sensorId] = alert.severitySnapshot; return result; }, {});
  const issuePumpCommand = async () => {
    if (!pumpConfirm) return;
    commandGeneration.current++; setPumpLoading(true); setPumpError("");
    try {
      const result = await actuatorService.command(pumpConfirm.actuator.id, pumpConfirm.command);
      if (result.command.status === "FAILED") { setPumpError(result.command.failureReason || "Gateway không thể thực hiện lệnh"); return; }
      setPumps((items) => items.map((item) => item.id === result.actuator.id ? { ...item, ...result.actuator, latestCommand: result.command } : item));
      setPumpFeedback(result.command.status === "PENDING" ? "Đang chờ ACK ESP32; chưa xác nhận relay hoặc nước chảy." : "Đã nhận xác nhận relay.");
      setPumpConfirm(null);
    } catch (requestError) { setPumpError(getApiErrorMessage(requestError)); }
    finally { commandGeneration.current++; setPumpLoading(false); }
  };

  return (
    <div className="space-y-7">
      {(summaryError || monitoringError || farmLookupError || zoneLookupError) && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{summaryError || monitoringError || farmLookupError || zoneLookupError}</p>}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <PageHeader title="Tổng quan nông nghiệp" description="Theo dõi tình trạng trang trại và môi trường theo dữ liệu đã ghi nhận." eyebrow={new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())} />
        <div className="flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 sm:self-auto">
          <span className={`h-2 w-2 rounded-full ${apiStatus === "connected" ? "bg-emerald-500" : apiStatus === "checking" ? "animate-pulse bg-amber-400" : "bg-slate-300"}`} />
          {summaryError || monitoringError ? "Không thể cập nhật API" : apiStatus === "connected" ? "API đã kết nối" : apiStatus === "checking" ? "Đang kiểm tra API" : "API chưa kết nối"}
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Thống kê tổng quan">
        <StatCard label="Trang trại" value={String(overview?.farmCount ?? farms.length)} note="Trong phạm vi được cấp quyền" icon={Tractor} tone="green" />
        <StatCard label="Khu vực" value={String(overview?.zoneCount ?? 0)} note={`${overview?.cropCount ?? 0} cây trồng`} icon={Map} tone="violet" />
        <StatCard label="Thiết bị" value={String(deviceSummary?.total ?? overview?.deviceCount ?? 0)} note={`${deviceSummary?.online ?? overview?.deviceOnline ?? 0} online · ${deviceSummary?.offline ?? overview?.deviceOffline ?? 0} offline`} icon={Cpu} tone="blue" />
        <StatCard label="Cảnh báo đang hoạt động" value={String(alertSummary.active)} note={`${alertSummary.critical} nghiêm trọng · ${alertSummary.open} chưa xác nhận`} icon={BellRing} tone="amber" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,.75fr)]">
        <section className="surface-card min-w-0 p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">Dữ liệu mới nhất</p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">Điều kiện môi trường</h2>
            </div>
            <div className="flex flex-wrap gap-2"><select aria-label="Trang trại dashboard" value={farmId} onChange={(event) => setFarmId(event.target.value)} className="h-9 rounded-xl border px-3 text-xs"><option value="">Chọn trang trại</option>{farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name}</option>)}</select><select aria-label="Khu vực dashboard" value={zoneId} onChange={(event) => setZoneId(event.target.value)} disabled={!farmId} className="h-9 rounded-xl border px-3 text-xs"><option value="">Chọn khu vực</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></div>
          </div>
          {sensorLoading ? <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl bg-slate-100" />)}</div> : sensorError ? <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{sensorError}</p> : !farmId ? <p className="py-8 text-center text-sm text-slate-400">Bạn chưa được phân công vào trang trại nào.</p> : !monitoredZoneId || latest.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">Chưa cấu hình cảm biến cho khu vực này.</p> : <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">{Object.values(latest.reduce<Record<string, ZoneLatestReading>>((selected, reading) => { const current = selected[reading.type]; if (!current || new Date(reading.recordedAt || 0) > new Date(current.recordedAt || 0)) selected[reading.type] = reading; return selected; }, {})).map((reading) => <SensorValueCard key={reading.sensorId} type={reading.type} name={reading.name} value={reading.value} recordedAt={reading.recordedAt} alertSeverity={severityBySensor[reading.sensorId]} />)}</div>}
        </section>

        <section className="surface-card overflow-hidden p-5 sm:p-6">
          <div className="flex items-center justify-between"><div><p className="text-sm font-medium text-slate-500">Hệ thống tưới</p><h2 className="mt-1 text-lg font-bold text-slate-900">Máy bơm trong khu vực</h2></div><Droplets className="h-5 w-5 text-brand-600" /></div>
          {pumpFeedback && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">{pumpFeedback}</p>}
          {!monitoredZoneId || sensorLoading || pumps.length === 0 ? <p className="py-12 text-center text-sm text-slate-400">Khu vực chưa có máy bơm.</p> : <div className="mt-5 space-y-4">{(monitoredZoneId ? pumps : []).map((pump) => {
            const { available, state, canOn, canOff } = pumpPresentation(pump);
            const automation = automationRules.find(rule => rule.actuatorId === pump.id);
            return <article key={pump.id} className="rounded-2xl border p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-slate-800">{pump.name}</h3><p className="mt-1 text-xs text-slate-400">{pump.device.deviceCode} · {pump.hardwareChannel || "Chưa gán kênh"}</p></div><StatusBadge label={state} tone={state === "ON" ? "success" : "neutral"} /></div><p className="mt-3 text-xs text-slate-500">{actuatorStateLabels[state]}{!available ? " · Không khả dụng" : !pump.canControl ? " · Chỉ có quyền xem" : " · MQTT Gateway"}</p>{automation && <div className="mt-3 rounded-xl bg-blue-50 p-3 text-xs text-blue-700"><p className="font-bold">Tự động: Bật</p><p className="mt-1">Bật dưới {automation.startThreshold}% · Tắt khi đạt {automation.stopThreshold}%</p>{automation.manualOverrideActive && <p className="mt-1 font-semibold text-amber-700">AUTO tạm dừng đến {new Intl.DateTimeFormat("vi-VN", { timeStyle: "short" }).format(new Date(automation.manualOverrideUntil!))}</p>}</div>}<p role="status" className="mt-2 text-xs text-amber-700">{pump.latestCommand?.status === "PENDING" ? "Đang chờ ACK" : pump.latestCommand?.status === "FAILED" ? pump.latestCommand.failureReason : ""}</p><div className="mt-4 grid grid-cols-2 gap-2"><button disabled={!canOn || pumpLoading} onClick={() => { setPumpError(""); setPumpConfirm({ actuator: pump, command: "TURN_ON" }); }} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-600 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"><Power className="h-4 w-4" />Bật</button><button disabled={!canOff || pumpLoading} onClick={() => { setPumpError(""); setPumpConfirm({ actuator: pump, command: "TURN_OFF" }); }} className="flex h-10 items-center justify-center gap-2 rounded-xl border text-xs font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"><Power className="h-4 w-4" />Tắt</button></div></article>;
          })}</div>}
          <Link to="/irrigation" className="mt-4 block text-center text-xs font-bold text-brand-700">Mở trung tâm điều khiển tưới</Link>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,.8fr)]">
        <section className="surface-card min-w-0 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-medium text-slate-500">Audit người dùng</p><h2 className="mt-1 text-lg font-bold text-slate-900">Hoạt động gần đây</h2></div><Activity className="h-5 w-5 text-brand-600" /></div>
          <div className="mt-5 space-y-3">{recentActivity.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">Chưa có hoạt động phù hợp.</p> : recentActivity.map((log) => <article key={log.id} className="flex min-w-0 items-start justify-between gap-4 rounded-xl border p-4"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{log.description}</p><p className="mt-1 text-xs text-slate-400">{log.user?.fullName ?? 'Hệ thống'} · {log.farm?.name ?? 'Toàn hệ thống'}</p></div><time className="shrink-0 text-xs text-slate-400">{new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(log.createdAt))}</time></article>)}</div>
          <Link to="/activity-logs" className="mt-4 block text-center text-xs font-bold text-brand-700">Xem nhật ký hoạt động</Link>
        </section>

        <section className="surface-card min-w-0 p-5 sm:p-6">
          <div className="flex items-center justify-between"><div><p className="text-sm font-medium text-slate-500">Cần chú ý</p><h2 className="mt-1 text-lg font-bold text-slate-900">Cảnh báo gần đây</h2></div><Activity className="h-5 w-5 text-slate-400" /></div>
          <div className="mt-5 space-y-3">
            {recentAlerts.length === 0 && <p className="py-8 text-center text-sm text-slate-400">Không có cảnh báo đang hoạt động.</p>}{recentAlerts.map((alert) => (
              <article key={alert.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-bold text-slate-800">{alert.title}</h3><p className="mt-1 text-xs text-slate-400">{alert.sensor.device.zone.name} · {new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(alert.lastReadingAt))}</p></div><StatusBadge label={`${alert.lastValue} ${alert.unitSnapshot}`} tone={alert.severitySnapshot === "CRITICAL" ? "danger" : alert.severitySnapshot === "WARNING" ? "warning" : "neutral"} /></div><p className="mt-2 text-xs font-semibold text-slate-500">{severityLabels[alert.severitySnapshot]}</p>
              </article>
            ))}
          </div>
          <Link to="/alerts" className="mt-4 block w-full rounded-xl border border-slate-200 py-2.5 text-center text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Xem tất cả cảnh báo</Link>
        </section>
      </div>
      {pumpConfirm && <ConfirmDialog title={`${pumpConfirm.command === "TURN_ON" ? "Bật" : "Tắt"} máy bơm?`} description={`Yêu cầu sẽ được gửi qua backend và chờ ACK relay từ ${pumpConfirm.actuator.name}.`} confirmLabel={pumpConfirm.command === "TURN_ON" ? "Xác nhận bật" : "Xác nhận tắt"} loading={pumpLoading} error={pumpError} onCancel={() => { setPumpConfirm(null); setPumpError(""); }} onConfirm={issuePumpCommand} />}
    </div>
  );
}
