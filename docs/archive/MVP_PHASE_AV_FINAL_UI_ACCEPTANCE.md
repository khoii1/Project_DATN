# Phase AV — Final supervised historical Website acceptance

Ngày05/11/2026 UTC+7. **HISTORICAL_WEBSITE_UI_BLOCKED** do lỗi DEV presentation plugin khi Vite transform DashboardLayout. Browser không thể hoàn tất các màn nghiệm thu. Không hotpatch/retry hoặc nâng kết quả từ tests AU.

## 1. Genuine approval / private plan / attempt

Approval attachment: `C:\Users\Acer Swift3\.codex\attachments\7339522b-1bca-4200-a849-8f96b9d00092\Pasted text.txt`.

Exact approval/private-copy SHA256: `7d9a513fde77e447d54f8a370ab41f056757a094ba6fe8175ead7998ba260671`.

Private plan directory: `C:\DATN\test-instances\phase13-3b\ui-only-plan-1793816410760-ccc436c88e09`; PlanFile `plan.json` SHA256 `5a0f8212176cbf98461c7d8d4488d7c355706066068297a88d33f0084f1f5704`.

Scope ONE_DEV_UI_ONLY_HISTORICAL_SESSION, maxSessions1/noRetrytrue,manualSeconds600,expiry `2026-11-04T19:05:10.8777819Z`. Fresh create-new protected sole-operator plan/approval copy/provenance; SID `S-1-5-21-1432835263-483988321-3159128977-1001`, root protected/operator-owned, data inherits sole-operator access, no reparse. No AT/earlier approval marker reuse.

Run: `C:\DATN\test-instances\phase13-3b\ui-only-historical-1793816438632-2599e7ae8220`.

Consumption marker: TEST root `ui-only-approved-7d9a513fde77e447d54f8a370ab41f056757a094ba6fe8175ead7998ba260671.attempt.json`, created `18:20:38.8507718Z`, exact run binding. **Attempt1/1 consumed**. Existing reviewed launcher only; operator replied “đã nhập” after Get-Credential, Website secret via transient UTF8 stdin. No reset/stale Website password fallback/token logging or second login diagnostic.

Checklist with expected values/times, order History→Charts→Detail/labels→Network and screenshot directory was supplied before startup; no repeated generic acceptance questions. No browser auto-launch.

## 2. Revision8 fresh verification

At `2026-11-04T18:19:45.9932334Z`: **250/250source hashes**, exact runtime sourceFiles membership, **4/4runtime hashes**, **3/3listed offline-test hashes**, canonical/no duplicate/traversal/reparse, operator root/data rights and freeDEVports/no postmaster PASS; native completion0. PowerShell executable pin checked too.

Manifest revision8/version1/purpose SOURCE_PINS_ONLY_NOT_EXECUTION_APPROVAL, SHA256 `5fb515a8b55a634336752a5462c05143f2497f218e151988adfd5f8cdf0a83f4`. Exact immutable rev7 previousManifestSha256 `000b8bfce621851eeae4829a9618fa289d23358fc0d352387a852e48bad473b7`, previousManifestFile correct. Existing runtime RUNTIME matches same four pins.

Presentation plugin SHA256 `c9b2eaff98aa7fc9c56061d64ba9b2caf83af8b92b13a2bc83a47f956145a546`; production layout SHA256 `f57cd32a867535d5efa4d1dfc772464cbea166720437bad49f7bcf145af8dede`. Both and active manifest rechecked unchanged after browser failure. No expectation hash updated to hide it.

## 3. Native preflight and serving processes

Launcher20496/parent tool16724 OS start18:20:23.6933354Z. Independent held process handle retained. Preflight directory: `C:\DATN\test-instances\phase13-3b\preflight-process-diagnostic-1793816439427-789ced`.

```text
tool16724 → launcher20496 → supervisor19492 → observer8624
→ outerPowerShell2300 → preflightNode2872
→ control2304 / NTFS-listenerPowerShell11032
```

