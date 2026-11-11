# Phase AM — Supervised Real DEV UI-Only Historical Website Acceptance

Ngày thực hiện: **04/11/2026, UTC+7**. Final verdict: **HISTORICAL_WEBSITE_UI_PARTIAL**. Actual DEV SQL/API/frontend gates và cleanup PASS; không có operator acceptance/screenshots trong cửa sổ được duyệt nên browser/auth/history/charts chưa nghiệm thu.

## A. Approval và provenance

Genuine user attachment: `93cacaea-b441-40e6-b514-879334aa2915/Pasted text.txt`.

Approval SHA256: `b58c5ea09d80588036031cad9af3ed0fc7e54a4918f96d6818c173368cd58e91`.

Scope ONE_DEV_UI_ONLY_HISTORICAL_SESSION, tối đa một phiên/no retry; dùng existing DEV credential path đã review. Không tái dùng AH/AK. Exact approval byte copy và provenance nằm trong private plan directory.

## B. Manifest và runtime integrity

Fresh PowerShell file-inspection native0, chunk `e7948e`, PID19520: manifest revision4/schema/purpose, exact250source hashes/membership/canonical/no duplicate/traversal/reparse, rev3 lineage, four runtime binary hashes và PowerShell executable pin PASS. Không Node stdin pipeline.

Manifest SHA256: `b0c8974c6c4244652951963cae28f4eb9d56f07a562de9e32df6c5e16a015d56`.

Runtime constants được reviewed check-plan kiểm tra với exact manifest pins. Không source/manifest/binary changes hoặc package installation.

## C. Private plan / run / attempt

Private plan: `C:\DATN\test-instances\phase13-3b\ui-only-plan-1793794672560-e4cd4bcd797f\plan.json`.

Plan SHA256: `7fd319ba12ca963393c9d86a0fc5da3d1cf6564ed92af1cd38298c8f7310e03e`.

Plan và newly created files: owner expected operator SID, protected sole-operator FullControl DACL, no reparse. manualSeconds600, maxSessions1, fresh expiry30min. Provenance records genuine AM attachment/hash, copy hash, plan hash, exact manifest, SID và no-retry scope. Không secrets.

Private run: `C:\DATN\test-instances\phase13-3b\ui-only-historical-1793794681073-b14520e495da`.

Consumed marker: `C:\DATN\test-instances\phase13-3b\ui-only-approved-b58c5ea09d80588036031cad9af3ed0fc7e54a4918f96d6818c173368cd58e91.attempt.json`.

Reviewed launcher invoked **once**. Session allowance used1/1; no retry. Launcher PID20352, OS start2026-11-04T12:18:00.2171917Z, invocation12:18:00.4823919Z. Tool process session8646 completed with actual native exit3, chunk `7c7ff3`; không crash/timeout. Supervisor19984 cũng actual exit3, unknownfalse/stderrBytes0, do manual acceptance chưa hoàn tất; không đổi exit thành0.

## D. Fresh native preflight

Fresh diagnostic evidence: `C:\DATN\test-instances\phase13-3b\preflight-process-diagnostic-1793794681423-ea7733`.

Process chain: supervisor19984 → preflight observer21296 → outer PowerShell21900 → preflight Node20012 → control20516 / NTFS-listener helper21368.

Native children control20516, NTFS helper21368, preflight Node20012 and outer21900 all exit0, error/signal null, timeoutfalse. Native observer acceptance propagated through reviewed runtime before cluster startup. Source audit shows actual parent handles/events; no stdout-only substitution.

Preflight facts2026-11-04T12:18:03.855Z: exact PGDATA/systemID, PG_VERSION17, shutdown state, protected operator root/data ACL and three DEV ports free. Runtime PostgreSQL binary hashes, plus existing preflight psql pin, PASS. No production preflight.

## E. PostgreSQL identity và migrations

Exact target: PGDATA `C:\DATN\test-instances\phase13-3b\data`, systemID7698826681383327460, loopback55433, smart_agriculture_mvp_dev/public, sa_mvp_dev_app.

Owned listener snapshot: postgres PID18220, start2026-11-04T12:18:04.1177237Z, 127.0.0.1:55433. pg_ctl start PID12040/native0, stage12:18:03.969Z–12:18:04.590Z. Actual guarded SQL identity và 11migration names/checksums/finished/notrolledback passed snapshot validation12:18:05.691Z–12:18:06.707Z, lần nữa ở post-verification. Database/role/schema/port đúng target, không production. Kết quả được đối chiếu từ final summary và exact reviewed validation source; không tạo raw snapshot chứa row bodies.

## F. Six-path real READ ONLY

**SIX_PATH_REAL_READONLY_PASS**. Actual final summary có complete=true/version1 với sáu path, trước API readiness:

| Path | Verified transactions | PostgreSQL backend PIDs |
| --- | ---: | --- |
| single | 1 | 2436 |
| concurrent | 2 | 18108,2436 |
| batch | 1 | 18108 |
| callback | 1 | 18108 |
| nested proxy callback | 1 | 18108 |
| actual application repository | 1 | 18108 |

