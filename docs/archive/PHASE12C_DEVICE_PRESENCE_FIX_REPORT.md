# Phase 12C — Đồng bộ presence ESP32 / MQTT / website

Ngày kiểm tra: 16/10/2026. Các timestamp bằng `Z` dưới đây là UTC (giờ Việt Nam/Thái Lan cộng 7 giờ).

## A. Nguyên nhân và bằng chứng runtime

**Đã xác minh lỗi cấu hình: backend và ESP32 trỏ vào hai broker khác nhau dù cùng cổng 1883. Đã sửa endpoint backend. Chưa xác nhận hoàn tất E2E với ESP32 thật.**

| Điểm kiểm tra | Kết quả trước sửa |
| --- | --- |
| Windows service `mosquitto`, PID 4572 | LISTEN `127.0.0.1:1883` và `[::1]:1883` |
| Broker LAN, PID 17892 ở lần kiểm tra ổn định | LISTEN `0.0.0.0:1883` và `[::]:1883` |
| Backend PID 18000 lúc đầu | TCP established `127.0.0.1:64162 -> 127.0.0.1:1883`, phục vụ bởi PID 4572 |
| `.env` backend lúc đầu | `MQTT_ENABLED=true`, broker `mqtt://127.0.0.1:1883` |
| Wi-Fi Windows | `192.168.1.6`; không còn là IP `172.20.10.2` cũ |
| MQTT_HOST ESP32 | Người dùng xác nhận `192.168.1.6` trong lượt kiểm tra này |
| `/api/health` trước sửa | HTTP 200, database connected, MQTT connected — nhưng kết nối đúng giao thức không đồng nghĩa đúng broker |

Hai subscriber chỉ đọc, client ID riêng biệt, SUBACK QoS1 thành công trên cả hai địa chỉ. Broker LAN trả một status OFFLINE **retain=true**, broker loopback không trả bản retained tương ứng. Đây là hai broker có kho retained riêng, không phải hai địa chỉ của cùng một phiên broker. Không có thao tác publish trong chẩn đoán.

Process command line/executable của Mosquitto không đọc được đầy đủ với quyền hiện tại. Service path đọc được: `"C:\Program Files\Mosquitto\mosquitto.exe" run`. Không khẳng định command line của broker LAN; kiểm chứng broker LAN dựa trên socket, SUBACK và message thực nhận. PID thay đổi nếu người dùng restart, không dùng PID trong báo cáo làm lệnh kill.

### PostgreSQL thực tế

Prisma dùng PostgreSQL `localhost:5432`, database `smart_agriculture`. SELECT thông qua generated Prisma Client, đối chiếu mapping trong `backend/prisma/schema.prisma`:

```text
id               demo_device_esp32_a
deviceCode       ESP32-GF-A-01
status           ACTIVE                (vận hành, không phải kết nối)
connectionStatus OFFLINE
lastSeenAt       2026-10-13T06:48:22.353Z
updatedAt        2026-10-13T06:48:34.853Z
Farm / Zone      Green Farm / Khu A
```

Bốn latest readings đều source MQTT, recordedAt `2026-10-13T06:48:21.000Z`, receivedAt `2026-10-13T06:48:22.356Z`: TEMP_01=30.1, HUM_01=47.4, SOIL_01=36.33, LIGHT_01=0. Đây là dữ liệu cũ, không phải sample firmware ngày 16/10. Zero LIGHT được giữ đúng, không chuyển thành thiếu dữ liệu.

SELECT trước/sau probe `2026-10-16T11:22:39Z`–`11:23:09Z` vẫn trả các giá trị trên. Không thấy live status/telemetry trong cửa sổ đó trên cả hai broker; chỉ thấy OFFLINE retained ở broker LAN. Không đủ bằng chứng kết luận ESP32 đang kết nối tại thời điểm chẩn đoán. Không suy ra backend từ chối payload chỉ từ việc không có message.

