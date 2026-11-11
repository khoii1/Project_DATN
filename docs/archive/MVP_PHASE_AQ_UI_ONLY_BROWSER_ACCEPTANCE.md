# Phase AQ — Real DEV Historical Website Acceptance

Ngày 04/11/2026, UTC+7. **HISTORICAL_WEBSITE_UI_PARTIAL**. Actual SQL/CORS/login/pre-frontend ordering PASS; operator đăng nhập được và có ảnh thật, nhưng Dashboard có lỗi, các màn History/Charts/Detail chưa đủ bằng chứng. Phiên đã kết thúc, cleanup PASS. Không retry hoặc hot patch.

## A. Actual approval / provenance

Genuine attachment: C:\Users\Acer Swift3\.codex\attachments\47ec1942-819d-4e31-96ad-95f81c3ae142\Pasted text.txt.

Approval SHA256: 6b9e1f9b292832e740f04c200dffa913d4c7af332e35ff97f3fb69a95e114150.

Scope ONE_DEV_UI_ONLY_HISTORICAL_SESSION, maximum1/no retry, manifest6. Exact approval bytes copied privately; no AO/AM/AH/AK/reopen approval reuse or fabricated provenance.

## B. Fresh manifest / source / binary integrity

File inspection native0/chunk9a6b3e verified exact revision6/version1/purpose/hash, rev5 lineage, 250/250 source hashes, sourceFiles membership, canonical paths/no duplicates/traversal/reparse, four runtime binaries/constants agreement, offlineTestHashes and PowerShell executable pin.

Manifest SHA256: 6c5cf2c26bb86f0f15545e99cb9f04069f8ca316a83c52dec8b90e8c11871177.

No source/config/manifest changes. AP255/255 tests were supporting historical evidence, not substituted for fresh checks.

## C. Private plan / run / one attempt

Plan: C:\DATN\test-instances\phase13-3b\ui-only-plan-1793810388805-6de02c2f862c\plan.json.

Plan SHA256: 2551dcde119e86ef2278dd61a17823ca2f6d4dc3969bae25691a428affe5bb93.

Owner expected operator SID, protected sole-operator FullControl DACL, no reparse; create-new files. Reviewed schema, maxSessions1/manualSeconds600/expiry45min. Private provenance contains actual attachment/copy/plan/manifest hashes, operator and scope, no secrets.

Consumed marker: C:\DATN\test-instances\phase13-3b\ui-only-approved-6b9e1f9b292832e740f04c200dffa913d4c7af332e35ff97f3fb69a95e114150.attempt.json, created 2026-11-04T16:41:11.6211750Z.

Run: C:\DATN\test-instances\phase13-3b\ui-only-historical-1793810471404-d966a5966016.

**Attempt1/1 consumed.** Operator replied “đã nhập”; subsequent actual login corroborates local credential handoff. No password/token in logs/report, no stale DPAPI Website-password fallback or reset.

## D. Native completion / fresh preflight

Reviewed interactive launcher PID16840, parent tool12544, OS start2026-11-04T16:40:18.0607616Z. Parent held process handle and recorded independent native exit; no alternate launcher or inline JavaScript/stdin source replay. UTF8 stdin carried credential only, per AP.

Preflight directory: C:\DATN\test-instances\phase13-3b\preflight-process-diagnostic-1793810472272-c93752. Manifest approvalHash matches AQ.

~~~text
Launcher16840 → supervisor20372 → observer15392
→ outerPowerShell12992 → preflightNode22392
→ control11364 / NTFS-listeners20936
~~~

Control11364/helper20936/Node22392/outer12992 native0, stderr0, no errors/signals/timeouts. Node OS start16:41:13.1675732Z, outer OS start16:41:12.3857326Z; checks-returned16:41:15.061Z; supervisor preflight finished16:41:15.172Z.

Fresh facts verify exact PGDATA/systemID, PG_VERSION17, clean shutdown/no postmaster, binary pins, operator root/data ACL and three DEV ports free. No oldAK/Y facts used as freshPASS or production5432 access.

## E. PostgreSQL identity / migrations

Exact target: C:\DATN\test-instances\phase13-3b\data, systemID7698826681383327460, 127.0.0.1:55433/smart_agriculture_mvp_dev/public, role sa_mvp_dev_app.

pg_ctl start21752/native0,16:41:15.172Z–16:41:16.056Z. Actual postgres16172, OS start16:41:15.3237347Z, matching loopback listener. Actual SQL verification16:41:17.826Z–16:41:19.254Z passed database/role/schema/port and11migration names/checksums/finished/notrolledback checks. Same validation repeated post-session.

