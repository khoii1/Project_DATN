# MVP development runtime acceptance

## FINAL PAGINATION VERIFICATION & SOFTWARE MVP CLOSURE —29/10/2026

**MVP_DEV_UI_ACCEPTED**  
**MVP_DEV_SOFTWARE_ACCEPTED**  
**COMPLETE_VERIFIED_DEV — software MVP, DEV/SIMULATOR, Commands/Automation disabled**

Phiên mới chỉ xác minh bản sửa pagination còn thiếu; không mở rộng scope hoặc chạy lại những acceptance đã đạt. Bằng chứng hiện hành thay thế trạng thái lỗi phân trang/PARTIAL của phiên trước, nhưng giữ nguyên raw evidence cũ.

Private run: **C:/DATN/test-instances/phase13-3b/mvp-ui-1793268981293-151b99**. Thời gian17:16:37–17:17:39UTC+7 ngày29/10/2026. Approval nguồn attachment1f9f2021-6c52-4f5b-8ca2-e6554bb1ffa1;SHA256 **85c4d3b0f63cf717cee165346e2c79497d69c8d2027b0f6d88c9388b528a26cd**. Startup mỗi thành phần đúng một lần; marker mới. Một prepared-only run trước đó được giữ, không có execution/startup.

### A. Offline verification

Đã đọc SensorHistoryPage.tsx và xác minh setPage(1) trong cả ba onChange farm/zone/type. Các state này được cập nhật trong cùng sự kiện. Effect tải dữ liệu phụ thuộc sensor/range/page/limit và có AbortController; không có effect cố tình phục hồi page cũ. Manual next/previous chỉ thay page, không đổi scope nên vẫn hoạt động.

Trước server startup, native exit0 cho:

- Regression **mvp-history-pagination.test.cjs:1/1PASS** — actual React page với services fixture offline; không coi là liveDEV.
- Frontend typecheck:tsc --noEmit,exit0.
- Frontend lint:ESLint với config/cwd frontend tường minh,exit0.
- Actual React/CSS Vite build từ privatecwd,configFilefalse/emptyenvDir/explicitPostCSS,exit0.

Source hashes được pin trong prepared.json, gồm HistoryPage và browser/executor. Hậu kiểm tất cả hash khớp; không sửa application source trong phiên này. Chỉ thêm hai runner/harness cho acceptance pagination. Không đọc production.env hoặc thêm package/feature.

### B. Existing DEV runtime

Canonical PGDATA **C:/DATN/test-instances/phase13-3b/data**,PG_VERSION17,systemID **7698826681383327460**,clean shutdown trước start. Các port55433/55001/55173 không conflict; không postmaster.pid cũ. Owner/NTFS/binary pin và historicalevidence guardsPASS.

Frontend12884 tại127.0.0.1:55173 render login thật trước khi TEST/backend chạy; sau đó giữ nguyên process. TEST55433 được start một lần. App-role **sa_mvp_dev_app** đọc READ ONLY identity smart_agriculture_mvp_dev/127.0.0.1:55433,serverstart/PGDATA khớp;11 migrations names/checksums/status nguyên vẹn; role khôngsuperuser/createdb/createrole/replication/bypassrls.

Backend23784 bind127.0.0.1:55001,started10:17:17.941Z; listenerPID khớp. Healthdatabase connected/MQTTdisabled. Guarded serving environment: MQTT_ENABLED=false,MQTT_COMMANDS_ENABLED=false,MQTT_AUTOMATION_COMMANDS_ENABLED=false,MQTT_PUMP_TEST_MODE=true,max1. Protected actuator API trảgatewayDISABLED/controlEnabledfalse. Cap/testMode chứng minh bằng env/entrypoint guard của process; APIkhôngexposecap.

Baseline41SIMULATORreadings,DeviceCommand0/PENDING0,enabledAutomation0. Credential dùng CurrentUserDPAPI cũ qua private pipe, không thay/xuất. Không TESTDBA runtime, không provisioning/DDL/migration/seed/reset.

### C. Type pagination — PASS

**P1-TYPE** bắt đầu SOIL_01,12rows,pageSize10,trang2/2 có2rows. Sau đổi typeLIGHT:

- Request **/api/sensors/mvp-sensor-light/readings?...&page=1&limit=10&sort=desc**,HTTP200.
- DB/API có8rows,UI hiển thị đủ8 cell giá trị0 và footer **Trang1/1**.
- selectedSensor=mvp-sensor-light;statistics count8,min/max0;chart thuộcLIGHT,points đều0.
- Không cònSOILrows hoặc Trang2/1; không có bảng trống giả.

Ảnh **P1-soil-page2.png** và **P1-light-page1-fixed.png**. Screenshot sau sửa đã được xem trực quan:8rows0lux,statistics/chart và footer đúng. Lỗi application ở phiên trước được đánh dấu **LIVE_VERIFIED_FIXED**.

### D. Farm/zone pagination — PASS

**P2-FARM:** SOIL/FarmA đang trang2 → chọnFarmB. UI xóa rows cũ, yêu cầu chọn zone; chọnmvp-zone-b tự lấy mvp-sensor-other với **page1,total1,totalPages1**. DB rowIDs khớp response,UI chỉ có1row của scope mới; chờ thêm800ms không bị ghi đè bởi dữ liệu cũ. Ảnh **P2-farm-b-page1.png**.

**P3-ZONE:** existingFarmA chỉ có một zone ngoài option rỗng. Để không tạo fixture, kiểm tra handler thật bằng **zoneA→rỗng→zoneA** từ trạng thái trang2. Khi xóa zone, bảng cũ biến mất và UI hiển thị hướng dẫn chọn scope. Khi chọn lại zoneA, sensor được tự chọn từ danh sách mới,request **page1**,DB/API count3,totalPages1 và footerTrang1/1 khớp. Đây là sensor acceptance3readings đã tồn tại từ phiên trước, không tạo mới.

Ảnh **P3-zone-cleared.png**,**P3-zone-reselected-page1.png**. Phạm vi xác minh là đổi lựa chọn zone/clear/reselect; không tuyên bố đã so sánh hai zone không rỗng trong cùngfarm. Page reset và loại bỏ stale rows của handler đã có live evidence.

### E. Normal pagination navigation — PASS

**P4-NORMAL:** SOIL12rows,size10,trang1→trang2→trang1 hoạt động. Trang2 có2rows và không tự bật về1 khi chờ700ms; quay lại trang1 có10rows. Hai GETreadings tương ứng hai thao tác, không vòng lặp trong cửa sổ quan sát. Không blocking JSerror/HTTP500. Ảnh **P4-back-page1.png**.

### F. DB/API/UI evidence

| Case | Sensor/count | APIpage/totalPages | UI/result |
|---|---|---|---|
| P1-TYPE | LIGHT_01/8 |1/1 |8rows0lux,khôngmissing — PASS |
| P2-FARM | FarmB SOIL_01/1 |1/1 |Đúngfarm/zone/sensor mới — PASS |
| P3-ZONE | ZoneA acceptanceSOIL/3 |1/1 |Clear/reselect khônggiữpage2 — PASS |
| P4-NORMAL | SOIL_01/12 |1/2→2/2→1/2 |10rows→2rows→10rows — PASS |

Mỗi response được correlate bằng DBquery cùng sensorId/from/to/order vàpageSize, so sánh tổngrows vàID của từngpage; selected filters/footer và screenshots giữ trongcheckfiles. Có7PNG và86browserAPIresponses. Khôngmock/fulfillAPIresponse, khônginjectDOM để giả trạng thái, không gửi command. Case1/2/3/4 đều sử dụng dữ liệu existingSIMULATOR.

4businesscases PASS; tổng10checkpoint PASS còn bao gồm6gate offline/render/runtime/safety. Không gọi đây là10testUI nghiệp vụ,khôngcộng với43API/6CRUD/22checkpoint hoặc556offline lịch sử. Các checkpoint cũ được kế thừa trong đúng phạm vi,không thực thi lại.

### G. Safety and cleanup

- Trong phiên và trước shutdown:Commandsfalse/Automationfalse,MQTTdisabled,GatewayDISABLED/controlfalse,DeviceCommand0→0/PENDING0,enabledAutomation0.
- Readings **41→41**,không thêmfixture/sensor/zone/user/rule/reading. Normal login có thể appendActivityLog của DEV; không khẳng định database hoàn toàn không ghi. Field dataWrites=0 trong closure sơ bộ chỉ nói fixturewrites; **software-mvp-closure-final.json** là record có phạm vi được ghi rõ.
-0production/recovery/MQTT/hardwareactions. Khôngfirmware/credentials/migration/startup production,khôngON/OFF. CurrentDEV đãdừng,không có processruntime mới đang phục vụ sau cleanup.
- Frontend12884STOPIPCexit0 → backend23784STOPIPCexit0 → disconnectPrismaownedclients → otherclients0 → TESTsmart-stop nativeexit0.
- Hậu kiểm pg_controldata systemIDđúng/state **shut down**,postmaster.pidkhôngtồn tại,khônglistener55433/55001/55173. Browserclosehoàn tất,khôngforcekill/retry/startlần2.
- Historicalprivateevidencehashkhôngđổi. Private run59items được recheckowner/ACL/reparse:0bấtthường,chỉoperatoraccess; closure-final thêm sau kiểm tra dùng cùng inheritedACL. Giữ data/credentials/evidence. Khôngxóa hoặcghiđèmarker cũ.

### H. Software MVP final verdict

**MVP_DEV_UI_ACCEPTED**  
**MVP_DEV_SOFTWARE_ACCEPTED**  
**COMPLETE_VERIFIED_DEV — software MVP scope đã có evidence**

P0 software của scope nghiệm thu hiện tại **đã đóng**. Bảnresetpagination đã được verified live, nên các nhãnPARTIAL/P0cònmở trong phần lịch sử bên dưới không còn là trạng thái hiện hành.

Acceptance này bao gồm softwareDEV/SIMULATOR:auth/RBAC/CRUD/monitoring/history/chart/CSV/alerts/userlifecycle và giao diện tưới ở trạng thái khóa. Không tự bao gồm thực thi ON/OFF thật, hệ thống production, benchmark mọi tải, mọi thiết bị/múi giờ/browser hoặcphần cứng.

Các ngoại lệ được giữ rõ: **SHADOW_PREVIEW_NOT_VERIFIED_DEV** vì thiếu targetphysicalidentity; OS-nativehidden/resume vàprofiling dài hạnNOT_VERIFIED; UIpolishmobileP1. Không nới trust/identity để buộcPASS. Không còn applicationfailure hoặc mandatorypagination thiếu bằng chứng trong bốn scenario đã kiểmtra.

Giữ nguyên:

- **PROJECT_NOT_READY_FOR_DEFENSE**.
- **REAL_ESP32_E2E_NOT_VERIFIED** trong phiên nghiệm thu cuối hiện tại; hardwarePASS cũ làhistorical.
- **AUTOMATIC_PHYSICAL_NOT_VERIFIED**.

Sourcesadded:mvp-pagination-session.cjs,mvp-pagination-browser.cjs. Khôngsửaapplicationcode trong phiên; sourceHistoryPage có3setPage(1) từ bảnfixtrước,hash được pin/xácminh. Rollbackcodechỉbỏuseharnessmới;khôngrollbackDB/dữliệu hoặc quaylại bản paginationlỗi đểdemo. Runtimeđãstop nênkhôngcònbước rollbackdịchvụ.

Evidence:prepared.json,execution.attempt.json,checkfiles,summary.json,browser.redacted.json,api.redacted.json,native results cho regression/typecheck/lint/build/start/stop,software-mvp-closure-final.json,7screenshots. Hash mã nguồn thực thi ởprepared.json vàclosure-final,khớp100% sau phiên. Khôngxuấtcredentials.

### I. Next phase: Real ESP32 IoT acceptance

Chỉ chuẩn bị bước tiếp theo, **không thực thi trong phiên này**:

1. Phê duyệt riêng phạm vi read-only/network/runtime cần để kiểm traESP32 thật. Xác định mạng,broker,backendprocess và targetDB rõ ràng;khôngtựstart productionhoặcreuseapprovalbơmcũ.
2. Xác minh3batchesMQTT mới củaTEMP/HUM/LIGHT/SOIL:timestamp/source/session,freshDBrows vàREST/UIkhớp;SerialPUBACKkhôngthay bằng chứngDB.
3. Xác minhONLINE vàfreshPERIODIC_OFF nonretained đúngsession,UIpolling;giữCommands/Automationdisabled,khôngON/OFF,adapterbơmngắt.
4. Chốt với giảng viên phạm vi automaticphysical haysimulation để hoàn thiệnđềcương/kịchbảnbảo vệ;khônggộpSHADOW thànhtưới thật.
5. Sau nghiệmthuIoT/hardwaređúngphạmvi vàtài liệu/ảnh/demođủ, mới đánh giáPROJECT_READY_FOR_DEFENSE.

Không cần mởR2.x,migration sáuledger production hoặc chạy lại toàn bộtestđểđóngsoftwareDEV. Dừng saubáocáo;khôngtựchuyểnphase.

---


## MVP FINAL UI GAP CLOSURE29/10/2026 — PART A–J

