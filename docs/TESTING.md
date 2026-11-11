# Build và kiểm thử

## Nghiệm thu MVP không tác động production

Từ root: `npm run qa:offline`, `npm --prefix frontend run build`, `npm --prefix frontend run lint`, `node backend/node_modules/typescript/bin/tsc --noEmit -p backend/tsconfig.json`, rồi `npm run qa:acceptance-browser`.

Allowlist offline không gọi startup/DDL/seed/SQL/API production. Preload từ chối `.env` và config runtime; mạng chỉ cho mock HTTP loopback với port0 do chính test tạo, không cho cổng dịch vụ hiện hữu. Test env không kế thừa credentials/NODE_OPTIONS. Đây là lớp bảo vệ QA, không phải sandbox chống mã test độc hại.

Browser acceptance phục vụ built assets trên port loopback ngẫu nhiên, mock mọi API, chặn origin ngoài, không khởi động backend hoặc Vite. Edge cài sẵn là điều kiện; không tự cài. `npm run demo:simulation` mở Edge hiển thị cùng kịch bản, có banner SIMULATION và tự đóng sau kiểm tra. Ba yêu cầu ON trong mock là fixture API bị intercept, không dùng hoặc mở rộng approval bơm thật.

Evidence mỗi lần chạy nằm trong `build/project-acceptance/<run>/`, create-new, không ghi đè lượt lỗi. Báo cáo hiện hành: [FINAL_TEST_REPORT](archive/FINAL_TEST_REPORT.md). Các lệnh API/simulator/cleanup bên dưới có thể ghi dữ liệu, không được gộp vào QA offline.

## Kiểm tra tĩnh

Từ root:

```powershell
npm run build
npm run lint
```

`build` chạy backend TypeScript build rồi frontend Vite build. Root `lint` hiện chỉ gọi ESLint frontend; backend được typecheck bởi `npm --prefix backend run build`. Prisma Client có thể tạo riêng:

```powershell
npm --prefix backend run prisma:generate
```

Repository không có script `npm test` tổng hợp.

## Kiểm thử polling frontend không ghi dữ liệu

```powershell
npm --prefix frontend run test:polling
```

Suite dùng fake timer và deferred requests trong bộ nhớ, không kết nối API/database: lifecycle kiểu StrictMode, request chậm/refresh liên tiếp, retry/phục hồi, tab ẩn/hiện, dispose, đổi scope, giá trị 0/timestamp và hủy siblings của batch lỗi. Đây không thay thế kiểm thử React trong browser.

Kiểm tra thủ công với phiên đăng nhập sẵn có và ESP32 thật:

1. Mở `/devices/demo_device_esp32_a`; không F5. Sau reading mới, chờ lượt polling kế tiếp (mặc định 10 giây sau batch trước hoàn tất); đối chiếu value/recordedAt với Serial/API.
2. DevTools Network: GET Device/latest-readings/actuators theo chu kỳ, không có POST/PATCH từ polling. Giữ form chỉnh sửa mở và nhập dở: polling không reset input.
3. Đổi Farm/Zone/filter/page nhanh: không hiển thị response scope cũ. Kiểm tra Dashboard, Sensors, Alerts và Zone overview.
4. Chuyển tab trình duyệt khác: polling ngừng; quay lại tải ngay, không tạo nhiều timer. Test StrictMode development qua Network.
5. Dùng DevTools chặn request local API rồi bỏ chặn (không cần dừng backend): có cảnh báo, giữ readings/presence cũ; tự cập nhật lại khi kết nối phục hồi.
6. History: preset tương đối refresh mở rộng đến thời điểm hiện tại; custom range không bị thay đổi và không hiển thị readings ngoài khoảng đã áp dụng.

Presence TTL/watchdog và MQTT command/ACK không nằm trong thay đổi auto-refresh.

## Backend API/regression suites

Kiểm thử Device Presence không ghi database: `npm --prefix backend run test:presence`. Suite dùng DB/MQTT/timer mock, chặn kết nối môi trường thật; xem [DEVICE_PRESENCE.md](DEVICE_PRESENCE.md) để phân biệt unit tests với nghiệm thu hardware và browser.

Các script có thật trong `backend/package.json`:

```powershell
npm --prefix backend run test:auth
npm --prefix backend run test:phase3
npm --prefix backend run test:phase4
npm --prefix backend run test:phase5
npm --prefix backend run test:phase6
npm --prefix backend run test:phase7
npm --prefix backend run test:phase8
npm --prefix backend run test:phase9
npm --prefix backend run test:phase10
npm --prefix backend run test:phase11
```

Các suite cần PostgreSQL đã migrate/seed và backend/API theo điều kiện trong script. Phase 11 còn cần Mosquitto thật, backend bật MQTT và credential test. Nó kiểm tra telemetry fresh/stale/duplicate/invalid/oversize, retained status/LWT, Alert, Automation mock, reports/CSV và health.

## Browser QA

Root scripts:

```powershell
npm run qa:browser
npm run qa:phase3
npm run qa:phase4
npm run qa:phase5
npm run qa:phase6
npm run qa:phase7
npm run qa:phase8
npm run qa:phase9
npm run qa:phase10
```

Browser QA yêu cầu frontend/backend đang chạy, database demo phù hợp và browser runtime của Playwright. Đây là script QA, không phải unit-test framework độc lập.

## Simulators

```powershell
npm --prefix backend run simulate:device
npm --prefix backend run simulate:sensors
npm --prefix backend run simulate:sensor-history
npm --prefix backend run simulate:alerts
npm --prefix backend run simulate:irrigation
npm --prefix backend run simulate:automation
npm --prefix backend run simulate:mqtt-device -- --device-code ESP32-GF-A-01
```

Simulator HTTP cần backend/database và dữ liệu seed. MQTT simulator cần broker + device credential từ environment. Không truyền secret trên command line nếu shell history có thể lưu.

## Cleanup

Backend có các script cleanup `cleanup:phase2-ui` và `cleanup:phase3` đến `cleanup:phase10`. Chúng thay đổi dữ liệu test; chỉ chạy trên database local/QA đã xác nhận, không chạy trên dữ liệu cần giữ.

## Checklist trước khi bàn giao

1. `prisma:generate`, backend build, frontend build và frontend lint thành công.
2. Chạy suite gần nhất với phần vừa thay đổi; với thay đổi cross-cutting, chạy regression Phase 10 và Phase 11 khi broker sẵn sàng.
3. Kiểm tra farm scope bằng ADMIN/OWNER/STAFF, gồm ID ngoài scope.
4. Kiểm tra duplicate/out-of-order telemetry không lặp side effect.
5. Kiểm tra Markdown links, env names và command khớp package scripts.
6. Không ghi credential thật vào output, fixture, screenshot hoặc tài liệu.
