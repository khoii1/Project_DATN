import type { UserRole } from '@prisma/client';
import { reportRepository, type ReportScope } from '../repositories/report.repository';
import type { AlertReportQuery, ReportExportQuery, ReportQuery, SensorReportQuery } from '../validators/report.schema';
import { AppError } from '../utils/app-error';
import { prisma } from '../config/database';
import { activityLogService } from './activity-log.service';

interface Actor { id: string; role: UserRole }
const MAX_EXPORT_ROWS = 100_000;

async function scope(query: ReportQuery, actor: Actor): Promise<ReportScope> {
  const farmIds = await reportRepository.accessibleFarmIds(actor);
  if (query.farmId && !farmIds.includes(query.farmId)) throw new AppError(404, 'Không tìm thấy trang trại');
  if (query.zoneId) {
    const zone = await prisma.zone.findFirst({ where: { id: query.zoneId, farmId: { in: farmIds }, ...(query.farmId ? { farmId: query.farmId } : {}) }, select: { id: true } });
    if (!zone) throw new AppError(404, 'Không tìm thấy khu vực');
  }
  return { farmIds, farmId: query.farmId, zoneId: query.zoneId, from: query.from, to: query.to };
}

const sensorTypeLabels: Record<string, string> = {
  TEMP: 'Nhiệt độ',
  AIR_HUMIDITY: 'Độ ẩm không khí',
  SOIL_MOISTURE: 'Độ ẩm đất',
  LIGHT: 'Ánh sáng',
};

const sourceLabels: Record<string, string> = {
  MQTT: 'Thiết bị thực (MQTT)',
  SIMULATOR: 'Mô phỏng (SIMULATOR)',
  MANUAL: 'Thủ công',
  AUTOMATION: 'Tự động',
};

const statusLabels: Record<string, string> = {
  SUCCESS: 'Thành công',
  FAILED: 'Thất bại',
  PENDING: 'Đang xử lý',
  OPEN: 'Đang mở',
  ACKNOWLEDGED: 'Đã xác nhận',
  RESOLVED: 'Đã xử lý',
};

const severityLabels: Record<string, string> = {
  INFO: 'Thông tin',
  WARNING: 'Cảnh báo',
  CRITICAL: 'Nghiêm trọng',
};

function formatVnDate(value: Date | string | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = value instanceof Date ? formatVnDate(value) : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function csv(headers: string[], rows: unknown[][]) {
  return `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
}

function ensureLimit(rows: unknown[]) {
  if (rows.length > MAX_EXPORT_ROWS) throw new AppError(413, 'Khoảng dữ liệu quá lớn, vui lòng thu hẹp bộ lọc');
}

export const reportService = {
  async overview(query: ReportQuery, actor: Actor) { return reportRepository.overview(await scope(query, actor)); },
  async sensors(query: SensorReportQuery, actor: Actor) { return reportRepository.sensors(await scope(query, actor), query.sensorType); },
  async alerts(query: AlertReportQuery, actor: Actor) { return reportRepository.alerts(await scope(query, actor), query.severity); },
  async irrigation(query: ReportQuery, actor: Actor) { return reportRepository.irrigation(await scope(query, actor)); },
  async automation(query: ReportQuery, actor: Actor) { return reportRepository.automation(await scope(query, actor)); },
  async export(query: ReportExportQuery, actor: Actor) {
    const reportScope = await scope(query, actor); let content: string;
    if (query.type === 'sensor-readings') {
      const rows = await reportRepository.exportSensorReadings(reportScope, MAX_EXPORT_ROWS + 1); ensureLimit(rows);
      content = csv(
        ['Thời gian đo (GMT+7)', 'Trang trại', 'Khu vực', 'Thiết bị', 'Mã cảm biến', 'Tên cảm biến', 'Loại cảm biến', 'Giá trị', 'Đơn vị', 'Nguồn dữ liệu', 'Thời gian lưu'],
        rows.map((r) => [r.recordedAt, r.sensor.device.zone.farm.name, r.sensor.device.zone.name, r.sensor.device.name, r.sensor.sensorCode, r.sensor.name, sensorTypeLabels[r.sensor.type] ?? r.sensor.type, r.value, ({ TEMP: '°C', AIR_HUMIDITY: '%', SOIL_MOISTURE: '%', LIGHT: 'lux' } as const)[r.sensor.type], sourceLabels[r.source] ?? r.source, r.receivedAt]),
      );
    } else if (query.type === 'alerts') {
      const rows = await reportRepository.exportAlerts(reportScope, MAX_EXPORT_ROWS + 1); ensureLimit(rows);
      content = csv(
        ['Thời gian phát hiện', 'Thời gian xử lý', 'Trang trại', 'Khu vực', 'Thiết bị', 'Mã cảm biến', 'Quy tắc cảnh báo', 'Mức độ', 'Trạng thái', 'Giá trị kích hoạt', 'Giá trị cuối', 'Ngưỡng cảnh báo', 'Ngưỡng phục hồi', 'Ghi chú xử lý', 'Người xác nhận', 'Người xử lý'],
        rows.map((r) => [r.openedAt, r.resolvedAt, r.sensor.device.zone.farm.name, r.sensor.device.zone.name, r.sensor.device.name, r.sensor.sensorCode, r.alertRule.name, severityLabels[r.severitySnapshot] ?? r.severitySnapshot, statusLabels[r.status] ?? r.status, r.triggerValue, r.lastValue, r.thresholdSnapshot, r.recoverySnapshot, r.resolutionReason, r.acknowledgedBy?.fullName, r.resolvedBy?.fullName]),
      );
    } else if (query.type === 'device-commands') {
      const rows = await reportRepository.exportCommands(reportScope, MAX_EXPORT_ROWS + 1); ensureLimit(rows);
      content = csv(
        ['Thời gian gửi lệnh', 'Thời gian hoàn tất', 'Trang trại', 'Khu vực', 'Thiết bị', 'Mã máy bơm', 'Lệnh điều khiển', 'Nguồn lệnh', 'Trạng thái', 'Người thao tác', 'Quy tắc tự động', 'Chi tiết lỗi', 'Mã đối chiếu'],
        rows.map((r) => [r.requestedAt, r.completedAt, r.actuator.device.zone.farm.name, r.actuator.device.zone.name, r.actuator.device.name, r.actuator.actuatorCode, r.command === 'TURN_ON' ? 'Bật máy bơm' : 'Tắt máy bơm', sourceLabels[r.source] ?? r.source, statusLabels[r.status] ?? r.status, r.requestedBy?.fullName, r.automationRule?.name, r.failureReason, r.correlationId]),
      );
    } else {
      const rows = await activityLogService.exportRows({ farmId: query.farmId, from: query.from, to: query.to }, actor); ensureLimit(rows);
      content = csv(
        ['Thời gian', 'Người dùng', 'Vai trò', 'Hành động', 'Loại đối tượng', 'Mã đối tượng', 'Trang trại', 'Mô tả chi tiết', 'Địa chỉ IP'],
        rows.map((r) => [r.createdAt, r.user?.fullName, r.user?.role, r.action, r.entityType, r.entityId, r.farm?.name, r.description, r.ipAddress]),
      );
    }
    return { content, filename: `smart-agriculture-${query.type}-${new Date().toISOString().slice(0, 10)}.csv` };
  },
};
