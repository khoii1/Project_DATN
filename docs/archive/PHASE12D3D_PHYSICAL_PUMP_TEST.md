# Phase 12D.3D — Preflight và quy trình thử bơm vật lý

> **Mới nhất20/10/2026 20:54 — kết quả thực tế:** Người dùng xác nhận bơm hoạt động tốt và tự dừng sau khoảng1giây. MQTT/DB ghi nhận **hai ON riêng biệt**, cảhai maxRunSeconds1/SUCCESS/ACKAPPLIED vàOFFMAX_RUNTIME. Điều kiện chỉmộtON **không đạt**; không gọi toànphiênPASS. Agent đã khóa lại backend20:53:15, runtimePID13016 commandsfalse/automationfalse/testModetrue/cap1; API DISABLED/OFF/ONLINE, PENDING0. Chờ người dùng xác nhận adapter đãrút; nướcchảy chưa được xácnhận. Xem mục19. Không gửi thêmlệnh.

> **Mới nhất20/10/2026 20:52 — đã mở lại theo yêu cầu người dùng:** Backend PID17268, commands=true/automation=false/testMode=true/cap1; API MQTT/controlEnabledtrue, ONLINE/OFF mới sau reload. Lease tự khóa **20:56:22 VN**. Phiên trước hết hạn an toàn, chưa cóON (0/1). SHORT_PREFLIGHT_PASS; LONG_TERM_STABILITY_NOT_VERIFIED. Xem mục18. Chưa có bằng chứng máy bơm chạy.

> **Mới nhất20/10/2026 20:15 — SHORT_PREFLIGHT_PASS; LONG_TERM_STABILITY_NOT_VERIFIED.** Người dùng đã thay tiêu chí45–60phút bằng preflight nhanh3–5phút. Backend đã mở tạm bằng processenv, automationfalse/testModetrue/cap1, PID11916. OFF mới thật sau reload đã xác minhMQTT/DB/API; chờ người dùng trực tiếp thao tác, ONđãdùng0/1. Lease tự khóa lại lúc **20:18:49 VN** nếu phiên chưa kết thúc. Agent không gửiON/OFF. Chi tiết mục17; các kết luậnNOT_READY theo tiêu chí dài hạn ở dưới là lịch sử.

> **Trạng thái mới nhất 20/10/2026 19:38 VN:** Đã dừng chờ dài theo yêu cầu người dùng. NTP Active/error0, ESP32 ONLINE, relay OFF mới, đủ4 cảm biếnMQTT; backend vẫn khóa điều khiển. **TIME_FIX_NOT_VERIFIED / B_PREFLIGHT_NOT_READY** theo tiêu chí ổn định45–60phút chưa hoàn tất. Xem mục15. Không cấp nguồn bơm; ON0/1.

> **Mới nhất — Phase12D.3E dừng lúc20:03 ngày20/10 theo yêu cầu người dùng:** Monitor đã dừng, không mở quyền điều khiển. NTPActive/error0/LI0/Stratum5, có accepted automatic sync20:02:24; quan sát mới12.053phút chưa đủ45–60phút. **TIME_FIX_NOT_VERIFIED / B_PREFLIGHT_NOT_READY** theo tiêu chí đã giao. ESP32ONLINE, PUMP_01OFF mới, cảm biến tiếp tục cập nhật; APIcontrolEnabledfalse/gatewayModeDISABLED, PENDING0/newCommands0, ON0/1. Giữ adapter rút điện, chưa thử bơm vật lý. Chi tiết mục16.

Ngày: 18/10/2026, khoảng15:54–15:58 Việt Nam (UTC+7).

Cập nhật phiên đã được PHÊ DUYỆT B: 16:11–16:12 cùng ngày, dừng tại time gate (mục8). Các kết quả PASS15:54–15:58 bên dưới là lịch sử, không thay thế precheck hiện tại.

## 1. Kết luận

**NOT READY tại precheck16:11 sau khi B đã được người dùng phê duyệt.** Windows Time tái xuất hiện LastSyncError2, nên dừng trước bật backend command. Preflight15:54–15:58 từngPASS, nhưng không còn là căn cứ bỏ qua lỗi mới. Phê duyệt B cho một ON1s đã được ghi nhận, không yêu cầu cấp lại; chưa sử dụng lượt ON nào và chưa thử motor/nước.

**Cập nhật kết thúcTIME_FIX17:04:** 0x8 đã áp dụng và cóautosync16:48:58, nhưng nghiệmthu bị giánđoạn ở32.10phút do đổi mạng17:02:41, peerPending vàESP32UNKNOWN. Kết luận **TIME_FIX_NOT_VERIFIED / NOT READY chạybơm**; chi tiếtmục11 dướiđây. Không phải bằngchứngstale2 táiphát vìLastSyncError ởđiểmdừng vẫn0.

Người dùng đã xác nhận lại trực tiếp trong phiên: adapter5V vẫn rút điện, khu vực điện/bơm an toàn và khô ráo, có người trực tại chỗ có thể ngắt adapter ngay. Đây là xác nhận tại chỗ của người dùng, không phải phép đo điện độc lập của agent. Checklist đấu nối trước đó không được tự thay đổi.

Không bật MQTT_COMMANDS_ENABLED hoặc MQTT_AUTOMATION_COMMANDS_ENABLED, không publish MQTT/API ON/OFF, không click nút bơm, không cấp điện, không sửa dây/GPIO/firmware, không migration hoặc cập nhật DB thủ công. Không restart backend trong phiên này. Chỉ tạo báo cáo này; các sửa đổi code trước đây giữ nguyên.

## 2. Preflight thực tế

| Điều kiện | Kết quả và bằng chứng |
| --- | --- |
| Windows đồng bộ | PASS:15:54:35, Leap0/Stratum5/LastSyncError0, source time.windows.com,0x9, last successful sync15:45:58, peerActive/Mode3/Stratum4 |
| Offset gần thời điểm kiểm tra | PASS:5 mẫu15:54:35–44 khoảng−144 đến−149ms, không vượt guard2s; không sửa guard |
| ESP32 ONLINE/MQTT/NTP | PASS: Serial mới sample12908:55:03.344Z, network connected/NTP SYNCED; API/DB ONLINE |
| Firmware thực tế ENABLED / GPIO OFF | PASS: log Serial sample129, không chỉ đọc config hoặc Device.firmwareVersion |
| PERIODIC OFF mới | PASS:08:55:07.569Z và08:55:22.726Z, QoS1/non-retained/non-DUP; API khớp, SELECT xác nhận bản07.569Z |
| Runtime cap1s đúng process API | PASS: PID17892 đang nghe5000, StartTime08:35:18.152Z, khớp process được startup-attest ở12D.3C; testMode=true/effectiveMaxRunSeconds1 |
| commands/automation false | PASS: startup log của cùng process, không reload/đổi env từ lúc đó; API controlEnabledfalse/gatewayModeDISABLED |
| PENDING0 / không command mới | PASS: SELECT READ ONLY, newCommands0 từ precheck12D.3C08:34:55.934Z; không tự sửa/xóa command cũ |
| Không tự kích hoạt/retry lệnh cũ | PASS trong luồng code đã rà soát: gatefalse, gateway timeout không retry, discard outgoing khi disconnect, firmware retained/expired/session/duplicate guards; không thấy simulator/dry-run node đang chạy |
| Frontend ON1s / UNKNOWN-OFFLINE khóa ON | PASS source + offline tests: manualCommandBody, pumpPresentation, Axios service; không dùng browser click thật để thử |
| Adapter và người giám sát | PASS theo xác nhận người dùng trong phiên này; vẫn phải xác nhận lại sát cấp nguồn sau phê duyệt B |