Results are supported by final stage evidence and exact pinned validation source; no raw row export or extra SQL after shutdown. No initdb/migrate/restore/seed/role/schema changes.

## F. Actual six-path READ ONLY

Final readonlyCoverage version1/complete=true:

| Path | Transactions | PostgreSQL backend PIDs |
| --- | ---: | --- |
| single | 1 | 16036 |
| concurrent | 2 | 15016,16036 |
| batch | 1 | 15016 |
| callback | 1 | 15016 |
| nested proxy callback | 1 | 15016 |
| actual repository | 1 | 15016 |

Every entry: readonly=on, correct database/role/55433/public. Same guarded datasource is installed into application repository. READ ONLY before domain reads, RepeatableRead, statement5s/transaction8s/maxWait2s. Nested reuses verified transaction, not a separate native nested transaction. Initial snapshot pool verification3transactions/twoPIDs. No DML probe/alternate pool. **ACTUAL_READONLY_SIX_PATHS_PASS**.

## G. Eight identity records

Both actual snapshots passed frozen farm/zone/controller/four-sensor/pump ID/type/status/relationship checks, owner mapping and GPIO26. **IDENTITY_RECORDS_8_8_PASS** under existing pinned validator. No registration/upsert/presence rewrite.

Device-list screenshot corroborates ESP32-GF-A-01/ESP32 DevKitV1 and frozen farm/zone. It does not verify current physical connectivity.

## H. Twelve readings / derived units

Both actual guarded snapshots passed exact12IDs/sensorIDs/values/sourceMQTT/recordedAt/receivedAt, no duplicate/missing rows. **FROZEN_READINGS_12_12_PASS**.

AP parsed actual authoritative backend/frontend metadata and derived12measurementUnits entries; supervisor validation passed: TEMP→°C, AIR_HUMIDITY→%, LIGHT→lux, SOIL_MOISTURE→%. **MEASUREMENT_UNITS_12_12_PASS** at sensor-type/mapping boundary. No persistedunit column invented; full unit array is not separately exported in summary.

Operator sensor-list screenshot shows latest30.2°C/72.4%/5lux/100%, timestamp19:11:48 ngày02/11/2026. This verifies four latest displayed records, not the History rendering of all12. SOIL100numeric is not calibration/current telemetry. **SOIL_SENSOR_QUALITY_BLOCKED** retained.

## I. Persisted audit / baseline

Actual tx.activityLog.count: before68/after68. Before/post validators also required DeviceCommand0/PENDING0/enabledAutomation0/actuatorON0 and valid totalSensorReadingcount; both PASS. Exact whole-database reading count is not separately exported: do not invent12asDBtotal. No memory-audit substitution or assumption from historical68.

Baseline/final digest both:

17bea009981099eae108d0450adda101faea28836094b2cee00376c5776b6e3b

Includes full mapping/rows/counts/migrations plus derived units. It differs from pre-AP digests because AP added unit evidence; compare only before/after within AQ.

## J. API readiness / effective policy

API8320, OS start16:41:17.8297376Z, loopback55001. API stage finished16:41:24.019Z, readiness16:41:25.373Z. Health independently returned databaseconnected/mqttdisabled. Serving IPC/gate observations matched owned PID, commandsfalse/automationfalse/testtrue/cap1/mqttdisabled, memory-only audit. No server.ts/command-recovery/watchdog/evaluator/production fallback.

## K. Actual OPTIONS login

Final gate evidence: attemptedtrue/status204; origin/method/header/Vary/bodyempty/no-credentials/no-cache checks alltrue. Fixed origin55173/requestedPOST/content-type, exactlyone request. **HTTP204 PASS**. No automated HTTP retry.

## L. Actual OPTIONS auth/me

Status204 and same required flags alltrue, requestedGET/authorization, exactlyone request. **HTTP204 PASS**.

preflightTransactionsUnchanged=true, preflightAuditUnchanged=true, policyVerified=true through worker observations. Application-level instrumentation observed no SQL/auth side effect; not OS/packet-capture proof.

## M. Actual direct DEV login

Exactlyone automated POST: HTTP200; success/authenticatedIdentityMatched/tokenReturned/responseOriginMatched/memoryAuditVerified alltrue. Exact existing ownerID/email/FARM_OWNER/ACTIVE validated; one expected memory-audit increment. **DIRECT_DEV_LOGIN_PASS**.

