# Phase AE - Supervised UI-Only Historical Acceptance Preparation

Report date: 03/11/2026. Scope: implementation and offline tests only; real execution has not been performed.

Previous phases: [ESP32 E2E acceptance report](MVP_REAL_ESP32_END_TO_END_ACCEPTANCE.md).

> Baseline update, 03/11/2026: [Phase AG](MVP_PHASE_AG_RUNTIME_PIN_REMEDIATION.md) corrected the invalid postgres.exe pin after historical-provenance review. Active source manifest is now revision 3; revision 2 and the AE results below remain historical evidence. Future execution must use the reviewed AG hashes and a new approval.

## AE — Supervised UI-Only Historical Acceptance Preparation (03/11/2026)

Scope: attachment `482d75f8-996f-4e52-8bea-572fe5e75a47/Pasted text.txt`, **IMPLEMENT + OFFLINE SYNTHETIC TEST ONLY**. Người dùng yêu cầu tiếp tục ngày03/11; không mở rộng quyền sang real startup. Mốc historical readings vẫn là **02/11/2026**, không đổi thành ngày nghiệm thu hiện tại.

### A. Source integrity / supervisor design

Trước sửa, **11/11 exact source hashes AD.I MATCH**. Không dùng AA/AB browser pins cho supervisor mới, không cập nhật expected pins để vượt drift. Những thay đổi AD dưới đây là intentional AE strengthening sau integrity check, chưa thực thi trên môi trường thật.

Added:

- `scripts/mvp-ui-only-supervisor.cjs`: approval/pin gates và lifecycle state machine với injected adapters cho tests.
- `scripts/mvp-ui-only-runtime.cjs`: adapter Windows/native process, original native-observed preflight, pg_ctl exact target, owned worker/frontend IPC, HTTP readiness và manual evidence intake.
- `scripts/mvp-ui-only-worker.cjs`: private SQL verification/API worker, guarded snapshots, no production server bootstrap, no secret output.
- `scripts/mvp-ui-only-session.ps1`: future launcher, private plan/owner/ACL/reparse checks, create-new run/approval-consumption marker, closed environment, native completion.
- `scripts/mvp-ui-only-supervisor.test.cjs`:42synthetic tests; no actual service execution.
- `docs/PHASE_AE_UI_ONLY_SOURCE_MANIFEST.json`:250runtime/source files, runtime pins và test hashes; **SOURCE_PINS_ONLY_NOT_EXECUTION_APPROVAL**, không approved=true.

Updated narrowly: AD readonly adapter kiểm tra actual transaction identity/read-only trước domain query; API dùng cùng guard cho startup; datasource constructor chặn .env probing trước app import; frontend disconnect IPC sau graceful close để process tự thoát. AD fake pool fixture được cập nhật cho query metadata mới. Không sửa production server.ts/app/auth/schema, firmware hoặc dữ liệu.

Workflow future: verify new approval/source/runtime → protected run/one-shot marker → fresh shutdown/ports/NTFS/native preflight → start exact DEV cluster → postmaster/listener/SQL identity → readonly/migrations/eight mappings/twelve readings → API safety/readiness → frontend readiness → manual window → snapshot/data/source comparison → graceful cleanup. Không browser auto-launch và không MQTT session.

### B. Real approval contract / one-shot protection

Future PlanFile phải ở private operator-only protected directory, owner expected operator SID, protected DACL duy nhất FullControl, no reparse. Required fields:

```text
scope: ONE_DEV_UI_ONLY_HISTORICAL_SESSION
approved: true (chỉ theo phê duyệt mới thực tế)
maxSessions: 1
manualSeconds: 30..600 (đề xuất 300)
expiresAt: future UTC, tối đa24h từ lúc check
userApprovalFile / userApprovalSha256: evidence phê duyệt mới
allowExistingDevCredentialDecrypt: true (phải được phê duyệt rõ)
sourceHashes / runtimeHashes: exact manifest AE
```

Y/AB/AE-preparation attachments bị loại khỏi approval evidence; scope cũ/missing/expired/hash/source/runtime mismatch fail closed **trước startup**. Boolean trong plan không tự cấp quyền: operator/Agent chỉ được tạo plan sau approval thật. Manifest AE thiếu approval fields nên không thể dùng trực tiếp làm execution plan.

