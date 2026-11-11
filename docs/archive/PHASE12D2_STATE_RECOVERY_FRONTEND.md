# Phase 12D.2 — Actuator state recovery, frontend và giới hạn ON 1 giây

Ngày thực hiện: 16/10/2026, UTC+7. **Đã triển khai và kiểm thử phần mềm offline. Chưa nạp firmware mới; chưa nghiệm thu recovery trên ESP32 thật hoặc browser E2E. Không gửi ON/OFF trong Phase này. Không cho phép thử máy bơm vật lý.**

## 1. Nguyên nhân UNKNOWN

- `backend/src/mqtt/mqtt-pump-state.adapter.ts` / `recoverMqttCommands()` thất bại hóa MQTT PENDING khi startup, không replay; actuator có lịch sử MQTT được đặt UNKNOWN. Đây là chủ đích an toàn, không phải cần ép DB thành OFF.
- `mqtt-state-observer.ts` xóa bằng chứng khi backend/broker session thay đổi. OFF từ MOCK, timestamp lịch sử hoặc retained không chứng minh trạng thái hiện tại.
- Firmware trước thay đổi có `sendOffState()` theo BOOT/reconnect/COMMAND/MAX_RUNTIME/loss. Heartbeat ONLINE và telemetry không phải báo cáo GPIO OFF. Backend restart không buộc ESP32 reconnect broker, nên không có OFF mới để khôi phục.
- Không có state request/response chỉ đọc sẵn; thêm luồng request mới cần thêm topic, ACL, parsing/rate-limit. Chọn báo cáo định kỳ để tận dụng đường state sẵn có.

## 2. Giải pháp đã triển khai

### A. Firmware source 12D.2 — OFF định kỳ 15 giây

`OffStateSchedule.h` là scheduler chỉ báo cáo, không điều khiển GPIO. `sendOffState()` giữ ưu tiên reason sự kiện; khi không có sự kiện, đến hạn 15 giây thì dùng **PERIODIC**. Chỉ publish khi `reliableClock()` và `pumpConfirmedOff()` đúng. Timestamp lấy UTC mới ngay lúc lập báo cáo, không replay/cache payload OFF. Đánh dấu chu kỳ thành công sau PUBACK, không khẳng định DB đã lưu từ PUBACK.

ACK giữ ưu tiên trước state trong loop; status/telemetry đi đường hiện hữu. Không đổi task safety 5ms, network lease 250ms, guard FUTURE_COMMAND 2s, GPIO26, Wi-Fi, hard cap firmware 5 giây hoặc ENABLE_PUMP_COMMANDS. Scheduler dùng unsigned millis để chịu wrap. Publish failure vẫn đi fail-safe/reconnect sẵn có; không tạo vòng retry độc lập chồng request.

Topic không đổi: `smart-agriculture/v1/devices/ESP32-GF-A-01/actuator/state`, QoS1, retain=false.

```json
{"schemaVersion":1,"deviceCode":"ESP32-GF-A-01","actuatorCode":"PUMP_01","state":"OFF","reason":"PERIODIC","recordedAt":"<UTC mới từ ESP32>"}
```

Đây là ví dụ schema, **không phải payload đã phát từ phần cứng trong Phase này**. Backend enum reason v1 mở rộng thêm PERIODIC; các reason cũ vẫn hợp lệ. Không thêm field/topic/ACL/migration. Cần deploy backend chấp nhận reason trước khi người dùng nạp firmware mới. Danh tính publisher vẫn dựa Mosquitto authentication/ACL hiện hữu, không bổ sung chữ ký payload hoặc chứng thực GPIO vật lý.

### B. Backend — chỉ tin bằng chứng còn hiệu lực

- Giữ recovery UNKNOWN; không hồi phục bằng OFF trong DB.
- Observer có `sessionStartedAt`; state recordedAt trước session mới bị bỏ qua, dù còn trong cửa sổ 30 giây. Sai lệch clock ở ranh giới có thể phải chờ kỳ tiếp theo, không nới guard 2 giây.
- Giữ bỏ retained/DUP, sai Device/Actuator/topic, schema sai, >2s tương lai hoặc >30s tuổi; update DB chỉ khi timestamp tăng nghiêm ngặt. Timestamp bằng/cũ không cập nhật.
- Bằng chứng OFF trong memory còn hạn **30 giây**, bị xóa khi reconnect. API list/detail/summary thống nhất: OFF phải khớp báo cáo trong session còn hạn và Device ONLINE, kể cả khi command channel connected. Dữ liệu OFF lưu sẵn không tự thành trạng thái hiện tại.
- Real ON bị từ chối nếu state UNKNOWN hoặc OFF thiếu bằng chứng session còn hạn. RBAC/farm scope/feature flags vẫn giữ nguyên.
- Không tự suy OFF từ ONLINE, telemetry hoặc lỗi HTTP. API có thể UNKNOWN rất ngắn giữa ACK OFF và state OFF mới; đây là kết quả fail-closed.

