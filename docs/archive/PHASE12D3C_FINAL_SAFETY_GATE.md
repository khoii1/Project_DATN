# Phase 12D.3C — Final safety gate trước phê duyệt B

Ngày kiểm tra: 18/10/2026, khoảng15:34–15:41 Việt Nam (UTC+7).

Cập nhật sau người dùng resync: 15:46–15:49 cùng ngày; xem mục11.

## 1. Kết luận

**READY_FOR_APPROVAL_B tại lần kiểm tra cập nhật15:49, chỉ để người dùng xem xét phê duyệt B riêng. Chưa được cấp nguồn hoặc gửi command.** Kết luận ban đầu15:40 là NOT_READY do lỗi Windows Time, được giữ lại trong lịch sử bằng chứng bên dưới; lỗi này đã hết ở các lần đo sau resync15:45:58 (mục11).

Đã giải quyết thiếu bằng chứng runtime cap1s và kiểm thử được cửa sổ UNKNOWN fail-closed. Firmware vẫn ENABLED/OFF, telemetry/presence/PERIODIC OFF hoạt động, backend commands và automation vẫn false, không có command mới/PENDING.

Điểm chặn ban đầu: Windows Time vẫn Leap0/Stratum5/peerActive, offset nhỏ, nhưng **Last Sync Error=2: “The computer did not resync because only stale time data was available.”** xuất hiện ở cả hai lần đọc cách nhau gần3phút, last successful sync vẫn14:35:25. Khi đó time gate chưa PASS. Sau người dùng resync, LastSyncError0 và offset ổn định ở các batch theo dõi ngắn hạn; không suy ra bảo đảm ổn định dài hạn hoặc tự cho phép chạy B.

Không cấp điện adapter, không gửi ON/OFF/API command, không click nút bơm, không bật feature flag, không nạp/sửa firmware, không migration hoặc sửa DB thủ công. Adapter vẫn rút điện theo xác nhận người dùng trong yêu cầu và xác nhận ở12D.3B; không có phép đo điện độc lập từ agent.

## 2. Bằng chứng cap từ đúng backend phục vụ API

Trước thay đổi, cổng5000 thuộc PID4200; API gatewayModeDISABLED/controlEnabledfalse. SELECT08:34:55.934Z xác nhận PENDING0, cấu hình commands=false/automation=false, ESP32 ONLINE/OFF.

Đã bổ sung **log khởi động chỉ chứa thông tin an toàn** trong `backend/src/server.ts`, tại callback app.listen. Log dùng chính `env` và hàm `pumpRuntimeLimit` mà command service sử dụng, không đọc/in toàn bộ env, URL có credential hoặc secrets.

Watcher hiện hữu reload đúng một lần do sửa server.ts, trong khi hai cờ đều false:

```text
15:35:18 [tsx] change in ./src\server.ts Restarting...
Smart Agriculture API running on port 5000
MQTT pump safety runtime: {"pid":17892,"startedAt":"2026-10-18T08:35:21.780Z","testMode":true,"effectiveMaxRunSeconds":1,"commandsEnabled":false,"automationEnabled":false}
MQTT connected: host=172.20.10.2 port=1883
MQTT subscriptions restored
MQTT OFF-state observation subscribed (commands disabled)
```

`Get-NetTCPConnection -State Listen -LocalPort 5000` sau reload và08:37 xác nhận **OwningProcess17892**, khớp PID trong log. Đây là bằng chứng của process đang phục vụ API, không phải chỉ một diagnostic/env riêng.

Chuỗi thực thi đã rà soát:

