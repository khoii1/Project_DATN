# Smart Agriculture

Hệ thống website quản lý và giám sát nông nghiệp thông minh, kết hợp quản trị trang trại, dữ liệu cảm biến, cảnh báo, tưới thủ công/tự động và hạ tầng MQTT.

> Tài liệu này phản ánh source code tại thời điểm kiểm tra. Quy ước: ✅ đã triển khai/xác minh; 🟡 hoàn thành một phần/đang làm; ⬜ chưa triển khai.

## Trạng thái nhanh

- ✅ Phase 1–10: website, xác thực/RBAC, Farm–Zone–Crop, Device/Sensor, lịch sử và biểu đồ, Alert, Actuator, Automation, Reports, CSV và Activity Log.
- ✅ Phase 11 (đường telemetry): Mosquitto, MQTT.js, telemetry/status adapter, reconnect, health và MQTT simulator.
- ✅ Telemetry MQTT hợp lệ được lưu với `source=MQTT`; dữ liệu mới có thể kích hoạt Alert và Automation.
- 🟡 IoT vật lý: chủ dự án đã xác nhận ngoài repository rằng ESP32 và BH1750 đọc lux thành công; soil sensor vẫn hiệu chỉnh. Repository chưa có firmware để tái lập kết quả này.
- 🟡 Simulator vẫn được dùng cho telemetry/trạng thái MQTT và các kịch bản kiểm thử.
- 🟡 `DeviceCommandService` hiện kết thúc tại `MockDeviceGateway`.
- ⬜ Backend chưa publish command MQTT; ESP32 chưa subscribe command; relay/pump vật lý chưa được điều khiển.

Chi tiết và bằng chứng: [trạng thái phát triển](docs/DEVELOPMENT_STATUS.md), [MQTT](docs/IOT_MQTT.md), [hardware](docs/HARDWARE_SETUP.md).

## Chức năng chính

Đăng nhập JWT và phân quyền `ADMIN`/`FARM_OWNER`/`STAFF`; quản lý user, farm, staff, zone, crop, device, sensor và actuator; tiếp nhận telemetry; lịch sử/thống kê/biểu đồ; vòng đời cảnh báo; tưới thủ công và tự động; dashboard; báo cáo, CSV và nhật ký hoạt động.

## Công nghệ thực tế

- Frontend: React 19.1.1, Vite 7.1.3, TypeScript 5.8.x, Tailwind CSS 3.4.17, React Router 7.8.2, Axios 1.11.0, Recharts 3.10.1, Lucide React 0.542.0.
- Backend: Node.js, Express 4.21.2, TypeScript 5.9.2, Prisma/Prisma Client 6.19.0, PostgreSQL, JWT 9.0.2, bcryptjs 3.0.2, Zod 3.25.76.
- IoT: Mosquitto và MQTT.js 5.15.2. Phần cứng mục tiêu là ESP32 DevKit V1/ESP32-WROOM-32.

Version trên lấy từ `package.json`; dấu `^`/`~` cho phép package manager cài bản tương thích mới hơn theo lockfile.

## Kiến trúc tổng quan

```text
React frontend -> REST API -> Express services -> Prisma -> PostgreSQL

ESP32 (mục tiêu) hoặc MQTT simulator
  -> Mosquitto
  -> MqttTelemetryAdapter
  -> TelemetryIngestionService
  -> SensorReading
     |-> AlertEvaluationService
     `-> AutomationEvaluationService
         -> DeviceCommandService
         -> MockDeviceGateway (hiện tại)
```

Alert và Automation là hai luồng side effect độc lập. Không có đường Alert trực tiếp bật bơm. Xem [kiến trúc chi tiết](docs/ARCHITECTURE.md).

## Cấu trúc repository

```text
backend/                  Express API, Prisma, MQTT, services, simulators, tests
  prisma/                 schema, 10 migrations và seed
  src/                    source TypeScript
