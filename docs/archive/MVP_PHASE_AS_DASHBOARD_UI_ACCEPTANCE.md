# Phase AS — Supervised real DEV historical Website acceptance

Date: **05/11/2026, UTC+7**. Final verdict: **HISTORICAL_WEBSITE_UI_PARTIAL**.

One approved session completed. Dashboard now renders the expected historical readings without the previous API error, corroborated by a new real Edge screenshot and operator confirmation. Full History/Charts/Device Detail and browser Network evidence remain unverified. All database/safety/startup gates passed; bounded data comparison unchanged; graceful cleanup passed. No retry or source changes.

## A. Genuine approval / provenance

Approval source: `C:\Users\Acer Swift3\.codex\attachments\bc5ac4a7-9d9b-478e-951a-0ad232e4f240\Pasted text.txt`, explicit Phase AS one-shot approval, scope `ONE_DEV_UI_ONLY_HISTORICAL_SESSION`, maximum1/no retry.

Exact approval/copy SHA256: `ea5f82552b50899fa64ac8560efe7f8a77ee120fa68a0634bfd0e405d921d8cf`.

No AQ/AO/AM approval reuse. Approved reviewed infrastructure only; no new runtime launcher/watcher/supervisor or source patch. Existing local DEV-only DPAPI app/JWT handoff was used through the pinned worker; no production credential fallback. Website password was entered locally via existing Get-Credential, not reset or taken from stale stored Website credentials.

## B. Fresh manifest revision 7 verification

Manifest SHA256: `000b8bfce621851eeae4829a9618fa289d23358fc0d352387a852e48bad473b7`; revision7/version1/purpose `SOURCE_PINS_ONLY_NOT_EXECUTION_APPROVAL` verified. Immutable rev6 SHA256 and previousManifestSha256: `6c5cf2c26bb86f0f15545e99cb9f04069f8ca316a83c52dec8b90e8c11871177`.

Fresh **250/250 source hashes**, exact sourceFiles membership, canonical/no duplicate/no traversal/no reparse checks, **3/3 listed offline-test hashes**, runtime constants equality and **4/4 binary hashes** PASS. API SHA256: `abc8f02183cbe510b49662d4031ea6efde2b92758457202e7b4ce9e326c9b96a`. PowerShell executable pin also matched. Final manifest hash remained identical; supervisor also rechecked execution source/runtime pins after manual inspection. AR's historical 284 tests were supporting context, not substituted for fresh verification.

| Execution binary | Verified SHA256 |
|---|---|
| Node | `fdddbf4581e046b8102815d56208d6a248950bb554570b81519a8a5dacfee95d` |
| pg_ctl | `fc644446b0236e623e3e6fe2699446259efb8e61bd9aba838d6394a2be6987b8` |
| pg_controldata | `6896f8a705afb5cbaad843017d6d8aed5f5d76e32b3179e66750aaa5f193cc40` |
| postgres | `94a8ea85cffd4a15c21290ca555a06438d3f7621b001bea6b1373c210d5a1746` |

An initial ad hoc inspection incorrectly required the data subdirectory itself to have inheritance disabled. Its `PRIVATE_ACL` exception occurred before plan/startup. Source review established the existing approved contract protects TEST root and permits data inheriting sole-operator rights. Actual metadata matched that contract: root protected, data inherited sole-operator FullControl, both owned by operator. No ACL was changed and no actual native preflight was retried. The actual reviewed native gate subsequently ran once and passed. This inspection error was not a broker/database/permission defect.

## C. Private plan / run / attempt

Plan directory: `C:\DATN\test-instances\phase13-3b\ui-only-plan-1793812959241-71fe5bf6108e`.

PlanFile: `plan.json`, SHA256 `341dd9806b8742b7caf153791104fec5c45e1ddc5cefac72f89b382549a4bf2b`.

Fresh plan includes genuine approval copy, source/runtime pins, maxSessions1, manualSeconds600, expiry `2026-11-04T18:07:39.3287366Z`. Private `provenance.json` records actual attachment/copy/manifest/plan hashes and operator SID `S-1-5-21-1432835263-483988321-3159128977-1001`. Plan directory/files were create-new, protected sole-operator owner/DACL, no reparse. No secrets in plan/provenance/CLI.

Run: `C:\DATN\test-instances\phase13-3b\ui-only-historical-1793813041173-dfb8b8df613b`.