- `backend/src/services/pump-command-policy.ts`: `Math.min(configured, testMode ? 1 : 5)`.
- `backend/src/services/device-command.service.ts`: tính runtimeLimit bằng cùng hàm, mặc định ON theo runtimeLimit; từ chối maxRunSeconds không nguyên, <1 hoặc >limit **trước create DeviceCommand/publish**. Test mode=true nên2/5/30 bị từ chối, thiếu thời lượng mặc định1.
- `backend/src/routes/actuator.route.ts`: command chỉ qua POST `/api/actuators/:id/commands`, authenticate + params/body validation. Controller chỉ chuyển command và maxRunSeconds từ body; không cho truyền gateway/simulateFailure từ HTTP.
- `backend/src/validators/device-command.schema.ts`: body strict, không cho chèn source/status/gateway; mức schema tổng quát tối đa30 không thay thế kiểm tra service tối đa1 trong test mode.
- `backend/src/validators/actuator.schema.ts`: create/update strict, không cho sửa currentState như đường vòng tạo trạng thái ON/OFF.
- `rg` các call-site trong backend/src: gateway.sendCommand thực tế được gọi qua service trên; automation cũng đi qua execute dùng cùng cap và opt-in riêng. Gateway nội bộ có schema giới hạn30, **không phải endpoint bypass** và không được gọi trực tiếp trong phiên thật.
- `automation-evaluation.service.ts` dùng options.gateway chỉ cho dependency injection nội bộ/test; các controller production không nhận gateway. Cả hai cờ false hiện tại chặn thật; khi B commands được bật riêng thì automation vẫn phải false.
- `mqtt-device.gateway.ts`: timeout settle FAILED/ACK_TIMEOUT, xóa timer/waiting/discard, không tự sinh commandId mới hoặc gọi lại sendCommand. MQTT client gỡ outgoing khi disconnect, không có application-level tự retry ON sau timeout/reconnect. QoS1 có khả năng redelivery ở mức protocol; firmware duplicate guard xử lý riêng, không đồng nghĩa gửi lại một ON mới.

Test offline service với commands enabled giả lập đã thử2/5/30 (và0/1.5), bị từ chối trước mock DB writes; không gửi request ON/OFF vào API thật để chứng minh cap. Phạm vi kết luận không bao gồm publisher MQTT độc lập/mã nguồn bị sửa/credential broker bị lạm dụng; firmware cap5 vẫn là lớp riêng, không tự trở thành cap1.

## 3. Backend restart → UNKNOWN → OFF mới, không EN

Observer subscribe-only MQTT và GET API bắt đầu trước reload; không publish command.

| Thời điểm UTC | Bằng chứng |
| --- | --- |
| 08:35:18.101 | GET fetch failed trong khoảng reload, không đổi thành OFF giả |
| 08:35:21.780 | Backend mới sẵn sàng, hai cờ false |
| 08:35:22.141 | API UNKNOWN; stateAt cũ08:35:12.479 không được dùng xác nhận hiện tại |
| 08:35:27.543 | ESP32 tạo PERIODIC OFF mới, sau startup5.763s |
| 08:35:27.929 | Observer nhận OFF QoS1 retain=false dup=false |
| 08:35:28.387 | API OFF với đúng stateAt08:35:27.543, ONLINE, DISABLED/controlEnabledfalse |
| 08:35:42.686 | PERIODIC OFF tiếp theo; API08:35:43.047 khớp |

Topic `smart-agriculture/v1/devices/ESP32-GF-A-01/actuator/state`; payload schemaVersion1, deviceCodeESP32-GF-A-01, actuatorCodePUMP_01, stateOFF, reasonPERIODIC, recordedAt như bảng. Backend có log `MQTT OFF-state committed` tương ứng. Không dùng MOCK, retainedOFF cũ hoặc cập nhật tay DB. Không reset/reflash ESP32.

## 4. Điều tra UNKNOWN thoáng qua

`mqtt-pump-state.adapter.ts` validate bản tin mới/non-retained/non-DUP/đúng device/actuator/topic, từ chối pre-session, tương lai>2s/cũ>30s; updateMany DB theo timestamp tăng, rồi mới `mqttStateObserver.confirmOff` nếu có row thực sự được cập nhật và generation còn đúng.

`mqtt-state-observer.ts` lưu bằng chứng OFF trong memory theo phiên, timestamp phải khớp DB và còn mới≤30s; reset xóa evidence. `actuator.service.ts` mask thành UNKNOWN khi OFF chưa có evidence khớp, OFFLINE hoặc stale; không tự tạo ON từ bản tin OFF.