### Windows Time

```text
Last Successful Sync Time: 18/10/2026 15:45:58
Leap Indicator: 0
Stratum: 5
Source: time.windows.com,0x9
Last Sync Error: 0
Peer: Active, Mode3, Stratum4
15:54:35 -0.1492340s
15:54:37 -0.1444598s
15:54:40 -0.1486874s
15:54:42 -0.1456012s
15:54:44 -0.1480093s
```

Không resync/chỉnh Windows trong phiên này. Tại phép đo đã hơn8phút sau resync của người dùng mà chưa tái hiện LastSyncError2. Tuy vậy đây vẫn là kiểm chứng ngắn hạn, không bảo đảm qua sleep/đổi mạng/nhiều giờ. RootDispersion7.9097956s và PeerPoll17(out of valid range)/HostPoll10 vẫn tồn tại; không che cảnh báo hoặc tự sửa polling. Đo lại sát lúc B, dừng nếu lỗi/unsynchronized tái phát.

### Serial COM3/115200 mới

Đọc SerialPort.ReadLine, DTR/RTS=false, timeout250ms, bỏ buffer nhận cũ, giới hạn20s và lọc dòng trùng; không reset ESP32. Reader exit0, đã đóng/nhả COM3.

```text
========== SENSOR MONITOR #129 ==========
TEMP_01       : 23.80 C
HUM_01        : 49.90 %
LIGHT_01      : 0.00 lux
SOIL_RAW_ADC  : 3137 (min=3131 max=3145)
SOIL_01       : 18.21 %
RECORDED_AT   : 2026-10-18T08:55:03.344Z
TIME_AT_SAMPLE: SYNCED
WiFi          : CONNECTED
MQTT          : CONNECTED
NTP           : SYNCED
PUMP_COMMANDS : ENABLED
RELAY         : OFF (GPIO only, not motor/water feedback)
TELEMETRY #129: SENT (BROKER_PUBACK; backend DB not verified) | recordedAt=2026-10-18T08:55:03.344Z | publish=67 ms
```

API08:55:04.203Z có đủ bốn reading cùng timestamp/giá trị/sourceMQTT như Serial. LIGHT0 hợp lệ, không phải thiếu dữ liệu. PUBACK không tự chứng minh DB; API/SELECT là kiểm tra riêng.

### MQTT OFF mới, PostgreSQL và API

Observer MQTT dùng client ID riêng, chỉ SUBSCRIBE, không publish command. Topic:

`smart-agriculture/v1/devices/ESP32-GF-A-01/actuator/state`

```json
{"schemaVersion":1,"deviceCode":"ESP32-GF-A-01","actuatorCode":"PUMP_01","state":"OFF","reason":"PERIODIC","recordedAt":"2026-10-18T08:55:07.569Z"}
```

Nhận08:55:07.971Z, QoS1/retain=false/dup=false. API08:55:08.687Z và SELECT sau đó cùng OFF/stateAt08:55:07.569Z. Bản thứ hai recordedAt08:55:22.726Z, nhận08:55:23.123Z, API08:55:23.252Z khớp; khoảng15.157s. Không dùng OFF lịch sử/MOCK hoặc retained để vượt preflight.

Observer nhận retained statusOFFLINE cũ lúc subscribe; không coi đó là trạng thái runtime. StatusONLINE non-retained mới nhận08:55:08.072Z/08:55:23.190Z; DB/API tiếp tục ONLINE. Telemetry08:55:18.344Z có TEMP23.9/HUM50.1/LIGHT0/SOIL18.31, API tự cập nhật đúng sourceMQTT.

Helper `build/phase12d3c-readonly.cjs` chỉ SELECT/transaction READ ONLY đã xác nhận PENDING0, newCommands0, actuator/device hiện tại. Các readings cố định08:37 trong helper là bằng chứng cũ12D.3C, **không dùng chúng làm telemetry hiện tại**; Serial/API fresh ở trên là bằng chứng hiện tại.

Kiểm tra kết thúc15:57:40: Windows vẫnLI0/Stratum5/LastSyncError0; DB/API ONLINE/OFF stateAt08:57:39.120Z, controlEnabledfalse/gatewayModeDISABLED, PENDING0/newCommands0. Bốn readings MQTT latest recordedAt08:57:33.344Z tiếp tục cập nhật. Các observer/reader của phiên đã đóng, không giữ COM3, không dừng hệ thống.

## 3. Runtime cap, chống replay và frontend

Startup attestation đã thu từ chính process và vẫn đối chiếu PID/StartTime trong phiên này:

```json
{"pid":17892,"startedAt":"2026-10-18T08:35:21.780Z","testMode":true,"effectiveMaxRunSeconds":1,"commandsEnabled":false,"automationEnabled":false}
```

Không chỉ dựa vào .env hoặc diagnostic process khác. `server.ts` log từ env đã nạp và cùng `pumpRuntimeLimit` được service dùng; PID hiện tại không thay đổi. Không restart chỉ để in lại log và không bật cờ để thử cap.

Bằng chứng source:

- `backend/src/services/pump-command-policy.ts`: testMode cap1, ngoài testMode tối đa5.
- `device-command.service.ts:40–49`: heartbeat/ONLINE, commands gate, allowlist, UNKNOWN/sessionOFF, automation gate, broker và runtimeLimit; ON2/5/30 bị từ chối trước persistence/publish. HTTP controller không cho truyền gateway override.
- `mqtt-device.gateway.ts`: timeout settle ACK_TIMEOUT/discard, không tự retryON; MQTT client xóa outgoing khi mất kết nối. PENDING DB hiện0, process này khởi động khi commandsfalse và vẫn khóa.
- `firmware/SmartAgricultureESP32/PumpProtocol.h`: retained bị từ chối, expiresAt/sessionFloor/FUTURE_COMMAND2s/high-water/duplicate cache; duplicate không kéo dài timer. Firmware MAX_PUMP_SECONDS vẫn5, không phải cap1 nếu bỏ qua backend.
- `frontend/src/utils/irrigation-control.ts`: ON body maxRunSeconds1; canOn chỉ khi OFF, controlEnabled, active, có quyền và không PENDING; OFFLINE maskUNKNOWN.
- `frontend/src/services/actuator.service.ts`: POST commands dùng manualCommandBody. `IrrigationPage.tsx` polling2000ms và generation guard; nút BẬT mở hộp xác nhận rồi chỉ gửi khi xác nhận.

Không thấy process node có command line simulator hoặc phase12d1-dryrun đang chạy tại preflight. Không tìm thấy đường tự phát ON qua application khi hai gatefalse. Điều này không phải chứng minh không có publisher MQTT độc lập/credential bị lạm dụng; không directMQTT/bypassAPI trong phiên B.

UNKNOWN race DB/memory ở12D.3C đã được tái hiện offline và fail-closed; không giữ OFF cũ để che UNKNOWN. Nếu UNKNOWN xuất hiện lúc muốn phát lệnh thì dừng/chờ freshOFF, không cố bấm lại.

## 4. Regression đã chạy lại

| Suite | Kết quả |
| --- | --- |
| Backend mqtt-pump offline | PASS40/40: cap1, từ chối2/5/30, startup metadata, UNKNOWNrace, ACK/timeout/no-replay/session |
| Frontend irrigation policy/SSR/mockAxios | PASS8/8: ON1s, UNKNOWN/OFFLINE, lockedbackend, PENDING/REJECTED/TIMEOUT |
| Frontend polling offline | PASS12/12: race/StrictMode/visibility/cleanup/recovery |

