# Final acceptance matrix

## Ma trận nghiệm thu hiện hành — SOFTWARE DEV ACCEPTED29/10/2026

| Nhóm | Trạng thái | Phạm vi/bằng chứng |
|---|---|---|
| Auth/RBAC/CRUD | COMPLETE_VERIFIED_DEV | Kế thừaAPI/UIcases đãPASS;khôngrerun trong phiênpagination |
| React/dashboard/polling/no-data/responsive | COMPLETE_VERIFIED_DEV trongcáccaseđãđo | EvidenceEdge/REST/DB từphiêntrước;khôngcoi mọiscenario/performanceđãđạt |
| History/chart/statistics/customrange/CSV | COMPLETE_VERIFIED_DEV | UI/DB/API trước+paginationfix4scenarioPASS hiện tại |
| Scopepagination/resetpage | COMPLETE_VERIFIED_DEV | SOIL2→LIGHT1,FarmA→B1,zoneclear/reselect1,normal1→2→1;sourcehashkhớp |
| Alerts và user lifecycle/logout401 | COMPLETE_VERIFIED_DEV | Browser/API/DBhistorical gầnnhất,PASSgiữnguyên |
| Irrigation disabled UI | COMPLETE_VERIFIED_DEV | Gatewaylocked/UNKNOWN/0command;khôngphysicaldispatch |
| ComputedSHADOWpreview | NOT_VERIFIED_DEV,ngoạilệđượcphép | Thiếutargetphysicalidentity;khôngfakeESP hoặcbypassguard |
| Runtime/cleanup | COMPLETE_VERIFIED_DEV | Currentfalseflags/0PENDING,safestopTEST/DEV |
| SoftwareMVP | **MVP_DEV_SOFTWARE_ACCEPTED** | DEV/SIMULATORscope;khôngproduction/hardware |
| RealESP32E2E/automaticphysical | NOT_VERIFIED | Chưanghiệmthutrongphiênfinal;hardwarecũgiữhistorical |

PROJECT_NOT_READY_FOR_DEFENSE vẫn giữ. P0softwarehiện tại0; các bảngPARTIAL bên dưới là lịch sử được thay thế. [Báo cáo A–I](MVP_DEVELOPMENT_RUNTIME_ACCEPTANCE.md).

---


## Delta FINAL UI GAP CLOSURE29/10/2026

| Nhóm | Status | Bằng chứng mới |
|---|---|---|
| No-data/null-v-zero | COMPLETE_VERIFIED_DEV | ActualTEMP_EMPTY/null vàLIGHT0cards/API |
| Responsive/navigation | COMPLETE_VERIFIED_DEV trongbasicviewports |390/768/1440,device/history/login/dashboardlayout,menumobile;khôngpixelperfect |
| History/chart/stats/customrange/CSV | COMPLETE_VERIFIED_DEV trongcáccasePASS |12rows,min10/max47/avg38.17;customrefreshgiữrange;CSV7299bytes;scopes404 |
| Pagination khi đổi scope | PARTIAL | Productbugpage2→LIGHT8rows giữpage2/1;đãsửa/testoffline,chưalivepostfix |
| Alerts UI | COMPLETE_VERIFIED_DEV | AcceptanceOPEN→ACK→RESOLVED,hysteresis,filter/scopes |
| User mutations/logout/401 | COMPLETE_VERIFIED_DEV | Create/edit/role/status/validation;acceptanceuseronly;actualAxios401clear/redirect |
| Irrigation disabled UI | COMPLETE_VERIFIED_DEV | Gatewaylocked/UNKNOWN/controlhidden-disabled,0commands |
| SHADOW label/identityguard | COMPLETE_VERIFIED_DEV choUIgating | Computedpreview **NOT_VERIFIED_DEV** đượcphépngoạilệ,khôngfakeESP |
| Safety/cleanup | COMPLETE_VERIFIED_DEV |Falseflags,0commands/PENDING/automation,safestop/noDEVports |

VerdictMVP_DEV_UI_PARTIALdo1page-resetfixchưanghiệmthulive.22checkpointPASS,1APPLICATION_FAILsauadjudication,1optionalNOT_VERIFIED;khôngcộngsuitecũ. [PART A–J](MVP_DEVELOPMENT_RUNTIME_ACCEPTANCE.md). Phầndướilàlịchsử.

---


## Delta live UI29/10/2026,16:15

