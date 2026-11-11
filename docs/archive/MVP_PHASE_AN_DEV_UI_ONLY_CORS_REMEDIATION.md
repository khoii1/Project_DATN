# Phase AN — Offline DEV UI-only CORS Preflight Remediation

Ngày04/11/2026 UTC+7. **READY_FOR_NEW_MANUAL_UI_ACCEPTANCE_APPROVAL**. Chỉ dedicated DEV shell, offline synthetic tests và deliberate manifest revision. Không mở lại Website hoặc PostgreSQL.

## A. Actual login failure evidence và completed-session safety gate

Kế thừa [DEV CORS diagnosis](MVP_DEV_LOGIN_CORS_DIAGNOSIS.md), [AI](MVP_PHASE_AI_OFFLINE_DIAGNOSIS.md), [AM](MVP_PHASE_AM_UI_ONLY_ACCEPTANCE.md) và các private run artifacts. Giữ nguyên tất cả reports/verdicts lịch sử.

Phiên reopen `ui-only-historical-1793797684089-967ac6b5fb94` đã kết thúc trước sửa source:

- Manual window ended2026-11-04T13:18:15.428Z, accepted=false/MANUAL_WINDOW_EXPIRED.
- Bounded post-verification completed13:18:15.579Z; baseline/final digest cùng `21bdae653168d6b5768c90762ad08272cd093f32e008e16a02cf173b7c593771`; ActivityLog68→68.
- Frontend20268 và API20840 graceful stop native0; pg_ctl smart stop4544/native0.
- Summary cluster STOPPED_GRACEFULLY, finished13:18:17.760Z; final control identity/shutdown/ports checks completed theo reviewed runtime.
- Supervisor17752 exit3/unknownfalse/stderr0; tool session81682 completion exit3/chunk11753b. Known policy failure vì manual incomplete, không native crash/UNKNOWN.
- Read-only listener check không có55433/55001/55173; postmaster.pid absent. Known source/runtime child PIDs không còn. Một lần lookup historical launcher PID1992 có entry tạm thời; recheck sau đó không còn, không force-kill hoặc gán đó là owned live launcher chỉ từ PID cũ. Actual launcher completion đã được tool xác nhận riêng.

Source không được sửa khi session còn hoạt động. Không dùng lại approval/attempt của session đó; AN không tạo live attempt mới.

## B. Direct POST success đối chiếu browser preflight403

Historical diagnosis: một direct POST loopback55001/api/auth/login trảHTTP200/success=true/message Đăng nhập thành công/tokenReturned=true. Secret/token không xuất vào report/tool output. Served frontend api.ts có đúng API55001 target. Browser-equivalent OPTIONS với Origin55173/requestedPOST/content-type trảHTTP403/body UI_ONLY_READ_ONLY.

Đây là evidence đã thu trước AN. AN không thử lại real login, không reset mật khẩu hoặc mở API để tái hiện.

## C. Root cause

`scripts/mvp-ui-only-api.cjs` tạo outer Express shell, routeAllowed rejection chạy **trước** actual app.ts CORS middleware. Original routeAllowed chỉ nhận GET/HEAD và exact POST auth login/logout; OPTIONS bị403 trước khi tới CORS. JSON/Authorization cross-origin requests của browser vì thế bị chặn, mặc dù direct API authentication hoạt động.

**DEV_UI_ONLY_CORS_PREFLIGHT_REJECTED**. Không có bằng chứng lỗi password/JWT/authentication cần sửa.

## D. Minimal source changes

Chỉ hai existing source/test files được chỉnh:

| File | Thay đổi |
| --- | --- |
| scripts/mvp-ui-only-api.cjs | Restricted preflight policy và outer HTTP middleware; actual routeAllowed giữ nguyên byte/function logic |
| scripts/mvp-ui-only.test.cjs | Positive/negative middleware tests, synthetic HTTP integration qua actual Express CORS/auth, manifest lineage regression; fake user lookup hỗ trợ cả email và ID cho /auth/me |

Tại actual shell, anonymous routeAllowed-only middleware được thay bằng `shell.use(uiOnlyHttpBoundary)` trước `shell.use(app)`. OPTIONS được kết thúc ngay tại boundary. Non-OPTIONS vẫn dùng chính routeAllowed cũ, không được cấp thêm quyền. Không tạo module/runtime dependency mới, không đổi sourceFiles membership.