Không suite nào gửi command vào MQTT/API thật hoặc ghi DeviceCommand thật. Không chạy lại browser E2E/nhấn BẬT/TẮT; không gọi các suite regression API có ghi DB, simulator, seed hoặc migration. Các hostfirmware/presence test đã PASS ở12D.3C, không giả nhận chạy lại trong12D.3D.

## 5. Quy trình vận hành dự kiến — chỉ sau PHÊ DUYỆT B riêng

**Không thực hiện các bước kích hoạt bên dưới trong phiên preflight này.** Preflight là snapshot có thời điểm, không phải quyền chạy vô thời hạn. Nếu chờ lâu/đổi mạng/restart/mất ONLINE, làm lại các gate.

1. **Người dùng:** phê duyệt B rõ ràng cho một phiên thử duy nhất; xác nhận lại nguồn rút, khu vực an toàn/khô, người trực sẵn ngắt adapter độc lập, đúngESP32/PUMP_01 và đấu nối như đã xác minh. Bơm phải được bố trí theo yêu cầu sử dụng của thiết bị; không thay dây trong khi có nguồn.
2. **Agent:** đọc lại clock/error0/offset, Serial ENABLED/OFF/SYNCED, MQTT freshOFF, DB/API/ONLINE, PENDING0, testMode/cap1 của đúng process. Không đạt bất kỳ gate nào → hủy thao tác, không mở quyền.
3. **Agent chỉ trong phiên B được duyệt:** lưu cấu hình cũ, bật tạm MQTT_COMMANDS_ENABLED=true, giữ MQTT_AUTOMATION_COMMANDS_ENABLED=false. Nếu cần reload, đối chiếu startup metadata PID mới/testMode=true/cap1/automationfalse, MQTT ACK/state subscribe thành công. Không gửi command để thử kết nối.
4. **Agent:** chờ báo cáo PERIODIC OFF mới có timestamp sau reload, non-retained và khớp DB/API. UNKNOWN là trạng thái chờ an toàn, không dùng OFF cũ/ghi DB/publishOFFgiả. Chỉ tiếp tục khi gatewayModeMQTT/controlEnabledtrue, freshOFF/ONLINE/PENDING0 và clock đạt.
5. **Người dùng tại chỗ:** theo hướng dẫn/điểm cho phép riêng trong phiên B mới cấp adapter5V. Nếu bơm tự chạy hoặc relay bất thường **trước khi gửi lệnh**, ngắt adapter ngay và hủy thử; không dùng ON/OFF qua mạng để điều tra khi đang có nguồn.
6. **Người dùng:** mở Irrigation → Tưới thủ công, chọn đúngESP32-GF-A-01/PUMP_01. Bấm “Bật thử1giây” mở xác nhận; **xác nhận đúng một lần** tạo đúng một POST/commandId mới/maxRunSeconds1. Không thao tác automation, không người thứ hai cùng click. Agent **chỉ quan sát**, không tự gửi ON/API/MQTT, không retry hoặc gửi thêm để thấy UI ON.
7. **Agent:** thu commandId/issuedAt/expiresAt/maxRunSeconds/sourceMANUAL/transportMQTT, payload command non-retainedQoS1, ACKAPPLIED đúng ID/device/actuator/stateON/time, DeviceCommandSUCCESS/acknowledgedAt, OFF reasonMAX_RUNTIME mới, DB/API cập nhật. PENDING/PUBACK không phải thành công. Nếu ACKREJECTED/TIMEOUT/UNKNOWN thì không coi là ON thành công và không gửi lại.
8. **Người dùng:** trực tiếp quan sát bơm/động cơ/nước và việc tự dừng, báo quan sát trung thực; có thể quay video hoặc dùng phép đo phù hợp đã thống nhất. Agent không suy ra motor/flow từ GPIO/ACK. UI polling2s có thể bỏ qua toàn bộ ON1s; không bấm thêm để chụp trạng thái.
9. **Bất thường:** người trực ngắt adapter ngay, không chờ website/MQTT/ACK/agent hoặc tin lệnhOFF là ngắt nguồn duy nhất. Dừng thử, không cấp lại để retry. Agent chỉ ghi bằng chứng và khóa backend; không phát thêm lệnh điều khiển ngoài phạm vi được duyệt.
10. **Dù PASS/FAIL:** người dùng rút adapter và xác nhận; agent hoàn nguyên commands=false/automation=false, reload nếu cần, kiểm tra đúng runtimeDISABLED/controlEnabledfalse, PENDING0. Chờ freshOFF sau recovery; nếu UNKNOWN kéo dài báo đúng, không ép DB. Giữ adapter ngắt điện, lưu log/commandID/ACK/state/DB/API và quan sát vật lý.

## 6. Giới hạn chưa kiểm chứng và kế hoạch ngắt nguồn

- Chưa có bất kỳ thử motor/nước nào trong phiên này. Chưa đo độ rộng HIGH thực, tiếp điểm relay, boot glitch, relay dính hoặc thời gian dừng cơ khí. Tất cả **NOT VERIFIED**, không đổi thành PASS vì firmware báoOFF.
- maxRunSeconds1 là thời lượng yêu cầu được backend giới hạn; tick/scheduling/relay/cơ khí không bảo đảm hard upper điện/động cơ chính xác≤1.000s. Firmware fail-safe cap5 vẫn giữ nguyên. Không dựa riêng vào phần mềm khi CPUtreo/GPIOfault/relay dính.
- ACKAPPLIED phản ánh thực thi GPIO theo firmware, không chứng minh motor quay hay có nước; PERIODIC/MAX_RUNTIME OFF không có commandId, cần đối chiếu timestamp và một lệnh duy nhất, không giả correlation tuyệt đối.
- Nếu lệnh đã phát nhưng ACKTIMEOUT, có thể GPIO đã từng HIGH; không suy “không chạy” từ timeout. Ưu tiên ngắt adapter độc lập ngay khi không chắc chắn. Không chờ kỳ polling2s hoặc kỳ báoOFF15s để quyết định ngắt điện.
- Người trực phải tiếp cận được phương tiện ngắt nguồn đã chuẩn bị và không phụ thuộc laptop/mạng. Nếu không đáp ứng điều này, **NOT READY**, không cấp nguồn. Không tự thay sơ đồ điện/relay/GPIO trong khi thử.
- Nếu Windows tái phát stale/unsynchronized hoặc offset gần/vượt guard2s, dừng trước phát lệnh; không tăng timestamp guard. Không tự thay peer/registry trong phiên thử.
- Kết quả không chứng minh độ ổn định dài hạn, tính an toàn chức năng được chứng nhận hoặc không có publisher ngoài hệ thống. Giữ broker credential/ACL và không dùng tài khoản simulator trong phiên vật lý.

## 7. Điểm dừng bắt buộc

Điểm dừng lịch sử sau preflight15:57, trước khi người dùng cấp B; hiện được thay thế bằng điểm dừng do lỗi ở mục8:

**Preflight Phase 12D.3D đã PASS. Hệ thống đang chờ người dùng phê duyệt B để thực hiện đúng một lần thử bơm tối đa 1 giây.**

Đây là giới hạn yêu cầu lệnh1s, không phải chứng nhận thời gian điện/cơ khí đã đo. Adapter tiếp tục rút điện, backend hai cờ false, agent không gửi lệnh. Chỉ sau phê duyệt B riêng mới xem xét các thao tác trong mục5.

## 8. Phiên PHÊ DUYỆT B chính thức — dừng tại Giai đoạn1

