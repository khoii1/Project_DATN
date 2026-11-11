# Phase12C.3 — Triển khai ACL Mosquitto

Ngày 16/10/2026, UTC+7. **BLOCKED: Windows từ chối dừng broker LAN, chưa restart thành công. ACL đã rollback về bản gốc và kiểm tra hash khớp. Không xác nhận mục tiêu website OFF hoàn tất.**

## Broker, cấu hình và quyền Windows

- Broker LAN: PID **23844**, mosquitto, start time **18:30:48 16/10/2026**, LISTEN `0.0.0.0:1883` và `[::]:1883`.
- Service loopback khác: PID **4572**, service name mosquitto, LISTEN `127.0.0.1:1883`/`[::1]:1883`; không dừng/restart/thay đổi service này.
- Lệnh broker LAN từ log người dùng đã cung cấp: `C:\Program Files\mosquitto\mosquitto.exe -c C:\mosquitto\config\mosquitto.conf -v`. Start time/PID/socket khớp broker LAN đã theo dõi. Win32_Process không cung cấp ExecutablePath/CommandLine của process nâng quyền cho phiên hiện tại, nên không tuyên bố đã đọc trực tiếp command line từ process.
- File config thực đọc: `C:\mosquitto\config\mosquitto.conf`; ACL `C:\mosquitto\config\acl`; listener 1883, allow_anonymous=false, password file giữ nguyên, persistence=true.
- Backend cấu hình `172.20.10.2:1883`, username **smartagri_backend**; cờ commands và automation đều false.
- Phiên agent có integrity Medium, không Administrator. Stop-Process đúng PID LAN sau khi xác minh socket/name bị Windows trả **Access is denied**. PID 23844 vẫn chạy sau lệnh; không có broker mới được khởi chạy, không có restart ngầm.

## Sao lưu, thay đổi thử và rollback

Backup ACL đã tạo trước khi sửa:

`C:\mosquitto\config\acl.phase12c3.20261016-191252-136.bak`

SHA-256 bản gốc/backup/ACL sau rollback đều:

`3E64E7E2C066D79198A913784E35C59AB97D6A5762CA6B80D829FD8E7511C557`

Đã thêm đúng hai ACL permission vào file, kiểm tra diff và test config thành công, nhưng khi bước stop bị Access denied đã gỡ đúng phần thêm để phục hồi file byte-identical với backup. **Hiện tại hai quyền chưa được triển khai.** Không sửa password file/tài khoản, quyền telemetry/status/commands/command-acks giữ nguyên. Header `user ESP32-GF-A-01` chỉ chọn tài khoản hiện hữu, không tạo tài khoản mới.

Diff đã kiểm tra, cần người vận hành áp dụng lại:

```diff
 user smartagri_backend
 topic read smart-agriculture/v1/devices/+/command-acks/+
+topic read smart-agriculture/v1/devices/ESP32-GF-A-01/actuator/state

 pattern write smart-agriculture/v1/devices/%u/command-acks/+
+
+user ESP32-GF-A-01
+topic write smart-agriculture/v1/devices/ESP32-GF-A-01/actuator/state
```

Không dùng wildcard state cho các device khác. Dòng backend read nằm trong block backend; device write nằm trong block đúng username thiết bị.

Config gốc `mosquitto --test-config -c ...` báo Configuration file is OK. Lần chạy này cũng phát log “Saving in-memory database ... mosquitto.db”; vì vậy không coi lệnh test-config trên bản Mosquitto này là tuyệt đối không có tác động persistence. Các kiểm tra tiếp theo sử dụng bản cấu hình validation tắt persistence, giữ nguyên listener và đường dẫn auth/ACL, tránh lặp thao tác lưu snapshot. Không đọc nội dung password file; không khẳng định test-config kiểm chứng được mọi quyền auth runtime.

File kiểm tra đã tạo, không dùng để khởi động broker thật:

`C:\DATN\Project_datn\build\mosquitto-phase12c3-validation.conf`

## Tình trạng sau rollback

Thời điểm SELECT **2026-10-16T12:14:39.036Z = 19:14:39.036 UTC+7**:

| Mục | Kết quả |
| --- | --- |
| Device ESP32-GF-A-01 | ONLINE |
| lastSeenAt | 2026-10-16T12:14:38.771Z |
| PUMP_01 currentState DB | OFF cũ |
| lastStateChangedAt | 2026-10-13T06:41:52.241Z, chưa có OFF mới từ firmware |
| TEMP_01 | 32.4 °C, MQTT |
| HUM_01 | 70.6 %, MQTT |
| SOIL_01 | 30.66 %, MQTT |
| LIGHT_01 | 1.67 lux, MQTT |
| recordedAt bốn readings | 2026-10-16T12:14:29.639Z |
| receivedAt | 2026-10-16T12:14:33.544Z |
| Health HTTP | 200, database/MQTT connected |
| Authenticated actuator API | NOT VERIFIED; GET không token trả 401 |
| Website OFF mới | NOT VERIFIED; không có state mới hoặc browser session |

Các SELECT dùng transaction READ ONLY. Không sửa DB để ép OFF; không chạy migration/seed/db push/simulator, không gửi ON/OFF, không sửa firmware/Wi-Fi. ENABLE_PUMP_COMMANDS được giữ nguyên theo firmware đã triển khai; không đọc config.local.h hoặc xác minh binary từ ESP32 trong lượt này. Backend commands/automation kiểm tra trực tiếp vẫn false.

