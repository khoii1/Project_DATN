# Phase 12D.3D-TIMEFIX — Điều tra Windows Time và Serial

> **20/10/2026 20:15 — Tiêu chí mới do người dùng yêu cầu:** Preflight nhanh ba lượt20:09:47/20:10:35/20:13:19 trải3phút40giây PASS, offset−109.1 đến−149.7ms, LI0/Stratum5/error0/peerActive, không event lỗi hoặc networkchange mới, không resync. **SHORT_PREFLIGHT_PASS / LONG_TERM_STABILITY_NOT_VERIFIED**; không gánTIME_FIX_PASS dài hạn. Kiểm tra sau backendreload20:14:50 vẫnActive/error0. Backend chuẩn bị phiên ngắn cólease tựkhóa20:18:49; xemmục17 báo cáo thửbơm. Không gửiON/OFF hoặc thayWindowsconfig.

> **Cập nhật mới nhất 20/10/2026, 19:38 VN:** Người dùng yêu cầu không chờ dài; monitor đã dừng. NTP tự phục hồi Active và đồng bộ 19:28:16, LastSyncError=0; MQTT/backend, ONLINE, cảm biến và OFF mới đều hoạt động. Chức năng đồng bộ hiện tại đã xác minh, nhưng **TIME_FIX_NOT_VERIFIED** cho độ ổn định 45–60 phút; chưa kết luận B_PREFLIGHT_READY. Xem mục16. Không gửi lệnh hoặc cấp nguồn bơm.

> **Mới nhất — Phase12D.3E dừng20/10 20:03 theo yêu cầu người dùng:** Có13snapshot/12.053phút, tất cảActive/error0/LI0/Stratum5, không đổi mạng hoặc manualresync; accepted automatic sync20:02:24 saubaseline19:50:43. Đồng bộ hiện tại hoạt động, nhưng **TIME_FIX_NOT_VERIFIED** cho tiêu chí45–60phút vì bị dừng sớm. Monitor đã dừng, không mở commands hoặc gửiON/OFF. Xem mục17.

Ngày: 18/10/2026, khoảng16:18–16:24 Việt Nam (UTC+7).

Cập nhật sau PHÊ DUYỆT TIME_FIX: từ16:27 cùng ngày, bị chặn bởi quyềnAdministrator; xem mục10.

## 1. Kết luận

**TIME_FIX_NOT_VERIFIED — đã áp dụng, có sync tự động, nhưng nghiệm thu45–60phút bị gián đoạn do đổi mạng.** Backup/apply0x8 lúc16:31:38 và autosync16:48:58 đã xác minh. Networkchange17:02:41 làm peerPending, monitor dừng ở32.10phút; sau đó dịch vụ tự phục hồiActive/autosync17:06:02 mà không resync thủ công. LastSyncError vẫn0, không có bằng chứng stale2 tái phát trong cửa sổ này (mục12). Chưa đủ45–60phút ổn định/không gián đoạn để chốtPASS; ESP32 hiện chưaONLINE trênhệthống. Không kết luận0x8 gây lỗi mạng hoặc đã sửa dứt điểm mọi trường hợp.

Đã chứng minh máy WORKGROUP, local TypeNTP và SpecialInterval bật với khoảng32768s (~9giờ6phút8giây), lỗi stale2 tái diễn trong khi nguồn NTP vẫn truy cập được bởi stripchart. Điều này hỗ trợ thử phương án Microsoft bỏ SpecialInterval. **Chưa chứng minh được nguyên nhân nội bộ duy nhất gây stale, hoặc rằng máy đã vào SPIKE.** Phải nghiệm thu sau sửa, không dùng vài phút offset thấp để khẳng định hết lỗi.

Quyền hiện tại là UAC medium/non-elevated; `w32tm /query /source`, `/configuration` và `gpresult /Scope Computer /r` bị AccessDenied. Trước khi áp dụng cần người dùng chấp thuận riêng thay đổi Windows Time và chạy/cho phép thao tác Administrator; nếu effective config cho thấy Policy/domain override thì dừng, không ghi đè.

Serial gate trong phiên này **PASS**: thu đủ hai khung mới hoàn chỉnh228/229 bằng một reader, không reset/nạp firmware. TIME FIX vẫn chờ phê duyệt. Lượt ON đã dùng **0/1**; phê duyệt B đã có, không xin lại, nhưng chưa tiếp tục phiên vật lý.

## 2. Trạng thái máy và quyền

| Hạng mục | Bằng chứng |
| --- | --- |
| OS | Microsoft Windows11 Home Single Language, version10.0.26200/build26200 |
| Domain | Win32_ComputerSystem: PartOfDomain=false, Domain=WORKGROUP |
| W32Time | Running, Automatic |
| Token agent | Medium integrity; Administrators group deny-only, không phải phiên nâng quyền |
| Config local registry | HKLM\SYSTEM\CurrentControlSet\Services\W32Time\Parameters: Type=NTP, NtpServer=time.windows.com,0x9 |
| NtpClient | Enabled1, DllName=C:\WINDOWS\system32\w32time.dll |
| Policy registry đã kiểm tra | Không có HKLM/HKCU\SOFTWARE\Policies\Microsoft\W32Time; không có HKLM\SOFTWARE\Microsoft\PolicyManager\current\device\ADMX_W32Time |
| Effective config / RSOP | NOT VERIFIED đầy đủ: CLI configuration/source và gpresult computer AccessDenied; phải kiểm tra lại elevated trước sửa |

Không có dấu hiệu policyW32Time ở các khóa đã đọc, nhưng không suy ra đã kiểm chứng tất cả MDM/GPO bằng quyền hiện tại. Máy không thuộc domain là dữ kiện trực tiếp, không suy từ hostname hoặc phiên bảnHome.

## 3. Hiện trạng và timeline

Lúc16:18:47:

```text
Leap Indicator: 0
Stratum: 5
Source: time.windows.com,0x9
Last Successful Sync Time: 18/10/2026 15:45:58
Last Sync Error: 2 — only stale time data was available
Time since Last Good Sync Time: 1968.66s
State Machine: 1 (Hold)
Phase Offset: -0.1397701s
Root Delay: 0.0406199s
Root Dispersion: 7.9097956s
Peer: Active / Mode3 / Stratum4
HostPoll Interval: 10 (1024s)
PeerPoll Interval: 17 (out of valid range)
Time Remaining: 30799.235s
```

Timeline có bằng chứng:

- 15:45:58.565: System/Kernel-General event1 ghi thay đổi clock delta0ms do svchost; không phải bước nhảy nhiều giây.
- 15:45:58.565: Time-Service/Operational event266 **ReasonCode0**, mô tả explicit admin resync/rediscover. Khớp thao tác người dùng, không tính là chu kỳ tự đồng bộ thành công.
- 15:45:58.699: System event37 và Operational264: nhận valid data từ time.windows.com →52.148.114.188.
- 15:45:58.712: System35 và Operational265: bắt đầu đồng bộ nguồn trên, Stratum5.
- 15:48 và15:54: các precheck trước có LastSyncError0/offset nhỏ, nhưng chỉ là theo dõi ngắn hạn sau manual resync.
- 16:11:29: status trở lại LastSyncError2, last good sync vẫn15:45:58 (~25.5phút). Không tiếp tục thử bơm.
- 16:18:47: stale2 còn tồn tại, last good sync không tiến.

Operational log **đã enabled sẵn**, recordCount1048 khi đọc; không bật/tắt log. Truy vấn từ15:35 đến thời điểm kiểm tra chỉ có5event: 266x2,261x1,264x1,265x1, đều15:45:58. Không thấy event tự đồng bộ mới sau đó trong phạm vi truy vấn. Không được suy “không có event” thành chắc chắn không có NTP packet hoặc không có lần poll: log không nhất thiết ghi mọi packet/update.