Consumption marker: TEST root `ui-only-approved-ea5f82552b50899fa64ac8560efe7f8a77ee120fa68a0634bfd0e405d921d8cf.attempt.json`, created `2026-11-04T17:24:01.5136102Z`. Matching run attempt and launcher receipt preserved. **Attempt1/1 consumed.** No second attempt/reopen/extension.

## D. Native preflight / process evidence

Launcher22404 was opened interactively by tool host8656 at `17:22:53.4619532Z`. Its native handle was retained to observe completion independently. Operator replied “đã nhập”. Credentials used transient UTF8 stdin only, not executable source transport, environment, plan or logs.

Actual preflight evidence directory: `C:\DATN\test-instances\phase13-3b\preflight-process-diagnostic-1793813041966-722197`.

```text
tool8656 → launcher22404 → supervisor3876 → observer20548
  → outerPowerShell22232 → preflightNode22380
      → pg_controldata16376
      → NTFS/listenerPowerShell15568
```

| Component | Observed native completion |
|---|---|
| pg_controldata16376 | 0, `17:24:02.805Z`, stderr0, no signal/error/timeout |
| NTFS/listener15568 | 0, `17:24:04.981Z`, stderr0, no signal/error/timeout |
| Node22380 | 0, `17:24:05.0149950Z`, no signal/error/timeout |
| Outer22232 | 0, `17:24:05.051Z`, independently observed, stderr0 |

Checks-returned at `17:24:04.983Z`. Verified PG_VERSION17, exact PGDATA/systemID, pinned binaries, shutdown state, postmaster absent, root/data sole-operator access, root protected, no reparse, ports55433/55001/55173 free. **Native preflight PASS**, no stdout-only substitution. No production5432 access.

## E. Exact PostgreSQL identity / migrations

Approved target only: `C:\DATN\test-instances\phase13-3b\data`, systemID **7698826681383327460**, loopback55433, database `smart_agriculture_mvp_dev`, role `sa_mvp_dev_app`, schema `public`.

pg_ctl start19112/native0, `17:24:05.101Z–17:24:05.902Z`. Actual postgres17652, OS creation `17:24:05.2508440Z`, observed listener127.0.0.1:55433. Controlled postmaster/start binding and guarded SQL identity passed. Actual SQL verification `17:24:07.126Z–17:24:08.063Z` validated **11 migrations**, exact reviewed names/checksums, finished_at and not rolled back; repeated by post-check. No initdb/DDL/migration/seed/restore/role or schema changes.

## F. Actual six-path READ ONLY

Same factory-registered guarded datasource used by the actual application repositories; coverage complete=true:

| Path | Verified transactions | PostgreSQL backend PIDs |
|---|---:|---|
| Single | 1 |15396|
| Concurrent |2|15396,20432|
| Batch |1|20432|
| Callback |1|20432|
| Nested proxy callback |1|20432|
| Actual SensorReading repository |1|20432|

Every entry reports readonly=on and exact database/role/port/schema. READ ONLY established before domain reads; RepeatableRead, statement5s, transaction8s/maxWait2s. Nested callback reuses a verified transaction, not a separate native nested SQL transaction. Initial pool verification3 transactions/two backendPIDs, readonly on. No DML probe or alternate unguarded pool. **ACTUAL_READONLY_COVERAGE_6_6_PASS**.

## G. Eight identities / twelve frozen readings

Actual before/post snapshots passed pinned mapping validation: farm `cmvtxbkc90001um8ks1hk03hm`, zone `cmvtxbkd20003um8kdf93cfx4`, ESP32 `cmvtxbkde0005um8koudtvcda`, four sensors and pump `cmvtxbkdx000fum8k19dyhm22`; IDs/types/relationships/ownership/GPIO26 correct. **IDENTITY_RECORDS_8_8_PASS**.

Both snapshots passed exact12 row IDs/sensorIDs/values/sourceMQTT/recordedAt/receivedAt, no missing/duplicates. Frozen records from Phase Y retained:

| recordedAt UTC, 02/11/2026 | TEMP °C | HUM % | LIGHT lux | SOIL numeric % |
|---|---:|---:|---:|---:|
|12:11:18.853|30.2|72.5|5|100|
|12:11:33.853|30.2|72.3|5|100|
|12:11:48.853|30.2|72.4|5|100|

Expected frozen receivedAt batches: `12:11:19.216Z`, `12:11:34.167Z`, `12:11:49.210Z`. **FROZEN_READINGS_12_12_PASS** via actual guarded SQL and reviewed validator, not fixtures or Serial PUBACK. No records created/updated to obtain acceptance. This phase does not reacquire MQTT provenance live.

## H. Derived measurement units