SELECT cuối `2026-10-16T11:26:58.910Z` vẫn OFFLINE/lastSeenAt cũ. Truy vấn thật `prisma.sensorReading.count({where:{sensor:{device:{deviceCode:"ESP32-GF-A-01"}},source:"MQTT",recordedAt:new Date("2026-10-16T10:57:03.946Z")}})` trả **0**: sample bốn readings trong log người dùng chưa có ở database đang kiểm tra. Mọi truy vấn trong chẩn đoán là đọc, không chạy recovery/ingestion giả để tạo bằng chứng.

Tình huống thực tế trước sửa: backend quan sát sai broker; database không có telemetry mới. Chưa phải tình huống DB ONLINE mà API/frontend đổi thành OFFLINE. Serial `BROKER_PUBACK` chỉ chứng minh broker phía ESP32 đã ACK tại thời điểm log, không chứng minh subscriber backend hoặc commit PostgreSQL.

## B. Phần sửa

1. `backend/.env` (local, ignored): chỉ đổi MQTT_BROKER_URL từ loopback sang `mqtt://192.168.1.6:1883`. Không thay credentials hoặc cờ bơm.
2. `backend/src/mqtt/mqtt-client.service.ts`: log host/port broker thực khi connect; loại bỏ userinfo/password khỏi log.
3. `backend/src/config/env.ts`, `backend/.env.example`: tùy chọn `MQTT_PRESENCE_DEBUG=false` mặc định.
4. `backend/src/mqtt/mqtt-presence.adapter.ts`: debug có cấu trúc `STATUS_RECEIVED`, `REPLAY_IGNORED`, `DEVICE_MATCHED`, `DB_UPDATE_COMPLETED` kèm affected row count. Chỉ ghi khi debug bật, không ghi raw payload/credentials; không đổi chính sách chấp nhận status.
5. `backend/scripts/diagnose-device-presence.cjs`: công cụ SELECT + SUBSCRIBE chỉ đọc, cửa sổ 30 giây; không publish, không simulator, không ghi DB, client ID không trùng backend/ESP32. Từ chối chạy nếu cờ lệnh bơm bật.
6. `backend/scripts/device-presence.test.cjs`: sáu regression mới cho startup sau ESP32, routing khi status lỗi, controller/service giữ nguyên ONLINE, diagnostics, frontend static binding và redaction endpoint.
7. `backend/scripts/mqtt-pump.test.cjs`: cung cấp global URL trong VM test harness cho log endpoint (không đổi test điều khiển).
8. `infrastructure/mosquitto/README.md`: hướng dẫn nhận diện dual broker, probe an toàn; bỏ ví dụ publish ONLINE retained gây nhầm với liveness.
9. Báo cáo này.

Không sửa firmware/config.local.h/GPIO, không bật ENABLE_PUMP_COMMANDS, không sửa command/ACK, không đổi frontend, Prisma schema/migrations, authentication/RBAC/farm scope, ACL/passwords/firewall hoặc dịch vụ Mosquitto. Không chạy seed/reset/migration/simulator, không tự UPDATE Device ONLINE. Backend đang ở chế độ watch đã reload khi sửa source; không tạo backend thứ hai.

## C. Kiểm tra source và hợp đồng

