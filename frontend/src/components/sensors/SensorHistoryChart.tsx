import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SensorChartPoint } from "../../types/sensor";

interface Props { points: SensorChartPoint[]; unit: string; loading: boolean; rangeDays: number }
const formatValue = (value: number) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value);

export function SensorHistoryChart({ points, unit, loading, rangeDays }: Props) {
  if (loading) return <div className="h-[320px] animate-pulse rounded-xl bg-slate-100" aria-label="Đang tải biểu đồ" />;
  if (points.length === 0) return <div className="grid h-[320px] place-items-center rounded-xl border border-dashed text-sm text-slate-400">Không có dữ liệu trong khoảng thời gian đã chọn.</div>;
  return <div className="h-[300px] w-full sm:h-[360px]" role="img" aria-label={`Biểu đồ lịch sử cảm biến: ${points.length} bucket, đơn vị ${unit}, mỗi điểm là giá trị trung bình; thời gian UTC+7. Dữ liệu chi tiết ở bảng bên dưới.`}>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={points} margin={{ top: 10, right: 12, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="timestamp" minTickGap={28} tickFormatter={(value: string) => new Intl.DateTimeFormat("vi-VN", rangeDays <= 1 ? { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" } : { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit" }).format(new Date(value))} tick={{ fontSize: 11 }} />
        <YAxis width={55} domain={["auto", "auto"]} tick={{ fontSize: 11 }} unit={` ${unit}`} />
        <Tooltip content={({ active, payload }) => { const point = payload?.[0]?.payload as SensorChartPoint | undefined; if (!active || !point) return null; return <div className="rounded-xl border bg-white p-3 text-xs shadow-lg"><p className="font-bold">{new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "medium" }).format(new Date(point.timestamp))}</p><p className="mt-2">Trung bình: <b>{formatValue(point.value)} {unit}</b></p>{point.count > 1 && <><p>Thấp nhất: {formatValue(point.min)} {unit}</p><p>Cao nhất: {formatValue(point.max)} {unit}</p><p>Số mẫu: {point.count}</p></>}</div>; }} />
        <Line type="monotone" dataKey="value" name="Giá trị" stroke="#16a34a" strokeWidth={2.5} dot={points.length < 80} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>;
}
