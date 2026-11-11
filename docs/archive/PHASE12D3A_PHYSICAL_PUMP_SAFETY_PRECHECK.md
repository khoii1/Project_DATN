# Phase 12D.3A — Safety precheck và chuẩn bị thử bơm 1 giây

Ngày18/10/2026, khoảng14:44–14:50 UTC+7. **Kết luận: NOT READY để chạy bơm vật lý.** Phần mềm/fail-safe nominal và regression đạt; checklist điện/cơ khí chưa được xác minh trực tiếp, chưa có phê duyệt A hoặc B. Đây là kết quả precheck, không phải cho phép flash, cấp nguồn hoặc gửi ON.

Trong Phase này: **không đổi source/config production, không bật feature flag, không compile/upload firmware board, không gửi ON/OFF, không cấp nguồn adapter, không restart backend/ESP32, không migration hoặc sửa trực tiếp DB**. Chỉ tạo báo cáo, đọc source/config/log/SELECT/API và chạy test offline. Compile native host tests chỉ tạo executable fake GPIO, không phải nạp ESP32.

## 1. Trạng thái hiện tại và bằng chứng

| Hạng mục | Bằng chứng | Đánh giá |
| --- | --- | --- |
| Firmware source | Version12D.2, local ENABLE_PUMP_COMMANDS=false, RELAY_PIN26, MAX_PUMP_SECONDS5 | PASS source |
| Config local không đổi | SHA256 FD1F8D856EF2D1478BC2BFFDF1E5C7227BD2BFB8F8B89B1DBE9198497776BD3E, khớp12D.2B | PASS |
| Binary đang nạp | Upload hash verified trong12D.2B; không nạp lại; PERIODIC tiếp tục được nhận | Có bằng chứng lịch sử và hành vi live; không đọc flash/boot banner mới trong12D.3A |
| Backend đang chạy đúng source | PID4200, start07:12:29Z, command line Node/tsx `src/server.ts`, không dist cũ | PASS |
| Backend flags | Diagnostic commands=false/automation=false; authenticated API gatewayModeDISABLED/controlEnabledfalse | PASS khóa runtime |
| Pending | SELECT14:47:09 pending0; latest command vẫn16/10 | PASS |
| Presence/state | DeviceONLINE; PUMP_01OFF với timestamp mới, không OFF lịch sử | PASS live |
| Telemetry | Đủ4 MQTT readings mới, LIGHT0 được giữ nguyên | PASS live |
| Adapter/wiring/relay contact/motor/flow | Người dùng nói adapter đang rút; không có đo điện/ảnh/checklist mới tại chỗ | NOT VERIFIED độc lập |

SELECT READ ONLY **2026-10-18T07:47:09.740Z**:

- DeviceONLINE, lastSeen07:47:07.536Z; PUMP_01OFF, lastStateChangedAt07:47:05.380Z.
- Bốn SensorReading sourceMQTT, recordedAt07:47:07.000Z/receivedAt07:47:07.541Z: TEMP25.1/HUM52.9/SOIL11.79/LIGHT0.
- 0PENDING; health HTTP200/database và MQTTconnected. Không có command mới trong Phase này.

Bàn giao14:50:21.576: DeviceONLINE/lastSeen07:50:08.448Z, PUMP_01OFF/stateAt07:50:07.893Z, pending0; hai flagsfalse/testModetrue theo diagnostic, health200. Windows query14:50:19 vẫnLeap0/Stratum5/lastSync14:35:25. Các trạng thái này là snapshot, phải kiểm tra lại sát phiên được phê duyệt.

Observer subscribe-only cùng API GET xác minh OFF/PERIODIC recordedAt07:45:34.377Z (nhận07:45:34.947Z) và07:45:49.530Z (nhận07:45:50.206Z), QoS1/non-retained/non-DUP; API stateAt khớp. Không publish bản tin thử hoặc giả OFF. Harness đăng nhập owner theo cơ chế hợp lệ hiện có, chỉ tạo activity log đăng nhập bình thường; không tự ký token/bypass RBAC.