Người dùng đã phê duyệt rõ một phiên vật lý, duy nhất một ON/maxRunSeconds1 do **người dùng tự xác nhận trên website**; agent chỉ giám sát. Được phép bật tạm backend command sau khi mọi precheck đạt, phải dừng để phối hợp người dùng cấp nguồn. Không cần yêu cầu người dùng phê duyệt B thêm lần nữa. Phê duyệt này không cho bỏ qua điều kiện dừng khi precheck thất bại.

### Windows lúc16:11:29 — FAIL

```text
Leap Indicator: 0
Stratum: 5
Source: time.windows.com,0x9
Last Successful Sync Time: 18/10/2026 15:45:58
Last Sync Error: 2 (The computer did not resync because only stale time data was available.)
Time since Last Good Sync Time: 1530.588s
Peer: Active, Mode3, Stratum4
16:11:29 -0.1305937s
16:11:31 -0.1316768s
16:11:33 -0.1265483s
16:11:35 -0.1290663s
16:11:37 -0.1301860s
```

Offset hiện nhỏ127–132ms, nhưng yêu cầu LastSyncError0 **không đạt**. Không suy LI0/peerActive/stripchart nhỏ thành time gate PASS. Lỗi tái phát khoảng25phút sau resync15:45:58, chứng minh kiểm tra ổn định vài phút trước không bảo đảm vận hành dài hơn. Không tăng FUTURE_COMMAND2s hoặc tự chỉnh Windows registry/peer/giờ.

### Hệ thống tại điểm dừng

- API09:11:29.800Z: ONLINE/OFF, controlEnabledfalse/gatewayModeDISABLED; cổng5000 vẫn thuộc PID17892, process đã attest testMode=true/effectiveMaxRunSeconds1 ở12D.3C. Không restart hoặc bật cờ trong phiên B này.
- Diagnostic09:12:02.975Z: commandsEnabled=false, automationEnabled=false, pumpTestMode=true, healthDB/MQTTconnected. PostgreSQL ONLINE/OFF stateAt09:11:55.994Z; PENDING0, helper read-only xác nhận newCommands0 từ precheck12D.3C.
- Bốn readings MQTT mới recordedAt09:11:48.344Z/receivedAt09:11:48.733Z: TEMP27.7/HUM57.6/SOIL18.31/LIGHT0. Đây là dữ liệu cảm biến, không phải bằng chứng motor/nước.
- Serial reader COM3/DTRoff/RTSoff đã được khởi chạy song song với clock check; chỉ nhận đoạn hỏng `T0:11:3.34Z |pulih=60ms`, không đủ xác nhận mới ENABLED/OFF/NTP. Reader kết thúc/đóng cổng exit0, không reset ESP32. Bằng chứng Serial hợp lệ gần nhất vẫn là sample129 của preflight trước; không gán đoạn lỗi thành log mới. Không tiếp tục reset/reflash để vượt gate đãFAIL.
- Adapter phải tiếp tục rút điện theo chỉ dẫn/ngữ cảnh xác nhận của người dùng; chưa đến bước phối hợp cấp nguồn nên agent không yêu cầu cắm adapter. Không có quan sát vật lý độc lập mới trong phiên bị dừng.

### Trạng thái các giai đoạn

| Giai đoạn | Kết quả |
| --- | --- |
| 1 precheck | FAIL time gate; Serial mới cũng chưa xác minh đầy đủ |
| 2 bật command/backup trước bật/reload/chờOFF | NOT EXECUTED, bị chặn trước mọi thay đổi cấu hình |
| 3 BACKEND READY/cấp nguồn | NOT EXECUTED; không thông báo BACKEND READY |
| 4 user clickON | NOT EXECUTED; quotaON đã dùng0/1 |
| 5 CommandId/ACK/MAX_RUNTIME/DB/frontend/motor/nước | NOT VERIFIED, chưa có command mới để đối chiếu |
| 6 hoàn nguyên flags | Không cần đổi lại vì chưa từng mở; xác minh cuối cả haifalse, testModetrue, PENDING0 |

Không tạo backup mới trong phiên này vì dừng trước sửa cấu hình; các backup firmware/config trước đó vẫn giữ nguyên. Không gửi ON/OFF hoặc ép trạng thái DB; không tự chạy regression có ghi dữ liệu. Chỉ cập nhật báo cáo.

**Hành động tiếp theo:** giữ nguồn bơm ngắt, xử lý/điều tra Windows Time tái phát với quyền phù hợp rồi đo lại status/error/peer/offset theo thời gian thực; đồng thời lấy Serial mới hợp lệ. Chỉ tiếp tục theo phê duyệt B hiện có sau khi tất cả precheck đạt, và vẫn phải dừng phối hợp trước khi người dùng cấp nguồn/nhấn BẬT. Không đánh dấu đã chạy bơm hoặc đã dùng lượt ON.

## 9. TIME_FIX đã được phê duyệt — hiện NOT VERIFIED

Người dùng đã phê duyệt riêng đổi duy nhất NtpServer0x9→0x8, backupParameters và nghiệm thu45–60phút có ít nhất một syncautomatic. Không cần xin lạiB hoặcTIME_FIX.

Precheck16:27 ngày18/10: agent không có tokenAdministrator; configurationquery AccessDenied. Registry vẫntime.windows.com,0x9/TypeNTP, máyWORKGROUP, serviceRunning, LastSyncError2. **Chưa đổi cấu hình, chưa tạo backup mới, chưa thực hiện resync, chưa bắt đầu đo45–60phút**. Scriptchờngười dùng chạy bằngAdmin tại `build/phase12d3d-apply-timefix.ps1` đã parsePASS và dừng đúngguardquyền trong phiên hiện tại; đườngapply/rollback thực tếchưađượcxácminh.

Xem [báo cáoTIME_FIX](PHASE12D3D_WINDOWS_TIME_ROOT_CAUSE.md), mục10, để thực thi. Kết luậnhiện tại **TIME_FIX_NOT_VERIFIED / NOT READY cho thửbơm**. Backendcommands=false/automation=false/testModetrue giữ nguyên; ON0/1, adapter tiếp tục rútđiện. Không tự chuyển sangbậtcommand hoặc thửbơm dùBđãcó.

## 10. TIME_FIX đã áp dụng16:31:38 — đang nghiệm thu

Người dùng chạy script bằngAdministrator thành công; backupParameters tại `C:\DATN\backups\w32time-parameters-before-0x8-20261018-163138\Parameters.reg`, hashđãđốichiếukhớp. NtpServerhiệulực0x8/TypeNTP/local, các cấuhìnhtĩnh khác không đổi. Có đúngmột manualsetupresync16:31:38, không tính làautomatic.

Agent bắt đầu theo dõiquiet-window45–60phút, tối thiểuđến17:16:38VN, không resync thêm. Cần thấy lastsuccessfulsync tựtiến sau baseline mà không cómanualrequest mới. Mốc~3phút lỗi0/LI0/peerActive nhưng chưaauto, nên vẫn **TIME_FIX_NOT_VERIFIED**, chưaREADY chạybơm. Chi tiếtlog và tiêu chí ở báo cáoTIME_FIX mục11.

Backendcommands/automationfalse, testModetrue; không chạmfirmware/database hoặc gửiON/OFF, không tiêu thụquotaON. Adaptertiếptụcrútđiện. Không chuyển sang phiênB chỉ vì đã áp dụng0x8 hoặcoffsetnhỏ.

## 11. TIME_FIX dừng ở32phút — đổi mạng và peerPending