Cửa sổ race có thể xảy ra:

1. DB đã commit OFF timestamp mới.
2. GET đọc DB mới trước khi confirmOff kịp cập nhật memory.
3. So khớp timestamp thất bại → UNKNOWN; khi memory cập nhật, lượt GET tiếp theo OFF.

Phase12D.3B đã bắt một GET UNKNOWN ngay thời điểm OFF mới; phiên này bổ sung test `12D3C DB commit / observer-confirm gap fails closed in API and command service` tái hiện có kiểm soát: tạm giữ promise sau mock DB update, đọc API và gọi mock command service. **API UNKNOWN, ON bị409, số command tạo0**; release commit → OFF; reset session → UNKNOWN. Không đưa ON/OFF tới phần cứng hoặc DB thật.

Frontend `utils/irrigation-control.ts` chỉ canOn khi stateOFF, có quyền, resource active, controlEnabled và không PENDING. UNKNOWN/OFFLINE khóa BẬT. Irrigation polling2000ms, bảo vệ generation/race của hook không dùng response cũ ghi đè bộ lọc mới. Dashboard dùng cùng pumpPresentation. Test SSR/mockAxios/polling xác nhận PENDING/REJECTED/ACK_TIMEOUT không giả ON; không coi unit test là browser E2E mới.

**Đánh giá:** đây là fail-closed gây nhấp UNKNOWN, không tìm thấy đường cho phép ON không an toàn từ cửa sổ này. Không tự nó chặn xem xét B nếu sau đó có OFF mới hợp lệ và precheck ngay lúc phát lệnh vẫn đạt. Không sửa adapter/observer/UI để giữ OFF lịch sử hoặc nới guard chỉ nhằm che UNKNOWN. Không khẳng định API luôn ổn định/không bao giờ UNKNOWN; snapshot quá hạn/mất kết nối phải UNKNOWN. Nguyên nhân của lần live trước vẫn là suy luận tương thích timing/source; test chứng minh được cơ chế race chứ không có distributed trace cho chính request cũ.

## 5. Windows Time và so thời gian

Đã đọc status verbose, peers, dịch vụW32Time và System/Time-Service events; không resync/chỉnh peer/registry/giờ thủ công trong phiên này.

| Chỉ số | Lần15:34:08 | Lần15:36:58 |
| --- | --- | --- |
| Leap / Stratum | 0 / 5 | 0 / 5 |
| Source | time.windows.com,0x9 | như trước |
| Last Successful Sync | 18/10/2026 14:35:25 | không đổi |
| Last Sync Error | 2, stale time data | 2, stale time data |
| Time since last good | 3523.3s | 3693.5s |
| Phase Offset status | −0.1864889s | −0.1864889s |

PeerActive, Mode3, Stratum4, HostPoll10 (1024s), PeerPoll17(out of valid range). Dịch vụW32Time Running/Automatic. RootDelay0.1375115s, RootDispersion8.1342249s, StateMachineHold. Không tự sửa polling hoặc bỏ cảnh báo peer.

Stripchart time.windows.com resolve52.148.114.188:

```text
15:34:08 -0.1676867s
15:34:10 -0.1734397s
15:34:12 -0.1740616s
15:34:14 -0.1679444s
15:34:16 -0.1698658s
15:36:58 -0.1632143s
15:37:00 -0.1620862s
15:37:02 -0.1688085s
15:37:04 -0.1647507s
15:37:07 -0.1633346s
```

Hai batch gần3phút cho offset khoảng162–174ms về độ lớn, không có lệch vài giây. Tuy nhiên stripchart thành công không chứng minh lần đồng bộ của service thành công. Không kết luận LI0 đồng nghĩa toàn bộ gate PASS khi LastSyncError còn2.