Không sửa production app.ts, cors config, auth service, JWT, password semantics, API client, ORM READ ONLY, worker, supervisor, firmware, broker hoặc database schema/data.

## E. Exact Origin / method / path / header policy

- Exact origin duy nhất `http://127.0.0.1:55173`; không wildcard/localhost/HTTPS/port khác/null/missing/multi-origin.
- Chỉ HTTP OPTIONS mới vào preflight policy; required requested method là GET, HEAD hoặc POST hợp lệ.
- Method/path phải qua original routeAllowed. POST chỉ exact `/api/auth/login` hoặc `/api/auth/logout`.
- Read preflight có explicit catalogue theo routes hiện hữu: health, auth/me; list/detail users/farms/zones/crops/devices/sensors/alert-rules/alerts/actuators/automation-rules; farm staff/staff-candidates; device latest-readings; sensor readings/chart/statistics; activity-logs và reports overview/sensors/alerts/irrigation/automation/export. Dynamic ID chỉ ASCII letters/digits/underscore/hyphen. Không wildcard generic OPTIONS pass-through.
- Read routes bị original gate cấm như device-commands/live-evidence/shadow-preview vẫn bị cấm preflight. Unknown path/extra suffix bị từ chối. Matching route shape không thay application auth/ID validation hoặc bảo đảm record đó tồn tại.
- Reject absolute/network-path URL, double slash, dot segments, percent-encoded path, backslash, fragment, control/whitespace. Không normalize một path lạ thành path được phép. Query string thông thường vẫn được phép trên read route đã match; path matching không bị query thay đổi.
- Requested headers chỉ Content-Type và Authorization, case-insensitive; OWS quanh comma tokens được trim đúng semantics của header names. Không trim/normalize password. Header array, unsupported/empty/malformed token, duplicate case-insensitive token hoặc duplicate/conflicting raw Origin/method/request-headers fields bị từ chối.
- Header list absent được phép nếu các gate khác đạt; không xuất Allow-Headers khi không requested header. Không phản chiếu arbitrary header input; canonical validated names được trả lại.

Valid response: HTTP204, empty body, exact Allow-Origin, Allow-Methods chỉ requested permitted method, Allow-Headers chỉ validated requested names; Vary gồm Origin, Access-Control-Request-Method, Access-Control-Request-Headers. Không thêm Allow-Credentials hoặc Max-Age.

Actual requests tiếp tục vào original app CORS sau unchanged routeAllowed. Existing production app CORS có credentials=true; AN không thêm/đổi field đó và không cần cookie transport để sửa login. Frontend hiện dùng bearer token, không axios withCredentials. Preflight mới không bật credential sharing.

## F. Positive/negative offline CORS tests

Positive: login/logout, GET auth/me Authorization, sensor history, HEAD chart, health không requested header; case-insensitive allowed header names. Assertions204/bodyempty, exact headers/Vary, no credential/cache header và next không được gọi.

Negative: localhost/wrongport/null/missing/HTTPS/trailing-slash/combined/array origins; PUT/PATCH/DELETE/OPTIONS/lowercase/missing/combined methods; unsupported/malformed/empty/duplicate/conflicting headers; command/actuator/irrigation POST, ordinary read-route POST, forbidden GET/HEAD, unknown routes; ambiguous/encoded/traversal URL; non-preflight OPTIONS; actual forbidden mutations. Raw duplicate field checks không chỉ dựa vào Node merged headers.

Pure middleware tests có next sentinel: bất kỳ dispatch tới auth/DB/MQTT/command/automation đều fail test; hợp lệ và bị từ chối đều kết thúc tại shell. Đây là test logic, không live authorization.

Integration mở **một ephemeral synthetic loopback port0** được existing offline guard cho phép, không API55001/frontend55173. Shell dùng actual boundary và actual Express app/CORS/auth/JWT nhưng injected fake datasource, synthetic bcrypt credential và memory audit. Test OPTIONS204 không tăng transaction/read/write/auth audit count; actual POST login200 đúng allow-origin/success/user/token shape; GET/me preflight và authenticated GET/me200; actual POST actuator command403. Token không được in. Server đóng trong finally. No PostgreSQL/MQTT connection.