**Final verdict: MVP_DEV_UI_PARTIAL.** Những khoảng trống UI chính đã được nghiệm thu; còn kiểm chứng live bản sửa reset phân trang khi đổiscopeHistory. Không nâng toàn bộsoftware thành COMPLETE_VERIFIED_DEV hoặcPROJECT_READY_FOR_DEFENSE. Không mở phiên startup thứ hai.

Private run: **C:/DATN/test-instances/phase13-3b/mvp-ui-1793267102544-dc1c90**. Thời gian16:45:08–16:46:53UTC+7,29/10/2026. Approval attachmentaca94d92-00e9-41c3-a734-3016858a2e70, SHA256 **0c424421ba423e1cc31bc64f00253f2184743c57e17a3105bc67b98dd6048966**. Source/evidence và kết quả trước được giữ, không tái dùng marker. Đọc phần mới nhất này trước các checkpoint lịch sử bên dưới.

### A. Fresh preflight

- Đọc/review browser harness và component/DOM/contract thực. Offline no-data test và actual user form/status dialog/disabledPump test **2/2PASS**. GateA bắt được lỗi exact-label Vai trò trước startup: wrappedselect chứa optiontext, sửa selector bằng anchored semanticlabel; không nới validation hoặc fakeAPI.
- Build actualReact/CSS từ privatecwd PASS, emptyenvDir/configFilefalse và explicitPostCSS; khôngproduction.env. Edge executable cố định và frontend-only smoke render PASS. Đây là gate, không chạy lại toàn bộ acceptance đãPASS.
- CanonicalPGDATA C:/DATN/test-instances/phase13-3b/data,version17,systemID7698826681383327460,state shutdown,ports trống; binary/operator/NTFS gate và historicalevidence hashesPASS.

### B. Existing DEV startup

Start một frontend15300 tại127.0.0.1:55173; TESTpg_ctl native18816exit0; backend10900 tại127.0.0.1:55001,PID/start khớp listener. DBsmart_agriculture_mvp_dev:55433,sa_mvp_dev_app READ ONLY identity/systemstart/11 migrationchecksum/statusPASS. Freshpg_roles rolsuper/createdb/createrole/replication/bypassrls đềufalse. Không TESTDBA runtime, khôngDDL/provisioning/migration/seed/reset.

Guarded same-process runtime: MQTTfalse/Commandsfalse/Automationfalse,testModetrue/max1;health DBconnected/MQTTdisabled,actualactuatorAPI DISABLED/controlfalse. Cap/testMode chứng minh qua entrypoint/envpin, APIkhôngexposecap. Baseline38SIMULATORreadings,DeviceCommand0/PENDING0,enabledAutomation0.

### C. No-data/responsive

**C-NODATA PASS:** ADMIN DeviceB,card được tìm theoarticle/TEMP_EMPTY; API latestReading=null,UI Chưa nhận dữ liệu/Chưa có dữ liệu đo; không thay null bằng0. **C-ZERO PASS:** DeviceA LIGHT_01 có0lux,APIvalue0,khôngmissing.

**C-RESPONSIVE PASS:** Device cards ở390/768/1440 không globaloverflow; menu mobile mở/đóng dùng được. **D-RESPONSIVE-HISTORY PASS:** table cuộn bên trong,chart/filter vàpage khôngtràn ở ba width. **C-RESPONSIVE-LOGIN-DASHBOARD PASS trong phạm vi shell/layout:** login vàdashboard có heading/statistics/controls đọc được,khôngoverflow; một dashboard mobile screenshot còn loadingcards, không coi là đã nghiệm thu mọi trạng thái dữ liệu mobile. Một số badge/icon ở mobile còn chật làP1 polish, không thay đổi trong phiên.

Ảnh chính:C-no-data.png,C-zero-light.png,C-device-390.png,D-history-390.png,C-login-390.png,C-dashboard-390.png. Không claim pixel-perfect hoặc hardwarepresence từ synthetic ONLINE.

### D. History/charts/CSV

| Case | Actual/result |
|---|---|
| D-HISTORY | PASS:12SOILreadings,min10,max47,average38.1666667;UI38,17%;API/DB/UIstatskhớp;chart1bucket30m đúng dữ liệu cùng khoảng |
| D-CUSTOM-RANGE | PASS:2020-01-01→02 localUTC+7,emptyrows;refreshgiữexactfrom/to,khôngnhảy giờhiện tại |
| D-RESPONSIVE-HISTORY | PASS:390/768/1440,nopageoverflow |
| D-CSV-SCOPE | PASS:browserdownloadCSV7299bytes,sourceSIMULATOR;OWNER/STAFFcross-farmhistory404 |
| D-PAGINATION-FILTERS | **APPLICATION_FAIL sau adjudication**: chuyểnSOILpage2→LIGHT khôngresetpage1;rawcheckpoint banđầu ghiHARNESS_ERRORdo timeout |

CSV SHA256 **29f319ac26d75767a3dc8db20b9b99b90785ff0bc21b8c6e0af481130bee91b0**. File nằmprivate,khôngGit. ẢnhD-history-chart-stats.png vàD-csv-report.png. TimeUTC+7 đối chiếu row13:18:28Z→20:18:28 ngày28/10 trongscreenshot/API; không gán thời gian hiện tại choreadingcũ. Chart1điểm làbucketaggregation,khôngphải mất11readings.

**Rootcause phântrang:** SOIL có12rows,pageSize10; sau sangpage2 rồi chọnLIGHT có8rows,request vẫnpage=2&limit=10. APItrả200,total8,totalPages1,items[];UIstats/chart0lux đúng nhưngtabletrống vàfooter Trang2/1. ScreenshotD-PAGINATION-FILTERS-failure.png chứng minh. Selectorcell0 khôngtồn tại vìtableđangtrangkhônghợplệ; không phải lỗi selector đơn thuần.

**Sửa sau cleanup:** SensorHistoryPage.tsx thêmsetPage(1) vào onChangefarm/zone/type; không đổiREST/schema/sensorcode/trust. Regression mvp-history-pagination.test.cjs hydrate **trangReact thực** với servicesfixtureoffline, kiểm traSOILpage2→LIGHTpage1 có8row0,đổizone/farmresetpage1,0networkrequests:1/1PASS. Frontendtsc --noEmit vàlint exit0. Đây làOFFLINE_COMPONENT_FIXTURE,chưa phải liveDEVpost-fixPASS. Rawcheck/evidencekhôngoverwrite; adjudication riêng trongpostrun-adjudication-fix-and-cleanup.json.

### E. Alerts

**E-ALERTS PASS:** tạo acceptanceSensor/rule riêng,prefix **MVP-GAP-1793267158185**. Ba readingsSIMULATOR10/25/35 tương ứng OPEN→ACKNOWLEDGED qua UI→hysteresisgiữACK→RESOLVED. SeverityWARNING/statusfilter/refresh vàownerBunauthorized404 được kiểmtra. CóảnhE-alert-open.png,E-alert-ack.png,E-alert-resolved.png.

SensorID **cmvtczjpt000dumesc8jjgqkv**; ruleID **cmvtczjqd000humestwsavl0u**; alertID **cmvtczjxl0002umm420km2wtr**. Không thay/xóa alertdemogốc. Readings38→41 duy nhất cho fixture này; không lặp pollingbatch đãPASS. Final2alertRESOLVED gồm1cũ+1mới,khôngcoi là2case vật lý.

### F. User management/logout

F-USER-CREATE-EDIT/F-USER-STATUS/F-VALIDATION/F-LOGIN-LOGOUT-401 đều **PASS**:

- ADMIN tạo mới useracceptance quaform,roleSTAFF; sửa tên vàroleFARM_OWNER quaform,DBkhớp.
- Vô hiệu hóa quaalertdialog;loginusernày bị403; kíchhoạtlạiquaUI,finalACTIVE. Không vô hiệu hóaADMIN/OWNER/STAFFdemo.
- Emailinvalid bịnativeformvalidity chặn,không phátPOST; không ghiuserinvalid.
- Useracceptance login/logout thật;storage tokenbịxóa,protectedroute→login. Dùnginvalidsynthetictoken trongcontexttest để gọi **Axiosclientthực**,nhận401,interceptorxóa sessionvàredirect;khôngmockresponse hoặc in token.

UserID **cmvtczllf000mumestsaew06e**. Final8users (7baseline+1mới). Existingdemo user id/status/role/name/email được so sánhDBbefore/after:khôngđổi. ADMINlist/OWNER-STAFFRBAC cóPASS trước đó,khôngchạy lại nhưsuitemới. ẢnhF-user-edited.png,F-user-reactivated.png,F-logout-401-cleared.png.

### G. Irrigation/SHADOW

**G-IRRIGATION PASS:** trangrender,selectfarm/zone/devicehoạtđộng,relayUNKNOWN đượcghi Chưa xác định,gatewayDISABLED/controlfalse. Nhánh không khả dụng ẩnON/OFF; nếu cóbuttoncontrolthìdisabled. KhôngclickON/OFF,khôngcommandrequest,DeviceCommandcountkhôngtăng. ẢnhG-irrigation-disabled.png.

**G-SHADOW-LABEL PASS:** trang ghi CHẾĐỘSHADOW/KHÔNGĐIỀUKHIỂNMÁYBƠM;DEVkhôngcóESP32-GF-A-01 nên selector rỗngvàChạymôphỏngdisabled. **SHADOW_PREVIEW_NOT_VERIFIED_DEV** đượcgiữ như ngoại lệ nonblocking đãđượcngườidùngchấpthuận trongphase;không tạoidentitygiả,nớiguard,ACTIVE hoặcMQTTgateway. ẢnhG-shadow-safe-no-target.png. Không gán computedpreviewPASS bằngUIlabel.

### H. Safety/cleanup

- Health/MQTT/flags đãđượcđo trongđúngprocess; before/aftercommands0/PENDING0,enabledAutomation0. Mọiingestcủatest làSIMULATOR/evaluateAutomationfalse.
-0productionconnections,0MQTT/hardwareactions,0commandrequests. Khôngprovision/migration/reset;credentialsDPAPIkhôngsửa/xuất.
-27screenshots,243browserAPIresponses,0JSpageerror/HTTP500/blockedexternalorcommandrequests. Console401/403 thuộcnegativescenarios đượcgiữ,khôngchelog.
- Frontend15300STOPIPCexit0 → backend10900STOPIPCexit0 → Prisma disconnect → otherclients0 → TESTsmartstopnative18008exit0.
- FinalsystemIDđúng,state shutdown,postmaster.pidabsent,noports55433/55001/55173. Khôngforcekill/retry/startlần2. Browserclosehoàn tất. Historicalprivateevidencehashkhôngđổi;87privateitemsACLowner/reparsecheck0bấtthường.
- Giữsensor/rule/alert/useracceptance và3readingschođốichiếu. Bìnhthườngingest/auditcóthểupdateDEVlastSeen/activity;khônghứa toànDBbấtbiến.

### I. Remaining gaps

**P0 duy nhất đang mở trong software scope này:** kiểmchứng live bảnresetpagination khiđổitype/farm/zone. Lỗi đãsửa/testoffline;khôngtựstartupthêm. MộtphiênkhởiđộngDEVđượcduyệttiếp hoặc nghiệmthu có giám sát cóthể tập trung đúngcase đó,không43API/6CRUD/polling/fullsuite.

Ngoại lệđãghi: computedSHADOWkhôngtargetDEV,OS-nativehidden/resumevàprofilingdàihạnchưa verified;khôngépPASSbằngsafetybypass. Mobilebadge/iconcầnpolishP1 nếu muốnảnhđẹp hơn. Khôngđòihỏimigrationproduction/R2.x đểđónglỗipagination.

Sausoftwareclosure,ESP32liveE2E vàautomaticphysicalscope vẫnphảinghiệmthurêng,chưathuộcphêduyệt này. Khôngthửlạibơm/creds/firmware.

### J. Final verdict, files và rollback

**MVP_DEV_UI_PARTIAL.** Rawresult22PASS/0FAIL/1HARNESS_ERROR/1optionalNOT_VERIFIED. Sauđọcscreenshot/API,casepaginationđượcphânloạitrungthực là **22PASS/1APPLICATION_FAIL/1optionalNOT_VERIFIED**;khôngchỉnhrawresultđểhợpthức hóa. Khôngcộng43API/6CRUD/13checkpoints/556historical vào tallymới. GateA2offlinetests vàregressionpostfix1testlàcácsuite riêng,không thànhE2Etestcount.

ChỉnângCOMPLETE_VERIFIED_DEVcho cácnhómmụcC/F/E/GđãPASS tronggiớihạnnêu,trongkhihistoryscopepaginationgiữPARTIAL. KhôngPROJECT_READY_FOR_DEFENSE,VERIFIED_LIVE hoặcACTIVE.

Filesadded:mvp-gap-session.cjs,mvp-gap-browser.cjs,mvp-gap-selectors.test.cjs,mvp-history-pagination.test.cjs. Helpermvp-ui-browser.cjs exposeexistingbrowserutilitiesđểkhôngrerunPASScases. Fileứngdụngsửaduy nhất:SensorHistoryPage.tsx,thêm3setPage(1). Harnessclassifier saucleanup cũngđượcchỉnh:locator timeoutkhôngtựđộnggắnHARNESS_ERROR,nóđượcgiữFAIL/needs-triagechođếnkhiđốichiếu. Khôngsource change vào backenddomain/schema/MQTT/firmware.

