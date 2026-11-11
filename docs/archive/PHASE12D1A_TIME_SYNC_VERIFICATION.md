# Phase12D.1A — Báo cáo xác minh đồng bộ thời gian sau xử lý

**Cập nhật 16/10/2026, 20:50:35 UTC+7: Windows Time đã synchronized với nguồn NTP; sai lệch đo lặp khoảng12–19ms. Không chạy lại ON/OFF. Đồng bộ Windows PASS theo các phép kiểm tra hiện tại; Command/ACK dry-run mới vẫn NOT VERIFIED.**

## 1. Tóm tắt nguyên nhân và cách xử lý

Trước xử lý, Windows dùng Local CMOS Clock, Leap3/Stratum0 và stripchart hai server đo Windows chạy nhanh khoảng3.44–3.46 giây. Đây là nguyên nhân phù hợp và có số đo cho command `741478cf-1204-47dd-8709-7a6db3cf7be3` bị ESP32 REJECTED/FUTURE_COMMAND, ACK có recordedAt thấp hơn issuedAt3482ms nên backend loại và ghi FAILED/ACK_TIMEOUT. Không phải chênh múi giờ UTC+7.

Agent thử resync với quyền Medium trước đó bị Access denied. **Người dùng** sau đó mở PowerShell Administrator và chạy:
```powershell
w32tm /resync
# Khi status vẫn chưa synchronized, người dùng tiếp tục:
w32tm /resync /rediscover
```

Ảnh người dùng cung cấp cho thấy rediscover thành công, Leap0/Stratum5/Last Sync Error0, Phase Offset5.2004ms. Agent kiểm chứng lại trực tiếp bằng query/stripchart và SELECT vào20:50, không chỉ suy từ ảnh. Không tự đổi NTP peer, registry, đặt giờ thủ công, nới guard hoặc restart broker/PostgreSQL. Không ghi nhận người dùng đổi peer trong các lệnh/ảnh đã cung cấp.

## 2. Bằng chứng Windows trước và sau

| Thuộc tính | Trước xử lý | Sau xử lý — kiểm tra trực tiếp20:50 |
| --- | --- | --- |
| Nguồn | Local CMOS Clock | time.windows.com,0x9 |
| Leap Indicator | 3 (not synchronized) | **0 (no warning)** |
| Stratum | 0 | **5**, secondary reference synchronized |
| Last Successful Sync | unspecified | **16/10/2026 20:48:02 UTC+7** |
| Last Sync Error | Không synchronized / resync bị quyền chặn | **0 — completed successfully** |
| Phase Offset | Khoảng−3.4669s trong status trước | **+0.0052004s** |
| State Machine | 0 (Unset) | **1 (Hold)** |
| ReferenceId | 0 | 0x349472BC, source IP52.148.114.188 |
| Root Delay | 0.08344s ở lần đầu đã nhận mẫu | 0.0686509s |
| Root Dispersion | 11.2370553s | **7.7752107s** |
| Múi giờ Windows | SE Asia Standard Time / UTC+7 | Không đổi |

Ảnh người dùng sau rediscover còn cho thấy peer Active, Mode3 Client, peer Stratum4; local Stratum5 là phù hợp một tầng sau peer. PeerPoll17 được tool đánh dấu out of valid range trong ảnh: ghi nhận là điểm cần theo dõi cấu hình/polling dài hạn, không tự chỉnh registry hoặc giả định mọi cấu hình đã lý tưởng.

State Hold không tự là lỗi khi Leap0, Last Sync Error0 và có nguồn/sync mới; tuy nhiên chỉ quan sát vài phút không chứng minh ổn định dài hạn. Root Dispersion vẫn cao: **không coi Phase Offset nhỏ hoặc stripchart một server là bảo đảm sai số UTC tuyệt đối luôn dưới500ms**. Kết luận PASS dưới đây là trạng thái service và offset thực đo tại thời điểm kiểm tra, không phải chứng nhận độ chính xác thời gian.

## 3. Đo offset lặp lại

Trước sửa (agent đo trực tiếp):
- time.windows.com: −3.4629971, −3.4451116, −3.4290515, −3.4242900, −3.4496507s.
- time.google.com: −3.4670402, −3.4513670, −3.4534924, −3.4753956, −3.4499711s.