- Firmware `.ino`, `loop()`: connect -> birth ONLINE -> subscribe commands QoS1; status mỗi `STATUS_INTERVAL_MS` 15 giây khi relay OFF; `publishJson()` dùng QoS1/non-retained, kết quả `endMessage()` phản ánh PUBACK. Last Will OFFLINE cũng non-retained. Không cần thay policy retained.
- Backend `mqtt-client.service.ts`: subscribe `devices/+/status`, `devices/+/telemetry`, clean session, explicit resubscribe trên mỗi connect; SUBACK lỗi giữ observer disconnected. Event listener được đăng ký một lần. Telemetry/status chung queue, commands/ACK queue riêng.
- `mqtt-presence.adapter.ts`: JSON strict schemaVersion=1, deviceCode, ONLINE/OFFLINE; so khớp topic; lookup Device exact code; retained/DUP bị bỏ qua có chủ đích. Heartbeat live tiếp theo đủ phục hồi nếu backend khởi động sau ESP32.
- `device-presence.policy.ts`: TTL mặc định 90 giây, watchdog mỗi 10 giây (`presence-watchdog.service.ts`). Timestamp nhận backend, không dùng giờ cảm biến để xác định heartbeat. UPDATE có predicate lastSeenAt và TTL bên trong SQL để tránh watchdog ghi đè heartbeat mới; OFFLINE không giả tạo lastSeenAt mới. Broker mất kết nối thì presence hết hạn là UNKNOWN.
- `mqtt-telemetry.adapter.ts` và `telemetry-ingestion.service.ts`: telemetry live không-retained/không-DUP cũng markOnline theo receipt time; retained history không làm mới presence. Bốn sensor hợp lệ, LIGHT=0 được chấp nhận. Không phát hiện nhu cầu kéo dài TTL hoặc đổi múi giờ.
- `device.repository.ts` -> `device.service.ts` -> `device.controller.ts`: list/detail trả connectionStatus từ DB trong farm scope, không có cache/mock hoặc chuyển trạng thái bằng Actuator. `status=ACTIVE` khác `connectionStatus=ONLINE`.
- Frontend `DeviceDetailPage.tsx`, `DevicesPage.tsx`: hiển thị `connectionLabels[...connectionStatus]`, gọi REST qua `usePolling` mặc định 10 giây sau request hoàn tất, hủy/loại response cũ, pause khi tab ẩn. Dashboard và Zone sensor overview cũng dùng polling cho các dữ liệu liên quan; Zone overview hiện chủ yếu hiển thị cảm biến, không thêm badge mới. Không ép ONLINE ở UI.
- `frontend/src/services/api.ts`: default backend `http://localhost:5000/api`; có thể override qua VITE_API_BASE_URL. Chưa xác minh giá trị trong browser session vì Browser không khả dụng.

## D. Kết quả kiểm thử

| Kiểm thử | Kết quả |
| --- | --- |
| Backend `npm run test:presence` | 27 pass / 0 fail, offline/mocked |
| Backend `npm run test:pump` | 26 pass / 0 fail, không gửi lệnh thật |
| Backend `npm run build` | PASS, TypeScript typecheck |
| Backend lint | Không có script lint hiện hữu; không cài thêm công cụ |
| Frontend `npm run lint` | PASS |
| Frontend `npm run build` | PASS, gồm typecheck; cảnh báo chunk >500 kB hiện hữu |
| Frontend `npm run test:polling` | 12/12 PASS |
| Firmware native pump / diagnostics | 36/36 và 18/18 PASS, GPIO/network giả lập |
| C++ payload -> backend schema | 5/5 PASS |
| Real MQTT passive subscription | Hai broker connect/SUBACK thành công, LAN OFFLINE retained; chưa có live heartbeat |

Đã sửa lỗi harness thiếu global URL phát hiện trong regression trung gian; kết quả cuối ở bảng là sau khi sửa. Frontend test ONLINE là **static contract**, controller ONLINE là **unit test với DB mock**, không phải kiểm thử giao diện hoặc HTTP authenticated E2E.

## E. Trạng thái xác minh và việc còn lại

| Lớp | Trạng thái |
| --- | --- |
| ESP32 Serial | Log do người dùng cung cấp; không truy cập Serial trực tiếp, chưa thấy live heartbeat trong probe |
| Mosquitto | Đã phân biệt hai broker; backend trỏ đúng IP LAN người dùng xác nhận |
| Backend MQTT handler | Source/regression đạt; chưa có live ONLINE mới để chứng minh commit thực tế |
| PostgreSQL | Vẫn OFFLINE với lastSeenAt cũ trong lần SELECT cuối của probe |
| REST API | Health thật HTTP 200 connected; Device ONLINE kiểm chứng unit test, chưa có token/session để kiểm chứng authenticated live response |
| Frontend | Build/lint/polling/static mapping đạt; Browser `iab` không khả dụng, chưa nhìn thấy ONLINE trên UI thực |

Sau sửa, TCP backend thực tế là `192.168.1.6 -> 192.168.1.6:1883` và health MQTT connected. Điều này xác minh endpoint runtime, không thay cho kiểm chứng ESP32 thật.

