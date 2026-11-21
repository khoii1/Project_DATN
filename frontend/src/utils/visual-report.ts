import type { AlertReport, AutomationReport, IrrigationReport, ReportOverview, ReportQuery, SensorReportItem } from '../types/report';

export interface VisualReportData {
  query: ReportQuery;
  farmName: string;
  zoneName: string;
  overview: ReportOverview;
  sensors: SensorReportItem[];
  alerts: AlertReport;
  irrigation: IrrigationReport;
  automation: AutomationReport;
  generatedAt?: Date;
}

const labels: Record<string, string> = { TEMP: 'Nhiệt độ', AIR_HUMIDITY: 'Độ ẩm không khí', SOIL_MOISTURE: 'Độ ẩm đất', LIGHT: 'Ánh sáng' };
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const number = (value: number | null | undefined, digits = 1) => value == null || !Number.isFinite(value) ? '—' : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: digits }).format(value);
const date = (value: string | Date) => new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value));

interface BarValue { label: string; value: number | null; color: string }
function chart(title: string, rows: BarValue[], unit = '') {
  const valid = rows.filter(row => row.value != null && Number.isFinite(row.value));
  if (!valid.length) return '<div class="empty">Chưa có dữ liệu đo trong khoảng đã chọn.</div>';
  // A zero baseline also supports negative temperatures. Null measurements stay missing, not zero.
  const low = Math.min(0, ...valid.map(row => row.value!));
  const high = Math.max(0, ...valid.map(row => row.value!));
  const span = high - low || 1;
  const y = (value: number) => 35 + (high - value) / span * 95;
  const baseline = y(0);
  const step = 300 / Math.max(rows.length, 1);
  const bars = rows.map((row, index) => {
    const x = 45 + index * step;
    const valueY = row.value != null && Number.isFinite(row.value) ? y(row.value) : null;
    const bar = valueY == null ? '' : `<rect x="${x}" y="${Math.min(valueY, baseline)}" width="${Math.min(48, step - 14)}" height="${Math.abs(baseline - valueY)}" rx="3" fill="${row.color}"/>`;
    return `${bar}<text x="${x + 24}" y="${valueY == null ? 80 : row.value! < 0 ? valueY + 15 : valueY - 8}" text-anchor="middle" class="value">${number(row.value)}${escapeHtml(unit ? ` ${unit}` : '')}</text><text x="${x + 24}" y="165" text-anchor="middle">${escapeHtml(row.label)}</text>`;
  }).join('');
  return `<svg viewBox="0 0 380 182" role="img" aria-label="${escapeHtml(title)}"><title>${escapeHtml(title)}</title><line x1="25" x2="370" y1="${baseline}" y2="${baseline}" stroke="#dbe5e0"/>${bars}</svg>`;
}

const metric = (label: string, value: number, note: string) => `<div class="metric"><span>${escapeHtml(label)}</span><strong>${number(value, 0)}</strong><small>${escapeHtml(note)}</small></div>`;