Event đọc trong2h có DNS warning134 lúc13:52:13, valid-data37 lúc13:52:56, valid-data37 và syncing35 lúc14:35:25. Không thấy warning/error Time-Service mới sau14:35 trong kết quả đọc, **nhưng status vẫn có LastSyncError2**; không có event mới không xóa lỗi trạng thái này. Nguồn gốc chính xác của lần stale rejection hiện tại chưa được event/log chứng minh; không tự quy lỗi ESP32 hoặc giảm FUTURE_COMMAND2s. DNS/network/polling trước đây là bối cảnh, không phải kết luận chắc chắn cho lần lỗi mới.

Đối chiếu giờ: read-only query PostgreSQL `SELECT clock_timestamp()` trả08:38:22.233Z, nằm trong khoảng trước/sau request của process08:38:22.228–22.233Z. PostgreSQL/Windows không có skew nhiều giây trong snapshot này. Serial sample08:37:33.344Z/08:37:48.344Z NTP SYNCED; DB receivedAt lần lượt08:37:33.779Z/08:37:48.697Z, chênh435/353ms. **Chênh này gồm skew cộng độ trễ sample/network/backend, không phải phép đo skew thuần túy.** Offset Windows/NTP là phép đo riêng; không suy 435ms là độ lệch clock ESP32. Chưa gửi command để thử guard.

### Thao tác cần người dùng thực hiện, không chạy bởi agent

Mở PowerShell **Run as Administrator**, giữ adapter bơm rút điện:

```powershell
w32tm /resync /rediscover
w32tm /query /status /verbose
w32tm /query /peers
w32tm /stripchart /computer:time.windows.com /samples:5 /dataonly
```

Gửi lại output; đo status/stripchart thêm ít nhất một batch sau2–3phút thực để xem có tái phát. Cần LastSyncError0, LI0, stratum/peer hợp lệ, last good sync mới, offset ổn định; không coi một resync thành công đủ chứng minh ổn định dài hạn. Nếu vẫn stale/unsynchronized, tiếp tục điều tra service/network với quyền phù hợp, không mở cờ điều khiển và không sửa giới hạn2s.

## 6. Firmware, relay, PostgreSQL và API hiện tại

Không thay ENABLE_PUMP_COMMANDS, firmware hoặc GPIO. Hash giữ nguyên so với bản đã nạp12D.3B:

- config.local.h: `6CF74CC8AC35C3B49B056B0D866E715E2BAA0848314AC00D86FDEAB816CFC0F7`
- SmartAgricultureESP32.ino: `B6C748CEF7C37A9041F569005A6437DC11AB5865B5A41C39DBE86ED9A744CFAC`

Đọc Arduino CLI monitor COM3/115200/DTRoff/RTSoff gặp lặp mảnh `4Z | publish=60 ms`; đã đóng riêng monitor, không reset firmware và không dùng mảnh lặp làm bằng chứng ENABLED. Sau đó đọc COM3 bằng SerialPort.ReadLine, DTR/RTS=false, timeout250ms, bỏ buffer nhận cũ và lọc dòng trùng, exit0. Lấy được sample mới:

```text
SENSOR MONITOR #59
TEMP_01       : 24.20 C
HUM_01        : 49.30 %
LIGHT_01      : 0.00 lux
SOIL_RAW_ADC  : 3156 (min=3137 max=3193)
SOIL_01       : 17.26 %
RECORDED_AT   : 2026-10-18T08:37:33.344Z
TIME_AT_SAMPLE: SYNCED
WiFi          : CONNECTED
MQTT          : CONNECTED
NTP           : SYNCED
PUMP_COMMANDS : ENABLED
RELAY         : OFF (GPIO only, not motor/water feedback)
TELEMETRY #59: SENT (BROKER_PUBACK; backend DB not verified) | recordedAt=2026-10-18T08:37:33.344Z | publish=141 ms
```

Sample60 recordedAt08:37:48.344Z, SOIL18.11%, SENT publish62ms; các dòng không đổi đã được reader lọc trùng, không tạo giả một log đầy đủ riêng cho60. Đã đóng reader, nhả COM3. Nguyên nhân các mảnh lặp của công cụ monitor chưa xác minh, không quy thành lỗi cảm biến hoặc sửa firmware.

