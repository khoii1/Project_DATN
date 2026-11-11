# Smart Agriculture IoT — Project completion status

## Hồ sơ tổng hợp05/11/2026

**NOT_READY_FOR_DEFENSE**. Kết quả COMPLETE_VERIFIED_DEV29/10 bên dưới giữ đúng phạm vi software/SIMULATOR, không bị xóa bởi các lỗi về sau. PhaseY đã nghiệm thu ESP32→MQTT→DEV DB/API; final historical Website sau AW còn BLOCKED tại native AX, AZ chỉ ghi nhận crash ứng viên. Bộ bàn giao hiện hành: [ma trận](docs/FINAL_FEATURE_ACCEPTANCE.md), [tests/native gate](docs/FINAL_TEST_RESULTS.md), [demo](docs/FINAL_DEMO_SCRIPT.md), [checklist](docs/FINAL_DEFENSE_CHECKLIST.md), [kiến trúc](docs/FINAL_SYSTEM_ARCHITECTURE.md). Không cần toàn bộ migration production Phase13.5 để demo DEV; automatic physical vẫn cần calibration/trust/approval riêng.

## Nghiệm thu cuối software MVP —29/10/2026

**MVP_DEV_UI_ACCEPTED · MVP_DEV_SOFTWARE_ACCEPTED · COMPLETE_VERIFIED_DEV** trong phạm vi DEV/SIMULATOR và command execution bị khóa.

Bốn ca live phân trang đều PASS: SOIL trang2→LIGHT trang1 với8 dòng0; FarmA→FarmB trang1 với đúng dữ liệu mới; xóa/chọn lại zone về trang1; điều hướng1→2→1 không bị reset vô điều kiện. Lỗi Trang2/1 đã được đóng bằng DB–API–UI evidence thật, không chỉ unit test.

Phiên17:16:37–17:17:39UTC+7:4 ca pagination mới +6 gate offline/runtime/safety PASS,0FAIL. Không chạy lại43API/22checkpoint/CRUD/polling đã PASS. Readings41→41,0fixture mới; normal login có thể ghi ActivityLog. Commands/Automationfalse,DeviceCommand0/PENDING0; frontend/backend/TEST đã dừng graceful. Không production/MQTT/hardware actions.

**P0 software còn mở:0 trong phạm vi nghiệm thu này.** Vẫn giữ PROJECT_NOT_READY_FOR_DEFENSE,REAL_ESP32_E2E_NOT_VERIFIED,AUTOMATIC_PHYSICAL_NOT_VERIFIED. ComputedSHADOW thiếu targetDEV,native hidden/resume và profiling dài hạn giữNOT_VERIFIED. [Báo cáo A–I](MVP_DEVELOPMENT_RUNTIME_ACCEPTANCE.md). Các phần bên dưới là lịch sử, không phải blocker hiện hành.

---


## Cập nhật mới nhất29/10/2026 — FINAL UI GAP CLOSURE

**MVP_DEV_UI_PARTIAL — chỉ còn một lỗi phân trang History đã sửa offline nhưng chưa xác minh lại live.** Các khoảng trống no-data, responsive390/768/1440, history/chart/statistics/customrange/CSV, alerts OPEN→ACK→RESOLVED, user create/edit/role/disable/reactivate/validation, logout/Axios401 và Irrigation bị khóa đã có bằng chứng Edge + API DEV thật.

Phiên16:45:08–16:46:53 dùng duy nhất existing TEST/DEV.22 checkpoint PASS (gồm offline/runtime/UI),27 screenshots,243 browser API responses. Một case tự động ban đầu ghiHARNESS_ERROR được đối chiếu screenshot/API và xác định là **APPLICATION_FAIL**: đổiSOIL trang2 sangLIGHT vẫn giữpage2 dùtotalPages1. Không coi đây là lỗi selector và không sửa evidence gốc. Đã thêm resetpage1 ở ba filterhandlers; regression trên trangHistory thực với servicesmock offline1/1PASS, frontend typecheck/lintPASS. Chưa restart/live rerun sau sửa.

