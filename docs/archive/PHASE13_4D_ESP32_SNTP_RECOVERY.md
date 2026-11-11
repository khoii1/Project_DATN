# Phase 13.4D — ESP32 SNTP expiry & safe recovery

> Cập nhật nghiệm thu13.4F ngày21/10/2026: binary13.4D ghi/verify thành công nhưng abort/reboot trên board; backtrace qua gettimeofday trong clockSnapshot critical section. FIX_READY dưới đây chỉ là lịch sử offline, không đủ nghiệm thu firmware ổn định. Xem [báo cáo13.4F](PHASE13_4F_SNTP_FIRMWARE_FLASH_VERIFICATION.md). Không tự flash lại artifact này.

Ngày: **21/10/2026, UTC+7**. Điều tra read-only, sửa source offline, host tests và compile. **Không flash/reset ESP32, không gửi ON/OFF, không cấp nguồn bơm.**

```text
SNTP_ROOT_CAUSE_FOUND — source/build: refresh 3h > firmware validity 2h
SNTP_RECOVERY_FIX_READY — source + host tests + board compile
FIRMWARE_COMPILE_PASS
FLASH_NOT_PERFORMED
ON_DEVICE_RECOVERY_NOT_VERIFIED
VERIFIED_LIVE_NOT_READY
AUTOMATION_ACTIVE=false
PHYSICAL_PUMP_NOT_TRIGGERED
```

FOUND là chứng minh mismatch trong firmware/core được build; không phải đã capture UDP123 hoặc trực tiếp đọc interval/last callback của firmware đang chạy. DNS/firewall/server response trên mạng ESP32 vẫn NOT VERIFIED. Source fix chưa có trên ESP32 nên runtime chưa phục hồi trong phase này.

## 1. Broker port ownership — không phải sửa MQTT

Read-only `Get-NetTCPConnection`/CIM/log:

| Binding1883 | PID | Vai trò |
| --- | ---: | --- |
| 0.0.0.0 và :: |1340| Mosquitto LAN, `C:\Program Files\mosquitto\mosquitto.exe -c C:\mosquitto\config\mosquitto.conf -v` |
| 127.0.0.1 và ::1 |4572| Service Mosquitto loopback có từ trước; commandline không đọc được với token hiện tại |

Established connections: backendPID3572,172.20.10.2:58534→172.20.10.2:1883; brokerLAN→ESP32IP172.20.10.3:64049. Logbroker vẫn nhận status QoS1/r0 và gửi tới smartagri-backend rồi nhận PUBACK, không chỉ có listenerTCP. Backend/API/PostgreSQL hoạt động, ESP32 vẫn ONLINE qua heartbeat.

Ảnh tiến trình Mosquitto mới không bind1883 phù hợp **khởi chạy broker trùng cổng đang có chủ**, không chứng minh brokerLAN đã chết hay gây SNTPexpiry. Không chạy brokerthứba, không kill/restartbroker/backend, không sửaACL/config/firewall. Không có bằng chứng cần sửa lớpMQTT đã PASS.

## 2. Root cause: giá trị thực khác giả định default

Firmware cũ `.ino` chỉ gọi `configTime(0,0,"pool.ntp.org","time.google.com")` một lần trong setup, sau đăng ký callback, trướcWiFi.begin. Không gọi configTzTime, set_sync_interval hoặc có recoveryworker. `reliableClock()` vô hiệu sau **7200000ms**, chờ callback mới.

Core thực từ `build/esp32-phase12d3a-enabled/build.options.json` và installation: **Arduino ESP32 3.3.12**, FQBNesp32:esp32:esp32, ESP-IDF5.5.5. Cả cấu hình qio_qspi/dio_qspi trong:

```text
C:\Users\Acer Swift3\AppData\Local\Arduino15\packages\esp32\tools\esp32-libs\3.3.12\qio_qspi\include\sdkconfig.h:912
#define CONFIG_LWIP_SNTP_UPDATE_DELAY 10800000
```

