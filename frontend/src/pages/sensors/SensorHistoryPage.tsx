import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { SensorHistoryChart } from "../../components/sensors/SensorHistoryChart";
import { getApiErrorMessage } from "../../services/api";
import { farmService } from "../../services/farm.service";
import { sensorService } from "../../services/sensor.service";
import { zoneService } from "../../services/zone.service";
import type { Farm, Zone } from "../../types/farm";
import type { Sensor, SensorChartResponse, SensorReadingPage, SensorStatistics, SensorType } from "../../types/sensor";
import { sensorMetadata } from "../../types/sensor";

type Preset = "today" | "7d" | "30d" | "custom";
interface Range { from: string; to: string }
const formatNumber = (value: number | null, unit = "") => value === null ? "—" : `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value)} ${unit}`.trim();
const formatDate = (value: string) => new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "medium" }).format(new Date(value));
const localInput = (date: Date) => { const offset = date.getTimezoneOffset() * 60_000; return new Date(date.getTime() - offset).toISOString().slice(0, 16); };
function presetRange(preset: Exclude<Preset, "custom">): Range { const to = new Date(); const from = new Date(to); if (preset === "today") from.setHours(0, 0, 0, 0); else from.setTime(to.getTime() - (preset === "7d" ? 7 : 30) * 86_400_000); return { from: from.toISOString(), to: to.toISOString() }; }