| Nhóm | Status hiện hành | Actual evidence |
|---|---|---|
| React/CSS trên Edge | COMPLETE_VERIFIED_DEV | Frontend-only login render/computedstyle,CSS200,0overlay/pageerror; lỗiTailwindđãđónglive |
| Auth login/RBAC | COMPLETE_VERIFIED_DEV trong các case đã chạy | ADMIN/OWNER/STAFF,invalid/inactive,forbidden/API403/crossfarm404;logout/401sessionredirectchưachạy |
| Dashboard4types/LIGHT0 | COMPLETE_VERIFIED_DEV | Actual API/DB,SIMULATOR,TEMP/HUM/LIGHT/SOIL |
| Polling noF5/UTC+7 | COMPLETE_VERIFIED_DEV | Row42.625,recordedAt09:14:34.607Z,UI16:14:34;37→38 rows;0navigation |
| Scope/retry/unmount | COMPLETE_VERIFIED_DEV trong scenario cụ thể | DelayedactualGET,oneabort/recovery,11sno oldrequest;nativevisibility/nooverlapprofilechưaverified |
| No-data/responsive | IMPLEMENTED_NOT_VERIFIED | HarnessselectorFAIL;API200/null;fixcomponentoffline1PASS,khôngrerunlive |
| History/charts/CSV/alertsUI | IMPLEMENTED_NOT_VERIFIED | NOT_EXECUTEDsaufailstop;historicalAPIkhôngthayUI |
| User mutations/logoutUI | IMPLEMENTED_NOT_VERIFIED | ADMINlistđãrender;mutation/status/logoutchưachạy |
| Irrigation/SHADOWUI | IMPLEMENTED_NOT_VERIFIED | APIGatewayDISABLEDverified;pagechưachạy,fixedphysicalidentitykhônggiảlập |
| Runtime safety/cleanup | COMPLETE_VERIFIED_DEV |0commands/PENDING/automation,stopIPC/smartstop0,shut down,noDEVports |

Verdict **MVP_DEV_UI_PARTIAL**;khôngnângtoànsoftware hoặcPROJECT_READY_FOR_DEFENSE. [PART A–K](MVP_DEVELOPMENT_RUNTIME_ACCEPTANCE.md). Các bảng dưới là lịch sử.

---


## Delta nghiệm thu29/10/2026

| Nhóm | Status | Bằng chứng mới |
|---|---|---|
| Existing DEV identity/startup/safety/cleanup | COMPLETE_VERIFIED_DEV | Một start/stop;11 checksum; approle;healthDBconnected/MQTTdisabled;command0/PENDING0 |
| Create/disable entity, assignmentDELETE | COMPLETE_VERIFIED_DEV trong phạm vi API cases |6nhómCRUDPASS; recordsacceptance riêng, statusretainsrows,crossfarm/validation |
| Usercreate/profileupdate API | COMPLETE_VERIFIED_DEV trong phạm vi đã chạy | NewSTAFFcreate/updatephone/name; originalfixtures không sửa |
| Userrolechange/deactivate/reactivate vàbrowserforms | IMPLEMENTED_NOT_VERIFIED | Không chạy tới bướcUI/statusmutation |
| Browseractualapp | BLOCKED | CSS500,2checksFAIL;Tailwindlauncherfix chỉ offline |
| Dashboard/polling/history/chart/alert/irrigationUI | IMPLEMENTED_NOT_VERIFIED | Không applicationrender hoặcAPIrequest từbrowser |
| HardDELETE tổng quát | NOT_REQUIRED theo contract/đềcương đãđọc | KhôngrouteentityDELETE;staffassignmentDELETEđãPASS |
| SHADOWcomputedDEVpreview | PARTIAL | FixedESP32identityvsMVP-SIMfixtures;chưa thaytrust/fixture |

[PART A–J](MVP_DEVELOPMENT_RUNTIME_ACCEPTANCE.md). SoftwareDEVchưađạt ACCEPTED;hardware/productionkhôngnângtrust. Các bảng dưới là lịch sử.

---


## Delta nghiệm thu DEV28/10 — current scope

