export const AppFormatters = {
  dateTime(iso?: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour12: false,
    }).format(d);
  },

  shortDateTime(iso?: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      hour12: false,
    }).format(d);
  },

  number(value?: number | string | null, digits = 1): string {
    if (value === null || value === undefined || value === '') return '—';
    const num = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(num)) return '—';
    return new Intl.NumberFormat('vi-VN', {
      maximumFractionDigits: digits,
    }).format(num);
  },

  sensorTypeLabel(type?: string): string {
    switch (type) {
      case 'TEMP':
        return 'Nhiệt độ';
      case 'AIR_HUMIDITY':
        return 'Độ ẩm không khí';
      case 'SOIL_MOISTURE':
        return 'Độ ẩm đất';
      case 'LIGHT':
        return 'Ánh sáng';
      default:
        return 'Cảm biến';
    }
  },

  sensorUnit(type?: string, fallbackUnit?: string): string {
    if (fallbackUnit) return fallbackUnit;
    switch (type) {
      case 'TEMP':
        return '°C';
      case 'AIR_HUMIDITY':
      case 'SOIL_MOISTURE':
        return '%';
      case 'LIGHT':
        return 'lux';
      default:
        return '';
    }
  },

  sensorColor(type?: string): string {
    switch (type) {
      case 'TEMP':
        return '#EA580C';
      case 'AIR_HUMIDITY':
        return '#0284C7';
      case 'SOIL_MOISTURE':
        return '#16A34A';
      case 'LIGHT':
        return '#D97706';
      default:
        return '#475569';
    }
  },

  roleLabel(role?: string): string {
    switch (role) {
      case 'ADMIN':
        return 'Quản trị viên';
      case 'FARM_OWNER':
        return 'Chủ trang trại';
      case 'STAFF':
        return 'Nhân viên';
      default:
        return 'Người dùng';
    }
  },

  activeStatusLabel(status?: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'Hoạt động';
      case 'INACTIVE':
        return 'Ngừng hoạt động';
      case 'MAINTENANCE':
        return 'Bảo trì';
      default:
        return 'Chưa xác định';
    }
  },

  connectionLabel(status?: string): string {
    switch (status) {
      case 'ONLINE':
        return 'Trực tuyến';
      case 'OFFLINE':
        return 'Ngoại tuyến';
      default:
        return 'Đang đồng bộ';
    }
  },

  actuatorStateLabel(state?: string, connectionStatus?: string): string {
    if (connectionStatus === 'OFFLINE') return 'Thiết bị ngoại tuyến';
    switch (state) {
      case 'ON':
        return 'Đang tưới';
      case 'OFF':
        return 'Đang tắt';
      default:
        return 'Đang đồng bộ';
    }
  },

  actuatorTypeLabel(type?: string): string {
    switch (type) {
      case 'PUMP':
        return 'Máy bơm tưới';
      case 'VALVE':
        return 'Van tưới';
      case 'RELAY':
        return 'Công tắc điều khiển';
      default:
        return 'Thiết bị tưới';
    }
  },

  deviceTypeLabel(type?: string): string {
    switch (type) {
      case 'CONTROLLER':
        return 'Bộ điều khiển trung tâm';
      case 'GATEWAY':
        return 'Trạm thu phát';
      default:
        return 'Thiết bị IoT';
    }
  },

  cropStatusLabel(status?: string): string {
    switch (status) {
      case 'PLANNED':
        return 'Dự kiến';
      case 'GROWING':
        return 'Đang trồng';
      case 'HARVESTED':
        return 'Đã thu hoạch';
      case 'CANCELLED':
        return 'Đã hủy';
      default:
        return 'Đang theo dõi';
    }
  },

  severityLabel(severity?: string): string {
    switch (severity) {
      case 'CRITICAL':
        return 'Nghiêm trọng';
      case 'WARNING':
        return 'Cảnh báo';
      case 'INFO':
        return 'Thông tin';
      default:
        return 'Thông báo';
    }
  },

  severityColor(severity?: string): string {
    switch (severity) {
      case 'CRITICAL':
        return '#DC2626';
      case 'WARNING':
        return '#D97706';
      default:
        return '#2563EB';
    }
  },

  alertStatusLabel(status?: string): string {
    switch (status) {
      case 'OPEN':
        return 'Đang mở';
      case 'ACKNOWLEDGED':
        return 'Đã xác nhận';
      case 'RESOLVED':
        return 'Đã xử lý';
      default:
        return 'Đang mở';
    }
  },

  operatorSymbol(op?: string): string {
    switch (op) {
      case 'LT':
        return '<';
      case 'LTE':
        return '≤';
      case 'GT':
        return '>';
      case 'GTE':
        return '≥';
      default:
        return op ?? '';
    }
  },

  cleanDescription(text?: string | null): string {
    if (!text) return '';
    return text
      .replace(/ESP32-GF-A-01/g, 'Bộ điều khiển Khu A')
      .replace(/ESP32-GF-B-01/g, 'Bộ điều khiển Khu B')
      .replace(/\bPUMP_0*\d+\b/g, 'Máy bơm')
      .replace(/\bSOIL_0*\d+\b/g, 'Cảm biến độ ẩm đất')
      .replace(/\bTEMP_0*\d+\b/g, 'Cảm biến nhiệt độ')
      .replace(/\bHUM_0*\d+\b/g, 'Cảm biến độ ẩm không khí')
      .replace(/\bLIGHT_0*\d+\b/g, 'Cảm biến ánh sáng')
      .replace(/\bTURN_ON\b/g, 'Bật máy bơm')
      .replace(/\bTURN_OFF\b/g, 'Tắt máy bơm');
  },

  commandFailureLabel(reason?: string | null): string {
    if (!reason || !reason.trim()) {
      return 'Chưa nhận được phản hồi từ thiết bị';
    }
    const code = reason.trim().toUpperCase();
    if (code.includes('ACK_TIMEOUT') || code.includes('TIMEOUT')) {
      return 'Thiết bị phản hồi chậm, vui lòng thử lại';
    }
    if (code.includes('OFFLINE')) {
      return 'Thiết bị hiện đang ngoại tuyến';
    }
    if (code.includes('BROKER') || code.includes('MQTT')) {
      return 'Kết nối truyền tin thiết bị tạm gián đoạn';
    }
    if (code.includes('SUPERSEDED_BY_OFF')) {
      return 'Đã dừng theo lệnh tắt mới hơn';
    }
    if (code.includes('DEVICE_REPORTED_OFF') || code.includes('REPORTED_OFF')) {
      return 'Thiết bị xác nhận đã tắt an toàn';
    }
    if (code.includes('EXPIRED')) {
      return 'Yêu cầu đã hết thời gian chờ xử lý';
    }
    if (code.includes('REJECTED')) {
      return 'Thiết bị đang bận hoặc chưa sẵn sàng thực hiện';
    }
    if (code.includes('MANUAL_OVERRIDE')) {
      return 'Đang ưu tiên chế độ điều khiển thủ công';
    }
    if (code.includes('GATEWAY')) {
      return 'Không thể gửi tín hiệu tới thiết bị';
    }
    return AppFormatters.cleanDescription(reason);
  },

  friendlyError(error: unknown): string {
    if (!error) return 'Đã xảy ra lỗi, vui lòng thử lại.';
    const raw = (error instanceof Error ? error.message : String(error)).trim();
    if (!raw) return 'Đã xảy ra lỗi, vui lòng thử lại.';
    const lower = raw.toLowerCase();

    if (
      lower.includes('prisma') ||
      lower.includes("can't reach database") ||
      lower.includes('database server') ||
      raw.includes('C:\\') ||
      raw.includes('/dist/')
    ) {
      return 'Hệ thống đang bận xử lý dữ liệu, vui lòng thử lại sau giây lát.';
    }
    if (
      lower.includes('network request failed') ||
      lower.includes('failed to fetch') ||
      lower.includes('không thể kết nối tới máy chủ') ||
      lower.includes('aborted')
    ) {
      return 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra Wi-Fi hoặc địa chỉ IP máy chủ.';
    }
    if (lower.includes('timeout')) {
      return 'Kết nối phản hồi chậm, vui lòng thử lại.';
    }
    if (lower.includes('không online') || lower.includes('heartbeat')) {
      return 'Thiết bị tưới đang ngoại tuyến, chưa thể bật lúc này.';
    }
    if (lower.includes('chờ ack')) {
      return 'Máy bơm đang xử lý yêu cầu trước đó, vui lòng đợi vài giây.';
    }
    if (lower.includes('đã được xác nhận on')) {
      return 'Máy bơm hiện đang hoạt động rồi.';
    }
    if (lower.includes('2 giây giữa các lệnh')) {
      return 'Vui lòng đợi 2 giây trước khi thao tác tiếp.';
    }
    if (lower.includes('báo cáo relay đáng tin cậy')) {
      return 'Đang đồng bộ trạng thái từ thiết bị, vui lòng thử lại sau vài giây.';
    }
    if (lower.includes('mqtt') || lower.includes('allowlist')) {
      return 'Kết nối điều khiển thiết bị chưa sẵn sàng, vui lòng kiểm tra lại.';
    }

    const firstLine = AppFormatters.cleanDescription(raw.split('\n')[0].trim());
    if (firstLine.length > 130) {
      return 'Không thể hoàn tất thao tác lúc này, vui lòng thử lại.';
    }
    return firstLine;
  },
};