Mỗi connection attestation ghi readonly=on, database smart_agriculture_mvp_dev, role sa_mvp_dev_app, port55433, schema public. Cùng datasource được install vào actual repository; không alternate pool. Source đặt READ ONLY trước domain reads, RepeatableRead, statement timeout5s, transaction timeout8s/maxWait2s. Nested proxy reuse verified transaction, không native nested SQL transaction. Concurrent lần này quan sát hai PID; không coi đó là bảo đảm mọi lần. Initial snapshot poolVerification ghi3transactions/2PIDs/readonlyon. Không synthetic replacement hoặc thử DML thật.

## G. Eight mappings và twelve readings

Actual snapshot gate completed before API/frontend readiness và ở post-check: **IDENTITY_MAPPING_8_8_PASS**, **REAL_STORED_ESP32_READINGS_12_12_PASS** theo frozen manifest. Đúng IDs/relations/devicecode/sensortypes/GPIO26, values/source/recordedAt/receivedAt; unique readings và không missing. Baseline/final digest bằng nhau ở M. Không phát sinh readings/simulator. SOIL numeric100% remains unverified quality.

Giới hạn: validator hiện hành không assert riêng reading units; DB rows được đưa vào digest nên units không thay đổi giữa snapshots, nhưng expected-unit mapping chưa được xác minh độc lập. Không nâng UI unit display thành PASS khi thiếu operator evidence; không sửa code trong AM để bổ sung.

## H. Persisted ActivityLog / baseline

Actual guarded tx.activityLog.count: **before68, after68**, không substitute0 hoặc dùng memory counter. Snapshot validator require DeviceCommand0/PENDING0/enabledAutomation0/actuatorON0 và at least12 SensorReadings trước/sau; cả hai validation PASS. Không raw audit row bodies. Exact total SensorReading count không được export riêng trong summary; không tự điền số12 cho toàn database. Counts nằm trong stable digest.

## I. API / authentication / REST

API loopback55001 owned Node17308, start2026-11-04T12:18:05.6945350Z. Actual API-start stage PASS12:18:06.722Z–12:18:11.176Z; readiness PASS tới12:18:12.412Z. Health query independently returned database connected, MQTT disabled. Supervisor accepted actual serving-worker IPC policy commandsfalse/automationfalse/testtrue/cap1/mqttdisabled and matching owned listener; no production server.ts. Auth uses real DEV lookup/bcrypt/JWT with memory audit, but **actual login and REST history/charts NOT_VERIFIED**: không operator confirmation, ảnh hoặc auth request evidence. Health200 không thay thế data validation. Không decrypt Website user password cho Agent, không fake token/login.

## J. Frontend readiness

Loopback55173 owned Node12064, start2026-11-04T12:18:12.4163474Z. Dedicated historical frontend and HTTP readiness PASS tới12:18:16.685Z. Exact55001 API target, isolated env, no production fallback theo pinned entry. Không có browser launch từ Agent. HTTP readiness không chứng minh React render/auth/chart thực tế.

## K. Manual Edge / screenshots

PHASE_AM_MANUAL_BROWSER_READY communicated, URL http://127.0.0.1:55173, private screenshot path và checklist gửi operator. Manual window **12:18:16.685Z–12:28:16.919Z**, tương ứng **19:18:16–19:28:16 ngày04/11/2026 UTC+7**. Bounded600seconds; không gia hạn/retry.

Final manual result accepted=false/reason=MANUAL_WINDOW_EXPIRED. Sau completion: operator-acceptance.json không tồn tại; PNGcount0. Không có reply xác nhận manual mới trong phiên. **MANUAL_BROWSER_ACCEPTANCE_INCOMPLETE**. Không tự tạo screenshot, điền checkstrue hoặc nâng manual-checklist.json thành acceptance. Không thể kết luận operator đã/không mở Edge hay login ngoài những evidence đã nhận; browser thực tế NOT_VERIFIED.

## L. Historical / timezone / SOIL

Expected stored timestamps02/11/2026 19:11:18/33/48 Asia/Ho_Chi_Minh. TEMP30.2°C; HUM72.5/72.3/72.4%; LIGHT5lux; SOIL100 numeric with quality warning. Historical/stale/last-known labels must not imply current LIVE/ONLINE/GPIO. Pinned presentation chuẩn bị các notice nhưng actual visual verification **NOT_VERIFIED**. SOIL_SENSOR_QUALITY_BLOCKED retained.

## M. Post-acceptance integrity

Exactly one bounded actual post-verification PASS12:28:16.919Z–12:28:17.051Z, sau manual expiry và trước shutdown. Both snapshot validations PASS. Baseline/final digest đều:

`21bdae653168d6b5768c90762ad08272cd093f32e008e16a02cf173b7c593771`

Digest bao gồm eight mapping records, exact12readings row bodies/IDs/values/units/source/timestamps, relevant counts và migration metadata. Persisted ActivityLog68===68. **BUSINESS_BASELINE_UNCHANGED**, **AUDIT_PERSISTENCE_UNCHANGED** trong phạm vi snapshot. Không independent whole-database zero-write proof. Post-source/runtime pin validation completed trước cleanup, không source-drift failure. Không rehash lại bằng inline/stdin hậu kiểm.