| Nhóm | Status | Phạm vi đã có evidence mới | Còn thiếu |
|---|---|---|---|
| TEST persistence/migration | COMPLETE_VERIFIED |11 baseline checksums,15 tables/23FK/75indexes, app least privilege trên DEV | Không production migration |
| Authentication/RBAC | PARTIAL | ADMIN/OWNER/STAFF,401/403,inactive/logout và farm scope qua API thật | Browser role flows/user mutation coverage |
| Farm/Zone/Crop/Device/Sensor | PARTIAL | Create/read/update,validation,staff assignment/remove,cross-farm isolation | DELETE entities và browser CRUD |
| Latest/history/chart/statistics/CSV | PARTIAL | API/DB thật,4 types,zero/null,range/empty,min/max/avg và export scope | Dashboard/chart UI,UTC+7,polling thực tế |
| Alerts | PARTIAL | OPEN/ACK/RESOLVED,hysteresis,duplicate/out-of-order qua real DEV API/DB | Browser UI |
| DEV runtime safety/cleanup | COMPLETE_VERIFIED | health connected/MQTT disabled; serving PID flagsfalse/false/testtrue/cap1;commands0;graceful stop | Không mở physical control |
| Irrigation/SHADOW UI | IMPLEMENTED_NOT_VERIFIED | Source và offline tests có; gateway API DISABLED verified | Browser preview/control-disabled UI chưa chạy |
| Browser application E2E | BLOCKED | Launch lỗi trước0 app requests; đã sửa và smoke Edge offline | Live DEV browser acceptance |
| Real ESP32/sensors/MQTT/pump | NOT_REQUIRED | Không thuộc phiên software DEV; synthetic SIMULATOR only | Nghiệm thu riêng nếu scope bảo vệ yêu cầu |

43 API checks PASS,1 browser lifecycle FAIL. Không đánh dấu toàn bộ COMPLETE_VERIFIED_DEV. [Báo cáo A–K](MVP_DEVELOPMENT_RUNTIME_ACCEPTANCE.md). Matrix14 nhóm phía dưới giữ historical/broader-project scope; delta này không nâng hardware/production trust.


**TEST DBA access — COMPLETE_VERIFIED trong phạm vi TEST55433.** Native psql exit0, đúng role/systemID và READ ONLY; reset1/auth1/start1/stop1, final shut down. Không nâng nghiệm thu14 nhóm ứng dụng/production/hardware; DEV provisioning/API/browser chưa thực hiện. [Báo cáo hiện hành](MVP_DEVELOPMENT_RUNTIME_ACCEPTANCE.md). Các checkpoint bên dưới là lịch sử.

**Latest TEST recovery diagnostic:** runner exit1 root cause identified as missing system PATH in the cleared .NET child environment. Reproduced failure and fixed pipeline with synthetic input only;18/18 related tests PASS plus native offline transport checks. Real reset/authentication still pending; no production or DEV startup. See [current report](MVP_DEVELOPMENT_RUNTIME_ACCEPTANCE.md).

**TEST recovery checkpoint28/10 (newer than direct-auth failure):** operator confirmed original credential unusable. Offline TEST backup6764files/188362787bytes verified; single-user READ ONLY proved phase13_test_admin exists with LOGIN/provisioning privileges, exit0.16/16 related offline tests PASS; reset/authentication pending local operator confirmation/password entry. [Current recovery evidence](MVP_DEVELOPMENT_RUNTIME_ACCEPTANCE.md). No DEV provisioning/startup, production writes or hardware actions. Prior authentication failures remain historical; role absence/insufficient privilege is no longer an unverified hypothesis. No live acceptance status is upgraded yet.

Ngày28/10/2026. Status áp dụng cho **yêu cầu tích hợp của từng dòng**, không suy test PASS là production/hardware PASS. `COMPLETE_VERIFIED` luôn kèm phạm vi. Các báo cáo cũ là historical evidence, không phải snapshot hiện tại.

Status hợp lệ: COMPLETE_VERIFIED / IMPLEMENTED_NOT_VERIFIED / PARTIAL / BLOCKED / NOT_IMPLEMENTED / NOT_REQUIRED.

**DEV update28/10:** [MVP_DEVELOPMENT_RUNTIME_ACCEPTANCE](MVP_DEVELOPMENT_RUNTIME_ACCEPTANCE.md): TEST filesystem/control preflight/start/cleanup PASS; SQL authentication FAIL, nên provisioning/migrations/API/browser DEV **BLOCKED**, không nâng dòng nào thành COMPLETE_VERIFIED_DEV. Browser mock trước vẫn SIMULATION_ONLY. Stage-level kết quả test không thay status tích hợp14 nhóm bên dưới.