## 2. Firmware safety review

Nguồn: `firmware/SmartAgricultureESP32/SmartAgricultureESP32.ino`, `PumpProtocol.h`, `FirmwareDiagnostics.h`, `OffStateSchedule.h`, local config (chỉ kiểm tra các giá trị an toàn, không in secrets).

| Yêu cầu | Cơ chế thực tế | Đánh giá |
| --- | --- | --- |
| Boot OFF | setup ghi GPIO26LOW trước/sau set direction, constructor PumpController ghiLOW; tasksReady đòi confirmedOff | PASS source/host test; xung điện trong reset NOT VERIFIED |
| HIGH=ON, LOW=OFF | writeRelay(on) dùng mức1/0 và readback, fail LOW khi write/readback không khớp | PASS source; cực kích hoạt relay thật dựa kết quả người dùng trước đó, cần checklist mới |
| Khóa điều khiển | PumpController.enabled=false và guard độc lập writeRelay không cho on nếu ENABLE_PUMP_COMMANDSfalse | PASS source/host |
| Không ON tự động | Không có boot/reconnect path gọi applyON; mọi HIGH đi qua guarded controller | PASS source |
| Retained/cũ | Callback từ chối retained/wrong QoS/topic/oversize; clean session; sessionFloor, expiry, high-water, UUID cache | PASS source/host |
| Duplicate | Cùng UUID không lặp HIGH hoặc gia hạn deadline; đổi body/replay đã hoàn tất bị từ chối; cache đầy từ chối ON | PASS host |
| Expired/timestamp | Expired ON bị từ chối, FUTURE_COMMAND2s, clockReady bắt buộc | PASS host |
| Mất Wi-Fi/MQTT | safetyTask riêng core0, priority4, kiểm tra5ms; Wi-Fi event/loop forceOff; network lease250ms; loss báo pendingOFF/reconnect | PASS logic/host, không đo RF/FreeRTOS điện thực |
| Timer độc lập NTP | unsigned uint32_t(millis-started) >= seconds*1000; wrap test; NTP không kéo dài runtime | PASS host |
| Ưu tiên OFF | OFF well-formed/addressed gọi forceOff trước clock/expiry gate; high-water ngăn ON cũ; backend OFF supersede PENDING ON | PASS host/backend mocks |
| ACK | APPLIED chỉ sau write/readback thành công; queue ACK ra ngoài MQTT callback; không publish đệ quy trong callback | PASS source/contract tests |
| Báo OFF | confirmedOff + reliableClock; event MAX_RUNTIME/COMMAND/loss/BOOT và PERIODIC15s; UTC mới/QoS1/retainfalse | PASS source, PERIODIC live |

### Hành vi khi bơm đang ON (chỉ phân tích, không thử thật)

| Sự cố | Firmware làm gì | Backend/UI có thể xác nhận gì |
| --- | --- | --- |
| ESP32 reboot | setup/controller yêu cầuLOW, không replayON; BOOT OFF sau khi có mạng/UTC | UNKNOWN cho tới OFF mới; reset electrical transient/relay contact không được bảo đảm chỉ bằng source |
| Broker/mạng mất | Wi-Fi event hoặc safety task phát hiện link/lease lỗi, yêu cầuLOW; reconnect giữOFF, xóa queue cũ | Có thể chưa nhận OFF vì mất đường truyền; phải UNKNOWN/chưa xác nhận, không giả OFF |
| Kết nối TCP còn nhưng broker im lặng | KhiON probe200ms, lease250ms kiểm tra ở task riêng; publish chậm/stall gây fail-safe | Có thể cắt trước1s; không nới lease để làm testPASS |
| Backend ACK_TIMEOUT hoặc backend chết | Firmware không cần backend để tick deadline1s; timeout backend không phải lệnh OFF | CommandFAILED/UNKNOWN, không retryON; OFF mới xác nhận riêng khi đường truyền còn hoạt động |
| NTP mất hiệu lực khiON | Task safety yêu cầuLOW; không invent timestamp để báo thành công | OFF GPIO có thể không gửi được cho tới NTP/mạng phục hồi |
| GPIO driver/readback thất bại | Fault không reportOff, chặn ON tiếp; task thử LOW lại khi chưa confirmedOff | Không được coi software intent là GPIOLOW thực; người trực phải ngắt adapter |