## G. READ ONLY / command-deny regressions

Six-path tests single/concurrent/batch/callback/nested/actual repository, transaction identity/read-only ordering, audit baseline/count-change/errors và refusal-before-listen vẫn PASS. Mutation/raw/new-client escapes, wrong target/config, startup side-effect deny, command-recovery/watchdog/MQTT import boundaries và actual forbidden POST vẫn PASS. Không thử DML trên DB thật. Không dùng synthetic PASS thay actual SQL hoặc browser evidence.

## H. Native test / syntax / typecheck results

Final related suite: **217/217 PASS**, fail0/cancelled0/skipped0/todo0, Node test PID14876/native0, tool completion0. Command:

```powershell
node --require ./scripts/acceptance-offline-guard.cjs --test --test-concurrency=1 --test-reporter=tap scripts/mvp-ui-ai.test.cjs scripts/mvp-ui-only-pin-audit.test.cjs scripts/mvp-ui-only-supervisor.test.cjs scripts/mvp-ui-only.test.cjs scripts/mvp-ui-launcher-exit.test.cjs scripts/mvp-edge-smoke-observer.test.cjs scripts/mvp-edge-smoke-analysis.test.cjs scripts/mvp-browser-startup-diagnosis.test.cjs scripts/mvp-preflight-boundary.test.cjs
```

Evidence directory `build/phase-an-regression-1793798940799/`: stdout.txt TAP, empty stderr.txt, outcome.json, integrity.json. TAP SHA256 `032cd424cf962840ba9565305b3d5197bb3f7e4a01d343f08312c6fef53b0310`.

Native capture giữ .NET Process handle, finite120s wait, async output capture; code0 được đọc từ process ExitCode và tool cũng0. Không Node source stdin/pipeline hoặc force-success. Không dùng stdout TAP để thay native exit.

- Backend typecheck native0/PID16168, `build/phase-an-backend-typecheck-1793798940814/`.
- Frontend typecheck native0/PID20504, `build/phase-an-frontend-typecheck-1793798940819/`.
- Node --check API/test native0 trước/sau regression. Existing PowerShell AST/native helper regressions PASS; không sửa PS launchers.

Intermediate evidence được giữ: first targeted140/141, fake /auth/me fixture trả401 vì findUnique fixture chỉ lookup email, chưa lookup ID; sửa đúng synthetic fixture, không auth production. Targeted rerun141/141 PASS. Sau bổ sung lineage test và manifest5, full217/217 PASS. Không xóa log lỗi hoặc giả sốPASS; không live retry.

## I. Manifest revision4 → 5

Exact revision4 bytes giữ create-new tại `docs/PHASE_AE_UI_ONLY_SOURCE_MANIFEST.rev4.json`, hash:

`b0c8974c6c4244652951963cae28f4eb9d56f07a562de9e32df6c5e16a015d56`

Active manifest `docs/PHASE_AE_UI_ONLY_SOURCE_MANIFEST.json`, revision5, version1/purpose SOURCE_PINS_ONLY_NOT_EXECUTION_APPROVAL; previousManifestFile/Sha256 trỏ exact rev4, không self-reference. **250source members và fourruntime pins giữ nguyên**. SourceHashes chỉ API shell entry đổi; offlineTestHashes chỉ UI-only test entry đổi. Revision reason mô tả reviewed CORS fix. Không đổi preparedAt như một approval mới.

**Final revision5 SHA256:**

`bb073209114dd4ed5bbf76abd10e1407a9e4f5a27f87e97b07ace63d78d780e5`

Final native0 audit kiểm tra250/250hashes, exact runtime sourceFiles membership, canonical paths/no duplicates/traversal/reparse, fourbinary hashes/runtime pins unchanged, offline test hashes và rev4 lineage. Actual active filesystem pin regression cũngPASS. Không execute PostgreSQL binaries để hash.

## J. Changed source/test hashes

| File | SHA256 |
| --- | --- |
| scripts/mvp-ui-only-api.cjs | cbcda103f9e7ea9584462c034a8b988b23080513cc4181789c747324e275f721 |
| scripts/mvp-ui-only.test.cjs | ecc6ad625ee75e44e262374c7bd41055df395c0f538b78d4b41bc3f9d8d610a5 |