Password/JWT/raw response not persisted or exposed. Operator's later ordinary browser login is separate; Agent performed no second automated login. Persisted audit remained68→68.

## N. Pre-frontend attestation / ordering

Stage16:41:25.373Z–16:41:25.786Z, APIpid8320, completed/passed=true, failureReasonnull; request counts1/1/1 and statuses204/204/200 validated independently by supervisor.

Frontend-start16:41:25.787Z: after full gate completion. **PRE_FRONTEND_GATE_PASS** in actual execution; no watcher/race/hot patch.

## O. Frontend readiness

Frontend16244, OS start16:41:25.7906563Z, loopback55173; readiness16:41:30.546Z. Dedicated historical entry/API55001/isolatedenv, no production fallback. Operator opened Edge; Agent did not launch browser/Playwright.

## P. Operator manual evidence

User supplied four real screenshots and replied “được rồi” to the login question. This confirms successful login/navigation, not all checklist items. Dashboard screenshot independently shows errors. No all-true acceptance was fabricated.

| Item | Result |
| --- | --- |
| Edge login/navigation | PASS — authenticated pages/account header/user confirmation |
| Device/sensor/activity list data | PASS for visible content |
| Dashboard layout/selectors/countcards | PASS |
| Dashboard data update | **FAIL** — “Không thể cập nhật dữ liệu”, “Không thể cập nhật API” |
| Dashboard environmental/pump panels | **FAIL** — no-sensor/no-pump messages while sensor list contains4 |
| Frozen Farm/Zone/ESP32 | PASS in visible labels |
| Latest TEMP/HUM/LIGHT values and units | PASS:30.2°C/72.4%/5lux |
| Latest SOIL numeric | PASS:100%; physical qualityBLOCKED |
| Full12row SensorHistory | NOT_VERIFIED — sensor-list screenshot only |
| Charts / actual plotted series | NOT_VERIFIED |
| DeviceDetail | NOT_VERIFIED — device-list screenshot only |
| Vietnam timestamp | PASS for latest sensor-list19:11:48/02-11; other views NOT_VERIFIED |
| Historical/notLIVE/SOIL notice | PARTIAL — globalnotice visible but left/start clipped by sidebar |
| Historical device status labeling | PARTIAL — globalnotice qualifies it, list still green “Trực tuyến” |
| Pump/Automation visual disabled state | NOT_VERIFIED — no irrigation/control screenshot |
| Browser login CORS failure absent | PASS for successful login; no sanitized DevTools capture |
| No errors preventing normal Dashboard view | **FAIL** |

No request to continue controls/CRUD/ON/OFF after failure. Visible Add/Edit buttons do not prove mutations permitted; server remains read-only. “MVP SIMULATOR owner-a” is the existing fixture account display name, not proof hardware readings are synthetic.

## Q. Screenshots / inspection window

**PARTIAL**: actual chat images Dashboard, ActivityLogs, SensorList, DeviceList, directly inspected. No visible password/JWT/cookie/Authorization. Not synthetic/SSR images.

No local PNG path/bytes supplied: no invented image hash or private-PNG acceptance claim. Required History/Charts/DeviceDetail absent. Old activity rows are not evidence current login persisted an audit event.

Manual window16:41:30.546Z–16:51:30.904Z, 23:41:30–23:51:30UTC+7. No valid all-pass operator-acceptance.json; summary acceptedfalse/MANUAL_WINDOW_EXPIRED. That does not mean no operator interaction: actual partial feedback/screenshots and DashboardFAIL are recorded here. No extension/restart.

## R. Post-acceptance data comparison

Bounded guarded post-check16:51:30.904Z–16:51:30.953Z completed, same mappings/12rows/derivedunits/counts/migrations. Both digest identical; persistedAudit68===68. **DATA_BASELINE_UNCHANGED** in comparedscope, not universal all-table zero-write proof.

Post-source/runtime checks also completed without failure before cleanup. No data repair or code/pin changes to force equality.

## S. Graceful cleanup / native ownership

| Boundary | Native result |
| --- | --- |
| Frontend16244 STOP | 0,16:51:31.272Z–31.476Z |
| API8320/Prisma STOP | 0,16:51:31.476Z–31.774Z |
| TESTpostgres16172 smart stop via pg_ctl8348 | 0,16:51:31.774Z–31.963Z |
| Final exact control/shutdown/ports | PASS before summary16:51:33.693Z |
| Supervisor20372 | 3,unknownfalse,stderr0 |
| Launcher16840 held-handle exit | 3,timeoutfalse,signal/errornull,16:51:33.9556095Z |
| Parent tool/session25384 | 3,chunkf01c8f |