Sau `/resync` đầu tiên, offset đã nhỏ nhưng status Leap3/Stratum0/Last Sync Error1; không đánh dấu synchronized hoàn tất ở thời điểm đó.

Sau `/resync /rediscover`, agent chạy lại:
```powershell
w32tm /query /status /verbose
w32tm /stripchart /computer:time.windows.com /samples:5 /dataonly
```

| Giờ Việt Nam16/10/2026 | Offset |
| --- | --- |
| 20:50:25 | +0.0148828s =14.8828ms |
| 20:50:28 | +0.0119472s =11.9472ms |
| 20:50:30 | +0.0179201s =17.9201ms |
| 20:50:32 | +0.0141209s =14.1209ms |
| 20:50:34 | +0.0188564s =18.8564ms |

Trung bình **15.5455ms**, min11.9472ms, max18.8564ms; cả5 mẫu <500ms và cách xa giới hạn2s. UDP123 stripchart có phản hồi; không suy rằng mọi chính sách firewall/service transport đã được kiểm chứng toàn diện.

## 4. ESP32, telemetry và trạng thái an toàn hiện tại

SELECT READ ONLY lúc **2026-10-16T13:50:35.021Z =20:50:35.021 UTC+7**:

| Mục | Kết quả |
| --- | --- |
| ESP32-GF-A-01 | ONLINE |
| lastSeenAt | 2026-10-16T13:50:28.562Z |
| PUMP_01 trong DB | OFF |
| lastStateChangedAt | 2026-10-16T13:45:28.099Z |
| MQTT_COMMANDS_ENABLED | **false** theo cấu hình/default hiện hữu |
| MQTT_AUTOMATION_COMMANDS_ENABLED | **false** |
| Command PENDING | **0** |

Bốn readings đều MQTT, cùng recordedAt **13:50:26.996Z** (20:50:26.996), receivedAt **13:50:27.334Z**:

| Sensor | Giá trị |
| --- | --- |
| TEMP_01 | 24.9 °C |
| HUM_01 | 52.7 % |
| SOIL_01 | 29.4 % |
| LIGHT_01 | 2.5 lux |

Chênh receivedAt−recordedAt **338ms**, giảm rõ so với khoảng3.7s trước chỉnh giờ. Đây gồm clock offset+độ trễ sensor/publish/mạng/queue, **không phải phép đo riêng offset ESP32**. Không kết luận sai số UTC phần cứng luôn <500ms từ con số này.

Firmware source vẫn configTime UTC0/0, pool.ntp.org/time.google.com; callback SYNCED, epoch và lease2h; gettimeofday→milliseconds→ISO Z giữ mili giây. Serial gần nhất người dùng cung cấp có NTP SYNCED/PUMP_COMMANDS DISABLED/RELAY OFF; không đọc được Serial trực tiếp ở lượt20:50, không flash hoặc thay config.local.h. Không chứng minh độc lập GPIO/điện adapter, không can thiệp nguồn. OFF trong DB được quan sát, không UPDATE/publish OFF giả.

## 5. Command đã thất bại và giới hạn kiểm chứng

Giữ nguyên hồ sơ thật:
- UUID: `741478cf-1204-47dd-8709-7a6db3cf7be3`.
- issuedAt/requestedAt13:10:26.264Z; expiresAt13:10:36.264Z; maxRunSeconds1.
- Raw ACK REJECTED/FUTURE_COMMAND, recordedAt13:10:22.782Z, subscriber receipt13:10:26.466Z.
- DB FAILED/ACK_TIMEOUT, completedAt13:10:36.265Z, acknowledgedAt=null.

Đồng bộ giờ hiện tại **không biến command cũ thành PASS**. Không sửa history, không gửi lại UUID cũ, không POST ON/OFF hoặc tạo DeviceCommand mới trong tác vụ đồng bộ/báo cáo.

IssuedAt do backend new Date của Windows tạo, không do frontend gửi; gateway dùng toISOString UTC, không cộng7 hai lần. Guard firmware+backend giữ2s, không bị nới.

## 6. Kiểm thử đã thực hiện