Rollbacksoftware:hoànnguyên3setPage(1)thêmtrongscopehandlersnếucầnreview (sẽtáihiệnlỗicũ);khôngđụngDB/evidence/credentials. Runtimeđãdừngsạch;khôngcònbước rollbackdịchvụ. Khôngchạy lạimarker/provisioningwrapper.

| Source hiện tại sau offlinefix | SHA256 |
|---|---|
| scripts/mvp-gap-session.cjs | 29ac2fe3da7252a4be619722edbcb07dcefc7f86a7ef9d2bce640d8485196785 |
| scripts/mvp-gap-browser.cjs | c28715019d034025e914d35e016d35d062a95c2c7fd371c93533eaf12645b0af |
| scripts/mvp-gap-selectors.test.cjs | ceccd857e4b0b1e695a0ef66fdcc41d39a3047e998352028db741408c52c7c37 |
| scripts/mvp-ui-browser.cjs | a386c6b10c2ac28177ec40e86cb60dc7b2259ee2a0650ebfd1b125e107c637ac |
| frontend/src/pages/sensors/SensorHistoryPage.tsx | 8b8dad45d23cffca265c00ec2f846265cfb6fb113ea34da6451dfdb2eb2a95aa |
| scripts/mvp-history-pagination.test.cjs | 95e22c2d6eaeb581fe7cdd4b7c031ae8f8408c1e1af0e3eeabe7b84529dd46be |

Executedhashởprepared.json;postfix/adjudicationởpostrun-adjudication-fix-and-cleanup.json/final-gap-closure.json. Cácphầndướilàlịchsử.

---


## FINAL LIVE UI ACCEPTANCE29/10/2026 — PART A–K

**Kết luận: MVP_DEV_UI_PARTIAL.** Đã đạt BROWSER_VERIFIED_DEV cho những checkpoint được liệt kê, chưa đóng toàn bộ software MVP. PROJECT_READY_FOR_DEFENSE và VERIFIED_LIVE vẫn chưa đạt. Mọi process do phiên tạo đã dừng; không tự startup/retry hoặc chuyển phase.

Phiên16:13:40–16:15:48 UTC+7 ngày29/10. Run private: **C:/DATN/test-instances/phase13-3b/mvp-ui-1793265194713-209fee**. Approval thật từ attachment4b208e76-933f-4fc2-be0a-22fc84fdaa21, SHA256 **2fc206df714afcc631d10c76939e488b21e5303ddaac28020bbdab163ef8a459**. Target duy nhất: TEST systemID7698826681383327460, PGDATA phase13-3b/data, DBsmart_agriculture_mvp_dev:55433, backend55001, frontend55173. Credential DPAPI CurrentUser cũ không sửa, không xuất; không kết nối production/recovery/MQTT/ESP32.

### PART A — CSS Preflight

Checkpoint A-CSS-REACT PASS trước mọi server startup. Chạy lại6 tests liên quan CSS/guard:6/6 PASS, không phải6 test mới cộng thêm regression. Negative test tái hiện Tailwind mất theme khi cwd ngoài repo; positive compile actual frontend/src/index.css có utility/theme, không còn ring-brand-500 error hoặc @apply chưa xử lý.

Native offline build dùng Vite configFile=false, envDir rỗng riêng, explicit PostCSS/theme/content, API55001 được pin. Build **React và CSS thực** từ private cwd PASS, artifacts tại offline-dist trong private run, không production.env, không database/server. Executed source hashes giữ trong prepared.json; không overwrite evidence phiên trước.

### PART B — Live React Render

Checkpoint B-REACT-LOGIN PASS khi chỉ frontend đang chạy, PostgreSQL/backend chưa start. Edge executablePath hiện hành; root/CSS/modules được tải, React mount và heading/form login thực hiển thị. Button có computed background **rgb(23,107,69)**, phù hợp brand600; không Vite error overlay/HTTP500/pageerror. Có screenshot B-login-render.png,0 API calls trước backend. Đây là nghiệm thu ứng dụng thật, khác about:blank hoặc mock test.

Frontend giữ nguyên process15796 trong toàn bộ phiên, không restart. Source launcher mvp-dev-frontend.mjs dùng PostCSS config tường minh đã sửa trong phiên trước. Lỗi CSS500 trước đó đã **LIVE_VERIFIED_FIXED** trong phạm vi launcher DEV này; không suy rộng thành test mọi deployment.

### PART C — Existing DEV Runtime

C-FRESH-PRESTART/C-EXISTING-DB/C-BACKEND PASS:

- Fresh pg_controldata: đúng canonical PGDATA/systemID, PG_VERSION17, shut down, không postmaster.pid,55433/55001 trống;55173 chỉ là frontend15796 do phiên sở hữu. Historical files của cả hai private run cũ được hash trước/sau, không đổi.
- TEST được start một lần bằng pg_ctl, nativePID4388 exit0 dù descendant pipe còn mở; không initdb/DDL/migration/seed/reset.
- App-role sa_mvp_dev_app READ ONLY xác nhận smart_agriculture_mvp_dev,127.0.0.1:55433,server start09:14:25.767Z; đối chiếu postmaster.pid/PGDATA.11 migration names/checksums/finished/rollback status đúng. Không dùng TEST DBA làm app runtime.
- Baseline37 readings/sourceSIMULATOR, commands0/PENDING0, enabled automation0; existing synthetic devices/users/farms được đọc, không dựng lại.
- Backend23488 bind127.0.0.1:55001, process started09:14:26.365Z; listener PID khớp. Health database connected/MQTT disabled. Guarded environment thực false/false/false cho MQTT/Commands/Automation, testMode=true,max1; same-process actuator API gatewayDISABLED/controlfalse. API không expose trực tiếp cap/testMode; bằng chứng cap là env pin và entrypoint guard, không tự tạo field API.

### PART D — Auth / Dashboard

Các nhóm thực thi **BROWSER_VERIFIED_DEV**:

| Checkpoint | Actual |
|---|---|
| D-AUTH-INVALID-INACTIVE | Form login thật trả401 cho credential sai,403 inactive; error hiển thị; không bypass |
| D-OWNER | OWNER login bằng form, dashboard render; remember mặc định tạo local storage entry; không xuất token |
| D-DASHBOARD-FOUR | Chọn farmA/zoneA; TEMP_01,HUM_01,LIGHT_01,SOIL_01 render; LIGHT0lux hợp lệ |
| D-ADMIN-STAFF-RBAC | ADMIN/STAFF login thật; ADMIN mởUsers; OWNER/STAFF /users→/forbidden; API403/cross-farm404 |

D-DEVICE-SELECTOR là NOT_REQUIRED trên Dashboard: source chỉ có farm/zone aggregate. Dòng note harness nói dự kiến kiểm tra device ở Irrigation không phải bằng chứng đã kiểm tra; gateH chưa chạy. SourceSIMULATOR được đối chiếu từ DB/API; tên thiết bị/cảm biến hiển thị MVP SIMULATOR. Không gọi đây là ESP32 live.

**D-NODATA-RESPONSIVE FAIL do harness:** getByText('MVP SIMULATOR NO DATA',exact=true) không khớp vì DeviceDetailPage đặt name là **MVP SIMULATOR NO DATA · TEMP_EMPTY**. Browser đã nhận200 và latestReading=null choTEMP_EMPTY;0 pageerror. Chưa đến assertion no-data text/mobile viewport. Không kết luận UI hỏng hoặc responsive PASS.

Sau cleanup đã thêm assertNoDataCard dựa article/TEMP_EMPTY. Offline test dùng actual SensorValueCard được render bằng ReactSSR rồi kiểm tra trong Edge offline: tái hiện exact-text miss cũ, selector mới tìm đúng khi đổi tên, phân biệt null với numeric0;0 network requests,1/1 PASS. Đây là **OFFLINE_COMPONENT_FIXTURE**, không thay live case đã FAIL. Không sửa frontend nghiệp vụ.

### PART E — Real Polling No F5

E-NO-F5 PASS là bằng chứng P0 mới quan trọng nhất:

| Thuộc tính | Actual |
|---|---|
| Sensor | mvp-sensor-temp/TEMP_01 trênMVP-SIM-A-01 |
| Row ID | cmvtbudk50000um3kousp1fiq |
| Source/value | SIMULATOR/42.625 |
| recordedAt |2026-10-29T09:14:34.607Z |
| receivedAt |2026-10-29T09:14:34.661Z |
| UI UTC+7 |16:14:34 |
| Cách tạo | telemetryIngestionService, đúng một reading, evaluateAutomation=false |
| Tổng rows |37→38, nguồnSIMULATOR duy nhất |
| Cách quan sát | REST polling thật, UI tự đổi,0 main-frame navigations |
| Khoảng quan sát |9865ms từ insert/quan sát; chỉ một mẫu, không benchmark/SLA |
| Screenshot | E-no-f5-new-reading.png |

DB unique sensorId/recordedAt được query correlation; response zones/mvp-zone-a/latest-readings chứa value/timestamp; UI hiển thị cùng value/time. Row được giữ trong DB, manifest ánh xạ acceptance prefix với rowID; không fake timestamp/DOM/API và không xóa để chạy lại.

E-SCOPE-RACE PASS: trì hoãn một request thật800ms, đổi scope về rỗng, sau1.5s không còn value cũ; phục hồi farm/zone lại hiển thị đúng. Không fulfill/mock response. Đây là cancel/scope-change dưới delay thực, chưa chứng minh mọi thứ tự hoàn thành response có thể xảy ra.

E-DEVICE-RETRY PASS: abort đúng một DEVGET để mô phỏng lỗi mạng, banner xuất hiện rồi tự mất ở lần polling phục hồi; không restart backend. E-UNMOUNT PASS: SPA rời Device detail, quan sát11s không GET cũ của device đó. No-overlap concurrency/heap profiling chưa đo thành case riêng, không suy từ các PASS này.

Native hidden/resume **NOT_VERIFIED**: browser headless chỉ có trạng thái đọc được, không có OS-native visibility transition; không dispatch sự kiện giả để lấy PASS. Loading/empty-state đầy đủ chưa nghiệm thu riêng.

### PART F — History / Charts / Alerts

**NOT_EXECUTED trong phiên này**, vì fail-stop ở D-NODATA-RESPONSIVE. Không thêm alert/sensor/rule/readings để dựng lifecycle. Không browser CSV/chart/statistics/customrange/pagination/hysteresis/filter screenshots. Historical API43/43, offline và browser mock giữ phạm vi cũ; không thay cho live UI.

### PART G — User Management

User list ADMIN render thật (D-admin-users.png), quyền truy cập OWNER/STAFF đã kiểm tra. Create/edit/role change/disable/reactivate/validation **NOT_EXECUTED**; không có user mới hoặc account demo gốc bị vô hiệu hóa trong phiên.6 nhóm CRUDAPI của phiên trước vẫn là bằng chứng riêng, không đổi thành browser mutation PASS. Logout/automatic401 session clearing chưa được chạy đến; current login/local-storage quan sát không thay các case đó.

### PART H — Irrigation / SHADOW UI

C-BACKEND đã xác minh gatewayDISABLED/controlfalse quaAPI thật; command0/PENDING0/automation0 trước/sau. **Irrigation page,UNKNOWN/OFFLINE buttons,device selector vàSHADOWUI chưa chạy đến.** Không test command endpoint hoặc nhấnON/OFF.

Computed SHADOW preview **NOT_VERIFIED**: source yêu cầuESP32-GF-A-01,DEV giữMVP-SIM identities. Không tạo identityESP32 giả, không nới guard, không ACTIVE hoặc gọi gateway. Theo phạm vi mới, không cần buộc preview PASS bằng cách giảm safety. Chỉ code/fixture history làSIMULATION_ONLY; không ghi SIMULATION_ONLY như một live case đã chạy trong phiên này.

### PART I — Safety & Cleanup

- Actual final DB commands0/PENDING0,enabledAutomation0;readings38SIMULATOR. Chỉ một reading được thêm qua service cho polling; registry/user/alert fixtures không tạo lại. Normal service có thể cập nhật receipt/presence/activitylog ở DEV; không hứa mọi row DB bất biến.
- Browser trace có76 API responses,9 screenshots,0 HTTP500,0 pageerror,0 blocked external/command attempts. Console errors401/403 vàERR_CONNECTION_FAILED thuộc negative scenarios có chủ đích, không che khỏi evidence.
- Không production5432/backend5000/recovery endpoints, realMQTT,ESP32/relay/pump actions; không claims trạng thái vật lý/adapter mới.
- Frontend15796 stopIPC exit0 trước backend23488 stopIPC exit0. Browser contexts/browser.close hoàn tất, owned Prisma clients disconnect; remaining other client backends0.
- pg_ctl smart-stop nativePID19688 exit0; pg_controldata finalsystemID đúng/state shut down,postmaster.pid absent, không listener55433/55001/55173. Không forcekill, retry hoặc reset/drop.
-59private items được kiểm tra owner/ACL/reparse,0 bất thường; chỉoperator access. Credentials cũ và historical hashes nguyên vẹn. Giữ DB/data/evidence; không overwrite các attempted markers.

