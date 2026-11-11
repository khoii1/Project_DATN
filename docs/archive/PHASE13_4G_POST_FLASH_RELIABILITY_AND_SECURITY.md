# Phase13.4G — Post-flash reliability & credential security

Ngày21/10/2026. Các timestamp bên dưới là UTC; Việt Nam=UTC+7. Chỉ GET/SELECT và đọc source/config/log có sẵn; không mở COM hoặc tác động thiết bị/dịch vụ.

```text
POST_FLASH_CURRENT_RUNTIME_PASS (OBSERVED_WINDOW_ONLY)
SHORT_ON_DEVICE_STABILITY_PASS (HISTORICAL_260_SECOND_CAPTURE)
EXTENDED_TELEMETRY_CONTINUITY_PASS (61 batches / 15 minutes)
SNTP_PERIODIC_REFRESH_NOT_VERIFIED
SNTP_FAILURE_RECOVERY_NOT_VERIFIED
LONG_TERM_DEVICE_STABILITY_NOT_VERIFIED
CREDENTIAL_EXPOSURE_RISK_OPEN
CREDENTIAL_ROTATION_NOT_PERFORMED
PRODUCTION_LEDGER_TABLES_NOT_IMPLEMENTED
VERIFIED_LIVE_NOT_READY
AUTOMATION_ACTIVE=false
PHYSICAL_PUMP_NOT_TRIGGERED
```

## 1. Runtime hiện tại và đối chiếu PostgreSQL/API

`build/phase13-4g-review.cjs` sử dụng đăng nhập hợp lệ hiện có (token chỉ giữ trong bộ nhớ), GET các endpoint:

- `/api/live-evidence?deviceId=demo_device_esp32_a`.
- `/api/devices/demo_device_esp32_a/latest-readings`.
- `/api/actuators/demo_actuator_pump_a`.

SELECT được bao trong transaction READ ONLY. Diagnostic exit0; artifact `report/phase13_4g/readonly-review.json` không chứa credentials/token. Không nhập evaluator production, phát MQTT hoặc tạo command.

| API checkedAt | readings recordedAt | TEMP / HUM / LIGHT / SOIL | Tuổi readings | PERIODIC OFF / tuổi |
| --- | --- | --- | --- | --- |
|11:02:39.191Z|11:02:24.588Z|31.30 /63.30 /2.50 /26.09|14.603s|11:02:38.659Z /0.532s|
|11:02:55.392Z|11:02:54.588Z|31.30 /63.30 /2.50 /26.39|0.804s|11:02:53.726Z /1.666s|
|11:03:15.799Z|11:03:09.588Z|31.30 /63.30 /2.50 /26.19|6.211s|11:03:08.870Z /6.929s|

Trong cả ba snapshot: **ONLINE**, bốn API readings khớp giá trị/timestamp/sourceMQTT với PostgreSQL; OFF mới do observer nhận và DB/API đối chiếu. Không sử dụng OFF lịch sử. GatewayDISABLED/controlEnabledfalse; Commandsfalse/Automationfalse/TestModetrue; PENDING0/tổngDeviceCommand43, không command mới. Broker1883LANPID13960, backend5000PID3572, productionPG5432PID7848 giữ nguyên. Có ESTABLISHED backend→broker172.20.10.2:1883; receipt telemetry/OFF mới là bằng chứng MQTT thực, không chỉ TCP listener.

Windows clock adapter HEALTHY **ngắn hạn**, LastSyncError0, Leap0, Stratum5, source0x8, offset khoảng−61.13→−51.34ms trong snapshot. Không đổi Windows Time; không nâng thành ổn định dài hạn hoặc suy ra clock ESP32 vừa refresh.

Các GET chạy song song không tạo snapshot nguyên tử giữa endpoint: ở lượt đầu actuatorGET còn stateAt11:02:23.524Z, trong khi live-evidence (sau refresh clock) đã nhận OFF11:02:38.659Z. Hai lượt sau actuatorGET/live-evidence cùng timestamp. Live-evidence tự đối chiếu OFF với DB trong transaction đọc của chính request. Không gọi chênh lệch lượt đầu là lỗi trạng thái hoặc khẳng định mọi endpoint trả cùng timestamp tại cùng một thời điểm.

### Log Serial#49 người dùng cung cấp