Sau check-plan thành công, PowerShell tạo create-new marker tại private TEST root `ui-only-approved-<approval-evidence-sha256>.attempt.json`, gắn exact fresh run. Một approval không được dùng lại kể cả đổi tên/copy PlanFile; marker đã có → STOP. Marker được consume trước preflight, nên lỗi gate/startup cũng không tự retry. Node kiểm tra launcher PID/receipt và marker.run khớp, tạo attempt riêng trong run. **AE không tạo marker/run/real approval/attempt nào**; các markers trong tests là Map/boolean trong memory.

### C. Fresh DEV preflight / runtime identity design

Fixed PGDATA **C:\DATN\test-instances\phase13-3b\data**, systemID **7698826681383327460**; PostgreSQL **127.0.0.1:55433**, database **smart_agriculture_mvp_dev**, role **sa_mvp_dev_app**, schema **public**. API55001/frontend55173 loopback. No production URL fallback, no 5432 query, no initdb/migration/seed/restore.

Reuse original `mvp-dev-direct.preflight` through R native process diagnostic, không chỉ nhìn JSON: Node observer → outerPowerShell → Nodepreflight → pg_controldata và ACL/listener helper; yêu cầu classification **D_ALL_NATIVE_EXITS_ZERO**. Source/binary pins, PG_VERSION17, exact systemID/shutdown/no postmaster.pid, canonical/reparse, operator/ACL và free55433/55001/55173 checks giữ nguyên. Diagnostic sibling directory mới chỉ chứa metadata, inherits operator-only TESTroot ACL; main session run protected operator-only DACL được launcher tạo/verify, không sửa ACL cũ.

pg_ctl start native code0/observed exit mới ghi owned; liveProof đối chiếu postmaster.pid PGDATA/port/PID/startUnix hợp lệ với listener55433 ownership. SQL guard kiểm tra postmaster-start time khớp expected, targetdb/role/schema/port trên từng transaction. Unknown/nonzero startup giữ actual code/unknown, không startup lần hai hoặc stop process chưa có ownership.

### D. Actual PostgreSQL readonly verification design

Shared `readTransaction` đặt **SET TRANSACTION READ ONLY**, local statement_timeout5s, maxWait2s/transaction timeout8s/RepeatableRead. Sau đó SELECT **transaction_read_only, database, role, port, schema, backendPID, postmasterStart**, reject trước domain reads nếu không đúng. Callback `onVerified` ghi metadata PID/readonly/identity, không secret/query values. Guard áp dụng cho ORM single reads, array/callback transaction và fixedhealthSELECT1, startup snapshot/identity và cleanup probe.

Worker thực hiện hai transaction verification qua Promise.all trước snapshot; ghi **actual observed backend PIDs/call count**, không giả chúng luôn là hai physical connections nếu pool serialize. Không root-level unguarded query; raw client giữ private supervisor/worker boundary, application repositories chỉ nhận proxy readonly. Arbitrary raw appSQL/executeRaw/mutation/new alternate PrismaClient vẫn bị chặn. Không thử INSERT/UPDATE/DELETE trên thật để chứng minh denial; tests dùng fake stores.

Datasource constructor từng có khả năng Prisma probe .env trước app boundary: AE đã chặn .env exists/read ở constructor; worker còn giữ env-file deny xuyên suốt private verification và lazy engine initialization. TargetURL explicit đã validate; không production .env fallback.

**REAL_POSTGRESQL_READ_ONLY_NOT_VERIFIED**: những assertions này chưa chạy với Prisma/PostgreSQL thật trong AE. Engine/protocol setup SQL không được gọi là domain-write test; claims readonly chỉ áp dụng các application data paths đi qua wrapper. Sau approval, actual identity/readonly gate phải PASS trước serving; nếu PostgreSQL privileges/Prisma behavior không tương thích, STOP thay vì bỏ guard.

### E. Exact historical dataset / before-after preservation

Worker đọc trong guarded transactions:

-11Prisma migrations names/checksums/finished/notrolledback theo immutable existing contracts.
-Eight mappings dùng original `validateMapping`: farmowner/zone/controller/4unique sensors/PUMP/GPIO26/status/relations/duplicate-controller checks; không sửa mapping/presence/state.
-12exact row IDs của AD/Y; verify sensorID, finite numeric value, sourceMQTT, exactrecordedAt và **exactreceivedAt**; no duplicates.

Expected three batches (chỉ validation/checklist, **không API fallback values**):

| recordedAt UTC | receivedAt DB UTC | TEMP °C | HUM % | LIGHT lux | SOIL numeric % |
| --- | --- | ---: | ---: | ---: | ---: |
| 2026-11-02T12:11:18.853Z | 12:11:19.216Z |30.2|72.5|5|100|
| 2026-11-02T12:11:33.853Z | 12:11:34.167Z |30.2|72.3|5|100|
| 2026-11-02T12:11:48.853Z | 12:11:49.210Z |30.2|72.4|5|100|

Ba mẫu actual là72.5/72.3/72.4%, không tạo thêm mẫu72.2% chỉ để khớp range mô tả. UI/REST vẫn đọc actualDB; expected arrays không đi vào React data source.

Baseline require DeviceCommand0/PENDING0/enabledAutomation0/actuatorON0; snapshot còn có totalSensorReading count. Digest trước/sau bao gồm eight mapping records,12rowcontents/counts/migrations; thay reading/value/receivedAt/timestamp/count/identity hoặc source pins → không acceptance. Không fresh OFF/ONLINE, không simulator và không clock manipulation.

### F. API/auth and private credential handling

Worker chỉ được tạo sau exact cluster startup. New approval phải cho phép đọc **existing DEV-only DPAPI file** qua helper đã pin, fixed operator/path/ACL; helper native completion phải hợp lệ. Native failure/unknown của helper được chuyển thành safe metadata, không mất exit code. Nếu INIT chưa có rawclient, STOP vẫn graceful-disconnect worker; không thể xác minh otherclients thì cluster giữ để review, không đoán0. Không đọc credentials trong AE, không production credentials, không secrets trong plan/CLI/logs. Future password/JWT chỉ đi trong worker memory; childstdout/stderr không lưu raw. Constructor tạo exact appclient và explicit safe env; credentials không chuyển sang frontend.

API chạy AD dedicated entry, không production bootstrap/recovery/watchdog/evaluator; HTTP gate chỉ reviewed login/logout/read surfaces. Commandsfalse/Automationfalse/testtrue/cap1/mqttdisabled. Actual serving PID/IPC policy phải khớp owned listener55001 và healthDBconnected/mqttdisabled. Wrongflags/identity/auth writepath → STOP.

Authentication vẫn actual DEV account lookup/bcrypt/JWT; audit memory-only adapter thông báo rõ không nghiệm thu audit persistence. Operator phải có **existing DEV Website credential** để nhập tại local login; supervisor không in/reset mật khẩu hoặc dùng fake token. Nếu operator chưa có credential handoff phù hợp, phải giải quyết qua phương thức cục bộ được duyệt riêng trước phiên thật; không tự lộ password từ DPAPI.

### G. Frontend manual checklist / screenshots

Chỉ sau API/readiness và frontend listener55173 thuộc đúng childPID/HTTP readiness PASS, launcher thông báo **UI_ONLY_READY http://127.0.0.1:55173**. Không mở browser giúp operator. Finite manualSeconds30–600 (đề xuất300s), không gia hạn/retry tự động.

Operator tự kiểm tra login, đúng hardwarefarm/zone/device, TEMP30.2/HUM72.3–72.5/LIGHT5, SOILnumeric100 **qualityUNVERIFIED**, historydate **02/11/2026 19:11:18 /19:11:33 /19:11:48 UTC+7**, actualAPI/DB chart/history, device last-known state, historical/stale/noLIVE và memoryauditnotice. Card/banner/timezone dùng AD DEV presentation; không sửa production freshness/safety.