### PART J — Remaining P0 và source changes

1. **Lỗi CSS đã đóng live.** P0 polling noF5 đã có bằng chứng thực; không cần làm lại như chưa đạt.
2. Lỗi selector no-data đã sửa/test offline nhưng live còn chưa xác minh. Phiên hiện tại đã dùng một lượt startup và dừng; cần startup-only mới được duyệt để tiếp tục các case còn lại, không provisioning/migration/reset.
3. Chưa xong history/chart/customrange/CSV/pagination,alerts,user mutations/logout,Irrigation/SHADOWUI; responsive cũng chưa chạy. Giữ tình trạng NOT_EXECUTED thay vì giảPASS/FAIL nghiệp vụ.
4. Chốt phạm vi automaticphysical với giảng viên và ESP32E2E riêng trướcPROJECT_READY_FOR_DEFENSE. Không cần thêmR2.x/initdb/six-ledgerproductionmigration để xử lý UIselectors.

Source added: mvp-ui-session.cjs (frontend-first executor),mvp-ui-offline.mjs (actual private-cwd build),mvp-ui-browser.cjs (live checkpoints/allowlist),mvp-ui-selectors.test.cjs (post-run offline regression). Không thay domain/UI/Prisma/firmware/MQTT contracts. Selector fix duy nhất sau cleanup chuyển exact-name sang article+sensorCode; không sửa code đang chạy rồi tự restart.

Rollback: không dùng các entrypoint mới và hoàn nguyên selector helper nếu cần review; không chạy wrapper provisioning cũ. Tất cả ownedprocess đã stop nên không có runtime rollback còn chờ. Không xóa reading hoặc evidence. Hash bản thực thi ở prepared.json; hash selector sau sửa ở postrun-offline-selector-and-cleanup.json. Không tái sử dụng execution.attempt.json.

| Current source sau sửa offline | SHA256 |
|---|---|
| scripts/mvp-ui-session.cjs | 1371769b8aa044cf673b6d5cc7c9abe562ac8f7ca1ccb97b68b0e5f0d3eb7e62 |
| scripts/mvp-ui-browser.cjs | 2696ec5eeea7f071a03e14b94e0e41d4cc056695f171ef56748c4ff8c9609500 |
| scripts/mvp-ui-offline.mjs | 0e54e796719d98f71ea23f8bafab771497c32ed3f9f88f3c75c7a5b8be6e0219 |
| scripts/mvp-ui-selectors.test.cjs | bcb2f8885c56fde4d0e40a6b83651ba606668b2448a7c29df1e918b441b7ff5c |
| scripts/mvp-dev-frontend.mjs | b0a4bcac1313b2425a0eaf5d0d644c20f4cde4e0150203991f83f937b99872ce |
| scripts/mvp-dev-css.mjs | 7c982262b0f2ecf0d354d7e1c840222765bcacf5e369eab795d09efc57e057d1 |

### PART K — Final Verdict

**MVP_DEV_UI_PARTIAL.**13 checkpoint PASS/1 harnessFAIL/1 NOT_VERIFIED/1 NOT_REQUIRED trong phiên. Trong13PASS có9 nhóm browser và4 gate offline/runtime; không gọi13 là13testUIđộc lập hoặc cộng với43API/6CRUD/6CSStests.6CSS-related tests chạy lại trước startup;1selector/component test chạy sau cleanup là offline riêng, không cộng thành tổngE2E mới. Không rerun556tests.

BROWSER_VERIFIED_DEV đã có cho render/auth/RBAC/dashboard/polling/recovery/unmount đúng phạm vi trên; toàn bộsoftware chưa COMPLETE_VERIFIED_DEV. GiữPROJECT_NOT_READY_FOR_DEFENSE,VERIFIED_LIVE_NOT_READY,AUTOMATION_ACTIVE=false,PHYSICAL_PUMP_NOT_TRIGGERED trong phạm vi thao tác Agent.

Evidence chính:prepared.json,check-001…014.json (notes nằm trong summary),summary.json,browser.redacted.json,api.redacted.json,offline-build/test nativeoutcomes,cluster-start/stop nativeoutcomes,postrun-offline-selector-and-cleanup.json và9PNG private. Không chia sẻ credentials hoặc bundle/dump hàng loạt. Dừng tại đây, không tự thêm phiên live.

---


## Phiên FINAL DEV UI & CRUD29/10/2026 — PART A–J

**Verdict: MVP_DEV_UI_AND_CRUD_PARTIAL.** Không đạt COMPLETE_VERIFIED_DEV toàn bộ, không nâng PROJECT_READY_FOR_DEFENSE. Phiên duy nhất đã kết thúc; TEST và DEV đều dừng graceful. Không có lệnh phần cứng.

Private run: C:/DATN/test-instances/phase13-3b/mvp-final-1793264019106-785db4. Không cần mở hoặc chia sẻ credentials.dpapi. Approval nguồn là attachment1c797c12-ed53-41b5-af27-f9bab394e82b, SHA256 **7f4412b86a62042a80b3ce2acc87e47d2c3e1f247c8e0e76b6a8b9b14679ebcb**. Thời gian chạy29/10:15:54:00–15:55:24 UTC+7. Build/harness sửa offline sau cửa sổ này không được tính như đã chạy live.

### PART A — Existing DEV preflight

- Edge executablePath đã sửa tồn tại, VersionInfo xác nhận Microsoft Edge; offline about:blank mở/đóng PASS,0 network requests. Không phụ thuộc PROGRAMFILES để tìm executable.
- Canonical PGDATA C:/DATN/test-instances/phase13-3b/data, PG_VERSION17, pg_controldata exact systemID7698826681383327460 và shut down; ports55433/55001/55173 trống trước start; binary pins/NTFS/operator gate PASS.
- App credential giải mã DPAPI CurrentUser trong anonymous pipe tới parent; không in credential/URL/password/hash. Không dùng TEST DBA cho backend hoặc browser.
- READ ONLY SQL bằng sa_mvp_dev_app xác nhận database smart_agriculture_mvp_dev, port55433, server127.0.0.1; pg_postmaster_start_time đối chiếu postmaster.pid/canonical PGDATA.11 migration checksum/status khớp; không chạy migration.
- Trước phiên:37 readings, tất cảSIMULATOR;0 DeviceCommand/PENDING,0 enabled automation; fixtures cũ tồn tại. Các file evidence cũ được hash trước/sau, không đổi. Không query production.

### PART B — Backend/frontend startup

- Start TEST một lần: pg_ctl native PID23192 exit0; native exit được nhận dù descendant giữ pipe. Postmaster3760.
- Backend serving PID13816 bind127.0.0.1:55001, health database connected/MQTT disabled. Guarded entrypoint kiểm tra env false/false/false cho MQTT/Commands/Automation, testMode=true/cap1. Cùng PID listener được đối chiếu.
- Protected actuator API thực trả gatewayMode=DISABLED,controlEnabled=false,currentState=UNKNOWN. API này không expose cap; cap1/testMode được chứng minh bởi env đã pin và entrypoint guard của process, không giả rằng API đã trả các field đó.
- Frontend PID17636 bind127.0.0.1:55173/API55001, configFile=false/empty envDir; không production.env fallback. Ready HTTP root thành công nhưng chưa chứng minh CSS/app render.

### PART C — Edge live browser

| Test | Actual | Kết luận |
|---|---|---|
| UI-A01 invalid/inactive login bằng form | Navigation load timeout; CSS500 | FAIL; chưa thực hiện form/API assertions |
| UI-A02 OWNER login/dashboard | Không tìm được Email vì app không render | FAIL; chưa thực hiện login |
| Browser launch/allowlist | Edge mở, request chỉ tới DEV origins;0 blocked external/command | Chỉ lifecycle/network guard PASS, không app E2E |
| App render/screenshot/API |0 application API responses,0 screenshots | NOT_VERIFIED |

Raw evidence giữ trong browser-evidence.redacted.json và check-007/008.json. Có2 console resource500 và2 aborted requests /src/index.css; không có pageerror JavaScript không đồng nghĩa app chạy thành công.

**Root cause:** frontend.stderr.log ghi PostCSS ring-brand-500 does not exist và Tailwind content missing. launcher đặt frontend root nhưng process.cwd vẫn là private run; Tailwind3 implicit config lookup không lấy theme tại frontend/tailwind.config.js.

**Sửa offline sau cleanup:** scripts/mvp-dev-css.mjs import theme có sẵn và chuyển content globs sang absolute; mvp-dev-frontend.mjs truyền plugins PostCSS tường minh. Không sửa CSS/theme ứng dụng, business logic, env/production launcher hoặc config. Test offline chạy từ thư mục tạm ngoài repo: cách cũ tái hiện đúng lỗi; cách mới compile actual src/index.css có surface-card/ring/theme utilities, không còn @apply chưa xử lý.6/6 tests liên quan PASS, Node syntax/PS AST PASS. Không startup frontend/backend/TEST lần nữa để thử. Một số selector harness tương lai được căn lại role alertdialog/menuitem theo source; chưa nghiệm thu live.

### PART D — Dashboard and polling

NOT_VERIFIED trong phiên này: sensor cards,selectors,zero/null,loading/empty,UTC+7,polling noF5,scope-switch/race/retry/unmount/native visibility. Browser không đi được tới dashboard; không có reading mới được chèn. SensorReading trước/sau vẫn37SIMULATOR. Prepared cases và historical mock/unit tests không được tính như đã chạy.

### PART E — History/charts/alerts UI

NOT_VERIFIED trong phiên này: history/chart/statistics/customrange/pagination/CSV download,OPEN/ACK/RESOLVED và filter trênUI. Không tạo alert/readings bổ sung vì browser dừng trước bước này.43 API/DB PASS của28/10 vẫn là bằng chứng lịch sử riêng, không thay UI mới.

### PART F — CRUD DELETE and user management

**6 nhóm acceptance thực thi PASS; không phải6 browser tests hoặc6 HTTP requests.** Tổng API requests phiên này26:200×14,201×7,403×1,404×3,409×1. Login lấy JWT và GET safety nằm trong tổng26, không cộng thành check mới. Sáu nhóm:

| ID | Thao tác và actual result |
|---|---|
| CRUD-01 | Tạo farm/zone/crop/device/sensor mới qua API, prefix MVP-DEL-ACCEPTANCE-1793264092882;201 |
| CRUD-02 | OWNER khácfarm sửa bị404;STAFF manage bị403; tênfarm không bị ghi đè |
| CRUD-03 | Sensor tham chiếu device không tồn tại bị404; duplicate deviceCode409; không tạo orphan |
| CRUD-04 | ADMIN tạoSTAFF mới201, sửa tên/phone quaPATCH200 và DB correlation; không sửa userdemo gốc |
| CRUD-05 | Assignstaff mới, bật/tắt canControlIrrigation trên assignment riêng; cross-farmDELETE404, DELETE đúngfarm200; DB assignmentcount0 |
| CRUD-06 | Sensor/device/zone/farm INACTIVE, crop CANCELLED đúng API; rows được giữ, original fixtures vẫn tồn tại |

CRUD-04 không nghiệm thu chuyển role sang một role khác hay account INACTIVE/ACTIVE: payload update vẫnSTAFF, status mutations nằm ở browser steps chưa chạy. Không gọi label check rộng hơn này là coverage status đầy đủ. User được tạo vẫnACTIVE; assignment đã xóa đúng contract.

HardDELETE Farm/Zone/Crop/Device/Sensor/User không có trong route contract hiện tại; không viết endpoint mới hoặc thửDELETE bất hợp đồng. Đánh giá NOT_REQUIRED đối với hardDELETE tổng quát; status disable thực tế đã kiểm tra. Chỉ staff assignment cóDELETE và đã PASS. Không cascade xóa fixture gốc.

Bản ghi acceptance được giữ nguyên, gồm farm/zone/crop/device/sensor/user mới. IDs nằm trong private check-001/summary/APIredacted, không chạy cleanup bằngDROP/DELETE tay. User UI create/edit/deactivate/reactivate, unauthorized UI vàlogout chưa nghiệm thu.

### PART G — Safety verification

- App DB only55433/mvp_dev, no provisioning/migration/seed/reset; không production5432/backend5000 request hoặc MQTT connect.
- API thực gatewayDISABLED/controlfalse. Commands/Automation=false,testMode=true/cap1 của guarded serving process; command total0→0,PENDING0→0,enabledAutomation0→0.
- Không commandendpoint request từ Agent/browser; browser allowlist không có blocked attempts, không nhấnON/OFF. Không hardware event do Agent, không thao tácadapter/firmware/ESP32. Không tuyên bố đã đo adapter/GPIO vật lý trong phiên software.
- Production listener metadata trước/sau giống nhau; đây không phải health hoặc SQL production verification.
- Private run28items được recheckowner/ACL/reparse:0 bất thường, chỉoperator access. Credential không ghiplaintext vào report/log/Git. Raw DPAPI file cũ không thay đổi.

