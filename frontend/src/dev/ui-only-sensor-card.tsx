// Only selected by the dedicated DEV UI-only Vite plugin. No production import.
import type { AlertSeverity } from '../types/alert';
import { severityLabels } from '../types/alert';
import type { SensorType } from '../types/sensor';
import { sensorMetadata } from '../types/sensor';
interface Props { type: SensorType; value: number | null; recordedAt: string | null; name?: string; alertSeverity?: AlertSeverity }
export function SensorValueCard({type,value,recordedAt,name,alertSeverity}:Props){
 return <article className="rounded-2xl border border-amber-200 p-4">
  <p>{name || sensorMetadata[type].label}</p>
  <p className="text-xl font-bold">{value===null?'Chưa có dữ liệu lịch sử':`${value} ${sensorMetadata[type].unit}`}</p>
  <p>Dữ liệu lịch sử / last-known — không LIVE</p>
  <p>{recordedAt?`Đo lúc ${new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',dateStyle:'short',timeStyle:'medium'}).format(new Date(recordedAt))} (UTC+7)`:'Chưa có timestamp đo'}</p>
  <p>{type==='SOIL_MOISTURE'?'SOIL_01: chưa hiệu chuẩn, chất lượng chưa xác minh — không dùng tưới tự động':'Chất lượng cảm biến chưa được nghiệm thu; dữ liệu đã lưu'}</p>
  {alertSeverity && <p>Cảnh báo ngưỡng đã ghi nhận: {severityLabels[alertSeverity]}</p>}
 </article>;
}
