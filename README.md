# Smart Agriculture

Hệ thống website quản lý và giám sát nông nghiệp thông minh, kết hợp quản trị trang trại, dữ liệu cảm biến, cảnh báo, tưới thủ công/tự động và hạ tầng MQTT.

## Hồ sơ hoàn thiện đồ án — 05/11/2026

**NOT_READY_FOR_DEFENSE**: phần mềm DEV/SIMULATOR đã có nghiệm thu; luồng ESP32 thật → MQTT → DEV PostgreSQL → REST đã được đối chiếu ở Phase Y. Website historical sau bản sửa AW vẫn chờ nghiệm thu cuối vì preflight AX gặp native `0xC0000005`. Không cần hoàn thành migration production hoặc toàn bộ Phase13.5 để trình diễn MVP trên DEV.

Đọc bộ tài liệu hiện hành: [kiến trúc](docs/FINAL_SYSTEM_ARCHITECTURE.md), [ma trận nghiệm thu](docs/FINAL_FEATURE_ACCEPTANCE.md), [demo và checklist ảnh](docs/FINAL_DEMO_SCRIPT.md), [kết quả kiểm thử](docs/FINAL_TEST_RESULTS.md), [checklist bảo vệ và bước cần duyệt](docs/FINAL_DEFENSE_CHECKLIST.md). Báo cáo phase cũ là bằng chứng theo thời điểm, không xác nhận trạng thái runtime hiện tại.

Đường ngắn nhất: một diagnostic native có phê duyệt mới → nếu completion đạt, một phiên supervised historical Website có phê duyệt riêng → chốt ảnh/bảng/biểu đồ. Tưới tự động vật lý vẫn BLOCKED bởi SOIL calibration/trust. Không chạy lại initdb, migration production hoặc thử bơm để hoàn tất phần website.

> Nghiệm thu MVP cập nhật ngày 28/10/2026: [trạng thái dự án](docs/archive/PROJECT_COMPLETION_STATUS.md), [acceptance matrix](docs/archive/FINAL_ACCEPTANCE_MATRIX.md), [việc còn lại](docs/archive/REMAINING_WORK_P0_P1_P2.md), [demo](docs/archive/END_TO_END_DEMO_PLAN.md), [kết quả kiểm thử](docs/archive/FINAL_TEST_REPORT.md). Code/mock PASS không thay thế nghiệm thu production hoặc phần cứng.

## Trạng thái nhanh

- Đã triển khai website quản trị/RBAC/farm scope, monitoring, history/chart, alert, reports/CSV và activity log; cần nghiệm thu tích hợp cuối trên môi trường demo đã được duyệt.
- Firmware ESP32 `13.4F.1` có trong `firmware/SmartAgricultureESP32`; DHT22/BH1750/soil telemetry đã đối chiếu PostgreSQL/API trong các phiên trước. Hiệu chuẩn đất và SNTP refresh dài hạn còn giới hạn chưa nghiệm thu.
- MQTT command/ACK thật đã triển khai, không fallback mock khi khóa. Lần chạy bơm có ACK/APPLIED và MAX_RUNTIME OFF, nhưng báo cáo Phase12D4 vẫn PARTIAL (thiếu xác nhận nước/browser và có hai thao tác ON).
- Tưới tự động có engine/SHADOW UI và persistence thử nghiệm; **VERIFIED_LIVE/ACTIVE chưa sẵn sàng**, không được gọi là tự động tưới vật lý đã hoàn thành.
- Snapshot audit 28/10 là bằng chứng lịch sử: không có listener backend5000/frontend5173 khi đó. Không dùng snapshot này mô tả runtime05/11; đợt hoàn thiện tài liệu không khởi động hoặc kết nối production để kiểm tra lại.

Chi tiết và bằng chứng: [trạng thái phát triển](docs/DEVELOPMENT_STATUS.md), [MQTT](docs/IOT_MQTT.md), [hardware](docs/HARDWARE_SETUP.md).

## Chức năng chính

