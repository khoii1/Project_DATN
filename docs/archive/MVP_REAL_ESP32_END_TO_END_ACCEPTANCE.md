# Real ESP32 → isolated DEV → Website acceptance

> **Latest update, 03/11/2026:** [Phase AG](MVP_PHASE_AG_RUNTIME_PIN_REMEDIATION.md) completed offline pin remediation: historical provenance verified, manifest revision 3 with 250/250 sources and 4/4 runtime hashes verified, 129/129 offline tests PASS. [Phase AF](MVP_PHASE_AF_UI_ONLY_ACCEPTANCE.md) remains historically BLOCKED before startup. No real UI-only session was started; new execution approval is required for the revised baseline.

Ngày30/10/2026, UTC+7. **Nhánh observer account/ACL đã tạm dừng theo người dùng; không apply candidate.** Không chạy lại softwareMVPacceptance đã PASS, không production recovery/migration hoặc physical irrigation.

**Kết quả phiên thực tế: STOP tại BACKEND_MQTT — `Connection refused: Not authorized`.** Đã dùng đúng một phiên, operator đã nhập credential, TEST và backendDEV đã chạy rồi cleanup; không tự retry. Không suy CONNECT/SUBACK/RAW0 của account observer trước thành kết quả backendaccount. Backendaccount phiên này thất bại ngay CONNECT, chưa đến subscribe/parser.

Run: `C:\DATN\test-instances\phase13-3b\mvp-real-esp32-1793301056774-6d641f`. Source/approval hashes, TEST identity preflight và11migration hashes được pin trongprepared.json. `attempt.json`, `summary.json`, backendstdout/stderr vàcluster-start/stop results lưu riêng, không overwrite. LauncherPID13060 không còn chạy tại snapshot sau phiên; không lấy MQTT password từ.env/firmware/passwordfile.

Timeline UTC (giờViệtNam cộng7): start **2026-10-29T19:15:46.307Z**, đăng kýdeviceDEV **19:15:48.602Z**, backendPID18404 startupflags **19:15:58.333Z**, dừngchờMQTT **19:16:10.728Z**, cleanuphoàntất **19:16:11.141Z** (02:15:46–02:16:11 ngày30/10/2026 UTC+7).

## A. Runtime architecture thực tế

Read-only snapshot đầu phiên: LAN Mosquitto PID6636 bind0.0.0.0/[::]:1883, brokerloopbackPID4572 riêng; Windows WiFi172.20.10.2. PostgreSQL production5432 listenPID7848 nhưng **không kết nối hoặc ghi**. Không listenerbackend5000, TEST55433, DEV55001/55173. Vì backend5000 không chạy, không khẳng định backendproduction đang nhận readings hoặc runtimeflags đã xác minh. Không recovery/restart production trong task này.

Target riêng được phép: existing TESTPGDATA `C:\DATN\test-instances\phase13-3b\data`, systemID7698826681383327460, port55433, database`smart_agriculture_mvp_dev`, approle`sa_mvp_dev_app`; backend127.0.0.1:55001; frontend127.0.0.1:55173. Preflight reused `scripts/mvp-dev-direct.cjs` PASS: đúng binaries/PGDATA/systemID, shut down, privateNTFS, DEVportsfree. Không initdb/restore/migration/seed hoặc productionDATABASE_URL fallback.

## B. Backend account/topic verification

Static currentACL: `smartagri_backend` khớp đúng1block và READALLOWED cho3topicESP32telemetry/status/state. Account có quyền WRITE command theoACL, nên **các flags không phải lớp bảo vệ duy nhất**. Không đổi quyền hoặc password.

Actual consumer: `backend/src/mqtt/mqtt-client.service.ts` mở mqtt.connect từenv, cleantrue,resubscribefalse; normalcode subscribedevices/+/telemetry vàstatus, OFFstate được subscribe riêng khiCommandsdisabled. DEVwrapper `scripts/mvp-real-backend.cjs` pinLAN172.20.10.2:1883, inputusername`smartagri_backend`, clientID riêng`mvp-iot-backend-real-<run>`, reconnectPeriod0, connectTimeout10s. `mvp-real-mqtt-transport.cjs` thu hẹp filter về đúngESP32-GF-A-01, chặn mọi `.publish()` **và `_sendPacket(cmd=publish)`**, không WILL. MQTTprotocolCONNECT/SUBSCRIBE/PUBACK/PING được phép, applicationPUBLISH bị cấm kể cảOFF. Chỉ actualbackendMQTTclient được mở; không standaloneobserverclient.

Credentials nhận qua Get-Credential tại máy và anonymousstdin pipe; child chỉ giữmemoryenv cần thiết, logsredacted; khôngpasswordCLI/log/Git/report. DEVDB/loginsecrets dùng existingDPAPI TEST đã được phép, không đọc production.env. Parent và backendwrapper chặn dotenv/.env load trongrepo. At-restproductionaccount không được dùng để suy runtime khiprocesskhôngchạy.

## C. ESP32 live telemetry evidence

**Chưa nghiệm thu MQTT receipt vào backend.** Operator xác nhận adapterrútđiện/USBonly và gửi Serial mới **#1308**, recordedAt **2026-10-29T19:16:19.187Z**: TEMP24.70°C,HUM58.70%,LIGHT0.00lux,SOIL0.00%,raw/min/max4095. WiFi/MQTT/NTP CONNECTED/CONNECTED/SYNCED, PUMP_COMMANDS ENABLED, relayOFF(GPIOonly), PUBACK73ms. SNTPcallback_count11,last_callback_age904852ms,clockRELIABLE/reasonOK. Đây là quan sát operator, không DB/APIproof. Timestamp frame xảy ra khoảng8giây **sau** cleanupDEV, không gán là bản tin backend đã nhận trong cửa sổ thử.

Mục tiêu3batch×4sensor **chưa đạt**,0batch được đối chiếu trong phiên. Khôngcopyproductionrows/SIMULATORpayload hoặc giảOFF. Farm/zone/device/4sensors/actuator đã tạo trongDEV sau localoperatorconfirmation, nhưng brokerCONNECT từchối nên không có hardwareMQTTreading được correlate. Không lấy41readingsSIMULATORhist làmhardwareevidence.

## D. MQTT callback và parser evidence

Actual path: MQTTmessage → `mqtt-message-router.ts` → `mqtt-telemetry.adapter.ts` → `telemetry-ingestion.service.ts` → `sensor-reading.repository.ts`. Topic parser đối chiếudeviceCode; Zod strictschemaVersion số1/recordedAtISO/readingssensorCode+finitevalue; topic/payload device mismatch, oversize hoặc missingmapping bị từchối. Service normalizeuppercasecode, requireACTIVEdevice/sensor, unique sensorCode mỗi batch và physicalnumericrange. Không cófarm/zone trongMQTTpayload; relations/mapping nằm ởDEVDB.

DEVtap đếmraw trướcfilter, gửi chỉmetadata/normalizedreadings whitelisted quaIPC cho parent. Validation reasons giữ riêng, không lograwJSON hoặccredentials. Tiêu chíacceptance: QoS1, nonretained, nondup/logicalsampleunique, sauconnectsession, age≤30s/future≤2s. Không làm suy yếu schema hoặc timestamp guard sản phẩm. Actual adapter có freshness operational-side-effects riêng (future tolerance60s/maxAgeenv); retained/dup có thể lưu lịch sử nhưng khôngmarkOnline/evaluateOperational. Acceptance sẽ không lấy packet đó làm freshproof.

Wirev1 **không có rawADC/calibration/quality**; 0% có thể rangevalid nhưng không chứng minhsoilquality. Source firmware hiện treatadcAtRail là warning tách vớihealth.valid(), do đó vẫnpublish sốclamp. Không bypass qualitygate: không bật engine/automation và giữ externalqualityBLOCKED; không sửa schema/firmware/production ingestion trong task.

## E. PostgreSQL DEV evidence

**DEV startup/registration PASS; live readings BLOCKED.** SQLidentity thực: database`smart_agriculture_mvp_dev`, role`sa_mvp_dev_app`,port55433,postmasterstart2026-10-29T19:15:47.230Z; preflight/PGDATA/systemID/nonprivilegedcaps/11migrationchecksums đã qua gates trước startupbackend. Commands0/PENDING0/enabledAutomation0/actuatorON0 cảtrước vàsau.

RecordsDEVđãtạo vàgiữ nguyên saucleanup:

| Entity | ID |
|---|---|
|farm|cmvtxbkc90001um8ks1hk03hm|
|zone|cmvtxbkd20003um8kdf93cfx4|
|ESP32-GF-A-01|cmvtxbkde0005um8koudtvcda|
|TEMP_01|cmvtxbkdh0007um8k48yxqnms|
|HUM_01|cmvtxbkdt0009um8k0aeixu24|
|LIGHT_01|cmvtxbkdv000bum8kzj97uk3p|
|SOIL_01|cmvtxbkdw000dum8kqn85q98p|
|PUMP_01|cmvtxbkdx000fum8k19dyhm22|

Không tạo DeviceCommand. Device/pump khởi tạoUNKNOWN, không épONLINE/OFF. Không quan sátfreshOFF receipt hoặcDBcommit trong phiên. Log“watchdog:2expireddevices” là normalDEVpresencewatchdog với dữliệu cũ; không chứngminh ESP32 vật lý mấtWiFi hoặcMQTT. Không restartcluster saufail để đọc thêm; chỉ báo **0hardware rows correlated**, không tuyênbố đã truyvấn lại tổngMQTTrows saushutdown.

Readings sourceMQTT qua actualingestion; DB `@@unique([sensorId,recordedAt])` và createManyAndReturn(skipDuplicatestrue) chống ghi trùng. recordedAtthiết bị và receivedAtDBdefaultnow() giữ riêng; không tạo timestampfrontend để giảfresh. Parent phải so từngsensorID/code/type/value/unit/source/recordedAt/receivedAt vàexact4rows từngbatch. OFF từstatebackend phải fresh/nonretained/nondup/currentobservergeneration và timestamp mới, không épDBOFF.

Nếu wire vẫn gửisoil0% với raw4095 theoSerial: có thể lưu4numericreadings theo hiệncontract, nhưng ghi riêng **9nonsoil numericrangevalid +3soilblockedforautomation** trong3batch; không gọi12readingsqualityvalid. Nếu hiệnpolicyreject thật, báo sốcommit/reject thực, không đổi gate để đủ12.

## F. API correlation

**BLOCKED trước authenticated reading APIs.** HealthGET200 từbackend thật trả databaseconnected/mqttdisconnected, timestamp2026-10-29T19:16:10.512Z. Chưa đăngnhậpREST, chưa chạy12rowhistory/chart/device/actuatorAPIcorrelation doMQTTgatefail. Không POSTcommand/fakeOFF. Health200 không đồngnghĩaMQTTconnected.

## G. Website UI evidence

**BLOCKED / FRONTEND_NOT_STARTED.** MQTTgatefail trước WEBSITE stage nên chưa mở frontend55173 hoặcEdge, không có screenshotUIrealESP32. Vì cleanupbackend/TEST đãhoàntất, không cówebsiteDEVđangchạy đểoperator mở. Không phải lỗiUI đã đượcchứngminh. Kếhoạchbrowseractuallogin/4cards/noF5/history/chart vẫn chưa thực thi, softwareMVPDEV/SIMULATORacceptance trướcđó giữ nguyên.

DEV-only `mvp-real-frontend.mjs` thêm HTMLqualitybanner rõ **SOIL_01 qualityBLOCKED từoperatorSerial**, khôngfakeMQTTqualityfield hoặc đổiReactdata/productionfrontend. Banner chỉ trong guardedbenchfrontend; giá trị vàhistory vẫn lấyRESTthật. Badge“Bình thường” hiện biểu diễnthresholdalert, **không phải chứng nhậnsensorquality**; banner giải thích giới hạn dữ liệu đất. Không giữ backend/frontendsống sau phiên nghiệmthu.

## H. Soil ADC4095 diagnosis

Source `SmartAgricultureESP32.ino:127–143,316`: GPIO34, resolution12bits, attenuationADC_11db; lấy8analogReads, average/min/max. `FirmwareDiagnostics.h` flagadcAtRail khi min0 hoặcmax4095 nhưng không tự kếtluậnsensorhỏng. Sourcecalibrationdry3500/wet1507; raw4095 vượt điểm dry, phépđổi% bịclampvề0 — không xác nhậnđấtkhô. Không tự chỉnhcalibration.