Control2304 exit0 at18:20:40.298Z; helper11032 exit0 at18:20:41.859Z; Node2872 exit0 at18:20:41.8996801Z; outer2300 independently observed exit0 at18:20:41.939Z. No signal/error/timeout; stderr0. Checks-returned18:20:41.861Z. Fresh PG_VERSION17/exact shutdown PGDATA/systemID, binary pins, ACL, no postmaster/reparse/DEV listeners passed. No stdout-only PASS.

Observed owned listeners: postgres6292/loopback55433(OS start18:20:42.2906750Z), API16236/loopback55001(OS start18:20:45.2726290Z), frontend8148/loopback55173(OS start18:20:50.1332430Z). API/frontend are children of supervisor19492. Owned process identity, not old PID assumptions.

## 4. SQL / read-only / baseline / auth evidence

Approved exact target only: `C:\DATN\test-instances\phase13-3b\data`,systemID7698826681383327460,127.0.0.1:55433,smart_agriculture_mvp_dev/public,sa_mvp_dev_app. No production5432 fallback,initdb/migration/restore/seed/role/schema operation. Actual pg_ctl11520 start exit0,18:20:41.990Z–42.907Z. SQL snapshot gate18:20:45.268Z–46.564Z passed exact identity/start binding and11expected migration names/checksums/finished/notrolledback states; same validation repeated by post-check.

Final actual six-path READ ONLY evidence complete=true:

|Path|Verified transactions|PostgreSQL backend PIDs|
|---|---:|---|
|Single|1|21732|
|Concurrent|2|10332,21732|
|Batch|1|10332|
|Callback|1|10332|
|Nested proxy callback|1|10332|
|Actual repository|1|10332|

Every entry reports readonly=on,exactdb/role/55433/public using the same guarded datasource installed into application repositories. READ ONLY before domain reads;RepeatableRead,statement5s/transaction8s/maxWait2s. Nested reuses verified transaction, not separate native nested SQL. Initial pool3verified transactions/twoPIDs. No real DML probe/alternate pool. **READ ONLY6/6 PASS**.

Both snapshots passed **8/8frozen mappings** including types/ownership/GPIO26, **12/12exact stored row IDs/sensorIDs/values/sourceMQTT/recordedAt/receivedAt**, no duplicate/missing rows and **12/12derived units** from actual authoritative metadata. Frozen02/11batches12:11:18.853Z/33.853Z/48.853Z: TEMP30.2each,HUM72.5/72.3/72.4,LIGHT5each,SOIL100each. Units°C/%/lux/%,no persistedunit column invented. This is actual SQL data validation, not a visual History/Chart PASS or renewed MQTT provenance/calibration acceptance.

Fresh persisted tx.activityLog.count baseline68 and post68; no historical-count assumption. Both validators required DeviceCommand0/PENDING0/enabledAutomation0/actuatorON0,allReadings valid>=12. Exact whole-database reading count is not separately exported and is not invented.

API readiness18:20:49.724Z passed ownedPID16236/loopback/databaseconnected/mqttdisabled. Actual worker/supervisor policy commandsfalse/automationfalse/testModetrue/effectivecap1s,memory-onlyaudit; recovery/watchdog/evaluator disabled by dedicated boundary.

Pre-frontend gate18:20:49.724Z–50.128Z: **OPTIONSlogin204,OPTIONSauth/me204,directPOSTlogin200**;exactrequests1/1/1. Required fixedorigin55173/method/header/Vary/emptybody/no credentials/no maxage flags alltrue; worker preflightTransactionsUnchanged/preflightAuditUnchanged/policyVerifiedtrue; directlogin expected owner identity/tokenpresentwithoutlogging/responseorigin/memoryaudit increment verified. Structured supervisor attestation passed before frontend-start18:20:50.129Z; frontend readiness18:20:53.531Z. No second diagnostic login or retry.

Manual window starts `18:20:53.532Z` (**01:20:53UTC+7**) and has fixed600seconds until **01:30:53UTC+7**. HTTP frontend readiness only verifies shell availability; it did not prove all TSX modules compile or that the actual browser authenticated/rendered the app.

## 5. Actual Edge failure / screenshots / per-view verdict