Helper local `build/phase12d3c-readonly.cjs` transaction READ ONLY xác nhận **8/8 readings** ở đúng hai timestamp59/60, sourceMQTT, khớp Serial; cả hai TEMP24.2/HUM49.3/LIGHT0, SOIL17.26/18.11. Không suy DB từ PUBACK.

Snapshot DB08:38:22: ESP32 ONLINE, PUMP_01 OFF stateAt08:38:14.129Z, PENDING0 toàn hệ thống, **newCommands0** từ precheck08:34:55.934Z. API08:38:22.908Z OFF với đúng stateAt, gatewayModeDISABLED/controlEnabledfalse; bốn readings latest recordedAt08:38:18.344Z. Health database/MQTT connected. Không có ON bất thường trong DeviceCommand; không tuyên bố có thể loại trừ mọi publisher ngoài hệ thống bằng SELECT này.

Kiểm tra kết thúc08:40:43–44Z: vẫn PID17892 phục vụ5000, ONLINE/OFF stateAt08:40:30.231Z, controlEnabledfalse/gatewayModeDISABLED, PENDING0 và newCommands0; bốn readings mới recordedAt08:40:33.344Z. Đã đóng toàn bộ monitor/reader/observer riêng của phiên, để backend/broker/frontend/ESP32 tiếp tục hoạt động.

## 7. Regression thực thi — không phần cứng

| Kiểm tra | Kết quả |
| --- | --- |
| Backend pump/ACK/cap/recovery +2test mới startup/race | PASS40/40 |
| Presence heartbeat/offline/reconnect | PASS27/27 |
| Backend TypeScript `tsc --noEmit` | PASS exit0 |
| Frontend irrigation policy/SSR/mockAxios/polling2s | PASS8/8 |
| Polling StrictMode/race/visibility/cleanup/history | PASS12/12 |
| Firmware controller host (simulatedGPIO, không COM) | PASS36/36 |
| Diagnostics host/telemetry/networklease | PASS18/18 |
| OFF scheduler host | PASS5checks |
| C++serializer→backend contract | PASS6/6 |
| Live restart→UNKNOWN→PERIODICOFF, MQTT/DB/API | PASS như bằng chứng trên |
| Browser E2E mới trong12D.3C | NOT VERIFIED, không mở/click browser; chỉ source và test offline |
| Máy bơm/motor/nước/độ rộngHIGH thực | NOT VERIFIED, không cấp nguồn/thử |

Lệnh đã chạy:

```powershell
# cwd backend
node --test scripts/mqtt-pump.test.cjs
node --test scripts/device-presence.test.cjs
node.exe node_modules/typescript/bin/tsc --noEmit
# cwd frontend
npm.cmd run test:irrigation
npm.cmd run test:polling
# cwd repository
& .\firmware\tests\run-host-tests.ps1 -Compiler 'C:\Program Files (x86)\Dev-Cpp\MinGW64\bin\g++.exe'
```

Các suite trên dùng mock env/DB/MQTT hoặc hostGPIO, không tạo DeviceCommand thật. Không chạy các suite phaseAPI có ghi DB, simulator, seed hoặc migration. Compile C++ **host test**, không compile/upload firmware ESP32 mới.

## 8. File thay đổi và giới hạn

- `backend/src/server.ts`: thêm startup attestation an toàn (PID/testMode/effective cap/cờ), không thay logic command/API contract/RBAC.
- `backend/scripts/mqtt-pump.test.cjs`: thêm2 regression offline startup và race DB/memory.
- Báo cáo này; helper SELECT-only trong build (git-ignored).

Không sửa adapter/observer/frontend vì race đã chứng minh fail-closed. Không sửa firmware/config/feature flags hoặc Windows Time. Worktree có các thay đổi cũ, không reset/ghi đè.