NtpServer0x8/TypeNTP đãbackup/áp dụngPASS16:31:38. Có mộtacceptedautosync16:48:58, không manualresync bổsung; qua mốc25/30phút chưa stale2. Tuy nhiên17:02:41 cóTime-ServiceOperational266ReasonCode2/networkchange, NetworkProfile xác nhận ngắtmạngcũ/nốimạngmới17:02:41–46; IPv4Wi-Fi hiện192.168.1.4 thay172.20.10.2 trướcđó.

17:03:44 (32.10phút từbaseline) monitor dừng dopeerPending/Mode0/Stratum0. StatusvẫnLeap0/Stratum5/LastSyncError0. RawhelperresultTIME_FIX_FAIL là failgateActive; nghiệmthuđộổnđịnh45–60phút **NOT VERIFIED** do bịgiánđoạn, khôngkhẳngđịnh0x8gâylỗimạnghoặcđãsửađứtđiểm. Không rollbackvề0x9 vìapply/configđúng vàcónetworktriggerkháchquan; khôngđổicấuhìnhkhác.

API17:04:24: ESP32UNKNOWN/khôngONLINE, PUMP_01 hiểnthịUNKNOWN antoàn dùDBcònOFFlịchsử10:02:40.074Z. BackendDISABLED/controlEnabledfalse, PENDING0/newCommands0. Không gán readingscũ thànhmới. KhônggửiON/OFF/khôngcấpnguồnbơm, ON0/1.

Giữadapterrútđiện; cầnổnđịnhlạimạng, khôiphụcONLINE/freshOFF vànghiệmthuđủ45–60phútcóautosync. KhôngtựđổiWiFi/MQTT_HOST/firmware hoặcchuyểnsangB. PhêduyệtBvẫncòn, khôngxinlại. Xem [báocáoTIME_FIX](PHASE12D3D_WINDOWS_TIME_ROOT_CAUSE.md) mục12 vàrawlog `build/timefix-monitor-20261018-163138.jsonl`.

Cập nhật17:06:44: NTP0x8 tựActive lại, LastSuccessfulSync17:06:02/error0, không manualresync thêm. Giánđoạnmạng không phải bằngchứngstale2 hoặc0x8gâylỗi; chưa đủcửasổ45–60phútổnđịnh đểkếtluậnPASS. IPvẫn192.168.1.4, ESP32cầnđượcxácminhONLINE/freshOFF lại trước mọi thửbơm. Tiếptụcgiữbackendkhóa vànguồnbơmngắt.

## 12. Kiểm tra tiếp tục20/10/2026 — không thể nghiệm thu hiện tại

Kiểm tra19:12–19:15VN: IPWi-Fiđãtrởlại172.20.10.2, firmware/backendMQTThost cùngIP. Nhưng brokerLAN đãkhôngcònchạy; chỉMosquittoPID4572listen127.0.0.1/::1:1883, khônglistenerLAN. Backendcổng5000khôngchạy, healthkhôngtruycậpđược. PostgreSQLRunning/SELECTđược; PENDING0 vàcommandsmới nhấttừ16/10, chưatiêuthụON.

DeviceONLINE/ActuatorOFF trongDB là dữliệungày18/10 (lastSeen10:25:55.960Z), khôngđượcdùngxácnhậnONLINE hoặc relayOFF hiện tại. COM3khôngtồntại; không cóSerialmới. Configcờfalse/false/testModetrue cònđúng, nhưng không có backendprocessservingAPI đểxácminhcap1runtime.

NTPsource0x8/LI0/Stratum5/error0/lastgood19:11:12 nhưngpeerPending, cónetworknotificationReason2 lúc19:11:06. Logmonitorrecoveryngày18 chỉtới2.016phút, không cómonitorcònchạy vàkhôngđủ45–60phút. KhôngkhẳngđịnhTIME_FIXPASS từlastsynchiệntại.

**TIME_FIX_NOT_VERIFIED / B_PREFLIGHT_NOT_READY.** Chỉ cậpnhậthai báo cáo, khôngstartdịchvụ/đổicấuhình/firewall/mạng/firmware hoặcghiDB. Cần khôiphụckếtnốiUSBESP32, đúngbrokerLAN/backend theo quyềnđượccho phép, rồi mới xácminhfreshtelemetry/OFF/cap vàtheodõi mộtwindowtimefixliêntục. Giữadapterrútđiện, khônggửiON/OFF; Bđãcó nhưngONvẫn0/1.

## 13. Sau cho phép khởi động dịchvụ — MQTT phục hồi20/10 19:18

BrokerLANPID23312listen0.0.0.0/[::]:1883 đãxuấthiệntrướcagentstart, nênagentdùngbrokerđó, khôngtạotrùng/khôngđụngservice4572. Agentkhởiđộngbackendcổng5000PID1888, startUTC12:17:47.659Z, startupattestationtestModetrue/effectiveMaxRunSeconds1/commandsfalse/automationfalse; listenerPIDkhớp. Không sửa.env, firmware/MQTTschema/ACL/firewall hoặc migration.

OFFmới12:17:50.561Z saustartup đãcommitted; cácPERIODICOFF12:18:05.713/20.861/35.927Z QoS1/non-retained đượcAPI/DBxácminh, deviceONLINE. BốnreadingMQTTrecordedAt12:18:34.862Z: TEMP31.2/HUM73.5/LIGHT3.33/SOIL0, receivedAt12:18:35.533Z. PENDING0, khôngcommandmới, APIDISABLED/controlEnabledfalse. KhôngdùngONLINE/OFFcũ đểxácnhận.

Serialsample4đọc19:15 chứngminhENABLED/OFF/NTP/WiFiCONNECTEDnhưngMQTTDISCONNECTED trướcbrokerphụchồi; COM3sauđóbịchiếm nênchưacóSerialđầyđủsauphụchồi. CầnngườidùngđóngSerialMonitor/Plotter hoặcgửi2framemới; agentkhôngépđóngứngdụng/resetboard.

NTP19:18:41vẫnpeerPending dùLI0/Stratum5/error0/source0x8; chưađủ45–60phút/autosyncwindow, chưarestartmonitoroldPID17892. **B_PREFLIGHT_NOT_READY / TIME_FIX_NOT_VERIFIED**. Khôngchuyểnsangbậtcommand hoặcyêucầucấpnguồn; giữadapterrútđiện,ON0/1. Backendđểchạy,chỉquan sátthiếtbị. Bđãcókhôngcầnxinlại.

## 14. Tiếp tục nghiệm thu Windows Time lúc 19:28 ngày 20/10

Broker LAN1883/PID23312, backend5000/PID1888 vẫn hoạt động, IP172.20.10.2. SELECT xác nhận ONLINE, OFF mới, đủ4 cảm biến nguồn MQTT, PENDING0; API DISABLED/controlEnabledfalse. Hai PERIODIC OFF12:27:56.044Z và12:28:11.111Z cách khoảng15 giây, QoS1/non-retained, API khớp. Serial người dùng gửi sample24/12:20:49.862Z xác nhận ENABLED/GPIO OFF/NTP SYNCED/WiFi+MQTT CONNECTED; không mở COM3 khi Arduino Serial Monitor đang giữ.

Peer Pending đã tự phục hồi Active lúc19:28:00 (event264), accepted sync19:28:16, error0/LI0/Stratum5. Không resync hoặc đổi cấu hình. Đang chạy đúng một monitor read-only với PID1888, baseline19:28:26, yêu cầu45–60 phút và accepted automatic sync mới sau baseline. Offset đầu cửa sổ khoảng−0.28 đến−0.30 giây; sync trước baseline không tính cho cửa sổ mới.