/** Standalone, escaped HTML with vector charts; no external fonts, images, scripts or API requests. */
export function buildVisualReport(data: VisualReportData): string {
  const { overview: o, irrigation: i, alerts: a, automation, sensors } = data;
  const generatedAt = data.generatedAt ?? new Date();
  const sensorCards = sensors.map(sensor => {
    const title = labels[sensor.sensorType] ?? sensor.sensorType;
    const bars = [
      { label: 'Thấp nhất', value: sensor.minimum, color: '#93c5fd' },
      { label: 'Trung bình', value: sensor.average, color: '#16a36b' },
      { label: 'Cao nhất', value: sensor.maximum, color: '#f6b34f' },
    ];
    return `<article class="panel"><div class="panel-head"><h3>${escapeHtml(title)}</h3><span>${number(sensor.readingCount, 0)} phép đo · ${escapeHtml(sensor.unit)}</span></div>${chart(title, bars, sensor.unit)}<p class="caption">Mới nhất: <b>${number(sensor.latest?.value)} ${escapeHtml(sensor.unit)}</b>${sensor.latest ? ` · ${escapeHtml(date(sensor.latest.recordedAt))}` : ''}</p></article>`;
  }).join('');
  const ruleRows = automation.breakdown.map(row => `<tr><td>${escapeHtml(row.ruleName)}</td><td>${escapeHtml(row.zone)}</td><td>${number(row.commandCount, 0)}</td><td>${number(row.successfulCommands, 0)}</td><td>${number(row.failedCommands, 0)}</td></tr>`).join('');

  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Báo cáo Smart Agriculture</title><style>
    *{box-sizing:border-box}body{margin:0;background:#edf2ef;color:#163b30;font:13px Arial,sans-serif;line-height:1.45}h1,h2,h3,p{margin:0}h1{font-size:25px;line-height:1.2}h2{font-size:17px;margin-bottom:12px}h3{font-size:14px}svg{display:block;width:100%;height:auto}svg text{font:11px Arial,sans-serif;fill:#52665e}svg .value{font-weight:700;fill:#163b30}.toolbar{max-width:980px;margin:20px auto;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;gap:16px}.toolbar button{background:#15734e;color:white;border:0;padding:12px 18px;border-radius:8px;cursor:pointer;font-weight:bold}.sheet{max-width:980px;margin:0 auto 24px;background:white;padding:32px;box-shadow:0 3px 18px #163b3010}.heading{border-bottom:3px solid #19a36c;padding-bottom:18px;margin-bottom:18px}.brand{color:#17835b;font-weight:bold;letter-spacing:2px;font-size:11px;margin-bottom:8px}.scope{margin-top:10px;color:#52665e;overflow-wrap:anywhere}.scope b{color:#163b30}.section{margin-top:22px}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.metric{padding:13px 15px;background:#f2f8f4;border:1px solid #e0ece4;border-radius:10px}.metric span,.metric small{display:block;color:#52665e}.metric strong{font-size:26px;display:block;line-height:1.3;margin:4px 0}.metric small{font-size:11px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.panel{border:1px solid #e0e9e3;border-radius:10px;padding:14px;break-inside:avoid}.panel-head{display:flex;justify-content:space-between;align-items:baseline;gap:8px}.panel-head span,.caption{font-size:11px;color:#52665e}.caption{margin-top:6px}.note{padding:10px 12px;background:#fff8e7;color:#7c5c16;border-radius:7px;font-size:11px;margin-top:14px}.empty{padding:35px 12px;text-align:center;color:#6a7d73}table{width:100%;border-collapse:collapse;font-size:12px}th{text-align:left;background:#f0f7f3}td,th{padding:9px 8px;border-bottom:1px solid #e0e9e3;overflow-wrap:anywhere}tr{break-inside:avoid}thead{display:table-header-group}.footer{margin-top:20px;padding-top:12px;border-top:1px solid #e0e9e3;color:#718176;font-size:10px}.muted{color:#6a7d73;font-size:11px;margin-bottom:10px}
    @page{size:A4;margin:12mm}@media print{
      body{background:white;font-size:10px;line-height:1.3;print-color-adjust:exact;-webkit-print-color-adjust:exact}
      .toolbar{display:none}
      .sheet{margin:0;padding:0;max-width:none;box-shadow:none}
      .sheet+.sheet{break-before:page}
      .sheet h1{font-size:21px}.sheet h2{font-size:14px;margin-bottom:8px}.sheet h3{font-size:12px}
      .heading{padding-bottom:10px;margin-bottom:12px}.brand{margin-bottom:5px}.scope{margin-top:6px;font-size:10px}
      .section{margin-top:12px}.grid,.metrics{gap:8px}.panel{padding:8px}
      .panel svg{height:34mm;width:100%}
      .panel-head span,.caption{font-size:10px}.caption{margin-top:4px}
      .metric{padding:8px 10px}.metric strong{font-size:22px;margin:3px 0}.metric small{font-size:10px}
      .muted{font-size:10px;margin-bottom:8px}
      .sheet-end{break-inside:avoid;page-break-inside:avoid}
      .note{padding:7px 9px;font-size:10px;margin-top:10px}
      .footer{margin-top:8px;padding-top:6px;font-size:9px}
      a{color:inherit}
    }@media screen and (max-width:650px){.sheet{padding:18px}.grid{grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,1fr)}.toolbar{flex-wrap:wrap}}
    </style></head><body><div class="toolbar"><span>Bản báo cáo trực quan · Chọn <b>Lưu dưới dạng PDF</b> trong hộp thoại in.</span><button id="print-report" type="button">In / Lưu PDF</button></div>
    <main><section class="sheet"><header class="heading"><p class="brand">SMART AGRICULTURE</p><h1>Báo cáo tổng hợp nông nghiệp</h1><p class="scope">${escapeHtml(date(data.query.from))} — ${escapeHtml(date(data.query.to))} (UTC+7)<br><b>${escapeHtml(data.farmName)}</b> · ${escapeHtml(data.zoneName)}<br>Xuất lúc ${escapeHtml(date(generatedAt))} (UTC+7)</p></header>
    <h2>Tổng quan hệ thống</h2><p class="muted">Số lượng tài nguyên và kết nối là trạng thái được API trả về khi tải báo cáo; không phải thống kê lịch sử của cả kỳ.</p><div class="metrics">
    ${metric('Trang trại / Khu vực', o.farmCount, `${o.zoneCount} khu vực · ${o.cropCount} cây trồng`)}${metric('Thiết bị', o.deviceCount, `${o.deviceOnline} trực tuyến · ${o.deviceOffline} ngoại tuyến`)}${metric('Cảm biến', o.sensorCount, `${number(o.sensorReadingCount, 0)} phép đo trong kỳ`)}
    ${metric('Cảnh báo mới trong kỳ', o.newAlertCount, `${o.activeAlertCount} cảnh báo đang hoạt động khi tải`)}${metric('Lệnh tưới trong kỳ', i.totalCommands, `${i.manualCommands} thủ công · ${i.automationCommands} tự động`)}${metric('Quy tắc tự động', automation.totalRules, `${automation.enabledRules} đang bật khi tải`)}
    </div><section class="section"><h2>Chỉ số môi trường trong kỳ</h2><p class="muted">Thấp nhất / trung bình / cao nhất theo từng loại cảm biến. Mỗi biểu đồ có đơn vị và thang riêng; không phải biểu đồ diễn biến theo thời gian.</p><div class="grid">${sensorCards || '<div class="empty">Không có dữ liệu cảm biến trong khoảng đã chọn.</div>'}</div></section>
    <div class="sheet-end"><p class="note">Độ ẩm đất: báo cáo không xác nhận hiệu chuẩn cảm biến. Phần trăm hiển thị không phải bằng chứng cho phép tưới tự động vật lý.</p><footer class="footer">Smart Agriculture · Tổng quan và môi trường · Dữ liệu theo phạm vi được cấp quyền.</footer></div></section>
    <section class="sheet"><header class="heading"><p class="brand">SMART AGRICULTURE</p><h1>Cảnh báo & hoạt động tưới</h1><p class="scope">${escapeHtml(data.farmName)} · ${escapeHtml(data.zoneName)}<br>${escapeHtml(date(data.query.from))} — ${escapeHtml(date(data.query.to))} (UTC+7)</p></header>
    <div class="grid"><article class="panel"><h3>Mức độ cảnh báo phát sinh</h3>${chart('Mức độ cảnh báo', [{ label: 'Thông tin', value: a.info, color: '#60a5fa' }, { label: 'Cảnh báo', value: a.warning, color: '#f6b34f' }, { label: 'Nghiêm trọng', value: a.critical, color: '#ef7070' }])}<p class="caption">${number(a.totalOpened, 0)} phát sinh · ${number(a.totalResolved, 0)} đã xử lý · Xử lý trung bình: ${number(a.averageResolutionMinutes)} phút</p></article>
    <article class="panel"><h3>Nguồn lệnh tưới</h3>${chart('Nguồn lệnh tưới', [{ label: 'Thủ công', value: i.manualCommands, color: '#60a5fa' }, { label: 'Tự động', value: i.automationCommands, color: '#a78bfa' }])}<p class="caption">Tổng ${number(i.totalCommands, 0)} lệnh trong kỳ</p></article>
    <article class="panel"><h3>Kết quả xử lý lệnh</h3>${chart('Kết quả xử lý lệnh', [{ label: 'Thành công', value: i.successfulCommands, color: '#16a36b' }, { label: 'Thất bại', value: i.failedCommands, color: '#ef7070' }, { label: 'Đang chờ', value: i.pendingCommands, color: '#f6b34f' }])}<p class="caption">Tỉ lệ thành công: ${i.successRate == null ? '—' : `${number(i.successRate * 100)}%`}</p></article>
    <article class="panel"><h3>Tóm tắt tự động hóa</h3><div class="metric"><strong>${number(automation.automaticCommands, 0)}</strong><span>Lệnh tự động trong kỳ</span></div><p class="caption">${number(automation.rulesWithCommands, 0)} quy tắc có lệnh · ${number(automation.rulesWithoutCommands, 0)} quy tắc chưa có lệnh</p><p class="caption">${number(automation.enabledRules, 0)} / ${number(automation.totalRules, 0)} quy tắc đang bật khi tải</p></article></div>
    <section class="section"><h2>Hoạt động theo quy tắc</h2>${ruleRows ? `<table><thead><tr><th>Quy tắc</th><th>Khu vực</th><th>Số lệnh</th><th>Thành công</th><th>Thất bại</th></tr></thead><tbody>${ruleRows}</tbody></table>` : '<p class="empty">Không có quy tắc trong phạm vi báo cáo.</p>'}</section>
    <div class="sheet-end"><p class="note">Trạng thái lệnh là kết quả phần mềm ghi nhận, không xác nhận động cơ hoặc nước chảy. Báo cáo không gửi lệnh điều khiển.</p><footer class="footer">Smart Agriculture · Cảnh báo và tưới · Múi giờ UTC+7.</footer></div></section></main></body></html>`;
}

/** Called synchronously from a user click so the preview can be opened without async popup blocking. */
export function printVisualReport(data: VisualReportData): void {
  const html = buildVisualReport(data);
  const preview = window.open('', '_blank');
  if (!preview) throw new Error('Trình duyệt đã chặn cửa sổ báo cáo. Vui lòng cho phép cửa sổ bật lên rồi thử lại.');
  preview.opener = null;
  preview.document.open();
  preview.document.write(html);
  preview.addEventListener('load', () => {
    preview.document.getElementById('print-report')?.addEventListener('click', () => preview.print());
    preview.focus();
    preview.print();
  }, { once: true });
  preview.document.close();
}