Không thấy đường **ON hợp lệ** trong source bỏ qua việc đăng ký runtime/deadline. Tuy nhiên **không thể cam kết GPIO HIGH không bao giờ kéo dài dưới mọi lỗi**: CPU/RTOS treo, driver hỏng, chân điện không kiểm soát hoặc tiếp điểm relay dính nằm ngoài chứng minh host tests. Chưa có chứng minh bộ cắt nguồn độc lập trong phần cứng. Không xem watchdog phần mềm/5s cap là chứng nhận chống mọi fault.

Task safety5ms cho cutoff tại lần tick đầu tiên đạt deadline, không phải hệ realtime được chứng nhận. `maxRunSeconds=1` là deadline nominal1000ms từ nhận/apply, **chưa bảo đảm độ rộng xung vật lý ≤1.000s tuyệt đối**: còn scheduling/tick/driver/relay/motor inertia. Nếu tiêu chí là hard bound1.000s cần phương pháp đo và đánh giá riêng, không suy từ giá trị JSON.

## 3. Backend cap1s và xác minh runtime

Source `frontend/src/utils/irrigation-control.ts` → Axios actuatorService.command(): ON có maxRunSeconds1, OFF không runtime; Dashboard và Irrigation cùng service. `pumpPresentation()` chỉ choON khiOFF/ONLINE/available/có quyền/không pending. Không bấm nút để thử payload thật.

Backend `config/env.ts` + `pump-command-policy.ts` + `device-command.service.ts`:

- MQTT_PUMP_TEST_MODE mặc địnhtrue; pumpRuntimeLimit(configured,true)=min(configured,1), không tin client. Không runtime thì default1; 2/5/30 bị400 trước create/publish. Test modefalse cũng không cho vượt server5; firmware có hard cap5 riêng, không đổi.
- `.env` không khai báo testMode/các command flags/expiry/cap, nên defaults lần lượttrue/false/false/10s/5s. Biến Process/User/Machine của agent cũng không khai báo các flag/testMode.
- BackendPID4200 chạy source hiện hữu, file .env/env.ts/policy có trước process start. Diagnostic mới từ cùng workspace/env cho testModetrue; live API xác nhận quyền điều khiểnfalse/DISABLED.
- **Giới hạn bằng chứng:** diagnostic là process đọc cấu hình riêng, API hiện không trả trực tiếp testMode/effectiveMaxRunSeconds từ memory của PID4200. Có bằng chứng mạnh cấu hình/source/test khớp, nhưng **runtime cap attestation trực tiếp: NOT VERIFIED**. Không gửi ON2/5/30—even dự kiến bị từ chối—để vượt giới hạn nhiệm vụ. Trước phê duyệtB cần quan sát metadata/log read-only từ chính backend process trong phiên được duyệt, hoặc bổ sung khả năng quan sát đó với phê duyệt phần mềm riêng; không tự thêm endpoint/debugger ở12D.3A.

Expiry source: issuedAt + mqttCommandExpirySeconds (default10s); firmware chấp nhận cửa sổ expiry tối đa30s, từ chối lúcnow>=expiresAt. ACK gateway chặn timestamp quá sớm so vớiissuedAt−2s, quáfuture so vớireceivedAt+2s, quá30s tuổi, saiID/state/topic và ack nhận sau expiry. **Guard2s không thay đổi.**