## N. Native lifecycle / graceful cleanup

**GRACEFUL_CLEANUP_PASS**:

| Stage | UTC04/11/2026 | Native result |
| --- | --- | --- |
| stop frontend | 12:28:17.215Z–17.424Z | 0 |
| stop API/Prisma | 12:28:17.425Z–17.707Z | 0 |
| cluster smart stop, pg_ctl PID20412 | 12:28:17.707Z–17.911Z | 0 |
| final identity/shutdown/ports verification | completed before summary12:28:19.123Z | PASS |
| supervisor19984 | after summary | exit3, unknownfalse, stderr0 |
| launcher20352 / tool session8646 | observed completion chunk7c7ff3 | exit3 |

Reviewed contract requires worker pools disconnected, no other clients before cluster stop, final exact control systemID/shutdown and zeroDEVlisteners. Summary cluster=STOPPED_GRACEFULLY; no cleanup errors. Follow-up read-only snapshot12:28:51.2490082Z, native0/chunkc53c51: ports55433/55001/55173 no listeners, tracked supervisor/API/frontend/postgres/launcher PIDs absent, postmaster.pid absent. Không kill, stopbroker/production hoặc xóaPGDATA.

Exit3 là known policy outcome vì manual.accepted=false, không bị che và không phân loại native crash. Native completion **OBSERVED_KNOWN_NONZERO**, không all-zero end-to-end success. Tool/session hoàn tất, không worker/service cần giữ chờ user.

Saved evidence hashes (read-only Get-FileHash; no target replay):

| Artifact | SHA256 |
| --- | --- |
| summary.json | e56113854af3db5502dbba9e737f6ea623b33ac3f3af0a5612a065ef53d66b0e |
| supervisor-native-exit.json | 2d25123110d6bf08228faddd371b889f3917a874fc2803378546d85f10f53129 |
| approval.json | 7fd319ba12ca963393c9d86a0fc5da3d1cf6564ed92af1cd38298c8f7310e03e |
| attempt.json | 8fb79ab07ad1595de624858a28b62170d4858b54d84f83d90fc53e149e5f8680 |
| launcher-receipt.json | 2fae0857f58954aed0d4a4c0b04928d8c7b36ed80fa3a17384f1786df85b675a |

## O. Final verdict / remaining blockers

```text
PHASE AM RESULT

Approval: APPROVED — used1/1
Manifest revision4: 250/250 PASS
Runtime binaries: 4/4 PASS
Native completion: BLOCKED for full acceptance; observed exit3, known manual-expiry outcome, not UNKNOWN/crash
Fresh PostgreSQL preflight: PASS
PostgreSQL cluster identity: PASS
11 migrations: PASS
Six-path real READ ONLY: PASS
Eight identity mappings: 8/8 PASS
Twelve real ESP32 readings: 12/12 PASS under frozen validator; independent expected-unit check NOT_VERIFIED
Persisted ActivityLog baseline: PASS — 68
API startup: PASS
Authentication: NOT_VERIFIED
REST history/charts: NOT_VERIFIED
Frontend readiness: PASS
Manual Edge acceptance: NOT_EXECUTED by Agent / NOT_VERIFIED by operator evidence
Asia/Ho_Chi_Minh visual display: NOT_VERIFIED
Historical data labeling visual display: NOT_VERIFIED
SOIL sensor quality: BLOCKED
MQTT CONNECT: 0 actions by Agent
MQTT PUBLISH: 0 actions by Agent
DeviceCommand: 0 actions by Agent; DEV count0/PENDING0 at both validated snapshots
Pump ON/OFF: 0 actions by Agent
Automation: DISABLED in actual UI-only process; DEV enabledAutomation0
Business data before/after: UNCHANGED within compared snapshot scope
Persisted ActivityLog before/after: UNCHANGED — 68 to68
Graceful cleanup: PASS
Final verdict: HISTORICAL_WEBSITE_UI_PARTIAL
```

No production DB, migration/restore/seed, ESP32 reset/flash or physical pump action. Current production flags/PENDING not queried. Historical AE/AG/AH/AI/AJ/AK/AL reports unchanged; AK overall UNKNOWN unchanged. No code/source/manifest changes or regression rerun in AM. Approval copy/plan/provenance/run/attempt/preflight artifacts và report mới được giữ, không overwrite evidence cũ.

Phần còn thiếu cụ thể: existing DEV Website credential handoff tại login, actual login/REST data/React charts/timezone/historical/soil notices/disabled controls, operator checklist và screenshots. Không lỗi crash/SQL startup nào được quan sát trong AM. Không cần replay native diagnostic để xử lý thiếu manual evidence. Nếu muốn nghiệm thu browser ở phiên sau, cần phạm vi mới; không tự reuse AM, mở lại services hoặc tạo attempt2. Đây là historical acceptance, không live MQTT hoặc physical auto-irrigation acceptance.

**STOP sau Phase AM.**