### PART H — Process cleanup

Frontend17636 và backend13816 nhậnSTOPIPC, exit0/nosignal; Prisma clients được disconnect; pg_stat_activity other client backends0. pg_ctl stop smart nativePID15268 exit0. Hậu kiểm pg_controldata systemID đúng/state shut down,postmaster.pid không tồn tại, không listener55433/55001/55173. Browser contexts/browser đã đóng. Không forcekill/retry/restart/drop/reset; giữ dữ liệu và evidence.

### PART I — Remaining P0

1. Nghiệm thu browser actual app sau bản sửa Tailwind bằng phiên startup-only mới **được phê duyệt riêng**, cùng database có sẵn; không provisioning lại hoặc tái dùng execution marker cũ.
2. Trước startup tương lai, thêm offline transform/application-bundle preflight để không nhầm HTTP200 root với CSS/React readiness. Bản sửa PostCSS đã có6testspass nhưng chưa có live app PASS.
3. Còn nguyên Dashboard/polling/history/chart/alerts/role/UIuser/status/logout acceptance. Native hidden và race không được suy từ unit.
4. SHADOW fixedphysicalidentity không phù hợp MVP-SIM fixtures; cần fixture-preview được gắn nhãn rõ, không thêm ESP32-GF-A-01 giả hoặc nâng trust.
5. Auto physical/IoT production và scope bảo vệ vẫn cần chốt riêng. Không cần R2.5/initdb/migrationproduction để xử lý lỗi CSSDEV.

### PART J — Verdict, source diff và rollback

**MVP_DEV_UI_AND_CRUD_PARTIAL**. API/CRUD bổ sung đạt trong DEV; UI application chưa render. Không nâng COMPLETE_VERIFIED_DEV tổng thể,PROJECT_READY_FOR_DEFENSE,VERIFIED_LIVE hoặcACTIVE.

Source changes: thêm startup-only executor, browser harness/allowlist, narrowCurrentUserDPAPI reader và relatedtests; sửa riêng DEVfrontendlauncher + pureCSSconfighelper sau lỗi runtime. Không thay backend/frontend business code, mainPrisma, MQTT/firmware hoặc productionstartup.

Rollback code: bỏ import/css option mới trong mvp-dev-frontend.mjs và không dùng các helper mới; thao tác này sẽ trả lại lỗi CSS khi chạy từ privatecwd, không được coi là cách chạy demo. Runtime không còn cần rollback vì tất cả ownedprocess đã stop; không xóa dữ liệu acceptance/evidence. Source hashes của phiên đã chạy giữ ở prepared.json; hashes bản sửa chưa chạy live ở postrun-offline-fix-verification.json, không ghi đè marker/evidence.

| Current source | SHA256 sau sửa offline (không phải hash executable đã chạy ở phiên) |
|---|---|
| scripts/mvp-dev-final.cjs | b436844e0bf28189352a93ca77db4cd7db7cfab44f6a63af6800d8b98a65a828 |
| scripts/mvp-dev-final-browser.cjs | 5b47f28786b840e00d179b62cf41b582a1831702df45f079fc882fb03137bf80 |
| scripts/mvp-dev-existing-unprotect.ps1 | 36941a0e279c5a84a25e75a7c54c96a5b4816174310626e85acdaac58eb44666 |
| scripts/mvp-dev-final.test.cjs | 2d3bec8f9a462a992a781172733fa546546c4a8583c309640f611d6ffdecd17a |
| scripts/mvp-dev-frontend.mjs | b0a4bcac1313b2425a0eaf5d0d644c20f4cde4e0150203991f83f937b99872ce |
| scripts/mvp-dev-css.mjs | 7c982262b0f2ecf0d354d7e1c840222765bcacf5e369eab795d09efc57e057d1 |
| scripts/mvp-dev-css.test.cjs | 6553e56f76a5c92e5203dd73f0b39213bf5e9dad1b23a7a7733b6d84d8f8345f |

Không rerun556testskhi domain/runtime code không đổi;6/6 relatedtests là suite riêng, không cộng vào556 hoặc43 lịch sử. Không tự startup tiếp hoặc chuyểnphase.

---


## MVP DEV provisioning & live software acceptance — 28/10/2026

**MVP_DEV_SOFTWARE_PARTIAL.** Đây là kết quả hiện hành của phiên mới, sau TEST credential recovery PASS. Database/roles,11 migrations, fixtures và43 kiểm tra API/DB thực tế PASS. Browser application acceptance chưa được thực hiện do Edge launch lỗi môi trường; đã sửa source và kiểm tra Edge offline, nhưng không tự mở thêm lượt TEST startup sau cleanup.

### A. Safety preflight — PASS

- Approval: attachment0bc1639b-5f81-4355-aec7-17d21a4a7316/Pasted text.txt; SHA256 và source hashes pin trong prepared.json.
- Exact PGDATA C:/DATN/test-instances/phase13-3b/data; PostgreSQL17.2; systemID7698826681383327460. Đối chiếu canonical path, owner/operator SID, protected root ACL operator-only, reparse, clean shutdown và cổng55433/55001/55173 trống. Không truy cậpSQL5432 hoặc recovery55434/test55435.
- Evidence recovery trước giữ nguyên hash. Một prepared run1793193238289-8db496 chưa execute được giữ lại; chỉ run hiện hành đã execute.
- Sửa lifecycle dùng child_process spawn và event native exit, không chờ EOF. Fixture native C# tạo descendant giữ stdout: native parent exit0 được ghi nhận khi pipeClosed=false.15/15 lifecycle/guard tests PASS; hai fixture ban đầu không đạt được giữ trong diễn giải test, fixture cmd sai quoting đã đóng các dialog của đúng owned PID, không force-kill hoặc tác động production. Không TEST startup trong lúc lifecycle chưa đạt.

### B. TEST authentication — PASS

Một native psql-W login bằng mật khẩu TEST mới do operator nhập trực tiếp, exit0. Role phase13_test_admin đúng TEST55433/database postgres, systemID/PGDATA/version170002 khớp; SUPERUSER/CREATEDB/CREATEROLE được xác minh trong READ ONLY. Không reset password, không đọc credentials.json/admin.pass/.env cũ. Database postgres ở đây là maintenance database TEST.

### C. Database/roles — PASS

Read-only catalog trước provisioning xác nhận tên DEV chưa tồn tại. Đã tạo đúng smart_agriculture_mvp_dev và hai roles sa_mvp_dev_migrator,sa_mvp_dev_app. Owner là migrator; thu hồi PUBLIC access chỉ trên database mới và cấp CONNECT cho app. App LOGIN=true; SUPERUSER/CREATEDB/CREATEROLE/BYPASSRLS/REPLICATION/schemaCREATE/database ownership đều false. App không có INSERT/UPDATE/DELETE trên _prisma_migrations.

Mật khẩu DEV sinh mới mạnh; role password là SCRAM. DEV credentials và demo-login/JWT material lưu CurrentUser DPAPI tại credentials.dpapi trong private run,470bytes, owner và ACL chỉ operator, không reparse. Không lưu TEST DBA password, không đưa secret vào argv/source/SQL file/log/report. Không dùng staging credential-rotation chưa duyệt lưu secrets. Không đổi mật khẩu Wi-Fi/MQTT/TEST DBA.

### D. Prisma migration — PASS

Prisma migrate deploy native exit0, bằng migrator, chỉ DEV55433/public. Đã đối chiếu đủ11 baseline migration names/checksums/finished_at, không rolled back.15 tables gồm _prisma_migrations,15 primary keys,23 FK đã validate,75 indexes. Không sáu ledger proposals, không sửa main Prisma schema, không db push/reset/initdb, không migration production.

### E. Fixtures — PASS, SYNTHETIC ONLY

Sáu users ADMIN/OWNER-A/OWNER-B/STAFF/STAFF2/inactive, hai farm độc lập ban đầu, zones/crop, devices MVP-SIM-A/B-01, sensors TEMP/HUM/LIGHT/SOIL và TEMP_EMPTY no-data, LIGHT value0. Seed33 SIMULATOR readings; sau alert tests37 readings, tất cả source SIMULATOR. Một alert rule, một automation rule DISABLED, một simulator actuator UNKNOWN, audit/activity samples. CRUD tests để lại farm thử nghiệm thứ ba; không xóa/reset database. Không dùng identity thật ESP32 hoặc copy production rows.

### F. Backend runtime — PASS

PID11572; bind127.0.0.1:55001. Health database connected/MQTT disabled. Serving-process safety attestation khớp PID: commandsEnabled=false,automationEnabled=false,testMode=true,effectiveMaxRunSeconds=1. Nguồn env thực là MQTT_ENABLED=false, MQTT_COMMANDS_ENABLED=false, MQTT_AUTOMATION_COMMANDS_ENABLED=false, MQTT_PUMP_TEST_MODE=true, MQTT_PUMP_MAX_RUN_SECONDS=1. Env source đọc các tên này trực tiếp; test-mode policy cap1s. Child wrapper chặn repository .env và chặn mqtt.connect; app dùng riêng DEV datasource/role. Runtime source không nối SHADOW persistence hoặc production gateway.

### G. Frontend runtime — STARTUP PASS; UI NOT VERIFIED

Vite PID17400; HTTP127.0.0.1:55173 ready. EnvDir rỗng và configFile=false; VITE_API_BASE_URL hard-bound http://127.0.0.1:55001/api, không backend5000 fallback. Chưa có browser requests vào ứng dụng trong phiên này, nên không suy config/startup PASS thành frontend integration PASS.

### H. API/browser acceptance — PARTIAL

**43 API/DB checks PASS,0 API check FAIL.** Đã kiểm chứng ADMIN/OWNER/STAFF login,401/403, inactive/invalid users, logout; farm/zone/crop/device/sensor create/read/update, staff assignment và removal, cross-farm isolation, validation, pagination/filter; latest4 types, zero khác null/no-data; history range/empty/invalid-range, chart points, statistics, CSV và scope; alerts OPEN→ACKNOWLEDGED→RESOLVED, hysteresis, duplicate idempotency, out-of-order protection; activity logs và gateway DISABLED/controlEnabled=false. DeviceCommand total0/PENDING0 và enabled automation rows0.

Captured real statistics API trước alert mutation: count8,min40,max47,average43.5, đúng fixtures. Có assertion hậu kiểm riêng trên response đã capture; không tính thành request mới hoặc tăng43 checks. DELETE CRUD của5 entity và đầy đủ user-management mutations chưa chạy; staff assignment DELETE đã chạy.

**1 browser lifecycle FAIL:** channel msedge lookup dùng đường dẫn undefined/Program Files vì môi trường tối giản không có PROGRAMFILES. Edge có sẵn tại C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe, version156.0.4314.42. Không cài/download browser. Sửa acceptance helper dùng executablePath đã xác minh. Offline Edge launch about:blank exit0,0 network requests, close bình thường: EDGE_OFFLINE_LAUNCH_PASS. Đây không phải live DEV UI hoặc mock acceptance. Polling/no-F5, UTC+7 render, charts UI, browser RBAC, disabled irrigation UI và SHADOW UI vẫn NOT VERIFIED. Browser tích hợp không khả dụng; đã thử bootstrap trước khi dùng fallback Edge theo yêu cầu.

### I. Process cleanup — PASS

Một TEST start native exit0 lúc20:16:38 giờ Việt Nam; nativeExitObserved=true trong khi pipeClosed=false, chứng minh sửa orchestration hoạt động với server thật. DB auth/provision/migrate/acceptance không retry. Frontend17400 và backend11572 nhận STOP, exit0, không signal. Đã disconnect cả Prisma client kiểm thử và Prisma singleton của ingestion trước khi đếm client khác; active other clients0. Psql23832 exit0. TEST smart-stop exit0 lúc20:18:36; final control20:18:37: shut down, không postmaster.pid/listener55433/55001/55173, không unresolved owned process. Giữ DEV database/roles/data/DPAPI/evidence. Production5432 vẫn PID7848; Mosquitto9052/4572 không thay đổi; không restart hoặc connect các service production.

### J. Remaining P0 — phạm vi tiếp theo ngắn

1. Nghiệm thu Edge trên database DEV đã tồn tại: login/role flows, dashboard, polling không F5, UTC+7, history/chart/CSV/alerts UI, gateway disabled và SHADOW preview. Không provisioning/seed/migration lại.
2. Bổ sung DELETE CRUD và user-management cases còn thiếu theo API contract; không coi create/update PASS là toàn bộ CRUD PASS.
3. Chốt phạm vi automatic cho bảo vệ: SHADOW/simulation hay cần hardware. Phiên này không bật VERIFIED_LIVE/ACTIVE. Không cần hoàn tất toàn bộ production hardening Phase13.5 để demo software DEV.

Phiên đã dùng đúng một TEST startup và hoàn tất cleanup. Không tự start lại TEST/backend/frontend để retry browser. Việc tiếp theo cần phạm vi startup-only/acceptance-only được duyệt cho **existing DEV**, dùng credentials mới CurrentUser DPAPI; không cần reset TEST DBA hoặc tạo database khác. Tuyệt đối không chạy lại provisioning entrypoint để xử lý browser.