Các suite dưới đây đã chạy trong đợt Phase12D.1A trước cập nhật ảnh; không chạy lại và không gắn nhãn test phần cứng thành công ở lượt cập nhật báo cáo:

| Suite | Kết quả |
| --- | --- |
| Backend pump / presence offline | 33/33 +27/27 PASS |
| Firmware native controller / diagnostics / schema | 36/36 +18/18 +5/5 PASS |
| Supplemental firmware clock guard | 7/7 PASS |
| Supplemental backend ACK timestamp | 5/5 PASS |

Bao phủ tái hiện3482ms skew, FUTURE_COMMAND, expiry, duplicate không replay sau clock correction, biên2000/2001ms, ACK lệch bị loại/aligned REJECTED được nhận và UTC milliseconds. Toàn bộ fake GPIO/network/DB, không tạo command thật. Các artifacts ở build đã gitignored.

Lượt cập nhật báo cáo này chỉ query/stripchart và SELECT, không resync thêm, không thay source/config/flags hoặc dịch vụ. Người dùng là người thực hiện sửa giờ với Administrator.

## 7. Đánh giá và điều kiện dry-run mới

| Tiêu chí | Kết quả hiện tại |
| --- | --- |
| Xác định nguyên nhân lệch giờ có số đo | PASS |
| Windows service báo synchronized sau người dùng resync | PASS tại thời điểm query |
| Offset Windows–NTP lặp lại dưới500ms | PASS phép đo5 mẫu (12–19ms) |
| ESP32 telemetry vẫn hoạt động, timestamp hợp lý hơn | PASS quan sát |
| Offset UTC tuyệt đối ESP32 <500ms | NOT VERIFIED độc lập |
| Không nhảy/lùi UTC bất thường ở mọi reconnect | NOT VERIFIED, thiếu log liên tục |
| Guard2s/milliseconds/regression phần mềm | PASS |
| Commands/automation khóa, pending0 | PASS |
| Command/ACK thật sau sửa giờ | **NOT VERIFIED — chưa thử lại** |
| Website điều khiển/bơm vật lý | NOT VERIFIED / không thử |

**Kết luận Phase12D.1A: lỗi lệch giờ lớn phía Windows đã được khắc phục theo trạng thái service và các phép đo hiện tại. Cần tiếp tục theo dõi độ ổn định; chưa tuyên bố dry-run Command/ACK PASS.**

Trước một phiên mới cần phê duyệt riêng; kiểm tra offset gần thời điểm thử, adapter vẫn rút điện, firmware thực DISABLED, automation=false/pending0, và OFF mới sau lần backend reload mở cờ. Chỉ khi đủ điều kiện mới thử một ON theo phiên mới; không tự mở flag hoặc gửi lệnh từ báo cáo này. Root dispersion/polling dài hạn và đồng bộ OFF sau backend restart là các điểm cần đánh giá tiếp, không chỉnh safety contract để bỏ qua.

<details>
<summary>Nhật ký lịch sử trước khi người dùng resync thành công — trạng thái FAIL bên dưới không còn là kết luận hiện tại</summary>

# Phase12D.1A — Windows / ESP32 / MQTT timestamp

Ngày kiểm tra 16/10/2026, khoảng 20:33–20:38 UTC+7. **Đã xác định lệch giờ bằng phép đo NTP trực tiếp, nhưng chưa sửa được đồng hồ do thiếu quyền Windows. Không gửi ON/OFF, không tạo DeviceCommand, không thay tolerance.**

## 1. Kết luận chính

Windows chạy backend chưa đồng bộ W32Time, dùng **Local CMOS Clock**. Stripchart tới **hai** NTP server trả lời ổn định với offset khoảng **-3.44s / -3.46s**: nguồn NTP ở phía sau đồng hồ Windows, tức Windows đang chạy nhanh khoảng3.4–3.5s so với các nguồn đó tại phép đo. Lệch tương đối đã đủ giải thích FUTURE_COMMAND ở ESP32 và ACK bị backend loại. Đây không phải lỗi múi giờ UTC+7 và không chỉ là suy đoán từ chuỗi Local CMOS Clock.