Authoritative backend/frontend type metadata parsed by pinned code: TEMP→°C, AIR_HUMIDITY→%, LIGHT→lux, SOIL_MOISTURE→%. All12 derived unit entries validated before/post. **DERIVED_UNITS_12_12_PASS**. No persisted unit column invented. Four latest units also visible in new Dashboard screenshot. Historical SOIL100 is not physical calibration evidence.

## I. Persisted ActivityLog baseline

Actual `tx.activityLog.count()` returned **68 before /68 after**. New baseline was queried, not assumed from AQ or replaced with memory audit. Both snapshot validations required DeviceCommand0/PENDING0/enabledAutomation0/actuatorON0. Total reading count was checked as a valid count>=12; exact whole-database reading count is not separately exported by summary and is not claimed to equal12.

## J. API policy / readiness

Owned API/worker18848, OS creation `17:24:07.1291380Z`, actual loopback55001. API start gate complete `17:24:09.572Z`, readiness `17:24:10.852Z`. Readiness required actual health databaseconnected/mqttdisabled and owned listener. Actual policy validated by supervisor and worker observations: MQTT disabled, commandsfalse, automationfalse, testModetrue, maxRunSeconds1; memory-only audit. No production server startup, recovery/watchdog/evaluator, MQTT client connection, production fallback or persistent login-audit writes.

## K. Mandatory pre-frontend CORS/login gate

Actual gate `17:24:10.852Z–17:24:11.273Z`, ownedAPI18848. Independent structured validation passed, counts exactly1 OPTIONS login/1 OPTIONS me/1 direct POSTlogin.

| Request | Actual result |
|---|---|
| OPTIONS `/api/auth/login` |204 PASS|
| OPTIONS `/api/auth/me` |204 PASS|
| Direct DEV POST login |200 PASS|

Preflight exact origin55173, requested method/header, Vary, empty body, absent credentials/max-age flags alltrue. Worker observations: preflightTransactionsUnchanged=true, preflightAuditUnchanged=true, policyVerified=true. Direct login verified expected owner ID/email/FARM_OWNER/ACTIVE, nonempty token without logging it, correct response origin and one memory audit increment. No second automated diagnostic login, redirect or retry. Existing 15s stage /3s request limits preserved. Application counters are bounded evidence, not packet-capture proof.

## L. Frontend readiness

Frontend15520, OS creation `17:24:11.2788470Z`, listener127.0.0.1:55173. Start after validated gate, ready `17:24:14.445Z`. Dedicated historical entry/API55001, empty environment directory, no production5000 fallback. Operator manually opened Edge; Agent did not launch browser or use Playwright.

Manual window exactly `17:24:14.445Z–17:34:14.625Z` = **00:24:14–00:34:14 ngày05/11, UTC+7**. No extension.

## M. Dashboard browser Network results

No sanitized DevTools Network capture was supplied. Direct-gate auth results above are not zone-route browser evidence. No additional HTTP probe/login was run to replace the missing browser capture.

| Actual Dashboard request group | Browser method/status/header/payload classification |
|---|---|
|Zone latest-readings OPTIONS/GET|NOT_VERIFIED at Network layer; latest values rendered correctly|
|Zone alerts / pump actuators / enabled automation reads|NOT_VERIFIED per request; pump rendering visible|
|Device summary / alert summary / recent alerts|NOT_VERIFIED per request; summary cards visible|
|Reports overview / activity logs|NOT_VERIFIED per request|
|Farm/zone selector reads|NOT_VERIFIED per request; selected labels visible|

Do not assign HTTP_SUCCESS_VALID_PAYLOAD, CORS_BLOCKED, AUTHORIZATION_ERROR, HTTP_ERROR, SCHEMA_MISMATCH or NOT_REQUESTED without a capture. No current failure URL/status was observed. Overall other monitoring request verification **PARTIAL**, not a claim that they failed.

## N. Zone latest-readings response / visible consequence

The new actual Edge Dashboard displays all four expected latest historical sensor values and correct selectors, whereas AQ displayed API errors and empty monitoring panels. This is direct functional rendering evidence consistent with the AR fix. Exact browser OPTIONS204 and GET200/body shape remain **NOT_VERIFIED** because the screenshot has no Network panel. Source/synthetic AR evidence is not substituted for that missing capture.

## O. Alerts / actuator / automation monitoring

Dashboard shows zero active alerts and a pump card with correct ESP32/GPIO26, UNKNOWN/control-disabled/unavailable. No automation-enabled panel is shown. This supports successful safe rendering, not independently captured status/body for every underlying read. Valid empty results must not be confused with HTTP errors; no command or enable operation was invoked.