**Cần nạp firmware lại: CÓ, nhưng chưa thực hiện.** ESP32 đang chạy binary cũ không tự có PERIODIC; khi dùng backend mới cùng firmware cũ, UNKNOWN/TTL hết hạn vẫn có thể xảy ra. Không coi sửa source/compile là hoàn thành recovery trên thiết bị.

## 3. Frontend và giới hạn chạy thử

Nguyên nhân mặc định 5 giây: trước đây Axios service chỉ POST `{command}`, backend lấy `env.mqttPumpMaxRunSeconds` (default 5).

Đã sửa:

- Service dùng `manualCommandBody()`: ON luôn gửi `maxRunSeconds=1`; OFF không có runtime.
- Nút/confirm đổi thành **Bật thử 1 giây**, không thiết kế lại trang.
- Tách `PumpCard` để test React SSR độc lập. UNKNOWN/OFFLINE không cho BẬT; OFF có thể supersede PENDING ON, không gửi lặp OFF khi OFF đang PENDING. Khi feature flag khóa hoặc không có quyền vẫn chỉ xem.
- Trạng thái OFFLINE luôn hiển thị UNKNOWN, không dùng ON/OFF lịch sử để khẳng định GPIO hiện tại. Hiển thị timestamp backend và lưu ý GPIO không xác nhận động cơ/nước.
- PENDING/FAILED/reason như REJECTED, ACK_TIMEOUT vẫn hiện từ latestCommand; không optimistic ON từ HTTP202. Thông báo đã gửi dùng màu trung tính, không báo thành công thi hành khi chỉ mới nhận yêu cầu.
- Polling trang tưới giữ **2 giây**, không đổi hook chung; cleanup/visibility/request race được regression bằng mock.

Backend thêm **MQTT_PUMP_TEST_MODE**, mặc định **true** (không mở quyền gửi lệnh). `pumpRuntimeLimit()` áp dụng độc lập frontend: test mode tối đa 1 giây, bỏ runtime thì mặc định 1, gửi 2/5/30 giây bị HTTP400 trước khi tạo command/publish. Ngoài test mode vẫn cap tối đa 5 giây ở backend. Giá trị env sai định dạng khiến startup fail thay vì lặng lẽ bỏ giới hạn. `.env` thật không bị thay đổi; chỉ cập nhật `.env.example`.

Không tự tắt test mode. Hai cờ gửi lệnh/automation vẫn false; firmware false và nguồn adapter vẫn rút theo xác nhận người dùng. Không phát command để thử giới hạn.

## 4. Các file thay đổi trong Phase này

Backend:

- `backend/src/config/env.ts`, `backend/.env.example`: test mode mặc định an toàn.
- `backend/src/services/pump-command-policy.ts`: policy giới hạn runtime độc lập.
- `backend/src/services/device-command.service.ts`: kiểm tra runtime và bằng chứng OFF trước ghi command.
- `backend/src/gateways/mqtt-device.gateway.ts`: thêm reason PERIODIC, không đổi Command/ACK.
- `backend/src/mqtt/mqtt-state-observer.ts`: session floor và hạn bằng chứng OFF.
- `backend/src/mqtt/mqtt-pump-state.adapter.ts`: bỏ state trước session.
- `backend/src/services/actuator.service.ts`, `backend/src/repositories/actuator.repository.ts`: list/detail/summary không dùng OFF lịch sử.
- `backend/scripts/mqtt-pump.test.cjs`: mở rộng test offline.
- `backend/scripts/phase12d2-readonly-check.ts`: SELECT-only transaction, health GET; tùy chọn observer chỉ subscribe, không publish.

Firmware source/test/documentation:

- `firmware/SmartAgricultureESP32/SmartAgricultureESP32.ino`, `OffStateSchedule.h`.
- `firmware/tests/off_state_schedule_test.cpp`, `pump_controller_test.cpp`, `backend-contract.test.cjs`, `run-host-tests.ps1`.
- `firmware/README.md`.

Frontend:

- `frontend/src/components/actuators/PumpCard.tsx`, `frontend/src/utils/irrigation-control.ts`.
- `frontend/src/pages/irrigation/IrrigationPage.tsx`, `frontend/src/services/actuator.service.ts`.
- `frontend/scripts/irrigation.test.cjs`, `frontend/package.json`.