Commands/Automationfalse,DeviceCommand0→0/PENDING0,TESTstopgraceful/shutdown/noDEVports. Readings38→41 do3mẫuSIMULATOR cho alertfixture riêng; user mới được giữACTIVE,roleFARM_OWNER; demoaccounts gốc nguyên vẹn. Không provisioning/migration/reset/production/MQTT/hardware. SHADOW_PREVIEW_NOT_VERIFIED_DEV giữ identityguard và là ngoại lệ được phép trong scope này.

Các PASS polling/auth/dashboard trước được kế thừa, không chạy lại để cộng số. Xem [PART A–J mới nhất](MVP_DEVELOPMENT_RUNTIME_ACCEPTANCE.md). PROJECT_READY_FOR_DEFENSE vẫn chưa đạt; các phần dưới là lịch sử.

---


## Cập nhật hiện hành29/10/2026,16:15 — MVP_DEV_UI_PARTIAL

**Đã mở được React trên Edge thật, lỗi Tailwind/CSS500 đã được đóng trong live DEV.** Phiên mới có13 checkpoint PASS (gồm9 nhóm browser và4 gate offline/runtime),1 checkpoint FAIL do selector harness,1 NOT_VERIFIED và1 NOT_REQUIRED. Không cộng các checkpoint này với43 API checks,6 nhóm CRUD hoặc6 CSS tests lịch sử.

Đã xác minh: login OWNER/ADMIN/STAFF, invalid/inactive401/403, route/API RBAC, dashboard4sensor vàLIGHT0; một reading SIMULATOR mới42.625 xuất hiện sau9865ms qua polling **không F5**, DB/API/UI timestamp khớp09:14:34.607Z=16:14:34 giờ Việt Nam. Scope switch có delayed request thực, error/recovery và unmount11s không request cũ đều PASS. Có9 screenshots và76 API responses trong browser evidence.

Phiên dừng đúng quy tắc khi case no-data dùng exact-name thiếu suffix sensorCode. Đây là **lỗi harness**, chưa phải bằng chứng no-data UI hỏng. API trả200/latestReading=null. Đã sửa selector theo card/TEMP_EMPTY và1 test offline với component thực PASS; không khởi động lại DEV. History/charts/alerts/user mutations/logout/Irrigation-SHADOW live còn NOT_EXECUTED.

Cleanup PASS: frontend15796/backend23488 exit0, other clients0, TEST smart-stop exit0/state shut down, không listener55433/55001/55173. DeviceCommand0→0/PENDING0, enabled automation0. Readings37→38, tất cảSIMULATOR; giữ đúng một reading acceptance, không seed/migration/provisioning. Historical evidence hash nguyên vẹn; không production/MQTT/hardware actions. PROJECT_READY_FOR_DEFENSE chưa đạt.

[PART A–K](MVP_DEVELOPMENT_RUNTIME_ACCEPTANCE.md). Các mục bên dưới là lịch sử; bản sửa selector sau cleanup không được tính thành live PASS.

---


## Cập nhật mới nhất29/10/2026 — MVP_DEV_UI_AND_CRUD_PARTIAL

Phiên startup/acceptance **một lần trên DEV hiện hữu**: TEST55433 → backend55001 → frontend55173; không initdb/provision/seed/migration/reset. **6 nhóm API/CRUD PASS**,26 HTTP requests với status200/201/403/404/409 đúng contract. Hai browser checks FAIL do **/src/index.css HTTP500**, ứng dụng chưa render được. Không có browser application API request hoặc screenshot nghiệm thu hợp lệ; không nâng UI E2E thành PASS.

Root cause đã xác định và tái hiện offline: launcher chạy từ private cwd, Tailwind không tìm được theme frontend, lỗi ring-brand-500. Đã sửa riêng DEV launcher để dùng cấu hình CSS tường minh; **6/6 tests liên quan PASS** (bao gồm phép tái hiện lỗi và compile CSS thật sau sửa). Bản sửa **chưa được chạy live**, không có startup/retry thứ hai. Hai FAIL trước vẫn được giữ nguyên.