## P. Dashboard visual acceptance

Operator explicitly confirmed “Đã hiện dữ liệu, không còn lỗi API”. New screenshot independently shows authenticated `/dashboard`, API connected, correct farm/zone selectors and no previous update-error banner.

| Visible item | Result |
|---|---|
|Edge login / Dashboard navigation|PASS|
|Dashboard historical sensor panels|PASS:30.2°C,72.4%,5lux,100%|
|Previous API-error/empty monitoring defect|PASS for observed Dashboard; no error visible|
|Units/latest measured time|PASS:19:11:48,02/11/26,UTC+7|
|Historical/non-LIVE text per sensor|PASS|
|Pump state|PASS:UNKNOWN,unavailable,CONTROL DISABLED; no fabricated ON/OFF|
|Buttons|Visually disabled/grey Bật,Tắt; actual server denial/policy verified, no action test|
|Missing measurement null presentation|NOT_VERIFIED visually; all four latest readings exist|

Dashboard visual **PASS for the shown state**; not an assertion about all routes/time ranges or every error case.

## Q. Sensor History

**NOT_VERIFIED visually**. No new actual Sensor History screenshot or specific operator History result supplied. Actual SQL verification proves all12 frozen records exist; it does not prove the History dataset/page rendered all12. No new history API capture was taken in AS. Phase Y's historical history endpoint evidence remains historical, not a new AS browser PASS.

## R. Charts

**NOT_VERIFIED**. No new chart screenshot, tooltip/axis/series or aggregation evidence supplied. Do not infer four chart series/three batches from Dashboard cards or SQL. No fabricated points or screenshots.

## S. Device Detail

**NOT_VERIFIED**. No new actual detail-page screenshot supplied. Database identity/mapping verification does not substitute for correct visual device/sensor/last-known labels.

## T. Historical / SOIL / control warnings

Sensor cards clearly say historical/last-known, not LIVE, and UTC+7. SOIL card explicitly says quality unverified, not for automatic irrigation. **SOIL_SENSOR_QUALITY_BLOCKED** retained. `AUTO_IRRIGATION_PHYSICAL_NOT_EXECUTED`.

Global top notice includes historical/MQTT-disabled/current-state caveat/memory-only audit but its beginning remains obscured by sidebar. Device summary still says “1 online” without an adjacent local historical qualifier; global/per-card warnings mitigate but do not resolve that ambiguity. **Historical/stale labeling PARTIAL** overall; per-sensor notice PASS. **Vietnam timezone PARTIAL** overall because latest Dashboard time passes but History/Charts/Detail were not inspected.

Pump controls **DISABLED_VERIFIED for the shown Dashboard and backend policy**; not a blanket visual acceptance for all unvisited control screens. No click used to test denial.

## U. Real Edge screenshot / operator feedback

Operator pointed to `C:\Users\Acer Swift3\Pictures\Screenshots`. Initially newest files were 23:49 previous AQ images and were not reused as AS evidence. Later operator supplied a new Dashboard image in chat; corresponding local PNG was opened and visually inspected.

Source: `Screenshot 2026-11-05 002924.png`, modified `2026-11-04T17:29:24.4860838Z`,172707bytes. Exact create-new copy retained under private AS run as `dashboard.png`, owner/access sole operator verified; source/copy hashes equal:

`7f2c24332d6e33a4bec8b630dced645a5647092818d76f1dfc255e42b729a565`.

No visible password/token/cookie/Authorization; no image editing/manufacture. User reply and screenshot support Dashboard/login, not the absent checklist items. Screenshot set **PARTIAL**: one new image, no new History/Charts/Detail/Network. No all-true operator-acceptance.json fabricated. Supervisor manual accepted=false/MANUAL_WINDOW_EXPIRED describes incomplete structured intake, not absence of actual operator participation.

## V. Bounded post-check database comparison

Post-check `17:34:14.625Z–17:34:14.809Z` passed same SQL identity, migrations, eight mappings,12 frozen readings/units/counts/audit validators. Before/final digest both:

`17bea009981099eae108d0450adda101faea28836094b2cee00376c5776b6e3b`.

**Database before/after UNCHANGED within compared scope; persisted ActivityLog68→68 UNCHANGED.** This is a bounded integrity comparison, not universal proof of zero writes to every database object. No repair/modification to force equality.

## W. Graceful cleanup / native completion