Theo [Espressif Arduino ADC documentation](https://docs.espressif.com/projects/arduino-esp32/en/latest/api/adc.html), analogRead là giá trịraw chưacalibrated;12bits tốiđa4095, ADC_11db của ESP32 có khoảngđo được liệtkê150–3100mV. Attenuation không phải bằngchứng rằng mọi điệnáp cao hơn đềuđođược hoặc antoàn.

**Nguyênnhân chưa xác định vật lý**: AO sát/trênđỉnhdảiADC, nhầmDO/AO, nguồn/GND/module/probe/đường dây hoặc tínhiệustuckhigh đều cần kiểmtra; không chứngminhfirmwarelỗi hoặc cảm biếnhỏng chỉ bằng4095. Supplyvoltage, điệnápAO vàwiringthực chưa được agentđo.

Checklistoperator ngắn, **không tự tácđộng trong phiên này**:

1. Giữadapterbơmngắt; trước khithay/chạmdây, ngắtUSB/nguồnboard vàkiểmtratrailnguồn.
2. Đối chiếu AO củamodule vềGPIO34 (khôngDO), connectorprobe, groundchung vàdâynguồn theo schematicđúng.
3. Nếu cóđồnghồ vàđủkỹnăng, operator đoAO soGND trong cấu hình cấpnguồnantoàn; không đưa5V trực tiếp vàoGPIO34. Xácnhậnnguồnmodulethực, không suy từnhãnrelay5V.
4. Sau khiđượcthốngnhấtthao tác, thu raw/min/max ởđấtkhô/ẩm đãbiết. Nếu vẫn4095constant, xửlýAO/wiring/module trước calibration. Chỉ hiệu chuẩn lại sau tínhiệu phảnứng vàkhôngclipping.

Mọi thaydây/đođiệnáp/flash phải operator thực hiện theo xácnhận riêng; agent chưa yêu cầu hoặc tiến hành tácđộng điện. **SOIL_SENSOR_QUALITY_BLOCKED**.

## I. Automatic irrigation remaining gaps

Legacy evaluator đã cóstart/stopthresholds,hysteresis,cooldown,lastEvaluatedAtCAS,stale/future,manualoverride vàDeviceCommandservicegates. SHADOW pureengine cóquality/freshness/identity/clock/duplicate/emergencystop guards; không cóMQTTsideeffects. Firmwarecontroller cóbootLOW,retained/duplicate/expiry/sessionguards,OFFpriority,monotonicruntime,hard5s vànetworklease250ms; backendbenchtestcap1s. Không chuyển5sfirmware thành thời lượngtestđược phép.

Đã chạy **17/17 selectedSHADOWfixturecases PASS** trongrun hiện tại, evidence`offline-decision-cases.json`; dry/wet/hysteresis/stale/invalid/missing/offline/unknown/cooldown/duplicate/restart/clock/expiry/emergency/untrusted/retained/runtimecap. Đây làfixtureoffline, không nghiệmthutưới thật.

Blockers thực cho physicalautomation: SOILrail/calibration; rawquality metadata/trustedlivegates chưa nối decisionpath; legacythreshold không tự biết raw4095; one-shotarming/cancel/no-retry/ACKUNKNOWN/confirmedfreshOFF chưa được nghiệmthuend-to-end với soilthật. Cần một protocolquality/clock/session tin cậy và benchdispatcherinterlocks, sau đó operatorapproval+giámsát riêng. Không bắt buộc hoànthành mọiproductionledger/migration/Observerinfrastructure để demo softwareDEV; không nốiSHADOWvàproductiongateway để vượt bước.

## J. Safety, source changes và cleanup

Filesbench mới: `mvp-real-mqtt-transport.cjs` +`.test.cjs`, `mvp-real-backend.cjs`, `mvp-real-frontend.mjs`, `mvp-real-esp32-session.cjs`, `mvp-real-esp32-launch.ps1`. Không sửa productionbackend, Prisma schema/migration, wireprotocol/firmware, ACL/passwordfile. Rollback là dừng ownedbenchchildren và không chạy helpers; giữ DB/evidence, không delete/reset registration/readings hoặc revert unrelatedwork.

**22/22 transport/diagnostics tests PASS**, offlineguard; Node syntax vàPowerShellASTPASS. Planreview/startpreflightPASS. Dùng một backendMQTTconnection, reconnect0, max180s; intakewait≤90s, không auto retry; cleanup dừng browser/frontend/backend quaIPC/SIGTERM, Prisma disconnect, smartstopTEST chỉ khikhôngotherclients. Outcomeunknown thìkhôngforcekill/restart. Broker/production/ESP32giữnguyên. KhôngapplicationPUBLISH/ON/OFF/Automation hoặcpumpadapterpower. KhôngapplyobserverACLcandidate/tạoaccountmới.

**Cleanup thực tế PASS:** backendPID18404 exit0 qua gracefulSIGTERM, cluster-start nativePID18888 exit0, cluster-stop nativePID18636 exit0. Finalpg_controldata systemID7698826681383327460/state`shut down`/đúngPGDATA; snapshot sauphiên không cólisteners55433/55001/55173. Khôngforcekill/retry/restartproduction. Frontend/browserkhôngstart nên khôngcócleanupchildren tươngứng.

**Runtime safety có bằng chứng của đúngbackendPID18404:** startupattestationlog testModetrue,effectiveMaxRunSeconds1,commandsEnabledfalse,automationEnabledfalse. SQLDEV trước/sauCommands0/PENDING0/enabledAutomation0/actuatorON0. Backend đãdừng nên không gọi nhữngcờđó là runtime hiệnđangserving. Registration/readingshist/evidencegiữ nguyên, khôngdelete/reset. Không đọc hoặcghi production5432/5000, khôngthayACL/account/WiFi/firmware/pump. Thưmụcartifact`undefined` được tạo trongprivate run từruntime; chưa dùng nội dung đó làm evidence, không tựxóa hoặc suy nó là nguyênnhân MQTTauthorization.

## K. Final verdict — sau một phiên live thử

- **ESP32_LIVE_MQTT_BLOCKED** — broker từchối CONNECT: `Connection refused: Not authorized` trongbackend.stderr.log. Diagnostic IPC chỉTRANSPORT_ERROR/TRANSPORT_CLOSED, khôngCONNACKsuccess/SUBACK/message. Đây là blocker xác thực/ủyquyềnCONNECT, không phải telemetryJSON/sensor mapping hayreadACLdelivery đã đượcchứngminh.
- **ESP32_LIVE_DB_API_BLOCKED** — TEST/backend/registrationPASS, chưa nhận3batch/12rows hoặc APIcorrelation.
- **ESP32_LIVE_UI_BLOCKED** — frontend/browserchưađượcstart, không giảUIPASS.
- **SOIL_SENSOR_QUALITY_BLOCKED** — ADCrailtheoSerialhistorical, chưa giải quyết vật lý.
- **AUTO_IRRIGATION_PHYSICAL_NOT_EXECUTED**.

**Nguyênnhân gần nhất đã xác định:** brokerrefusesbackendCONNECT. Chưa phânbiệt password nhập khôngkhớp, username khôngactive trongauthstoreeffective, hoặc authpolicy/configbrokerkhácfileđangreview; khôngkhẳngđịnhpasswordsai hay tựrotate. StaticACLREADALLOWED chỉ cóýnghĩa sauauthentication, không cứuCONNECT bịtừchối. SerialESP32PUBACK làphiêncredential/devicekhác nên khôngchứngminh credentialbackend đúng.

Bước tối thiểu: operator đốichiếu **MQTT credentialbackend hiệnhữu** cục bộ, không dùng passwordPostgreSQL/accountESP32 vàkhông gửisecretqua chat; nếu chưa xácminh thì chuẩn bị targetedauthdiagnosticread-only riêng, không sửaACL/Observerinfrastructure. Khi đã xácminh và được cho phép **một phiên ingestion mới**, resume đúng8registrationrecords ởtrên, không tạo lại hoặc xóa để vượtgate. Không chạy lại runner hiện tại vì gateEXISTING_DEVICE_REQUIRES_REVIEW sẽdừng; cần reviewresumepath rõ ràng trước lần mới. Không mở prompt/retry ởphiênhiệntại.

SoftwareMVPDEV/SIMULATORacceptance trướcđó vẫn giữ nguyên. Giữ adapterbơmngắt theooperator, khôngphysicalautomation. **STOP theo giới hạn một phiên, không tự recovery/retry.**

## Cập nhật riêng — người dùng mở điều khiển thủ công ngày30/10/2026

Đây là quyền mới do người dùng yêu cầu sau phiên DEV bị từ chối, không tái dùng approval DEV/Observer. Người dùng chọn **Bật thử1giây,tựdừng,nútTắt riêng**, rồi yêu cầu mở quyền chạy bơm thật và xác nhận adapterngắt/USBonly/khuvựcantoàn trước cấu hình.

Đã chỉnh đúng4safetyflags trongbackend.env: commandsEnabledtrue,automationfalse,testModetrue,maxRunSeconds1; không đổi credentials/ACL/broker. Backup chỉ4nonsecretflags: `build/manual-pump-flags-before-1793354374762-9a2e19.json`. Agent không restart/forcekill consoleuser; user khởi động lại backend và cung cấp attestation:

```json
{"pid":20048,"startedAt":"2026-10-30T10:00:33.098Z","testMode":true,"effectiveMaxRunSeconds":1,"commandsEnabled":true,"automationEnabled":false}
```

Đã đối chiếu đúnglistener5000/PID20048/sourceTS/starttime vàhealth databaseconnected/MQTTconnected. SQLREADONLY đúngsmart_agriculture5432/systemID7472695863566132416 trước trial: ESP32ONLINE,lastSeen2026-10-30T09:57:34.380Z,PUMP_01OFFreport09:57:31.318Z,PENDING0,commandcount43. Sau restartđọc được freshOFF10:01:03.127Z mới hơn attestationstart10:00:33.098Z,ONLINE,lastSeen10:01:04.502Z,PENDING0,commandcount43.

Một tiến trình chẩn đoán Prisma đã in đủ kết quả transactionREADONLY rồi thoát bất thường(nativeexit-1073741819); không coi là clean probePASS. Đã kiểm tra độc lập health/PID20048 vẫnconnected và dùng nativepsql với boundedREADONLY transaction, exit0, không thay backend hoặc dữ liệu. PasswordDB chỉ trongchildenvmemory, khôngCLI/log/file; không outputusername/password/hash. Các bằng chứng mới phía dưới dựa trên nativeprobeexit0.

### Hai lệnh thực tế từ thao tác người dùng

SQLreadonly tại17:04:21 UTC+7 ghi nhận:

| Command correlation ID | Request UTC | Command/source | Runtime | Kết quả | acknowledgedAt UTC |
|---|---|---|---|---|---|
|4a93eb02-ba36-40a5-bb78-fdc7e81015b6|2026-10-30T10:01:18.108Z|TURN_ON/MANUAL|1s|MQTT/SUCCESS|2026-10-30T10:01:18.292Z|
|0cefc135-ff16-418d-bc3f-70ccaabee8bd|2026-10-30T10:01:33.833Z|TURN_ON/MANUAL|1s|MQTT/SUCCESS|2026-10-30T10:01:34.091Z|

failureReasonnull,cảhaiđãcompleted; PENDING0,commandcount45. Người dùng trả lời **“đúng tôi vừa bật”**. Agent không gửi ON/OFF hoặc tựretry; đây không phải hai lệnh agent tự thực hiện. RawACKpayload/MAX_RUNTIMEpacket không capture trong phiên này; SUCCESS/acknowledgedAt là bằng chứng backendđãsettlethànhcông theo ACKcontract, không phải phép đo pulseGPIO/motor/water.

### Thay đổi trạng thái và điểm dừng

Ởnativeprobe17:03:09 UTC+7: DeviceOFFLINE,lastSeenUTC10:02:33.176Z,DBrelayOFFlastStateChangedAt10:02:31.176Z; brokerchỉthấykếtnốibackend, healthMQTTconnectedkhôngđồngnghĩaESP32connected. Đã dừng báoREADY/không hướng dẫn nhấnONthêm, yêu cầu user ngắtadapter và xác nhận bơm tựdừng. Không dùng OFFlịch sử khiOFFLINE để xác nhận motorđãdừng.

**MANUAL_COMMAND_ACK_VERIFIED:** hai lệnh1sSUCCESS,MQTT,acknowledgedAtkhớp. Sau đó operator xác nhận **“bơm tự dừng sau 1s”**: **MANUAL_PHYSICAL_AUTO_STOP_OPERATOR_CONFIRMED**. Luồng bật thử thủ công và tự dừng đã hoạt động theo quan sát người dùng. Đây không phải phép đo chính xác độ rộng xungGPIO; chưa có xác nhận nước chảy hoặc test nútTắt riêng. **ADAPTER_UNPLUG_CONFIRMATION_PENDING:** câu trả lời này chưa xác nhận rút nguồnadapter sau lần thử, không tự ghi đãngắtđiện.

**ESP32_CURRENT_CONNECTIVITY_OFFLINE_AT_LAST_READ.** Không đọc mới trong lần nhận xác nhận vật lý này. Manualcontrolflagđãmở theo yêu cầu, chưa tựhoànnguyên hoặc khẳng định đangdisabled; sourceguardskhóaONkhiOFFLINE/UNKNOWN. Automationfalse,testModetrue/cap1 theo attestation của process20048, chưa gửi automationcommand. SoilADC4095 vẫnBLOCKED; automaticphysicalNOT_EXECUTED. Không gửi thêm ON/OFF hoặc thực hiện thao tác phần cứng khi cập nhật bằng chứng.

Phần softwarefrontend đã bổ sung2nút và feedback theo ACK ởPumpCard/IrrigationPage/irrigation-control;10frontendtests+40MQTTbackendofflinetestsPASS,typecheck/lintPASS. Không tính SSR/unit là browserE2E hoặc chứng minh physicalpump. Không sửa backendcommandpolicy/firmware/Prismaschema hoặc migrations trong thay đổiUI.

## N — Backend MQTT authentication diagnosis (02/11/2026, READ ONLY)

### N1. Broker identity and limits

- Windows Wi-Fi IPv4 hiện tại: **172.20.10.2**.
- LAN port1883 bind **0.0.0.0 / ::**, PID **16148**, CreationTimeUTC **2026-11-02T07:00:35.7709130Z** (14:00:35 UTC+7).
- Broker loopback riêng: PID **22124**, bind **127.0.0.1 / ::1**, creation **2026-10-30T09:44:30.7981680Z**. Không dùng instance này làm bằng chứng LAN.
- CIM đọc được PID/start time, nhưng ExecutablePath=null và CommandLine/config argument không nhìn thấy với quyền hiện tại. **CURRENT_PROCESS_CONFIG_IDENTITY_NOT_VERIFIED**. Không kế thừa attestation PID6636 cho PID mới; không tự nâng quyền.
- Config trên đĩa `C:\mosquitto\config\mosquitto.conf` SHA256 **084DFBFCF4DF6A7C30A4C3AFD0CE91DE31749FF9D572E361E7234EBA6F598F6F**.
- ACL trên đĩa `C:\mosquitto\config\acl` SHA256 **4A18580727297602943818714405A4437B24BEA1905274E32A19EE8C0BF5E766**.
- Hai hash khớp baseline: **NO_ON_DISK_CONFIG_DRIFT_DETECTED**; không chứng minh config/ACL đang nằm trong bộ nhớ của PID16148.
- Config dự kiến khai báo một listener1883, allow_anonymous=false, password_file=`C:/mosquitto/config/passwords`, acl_file=`C:/mosquitto/config/acl`. Không thấy include_dir/plugin/auth_plugin/global_plugin/options liên quan. Đây là kiểm tra tĩnh file dự kiến, chưa phải effective runtime attestation.

Để đóng identity gap, operator chạy duy nhất truy vấn READ-ONLY này trong PowerShell Administrator; không restart và không thay đổi dịch vụ:

```powershell
$lan = @(Get-NetTCPConnection -State Listen -LocalPort 1883 |
  Where-Object LocalAddress -in @('0.0.0.0','::') |
  Select-Object -ExpandProperty OwningProcess -Unique)
if ($lan.Count -ne 1) { throw 'LAN_INSTANCE_AMBIGUOUS_STOP' }
Get-CimInstance Win32_Process -Filter "ProcessId=$($lan[0])" |
  Select-Object ProcessId, ExecutablePath, CommandLine,
    @{n='CreationTimeUTC';e={$_.CreationDate.ToUniversalTime().ToString('o')}}
```

Chỉ đối chiếu executable/config argument/start time; không gửi credentials nếu command line có thông tin ngoài dự kiến. Nếu config khác đường dẫn đã pin, STOP. Phiên hiện tại không tự thực hiện elevated inspection.

### N2. Account membership and static authorization

Chỉ đọc username prefix trước dấu `:` bằng scanner một byte. Các byte sau `:` được bỏ qua, không tích lũy/giải mã/log/sao chép hash; kiểm tra size/mtime trước/sau ổn định.

- `smartagri_backend`: **1 exact entry** trong password_file dự kiến.
- Không thấy prefix tương tự do case/whitespace; không thấy dòng thiếu separator trong lần scan. Không kiểm tra thuật toán/hash payload hoặc xác nhận mật khẩu đúng.
- ACL có **1 exact user block** cho backend.
- Static READ **ALLOWED** cho cả telemetry, status, actuator/state của `ESP32-GF-A-01`.
- **0 applicable DENY**; bốn global patterns giữ nguyên: write own telemetry/status/command-acks/+ và read own commands/+; `%u` là username. Không phát hiện `%c` hoặc plugin trong config đã pin gây scope không xác định.
- Không cần thêm quyền READ hoặc account observer để khắc phục CONNECT authentication. Topic READ không chứng minh đăng nhập thành công.

Không có file `*.log` tìm thấy dưới `C:\mosquitto` trong lần kiểm tra. Config khai báo log_type error/warning/notice nhưng không có log_dest file. Không truy cập được console broker hoặc xác minh nơi redirect stdout/stderr của PID16148. **BROKER_AUTH_DENIAL_LOG_NOT_VERIFIED**; không suy rằng broker không từng ghi lỗi.

Backend stderr lịch sử đúng run `mvp-real-esp32-1793301056774-6d641f` có: `MQTT connection error: Connection refused: Not authorized`. Đây là bằng chứng client của phiên cũ, không phải denial log của broker hiện tại và không chứng minh mật khẩu sai.

### N3. Credential handoff review

Luồng source: Get-Credential (username exact `smartagri_backend`) → GetNetworkCredential().Password → ConvertTo-Json → redirected stdin → Node JSON.parse → secrets.mqttPassword → child MQTT_PASSWORD → env.mqttPassword → mqtt.connect password.

- Không có `.Trim()` hoặc URL encoding áp vào MQTT password trong luồng này; DB password dùng biến riêng và encodeURIComponent chỉ cho DB URL.
- Username và broker URL được pin/kiểm tra ở launcher, session và backend wrapper. Unique client ID có prefix mvp-iot-backend-real-, clean=true, reconnectPeriod=0 trong receive-only transport.
- Child env được dựng từ allowlist `closed()`. Production dotenv bị stub, đọc .env trong repo bị chặn. Không thấy đường source làm .env ghi đè credentials của bench session.
- DPAPI bundle được tạo theo source với migratorPassword/appPassword/userPassword/jwtSecret, không có MQTT credential. Không giải mã bundle hoặc lấy credentials production trong phiên này; nội dung bundle thực tế chưa được đọc lại.
- MQTT.js local source default protocolVersion=4 (MQTT3.1.1). Không có custom auth method/TLS/client certificate trong luồng dự kiến. Chưa xác minh effective runtime options vì không start client.

**Lỗi được tái hiện: redirected stdin encoding.** Windows PowerShell launcher dùng `$p.StandardInput.Write($json)` nhưng Node giải mã stdin UTF-8. Thử child Node tổng hợp, không import application/MQTT/Prisma, không network/file password:

| Synthetic input class | Existing StandardInput.Write | Proposed UTF-8 BaseStream bytes |
|---|---|---|
|ASCII|exact round-trip PASS|PASS|
|Leading/trailing spaces|PASS, không bị trim|PASS|
|Non-ASCII Unicode|**FAIL**, native exit0 nhưng value khác|PASS|
|Quotes/backslash/punctuation|PASS|PASS|

Cả 8 lần native child đều exit0; assertion riêng so sánh chuỗi mới phát hiện mismatch, không coi exit0 là round-trip PASS. Không hiển thị hoặc dùng mật khẩu thực. Kết quả: **BACKEND_AUTH_HANDOFF_BUG_CONFIRMED cho lớp non-ASCII**. Chưa biết mật khẩu đã nhập thuộc lớp nào; **PASSWORD_MATCH_NOT_VERIFIED**, nguyên nhân chính xác của CONNECT lịch sử vẫn chưa được chứng minh.

Không dùng đề xuất `ProcessStartInfo.StandardInputEncoding`: property này không tồn tại trên .NET Framework/Windows PowerShell hiện tại. Probe synthetic thử property đã báo lỗi và vẫn mismatch; không tính probe đó là PASS. Phương án tương thích đã qua kiểm tra offline là ghi byte UTF-8 trực tiếp vào BaseStream.

### N4. Minimal remediation proposal — NOT APPLIED

Chỉ đề xuất thay đoạn ghi stdin trong `scripts/mvp-real-esp32-launch.ps1`:

```powershell
$utf8Bytes = [Text.Encoding]::UTF8.GetBytes($json)
try {
  $p.StandardInput.BaseStream.Write($utf8Bytes, 0, $utf8Bytes.Length)
  $p.StandardInput.BaseStream.Flush()
  $p.StandardInput.Close()
} finally {
  [Array]::Clear($utf8Bytes, 0, $utf8Bytes.Length)
  $utf8Bytes = $null
}
```

Giữ Get-Credential, exact username, không trim password; không password CLI/file/log. Không đổi password, ACL hoặc broker. Đây là diff dự kiến, **launcher thực chưa sửa** trong phase READ-ONLY. Trước phiên live cần review/parse/test wrapper sửa và pin source hashes/run marker mới; không chạy lại run/attempt cũ.

Reviewed unchanged source SHA256:

| File | SHA256 |
|---|---|
|scripts/mvp-real-esp32-launch.ps1|14E22CD2A9C73C7445A46FC9675C50795A5C23C0E672BF930EDB9CEF85945B4B|
|scripts/mvp-real-esp32-session.cjs|C1E80BE48233BC829C6B63DE70089FE979BD78D3ED880C53F4104677EF4033C5|
|scripts/mvp-real-backend.cjs|FA8E061B310F814117D0AF0CA46A8E8EF7AE934307862D0987855884413B3241|
|scripts/mvp-real-mqtt-transport.cjs|E15DDC199F1ABDF8E8F646398AA1170F169C1DFAB4A05F1B27A48C206DA0ACA9|

### N5. DEV RESUME_EXISTING_DEVICE preparation

Runner hiện tại có `EXISTING_DEVICE_REQUIRES_REVIEW` và luôn yêu cầu count ESP32=0 trước transaction create. Do 8 records DEV ở mục E đã tồn tại theo evidence lịch sử, **không chạy nguyên runner cũ**. Không start TEST55433, không query DB, không tạo/xóa/update records trong phase này; record identity hiện tại chưa được SQL revalidate.

Đề xuất mode explicit **RESUME_EXISTING_DEVICE**, tách khỏi REGISTER_NEW:

1. Phê duyệt phiên mới, run directory và attempt create-new; không tái dùng approval/attempt cũ.
2. Pin PGDATA `C:\DATN\test-instances\phase13-3b\data`, systemID **7698826681383327460**, endpoint127.0.0.1:55433, DBsmart_agriculture_mvp_dev, app role sa_mvp_dev_app nonprivileged; không DATABASE_URL production fallback.
3. Xác minh 11 migrations/checksums và Commands=0/PENDING=0/enabledAutomation=0 trước ingestion.
4. Trong transaction READ ONLY, đối chiếu exact 8 IDs ở mục E: owner mvp-owner-a, quan hệ farm→zone→device, deviceCode/type/status, exact bốn sensorCode/type/ACTIVE gắn cùng device, actuator PUMP_01/PUMP/GPIO26/ACTIVE. Không dùng connectionStatus/currentState lịch sử làm fresh proof; không yêu cầu ép UNKNOWN/OFF.
5. Từ chối missing/extra/duplicate/mismatched mapping. Nếu PASS chỉ hydrate `summary.registration` từ records; **không gọi create/upsert/update/delete** để tự sửa hoặc nhân bản identity.
6. Tái sử dụng transport publish-block, exact three topics, one client, clean session, reconnect0 và deadline; credentials nhập lại trực tiếp tại máy. Một CONNECT/ingestion chỉ thực hiện sau approval riêng.
7. Nghiệm thu 3 fresh batches/12rows và 3 fresh PERIODIC OFF qua MQTT→DEV→API; giữ soil quality BLOCKED. Cleanup graceful owned test processes như contract hiện có.

**DEV_RESUME_PLAN_READY / DEV_RESUME_IMPLEMENTATION_NOT_PERFORMED / DEV_DATABASE_CURRENT_IDENTITY_NOT_VERIFIED**. Không sửa runner trong phase read-only; chưa cấp quyền start cluster/backend/CONNECT.

### N6. Final classification and stop

- **BACKEND_AUTH_HANDOFF_BUG_CONFIRMED**: lỗi encoding non-ASCII đã tái hiện offline, chưa khẳng định gây ra auth failure lịch sử.
- **BACKEND_PASSWORD_MATCH_NOT_VERIFIED**: không đọc/so mật khẩu hoặc hash.
- Không có bằng chứng account thiếu, config trên đĩa drift hoặc DENY chặn ba READ; effective config của PID mới còn chưa xác minh.
- **BACKEND_AUTH_ROOT_CAUSE_UNDETERMINED** đối với lần CONNECT thực tế cũ; không kết luận password sai hoặc policy denial chỉ từ Not authorized.
- Đề xuất bước tiếp: operator attests PID16148 executable/config; review sửa stdin/resume offline; sau đó approval riêng cho một CONNECT/ingestion có giới hạn. Nếu auth vẫn fail thì STOP, không tự reset/rotate/retry.
- Phiên hiện tại: new MQTT CONNECT/SUBSCRIBE/PUBLISH/ON/OFF=0; không start backend/frontend/DB, không sửa credentials/ACL/firmware, không reset thiết bị hoặc cấp điện bơm. Chỉ cập nhật tài liệu và chạy synthetic pipe children offline.
- **SOIL_SENSOR_QUALITY_BLOCKED** giữ nguyên; chưa có phép đo mới để gỡ quality gate. Runtime Commands/Automation/PENDING không được kiểm chứng lại trong task này; không lấy source/file/historical flags làm live safety attestation.

**STOP — DIAGNOSIS_AND_REMEDIATION_PLAN_ONLY.**

## O — Offline handoff fix and DEV resume (02/11/2026)

### O1. Scope and broker identity

Phê duyệt offline từ attachment `596a56ea-058a-4cc6-820e-0930c0195c8d/Pasted text.txt`: sửa source/test, kiểm tra broker read-only, chuẩn bị live sau này; **không phê duyệt CONNECT/start TEST**.

Listener hiện tại vẫn LAN PID **16148**, 0.0.0.0/[::]:1883, creation **2026-11-02T07:00:35.7709130Z** theo metadata đọc được; loopback PID22124 riêng. Config/ACL SHA256 tiếp tục khớp hai pin trong N1, không thấy drift trên đĩa. ExecutablePath/config argument của current LAN process vẫn không nhìn thấy ở quyền hiện tại. **BROKER_RUNTIME_CONFIG_GATE_BLOCKED**, không suy từ hash trên đĩa thành effective config.

Đã chuẩn bị helper chỉ đọc, không tự nâng quyền, không in raw CommandLine/tài khoản khác:

```powershell
# Operator chạy trong PowerShell Administrator, rồi gửi output bốn trường đã lọc.
& 'C:\DATN\Project_datn\scripts\mvp-broker-identity-readonly.ps1'
```

Output chỉ có PID, ProcessStartUTC, ExecutableMatchesExpected, ConfigArgumentMatchesExpected. Cần hai boolean true, PID/start time khớp listener hiện hành và recheck hashes trước live; mismatch → STOP. Helper chưa được chạy elevated trong phiên này.

### O2. Source changes and diff summary

| File | Thay đổi |
|---|---|
|scripts/mvp-real-esp32-launch.ps1|Thêm Write-MvpUtf8Json; ghi UTF-8 bytes qua BaseStream, flush/close và clear byte array trong finally. Giữ nguyên Get-Credential/account/password, không trim/normalize. RegistrationMode bắt buộc; kiểm tra prepared.json version2/mode và chưa có attempt trước prompt.|
|scripts/mvp-credential-input.cjs|Decoder stdin dùng setEncoding('utf8') để bảo toàn ký tự bị chia giữa các chunk; giới hạn8192bytes; lỗi parse dùng nhãn cố định, không phản chiếu input.|
|scripts/mvp-real-esp32-session.cjs|Dùng decoder mới; explicit REGISTER_NEW/RESUME_EXISTING_DEVICE; resume gọi helper READ ONLY, nhánh REGISTER_NEW giữ transaction đăng ký cũ/count0 gate. Pin helper hashes, plan version2/mode, URL DEV trước client. Bỏ approval cũ hardcode; prepare yêu cầu đường dẫn phê duyệt live mới; từ chối attachment live cũ và plan thiếu version.|
|scripts/mvp-real-device-resume.cjs|Validator pure pin 8 IDs từ mục E, ownership/relations/ACTIVE/type/GPIO26. Repository injected chỉ SELECT trong bounded repeatable-read READ ONLY. Không create/update/upsert/delete hoặc sửa presence/relay lịch sử.|
|scripts/mvp-broker-identity-readonly.ps1|Helper metadata broker đã lọc, chỉ đọc; không in raw command line.|
|scripts/mvp-real-handoff.test.cjs|Kiểm thử native PowerShell→Node với synthetic PSCredential, AST, secrecy, decoder chia từng byte, invalidJSON/size limit.|
|scripts/mvp-handoff-synthetic-child.cjs|Native child test dùng chính decoder mới; chỉ xuất booleans/kết quả, không echo dữ liệu.|
|scripts/mvp-real-device-resume.test.cjs|Fixture identity/missing/extra/duplicate/relation/type/status/GPIO, no-fallback, READ ONLY và zero-write spies.|
|MVP_REAL_ESP32_END_TO_END_ACCEPTANCE.md|Báo cáo hiện hành; giữ nguyên evidence lịch sử.|

Đoạn handoff thực tế đã đổi từ `StandardInput.Write($json)` thành:

```powershell
Write-MvpUtf8Json -Child $p -Json $json
# Function writes [Text.Encoding]::UTF8.GetBytes($Json) to BaseStream;
# flushes/closes stdin and clears the temporary byte array in finally.
```

Node trước đây `s += buffer` cũng có nguy cơ cắt UTF-8 giữa chunks. Nay dùng decoder stream chung đã được test bằng từng byte, không chỉ chứng minh PowerShell writer. Không sử dụng StandardInputEncoding không hỗ trợ trên Windows PowerShell hiện tại; không đổi protocol/authentication production.

### O3. RESUME_EXISTING_DEVICE contract

- Mode explicit, không default nếu thiếu/không hợp lệ. Launcher mode phải trùng mode trong plan và input; các prepared.json cũ không version/mode bị từ chối.
- Exact DEV URL:127.0.0.1:55433/smart_agriculture_mvp_dev?schema=public, role sa_mvp_dev_app. Sai host/port/database/schema/role/options → từ chối trước repository, không fallback5432.
- Existing preflight systemID **7698826681383327460**, exact PGDATA và binary/NTFS/listener gates giữ nguyên; existing SQL/postmaster/migration/capability checks không bị gỡ.
- Resume transaction chạy `SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY`, timeout10000ms/maxWait5000ms. Recheck SQL database/role/port trong transaction, rồi SELECT farm/zone/device/4sensors/actuator theo pinned IDs và mappings. Không gọi Prisma write API trong nhánh resume; câu SET chỉ đặt thuộc tính transaction.
- Missing/extra/duplicate/wrong ownership/relation/type/board/GPIO/status → STOP. Trả registration object mới từ mapping hợp lệ, không sửa records. Historical OFF/ONLINE/UNKNOWN không được dùng làm fresh proof.
- REGISTER_NEW vẫn yêu cầu device chưa tồn tại và giữ transaction create cũ. Không tự chuyển resume sang create khi validation thất bại.
- **Không đọc database thật trong phase này.** READ ONLY transaction chỉ được nghiệm thu bằng fake repository/fixtures; SQL integration resume và identity hiện hành phải xác minh trong phiên được duyệt sau.

### O4. Offline validation actually executed

Lệnh cuối cùng native exit0:

```powershell
node --require ./scripts/acceptance-offline-guard.cjs --test --test-reporter=spec scripts/mvp-real-handoff.test.cjs scripts/mvp-real-device-resume.test.cjs scripts/mvp-real-mqtt-transport.test.cjs scripts/mvp-mqtt-read-diagnostics.test.cjs
```

| Suite | Kết quả |
|---|---|
|Handoff/decoder|**5/5 PASS**, gồm một test chạy5 native synthetic round-trips|
|DEV resume/no fallback/identity|**45/45 PASS**, injected fake repository, không SQL live|
|Publish-block transport|**4/4 PASS**, mock EventEmitter, không MQTT socket|
|Receipt/parser diagnostics|**16/16 PASS**, fixtures|
|Tổng|**70/70 PASS**, fail0/skipped0, native exit0, duration2107.6754ms|
|Node --check|PASS cho session, helper resume, decoder, hai test files và synthetic child|
|PowerShell AST|PASS launcher và broker metadata helper|

Năm native round-trips dùng ASCII, non-ASCII, spaces đầu/cuối, quotes/backslash/punctuation và emoji. Mỗi child exit0, value equality=true, username equality=true, stderr rỗng; không phản chiếu synthetic password. Kèm malformed input native exit2, không echo input. Chỉ dùng dữ liệu giả; không gọi Get-Credential tương tác hoặc nhập mật khẩu thật.

Lần chạy đầu có1 lỗi test harness do Windows PowerShell `-Command -` chưa kết thúc compound statement khi nhận stdin nhiều dòng, nên stdout JSON rỗng; đã thêm blank-line termination trong harness. Không liên quan MQTT/SQL và không có live attempt. Sau sửa và bổ sung decoder test, toàn bộ70 bài đã thực thi lại PASS.

### O5. Source SHA256 after fix

| File | SHA256 |
|---|---|
|mvp-real-esp32-launch.ps1|47E722FDE82BD18CD601DBE7AE0BAB3060E158E565739295A8DF0B970D122979|
|mvp-real-esp32-session.cjs|E591E10177E9B8F496935A5D2DD2407BF5C7CF5DE7B9B9B8837924295A2D9090|
|mvp-real-device-resume.cjs|8B65D1861CE7147637659B241117D25B0604CE8E5F307C557A437EA96C462B8D|
|mvp-credential-input.cjs|74F0FC2427312EDF2A8428B322E5D143E10F6BF40D833BB5B3B18E246A10246C|
|mvp-broker-identity-readonly.ps1|9F5F9474447B45F1B5ED55AC6E770F5B25C545556AD79442E2078EABA530AE7D|
|mvp-real-handoff.test.cjs|C2460C8D79414DCDA70E1AE101DCA07D8B6B5B2C6DDE6066B1C80AF62E2A8A02|
|mvp-real-device-resume.test.cjs|9D53EC8EF738499009A3A19FB53FCFECF7FED4A2F286C2166007CB5F1ABAED13|
|mvp-handoff-synthetic-child.cjs|A8D75A004171180536D0767B5FAB1CF21805805132609454802DEAE9BF056B3C|

### O6. Next live acceptance plan — not executed

1. Đóng broker metadata gap bằng output helper ở O1; revalidate PID/start, config/ACL hash. Nếu chưa đạt, live CONNECT **BLOCKED** dù offline fix PASS.
2. Nhận phê duyệt riêng cho đúng một live DEV session; operator xác nhận adapter bơm rút điện/USB only ngay trước startup. Không tái sử dụng phê duyệt bơm/manual runtime ngày30/10 hoặc live attachment cũ. Chỉ tạo run/plan version2/attempt create-new khi phiên mới được duyệt; phiên này **không prepare run directory thực**.
3. Future preparation interface: `node scripts/mvp-real-esp32-session.cjs --prepare RESUME_EXISTING_DEVICE <absolute-new-live-approval-file>`. Đây là hướng dẫn cho phiên được duyệt, chưa chạy. Không coi một file path/hash là thay thế việc operator thật sự phê duyệt.
4. Operator nhập đúng existing MQTT password tại Get-Credential ở máy qua launcher có `-RegistrationMode RESUME_EXISTING_DEVICE`; không chat/CLI/log/file password. Handoff synthetic PASS **không chứng minh password thực đúng**.
5. Start đúng TEST cluster55433 sau identity/NTFS/preflight; SQL revalidate11migrations và app role; resume exact8records READ ONLY; Commands/PENDING/enabledAutomation baseline phải0. Không ghi đăng ký trùng hay sửa identity.
6. BackendDEV55001 nhận env cô lập: Commands=false, Automation=false, TestMode=true/cap1; kiểm chứng attestation của đúng serving process. Application publish và packet publish tiếp tục bị chặn độc lập. Unique client ID/clean session, reconnect0; một CONNECT, không tự retry. Nếu Not authorized → STOP, giữ bằng chứng, không reset credential.
7. Nếu CONNECT/SUBACK đạt, nhận3fresh batches×4readings và3fresh PERIODIC OFF; correlate DEVDB/API. Chỉ sau ingestion đạt mới start frontend55173/browser và kiểm chứng polling/history. Không dùng dữ liệu cũ hoặc simulation làm evidence ESP32.
8. Graceful cleanup owned DEV backend/frontend/browser và TESTcluster; giữ records/logs; không stop/restart production broker/DB/backend. Unknown outcome → STOP, không force recovery/retry.

Giới hạn hiện tại: broker effective config chưa attested, password match chưa xác minh, resume SQL chưa chạy thật, chưa có MQTT/DB/API/UI evidence mới. Source .env production, production flags, ACL/password_file, firmware, schema/migrations và records giữ nguyên. Không kết nối production để đọc PENDING hoặc flags; runtime hiện hành **NOT_VERIFIED**, không dùng cờ lịch sử làm bằng chứng an toàn.

Rollback offline: ngừng sử dụng các launcher/helpers mới; giữ evidence/DEV records. Nếu cần khôi phục source, hoàn nguyên riêng changeset UTF-8/mode/resume này sau review, không revert các thay đổi khác của người dùng; không rollback database/broker vì không thay đổi chúng.

**BACKEND_AUTH_HANDOFF_FIX_OFFLINE_PASS**  
**DEV_RESUME_IMPLEMENTED_OFFLINE_PASS**  
**LIVE_MQTT_CONNECT_NOT_EXECUTED**  
**SOIL_SENSOR_QUALITY_BLOCKED**  
**ESP32_NEW_LIVE_E2E_NOT_ACCEPTED**

STOP sau offline fix/test. Không start TEST/backend/frontend, không MQTT CONNECT/SUBSCRIBE/PUBLISH hoặc ON/OFF; không cấp điện bơm, reset/flash hoặc bật Commands/Automation trong phiên này.

## P — Approved live session preflight stopped (02/11/2026)

Phê duyệt mới: attachment `98e2e903-6042-4b34-bbc3-ae1abad9ef29/Pasted text.txt`. Người dùng xác nhận đã rút adapter bơm, ESP32 USB only và cho phép một phiên DEV duy nhất, không gửi lệnh bơm. Không hỏi lại cùng phạm vi. **Không sử dụng approval hoặc attempt cũ.**

### A. Broker identity

Read-only snapshot: IP **172.20.10.2** trên Wi-Fi; LAN listener **0.0.0.0/[::]:1883 PID16148**, start **2026-11-02T07:00:35.7709130Z**. Loopback **127.0.0.1/[::1] PID22124** riêng.

Operator Administrator attestation trong approval mới: PID16148/start UTC như trên, ExecutableMatchesExpected=true, ConfigArgumentMatchesExpected=true. PID/start time hiện tại khớp attestation; file config/ACL hashes tiếp tục khớp baseline084DFBFC…F6F /4A185807…766. Không tự nâng quyền hoặc restart broker; không tuyên bố đây là lần agent đọc metadata elevated mới. Broker identity gate theo attestation + current PID/start/hash: **PASS**.

### B. DEV preflight and abnormal command exit

Đã chạy duy nhất lệnh kiểm tra read-only:

```powershell
node -e "console.log(JSON.stringify(require('./scripts/mvp-dev-direct.cjs').preflight(),null,2))"
```

Output JSON chứa:

- systemID **7698826681383327460**; PGDATA **C:\DATN\test-instances\phase13-3b\data**; state **shut down**.
- Bốn PostgreSQL binary hashes khớp pin hiện có.
- Operator/owner SID **S-1-5-21-1432835263-483988321-3159128977-1001**; protected DACL, root/data chỉ operator; ports count0.
- Preflight output timestamp **2026-11-02T07:28:00.128Z** (14:28:00 UTC+7).
- Listener snapshot độc lập không có55433/55001/55173.

**Tuy nhiên lệnh preflight kết thúc exit -1073741819 (0xC0000005), không phải exit0.** Không lấy JSON đã in làm bằng chứng native completion PASS. Chưa xác định chính xác crash nằm ở Node, PowerShell/native host hoặc thành phần khác trong invocation; không suy là lỗi PostgreSQL, authentication MQTT hoặc firmware. **DEV_PREFLIGHT_COMPLETION_BLOCKED / STOP_BEFORE_LIVE**.

Không chạy lại preflight, không thay runner/guards để bỏ qua native failure. Cần một đợt chẩn đoán offline/read-only riêng cho abnormal native exit trước khi tổ chức lại phiên live; không tạo CONNECT retry trong phiên này.

### C. Source and authentication

Rechecked source hashes khớp mục O5: launcher47E722FD…2979, runnerE591E101…9090, resume8B65D186…2B8D, decoder74F0FC24…246C. Transport receive-only **E15DDC199F1ABDF8E8F646398AA1170F169C1DFAB4A05F1B27A48C206DA0ACA9** và publish blocker **1292C679F78B157EB6F8A5FF3775D02D1E21485E314FBFD8EB7E51E765713CD1** cũng được kiểm tra hash/read source. Không thay source trong phiên live-preflight này.

Chưa tạo private approval artifact/run directory/prepared.json/attempt.json mới vì safety gate fail trước bước tạo phiên. Approval thật vẫn là attachment mới được đọc; không tự phát sinh approval khác hoặc ghi đè attempt trước. Không mở Get-Credential hoặc đọc/giải mã MQTT/DB credentials. **MQTT_CONNECT_ATTEMPTS_THIS_SESSION=0**, PASSWORD_MATCH_NOT_VERIFIED.

### D–G. Telemetry, database, API and website

Không start TEST55433/BackendDEV55001/FrontendDEV55173/browser. Không SQL connection hoặc revalidate8records/migrations runtime; không ingestion/correlation/API/UI test. Các record IDs, đọc12rows và PERIODIC OFF lịch sử không được dùng làm fresh evidence của phiên này.

- ESP32_LIVE_MQTT_ACCEPTANCE: **BLOCKED — NOT_EXECUTED**.
- ESP32_LIVE_DB_API_ACCEPTANCE: **BLOCKED — NOT_EXECUTED**.
- ESP32_LIVE_UI_ACCEPTANCE: **BLOCKED — NOT_EXECUTED**.
- DEV runtime Commands/Automation/TestMode/PENDING: **NOT_VERIFIED**, vì chưa có serving process/SQL session mới. Env/source pins không thay thế runtime attestation.

### H. Soil quality

**SOIL_SENSOR_QUALITY_BLOCKED** giữ nguyên từ bằng chứng đã có; không lấy Serial/ADC mới, không đánh dấu soil đáng tin cậy. Không nâng VERIFIED_LIVE/ACTIVE.

### I. Safety and cleanup

Owned DEV processes started=0; TEST starts=0; MQTT CONNECT/SUBSCRIBE/applicationPUBLISH/ON/OFF=0; credential prompts=0; identity writes=0; DeviceCommand created=0 do phiên này không kết nối DB hoặc khởi động app. Không cần cleanup DEV processes vì chưa tạo tiến trình dịch vụ nào. Native preflight child đã kết thúc bất thường theo exit được trả về; không force kill/restart hoặc retry.

Không thay production flags, ACL/password_file, broker/backend/DB production, firmware hoặc nguồn bơm. Không query production PENDING/command count; không tuyên bố runtime production safety được kiểm chứng trong phase này. Xác nhận pump-unplugged chỉ dựa vào operator trong approval.

### J. Remaining blocker and verdict

Blocker hiện tại của phiên mới là **native preflight completion**, không phải một lần MQTT Not authorized mới. Chưa có live evidence để chứng minh bản sửa UTF-8 đã giải quyết authentication thực tế. Offline70/70PASS giữ nguyên.

**LIVE_SESSION_STOPPED_BEFORE_STARTUP**  
**LIVE_MQTT_CONNECT_NOT_EXECUTED**  
**ESP32_LIVE_MQTT_BLOCKED**  
**ESP32_LIVE_DB_API_BLOCKED**  
**ESP32_LIVE_UI_BLOCKED**  
**AUTO_IRRIGATION_PHYSICAL_NOT_EXECUTED**

STOP theo điều kiện bắt buộc trong approval: safety gate không hoàn tất thành công thì dừng trước CONNECT, không tự retry hoặc bypass.

## Q — Preflight access violation diagnosis (02/11/2026, OFFLINE / READ ONLY)

### A. Crash event evidence

Đọc Windows Application Event Log trong cửa sổ **2026-11-02T07:26:00Z–07:30:00Z** (14:26–14:30 UTC+7), không chạy lại preflight. Chỉ các event phù hợp dưới đây được dùng làm bằng chứng; WER event Visual Studio không liên quan trong cùng cửa sổ không được dùng để suy nguyên nhân.

| Metadata | Evidence |
|---|---|
|Application Error|Event1000, RecordId **65378**|
|Crash UTC|**2026-11-02T07:28:00.4703005Z**|
|Application|**powershell.exe**, version10.0.26100.9549|
|Application path|C:\WINDOWS\System32\WindowsPowerShell\v1.0\powershell.exe|
|Faulting module|**ntdll.dll**, version10.0.26100.9711|
|Exception code|**c0000005**|
|Fault offset|0000000000166447|
|Faulting PID|**21828** (hex0x5544)|
|ProcessStartUTC|**2026-11-02T07:27:56.6420156Z**, converted from event FILETIME|
|Report ID|**9328e90c-9c4a-448b-a3a2-4f68ae3a4abd**|
|WER confirmation|Event1001 Records **65379**, **65381**, times07:28:03.2802912Z /07:28:07.1948397Z; same ReportId/application/module/exception|

WER ReportArchive `Report.wer` kiểm tra quyền truy cập bị **Access denied**. Không nâng quyền, không mở crash dump, không đọc nội dung WER khác hoặc thay WER/registry. Vì vậy parentPID/loaded-module metadata của report chưa thu được. Event Log đủ chứng minh tên process/module báo lỗi, không đủ call stack hoặc memory-corruption origin.

### B. Faulting process/module and earlier diagnostic

JSON preflight trong mục P mang timestamp **07:28:00.128Z**; Event1000 xảy ra khoảng **342ms sau mốc JSON**. Đây là so sánh event time với timestamp được in, không phải measurement riêng cho thời điểm flush stdout.

Event phù hợp trong cửa sổ diagnostic trước **2026-10-30T09:55Z–10:05Z**:

- Event1000 RecordId **65022**, time **2026-10-30T10:01:09.7802852Z**.
- Application **powershell.exe**, module **ntdll.dll**, exception **c0000005**.
- PID **8796** (hex0x225c), ReportId **1d241cd9-73ae-4b89-8a96-e2b424a4c7bb**.

Đây là event quanh lần diagnostic có dùng Prisma; **không phải bằng chứng Prisma engine hoặc node.exe đã crash**. Hai event cùng app/module/code chỉ cho thấy biểu hiện tương tự. Không kết luận cùng memory bug hoặc cùng tác nhân gây lỗi.

Trong cửa sổ sự cố mới, event phù hợp thu được là powershell.exe; không tìm thấy Application Error cho node.exe/pg_controldata.exe trong chính cửa sổ đó. Việc không có event không chứng minh các process đó đã hoàn tất exit0 nếu chưa thu native exit riêng.

### C. Source-level investigation

Reviewed `scripts/mvp-dev-direct.cjs` và import trực tiếp `scripts/mvp-native-exit.cjs`:

1. **Require-time dependencies:** built-in fs/path/crypto/child_process/assert, rồi native-exit helper (helper chỉ require child_process). Không .node addon bên thứ ba, Prisma, tsx, dotenv, MQTT hoặc backend startup trong đường require→preflight. Node built-ins vẫn có native implementation; không đồng nghĩa hoàn toàn không có native code.
2. Top level khai báo constants/functions/module.exports; `if(require.main===module)` ngăn main/prepare/execute khi require. Code Prisma/seed/DB/startup có trong file nhưng nằm trong execute/helper được gọi từ execute, **không được gọi bởi preflight**.
3. Native child thứ nhất thực sự được chạy bởi preflight: **pg_controldata.exe [exact TEST PGDATA]**, chỉ đọc control metadata. Kiểm tra status===0, stderr rỗng/falsy, signal rỗng; rồi kiểm tra systemID và state shut down. pg_ctl/psql/postgres chỉ được hash ở đường này, không thực thi start hoặc SQL.
4. Native child thứ hai: **powershell.exe -NoProfile -NonInteractive -Command** đọc NTFS ACL/operator SID và local listeners. Kiểm tra status===0, stderr==='', JSON parse và exact SID/owner/protected/DACL principals/port count. Không Get-Credential, DB/MQTT hoặc ghi file.
5. Không có ignored nonzero status trong hai child này. Launch failure thường status=null và bị assert từ chối. Nhưng preflight **không xuất PID/status/error/signal riêng của từng child**, nên không thể dựng lại toàn bộ process tree từ stdout lịch sử. Hai spawnSync cũng **chưa có timeout riêng**; đây là hạn chế độ bounded, không phải nguyên nhân access violation đã chứng minh.
6. `spawnSync` quản lý lifecycle pipes/native handles qua Node runtime; source không có custom P/Invoke, Add-Type hoặc handle thao tác thủ công trong preflight. Không có cleanup hook JavaScript của preflight đủ bằng chứng gây lỗi. `observeNativeExit` có timers/listeners/streams nhưng chỉ được import, **không được gọi trong preflight**, nên không gán lỗi cleanup cho nó.
7. Việc JSON hoàn chỉnh xuất hiện cho thấy đường JavaScript đã đi qua các assertions trước return. Tuy vậy không thay bằng chứng exit của Node/outer shell. Nội dung JSON không cấp phép bỏ qua exit bất thường.

**Process boundary interpretation:** faulting executable được event chứng minh là PowerShell. Với source assertions và output lịch sử, khả năng lỗi ở PowerShell host bao ngoài invocation là phù hợp bằng chứng hơn giả thuyết Prisma bị load bởi preflight. Tuy nhiên wrapper command không lưu PID/exit Node và PID hai child riêng, nên quan hệ ancestor/descendant giữa event PID21828 và từng tầng chưa chứng minh độc lập. Không tuyên bố đã có đầy đủ parent/child trace hoặc Node exit0.

Reviewed file SHA256 (read-only, không cập nhật source runtime):

| File | SHA256 |
|---|---|
|scripts/mvp-dev-direct.cjs|A23A8AA468B967BC34366A575AB29902222AF6A340F865A7FF1A09B194F4917E|
|scripts/mvp-native-exit.cjs|361ABC7FA7CA32D65B7A0EDA34B7608277CA9BA5774B95EDA0C0F4358078310F|
|node.exe|FDDDBF4581E046B8102815D56208D6A248950BB554570B81519A8A5DACFEE95D|
|powershell.exe|60C9B29843624DD8AF6B6A7B26147753BE6AEEF65098B9A503CC50850AFE410F|
|ntdll.dll|651AC9041AF8E6B5EBD331D53163244C0A27D36D1433F0F15CAC1F28C5F2E82C|

Hashes là identity trên đĩa lúc kiểm tra, không khẳng định file đúng/sai hoặc binary resident trong process đã crash tương ứng nếu chưa có bằng chứng bổ sung.

### D. Root cause / uncertainty

**Đã xác nhận:** event Application Error của powershell.exe trong ntdll.dll/c0000005 đúng thời điểm, sau mốc JSON; có WER cùng report. Không còn chỉ dựa vào mã lỗi tổng hợp để nghi ngờ Node/Prisma.

**Chưa xác nhận:** instruction/call stack gây invalid access, lỗi cleanup trong CLR/native host, tác nhân ngoài process, profile/module injection, hoặc chính ntdll có defect. Faulting module là nơi phát hiện lỗi, không tự chứng minh module đó là root cause. Không có bằng chứng để nâng cấp Node/PostgreSQL/Prisma, sửa registry, tắt phần mềm bảo vệ hoặc thay NTFS/cluster.

### E. Minimal remediation plan — NOT APPLIED

Không sửa runtime component theo phỏng đoán. Không có Prisma dependency dư thừa cần gỡ khỏi đường preflight hiện tại. Không bỏ status assertions, không synthetic exit0 hoặc dùng process.exit(0) để che native failure.

Đề xuất **một phiên diagnostic execution riêng sau phê duyệt**, không MQTT/SQL/startup:

1. Giữ source hashes/systemID/PGDATA/NTFS/listener checks hiện có. Dựng observer riêng cho đúng một Node preflight invocation, thu **Node PID/native exit/error/signal/stdout/stderr**, tách khỏi outer PowerShell exit và ghi nhận outer host PID.
2. Trong instrumented preflight, giữ nguyên từng safety check nhưng ghi metadata **PID/status/error/signal/timeout** của mỗi child. Không ghi raw command line, credentials hoặc output nhạy cảm; có timeout hữu hạn, unknown → STOP, không force retry/kill.
3. Chạy đúng một lần khi được duyệt; đối chiếu Event1000/1001 với từng PID. Không tự lặp crash hoặc dùng route khác chỉ để có PASS.
4. Nếu chỉ outer host lỗi còn Node và tất cả children exit0 có bằng chứng độc lập, đánh giá cách gọi không phụ thuộc host lỗi như một thay đổi transport có review/test; vẫn yêu cầu toàn bộ safety gates và quan sát exit hợp lệ, không bỏ qua lỗi host.
5. Nếu lỗi nằm ở child PowerShell, giữ nguyên dữ kiện NTFS/listener cần xác minh trước khi thiết kế adapter thay thế. Chưa triển khai thay thế hoặc tự đổi phiên bản/phần mềm do thiếu root cause.

Phiên này **không chạy kế hoạch tái hiện**, không rerun full preflight hoặc các child preflight thật.

### F. Offline regression results

Thêm duy nhất test file `scripts/mvp-preflight-boundary.test.cjs`: VM chạy source với fs/crypto/child_process injected mocks. Không require thật preflight module, không thực thi PostgreSQL/PowerShell trong15tests này. Kiểm tra require-time side effects, exact dependency boundary, cả hai child phải status0, phản đối access violation/null/stderr/signal, wrong systemID/running cluster/ACL/owner/busy ports/malformed JSON. Mock success không phải real preflight PASS.

Đã chạy:

```powershell
node --require ./scripts/acceptance-offline-guard.cjs --test --test-reporter=spec scripts/mvp-preflight-boundary.test.cjs
node --require ./scripts/acceptance-offline-guard.cjs --test --test-reporter=spec --test-name-pattern='native nonzero|missing executable|deadline' scripts/mvp-native-exit.test.cjs
```

- Boundary regression: **15/15 PASS**, native test runner exit0.
- Selected existing native-exit regressions: **3/3 PASS**, native test runner exit0. Synthetic child exit7 được giữ nguyên; missing executable ENOENT không biến thành success; deadline child có outcome unknown/null và tự kết thúc, không kill/retry. Không intentionally gây access violation.
- Test cần compiled synthetic descendant fixture không được chọn/chạy; không tạo/cài fixture mới. Không chạy lại70tests handoff hoặc các bộ MVP đã PASS vì không đổi domain/handoff code.
- File thay đổi: báo cáo này và một test-only source. `mvp-dev-direct.cjs`, native-exit helper, production source/config và mọi evidence trước giữ nguyên.

### G. Preflight readiness

**DEV_PREFLIGHT_COMPLETION_BLOCKED.** Chưa chạy lại đủ safety checks thật, chưa có trace exit0 riêng cho Node/children/outer host. Không lấy18tests offline PASS hoặc event crash classification làm real preflight completion PASS. Live acceptance ở mục P không được resume.

### H. Remaining blockers and final verdict

Blocker còn lại: xác định boundary/process tree và nguyên nhân native crash bằng một lần quan sát độc lập được phê duyệt; WER chi tiết hiện thiếu quyền đọc. Không cần thêm hạ tầng MQTT/DB để tiếp tục chẩn đoán.

**DEV_PREFLIGHT_CRASH_DIAGNOSIS_PARTIAL**  
**DEV_PREFLIGHT_COMPLETION_BLOCKED**  
**LIVE_MQTT_CONNECT_NOT_EXECUTED**

Trong phase này: không start TEST/PostgreSQL/backend/frontend, không kết nối DB/MQTT, không đọc credentials/dump, không restart broker, không sửa/xóa/restore dữ liệu, không ON/OFF/Automation/flash/reset hoặc cấp nguồn bơm. STOP sau chẩn đoán; không tự chạy lại live acceptance.

## R — One-shot process diagnostic (02/11/2026)

### A. Approval, preparation and private evidence

Phê duyệt thật từ user message **SMART AGRICULTURE — ONE-SHOT PREFLIGHT PROCESS DIAGNOSTIC**: đúng một preflight read-only để phân biệt process/exit; không start DEV/DB/MQTT hoặc hardware. Approval được ghi lại nguyên văn phần xác nhận trong private artifact mới, không dùng approval live cũ.

Evidence directory:

`C:\DATN\test-instances\phase13-3b\preflight-process-diagnostic-1793605682656-81d65c`

Trước khi tạo: kiểm tra operator SID, existing parent owner/protected DACL/operator-only và ancestor reparse. Chỉ tạo directory mới; không sửa parent/PGDATA ACL. Directory mới owner operator, protected DACL chỉ operator FullControl. Sau chạy, kiểm tra directory và12files có owner/operator-only ACL, không reparse; các file kế thừa quyền chỉ operator từ directory. Verification.json tạo thêm sau bước này theo cùng inheritance, không chứa credential.

Manifest SHA256 **77E6FB89EC96286E4C27F59ABA2414F6BD277C550AEBE2B2A60D56EA8A4B1EFC**. Source/binary hashes trước/sau khớp; original preflight **A23A8AA468B967BC34366A575AB29902222AF6A340F865A7FF1A09B194F4917E**, native-exit helper **361ABC7FA7CA32D65B7A0EDA34B7608277CA9BA5774B95EDA0C0F4358078310F** giữ nguyên.

Thêm ba file diagnostic-only:

- `scripts/mvp-preflight-process-diagnostic.cjs`: independent Node observer và Node preflight tap; intercept đúng hai spawnSync, trả nguyên native results cho safety assertions gốc. Không đổi source preflight.
- `scripts/mvp-preflight-outer-diagnostic.ps1`: PowerShell host dưới observer, khởi động Node preflight rồi lấy native Process.ExitCode; không thay nonzero thành success.
- `scripts/mvp-preflight-process-diagnostic.test.cjs`: pure mock instrumentation/classification tests.

Diagnostic source SHA256 lần chạy:

| File | SHA256 |
|---|---|
|mvp-preflight-process-diagnostic.cjs|F742E37F8CCF2FFAE5D4F79075066503C4079F5DB1A36E125ADB8117FE060310|
|mvp-preflight-outer-diagnostic.ps1|C302ED53244DAFB073C7A0E69F623EAFC97C5A858C8CF0B4471777FED96E7964|
|mvp-preflight-process-diagnostic.test.cjs|C6ED0D7A5DD6720CF867DF66D3096969E9B7CAE855089DCDAB5414A9B580545A|

### B. Synthetic verification before execution

**20/20 mock tests PASS**, native runner exit0:15existing safety-boundary cases và5instrumentation/classification cases. Kiểm tra pass-through exact native result, nonzero/signal/launch error preservation, no-secret reflection, unexpected child/PGDATA rejection, no timeout kill options, stop marker và casesA/B/C/D/unknown. Không gọi real preflight hoặc native children của nó trong các tests này. Node syntax và outer PowerShell AST PASS.

Deadline giám sát: child15s, Node40s, outer45s. Không truyền timeout/killSignal vào spawnSync để tránh auto-kill. Independent observer phát hiện overdue child qua trace, ghi stop marker và outcome unknown; không kill/retry. Tap kiểm tra stop marker trước/sau native call để không tiếp tục bước kế tiếp khi child hoàn tất muộn. Trong lần thực tế **không deadline nào bị vượt**.

### C. Exact observed process tree and exit evidence

Thực thi preflight đúng **1 lần**. `attempt.json` create-new; `node-start`1 event, `child-start`2events ordinal1/2, `checks-returned`1event. Không có reuse/retry hoặc stop marker.

```text
PowerShell launch host PID556 (tool invocation exit0)
└─ Node observer PID892
   └─ PowerShell diagnostic outer host PID17016
      └─ Node preflight PID21336
         ├─ pg_controldata.exe PID6232
         └─ powershell.exe NTFS/listener helper PID19540
```

Quan hệ556→892 từ observer process.ppid và launch metadata;892→17016 từ observer spawn PID;17016→21336 từ .NET Process.Start PID và Node process.ppid;21336→hai child từ native spawnSync PID/caller tap. Không dùng suy đoán theo tên process.

| Process | PID / parent | Start evidence UTC | End evidence UTC | Native exit | Signal/error | Timeout |
|---|---|---|---|---|---|---|
|PowerShell outer|17016 /892|OS StartTime **07:48:47.5443132Z**|observer exit event **07:48:50.160Z**|**0**|null/null|false|
|Node preflight|21336 /17016|OS StartTime **07:48:48.0612414Z**|Process.WaitForExit/ExitCode recorded **07:48:50.1243692Z**|**0**|null/null|false|
|pg_controldata|6232 /21336|spawn request **07:48:48.265Z**|spawnSync returned **07:48:48.427Z**|**0**|null/null|false|
|PowerShell helper|19540 /21336|spawn request **07:48:48.428Z**|spawnSync returned **07:48:50.094Z**|**0**|null/null|false|

Times UTC, cộng7giờ để đọc giờ Việt Nam. Hai child start times là **mốc yêu cầu spawn**, không phải OS creation time đã đo; end là lúc nhận native completion, không phải crash time. .NET trên Windows trả ExitCode, không có POSIX signal độc lập; signal=null không phải quan sát GPIO/phần cứng. Không có native launch error được ghi nhận.

Observer OS StartTime **07:48:47.3055405Z**, outcome written **07:48:50.162Z**; sau đó PID892 không còn chạy. Không gán một native exit code độc lập cho chính observer chỉ từ việc nó ghi outcome/biến mất. Bốn process mục tiêu có native exit riêng như bảng; không dùng JSON safety facts thay thế chúng.

Files chính: `launch-metadata.json`, `observer-start.json`, `outer-self.json`, `node-native-start.json`, `node-trace.jsonl`, `node-native-exit.json`, `outer-native-exit.json`, `observer-outcome.json`, `safety-facts.json`, `verification.json`.

### D. Safety checks actually passed

Original preflight không thay đổi safety assertions. Trong lượt thực tế:

- PG_VERSION17, không postmaster.pid, canonical/reparse checks giữ nguyên.
- Exact PGDATA **C:\DATN\test-instances\phase13-3b\data**; systemID **7698826681383327460**; state **shut down** qua pg_controldata thật.
- Bốn binary pg_ctl/pg_controldata/psql/postgres SHA256 khớp original pins. Chỉ pg_controldata được thực thi, không pg_ctl start/postgres server/psql connect.
- Exact operator/owner SID **S-1-5-21-1432835263-483988321-3159128977-1001**, protected DACL/operator-only root và data theo checks gốc.
- Listener count0 trên55433/55001/55173.
- Hai native child status0, stderrBytes0, signals/errors rỗng. Node và outer đều native exit0, stdoutBytes/stderrBytes0; facts ghi private file chứ không dựa vào console JSON.
- Facts timestamp **2026-11-02T07:48:50.095Z**; `checks-returned` at **07:48:50.096Z**.

Không start PostgreSQL/backend/frontend, không mở DB/MQTT, không đọc credentials hoặc sửa config/ACL/PGDATA. Test future DEV flags false/false và publish-block giữ nguyên source, **không được gọi là runtime attestation của một backend chưa chạy**.

### E. Event1000/1001 after this execution

Query Application Log lúc **2026-11-02T07:49:55.5538898Z**, window **07:48:46Z–07:49:10Z**, lọc Application Error theo sáu PID tree trên và WER APPCRASH theo powershell.exe/node.exe/pg_controldata.exe. **0 relevant events** trong cửa sổ đó.

Một câu lệnh đọc hậu kiểm đầu tiên bị PowerShell ParserError trước khi thực thi; đã sửa cú pháp và chỉ chạy lại truy vấn event/ACL read-only. Không chạy lại diagnostic/preflight. Exit1 của parser hậu kiểm không phải native exit của bốn process mục tiêu; giữ phân biệt rõ.

Event cũ ở mục Q vẫn tồn tại như bằng chứng lịch sử; không xóa log, đổi WER/registry hoặc bật dump. Không có event mới trong cửa sổ quan sát không chứng minh tính ổn định dài hạn.

### F. Findings and root-cause limits

**Case D — D_ALL_NATIVE_EXITS_ZERO.** Lượt này không tái hiện access violation; không process mục tiêu nào trả exit bất thường. Đã chứng minh một lần preflight hoàn tất bằng native exits độc lập, thay vì lấy JSON output làm PASS.

Không thể dùng lượt thành công này để khẳng định crash trước đã được sửa vĩnh viễn hoặc hồi tố caseA cho PID21828. Instrumentation bổ sung observer/host và ghi metadata có thể thay đổi timing; root cause bên trong native host của sự cố cũ vẫn chưa được chứng minh. Không sửa Windows/Node/PostgreSQL/Prisma, không bypass gate hoặc chuyển execution wrapper production.

### G. Verification and readiness

`verification.json` đối chiếu process tree, một node run/hai children, native exits, checksPassed và unchanged hashes; classification **D_ALL_NATIVE_EXITS_ZERO**. SHA256 **C7C07367130B67B1D4C677A9A021C7D05744162AD553E2993FFAD4C1E487E5C3**.

**DEV_PREFLIGHT_COMPLETION_PASS** — chỉ cho snapshot/lượt diagnostic **14:48:47–14:48:50 ngày02/11/2026**. Không tự chuyển thành live acceptance PASS hoặc bảo đảm snapshot còn fresh cho phiên sau.

Hành động tối thiểu tiếp theo: người dùng quyết định một phiên live DEV mới, revalidate fresh broker/ports/source/TEST identity và pump-unplugged trong đúng phạm vi approval trước startup/CONNECT. Không tự resume phiên live cũ, không dùng phê duyệt one-shot diagnostic làm quyền CONNECT. Không cần lặp thêm crash diagnostic chỉ để tích lũy PASS khi chưa có bằng chứng mới.

**ONE_SHOT_DIAGNOSTIC_CASE_D**  
**DEV_PREFLIGHT_COMPLETION_PASS**  
**PREVIOUS_ACCESS_VIOLATION_PERMANENT_FIX_NOT_VERIFIED**  
**LIVE_MQTT_CONNECT_NOT_EXECUTED**  
**SOIL_SENSOR_QUALITY_BLOCKED**  
**AUTO_IRRIGATION_PHYSICAL_NOT_EXECUTED**

STOP sau đúng một diagnostic. Không khởi động hệ thống hoặc MQTT, không ON/OFF/Automation/flash/reset/cấp nguồn bơm.

## S — Approved real ESP32 DEV end-to-end acceptance (02/11/2026)

### A. Fresh preflight result and approval lineage

Phê duyệt thực mới: attachment **794e7ca3-db2c-4a97-b124-073d48833f2a/Pasted text.txt**. Operator xác nhận adapter bơm đã rút/ESP32 USB only, cho phép đúng một DEV session, không ON/OFF/production/auto retry. Người dùng nhập existing backend MQTT credential tại Get-Credential sau khi gõ phrase vận hành trong launcher; không gửi password qua chat. Không dùng lại approval/attempt cũ.

Fresh native-observed preflight artifacts:

`C:\DATN\test-instances\phase13-3b\preflight-process-diagnostic-1793606670107-334d1e`

Original source/assertions và R instrumentation hashes không đổi, nên không chạy lại70/20test suites đã PASS. Source/binary hashes được so trước chạy. Trong **2026-11-02T08:04:43.753Z–08:04:45.935Z** (15:04:43–15:04:45 UTC+7):

| Process | PID | Native exit | Timeout / signal / error |
|---|---:|---:|---|
|PowerShell outer|21248|0|false /null /null|
|Node preflight|20556|0|false /null /null|
|pg_controldata|22552|0|false /null /null|
|PowerShell NTFS/listeners|22760|0|false /null /null|

**FRESH_DEV_PREFLIGHT_PASS**. TEST exact systemID/PGDATA/state shut down, binaries, operator NTFS/reparse/postmaster.pid/listener gates đều đạt. Không coi facts JSON là thay native exits. Independent observer PID22692, classification D_ALL_NATIVE_EXITS_ZERO, verification create-new.

Private approval là bản sao nguyên văn attachment mới, file `live-approval.txt` trong fresh-preflight directory, SHA256 **93F8F4A5265B4A08518152E1ABA58AE06677C54BE135BF85629ED019A109F17E**. Parent/root operator-only NTFS và reparse kiểm tra trước tạo; không sửa production ACL.

Sau Phase A PASS, gọi interface hiện hành:

```powershell
node scripts/mvp-real-esp32-session.cjs --prepare RESUME_EXISTING_DEVICE <private-new-live-approval-path>
```

Preparation native exit0. Private run **version2**, mode **RESUME_EXISTING_DEVICE**:

`C:\DATN\test-instances\phase13-3b\mvp-real-esp32-1793606725030-a2219a`

Internal read-only preflights của prepare/execute giữ nguyên theo runner contract; không retry một preflight bị fail. Run/attempt create-new, không overwrite evidence cũ. Run và prepared.json owner/ACL chỉ operator được kiểm tra trước mở launcher PID14208.

### B. Broker identity

Fresh snapshot LAN **172.20.10.2**, listener **0.0.0.0/[::]:1883 PID16148**, start **2026-11-02T07:00:35.7709130Z**; khớp operator attestation executable/config đã có. Loopback **PID22124** riêng.

- Config SHA256 **084DFBFCF4DF6A7C30A4C3AFD0CE91DE31749FF9D572E361E7234EBA6F598F6F**.
- ACL SHA256 **4A18580727297602943818714405A4437B24BEA1905274E32A19EE8C0BF5E766**.
- Config đã pin password_file **C:/mosquitto/config/passwords**. Không đọc hash hoặc lấy password từ file đó; không sửa/reload/restart broker.
- Backend target explicit mqtt://172.20.10.2:1883, account smartagri_backend. Không kết nối broker loopback.

### C. PostgreSQL DEV startup/identity

Session start **2026-11-02T08:07:01.311Z**, end **08:07:22.869Z** (15:07:01–15:07:22 UTC+7).

- pg_ctl cluster-start native **PID13656, exit0**.
- Postmaster start SQL timestamp **2026-11-02T08:07:02.211Z**.
- Exact database **smart_agriculture_mvp_dev**, role **sa_mvp_dev_app**, port **55433**, PGDATA **C:\DATN\test-instances\phase13-3b\data**.
- SystemID preflight/finalControl **7698826681383327460**; postmaster.pid PGDATA/port/start matching, app-role nonprivileged capabilities và **11migration names/checksums/finished/not-rolled-back** checks passed trước RESUME event.
- No initdb/migration/seed/restore. Không DATABASE_URL production fallback hoặc SQL5432.

| SQL DEV metric | Before | After |
|---|---:|---:|
|DeviceCommand total|0|0|
|PENDING|0|0|
|Enabled automation rules|0|0|
|Actuator state ON|0|0|

### D. Existing eight-record validation

Actual event **EXISTING_REAL_DEVICE_MAPPING_VERIFIED_READ_ONLY** at **2026-11-02T08:07:03.159Z**. Helper chạy bounded repeatable-read READ ONLY transaction và hydrate exact registration IDs đã pin trong E/O:

- Farm cmvtxbkc90001um8ks1hk03hm, zone cmvtxbkd20003um8kdf93cfx4.
- Device cmvtxbkde0005um8koudtvcda /ESP32-GF-A-01, CONTROLLER/ESP32 DevKit V1.
- TEMP_01 cmvtxbkdh0007um8k48yxqnms; HUM_01 cmvtxbkdt0009um8k0aeixu24; LIGHT_01 cmvtxbkdv000bum8kzj97uk3p; SOIL_01 cmvtxbkdw000dum8kqn85q98p.
- PUMP_01 cmvtxbkdx000fum8k19dyhm22 /PUMP/GPIO26.
- Ownership, exact relations/types/ACTIVE/counts đều passed. Không create/update/upsert/delete identity records để sửa mapping. Presence/state updates thông thường của backend startup/watchdog không được dùng làm fresh hardware evidence.

### E. Backend runtime safety

Actual backend **PID26544**, runtime attestation **2026-11-02T08:07:10.162Z**:

```json
{"pid":26544,"startedAt":"2026-11-02T08:07:10.162Z","testMode":true,"effectiveMaxRunSeconds":1,"commandsEnabled":false,"automationEnabled":false}
```

Backend bind guarded **127.0.0.1:55001**, isolated closed env/production dotenv block. Unique client ID **mvp-iot-backend-real-mvp-real-esp32-1793606725030-a2219a**, clean=true, reconnectPeriod0, resubscribe=false, no WILL.

Transport source hash **E15DDC199F1ABDF8E8F646398AA1170F169C1DFAB4A05F1B27A48C206DA0ACA9**, lower/public publish blocker dependency **1292C679F78B157EB6F8A5FF3775D02D1E21485E314FBFD8EB7E51E765713CD1**. Source/offline tests đã chứng minh chặn .publish và _sendPacket publish độc lập flags. Actual TRANSPORT_ERROR/CLOSED IPC xuất phát từ receive-only wrapper này; không có observer MQTT client riêng. Startup attestation JSON không có field publishBlocked: không tự thêm field đó vào log lịch sử.

Không có counter độc lập đếm mọi publish-call attempts trong implementation hiện tại: **PUBLISH_ATTEMPT_COUNTER_NOT_INDEPENDENTLY_CAPTURED**. Summary.safety.applicationMqttPublishes=0 là runner declaration, không trình bày thành packet capture/counter đo được. Không có application PUBLISH chủ động do Agent; source guards active và SQL commands0 trước/sau xác minh độc lập cho phần DeviceCommand. Không ON/OFF.

### F. MQTT CONNECT/SUBACK

Một backend MQTT client/CONNECT attempt theo runner; **automatic reconnect=0**, không tạo client thứ hai hoặc retry. Backend stderr chỉ chứa:

```text
MQTT connection error: Connection refused: Not authorized
```

Actual diagnostic IPC: **TRANSPORT_ERROR**, sau đó **TRANSPORT_CLOSED**. Không có successful CONNACK hoặc SUBACK event; broker từ chối trước subscription acceptance. Raw denial CONNACK packet/numeric return code không được capture bởi tap hiện tại: **NOT_CAPTURED**, không tự dựng payload hoặc gán code như bằng chứng đọc trực tiếp.

Health lúc **2026-11-02T08:07:22.241Z**: database=connected, mqtt=disconnected. Runner stop **DEADLINE_BACKEND_MQTT_CONNECTED** at **08:07:22.456Z**. Auth failure không được coi là lỗi preflight/PGDATA/firmware. **BACKEND_MQTT_AUTH_BLOCKED**.

UTF-8 source fix giữ nguyên và hashes match; nó chưa đủ giải quyết failure trong phiên này. **PASSWORD_MATCH_NOT_VERIFIED**: không kết luận operator nhập sai password, không tự reset/rotate hoặc lấy credential production thay thế.

### G. Real telemetry evidence

**0 raw MQTT receipt events**,0successful CONNACK,0SUBACK trong summary. Không vào LIVE_RECEIPTS stage. Mục tiêu3fresh batches/12readings chưa được thực hiện; không có12hardware rows correlated trong phiên. Không sử dụng simulator/history/retained hoặc Serial PUBACK làm thay thế.

### H. Database correlation

Identity/migration/mapping SQL PASS như C/D, nhưng hardware reading correlation **BLOCKED**. Không trực tiếp INSERT hoặc giả OFF/ONLINE. Không start lại TEST để đếm thêm sau cleanup; không gọi tổng readings lịch sử là số readings mới của phiên này. New hardware commits không được nghiệm thu;0correlated readings được ghi trong reviewed-outcome.

### I. REST API evidence

Chỉ readiness/health API được gọi trước MQTT gate. Không authenticated login/history/chart/device/latest/actuator acceptance sau gate fail. Database-connected health không đủ MQTT/DB/API acceptance. Không POST command hoặc fake state.

### J. Browser/UI evidence

**FRONTEND_NOT_STARTED / BROWSER_NOT_STARTED**. MQTT gate fail trước WEBSITE stage; không screenshot UI mới của phiên này, không start frontend55173 hoặc dùng ảnh30/10 để hợp thức hóa. Software UI acceptance lịch sử giữ nguyên nhưng không nâng thành live ESP32 E2E PASS.

### K. Soil quality

**SOIL_SENSOR_QUALITY_BLOCKED** giữ nguyên vì không có chất lượng/calibration/rawADC evidence mới. Không nhận Serial frame mới hoặc MQTT quality metadata, nên không khẳng định ADC hiện tại vẫn4095; đó là bằng chứng lịch sử chưa được gỡ gate. Không xem soil0%/100% hay một lần numeric-range-valid trước đây là xác nhận soil đủ tin cậy để tưới. Không bật automatic irrigation.

### L. Cleanup and process exit codes

- Backend PID26544 graceful SIGTERM qua IPC, actual native **exit0/signalnull**.
- pg_ctl cluster-stop native **PID584, exit0**, chỉ TEST cluster owned bởi phiên; kiểm tra không còn client khác trước smart stop.
- Final control: exact systemID7698826681383327460 /PGDATA đã pin /state **shut down**.
- Fresh post-cleanup listener snapshot: **không55433/55001/55173**, brokerLAN16148 và loopback22124 giữ nguyên.
- Commands0/PENDING0/enabledAutomation0/actuatorON0 trước/sau. Không tạo DeviceCommand, không bật flags DEV, không tác động production flags/DB/broker, không flash/reset/cấp nguồn bơm.
- Frontend/browser không được tạo nên không có process tương ứng cần dừng. Interactive launcher NoExit có thể còn cửa sổ console đã kết thúc session; không phải backend phục vụ còn chạy, không force-close cửa sổ người dùng.
- Không có external native-exit record riêng của orchestrator Node từ cửa sổ credential trong evidence; không coi console/session process exit0 (nếu có) là acceptance PASS. Acceptance dựa summary failure và từng metric, cleanup exits là bằng chứng dừng graceful.

Files evidence mới: prepared.json/attempt.json/summary.json, backend stdout/stderr, cluster-start/stop native results/logs, postgres-startup.log, **reviewed-outcome.json**. Original logs/attempts cũ giữ nguyên. Source hashes và approval hash rechecked sau session đều match; không sửa runtime code/config để vượt authentication.

### M. Remaining blockers and final verdict

Đã vượt blocker preflight completion trong phiên mới và xác minh được TEST identity/resume8records/runtime false/false/cap1. Blocker còn lại thực tế là **MQTT authentication Not authorized**; chưa chứng minh password mismatch, broker authentication policy/runtime credential state hoặc nguyên nhân khác.

Bước tối thiểu đề xuất cho phạm vi chẩn đoán riêng: đối chiếu broker authentication logs quanh **15:07:10 ngày02/11/2026** và cách operator xác định existing backend credential, không mở thêm account/Observer, không sửa ACL hoặc tự retry CONNECT. Nếu cần kiểm chứng auth mới phải có approval riêng và giới hạn rõ. Không khởi động lại DEV hoặc đổi/reset password trong phiên đã dừng này.

**DEV_PREFLIGHT_PASS**  
**BACKEND_MQTT_CONNECT_BLOCKED**  
**BACKEND_MQTT_AUTH_BLOCKED**  
**ESP32_LIVE_TELEMETRY_BLOCKED**  
**ESP32_LIVE_DB_API_BLOCKED**  
**ESP32_LIVE_UI_BLOCKED**  
**SOIL_SENSOR_QUALITY_BLOCKED**  
**AUTO_IRRIGATION_PHYSICAL_NOT_EXECUTED**

**END_TO_END_NOT_ACCEPTED**. STOP sau một phiên/CONNECT; cleanup hoàn tất, không auto retry/recovery hoặc chuyển sang tưới tự động.

## T — MQTT Backend Authentication Root Cause Investigation (02/11/2026)

### A. Scope and broker identity

Scope READ-ONLY AUTH DIAGNOSIS — **NO MQTT CONNECT**, theo attachment `96d572cf-6d48-4f56-aca0-5a24d9b4462b/Pasted text.txt`. Không resume run S hoặc nhập credential mới.

- LAN listener hiện tại **0.0.0.0/[::]:1883 PID16148**, start UTC **2026-11-02T07:00:35.7709130Z**. Uptime trong snapshot đầu **11221giây**, không long-running monitor.
- Loopback **127.0.0.1/[::1] PID22124** riêng. Không mở TCP/MQTT probe tới instance nào.
- PID/start khớp operator attestation đã có cho executable/config. Current ExecutablePath/CommandLine vẫn không nhìn thấy ở quyền hiện tại; không tuyên bố agent mới đọc elevated metadata hoặc image hash resident.
- **GetOwnerSid return0**, broker owner SID khớp operator hiện hành. Không xuất SID/tên các tài khoản broker khác.
- Win32_Service query cho PID16148 trả **0 service matches** lúc **2026-11-02T10:12:28.3521443Z**; không nhầm LAN console instance với service loopback.

| File trên đĩa | SHA256 hiện tại |
|---|---|
|C:\mosquitto\config\mosquitto.conf|084DFBFCF4DF6A7C30A4C3AFD0CE91DE31749FF9D572E361E7234EBA6F598F6F|
|C:\mosquitto\config\acl|4A18580727297602943818714405A4437B24BEA1905274E32A19EE8C0BF5E766|
|C:\Program Files\mosquitto\mosquitto.exe|DAA688DBC3685890999084DA72F98EA0FAE9557F7544A2CB96B44EF46563F2A2|
|C:\Program Files\mosquitto\mosquitto_passwd.exe|9AADA8D15840313A99343423BFE831519E35FD0BC229FA0B8907DCE3F96858A7|

Hashes khớp baseline đã review; disk binary có cùng identity với bản2.1.2 đã kiểm tra help trước đây. Không chạy mosquitto/mosquitto_passwd hoặc sửa file để xác minh lại version/auth. Không thấy config include/plugin/auth_plugin/global_plugin theo config đã pin.

### B. Authentication-store metadata and chronology

Config xác định đúng `password_file C:/mosquitto/config/passwords` và `acl_file C:/mosquitto/config/acl`.

| Metadata password_file | Kết quả chỉ đọc |
|---|---|
|Exists/path|C:\mosquitto\config\passwords, tồn tại|
|Size|**404bytes**|
|Creation UTC|**2026-10-12T05:17:14.0903227Z**|
|LastWrite UTC|**2026-10-12T05:17:33.3280875Z**|
|NTFS owner|BUILTIN\Administrators|
|DACL|Protected, không kế thừa; một Allow ACE FullControl cho operator|
|Broker owner vs ACL principal|GetOwnerSid xác nhận cùng operator có Allow ACE|
|Exact smartagri_backend entries|**1**|
|Algorithm format|**PBKDF2-SHA512**, chỉ nhận diện algorithm tag|

Scanner read-only giữ username prefix trước `:`, chỉ kiểm tra algorithm tag của **target backend entry**, bỏ qua salt/digest/iterations và mọi hash bytes còn lại; không tích lũy/giải mã/in/hash/copy password-file contents. Size/mtime trước/sau scan không đổi. Không xuất entry hoặc username khác. Không kiểm chứng salt/digest integrity, full hash syntax, password match hoặc native verification.

Format sha512-pbkdf2 được [Mosquitto passwd manual](https://mosquitto.org/man/mosquitto_passwd-1.html) công bố hỗ trợ. Đây là compatibility assessment theo nhận diện format + documented version, **không phải runtime password-verification PASS**. Không suy từ default algorithm trong help thành format thực của entry.

LastWrite12/10 **trước** broker start02/11; boolean modifiedAfterBrokerStart=false. Vì vậy **không có timestamp evidence cho giả thuyết file vừa đổi sau startup khiến broker giữ auth state cũ**. Không gán BACKEND_AUTH_STORE_STALE_POSSIBLE chỉ vì lỗi Not authorized. Mtime không thay full audit history; chưa chứng minh toàn bộ reload/load history hoặc auth table đang resident trong memory.

[Mosquitto authentication documentation](https://mosquitto.org/documentation/authentication-methods/) nêu password-file changes cần broker reload; không áp dụng Unix signal command trên Windows hoặc thực hiện reload trong task này. Không tìm thấy record deployment/reload mới chứng minh khác biệt auth-store disk vs memory.

### C. Broker log evidence

Config chỉ có log_type error/warning/notice, **không log_dest file**, không include khác. Không tìm thấy `*.log` dưới `C:\mosquitto` trong read-only inventory.

Theo [Mosquitto config manual](https://mosquitto.org/man/mosquitto-conf-5.html), non-service default log destination là stderr. LAN PID16148 không có service match, nên **expected stderr/console** theo default config; không được coi là đã kiểm tra handles/redirection thực của process. Chưa xác minh được console buffer hoặc external redirection của PID này; không attach console, đổi log destination/debug hoặc restart để tạo log.

**LOG_UNAVAILABLE** cho broker authentication log quanh **15:07:10 UTC+7 ngày02/11/2026**. Không có broker-side entry để phân biệt password verification failure, unknown user, client-ID rejection, store-load failure hoặc auth policy rejection. Không kết luận không có denial chỉ vì không có file log.

Evidence hiện có là backend client stderr run S: `MQTT connection error: Connection refused: Not authorized`, cùng TRANSPORT_ERROR/CLOSED. Đây là **client evidence**, không phải broker log; numeric denial CONNACK/raw packet chưa capture như mục S.

### D. Backend auth handoff and CONNECT options

Source hashes của toàn bộ SOURCES trong prepared.json run S được so với file hiện tại và **đều match** lúc **2026-11-02T10:09:59.050Z**. Không rerun launcher/client. Run **mvp-real-esp32-1793606725030-a2219a** dùng:

| Option / boundary | Bằng chứng source + artifacts |
|---|---|
|Username|smartagri_backend, exact guard tại launcher/session/backend/transport|
|Broker|mqtt://172.20.10.2:1883, không loopback|
|Client ID|mvp-iot-backend-real-mvp-real-esp32-1793606725030-a2219a; không trùng ESP32-GF-A-01 hoặc default production smartagri-backend theo source|
|Protocol|Local installed MQTT.js defaults protocolId MQTT /protocolVersion4, tương ứng MQTT3.1.1; app không override version|
|Session/reconnect|clean=true, reconnectPeriod0, resubscribe=false, connectTimeout10000ms|
|WILL|Không có; receive-only wrapper từ chối nếu options.will tồn tại|
|Password handoff|Get-Credential→GetNetworkCredential().Password→UTF8 BaseStream→stream UTF8 decoder→child MQTT_PASSWORD→env→mqtt.connect; không trim/normalize/CLI password|
|.env overwrite|closed environment + dotenv stub + repo .env read block; không fallback production secret|
|Other secrets|DB app password từ bundle TEST dùng biến riêng; không lấy MQTT credential từ bundle theo source contract|

Unique client ID được derive từ run mới và source guard; không inventory mọi connection/client ID trên broker nên không khẳng định không thể có external client cố tình dùng cùng ID. Không có bằng chứng options/client-ID mismatch hoặc broker rejection do ID. **BACKEND_CONNECT_OPTIONS_MISMATCH_CONFIRMED không được kết luận**.

Tách biệt ba kết quả:

- Synthetic credential round-trip /UTF8 fragmented-stream tests **PASS** theo O, không chạy lại vì source không đổi.
- **Real password match NOT_VERIFIED**: không đọc, kiểm tra hoặc hỏi password trong phase T.
- **Actual MQTT authentication BLOCKED** theo phiên S, kể cả sau UTF8 fix. Không chứng minh được real password đúng hoặc sai chỉ từ source/round-trip.

### E. Credential provenance

Tài liệu `infrastructure/mosquitto/README.md` có workflow tạo file password mới với account backend trước, thêm device account sau và nhập password tương tác. `mosquitto.conf.example` khai báo đúng các paths hiện hành. Đây là **hướng dẫn**, không phải receipt chứng minh lệnh nào đã được operator thực thi vào12/10, ai chọn password, password hiện tại được operator lấy từ đâu hoặc đã dùng trong Get-Credential hay chưa.

Đã đối chiếu các báo cáo PHASE12C3/PHASE13_4G/PHASE13_4H/PHASE13_4H1 và observer proposal: có kế hoạch rotation/ACL, ghi CREDENTIAL_ROTATION_NOT_PERFORMED trong các phase preparation; không thấy receipt backend-password rotation/execution hoặc credential source attestation giúp chứng minh password đang nhập khớp entry hiện hành. Không mở .env, config.local.h, firmware binaries, backup chứa secrets hoặc password manager để suy ra password.

Creation/mtime12/10 và đúng1entry xác nhận metadata của auth store hiện hữu, không chứng minh quy trình tạo thực tế. **CREDENTIAL_PROVENANCE_UNVERIFIED / BACKEND_CREDENTIAL_PROVENANCE_UNVERIFIED**.

### F. Confirmed findings and remaining uncertainty

**BACKEND_AUTH_STORE_ENTRY_CONFIRMED**: đúng một backend entry, format tag nhận diện PBKDF2-SHA512; process owner có NTFS Allow đọc, config/hash/broker PID chronology khớp.

Chưa đủ bằng chứng để kết luận:

- Auth store stale sau sửa file: mtime không hỗ trợ giả thuyết này; live memory/load/reload state chưa trực tiếp đọc.
- Hash không hỗ trợ/corrupt: format được nhận diện/documented supported, chưa verify payload.
- Password sai: chưa có offline match hoặc broker verification detail.
- Policy denial: Not authorized chung không phân biệt nguyên nhân; không broker auth log, không kết luận BACKEND_AUTH_POLICY_DENIAL_CONFIRMED.
- Connect option mismatch: không thấy mismatch trong đường đã review.

**BACKEND_AUTH_ROOT_CAUSE_UNDETERMINED**. Không có cơ sở sửa ACL, thêm Observer account, restart broker hoặc lặp E2E để giải quyết uncertainty này.

### G. Minimal next action — operator choices, approval required

**Phương án1 — ưu tiên giữ credential hiện hữu:** một phiên xác minh **offline** riêng, được phê duyệt trước. Chọn verifier đáng tin cậy đã review/test-vector cho Mosquitto PBKDF2-SHA512; operator nhập password hiện hữu tại secure local prompt. Verifier chỉ đọc đúng target entry trong bộ nhớ và trả MATCH/NO_MATCH/FORMAT_UNSUPPORTED, không network/MQTT, không CLI/environment global/file password, không in/copy salt/hash. Cần thiết kế/review/test synthetic trước khi dùng với entry thật; không dùng tiện ích thiếu verify mode hoặc tự đoán `mosquitto_passwd --test`. **Chưa triển khai hoặc chạy phương án này**.

Nếu MATCH, vẫn phải đối chiếu broker runtime auth state/log/endpoint trước một CONNECT được phê duyệt riêng; offline disk match không đảm bảo broker memory dùng cùng state. Nếu NO_MATCH, không tự đổi password; operator có thể chọn hướng2.

**Phương án2 — nếu không thể xác minh/khôi phục provenance:** chuẩn bị rotation **chỉ smartagri_backend**. Cần approval riêng cho protected backup password_file/config/ACL, nhập secret mới cục bộ, update duy nhất account hiện hữu (không -c overwrite file hoặc -b CLI password), bảo toàn ESP32/ACL và các accounts khác. Review Windows reload/restart mechanism/permissions đúng LAN instance và maintenance impact; không giả định Unix SIGHUP dùng được. Kiểm kê client backend đang dùng credential trước cutover; chuẩn bị cập nhật đúng client configuration, kiểm chứng flags an toàn và reconnect có giới hạn sau approval. Rollback phải dùng đúng protected snapshot và cấu hình client tương ứng trong phạm vi được duyệt, không tự áp dụng.

Rotation có thể gián đoạn backend/ESP32 qua broker lifecycle và cần fresh OFF sau reconnect; không hứa zero-downtime. Không mặc định firmware cần đổi vì chỉ rotate backend account. Không thực hiện backup/credential update/reload/restart trong phase T.

### H. Stop and safety

Chỉ cập nhật tài liệu; không sửa source/runtime/ACL/password_file, không tạo account hoặc copy auth store, không nhập real password hoặc chạy password utility. Không MQTT CONNECT/SUBSCRIBE/PUBLISH, DB connection/start TEST, backend/frontend start, DeviceCommand/ON/OFF/Automation, broker restart/reload, firmware/nguồn bơm. Current runtime flags/PENDING không được query; không dùng history làm live safety attestation.

**BACKEND_AUTH_STORE_ENTRY_CONFIRMED**  
**BACKEND_CREDENTIAL_PROVENANCE_UNVERIFIED**  
**BACKEND_AUTH_ROOT_CAUSE_UNDETERMINED**  
**LOG_UNAVAILABLE**  
**LIVE_MQTT_CONNECT_NOT_EXECUTED_IN_PHASE_T**  
**SOIL_SENSOR_QUALITY_BLOCKED**

STOP sau targeted diagnosis. Không retry DEV acceptance hoặc tự thực hiện một trong hai phương án trên.

## U — Offline MQTT password verifier preparation (02/11/2026)

### A. Scope and crypto-format research

Phê duyệt hiện tại **IMPLEMENT + SYNTHETIC TEST ONLY**. Kế thừa S/T nhưng không mở auth store thật, nhập password thật, chạy broker utility hoặc CONNECT. Không tạo real-verification approval/attempt trong phase này.

Đã đối chiếu source chính thức **tag v2.1.2**, tương ứng disk binary identity đã review trước đây:

- [libcommon/password_common.c](https://github.com/eclipse-mosquitto/mosquitto/blob/v2.1.2/libcommon/password_common.c), Git blob `ea4d7aae9f9b6d22553b2bc6b9b0600204c7808d`: format, PBKDF2, lengths và constant-time comparison.
- [include/mosquitto/libcommon_password.h](https://github.com/eclipse-mosquitto/mosquitto/blob/v2.1.2/include/mosquitto/libcommon_password.h), blob `72d7cbc1217d6f69958800d60889e360ebcf42cb`: algorithm ID7 là SHA512_PBKDF2.
- [plugins/password-file/password_parse.c](https://github.com/eclipse-mosquitto/mosquitto/blob/v2.1.2/plugins/password-file/password_parse.c), blob `e7a612c93a65d34681538d7d145f5e59d858243b`: username/entry parsing, duplicate và decode error handling.
- [plugins/password-file/password_check.c](https://github.com/eclipse-mosquitto/mosquitto/blob/v2.1.2/plugins/password-file/password_check.c), blob `b1ef3954fcbfe7f61e9a4da46e3e393b490fe0d8`: exact username lookup và verification call.
- [apps/mosquitto_passwd/get_password.c](https://github.com/eclipse-mosquitto/mosquitto/blob/v2.1.2/apps/mosquitto_passwd/get_password.c), blob `0ac8b0ed5b21c94374ac1a3ccef979a343deb7c0`: interactive non-echo input và password byte handling.

Format được xác minh: `smartagri_backend:$7$iterations$saltBase64$digestBase64`. Iterations lưu dạng decimal dương; crypto là **PBKDF2-HMAC-SHA512**, output64bytes. Salt decode chấp nhận12 hoặc64bytes; digest decode đúng64bytes. C code hash password bytes với strlen, không tự normalize Unicode; so sánh digest bằng constant-time routine. Verifier quy định input UTF-8 để khớp đường MQTT.js/handoff hiện hành, không suy đoán lại encoding của credential tạo bằng console cũ.

Không dựa vào mô tả default Argon2 trong help để đoán format. Không dùng source master thay tag đã pin, không copy C implementation vào runtime hoặc đọc hash thật để nghiên cứu.

### B. Implementation and files

| File | Vai trò |
|---|---|
|scripts/offline-mqtt-password-verifier.cjs|Core không IO: parse canonical format7, PBKDF2 bằng Node crypto, timingSafeEqual64bytes; chỉ trả4tokens.|
|scripts/offline-mqtt-password-file.cjs|Read-only adapter: scan username prefixes, chỉ tích lũy target entry, discard hash bytes của account khác; file-change/duplicate/read-error gates.|
|scripts/offline-mqtt-password-verify-cli.cjs|Synthetic CLI hoặc real-once explicit approval gate; stdin raw UTF8 bytes, không password CLI/env; fixed production path chỉ trong mode được duyệt.|
|scripts/offline-mqtt-password-verify-once.ps1|Launcher real-verification **chuẩn bị, chưa chạy**: private approval/source/SID/ACL checks, Get-Credential, UTF8 byte pipe, native exit/result validation, không echo password.|
|scripts/offline-mqtt-password-verifier.test.cjs|Unit/injected-IO/native CLI synthetic tests và fixture integrity checks.|
|scripts/fixtures/offline-mqtt-password-verifier/generate-synthetic.py|Independent Python hashlib/OpenSSL reference, dữ liệu PUBLIC SYNTHETIC; chỉ create-new files.|
|scripts/fixtures/offline-mqtt-password-verifier/synthetic-*.pw|5valid synthetic reference files +1broken synthetic file, không credential thật.|
|scripts/fixtures/offline-mqtt-password-verifier/synthetic-manifest.json|Reference metadata/SHA256, không chứa plaintext candidate password.|

API ngoài chỉ có:

| Result | CLI native exit | Ý nghĩa |
|---|---:|---|
|MATCH|0|Candidate bytes khớp selected entry đã đọc ổn định.|
|NO_MATCH|1|Format hợp lệ, derive/comparison hoàn tất nhưng digest khác.|
|FORMAT_UNSUPPORTED|2|Format/parameters/input nằm ngoài canonical subset được hỗ trợ.|
|VERIFICATION_ERROR|3|I/O/permission/missing-or-duplicate account/change/error/approval failure.|

Không trả exception/raw stack/object chứa entry. Read/crypto/compare errors không biến thành NO_MATCH. File đọc `r`, không có auth-store write API. Fixed username **smartagri_backend**, không username override.

### C. Deliberate strict subset and limits

- Canonical Base64 có padding/round-trip đúng; salt12/64bytes, digest64bytes, không trailing fields hoặc whitespace trong hash. CRLF line ending được xử lý riêng, không trim candidate.
- Iterations từ1 đến **1,000,000**; vượt giới hạn hoặc decimal không canonical (ví dụ atoi quirks/leading zero) trả FORMAT_UNSUPPORTED, không tự hạ iteration hoặc coi password sai.
- Candidate tối đa4096UTF8bytes; NUL/invalidUTF8 bị từ chối, không tự áp dụng C-string truncation hoặc normalization. File tối đa1MiB, target entry bounded; alias username whitespace bị từ chối thay vì đoán.
- So sánh constant-time chỉ sau khi xác minh hai digest64bytes. Salt/digest/derived/password buffers được clear trong finally; Node isUtf8 tránh tạo password string cho bước validation.
- String tạm của Base64, .NET NetworkCredential plaintext và SecureString/GC không thể bảo đảm xóa sạch mọi bản sao memory. Không tuyên bố chống admin/malware/memory dumps. Không lưu chúng ra file/log và giới hạn lifetime/references.
- Một hash bị sửa nhưng vẫn đúng syntax có thể trả NO_MATCH; crypto không thể phân biệt việc store bị thay hợp lệ-format với candidate sai. NO_MATCH không tự chứng minh người dùng gõ sai.
- Legacy console tạo password có thể có byte encoding khác; tool chỉ verify UTF8 bytes của client hiện hành, không thử nhiều encoding hoặc sửa password ngầm.

### D. Synthetic test evidence

Reference fixture được tạo bằng Python `hashlib.pbkdf2_hmac('sha512', ..., dklen=64)`, độc lập code verifier Node; salt sizes12/64 và iterations1/2/1000/4096. Passwords trong test source đều gắn nhãn SYNTHETIC, không sử dụng password thực hoặc output sự cố trước. Chưa chạy native mosquitto_passwd/libmosquitto đối chiếu; compatibility dựa official source contract + cross-language vectors, không gán là native-broker verification.

Final run native exit0, **47/47 PASS**, fail0/skipped0, duration1661.9878ms:

```powershell
node --require ./scripts/acceptance-offline-guard.cjs --test --test-reporter=spec scripts/offline-mqtt-password-verifier.test.cjs
```

Coverage thực tế:

- ASCII/Unicode-tiếng Việt/emoji, spaces đầu-cuối, quotes/backslash/symbols: positive và wrong-candidate negative.
- Không trim/Unicode normalize; composed vs NFD không bị coi là cùng password.
- Corrupt/unsupported format, algorithm, zero/negative/fractional/suffixed/excessive iteration, missing/extra fields, invalid/canonical Base64, salt/digest lengths và padding.
- Missing/duplicate/whitespace-alias username; CRLF; unrelated malformed hash bị discard.
- EACCES/ENOENT/change-race và crypto/compare failures bằng **injected mocks**, không tạo deny ACL trên auth store thật.
- Độ dài64 trước timingSafeEqual, buffer wiping, read-only file mode/no-write spies.
- Native CLI test cho5valid cases, wrong password, broken fixture và invalid production/unapproved paths: stdout chỉ token hợp lệ, stderr rỗng; exit0/1/2/3 được kiểm tra. Synthetic mode từ chối production path trước đọc file; invalid real-mode path bị từ chối trước đọc approval/hash thật.
- Offline network guard active; không import MQTT/http/net/TLS/Prisma/dotenv/app runtime. Không password trong process arguments hoặc environment.

Node syntax PASS cho4JSfiles; PowerShell AST PASS cho prepared launcher. Không mở Get-Credential thật trong tests; secure prompt UI real execution vẫn chưa nghiệm thu.

Fixture SHA256/byte equality trước và sau test **PASS**:

| Synthetic file | SHA256 |
|---|---|
|synthetic-ascii.pw|328ae2f12f9930777e412cd852397534065772867c1241be7c8861ca431042c5|
|synthetic-unicode.pw|dc226b385d0c6506fd8e1dccb576cf41a65f7a961a3dc453e208122d2bac0b4f|
|synthetic-spaces.pw|9f5c2d0c31d475b1e537afeeac318ea368fd61e52f068fd7037128ca191d4e9a|
|synthetic-special.pw|7fce8e974d184e0bdfcd606119629f26fa18f6b06bc13d63e1b14acd87377038|
|synthetic-composed.pw|86d404897f32015981eba7ff47a68b41753a0e3db4a6357ac3e31ad36c8390f8|
|synthetic-broken.pw|9b5caef214e0139a93bf096a7dfcde95a2ffc7fa9e19893fdb7788153cd50865|

Đây là hashes của **public synthetic fixtures**, không password-file production digest hoặc salt/digest của account thật.

### E. Source pins and safety review

| Source | SHA256 |
|---|---|
|offline-mqtt-password-verifier.cjs|8E5B6B307380AB56234AA1C2EA66C24B1AC7A982AA341A605D95F4DF5290F5A4|
|offline-mqtt-password-file.cjs|5496AC333A2FAB728B8D20E658674747786DDB3C326EBE580FE12A0CF01F3139|
|offline-mqtt-password-verify-cli.cjs|D2ECE0F66C7B7DC5551D2AE3770E20099AD0049DC2902DC656FD98A5E0A8F29D|
|offline-mqtt-password-verify-once.ps1|051B1FA54F13C70A526C9A11BCF7E00C0C2762040790147573F2A0D4B72637F7|
|offline-mqtt-password-verifier.test.cjs|35A070406E682BFF68EA65935EBB18DF3F4AF417B0FA2CF0E06DEC4BDA1F5F3A|
|generate-synthetic.py|245830114AEEBC4E8964FEFB36C1B3C9D1E38B5D92FD86256D136D970C1C1BC4|

Không sửa hay wire vào backend, launcher acceptance, .env, firmware, MQTT config hoặc database. Module import không đọc file; real target chỉ được mở khi explicit real-once gate đã qua. Phase U chỉ mở fixture .pw, không đọc actual password_file/hash, không dùng actual password hoặc native password utility.

### F. Exact proposed one-shot real verification procedure — NOT EXECUTED

1. Nhận **phê duyệt riêng** cho đúng một offline verification của existing smartagri_backend, chỉ đọc `C:\mosquitto\config\passwords`, không CONNECT/rotate/reload. Không tái sử dụng approval U (chỉ synthetic).
2. Chuẩn bị private operator-only run directory mới dưới existing test base, tên `mqtt-password-verification-<milliseconds>-<hex>`. Kiểm tra owner/SID/ACL/reparse của directory và approval file, không sửa parent/production ACL. Không lưu password/hash/salt/digest trong directory.
3. Tạo approval.json dựa trên approval thật với scope `ONE_OFFLINE_BACKEND_PASSWORD_VERIFICATION`, username chính xác, passwordFile exact path, maxAttempts1, realVerificationApproved=true **chỉ sau approval**. Pin đường dẫn/bản hash lower-case của user approval evidence và exact4source files core/file/CLI/PowerShell. Chưa tạo artifact real này trong phase U; object/flag không tự thay thế authorization thật.
4. Recheck source hashes và stable auth-store metadata, không copy password_file. Dùng prepared `offline-mqtt-password-verify-once.ps1 -ApprovalDirectory <new-private-dir>` trong một process được giám sát native exit. Không chạy bằng credential trong CLI/env hoặc từ shell transcript.
5. Launcher kiểm tra plan/hash/SID/ACL trước prompt; Get-Credential giữ username cố định. Operator tự nhập existing MQTT password tại máy **một lần**, không chat; gửi raw UTF8 bytes qua anonymous stdin pipe, clear buffers sau gửi. Child closed environment, không production .env fallback.
6. CLI real-mode kiểm tra approval/source pin, reparse fixed auth path và tạo attempt.json create-new trước verify; open read-only, scan đúng entry và metadata-change check. Core derive/constant-time comparison rồi xóa buffers, chỉ xuất4tokens; không network/store update. Không chạy vòng lặp password hoặc retry.
7. Chỉ chấp nhận outcome khi token và native exit tương ứng khớp; child/host crash/timeout/exception → VERIFICATION_ERROR hoặc unknown, STOP, không giả NO_MATCH/MATCH, không force-kill/retry. Launcher15s wait bound, không kill child nếu outcome không rõ.
8. Ghi vào báo cáo chỉ result/native completion và scope, không password/salt/digest/entry. MATCH chỉ xác nhận disk-entry/candidate bytes, **không tự CONNECT** và không chứng minh broker memory dùng cùng auth state. NO_MATCH/FORMAT/ERROR đều dừng và xin quyết định riêng nếu cần xử lý tiếp.

**Không chạy lệnh real-verification trên trong phase U.** Không tạo private approval/attempt giả hoặc tự bật realVerificationApproved trước approval.

### G. Final readiness and stop

**OFFLINE_PASSWORD_VERIFIER_PREPARED_PASS**  
**REAL_PASSWORD_MATCH_NOT_EXECUTED**  
**MQTT_CONNECT_NOT_EXECUTED**  
**SOIL_SENSOR_QUALITY_BLOCKED**

Đã chuẩn bị code và synthetic evidence; chưa giải quyết authentication thực tế bằng MATCH/NO_MATCH. Không start TEST/backend/frontend, không sửa ACL/password_file/credentials/production environment, không restart/reload broker, tạo account/DeviceCommand, bật Automation hoặc ON/OFF/flash/reset/cấp nguồn bơm. STOP, chờ phê duyệt riêng cho một lượt xác minh offline thật.

## W — Offline Password Verifier Network Guard Remediation (02/11/2026)

### A. Root cause và phạm vi bằng chứng

Source audit xác nhận launcher cũ không truyền `--require` cho Node verifier child. Bộ synthetic trước đó dùng `acceptance-offline-guard.cjs`, trong khi guard đó cho phép loopback mock server thuộc test process và không phải deny-all guard cho real-mode. Vì vậy synthetic PASS không chứng minh launcher real-mode đã có network boundary.

`NETWORK_GUARD_SECURITY_GATE_BLOCKED` là blocker được người dùng bàn giao. Snapshot report đọc trong phiên này kết thúc ở U; không tìm thấy heading V. Không tự dựng lại evidence hay native outcome cho phiên V. Phiên W chỉ sửa nguồn và chạy synthetic/offline tests; không sử dụng lại approval/attempt trước.

### B. Minimal source changes

| File | Thay đổi |
| --- | --- |
| `scripts/offline-mqtt-password-network-guard.cjs` | Guard riêng, chỉ kích hoạt qua explicit native `--require`; không tự cài guard khi CLI chỉ import module. Export `assertActive()` kiểm tra marker và các API bị khóa. |
| `scripts/offline-mqtt-password-verify-once.ps1` | Pin thêm guard thành source thứ năm; closed environment giữ nguyên; native probe `--require guard CLI --guard-check` trước `Get-Credential`; verifier child cũng preload bằng explicit argument. |
| `scripts/offline-mqtt-password-verify-cli.cjs` | Assertion đầu main và đầu real-target resolution; guard-only probe không đọc stdin/approval/auth store, không phát verdict password. Attempt create-new tương lai ghi PID, guard policy/active/preloaded và guard source hash. |
| `scripts/offline-mqtt-password-file.cjs` | Assertion ngay trước IO nếu target là đường dẫn auth store thật; không sửa scanner/parser. |
| `scripts/offline-mqtt-password-verifier.test.cjs` | Giữ 47 test cases; native synthetic verifier children chuyển sang preload guard riêng. |
| `scripts/offline-mqtt-password-network-guard.test.cjs` | 7 tests mới cho activation, thiếu preload, pre-read ordering, capability denial, ESM và launcher helper/source-pin gates. |

`offline-mqtt-password-verifier.cjs` không đổi byte/hash; PBKDF2, parser, UTF-8 semantics, whitespace/Unicode handling và constant-time comparison giữ nguyên. Launcher vẫn gửi raw UTF-8 bytes qua anonymous stdin, không password CLI/file/global environment, không trim/normalize. Verification contract giữ `MATCH/0`, `NO_MATCH/1`, `FORMAT_UNSUPPORTED/2`, `VERIFICATION_ERROR/3`. Guard probe riêng trả native0 với stdout/stderr rỗng; không được hiểu là MATCH.

### C. Guard activation / denial evidence

- Native synthetic child xác nhận `policy=DENY_ALL_NETWORK_AND_CHILD_PROCESS`, `guardActive=true`, `preloaded=true`, marker PID khớp process thực. API replacements và marker là non-configurable/non-writable; ESM builtin exports được đồng bộ.
- Thiếu preload: CLI guard probe trả đúng `VERIFICATION_ERROR`, native3. Các test stub IO chứng minh real-target resolution và auth-store adapter từ chối trước mọi read/open; không mở file thật.
- PowerShell test chỉ extract ba helper bằng AST, không chạy launcher main hoặc Get-Credential. Native startup probe PASS; source hash mismatch và thiếu guard đều bị từ chối. Static ordering xác nhận source gate → probe → credential prompt.
- 40 capability probes bị từ chối đồng bộ: TCP connect/create/listen/socket, TLS, UDP, HTTP/HTTPS/HTTP2, fetch/WebSocket, DNS, child_process APIs/constructor, Worker/cluster, native addon loading và MQTT/undici import. Bao gồm loopback: không có owned-port/test-only exception trong verifier guard. ESM entry points cũng bị chặn. Những probes này không tạo network connection/listener hoặc process escape thật.
- Guard startup probe deadline5s; verification child giữ deadline15s. Timeout/native nonzero/stderr hoặc token/exit mismatch không được biến thành PASS; không kill/retry outcome chưa rõ. Probe thất bại trước credential prompt.

Giới hạn: đây là boundary trong Node cho verifier source được pin/review, không phải OS sandbox chống malicious code/native binding tampering, admin, debugger hoặc compromised Node binary. Không nâng mức bảo đảm vượt phạm vi đó. Không dùng acceptance test guard có loopback exception cho real-mode.

### D. Offline execution results

| Kiểm tra thực thi | Kết quả |
| --- | --- |
| 47 synthetic verifier regression hiện có | **47/47 PASS** |
| Network guard/launcher tests mới | **7/7 PASS** |
| Combined verifier + guard suite native exit | **0**, 54 tests, 0 fail/skip/cancel |
| UTF-8 handoff, MQTT transport mock và acceptance test-guard regression | **13/13 PASS**, native0 |
| `node --check` core/file/CLI/guard/hai test files | **PASS**, mỗi native exit0 |
| PowerShell AST của launcher | **PASS**, 0 parse errors, host exit0 |
| Fixture SHA256 và byte contents trước/sau | **PASS**, 6 fixture files không đổi theo manifest |
| Core crypto source hash so với U | **Không đổi** |
| Real password/hash verification | **NOT EXECUTED** |
| Live MQTT authorization/delivery | **NOT EXECUTED** |

Lệnh đã chạy cho 54 tests:

```powershell
node --require ./scripts/acceptance-offline-guard.cjs --test --test-reporter=spec scripts/offline-mqtt-password-network-guard.test.cjs scripts/offline-mqtt-password-verifier.test.cjs
```

Outer test harness cần spawn native synthetic children; mỗi verifier child dùng guard deny-all riêng. Regression của `acceptance-offline-guard.test.cjs` có server HTTP mock loopback ephemeral để kiểm tra exception test-only của guard cũ; không kết nối broker hoặc external network. Không dùng kết quả đó làm bằng chứng real-mode read-only. Một lần test trung gian bị spawn EPERM khi truyền đoạn synthetic script dài qua `-e`; harness chuyển script synthetic sang stdin của `node -`, không đổi launcher thật hoặc bỏ assertion. Kết quả cuối nêu trên đều native0.

Lệnh regression liên quan:

```powershell
node --require ./scripts/acceptance-offline-guard.cjs --test --test-reporter=spec scripts/mvp-real-handoff.test.cjs scripts/mvp-real-mqtt-transport.test.cjs scripts/acceptance-offline-guard.test.cjs
```

### E. SHA256 source pins sau kiểm thử

Đây là hash source code, không phải password hashes. Real approval tương lai phải chứa **đúng 5 runtime files** dưới đây, SHA256 lower-case trong `sourceHashes`; manifest 4-file cũ bị từ chối.

| Runtime file | SHA256 |
| --- | --- |
| `offline-mqtt-password-verifier.cjs` | `8E5B6B307380AB56234AA1C2EA66C24B1AC7A982AA341A605D95F4DF5290F5A4` |
| `offline-mqtt-password-file.cjs` | `17F94B6747279E77A7E59BD02574064ED74DA1788BA0394A41A891052AAE40DD` |
| `offline-mqtt-password-verify-cli.cjs` | `5E368C22E707BA881B9B3B99558E47436B8FD2B9C4E34B1B500FFCA0C439D08F` |
| `offline-mqtt-password-verify-once.ps1` | `B4B2F0FCAFE7166515D7E9CF99CDED9F829D6528B2387DFAAD31F1337A974B6C` |
| `offline-mqtt-password-network-guard.cjs` | `CBF28FC78BE6C39F8046DDA1903A0C6F923FFAF93F1DFE3431974D2E7F6803C1` |

Test source hashes: verifier tests `9212E9DBC9B9C29273CEC2C1D1E51E00950B129138B9A258768EF9A46070C847`; guard tests `D2AB142E07751DD407F832265683225F22046DE40D1B100BE21D4434F85FDD4F`.

### F. No-secret / runtime safety

Chỉ mở synthetic fixtures; không đọc entry/password/hash thật tại broker, không thực hiện credential prompt thật. Assertions về real path sử dụng stubs từ chối IO trước khi open. Native synthetic CLI output chỉ bốn token đúng exit; không phản chiếu synthetic candidate, salt hoặc digest. Không copy password file, không tạo approval/attempt thật hoặc plaintext credential file.

Không MQTT CONNECT/SUBSCRIBE/PUBLISH, start PostgreSQL/backend/frontend, reload/restart broker, sửa ACL/password, tạo DeviceCommand, ON/OFF, Automation hoặc hardware action. Không đọc runtime flags để tuyên bố trạng thái live hiện tại; phiên này không thay đổi các flags. `SOIL_SENSOR_QUALITY_BLOCKED` vẫn giữ nguyên.

### G. Proposed next one-shot procedure — NOT EXECUTED

1. Nhận **phê duyệt mới riêng** cho đúng một offline verification thật; không reuse V hoặc approval U/W chỉ dành cho preparation.
2. Chuẩn bị private run mới và approval evidence thật theo SID/owner/ACL/reparse gates hiện có; pin năm runtime hashes mục E và approval evidence hash. Không overwrite attempts cũ.
3. Sau review/hash check, operator chạy launcher đã sửa trong terminal cục bộ được giám sát native exit:

```powershell
& 'C:\DATN\Project_datn\scripts\offline-mqtt-password-verify-once.ps1' -ApprovalDirectory '<NEW_APPROVED_PRIVATE_RUN>'
```

Đây là template đề xuất, không phải lệnh đã chạy hoặc directory đã tạo. Source checks và guard probe phải PASS trước Get-Credential. Chỉ sau đó operator nhập existing MQTT password tại prompt bảo mật; không chat/CLI/log. Actual child rechecks guard/source/approval và tạo một attempt create-new trước auth-store read. Khi thiếu evidence, timeout/native error hoặc outcome không rõ, STOP, không retry. MATCH chỉ chứng minh candidate khớp disk entry, không chứng minh broker live memory/delivery và không cho phép CONNECT tiếp.

Rollback source nếu cần phải khôi phục bộ source trước W đồng bộ và đánh dấu real verification BLOCKED; không chạy real verifier bằng launcher cũ thiếu guard hoặc source pins không khớp. Không cần runtime/config/database rollback vì phiên này không thay đổi chúng.

### H. Final verdict / remaining blockers

**OFFLINE_VERIFIER_NETWORK_GUARD_PASS**  
**READY_FOR_ONE_SHOT_OFFLINE_VERIFICATION**  
**REAL_PASSWORD_MATCH_NOT_EXECUTED**  
**MQTT_CONNECT_NOT_EXECUTED**

Blocker network preload đã sửa và kiểm thử offline. Password match, broker authentication live và ESP32 → DEV ingestion vẫn chưa được nghiệm thu bởi phiên này. STOP; không tự mở prompt thật hoặc tiếp tục live acceptance.

## X — Approved One-Shot Offline MQTT Password Verification (02/11/2026)

### A. Approval reference

Phê duyệt thật: attachment `2fdffdac-cdd6-48e0-872f-6c7ad4b93210/Pasted text.txt`, scope `ONE_OFFLINE_BACKEND_PASSWORD_VERIFICATION`, account `smartagri_backend`, tối đa một lượt. Approval document SHA256: `3d087815548de15f030dea93d6808e25f59031a44d8530659bff976818faf58b`. Đây là hash tài liệu phê duyệt, không phải credential hash. Không reuse U/V hoặc tạo quyền cho MQTT/rotation.

Private run mới: `C:\DATN\test-instances\phase13-3b\mqtt-password-verification-1793619459740-dc5ce83d3d4f`. Owner/operator SID đúng contract; run directory và approval file có protected DACL chỉ operator, reparse checks PASS. Approval JSON create-new, pin đúng năm runtime files và reference/hash của attachment thật. Observer wrapper mới trong private run chỉ thu PID/native completion/token; không sửa năm runtime sources và không chứa credential.

### B. Five source hashes

**PASS trước và sau execution**, khớp chính xác cả năm pins mục W và attachment phê duyệt; không cập nhật pins để vượt gate. Core PBKDF2/parser/UTF-8 handoff không thay đổi. Target cố định `C:\mosquitto\config\passwords`; source adapter chỉ mở `'r'`, không có store write. Kiểm tra path ancestors không có reparse bất thường.

### C. Network guard runtime probe

Launcher đã qua guard-only probe trước Get-Credential theo source được pin: native0, stdout/stderr rỗng là điều kiện bắt buộc để đi tiếp. Không chạy network probes thật trong phiên này. Actual verifier tạo attempt evidence với `guardActive=true`, `preloaded=true`, policy `DENY_ALL_NETWORK_AND_CHILD_PROCESS`, marker PID **296** khớp verifier PID **296**; guard source pin khớp approval. CLI/adapter enforce guard trước auth-store read. Không có test-only loopback exception.

### D. One-shot count / timeline

- Observer PID **20112**, launcher PID **824**; start UTC **2026-11-02T11:37:49.1688620Z** (18:37:49 UTC+7).
- Actual verifier PID **296**; đúng một create-new `attempt.json`, UTC **2026-11-02T11:38:18.908Z**.
- Completion UTC **2026-11-02T11:38:19.0805117Z** (18:38:19 UTC+7).
- **Một launcher execution, một real verification attempt; lượt đã dùng 1/1; không retry.** Guard-only startup probe không nhận password/đọc auth store và không tính là verification attempt.

### E. Native completion

Private `outcome.json`: token **MATCH**, launcher native exit **0**, `completed=true`, `contractPass=true`, `stderrEmpty=true`. Observer lấy exit trực tiếp từ process handle của launcher, không dùng JSON stdout thay exit verification. Pinned launcher chỉ chấp nhận token khi verifier Node exit khớp và stderr rỗng; do đó verifier native0 được xác nhận qua launcher contract, không có observer process handle độc lập cho Node. Kiểm tra sau execution: PID296 và PID824 đều không còn chạy. Không có timeout hoặc native-result mismatch được ghi nhận.

### F. Exact verdict

**MATCH / native0**  
**BACKEND_PASSWORD_DISK_MATCH_CONFIRMED**

Chỉ xác nhận candidate được operator nhập tại máy khớp đúng entry hiện hữu trên đĩa theo canonical Mosquitto format và PBKDF2-HMAC-SHA512. Không công bố password, password length, salt, digest, entry, derived secret hoặc raw stdin.

### G. Auth-store integrity

Metadata trước/sau **không đổi**: file size, creation timestamp và last-write timestamp; adapter kiểm tra size/mtime/file identity trong lúc đọc. Không copy file, không ghi hoặc rotate credential. Không tính/in toàn bộ auth-store hash và không tuyên bố đã có chứng minh byte equality độc lập trước/sau. Năm source hashes và private ACL được recheck PASS sau execution.

### H. No-network / no-secret safety

Verifier chạy với dedicated guard được preload; không có MQTT CONNECT/SUBSCRIBE/PUBLISH, không mở subscriber, start TEST/backend/frontend, broker reload/restart, password/ACL change, database action, DeviceCommand, ON/OFF, Automation hoặc hardware action. Credential chỉ đi qua secure local prompt và anonymous UTF-8 stdin theo pinned implementation. Evidence chỉ lưu approval/source hashes, metadata/PID/guard state và verdict/native outcome; không raw stdout/stderr có thể chứa secret. Không kiểm tra runtime flags live để tự tuyên bố chúng đã được nghiệm thu trong phiên này. `SOIL_SENSOR_QUALITY_BLOCKED` giữ nguyên.

### I. Remaining uncertainty / stop

MATCH không chứng minh broker live memory đang dùng cùng password file/config, không xác nhận broker authentication, authorization hay ESP32 → DEV → API/UI ingestion. Không tự mở phiên CONNECT để kiểm tra tiếp. Sau khi outcome đã hoàn tất, operator yêu cầu nhập lại; không mở prompt thứ hai vì lượt được duyệt đã dùng 1/1. Mọi lượt xác minh hoặc CONNECT sau cần phạm vi phê duyệt mới riêng.

**REAL_PASSWORD_VERIFICATION_COMPLETED_ONCE**  
**BACKEND_PASSWORD_DISK_MATCH_CONFIRMED**  
**NATIVE_COMPLETION_PASS**  
**MQTT_CONNECT_NOT_EXECUTED**  
**SOIL_SENSOR_QUALITY_BLOCKED**

STOP sau verdict. Không retry, không tự E2E acceptance.

## Y — Approved Real ESP32 DEV E2E Acceptance After Offline Password Match (02/11/2026)

### A. Approval / session identity

Đọc approval mới `7f2119fc-e09a-4bdc-9d09-30bcb2f4c9e4/Pasted text.txt`: một DEV session, `RESUME_EXISTING_DEVICE`, tối đa một MQTT CONNECT, không retry; operator xác nhận adapter ngắt/USB only. Không sử dụng lại artifact hoặc password của X. Chưa tạo run/prepared/attempt live vì gate broker identity chưa đạt. **MQTT CONNECT đã dùng 0/1**.

### B. Broker executable/config runtime identity — BLOCKED

Chạy đúng helper read-only `scripts/mvp-broker-identity-readonly.ps1` bằng quyền hiện có. Native PowerShell exit **1**, lỗi **PROCESS_METADATA_NOT_VISIBLE_STOP**: không lấy đủ ExecutablePath/CommandLine của LAN process để đối chiếu exact executable và `-c` argument. Không coi thông tin PID16148 lịch sử là current attestation, không giả broker config mismatch hoặc authentication failure từ lỗi quyền đọc metadata.

Một truy vấn bổ sung chỉ đọc listener/process start time cũng exit1 vì StartTime không có giá trị khả dụng; không thu được attestation hợp lệ. Trong cả hai lệnh, bước file hashes/IP phía sau chưa chạy do ErrorActionPreference=Stop, nên **chưa xác minh fresh config/ACL hashes hoặc IP**. Không retry helper, không tự nâng quyền, không sửa broker.

Thao tác operator cần thực hiện trong **PowerShell Run as Administrator**:

```powershell
& 'C:\DATN\Project_datn\scripts\mvp-broker-identity-readonly.ps1'
```

Helper chỉ xuất PID/start UTC và booleans executable/config-argument matches; không in raw command line hoặc credentials. Gửi output để tiếp tục đánh giá cùng phạm vi phê duyệt, không phải xin một CONNECT allowance khác. Sau khi có attestation vẫn phải đối chiếu listener/IP và hashes hiện hành trước CONNECT. Không khởi động gì bằng lệnh này.

### C–F. Fresh preflight / SQL / registration / safety

**NOT EXECUTED**: chưa chạy fresh DEV preflight, pg_controldata hoặc helper ACL/listener của preflight; không startup PostgreSQL55433, không kết nối SQL DEV/production. Chưa recheck 11 migrations/eight mappings/baselines hoặc serving backend safety flags. Không sửa source/implementation trong phiên bị chặn; đã đọc transport/session/launcher-related source để xác định thứ tự gate. Source-hash review và CONNACK instrumentation/mock tests còn chờ identity gate; không tuyên bố chúng PASS.

### G–L. MQTT / telemetry / DB / REST / website

**NOT EXECUTED / BLOCKED**: không MQTT CONNECT/SUBSCRIBE/PUBLISH, không prompt nhập credential, không actual CONNACK/SUBACK, không startup backend/frontend/browser. Không có fresh batches/OFF/DB/API/UI evidence từ phiên Y. Không coi offline MATCH mục X là broker memory/authentication PASS.

### M. Soil quality

**SOIL_SENSOR_QUALITY_BLOCKED** giữ nguyên; không có dữ liệu mới để nâng chất lượng hoặc kết luận đất khô. Không thử tưới tự động/phần cứng.

### N. Cleanup / native outcomes

Hai truy vấn read-only nói trên kết thúc native exit1 tại identity metadata; đây không phải fresh preflight completion hoặc MQTT rejection. Không tạo owned live process/cluster để cleanup, không stop/restart process hiện hữu. Không thay config/ACL/password_file/credentials, không production DB access, không sửa registration hoặc tạo DeviceCommand. Không tuyên bố independent current command count/runtime flags vì chưa thực hiện SQL/runtime checks.

### O. Verdict / remaining blocker

| Gate | Kết quả |
| --- | --- |
| DEV_PREFLIGHT | **BLOCKED — NOT EXECUTED** |
| BROKER_IDENTITY | **BLOCKED — metadata access** |
| BACKEND_RUNTIME_SAFETY | **BLOCKED — NOT EXECUTED** |
| BACKEND_MQTT_CONNECT | **BLOCKED — NOT EXECUTED, 0/1** |
| CONNACK_CODE | **NOT_OBSERVED — no CONNECT** |
| ESP32_LIVE_TELEMETRY | **BLOCKED** |
| ESP32_LIVE_DB_API | **BLOCKED** |
| ESP32_LIVE_UI | **BLOCKED** |
| SOIL_SENSOR_QUALITY | **BLOCKED** |
| AUTO_IRRIGATION_PHYSICAL | **NOT_EXECUTED** |
| END_TO_END | **NOT_ACCEPTED** |

STOP trước live side effects. Chờ đúng broker metadata attestation từ operator; không tự bypass gate hoặc chuyển sang observer/credential changes. Chưa sử dụng lượt CONNECT đã được phê duyệt.

### Y tiếp tục — Sau operator broker attestation, kết quả thực thi cuối cùng

Phần A–O ở trên ghi lần dừng **trước** khi có metadata operator; kết quả dưới đây là trạng thái cuối của cùng phạm vi phê duyệt sau khi operator cung cấp output Administrator. Không tạo một CONNECT allowance thứ hai.

#### A. Approval / session identity

Approval attachment `7f2119fc-e09a-4bdc-9d09-30bcb2f4c9e4/Pasted text.txt`, SHA256 `859a64a4cfc4f3d46a4127f41519dc83ce149ec3bc6b5fe1039eda3af256e9a4`. Operator nhập credential mới tại máy sau phrase `PUMP UNPLUGGED USB ONLY`; không lấy password từ mục X hoặc password_file.

Fresh private run: `C:\DATN\test-instances\phase13-3b\mvp-real-esp32-1793621402417-43902d`. Prepared version2, **RESUME_EXISTING_DEVICE**, approval/source hashes pin, one create-new attempt, operator-only run/plan ACL kiểm tra trước launch. Phiên **2026-11-02T12:11:00.933Z–12:11:57.041Z**, tức **19:11:00–19:11:57 ngày02/11/2026 UTC+7**. Không reuse run cũ, không verifier offline lần hai. MQTT allowance đã dùng **1/1**.

#### B. Broker executable/config and runtime identity

Operator Administrator output xác nhận LAN PID **16148**, start **2026-11-02T07:00:35.7709130Z**, `ExecutableMatchesExpected=true`, `ConfigArgumentMatchesExpected=true`. Read-only snapshot sau handoff khớp PID/start time, bind **0.0.0.0/[::]:1883**, Windows Wi-Fi **172.20.10.2**. Broker loopback PID **22124** riêng, không phải target.

- Config SHA256 `084DFBFCF4DF6A7C30A4C3AFD0CE91DE31749FF9D572E361E7234EBA6F598F6F`.
- ACL SHA256 `4A18580727297602943818714405A4437B24BEA1905274E32A19EE8C0BF5E766`.
- Exact config path/executable theo helper và attestation; auth file theo config đã pin `C:\mosquitto\config\passwords`.
- Config/ACL hashes recheck sau cleanup không đổi; broker listener PIDs giữ nguyên. Không đọc password/hash entry, sửa config/ACL hoặc reload/restart broker. Password-file post-run metadata length404 và last-write khớp bằng chứng trước; không có independent byte-equality check cho auth store trong phiên Y.

#### C. Fresh preflight / native exits

Fresh diagnostic artifacts: `C:\DATN\test-instances\phase13-3b\preflight-process-diagnostic-1793621385609-f8d159`. Dùng R instrumentation/source pins đã kiểm thử, approval hash mới; giữ nguyên assertions và không force-kill/retry.

| Process | PID | Native exit | Timeout / signal / error |
| --- | ---: | ---: | --- |
| Independent observer Node | 3588 | 0 theo tool completion | không lỗi |
| PowerShell outer | 15052 | 0 | false / null / null |
| Node preflight | 24268 | 0 | false / null / null |
| pg_controldata | 13196 | 0 | false / null / null |
| PowerShell NTFS/listeners | 4892 | 0 | false / null / null |

Khoảng UTC **12:09:49.282–12:09:51.585**, classification **D_ALL_NATIVE_EXITS_ZERO**; `verification.json` create-new. Exact PGDATA/systemID, binaries, shut-down/no postmaster.pid, private NTFS/reparse, free DEVports PASS. Runner `--prepare` native0, internal prepare/execute read-only preflight revalidations giữ nguyên contract (không retry một check thất bại).

#### D. DEV SQL identity / migrations

pg_ctl startup PID **19880 exit0**. SQL app identity: **smart_agriculture_mvp_dev / sa_mvp_dev_app / 127.0.0.1:55433**, postmaster start **12:11:01.747Z**. Preflight/finalControl systemID **7698826681383327460**, PGDATA `C:\DATN\test-instances\phase13-3b\data`. App-role privilege capabilities restricted, postmaster.pid path/port/start checks PASS. **11 migration names/checksums/finished/not-rolled-back** assertions passed before registration resume. Không initdb/DDL/migrate/seed/restore hoặc production DB fallback.

#### E. Existing eight records

Actual event **EXISTING_REAL_DEVICE_MAPPING_VERIFIED_READ_ONLY**, UTC **12:11:02.492Z**. Bounded repeatable-read READ ONLY helper xác minh đúng tám IDs đã pin trong approval: farm/zone/device, TEMP/HUM/LIGHT/SOIL và PUMP. Ownership/relations/ACTIVE/type/controller identity/GPIO26 PASS. Không tạo/upsert/sửa/xóa mapping hoặc reset trạng thái để vượt gate.

#### F. Source instrumentation / runtime safety / tests

Trước sửa, so toàn bộ11source hashes với prepared plan phiên S: đều khớp; preflight source và native observer pins cũng khớp. Chỉ sửa **DEV-only `mvp-real-mqtt-transport.cjs`** và test tương ứng để capture actual CONNACK trước error handler.

MQTT.js cài đặt **5.15.2**: source `build/lib/client.js` bỏ transport setup khi `manualConnect=true`; `build/lib/handlers/index.js` phát `packetreceive` **trước** handler CONNACK, bao gồm refused packet. Wrapper tạo deferred client, cài publish blockers và packet tap rồi gọi `.connect()` đúng một lần; vẫn protocolVersion4, reconnectPeriod0, resubscribefalse, cleantrue, no WILL, unique run client ID. Tap chỉ chọn packet CONNACK và metadata được duyệt, không CONNECT packet/raw bytes/credentials. Không sửa production MQTT client, subscribed topics hoặc payload parser.

**62/62 offline tests PASS**, native0; bao gồm success/refused CONNACK, packet-before-error ordering, transport error không CONNACK, no secret reflection, one start, publish blockers, UTF8 handoff, resume mapping và native-preflight regression. Node syntax/PowerShell AST PASS. Source hash sau sửa:

- `mvp-real-mqtt-transport.cjs`: `58703A91C0E59330992674CB1E8BDB3673199C739F608529216B220AB51AE6DB`.
- Test: `EE2724226C612E3F919390D1AF736261E3900009E65455D0D83B477F356C8769`.
- Các10runtime dependencies khác không đổi; tất cả11pins có trong private prepared.json và recheck sau phiên PASS.

Actual serving backend **PID26344**, startup UTC **12:11:05.905Z**: **commandsEnabled=false, automationEnabled=false, testMode=true, effectiveMaxRunSeconds=1**. Bind127.0.0.1:55001; API actuator `gatewayMode=DISABLED`, `controlEnabled=false`. `.publish()` và `_sendPacket(cmd=publish)` blockers được cài trước explicit connect. Không MQTT observer connection. Zero application publish là source boundary + runner declaration, **không phải independent packet capture hoặc measured publish-attempt counter**.

Rollback instrumentation nếu cần: khôi phục wrapper trước thay đổi (S hash `E15DDC199F1ABDF8E8F646398AA1170F169C1DFAB4A05F1B27A48C206DA0ACA9`) cùng test version phù hợp, invalidate prepared pins cũ. Không áp dụng rollback trong phiên này; không rollback dữ liệu telemetry đã commit và không cần thay production.

#### G. Actual MQTT CONNACK

Captured từ **packetreceive của backend client thực**, UTC **2026-11-02T12:11:05.912Z**:

```json
{"kind":"CONNACK","protocolVersion":4,"returnCode":0,"sessionPresent":false,"clientId":"mvp-iot-backend-real-mvp-real-esp32-1793621402417-43902d"}
```

**BACKEND_MQTT_CONNECT_ACCEPTED / CONNACK_CODE_CAPTURED**. MQTT3.1.1 dùng returnCode, không có reasonCode MQTT5. Một observed CONNACK, counters MQTT_CONNECTIONS1, không auto reconnect/retry hoặc thử client thứ hai. Kết quả này chứng minh authentication thành công trong phiên Y, không giải thích hồi tố chính xác vì sao S bị từ chối.

#### H. Actual subscriptions

Hai callback SUBACK thành công, tổng ba grants **QoS1**:

1. `smart-agriculture/v1/devices/ESP32-GF-A-01/telemetry`
2. `smart-agriculture/v1/devices/ESP32-GF-A-01/status`
3. `smart-agriculture/v1/devices/ESP32-GF-A-01/actuator/state`

Không subscribe command topic, không application PUBLISH. Raw receipts10: telemetry3/status4/actuator3. Diagnostic tap bỏ một retained status và hai status logical duplicates khỏi acceptance counts; không có invalid/stale/schema/device mismatch. Không dùng retained status để đạt fresh acceptance.

#### I–J. ESP32 telemetry → PostgreSQL correlation

**3 fresh batches × 4 = 12 numeric readings**, topic/device đúng, schemaVersion1, QoS1, retainfalse/duplicatefalse, unique four sensorCodes, finite numeric values/units, fresh<=30s và không future>2s. Backend ingestion pipeline ghi sourceMQTT; không direct SQL INSERT/simulator.

| recordedAt UTC | MQTT receivedAt UTC | DB receivedAt UTC | TEMP °C | HUM % | LIGHT lux | SOIL numeric % |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| 12:11:18.853 | 12:11:19.201 | 12:11:19.216 | 30.2 | 72.5 | 5 | 100 |
| 12:11:33.853 | 12:11:34.161 | 12:11:34.167 | 30.2 | 72.3 | 5 | 100 |
| 12:11:48.853 | 12:11:49.205 | 12:11:49.210 | 30.2 | 72.4 | 5 | 100 |

Mỗi batch có đúng4DBrows với exactsensor IDs/recordedAt/value/source; receivedAt DB có thật, độc lập với MQTT tap receipt. **12 committed/correlated, 12 unique logical readings, 0 telemetry rejected trong tap, 3 soil readings quality-blocked**. Không gọi phần còn lại lab-calibrated.

Ba fresh PERIODIC OFF recordedAt UTC **12:11:14.269 / 12:11:29.340 / 12:11:44.477**; receipt UTC **12:11:14.505 / 12:11:29.643 / 12:11:44.800**, QoS1/nonretained/nonduplicate. API pump OFF `lastStateChangedAt=12:11:44.477Z`, `updatedAt=12:11:44.801Z` khớp last fresh report. Không gửi OFF để tạo bằng chứng. GPIO reported OFF không phải feedback động cơ/nước.

#### K. Authenticated REST API

Actual owner login200, trả token giữ memory/không công bố. Sensor history endpoints cho4sensors đối chiếu **12/12 row IDs, values, recordedAt, receivedAt, sourceMQTT** với DB. Cả4chart endpoints200/cópoints; runner không đối chiếu từng chart aggregate với từngrow. Device detail trả **ONLINE**, `lastSeenAt=12:11:49.205Z`; actuator detail OFF/gatewayDISABLED/controlfalse.

Không kiểm thử riêng farm detail/zone detail/latest-readings REST endpoints trong phiên này; không suy chúng đã được kiểm chứng từ health200. **ESP32_LIVE_DB_API_ACCEPTED** cho đối chiếu readings/history, chart availability và device/actuator nêu trên.

#### L. Website / browser evidence — BLOCKED

Frontend DEV PID **14964** khởi động và HTTP readiness đạt; thất bại khi `playwright-core` launch headless Edge tại `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`: **Target page, context or browser has been closed**. Runner STOP_NO_RETRY UTC **12:11:56.050Z**, stage WEBSITE. Không sửa browser/config hoặc thử lại để ép PASS.

Không login browser, dashboard/history/plot/polling/no-F5/Vietnam-time/soil-warning visual evidence, không screenshot mới. Đã có REST data nhưng **không browser E2E PASS**. Root cause native Edge startup chưa được chẩn đoán; không kết luận frontend application lỗi từ launch failure. Cần phiên offline browser-diagnostics/UI acceptance được duyệt phù hợp sau này, không tự mở một live session mới.

#### M. Soil quality

Actual wire SOIL100% trong3batches, **không rawADC/calibration/quality metadata trên wire**. Không gán ADC4095 lịch sử là ADC hiện tại, không kết luận soil đã phục hồi hoặc đất bão hòa. Runner label `ADC_AT_RAIL` là inherited historical blocker, không phải phép đo ADC mới. Giữ **SOIL_SENSOR_QUALITY_BLOCKED** và không dùng3soil readings này cho automatic irrigation/VERIFIED_LIVE.

#### N. Cleanup and native exits

| DEV SQL metric | Before | After |
| --- | ---: | ---: |
| DeviceCommand total | 0 | 0 |
| PENDING | 0 | 0 |
| Enabled automation rules | 0 | 0 |
| Actuator ON | 0 | 0 |

- Frontend PID14964 **exit0/signalnull**, backend PID26344 **exit0/signalnull** qua owned graceful cleanup.
- Prisma disconnected; kiểm tra không còn client khác trước pg_ctl smart stop.
- pg_ctl stop PID **21492 exit0**; finalControl đúng PGDATA/systemID và **shut down**.
- Fresh listener check sau cleanup: **không55433/55001/55173**, brokerLAN16148 và loopback22124 giữ nguyên.
- Interactive launcher native exit0, observerPID20748; đó là launcher completion, **không dùng làm toàn bộ E2E PASS** vì summary ghi UI failure.
- Source hashes không đổi sau prepare; config/ACL hashes giữ nguyên. Dữ liệu12readings và existing registration được giữ; không xóa/reset, không đổi credentials, không production DB access/startup/migration, không flash/reset/ON/OFF/cấp nguồn bơm.
- Private `reviewed-outcome.json` create-new kiểm tra counts/native cleanup/source pins/oneCONNACK và ghi END_TO_END_PARTIAL. Summary/attempt/log evidence cũ không overwrite.

#### O. Final verdict / stop

| Verdict | Kết quả cuối |
| --- | --- |
| DEV_PREFLIGHT_PASS | **PASS** |
| BROKER_IDENTITY_PASS | **PASS** sau operator attestation |
| BACKEND_RUNTIME_SAFETY_PASS | **PASS** |
| BACKEND_MQTT_CONNECT_ACCEPTED | **PASS** |
| CONNACK_CODE_CAPTURED | **PASS — returnCode0** |
| ESP32_LIVE_TELEMETRY_ACCEPTED | **PASS numeric ingestion**, soil quality riêng BLOCKED |
| ESP32_LIVE_DB_API_ACCEPTED | **PASS** trong phạm vi K |
| ESP32_LIVE_UI | **BLOCKED — Edge startup** |
| SOIL_SENSOR_QUALITY_BLOCKED | **Giữ nguyên** |
| AUTO_IRRIGATION_PHYSICAL_NOT_EXECUTED | **Giữ nguyên** |
| END_TO_END | **PARTIAL** |

Authentication/telemetry blocker không còn tái hiện trong phiên Y: actual MQTT → DEV DB → REST đã được chứng minh. Remaining blockers là browser acceptance và soil quality; không cần rotate/reset credential hoặc sửa ACL để diễn giải kết quả này. Chưa giải thích root cause lịch sử S. STOP sau cleanup, lượtCONNECT đã dùng1/1; không retry hoặc tự chuyển sang tưới/production.

## Z — Edge/Playwright Browser Startup Diagnosis (02/11/2026)

Scope: attachment `be1216de-8744-4a21-a11a-82f0cc1bc3e1/Pasted text.txt`, **OFFLINE BROWSER DIAGNOSIS AND SYNTHETIC TESTS ONLY**. Không dùng phê duyệt Y để launch browser/DEV/MQTT lần nữa. Chỉ đọc source, package/file metadata và Windows Application logs; thêm pure offline diagnostic classifier/tests, không nối vào runner.

### A. Relevant source / configuration

- `scripts/mvp-ui-browser.cjs:create()` gọi `chromium.launch({executablePath,headless:true})`. Executable resolver trong `mvp-dev-acceptance.cjs` chọn file Edge x86 Program Files trước, nếu không có mới thử Program Files. Không có browser download hoặc system-profile path trong helper.
- Exact installed file hiện tại: `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`, File/ProductVersion **156.0.4314.58**, last-write UTC **2026-10-30T03:40:44.5816510Z**, SHA256 **D35D48B11F0439EEEDDBBFF0BF54856E922F5E1506A2F3098B5A808FCEC4068B**. Chỉ đọc file metadata/hash, không chạy `--version` hoặc browser.
- `require.resolve('playwright-core/package.json')` trỏ workspace root `node_modules/playwright-core`, version **1.62.1**; Node **v22.20.0**. Installed package `browsers.json` ghi Chromium151.0.7922.34/revision1234. Edge156 khác bundled Chromium target; đây là version difference, **không đủ chứng minh incompatibility là root cause**. Không thay package/browser version.
- Playwright implementation nằm trong bundled `node_modules/playwright-core/lib/coreBundle.js`, không phải unbundled server paths. Source `_prepareToLaunch` tạo profile tạm `playwright_chromiumdev_profile-*` dưới `os.tmpdir()` khi không có userDataDir; không tái sử dụng profile cá nhân. Exact profile path của Y không có trong error600ký tự còn lưu. Không có bằng chứng profile lock/corruption/permission failure.
- Default launch arguments do package dựng; fragment Y chỉ giữ đầu danh sách args. Local source có `--user-data-dir`, `--remote-debugging-pipe`, headless args và nhánh `chromiumSandbox !== true` thêm `--no-sandbox`. Helper không set `chromiumSandbox`: không được tuyên bố sandbox enabled. PhaseZ không thêm flag, không đổi sandbox/Defender/policy/profile. Không coi default flag là nguyên nhân đã xác định.
- Helper không đặt timeout launch tường minh; launch dùng cơ chế timeout của Playwright. `setDefaultTimeout(20000)` và navigation35000 chỉ được cài sau khi context tạo page, không điều khiển startup. Session backend deadline180s không phải phép đo native Edge exit.
- Browser mặc định inherit parent environment theo source Playwright; runner Y dùng closed DEV process environment có app secrets in memory. Đây là lý do smoke test tương lai phải dùng browser child environment allowlist, không dump environment/log raw command lines. Không có bằng chứng credential đã bị browser log phản chiếu trong Y.

### B. Windows event evidence

Đọc `Application` bằng Get-WinEvent với exact UTC **2026-11-02T12:11:49Z–12:11:57Z**, IDs1000/1001, không nâng quyền. Kết quả **CRASH_EVENT_NOT_FOUND_IN_EXACT_WINDOW** (NoMatchingEventsFound). Không có faulting application/module/exception/PID/ReportID để gán cho Edge. Không mở crash dumps hoặc sửa WER/registry, không gán ntdll.dll của các lần PowerShell cũ cho Edge.

Giới hạn: không tìm thấy event trong exact window không chứng minh browser chưa từng crash hoặc Windows không có event ở thời điểm khác. Không mở rộng quét log/dump hoặc chạy lại browser để ép có evidence.

### C. Browser lifecycle / ownership analysis

Thứ tự từ actual helper: **await browser launch → tạo evidence/contexts list → browser.newContext() → context.newPage() → goto/login**. Y fail ngay await `chromium.launch`; chưa có context/page/navigation, nên không phải lỗi React/Vite/login hay page đóng trong lúc polling.

Caller `mvp-real-esp32-session.cjs` chỉ nhận biến `browser` sau khi `create()` resolve. Khi launch reject, catch ghi STOP, finally chỉ gọi `browser.close()` nếu biến đã được gán. Vì launch thất bại trước assignment, không có bằng chứng caller double-close hoặc premature-close gây lỗi Y. Backend/frontend cleanup xảy ra sau STOP_NO_RETRY; không dùng việc cleanup về sau làm nguyên nhân launch failure.

Playwright source spawn native child (`coreBundle.js:8911`), ghi launched PID và close event exitCode/signal (`8947–8953`); launch failure có internal cleanup của Playwright (`39483–39486`). Nhưng runner chỉ giữ `clean(e.message).slice(0,600)`: fragment Y mất các dòng `<launched>`, native-exit/stderr cuối. **NATIVE_EDGE_PID_NOT_CAPTURED / NATIVE_EDGE_EXIT_NOT_CAPTURED**; không thể phân biệt chắc chắn failed process creation, browser native crash sau spawn, hay pipe/transport disconnect. Node orchestrator PID không được thu độc lập cho Edge parent relation. Không coi frontend/backend exit0 hoặc launcher exit0 là native Edge exit0.

Y ghi STOP WEBSITE UTC **12:11:56.050Z**, cleanup hoàn tất **12:11:57.041Z**, nằm trong event window đã truy vấn. Existing source không cho thấy application cleanup đóng browser trước launch, nhưng thiếu native telemetry ngăn khẳng định nguyên nhân bên trong Playwright/Edge.

### D. Root cause

**BROWSER_STARTUP_ROOT_CAUSE_UNDETERMINED**.

Đã xác định failure boundary tại browser launch và một diagnostic evidence gap rõ ràng (600-character error truncation); **chưa xác định nguyên nhân khiến Edge đóng**. Không tự đổi executable/channel, thêm flags, sửa UI/backend/Prisma/MQTT hoặc nâng version theo phỏng đoán.

### E. Minimal source changes

Không sửa `mvp-ui-browser.cjs`, existing runner/frontend/backend hoặc Playwright package. Hai file mới chỉ phục vụ offline:

1. `scripts/mvp-browser-startup-diagnosis.cjs`: pure classifier cho structured metadata, không imports/IO/network/process launch. Phân loại boundary/timeout/native-abnormal/ownership/cleanup ordering; không đánh dấu real browser verified hoặc root cause confirmed từ synthetic input.
2. `scripts/mvp-browser-startup-diagnosis.test.cjs`: VM chạy **actual unchanged UI-helper source** với injected mock chromium/browser/context/fs; fake native process evidence cho classifier. Không native Edge hoặc network calls.

Chúng chưa được wire vào acceptance; không là remediation cho Edge. Rollback phần phát triển offline này chỉ cần bỏ hai file mới khỏi thay đổi cần review; không cần runtime/DB/profile rollback. Evidence Y/12 readings/eight mapping records giữ nguyên.

### F. Synthetic results / syntax / hashes

**12/12 PASS, 0 failed/skip/cancel; Node native exit0**, gồm successful launch/context/page/close order, launch rejection/no retry, browser closed trước context, context closed trước page, premature orchestrator cleanup, timeout rejection, abnormal native exit/signal, child ownership mismatch, graceful cleanup, whitelist/no secret reflection và helper hash unchanged.

Timeout test là simulated TimeoutError, **không chứng minh actual Edge deadline**. Native/ownership fixtures chỉ kiểm thử classification, không chứng minh native Windows process behavior. No-secret assertion áp dụng whitelist diagnostic output, không khẳng định mọi future browser error luôn secret-free.

```powershell
node --require ./scripts/acceptance-offline-guard.cjs --test --test-reporter=spec scripts/mvp-browser-startup-diagnosis.test.cjs
```

Node syntax checks cho classifier/test/existing UI helper đều exit0. Không chạy `mvp-ui-selectors.test.cjs` vì source test đó launch Edge thật; vượt scope PhaseZ dù tên test có chữ offline. Không chạy lại MQTT/SQL/ESP32 acceptance hoặc các suites đã PASS không liên quan.

| Source | SHA256 |
| --- | --- |
| mvp-browser-startup-diagnosis.cjs | AD6AC77EB26C93668F646F26EC392DA6B0031906E1C1DE654FB1488224EA66D2 |
| mvp-browser-startup-diagnosis.test.cjs | 270913EACF027D4031231BDEE7E9CA60B690D0C22AB592E2E28DFD16937B41D7 |
| mvp-ui-browser.cjs — unchanged | A386C6B10C2AC28177EC40E86CB60DC7B2259EE2A0650EBFD1B125E107C637AC |
| mvp-real-esp32-session.cjs — unchanged | E591E10177E9B8F496935A5D2DD2407BF5C7CF5DE7B9B9B8837924295A2D9090 |
| mvp-real-frontend.mjs — unchanged | 7B3DD14F686144D586F03CF73919ACA1918B4336D6D76E4D2871ECB39A45BF56 |

### G. Proposed one-shot browser smoke test — approval required, NOT EXECUTED

Đề xuất phiên mới **chỉ một launch** exact Edge/Playwright đã pin, không start DB/backend/frontend/MQTT. Target duy nhất **about:blank**; route chặn requests mạng của page. Lưu ý page routing không chặn browser background networking: smoke-test approval phải nêu rõ giới hạn này và không gọi đó là OS-level deny-all network.

Trước execution: prepare/review/test DEV-only observer tách khỏi live runner. Dedicated operator-only private run, isolated TEMP/TMP/profile directory mới, không dùng profile cá nhân; no password/JWT/DB URL/MQTT secrets trong browser environment. Chỉ deterministic launch options đã review, timeout hữu hạn; không thêm `--no-sandbox`, disable security flags hoặc bỏ default args theo phỏng đoán.

Observer thu exact native spawn PID/parent/start/exitCode/signal/error/timeout của Edge qua process handle, lọc executable và ownership; capture stages launch/context/page/blank/close. Không chỉ dựa vào browser error text hoặc `.process()` không có trên Playwright Browser API. Không bật DEBUG toàn cục với raw argv/env; chỉ whitelist metadata và diagnostic stderr đã kiểm tra không secret, giữ bằng chứng riêng tư đủ dài thay vì600-character truncation. Observer instrumentation phải synthetic-tested trước approval thực thi.

Nếu launch thành công: tạo một context/page, about:blank, graceful close một lần và xác nhận native completion; không Web app E2E PASS. Nếu native crash/unknown ownership/timeout: STOP, no retry/force-kill unrelated processes. Playwright có own launch cleanup/fallback behavior; phải review rõ trước smoke execution, không tuyên bố mọi timeout chỉ graceful. Đối chiếu Event1000/1001 ở exact new window; không đổi system policy/debugger/WER. **Chưa triển khai hoặc chạy observer/smoke test này trong Z.**

### H. Proposed DEV UI-only acceptance — NOT IMPLEMENTED / NOT EXECUTED

Khả thi về kiến trúc: có DEV backend entrypoint `mvp-dev-backend.cjs` yêu cầu **MQTT_ENABLED=false**, Commands/Automationfalse, testModetrue/cap1, fixed DEV55433/55001 và chặn mqtt.connect. Có thể tận dụng12existing MQTT readings Y + exacteight mappings, không reset/seed/simulator/new MQTT CONNECT. Chỉ phê duyệt startup TEST DEV/API/frontend cho phiên riêng sau browser-smoke result.

Nhưng không chạy lại `mvp-dev-final.cjs` hoặc full `mvp-ui-browser.accept()` nguyên bản: các suites đó có mutation/synthetic fixtures không đúng yêu cầu history-only. Cần review UI-only runner tối thiểu trước execution, bounded DB READ ONLY baseline và source pins, không ingestion/evaluator/DeviceCommand endpoints. Startup production `server.ts` gọi `recoverMqttCommands()` ngay cả khi MQTTfalse; vì vậy phải đánh giá startup writes và presence semantics trước khi dùng entrypoint, **không hứa API-only có zero writes chỉ từ MQTTfalse**. No-MQTT watchdog không cung cấp fresh ONLINE/OFF, không sửa DB để làm trạng thái đẹp cho demo.

Mục tiêu có thể nghiệm thu từ existing records: actual login, selection đúngfarm/zone/device, history chứa12rowIDs, chart API/data, dashboard nếu policy freshness cho phép hoặc hiển thị stale đúng, timestamp Việt Nam, soil quality warning. Dữ liệu phải ghi **stored hardware readings từ Y**, không fresh/live telemetry, không coi việc lịch sử hiển thị hoặc timer polling là chứng minh automatic refresh từ MQTT mới. Nếu cần realtime/no-F5 theo new readings: phải có approval mới cho live session, không reuse1/1CONNECT Y.

Nếu headless không khả dụng sau smoke diagnosis, có thể đề xuất operator manual browser inspection đối chiếu API/DB trong UI-only session riêng; không thực hiện hoặc chụp ảnh giả ở Z.

### I. Final verdict / stop

**BROWSER_STARTUP_ROOT_CAUSE_UNDETERMINED**  
**BROWSER_OFFLINE_REMEDIATION_BLOCKED** — chưa đủ evidence cho source fix actual startup; synthetic diagnosis tests PASS không thay remediation PASS.  
**REAL_BROWSER_LAUNCH_NOT_EXECUTED**  
**MQTT_CONNECT_NOT_EXECUTED**  
**SOIL_SENSOR_QUALITY_BLOCKED**

Z không start PostgreSQL/DEV frontend/backend, không production access, broker/credential/ACL changes, DeviceCommand, ON/OFF, Automation, flash/reset hoặc cấp nguồn bơm. Y numeric telemetry/DB/API PASS giữ nguyên; UI/browser acceptance và soil quality còn mở. STOP, chờ scope riêng cho một browser-only smoke diagnostic.

## AA — One-Shot Browser Smoke Test Preparation (02/11/2026)

**IMPLEMENT + OFFLINE SYNTHETIC TEST ONLY.** Không sử dụng scope AA hoặc approval Y để thực thi browser thật. Source Y/Z và Playwright source đã đối chiếu; helper cũ không sửa và nguyên nhân native startup chưa được xác định. Không gọi Edge156/Playwright1.62.1 version difference là root cause.

### A. Source changes / architecture

Thêm ba file, không wire vào production hoặc existing acceptance runner:

| File | Vai trò |
| --- | --- |
| `scripts/mvp-edge-smoke-observer.cjs` | Dedicated Node observer, process-spawn boundary, one-shot lifecycle và future approved-run validator. Import module không khởi động browser/IO; CLI thiếu valid private approval/launcher receipt fail closed. |
| `scripts/mvp-edge-smoke-once.ps1` | Future launcher: operator/SID/owner/protected ACL/reparse/empty scratch/no-prior-attempt gates, closed Node environment, native completion wait. **Không chạy trong AA.** |
| `scripts/mvp-edge-smoke-observer.test.cjs` | Fake Chromium/native child + in-memory create-new artifacts; PowerShell AST và refusal CLI subprocess không có approved target. |

Không sửa `mvp-ui-browser.cjs`, `mvp-real-esp32-session.cjs`, frontend/backend/Prisma/MQTT, Edge installation hoặc node_modules. Existing browser helper hash vẫn `A386C6B10C2AC28177EC40E86CB60DC7B2259EE2A0650EBFD1B125E107C637AC`.

### B. Native observer mechanism / diagnostic fields

Boundary được cài **trước khi require Playwright**: thay riêng `child_process.spawn` trong dedicated observer bằng wrapper, đồng bộ builtin ESM exports. Kiểm tra Playwright chưa preload. Installed Playwright bundle thực sự gọi `childProcess.spawn(command,args,options)`; wrapper nhận actual ChildProcess handle, không sử dụng `browser.process()` và không suy PID từ error text.

Wrapper chỉ cho phép exact pinned Edge executable, parent/owner hiện tại đã xác minh, no shell/detach, browser env exact allowlist, profile argument nằm trực tiếp dưới private TEMP. Mỗi OS spawn được chấp nhận sẽ rehash executable; **chỉ một** call tới original native spawn. Native PID lấy từ handle; `spawn/error/exit` events thu timestamp, PID, creator parent PID, error code, exitCode/signal. Nếu thiếu PID hoặc parent mismatch, không tiếp tục context/page và không kill.

Parent ownership là **direct-child handle của Node observer có PID gắn với launcher receipt**, không phải independent CIM process-tree query. Timestamp là thời điểm observer thấy spawn request/event, không tuyên bố exact kernel creation timestamp. Native exit được lấy từ ChildProcess exit event, không coi JSON/log text là exit0.

Future private evidence create-new:

- `launcher-receipt.json`: operator/ACL attestation và launcherPID dùng để đối chiếu Node `process.ppid`.
- `identity.json`: exact executable/source/runtime pins, Node/Playwright versions, observer/launcher PIDs, approval evidence hash.
- `native-events.jsonl`: whitelist incremental native events, tiếp tục nhận native exit nếu exit xảy ra muộn.
- `attempt.json`: tạo trước launch, maximumLaunches1, targetabout:blank.
- `outcome.json`: launch/context/page/about:blank/close flags, failure stage, sanitized code, timeout, actual native outcome nếu có, spawn/close counts.
- `launcher-exit.json`: Node native exit hoặc unknown timeout, không ghi raw stdout/stderr.

Không lưu raw argv/environment/stderr/browser logs, password/JWT/token/DB URL. Unrecognized exceptions trả `UNCLASSIFIED_ERROR`, không giả root cause. Trade-off: native stderr chi tiết chưa được lưu, nên native exit có thể vẫn chưa đủ chẩn đoán root cause; có thể đối chiếu Windows event metadata ở phiên smoke được phê duyệt.

### C. Reviewed retry / cleanup behavior

Playwright `coreBundle.js:_innerLaunchWithRetries` có nhánh retry nếu message chứa `Inconsistency detected by ld.so`. Không bỏ qua nhánh này chỉ vì host Windows: spawn wrapper từ chối call thứ hai **trước OS spawn**, kể cả internal fallback. Exact executable, package/bundle và Node pins drift đều STOP, không tự cập nhật baseline.

Playwright Windows cleanup có nhánh `spawnSync(taskkill /pid ... /T /F)`. Dedicated boundary chặn `spawnSync/exec/execSync/execFile/execFileSync/fork`, mọi executable ngoài Edge và child.kill. Vì source pinned Windows dùng đường này, fallback force-kill không được thực thi. Chỉ review/chấp nhận Windows path (`process.platform=win32`), không tuyên bố kiểm soát cleanup OS khác. Native spawned root Edge có thể tự tạo renderer/utility subprocess thông thường; one-shot giới hạn **một root launch do Playwright/Node**, không phải toàn bộ process tree chỉ có một PID.

Lifecycle chỉ một launch/context/page, page route abort requests, goto **about:blank** rồi một browser.close. Chỉ PASS khi blank/close hoàn tất và native exit0/signalnull đã được quan sát. No native exit → không PASS.

Observer deadline20s; PowerShell wrapper wait30s. Launch hoặc close timeout → `TIMEOUT_OUTCOME_UNKNOWN`, không sửa native exit hoặc kill. Late launch resolution sau deadline bị chặn trước context/page. Nếu process vẫn còn sau timeout, giữ ownership/evidence và STOP, không retry/force process.exit; launcher có thể kết thúc wait trong khi owned observer/browser chưa thoát. Đây là trạng thái cần operator review, không phải cleanup PASS. Playwright có thể thử internal cleanup nhưng kill/fallback bị boundary từ chối; không hứa mọi launch failure sẽ graceful-close thành công.

### D. Security / environment / profile

Future base: `%LOCALAPPDATA%\SmartAgricultureBrowserSmoke` (exact operator path pin trong source), run `edge-smoke-<milliseconds>-<hex>`. **AA chưa tạo các thư mục hoặc real approval artifacts này.** Phiên tương lai cần phê duyệt tạo base/run/scratch mới, protected owner/operator-only DACL cho base/run/approval/tmp/profile/profile-roaming/profile-local, không inherit broad ACL, không reparse, scratch rỗng, no attempt/receipt/outcome cũ. Launcher không tự tạo/sửa ACL hoặc dọn thư mục để vượt gate.

Node environment chỉ SystemRoot/WINDIR/PATH/privateTEMP/TMP. Browser environment chỉ các biến đó cộng USERPROFILE/APPDATA/LOCALAPPDATA trỏ private profile; không inherit application secrets, DEBUG, NODE_OPTIONS hoặc Selenium endpoints. Playwright source `amendEnvironment` Chromium giữ env đã cấp; no Selenium fallback từ inherited environment.

Không truyền userDataDir qua custom args: Playwright tạo profile tạm trong private os.tmpdir; spawn guard xác minh actual `--user-data-dir` nằm dưới private tmp. Không dùng Edge profile cá nhân. Browser launch dùng exact executable, headless=true, **chromiumSandbox=true** vì source default có thể thêm no-sandbox nếu không set; không thêm `--no-sandbox`, không disable Defender/policy hoặc ignore default args. Đây là explicit sandbox-preserving diagnostic option, **không phải fix đã chứng minh cho lỗi Y**. Không tự thay channel/executable/download.

Route abort chỉ chặn page requests; **không bảo đảm chặn browser background networking**, không gọi công cụ network-isolated. Observer source không dùng MQTT/REST/API hoặc Website navigation; target duy nhất about:blank. Không dựa vào global environment guard có test-only network exception để tuyên bố browser deny-all networking.

### E. Offline synthetic tests / native completion

**19/19 observer tests mới + 12/12 Z regression = 31/31 PASS**, native test runner exit0; Node syntax observer/test PASS; PowerShell AST0errors được thực thi trong tests. Lần chạy cuối sau source finalization native0, dot reporter31cases.

Đã kiểm tra successful launch, OS spawn failure, abnormal native exit, missing PID, ownership mismatch, context/page failure, launch timeout, late resolution fence, graceful-close timeout, one close, native completion, duplicate launch/fallback refusal, child-process/force-kill APIs denial, profile/env/sandbox gates, secret redaction, immutable hashes, one-shot artifact create-new và CLI missing approval refusal trước Playwright/Edge.

```powershell
node --require ./scripts/acceptance-offline-guard.cjs --test --test-reporter=spec scripts/mvp-edge-smoke-observer.test.cjs scripts/mvp-browser-startup-diagnosis.test.cjs
```

Mọi Edge/native-child trong tests là **EventEmitter fake**, không msedge.exe thực. Chỉ synthetic CLI Node refusal và PowerShell AST subprocess được chạy; không TCP/listener, MQTT hoặc app services. Không gọi các browser selector suites có launch Edge. Synthetic success không chứng minh live Edge startup/OS sandbox hoặc permission compatibility.

### F. SHA256 / future approval schema

| File / runtime | SHA256 |
| --- | --- |
| scripts/mvp-edge-smoke-observer.cjs | AB8AFA61F54471BA16A224C9BE71A9C4E3ECD1F6C4C854C1182B74E200B4B137 |
| scripts/mvp-edge-smoke-once.ps1 | 00BC96D2222AB7A0F10CECF84BD3D9FA0423B136393DD77782E979E01D1DCE11 |
| scripts/mvp-edge-smoke-observer.test.cjs | C404564B87D091CDE7E3F94E733BEAC744E939CCCE88C594A18D2D5A10C70341 |
| playwright-core/package.json | 07C47543631FEF9508760365DEE9FBE958C562093EC8D122543949ED231F233F |
| playwright-core/lib/coreBundle.js | 9393FA79E1C67C74EDC26B610D65A4F7ED73D345A762465CC88340A33A2454AC |
| C:\Program Files\nodejs\node.exe | FDDDBF4581E046B8102815D56208D6A248950BB554570B81519A8A5DACFEE95D |
| exact Edge file (Z pin) | D35D48B11F0439EEEDDBBFF0BF54856E922F5E1506A2F3098B5A808FCEC4068B |

Future `approval.json` contract, **chưa tạo trong AA**: scope=`ONE_EDGE_ABOUT_BLANK_SMOKE`, approved=true chỉ theo approval thật, maxLaunches=1, userApprovalFile/its SHA256; `sourceHashes` đúng hai runtime names observer.cjs/once.ps1; executable exact Edge path, edgeSha256/packageSha256/bundleSha256/nodeSha256 như bảng (lưu lower-case). Node v22.20.0 / Playwright1.62.1 pinned. Không dùng scope AA/Y hoặc approval MQTT làm browser-execution approval.

Nếu source/runtime drift, preflight STOP, không tự thay expected hashes. Những source pins là pins của code/binary, không credential hashes.

### G. Exact proposed future one-shot contract — NOT EXECUTED

1. Người dùng phê duyệt riêng **một Edge about:blank smoke**, private run/scratch creation và observer đã review; không DB/DEV/MQTT/Website/login. Không cần nhập credential.
2. Tạo directory/plan mới theo D/F, verify ACL/owner/reparse/empty scratch và source/runtime hashes. Không reuse run cũ hoặc tự tạo approval không có quyền thực tế. Gate mismatch STOP trước Edge.
3. Sau review, chạy đúng một lần launcher:

```powershell
& 'C:\DATN\Project_datn\scripts\mvp-edge-smoke-once.ps1' -RunDirectory '<NEW_APPROVED_PRIVATE_EDGE_SMOKE_RUN>'
```

Đây là template tương lai, **không chạy trong AA**. Launcher receipt create-new trước observer; Node xác minh parentPID/approval/pins rồi giữ spawn boundary active trước load Playwright. Tối đa một native spawn, một context/page/blank/close, no retry/fallback.

4. Ghi actual native completion, xem metadata riêng tư. Missing PID/native outcome hoặc timeout không được gán0. Process unknown còn tồn tại thì STOP giữ evidence, không kill/reset/relaunch. Không gọi SMOKE_PASS là Website E2E PASS.
5. Kết thúc smoke-only; chỉ sau kết quả thực tế mới quyết định UI-only acceptance từ12readings Y như Z.H. Không nối tự động smoke sang DB/API/UI startup.

Rollback AA nếu cần: bỏ ba file mới khỏi source change đang review, invalidate future source pins; helper/runtime/live data không cần rollback vì không sửa hoặc chạy. Không xóa evidence Y/Z hoặc12readings/eight mappings.

### H. Remaining limitations / final verdict

Native spawn/exit interception được review theo installed Playwright source và kiểm thử bằng fake process; **chưa nghiệm thu tương tác thực tế giữa installed Edge và observer**. Ownership dựa direct-child handle/parent receipt, không independent Windows process-tree attestation. Browser background network không được OS-block. Raw native stderr không lưu. Timeout có thể để lại process cần review; không giả cleanup0. Source guard trong pinned dedicated worker không phải OS sandbox chống malicious native/runtime tampering.

Những giới hạn này không được dùng để gọi browser/root cause/UI PASS. Công cụ đã sẵn sàng cho review/phê duyệt smoke-only, không tự thực thi.

**BROWSER_SMOKE_OBSERVER_PREPARED_PASS**  
**REAL_EDGE_LAUNCH_NOT_EXECUTED**  
**MQTT_CONNECT_NOT_EXECUTED**  
**DEV_DATABASE_NOT_STARTED**  
**SOIL_SENSOR_QUALITY_BLOCKED**

STOP sau preparation. Không Edge/DEV/database/MQTT startup, credential/ACL/config change, DeviceCommand/ON/OFF/Automation/hardware action; không đọc/sửa/xóa12readings hoặc8records đã nghiệm thu.

## AB — Approved One-Shot Edge About:Blank Smoke Test (02/11/2026)

### A. User approval reference

Thực thi theo approval mới `1383afd4-76eb-4294-8441-7817c9914892/Pasted text.txt`, scope **ONE_EDGE_ABOUT_BLANK_SMOKE**, maximum một root Edge launch, no retry/fallback/force-kill hoặc DEV/MQTT/Website. Approval evidence SHA256 **a1eccd9efc737ff37105a48535ef86816c06365261635f5353df6f2c4019c9b7**; đây là hash tài liệu phê duyệt, không credential. Không reuse Y/Z/AA làm execution approval.

### B. Private run / ACL

Fresh run: `C:\Users\Acer Swift3\AppData\Local\SmartAgricultureBrowserSmoke\edge-smoke-1793624092421-96f0095c9bd6`.

Base chưa tồn tại tại precheck. Chỉ tạo base mới và đúng một run với `tmp`, `profile`, `profile\roaming`, `profile\local`. Mỗi directory mới owner đúng operator SID, protected DACL duy nhất operator FullControl; không sửa ACL parent hiện hữu/workspace/production. Existing ancestors không reparse. Scratch rỗng trước execution; approval.json create-new, protected operator-only ACL và owner được kiểm tra.

Không tạo run thứ hai hoặc ghi đè evidence. Artifacts được giữ: approval/launcher-receipt/identity/attempt/native-events/outcome/launcher-exit và postrun-review. Không manual xóa scratch/profile; Playwright có own cleanup đối với profile tạm mà nó tạo theo source đã review. Không dùng profile cá nhân.

### C. Source/runtime integrity

**7/7 hashes PASS trước và sau execution**, khớp đúng bảng AA/approval AB: observer, launcher, test, package.json, coreBundle.js, node.exe, msedge.exe. Không sửa source hoặc expected pins, không upgrade/download. Exact versions được đối chiếu bằng binary/file metadata và observer gates: Nodev22.20.0, Playwright1.62.1, Edge156.0.4314.58. Existing browser helper không sửa.

### D. Pre-launch gates

**PASS**: exact operator/base/run, owner/protected ACL/reparse, scope/approved/maxLaunches1, exact approval evidence hash và hai runtime source hashes (lowercase), no prior attempt/receipt, scratch empty, NodeparentPID khớp launcher receipt, fixed binary hashes/version và browser environment allowlist. Actual identity.json ghi sourcePinsVerified/privateAclReceiptVerified=true trước attempt.

Node closed environment và browser private USERPROFILE/APPDATA/LOCALAPPDATA theo AA; không credentials/JWT/DB/MQTT config, .env, DEBUG hoặc NODE_OPTIONS truyền vào browser. Explicit headless=true, chromiumSandbox=true, exact executable; spawn boundary được cài trước load Playwright và từ chối no-sandbox/profile/env mismatch. Không thêm flags hoặc thay channel giữa phiên.

### E. Actual executable

`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`, version **156.0.4314.58**, SHA256 **D35D48B11F0439EEEDDBBFF0BF54856E922F5E1506A2F3098B5A808FCEC4068B**. Native spawn wrapper rehash executable trước original spawn; profile argument chỉ được nhận trong private tmp. Không chạy trực tiếp Edge lần khác hoặc version CLI.

### F–G. Process tree / native evidence

| Process | PID | Parent / ownership | Native completion |
| --- | ---: | --- | --- |
| PowerShell launcher | 11112 | gọi đúng một lần qua exec | **exit0** theo native tool completion |
| Node observer | 1668 | launcher11112, receipt/ppid matching | **exit3**, stdout/stderr rỗng, no timeout |
| Native Edge root | 24700 | direct ChildProcess handle từ observer1668 | **exit0**, signalnull |

Các timestamp sau là **UTC observer request/event timestamps**, không giả OS creation timestamp:

| Event | UTC |
| --- | --- |
| Launcher receipt | 2026-11-02T12:54:59.0643590Z |
| Identity verified | 12:54:59.397Z |
| Attempt created | 12:54:59.844Z |
| Playwright launch started | 12:54:59.846Z |
| Native spawn request | 12:54:59.881Z |
| Native handle PID24700 captured | 12:54:59.894Z |
| Native spawn event | 12:54:59.899Z |
| Native exit event, code0/signalnull | 12:55:02.444Z |
| Observer outcome recorded | 12:55:02.505Z |
| Launcher recorded observer native completion | 12:55:02.5620151Z |

Tương ứng khoảng **19:54:59–19:55:02 ngày02/11/2026 UTC+7**. Launch-start → outcome capture **2659ms**, gồm failure handling; không có timestamp riêng của Promise rejection để tuyên bố exact launch-resolution duration. Spawn-event → native-exit **2545ms**. Native exit0 lấy trực tiếp handle exit event, không suy từ about:blank hoặc launcher exit.

### H. Browser lifecycle / actual failure

Private outcome: `status=SMOKE_BLOCKED`, `failureStage=launch`, sanitized `errorCode=UNCLASSIFIED_ERROR`, timeoutfalse, spawnAttempts1, closeCalls0. **Launch Promise không resolve thành usable Browser**; contextCreated=false, pageCreated=false, blankOpened=false, gracefulCloseCompleted=false. Không login/navWebsite/REST hoặc page requests do smoke page vì chưa có page; route setup chưa chạy.

Native Edge process có tồn tại và exit0 nhưng điều đó không phải Playwright/browser smoke PASS. Không có native process error event được observer ghi, không chứng minh startup/transport handshake đã thành công. Raw stderr/message/argv không được lưu theo contract; không suy code0 đồng nghĩa root cause đã sửa.

Explicit browser.close **không được gọi** vì chưa có Browser object. Graceful-close result **UNKNOWN/NOT_EXECUTED**, không được gọi là graceful close PASS chỉ từ Edge exit0. Không có timeout hoặc missing native outcome, nên classification cuối là **FAILED**, không phải UNKNOWN. Root cause tại sao automation launch reject vẫn **UNDETERMINED**; không quy về sandbox/version/profile hoặc gán cùng nguyên nhân với Y (AB có environment/profile/sandbox options khác đã review).

### I. One-shot enforcement

Launcher gọi **một lần**; one attempt artifact; native events có **đúng một spawn-request/handle/spawned/exit**, root allowance đã dùng **1/1**. Không duplicate-spawn/fallback event; không retry, browser khác hoặc nới guard. Dedicated boundary chặn child.kill và Windows taskkill/child-process fallback theo pinned source. Không có force-kill do Agent; không gọi command kill bên ngoài để cleanup.

### J. Windows event correlation

Read-only Application Event1000/1001 trong exact new window UTC **12:54:59.0643590Z–12:55:02.5620151Z**: **NO_MATCHING_EVENT_OBSERVED**. Không fault module/exception/reportID hoặc PID event để gán cho Edge24700. Không có event không đồng nghĩa browser không gặp lỗi, và không dùng event ngoài scope/process khác. Không mở dump, nâng quyền hoặc thay WER/registry.

### K. Integrity / cleanup

Post-run kiểm tra PID **11112/1668/24700 đều không còn chạy**. Native Edge exit0 và observer completion xác nhận root/observer đã kết thúc; không có unknown-owned PID từ phiên cần kill. Không thực hiện independent full browser-internal descendant enumeration, nên không khẳng định đã kiểm kê toàn bộ renderer/utility process tree. Không đóng process không thuộc phiên.

7source/runtime pins unchanged; run và approval ACL/owner vẫn PASS. Evidence create-new được giữ; `postrun-review.json` ghi one spawn, actual native exits, flags/no-event và remaining tracked PIDs rỗng. Không manual xóa profile/scratch hoặc sửa dữ liệu hệ thống/đồ án.

### L. Final verdict / next safe recommendation

**EDGE_ABOUT_BLANK_SMOKE_FAILED** — prelaunch gates PASS, native Edge exit0 nhưng automation launch reject trước context/page. **BROWSER_STARTUP_ROOT_CAUSE_UNDETERMINED**. Đây không phải Website E2E PASS, không phải native access violation được chứng minh.

Hành động tiếp theo chỉ là đề xuất: review source/error classification offline để thu thêm category của automation/transport rejection mà không lưu raw secret-bearing log, hoặc lập một phiên diagnostic khác được duyệt riêng nếu cần. Không sửa observer rồi dùng lại AB để launch lần hai; không dùng smoke result để start DEV/UI. Phiên này **STOP**, không tự chuyển PhaseAC.

| Final response field | Actual |
| --- | --- |
| Prelaunch gates | **PASS** |
| Launcher native exit | **0** |
| Observer PID / native exit | **1668 / 3** |
| Edge root PID / native exit | **24700 / 0**, signalnull |
| Root launch attempts | **1/1** |
| Context / page created | **NO / NO** |
| about:blank | **NOT_EXECUTED** |
| Graceful close | **UNKNOWN — no Browser object, closeCalls0** |
| Windows crash event | **NOT_FOUND** trong exact window |
| Final verdict | **FAILED** |

Không PostgreSQL/Backend/Frontend DEV startup, MQTT CONNECT/SUBSCRIBE/PUBLISH, Website/API/login, broker/credential/ACL/config changes, DeviceCommand/ON/OFF/Automation, flash/reset hoặc nguồn bơm. Không đọc/sửa/xóa12ESP32readings hoặc8registrationrecords. Giữ historical **ESP32_LIVE_DB_API_ACCEPTED**, **ESP32_LIVE_UI_BLOCKED**, **SOIL_SENSOR_QUALITY_BLOCKED**.

## AC — Offline Analysis of Playwright Launch Rejection After Native Edge Exit0 (02/11/2026)

Scope: attachment `184d7d43-e43c-4269-86e3-a4eb7c94472c/Pasted text.txt`, **read-only diagnosis + offline synthetic analysis + report**. Không dùng approval AB để thử browser lần nữa. Runtime sources, AB approval/attempt và filtered artifacts không sửa; chỉ thêm analysis test file và mục báo cáo này.

### 1. Source / evidence review

Đọc filtered metadata của đúng run AB `edge-smoke-1793624092421-96f0095c9bd6`: identity, attempt, native-events, outcome, launcher-exit và postrun-review. Không mở profile data, raw stderr/environment hoặc file credentials.

Đối chiếu observer/launcher/helper và installed Playwright `lib/coreBundle.js`: native spawn contract, Chromium readiness, pipe transport, session initialization, internal cleanup, exception filtering, process exit. Observer source hash vẫn **AB8AFA61F54471BA16A224C9BE71A9C4E3ECD1F6C4C854C1182B74E200B4B137**; launcher vẫn **00BC96D2222AB7A0F10CECF84BD3D9FA0423B136393DD77782E979E01D1DCE11**. Không patch source hoặc node_modules.

### 2. Timeline / confirmed boundary

AB launch-start UTC **12:54:59.846Z**, native spawn request **59.881Z**, handle **59.894Z**, spawn event **59.899Z**, EdgePID24700 exit **12:55:02.444Z** code0/signalnull, outcome **02.505Z** SMOKE_BLOCKED/launch/UNCLASSIFIED_ERROR, observerPID1668 native3 recorded **02.5620151Z**. LauncherPID11112 native0. Khoảng giờ Việt Nam **19:54:59–19:55:02 ngày02/11/2026**.

**CONFIRMED:** process được tạo, có direct owned handle, exit0; **chưa có usable Browser object được trả về cho smoke caller**, chưa context/page/blank và closeCalls0. Không timeout, không native process-error event hoặc duplicate root spawn. Đây là **BROWSER_EXIT_BEFORE_PLAYWRIGHT_READY** theo nghĩa readiness của caller; không khẳng định chính xác CDP method nào chưa hoàn tất hoặc rằng browser chưa từng nhận CDP message.

### 3. DevTools / pipe handshake source analysis

Installed source `launchProcess` tạo stdio5pipes (`coreBundle.js:8899`) cho Chromium IPC. `_launchProcess` dùng `PipeTransport2(stdio[3],stdio[4])` (`39607`) khi pipe transport; không mở CDP TCP endpoint. `PipeTransport2` nghe read-pipe close, đánh dấu closed và gọi onclose (`39141` trở đi); `CRConnection` gắn transport.onclose để dispose session và reject pending calls.

`CRBrowser.connect` await **Browser.getVersion**, sau đó **Target.setAutoAttach**, trước khi trả Browser cho nonpersistent launch (`38089–38110`). Native exit0 không đảm bảo các bước này hoàn thành. `_launchProcess` cũng có nhánh process-exit-before-ready ném startup error, và `_innerLaunch` có cleanup/rethrow khi connectToTransport lỗi. Nhiều nhánh này có thể tạo generic launch rejection dù native exit0.

AB **không capture pipe close/error events, CDP handshake milestones hoặc final error.name/message category**. Vì vậy **DEVTOOLS_PIPE_CLOSED_BEFORE_HANDSHAKE chỉ POSSIBLE**, không CONFIRMED. Source-consistent route không phải runtime trace. Không tự dựng CDP response hoặc protocol bytes từ outcome.

### 4. Hypothesis matrix

| Hypothesis | Classification | Evidence / giới hạn |
| --- | --- | --- |
| BROWSER_EXIT_BEFORE_PLAYWRIGHT_READY | **CONFIRMED ở caller boundary** | Actual owned Edge exit0, launchSucceededfalse, chưa Browser/context/page. Không đồng nghĩa xác định nguyên nhân exit. |
| DEVTOOLS_PIPE_CLOSED_BEFORE_HANDSHAKE | **POSSIBLE** | Pipe/session source phù hợp; không actual pipe/CDP milestone evidence. |
| BROWSER_SINGLE_INSTANCE_HANDOFF | **UNDETERMINED** | Clean early exit có thể phù hợp nhưng không có handoff/process-singleton message. New private TEMP/profile và actual user-data-dir guard làm normal personal-profile collision ít được hỗ trợ hơn; không loại trừ policy/Edge-specific behavior. Không đọc profile cá nhân để suy đoán. |
| SPAWN_GUARD_INTERFERENCE | **POSSIBLE, chưa chứng minh gây launch rejection** | First Edge spawn/hash/env/profile gate đã PASS. Không duplicate-spawn event. Boundary có chặn child APIs và force-kill cleanup; generic error hiện không cho biết cleanup có thử API đó không. Không bỏ guard để thử lại. |
| SANDBOX_OR_PROFILE_INITIALIZATION_FAILURE | **UNDETERMINED** | Sandboxtrue/privateprofile đã cấu hình; không stderr/category/event xác nhận lỗi initialization. Không tắt sandbox hoặc đổi quyền/profile để ép PASS. |
| VERSION_COMPATIBILITY_UNVERIFIED | **NOT VERIFIED** | Edge156 vs Playwright1.62.1/bundledChromium151; chưa có protocol incompatibility evidence. Không upgrade/downgrade theo phỏng đoán. |
| OS spawn failure | **Không khớp AB** | Có valid PID/handle/spawn event và exit; không ENOENT/EACCES/EPERM event. |
| Timeout hoặc explicit caller browser.close | **Không khớp AB** | timeoutfalse, closeCalls0, launch reject trước Browser assignment. |
| React/Vite/login error | **Không phải boundary AB** | Không Website/login/page navigation. Y Frontend HTTP readiness đã PASS. |
| Native access violation | **NOT PROVEN** | Edge native0/signalnull, không Event1000/1001 trong AB window; không gán lỗi ntdll.dll lịch sử của process khác. |

Không hypothesis nào đủ xác định root cause của native early exit. AB khác launch options/environment Y nên không hồi tố tất cả kết luận AB thành nguyên nhân Y.

### 5. Observer / launcher exit propagation

**Observer contract đúng với evidence:** `result.status==='SMOKE_PASS'?0:3`, Node native3 cho launch failure; native Edge0 vẫn giữ nguyên trong outcome. Unknown không được giả MATCH/PASS.

**LAUNCHER_EXIT_CONTRACT_DEFECT_FOUND:** `.ps1` ghi `$p.ExitCode` vào launcher-exit.json và Write-Host, nhưng kết thúc sau finally/Dispose, **không có ExitStatementAst nào** hoặc explicit failed-result propagation. AB thực tế chứng minh child3 → launcher0. Không thấy source/documented intent nói launcher exit chỉ đại diện orchestration completion thay vì diagnostic outcome; vì vậy đây là thiếu sót đối với process-status callers. Artifacts vẫn giữ failure chính xác, không có bằng chứng báo cáo AB đã nhầm PASS. Defect này **không giải thích tại sao Edge launch reject**, vì xảy ra sau child hoàn tất.

Smallest proposed fix, **NOT APPLIED**: giữ resultCode ngoài try/finally, capture actual Node code sau native completion, ghi metadata/Dispose xong mới `exit $resultCode`; timeout/start failure dùng nonzero/UNKNOWN riêng, không0. Giữ native Edge exit tách biệt. Test host exit0/3/unknown bằng synthetic process sau khi được phép source remediation; không dùng fix này để chạy lại AB tự động.

### 6. Data lost by sanitization

Current errorCode whitelist chỉ nhìn `e.code`; thông thường Error/TargetClosedError/transport-close errors không có code tương ứng nên đều thành **UNCLASSIFIED_ERROR**. `error.name`, category, pipe read/write state, getVersion/autoAttach milestones và cleanup-call rejection không được ghi. Native/stdout stderr raw không lưu theo thiết kế; không thể khôi phục từ source hoặc đọc profile để bù.

Synthetic test dùng cùng actual observer với Error và TargetClosedError: cả hai cho cùng fields sau sanitization. Đây là **diagnostic-information loss CONFIRMED**, không phải chứng minh AB đã có TargetClosedError cụ thể.

Proposed minimal instrumentation sau approval source-fix riêng: retain whitelisted error.name/category và safe booleans (pipe closed, handshake stage, guard-blocked API category) ngay khi catch; không raw messages/argv/env/CDP payload hoặc password/JWT. Preserve one-spawn/no-kill contract, pins và old evidence. Không thay versions/options hoặc disable guards trước khi có lý do. AC chưa triển khai instrumentation này.

### 7. Offline tests / source integrity

Thêm duy nhất `scripts/mvp-edge-smoke-analysis.test.cjs`, **7 tests mới**. Kết hợp **31 observer/Z regression = 38/38 PASS**, native0, Node syntax PASS. Tests dùng mock Chromium/EventEmitter native process và artifact Map; chỉ PowerShell AST subprocess để phân tích launcher source, không chạy launcher/Edge.

Cases: Edgeexit0 trước Browser vẫn SMOKE_BLOCKED; simulated transport/TargetClosedError trước handshake; observer native3 source contract; actual launcher AST không explicit exit dù capture child code; tổng hợp failure không bị launcher0/nativeEdge0 che; one spawn/no retry; no secret reflection; runtime source bytes unchanged.

```powershell
node --require ./scripts/acceptance-offline-guard.cjs --test --test-reporter=spec scripts/mvp-edge-smoke-analysis.test.cjs scripts/mvp-edge-smoke-observer.test.cjs scripts/mvp-browser-startup-diagnosis.test.cjs
```

New test SHA256 **35DEB0BA6E4BFBF96CFA017CD5E97BCC89B9F4C7C7C3A20C6B48E4DF7DC7174B**. Không overwrite AB artifacts/attempt, không phát sinh actual Edge attempt hoặc source fix.

### 8. UI-only startup audit

**UI_ONLY_STARTUP_BLOCKED với existing entrypoint nếu yêu cầu bảo đảm không có startup mutations.** `mvp-dev-backend.cjs` chặn MQTT connect và yêu cầu MQTTfalse/Commandsfalse/Automationfalse/testtrue/cap1, nhưng cuối cùng vẫn import `backend/src/server.ts`. Bootstrap luôn gọi `recoverMqttCommands()` sau DBconnect, kể cả MQTTfalse: transaction có DeviceCommand updateMany (PENDING→FAILED) và Actuator updateMany→UNKNOWN theo relations/flags. Y baseline0 giúp giải thích có thể không match rows, **không phải guarantee no writes cho phiên tương lai**. Không khởi động để đo hoặc sửa DB.

Presence watchdog chỉ start khi `env.mqttEnabled`; MQTTfalse không gọi mqtt.start connect, không có new MQTT receipts để markOnline/touch/markOffline. Presence policy methods có database updates; không gọi chúng để làm giao diện fresh. Nếu no-MQTT mode reuse ONLINE/OFF còn trong DB, phải hiển thị là **historical last-known**, không current connectivity/physical feedback.

Auth login/logout còn gọi `recordActivity` → createActivityLog; catch chỉ warn nếu ghi không được. Vì vậy ngay cả no-MQTT mode không thể tự gọi toàn bộ API flow read-only. Approval tương lai phải ghi rõ có cho phép bounded LOGIN/LOGOUT audit inserts không; hoặc dùng DEV-only verified read-only DB enforcement và đánh dấu audit persistence không nghiệm thu. Không âm thầm xóa/bypass production audit hoặc thay auth thật bằng simulation.

`SensorValueCard` hiện render timestamp và nhãn Bình thường khi không alertSeverity, không có stale-age check riêng; existing bench notice còn nhắc historical raw4095/soil0% dù Y numericsoil100. Không dùng các nhãn đó như evidence soil hiện tại hoặc fresh data. Cần offline DEV presentation correction/explicit historical notice trước UI-only acceptance, chưa sửa trong AC.

### 9. Smallest manual UI-only acceptance protocol — đề xuất, chưa triển khai

1. **Offline preparation riêng trước startup:** dedicated DEV API entrypoint import Express app thay vì production server bootstrap; review import-time side effects, không recovery/watchdog/evaluator/MQTT start. Enforce exactDB55433/smart_agriculture_mvp_dev/app-role identity, flagsfalse/false/testtrue/cap1 và hard-deny mqtt.connect/applicationPUBLISH. Không nối production hoặc thay main startup.
2. Review/test database mutation boundary: không sensorReading writes, no registration/DeviceCommand/state/presence updates; dùng DB-level read-only enforcement đã xác minh cho mọi pooled connection hoặc policy phù hợp được review. Đánh giá riêng audit-login behavior như mục8; không tự tạo role/grant/DDL trong AC. Nếu chưa đủ, tiếp tục BLOCKED.
3. Sau source preparation PASS, xin scope startup riêng cho existing TESTcluster55433 + API55001 + frontend55173, giữ Commands/Automationfalse, không Mosquitto. Recheck control metadata/systemID/ports/privateACL và12rowIDs/eight-record mapping bằng read-only queries. Không migration/seed/reset/restore/simulator.
4. Ưu tiên **operator tự mở browser thông thường** vào UI DEV sau approval; không phụ thuộc Playwright headless và không cần MQTT CONNECT. Credential nhập tại máy, không chat/screenshot. Không mở BẬT/TẮT hoặc mutation CRUD.
5. Actual login → chọn farm/zoneESP32 → dashboard ghi rõ last-known/stale → sensor history bao gồm đúng12rowIDs Y → charts khớp history/API → device details với historical lastSeen → timezone ViệtNam → soil quality warning **chưa xác minh, không dùng tưới**. Không yêu cầu card luôn numericfresh nếu app policy từ chối stale; kiểm tra stale policy trung thực.
6. Chụp ảnh thật dashboard/history-chart/device detail, mask credential/token/cookie; ghi timestamp capture, historical sourceMQTT và recordedAt **02/11/2026 19:11:18.853–19:11:48.853 UTC+7**. Không dùng simulator hoặc giả OFF/ONLINE. Screenshots có dữ liệu cũ không được gắn live/updating label.
7. Sau inspection, read-only compare counts/digests của readings/eight mappings/DeviceCommand và PENDING, audit delta theo approval; graceful stop đúng processes/cluster owned, preserve evidence. Không restart broker/production hoặc thử pump. Nếu cần chứng minh new-reading auto refresh, tách scope live mới được duyệt, không reuse MQTT1/1Y.

Đây là roadmap tối thiểu; **chưa có verified UI-only startup implementation**, nên không tự tuyên bố READY/start ngay. Manual browser inspection tránh buộc dự án phải giải quyết mọi headless-native startup issue trước khi nghiệm thu history/UI, nhưng không bỏ các startup/data safety gates.

### 10. Final classifications / remaining blockers

**BROWSER_LAUNCH_ROOT_CAUSE_UNDETERMINED**  
**LAUNCHER_EXIT_CONTRACT_DEFECT_FOUND**  
**UI_ONLY_ACCEPTANCE_PLAN_BLOCKED** — `UI_ONLY_STARTUP_BLOCKED`, cần DEV-only no-recovery startup/mutation review và historical presentation.  
**REAL_BROWSER_LAUNCH_NOT_EXECUTED_IN_AC**  
**MQTT_CONNECT_NOT_EXECUTED**  
**SOIL_SENSOR_QUALITY_BLOCKED**

Y ESP32 MQTT→DEV DB→REST acceptance giữ nguyên; UI chưa nghiệm thu. Không browser/DEV/PostgreSQL/MQTT startup, website login, credential/broker/ACL/version/security changes, migration/seed/production/ON/OFF/Automation hoặc phần cứng. Không đọc/sửa/xóa12readings hoặc8registrationrecords qua DB. STOP sau offline analysis, không dùng AB approval lần nữa.

## AD — DEV UI-Only Startup and Launcher Exit Contract Preparation (02/11/2026)

Scope: attachment `3ef1f018-98c9-4c99-92c9-691e3bf235f4/Pasted text.txt`, **minimal source remediation + offline tests only**. Không dịch vụ/database/browser/MQTT thật. Các verdict PREPARED/PASS dưới đây chỉ là source/offline preparation, không live acceptance.

### A. Source audit / changes

Đối chiếu Y/Z/AA/AB/AC và source được pin. Existing observer **AB8AFA61…200B4B137**, browser helper **A386C6B1…07C637AC** không sửa launch options. Sửa đúng launcher exit contract đã được AC chứng minh lỗi; không thay expected pins để bỏ qua source drift. AA/AB pins cũ giữ trong historical reports, không dùng để chạy source AD.

Added:

- `scripts/mvp-ui-only-api.cjs`: explicit-start DEV library, datasource factory, config/identity validation, module/import boundary, safe HTTP surface và graceful lifecycle.
- `scripts/mvp-ui-only-readonly.cjs`: guarded ORM/read-only transaction adapter, memory audit, historical chart bucket calculation.
- `scripts/mvp-ui-only-historical.cjs`: frozen exact IDs cho farm/zone/device/4sensors/actuator và12readings, expected timestamps, verification/notice; không chứa logic tạo readings.
- `scripts/mvp-ui-only-presentation.cjs`, `scripts/mvp-ui-only-frontend.mjs`, `frontend/src/dev/ui-only-sensor-card.tsx`: dedicated DEV presentation/Vite entry, không production import.
- `scripts/mvp-ui-only.test.cjs`, `scripts/mvp-ui-launcher-exit.test.cjs`.

Changed: `mvp-edge-smoke-once.ps1`; hai tests observer/AC được cập nhật expectations cho explicit exit đã sửa. Production server/app/auth/repositories, Prisma schema, firmware và existing frontend components không sửa.

### B. Launcher native exit propagation — FIXED

Extract native child wait/evidence/Dispose vào `Invoke-SmokeNativeObserver`; trả resultCode sau finally, launcher `exit $resultCode` ở cuối. Actual Node exit được giữ, không lấy nativeEdge0 thay observer3. Native0→launcher0, native3→launcher3, startup/orchestration failure→3, timeout/unknown→**4**. Evidence được ghi trước exit, handle Dispose trong finally; no retry/kill. Main vẫn deadline30000ms; test inject deadline nhỏ chỉ trong extracted helper.

Synthetic native tests chạy helper AST với **Node child** chỉ exit0/exit3/sleep300ms hoặc missing synthetic executable: external PowerShell exit tương ứng **0/3/4/3**, stderr rỗng. Timeout child được chờ tự kết thúc, không force-kill. Không chạy launcher main, không gọi Edge hoặc dùng approval/attempt AB. Playwright source/options/observer không thay.

### C. DEV-only API startup design

`startUIOnly` là library entry, **không** import production `server.ts`. Chạy script trực tiếp chỉ trả `SEPARATE_UI_ONLY_APPROVAL_AND_SUPERVISOR_REQUIRED`, không startup. Future approved supervisor phải cấp closed DEV env, fresh control-metadata/approval/source-pin proof, explicit Prisma constructor từ installed client và managed lifecycle. Đây không phải complete session/provisioning launcher, không tự start cluster hoặc tìm credentials.

Datasource factory chỉ nhận exact **127.0.0.1:55433/smart_agriculture_mvp_dev, sa_mvp_dev_app, ?schema=public**; raw client phải xuất phát từ factory (WeakMap provenance). Không URL fallback hoặc config production. Required flags false/false/testtrue/cap1, MQTTfalse; reject MQTT user/password/broker env và NODE_OPTIONS. Fresh proof chỉ cho exact **PGDATA C:\DATN\test-instances\phase13-3b\data / systemID7698826681383327460**, checkedAt<=60s, scope `ONE_DEV_UI_ONLY_HISTORICAL_SESSION`.

Proof là attestation do **supervisor được review riêng** cung cấp, không tự thay thế authorization/hashing/native preflight. Future supervisor phải kiểm tra control metadata/process/ports/11migrations/eight identities và real approval; library không tự chứng minh OS PGDATA/systemID chỉ từ fields true. Trước app import/listen, library chạy bounded READ ONLY SQL identity check db/role/port và xác minh12rowIDs/sensorIDs/sourceMQTT/finite values/recordedAt. Xác minh manifest IDs offline với actual filtered PhaseY artifact: **12/12 MATCH**, không mở database.

Serving API sau approval chỉ bind127.0.0.1:55001; chờ listening/error completion. Wrapper từ chối CRUD/commands và engine endpoints; chỉ GET/HEAD hoặc POSTauth/login/logout được đi vào app. `startUIOnly` trả policy false/false/testtrue/cap1, mqttdisabled, historical-data/audit-memory labels. Close idempotent, server callback→disconnect pool→restore hooks trong finally. Không startup tự động từ require/import hoặc approval boolean frontend.

### D. Import-time side-effect analysis

Audit chain: Express app→routers→controllers/services→repositories; production server bootstrap kết nối DB/recovery/MQTT/watchdog được loại khỏi chain startup mới.

Dedicated module boundary được cài trước app import; rejects đã có cached backend/src để không reuse production app/client. Config/database module được thay bằng guarded DB, config/env bằng frozen DEV config; dotenv/.env read bị chặn, không load production env parser/fallback. Additional PrismaClient constructor trong app bị chặn. MQTT connect/connectAsync, service.start, recover/invalidate/handlePumpState và presenceWatchdog.start đều deny; không chạy scheduler/evaluator/DeviceCommand dispatch. Module gateway singleton/route definitions có thể được tạo trong memory, không connect hay publish; no timers chạy từ command methods.

Actual Express module import dưới fake DB và offline network guard đã PASS: **0fakeDBconnections khi import**, không listen hoặc bootstrap. Tests gọi server import/MQTT start/recover/connect và bị từ chối. Read-only DB guard còn chặn write nếu route/service ngoài dự kiến cố ghi. Live/shadow-preview/device-command GET endpoints bị HTTP gate chặn; mutation methods bị chặn trừ auth memory-audit route. Không coi việc import app là nghiệm thu HTTP server thật.

### E. Database mutation boundary / pool paths

Không chỉ SET một connection ban đầu: **mỗi read** bắt đầu interactive transaction trên actual pooled connection; `SET TRANSACTION READ ONLY` trước query, `SET LOCAL statement_timeout='5000ms'`, maxWait2s/transaction timeout8s, RepeatableRead. Array transaction nhận lazy guarded operations để tất cả chạy trong cùng readonly transaction; callback/nested paths dùng guarded transaction client. Concurrent calls dùng transaction mới nhưng đều SET readonly. Startup identity cũng chạy readonly/timeout riêng.

App chỉ được model read methods findUnique/findFirst/findMany/count/aggregate/groupBy và variants; mutations/createManyAndReturn/upsert/update/delete, arbitrary raw SQL, executeRaw, $connect/$extends/alternate-client escapes bị từ chối trước driver. Raw app query chỉ fixed health `SELECT 1`; không cho arbitrarySELECT/set_config để đổi transaction policy. Root reads farm/zone/device/sensor/actuator/reading có ID allowlists; twelve-readings source/time mapping được kiểm tra trước serve.

Chart repository aggregate SQL được thay **chỉ trong DEV boundary** bằng bucket calculation từ guarded actual stored sensorReading rows, không generated values/SQL INSERT. Giữ epoch/value/min/max/count shape cho actual REST chart service; không là full SQL performance/aggregate parity acceptance cho production.

**OFFLINE READ_ONLY_GUARD_PASS**: fake pool kiểm tra bốn independent connection paths (concurrent single reads, batch transaction, callback), SET-before-read và write/unsafe SQL refusal. **REAL_POSTGRESQL_READ_ONLY_ENFORCEMENT_NOT_VERIFIED**: chưa chạy PostgreSQL/Prisma pool thật. Không tạo role/grant/DDL. Future real session phải verify connection identity, real readonly behavior an toàn và baseline/digests; không suy synthetic SQL stub là PostgreSQL PASS. Library raw client chỉ ở supervisor/lifecycle boundary, không được truyền cho application repositories.

### F. Authentication / audit

Chọn **A — DEV-only memory audit adapter**. Giữ actual auth controller/service, user lookup, bcrypt compare, status/role checks và JWT signing. Chỉ `recordActivity` import được thay bằng counter memory-only, không lưu body/password/token hoặc gọi ActivityLog.create; audit list/export read functions vẫn tồn tại. Không sửa/âm thầm disable production audit source.

Actual authService dưới fake user repository đã kiểm tra wrong password rejected, correct synthetic password accepted, JWT trả trong memory và audit events1, **DBwrites0**. Không token/mật khẩu được ghi vào report hoặc screenshot. Future real UI login vẫn phải dùng actual DEV user/password, không giả token/success. UI banner ghi rõ **audit persistence không nghiệm thu**; không xin quyền bounded DB audit writes cho phương án này.

### G. Historical presentation

Dedicated frontend requires separate approved-mode flag, fixed API55001 và empty envDir; không auto start trong AD. DEV Vite plugin thay riêng SensorValueCard bằng `src/dev/ui-only-sensor-card.tsx`; không sửa component production. Card ghi **Dữ liệu lịch sử / last-known — không LIVE**, timestamp rõ Asia/Ho_Chi_Minh/UTC+7, soil quality chưa xác minh và không dùng tưới. Không mặc định nhãn Bình thường như chứng nhận sensor quality. Không hardcode soil0/ADC4095 thành latest; Y numeric100 vẫn giữ như actual stored value qua API.

Global DEV notice giải thích **ONLINE/OFF chỉ là trạng thái đã ghi nhận, không phải kết nối/GPIO hiện tại**,12stored MQTT readings và memory audit. DEV-only transform đặt timezone tường minh cho SensorHistoryPage/Chart/DeviceDetail formatters; original files không đổi. Browser real display/polling/screenshot **NOT_VERIFIED**; SSR/transform tests không phải browser E2E.

History/API chỉ lấy stored rows từ guarded repository/ID list. Không simulator generation, không sửa timestamps, không tự tạo OFF/ONLINE, không auto irrigation. No-MQTT mode không có telemetry mới, timer refresh lịch sử không được gọi realtime auto-refresh.

### H. Tests / typecheck / native evidence

**54/54 offline tests PASS**, native0, no skipped/cancelled. Gồm **4native launcher tests + 12UI-only tests + 38related observer/Z/AC regression**. Node syntax cho new/changed CJS/MJS PASS; PowerShell AST PASS. Backend `tsc -p backend/tsconfig.json --noEmit` **exit0**; frontend `tsc -p frontend/tsconfig.app.json --noEmit --incremental false` **exit0**. Không migrations, Prisma generate hoặc services từ các checks.

```powershell
node --require ./scripts/acceptance-offline-guard.cjs --test --test-reporter=spec scripts/mvp-ui-launcher-exit.test.cjs scripts/mvp-ui-only.test.cjs scripts/mvp-edge-smoke-observer.test.cjs scripts/mvp-edge-smoke-analysis.test.cjs scripts/mvp-browser-startup-diagnosis.test.cjs
```

Tests cover source import/query0, pooled read-only ordering, batch/callback reads, mutation/raw denial, URL/flags/stale-proof gates, actual auth with fake DB/memory audit, exact12mapping, SSR soil/historical labels/Vietnam19:11:18, timezone transforms/transpile, mock lifecycle close-once/disconnect. Existing tests được chỉnh expectation về launcher explicit exit sau fix; không thay negative outcome thành PASS. Không chạy tests có actual browser launch hoặc live integration.

### I. New source SHA256

| File | SHA256 |
| --- | --- |
| mvp-edge-smoke-once.ps1 | 9AD40553E7B3CDAE9EC1AF04B08CDEF6DDD53E2E1C1D05DBF8009FA4657F69AE |
| mvp-ui-only-api.cjs | C1EBB1A012B7ED2DA939BEE20CF3F8DB8B3B69648C029F6BA3564BB75FD252C8 |
| mvp-ui-only-readonly.cjs | 875BDE9091CA1D3D04ABB5294F6E018718877273BE7B57FDD9FE6DC084BB2BB2 |
| mvp-ui-only-historical.cjs | 5902979EA83D02E8DAF6DE1CA239F9CECD05F1279578104EC3FF6DB4C4D223E1 |
| mvp-ui-only-presentation.cjs | DDA07E3E294A8C55F9A19958CF2D4BC9FE34543E85AEEDAD88780799733F1FBD |
| mvp-ui-only-frontend.mjs | 0448F8D57B97998FFC5772A6AEB3710B4E4DABFE0506B163E9C8C087506F1F1B |
| frontend/src/dev/ui-only-sensor-card.tsx | AB9E273A4F194CBC2DEC293F96950188F84027A61F86BD73E95316578450897F |
| mvp-ui-only.test.cjs | F0CA6189ABC1B10B8B2458BBB492DAAA011DC706E083E67BC8509E0CF1D66444 |
| mvp-ui-launcher-exit.test.cjs | 602E73AA835286E50D7D3673F5A1896C1230AE8D6103A79009821B5F16401F64 |
| mvp-edge-smoke-observer.test.cjs | 7E4A68BA84F0CD3118F8E493DB3C7DC0479B49823CEE70CCE9B9E475643ADE51 |
| mvp-edge-smoke-analysis.test.cjs | 008D2A339012F2F6B66F8CF84461BC4356C5AAC5E72D57F31A9C0DD915D26376 |

Runtime source diff chỉ launcher function/result-code propagation và new DEV-only files; production files giữ nguyên. Rollback: restore launcher AA pin00BC96… from reviewed previous source together with corresponding tests, invalidate any future plan pins, remove/unwire new DEV-only library/frontend changes. Không dùng rolled-back launcher để gọi success dựa exit0; không DB rollback vì không DB action. Giữ nguyên AB evidence.

### J. Remaining blockers / scope limits

- Actual DB pooled readonly behavior/integration và actual UI-only startup **NOT_VERIFIED**; chưa serving PID/runtime attestation cho AD.
- Startup library cần **approved supervisor riêng** cung cấp genuine approval/hash/OScontrol/record baseline; fields `approvalVerified/sourcePinsVerified` không phải bằng chứng tự sinh quyền. Chưa có phiên được phép chạy hoặc lấy credential trong AD.
- Browser startup root cause AB/Y vẫn UNDETERMINED; launcher status fix không chữa native Edge. Có thể ưu tiên manual browser để nghiệm thu Website mà không cần thêm Edge headless smoke.
- SSR/TypeScript PASS không thay actual UI/screenshots. Soil quality chưa được calibration/physical verification; historical100% không gỡ blocker.

### K. Proposed separate approval / stop

Đề xuất **một supervised UI-only session mới**: cho phép khởi động đúng existing cluster55433 sau fresh identity/ports/NTFS/11migration/eight-record baseline; read-only verification trước serve; private closed-env credentials từ DEV bằng phương thức đã review; new library/app55001 + dedicatedfrontend55173; MQTTfalse/commandsfalse/automationfalse/testtrue/cap1. Đối chiếu12rowIDs/values/source/recordedAt/receivedAt với Y, user tự login/manualinspect dashboard/history/charts/device/stale/soil notice, chụp ảnh thật đã mask secrets. Không Mosquitto/observer/publish hoặc additional MQTT allowance.

Approval phải bao gồm supervisor/guard real-readonly verification và graceful stop owned API/frontend/cluster sau acceptance; không migration/seed/reset/sensor writes. Nếu metadata/identity/guard lệch thì STOP. Không mô tả stored data refresh là fresh MQTT E2E, không yêu cầu nối lại pump. **Không thực hiện kế hoạch này trong AD.**

**LAUNCHER_EXIT_CONTRACT_FIXED_PASS**  
**DEV_UI_ONLY_STARTUP_PREPARED_PASS** — offline/source only.  
**DEV_UI_ONLY_READ_ONLY_GUARD_PASS** — fake pool/ORM only; realSQL NOT_VERIFIED.  
**HISTORICAL_UI_PRESENTATION_PREPARED_PASS** — SSR/transform only.  
**REAL_BROWSER_NOT_EXECUTED**  
**DEV_DATABASE_NOT_STARTED**  
**MQTT_CONNECT_NOT_EXECUTED**  
**SOIL_SENSOR_QUALITY_BLOCKED**

STOP sau AD. Không real DB/HTTP/browser login, API/frontend/database startup, runtime flag changes, production access, MQTT/credentials/ACL/broker modifications, DeviceCommand/ON/OFF/Automation, ESP32/firmware/hardware action hoặc sửa/xóa12readings/8records.

## AE - Separate report

Full Phase AE content, test evidence, source hashes and future execution requirements: [MVP_UI_ONLY_SUPERVISOR_PREPARATION.md](MVP_UI_ONLY_SUPERVISOR_PREPARATION.md).

## AF — Approved One-Shot Supervised UI-Only Historical Acceptance

Full report A–N: [MVP_PHASE_AF_UI_ONLY_ACCEPTANCE.md](MVP_PHASE_AF_UI_ONLY_ACCEPTANCE.md).

**HISTORICAL_WEBSITE_UI_BLOCKED** before startup. Source hashes 250/250 PASS; runtime gate BLOCKED because the expected postgres.exe pin has 65 characters. No plan/attempt/run, PostgreSQL/API/frontend/browser startup, DB/MQTT connection or hardware action. Expected pins were not changed; no retry performed.

## AG — Offline Runtime Pin Remediation

Separate report: [MVP_PHASE_AG_RUNTIME_PIN_REMEDIATION.md](MVP_PHASE_AG_RUNTIME_PIN_REMEDIATION.md). Pin corrected using pre-AE native preflight evidence; revision 2 preserved, revision 3 verified, 129/129 offline tests PASS. **READY_FOR_NEW_UI_ONLY_EXECUTION_APPROVAL**; no startup or live acceptance performed.