Gateway chỉ có commands pending trong memory, không replay khi restart; QoS1 retainfalse, xóa outgoing ON trước reconnect. PUBACK không kết thúcSUCCESS. ACK_REJECTED/ACK_TIMEOUT → FAILED/không confirmedON; frontend không optimisticON từHTTP202. Không auto-retryON; dedup/reconnect testsPASS.

## 4. Xác nhận OFF sau một ON1s — có cơ chế, còn giới hạn

Luồng dự kiến: commandON1s → write/readbackHIGH → ACKAPPLIED(stateON) → monotonic deadline → write/readbackLOW → pendingOffReasonMAX_RUNTIME → `sendOffState()` → backend commitOFF → API/UI. EventMAX_RUNTIME **không cần chờ chu kỳ15s** nếu network loop/clock khỏe; PERIODIC là đồng bộ dự phòng, không phải thời điểm thật GPIO đãLOW.

Chưa thực thi ON thật để kiểm chứng luồng đó. Nếu network/UTC mất, LOW vẫn được yêu cầu nhưng OFF report có thể đến muộn/không đến. Không có report không được suy ra bơm đangON hoặc chắc chắn đãOFF; state phải coi chưa xác nhận và xử lý ngắt nguồn độc lập.

Các giới hạn cần giữ khi nghiệm thu:

1. StateOFF hiện có deviceCode/actuatorCode/reason/recordedAt, **không có commandId**. Trong phiên đúng1ON có thể đối chiếu thời gian/reason và commandID riêng, nhưng không gọi đây là liên kết nhân quả tuyệt đối cóID.
2. `recordedAt` của ACK là lúc decision; OFF recordedAt lấy khi lập/publish báo cáo, không phải timestamp phần cứng cạnhLOW. Không lấy hiệu2 timestamp JSON làm thời gianGPIOHIGH chính xác.
3. Serial hiện inCOMMAND vàFAILSAFE nhưng không cung cấp đủ cặp monotonic cạnhHIGH/LOW cócommandID. Muốn đo độ rộng xung cần thiết bị đo mức logic phù hợp hoặc instrumentation được review/phê duyệt ởgiai đoạn sau. **Không thêm firmware đo hoặc thay dây ởprecheck này.**
4. UI polling2s có thể bỏ lỡ toàn bộ đoạnON1s. Không thấyON trên màn hình không có nghĩa bơm chưa chạy; cũng không cho phép gửiON lần2 để “nhìn cho rõ”.
5. ACKAPPLIED/GPIO readback chỉ là bằng chứng điều khiểnGPIO, **không chứng minh tiếp điểm relay, motor hoặc nước**.

## 5. Windows Time

14:44–14:45: Leap0, Stratum5, peerActive/Mode3, LastSuccessfulSync18/10 14:35:25, LastSyncError0, Hold. Source time.windows.com,0x9/ReferenceIP40.81.94.65. System events mới35/37 lúc14:35:25 xác nhận đồng bộ; không thấy lỗi sync mới trong các event gần nhất đã đọc. PeerPoll17 warning còn hiện, không tự đổi cấu hình.

| Thời gian local | Offset(ms) tới time.windows.com |
| --- | --- |
| 14:44:12–20 | −349.8808, −351.7604, −347.6844, −350.5885, −344.2024 |
| 14:46:13–21 | −347.1026, −342.4523, −348.4481, −345.4284, −339.6713 |

**PASS synchronized ngắn hạn**, offset độ lớn~340–352ms, dưới guard2s; không coi đó là bằng chứng tuyệt đối sai sốUTC lâu dài. Phase12D.2C đã đo nhiều đợt sauresync; hômnay agent không resync/đặt giờ. Nếu đến lúc thử Leap!=0/peerPending/error mới hoặc skew bất thường → **NOT READY và dừng**, không nới guard. ReceivedAt−recordedAt còn gồm network/publish/ingest, không dùng làm clock skew thuần.