**TIME_FIX_NOT_VERIFIED / B_PREFLIGHT_NOT_READY** trong khi chờ kết quả. Commands=false, automation=false, testMode=true/cap1 theo startup attestation cùng PID1888, không reload. Adapter phải giữ rút điện; không gửiON/OFF/clickBẬT. Phê duyệtB vẫn còn, ON đã dùng0/1; chưa đến bước cấp nguồn. Sau time gate PASS còn phải chạy preflight sát thời điểm thử và xác nhận điều kiện phần cứng hiện thời.

## 15. Chốt theo yêu cầu dừng chờ dài — 20/10/2026 19:38

Người dùng không muốn tiếp tục chờ. Monitor read-only đã dừng, không còn tiến trình monitor; không dừng broker/backend. Có10 snapshot19:28:27–19:37:29, tối đa9.039phút từbaseline: peerActive/LI0/Stratum5/error0, không đổi mạng hoặc resync, cấu hình an toàn giữ nguyên. LastSuccessfulSync19:28:16 trướcbaseline; chưa có sync mới trong cửa sổ này. Không coi đây là45–60phútPASS.

Kiểm tra chốt: NTP Active/error0/source0x8; brokerLAN23312/backend1888 còn hoạt động. DB19:38:00 ONLINE/OFF, PENDING0, latestcommands vẫn16/10; readingsMQTT12:37:49.862Z: TEMP31.1/HUM73.9/LIGHT3.33/SOIL0. API19:38:02 trả OFFstateAt12:38:01.613Z, ONLINE, controlEnabledfalse/gatewayModeDISABLED. FirmwareENABLED/GPIOOFF/NTPSYNCED dựa Serialsample24 người dùng cung cấp, không mở COM3/flash/reset. BackendPID giữ nguyên attestationtestModetrue/effectiveMaxRunSeconds1; configcommandsfalse/automationfalse.

| Điều kiện | Kết quả chốt |
| --- | --- |
| NTP có khả năng tự đồng bộ, hiệnActive/error0 | PASS tại thời điểm kiểm tra |
| 45–60phút ổn định và sync tự động sau baseline | NOT VERIFIED — dừng theo yêu cầu |
| ESP32 ONLINE, đủ4 cảm biến, OFF mới qua MQTT/DB/API | PASS tại thời điểm kiểm tra |
| Backend khóa commands/automation, testMode/cap1, PENDING0 | PASS |
| Adapter thực tế vẫn ngắt tại thời điểm chốt | Theo xác nhận trước; không có quan sát vật lý mới của agent |
| Điều kiệnB theo đầy đủ tiêu chí ban đầu | B_PREFLIGHT_NOT_READY |
| Thử motor/nước, Command/ACK vật lý phiênB | NOT EXECUTED; ON0/1 |

Không bật cờ, gửiON/OFF, cấp nguồn bơm hoặc thay firmware/database. Giữ adapter rút điện. Dừng ở đây, không tự chuyển sang thử vật lý; phê duyệtB đã có không bị xin lại. Chi tiết NTP/rawlog ở mục16 báo cáo Windows Time.

## 16. Phase12D.3E — đã thực hiện theo dõi, sau đó dừng theo yêu cầu

Theo yêu cầu mới Phase12D.3E, agent chạy lại đúng helper hiện có với ExpectedBackendPid1888, không có monitor trùng. Baseline19:50:43 ngày20/10; không ghép phiên trước đã dừng. Rawlog: `build/timefix-monitor-recovered-20261020-125043.jsonl`.

Người dùng gửi Serialsample148/recordedAt2026-10-20T12:51:49.862Z: WiFi/MQTT CONNECTED, NTP SYNCED, PUMP_COMMANDS ENABLED, relay GPIOOFF, telemetry brokerPUBACK. Sau đó người dùng xác nhận điều kiện an toàn được hỏi (adapter rút điện, khu vực/dây/nguồn an toàn, có thể ngắt nguồn). Agent không mở COM3, reset, flash hoặc tác động GPIO.

13 snapshot từ19:50:44.274 đến20:02:47.129, snapshotcuối12.053phút từbaseline: tất cả peerActive, LI0/Stratum5/LastSyncError0; không có networkchange hoặc manualresync trong cửa sổ, cấu hình bảo vệ giữ nguyên. Có mộtaccepted automatic sync **20:02:24**, saubaseline; LastKnownGoodTime/LastSuccessfulSync tự tiến, không resync bằng agent. Đây là bằng chứng tự đồng bộ đã hoạt động, không đủ thay thế tiêu chí45–60phút. Kiểm tra20:03:37 vẫn Active/error0, StateMachine2(Sync), phaseOffset−0.1167476s. Offset đầu−198.2 đến−202.4ms, không nới guard2giây.

Người dùng yêu cầu “tôi nghĩ nên dừng”. Agent dừng monitor bằng Ctrl+C (session12847 exit1 do chủ động ngắt), xác minh không còn tiến trình monitor; giữ nguyên broker/backend. Không có resultPASS trongrawlog, không sửa log để tạoPASS.

Kiểm tra chốt20:03:39–40:

- API và SELECT cùngONLINE/PUMP_01OFF, stateAt2026-10-20T13:03:35.482Z, lastSeen13:03:36.064Z.
- Đủ4 readingsMQTT13:03:34.862Z: TEMP31.0/HUM74.5/LIGHT3.33/SOIL1.96. Đây là số backend nhận, không phải chứng nhận hiệu chuẩn.
- APIgatewayModeDISABLED/controlEnabledfalse; PENDING0/newCommands0. BackendPID1888 không restart, startupattestationtestModetrue/cap1/commandsfalse/automationfalse vẫn là nguồn runtime đã kiểm chứng.
- Không bật command flag, không gửiON/OFF, không ghiDB thủ công, không migration/flash, không cấp nguồn hoặc thử bơm. ONđãdùng0/1.

| Giai đoạn12D.3E | Kết quả |
| --- | --- |
| NTP hiện đồng bộ, tự sync trong cửa sổ | PASS tại thời điểm kiểm tra |
| Giai đoạn1: ổn định45–60phút | NOT VERIFIED — dừng theo yêu cầu sau12.053phút |
| MQTT/DB/API/firmwareSerial/precheck quan sát | Các bằng chứng đạt tại thời điểm đo; không thay thế gate thời gian |
| Giai đoạn2 preflight đầy đủ để mở commands | B_PREFLIGHT_NOT_READY do gate45–60phút chưa đạt |
| Giai đoạn3 bật quyền điều khiển | NOT EXECUTED |
| Giai đoạn4 BACKEND READY/cấp nguồn/userON | NOT EXECUTED |
| Giai đoạn5 motor/nước/CommandACK vật lý | NOT VERIFIED — chưa có lệnh hoặc quan sát chạy bơm |
| Giai đoạn6 khóa điều khiển | Giữ nguyên DISABLED, không cần hoàn nguyên vì chưa mở |

**Kết luận: TIME_FIX_NOT_VERIFIED, B_PREFLIGHT_NOT_READY; không phải phát hiện stale data tái phát trong cửa sổ đã đo.** Dừng tại đây theo yêu cầu mới nhất của người dùng; adapter tiếp tục rút điện. Không xin lại phê duyệtB, cũng không tự chuyển sang thao tác có thể kích hoạt bơm.

## 17. Preflight nhanh theo tiêu chí mới và mở phiên chuẩn bị có thời hạn