Đăng nhập JWT và phân quyền `ADMIN`/`FARM_OWNER`/`STAFF`; quản lý user, farm, staff, zone, crop, device, sensor và actuator; tiếp nhận telemetry; lịch sử/thống kê/biểu đồ; vòng đời cảnh báo; tưới thủ công và tự động; dashboard; báo cáo, CSV và nhật ký hoạt động.

Các trang Device detail, Sensors, Dashboard, Alerts và Zone sensor overview tự cập nhật qua REST polling mặc định 10 giây sau batch trước hoàn tất, dừng khi tab ẩn. History vẫn tải theo yêu cầu; refresh khoảng tương đối tính lại thời gian, khoảng tùy chỉnh giữ nguyên. Xem cơ chế và giới hạn trong [ARCHITECTURE.md](docs/ARCHITECTURE.md), kiểm thử không ghi database bằng `npm --prefix frontend run test:polling`.

## Công nghệ thực tế

- Frontend: React 19.1.1, Vite 7.1.3, TypeScript 5.8.x, Tailwind CSS 3.4.17, React Router 7.8.2, Axios 1.11.0, Recharts 3.10.1, Lucide React 0.542.0.
- Backend: Node.js, Express 4.21.2, TypeScript 5.9.2, Prisma/Prisma Client 6.19.0, PostgreSQL, JWT 9.0.2, bcryptjs 3.0.2, Zod 3.25.76.
- IoT: Mosquitto và MQTT.js 5.15.2. Phần cứng mục tiêu là ESP32 DevKit V1/ESP32-WROOM-32.

Version trên lấy từ `package.json`; dấu `^`/`~` cho phép package manager cài bản tương thích mới hơn theo lockfile.

## Kiến trúc tổng quan

```text
React frontend -> REST API -> Express services -> Prisma -> PostgreSQL

ESP32 firmware hoặc simulator được tách riêng
  -> Mosquitto
  -> MqttTelemetryAdapter
  -> TelemetryIngestionService
  -> SensorReading
     |-> AlertEvaluationService
     `-> AutomationEvaluationService
         -> DeviceCommandService
         -> MQTT gateway (khóa mặc định)

SHADOW fixture -> pure engine/preview (không gửi MQTT, không DeviceCommand thật)
```

Alert và Automation là hai luồng side effect độc lập. Không có đường Alert trực tiếp bật bơm. Xem [kiến trúc chi tiết](docs/ARCHITECTURE.md).

## Cấu trúc repository

```text
backend/                  Express API, Prisma, MQTT, services, simulators, tests
  prisma/                 schema, 11 migrations và seed; irrigation proposals riêng
  src/                    source TypeScript
frontend/                 React/Vite UI
infrastructure/mosquitto/ cấu hình broker, ACL mẫu và hướng dẫn
scripts/                  browser QA scripts
firmware/                 ESP32 source và C++ host tests, local config không commit
docs/                     bộ nhớ kỹ thuật của dự án
package.json              lệnh điều phối root
```

## Yêu cầu môi trường

- Node.js 20+ và npm (yêu cầu vận hành đã dùng cho dự án; `package.json` chưa khóa bằng trường `engines`).
- Để tái lập bằng chứng hiện hành, dùng runtime/lockfile đã pin trong manifest; không tự nâng package hoặc dùng version ở bảng khai báo thay installed version. Manifest không phải quyền thực thi launcher.
- PostgreSQL đang chạy và một database trống/có quyền migration.
- Mosquitto chỉ bắt buộc khi chạy luồng MQTT/Phase 11.

## Cài đặt và cấu hình

```powershell
npm run install:all
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Điền giá trị cục bộ trong `.env`; không commit file này. Các biến được hỗ trợ:

Cho database phát triển **mới, độc lập**, cấu hình `MQTT_ENABLED=false`, `MQTT_COMMANDS_ENABLED=false`, `MQTT_AUTOMATION_COMMANDS_ENABLED=false`, `MQTT_PUMP_TEST_MODE=true` trước startup. JWT secret tối thiểu 32 ký tự, origin `CLIENT_URL` phải khớp frontend. Không dùng credentials production hoặc chạy seed trên DEV historical đang giữ 12 readings. Với DEV historical hiện hữu, dùng đúng supervised runbook và approval mới; không dùng các lệnh cài mới bên dưới để reset dữ liệu.