Tài liệu: `docs/PHASE12D2_STATE_RECOVERY_FRONTEND.md`. Build artifact cục bộ trong thư mục ignore. Worktree đã có nhiều thay đổi từ các Phase trước; không reset/ghi đè các thay đổi ngoài phạm vi.

## 5. Kết quả kiểm thử không phần cứng

| Bài kiểm tra | Kết quả |
| --- | --- |
| Backend pump suite | PASS 38/38, mocks chặn import DB/MQTT thật |
| Presence suite | PASS 27/27, offline mocks |
| Backend TypeScript `npx tsc --noEmit` | PASS |
| Firmware host controller/parser/serializer | PASS 36/36 |
| Firmware diagnostics/delivery/lease | PASS 18/18 |
| OFF scheduler | PASS: initial/15s/failure/no flood/millis wrap (5 kiểm tra) |
| C++ serializer → backend schema/gateway | PASS 6/6, gồm PERIODIC thật từ serializer C++ |
| Frontend React SSR / policy / Axios mock / polling render | PASS 7/7 |
| Polling chung / StrictMode / race / tab visibility / cleanup | PASS 12/12 |
| Frontend lint và production build | PASS; cảnh báo chunk >500kB, không phải lỗi build |
| Compile ESP32 board, example config | PASS, sketch 961278 bytes; RAM 60540 bytes |
| Browser E2E, click/DOM/timer trực tiếp | NOT VERIFIED — Browser iab không khả dụng |
| Recovery tự động trên firmware mới ở ESP32 thật | NOT VERIFIED — chưa nạp firmware |
| Điện GPIO, relay, động cơ, nước | NOT VERIFIED — không thử vật lý |

Backend tests bao phủ restart UNKNOWN → fresh PERIODIC OFF; retained/DUP/pre-session/old timestamp không phục hồi; reset evidence khi session thay đổi; OFFLINE che state; MQTT broker reconnect/resubscribe không replay ON; không đổi routing telemetry; ACK APPLIED/REJECTED/timeout; supersede bằng OFF; backend từ chối duration >1 trong test mode trước ghi dữ liệu. Frontend tests render actual PumpCard bằng React server renderer với mock snapshots, **không phải browser E2E và không đo CSS/layout/click thực tế**.

Lệnh đã chạy:

```powershell
Set-Location C:\DATN\Project_datn\backend
npm run test:pump
npm run test:presence
npx tsc --noEmit
Set-Location ..\frontend
npm run test:irrigation
npm run test:polling
npm run lint
npm run build
Set-Location ..
& .\firmware\tests\run-host-tests.ps1 -Compiler 'C:\Program Files (x86)\Dev-Cpp\MinGW64\bin\g++.exe'
& 'C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe' compile --fqbn esp32:esp32:esp32 --build-property 'compiler.cpp.extra_flags=-DSMART_AGRI_EXAMPLE_CONFIG=1' --build-path 'C:\DATN\Project_datn\build\esp32-phase12d2' 'C:\DATN\Project_datn\firmware\SmartAgricultureESP32'
```

Compile dùng cấu hình example không chứa bí mật và **không có upload**. Không chạy regression suite tích hợp ghi PostgreSQL thật, simulator, seed/migration hoặc POST command.

## 6. Kiểm tra môi trường thật — điểm chưa đạt

Diagnostic chạy trong transaction READ ONLY; broker observer chỉ subscribe telemetry/status/state với client ID riêng. Không dùng simulator hoặc MQTT publish.

| Quan sát 2026-10-16 UTC | Bằng chứng / kết quả |
| --- | --- |
| Config được đọc từ môi trường backend | commands=false, automation=false, pumpTestMode=true — PASS (không phải phép đo DOM/runtime authenticated actuator API) |
| Health 16:46:40.477Z | HTTP200, PostgreSQL/MQTT connected — PASS |
| Device lúc SELECT16:46:40.427Z | ONLINE, lastSeen16:46:38.659Z — PASS |
| Actuator | UNKNOWN, lastStateChangedAt16:14:37.677Z; không ép OFF |
| PENDING | 0 — PASS |
| Command mới nhất | Vẫn OFF/SUCCESS edf66e25-4533-4342-99b2-1a749d44273a từ Phase12D.1B; không có command mới của Phase12D.2 |
| Subscribe observer | Grants thành công; ONLINE non-retained16:46:23.502Z và16:46:38.659Z |
| Retained status | Nhận OFFLINE cũ retained lúc subscribe, không dùng làm chứng cứ thiết bị vừa offline |
| Telemetry/state live trong cửa sổ20s | Không thấy; không được coi ONLINE là sensor data còn cập nhật |
| Bốn SensorReading mới nhất | Cùng recordedAt16:16:51.591Z / receivedAt16:16:51.969Z, sourceMQTT: TEMP26.3/HUM61.1/SOIL37.28/LIGHT2.5 |