HTTP cuối lúc `11:26:59Z`: `/api/health` 200, database/MQTT connected; `/api/devices/demo_device_esp32_a` và `/api/devices` 401 khi không gửi token. RBAC/auth không bị bypass và không tạo token quản trị để thử. Socket established tại thời điểm này chỉ có backend PID 20556 tới broker LAN PID 17892; chưa thấy kết nối TCP từ ESP32. `git diff --check` cho các tracked file sửa trong Phase12C đạt; `.env` vẫn gitignored.

### Người dùng kiểm tra tiếp

1. Giữ ESP32 bật; Serial phải thể hiện Wi-Fi/MQTT connected với host `192.168.1.6`, PUMP_COMMANDS DISABLED, RELAY OFF. Không gửi ON để thử presence. Không cần nạp lại firmware chỉ vì backend đổi endpoint; nếu local config không đúng thì cần tự Verify/Upload, giữ ENABLE_PUMP_COMMANDS=false.
2. Backend đang chạy; nếu đã dừng thì mở terminal:

   ```powershell
   cd C:\DATN\Project_datn\backend
   npm run dev
   ```

   Log mới cần có `MQTT connected: host=192.168.1.6 port=1883` và `MQTT subscriptions restored`. Giữ MQTT_COMMANDS_ENABLED và MQTT_AUTOMATION_COMMANDS_ENABLED false; unset hiện tương đương false.
3. Terminal khác chạy probe trong khi ESP32 hoạt động:

   ```powershell
   cd C:\DATN\Project_datn\backend
   node scripts/diagnose-device-presence.cjs
   ```

   Cần thấy `MQTT_OBSERVED` status ONLINE `retain=false`, telemetry bốn readings; SELECT cuối ONLINE, lastSeenAt mới và recordedAt thật mới. Nếu chỉ có retained OFFLINE, không xóa retained để che lỗi; kiểm tra Serial/Wi-Fi/MQTT/host và kết nối TCP thiết bị.
4. Nếu cần log chi tiết, tự đặt `MQTT_PRESENCE_DEBUG=true` trong `.env`, restart backend. Sau kiểm tra trả false. Không gửi mật khẩu/token hoặc toàn bộ `.env`.
5. Frontend:

   ```powershell
   cd C:\DATN\Project_datn\frontend
   npm run dev
   ```

   Đăng nhập http://localhost:5173, mở `/devices/demo_device_esp32_a`, giữ tab visible. Trong DevTools > Network kiểm tra GET `/api/devices/demo_device_esp32_a` và `/api/devices`; response connectionStatus=ONLINE phải hiện Trực tuyến ở lần polling tiếp theo (~10 giây + thời gian request), không cần F5. Không chia sẻ Authorization header.
6. Tự ngắt nguồn ESP32 khi relay OFF, giữ broker/backend chạy: live LWT có thể chuyển OFFLINE sớm; nếu không có LWT thì sau TTL 90 giây + watchdog khoảng 10 giây + polling khoảng 10 giây, website phải OFFLINE. Bật lại, live heartbeat mới phải ONLINE. Chỉ hoàn tất E2E sau khi quan sát cả hai chiều.

Một broker duy nhất với service config rõ ràng là giải pháp vận hành bền vững; hiện chưa dừng service loopback vì không cần thay đổi dịch vụ để sửa đường kết nối và cần tránh ảnh hưởng client khác. IP LAN phụ thuộc DHCP: nếu đổi mạng, cập nhật host hai phía hoặc đặt reservation. File ACL thực tế còn thiếu quyền `/actuator/state` theo báo cáo Phase12B; không liên quan subscribe status/telemetry, không chỉnh ACL hay bật bơm trong Phase12C.

## F. Kết luận

Đã sửa lỗi backend kết nối sai broker và bổ sung công cụ/regression để phát hiện lại. **Chưa tuyên bố ESP32 ONLINE trên website hoặc E2E hoàn tất**: thiếu live status/telemetry từ ESP32 trong cửa sổ quan sát, thiếu session API/Browser thực và chưa thực hiện ngắt/kết nối lại phần cứng. Không có dữ liệu hay trạng thái giả được ghi để tạo kết quả thành công.