Người dùng chủ động thay điều kiện nghiệm thu sang tối đa5phút, ba lượt offset cách nhau trong3–5phút; không yêu cầu TIME_FIX_PASS dài hạn cho phiên thử ngắn có người trực. Phê duyệtB giữ nguyên, mộtON website/maxRunSeconds1, agent không tự gửi lệnh.

### Bằng chứng trước khi mở quyền

| Lượt đo giờVN20/10 | Offset5mẫu | NTP |
| --- | --- | --- |
| 20:09:47–56 | −109.1 đến−145.2ms | Active/LI0/Stratum5/error0 |
| 20:10:35–43 | −137.3 đến−149.7ms | Active/LI0/Stratum5/error0 |
| 20:13:19–27 | −133.7 đến−144.0ms | Active/LI0/Stratum5/error0 |

Ba lượt trải3phút40giây, giữsource0x8, không resync hoặc thayregistry; LastSuccessfulSync20:02:24. Operational từ20:09:47 không có event mới/networknotification; SystemTime-Service không cówarning/error mới. Không có bằng chứng stale mới trong cửa sổ. **SHORT_PREFLIGHT_PASS; LONG_TERM_STABILITY_NOT_VERIFIED**, không đánhTIME_FIX_PASS45–60phút.

Serial người dùng cung cấp sample230/13:12:19.862Z: WiFi/MQTT CONNECTED, NTPSYNCED, PUMP_COMMANDSENABLED, relayGPIOOFF, TELEMETRY brokerPUBACK. Xác nhận an toàn phần cứng/adapter ngắt được người dùng cung cấp ngay trước phiên này. SELECT/API20:13:43–44: ONLINE/OFFmới, đủ4readingsMQTT13:13:34.862Z, PENDING0/newCommands0, gatewayDISABLED/controlEnabledfalse trước mở. BrokerLAN23312/1883, backend1888/5000 trước reload; frontend5173 trước đó chưa chạy, đã khởi độngVite local session65989, không thao tác nútBẬT/TẮT.

### Mở tạm và chờOFF sau reload

Chỉ sau preflight đạt, dừng đúng backend session76568 cũ rồi chạy helper có giới hạn phiên `build/phase12d3d-short-session.cjs` (session94464). Không sửa.env hoặccredential; chỉ đổi env của backendprocess. Backup các cờ cũfalse/false/true và hash.env ghi trong `build/short-pump-session-2026-10-20T13-13-49-234Z.jsonl`. Logserver tại cùngprefix `.backend.log`. Helper không publishMQTT hoặc gọiAPIcommand.

Startup đúngprocess serving5000: `{"pid":11916,"startedAt":"2026-10-20T13:13:52.302Z","testMode":true,"effectiveMaxRunSeconds":1,"commandsEnabled":true,"automationEnabled":false}`. ListenerPID11916 khớp, DB/MQTTconnected/subscriptionsrestored. OFFcommit13:13:59.141Z sau startup; observer thuPERIODIC OFF13:14:14.313Z QoS1/retainfalse/dupfalse, API cùngtimestamp, ONLINE/controlEnabledtrue/gatewayModeMQTT. SELECT20:14:51: OFF13:14:44.503Z, ONLINE, PENDING0/newCommands0. WindowsTimechốt20:14:50 vẫnActive/LI0/Stratum5/error0, không thayguard2giây.

Helper có lease300giây từ20:13:49, **tự dừng đúng backend con do nó tạo và khởi động lại với commandsfalse/automationfalse/testModetrue lúc20:18:49 VN** nếu chưa rollback sớm. Gửi `rollback` vào stdin session94464 để khóa sớm; không tác độngbroker hoặcprocesskhác. Lease hết hạn không đồng nghĩa đã kiểm chứng khôi phục; phải đọclog/API sau đó. Không để quyền mở vô thời hạn, không tự gia hạn/retryON.

Thu thậpMQTT thụ động ACK/state/status/telemetry (không publish, không subscribelệnh ngoàiACL) đang chạy session13257, rawlog `build/physical-pump-passive-2026-10-20T13-14-40-719Z.jsonl`,330giây. PayloadON sẽ đối chiếuDeviceCommand/backend sau khi người dùng thao tác, không giả định đã cóON.

### Điểm dừng phối hợp

**BACKEND READY trong cửa sổ đến20:18:49 VN.** Người dùng trực tiếp kiểm tra/bố trí bơm, cấpadapter5V và quan sát không tự chạy, rồi nhấnBẬTthử1giây đúngmộtlần trênwebsite. Nếu bất thường, ngắtadapterngay, không chờMQTT và khôngretry. Không coiACK/GPIO là bằng chứngmotor/nước, không khẳng địnhxungGPIOđúng1.000ms.

Tại thời điểm bàn giao: chưa cócommandmới, ON0/1; CommandId/ACK/MAX_RUNTIME/motor/nước và hoànnguyênsauphiên **NOT VERIFIED/NOT EXECUTED**. Sau người dùng thao tác hoặc hủy phiên: yêu cầu rútadapter, khóa backend, xácminhDISABLED/controlEnabledfalse/PENDING0 vàOFFmới. Nếu leasehết trước thao tác, không nhấnBẬT hoặc tự mởlạiphiên.

## 18. Người dùng yêu cầu mở lại — 20/10/2026 20:47–20:52

Kiểm tra phiên cũ chứng minh lease tự hoàn nguyên20:18:49, backendlockedPID23504 startup20:18:52.585: commandsfalse/automationfalse/testModetrue/cap1, .envunchanged. API20:47DISABLED, PENDING0/newCommands0; chưa dùngON0/1. Người dùng xác nhận hiện trạng an toàn khi được hỏi adapter ngắt/nguồn và khả năng ngắt độc lập, firmwareENABLED/NTPSYNCED/GPIOOFF; không gửi kèm khung Serial mới trong lần trả lời “xac nhan”, nên không ghi là agent đã trực tiếp đọcSerial mới.

Preflight nhanh lặp lại: Active/LI0/Stratum5/error0, source0x8. Offset20:48:03–11:−69.6 đến−75.7ms;20:50:51–59:−59.5 đến−74.2ms;20:51:08–12:−50.4 đến−71.9ms. Toàn bộ đo trải khoảng3phút9giây, không resync hoặc sửa cấu hình; Operationalnetworkchange0 vàSystemwarnings/errors0 kể từ20:47:45. ESP32 liên tụcONLINE/bốnreadings/PERIODICOFFQoS1/non-retained, DB/APIkhớp, PENDING0/newCommands0. **SHORT_PREFLIGHT_PASS; LONG_TERM_STABILITY_NOT_VERIFIED**.

Sau khi xác minh backend23504 là con của helper10096 đúngscript đã tạo, dừng đúng câybackend/helpercũ để tránh trùng, không đụngbroker/frontend. Chạy lại helper giữ .envnguyên/hashkhớp, backupflagsfalse/false/true trong `build/short-pump-session-2026-10-20T13-51-22-526Z.jsonl`; serverlog cùngprefix `.backend.log`. Sessionhelper52149, lease300giây hết **20:56:22.537VN**; gửi`rollback` vào stdin để khóa sớm. Không tự gia hạn.

Startup thực tế13:51:24.232Z/PID17268: commandsEnabledtrue, automationEnabledfalse, testModetrue, effectiveMaxRunSeconds1; listener5000đúngPID, MQTT/DBconnected. OFF mới13:51:26.106Z saustartup; passiveobserver13:51:41.209Z PERIODICOFFQoS1/retainfalse/dupfalse, cùngtimestampSELECT/API20:51:50, ONLINE/gatewayMQTT/controlEnabledtrue. PENDING0/newCommands0. WindowsTimechốt20:51:51 vẫnActive/error0/LI0. Observer thụ động session61112/rawlog `build/physical-pump-passive-2026-10-20T13-51-32-832Z.jsonl`, không phát lệnh.

