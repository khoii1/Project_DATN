import { useCallback, useEffect, useState } from "react";
import { usePolling } from "../../hooks/usePolling";
import { deviceService } from "../../services/device.service";
import { getApiErrorMessage } from "../../services/api";
import { shadowPreviewService } from "../../services/shadow-preview.service";
import { shadowDefaults, type ShadowControls, type ShadowPhase, type ShadowPreview } from "../../types/shadow-preview";
import type { Device } from "../../types/device";
import { LiveObservationPanel } from "./LiveObservationPanel";

const phases: ShadowPhase[] = ["IDLE", "ELIGIBLE", "PENDING_ACK", "PULSE_ACTIVE", "WAIT_FRESH_OFF", "SOAK", "REEVALUATE", "FAULT_LOCKED"];
const outcomeText = {
  WOULD_ON: "Hệ thống sẽ đề xuất tưới nếu ở chế độ ACTIVE.",
  WOULD_SKIP: "Chưa cần tưới theo quy tắc hiện tại.",
  BLOCKED: "Không được phép tưới vì điều kiện an toàn chưa đạt.",
};
const time = (iso: string) => new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "medium" }).format(new Date(iso));

export function ShadowPreviewPanel() {
  const [devices, setDevices] = useState<Device[]>([]), [deviceId, setDeviceId] = useState("");
  const [deviceError, setDeviceError] = useState("");
  const [draft, setDraft] = useState<ShadowControls>({ ...shadowDefaults });
  const [applied, setApplied] = useState<ShadowControls>({ ...shadowDefaults });
  const [polling, setPolling] = useState(true);
  const [mode, setMode] = useState<'fixture' | 'live'>('fixture');
  const [result, setResult] = useState<ShadowPreview | null>(null), [history, setHistory] = useState<ShadowPreview[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    void deviceService.list({ search: "ESP32-GF-A-01", limit: 100 }, controller.signal).then(data => {
      if (controller.signal.aborted) return;
      const visible = data.items.filter(item => item.deviceCode === "ESP32-GF-A-01");
      setDevices(visible); setDeviceId(visible[0]?.id ?? "");
    }).catch(reason => { if (!controller.signal.aborted) setDeviceError(getApiErrorMessage(reason, "Không tải được thiết bị trong phạm vi của bạn.")); });
    return () => controller.abort();
  }, []);
  const request = useCallback((signal: AbortSignal) => shadowPreviewService.get(deviceId, applied, signal), [deviceId, applied]);
  const { loading, error, refresh } = usePolling(request, {
    enabled: !!deviceId && mode === 'fixture', intervalMs: polling ? 10_000 : 0,
    onReset: () => setResult(null),
    onSuccess: value => {
      setResult(value);
      setHistory(current => [value, ...current.filter(row => row.evaluatedAt !== value.evaluatedAt)].slice(0, 20));
    },
  });
  const set = <K extends keyof ShadowControls>(key: K, value: ShadowControls[K]) => setDraft(current => ({ ...current, [key]: value }));
  const numeric = (key: "soilMoisture" | "thresholdOn" | "thresholdOff" | "cooldownSeconds" | "soakSeconds" | "reservedRuns" | "reservedSeconds", label: string, max: number) => (
    <label className="text-sm font-semibold">{label}<input aria-label={label} type="number" min={0} max={max} step={key.includes("Seconds") || key === "reservedRuns" ? 1 : "any"}
      className="mt-1 h-10 w-full rounded-xl border px-3" value={draft[key]} onChange={event => set(key, Number(event.target.value))} /></label>
  );
  const select = <K extends keyof ShadowControls>(key: K, label: string, options: readonly string[]) => (
    <label className="text-sm font-semibold">{label}<select aria-label={label} className="mt-1 h-10 w-full rounded-xl border px-3" value={String(draft[key])} onChange={event => set(key, event.target.value as ShadowControls[K])}>
      {options.map(value => <option key={value} value={value}>{value}</option>)}
    </select></label>
  );
  return <section className="space-y-5" aria-label="Mô phỏng tưới tự động">
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
      <h2 className="text-xl font-bold">CHẾ ĐỘ SHADOW — KHÔNG ĐIỀU KHIỂN MÁY BƠM</h2>
      <p className="mt-2 text-sm">Tách biệt kịch bản fixture/mock với quan sát cảm biến thật. Chỉ fixture gọi engine; dữ liệu live chưa đủ trust không tạo quyết định tưới. Không sửa quy tắc hay cảm biến production.</p>
      <p className="mt-1 text-sm">Ngưỡng ban đầu 20%/40% lấy từ fixture Phase 13.1, không phải ngưỡng cho cây. LIVE: NOT_VERIFIED.</p>
    </div>
    {deviceError && <p role="alert" className="text-red-700">{deviceError}</p>}
    <div role="tablist" aria-label="Nguồn dữ liệu shadow" className="flex flex-wrap gap-3">{([['fixture', 'Kịch bản FIXTURE / MOCK'], ['live', 'Dữ liệu cảm biến thực tế']] as const).map(([key, label]) => <button type="button" role="tab" aria-selected={mode === key} key={key} onClick={() => setMode(key)} className={`rounded-xl border px-4 py-2 ${mode === key ? 'bg-brand-600 text-white' : ''}`}>{label}</button>)}</div>
    <label className="block text-sm font-semibold">Phạm vi thiết bị<select aria-label="Phạm vi thiết bị mô phỏng" value={deviceId} onChange={event => { setDeviceId(event.target.value); setHistory([]); }} className="ml-3 rounded-xl border p-2">
      {!devices.length && <option value="">Không có thiết bị phù hợp trong phạm vi</option>}
      {devices.map(device => <option key={device.id} value={device.id}>{device.deviceCode} · {device.zone.farm.name} / {device.zone.name}</option>)}
    </select></label>
    {mode === 'fixture' ? <><form className="surface-card space-y-4 p-5" onSubmit={event => { event.preventDefault(); setApplied({ ...draft }); }}>
      <h3 className="font-bold">Tham số giả lập — không lưu vào hệ thống thật</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {numeric("soilMoisture", "SOIL_01 mô phỏng (%)", 100)}{numeric("thresholdOn", "Ngưỡng ON mô phỏng (%)", 100)}{numeric("thresholdOff", "Ngưỡng OFF mô phỏng (%)", 100)}
        {select("connectionStatus", "ESP32 mô phỏng", ["ONLINE", "OFFLINE", "UNKNOWN"])}
        {select("clockHealth", "Clock health mô phỏng", ["HEALTHY", "UNHEALTHY", "UNKNOWN"])}
        {select("pumpState", "Relay mô phỏng", ["OFF", "ON", "UNKNOWN"])}
        {select("brokerHealthy", "MQTT khỏe (mô phỏng)", ["true", "false"])}
        {select("readingScenario", "Dữ liệu cảm biến mô phỏng", ["FRESH", "STALE", "FUTURE", "RETAINED", "DUPLICATE"])}
        {numeric("cooldownSeconds", "Cooldown còn lại (giây)", 3600)}{numeric("soakSeconds", "Soak còn lại (giây)", 3600)}
        {numeric("reservedRuns", "Lượt đã giữ trong ngày", 100)}{numeric("reservedSeconds", "Ngân sách đã giữ (giây)", 100)}
        {select("faultLatched", "Fault latch mô phỏng", ["false", "true"])}{select("cyclePhase", "Cycle mô phỏng đầu vào", phases)}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={!deviceId} className="rounded-xl bg-brand-600 px-4 py-2 font-bold text-white disabled:opacity-50">Chạy mô phỏng</button>
        <button type="button" onClick={() => { setDraft({ ...shadowDefaults }); setApplied({ ...shadowDefaults }); }} className="rounded-xl border px-4 py-2">Đặt lại fixture</button>
        <label className="text-sm"><input type="checkbox" checked={polling} onChange={event => setPolling(event.target.checked)} /> Tự đánh giá lại mỗi 10 giây (GET)</label>
        <button type="button" disabled={!deviceId} onClick={() => void refresh()} className="rounded-xl border px-4 py-2">Làm mới kết quả</button>
      </div>
    </form>
    {loading && <p role="status">Đang lấy kết quả mô phỏng…</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error} Không có lệnh điều khiển nào được gửi.</p>}
    {result && <ShadowPreviewResult value={result} />}
    <div className="surface-card overflow-auto p-5">
      <h3 className="font-bold">Lịch sử mô phỏng trong trang ({history.length}/20)</h3>
      <p className="mb-3 text-xs text-slate-500">Chỉ trong RAM; mất khi refresh hoặc rời trang. Không phải lịch sử tưới hay persistence production.</p>
      <table className="w-full min-w-[1050px] text-left text-xs"><thead><tr>{["Thời điểm VN", "ReadingId", "SOIL_01", "Quy tắc", "Kết quả", "ReasonCode", "CycleId", "Đã giữ lượt/giây", "Nguồn"].map(label => <th key={label} className="p-2">{label}</th>)}</tr></thead>
        <tbody>{history.map((row, index) => <tr key={`${row.evaluatedAt}-${index}`} className="border-t"><td className="p-2">{time(row.evaluatedAt)}</td><td>{row.decision.readingId ?? "—"}</td><td>{row.decision.soilMoisture ?? "—"}%</td><td>{row.diagnostics.ruleName}</td><td>{row.decision.outcome}</td><td>{row.decision.reasonCode}</td><td>{row.decision.cycleId ?? "—"}</td><td>{row.diagnostics.reservedRuns}/{row.diagnostics.reservedSeconds}</td><td>{row.source}</td></tr>)}</tbody>
      </table>
    </div></> : <LiveObservationPanel key={deviceId} deviceId={deviceId} />}
  </section>;
}

