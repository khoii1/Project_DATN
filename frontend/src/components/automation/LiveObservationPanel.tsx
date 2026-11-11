import { useCallback, useEffect, useState } from 'react';
import { usePolling } from '../../hooks/usePolling';
import { liveEvidenceService } from '../../services/live-evidence.service';
import type { LiveEvidence } from '../../types/live-evidence';
import { observationTime, projectObservation } from '../../utils/live-observation';

const missing = ['Publisher identity assurance', 'Production policy/rule version', 'Persistent cycle', 'Persistent budget', 'Persistent safety/fault state', 'Calibration/quality policy SOIL_01'];
export function LiveObservationPanel({ deviceId }: { deviceId: string }) {
  const [sample, setSample] = useState<{ value: LiveEvidence; wall: number; mono: number } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const request = useCallback((signal: AbortSignal) => liveEvidenceService.get(deviceId, signal), [deviceId]);
  const { loading, error, refresh } = usePolling(request, { enabled: !!deviceId, intervalMs: 10_000,
    onReset: () => setSample(null), onSuccess: value => { setSample({ value, wall: Date.now(), mono: performance.now() }); setElapsed(0); } });
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const tick = () => { if (sample) setElapsed(Math.max(0, Date.now() - sample.wall, performance.now() - sample.mono)); };
    const visibility = () => { clearInterval(timer); tick(); if (!document.hidden) timer = setInterval(tick, 1000); };
    visibility(); document.addEventListener('visibilitychange', visibility);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', visibility); };
  }, [sample]);
  return <section className="space-y-4" aria-label="Live observation">
    <div className="flex items-center gap-3"><h3 className="font-bold">Dữ liệu cảm biến thực tế</h3><button type="button" disabled={!deviceId} className="rounded-xl border px-4 py-2" onClick={() => void refresh()}>Đọc lại dữ liệu thật</button></div>
    <p className="text-sm">GET mỗi 10 giây khi tab đang hoạt động. Chỉ quan sát; không gọi engine, không gửi lệnh điều khiển.</p>
    {loading && <p role="status">Đang đọc evidence mới…</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error} STALE / NOT_VERIFIED. Không dùng fixture thay thế.</p>}
    {sample ? <LiveObservationView value={sample.value} elapsedMs={elapsed} failed={!!error} /> : <p>Chưa có evidence trong phiên đọc này. UNKNOWN / NOT_VERIFIED.</p>}
  </section>;
}

export function LiveObservationView({ value, elapsedMs = 0, failed = false }: { value: LiveEvidence; elapsedMs?: number; failed?: boolean }) {
  const state = projectObservation(value, elapsedMs, failed), r = value.reading, row = r?.reading;
  const fields = [
    ['DeviceCode / SensorCode', `${r?.deviceCode ?? 'ESP32-GF-A-01'} / SOIL_01`],
    ['SOIL_01 đã quan sát', row && state.correlated ? `${row.value}%${state.readingFresh ? '' : ' (lịch sử / STALE)'}` : '—'],
    ['ReadingId', row?.id ?? '—'], ['RecordedAt (UTC+7)', observationTime(r?.recordedAt)],
    ['CallbackReceivedAt (UTC+7)', observationTime(r?.callbackReceivedAt)], ['Database ReceivedAt (UTC+7)', observationTime(row?.dbReceivedAt)],
    ['SensorReading source', row?.source ?? '—'], ['Đối chiếu PostgreSQL', state.correlated ? 'Khớp readingId / giá trị / timestamp / source MQTT' : 'NOT_VERIFIED'],
    ['MQTT topic', r?.topic ?? '—'], ['MQTT receiptId', r?.receiptId ?? '—'], ['Payload digest (không phải chữ ký)', r?.payloadDigest ?? '—'],
    ['QoS / retained / duplicate', r ? `${r.qos} / ${r.retain} / ${r.dup}` : '—'],
    ['ESP32', state.presence], ['MQTT receipt status', state.receipt], ['PUMP_01 relay được báo', state.relay],
    ['OFF evidence age', state.offAge === null ? '—' : `${state.offAge} giây${state.offFresh ? '' : ' / NOT_VERIFIED'}`],
    ['OFF RecordedAt (UTC+7)', observationTime(value.off?.recordedAt)], ['OFF reason', value.off?.reason ?? '—'],
    ['Backend observer session', value.observer.sessionId], ['Observer generation', String(value.observer.generation)],
    ['Observer startedAt (UTC+7)', observationTime(r?.sessionStartedAt)],
    ['ESP32 boot session', value.deviceBootSession], ['Clock health', state.clock], ['Clock reason', value.clock.reason],
    ['NTP source / offset', `${value.clock.source ?? '—'} / ${value.clock.offsetMs ?? '—'} ms`],
    ['LastSuccessfulSync (UTC+7, ước lượng)', observationTime(value.clock.lastSuccessfulSync)],
    ['Publisher identity assurance', value.publisherIdentityAssurance], ['VERIFIED_LIVE readiness', 'false / NOT_READY'],
    ['Commands / Automation', `${value.runtime.commandsEnabled} / ${value.runtime.automationEnabled}`],
  ];
  return <article className="surface-card space-y-4 p-5" data-testid="live-observation-result">
    <h3 className="font-bold">LIVE_OBSERVED_NOT_VERIFIED</h3>
    <p>{state.readingFresh ? 'Đã nhận dữ liệu cảm biến thật và đối chiếu thành công với cơ sở dữ liệu. Tuy nhiên hệ thống chưa có đủ bằng chứng để kích hoạt quyết định tưới tự động từ dữ liệu này.' : 'Chưa có evidence mới đủ điều kiện. STALE / NOT_VERIFIED; chờ MQTT và đối chiếu mới sau reconnect.'}</p>
    <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">{fields.map(([label, text]) => <div key={label} className="min-w-0 rounded-xl bg-slate-50 p-3"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 break-words font-semibold">{text}</dd></div>)}</dl>
    <p className="text-sm">OFF chỉ là báo cáo GPIO, không xác minh động cơ hoặc nước đã dừng. API hiện chỉ cung cấp evidence OFF; nếu không có OFF mới, relay là UNKNOWN, không suy ra ON từ dữ liệu cũ.</p>
    <p className="text-sm">LM393: phần trăm quy đổi ADC (dry 3500 / wet 1507), chưa phải độ ẩm thể tích đã hiệu chuẩn cho cây. 0% có thể là giá trị bị clamp; cần kiểm tra tiếp xúc, nhiễu và saturation. Không dùng ngưỡng fixture 20%/40% để tưới thật.</p>
    <h4 className="font-bold">Điều kiện còn thiếu — không có budget/cycle giả lập</h4>
    <ul className="list-disc pl-5 text-sm">{missing.map(item => <li key={item}>{item}: NOT_VERIFIED</li>)}</ul>
    <p className="break-words text-xs">Guard backend: {value.reasons.join(' · ')}</p>
    <p className="text-sm font-semibold">decision=null · snapshot=null · engineCalled=false · Không có quyết định tưới từ live.</p>
  </article>;
}