**10800000ms=3giờ**, không phải1giờ. Dòng3600000 trong generic lwIP `sntp_opts.h` chỉ là fallback; `lwip/port/include/lwipopts.h:1588` dùng `SNTP_UPDATE_DELAY (sntp_get_sync_interval())`. ESP-IDF khởi tạo interval từ CONFIG_LWIP_SNTP_UPDATE_DELAY; setter chỉ đổi interval, restart áp dụng lịch mới. Đối chiếu [source Espressif v5.5.5](https://raw.githubusercontent.com/espressif/esp-idf/v5.5.5/components/lwip/apps/sntp/sntp.c), đặc biệt initialization/get/set/restart. Không suy ra interval từ tài liệu default chung.

Timeline cấu hình cũ sau một callback thành công:

```text
sync → 0..2h: clock còn hợp lệ → 2h: firmware BLOCKED → ~3h: mới đến chu kỳ refresh thông thường
```

Ngay cả server/mạng bình thường vẫn có khoảng hết hiệu lực trước kỳ SNTP kế tiếp. Đây là lỗi tương thích source/build đủ bằng chứng để sửa, không cần chờ2giờ tái tạo. Chưa có packet capture để tuyên bố SNTP thực tế đã/chưa gửi từng request hoặc sẽ tự hồi chính xác lúc3giờ.

## 3. SNTP lifecycle/callback và các khả năng

Local core `cores/esp32/esp32-hal-time.c`: configTime initnetif, khóaTCPIPcore khi cần, stopSNTPnếuđangchạy, setmodePOLL, set2hostname/slot3null, initSNTP; không xóa notification callback. App chỉ gọi một lần ởboot. Wi-Fi reconnect và MQTT reconnect trong app không gọi stop/configTime hoặc thay server. `config.h` người dùng nêu **không tồn tại**; sketch thực chọn config.local.h, fallback config.example.h. Không in toàn bộ config.

Callback cũ cập nhật lastClockSync/millis, clockSynced và count; không có logage/interval nên chưa biết lần callback cuối chính xác. Serialmonitor544 xác nhận `NOT_SYNCED_OR_EXPIRED`, không có recordedAt, skiptelemetry; cảm biến đọc được vàWiFi/MQTTconnected. Lần telemetrycuối05:00:38.285Z/OFF05:00:39.402Z phù hợp hết validity nhưng không tự suy ngược một timestampcallback chính xác từ đó.

| Giả thuyết | Kết luận |
| --- | --- |
| A: chưa đến chu kỳ request refresh | **Mismatch3h/2h đã chứng minh ởsource/build**; runtime packet schedule chưa capture |
| B: request có nhưng server không trả | NOT VERIFIED; WiFi/MQTT không chứng minhDNS/UDP123 |
| C: sync có nhưng callback bị reset/không cập nhật | Không có resetcallback trong app/coreconfigTime; runtime callbackcount cũ chưa có nên không loại trừ mọi lỗi |
| D: xử lý tuổi sync sai/race | Expiry2h là chủ ý; old atomics riêng lẻ có race tiềm tàng: expiry reader có thể storefalse sau callback mới. Chưa có bằng chứng race đã xảy ra; source mới serialize snapshot/callback |
| E: network lifecycle | Broker/heartbeat vẫn hoạt động; thiết bị có reconnect lịch sử nhưng chưa chứng minh đó là nguyên nhân SNTPkhôngrefresh |

Không đổi NTPWindows, không dùng giờWindows làm UTCthiếtbị, không sửa guard2giây.

## 4. Source fix được triển khai

| File | Nội dung |
| --- | --- |
| `firmware/SmartAgricultureESP32/SntpRecovery.h` | Pure clock validity/generation/jump và retry policy, không GPIO/network/Serial |
| `firmware/SmartAgricultureESP32/SmartAgricultureESP32.ino` | Version13.4D; explicitinterval; critical snapshot/callback; recoveryworker/log; samplegeneration |
| `firmware/tests/sntp_recovery_test.cpp` | 24 fake-clock/GPIO tests, không chờ2giờ |
| `firmware/tests/run-host-tests.ps1` | Thêm compile/chạy SNTPtests, giữ controller/contract tests cũ |
| `firmware/README.md` | Ghi chú source13.4D chưa flash và link safety gate |
| Báo cáo này | Bằng chứng, compile/rollback/flashgate |

Không sửa config.local.h/config.example.h, PumpProtocol.h, OffStateSchedule.h, FirmwareDiagnostics.h, GPIO, MAX_PUMP_SECONDS, backend source/schema/MQTTschema hoặc secrets. configlocal được kiểm tra bất biến trong task bằng so sánh nội dung trong bộ nhớ, không in giá trị bí mật.

### Chu kỳ và recovery

- Set **esp_sntp_set_sync_interval(1800000)** trước configTime/init, giữ nguyên2hostname. 30phút tạo margin trước validity2giờ; không tăngexpiry để chelỗi.
- Recoveryworker core0/priority1/stack6144, safety task vẫnpriority4. Chỉ worker này điều khiển retry; không network/DNS/Serial trongcallback hoặc sensorTask.
- Startup chờ tối thiểu30s; healthyclock<1h vàSNTPđangchạy không bịrestart liên tục. Khi syncage>=1h, clockblocked, SNTPstopped hoặcWiFiGOTIP cần refresh: yêu cầu restart quaAPIESP; stopped thì init lại hosts đã cấu hình. Không gọi configTime lặp trong tightloop.
- Backoff sau các request:60/120/240/480/900s, sau requestthứ6 cooldown30phút; cảstartup/reconnect đềuqua rate gate. WiFioffline hoặc pumpON tại lần kiểmtra thì không restart. Callback mới resetbackoff, không giả SYNCED từ DNS/restart returnvalue.
- APIsEspressif route restart/init quaTCPIP context; requestaccepted không đồng nghĩa nhậnNTPresponse/callback. Theo [ESP-IDF system time](https://docs.espressif.com/projects/esp-idf/en/v5.5/esp32/api-reference/system/system_time.html), cần phân biệt init/restart với sync notification; giữ đúng wrapper của core đã compile.

### Clock/thread safety/timestamp

- Một clockMux bảo vệ callback và mọi snapshot; thời gianmonotonic/UTC được đọc trong cùng criticalsection ngắn. Không nested clock/pump locks, không I/O trongclocklock. Bỏ storefalse kiểuexpiryreader từ code cũ.
- Clock hết2h hoặc jump/rollback thì BLOCKED cho đến callback hợp lệ; latch ngăn agewrap làm clock tự “sống lại”. Unsignedmillis wrap được kiểm thử. UTC<epochminimum không thành valid.
- Callback tănggeneration, chỉ đó mới ghi syncsuccess. Samples có recordedAt và generation **tại lúc đo**; mẫu unsynced hoặc generation trước callback không được publish sau recovery. Không timestamp lại mẫu cũ; giữ freshsample30s hiện có.
- Recovery xếp yêu cầuPERIODICOFF chỉ nếu pendingreason đangnull quaCAS, không ghi đèMAX_RUNTIME/COMMAND/loss. sendOffState vẫn cần clocktin cậy + controller/GPIOconfirmedLOW, UTCmới vàQoS1/nonretained. Không publishOFFgiả khi clockinvalid.
- Heartbeat timestamp-free vẫn hoạt động, API có quyền UNKNOWN trongthờigianblocked. Không tự ON/replaycommand; clockjump lúc đangON vẫn qua safetytaskLOW, MAX_RUNTIME monotonic/5s cap/OFFpriority/lease250ms không đổi.

### Instrumentation

BOOTlog: version13.4D, configuredNTPnames, interval, expiry vàrunning. Workerlog mỗi30s: millis, callbackcount/age, reasonNO_CALLBACK/EXPIRED/UTC_INVALID/CLOCK_JUMP/OK, running, interval, WiFistate vàretrywait. WiFistatuschanges log hiện có giữ nguyên; GOTIP chỉ đánh dấu yêu cầu worker.

Mỗi recoveryattempt có restart/request status và DNS2host RESOLVED/FAILED; DNSsuccess không chứng minh UDP123. Network.hostByName là synchronous theo core, **chỉ chạy ởworker riêng**, không có applicationhardtimeout mới; DNS có thể làm chậm log/retryworker. LoopMQTT/sensors/safetytask không đợiworker. Chưa đo stack/heap/scheduling trên ESP32 mới; đây là giới hạn nghiệm thu thật cần theo dõi. Không logpassword/token/SSIDsecret, không spamlogmỗi5ms.

## 5. Host regression — không phần cứng

```powershell
cd C:\DATN\Project_datn
& .\firmware\tests\run-host-tests.ps1 -Compiler 'C:\Program Files (x86)\Dev-Cpp\MinGW64\bin\g++.exe'
```

Artifact `report/phase13_4d-host-tests.log`:

| Nhóm | Kết quả |
| --- | --- |
| Controller/parser/serializer |36 PASS |
| Sensor diagnostics/delivery/networklease |18 PASS |
| OFFschedule |5checks PASS |
| SNTP mới |24/24 PASS |
| C++JSON thực → backend validators/gatewayfake |6/6 PASS |

24SNTPtests bao phủstartup/callback,1h/2hexpiry,backoff/cooldown,unreachableDNS/server môphỏng khôngcallback,WiFireconnect,MQTTreconnectkhôngảnhhưởngSNTP,stoppedinitrequest,millisrollover,late/duplicatecallback,invalidUTC,jump/rollback,khôngretimestamp/khônggửigenerationcũ,GPIOsimulatedOFF vàprotocolguards. DNSfailure là mock absenceofcallback, không phải liveDNStest; concurrency callback/criticalsection trênESP32 không thể nghiệmthu từhosttestthuần.

Backend offline suites (không integration5432/55433): **408/408 PASS**,0FAIL/0SKIP; `tsc --noEmit` PASS. TAP: `report/phase13_4d-backend-tests.tap`. Không UIchange nên không chạy browserE2E mới. Không thay persistence/readiness đãPASS.

## 6. Compile cuối — không upload

```powershell
& 'C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe' compile --fqbn esp32:esp32:esp32 --build-property 'upload.speed=115200' --build-path 'C:\DATN\Project_datn\build\esp32-phase13-4d-local' 'C:\DATN\Project_datn\firmware\SmartAgricultureESP32'
```

**PASS exit0**, localconfighiện tại, không macroexample, không upload/monitor/EN. Core3.3.12/IDF5.5.5; sketch967870bytes(73%), staticglobals60620bytes(18%). Application.bin968016bytes; không nhầm bytesđónggói với sketchsize. Taskstackallocations không nằm hết trongstaticglobal statistic.

```text
SHA256 application.bin
441E33EE9B9B4064401819A2156CFBE59A3C898E495C80A689F048B1694EEE5D
```

Builddirectory mới, không ghiđèoldENABLED/DISABLED artifacts. Buildlocal chứa secrets trong header/binary: **không commit/chia sẻ**. Chỉ publichashfirmware, không inpassword/token/hashpassword.

## 7. Runtime cuối và giới hạn diagnostic

Read-only snapshot05:46:28.871Z (12:46UTC+7): commandsfalse, automationfalse, testModetrue, PENDING0, tổngcommand43khôngđổi, nofreshreceipt/OFF. BackendclockHEALTHYngắn hạn offset−31.166ms, không chứng minh ESP32SNTP. Observer vẫnsession13.4A, không restart.

Probe táisửdụng source13.4C trong bộ nhớ, chỉ đổi outputdir thành`report/phase13_4d`; auth/GET/SELECT đã trả và lưu `readonly-review.json`, nhưng **process kết thúc exit−1073741819 (Windows0xC0000005)**. Không đánh dấu toànprobePASS; nguyên nhân exitnative chưa xác minh, không sửa Node/Prisma production để xửlý ngoài phạmvi. Sau đó diagnosticSELECT bìnhthường `node build/phase12d3d-result-readonly.cjs` chạy **exit0** lúc05:47:06.733Z: PENDING0, haiONvậtlý cũ khôngđổi; DB vẫnOFFlịchsử05:00:39.402Z vàreadings05:00:38.285Z. Đây không phải lỗighiSQL hoặc bằngchứngOFFmới.

GET cuối **05:48:59.853Z (12:48UTC+7)**: ONLINE/lastSeen05:48:55.130Z, relayUNKNOWN, controlEnabledfalse/gatewayDISABLED; bốnreadingscũ khôngđổi. Chưa telemetryrecovery vì **chưa flash**. PostgreSQL5432PID7848, backend5000PID3572 vàMosquittoLAN1340 giữ nguyên; test55433 khônglisten. Không tạoDeviceCommand/readinggiả, khôngmigration, khôngtácđộngadapter.

## 8. Rollback và gate trước phê duyệt flash

1. **Chưa được flash từ task này.** Cần người dùng phê duyệt riêng, xác nhận adapter5Vrútđiện/ESP32USB và đúngboard/COM. Không mởSerialMonitor tranhCOM hoặc kéoDTR/RTS/EN trong phaseđiềutra.
2. Xác minh false/false/testtrue vàPENDING0 tạiđúngbackendprocess, backupsource/config cósecrets ởthưmụcbảovệ ngoàiGit, hashbinary và manifestlibrary/core/FQBN. Không giảđịnhbackups cũ làconfigcurrent.
3. **Cảnh báo config:** so với `build/esp32-phase12d3a-enabled/sketch/config.local.h`, configlocalhiện tại khác ở keyWIFI_PASSWORD. Task này không sửa keyđó (kiểmtra bấtbiếnPASS); không ingiátrị. Có thể làthayđổimạngđãcóchủý trướcđây, chưa đủbằngchứng kếtluậnsai. Trướcflash phải người vận hành xácnhậnfilelocalđúngWiFihiện tại, không gửimật khẩuqua chat. Không dùngkiểmtra“chỉsourceNTPđổi so vớiartifactold” để bỏqua khácbiệtconfig.
4. ArtifactrollbackDISABLED `build/esp32-phase12d2b-local/SmartAgricultureESP32.ino.bin` còn nguyên, SHA256 `D33D99433844DA869AEE9BDF86875544A8902C8082F69DF78DA3807F3CAA1BFB`. OldENABLED13.4Dtrướcfix còn ở`build/esp32-phase12d3a-enabled`; sourceoldino.cpp/headerstored ởbuildsketch, cósecrets nênkhôngchia sẻ. Networkconfigold cóthểkhôngcònđúngWiFi hiện tại; rollbackbinary cần review riêng.
5. Source rollback: phục hồi `.ino` từbackupreviewed, bỏSntpRecoveryinclude/worker/generationhooks vàtestaddition; khôngrestoreconfigmùquáng, không đụngDB. Rollbacksource không thaybinaryđangchạy. Nếu đãflashvềsau cólỗi, giữadapterngắt/backendkhóa và dùngbinaryDISABLED phùhợp saupermissionreview; không tựupload trongphasehiệntại.
6. Nghiệmthusauflashđượcduyệt: BOOT13.4D/GPIOOFF, SNTPinterval1800000/expiry7200000, callbackcounttăng vàreasonOK, WiFi/MQTT/NTPready. Chỉ mẫuđo **saucallback** được publish; đối chiếu2–3batch bốnMQTTreadingsvớiDB/API vàOFFPERIODICmới. Commands/Automationfalse,PENDING0. KhôngsendON/OFF để“testkếtnối”.
7. Recoverycaseserverunreachable/DNS/WiFireconnectphải cótestphầncứng riêng vớiadapterngắt, khôngtạooútagebằngbrokerrestart. Không nạpbuildrútngắnexpiryguard vào productionchỉđể test; fakeclockhostđãmôphỏng2h. Vềsauquan sátcallbackrefresh tựđộng thực tế vàheap/stack/logkhôngnghẽn trướcnghiệmthureliability dài hạn; compile/hostPASSkhôngthaybằngchứngnày.

**Điểm dừng:** sourcefix vàcompileREADY; flash, SNTPUDPtrafficthực, callbackrefresh/recoveryvàtelemetrykhôi phục trênESP32 mới **NOT VERIFIED**. Không tựchuyểnACTIVE/VERIFIED_LIVE hoặc thửbơm.
