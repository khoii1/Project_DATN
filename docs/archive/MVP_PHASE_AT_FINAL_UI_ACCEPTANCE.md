# Phase AT — Final historical Website UI acceptance

Ngày **05/11/2026, UTC+7**. Kết luận: **HISTORICAL_WEBSITE_UI_PARTIAL**.

Đúng một phiên supervised DEV UI-only đã hoàn tất. Các gate native/SQL/read-only/auth/CORS và hậu kiểm/cleanup PASS. Đã nhận ảnh Edge thật của Device Detail và biểu đồ TEMP; chưa đủ bằng chứng giao diện cho cả12 dòng History, bốn biểu đồ và Dashboard Network. Không sửa source hoặc mở phiên thứ hai. Kết luận AS giữ nguyên.

## 1. Approval, plan và attempt mới

Genuine approval: `C:\Users\Acer Swift3\.codex\attachments\e4402693-d05e-423a-b2d4-0227f3008d6d\Pasted text.txt`.

Approval/copy SHA256: `c69109de1b989f7b60e01b72c022ad8b7fd26f71e3acffe643de4123f5317d7f`.

Private plan directory: `C:\DATN\test-instances\phase13-3b\ui-only-plan-1793814514938-bb858d2d55e7`.

`plan.json` SHA256: `feb22f532cf60113c6811415079f21053fdc48b8600b64c458aa082b9a5e591c`.

Reviewed scope `ONE_DEV_UI_ONLY_HISTORICAL_SESSION`, approved=true/maxSessions1/manualSeconds600, expiry `2026-11-04T18:33:35.0712368Z`. Fresh create-new approval copy/provenance/plan, protected sole-operator owner/DACL and no reparse verified. Exact operator SID: `S-1-5-21-1432835263-483988321-3159128977-1001`. Existing root protected; data inherits sole-operator rights, as allowed by the reviewed native contract. No ACL change.

Run: `C:\DATN\test-instances\phase13-3b\ui-only-historical-1793814544270-7d593bfc06f8`.

Consumption marker: TEST root `ui-only-approved-c69109de1b989f7b60e01b72c022ad8b7fd26f71e3acffe643de4123f5317d7f.attempt.json`, created `17:49:04.6296103Z`, bound to this exact run. Run attempt and launcher receipt also preserved. **Attempt1/1 consumed**, no AS/earlier marker reused.

Existing reviewed `mvp-ui-only-session.ps1` launched interactively; user entered existing Website DEV password at Get-Credential and replied “đã nhập”. No reset, password/token file/CLI/log/environment handoff, or chat password. Existing UTF8 stdin credential transfer and fixed DEV DPAPI app/JWT path retained. No alternate runtime lifecycle.

## 2. Fresh manifest / source / runtime verification

At `2026-11-04T17:48:03.5563075Z`, **250/250 source hashes**, exact sourceFiles membership, canonical paths/no duplicates/traversal/reparse, **3/3 listed offline-test hashes**, exact runtime constant/pin membership and **4/4 binary hashes** PASS; tool completion native0. Expected schema version1, revision7, purpose SOURCE_PINS_ONLY_NOT_EXECUTION_APPROVAL verified.

Manifest SHA256: `000b8bfce621851eeae4829a9618fa289d23358fc0d352387a852e48bad473b7`.

Exact rev6 snapshot and previousManifestSha256: `6c5cf2c26bb86f0f15545e99cb9f04069f8ca316a83c52dec8b90e8c11871177`; previousManifestFile correctly points to rev6. API source matches reviewed AR hash `abc8f02183cbe510b49662d4031ea6efde2b92758457202e7b4ce9e326c9b96a`.