Các giới hạn còn lại: chưa đo cạnhGPIO/HIGH1s, boot glitch, tiếp điểm relay cơ khí/dính tiếp điểm, motor/nước hoặc worst-case scheduling. Firmware monotonic timeout/safety task5ms là bảo vệ phần mềm, không chứng nhận điện/động cơ dừng đúng≤1.000s. Cap firmware5s không thay cap backend1s; CPUtreo/relay dính không được bảo đảm bởi phần mềm. OFF state không có commandId, chỉ có device/actuator/reason/time; phải đối chiếu một command và thứ tự thời gian, không giả correlation tuyệt đối. ACK APPLIED chỉ xác nhận thao tác GPIO theo firmware, không xác nhận motor/flow.

## 9. Kịch bản B dự kiến — KHÔNG THỰC HIỆN TRONG PHIÊN NÀY

Chỉ xem xét sau khi time gate được khắc phục và người dùng phê duyệt B riêng:

1. Xác nhận tại chỗ lại dây COM/NO, GND, nguồn đúng định mức, khu vực an toàn/khô, bố trí bơm theo yêu cầu thiết bị, người giám sát cầm sẵn chỗ ngắt adapter độc lập; adapter ban đầu rút điện. Không tin checklist cũ thay xác nhận lúc chạy.
2. Đọc Windows/NTP ổn định, Serial mới ENABLED/OFF/SYNCED, ONLINE, OFF mới/non-retained và PENDING0. Kiểm tra runtime đúng PID testMode=true/cap1s; frontend bodyON maxRunSeconds1. Nếu bất kỳ điều kiện không đạt: không gửi lệnh.
3. Trong phiên B đã duyệt mới bật tạm commands=true, automation giữfalse. Nếu backend reload, đọc startup metadata đúngPID, chờ UNKNOWN→OFF mới sau session, không dùng OFF cũ. Dừng nếu không đồng bộ.
4. Chỉ khi người dùng xác nhận tại chỗ và kế hoạch B cho phép mới cấp nguồn adapter; không tự thực hiện từ báo cáo này. Quan sát ngay, nếu bơm/relay hoạt động khi chưa gửi lệnh thì ngắt adapter và hủy thử.
5. Chọn đúngPUMP_01/ESP32-GF-A-01 trên Irrigation; người thao tác được chỉ định bấm xác nhận đúng **một ON** qua website với maxRunSeconds1; không đồng thời để agent/API khác gửi thêm, không directMQTT, không retryON nếu timeout/không nhìn thấy ON.
6. Ghi commandId mới, issuedAt/maxRunSeconds1, ACK APPLIED hợp lệ, backend DeviceCommand, OFF reasonMAX_RUNTIME mới, timestamp/DB/API và quan sát motor/nước tại chỗ. Polling2s có thể bỏ qua phaON1s; không bấm lại để nhìn UI.
7. ACK_TIMEOUT/REJECTED/UNKNOWN/mất kết nối hoặc không thấy dừng theo thời gian mong đợi: người trực **rút adapter ngay**, không chờ polling/ACK/agent. Không coi OFF qua mạng là phương án ngắt nguồn duy nhất.
8. DùPASS/FAIL, ngắt adapter và xác nhận tại chỗ, khôi phục backend commands=false/automation=false, kiểm tra runtimeDISABLED, PENDING0, ESP32 ONLINE và OFF mới (chờ sau reload). Không épDB để tạoPASS, không sửa command thất bại. Nếu không chắc còn HIGH/relay dính, giữ adapter rút và dừng điều tra.

## 10. Checklist kết thúc hiện tại

- PASS: servingPID17892/cap1s/flagsfalse, ON2/5/30 bị chặn trong testmock, không HTTP bypass được tìm thấy trong code đã rà soát, UNKNOWN khóaON, freshOFF recovery, firmwareENABLED/OFF, telemetryONLINE, DB0PENDING/0commandmới.
- Time gate ban đầu FAIL do LastSyncError2; **đã PASS ngắn hạn sau resync và các batch kiểm chứng bổ sung ở mục11**.
- NOT VERIFIED: thử bơm vật lý/relay/motor/nước/thời lượng điện thực, long-term Windows auto-resync stability, browser E2E mới.
- **Dừng trước phê duyệt B. Giữ adapter rút điện, commands/automation=false.** Người dùng đã cung cấp kết quả Windows Time mới và agent kiểm chứng thêm; vẫn cần phê duyệt B riêng và precheck sát thời điểm chạy, không tự động chuyển sang cấp nguồn hoặc chạy bơm khi chỉ đọc báo cáo này.