| Owned resource | Actual completion |
|---|---|
|Frontend15520|native0,17:34:15.081Z–15.283Z|
|API18848 / guarded pools|native0,17:34:15.283Z–15.565Z|
|Cluster17652 via pg_ctl7908 smart-stop|native0,17:34:15.565Z–15.765Z|
|Exact shutdown/systemID/ports verification|PASS in reviewed adapter before summary17:34:17.234Z|
|Supervisor3876|exit3,unknownfalse,stderr0|
|Launcher22404 held-handle native completion|exit3,timeoutfalse,signal/errornull,17:34:17.5509381Z|
|Tool session74303|exit3, independently retrieved after completion|

Exit3 is the known incomplete-manual-checklist policy result, not access-violation/native crash or false success0. **GRACEFUL_CLEANUP_PASS**. Independent final metadata read `17:34:46.8159086Z`: zeroDEVlisteners, all five known launcher/supervisor/API/frontend/postgresPIDs absent, postmaster.pid absent; run remains protected sole-operator owner/DACL. No kill/foreign stop, no PGDATA/evidence deletion.

| Private artifact | SHA256 |
|---|---|
|summary.json|`2c3e84061618a4038ccdf2c6cdfa66ab5817daefbdf0d97ffff0dc72494287c0`|
|attempt.json|`397d3b9484241e1c742801aac1e214602e78545e94fad9cf481cc652285759c6`|
|supervisor-native-exit.json|`a539ec2dc9da25206cfc705fe4c622e55cb434537c77e2a7b65754bc6b8a5141`|

## X. Final verdict / remaining gaps

**HISTORICAL_WEBSITE_UI_PARTIAL**. The previous Dashboard rendering blocker is resolved for the observed historical view. All actual startup/auth/read-only/data integrity/cleanup gates passed. Full acceptance still lacks real History/Charts/Device Detail and Network evidence; clipped global notice/historical summary label ambiguity remains. These gaps are not MQTT authentication, database integrity or a reason to alter frozen data/credentials.

No source/manifest change, production DB access/startup, initdb/migration/restore/seed, new MQTT CONNECT/SUBSCRIBE/PUBLISH, broker action, DeviceCommand/ON/OFF, automation, ESP32 reset/flash or pump action. Existing physical adapter state was not changed by Agent. No current physical device/relay state or production flags claimed from historical data. AQ/AR verdicts unchanged.

Any further execution requires a new specifically approved scope; AS1/1 is consumed. Do not auto-start AT, reopen DEV or repeat login. Preserve all artifacts/data.

```text
PHASE AS RESULT
Approval: APPROVED
Attempt: 1/1
Manifest revision7: 250/250 PASS
Runtime binaries: 4/4 PASS
Native preflight: PASS
PostgreSQL identity: PASS
11 migrations: PASS
Actual READ ONLY: 6/6 PASS
Identities: 8/8 PASS
Frozen readings: 12/12 PASS
Derived units: 12/12 PASS
Persisted ActivityLog baseline: PASS
API readiness: PASS
MQTT effective: DISABLED
CommandsEnabled: FALSE
AutomationEnabled: FALSE
Pre-frontend OPTIONS login: HTTP204 PASS
Pre-frontend OPTIONS auth/me: HTTP204 PASS
Direct DEV login: HTTP200 PASS
Pre-frontend supervisor gate: PASS
Frontend readiness: PASS
Manual Edge login: PASS
Zone latest-readings OPTIONS: NOT_VERIFIED
Zone latest-readings GET: NOT_VERIFIED (exact Network status/body); rendered readings PASS
Other Dashboard monitoring requests: PARTIAL
Dashboard visual: PASS for supplied screenshot
Sensor History: NOT_VERIFIED
Charts: NOT_VERIFIED
Device Detail: NOT_VERIFIED
Vietnam timezone: PARTIAL; Dashboard latest time PASS
Historical/stale notice: PARTIAL; sensor-card notice PASS
SOIL quality: BLOCKED
Pump/Automation visual controls: DISABLED_VERIFIED for shown Dashboard/policy; other screens NOT_VERIFIED
Screenshots: PARTIAL
Database before/after: UNCHANGED within compared scope
Persisted ActivityLog: UNCHANGED (68→68)
MQTT CONNECT/PUBLISH: 0 actions by Agent
DeviceCommand: 0 actions by Agent
Pump ON/OFF: 0 actions by Agent
Automation: NOT_ENABLED by Agent
Graceful cleanup: PASS
FINAL VERDICT: HISTORICAL_WEBSITE_UI_PARTIAL
```

**STOP after Phase AS.**