### K. Verdict, evidence, source và rollback

**MVP_DEV_SOFTWARE_PARTIAL**, không COMPLETE_VERIFIED_DEV toàn bộ, không PROJECT_READY_FOR_DEFENSE. 43 API PASS/11 migrations PASS không thay browser/hardware evidence.

Private run: C:/DATN/test-instances/phase13-3b/mvp-direct-1793193356053-b27caf. Evidence: prepared.json; offline-lifecycle-verification.json; direct-auth-result.json; sql-*.stdout.log; prisma-migrate-deploy stdout/stderr; backend/frontend stdout/stderr; api-responses.redacted.json; db-evidence.redacted.json; browser-evidence.json; edge-offline-fix-smoke.json; native-outcome.json; summary.json; final-dev-acceptance-verification.json. Native runner exit1 ở đây phản ánh verdict PARTIAL do browser launch, không phải migration/authentication failure. Không overwrite evidence cũ. Final aggregate giữ executed source hashes và hash browser fix hiện hành tách riêng.

Files thay đổi/thêm trong scope: scripts/mvp-native-exit.cjs, mvp-native-exit.test.cjs, mvp-native-exit-fixture.cs, mvp-dev-direct.cjs, mvp-dev-direct-launch.ps1, mvp-dev-acceptance.cjs; sáu tài liệu nghiệm thu. mvp-dev-backend.cjs, mvp-dev-frontend.mjs, mvp-dev-direct-protect.ps1 và native psql transport được review/reuse. Không sửa firmware hoặc production code/config.15/15 tests liên quan PASS; Node syntax và PS AST PASS; backend/frontend typecheck PASS. Không chạy lại toàn bộ556 regression khi domain code không đổi. Browser fix chỉ được smoke offline sau cleanup, chưa chạy trên live app.

Rollback an toàn là giữ services dừng và evidence/data nguyên vẹn, review/revert riêng source harness nếu cần; không DROP/reset/revoke roles/restore DB để giả trạng thái ban đầu, không tự áp dụng password rollback. Marker execution đã tồn tại; không chạy lại entrypoint cũ. Native ambiguous outcome luôn STOP/no retry/no force-kill.

PRODUCTION_DB5432_NOT_MODIFIED; PRODUCTION_BACKEND5000_NOT_STARTED; REAL_MQTT_COMMANDS_NOT_SENT; AUTOMATION_NOT_ENABLED; PHYSICAL_PUMP_NOT_TRIGGERED; REAL_ESP32_E2E_NOT_VERIFIED.

### Checkpoint và báo cáo lịch sử phía dưới



## Kết quả hiện hành — TEST credential recovery PASS, 28/10/2026

**MVP_TEST_CREDENTIAL_RECOVERY_PASS — TEST_DBA_ACCESS_RECOVERED.** Kết quả mới nhất thay thế các checkpoint BLOCKED/input-pending bên dưới; không sửa bằng chứng failure lịch sử và không nâng DEV acceptance thành PASS.

| Bước thực tế | Giờ Việt Nam UTC+7 ngày28/10 | Kết quả |
|---|---|---|
| Reset một lần, single-user PostgreSQL17.2 |19:46:37 | postgres PID6004 exit0; MVP_RESET_COMMITTED đúng role/systemID; các quyền giữ nguyên |
| Start TEST một lần |19:46:39 | pg_ctl PID14048 exit0; postmaster7316 chỉ listen127.0.0.1:55433 |
| Native authentication một lần |19:51:56 | psql PID16512 exit0; operator nhập trực tiếp password TEST mới |
| SQL identity/role |19:51:56 | phase13_test_admin, database postgres trên TEST, version170002, đúng PGDATA/systemID, READ ONLY; LOGIN/SUPERUSER/CREATEDB/CREATEROLE đều true |
| Smart-stop một lần |19:52:52 | pg_ctl PID25012 exit0; không force-kill/retry |
| Final control/process/ACL |Sau smart-stop | shut down; không postmaster.pid/listener55433; node12740/cmd14952/postmaster7316/psql16512 kết thúc; owner/operator-only evidence ACL PASS |

**Exact target:** C:/DATN/test-instances/phase13-3b/data; systemID trước/sau7698826681383327460, khác production7472695863566132416. Database postgres ở đây là maintenance database của TEST55433. Role đã tồn tại; chỉ thay password, không CREATE/GRANT/ALTER quyền.

**Original credential:** operator xác nhận không còn sử dụng được. Agent không đọc credentials.json/admin.pass/.env. Password mới do operator nhập và giữ cục bộ; không ghi password/verifier vào chat, argv, environment, SQL file hoặc log/report. Các file credential cũ không cập nhật hoặc dùng fallback; phiên DEV tiếp theo phải dùng password mới qua handoff bảo mật.

**Backup và evidence:** private run C:/DATN/test-instances/phase13-3b/test-auth-recovery-1793189718289-2f71e8. Full offline TEST backup6764files/188362787bytes, SHA256 từng file PASS; manifest SHA2569A75E0B72FE9FE3F203985E9043D7B2F680F0AB6A02E0823E69A480A0EC8E0B0. Không restore/xóa backup hoặc evidence. Hash các evidence failure trước vẫn khớp. Final aggregate create-new **password-recovery-final-verified.json** pin hashes của reset/start/native auth/SQL result/smart-stop và final control.

**Orchestration:** thiếu PATH đã được tái hiện và sửa offline. Lượt thật sau đó reset thành công, nhưng spawnSync chờ EOF vì detached Windows server giữ pipe sau khi pg_ctl kết thúc; runner gốc chưa chạy auth. Đã thực hiện đúng bước auth còn chưa sử dụng qua verification-only wrapper trên cùng server đang chạy, không reset/start lại. Sau psql exit0, smart-stop đúng postmaster7316 làm pipe đóng. Runner gốc tiếp tục, gặp postmaster.pid đã xóa nên raw password-recovery-summary.json ghi ENOENT/BLOCKED/authenticationAttempts0. Giữ nguyên file đó; đây không phải authentication failure. Aggregate mới đối chiếu native evidence chứng minh tổng thực tế reset1/start1/auth1/stop1. Không chạy lại reset entrypoint: marker one-shot đã tồn tại. Runner reset tổng hợp chưa được nghiệm thu làm công cụ recovery tái sử dụng.

**Source/tests:** mvp-test-role-inspection.cjs; mvp-test-password-reset.cjs/.ps1/.test.cjs; mvp-test-password-transport.test.ps1; mvp-test-recovery-verify.sql/.ps1 trong scripts.18/18 Node tests PASS; missing-PATH synthetic exit1, fixed-path synthetic read-only pipeline exit0; PS AST PASS. SQL verification đã chạy thực tế qua native psql. Không chạy lại556 domain tests hoặc suy offline PASS thành DEV/hardware PASS. Verification SQL SHA256FFB83F9CDA0EE35037C53F02FBE53C157A5EA70772406D16C0F02995D26CC027; wrapper4033397C592CD759AC6E7405A59273A4932C399096AFA2D8CD39E0F58016E164. Executed candidate hashes nằm trong raw summary/final aggregate.

**Production isolation:** không kết nốiSQL5432, không restart/change production. Listener5432 vẫn PID7848. Không start backend5000/frontend5173/55001/55173; không dùng credentials production; không MQTT/hardware. Runtime Commands/Automation/PENDING production không được truy vấn mới trong scope này, nên không tuyên bố fresh verification chỉ từ config.

**Rollback/điểm dừng:** không tự rollback password/restore PGDATA hoặc khôi phục credential cũ. Giữ backup cho recovery được duyệt riêng nếu cần. Không sửa raw outcomes để tạo PASS. Credential TEST đã được tháo gỡ, nhưng DEV database/roles/migrations/fixtures/backend/frontend/API/browser acceptance chưa thực hiện. Dừng ở đây, chờ phiên DEV provisioning/acceptance được duyệt tiếp theo.

DEV_PROVISIONING_NOT_PERFORMED; DEV_MIGRATION_NOT_PERFORMED; DEV_BACKEND_NOT_STARTED; DEV_FRONTEND_NOT_STARTED; PRODUCTION_DB5432_NOT_MODIFIED; REAL_MQTT_COMMANDS_NOT_SENT; PHYSICAL_PUMP_NOT_TRIGGERED.

### Checkpoint và bằng chứng lịch sử

## Runner exit1 root cause fixed and reproduced offline ? 28/10/2026

The operator screenshot shows "Session ended. Native runner exit1", not password reset success. The previous wrapper printed its "After reset" instruction before native confirmation; this misleading line is removed. The Node preparation failure is now staged rather than hidden by a generic catch.

**Root cause reproduced:** clearing ProcessStartInfo.EnvironmentVariables removed PATH. In the exact .NET-to-Node transport, READ_ONLY_PREFLIGHT could not start its powershell.exe child (native statusnull, expected0). A synthetic run without PATH reproduced exit1; the same synthetic run with only C:/Windows/System32 and C:/Windows/System32/WindowsPowerShell/v1.0 in PATH completed all read-only gates and6764-file backup verification with exit0. No ALTER, SQL authentication, server startup or real password input occurred in these transport tests.

Fix scope: mvp-test-password-reset.ps1 retains this narrow system PATH, uses unique create-new console-session log/outcome filenames, and reports failure-stage output without claiming reset success early. mvp-test-password-reset.cjs adds staged safe errors, the same narrow native PATH, and an offline-input-check branch that returns before attempt marker/native execution. New transport test script uses public synthetic data only. Rollback is source-only and requires no database restore; a native reset with unknown outcome must never be retried or automatically rolled back.

Verification: **18/18 Node tests PASS**, two PowerShell AST checks PASS, missing-PATH failure reproduced exit1, fixed-PATH read-only pipeline PASS exit0. Executor SHA2565796AC783C03B964448211FC05C5B07D8389D131EF5C4E13C9EF75E3CD8B2B68; wrapper SHA256FCC2D8D8CC1EFEE5F50442518C017DD5DAEED33A2DDDA02D8EAFE2ACCEC98804. New private wrapper-fix-offline-evidence file preserves hashes/results; old logs/markers not overwritten.

Current native reset count0, authentication count0. A corrected attached console has been opened for local operator input under the existing one-reset approval. **MVP_TEST_CREDENTIAL_RECOVERY_BLOCKED ? awaiting real execution/authentication evidence.** Do not mark DEV acceptance PASS. Production untouched; DEV provisioning/migrations/backend/frontend startup remain not performed.


## Latest outcome after operator reported success ? 28/10/2026

**MVP_TEST_CREDENTIAL_RECOVERY_BLOCKED.** The operator reported successful entry, but reset-runner.stderr.log contains TEST_RECOVERY_STOPPED_NO_AUTOMATIC_RETRY and stdout is empty. Reset attempt/result/authentication/final-summary evidence is absent; no Node runner remains. This is a runner stop before the guarded reset marker, not verified password recovery or a demonstrated PostgreSQL password rejection. Read-only revalidation of the role proof and all6764 backup files PASS. Exact pre-execution exception remains unknown because the runner emitted a generic safe error. No new password reset or authentication was attempted. Source restored to the reviewed executor SHA2564275992679E26C983D8AAF9F77E2EAEF9B9FE73E46A40497D139FB0F50CE2DFB. Await final console status/screenshot, without secrets; do not rerun. TEST still shut down, production untouched; DEV provisioning/startup not performed.

## Console error identified ? local format rejection, 28/10/2026

Operator screenshot establishes PASSWORD_FORMAT_REFUSED_NO_RESET at PowerShell line34, before Node is launched. This resolves the earlier unknown console state: it was a local password-format rejection, not a PostgreSQL authentication error. The exact invalid character is unknown and was not requested. No password/verifier was disclosed or read.

Fresh guarded check: native reset attempts0, native authentication attempts0; reset marker/result/summary all absent. TEST systemID7698826681383327460 still cleanly shut down. Executor/wrapper hashes match the reviewed versions. No code change, reset retry, SQL authentication retry or production action occurred. The authorized one native reset remains unused.

A new input console PID8748 was opened under the existing TEST-only recovery approval. Operator must use this new console only, choose a NEW TEST password of16?128 printable ASCII characters without whitespace, confirm it, then enter the same value at the native PostgreSQL prompt. Previous console and failure evidence are preserved; no automatic rerun after any native attempt is permitted. Current status: LOCAL_INPUT_PENDING, recovery not yet verified. DEV provisioning/migrations/startup remain not performed.


## Follow-up after operator reported password entry ? 28/10/2026

**MVP_TEST_CREDENTIAL_RECOVERY_BLOCKED ? CONSOLE_STATE_NOT_VERIFIED.** Operator reported entry completed. Fresh filesystem/process inspection found no password-reset.attempt.json, no password-reset.result.json, no password-recovery-summary.json, and no Node reset runner process. The PowerShell console PID11768 still exists. There is no evidence of native reset execution or authentication; do not report recovery PASS or infer a password mismatch. The console may be waiting at a prompt or may have stopped before launching Node; exact error/prompt requires operator confirmation without disclosing secrets. No retry or new password-reset invocation was performed.