| Binary | SHA256 verified |
|---|---|
|Node|`fdddbf4581e046b8102815d56208d6a248950bb554570b81519a8a5dacfee95d`|
|pg_ctl|`fc644446b0236e623e3e6fe2699446259efb8e61bd9aba838d6394a2be6987b8`|
|pg_controldata|`6896f8a705afb5cbaad843017d6d8aed5f5d76e32b3179e66750aaa5f193cc40`|
|postgres|`94a8ea85cffd4a15c21290ca555a06438d3f7621b001bea6b1373c210d5a1746`|

PowerShell executable pin also matched. Supervisor performed post-session source/runtime verification; final manifest hash independently remained unchanged. No source/test/manifest/binary update, no rerunning historical offline suites as a substitute for actual gates.

## 3. Native preflight / exact process evidence

Interactive launcher1284, parent tool11316, OS start `17:48:48.3238967Z`. Tool retained native process handle through completion. Preflight evidence: `C:\DATN\test-instances\phase13-3b\preflight-process-diagnostic-1793814545161-075e45`.

```text
tool11316 → launcher1284 → supervisor20288 → observer7276
→ outerPowerShell16712 → preflightNode10688
→ control12376 / NTFS-listenerPowerShell8748
```

| Native boundary | Actual result |
|---|---|
|control12376|exit0 at17:49:06.191Z, stderr0, no error/signal/timeout|
|NTFS/listener8748|exit0 at17:49:07.657Z, stderr0, no error/signal/timeout|
|Node10688|exit0 at17:49:07.6935487Z, no error/signal/timeout|
|Outer16712|exit0 at17:49:07.726Z, independently observed, stderr0|

Checks-returned17:49:07.659Z; reviewed preflight completed17:49:07.774Z. Exact PG_VERSION17/PGDATA/systemID, shutdown state/postmaster absent, executable pins, root owner/protected operator DACL/data operator access, canonical/reparse and zero conflicts on55433/55001/55173 all passed. No stdout-only PASS or failed-preflight retry.

One later auxiliary screenshot-directory listing command had a PowerShell parse error before executing any operations. Corrected metadata-only listing returned0; no service/native preflight/DB/MQTT execution was retried or failure masked.

## 4. PostgreSQL DEV, migrations, actual READ ONLY

Only target: `C:\DATN\test-instances\phase13-3b\data`; systemID **7698826681383327460**; loopback **55433**; `smart_agriculture_mvp_dev/public`; role `sa_mvp_dev_app`.

pg_ctl13680 start exit0,17:49:07.774Z–08.346Z. Actual postgres6184, OS creation17:49:07.9208600Z, matching loopback listener/control-start proof. Actual guarded SQL verification17:49:09.879Z–11.557Z passed exact database/role/schema/port/start binding and **11 migration names/checksums/finished/not-rolled-back**. No initdb/migration/restore/seed/role/schema change or production5432 connection.

Six-path coverage complete=true using the actual installed guarded datasource:

| Path | Transactions | PostgreSQL backend PIDs |
|---|---:|---|
|Single|1|12780|
|Concurrent|2|12780,17884|
|Batch|1|17884|
|Callback|1|17884|
|Nested proxy callback|1|17884|
|Actual SensorReading repository|1|17884|

All verified readonly=on/db/role/55433/public. READ ONLY before domain queries; RepeatableRead, statement5s/transaction8s/maxWait2s. Nested reuses verified transaction, not a separate native nested transaction. Initial snapshot pool3verified transactions/twoPIDs. No DML probe, raw alternate pool or production fallback. **Real READ ONLY6/6 PASS**.

## 5. Frozen data / units / baseline

Actual before/post pinned validators passed **8/8 identity records**, ownership/types/relationships/GPIO26, **12/12 exact row IDs/sensor IDs/values/sourceMQTT/recordedAt/receivedAt**, no duplicates/missing rows, and **12/12 derived units** from authoritative backend/frontend sensor-type metadata. No persisted unit column invented or row repaired.

Frozen batches on02/11/2026:

| recordedAt UTC | TEMP °C | HUM % | LIGHT lux | SOIL numeric % |
|---|---:|---:|---:|---:|
|12:11:18.853|30.2|72.5|5|100|
|12:11:33.853|30.2|72.3|5|100|
|12:11:48.853|30.2|72.4|5|100|

Units TEMP→°C/AIR_HUMIDITY→%/LIGHT→lux/SOIL_MOISTURE→%. Numeric soil100 remains uncalibrated historical data, **SOIL_SENSOR_QUALITY_BLOCKED**.

Actual `tx.activityLog.count()` baseline **68**, post **68**; baseline was queried fresh, not assumed from AS. Snapshot checks also required DeviceCommand0/PENDING0/enabledAutomation0/actuatorON0. Reading total checked as valid>=12; do not infer whole-database count12 solely from frozen-row count. The separate Reports screenshot visibly shows12readings within its selected date range.

## 6. API / CORS / authentication / frontend

API19756 OS creation17:49:09.8827670Z; owned listener127.0.0.1:55001. Actual readiness17:49:18.117Z required databaseconnected/mqttdisabled. Actual supervisor/worker policy verified commandsfalse/automationfalse/testModetrue/cap1s/mqttdisabled, memory-only audit. No command recovery/presence watchdog/automation evaluator or production startup.

Pre-frontend gate17:49:18.117Z–18.564Z, exact ownedAPI19756, independently validated:

| Request | Status / result |
|---|---|
|OPTIONS login|204 PASS|
|OPTIONS auth/me|204 PASS|
|Direct DEV POST login|200 PASS|

Exactly1/1/1 requests; fixed origin55173/requested method/header/Vary/empty body/no credentials/no max-age checks alltrue. Worker verified preflight DB/audit counters unchanged and correct policy. Direct login expected owner-a/mvp-owner-a/FARM_OWNER/ACTIVE, token present without persistence/output, correct response origin and memory-only audit increment. No additional automated login/retry. Existing15s stage/3s request limits retained.

Frontend22476 OS creation17:49:18.5684720Z, started after full gate; exact loopback55173 readiness17:49:23.420Z. Dedicated historical frontend/API55001, no production5000 fallback or automated browser. Operator manually opened Edge.

Manual window **00:49:23–00:59:23,05/11/2026 UTC+7** (`17:49:23.420Z–17:59:23.477Z`).600seconds, no extension. Prior AS Dashboard acceptance remains AS evidence; no AS screenshot reused as AT evidence.

## 7. Manual UI acceptance and evidence limits

| Item | AT result / actual evidence |
|---|---|
|Edge login|**PASS** — new authenticated Edge pages, expected account header, operator interactions|
|Sensor History|**PARTIAL** — user specifically confirmed table readings and chart; TEMP screenshot shows correct sensor/statistics/count3. Individual table rows/values/times and remaining three sensor histories not captured|
|Charts|**PARTIAL** — real TEMP chart loaded,30.2°C/count3/resolution2h/date02-11; four-type time-series acceptance incomplete|
|Device Detail|**PARTIAL** — correct URL/device ID/code/DevKitV1/controller/Farm/Zone/all four sensor codes/latest values/history cards; connection label remains unqualified “Trực tuyến”|
|Dashboard Network|**NOT_VERIFIED** — no sanitized Network image/status/header/body evidence supplied|
|Historical notices|**PARTIAL** — per-sensor history/notLIVE/UTC+7 clear; global notice starts behind sidebar in Activity screenshot; report/detail captured without visible global qualification and have current/online wording|
|SOIL warning|**PASS for visible warning text**, quality itself BLOCKED — device soil card says quality unverified/not for automatic irrigation;100% not calibration|
|Controls disabled visually|**NOT_VERIFIED** in AT — no pump/automation control screenshot or specific AT control observation; actual API policy disabled PASS; no click test|

DeviceDetail shows last signal19:11:49 ngày02/11/2026 while saying online, so it cannot establish current hardware connectivity. Firmware field is empty/dash; no firmware version inferred from this database view. Add/edit sensor buttons are visible but were not action-tested; server remains read-only.