System trong cửa sổ15:35+ có power-source-change event105 lúc15:37:06, **trước** resync15:45. Không thấy sleep/resume/network-change/DNSfailure mới trong cửa sổ15:45–16:11 được truy vấn; NetworkProfile/WLAN Operational trả no matching events. Do đó chưa có bằng chứng thay đổi mạng/nguồn gây trực tiếp lần tái lỗi16:11. DNS warning13:52 ở báo cáo trước là lịch sử, không được gán là nguyên nhân của lần này.

Scheduled tasks Time Synchronization có ForceSynchronizeTime/SynchronizeTime, trạng thái3(Ready) lúc đọc; không chạy/chỉnh task, chưa có lịch sử chứng minh chúng gây lỗi. Không liên tục gọi resync để che stale status.

## 4. Cấu hình polling và đánh giá tài liệu Microsoft

| Registry value | Giá trị đọc trực tiếp |
| --- | --- |
| Parameters\Type / NtpServer | NTP / time.windows.com,0x9 |
| NtpClient\SpecialPollInterval | 32768s (~9.1h) |
| Config\MinPollInterval | 10 →2^10=1024s |
| Config\MaxPollInterval | 15 →2^15=32768s |
| Config\HoldPeriod | 5 |
| Config\LargePhaseOffset | 50000000 (đơn vị100ns →5s) |
| Config\SpikeWatchPeriod | 900s |
| Config\ClockHoldoverPeriod | 50000s |
| Config\PollAdjustFactor / UpdateInterval | 5 / 360000 |
| NtpClient\ResolvePeerBackoffMinutes / MaxTimes | 15 / 7 |