`w32tm /resync` đã được thử đúng một lần với quyền hiện tại theo phạm vi cho phép, trả **Access is denied (0x80070005)**. Không UAC/elevate ngầm, không sửa registry/peer/giờ thủ công. Trạng thái sau thử vẫn chưa synchronized. **Mục tiêu đồng bộ <500ms chưa đạt, chưa đủ điều kiện cho dry-run mới.**

## 2. Windows trước/sau và phép đo thật

| Kiểm tra | Kết quả |
| --- | --- |
| Get-Date | 2026-10-16T20:33:22.0034522+07:00 |
| UtcNow | 2026-10-16T13:33:22.0054550Z |
| Timezone | SE Asia Standard Time, +07:00 |
| W32Time | Running / Automatic |
| Integrity agent | Medium, không Administrator |
| Status trước và sau resync | Leap3 not synchronized, Stratum0, Last Successful Sync unspecified, Source Local CMOS Clock |
| query source / configuration | Access denied; không đọc được toàn bộ cấu hình hoặc chứng minh máy do tổ chức quản lý hay không |
| query peers | 1 peer time.windows.com,0x9; State Pending, Mode0 reserved, Stratum0 |
| resync | Access denied 0x80070005, không hoàn thành |

Offset stripchart, đơn vị giây; không sửa peer bằng các lệnh đo:

| Server | Mẫu1 | Mẫu2 | Mẫu3 | Mẫu4 | Mẫu5 | Trung bình xấp xỉ |
| --- | --- | --- | --- | --- | --- | --- |
| time.windows.com (52.148.114.188:123), 20:33:22–31 | -3.4629971 | -3.4451116 | -3.4290515 | -3.4242900 | -3.4496507 | -3.442220 |
| time.google.com ([2001:4860:4806:4::]:123), 20:34:59–20:35:07 | -3.4670402 | -3.4513670 | -3.4534924 | -3.4753956 | -3.4499711 | -3.459453 |

UDP123/NTP có phản hồi cho **stripchart** trên các đường IPv4/IPv6 thử nghiệm. Không coi điều đó là bằng chứng mọi đường UDP123 của service W32Time đều không bị firewall/chính sách chặn: stripchart và service có cách dùng socket khác nhau. Không thấy timeout stripchart trong lần đo này; lỗi resync là quyền Windows, không phải “không có server NTP” đã được chứng minh.

Mười mẫu lặp lại cho thấy lệch lớn ổn định, không phải một mẫu lỗi mạng. Chưa làm phép đo NTP có RTT/error bound đầy đủ hoặc kiểm tra độ tin cậy tuyệt đối của từng server. Không suy mục tiêu <500ms từ source name/Stratum một mình.

## 3. ESP32 time pipeline

Đọc source `firmware/SmartAgricultureESP32/SmartAgricultureESP32.ino` và `PumpProtocol.h`, không sửa/flash:

- `configTime(0,0,"pool.ntp.org","time.google.com")`: UTC offset0, DST0; không cộng7 ở firmware.
- `sntp_set_time_sync_notification_cb(timeSynced)`; callback mới đặt clockSynced=true, lastClockSync=millis và tăng sync count. `reliableClock` yêu cầu epoch>=2024 và callback lease2h chưa hết. Wi-Fi/MQTT CONNECTED không tự đánh dấu NTP synced.
- `utcNow` lấy gettimeofday: sec*1000 + usec/1000. Chỉ bỏ phần nhỏ hơn1ms, không cắt cả mili giây. `gmtime_r` + format `%03dZ` tạo timestamp ISO UTC có milliseconds.
- ACK recordedAt từ Decision tại thời điểm xử lý command, không dùng thời điểm publish làm giả giờ. Duplicate command dùng timestamp ACK gốc từ cache, không cập nhật timestamp để biến ACK cũ thành mới.
- Guard `cmd.issuedAt > ctx.utc+2000` → FUTURE_COMMAND; expiry theo UTC. Runtime bơm/failsafe dùng monotonic millis độc lập. Không tăng2s hoặc bỏ guard.
- SNTP có thể điều chỉnh wall clock ở lần sync; code không chứng minh không có step UTC sau reconnect. Không có Serial event log liên tục đủ để xác minh hiện tượng nhảy/lùi giờ thực. Không yêu cầu flash hoặc reset chỉ để đo.