## Người dùng thực hiện trên Windows Administrator

1. Mở PowerShell **Run as administrator**, mở đúng ACL:

   ```powershell
   notepad 'C:\mosquitto\config\acl'
   ```

2. Thêm dòng `topic read smart-agriculture/v1/devices/ESP32-GF-A-01/actuator/state` trong block `user smartagri_backend` (sau các dòng topic read/write hiện có, trước các global pattern). Cuối file thêm:

   ```text
   user ESP32-GF-A-01
   topic write smart-agriculture/v1/devices/ESP32-GF-A-01/actuator/state
   ```

   Giữ nguyên toàn bộ dòng cũ, không dùng bản wildcard patch Phase12B để thay cho hai quyền hẹp được duyệt lần này.
3. Kiểm tra cấu hình/ACL qua bản validation đã tạo:

   ```powershell
   & 'C:\Program Files\mosquitto\mosquitto.exe' --test-config -c 'C:\DATN\Project_datn\build\mosquitto-phase12c3-validation.conf'
   ```

   Chỉ tiếp tục nếu Configuration file is OK và exit code 0. Đây là config validation không persistence; **không chạy nó làm broker thật**.
4. Tại cửa sổ broker LAN cũ chạy bằng `-c C:\mosquitto\config\mosquitto.conf -v`, nhấn Ctrl+C để dừng đúng broker đó. Không stop service loopback khác. Chạy lại trong PowerShell Administrator:

   ```powershell
   & 'C:\Program Files\mosquitto\mosquitto.exe' -c 'C:\mosquitto\config\mosquitto.conf' -v
   ```

   Không chạy thêm bản mới khi bản LAN cũ còn giữ listener. Có thể kiểm tra PID hiện tại trước thao tác; PID trong báo cáo chỉ là snapshot, không dùng để kill sau này nếu chưa xác minh:

   ```powershell
   Get-NetTCPConnection -State Listen -LocalPort 1883 | Format-Table LocalAddress,LocalPort,OwningProcess
   ```

5. ESP32/backend dự kiến tự reconnect. Không bấm ON/OFF; nếu cần tự reset ESP32 để gửi lại state, trước hết xác nhận firmware PUMP_COMMANDS DISABLED và relay OFF. Chờ NTP synced.
6. Broker phải không còn Denied PUBLISH state; backend phải có `MQTT OFF-state committed ... recordedAt=<mới>`. SUBACK/PUBACK đơn lẻ chưa đủ chứng minh DB commit.
7. Query Tool kiểm tra state/time mới:

   ```sql
   SELECT d.device_code, d.connection_status, a.actuator_code,
          a.current_state, a.last_state_changed_at
   FROM public.actuators a
   JOIN public.devices d ON d.id = a.device_id
   WHERE d.device_code = 'ESP32-GF-A-01' AND a.actuator_code = 'PUMP_01';
   ```

8. Website đã đăng nhập, tab visible `/devices/demo_device_esp32_a`: chờ polling khoảng 10 giây + request, relay cần Tắt/OFF, Device ONLINE, bốn sensor có timestamp mới. GET actuator response cần OFF và controlEnabled=false. OFF là GPIO do firmware báo, không chứng minh motor ngừng quay hoặc lưu lượng nước.
9. Nếu config/start lỗi: phục hồi ACL từ backup trước khi thử khởi động lại. Lệnh phục hồi thủ công trong Administrator:

   ```powershell
   Copy-Item -LiteralPath 'C:\mosquitto\config\acl.phase12c3.20261016-191252-136.bak' -Destination 'C:\mosquitto\config\acl' -Force
   ```

   Lệnh này được cung cấp để người dùng rollback đúng file, agent đã rollback và hash verify ở trên. Không xóa database, không đổi password, không tắt anonymous protection.

## Kết quả PASS / FAIL / NOT VERIFIED

| Hạng mục | Kết quả |
| --- | --- |
| Xác định socket/PID broker LAN và tách service loopback | PASS; process command line chỉ xác minh qua log người dùng, không đọc được từ process nâng quyền |
| Backup ACL và xác nhận hash | PASS |
| Diff chỉ hai permission đúng phạm vi | PASS, từng áp dụng rồi rollback |
| Config validation | PASS |
| Restart broker LAN | FAIL — Access denied, chưa dừng/restart |
| Rollback ACL byte-identical | PASS |
| Backend/presence/telemetry hiện hữu sau rollback | PASS qua health và SELECT |
| OFF từ ESP32 sau restart, DB commit mới | NOT VERIFIED, restart chưa thực hiện |
| Authenticated API / website / polling sau restart | NOT VERIFIED |
| Regression source | Không chạy lại trong Phase12C.3; Phase12C.2 đã 60/60 backend, 12/12 polling, 59/59 firmware native; không dùng kết quả cũ để khẳng định deployment thành công |
| Hardware OFFLINE/reconnect nghiệm thu | NOT VERIFIED, không tự ngắt thiết bị hoặc thử relay |

**Bước chặn duy nhất của thao tác triển khai hiện tại là quyền Windows để quản lý broker LAN. Cần người dùng thực hiện các bước Administrator rồi kiểm chứng lại live OFF; không tuyên bố hoàn thành Phase12C.3.**