## 6. Checklist phần cứng — người dùng phải xác nhận tại chỗ

Tất cả hàng dưới **NOT VERIFIED từ xa ở12D.3A**, giữ adapter rút điện trong kiểm tra. Thông tin relayMKE-M05/HIGHactive/5Vpump từ người dùng và kết quả trước, chưa đo lại điện trong phiên này.

| Mục cần xác nhận trực tiếp | Kết quả người dùng / thời điểm |
| --- | --- |
| Relay control đúngGPIO26, đúng module và logicHIGHON/LOWOFF đã thử | Chưa xác nhận mới |
| Nguồn relay/ESP32 và GND chung đúng sơ đồ đang dùng, không nhầm phần tiếp điểm với điều khiển | Chưa xác nhận mới |
| Bơm dùng adapter5V riêng, đúng định mức theo thiết bị; ESP32USB | Chưa xác nhận mới |
| Đường cấp bơm đi đúngCOM/NO, không dùngNC làm bơm chạy khi relayOFF | Chưa xác nhận mới |
| Cực tính bơm giữ theo kết quả đã thử, không đảo dây theo màu | Chưa xác nhận mới |
| Không dây trần/chạm chập/đầu nối lỏng; không sửa dây khi có điện | Chưa xác nhận mới |
| Bơm/nước được bố trí đúng loại bơm và cách sử dụng đã kiểm tra | Chưa xác nhận mới |
| Adapter/ổ điện/USB/máy tính và khu vực thao tác giữ khô | Chưa xác nhận mới |
| Người trực ở ngay chỗ có thể rút/ngắt adapter độc lập tức thì | Chưa xác nhận mới |
| Người dùng quan sát được motor/nước và có thể ghi hình nếu cần | Chưa xác nhận mới |
| Khi reset/flash, adapter vẫn rút; đánh giá nguy cơ inputrelay nổi/xungboot, tiếp điểm dính | Chưa xác nhận mới |

Không khẳng định module/định mức/cách ngâm bơm chỉ từ tên chungmini5V; không yêu cầu đảo dây hay thay GPIO. Nếu bất kỳ mục không rõ, dừng và xác minh phần cứng, không thửON để dò lỗi.

## 7. Hai mốc phê duyệt riêng — chưa được cấp trong nhiệm vụ này

### A. Phê duyệt chuẩn bị/nạp firmware cho phép điều khiển

Chỉ sau review rủi ro, checklist liên quan và **đồng ý rõ ràng của người dùng**:

1. Xác nhận adapter vẫn rút, đúngESP32/COM, source/config/hash và bản backup không lộ bí mật; kiểm traGPIO26/bootLOW/cap5 và thông tin mạng giữ nguyên.
2. Mới chuẩn bị thay ENABLE_PUMP_COMMANDStrue trong phạm vi phê duyệt. Compile đúngESP32DevModule, kiểm tra guard/fail-safe, upload115200 nếu được phép.
3. Backend commands/automation vẫnfalse; không cấp nguồn bơm, không gửi command.
4. Xác minh binary mới thực sự chạy qua Serial/phiên bản/hash, PUMP_COMMANDSENABLED là thay đổi có kiểm soát, GPIOOFF/NTPsync/telemetry/PERIODICOFF mới. Nếu UNKNOWN hoặc không confirmedOFF, dừng.

**Báo cáo này không thay thế phê duyệtA; không có thay ENABLE/compileboard/flash trong12D.3A.**

### B. Phê duyệt cấp nguồn và đúng một ON từ website

SauA và **phê duyệtB riêng tại thời điểm thử**, người dùng xác nhận phần cứng/nguồn/phương án ngắt độc lập:

- Kiểm tra Windows synchronized/offset, ESP32ONLINE/NTPsync, firmware đúngbinary, OFF mới khôngMOCK/retained, pending0.
- Xác minh testModetrue/effectivecap1 từ backend thực sự dùng trong phiên; giữ automationfalse.
- Chỉ khi được cho phép mới bật riêng backendcommands và reload nếu cần; **sau reload phải chờ PERIODICOFF mới sau startup**, không dùng state trước đó để vượt gate. Không EN nếu firmware đồng bộ đúng.
- Người dùng trực tiếp xác nhận điều kiện trước cấp nguồn; không tự cấp nguồn hoặc mặc định “adapter đã rút trước đây” là đủ xác nhận ởmốcB.
- Mới được đúng1ON quawebsite vớimaxRunSeconds1; commandIDmới, không trực tiếpMQTT hoặc retryON. Không tự gửiOFF thứhai nếu chưa có phạm vi phê duyệt; kế hoạch khẩn cấp có ưu tiên ngắt adapter trước.

Hết phiên phải khóa commandsfalse/automationfalse và verifyruntime; ngắt nguồnadapter; ghi trung thực state sau backendrecovery. Mọi ON thêm, flash hoặc thay giới hạn là phiên phê duyệt khác, không tự suy rộng từA/B.

## 8. Mẫu thu bằng chứng khi phiên thật được phê duyệt

| Trường | Nguồn / tiêu chí |
| --- | --- |
| Session/safety confirmation | Thời điểm người dùng xác nhận phần cứng, nguồn, người trực; phê duyệtA/B |
| CommandID / rowID | UUIDmới từPOSTwebsite; đúngDevice/Actuator |
| issuedAt / sentAt / expiresAt / maxRunSeconds | API/DB và commandMQTT raw; QoS1/retainfalse; maxRunSeconds1 |
| ACKON | APPLIED hợp lệ đúngUUID, recordedAt/acknowledgedAt; PUBACK không thayACK |
| HIGH/LOW thật | Log được review/thiết bị đo hoặc ghi nhận tại chỗ; ghi rõ sai số và phương pháp; hiệnNOTVERIFIED |
| Hết runtime | OFF/MAX_RUNTIME recordedAt mới và backendcommit; nếu chỉPERIODIC thì ghi rõ bằng chứng yếu hơn về nguyên nhân tắt |
| Database/API | Trạng thái command/ack/timestamp và actuatorOFF mới, không sửa tay |
| Website | Polling nhận kết quả đúng; không đòi bắt được mọi đoạnON1s trênUI2s |
| Motor/nước | Người dùng trực tiếp mô tả/video bơm chạy và ngừng, có/không nước; không suy từGPIO |
| Hoàn nguyên | Command/automationfalse, khôngPENDING, nguồnadapterngắt, state sau reload trung thực |

Nghiệm thu phải tách **luồng điều khiển**, **báo cáoOFF**, **thời gianGPIO**, **quan sátmotor/nước**; thiếu mục nào ghiNOTVERIFIED, không gọi tất cảPASS từACK.

## 9. Dừng khẩn cấp và các rủi ro còn lại

1. Nếu bơm không dừng, ON không cóACK đúng, timeout, trạng thái không rõ, rò/chập/nước ở vùng điện hoặc bất thường khác: **người trực ngắt/rút adapter nguồn bơm ngay bằng cách an toàn tại chỗ**, không chờ UI/broker.
2. Dừng thử, không retryON. Khóa backendcommands/automationfalse trong phạm vi phiên được duyệt; không épDBOFF. Nếu không có quyền khóa từ xa, yêu cầu người vận hành khóa và giữ adapterngắt.
3. OFFAPI hiện có ưu tiên, nhưng mạng/broker có thể hỏng; chỉ dùng khi trong phạm vi khẩn cấp đã được duyệt và còn liên lạc, **không thay thế việc ngắt nguồn độc lập**. Không gửiOFF trong precheck này.
4. Lưu log/time/command/ACK/state trước điều tra. ACK_TIMEOUTkhông chứng minh chưa từngHIGH, cũng không chứng minh motor đang/chưa chạy. Tiếp điểm relay có thể dính dùGPIOLOW; không cấp lại nguồn để thử tiếp khi chưa xác định nguyên nhân.