Operator reported “có lỗi” and provided a real screenshot. Matching local `C:\Users\Acer Swift3\Pictures\Screenshots\Screenshot 2026-11-05 012204.png` was opened and visually checked. It shows Vite overlay:

```text
[plugin:ui-only-historical-presentation] UI_ONLY_PRESENTATION_ANCHOR_DRIFT
frontend/src/layouts/DashboardLayout.tsx
replaceExact: scripts/mvp-ui-only-presentation.cjs:5:47
transform: scripts/mvp-ui-only-presentation.cjs:14:15
```

Private create-new copy `layout-transform-error.png` in this run,56274bytes,SHA256 `01b38e92740491ef0541a903ba983a0a4db95859484661f242210ae271cd3a1b`; source/copy hashes equal,owner/access sole operator. No password/token/cookie/Authorization visible. Not a synthetic screenshot and no old AT image reused.

| Required browser check | AV result |
|---|---|
|Website app render|FAIL — blocking Vite transform overlay|
|Manual Edge login|NOT_VERIFIED — local launcher credential/direct API login are separate; no authenticated app page captured|
|History12rows|NOT_VERIFIED — app render blocked|
|Charts4sensors|NOT_VERIFIED|
|DeviceDetail|NOT_VERIFIED|
|Dashboard/Reports newlabels|NOT_VERIFIED|
|Banner/SOIL warning|NOT_VERIFIED in browser; physical soil quality remains BLOCKED|
|Controls disabled visually|NOT_VERIFIED; actual API policy separately gated disabled|
|Zone latest-readings Network|NOT_VERIFIED — overlay screenshot is not Network status/payload evidence|
|Screenshots|PARTIAL — actual failure evidence only|

No rows/values/HTTP statuses/browser confirmations fabricated to fill the checklist. No all-true operator-acceptance.json written.

## 6. Source-confirmed cause and test gap

Read-only diagnosis during AV found a concrete stage-order defect, not source hash drift/password mismatch/DB loss:

1. `presentationPlugin()` has apply:'serve' but no enforce:'pre'. Its layout branch requires exact raw TSX anchor `<Outlet />`.
2. Dedicated entry lists `[presentationPlugin(),react()]`, but declaration order does not override Vite stage groups.
3. Installed Vite `dist/node/chunks/config.js`, sortUserPlugins near35819, places plugins without enforce into normalPlugins. resolvePlugins near28463 places esbuildPlugin near28493 **before normalPlugins** near28498. React Babel plugin also declares enforce:'pre'.
4. Browser requests go through that transform pipeline. JSX has been compiled before the normal presentation hook, so raw `<Outlet />` is unavailable; replaceExact rejects and browser receives the observed overlay.
5. AU tests directly called plugin.transform on raw source and then transpiled it. They verified replacement content/components but did not model actual Vite transform stage ordering. AU301tests PASS did not establish actual module compilation or browser usability. Earlier timezone substitutions were also raw-source-oriented; this actual failure exposes the general ordering gap for these DEV transforms.

**PRESENTATION_TRANSFORM_ORDER_DEFECT_CONFIRMED**. No claim Node/Vite/Edge version mismatch or environment drift. Runtime safety/command policies did not need to be relaxed.

Minimal proposed offline remediation, **not performed in AV**: run the raw-TSX transform in an explicitly reviewed pre phase before JSX compilation, retain fail-closed anchor checks, and add regression proving actual Vite ordering and transformed output for Layout/Device/Reports/types, plus compilation/component/read-only/deny/manifest checks. Test must not rely only on a direct raw-source transform. No need to disable overlay, loosen anchor failure, mutate records/reset credentials or build new infrastructure.

## 7. Bounded post-check and cleanup

Manual window ended18:30:53.761Z. Bounded guarded post-check18:30:53.762Z–53.918Z passed same frozen identity/reading/units/migrations/count validators. BeforeDigest=AfterDigest:

`17bea009981099eae108d0450adda101faea28836094b2cee00376c5776b6e3b`.

Compared data **UNCHANGED**,persistedActivityLog **68→68 UNCHANGED**. This is bounded integrity comparison,not universal all-table zero-write proof. No repair to force equality.

