# Phase 12C.2 — Trạng thái relay PUMP_01

Ngày kiểm tra: 16/10/2026, UTC+7. **Đã sửa lỗi backend được xác minh; chưa nghiệm thu OFF thực tế trên website vì ACL Mosquitto chưa được phép thay đổi.**

## 1. Nguyên nhân thực tế

Có ba chốt chặn độc lập, không phải lỗi ánh xạ chữ UNKNOWN ở frontend:

1. **ACL thực tế thiếu quyền actuator/state.** `C:\mosquitto\config\mosquitto.conf` tham chiếu `C:/mosquitto/config/acl`, `allow_anonymous false`, listener 1883. ACL này thiếu hai dòng đã có trong `infrastructure/mosquitto/acl.example`: backend read `/devices/+/actuator/state`, device pattern write `/devices/%u/actuator/state`. Log thật người dùng cung cấp có `Denied PUBLISH ... /actuator/state`, PUBACK ghi `rc135`; status/telemetry vẫn được chấp nhận. Không đọc password file.
2. **Backend gắn nhận OFF vào quyền điều khiển:** trước sửa `mqtt-client.service.ts` chỉ subscribe/route state khi `mqttCommandsEnabled=true`; `mqtt-pump-state.adapter.ts` return ngay khi cờ này false. Runtime hiện cờ commands và automation đều false, đúng yêu cầu an toàn, nhưng báo cáo OFF cũng bị chặn.
3. **API dùng command readiness để biểu diễn trạng thái:** `actuator.service.ts::withRuntime` và `actuator.repository.ts::summary` phụ thuộc `mqttCommandChannel.transport.connected()`. Transport này trả false khi commands disabled. Vì vậy API biến OFF trong DB thành UNKNOWN dù thiết bị ONLINE. Tuy nhiên không được đơn giản bỏ kiểm tra readiness để lộ OFF cũ từ MOCK.

Frontend `DeviceDetailPage.tsx` hiển thị `actuatorStateLabels[device.connectionStatus !== "ONLINE" ? "UNKNOWN" : actuator.currentState]`: không ép UNKNOWN khi device ONLINE, mà phản ánh trạng thái API. UNKNOWN ở đây là thận trọng đúng khi chưa có chứng cứ GPIO mới.

## 2. Bằng chứng database/runtime

SELECT được thực hiện trong transaction READ ONLY bằng generated Prisma Client, không sửa trực tiếp trạng thái:

| Thuộc tính | Snapshot trước sửa 12:00:37Z |
| --- | --- |
| Device | ESP32-GF-A-01, id demo_device_esp32_a |
| connectionStatus | ONLINE |
| lastSeenAt | 2026-10-16T12:00:33.550Z |
| Actuator | PUMP_01, id demo_actuator_pump_a |
| hardwareChannel | RELAY_1 |
| currentState trong DB | OFF |
| lastStateChangedAt | 2026-10-13T06:41:52.241Z |
| updatedAt | 2026-10-13T06:41:52.242Z |
| Latest command | TURN_OFF / SUCCESS / transport MOCK, 13/10 |

**OFF trong DB là lịch sử MOCK, không phải bằng chứng GPIO OFF từ firmware Phase12B.1.** Không đặt DB thành OFF để che lỗi.

Migration `20261014090000_mqtt_pump_commands` đã finished tại `2026-10-16T11:09:39.621Z`, rolled_back_at null. `information_schema` xác nhận đủ transport/expires_at/max_run_seconds/acknowledged_at. Không cần migration cho Phase12C.2; không chạy migrate/db push/seed/reset trong lượt này.

Quan sát MQTT chỉ đọc 12:05:36Z–12:05:58Z:

- Broker cấu hình `172.20.10.2:1883`, subscriber dùng client ID riêng, không publish.
- SUBACK QoS1 cho state/status/telemetry. SUBACK được grant **không chứng minh quyền publish hoặc delivery state**: ACL vẫn có thể lọc message.
- Nhận retained OFFLINE cũ rồi live ONLINE non-retained lúc 12:05:38.707Z và 12:05:53.955Z.
- Nhận telemetry non-retained bốn readings lúc 12:05:48.434Z, recordedAt 12:05:44.639Z.
- **0 message actuator/state** trong cửa sổ. Không suy ra firmware không thử publish: log Denied và thiếu ACL là bằng chứng khác; state cũng không phải heartbeat mỗi 15 giây.

SELECT sau sửa lúc `2026-10-16T12:06:31.005Z` vẫn OFF cũ 13/10 (không có state thật mới), Device ONLINE, lastSeenAt 12:06:23.865Z. Cả bốn sensors có source MQTT, recordedAt 12:06:14.639Z: TEMP 32.3, HUM 70.6, SOIL 30.46, LIGHT 2.5. Luồng telemetry/presence vẫn hoạt động.

GET `/api/health` thực tế: HTTP 200, database/MQTT connected. GET `/api/actuators/demo_actuator_pump_a`: 401 không có token. Không bypass auth hoặc tự cấp token; authenticated API/website live chưa được kiểm chứng. API OFF kiểm tra qua unit controller/service, không tuyên bố HTTP E2E.

## 3. Firmware và giới hạn vật lý

Đã đọc `.ino`, `PumpProtocol.h`, config.example.h; không đọc/sửa config.local.h hoặc nạp firmware:

- GPIO26, HIGH ON / LOW OFF. setup yêu cầu LOW trước khởi tạo controller; writeRelay độc lập chặn HIGH khi ENABLE_PUMP_COMMANDS=false, kiểm tra gpio_set_level và readback.
- `localOff` đặt pendingOffReason; `sendOffState` chỉ gửi khi reliableClock và pumpConfirmedOff. Boot/reconnect gọi localOff, sau đó sendOffState; NTP chưa sẵn sàng thì reason được giữ chờ clock.
- Payload strict schemaVersion/deviceCode/actuatorCode/state OFF/reason/recordedAt; QoS1, retain=false. Phù hợp `pumpStateSchema` hiện hữu.
- OFF gửi theo sự kiện boot/reconnect/failsafe, không phải state heartbeat mỗi 15 giây. PUBACK không đảm bảo ACL delivery, backend commit hoặc trạng thái động cơ. Log Denied cho thấy không được coi báo publish thành công là đủ chứng cứ.
- Không sửa firmware/flag/GPIO. Sample flag vẫn false; binary/local config thực tế dựa trên thông tin người dùng, không độc lập đọc lại từ ESP32 trong lượt này.
- OFF là trạng thái GPIO được thiết bị báo, không chứng minh relay cơ khí đóng/mở, motor quay/dừng hay có nước chảy. OFFLINE vẫn phải hiển thị UNKNOWN; không suy diễn thiết bị mất mạng thì motor đã tắt.

## 4. Sửa source tối thiểu trong phạm vi

| File | Thay đổi |
| --- | --- |
| backend/src/mqtt/mqtt-client.service.ts | Subscribe state khi commands=false bằng subscription riêng; ACL state lỗi không làm hỏng observer telemetry/status; route state riêng khỏi ACK và quyền gửi command; reset evidence mỗi phiên kết nối |
| backend/src/mqtt/mqtt-pump-state.adapter.ts | Nhận OFF khi MQTT bật, không cần commands=true; vẫn chặn retained/DUP/stale/future/ON/mismatch; lưu qua conditional UPDATE đúng Device/Actuator; chỉ ghi evidence sau count>0 và log commit; chỉ cancel pending command khi commands=true |
| backend/src/mqtt/mqtt-state-observer.ts (mới) | Lưu evidence OFF trong bộ nhớ của phiên MQTT hiện tại, độc lập command permission; generation chặn confirmation từ transaction hoàn tất sau disconnect/reconnect |
| backend/src/services/actuator.service.ts | List/detail có thể trả OFF đã quan sát trong phiên, đúng timestamp lưu DB, khi Device ONLINE dù commands disabled; controlEnabled vẫn false, gatewayMode vẫn DISABLED |
| backend/src/repositories/actuator.repository.ts | Summary OFF dùng cùng evidence session/timestamp với list/detail; không đếm MOCK OFF cũ là OFF mới khi command transport tắt |
| backend/scripts/mqtt-pump.test.cjs | Bảy regression mới về passive observation, validation, DB failure/session race, API, reconnect/ACL denial, summary và frontend static binding |
| backend/scripts/device-presence.test.cjs | Điều chỉnh kỳ vọng explicit resubscribe cho subscription state độc lập mỗi connect |
| docs/PHASE12C2_ACTUATOR_STATE_VERIFICATION.md | Báo cáo này |