Fresh preflight still PASS: exact TEST systemID7698826681383327460, clean shut down, no postmaster.pid, ports55433/55001/55173 free, binary hashes/NTFS identity unchanged. Production listener5432 remains PID7848; no production SQL was issued. Private evidence: operator-input-followup-1793190477614.json in the recovery run. The verified offline backup and prior READ ONLY role inspection remain valid evidence; they do not prove password recovery.

DEV_PROVISIONING_NOT_PERFORMED; DEV_MIGRATION_NOT_PERFORMED; DEV_BACKEND_NOT_STARTED; DEV_FRONTEND_NOT_STARTED; PRODUCTION_DB5432_NOT_MODIFIED; REAL_MQTT_COMMANDS_NOT_SENT; PHYSICAL_PUMP_NOT_TRIGGERED.


## TEST-only credential recovery ? 28/10/2026, awaiting local operator input

**Current checkpoint: ROLE_VALID_AWAIT_OPERATOR_RESET_CONFIRMATION.** Operator confirmed the original TEST credential is no longer usable. This does not yet mean password recovery or DEV acceptance has passed.

- Exact target: PostgreSQL17.2, TEST port55433, PGDATA C:/DATN/test-instances/phase13-3b/data, systemID **7698826681383327460**. Production5432/systemID7472695863566132416 excluded; no production SQL connection made in this recovery.
- Private run: C:/DATN/test-instances/phase13-3b/test-auth-recovery-1793189718289-2f71e8. Previous failed attempt evidence preserved, no reuse of old markers.
- Clean offline backup: **6764 files,188362787 bytes**; every copied file SHA256/size matched source before/after copy. No external tablespaces or reparse points. Backup contains TEST PGDATA only; credentials.json/admin.pass/.env were not read or copied. Backup/catalog logs inherit operator-only ACL from the protected TEST root; no ACL changes.
- Single-user READ ONLY inspection: native exit0. Existing role phase13_test_admin matched once; LOGIN, SUPERUSER, CREATEDB, CREATEROLE all true. Correct data_directory, systemID and version170002 returned. No password/verifier selected. Cluster cleanly shut down after inspection.
- Implementation: scripts/mvp-test-role-inspection.cjs; scripts/mvp-test-password-reset.cjs; scripts/mvp-test-password-reset.ps1; scripts/mvp-test-password-reset.test.cjs. No domain/runtime/firmware changes. Single-user reset candidate uses one transaction with identity/role guards, exactly one ALTER ROLE PASSWORD, then COMMIT; no grants, role creation, authentication weakening or production fallback.
- SCRAM construction checked against public RFC7677 proof and server-signature vector; 8 new helper tests plus8 existing direct-native candidate tests **16/16 PASS**. Node syntax and PowerShell AST PASS. No repeated domain regression claimed. Evidence/hashes: reset-offline-verification.json in the private run.
- Pinned executor SHA256: 4275992679E26C983D8AAF9F77E2EAEF9B9FE73E46A40497D139FB0F50CE2DFB. Wrapper SHA256: 38F10FB3E520A28C28F40317B32013F22D105A728D1D3E54F8EDD57E66C4ED70.
- Attached console opened: PID11768. Per request section5, operator must confirm the exact one-reset phrase locally, enter a NEW TEST password twice, then enter the same password at PostgreSQL's native psql prompt. Password never belongs in chat/argv/environment/plaintext SQL file/log; no verifier persisted in evidence. Strings are transient in process memory; zeroing unmanaged buffers does not guarantee erasure of every GC copy.
- **At this checkpoint: password reset0, server starts0, authentication attempts0 in this recovery run.** Final native/authentication outcome is pending. If an attempt marker later exists, do not rerun; inspect the new outcome. Unknown outcome prohibits retry or automatic rollback. Offline backup rollback is not authorized by this recovery approval.
- Existing production listener remains5432/PID7848. Backend5000 and frontend5173/55001/55173 are not started. No connection to production DB, MQTT gateway or hardware. Runtime command flags/PENDING were not queried from production and are not freshly verified merely from config.