**BACKEND READY** tới20:56:22 VN, dừng để người dùng cấp nguồn/quan sát/nhấnONduynhất maxRunSeconds1 từwebsite. Nếu bơm tự chạy hoặc có bất thường, ngắtadapterngay/hủy, khôngretry. Chưa cóCommandIdmới/ACK/MAX_RUNTIME hoặc quan sátmotor/nước, chưa dùnglượtON0/1. Sau thử phải rútadapter, hoànnguyên và xácminhAPI/DB; bộhẹn tựkhóa không thay cho kiểmchứng kết quả sauphiên.

## 19. Kết quả thực tế và khóa sau khi người dùng thử —20/10/2026

Người dùng báo: “bơm hoạt động tốt và tự dừng sau1s”. Ghi nhận đây là quan sát vật lý từ người dùng, không phải phép đo xungGPIO1.000ms. Chưa có xác nhận riêng về nướcchảy. Agent không nhấnwebsite hoặc phátAPI/MQTTON/OFF; chỉ quan sát. Phát hiện **hai commandON khácCommandId**, không phải duplicateMQTT của cùngcommand. Chưa xác định vì sao cóhai yêu cầu (hai thao tác hoặc UI phát lặp); không tự quy kết nguyên nhân, không sửacode trong phiên này.

### Đối chiếu SELECT, API và MQTT

Truy vấn bằng `build/phase12d3d-result-readonly.cjs`, transactionREADONLY, lọcDeviceESP32-GF-A-01/ActuatorPUMP_01 vàrequestedAt>=2026-10-20T13:13:49Z; SELECT lúc13:53:44.600Z trả đúnghai bản ghi:

| TrườngUTC | ON1 | ON2 |
| --- | --- | --- |
| commandId/correlationId | 6946e5a2-1b2c-4c84-8509-f0a8df9355f2 | c84751de-54a4-46cf-9478-d6ee46e5d638 |
| requestedAt |13:52:42.135Z |13:52:47.549Z |
| sentAt |13:52:42.169Z |13:52:47.555Z |
| expiresAt |13:52:52.135Z |13:52:57.549Z |
| maxRunSeconds |1 |1 |
| command/source/transport |TURN_ON/MANUAL/MQTT |TURN_ON/MANUAL/MQTT |
| status/failureReason |SUCCESS/null |SUCCESS/null |
| acknowledgedAt |13:52:42.329Z |13:52:47.615Z |
| completedAt |13:52:42.330Z |13:52:47.616Z |
| ACKresult/recordedAt |APPLIED/13:52:41.823Z |APPLIED/13:52:47.215Z |
| OFFreason/recordedAt |MAX_RUNTIME/13:52:43.012Z |MAX_RUNTIME/13:52:48.237Z |

ACKpayloadthật củaON1: `{"schemaVersion":1,"commandId":"6946e5a2-1b2c-4c84-8509-f0a8df9355f2","deviceCode":"ESP32-GF-A-01","actuatorCode":"PUMP_01","type":"PUMP_SET","state":"ON","result":"APPLIED","recordedAt":"2026-10-20T13:52:41.823Z"}`. ON2 tươngứngcommandIdcột2/recordedAt13:52:47.215Z. CảhaiACKvàOFF làQoS1/retainfalse/dupfalse theo observer, đúngtopicACK/state. Rawlog `build/physical-pump-passive-2026-10-20T13-51-32-832Z.jsonl`. Backendlog cóhaiPOSTcommands202 tươngứnghai bản ghi vàhaiOFFcommitted.

Không subscribe commandtopic trongobserver do backendaccount được thiết kếwritecommand, nên **payloadcommandwire trực tiếp chưa capture**. Schema dựngpayload/issuedAt/expiresAt từ `backend/src/gateways/mqtt-device.gateway.ts:30`, publishQoS1/retainfalse từ `backend/src/mqtt/mqtt-client.service.ts:57`. Không gọipayloadtái dựng làpacketđãcapture. TimestampACK/OFF không phải phép đo độ rộngxungGPIO chính xác.

### Khóa và xác minh sau phiên

Ngay khi nhận báo cáo người dùng, agent yêu cầu rútadapter và gửi`rollback` vào helper52149 lúc13:53:15.633Z. Helper dừngđúngbackend17268, khởiđộngbackendkhóaPID13016; envfilehashunchanged, không sửa.env. Startup13:53:17.306Z: commandsEnabledfalse/automationEnabledfalse/testModetrue/effectiveMaxRunSeconds1, listener5000PID13016 khớp, DB/MQTTconnected/subscriptionsrestored.

OFFmới thật13:53:18.399Z saustartup, API13:53:27 gatewayDISABLED/controlEnabledfalse/ONLINE/OFF cùngtimestamp. SELECT13:53:44: PENDING0, OFFmới13:53:33.652Z, ONLINE, đủ4MQTTreadings13:53:34.862Z (TEMP27.8/HUM67.5/LIGHT1.67/SOIL5.37). Không épDB hoặc chạyseed/migration/simulator/flash. HaiON đãđượcthực thi, không còn lượtON trongphạmvi mộtlệnhđãduyệt; không mởlại hoặc thửbổsung tự động.

| Hạng mục | Kết quả |
| --- | --- |
| Bơm chạy và tự dừng khoảng1giây |PASS theo quan sát người dùng |
| maxRunSeconds1, ACKAPPLIED, DBSUCCESS, OFFMAX_RUNTIME |PASS cho cảhai bản ghi |
| ĐúngduynhấtmộtON |FAIL — thực tếhaiON, nguyên nhânchưađiềutra |
| Agent không phátON/OFF |Đãtuânthủ |
| Backendkhóa/automationfalse/cap1, PENDING0, ONLINE/OFFmới |PASS |
| Adapter đãrút sauphiên |PASS theo xác nhận sau thử của người dùng: “xác nhận đã rút điện” |
| Nướcchảy; browserE2E trực tiếp; xungGPIOđo chính xác1giây |NOT VERIFIED |
| WindowsTime45–60phút |LONG_TERM_STABILITY_NOT_VERIFIED, chỉSHORT_PREFLIGHT_PASS |

**Kết luận:** luồngđiềukhiển và tựdừng có bằng chứng thànhcông, nhưng khôngđánh dấu toànphiênPASS vì vượt giới hạn mộtON và chưa xácnhận rútadapter/nướcchảy. Giữ backendkhóa, không thửlại, chờxácnhậnngắtnguồn. Không suy rằnghaiON doautomation hoặc agentretry; cầnđiềutrađộc lập nếu người dùng yêu cầu.

### Xác nhận kết thúc từ người dùng

Người dùng đã xác nhận sau thử: **“xác nhận đã rút điện”**. Điều kiện ngắt adapter sau phiên đã hoàn tất theo xác nhận trực tiếp của người dùng, không phải quan sát độc lập của agent. Không mở lại backend hoặc gửi thêm lệnh. Kết luận cập nhật: bơm chạy/tự dừng và ngắt nguồn sau thử đã xác nhận; nước chảy vẫn NOT VERIFIED. Hai command ON riêng biệt vẫn là sai lệch so với giới hạn một ON, chưa xác định nguyên nhân; không nâng toàn phiên thành PASS. Trạng thái khóa backend đã kiểm chứng ở phần trên giữ nguyên, không có thay đổi cấu hình trong lần cập nhật xác nhận này.