export function ShadowPreviewResult({ value }: { value: ShadowPreview }) {
  const { decision: d, diagnostics: info } = value;
  return <article className="surface-card space-y-3 p-5" aria-label="Kết quả shadow">
    <div className="flex flex-wrap items-center gap-3"><h3 className="text-xl font-bold" data-testid="shadow-outcome">{d.outcome}</h3><span className="rounded bg-amber-100 px-2 py-1 text-xs">Nguồn {value.source} — không phải live</span></div>
    <p>{outcomeText[d.outcome]}</p><p className="font-semibold">{value.reasonVi}</p><code data-testid="shadow-reason">{d.reasonCode}</code>
    <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">{[
      ["SOIL_01 mô phỏng", `${d.soilMoisture ?? "—"}%`], ["Ngưỡng ON / OFF", `${value.settings.thresholdOn}% / ${value.settings.thresholdOff}%`],
      ["Thời lượng đề xuất (không gửi)", d.recommendedRunSeconds === null ? "—" : `${d.recommendedRunSeconds} giây`],
      ["ESP32 / relay mô phỏng", `${info.connectionStatus} / ${info.pumpState}`], ["Clock health mô phỏng", info.clockHealth], ["MQTT mô phỏng", info.brokerHealthy ? "Khỏe" : "Mất kết nối"],
      ["Cooldown còn lại", `${info.cooldownRemainingSeconds} giây`], ["Soak còn lại", `${info.soakRemainingSeconds} giây`],
      ["Daily quota còn lại", `${info.dailyRunsRemaining}/${info.dailyRunLimit} lượt`], ["Daily budget còn lại", `${info.dailySecondsRemaining}/${info.dailyBudgetSeconds} giây`],
      ["Cycle mô phỏng", `${info.cycleBefore} → ${info.cycleAfter ?? "—"}`], ["Đánh giá VN", time(value.evaluatedAt)],
    ].map(([label, text]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 font-semibold">{text}</dd></div>)}</dl>
    <p className="text-xs text-slate-500">State và ngân sách sau đánh giá chỉ là đề xuất mô phỏng; không tích lũy bền vững giữa các kịch bản.</p>
  </article>;
}