export function SensorHistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSensorId = searchParams.get("sensorId") ?? "";
  const initialPreset = (["today", "7d", "30d"].includes(searchParams.get("range") ?? "") ? searchParams.get("range") : "7d") as Exclude<Preset, "custom">;
  const [farms, setFarms] = useState<Farm[]>([]); const [zones, setZones] = useState<Zone[]>([]); const [sensors, setSensors] = useState<Sensor[]>([]);
  const [farmId, setFarmId] = useState(""); const [zoneId, setZoneId] = useState(""); const [type, setType] = useState<SensorType>("TEMP"); const [sensorId, setSensorId] = useState(initialSensorId);
  const [preset, setPreset] = useState<Preset>(initialPreset); const [range, setRange] = useState<Range>(() => presetRange(initialPreset));
  const [customFrom, setCustomFrom] = useState(() => localInput(new Date(range.from))); const [customTo, setCustomTo] = useState(() => localInput(new Date(range.to)));
  const [statistics, setStatistics] = useState<SensorStatistics | null>(null); const [chart, setChart] = useState<SensorChartResponse | null>(null); const [readings, setReadings] = useState<SensorReadingPage | null>(null);
  const [page, setPage] = useState(1); const [limit, setLimit] = useState<10 | 20 | 50>(20); const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [updatedAt, setUpdatedAt] = useState<Date | null>(null); const [refreshKey, setRefreshKey] = useState(0); const [rangeError, setRangeError] = useState("");

  useEffect(() => { void farmService.list({ limit: 100 }).then((data) => setFarms(data.items)).catch(() => setError("Không thể tải trang trại")); }, []);
  useEffect(() => { if (!initialSensorId) return; void sensorService.get(initialSensorId).then((sensor) => { setFarmId(sensor.device.zone.farmId); setZoneId(sensor.device.zoneId); setType(sensor.type); setSensorId(sensor.id); }).catch(() => setError("Không thể mở cảm biến từ liên kết")); }, [initialSensorId]);
  useEffect(() => { if (!farmId) { setZones([]); return; } void zoneService.list({ farmId, limit: 100 }).then((data) => setZones(data.items)); }, [farmId]);
  useEffect(() => { if (!zoneId) { setSensors([]); return; } void sensorService.list({ zoneId, type, limit: 100 }).then((data) => { setSensors(data.items); setSensorId((current) => data.items.some((sensor) => sensor.id === current) ? current : (data.items[0]?.id ?? "")); }); }, [zoneId, type]);

  const loadData = useCallback(async (signal: AbortSignal) => {
    if (!sensorId) { setStatistics(null); setChart(null); setReadings(null); return; }
    setLoading(true); setError(""); setStatistics(null); setChart(null); setReadings(null);
    try {
      const query = { from: range.from, to: range.to };
      const [statisticsData, chartData, readingData] = await Promise.all([sensorService.statistics(sensorId, query, signal), sensorService.chart(sensorId, { ...query, resolution: "auto" }, signal), sensorService.readings(sensorId, { ...query, page, limit, sort: "desc" }, signal)]);
      setStatistics(statisticsData); setChart(chartData); setReadings(readingData); setUpdatedAt(new Date());
    } catch (requestError) { if (!signal.aborted) setError(getApiErrorMessage(requestError, "Không thể tải dữ liệu lịch sử")); }
    finally { if (!signal.aborted) setLoading(false); }
  }, [sensorId, range, page, limit]);
  useEffect(() => { const controller = new AbortController(); void loadData(controller.signal); return () => controller.abort(); }, [loadData, refreshKey]);

  const choosePreset = (value: Exclude<Preset, "custom">) => { const next = presetRange(value); setPreset(value); setRange(next); setCustomFrom(localInput(new Date(next.from))); setCustomTo(localInput(new Date(next.to))); setPage(1); setRangeError(""); };
  const applyCustom = () => { const from = new Date(customFrom); const to = new Date(customTo); if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) { setRangeError("Thời gian bắt đầu phải trước thời gian kết thúc"); return; } if (to.getTime() - from.getTime() > 90 * 86_400_000) { setRangeError("Khoảng thời gian không được vượt quá 90 ngày"); return; } setRangeError(""); setRange({ from: from.toISOString(), to: to.toISOString() }); setPage(1); };
  useEffect(() => { if (sensorId) setSearchParams({ sensorId, range: preset === "custom" ? "custom" : preset }, { replace: true }); }, [sensorId, preset, setSearchParams]);
  const selectedSensor = sensors.find((sensor) => sensor.id === sensorId); const rangeDays = useMemo(() => (new Date(range.to).getTime() - new Date(range.from).getTime()) / 86_400_000, [range]);

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><PageHeader title="Lịch sử dữ liệu cảm biến" description="Theo dõi sự thay đổi của các chỉ số môi trường theo thời gian." eyebrow="Historical telemetry" /><button type="button" disabled={!sensorId || loading} onClick={() => setRefreshKey((value) => value + 1)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border bg-white px-4 text-sm font-bold disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Làm mới dữ liệu</button></div>
    <nav aria-label="Điều hướng dữ liệu cảm biến" className="flex gap-2 border-b"><Link to="/sensors" className="px-4 py-3 text-sm font-semibold text-slate-500">Cảm biến</Link><Link to="/sensors/history" aria-current="page" className="border-b-2 border-brand-600 px-4 py-3 text-sm font-bold text-brand-700">Lịch sử & biểu đồ</Link></nav>
    <section className="surface-card grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
      <label className="text-sm font-semibold">Trang trại<select aria-label="Trang trại lịch sử" value={farmId} onChange={(event) => { setFarmId(event.target.value); setZoneId(""); setSensorId(""); }} className="mt-1.5 h-11 w-full rounded-xl border px-3"><option value="">Chọn trang trại</option>{farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name}</option>)}</select></label>
      <label className="text-sm font-semibold">Khu vực<select aria-label="Khu vực lịch sử" disabled={!farmId} value={zoneId} onChange={(event) => { setZoneId(event.target.value); setSensorId(""); }} className="mt-1.5 h-11 w-full rounded-xl border px-3"><option value="">Chọn khu vực</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></label>
      <label className="text-sm font-semibold">Loại cảm biến<select aria-label="Loại cảm biến lịch sử" value={type} onChange={(event) => { setType(event.target.value as SensorType); setSensorId(""); }} className="mt-1.5 h-11 w-full rounded-xl border px-3">{Object.entries(sensorMetadata).map(([value, metadata]) => <option key={value} value={value}>{metadata.label}</option>)}</select></label>
      <label className="text-sm font-semibold">Cảm biến<select aria-label="Cảm biến lịch sử" disabled={!zoneId} value={sensorId} onChange={(event) => { setSensorId(event.target.value); setPage(1); }} className="mt-1.5 h-11 w-full rounded-xl border px-3"><option value="">Chọn cảm biến</option>{sensors.map((sensor) => <option key={sensor.id} value={sensor.id}>{sensor.sensorCode} · {sensor.name}</option>)}</select></label>
      <div className="md:col-span-2 xl:col-span-4"><p className="text-sm font-semibold">Khoảng thời gian</p><div className="mt-2 flex flex-wrap gap-2">{([['today','Hôm nay'],['7d','7 ngày'],['30d','30 ngày']] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={preset === value} onClick={() => choosePreset(value)} className={`rounded-xl border px-4 py-2 text-sm font-bold ${preset === value ? "border-brand-600 bg-brand-50 text-brand-700" : "bg-white"}`}>{label}</button>)}<button type="button" aria-pressed={preset === "custom"} onClick={() => setPreset("custom")} className={`rounded-xl border px-4 py-2 text-sm font-bold ${preset === "custom" ? "border-brand-600 bg-brand-50 text-brand-700" : "bg-white"}`}>Tùy chỉnh</button></div></div>
      {preset === "custom" && <div className="grid gap-3 md:col-span-2 md:grid-cols-[1fr_1fr_auto] xl:col-span-4"><label className="text-sm font-semibold">Từ<input aria-label="Từ ngày giờ" type="datetime-local" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border px-3" /></label><label className="text-sm font-semibold">Đến<input aria-label="Đến ngày giờ" type="datetime-local" value={customTo} onChange={(event) => setCustomTo(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border px-3" /></label><button type="button" onClick={applyCustom} className="h-11 self-end rounded-xl bg-brand-600 px-5 text-sm font-bold text-white">Áp dụng</button>{rangeError && <p role="alert" className="text-sm text-red-600 md:col-span-3">{rangeError}</p>}</div>}
    </section>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {!sensorId ? <section className="surface-card grid min-h-56 place-items-center p-6 text-center text-slate-400">Hãy chọn trang trại, khu vực và cảm biến để xem lịch sử.</section> : <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{[{ label: "Mới nhất", value: statistics?.latest?.value ?? null }, { label: "Thấp nhất", value: statistics?.minimum ?? null }, { label: "Trung bình", value: statistics?.average ?? null }, { label: "Cao nhất", value: statistics?.maximum ?? null }, { label: "Số phép đo", value: statistics ? statistics.count : null, count: true }].map((card) => <article key={card.label} className="surface-card p-4"><p className="text-xs font-bold uppercase text-slate-400">{card.label}</p><p className="mt-2 text-2xl font-bold">{loading ? "…" : card.count ? (card.value ?? "—") : formatNumber(card.value, statistics?.unit)}</p></article>)}</section>
      <section className="surface-card p-4 sm:p-5"><div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center"><div><h2 className="text-lg font-bold">Biểu đồ {selectedSensor?.name ?? chart?.sensor.name}</h2><p className="text-sm text-slate-500">Đường biểu diễn giá trị trung bình theo bucket · Resolution: {chart?.resolution ?? "auto"}</p></div>{updatedAt && <p className="text-xs text-slate-400">Cập nhật lần cuối {formatDate(updatedAt.toISOString())}</p>}</div><SensorHistoryChart points={chart?.points ?? []} unit={chart?.sensor.unit ?? selectedSensor?.unit ?? ""} loading={loading} rangeDays={rangeDays} /></section>
      <section className="surface-card overflow-hidden"><div className="flex flex-col justify-between gap-3 border-b p-5 sm:flex-row sm:items-center"><div><h2 className="text-lg font-bold">Dữ liệu chi tiết</h2><p className="text-sm text-slate-500">Reading thô, sắp xếp theo thời gian đo mới nhất.</p></div><label className="text-sm font-semibold">Số dòng <select aria-label="Số dòng mỗi trang" value={limit} onChange={(event) => { setLimit(Number(event.target.value) as 10 | 20 | 50); setPage(1); }} className="ml-2 h-9 rounded-lg border px-2"><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select></label></div>
        {loading ? <div className="space-y-3 p-5">{[1,2,3].map((item) => <div key={item} className="h-12 animate-pulse rounded-xl bg-slate-100" />)}</div> : !readings?.items.length ? <p className="p-10 text-center text-sm text-slate-400">Không có dữ liệu trong khoảng thời gian đã chọn.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left"><thead className="bg-slate-50 text-xs uppercase text-slate-400"><tr><th className="px-5 py-3">Thời gian đo</th><th className="px-5 py-3">Giá trị</th><th className="px-5 py-3">Đơn vị</th><th className="px-5 py-3">Nguồn dữ liệu</th><th className="px-5 py-3">Server nhận</th></tr></thead><tbody className="divide-y">{readings.items.map((item) => <tr key={item.id}><td className="px-5 py-3 text-sm">{formatDate(item.recordedAt)}</td><td className="px-5 py-3 font-bold">{formatNumber(item.value)}</td><td className="px-5 py-3 text-sm">{readings.sensor.unit}</td><td className="px-5 py-3 text-sm">{item.source === "SIMULATOR" ? "Mô phỏng" : "MQTT"}</td><td className="px-5 py-3 text-sm text-slate-500">{formatDate(item.receivedAt)}</td></tr>)}</tbody></table></div>}
        <div className="flex items-center justify-between border-t px-5 py-4 text-sm text-slate-500"><span>{readings?.pagination.total ?? 0} phép đo</span><div className="flex items-center gap-2"><button aria-label="Trang trước" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="rounded-lg border p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><span>Trang {page} / {Math.max(1, readings?.pagination.totalPages ?? 1)}</span><button aria-label="Trang sau" disabled={page >= (readings?.pagination.totalPages ?? 0) || loading} onClick={() => setPage((value) => value + 1)} className="rounded-lg border p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div>
      </section>
    </>}
  </div>;
}