|Owned native lifecycle|Actual outcome|
|---|---|
|Frontend8148 graceful stop|exit0,18:30:54.119Z–54.320Z|
|API16236/Prisma pools stop|exit0,18:30:54.320Z–54.619Z|
|postgres6292 smart-stop via pg_ctl8332|exit0,18:30:54.619Z–54.819Z|
|Exact control/systemID/shutdown/ports check|PASS before finalsummary18:30:56.216Z|
|Supervisor19492|exit3,unknownfalse,stderr0|
|Launcher20496 independent held handle|exit3,timeoutfalse,error/signalnull,18:30:56.5615839Z|
|Tool session21833|exit3 independently retrieved after completion|

**GRACEFUL_CLEANUP_PASS**. Independent read18:31:32.2774194Z:zeroDEVlisteners55433/55001/55173,knownfivePIDsabsent,postmaster.pidabsent. No unreviewed early-stop lifecycle,forged acceptance,foreign stop or force-kill. Existing600s manual window not extended. Source/runtime post-verification completed with no drift; final manifest hash unchanged.

Supervisor MANUAL_UI_NOT_VERIFIED/acceptedfalse/MANUAL_WINDOW_EXPIRED and policy exit3 are not a native crash. Actual screenshot demonstrates a render failure, so human-reviewed final verdict is BLOCKED rather than merely missing screenshots.

|Private artifact|SHA256|
|---|---|
|summary.json|`1c35058b655cd02b078bc8052892c818bd04f0444dcc0e3139c4d9ae43f9e2b5`|
|attempt.json|`5ca779cca1a6688cee03d894391b18a21e5966d3dab77e87d68ffce5e24904b8`|
|supervisor-native-exit.json|`dc3722137522247783f77d32062bd8bcd6d16c857416be1a40ee77b0372e1038`|

## 8. Scope and final disposition

UI acceptance is **HISTORICAL_WEBSITE_UI_BLOCKED** in AV. No code/manifest edits, hotpatch, alternate launcher or second session. Source fix requires a separate offline scope after owned cleanup; do not auto-start AW.

No MQTT CONNECT/SUBSCRIBE/PUBLISH,productionDB/backend,migration/restore/seed,DeviceCommand/ON/OFF,Automation,firmware/ESP32/hardware/pump-power action. Evidence/report only; historical AS/AT/AU reports unchanged. No new offline test/code changes made during AV. AU301tests remain historical offline results; their coverage gap is explicitly recorded rather than relabeled browser success.

```text
PHASE AV RESULT
Approval: APPROVED
Attempt: 1/1
Manifest revision8: 250/250 PASS
Runtime binaries: 4/4 PASS
Native preflight: PASS
PostgreSQL DEV: PASS
11 migrations: PASS
Real READ ONLY: 6/6 PASS
Identities: 8/8 PASS
Stored readings: 12/12 PASS
Derived units: 12/12 PASS
Persisted ActivityLog baseline: PASS
CORS: 204/204 PASS
Direct login: 200 PASS
Frontend: READY HTTP shell; actual app render BLOCKED; now STOPPED
Manual Edge login: NOT_VERIFIED
History 12 rows: NOT_VERIFIED
Charts 4 sensors: NOT_VERIFIED
Device Detail: NOT_VERIFIED
Dashboard/Reports labels: NOT_VERIFIED
SOIL warnings: NOT_VERIFIED visually; soil quality BLOCKED
Controls disabled: NOT_VERIFIED visually; actual API policy disabled PASS
Zone Network: NOT_VERIFIED
Screenshots: PARTIAL — actual transform failure evidence
Data before/after: UNCHANGED within compared scope
Persisted ActivityLog: UNCHANGED —68→68
MQTT CONNECT/PUBLISH: 0 actions by Agent
DeviceCommand: 0 actions by Agent
Pump ON/OFF: 0 actions by Agent
Automation: NOT_ENABLED by Agent
Graceful cleanup: PASS
FINAL: HISTORICAL_WEBSITE_UI_BLOCKED
```

**STOP after Phase AV. Không tự bắt đầu AW hoặc retry AV.**