**Freshness telemetry thực tế: FAIL tại thời điểm quan sát**, readings cũ khoảng30 phút. Không tuyên bố bốn cảm biến đang tiếp tục lưu chỉ vì offline tests PASS. Chưa xác định nguyên nhân: source `reliableClock()` hết hiệu lực sau2h không có NTP callback; thời gian dừng readings xấp xỉ2h sau boot là một giả thuyết cần Serial mới, không phải kết luận đã chứng minh. Các điều kiện khác như sensor health/delivery cũng có thể ngăn publish. Không tự nới NTP lease, reset/nạp firmware hoặc sửa timestamp để che tình trạng.

Local firmware source vẫn `ENABLE_PUMP_COMMANDS=false`; trạng thái binary hiện tại dựa Serial/xác nhận người dùng trước đó, chưa đọc Serial mới ở lần này. Adapter vẫn ngắt theo xác nhận người dùng, không có tác động phần cứng.

## 7. Nghiệm thu tiếp theo — cần người dùng phối hợp/phê duyệt nạp

1. Giữ adapter rút điện và cả ba cờ điều khiển false. Cung cấp Serial Monitor mới (NTP, sensor health, TELEMETRY và lý do không gửi) để xử lý tình trạng readings ngừng cập nhật. Không gửi mật khẩu/token/config.local.h.
2. Sau khi người dùng phê duyệt nạp: backup sketch/config cục bộ; nạp source12D.2 bằng Arduino IDE với cấu hình hiện hữu, **ENABLE_PUMP_COMMANDS=false**, không đổi Wi-Fi/GPIO/dây, không bật nguồn bơm. Không dùng bản example để ghi đè cấu hình thật.
3. Kiểm tra BOOT và state PERIODIC mỗi15s có recordedAt mới, retain=false; bốn readings tiếp tục lưu, không có lệnh ON/OFF. Có thể chạy diagnostic chỉ đọc:

```powershell
Set-Location C:\DATN\Project_datn\backend
npx tsx scripts/phase12d2-readonly-check.ts --observe
```

4. Giữ ESP32 chạy, restart riêng backend theo phiên được duyệt: ban đầu UNKNOWN, trong khoảng15s + độ trễ xử lý phải tự thành OFF từ PERIODIC sau session start. Không EN, không MOCK/retained, không ép DB. Đối chiếu broker/DB/GET actuator và website.
5. Thử reconnect broker/ESP32 có kiểm soát và quan sát trạng thái session mới. Device OFFLINE hoặc state report quá30s phải UNKNOWN, không hiện OFF vật lý giả. Không biến phép thử reconnect thành thử máy bơm.
6. Checklist browser chỉ đọc ở môi trường thật bị khóa: trang tưới có đúng Device/PUMP_01, state/timestamp khớp API; không có nút điều khiển hoạt động; tự cập nhật sau polling; đổi farm/zone nhanh không lẫn state; tab ẩn/dùng lại không request trùng. PENDING/APPLIED/REJECTED/ACK_TIMEOUT và giới hạn1s nghiệm thu bằng mock UI/offline harness, không click gửi lệnh thật trong Phase này.

## 8. Điều kiện trước khi xem xét thử bơm vật lý

Chưa đạt toàn bộ: cần telemetry fresh ổn định, Serial NTP SYNCED/lock mới, firmware12D.2 được duyệt nạp và recovery thực tế PASS, browser nghiệm thu, OFF mới còn hiệu lực, không PENDING, kiểm tra clock/ACL/ACK; test mode backend=true và frontend ON=1s. Sau đó phải có **phê duyệt riêng** cho thay đổi khóa firmware/nguồn và đúng một lần thử1s, không tự chuyển sang thử thật.

Dừng khẩn cấp: nút OFF theo contract hiện hữu có ưu tiên hủy ON khi hệ thống còn liên lạc; nếu ACK_TIMEOUT/mất mạng/state bất thường, không coi API thành công, không retry ON. Luôn có người trực tại adapter với khả năng ngắt nguồn riêng ngay, không phụ thuộc website/MQTT. Giới hạn backend1s và fail-safe firmware5s là hai lớp khác nhau, không phải xác nhận motor/flow. Không kéo dài firmware cap để vượt thử.

## 9. Kết luận

**PASS phần triển khai và regression phần mềm. NOT VERIFIED browser E2E và recovery trên thiết bị thật do chưa nạp firmware. FAIL freshness telemetry live ở lần kiểm tra cuối; cần Serial mới để chẩn đoán. Hệ thống vẫn khóa điều khiển, 0 PENDING; không thử bơm vật lý.**