Rủi ro chưa giải quyết/đo: xung boot, scheduling worst-case, GPIO/relay điện thực, hard upper1.000s, motor/flow, liên kếtcommandIDtrongstateOFF và directruntimecapattestation. Tất cả được ghi trước khi cho phép chạy; **không sửa logic hoặc giảm bảo vệ để làm bài thửPASS**.

## 10. Regression đã chạy — không phần cứng

| Nhóm | Kết quả |
| --- | --- |
| Backend pump/CommandACK/runtimecap/recovery/timeguard | PASS38/38 |
| Presence offline/heartbeat/reconnect | PASS27/27 |
| Firmware controller/parser/fail-safe/expiry/duplicate/timerwrap | PASS36/36 |
| Firmware diagnostics/telemetry/networklease | PASS18/18 |
| OFF scheduler | PASS5checks |
| C++ serializer → backendcontract | PASS6/6 |
| Frontend controlpolicy/SSR/mockAxios/Dashboardwiring | PASS8/8 |
| Polling/StrictMode/race/visibility/cleanup | PASS12/12 |
| PeriodicOFF/telemetry/ONLINE/API live | PASS subscribe/SELECT/GET |
| Backendrestart → UNKNOWN → OFF thật | PASS lịch sử12D.2B; source/mockregression hômnayPASS, không restartlại |
| CommandACK ON vật lý hômnay | NOT VERIFIED, không gửi lệnh |
| BrowserE2E | PASS12D.2C sauDashboardpatch; không chạy lại/clickpump trong12D.3A |

Hosttest16 xác minh lệnh1s ở999ms chưaLOW, đúng1000ms thìMAX_RUNTIME/LOW, kể cảmilliswrap; test20 kiểm tra telemetry không đổi deadline. Đây là simulatedpin, **không đo độ rộngGPIO/motor thực tế**. Runtimecaptest từ chối2/5/30 trướcwrite; ACK_TIMEOUT, brokerdisconnect, expired, duplicate, OFFpriority, sourceNTPguard2s đều cótest.

Lệnh thực thi:

```powershell
Set-Location C:\DATN\Project_datn\backend
node --test scripts/mqtt-pump.test.cjs
node --test scripts/device-presence.test.cjs
node.exe node_modules/tsx/dist/cli.mjs scripts/phase12d2-readonly-check.ts
Set-Location ..\frontend
npm.cmd run test:irrigation
npm.cmd run test:polling
Set-Location ..
& .\firmware\tests\run-host-tests.ps1 -Compiler 'C:\Program Files (x86)\Dev-Cpp\MinGW64\bin\g++.exe'
```

## 11. Kết luận READY / NOT READY

**NOT READY cho thao tác chạy bơm thật, và chưa tự phê duyệtA/B.**

- PASS: source lock/fail-safe nominal, cap1ssoftware, regression, WindowsTime ngắn hạn, ONLINE/telemetry/PERIODICOFF, quyền điều khiển khóa và0PENDING.
- NOT VERIFIED: checklist phần cứng tại chỗ, directruntimecapmetadata, worst-caseGPIO/độngcơ/nước, fullON1s→MAX_RUNTIMEOFFtrênthiếtbị và các giới hạn đo ởtrên.
- Không cóFAILregression, nhưng các mụcNOTVERIFIEDkhông được đổi thànhPASS để cho phép flash/chạy. Có thể dùng báo cáo này làm cơ sở người dùng xác nhận checklist và xem xét **phê duyệtA riêng**, rồi mới tớiB.
- Chỉ tạo filebáocáo này; không chỉnh firmware/backend/frontend/config, không bậtflag/nạpboard/gửiONOFF/cấpnguồn hoặc trực tiếp sửaPostgreSQL.