Reports screenshot shows four sensors/12measurements/zero irrigation commands/zero rules, plus average-value bar chart. This is useful aggregate evidence, **not** the Sensor History table, not a new history-API response capture and not four sensor time-series charts. Activity screenshot displays historical login/CRUD events; these are not proof of newly persisted login audit.

No actual failing URL/status or CORS error was supplied. Exact browser zone-latest OPTIONS204/GET200/payload remains NOT_VERIFIED; pre-frontend auth204/204/200 and historical AS rendering do not substitute for Dashboard Network evidence.

## 8. Chart aggregation interpretation

TEMP screenshot selects30days, resolution2h, latest/min/avg/max30.2°C and count3. It renders one point near30.2 on02-11. Three frozen samples only30seconds apart fall in one2h bucket; one mean point is expected and not missing data.

Reviewed DEV import boundary replaces repository bucketPoints with existing `buckets(prisma,...)`: guarded sensorReading.findMany of actual rows, epoch `floor(recordedAtSeconds/bucketSeconds)*bucketSeconds`, arithmetic mean/min/max/count per sorted bucket. It does not generate extra readings.30day auto→2h matches service source. TEMP mean=(30.2+30.2+30.2)/3=30.2. The bucket timestamp is the bucket start, not an invented recordedAt. Screenshot date/unit/value/count agree for TEMP; exact tooltip time/raw rows and HUM/LIGHT/SOIL series are not visually verified. “Cập nhật lần cuối00:55:28” is page fetch time, not new sensor measurement time.

No raw SQL permission was widened and no chart/source change made during AT.

## 9. Actual screenshot inventory

Operator supplied new Edge images in chat and in `C:\Users\Acer Swift3\Pictures\Screenshots`; local PNGs were opened/visually inspected, create-new copied into the private run, source/copy byte hashes matched and copied files sole-operator owner/access verified. No visible password/JWT/cookie/Authorization and no image manufacture/edit. Hashes establish file identity, not independent browser automation assurance.

| Source PNG on05/11/2026 | Private run copy | Bytes | SHA256 |
|---|---|---:|---|
|Screenshot 2026-11-05 005126.png|activity.png|166413|`372adac804f74b44e743e276fa22d5e3830624f7526b2e7e892e23295d170915`|
|Screenshot 2026-11-05 005152.png|reports.png|136784|`bcd62430c3715df883616fad8dedf5fb789169662174844d0c4ee3d9757f33fa`|
|Screenshot 2026-11-05 005210.png|device-detail.png|151326|`8949933e5f0ed50ccccb813150f6d3cae51cb472afe6572af1a0ad0cea3fefb2`|
|Screenshot 2026-11-05 005544.png|temperature-chart.png|121028|`30263c9ce026151a4a58b077f6cb4e075c2902c1a65788fa14706b6d267d27a3`|

Operator said “đã chụp” and specifically “Có bảng readings và biểu đồ”. These support navigation/table existence, not validation of all12 rows/fourcharts/Network or all12 supervisor checklist booleans. No fabricated all-true operator-acceptance.json. Supervisor recorded acceptedfalse/MANUAL_WINDOW_EXPIRED because structured full acceptance was incomplete; this does not negate partial operator evidence. Screenshot set PARTIAL for required targets.

## 10. Post-check and graceful cleanup

Actual guarded post-check17:59:23.477Z–23.646Z passed all snapshot validators. BeforeDigest=AfterDigest:

`17bea009981099eae108d0450adda101faea28836094b2cee00376c5776b6e3b`.

Compared identities/readings/derived units/migrations/counts unchanged; persisted ActivityLog68→68. This is bounded database integrity evidence, not universal proof about all tables. No data repair/write.