Không mở Serial từ agent. Người dùng gửi sample#49 recordedAt **11:01:24.588Z**: TEMP31.30/HUM63.10/LIGHT2.50/SOIL25.84, rawADC2985/min2958/max2996, TIME_AT_SAMPLE SYNCED, WiFi/MQTTCONNECTED, NTP SYNCED, PUMP_COMMANDSENABLED, RELAYOFF, PUBACK151ms.

SELECT xác nhận **cả4reading nguồnMQTT** của timestamp này đã lưu, receivedAt11:01:25.052Z. Ví dụ SOILreadingId `cmvi04yik03l5umr83csub6m0`; đủ4ids trong artifact. RawADC/minmax là thông tin Serial người dùng, **không được ghép thành metadata MQTT đã xác thực hoặc tự ghi vào DB**.

### Cadence sau nạp

SELECT11:04:35.139Z kiểm tra từ boot13.4F.1:

- **61batch**, từ10:49:24.588Z đến11:04:24.588Z, trải15phút.
- Mỗi batch đúng4readings, tức244hàng trong phạm vi query.
- Khoảng cách lớn nhất15.001s; không thấy khoảng trống telemetry trong tập này.
- `report/phase13_4g/continuity-corrected.json` ghi số liệu và kiểu cột timestamp.

Đây là bằng chứng dữ liệu tiếp tục được lưu sau nạp, **không phải continuous Serial crash monitor15phút**. Không suy ra tuyệt đối không reboot hoặc safetyTask đáp ứng mọi deadline chỉ từ cadence.

Lưu ý diagnostic: query cadence đầu dùng timestamptz so với cột Prisma `timestamp without time zone` dẫn đến cast theo sessiontimezone và trả0 sai phạm vi. Đã kiểm tra type và sửa **query đọc**, dùng TIMESTAMP UTC-naive cùng kiểu cột; không sửa clock/DB. Artifact đầu `continuity-and-catalog.json` được giữ làm lịch sử, số0 **không phải mất dữ liệu**. Dùng bảncorrected cho kết luận.

## 2. Firmware và SNTP reliability

Version13.4F.1 dựa trên **bằng chứng flash/boot13.4F.2**, hash application còn đúng `D3297B343D9B6B2ED2BAF4B8B03FBC3292A51354D51018746A8863771723A82A`, config vẫn khớp artifact. Không flash/reset/compile trong phase này. Đây không phải remote attestation firmware hiện hành; không có bản version ký trong telemetry.

Log được capture trước đây10:49:09.429→10:53:29.499Z đã nghiệm thu260.05s, không abort/Guru/WDT/reboot. Initial callback10:49:11.806Z;8worker snapshots đếnmillis240287 đều callback_count1/clockRELIABLE/reasonOK, interval1800000ms/expiry7200000ms. Source `SntpRecovery.h` giữ backoff có giới hạn, không nới timestamp/failsafe.

Log người dùng#49 hiện tại không có dòngworker `SNTP:`/callback_count/last_callback_age. NTP SYNCED chỉ cho biết firmware coi lease clock hợp lệ tại lần đo, **không chứng minh callback mới vừa xảy ra**. Chưa đủ30phút kể từ initialsync trong các bằng chứng hiện có, không mở COM hoặc chờ thêm45–60phút để ép nghiệm thu.

| SNTP/reliability gate | Kết quả |
| --- | --- |
| Initial sync sau flash, interval30phút/expiry2giờ cấu hình | PASS, bằng chứng13.4F.2 |
| Telemetry sau~15phút vẫn liên tục | PASS trong phạm vi SELECT |
| Callback refresh30phút mới | NOT_VERIFIED |
| Last successful ESP32sync sau initialcallback | NOT_VERIFIED; không lấy Windowslastsync thay thế |
| Backoff lúc server/DNSfailure thực | NOT_VERIFIED; chỉ có source/host tests lịch sử |
| Expiry/recovery thực tế không reset | NOT_VERIFIED |
| Abort/reboot trong260s capture trước | Không phát hiện, PASS ngắn hạn |
| Abort/reboot sau capture đến hiện tại | Không có continuousSerial, NOT_VERIFIED tuyệt đối |
| Heap/stackwatermark/safetyTasklatency | NOT_VERIFIED, không có instrumentation tương ứng |

Không tạo outage hoặc reset để thử. Nếu sau này người dùng có logworker ởSerial đang mở sẵn, đối chiếu callback_count tăng, age giảm, measuredtime/receivedAt; cần phân biệt callbackrefresh với reboot hoặc init lại SNTP. Không bắt buộc thêmmonitor dài trong phase này.