Log người dùng cung cấp gần nhất trước task: `2026-10-16T13:07:11.996Z`, NTP SYNCED, PUMP_COMMANDS DISABLED, RELAY OFF. Đây là bằng chứng lịch sử; không gọi nó là Serial mới của task20:33. Quan sát passive telemetry mới không publish command:

| recordedAt ESP32 UTC | ReceivedAt máy tính UTC | Chênh lệch nhìn thấy |
| --- | --- | --- |
| 13:36:56.996Z | 13:37:00.853Z | 3857ms |
| 13:37:11.996Z | 13:37:15.735Z | 3739ms |
| 13:37:26.996Z | 13:37:30.755Z | 3759ms |

Mỗi payload đủ4 readings, không retained, recordedAt tăng đúng15s. Đây là tổng clock offset + thời gian sensor/publish/mạng/queue, **không phải phép đo offset ESP32 tuyệt đối**. Chưa thể chứng minh Windows–ESP32 <500ms. NTP SYNCED trong Serial không tự đảm bảo backend Windows đồng bộ.

## 4. Command thất bại và PostgreSQL

SELECT transaction READ ONLY, correlationId `741478cf-1204-47dd-8709-7a6db3cf7be3`:

| Trường | Giá trị |
| --- | --- |
| DeviceCommand ID | cmvazjmcd003fumck92m98f4v |
| command / transport | TURN_ON / MQTT |
| requestedAt = issuedAt | 2026-10-16T13:10:26.264Z |
| sentAt | 2026-10-16T13:10:26.287Z |
| expiresAt | 2026-10-16T13:10:36.264Z |
| maxRunSeconds | 1 |
| completedAt | 2026-10-16T13:10:36.265Z |
| status / failureReason | FAILED / ACK_TIMEOUT |
| acknowledgedAt | null |

Evidence MQTT thật từ `build/phase12d1-evidence-2026-10-16T13-09-53-286Z.json`: ACK result REJECTED/reason FUTURE_COMMAND, recordedAt13:10:22.782Z, subscriber nhận13:10:26.466Z. IssuedAt trừ ACK recordedAt = **3482ms**, receipt trừ ACK recordedAt =3684ms; từ issuedAt tới receipt ACK khoảng202ms. Không thể quy3.48s thành trễ mạng đơn thuần khi timestamp firmware đi trước điểm issue theo chiều ngược lại.

`backend/src/services/device-command.service.ts` tạo issuedAt bằng **new Date() của Node chạy trên Windows**, expiresAt=issuedAt+10s. Frontend chỉ gửi command/maxRunSeconds; validator strict không cho frontend đặt issuedAt. Gateway dùng toISOString UTC. Không cộng7 hai lần. PostgreSQL lưu requestedAt/expiry/receipt theo Date; các cột timestamp without time zone theo quy ước UTC của Prisma, không phải thêm3.48s do timezone.

`backend/src/gateways/mqtt-device.gateway.ts::handleAck` chặn recordedAt < issuedAt−2000. Mốc chấp nhận thấp nhất13:10:24.264Z; ACK13:10:22.782Z không đạt. Vì vậy raw ACK trên broker không được settle/ghi acknowledgedAt, sau timer ACK_TIMEOUT là đúng fail-closed. Không sửa dữ liệu command cũ để tạo kết quả REJECTED giả.

## 5. Thao tác đã làm và kiểm thử

Đã chạy Get-Date/UtcNow/Get-TimeZone/Get-Service, w32tm query status/source/configuration/peers, stripchart hai server, một resync không thành công, passive MQTT telemetry và SELECT. Không thay đổi registry/service settings/peer/clock/tolerance/broker/PostgreSQL/firmware/backend/frontend/feature flags. Chỉ tạo báo cáo và các test artifact gitignored trong build.

| Test | Kết quả |
| --- | --- |
| npm run test:pump | 33/33 PASS, offline/mocks |
| npm run test:presence | 27/27 PASS, offline/mocks |
| Firmware native controller / diagnostics / contracts | 36/36 +18/18 +5/5 PASS, không GPIO/network thật |
| Supplemental build/phase12d1a-clock-test.cpp | 7/7 PASS: reproduce3482ms FUTURE, ±2s boundary, exact expiry, duplicate giữ rejection, UTC parse/ACK milliseconds |
| Supplemental build/phase12d1a-ack-test.cjs | 5/5 PASS: skew ACK bị loại, aligned REJECTED settle, −2000/−2001ms boundary, command UTC milliseconds |