Không đổi schema/topic/API contract/RBAC/farm scope hoặc logic ON/automation. Không bật MQTT_COMMANDS_ENABLED/MQTT_AUTOMATION_COMMANDS_ENABLED. Không sửa ACL/password/config Mosquitto/firewall, không restart broker, không gửi command/simulator. Source watch của backend đang chạy tự reload theo thay đổi file.

Session evidence tránh biến OFF của MOCK cũ thành trạng thái phần cứng mới. Mất broker/reset observer → evidence bị xóa → API UNKNOWN cho đến OFF trực tiếp mới. Backend restart sau khi ESP32 đã gửi OFF sẽ cần OFF mới từ reconnect/boot ESP32; không nhận retained replay để lấp chỗ trống. Evidence in-memory dành cho kiến trúc single-backend hiện tại, không phải distributed state store. Trong phiên còn kết nối, OFF là báo cáo gần nhất được chấp nhận, không phải đo trạng thái vật lý liên tục.

## 5. ACL cần người dùng áp dụng — chưa thực hiện

Diff tương ứng đã có ở `infrastructure/mosquitto/phase12b-state-acl.patch`. Áp dụng **chỉ hai dòng thêm**, giữ nguyên quyền hiện hữu và allow_anonymous=false:

```diff
 user smartagri_backend
 topic read smart-agriculture/v1/devices/+/command-acks/+
+topic read smart-agriculture/v1/devices/+/actuator/state

 pattern write smart-agriculture/v1/devices/%u/command-acks/+
+pattern write smart-agriculture/v1/devices/%u/actuator/state
```

Dòng backend read phải nằm trong block `user smartagri_backend`; device pattern dùng %u để giữ namespace theo username. Không thêm wildcard write rộng hoặc quyền anonymous, không đổi passwords, không dùng tài khoản backend trong ESP32.

Các bước sau là **hướng dẫn thủ công**, không phải lệnh agent đã chạy:

1. PowerShell Administrator, sao lưu ACL rồi mở đúng file:

   ```powershell
   $aclBackup = 'C:\mosquitto\config\acl.phase12c2.' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.bak'
   if (Test-Path -LiteralPath $aclBackup) { throw 'Backup already exists' }
   Copy-Item -LiteralPath 'C:\mosquitto\config\acl' -Destination $aclBackup
   notepad 'C:\mosquitto\config\acl'
   ```

2. Thêm hai dòng đúng vị trí, lưu. Không copy đè toàn bộ acl.example nếu có quyền tùy biến khác.
3. Khi chấp thuận gián đoạn ngắn, tại terminal **broker LAN chạy với config này**, Ctrl+C rồi chạy lại:

   ```powershell
   & 'C:\Program Files\mosquitto\mosquitto.exe' -c 'C:\mosquitto\config\mosquitto.conf' -v
   ```

   Không khởi động broker thứ ba khi broker LAN cũ chưa dừng, không tự stop service loopback khác. Client backend/ESP32 sẽ reconnect. Nếu không muốn restart, người vận hành dùng cơ chế reload được hỗ trợ bởi bản Mosquitto Windows; không áp dụng lệnh Unix HUP lên Windows theo suy đoán.