## 3. Phạm vi phơi lộ credentials

Sự cố13.4F.1 đã hiển thị config firmware trong assertion tool-output. **WiFi password và MQTTdevice password phải coi là đã lộ**, dù không tìm thấy chúng trong file log/báo cáo. Không tái in giá trị, hashpassword hoặc configđầyđủ.

So sánh trong bộ nhớ cho thấy:

- Device/backend là **haiMQTTprincipal khác nhau**.
- Mật khẩu backend hiện tại **khác** MQTTdevice và WiFipassword đã lộ.
- Chưa có bằng chứng mật khẩu backend trực tiếp xuất hiện trong sự cố configfirmware. Không đủ cơ sở nói backend credential chắc chắn không bị lộ qua mọi kênh khác.
- Kiểm tra269tracked files,67docs/report artifacts,24localbuildlogs: không có candidate literal của các mật khẩu hiện tại theo scanner. Phạm vi chỉ chuỗi cóquote/passwordliteral, không phủ mọi encoding/secret lịch sử/binary. Không đọc passwordfile ra output hoặc hash file đó.
- Config/header/binary cục bộ chứa secrets theo thiết kế, không được chia sẻ hoặc commit. Tool-output cũ không được xóa để che bằng chứng. Không thay credentials trong phase này.

Broker file đọc tại `C:/mosquitto/config/mosquitto.conf` có listener1883/anonymousfalse/passwordfile/ACL như baseline; đọcACL xác nhận haiaccount và patterns. Không đọc được ExecutablePath/CommandLine của PID13960 bằng CIM trong quyền hiện tại, nên **đườngconfig đang nạp/in-memory policy chưa được attestation độc lập**. Backend dùngMQTT thường và firmwareWiFiClient, chưa có bằng chứng transportTLS cho luồng hiện tại. Account/password không đồng nghĩa publisherproof từng packet; [Mosquitto hướng dẫn dùng encryption để tránh lộ username/password trên mạng](https://mosquitto.org/man/mosquitto-conf-5.html).

## 4. Kế hoạch rotate — CHƯA THỰC HIỆN

Ưu tiênMQTTdevice+WiFi đã lộ; backend chỉ coi confirmed-affected nếu phát hiện reuse/đườngphơi lộ khác, nhưng có thể rotate dự phòng trong cửa sổ bảo trì riêng. Không gộp mọi thay đổi cùng lúc mà không có checkpoint. Một firmware chỉ có mộtWiFipassword và mộtMQTTpassword nên **không hứa zero-downtime**: mục tiêu là khoảnggiánđoạn có kếhoạch, có recovery và vẫn khóa bơm.

### A. Chuẩn bị và phê duyệt riêng

1. Giữ adapterngắt, Commands/Automationfalse, TestModetrue/PENDING0. Kiểm kê đúngLANbroker/process/config và phương thức reload/restart hỗ trợ trên Windows; không mặc định UnixSIGHUP dùng được. Xác minh quyền thao tác trước cửa sổ.
2. Người dùng tạo mật khẩu mới riêng biệt cho từngprincipal bằng công cụ bảo mật cục bộ, không gửi quachat/CLIargument/log. Backup config/passwordfile/ACL/source/binary vào thư mục bảo vệ ngoàiGit; không chia sẻ passwordfile/hash. Giữ evidence cũ, hạn chế quyền truy cập.
3. Chuẩn bị build config mới và rollbackDISABLED phù hợp **mạng/credentials dự kiến saucutover**, compile/hash/manifest/test trước. Mọi lần flash phải được phê duyệt riêng. Bảnrollback13.4E mạngcũ có thể không còn kết nối được saurotation; không dùng như phương án khôi phục mạng đã chắc chắn hoạt động.

### B. MQTTdevice — giữ username binding

1. Ưu tiên giữ username `ESP32-GF-A-01` vànamespace hiện tại, chỉ đổi password sau approval. ACLdùng `%u` theo **username**, không phảiClientId; không tự tạo username “-next” rồi mong topiccũ vẫn được phép. Nếu cần overlapping old/newprincipal để giảm downtime, phải thiết kế bindingACL riêng và xin phê duyệt ACL trước, không thực hiện ngầm. [Mosquitto ACL semantics](https://mosquitto.org/man/mosquitto-conf-5.html).
2. Stagefirmware có passwordmới, chưaflash. Tại cửa sổ được duyệt, cập nhật riêng accountdevice trong passwordfile bằng cách nhập tương tác, không `-b`/passwordCLI, **không `-c` lên file hiện hữu** vì có thể ghi đè tài khoản khác. Áp dụng/reload đúngbroker bằng phương thức đã xác minh, rồi flashartifact được duyệt; khoảngreconnect/mất dữ liệu tạm phải được thông báo trước. [mosquitto_passwd chính thức](https://mosquitto.org/man/mosquitto_passwd-1.html).
3. Đối chiếuSerial→MQTT→PG→API,3batch/3OFF mới, flagsfalse/PENDING0. Xác minh credentialcũ bị từ chối bằng kết nối test không publish sau approval. Không coi client hiện vẫn CONNECTED là credentialcũ đã được thu hồi: phải kiểm tra policy reload, auth tại reconnect và các connection/session đang mở; không tự disconnect production trong phase này.
4. Nếu thất bại: giữ bơmkhóa, thu lỗi và dừng. Có thể cấp credentialphục hồi mới cùng artifact tương ứng sau approval; không tự phục hồi mật khẩu đã lộ hoặc nạp lại binarycũ chứa mật khẩu đó chỉ để làm ONLINE.

### C. Backend credential — chỉ khi được quyết định rotate

Stage secret mới ở backend cấu hình bảo vệ; tại cửa sổ được duyệt update đúngaccountbackend trên broker và nạp env/restart đúngbackendprocess theo thứ tự có kếhoạch. Giữ accountdevice/ACL bất biến nếu không có approvalkhác. Sau reload, UNKNOWN là hợp lệ cho đến OFF mới; xác minh broker connection/reading/OFF và disableflags tại process mới. Không restore OFFlịchsử. Cần phép riêng cho passwordfile và backendrestart.

### D. WiFi credential — người dùng điều khiển mạng

Xác định đúngAP/hotspot do người dùng quản lý. Chuẩn bị firmwarehash/rollback với mật khẩuWiFimới trước khi đổiAP. Người dùng đổi mật khẩu tại cửa sổ đã duyệt rồi flashartifact tương ứng hoặc phối hợp thứtự đã công bố; dự kiến cảPC/ESP32 có thể cần reconnect. Xác minh IPv4PC/brokerreachable; nếuIPđổi phải chuẩn bị MQTT_HOST mới trong build/phêduyệt, không tự đổiIP/firmware. Không gửiWiFipassword quachat. Có thể táchrotationMQTT vàWiFi thành hai cửa sổ để xác định rõ nguyên nhân; mỗibuild/flash có hash/approval riêng.

Không nớianonymous/ACL hoặc bậtcommands để thửkếtnối. TLS/identity/provisioning là hạngmục bảo mật riêng; rotationpassword không tự bổ sung publisherassurance.

## 5. Readiness cho bước tiếp theo

Production SQL identity: **smart_agriculture / public /5432**, serverstart2026-10-16T05:13:43.656Z. Catalog `pg_class/pg_namespace` vàinformation_schema không có sáu bảngledger. Không chạyDDL/migration hoặc khởi độngtestcluster55433.

| Gate | Trạng thái | Bằng chứng/khoảng trống |
| --- | --- | --- |
|MQTTreceipt→PG→API/readingsfresh|PASS tại snapshot|Bađợt12readings khớp; observerreceipts mới|
|Devicepresence/freshPERIODICOFF|PASS tại snapshot|ONLINE, OFFage0.532–6.929s, QoS1/nonretained/nondup|
|Backenddisabled/PENDING0|PASS|false/false/testtrue, commandcount43|
|Windowsclockhealth|PASS ngắn hạn|LastSyncError0/Leap0/offset nhỏ; không long-term|
|Firmware13.4F.1 flash/boot|PASS lịch sử cólog/hash|Không phải remoteattestation hiện tại|
|SNTPperiodicrefresh/failurerecovery|NOT_VERIFIED|Không có callbackmới; không mởCOM|
|Credentialrotation/revocation|NOT_VERIFIED, rủiromở|DeviceMQTT/WiFiđãlộ, chưarotate|
|Publisherassuranceadapter|NOT_IMPLEMENTED production|CurrentassuranceNOT_VERIFIED; policyoffline có nhưng không cótrusted attestation/proofadapter|
|Authenticateddeviceboot/session vàdurablereplaycursor|NOT_IMPLEMENTED production|Chỉ backendobservergeneration6; telemetryv1khôngbootId/sequence/proof|
|SOILcalibration/qualitymetadata live|NOT_VERIFIED; metadataadapterNOT_IMPLEMENTED|Có%/SerialrawADC, không cóapprovedcalibrationversion/rawADC/contacthealth trong MQTTv1|
|Productionpolicyversion/trustedsnapshotadapter|NOT_IMPLEMENTED|Assemblerpolicy/cycle/budget/safety/snapshot/decision=null|
|Sáu productionledgers|NOT_IMPLEMENTED|Catalogkhôngcó6bảng, testDBPASS không thay production|
|Durablebudget/reservation/safety/idempotency trênproduction|NOT_IMPLEMENTED|PostgresTestIrrigationRepository chỉ ISOLATED_TEST; không productionwiring|
|Persistentemergencystop/manualoverride/restarttrustedrecovery|NOT_IMPLEMENTED/NOT_VERIFIED|Flag/RAMobserver không thay durablelatch hoặc recovery đầyđủ|
|VERIFIED_LIVEgate|NOT_READY|APIverifiedLiveReadyfalse/engineCalledfalse, không nângtrust|

Sáu bảng thiếu: `irrigation_cycles`, `irrigation_decision_logs`, `irrigation_daily_budgets`, `irrigation_budget_reservations`, `irrigation_command_intents`, `irrigation_safety_states`.

Nguồn source:

- `backend/src/routes/live-evidence.route.ts`: auth/farmscope, GET và transactionREADONLY, receiptDB/offcorrelation.
- `backend/src/services/live-provenance/evidence-store.ts`: observerRAM/session/replayTTL, NOT_VERIFIEDpublisher; generation6 không phải ESP32bootidentity.
- `backend/src/services/live-provenance/snapshot-assembler.ts`: hard-closed modeLIVE_OBSERVED_NOT_VERIFIED, policy/cycle/budget/safety/snapshot/decision=null, không gọiengine.
- `backend/src/services/live-readiness/{identity-policy,soil-quality,readiness-policy}.ts`: pure/offline policies, không cóproductionadapter; readiness luônfalse kể cảfixturesallPASS.
- `backend/src/services/irrigation-persistence/postgres-test.repository.ts`: chỉSHADOW/ISOLATED_TEST, guard bắtbuộc55433/testDB/appRole, không dùng cho production5432.
- `backend/prisma/proposals/irrigation-persistence.prisma`: sáu modelproposal; test38/38Phase13.3B làhistoricaltestcluster, không deployproduction.
- `backend/src/mqtt/mqtt-message.schema.ts` và `firmware/SmartAgricultureESP32/PumpProtocol.h:130–132`: v1strict chỉ schemaVersion/deviceCode/recordedAt/readings(sensorCode,value), không tự thêmrawADC/bootId/calibration vào v1.

Không nângtrust bằngSerial người dùng, fixture, PUBACK, OFF hoặc historicaltest. Publisherbinding/transport/rotation/deviceproof, SOILapprovedquality vàproductiondurableadapters cần thiết kế/duyệt riêng trước khi chuyểnVERIFIED_LIVE. Việc migrationproduction cũng cầnbackup/review/approval riêng, không nằm trong phase này.

## 6. Kết luận và điểm dừng

Runtime đang hoạt động tốt tại các snapshot và dữ liệu liên tục15phút; giữ **PASS ngắn hạn**, chưa hứa ổn định dài hạn hoặc SNTPrefresh/recoveryPASS. Credentialrisk chưa được xửlý bằngrotation; bước tiếp theo phù hợp là **phê duyệt kế hoạch bảo mật và contract/provenance**, không phảiACTIVEautomation hoặc thửbơm.

Không sửafirmware/config/backend/broker/ACL/credentials/PG. Chỉ thêm helperdiagnostic/report/evidence; không xóa log. Không mởCOM, reset/flash, restartservice, tạooutage hoặc ON/OFF. Adapter bơm tiếp tục ngắt theo xác nhận trước đó/yêu cầu duy trì; không có phép đo nguồn độc lập. Không triển khai lại các regression đãPASS hoặc monitor45–60phút.