Cleanup PASS: frontend/backend exit0, other clients0, TEST smart-stop exit0, control state shut down, không listener55433/55001/55173. DeviceCommand0→0/PENDING0, automation enabled0; gateway DISABLED/controlEnabled=false. Production listener metadata trước/sau không đổi; không kết nối production hoặc MQTT thật. Evidence cũ của phiên28/10 hash không đổi.

[PART A–J và evidence](MVP_DEVELOPMENT_RUNTIME_ACCEPTANCE.md). Các phần bên dưới là lịch sử; không cộng suite trùng hoặc tái dùng execution marker đã tiêu thụ.

---


## Cập nhật hiện hành28/10 — MVP_DEV_SOFTWARE_PARTIAL

Đã tạo database/roles DEV trên TEST55433, apply đúng11 migrations;43 kiểm tra API/DB thực tế PASS,15 lifecycle/guard tests và backend/frontend typechecks PASS. Native orchestration được kiểm chứng với server thật, không chờ descendant EOF. Backend55001/frontend55173 đã phục vụ đúng DEV, Commands/Automation=false/testMode=true/cap1s/DeviceCommand0. Tất cả process phiên đã dừng graceful, TEST shut down, data giữ nguyên.

**Chặn MVP còn lại:** browser live acceptance chưa chạy vì Edge lookup lỗi trong môi trường tối giản. Đã sửa đường dẫn Edge và smoke offline PASS, nhưng không tính thành UI PASS. DELETE CRUD/user mutations còn thiếu coverage. Không provisioning/migration lại; bước tiếp theo ngắn là acceptance-only trên existing DEV sau khi duyệt startup tương ứng. PROJECT_NOT_READY_FOR_DEFENSE vẫn giữ; không cần production migration/hoàn tất toàn bộ Phase13.5 để demo software. [Báo cáo A–K](MVP_DEVELOPMENT_RUNTIME_ACCEPTANCE.md).

Các note recovery/auth BLOCKED bên dưới là lịch sử và đã được thay thế.


**Kết quả mới nhất28/10: MVP_TEST_CREDENTIAL_RECOVERY_PASS.** Reset1/auth1/start1/smart-stop1, native exits0, TEST55433 đúng systemID và đã shut down. Blocker credential đã tháo gỡ; DEV chưa provision/start/acceptance, PROJECT_NOT_READY_FOR_DEFENSE vẫn giữ. Production và phần cứng không bị tác động. [Báo cáo hiện hành](MVP_DEVELOPMENT_RUNTIME_ACCEPTANCE.md). Các checkpoint bên dưới là lịch sử.

**Latest TEST recovery diagnostic:** runner exit1 root cause identified as missing system PATH in the cleared .NET child environment. Reproduced failure and fixed pipeline with synthetic input only;18/18 related tests PASS plus native offline transport checks. Real reset/authentication still pending; no production or DEV startup. See [current report](MVP_DEVELOPMENT_RUNTIME_ACCEPTANCE.md).

**TEST recovery checkpoint28/10 (newer than direct-auth failure):** operator confirmed original credential unusable. Offline TEST backup6764files/188362787bytes verified; single-user READ ONLY proved phase13_test_admin exists with LOGIN/provisioning privileges, exit0.16/16 related offline tests PASS; reset/authentication pending local operator confirmation/password entry. [Current recovery evidence](MVP_DEVELOPMENT_RUNTIME_ACCEPTANCE.md). No DEV provisioning/startup, production writes or hardware actions. Prior authentication failures remain historical; role absence/insufficient privilege is no longer an unverified hypothesis. No live acceptance status is upgraded yet.

Cập nhật: **28/10/2026**. Source audit tại `C:\DATN\Project_datn`; báo cáo này là đầu mối nghiệm thu MVP, không thay đổi các bằng chứng lịch sử.