Sources: [PostgreSQL17 single-user server](https://www.postgresql.org/docs/17/app-postgres.html), [offline filesystem backup](https://www.postgresql.org/docs/17/backup-file.html), [password authentication](https://www.postgresql.org/docs/17/auth-password.html), [native Windows password prompt source REL17.2](https://raw.githubusercontent.com/postgres/postgres/REL_17_2/src/common/sprompt.c), [SCRAM public vector RFC7677](https://www.rfc-editor.org/rfc/rfc7677.html).

Pending final verdict: **MVP_TEST_CREDENTIAL_RECOVERY_BLOCKED ? LOCAL_OPERATOR_INPUT_PENDING**, not a reported reset/authentication failure. After successful native verification, smart-stop only the TEST server started by this session and record final control state. Stop before DEV provisioning, even if credentials recover.

DEV_PROVISIONING_NOT_PERFORMED; DEV_MIGRATION_NOT_PERFORMED; DEV_BACKEND_NOT_STARTED; DEV_FRONTEND_NOT_STARTED; PRODUCTION_DB5432_NOT_MODIFIED; REAL_MQTT_COMMANDS_NOT_SENT; PHYSICAL_PUMP_NOT_TRIGGERED.

Historical evidence follows unchanged.

## Cập nhật hiện hành — phiên direct psql, 28/10/2026

**MVP_DEV_AUTH_BLOCKED.** Đã thực hiện phiên mới đúng phê duyệt “MVP TEST AUTH RECOVERY & DEV COMPLETION”. Prompt mật khẩu trực tiếp của PostgreSQL vẫn bị từ chối; đã STOP và smart-stop đúng TEST cluster. Không provisioning hoặc chạy DEV acceptance.

### Preflight, nguồn và cơ chế nhập

- Run mới: `C:\DATN\test-instances\phase13-3b\mvp-direct-1793188378758-fa3d70`.
- PGDATA/systemID/PG_VERSION/NTFS/canonical path/shutdown state/port gates PASS. SystemID vẫn `7698826681383327460`, khác production.
- Hash source mới pin trong prepared.json; hashes5 file evidence phiên trước được đối chiếu nguyên vẹn. Không overwrite/xóa run hoặc marker cũ.
- Native client: PostgreSQL17.2 psql SHA256 `462604E525498D5AFFF38EE401025678A9E33D4DBAFB29DF1CDA87ACE70C5A2A`.
- Invocation cố định: `psql -X -W -q -t -A --host=127.0.0.1 --port=55433 --username=phase13_test_admin --dbname=postgres --set=ON_ERROR_STOP=1 --file=-`.
- Database postgres ở đây là maintenance database **trên TEST55433**, đúng connection specification của phiên trước; không phải database/role postgres production.
- Terminal PowerShell kiểm tra attached console/CONIN$ trước chạy. Node và psql giữ console, SQL đi qua pipe riêng; operator nhập password ngay prompt PostgreSQL. Không Read-Host/SecureString, auto-fill, PGPASSWORD, PGPASSFILE, PGSERVICE, DATABASE_URL hoặc .env cho admin authentication. Không lưu password hoặc transcript/keystrokes.
- Metadata kiểm tra các default pgpass paths không tồn tại; không đọc stored credentials. Mật khẩu không đi qua wrapper/argv/log. [Source PostgreSQL17.2](https://raw.githubusercontent.com/postgres/postgres/REL_17_2/src/common/sprompt.c) xác nhận native Windows prompt dùng CONIN$/CONOUT$ và điều khiển echo; source review không thay kết quả authentication thực tế.

### Kết quả thực tế của phiên mới

| Bước | Actual, giờ Việt Nam UTC+7 ngày28/10 | Kết quả |
|---|---|---|
| TEST start |18:53:38; pg_ctl PID24580, exit0 | PASS, chỉ một start |
| Postmaster | PID16012, loopback55433 | Đúng target native preflight |
| Direct psql | PID8244; operator báo đã nhập | Một diagnostic authentication attempt |
| Authentication |18:54:37; psql exit2, signalnull | FAIL |
| TEST smart stop |18:54:39; pg_ctl PID2356, exit0 | PASS graceful, không retry/force-kill |
| Final control |18:55:53; systemID đúng, state shut down, postmaster.pid absent | PASS |
| Final processes |18:55:54; không listener55433/55001/55173; psql8244/postmaster16012 không còn | PASS cleanup |

Observed error:

```text
FATAL: password authentication failed for user "phase13_test_admin"
```

Đây là kết quả từ native prompt, không chỉ là suy luận từ handoff SecureString trước. **Không chứng minh role không tồn tại hoặc xác định được mật khẩu đúng.** Chưa có authenticated SQL để đọc current_user/rolsuper/rolcreatedb/rolcreaterole/catalog. Filter server log không cung cấp bằng chứng phân biệt role absent/password mismatch; không tự kết luận nguyên nhân chi tiết.

Database/role creation,11 migrations, fixtures, backend55001/frontend55173 và API/browser DEV đều **NOT_PERFORMED trong phiên mới**. Chưa kiểm catalog để khẳng định các tên DEV có tồn tại từ tác nhân khác hay không. Không chạy lại để thử password khác, không thử postgres/role khác, không sửa pg_hba/trust/reset password/single-user mode.

### Evidence và kiểm thử

Trong run mới giữ prepared.json, operator-direct-launch.json, execution/cluster-start/direct-auth attempt markers, native-outcome.json, summary.json, direct-psql.stderr.log, cluster-start/stop native logs và final-control-and-auth-evidence.json. Không có direct-auth-result.json vì SQL chưa authenticated. Wrapper exit1 phản ánh phiên BLOCKED, còn native psql exit2 và pg_ctl start/stop exit0 được ghi riêng.

Source mới riêng biệt: `scripts/mvp-dev-direct.cjs`, `mvp-dev-direct-psql.cjs`, `mvp-dev-direct-launch.ps1`, `mvp-dev-direct-protect.ps1`, `mvp-dev-direct.test.cjs`; dùng các DEV backend/frontend/acceptance candidate đã chuẩn bị, không gọi lại đường admin PGPASSWORD cũ. Source hashes trong prepared.json. Native admin session chỉ được tạo một lần; nếu PASS mới tiếp tục pipeline đã chuẩn bị. Nhánh provisioning vẫn chưa nghiệm thu thực tế.

**8/8 direct-candidate unit tests PASS**, Node syntax/PowerShell AST PASS. Các tests xác minh fixed TEST target/-W, từ chối inherited auth/fallback options, DEV URL/SCRAM và đúng11 migration baseline; không giả đó là native password hoặc DEV integration PASS. Existing556 offline/3 runner tests và build/lint/typecheck PASS được kế thừa từ phiên trước cùng ngày, không tuyên bố đã chạy lại trong phiên này. Browser mock11checks vẫn SIMULATION_ONLY.

### Phương án khôi phục credential TEST — cần phê duyệt riêng

1. **Ưu tiên xác minh cục bộ credential gốc của TEST** từ hồ sơ thiết lập Phase13.3B hoặc kết nối TEST mà operator đã quản lý. Operator tự kiểm tra tại máy; không gửi password qua chat. Agent chưa đọc credentials.json/admin.pass hoặc tự điền lại credential. Muốn thử lại cần phiên mới được duyệt, không dùng lại marker/run này.
2. Nếu có **một TEST DBA account khác đã được xác minh độc lập**, có thể đề xuất một phiên được duyệt riêng trên55433 để đọc role catalog và kiểm tra capability; không tự thử role khác hoặc dùng production postgres. Chưa có account thay thế nào được xác minh.
3. Nếu credential gốc không còn, cần approval hẹp cho **TEST-only credential recovery/reset của đúng role**, kèm systemID/PGDATA pin, data retention và phương thức được review. Hiện **không** cấp quyền reset/GRANT, sửa pg_hba, trust, single-user recovery hoặc tạo cluster mới. Không đưa ra và không chạy lệnh recovery ngoài phạm vi.

Không mở lại R2.x, production preflight hoặc migration6ledger. Blocker tiếp theo là TEST authentication, không phải initdb hoặc sửa logic tưới.

### Trạng thái cuối phiên direct

```text
MVP_DEV_AUTH_BLOCKED
DIRECT_PSQL_AUTH_ATTEMPTS_1
AUTHENTICATED_SQL_NOT_AVAILABLE
TEST_CLUSTER_STOPPED_GRACEFULLY
DEV_PROVISIONING_NOT_PERFORMED
DEV_MIGRATION_NOT_PERFORMED
DEV_BACKEND_NOT_STARTED
DEV_FRONTEND_NOT_STARTED
LIVE_DEV_ACCEPTANCE_NOT_EXECUTED
PRODUCTION_DB5432_NOT_MODIFIED
PRODUCTION_BACKEND5000_NOT_STARTED
REAL_MQTT_COMMANDS_NOT_SENT
AUTOMATION_NOT_ENABLED
PHYSICAL_PUMP_NOT_TRIGGERED
R2_5_INITDB_NOT_PERFORMED
```

Production5432/broker LAN/loopback vẫn PID7848/9052/4572. NOT_MODIFIED nghĩa agent không connect/write/start production trong phiên này, không phải kiểm chứng mọi row của production bất biến. Giữ nguyên data/evidence; STOP sau báo cáo.

---

## Lịch sử — phiên handoff trước, giữ nguyên kết quả

**MVP_DEVELOPMENT_ENVIRONMENT_BLOCKED** — 28/10/2026. Preflight filesystem/control đã PASS, cluster TEST start một lần thành công, nhưng lần xác thực TEST đầu tiên bị từ chối. Đã STOP, không retry; cluster đã dừng graceful. Chưa provisioning hoặc chạy ứng dụng DEV.

## PART A — EXACT TEST TARGET VERIFICATION

Target được duyệt: `C:\DATN\test-instances\phase13-3b\data`, `127.0.0.1:55433`, systemID **7698826681383327460**, PostgreSQL17.2. SystemID khác production7472695863566132416.

- Canonical path và ancestors không có reparse/symlink.
- Owner/operator SID `S-1-5-21-1432835263-483988321-3159128977-1001`.
- Root test protected DACL, chỉ operator FullControl; data kế thừa đúng ACE operator từ root, không ACE rộng bất thường. Không sửa ACL.
- PG_VERSION=17; pg_controldata exit0, state `shut down`; không postmaster.pid trước startup.
- Port55433/55001/55173 trống; production5432/brokers vẫn PID cũ. Các attempt test lịch sử giữ nguyên, không xóa/overwrite; không postmaster đang chạy cho target đã pin.
- Binary pin PASS: pg_ctl `FC644446B0236E623E3E6FE2699446259EFB8E61BD9ABA838D6394A2BE6987B8`; psql `462604E525498D5AFFF38EE401025678A9E33D4DBAFB29DF1CDA87ACE70C5A2A`; pg_controldata `6896F8A705AFB5CBAAD843017D6D8AED5F5D76E32B3179E66750AAA5F193CC40`; postgres `94A8EA85CFFD4A15C21290CA555A06438D3F7621B001BEA6B1373C210D5A1746`.

Run riêng, private, ngoài Git:

```text
C:\DATN\test-instances\phase13-3b\mvp-dev-1793186964474-6a2390
```

`prepared.json` pin source hashes,11 migration names/checksums và preflight. Không initdb/restore/reset/WAL cleanup. Startup TEST có operational/WAL/control writes được phê duyệt; không gọi đó là read-only.

## PART B — CLUSTER STARTUP & IDENTITY

| Bước | Actual | Kết quả |
|---|---|---|
| pg_ctl start | Exit0; target duy nhất đã pin; bind127.0.0.1:55433 | PASS |
| Postmaster | PID20912, created2026-10-28T11:30:09.903351Z | Native identity/control evidence |
| SQL login đầu |18:30:10 ngày28/10, psql exit2 | FAIL authentication |
| SQL identity | Chưa authenticated, không query được | NOT_VERIFIED |
| pg_ctl smart stop |18:32:11, exit0 | PASS graceful |
| Final pg_controldata |18:34:23, systemID đúng, state shut down, không postmaster.pid | PASS |

Timestamp bảng trên dùng giờ Việt Nam UTC+7 trừ field hậu tốZ. Raw client error đã lọc:

```text
FATAL: password authentication failed for user "phase13_test_admin"
```

Chỉ một lần start và một lần thử SQL authentication. Không thử user/password khác, không reset password, sửa pg_hba, chuyển trust hoặc đọc credentials.json/admin.pass cũ. Lỗi này chứng minh server từ chối credential được cung cấp; chưa đủ bằng chứng phân biệt mật khẩu không khớp, thông tin role hoặc lỗi nhập/handoff. Không đổ lỗi cho operator hoặc khẳng định role tồn tại bằng một login thất bại.

## PART C — DATABASE / ROLE PROVISIONING

**NOT_PERFORMED.** Chưa tạo `smart_agriculture_mvp_dev`, `sa_mvp_dev_migrator`, `sa_mvp_dev_app` trong phiên này. Vì chưa query catalog được, không tự khẳng định các tên đó đang tồn tại hay chưa tồn tại trên cluster.

Operator đã xác nhận có password TEST và adapter bơm rút điện. Terminal dùng Read-Host -AsSecureString, không transcript/recording/password argv/chat/file. Credential TEST được chuyển qua stdin riêng tới runner; libpq nhận biến PGPASSWORD chỉ trong environment của từng child TEST client, không environment toàn máy, không production credential. Không in password hoặc lưu admin credential. Cách handoff này không tuyên bố chống admin/process-memory inspection.

Candidate sinh password hai role mới bằng crypto RNG cục bộ, dự kiến SCRAM verifier trong SQL memory, không plaintext SQL file/log; new-role credentials dự kiến DPAPI CurrentUser trong run private. Bước tạo/lưu đó chưa đạt tới: **không có credentials.dpapi**. Không tái sử dụng staging chưa được duyệt để lưu production secrets.

## PART D — PRISMA MIGRATIONS

**NOT_PERFORMED trên database DEV.** Đã đối chiếu source đúng11 migrations với manifest baseline đã pin; không cluster-global DDL hoặc reference production database trong các file này. Không db push/generate migration/migrate resolve.

Candidate chỉ copy schema+11 migrations vào private run rồi gọi migrate deploy bằng URL migrator DEV; không đọc `.env` production và không generate/ghi đè Prisma Client production. Đây là chuẩn bị đã review, **chưa là migration integration PASS**.

## PART E — DEMO DATA

**NOT_CREATED.** Candidate đã chuẩn bị synthetic ADMIN/OWNER/STAFF/inactive users, hai farms, zones/crop, devices `MVP-SIM-A-01`/`MVP-SIM-B-01`,4 sensor types và sourceSIMULATOR, alert threshold/recovery, activity logs và automation disabled.

Không dùng ESP32-GF-A-01 hoặc credentials thiết bị thật làm fixture identity. Không copy production rows. Seed/ingestion candidate chỉ nhận URL app DEV, không gọi physical gateway; chưa chạy trong phiên này.

## PART F — BACKEND DEV STARTUP

**NOT_STARTED**, port55001 trống trước/sau. Candidate `scripts/mvp-dev-backend.cjs` giữ server.ts hiện có nhưng:

- Chỉ chấp nhận DB `127.0.0.1:55433/smart_agriculture_mvp_dev`, role `sa_mvp_dev_app`.
- Chặn discovery repository `.env`; MQTT connect bị từ chối; HTTP bind chỉ127.0.0.1:55001.
- Expected PORT55001/MQTT_ENABLED=false/commandsfalse/automationfalse/testtrue/max1; fresh DEV datasource và JWT secret, không production fallback.
- IPC STOP phát event SIGTERM để đi qua shutdown handler; không auto-restart/force-kill.

Những guard này đã parse/review và có unit URL guard, **chưa chứng minh runtime flags/health bằng serving process**. Không lấy expected config làm VERIFIED.

## PART G — FRONTEND DEV STARTUP

**NOT_STARTED**, port55173 trống. Candidate `scripts/mvp-dev-frontend.mjs` tạo Vite server bằng config riêng:127.0.0.1:55173/strictPort, envDir private rỗng, API base cố định127.0.0.1:55001/api. Không fallback5000 hoặc đọc frontend env production. IPC STOP đóng server graceful.

Frontend build/lint riêng đã chạy PASS, không đồng nghĩa frontend development server hoặc browser live DEV đã PASS.

## PART H — AUTH / CRUD / HISTORY / ALERTS

**DEV_DB_INTEGRATION_NOT_EXECUTED.** Prepared tests có login3role/invalid/inactive/401/403/logout, farm isolation, create/read/update/soft status, assignment create/remove, validation, pagination/filter, history/raw chart/statistics/empty/range/CSV, alert OPEN→ACK→hysteresis→RESOLVED/duplicate/out-of-order.

Tất cả đang là candidate tests, không được tính PASS. Không chạy legacy API scripts, không thử command endpoint; chưa tạo DeviceCommand DEV hoặc production từ runner.

Regression thực thi mới:

| Kiểm tra | Kết quả | Evidence |
|---|---|---|
| Existing offline QA |556/556 PASS | `build/project-acceptance/offline-1793187019648/summary.json` |
| Runner unit tests |3/3 PASS | `node --test scripts/mvp-dev-runtime.test.cjs` |
| Backend typecheck | PASS exit0 | tsc--noEmit |
| Frontend build/lint | PASS exit0 | Vite2404 modules;519.42kB chunk warning không chặn build |
| PowerShell AST / Node syntax | PASS | Launch/protect AST và4 JS entrypoints |

Không cộng tests prepared, browser mock lịch sử hoặc các lượt regression lặp thành live DEV acceptance.

## PART I — BROWSER ACCEPTANCE

**LIVE_DEV_BROWSER_NOT_EXECUTED.** Không có browser-evidence.json/API response artifact trong run. Candidate dùng Edge thật, actual DEV backend (không mock API) và browser network fence chỉ55001/55173; banner SYNTHETIC; command endpoints bị chặn. Native tab visibility nếu headless không thực sự hidden sẽ giữ NOT_VERIFIED, không giả document.visibilityState.

11/11 browser mock của audit trước vẫn là **SIMULATION_ONLY**, không thay login/CRUD/dashboard/chart/alert live DEV lần này.

## PART J — SAFETY / PROCESS CLEANUP

Sau authentication failure, runner STOP. Một lỗi bookkeeping trong candidate giữ stage CLUSTER_START cho cả identity query, khiến summary gốc phân loại quá rộng thành UNKNOWN_NATIVE_STOP_NO_RETRY dù pg_ctl exit0 và psql exit2 đã rõ. **Không ghi đè summary gốc.** Đã sửa assignment stage=SQL_IDENTITY cho candidate tương lai, chạy lại3 unit tests PASS; không chạy lại session.

Cleanup riêng theo quyền kết thúc phiên: đọc postmaster.pid và Windows process xác minh đúng PID20912/creation/PGDATA/port;0 established clients trên55433; chạy đúng một `pg_ctl stop -m smart -w -t20`, exit0. Không fast/immediate shutdown, force-kill hoặc SQL retry. Bằng chứng bổ sung create-new:

- cleanup-smart-stop.attempt.json
- cleanup-smart-stop.result.json
- cleanup-final-control.json

Native wrapper outcome exit1. Final11:33:06Z:55433/55001/55173 không listener, PID20912 không còn, postmaster.pid absent. Production5432 vẫn PID7848; broker LAN9052 và loopback4572 không đổi. Không kết nối production để kiểm toàn bộ dữ liệu; trạng thái NOT_MODIFIED dưới đây có nghĩa agent không thực hiện write/connect trên production.

Không drop/reset database/role hoặc xóa old data/evidence. Cửa sổ operator PowerShell NoExit có thể còn mở idle; không phải backend/frontend hoặc cluster đang chạy, operator có thể đóng cửa sổ đó.

Source mới: `mvp-dev-runtime.cjs`, `mvp-dev-backend.cjs`, `mvp-dev-frontend.mjs`, `mvp-dev-acceptance.cjs`, `mvp-dev-launch.ps1`, `mvp-dev-protect.ps1`, `mvp-dev-runtime.test.cjs`. Không sửa domain runtime/main schema/firmware hoặc credentials/ACL production. Runner không wired vào startup tự động. Rollback code: loại bỏ các candidate mới theo diff; giữ run evidence và cluster data, không reset mixed workspace.

## PART K — REMAINING P0 BLOCKERS

1. **TEST authentication:** cần operator xác minh credential đúng cho existing TEST role. Không đưa password qua chat. Nếu không có credential hợp lệ, cần quyết định riêng; không tự reset mật khẩu/role hoặc dùng production postgres.
2. Phiên execution hiện tại đã dừng, start/auth attempt đã sử dụng. Không chạy lại wrapper/run marker cũ. Trước một phiên mới phải review hash candidate sau sửa bookkeeping, có approval giới hạn mới, kiểm lại TEST identity/port/catalog conflicts; không initdb hoặc mở R2.x.
3. DEV provisioning/migrations/runtime/live browser acceptance chưa thực hiện; matrix chưa nâng COMPLETE_VERIFIED_DEV.
4. Live ESP32 telemetry và automatic physical vẫn ngoài nghiệm thu DEV synthetic. Chưa PROJECT_READY_FOR_DEFENSE.

## PART L — FINAL VERDICT

```text
MVP_DEVELOPMENT_ENVIRONMENT_BLOCKED
TEST_CLUSTER_PREFLIGHT_PASS
TEST_CLUSTER_START_PASS
TEST_SQL_AUTHENTICATION_FAILED
DEV_PROVISIONING_NOT_PERFORMED
DEV_MIGRATION_NOT_PERFORMED
DEV_BACKEND_NOT_STARTED
DEV_FRONTEND_NOT_STARTED
LIVE_DEV_ACCEPTANCE_NOT_EXECUTED
TEST_CLUSTER_STOPPED_GRACEFULLY
PRODUCTION_DB5432_NOT_MODIFIED
PRODUCTION_BACKEND5000_NOT_STARTED
REAL_MQTT_COMMANDS_NOT_SENT
AUTOMATION_NOT_ENABLED
PHYSICAL_PUMP_NOT_TRIGGERED
R2_5_INITDB_NOT_PERFORMED
```

STOP sau báo cáo; không tự retry/startup production hoặc chuyển phase.