| Nơi | Biến | Ý nghĩa |
|---|---|---|
| Backend | `PORT` | Cổng HTTP API |
| Backend | `DATABASE_URL` | PostgreSQL connection string |
| Backend | `NODE_ENV` | Môi trường chạy |
| Backend | `CLIENT_URL` | Origin frontend được CORS cho phép |
| Backend | `JWT_SECRET`, `JWT_EXPIRES_IN` | Secret ký JWT (tối thiểu 32 ký tự) và hạn token |
| Backend | `AUTOMATION_COMMAND_COOLDOWN_SECONDS` | Khoảng nghỉ giữa command automation |
| Backend | `AUTOMATION_MANUAL_OVERRIDE_MINUTES` | Thời gian ưu tiên điều khiển thủ công |
| Backend | `AUTOMATION_MAX_READING_AGE_SECONDS` | Tuổi tối đa của reading để chạy automation |
| Backend | `MQTT_ENABLED` | Bật/tắt MQTT backend |
| Backend | `MQTT_COMMANDS_ENABLED` | Quyền dispatch thủ công; giữ false trong demo UI-only |
| Backend | `MQTT_AUTOMATION_COMMANDS_ENABLED` | Quyền dispatch tự động; giữ false |
| Backend | `MQTT_PUMP_TEST_MODE` | Chế độ thử giới hạn backend tối đa1giây; cần xác minh process thực khi startup |
| Backend | `MQTT_BROKER_URL`, `MQTT_BACKEND_CLIENT_ID` | Broker URL và client ID backend |
| Backend | `MQTT_USERNAME`, `MQTT_PASSWORD` | Credential broker; bắt buộc khi bật MQTT |
| Backend | `MQTT_TOPIC_PREFIX` | Prefix topic; mặc định `smart-agriculture/v1` |
| Backend | `MQTT_RECONNECT_PERIOD_MS` | Chu kỳ reconnect |
| Backend | `MQTT_SIDE_EFFECT_MAX_AGE_SECONDS` | Tuổi tối đa để MQTT reading tạo side effect |
| Backend | `MQTT_MAX_PAYLOAD_BYTES` | Kích thước payload tối đa |
| Frontend | `VITE_API_BASE_URL` | Base URL REST API |

File mẫu chỉ chứa placeholder. Không đưa password, token hay connection string thật vào tài liệu.

## Database, migration và seed

Chỉ cho database phát triển mới đã được duyệt. Không chạy migration/seed lên production hiện hữu để phục vụ audit/demo:

```powershell
npm --prefix backend run prisma:generate
npm --prefix backend run prisma:migrate
npm --prefix backend run prisma:seed
```

Seed tạo dữ liệu demo và ba tài khoản phát triển được mô tả trong [tài liệu database](docs/DATABASE.md). Không dùng credential demo trong môi trường thật.

## Khởi chạy

Các lệnh sau có thể ghi database khi backend recovery/ingestion chạy. Với môi trường production hiện tại phải có phê duyệt startup riêng; audit không thực hiện các lệnh này. Cho môi trường development đã cấu hình/được duyệt:

```powershell
npm run dev
```

Hoặc chạy riêng:

```powershell
npm --prefix backend run dev
npm --prefix frontend run dev
```

Mặc định frontend ở `http://localhost:5173`, backend ở `http://localhost:5000`, health check ở `http://localhost:5000/api/health`.

### MQTT và simulator

Chỉ chạy simulator trên môi trường test riêng. Không dùng cùng MQTT client ID/credential/namespace với ESP32 thật. Thiết lập theo [infrastructure/mosquitto/README.md](infrastructure/mosquitto/README.md), rồi trên target test đã duyệt:

```powershell
npm --prefix backend run simulate:mqtt-device -- --device-code ESP32-GF-A-01
```

Các simulator HTTP/dev khác có sẵn trong `backend/package.json`; xem danh sách và điều kiện chạy tại [TESTING.md](docs/TESTING.md). Simulator MQTT cần credential device qua biến môi trường; không ghi credential vào command hoặc source.

## Build và kiểm thử