Supervisor tạo private `manual-checklist.json`; operator cung cấp **operator-acceptance.json** gồm `operatorAttested=true`, `redactionConfirmed=true`, booleans cho exact12checklist keys và3–10PNG screenshots dưới fresh run. Whitelist filename/no symlink, max10MiB/PNGmagic/hash; không tạo ảnh. Screenshots phải do operator chụp thật, mask credential/token/cookie. File signature/hash **không chứng minh nội dung ảnh hoặc redaction**: kết quả là **operator attestation**, không automatedDOM/browser E2E. Không nhận password/JWT/bodyauth trong metadata.

Không được gọi historicaldata hoặc việc API polling lại readings cũ là liveauto-refresh. Thiếu manual evidence/window expired → MANUAL_UI_NOT_VERIFIED, không giả PASS, vẫn cleanup. Soil quality blocker giữ nguyên.

### H. Lifecycle / cleanup and uncertainty

Finite startup/readiness/IPC/native deadlines; manual window bounded; launcher tổngwait900s có polling status, không in raw buffers. Workflow không retry pg_ctl/API/frontend hoặc manual acceptance.

Owned frontend STOP→Viteclose→IPCdisconnect; APIworker closes HTTP→disconnect pool. Verification-only worker được cleanup kể cả failure trước API. Reuse cùng supervised client cho một readonly cleanup probe sau poolclose, đếm các client khác/unknown client types trong testcluster rồi disconnect; không tạo alternate application client. Chỉ smart-stop PGDATA đã owned khi không còn SQLclients khác và children đã kết thúc native0. Recheck control systemID/shutdown/DEVports released; không stop5432/broker.

Timeout/native unknown/ownership mismatch hoặc cleanup nonzero → giữ actual code/unknown và affectedprocess/cluster để operator review; **không force-kill**. Knownowned children vẫn được yêu cầu graceful stop, nhưng không tự stop uncertain cluster. `summary.json` lưu stage timestamps/PID/native codes, before/after digests, cleanup disposition và verdict; không log rawerrors/secret. Source/runtime pins recheck sau manual/data verification. Không xóa existing evidence/data.

### I. Offline tests / typecheck

**42new supervisor cases +54related regression =96/96 PASS**, native0, no skip/cancel. Fake native processes, fake pool/listeners/manual evidence; không realPG/HTTP/browser. Tests phủ missing/wrong/expired/oldapproval, source/runtime drift, exact PGDATA/systemID/port/state, migration/role/db mismatch, missing/modified values/receivedAt/identities/PENDING, readiness failures, readonlyoff/wrong connection identity, concurrent guarded paths, constructor.envdenial, native nonzero/unknown/timeout, approvalreuse, postdata/source drift, cleanup owned-only/otherclients/nonzero và no secret reflection. Related AD auth/JWT memoryaudit/write-denial/presentation tests vẫn PASS.

```powershell
node --require ./scripts/acceptance-offline-guard.cjs --test --test-reporter=spec scripts/mvp-ui-only-supervisor.test.cjs scripts/mvp-ui-only.test.cjs scripts/mvp-ui-launcher-exit.test.cjs scripts/mvp-edge-smoke-observer.test.cjs scripts/mvp-edge-smoke-analysis.test.cjs scripts/mvp-browser-startup-diagnosis.test.cjs
```

Node syntax new/changed files **PASS**; new PowerShell launcher AST **PASS** trong tests. Backend typecheck `tsc --noEmit` **exit0**, frontend app `tsc --noEmit --incremental false` **exit0**. Không chạy suite nào start live services/browser hoặc fullacceptance đã PASS.

### J. Source manifest / exact hashes

`docs/PHASE_AE_UI_ONLY_SOURCE_MANIFEST.json` pin **250files**: relevant supervisor/AD/nativehelpers, full backend/src/frontend/src, Prisma schema và3package locks; Node/PostgreSQL binary expected hashes riêng. Source manifest revision2 SHA256 **9f3d8e6115975d8739996e461187249c39a44f969c5c31b18045bbfa7bb6bf59**. Revision2 chỉ chốt planned AE worker cleanup/native-metadata correction, đã rerun96tests; không cập nhật pin để bypass bất kỳ live gate nào. Không credentials/approval thật trong manifest.