Exit3 preserved as known incomplete-manual policy outcome, not crash/nativeUNKNOWN or false0. **GRACEFUL_CLEANUP_PASS**. Independent read16:52:27.6942447Z: zeroDEVlisteners, postmaster.pid absent, known supervisor/API/frontend/postgres/launcherPIDs absent, run protected operator-only owner/DACL. No foreign stop/force-kill, no PGDATA deletion.

Private artifact hashes:

| Artifact | SHA256 |
| --- | --- |
| summary.json | ce608cae4b9a53450df2359430efc7e8d4cdd456ff1725845807827e975b2d12 |
| supervisor-native-exit.json | 037a429176f77245b9d281c86c7ee83551efe556d619b5d3ef757ee53eaa1d10 |
| attempt.json | b87574c19dfc02e1fac8eec1f454da9741fbd49f3cb358caed0f8c3280b0b52a |
| launcher-receipt.json | 26b502322dbe2c2bfe00c69e1f4788087126e222064d62dc1715dce5cd408e66 |

Interactive launcher start/nativeexit files remain in private plan directory. All evidence/consumed marker/history preserved.

## T. Final verdict / minimal next recommendation

**HISTORICAL_WEBSITE_UI_PARTIAL**. Actual login/CORS/SQL/unit/ordering blocker has passed. Dashboard is not accepted; missing History/Charts/Detail/control evidence cannot be inferred from “được rồi”.

Passive source review found a concrete mismatch: sensorService.zoneLatest requests GET /api/zones/:zoneId/latest-readings, an existing backend route; current preflight catalogue permits zone list/detail but omits this subroute. Dashboard fetchMonitoring uses Promise.all(zoneLatest,alerts,actuators,automation). A failure of zoneLatest can reject the whole group and leave sensor/pump panels empty. This is a source-confirmed missing read pattern consistent with the screenshot; the actual failing Dashboard endpoint/status was not captured from Network, so it is not claimed to explain every Dashboard error. No extra live probes or patch in AQ.

Propose only a narrow offline read-catalogue fix plus regression for actual Dashboard request contracts, then review remaining visual gaps. No password reset, productionCORS change, MQTT, migration or infrastructure expansion needed. Further source/startup work requires its own scope; do not reuse consumedAQ or auto-startAR.

~~~text
PHASE AQ RESULT
Approval: APPROVED
Attempt: 1/1
Manifest revision6: 250/250 PASS
Runtime binaries: 4/4 PASS
Native completion: known policy exit3; no crash/UNKNOWN
Fresh PostgreSQL preflight: PASS
PostgreSQL DEV identity: PASS
11 migrations: PASS
Actual six-path READ ONLY: 6/6 PASS
Identity records: 8/8 PASS
Frozen ESP32 readings: 12/12 PASS
Measurement units: 12/12 PASS (derived)
Persisted ActivityLog baseline: PASS
API readiness: PASS
Effective MQTT: DISABLED
CommandsEnabled: FALSE
AutomationEnabled: FALSE
Pre-frontend OPTIONS login: HTTP204 PASS
Pre-frontend OPTIONS auth/me: HTTP204 PASS
Direct DEV login: HTTP200 PASS
Pre-frontend supervisor gate: PASS
Frontend readiness: PASS
Manual Edge login: PASS
Dashboard: FAIL for data update/panels
Sensor History: NOT_VERIFIED; sensor list PASS
Charts: NOT_VERIFIED
Device Detail: NOT_VERIFIED; device list PASS
Timezone: PARTIAL; latest-list timestamp PASS
Historical/SOIL warnings: PARTIAL; soil qualityBLOCKED
Screenshots: PARTIAL (four in chat)
Data before/after: UNCHANGED within comparedscope
Persisted ActivityLog before/after: UNCHANGED —68to68
MQTT CONNECT/PUBLISH: 0 actions by Agent
DeviceCommand/Pump ON/OFF: 0 actions by Agent
Automation: NOT_ENABLED
Graceful cleanup: PASS
FINAL VERDICT: HISTORICAL_WEBSITE_UI_PARTIAL
~~~

No productionDB/credential change, migrations/restore/seed, MQTT/broker action, DeviceCommand/ON/OFF/pump power, automation, ESP32 reset/flash, historical rowchange, sourcehotpatch or retry. Currentproduction flags/PENDING not queried. Previous phase reports unchanged. **STOP sau AQ.**