| Native lifecycle | Actual outcome |
|---|---|
|Frontend22476 stop|0,17:59:23.940Z–24.141Z|
|API19756 / Prisma pools stop|0,17:59:24.141Z–24.425Z|
|postgres6184 smart-stop via pg_ctl21652|0,17:59:24.425Z–24.616Z|
|Exact control/systemID/shutdown/ports check|PASS by reviewed adapter before summary17:59:26.054Z|
|Supervisor20288|exit3,unknownfalse,stderr0|
|Launcher1284 independent held native handle|exit3,timeoutfalse,error/signalnull,17:59:26.3638989Z|
|Tool session13566|exit3, retrieved after completion|

Known policy exit3 means incomplete manual checklist; not crash/access violation, unknown native result or a false exit0. **Graceful cleanup PASS**. Independent final read18:00:01.0793327Z: zero listeners55433/55001/55173; five known launcher/supervisor/API/frontend/postgresPIDs absent; postmaster.pid absent; run protected operator-owned soleACE. No force-kill/foreign stop/PGDATA deletion.

| Evidence | SHA256 |
|---|---|
|summary.json|`2d43e1bbda443383047805b3708b97eb97c7048d20b22cb4e55bfdf24694fc0e`|
|attempt.json|`28b1b34e6fe0a4f780c117a769924efc00dbcea5fef678758f2d78dd09e184f9`|
|supervisor-native-exit.json|`e106d2a40388b03ea33aefbcf514fa74a279d9c46eab555b2b4108915e74ae27`|

## 11. Remaining work and safety

Actual data/auth/readiness/readonly/cleanup gates passed; no new functional failure was observed in supplied screenshots. Full acceptance lacks row-level12History/four time-series/Network/control-screen evidence. Specific presentation defects remain: global historical banner clipped/absent from shown scrolled views, device online unqualified, Reports “Snapshot hiện tại” potentially misleading for frozen data. DeviceDetail content mostly verified; semantic safety labeling keeps overall PARTIAL. Do not infer hardware online or calibration.

No source/test/manifest changes, production access/startup, migration/seed/restore/initdb, credential reset, MQTT connect/subscribe/publish, broker action, DeviceCommand, pumpON/OFF, automation, ESP32reset/flash or power operation. Commands/automation stayed disabled in actual dedicated API. Existing historical data preserved. Do not infer current production flags from this DEV session. **AUTO_IRRIGATION_PHYSICAL_NOT_EXECUTED**.

AS verdict unchanged. Preserve private plan/run/marker/evidence; do not retry/reopen AT or automatically start AU. Any further live session or source remediation is outside consumed AT1/1 scope.

## 12. Final result

```text
PHASE AT RESULT
Approval: APPROVED
Attempt: 1/1
Manifest revision7: 250/250 PASS
Runtime binaries: 4/4 PASS
PostgreSQL DEV: PASS
11 migrations: PASS
Real READ ONLY: 6/6 PASS
Eight identities: 8/8 PASS
Twelve readings: 12/12 PASS
Derived units: 12/12 PASS
CORS login/me: 204/204 PASS
Direct login: 200 PASS
Frontend: READY during session; now STOPPED
Edge login: PASS
Sensor History: PARTIAL
Charts: PARTIAL — TEMP visual PASS; other3 NOT_VERIFIED
Device Detail: PARTIAL — content PASS; historical connection labeling incomplete
Dashboard Network: NOT_VERIFIED
Historical/SOIL notices: PARTIAL — SOIL warning visible PASS; quality BLOCKED
Controls disabled: NOT_VERIFIED visually in AT; actual API policy disabled PASS
Data before/after: UNCHANGED within compared scope
Persisted ActivityLog: UNCHANGED —68→68
MQTT: 0 actions by Agent
DeviceCommand: 0 actions by Agent
Pump ON/OFF: 0 actions by Agent
Automation: NOT_ENABLED by Agent
Graceful cleanup: PASS
FINAL: HISTORICAL_WEBSITE_UI_PARTIAL
```

**STOP after Phase AT.**