Theo [Microsoft: Windows Time Service Tools and Settings](https://learn.microsoft.com/en-us/windows-server/networking/windows-time-service/windows-time-service-tools-and-settings), flag0x1 là SpecialInterval, 0x8 là Client; vì vậy0x9 chứa cả hai. TypeNTP chọn các peer trong NtpServer. Tài liệu cũng phân biệt stripchart dùng UDP source port động với NtpClient service dùng sourceUDP123: stripchart thành công không đủ chứng minh đường mạng của service hoàn toàn tốt.

[Microsoft KB3205089: SpecialPollInterval may be ignored on workgroup computers](https://learn.microsoft.com/en-us/troubleshoot/windows-server/active-directory/w32time-sync-specialpollInterval-ignored) nêu vấn đề interval dài và phương án chuyển0x9→0x8 để dùng polling thích nghi Min/Max thay SpecialInterval. Máy hiện tại WORKGROUP/NTP/local-registry, peer0x9, interval dài nên phù hợp để **thử phương án đó**. Bài KB này gắn nhãn WindowsServer; không riêng nó là chứng nhận lỗi trên buildWindows11 hiện tại.

[Microsoft KB2638243: SpecialPollInterval and SPIKE](https://learn.microsoft.com/en-us/troubleshoot/windows-server/active-directory/specialpollinterval-polling-interval-time-service-not-correct) có phạm vi cả Windows client và mô tả trường hợp manualNTP/SpecialInterval/SPIKE, khuyến nghị bỏ bit0x1. Nếu giữ SpecialInterval, điều kiện bài đưa ra là SpecialPollInterval < (2^MinPollInterval)×(HoldPeriod+1). Với máy này32768 < 1024×6=6144 **không đúng**. Đây là yếu tố cấu hình đáng ngờ, **không chứng minh máy đã gặp SPIKE**: status hiệnHold, offset quan sát~0.1–0.17s thấp hơn LargePhaseOffset5s, không có traceSPIKE tương ứng.

### Điều đã chứng minh và chưa chứng minh

- Chứng minh: SpecialInterval đang bật; khoảng special dài; last successful manual sync15:45 không tiến trong snapshot, stale2 tái phát; cấu hình hiện có không đáp ứng bất đẳng thức workaroundSPIKE củaKB2638243.
- Giả thuyết ưu tiên: lịch lấy sample SpecialInterval dài/logic xử lý sample không phù hợp làm thiếu sample được service chấp nhận; dùng polling thích nghi là can thiệp tối thiểu có căn cứMicrosoft.
- Chưa chứng minh: cơ chế chính xác khiến LastSyncError2 xuất hiện khoảng25phút; không được suy ClockHoldoverPeriod50000s hoặc SPIKE900s thành “timer25phút”. Không có packet/debug trace hoặc effective admin config đầy đủ.
- Giả thuyết còn lại: phản hồiNTP bị từ chối/dispersion, đườngUDP123 của service, DNS đổi backendIP, firewall/NAT theo sourceport, power/network transitions ngoài mức log thu được. Không mặc định có chặnUDP123 hoặc lỗi firmware.

## 5. DNS và đường NTP

Resolve-DnsName thành công: time.windows.com CNAMEtwc.trafficmanager.net →52.148.114.188. SourceIP của lần resync thành công cũng52.148.114.188. PID16556 bind UDP123 trên0.0.0.0 và::; có socket không chứng minh phản hồiUDP123 được chấp nhận.

Stripchart16:20:36–44, cùngIP: −111.7637,−124.0291,−121.1863,−113.1088,−117.8082ms. Đây chỉ là đo offset qua probe, **không đặt lại time gatePASS**, không thay LastSyncError2 bằng diễn giải “đã đồng bộ”. Không quét port/TCP123 hoặc thay firewall; TCP test không thay phép thửNTP/UDP.

## 6. Phương án tối thiểu chờ duyệt — CHƯA THỰC THI

Đề xuất giữ hostname time.windows.com, TypeNTP, Min10/Max15/Hold5/Special32768, dịch vụ/startup/firmware/backend nguyên trạng. Chỉ bỏ bit0x1: **NtpServer0x9→0x8**. Không thêm nhiều peer, không đổi IP tĩnh, không chỉnh LargePhaseOffset/ClockHoldover/guard2s để làmPASS.

Sau khi người dùng chấp thuận riêng, PowerShell Administrator cần kiểm tra trước:

```powershell
w32tm /query /configuration
w32tm /query /source
gpresult /Scope Computer /r
Get-CimInstance Win32_ComputerSystem | Select-Object PartOfDomain,Domain
```

Nếu effective NtpServer/Type doPolicy quản lý hoặc domain không cònWORKGROUP, **dừng**, đánh giá nguồn theo chính sách; không xóa policy/ghi đèmanual peer. Nếu đúngNTP/local như registry đã đọc, backup rồi mới áp dụng. Hiện agent không có token elevated; việc chấp thuận không tự làm token này có quyềnAdministrator, có thể phải để người dùng tự chạy lệnh.

### Backup trước thay đổi — lệnh chuẩn bị, KHÔNG chạy trong phiên này

```powershell
$timeBackup = Join-Path 'C:\DATN\backups' ('w32time-before-0x8-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $timeBackup
reg.exe export 'HKLM\SYSTEM\CurrentControlSet\Services\W32Time' (Join-Path $timeBackup 'W32Time.reg')
if ($LASTEXITCODE -ne 0) { throw 'Backup registry failed; do not change configuration' }
w32tm /query /configuration | Out-File (Join-Path $timeBackup 'configuration-before.txt') -Encoding utf8
w32tm /query /status /verbose | Out-File (Join-Path $timeBackup 'status-before.txt') -Encoding utf8
w32tm /query /peers | Out-File (Join-Path $timeBackup 'peers-before.txt') -Encoding utf8
Get-FileHash (Join-Path $timeBackup 'W32Time.reg') -Algorithm SHA256
```

Ghi lại rõ NtpServergốc=time.windows.com,0x9 và Typegốc=NTP cùng các giá trị mục4; xác minh filebackup tồn tại/không rỗng. Chưa có backupWindows mới được tạo trong phiên này vì chưa thay cấu hình; không dùng backupfirmware để giả là backupW32Time.

### Áp dụng sau duyệt và backup thành công — KHÔNG chạy hiện tại

```powershell
w32tm /config /manualpeerlist:"time.windows.com,0x8" /syncfromflags:manual /update
```

Kiểm tra exitcode và `/query /configuration`, `/source`, `/peers`: đúngpeer0x8, TypeNTP, không cóPolicyoverride, mọi giá trị khác như baseline. Không cần mặc định restart service nếu update đã nạp; nếu cần restart phải ghi rõ thời điểm và giữ backendkhóa/adapterrút. Có thể dùng **một** resync để khởi tạo sau áp dụng nếu cần và ghi đó là manual/setup, không tính vào nghiệm thu tự động; không loopresync để giữPASS.

### Rollback

Nếu cấu hình không nạp hoặc làm tình trạng xấu hơn, giữ khóa điều khiển và hoàn nguyên đúng thay đổi (sau khi được phép):

```powershell
w32tm /config /manualpeerlist:"time.windows.com,0x9" /syncfromflags:manual /update
```

Đối chiếu effective config với backup. Đây là rollbackpeer vềbaseline đã thu, không khuyến nghị regimport toàn servicekey làm bước mặc định hoặc unregister/register/reset. Nếu baseline trước thực hiện đã khác báo cáo, dùng giá trịbackup thực tế và đánh giá lại thay vì ghi đè0x9 mù quáng. Backupreg dùng tham chiếu/phục hồi có kiểm soát nếu cần, không thayDLL/serviceaccount/startup hoặc firewall. Rollback không đồng nghĩa lỗi stale đã hết.

## 7. Nghiệm thu sau khi được phép sửa

Chưa áp dụng cấu hình nên **NOT VERIFIED**, không chạy monitoring45–60phút dưới danh nghĩa đã sửa trong phiên hiện tại.

Sau thay đổi được duyệt:

1. Ghi UTC/VN apply/restart/manual-resync nếu có; effective config0x8 và TypeNTP/local, peerActive/Mode3/stratumhợp lệ, LI0/LastSyncError0. Đánh dấu last good sync làm baseline sau các thao tácsetup thủ công cuối cùng.
2. Giữ commands=false, automation=false, testMode=true, adapterrút trong toàn bộ quan sát. Không gửiON/OFF, không nạp/resetfirmware hoặc thay guard2s.
3. Theo dõi bằng query-only ở mốc0/2/10/20/30/45/60phút thực; mỗi snapshot có statusverbose/source/peers, lastgood/TimeSinceLastGood/error, DNS nếu đổiIP và một batch stripchart. Thu System/Operational/Network/Power events cùng cửa sổ. Không sleepblocking dài không cập nhật người dùng; không chạy resync/scriptchỉnhgiờ ở giữa để lấyPASS.
4. Cần **ít nhất một lần Last Successful Sync tự tiến sau baseline trong khoảng không có manualresync**. Đối chiếuOperational event266 reason và lịchTaskScheduler để phân biệt admin/setup với tựpoll; event265 chỉ đổi nguồn không nhất thiết xuất hiện mỗi lần sync, không coi riêng việc vắngevent là bằng chứngkhôngsync. Nếu có yêu cầuadmin/schedulerngoài kế hoạch thì đánh dấu lạibaseline/không dùng nó chứng minh polling mong muốn.
5. Khoảng theo dõi vượt25phút từng tái lỗi, ưu tiên45–60phút, offsetổn định và khôngerror/unsync mới. Nếu pollingthích nghi dài hơn cửa sổ và chưa thấyautoupdate, ghi **NOT VERIFIED**, không giảmMin/Max chỉ để testPASS; tiếp tục quan sát theo chính sách đã duyệt.
6. Nếu stale/DNS/UDPissue tái phát: dừngtimegate, giữnguồnkhóa, lấy evidencechấpnhận/từchối sample bằng debug/packet capture có phê duyệt phù hợp. Phân biệt probeUDPsourceđộng vàNtpClientUDP123; không disablefirewall/mở cổng rộng hoặc tiếp tục resync liên tục.

Chỉ đủ điều kiện tiếp tục phiên B khi cấu hình hiệu lực đã xác minh, theo dõiđủ dài cóautoupdate hợp lệ, Serial mới hoàn chỉnh, ONLINE/freshOFF/non-retained/DB/API/PENDING0, runtimecap1 và checklistphầncứng sátlúcchạy. B đã duyệt0/1; vẫn phải dừngphốihợp người dùng cấp nguồn/nhấnweb, agent không tự gửiON.

## 8. Serial Monitor — hai khung mới đầy đủ

COM3 CP210x USBUART; không thấy arduino-cli/serial-monitor đang chạy khi kiểm tra. Một reader mới mởCOM3 thành công độc quyền,115200,DTRfalse,RTSfalse, chỉ đọc, không ghi/reset/EN. Đã đóng nhảcổng exit0 sau hai frame.

Helper cục bộ git-ignored `build/phase12d3d-serial-precheck.ps1`:

- Discard buffernhận cũ rồi chỉ bắt đầu tại headerSENSOR MONITOR đầy đủ.
- Không lọc bỏ những dòng trạng thái trùng giữa hai frame; yêu cầu đủ4sensor, time/network/enable/relay và dòngSENT.
- Xác minh recordedAt mới so với giờ mởreader, timeout50s, tối đa2frame; loại3dòng ngoàiheader, không ghép logcũ làm mới.
- Started09:19:41.844Z, ended09:20:03.897Z; ValidFrames2.

```text
========== SENSOR MONITOR #228 ==========
TEMP_01       : 28.30 C
HUM_01        : 59.60 %
LIGHT_01      : 0.00 lux
SOIL_RAW_ADC  : 3091 (min=3033 max=3107)
SOIL_01       : 20.52 %
RECORDED_AT   : 2026-10-18T09:19:48.344Z
TIME_AT_SAMPLE: SYNCED
========================================
WiFi          : CONNECTED
MQTT          : CONNECTED
NTP           : SYNCED
PUMP_COMMANDS : ENABLED
RELAY         : OFF (GPIO only, not motor/water feedback)
TELEMETRY     : PENDING (not sent yet)
TELEMETRY #228: SENT (BROKER_PUBACK; backend DB not verified) | recordedAt=2026-10-18T09:19:48.344Z | publish=68 ms

========== SENSOR MONITOR #229 ==========
TEMP_01       : 28.30 C
HUM_01        : 59.60 %
LIGHT_01      : 0.00 lux
SOIL_RAW_ADC  : 3097 (min=3063 max=3125)
SOIL_01       : 20.22 %
RECORDED_AT   : 2026-10-18T09:20:03.344Z
TIME_AT_SAMPLE: SYNCED
========================================
WiFi          : CONNECTED
MQTT          : CONNECTED
NTP           : SYNCED
PUMP_COMMANDS : ENABLED
RELAY         : OFF (GPIO only, not motor/water feedback)
TELEMETRY     : PENDING (not sent yet)
TELEMETRY #229: SENT (BROKER_PUBACK; backend DB not verified) | recordedAt=2026-10-18T09:20:03.344Z | publish=168 ms
```

Khoảng recordedAt đúng15s;16:19:48/16:20:03 giờViệtNam. GateSerial **PASS cho lần thu này**. Không dùng khung này làm bằng chứng sửa WindowsTime hoặc chứng minh motor/nước.

### Nguyên nhân phần loghỏng: mức xác minh

Đã chứng minh có thể đọc đủframe ở115200 mà không sửa/resetfirmware, nên không có bằng chứng cần nạp lại hoặc đổibaud. Mởreader giữa dòng có thể tạo mảnhđầu khôngđầyđủ; cách đọcchunk/terminalrender và việc dedupe toànphiên của readertrước có thể làm thiếu trường trùng khi ghépframe. Đây là các hạn chế công cụ/framing phù hợp hiện tượng, **chưa chứng minh chúng giải thích mọi mảnhký tựhỏng/lặp trước đây**; không loại trừ tuyệt đối lỗiUART/driver/USBchậpchờn bằng hai frame.

Nếu tái phát: chỉ một reader, đóngreader củaagent trước; người dùng mở Arduino SerialMonitor115200 cung cấp hai khung nguyênvẹn timestampmới, không nhấnEN để vượtgate. Không tự killArduinoIDE, không chia sẻWiFi/MQTTsecrets hoặc coi fragment là PASS.

## 9. Trạng thái an toàn và bàn giao

Diagnostic READ ONLY09:20:34.111Z: commandsEnabledfalse, automationEnabledfalse, pumpTestModetrue; DB deviceONLINE, PUMP_01OFF stateAt09:20:32.399Z; PENDING0; latestcommands vẫn các bản cũ16/10. Bốn readingsMQTT mới09:20:33.344Z: TEMP28.3/HUM59.6/SOIL20.32/LIGHT0. Health DB/MQTTconnected. API09:20:35.131Z khớpOFF vàONLINE, gatewayModeDISABLED/controlEnabledfalse. APIlistener vẫnPID17892 đãattestcap1 ở12D.3C; không reload/đổi backend.

Adapter5V vẫn phải rút điện theo xác nhận/ngữ cảnh người dùng; agent không tác động nguồn/dây/relay/GPIO. KhôngpublishON/OFF, khôngconsumequotaON, không chạyseed/migration/simulator hoặcépDBOFF. Không sửaWindowsTime hayrestartdịchvụ; chỉ tạo báo cáo và helperreader cục bộ. Không in .env/password/token/configWiFi.

| Hạng mục | Trạng thái |
| --- | --- |
| Đề xuất tối thiểu có cơ sởMS, localWORKGROUP/TypeNTP | TIME_FIX_READY_FOR_APPROVAL, kèm xác minh effectivepolicy elevated trước áp dụng |
| Chứng minhSPIKE/nguyênnhânnộibộduynhất | NOT VERIFIED |
| WindowsTime hiện LastSyncError2 | FAIL timegate |
| Đổi0x9→0x8 | NOT EXECUTED, chờchấp thuận riêng |
| BackupWindows mới / rollbackthựcthi | Chưa tạo/chưa thựcthi; quytrình đãchuẩnbị |
| 45–60phút saufix vàautoupdate | NOT VERIFIED, chưa được áp dụngfix |
| Hai frameSerial mới hoànchỉnh | PASS |
| Backendkhóa/ONLINE/OFF/PENDING0 | PASS |
| Thửbơm/motor/nước | NOT EXECUTED, ON0/1 |

**Phê duyệt TIME_FIX đã được cấp; hiện dừng vì thiếu tokenAdministrator, không yêu cầu duyệt lại. Không chuyển sang thửbơm.** Xem mục10 để thực thi đúng quyền và bắt đầu nghiệm thu sau khi áp dụng thực sự.

## 10. Sau phê duyệt TIME_FIX — chưa thể áp dụng do UAC

Precheck trực tiếp16:27:06:

- ElevatedAdministrator=false. Máy vẫn WORKGROUP/PartOfDomainfalse; registry TypeNTP/NtpServertime.windows.com,0x9 đúngbaseline.
- `w32tm /query /configuration`: AccessDenied0x80070005. Do đó chưa thể hoàn tất yêu cầu xác nhận effectiveconfig/localpolicy bằngAdministrator.
- Status: Leap0/Stratum5, source0x9, LastSyncError2, lastgood15:45:58; peerActive/Mode3. Dịch vụRunning/Automatic. Không resync hoặc restartdịchvụ ở bước này.

Không dùng cách láchUAC hoặc tuyên bố môi trường đã được nâng quyền. Việc người dùng phê duyệt không tự biến tokenmedium hiện tại thànhAdministrator. **Dừng trước bước backup/thayđổi**, không bắt đầu đồng hồ nghiệm thu45–60phút khi cấu hình còn0x9.

Đã chuẩn bị helper local git-ignored `build/phase12d3d-apply-timefix.ps1`; không sửa phần mềmSmartAgriculture. Script:

1. Dừng ngay nếu khôngAdmin, khôngWORKGROUP, Type/peer ban đầu khácNTP/0x9, có keyPolicy hoặc không xác nhận được effectiveconfig `(Local)`.
2. Tạo thư mục `C:\DATN\backups\w32time-parameters-before-0x8-yyyyMMdd-HHmmss`; export **đúng Parameters** thànhParameters.reg, đọc lại nội dung peer/Type, tínhSHA256, lưuconfig/status/peers/service baseline.
3. Snapshot các giá trị trong Parameters/Config/NtpClient/NtpServer; chỉ loại peer được duyệt và runtimeSpecialPollTimeRemaining do service quản lý khỏi phép so. Không ghi Min/Max/SpecialPollInterval/HoldPeriod/Type hay các giá trị khác.
4. Set đúng NtpServer0x8, gọi duy nhất `/config /update`, đối chiếu registry/effectiveconfig/protectedvalues/peers. Không restartdịchvụ hoặc sửa source/firmware/backend.
5. Switch `-InitialResync` cho **đúng một resyncsetup** được phê duyệt, ghi thời điểm và log; lần này không tính là automatic sync. Không vònglặp resync.
6. Nếu apply/update/verification lỗi sau thayđổi, khôi phục chỉ NtpServer0x9 từbaseline đã xác minh, `/config /update`, kiểm traeffectiveconfig/peers/service và báo rõ rollbackverified haynotverified. Không regimport toànservicekey hoặc sửa thêm registry.
7. Khi áp dụng thành công vẫn in TIME_FIX_NOT_VERIFIED: chưa chứng minh45–60phút/autosync. Script không mởcommand hoặc thửbơm và không tự bắt đầu phiênB.

Script đã parsePowerShell PASS. Thử chạy trong chính phiên hiện tại dừng đúng ở “Administrator PowerShell required. No configuration changed.”, trước đọc/backup/write; **chưa kiểm thử đườngapply/rollback bằng quyềnAdmin**, không giả nhận chúngPASS. Script đòi outputw32tm tiếngAnh `(Local)`; nếu khác/nghi ngờPolicy thì dừng đểagentxem, không nới checkmùquáng.

Người dùng mở **PowerShell Run as Administrator**, chạy:

```powershell
& 'C:\DATN\Project_datn\build\phase12d3d-apply-timefix.ps1' -InitialResync
```

Không đổi executionpolicy/securitysetting nếu scriptbị chặn; gửi lỗi để xử lý. Gửi output và đường dẫn backup. Chỉ sau khi xác minhAPPLIED_0x8/effectiveconfig/peer đúng mới bắt đầu cửa sổ quan sát45–60phút theo mục7, không gọiresync lặp lại trong lúc theo dõi. Thời điểmMONITOR_BASELINE_UTC của script là mốcsetup, không phải mốcautomatic sync.

Trạng thái bướcA: chưa đạt effectiveconfig/Admin và chưabackup. B: NOT EXECUTED. C/D: chưa cópost-change/45–60phút/autosync, **NOT VERIFIED**. Rollback: NOT EXECUTED vì chưa thayđổi, không có backup mới để báo thành công giả. NTP vẫn0x9; backendcommands/automation vẫnfalse, testModetrue theo trạngthái đã xácminh và không có thao tác sửa chúng trong phiên này. ON0/1, adapter tiếp tục phải rútđiện. Không yêu cầu lại phêduyệtB/TIME_FIX; đang chờ thực thi bằng quyền phù hợp.

## 11. Người dùng đã áp dụng TIME_FIX — bắt đầu nghiệm thu

Người dùng chạy helper vớiAdministrator, cung cấp output thành công. Agent đọc filebackup và xác minh registry/peers trực tiếp sau đó:

- Backup: `C:\DATN\backups\w32time-parameters-before-0x8-20261018-163138\Parameters.reg`.
- SHA256 đọc lại: `C538172B6D84C4B197EA2974FD0D08DD5F67FDCD0C11FC217D4326F652C1299C`, khớp output người dùng.
- ApplyUTC09:31:38.2388332Z; manualsetupresyncUTC09:31:38.3194431Z, đúng một lần; service ghi lastgood09:31:38.4175208Z.
- Baseline quan sát sau setup09:31:38.4777349Z =16:31:38.4777349VN. **Không tính lần resync này là automatic.**
- Elevated effectiveconfig do script thu: TypeNTP/NtpServertime.windows.com,0x8 đềuLocal; Min10/Max15/Hold5/Special32768 nguyên trạng. NtpClientEnabled1, NtpServerproviderEnabled0, không bậtserver hoặc thayhostname.
- Peer0x8/Active/Mode3, TimeRemaining ban đầu~1024s thay vì~32768s; chứng minh lịchpeer sauapply đổi theo cơ chếpoll. LI0/Stratum5/LastSyncError0.
- Registry đọc16:32:12 xác nhận0x8/TypeNTP; lastgood16:31:38, peerremaining~990s.

Đối chiếu snapshotregistry trước/sau: giá trịcấuhìnhtĩnh được bảo vệ khớp. `Config\LastKnownGoodTime` tự đổi từ08:45:58.7113215Z sang09:31:38.4175208Z, khớp manualsetupresync; đây là trạngtháidịchvụ, **không phải thao tácSet thêm của agent/người dùng**. Theo dõi tách giá trịruntime này và SpecialPollTimeRemaining khỏi so sánhconfigtĩnh, vẫn lưu chúng để đối chiếu sync.

Agent khởi chạy helperquery-only `build/phase12d3d-monitor-timefix.ps1`, logappend-only `build/timefix-monitor-20261018-163138.jsonl`. Mỗi~60s thu status/peers/registry/cấuhìnhtĩnh/backendPID/cờan toàn; mỗi5snapshot thu thêm5offsetmẫu. Không resync/config/restart hoặc publishcommand. Mốcminimum45phút là **17:16:38VN**, tối đa60phút **17:31:38VN** nếu chưa thấysyncautomatic; chỉPASS khi đủ thời gian và bằng chứng cần thiết.

Lần chạy helper đầu dừng ở kiểm tra nội bộ do so nhầm LastKnownGoodTime runtime với cấuhìnhtĩnh và coi envkeys thiếu là chưa xácminh. Đã xác định nguyênnhân, sửa **chỉ helpergiám sát**, không sửaWindows/backend/.env: baenvkeythiếu dùng đúngdefault củaconfig/env.ts (false/false/true), backendPIDphải còn17892 đãattest. Logđầugiữ nguyên đểaudit, không tính nó là TimeServiceFAIL hoặc ngầmresync/resetbaseline. Lần giám sát tiếp theo xác nhận protectedConfigurationUnchanged=true, flagsfalse/false/true vàLastSyncError0.

Kết quả đang theo dõi: mốc16:34:37 (~2.98phút), LI0/Stratum5/error0/peerActive, lastgood vẫnsetup16:31:38, chưaautomatic sync; offset5mẫu16:34:38–46 khoảng−88 đến−119ms. **TIME_FIX_NOT_VERIFIED**, chưa kết thúc nghiệm thu, không chuyển sang thửbơm.

Cập nhật mốc18.06phút (16:49:42): Last Successful Sync đã tự tiến lên **16:48:58**, không cóOperational266/ReasonCode0 mới sausetup; không có lệnhresync thêm củaagent. Error0, LI0/Stratum5, peer0x8/Active, staticconfigkhớp. Đây là bằng chứng accepted sync tự động đầu tiên sausetup, **chưa kết luậnPASS vì còn thiếu thời gian45phút và chưa vượt mốc25phút táilỗi cũ**. Offsetbatch16:49:42–50 khoảng−102 đến−117ms.

## 12. Kết quả giám sát thực tế — dừng do network change

### Đã kiểm chứng

- Apply/backup/effectiveconfig: PASS; chỉ peerflag0x9→0x8, hostname/Type/Min/Max/Hold/Special và cấuhìnhtĩnh đãsnapshot giữ nguyên. BackupParameters vẫn đúnghashC538172B...C1299C khi kiểm tra cuối.
- Một manualsetupresync16:31:38, **không có resync thủ công nào tiếp theo củaagent**; Operational không cóReasonCode0 mới sausetup trong cửa sổ thu được.
- Accepted automatic sync **16:48:58**: LastSuccessfulSync tự tiến, TimeSinceLastGood reset, registryLastKnownGoodTime=2026-10-18T09:48:58.4286728Z. Không yêu cầu phải cóevent265 mới vì nó không ghi mỗi sample; các bằng chứngstatus/registry/quietwindow cùng khớp.
- Qua mốc25phút và30phút: peerActive, LI0/Stratum5/error0; lastgood16:48:58, không stale2. Chưa đủ45phút.
- 30snapshot hợp lệ từ16:34:37 đến17:03:44, ngoài các snapshot apply/baseline trước đó. Tất cả LastSyncError0; protectedconfigtĩnhkhớp, backendPID17892/cờfalse-false-true giữ nguyên. 30mẫuoffset trong6batch của monitorhợplệ: −121.6919 đến−88.0653ms. Giữ nguyên logattemptđầu có guardhelpernhầmruntimefield như mục11, không tính nó là TimeServicefailure.

### Điều kiện thất bại và bằng chứng nguyên nhân gián đoạn

**17:02:41.500** Time-Service/Operational266 ghi **ReasonCode2: changes to network interface/topology**. Đây không phải adminresync (Reason0).

NetworkProfile/Operational xác nhận:

- 17:02:41.621: event10001 NetworkDisconnected, profilecũ.
- 17:02:43.079: event10000 NetworkConnected/Identifying.
- 17:02:46.801: event10000 NetworkConnected/profilemới; nhiềuevent4004/4001/4002 đổi connectivity/identity.
- WLAN/Operational có disconnect8003 và connect8000/8001 trong cùng khoảng17:02:42–43.

Không công bốSSID/credential trong báo cáo. IPv4Wi-Fi đọc sau đó là **192.168.1.4/24**, khác IP172.20.10.2 đã dùng cho broker/ESP32 ở các giai đoạn trước. Agent không đổi mạng/IP/firmware/MQTTconfig.

Snapshot **17:03:44.487 giờVN /10:03:44.487Z**:

```text
minutesSinceBaseline: 32.100
Registry NtpServer: time.windows.com,0x8
Registry Type: NTP
Leap Indicator: 0
Stratum: 5
Last Sync Error: 0
Last Successful Sync Time: 16:48:58
Peer: Pending
Peer Mode: 0 (reserved)
Peer Stratum: 0 (unspecified)
```

PeerActive=false là điều kiện khiến helper dừng. Logresult của helper là **TIME_FIX_FAIL** theo nghĩa **gate nghiệm thu peerActive bị thất bại**, không phải lỗiSetItem/update hoặc bằng chứngflag0x8 gây stale. Kiểm tra17:03:58 và17:05:14 vẫnPending, còn statusLI0/Stratum5/error0. DNS sau đổi mạng vẫn resolve52.148.114.188; không có căn cứ kết luận DNSđanghỏng/firewallchặnUDP123. Cần đánh giá lại sau khi mạng ổn định, không resync để che tình trạngPending.

### Kết luận tổng thể và rollback

**TIME_FIX_NOT_VERIFIED cho độ ổn định45–60phút**, vì quan sát bị nhiễu/gián đoạn ở32.10phút do networkchange đãcóbằngchứng. Không nâng thànhPASS từ mộtautoupdate vàoffsetnhỏ; cũng không gán lỗi đổi mạng cho0x8 khi chưa có bằng chứng. HelpergateFAIL được giữ nguyên trong log, không xóa/sửa thànhPASS.

**Không rollback đã thực thi:** apply/effectiveconfig thành công, không có configstatic sai hoặc bằng chứng0x8 làm phát sinh lỗi. Không tự quay lại0x9 vốn từngstale chỉ vì mạng bên ngoài đổi. Hiện vẫn0x8/TypeNTP; nếu sauđiềutra xác định thayđổi gây lỗi thì dùngbackup/rollback đúng phạmvi đãduyệt, không sửa thêm registry/service.

### Trạng thái Smart Agriculture ở điểm dừng

SELECT lúc **10:04Z** vàAPI17:04:24VN: deviceconnectionStatusUNKNOWN, lastSeen10:02:40.727Z; DB lưuOFFhistorical stateAt10:02:40.074Z, API đúngnguyên tắcmaskUNKNOWN, controlEnabledfalse/gatewayModeDISABLED. Latestreadings vẫn10:02:33.344Z, không biến thành mới bằngtimestampfrontend. PENDING0, newCommands0; ONvẫn0/1. Backendkhôngreload/đổi cờ, không gửiON/OFF hoặcépOFF.

Đây là gate vật lýkhác cũngkhôngđạt: ESP32 không cònONLINE trênhệthống sauđổimạng. Không tự đổiWiFi/MQTT_HOST/.env/firmware để chạy tiếp; không yêu cầu cấp nguồnadapter. Adapter phải tiếp tục rútđiện. Không thửmotor/nước.

### Bước tiếp theo

1. Giữnguồnbơmngắt vàbackendcommands/automationfalse/testModetrue.
2. Người dùng xác nhận/ổn định mạng dự định dùng. Để giữ cấu hình ESP32/broker hiệnhữu, ưu tiên khôi phục đúng mạng/IP đãđượcxácminh trước; nếu muốn chuyểnmạng lâu dài thì phải đánhgiá/cho phép riêng thayđổiMQTT/WiFi, không tự đổi trongTIME_FIX.
3. Đọc lạipeer/source/status sau mạngổn định và xác minhESP32ONLINE/freshOFF. Không manualresync lặp lại.
4. Nghiệm thu lại cửa sổ45–60phút trênmạngổnđịnh, có ít nhất mộtacceptedautosync trong cửa sổ khôngmanualresync. Chưa đủ cửa sổ →NOT VERIFIED. Giữnguyên loglầnnày để phân biệt lỗi0x9 cũ với giánđoạnmạng.
5. Chỉ sau TIME_FIXPASS vàprecheckphầncứng/runtime sátlúcchạy mới tiếp tụcphốihợp phiênB đãduyệt; khôngxinlạiB, khôngtựclickON hoặc cấp nguồn.

Rawlog: `build/timefix-monitor-20261018-163138.jsonl`. Helpermonitor đã kếtthúc, không còn lịchresync/servicechange hoặc testpump chạy nền. Không có rollback/flash/migration hoặc cấp nguồn trong phiên này.

### Cập nhật sau điểm dừng — dịch vụ tự khôi phục

Đọc trực tiếp17:06:44: LastSuccessfulSync tự tiến **17:06:02**, peer0x8 trở lạiActive/Mode3/Stratum4; statusLI0/Stratum5/LastSyncError0, phaseoffset−61.0694ms. Agent không gọi resync/update/restart trong thời gian này. Đây là accepted sync tự động sau notificationnetworkReason2, khác với pollquiet-window16:48:58, không được mô tả là lầnmanualsetup thứhai.

Điều này **không chứng minh0x8 thấtbại hoặc stale2 tái phát**; thực tế nguồn giờ tự phục hồi sau đổi mạng. Vẫn chưa gánPASS45–60phút vì helper đã dừng ở32.10phút vàmạng đã thay đổi; giữ báo cáoNOT VERIFIED, không che transientPending. IPmáy vẫn192.168.1.4; nguyênnhân ESP32khôngONLINE cần xử lý theo mạng/MQTT riêng, không đổi cấu hình phầncứng trongTIME_FIX.

Tiến trình PowerShell querycuối thoát lỗi native−1073741819 sau khi in đủstatus/peers/IP vàREPORTS_CHECK_PASS; không gọi lệnhwriteWindows trong tiến trình đó. Đây là lỗi công cụ cần phân biệt với LastSyncError0 củaW32Time, không dùng exitcode này để kết luận clockstale hoặc bơmđãchạy.

## 13. Tiếp tục ngày20/10 — kết quả kiểm tra chỉ đọc

- Ngày/giờ kiểm tra thực:20/10/2026 19:12–19:15VN, không phải phiên18/10 tiếp diễn liên tục.
- Không thấy monitor `phase12d3d-monitor-timefix.ps1` còn chạy (loại processqueryhiện tại khỏi phép dò). Logrecovered `build/timefix-monitor-recovered-20261018-102328.jsonl` chỉ có3snapshot, từ17:23:29 đến17:25:29 ngày18/10, tối đa2.016phút; không có recordresult hoặc bằng chứng đủ45phút. Không cộng hai ngày gián đoạn vào thời gianquan sát.
- Windows vẫnpeer0x8, LI0/Stratum5/LastSyncError0, lastsuccessfulsync20/10 19:11:12, peerPending/Mode0/Stratum0. Operational266ReasonCode2 lúc19:11:06 xác nhận thay đổi network/interface trước đó. Sync19:11:12 phù hợp hồi phục theo networknotification, chưa phải bằng chứng của một cửa sổpoll ổn định45–60phút. Không resync/chỉnh registry hoặc gọi lỗi này là stale2 khierrorvẫn0.
- IPv4Wi-Fi172.20.10.2/28, gateway172.20.10.1. FirmwareMQTT_HOST vàbackendbroker cùng172.20.10.2/1883; agent không sửa các giá trị này hoặc incredential. Vì địa chỉ đã trở lại đúng, không tiếp tục quy tình trạng hiện tại chỉ cho mismatchIP192.168.1.4 cũ.
- Chỉ thấy MosquittoPID4572, listener127.0.0.1:1883 và[::1]:1883; listenerLAN0.0.0.0/[::] củaPID22872 ngày18 không còn. Dịch vụMosquittoRunning không có nghĩa ESP32truy cập được từLAN. Đây là điểm chặn đườngMQTT LAN đã xácminh, không phải kết luậnACL/passwordsai.
- Không có listener5000; HTTPhealthkhôngtruycậpđược. Không có backendprocess phục vụAPI đểattest runtimecap hoặc chạytelemetryadapter/watchdog. PostgreSQL17 vẫnRunning vàSELECTđược.
- DB vẫn lưuDevice.connectionStatusONLINE nhưnglastSeen2026-10-18T10:25:55.960Z; actuatorOFFstateAt10:22:55.357Z/readings10:23:03.344Z cùngngày18. Đây là **ONLINE/OFF/reading lịch sử**, không phải xác nhận vật lýhiện tại; không épDBsangOFFLINE/OFF. PENDING0, latestcommands vẫn16/10.
- Configbackend đọc qua diagnostic: commandsfalse/automationfalse/testModetrue; không có serverđangchạy nên không dùng configprocessriêng này giả làm attestationruntimeAPI.
- Windows chỉ thấy COM4/COM5Bluetooth, khôngCOM3. Reader115200/DTRoff/RTSoff lỗi `COM3 does not exist`, không cólogESP32mới. Nguyên nhân có thể là USB/driver/board enumeration, chưa đủbằngchứng khẳngđịnh boardhỏng/firmwarelỗi hoặc tự chọn cổngkhác. Không reset/flash.

**TIME_FIX_NOT_VERIFIED / B_PREFLIGHT_NOT_READY.** Chưa khởi chạy monitor mới vì điều kiện hiện tại chưa đạt và helper cũ dựa vàoPIDbackend17892 không cònphùhợp. Không tạo nhiều monitor hoặc chạy một monitor lập tứcFAIL để giả làm theo dõi tiếp. Cần xácminh peerActive/mạngổn định rồi mở một phiên45–60phút thực, cóacceptedautosync sau baseline.

Chưa khởi động brokerLAN/backend, chưa sửa mạng/firewall/config/source/firmware. Cần người dùng kiểm traUSB để COMESP32 xuất hiện và xác nhận adapterbơm vẫnngắt; nếu cho phép khởi động lại đúngbrokerLAN/backend thì giữhai cờfalse/testModetrue, xácminh lại configđangdùng trước start. Không khởi động Mosquitto thứhai mùquáng trêncổngđãbịservicechiếm. PhêduyệtB đãcó/ON0/1 nhưng không thay cho gate hoặc quyềnkhôiphụcdịchvụ. Giữnguồnbơmngắt, không gửiON/OFF.

## 14. Khôi phục MQTT/backend theo cho phép của người dùng — 20/10 19:17–19:19

Sau khi người dùng đồng ý cho phép khởi động brokerLAN/backend ởchếđộkhóa:

- BrokerLAN **đã xuất hiện trước khi agent phát lệnh startbroker**: PID23312, listen0.0.0.0:1883/[::]:1883. Agent không khởi tạo bảntrùng, không dừngservicePID4572loopback và không tuyên bố đã tự khởi động/restartPID23312. Commandline của broker nângquyền không đọcđược trực tiếp; confighiệnhữu `C:\mosquitto\config\mosquitto.conf` đã đốichiếu và runtime authenticatedMQTTframes xácnhậnkhảdụng.
- Config: listener1883, anonymousfalse, password_file/acl_file hiện hữu, ACLtelemetry/status/commands/ACK/state cònđúng. Không đọc passwordfile, sửaACL/config/firewall hoặc đổi mạng. Firmware/backendhost172.20.10.2, IPWi-Fihiệnđúng172.20.10.2.
- Agent xácnhận5000trống rồi chạy backendwatch với processenv rõràng: MQTT_COMMANDS_ENABLED=false, MQTT_AUTOMATION_COMMANDS_ENABLED=false, MQTT_PUMP_TEST_MODE=true. Không sửa.envfile hoặcsource, khôngseed/migration.
- Startup trực tiếp từprocessserver: `{"pid":1888,"startedAt":"2026-10-20T12:17:47.659Z","testMode":true,"effectiveMaxRunSeconds":1,"commandsEnabled":false,"automationEnabled":false}`. Listener5000OwningProcess1888 khớp; DBconnected, MQTTconnected172.20.10.2:1883, subscriptionsrestored vàOFFobservation khi commandsdisabled.
- Recovery/watchdog có expireDevicecũ khi khởiđộng; đây là luồngbackend bìnhthường, không cậpnhậtDBthủcông. OFF thật mới recordedAt12:17:50.561Z sau startup, backendlogcommitted. Không dùngOFF ngày18/10 để vượtgate.

Observer subscribe-only lấy PERIODICOFF mới12:18:05.713/12:18:20.861/12:18:35.927Z, QoS1/retainfalse/dupfalse, khoảng15.1s. API12:18:06.453/12:18:21.925Z khớptimestampOFF, ONLINE, controlEnabledfalse/gatewayModeDISABLED. RetainedstatusOFFLINE lúcsubscribe là cũ, không dùng làm trạngtháilive.

PrismaSELECT12:18:39.370Z: DeviceONLINElastSeen12:18:36.648Z, PUMP_01OFFstateAt12:18:35.927Z; đủ4readingsMQTT cùngrecordedAt12:18:34.862Z/receivedAt12:18:35.533Z: TEMP31.2/HUM73.5/LIGHT3.33/SOIL0. SOIL0 là giátrịbackend nhận, không đổi thànhthiếu dữliệu; không suy đây là chứngnhậncalibration/cảmbiếnđúng tuyệtđối. PENDING0, không cócommandmới, latestcommandvẫn16/10. Health200DB/MQTTconnected.

COM3 xuất hiện vàlầnđọc19:15 đã xácnhận sample4: WiFiCONNECTED/NTP SYNCED/PUMP_COMMANDSENABLED/relayOFF, nhưngMQTTDISCONNECTED/NOT_SENT, connectcode−2. Saubroker/backendphụchồi, reader mới bị AccessDenied doCOM3đangbịgiữ; khôngkillứngdụng hoặc épchiếmcổng. Vì vậy Serialđủtrạngthái sauphụchồi **NOT VERIFIED**, dùMQTT/DB/APIthật đãfresh/ONLINE/OFF.

Windows19:18:41: source0x8, LI0/Stratum5/error0/lastgood19:11:12 nhưngpeerPending. Không resync/đổiNTP hoặc tuyên bố45phútPASS. Không cómonitorcũ đangchạy; chưa bắtđầuwindowmới với peerPending vàhelpercũ hardcodePID17892. Cần peerActive/mạngổnđịnh và cậpnhậtbaselinegiámsát theoPID1888 đãattest trước khi quan sát45–60phút, chỉ một monitor.

**MQTT_RECOVERY_PASS (DB/API/runtime), TIME_FIX_NOT_VERIFIED, B_PREFLIGHT_NOT_READY.** Backend đượcđểchạytheoyêucầu; brokerhiệnhữu giữnguyên. Không startfrontend hoặc dịchvụkhácngoàiphạmvi. Giữadapterbơmrútđiện, không gửiON/OFF/clickBẬT, ON0/1. CầnSerialmới vàtimegateđạt trước tiếp tụcbấtkỳthửvậtlýnào; khôngxinlạiphêduyệtB.

## 15. Nghiệm thu tiếp ngày 20/10 — cửa sổ mới từ 19:28:27

- Không có monitor cũ đang chạy. Chỉ chạy lại helper hiện có, thêm tham số `ExpectedBackendPid=1888` thay PID cũ hardcode; không sửa ứng dụng, firmware hoặc cấu hình Windows.
- Peer còn Pending lúc 19:27:17, time remaining 41 giây, LastSyncError=0. Event Operational 264 lúc 19:28:00 xác nhận nhận lại dữ liệu từ time.windows.com,0x8; peer tự trở lại Active/Mode3/Stratum4. LastSuccessfulSync tự tiến tới 19:28:16, registry LastKnownGoodTime=2026-10-20T12:28:16.4922736Z. Không gọi resync/config/update/restart dịch vụ. Đây là phục hồi tự động sau notification mạng 19:11:06, không phải bằng chứng Pending chỉ kéo dài vài giây; đã quan sát Pending ít nhất từ 19:18 đến 19:27.
- Offset trước cửa sổ: −286.7 đến −301.7 ms; đầu cửa sổ: −283.1 đến −301.5 ms. Phase Offset −221.9 ms; LI0, Stratum5, LastSyncError0, source0x8. Không nới guard FUTURE_COMMAND 2 giây; offset NTP không phải phép đo riêng clock skew ESP32.
- Baseline mới khoảng 2026-10-20T12:28:26Z; snapshot đầu 12:28:27.2105569Z. Log: `build/timefix-monitor-recovered-20261020-122826.jsonl` (đối chiếu tên thực tế từ result khi kết thúc). Sync 19:28:16 xảy ra trước baseline nên không được tính vào điều kiện có accepted automatic sync trong cửa sổ mới.
- Broker LAN PID23312 vẫn listen0.0.0.0/[::]:1883, backend5000 PID1888, Wi-Fi172.20.10.2. DB SELECT12:27:31Z: ONLINE, OFF12:27:25.732Z, đủ4 readings MQTT12:27:19.862Z, PENDING0. API controlEnabledfalse/gatewayModeDISABLED. Observer thật ghi PERIODIC OFF12:27:56.044Z và12:28:11.111Z (~15.07 giây), QoS1, retainfalse/dupfalse; API khớp timestamp, heartbeat ONLINE non-retained mới. Retained OFFLINE lúc subscribe là lịch sử, không dùng làm trạng thái hiện tại.
- Serial do người dùng cung cấp sample24 recordedAt12:20:49.862Z: WiFi/MQTT CONNECTED, NTP SYNCED, PUMP_COMMANDS ENABLED, relay GPIO OFF. Không cần đóng Arduino IDE khi người dùng gửi log; không tranh chấp COM3, không reset/flash. Đây là bằng chứng Serial do người dùng cung cấp, không phải phép đo trực tiếp của agent.
- Trong thời gian quan sát: giữ commands=false, automation=false, testMode=true, adapter bơm phải tiếp tục rút điện. Không gửi ON/OFF, không ghi DB thủ công. Kết quả đang chờ: **TIME_FIX_NOT_VERIFIED / B_PREFLIGHT_NOT_READY**; chưa đủ 45–60 phút.

## 16. Dừng chờ dài theo yêu cầu người dùng — 20/10/2026 19:38

Người dùng yêu cầu không cần tiếp tục đợi lâu. Agent dừng đúng monitor read-only bằng Ctrl+C; session63239 kết thúc exit1 do ngắt chủ động, không phải lỗi Windows Time. Kiểm tra tiến trình sau đó không còn monitor; broker/backend được giữ nguyên. File log giữ nguyên dữ liệu thô, không thêm kết quả PASS giả; không có result cuối vì tiến trình bị ngắt.

- Cửa sổ có10 snapshot, từ19:28:27.210 đến19:37:29.108, snapshot cuối9.039 phút từ baseline. Tất cả peerActive=true, LI0, Stratum5, LastSyncError0, cấu hình bảo vệ không đổi, network changes/manual resync0, backend PID1888. Chưa có accepted sync mới sau baseline; lần19:28:16 xảy ra trước baseline.
- 10 mẫu stripchart trong cửa sổ (hai batch đầu và phút5): xem raw log để đối chiếu số đo; không coi phaseOffset là offset mới mỗi phút. Kiểm tra chốt19:37:47 vẫn peerActive/Mode3/Stratum4, nguồn0x8, error0, phaseOffset−0.2219113s. Không resync, thay registry hoặc đổi peer.
- SELECT19:38:00: ONLINE, relayOFF12:37:46.379Z, đủ4 readingsMQTT12:37:49.862Z (TEMP31.1/HUM73.9/LIGHT3.33/SOIL0), nhận12:37:50.429Z, PENDING0; latest command vẫn16/10. API19:38:02 xác nhận OFF mới12:38:01.613Z, ONLINE, controlEnabledfalse/gatewayModeDISABLED.
- ListenerLAN1883 PID23312/backend5000 PID1888 còn nguyên. Runtimecap1 dựa attestation startup cùngPID, cờ configfalse/false/true khớp, không restart. Không gửiON/OFF hoặc command mới, không flash, không migration/ghiDB thủ công. Adapter phải tiếp tục rút điện.

**Kết luận:** khả năng đồng bộ NTP hiện tại và luồng MQTT/DB/API **PASS ở thời điểm kiểm tra**. Nghiệm thu độ ổn định45–60phút **TIME_FIX_NOT_VERIFIED (dừng theo yêu cầu người dùng)**, không gánFAIL khi không có stale2 và không gánPASS khi thiếu cửa sổ. **B_PREFLIGHT_NOT_READY theo tiêu chí ban đầu**; phê duyệtB vẫn còn, ON0/1. Dừng theo dõi dài, không tự nối tiếp thử bơm hoặc yêu cầu cấp nguồn.

## 17. Cửa sổ Phase12D.3E ngày20/10 — tự đồng bộ thành công, dừng sau12phút

Theo yêu cầu mới Phase12D.3E, chạy lại một monitor hiện có từ19:50:43, ExpectedBackendPid1888, rawlog `build/timefix-monitor-recovered-20261020-125043.jsonl`. Không ghép với phiên19:28 đã dừng, không thay đổi registry/NTPpeer hoặc resync. Peer0x8 giữ nguyên; offsetđầu−198.2 đến−202.4ms, sourcehợp lệ.

Người dùng sau đó yêu cầu dừng. Agent ngắt đúng monitor bằng Ctrl+C lúc khoảng20:03, session12847 exit1 do người dùng yêu cầu, không phải W32Timefailure. Không còn monitor chạy sau kiểm tra. Rawlog có13snapshot, snapshot đầu19:50:44.2742576, cuối20:02:47.1294357; snapshotcuối12.053phút từbaseline. Không có result cuối do ngắt chủ động, không sửa/đổi log thànhPASS.

Tất cả13snapshot: LI0, Stratum5, LastSyncError0, peerActive=true, cấu hình bảo vệ không đổi, networkChangesAfterBaseline0/manualResync0, backendPID1888. Snapshotcuối có accepted automatic sync **20:02:24**, saubaseline; LastSuccessfulSync tự tiến từ19:45:04. Kiểm tra20:03:37: peerActive/Mode3/Stratum4, StateMachine2(Sync), source time.windows.com,0x8, LastSyncError0, PhaseOffset−0.1167476s. Không dùng phaseOffset như một phép stripchart mới, không đánh đồng độ trễ telemetry với clock skew.

**Kết luận:** NTP tự đồng bộ hoạt động tại thời điểm kiểm tra; không có bằng chứng stale data tái phát trong12phút đo. **TIME_FIX_NOT_VERIFIED** đối với45–60phút liên tục (dừng theo yêu cầu), không khẳng định đã chữa dứt điểm dài hạn. Giữ0x8, không rollback/đổi thêmcấu hình. Broker/backend giữ nguyên, API20:03:39 ONLINE/OFFmới13:03:35.482Z, đủ4MQTTreadings13:03:34.862Z, PENDING0/newCommands0, gatewayDISABLED/controlEnabledfalse. Chi tiết quy trình vàquotaON0/1 trongmục16 báo cáo thử bơm; **B_PREFLIGHT_NOT_READY**, không chuyển sang thử vật lý.