**Kết luận hiện tại: PROJECT_NOT_READY_FOR_DEFENSE.** Phần lớn chức năng MVP đã có code; những việc chặn chính là backend demo chưa chạy, nghiệm thu tích hợp cuối chưa hoàn tất và chưa chốt tưới tự động sẽ được bảo vệ ở mức SHADOW hay phần cứng. Không cần mở thêm một chuỗi phase hardening để xử lý các blocker này.

**Cập nhật DEV acceptance 28/10:** [báo cáo chính](MVP_DEVELOPMENT_RUNTIME_ACCEPTANCE.md) kết luận BLOCKED. TEST55433 đúng systemID đã start một lần, nhưng xác thực phase13_test_admin bị từ chối; không provisioning/migration hoặc startup ứng dụng. Đã smart-stop TEST, giữ data/evidence, không retry. Regression556/556 và3 runner tests PASS không thay live DEV acceptance.

**Cập nhật mới hơn — direct psql:** phiên riêng được phê duyệt đã dùng prompt native `psql -W`, không Read-Host/PGPASSWORD; vẫn FATAL authentication failed, exit2. TEST start/stop exit0, cuối phiên shut down; không thêm role/database DEV. Verdict hiện hành **MVP_DEV_AUTH_BLOCKED**;8 direct-candidate tests PASS chỉ là offline. Cần xác minh credential TEST hoặc phương án recovery TEST được duyệt riêng, không tự retry/reset hoặc chuyển production.

## Phạm vi và phương pháp

Đã đối chiếu routes/services/repositories/validators, main Prisma schema và11 thư mục migration, MQTT adapter/gateway/presence, React routes/pages/polling, firmware13.4F.1, Mosquitto examples, recovery scripts và các báo cáo Phase12D4,13.3B,13.4C/F2/G/H,13.5A/B/C/D và R2.4. Không đọc lại config secrets hoặc binaries chứa secrets. Không tuyên bố đã đọc từng byte của mọi artifact lịch sử.

Yêu cầu chức năng lấy từ [PROJECT_CONTEXT](docs/PROJECT_CONTEXT.md), README, [API_AND_RBAC](docs/API_AND_RBAC.md), schema và source. Chưa có bản yêu cầu của hội đồng/khoa xác nhận cho phép thay tưới tự động vật lý bằng SHADOW. Vì vậy đó là **đề xuất phạm vi demo**, không phải tự miễn một yêu cầu đồ án.