**Direct-auth update:** prompt native PostgreSQL trong phiên mới cũng FAIL exit2; SQL role privileges/current DB catalog chưa verified. TEST đã smart-stop; A01/A02/A06/A13/A14 không được nâng status từ kết quả này.8 unit tests cho direct candidate PASS, không phải DEV/hardware acceptance. Verdict hiện tại MVP_DEV_AUTH_BLOCKED.

## Ma trận14 nhóm yêu cầu

| ID | Yêu cầu | Status tổng | Bằng chứng thực tế | Điều kiện nghiệm thu còn lại |
|---|---|---|---|---|
| A01 | Login/auth/RBAC | PARTIAL | `backend/src/services/auth.service.ts`, `middlewares/auth.middleware.ts`, `authorize.middleware.ts`, `farm-access.service.ts`;10 core offline tests và STAFF browser route mock | Login API thật,401/403, inactive, logout,3 role/cross-farm trên DB dev; JWT mock/fixture không thay login thật |
| A02 | Users/Farms/Zones/Staff/Crops | IMPLEMENTED_NOT_VERIFIED | `backend/src/routes/{user,farm,zone,crop}.route.ts`, repositories/services; `frontend/src/pages/{users,farms,zones,crops}`; API phase3/4 scripts có thể ghi DB | CRUD/validation/ownership/assignment ở targetdev riêng, không chạy scripts đó trên production |
| A03 | ESP32/Device/Sensor quản trị | PARTIAL | Device/Sensor routes/forms/schema; `docs/PHASE12C_DEVICE_PRESENCE_FIX_REPORT.md`; unit presence PASS | Link đúng Device→Zone→Farm, sensorCode, phân quyền; fresh runtime đang thiếu vì backend down |
| A04 | DHT22/BH1750/LM393 | PARTIAL | firmware `.ino`, `FirmwareDiagnostics.h`; `PHASE13_4F2_HOTFIX_FLASH_VERIFICATION.md`:12/12 readings; host sensor tests PASS | Chứng minh reading mới; hiệu chuẩn đất/quality chưa đạt; lux0 và soil0 là giá trị hợp lệ, không đổi thành “không có” |
| A05 | MQTT telemetry + ONLINE/OFFLINE | PARTIAL | `mqtt-client.service.ts`, `mqtt-telemetry.adapter.ts`, `device-presence.service.ts`, watchdog; unit lifecycle; report13.4G có61batches/244readings lịch sử | Broker TCP không đủ: authenticated subscribe/receipt mới; TTL/visibility với outage mô phỏng trước; device current NOT VERIFIED |
| A06 | Lưu PostgreSQL SensorReading | BLOCKED | Main schema unique(sensorId,recordedAt), receivedAt/source; ingestion/repository; SQL/API correlation lịch sử PASS | Backend5000 không chạy nên live ingestion hiện không nghiệm thu được;3 batches / 12 readings fresh DB/API sau recovery |
| A07 | Dashboard/Sensors/Device/Zone khôngF5 | PARTIAL | `usePolling.ts`, `utils/polling.ts`;12 offline lifecycle tests; monitoring pages dùng default10s; tab hidden/cancel/race/error recovery | Browser live4 sensors, đổi farm/zone/device nhanh, tab visibility, backend error/recovery; irrigation mock E2E không thay dashboard live |
| A08 | History/biểu đồ/bộ lọc | IMPLEMENTED_NOT_VERIFIED | `sensor-reading.service.ts`, raw800limit/auto buckets; `SensorHistoryPage.tsx`, relative refresh utility | Query/range/timezone7+, zero/no-data và chart so với DBdev; khoảng custom không vượt filter; history không polling toàn bộ |
| A09 | Alert threshold/ack/resolve | PARTIAL | `alert-evaluation.service.ts`, `utils/alert-condition.ts`, `alert*.route.ts`, AlertsPage;4 boundary/hysteresis core tests PASS | New reading→open→ack→recovery, duplicate/out-of-order không tạo lại; farm scope và UI trên dev |
| A10 | Tưới thủ công | PARTIAL | `device-command.service.ts`, MQTT gateway, `PumpProtocol.h`; browser mock command lifecycle PASS; `PHASE12D4_PHYSICAL_PUMP_ACCEPTANCE.md`=PARTIAL | Fresh live process/OFF/clock evidence; nếu thử mới cần approval riêng, người vận hành; thiếu xác nhận nước/physical acceptance đầy đủ |
| A11 | Tưới tự động/an toàn | PARTIAL | Legacy evaluator + `automatic-irrigation` SHADOW engine/preview, offline511backend tests gồm policy; fixtures không gateway | Chốt mức nghiệm thu SHADOW hay physical. VERIFIED_LIVE/ACTIVE chưa có production adapter/persistence hoàn chỉnh; không bật để demo |
| A12 | Audit/logs/error handling | PARTIAL | ActivityLog scopes/API/UI; `recordActivity` best-effort; error middleware;6 ledger append-only trong test | Kiểm tra audit thực của CRUD/command,401/404/500, file export; legacy audit có thể warn rồi tiếp tục, không tuyên bố immutable/durable mọi hành động |
| A13 | Startup/recovery/reliability | BLOCKED | Listener5000/5173 absent,5432/1883 present; `server.ts` recovery writes; R2.4 offline351PASS | Production recovery/live flags chưa thực hiện; root cause exit UNKNOWN. Chọn recovery được duyệt hoặc devtarget; không cần migration6 ledger cho monitoring |
| A14 | Demo/bàn giao/bảo vệ | PARTIAL | `END_TO_END_DEMO_PLAN.md`, browser simulation/banner/screenshots, README/safe QA | Tổng duyệt với dữ liệu thật, chốt automation scope, source đóng gói/secrets review, hoàn thành P0 và ghi giới hạn |