| File | SHA256 |
| --- | --- |
| mvp-ui-only-supervisor.cjs | 3fe974a5109c34fe556008652d8e284f58faaae0e2991490cf1150ae39a151fd |
| mvp-ui-only-runtime.cjs | 9206cee92cfa77c42904c8cd1a5bb94ba20c8d0400ca772a1b96830e3d954e96 |
| mvp-ui-only-worker.cjs | 0b860ac5c0aab4d2fdc19544cde35278f2d3ef5bd5e71ded1ca86fae251aea08 |
| mvp-ui-only-session.ps1 | 9c89c41de76988788365cbed83f23d96cfcf8569effac4d456f9499ca594f0ec |
| mvp-ui-only-api.cjs | c525b18316e76533349eee2cb7d548ae844aed487a6d523606b035ab822e4106 |
| mvp-ui-only-readonly.cjs | 0a6895555bf82752d6c52136c263b9ba4fd1c4b460a868c44185433f46d9fc02 |
| mvp-ui-only-frontend.mjs | cecd399201fde662b701d0ce286d43f317ac22cfb53223683e66be2abda3cba9 |
| mvp-ui-only-supervisor.test.cjs | 7c02875fe91f71fa7721f0e91290a56f2f392b44a3df19c8f4437d6fabcac24b |
| mvp-ui-only.test.cjs | 736163545d0c321d67625be00d2baa640d8666e295f2d4f6def2ff12bd16d098 |

AD hash list là historical baseline, không thay bằng AA/AB. Rollback source AE: unwire/remove new supervisor/worker/launcher, restore reviewed AD readonly/API/frontend/test changes và invalidate future pins; không run rolled-back code bằng AE plan. Không DB rollback vì AE không mở DB hoặc tạo data/attempt/run thật.

### K. Future execution / limitations / STOP

Sau **phê duyệt mới** duy nhất scope `ONE_DEV_UI_ONLY_HISTORICAL_SESSION`, Agent/operator mới tạo private PlanFile từ genuine approval + exact manifest hashes, expiry/manualwindow và permission dùng existing DEV DPAPI credentials. Kiểm tra source drift trước tạo plan; không tự nâng expected hashes nếu lệch. PlanFile/parent protectedoperator-only; không gọi manifest như approval.

Proposed command, **NOT EXECUTED**:

```powershell
& 'C:\DATN\Project_datn\scripts\mvp-ui-only-session.ps1' -PlanFile '<NEW_PRIVATE_APPROVED_PLAN_JSON>'
```

Launcher verify/check-plan → create-new consumption marker/run → supervisor executiononce. Chỉ khi UI_ONLY_READY mới operator tự mở browser/login; cung cấp acceptance/screenshot evidence trong manualwindow. Supervisor đối chiếu data/source và gracefulcleanup, giữ allrows/identities/evidence. Nếu readonly/native/role/permission/mapping/hand-off bất kỳ gate fail: STOP, không retry/fallback/migration/credentialreset.

**Chưa nghiệm thu:** actual Windows supervisor/native chain mới, PostgreSQL real readonly/Prisma pool, live API/frontend/JWTlogin, manual browser và screenshots. Fake success không nâng những phần này thành PASS. Existing historical dataset và private credential availability phải revalidate sau approval; credential không được cung cấp hoặc đọc trong AE. Human screenshot attestation không có automatedDOM assurance. No-MQTT mode không chứng minh freshpresence/OFF hay realtime update; soil calibration chưa được giải quyết.

**UI_ONLY_SUPERVISOR_PREPARED_PASS**  
**OFFLINE_SUPERVISOR_TESTS_PASS**  
**REAL_POSTGRESQL_READ_ONLY_NOT_VERIFIED**  
**REAL_UI_ONLY_STARTUP_NOT_EXECUTED**  
**MANUAL_BROWSER_ACCEPTANCE_NOT_EXECUTED**  
**MQTT_CONNECT_NOT_EXECUTED**  
**SOIL_SENSOR_QUALITY_BLOCKED**

STOP sau AE preparation. Không new live approval dùng lại từY/AB; không PG/DEV/browser/MQTT startup/connect, production access, migration/seed/restore, credential/broker/ACL change, DeviceCommand/ON/OFF/Automation, ESP32 reset/flash/pump power. Không đọc/sửa/xóa12readings/8records qua DB; chỉ source và filtered metadata đã có được dùng offline.