Test supplemental gọi source thật với clock/GPIO/MQTT giả; không tạo DeviceCommand, không gửi ON/OFF. Lần compile supplemental đầu sai namespace harness, đã đổi thành namespace agriculture của header, compile C++11 `-Wall -Wextra -Werror` và7 tests cuối đạt; không sửa firmware để làm test PASS. Các test chứng minh guard hoạt động và tái hiện lỗi, **không chứng minh đồng hồ máy thật đã sửa**.

SELECT cuối được kiểm tra lúc13:35:08.351Z: commands=false, automation=false, pending0, newCommandsDuringTask0, ESP32 ONLINE. DB PUMP_01 hiện OFF với timestamp mới13:34:03.350Z (khác snapshot UNKNOWN của phiên trước). Agent không trực tiếp UPDATE hoặc publish OFF; không dùng trạng thái đổi tự nhiên này làm bằng chứng đã sửa clock. Không đo GPIO/nguồn adapter độc lập; giữ nguyên firmware theo xác nhận người dùng và không can thiệp nguồn.

## 6. Bước Administrator cần phê duyệt/thực hiện

Không có cơ chế nâng quyền được phép trong phiên agent. Thay đổi đề xuất **chỉ yêu cầu resync bằng Windows Time với peer hiện có**, không đổi peer/registry hoặc đặt giờ đoán. Cần người dùng thực hiện trong PowerShell **Run as administrator** (hoặc cấp một phiên phù hợp sau khi duyệt):

```powershell
w32tm /query /configuration
w32tm /query /source
w32tm /resync
w32tm /query /status
w32tm /query /source
w32tm /stripchart /computer:time.windows.com /samples:5 /dataonly
```

W32Time đang Running/Automatic nên không cần tự đổi StartType hoặc restart service. Nếu resync báo no time data/peer hoặc policy error, dừng và gửi kết quả query; không tự dùng `/config /manualpeerlist`, `/unregister`, registry edit hoặc đổi peer tổ chức. Stripchart thành công không bảo đảm resync service chắc chắn thành công.

Sau resync, cần query status có Last Successful Sync mới, nguồn không còn CMOS chưa đồng bộ và đo lặp offset nhỏ; tiếp tục dùng passive telemetry/log Serial mới để đối chiếu ESP32. Chưa có kết quả “sau sửa” vì resync hiện bị từ chối; không ghi PASS giả.

## 7. PASS / FAIL / NOT VERIFIED và điều kiện phiên mới

| Tiêu chí | Trạng thái |
| --- | --- |
| Nguyên nhân tương đối Windows/NTP và command xác định bằng số đo | PASS |
| UDP123 stripchart có phản hồi ổn định | PASS trên hai đường đã thử |
| Windows Time nguồn synchronized trước/sau | FAIL, vẫn CMOS/Leap3 |
| Thực hiện resync | FAIL, Access denied |
| Offset mục tiêu <500ms | FAIL với Windows/NTP đo khoảng3.45s; Windows–ESP32 chính xác NOT VERIFIED |
| Source UTC/millisecond/2s guard | PASS source+offline tests |
| Không tạo command/không thay flags/tolerance | PASS |
| ESP32 live NTP callback/không nhảy giờ khi reconnect | NOT VERIFIED, cần Serial event log mới nếu đánh giá sâu |
| Đủ điều kiện phê duyệt dry-run mới | CHƯA ĐẠT |

Trước phiên mới: Windows sync thành công và offset ổn định, ESP32 clock đáng tin cậy, so sánh hai phía nằm trong2s (mục tiêu<500ms nếu đo được tin cậy), nguồn bơm tiếp tục ngắt, firmware DISABLED, automation false, pending0, fresh OFF sau backend reload và **phê duyệt thử mới riêng**. Không tái phát UUID cũ, không tự retry ON, không bỏ validation để vượt safety gate.

</details>