## Các phần đã xác minh trong phạm vi hẹp

| Hạng mục | Status | Phạm vi evidence |
|---|---|---|
| QA offline556cases | COMPLETE_VERIFIED | Chạy mới28/10;4guard+511backend+29frontend+12polling; DB/MQTT production không tham gia |
| Browser command/SHADOW11 checks | COMPLETE_VERIFIED | Edge thật với API mock;3 mock ON không tới network backend; không physical timer proof |
| Typecheck/build/lint | COMPLETE_VERIFIED | Backend tsc--noEmit, frontend build/ESLint exit0; chunk>500kB chỉ warning |
| Firmware host/C++ + protocol | COMPLETE_VERIFIED | Compile/run5 C++ programs và11 Node source/backend contract tests; không flash/board test mới |
| ESP32 flash13.4F.1/short stability | COMPLETE_VERIFIED | **Lịch sử21/10**, report13.4F2:260s không abort,12 readings+3 OFF. Không remote attestation hiện tại |
| Durable SQL persistence | COMPLETE_VERIFIED | **Isolated lịch sử**13.5A.1=59/59, không production. Test cluster không start trong audit |
| Production backup restore rehearsal | COMPLETE_VERIFIED | **Recovery lịch sử**C.7:15tables/34.205rows; không restore mới hoặc production migration |
| Production publisher/device-session verifier | NOT_IMPLEMENTED | Chỉ pure policy/proposal; subscriber MQTTv1 không tự mang identity publisher |
| Approved soil calibration/live metadata | IMPLEMENTED_NOT_VERIFIED | Quality policy/proposal có; wire metadata/calibration/contact proof chưa được nghiệm thu |
| Six ledger production wiring | NOT_IMPLEMENTED | `PostgresTestIrrigationRepository` khóa55433/test app/schema; main schema không6 ledger; proposals không runtime |
| VERIFIED_LIVE/ACTIVE hardware auto | BLOCKED | Assembler cố ý verifiedLiveReady=false/engineCalled=false; credential/identity/quality/durable safety còn thiếu |
| R2.5 real initdb55435 | NOT_IMPLEMENTED | R2.4 approval ready, real attempt0/1; không bắt buộc monitoring MVP |
| Mobile app,AI,cloud multi-region,WebSocket thay polling | NOT_REQUIRED | Không có yêu cầu MVP được xác minh; không tự thêm |
| TLS/long-term Windows/DPAPI hardening cho public production | PARTIAL | Rủi ro có thật nhưng tách P1/P2 theo môi trường; local demo không đồng nghĩa đủ public deployment |

## Quy tắc đóng acceptance

Mỗi lần nâng status phải ghi ngày, target, source version, steps, expected/actual, evidence path và người nghiệm thu. Nếu requirement automatic physical không được miễn rõ ràng, giữ A11 PARTIAL/BLOCKED; không đổi thành NOT_REQUIRED để kết luận đủ bảo vệ. Hiện **PROJECT_NOT_READY_FOR_DEFENSE**.