```powershell
npm run build
npm run lint
npm run qa:offline
npm run qa:acceptance-browser
```

`qa:offline` chỉ chạy allowlist test in-memory/loopback mock, không đọc `.env` hoặc nối database/broker. `qa:acceptance-browser` dùng Edge và frontend build, mọi API được mock; không phải live E2E. `npm run demo:simulation` chạy cùng kịch bản trong Edge hiển thị, có banner SIMULATION, tự kết thúc. Cần Edge cài sẵn; không tự tải browser. Các suite `test:auth`, Phase3–11 và simulator có thể ghi DB, không thuộc QA offline này. Xem [TESTING.md](docs/TESTING.md).

## Giới hạn hiện tại và bước tiếp theo

Device presence có TTL/watchdog mặc định 90 giây/10 giây, chống retained replay và policy UNKNOWN khi broker không quan sát được. Devices List tự cập nhật bằng polling. Xem [DEVICE_PRESENCE.md](docs/DEVICE_PRESENCE.md) để cấu hình và nghiệm thu; không coi unit tests là thử mất nguồn ESP32 thật.

- Backend không phục vụ port5000 tại snapshot audit28/10; đây không phải trạng thái hiện tại đã kiểm chứng. Startup production cần phê duyệt riêng vì có recovery writes và ingestion; demo historical dùng dedicated DEV entry, không production bootstrap.
- Chưa có VERIFIED_LIVE/ACTIVE automation; sáu ledger production không được migration/wire vào startup.
- Có sự cố lộ Wi-Fi/device MQTT credential trong output lịch sử; chưa có bằng chứng rotation hoàn tất. Không đưa secrets/artifacts firmware vào Git hoặc màn hình bảo vệ.
- JWT logout là phía client/stateless; chưa có refresh token hoặc revocation list.
- Broker mẫu dùng MQTT plaintext cho local/LAN, chưa cấu hình TLS.

Bước tiếp theo ngắn nhất: duyệt phạm vi MVP → phục hồi demo backend đúng target sau phê duyệt mới → live telemetry/DB/API/browser acceptance và kiểm tra quản trị trên DB phát triển riêng → tổng duyệt. Không cần hoàn tất toàn bộ Phase13.5 hoặc migration production để demo monitoring và SHADOW. Nếu yêu cầu bảo vệ bắt buộc tưới tự động vật lý, phần đó vẫn là blocker, không tự loại khỏi phạm vi.

## Tài liệu chi tiết

- [Bối cảnh và hướng dẫn Agent mới](docs/PROJECT_CONTEXT.md)
- [Kiến trúc](docs/ARCHITECTURE.md)
- [Trạng thái phát triển](docs/DEVELOPMENT_STATUS.md)
- [Database](docs/DATABASE.md)
- [API và RBAC](docs/API_AND_RBAC.md)
- [IoT và MQTT](docs/IOT_MQTT.md)
- [Hardware](docs/HARDWARE_SETUP.md)
- [Testing](docs/TESTING.md)

## Hướng dẫn cho Agent mới

1. Luôn đọc `README.md` trước.
2. Sau đó đọc `docs/PROJECT_CONTEXT.md`.
3. Sau đó đọc `docs/DEVELOPMENT_STATUS.md`.
4. Khi sửa backend, đọc `docs/ARCHITECTURE.md` và `docs/DATABASE.md`.
5. Khi làm MQTT/hardware, đọc `docs/IOT_MQTT.md` và `docs/HARDWARE_SETUP.md`.
6. Không giả định chức năng planned đã được implement.
7. Không phá RBAC hiện tại.
8. Giữ `TelemetryIngestionService` là đường ingest trung tâm.
9. Giữ Alert và Automation là hai concern độc lập.
10. Automation phải đi qua `DeviceCommandService`.
11. Không ghi thẳng database để bỏ qua business service.
12. Không commit secrets.
13. Trước khi thay đổi schema, đọc toàn bộ migration hiện có.
14. Sau mỗi Phase lớn, cập nhật `docs/DEVELOPMENT_STATUS.md`.
15. Sau thay đổi kiến trúc, cập nhật tài liệu tương ứng.