[GitHub được cung cấp](https://github.com/khoii1/Project_DATN) vẫn hiển thị baseline Phase1–11 và một commit tại lần kiểm tra web. Local HEAD `94933de` (24/09/2026) cũng là initial upload; workspace có nhiều thay đổi/untracked từ các phase sau. Audit dựa vào workspace, không coi clone GitHub là bản có đủ Phase13. Chưa commit/push; trước bàn giao phải review secrets và đóng gói source có thể tái lập.

## Đã có gì

| Thành phần | Code thực tế | Mức bằng chứng |
|---|---|---|
| JWT, bcrypt, ADMIN/OWNER/STAFF, farm scope | auth middleware/service, farm-access, protected/role routes | Service/middleware offline mới PASS; chưa chạy lại API/DB thật cho toàn ma trận quyền |
| User/Farm/Staff/Zone/Crop/Device/Sensor/Actuator | Routes, repositories, forms/pages, main Prisma schema | Implemented; CRUD integration cuối chưa nghiệm thu trong đợt này |
| Telemetry DHT22/BH1750/soil | ESP32→Mosquitto→MQTT adapter→ingestion→SensorReading | Có nghiệm thu phần cứng/SQL/API lịch sử; không có receipt mới từ backend hiện đang dừng |
| Presence, periodic OFF, polling | TTL/watchdog90s, periodic OFF15s, UI polling10s/irrigation2s | Unit PASS; browser mock irrigation PASS; phần cứng recovery có bằng chứng lịch sử |
| History/chart/alerts/reports/CSV/activity logs | Có service/schema/UI; alert hysteresis, scope, CSV escape | Code + một phần unit; live/browser acceptance toàn nhóm còn thiếu |
| Tưới thủ công MQTT | CommandId/expiry/QoS1/retain=false, ACK validation, cap1s ở test mode | Mock browser PASS; lịch sử bơm chạy/tự dừng nhưng **PHYSICAL_PUMP_PARTIAL**, không nâng thành PASS |
| Tưới tự động | Legacy threshold evaluator; pure SHADOW engine/preview; live observation; persistence foundation | SHADOW/offline PASS; không có VERIFIED_LIVE/ACTIVE an toàn được nghiệm thu |
| Sáu ledger irrigation | Foundation + adapter khóa đúng test DB55433, SQL proposals | Có59/59 SQL isolated lịch sử; **không production wiring/migration** |
| Backup/restore | Production archive và recovery riêng đã được báo cáo kiểm chứng | C.7 có nghiệm thu15bảng/34.205dòng; không chạy lại backup/restore trong audit |

## Runtime snapshot đợt audit

Read-only listener check ngày28/10/2026:

- **Không có listener5000 hoặc5173** trước kiểm thử. BACKEND_NOT_RUNNING được chứng minh ở mức listener; nguyên nhân process dừng **UNKNOWN**, không suy ECONNREFUSED cũ là lỗi gốc.
- PostgreSQL5432 PID7848 có listener; broker LAN1883 PID9052 và broker loopback PID4572 có listener. Đây chưa chứng minh DB identity, MQTT client authenticated/subscribe hoặc pipeline healthy.
- Không listener55433/55434/55435. Không khởi tạo cluster55435/R2.5.
- Không kết nối DB/broker, mở COM hoặc dùng credentials để lấy live evidence trong đợt này. ESP32 hiện ONLINE/OFFLINE, readings/OFF mới, PENDING và tổng command **NOT VERIFIED hiện tại**.
- Flags của serving backend không thể attest khi backend không chạy. `AUTOMATION_ACTIVE=false` trong đợt làm việc nghĩa là agent không khởi chạy/bật automation; không thay cho runtime chứng minh qua API/process. Không lấy `.env` hay snapshot PENDING0 cũ làm bằng chứng mới.

Trong QA browser chỉ chạy static server loopback port ngẫu nhiên rồi đóng; không start frontend dev hoặc backend production.

## Những giới hạn thật sự còn mở

1. **Backend/live acceptance:** không có website dữ liệu thật end-to-end khi API5000 dừng. Cần phiên recovery riêng, sau đó3 batch/12 readings +3 OFF mới + browser không F5.
2. **Phạm vi automation:** SHADOW có thể trình diễn, phải ghi rõ mô phỏng. Nếu yêu cầu bắt buộc tưới tự động phần cứng, dự án vẫn thiếu một phần chức năng cốt lõi; không dùng test mocks để công nhận.
3. **CRUD/RBAC/charts/alerts cuối:** cần chạy trên development DB riêng đã duyệt, không chạy các API suites có ghi dữ liệu vào production.
4. **SOIL:** phần trăm LM393 chưa phải độ ẩm đất đã hiệu chuẩn/đo chuẩn. Nêu calibration dry/wet, dao động ADC và giới hạn cảm biến; không coi0% là missing.
5. **Phần cứng:** [Phase12D4](docs/PHASE12D4_PHYSICAL_PUMP_ACCEPTANCE.md) giữ PARTIAL: haiON riêng có chủ đích, thiếu xác nhận nước và E2E UI/đo xung độc lập. Approval cũ đã dùng; không tái sử dụng.
6. **Clock/reliability:** hotfix13.4F.1 được flash/boot và260s ổn định trong lịch sử; SNTP callback refresh30phút/recovery thực và Windows stability dài hạn chưa được nghiệm thu. Không bắt chờ60phút cho mỗi demo ngắn; vẫn ghi giới hạn và giữ timestamp guard.
7. **Credentials/handoff:** Wi-Fi/device MQTT secrets từng lộ output; rotation chưa được chứng minh hoàn tất. Không tự thay trong audit. Trước đưa hệ thống/firmware cho người khác hoặc dùng mạng chung phải xử lý theo phê duyệt riêng. Backend credential chưa có bằng chứng trực tiếp lộ; không khẳng định ngược lại.

Các giới hạn command cần nói đúng: UUID chống thực thi lại **cùng command** không phải HTTP idempotency key cho mọi lần click; hai request mới có thể tạo hai UUID. Serial lock trong service nằm trong RAM một process, dù DB có pending/transaction guards; không suy thành nghiệm thu đa instance. Firmware có timestamp guard2s và monotonic fail-safe, nhưng clock-health observation chưa phải một authorization adapter hoàn chỉnh cho mọi manual command. Không nới các guard này để trình diễn.

## Công việc offline đã hoàn thành trong đợt này

- Chuẩn hóa5 tài liệu nghiệm thu, sửa thông tin README/PROJECT_CONTEXT đã lỗi thời và thêm liên kết từ tài liệu cũ.
- Thêm `npm run qa:offline`: allowlist, env sạch, chặn `.env`/runtime config và chỉ cho HTTP mock loopback do chính test tạo; không launcher/SQL/production.
- Bổ sung10 core tests: bcrypt/JWT/login/audit, account inactive, stale JWT role, authorization, farm scope và alert boundaries;4 boundary-guard tests.
- Thêm browser mock E2E và `demo:simulation`: built React thật, API bị intercept, banner SIMULATION, kiểm tra command-disabled/UNKNOWN/OFFLINE/PENDING/REJECTED/APPLIED/TIMEOUT/SHADOW/route STAFF, không tới DB/MQTT.
- Offline556/556 PASS, browser11 checks PASS, backend typecheck/frontend build/lint PASS, firmware host suite PASS. Xem [FINAL_TEST_REPORT](FINAL_TEST_REPORT.md) để phân biệt loại evidence.
- Không sửa domain/runtime backend, schema, firmware hoặc safety policy. Không gọi recovery/initdb/DDL/seed/commands hoặc hardware.

## Đường đi ngắn nhất

**Chốt phạm vi demo → approval recovery backend đúng target hoặc development target riêng → live monitoring/DB/API/browser acceptance → CRUD/alerts trên DB dev → tổng duyệt và bàn giao.** SHADOW demo được chuẩn bị song song, không phụ thuộc6 ledger production hoặc R2.5.

Không cần hoàn thành toàn bộ Phase13.5 trước demo monitoring/thủ công đã phê duyệt + automation SHADOW. Migration production là nhánh riêng. Nếu quyết định tiếp tục đường recovery gate D.1G hiện tại, R2.5 cần approval mới, nhưng initdb55435 không phải dependency kỹ thuật của REST monitoring hiện có.

## Khi nào được tuyên bố PROJECT_READY_FOR_DEFENSE

- Phạm vi đã chốt với yêu cầu đề tài; nếu automatic hardware bắt buộc thì phải nghiệm thu riêng, nếu không phải công khai SHADOW.
- Môi trường demo tái lập, đúng target, không secrets; startup/stop đã tổng duyệt, biết cách khôi phục mà không migration/seed tùy tiện.
- Tài khoản/quyền và CRUD cross-farm đạt; dữ liệu thật4 sensors lưu DB/trả API/hiển thị browser mới đúng thời gian, chart/history/alert được kiểm tra.
- Manual pipeline có bằng chứng phù hợp phạm vi; mọi kiểm thử phần cứng mới có approval/giám sát/ngắt nguồn, không dùng approval cũ.
- Mock/live/historical evidence phân biệt rõ; không lỗi console/API chặn demo; checklist P0 đóng hoặc giới hạn được người phụ trách nghiệm thu chấp nhận rõ ràng.
- Source package, migration baseline, cấu hình mẫu,5 tài liệu và kịch bản dự phòng được review; không coi bản local uncommitted là đã bàn giao GitHub.

Hiện chưa đáp ứng các điều kiện trên. Chi tiết: [matrix](FINAL_ACCEPTANCE_MATRIX.md), [P0/P1/P2](REMAINING_WORK_P0_P1_P2.md), [demo](END_TO_END_DEMO_PLAN.md).