4. Backend source đã reload; nếu terminal backend đã dừng thì chạy `cd C:\DATN\Project_datn\backend`, `npm run dev`. Kiểm tra log observation subscribed và hai cờ bơm vẫn false.
5. Nếu ESP32 chưa reconnect/gửi lại OFF, tự reset ESP32 **sau khi xác nhận firmware PUMP_COMMANDS DISABLED và relay OFF**, không bấm nút ON trên web. Chờ NTP synced. Không phải nạp lại firmware chỉ để sửa ACL.

## 6. Kiểm thử và trạng thái

| Mục | Kết quả |
| --- | --- |
| Backend pump regression | 33/33 PASS, DB/GPIO/MQTT mocked |
| Backend presence regression | 27/27 PASS, offline |
| Backend build/typecheck | PASS |
| Frontend lint | PASS |
| Frontend build/typecheck | PASS, cảnh báo bundle >500 kB hiện hữu |
| Frontend polling | 12/12 PASS |
| git diff --check tracked source sửa | PASS |
| Firmware native pump / diagnostics / schema | 36/36 + 18/18 + 5/5 PASS, chạy offline, không GPIO thật |
| Arduino compile/nạp | Không thực hiện ở lượt này; firmware không sửa |
| Device ONLINE + MQTT telemetry thật còn lưu | PASS qua passive subscribe và SELECT sau sửa |
| Migration Phase12 tương thích | PASS qua SELECT migration + columns |
| Quyền ACL state đang triển khai | FAIL, thiếu hai dòng, chưa có phép sửa |
| ESP32 OFF → backend → DB thật | NOT VERIFIED, chưa nhận state mới |
| Authenticated API OFF và website OFF live | NOT VERIFIED, không có phiên đăng nhập/Browser thực |
| OFFLINE/reconnect không tạo OFF giả | PASS unit/static; chưa nghiệm thu hardware E2E |

Unit tests có DB update giả để kiểm tra adapter, không ghi PostgreSQL thật. Kiểm thử frontend là static binding + polling, không phải nhìn thấy website OFF. Có một lỗi mock dependency trong lần chạy trung gian, đã bổ sung mock; kết quả bảng là regression cuối sau sửa.

## 7. Nghiệm thu website sau ACL

1. Broker log không còn `Denied PUBLISH ... actuator/state`; thấy publish OFF thực (non-retained). PUBACK chỉ là một bước, không kết luận hoàn tất từ đó.
2. Backend log `MQTT OFF-state committed: deviceCode=ESP32-GF-A-01 actuatorCode=PUMP_01 recordedAt=...` phải có timestamp mới.
3. Query Tool database smart_agriculture chạy SELECT:

   ```sql
   SELECT d.device_code, d.connection_status,
          a.id, a.actuator_code, a.current_state, a.last_state_changed_at
   FROM public.actuators a
   JOIN public.devices d ON d.id = a.device_id
   WHERE d.device_code = 'ESP32-GF-A-01'
     AND a.actuator_code = 'PUMP_01';
   ```

   Cần ONLINE, OFF, last_state_changed_at mới ngày 16/10, không còn chỉ mốc 13/10 từ MOCK.
4. Đăng nhập website, mở `/devices/demo_device_esp32_a`, giữ tab visible, chờ polling ~10 giây + request. DevTools Network GET `/api/actuators` hoặc `/api/actuators/demo_actuator_pump_a` cần currentState OFF, controlEnabled false. Badge “Trạng thái relay được báo” phải **Tắt**, không phải bằng chứng motor/nước. Bốn sensors tiếp tục đổi recordedAt.
5. Nếu đã chấp thuận kiểm tra mất kết nối, ngắt nguồn ESP32 khi relay OFF, không dùng command ON/OFF. Device OFFLINE sau LWT/TTL phải làm relay hiển thị Chưa xác định. Bật lại, OFF mới từ reconnect phải phục hồi Tắt. Không tuyên bố đã thực hiện các thao tác phần cứng này trong lượt kiểm tra.

**Kết luận: source fix PASS; deployment/ACL còn thiếu và nghiệm thu OFF thực tế NOT VERIFIED. Chưa xác nhận hoàn thành Phase12C.2 cho đến khi OFF từ ESP32 được backend commit và website hiển thị nhất quán.**