frontend/                 React/Vite UI
infrastructure/mosquitto/ cấu hình broker, ACL mẫu và hướng dẫn
scripts/                  browser QA scripts
docs/                     bộ nhớ kỹ thuật của dự án
package.json              lệnh điều phối root
```

## Yêu cầu môi trường

- Node.js 20+ và npm (yêu cầu vận hành đã dùng cho dự án; `package.json` chưa khóa bằng trường `engines`).
- PostgreSQL đang chạy và một database trống/có quyền migration.
- Mosquitto chỉ bắt buộc khi chạy luồng MQTT/Phase 11.

## Cài đặt và cấu hình

```powershell
npm run install:all
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Điền giá trị cục bộ trong `.env`; không commit file này. Các biến được hỗ trợ:

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
| Backend | `MQTT_BROKER_URL`, `MQTT_BACKEND_CLIENT_ID` | Broker URL và client ID backend |
| Backend | `MQTT_USERNAME`, `MQTT_PASSWORD` | Credential broker; bắt buộc khi bật MQTT |
| Backend | `MQTT_TOPIC_PREFIX` | Prefix topic; mặc định `smart-agriculture/v1` |
| Backend | `MQTT_RECONNECT_PERIOD_MS` | Chu kỳ reconnect |
| Backend | `MQTT_SIDE_EFFECT_MAX_AGE_SECONDS` | Tuổi tối đa để MQTT reading tạo side effect |
| Backend | `MQTT_MAX_PAYLOAD_BYTES` | Kích thước payload tối đa |
| Frontend | `VITE_API_BASE_URL` | Base URL REST API |

File mẫu chỉ chứa placeholder. Không đưa password, token hay connection string thật vào tài liệu.

## Database, migration và seed

Sau khi cấu hình `backend/.env`:

```powershell
npm --prefix backend run prisma:generate
npm --prefix backend run prisma:migrate
npm --prefix backend run prisma:seed
```

Seed tạo dữ liệu demo và ba tài khoản phát triển được mô tả trong [tài liệu database](docs/DATABASE.md). Không dùng credential demo trong môi trường thật.

## Khởi chạy

Chạy frontend và backend cùng lúc từ root:

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

Thiết lập Mosquitto theo [infrastructure/mosquitto/README.md](infrastructure/mosquitto/README.md), bật `MQTT_ENABLED=true`, rồi chạy backend và:

```powershell
npm --prefix backend run simulate:mqtt-device -- --device-code ESP32-GF-A-01
```

Các simulator HTTP/dev khác có sẵn trong `backend/package.json`; xem danh sách và điều kiện chạy tại [TESTING.md](docs/TESTING.md). Simulator MQTT cần credential device qua biến môi trường; không ghi credential vào command hoặc source.

## Build và kiểm thử

```powershell
npm run build
npm run lint
npm --prefix backend run test:auth
npm --prefix backend run test:phase3
```

Repository không có script `npm test` tổng hợp. Các suite Phase 3–11 và browser QA có lệnh riêng, được liệt kê đầy đủ trong [TESTING.md](docs/TESTING.md).

## Giới hạn hiện tại và bước tiếp theo

- Không có firmware ESP32 trong repository; chưa thể tái lập telemetry vật lý chỉ từ source này.
- MQTT command/ACK mới có topic contract và ACL chuẩn bị; chưa có publish/subscribe/ACK runtime.
- Lệnh bơm vẫn qua gateway giả lập; không được xem là điều khiển relay/pump thật.
- JWT logout là phía client/stateless; chưa có refresh token hoặc revocation list.
- Broker mẫu dùng MQTT plaintext cho local/LAN, chưa cấu hình TLS.

Bước tiếp theo hợp lý: đưa firmware ESP32 telemetry vào quản lý phiên bản và kiểm thử end-to-end; sau đó mới triển khai command/ACK MQTT cùng cơ chế an toàn cho relay/pump. Không coi hai phần này là đã hoàn thành.

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