## 11. Cập nhật sau resync của người dùng — 15:46–15:49

Người dùng tự chạy `w32tm /resync /rediscover` bằng PowerShell Administrator, thành công lúc18/10/2026 **15:45:58**. Agent không chạy lệnh resync hoặc thay cấu hình Windows Time.

Kết quả người dùng cung cấp: LI0, Stratum5, LastSyncError0, source time.windows.com,0x9 (52.148.114.188), peerActive/Mode3. RootDelay0.0406199s, RootDispersion7.9097956s, PhaseOffset−0.1397701s. Stripchart15:46:14–23: −170.5639, −149.2948, −146.9651, −147.8735, −142.7471ms.

Agent kiểm chứng trực tiếp thêm, có chờ thời gian thực giữa các batch:

| Batch | LastSyncError / LI / Stratum | Offset stripchart ms |
| --- | --- | --- |
| 15:46:36–44 | 0 / 0 / 5 | −147.3991, −148.2379, −144.1466, −133.1377, −131.6867 |
| 15:48:46–54 | 0 / 0 / 5 | −144.2747, −142.9637, −140.2120, −138.5082, −149.4997 |

Lần cuối cách last successful sync167.6s lúc đọc status, gần3phút; peer vẫnActive/Mode3/Stratum4, source đúng, last good sync15:45:58, không tái hiện stale error trong khoảng theo dõi. EventSystem/Time-Service từ15:45 có valid-data37 lúc15:45:58.699 và syncing35 lúc15:45:58.712, không có warning/error mới trong kết quả truy vấn.

**Time gate PASS cho cửa sổ kiểm tra ngắn hạn này.** Độ lớn offset khoảng132–171ms qua các batch, dưới guard2s đáng kể; không thay đổi guard. RootDispersion vẫn khoảng7.91s, PeerPoll17(out of valid range)/HostPoll10 còn hiển thị; không che các giá trị này, không tự sửa registry/poll/peer. Chưa chứng minh auto-resync ổn định qua nhiều giờ, sleep/network change hoặc chu kỳ polling dài; phải đo lại sát phiên B và dừng nếu error/unsynchronized tái phát.

Kiểm tra hệ thống sau cùng lúc08:49:05–06Z (15:49): PID17892 vẫn nghe5000, khớp startup attestation cap1s/testMode=true/commandsfalse/automationfalse đã xác minh. API controlEnabledfalse/gatewayModeDISABLED. PostgreSQL/API ONLINE, PUMP_01 OFF với stateAt mới08:49:04.407Z, latestSeen08:49:04.853Z. Bốn readings MQTT recordedAt08:49:03.344Z: TEMP23.8, HUM49.4, SOIL17.66, LIGHT0. PENDING0, newCommands0 từ precheck12D.3C.

Không restart backend, không thay source/config firmware/backend hoặc feature flags trong lần cập nhật này; chỉ đọc và cập nhật báo cáo. Không gửi ON/OFF, không cấp nguồn bơm. Firmware/guard/hash và nghiệm thu Serial ENABLED/OFF đã có trong phiên12D.3C; không nạp lại/reset để lấy log mới.

**Kết luận cập nhật: READY_FOR_APPROVAL_B**, với các giới hạn vật lý ở mục8 và checklist mục9 vẫn giữ nguyên. Đây không phải phê duyệt thực hiện B, không xác nhận máy bơm đã chạy và không thay thế người giám sát/ngắt nguồn độc lập. Chờ người dùng phê duyệt B riêng, sau đó mới thực hiện lại toàn bộ precheck sát thời điểm thao tác.