Other added/changed artifacts: preserved rev4 manifest, active rev5 manifest, this report and offline build evidence. No other runtime source changes. Historical diagnosis/reports unchanged.

## K. Runtime binary hashes — unchanged

| Binary | SHA256 |
| --- | --- |
| Node node.exe | fdddbf4581e046b8102815d56208d6a248950bb554570b81519a8a5dacfee95d |
| PostgreSQL17 pg_ctl.exe | fc644446b0236e623e3e6fe2699446259efb8e61bd9aba838d6394a2be6987b8 |
| PostgreSQL17 pg_controldata.exe | 6896f8a705afb5cbaad843017d6d8aed5f5d76e32b3179e66750aaa5f193cc40 |
| PostgreSQL17 postgres.exe | 94a8ea85cffd4a15c21290ca555a06438d3f7621b001bea6b1373c210d5a1746 |

## L. Safety / no-live-execution

AN không start/connect PostgreSQL, actualAPI55001/frontend55173/browser, MQTT, production, broker; không reset credential, migration/restore/seed, DeviceCommand/ON/OFF/Automation, ESP32 reset/flash hoặc pump action. Không decrypt credentials trong AN. Không đổi tám mapped records hoặc twelveYreadings. Final read-only snapshot: DEV listeners0/postmaster.pid absent.

Offline suites dùng fake pool/processes và ephemeral synthetic HTTP test; related AST/native tests tạo synthetic helper processes như suite hiện có, không DEV runtime. Không gọi synthetic loopback test là OS network-isolated hoặc actual browser acceptance. Không tuyên bố current production flags/PENDING từ source.

## M. Remaining blockers / rollback

Actual browser login/render/data/history/charts/timezone/historical/SOIL notices, control-disabled visual state và screenshots **NOT_VERIFIED**. Soil quality vẫnBLOCKED. Source fix này không chứng minh live MQTT, calibration hoặc irrigation readiness. Giữ AK historical UNKNOWN và previous manual outcomes.

Rollback chỉ khi có nhu cầu review: loại bỏ added preflight policy/boundary, phục hồi original shell middleware/export và tests theo baseline, rồi xác minh source/test hashes khớp preserved rev4 trước dùng manifest4. Không chỉ đổi manifest về4 khi code vẫn5. Không rollback DB/credentials vì AN không sửa. Không thực hiện rollback trong phase này; không destructive cleanup evidence.

## N. Proposed separate browser acceptance

Sau phê duyệt mới, dùng reviewed UI-only session launcher với fresh genuine approval/plan/attempt, **manifest5 SHA256 ởI**, max1/no retry/manual window hữu hạn. Không dùng AM/AK/reopen approvals hoặc source pins cũ. Fresh source/runtime/cluster identity checks, isolated55433,11migrations/8mapping/12readings, actualsixpathREADONLY và persisted audit baseline phải PASS trước serving.

Trước gửi Website cho operator: kiểm tra actual correct-origin login OPTIONS204; actual login200 không log token; operator tự mởEdge/login đúng DEV account hiện hữu. Không reset mật khẩu nữa. Xác minh history/charts/data/timezone/historical/SOIL warnings, disabled controls và real screenshots. Bounded post-check và owned graceful cleanup bắt buộc, no extension/retry. Không execute procedure này trong AN.

```text
PHASE AN RESULT

Root cause: DEV_UI_ONLY_CORS_PREFLIGHT_REJECTED
DEV-only CORS fix: OFFLINE_PASS
Login preflight synthetic: PASS
GET authorization preflight: PASS
Forbidden route/method denial: PASS
Actual request CORS: OFFLINE_PASS
READ ONLY regression: PASS
Command/MQTT/Automation deny: PASS
Offline tests: 217/217 PASS
Backend typecheck: PASS
Frontend typecheck: PASS
Manifest revision5: 250/250 PASS
Runtime binary hashes: 4/4 PASS
Actual API: NOT_STARTED
Actual frontend: NOT_STARTED
Actual browser login: NOT_VERIFIED
PostgreSQL: NOT_STARTED
MQTT CONNECT: 0
DeviceCommand/ON/OFF: 0
Soil quality: BLOCKED
Final: READY_FOR_NEW_MANUAL_UI_ACCEPTANCE_APPROVAL
```

**STOP sau Phase AN. Không tự mở Website hoặc chuyển phase.**
