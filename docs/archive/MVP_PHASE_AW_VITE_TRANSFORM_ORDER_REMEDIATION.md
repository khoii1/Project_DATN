# Phase AW — Offline Vite presentation transform order remediation

Ngày05/11/2026 UTC+7. **READY_FOR_NEW_UI_ACCEPTANCE_APPROVAL**. Đây là kết quả sửa source và actual installed Vite pipeline offline, không phải browser acceptance. Không retry AV hoặc mở Website mới.

## A. Phase AV failure / genuine evidence

[AV](MVP_PHASE_AV_FINAL_UI_ACCEPTANCE.md) giữ nguyên HISTORICAL_WEBSITE_UI_BLOCKED. Một phiên đã consumed1/1; actual native/SQL6paths/CORS/auth/data-postcheck/cleanup PASS nhưng browser gặp `UI_ONLY_PRESENTATION_ANCHOR_DRIFT` tại DashboardLayout. Ảnh thật56274bytes/SHA256 `01b38e92740491ef0541a903ba983a0a4db95859484661f242210ae271cd3a1b` được AV lưu riêng. AW không tạo ảnh giả, không dùng lại approval hoặc khởi động phiên AV.

Baseline trước sửa đã xác minh exact revision8 SHA256 `5fb515a8b55a634336752a5462c05143f2497f218e151988adfd5f8cdf0a83f4`,250source hashes/4binarypins, không DEVlisteners/postmaster. Exact bytes được create-new giữ tại `docs/PHASE_AE_UI_ONLY_SOURCE_MANIFEST.rev8.json`.

## B. Root cause / installed actual order

Installed packages: **Vite7.3.6**, **@vitejs/plugin-react5.2.0**. Reviewed dedicated entry `scripts/mvp-ui-only-frontend.mjs` lists presentation then React, but Vite groups plugins by enforce stage. Former presentation plugin was normal-stage; esbuild had removed raw JSX before it searched exact `<Outlet />`. AU direct raw-source transform/component tests did not exercise this ordering.

This is now confirmed through **actual Vite-resolved configuration and actual serve transformRequest**, not only reading sorting code or assuming array order. No version upgrade, credential, database or source-drift workaround.

## C. Minimal source fix

Only execution-source change, `scripts/mvp-ui-only-presentation.cjs`:

```diff
-function presentationPlugin(){return{name:'ui-only-historical-presentation',apply:'serve',transform(source,id){
+function presentationPlugin(){return{name:'ui-only-historical-presentation',apply:'serve',enforce:'pre',transform(source,id){
```

Byte/hash test verifies removing exactly `enforce:'pre',` reproduces revision8's plugin hash. Anchor checks/replacement counts/error code, DEV scope, banner/layout classes/labels/warnings/timezone, sensor card and command policies are unchanged. No shared production source/layout/Dashboard/backend/schema/firmware change. No overlay suppression or ignored missing anchor.

Other changed file: `scripts/mvp-ui-only.test.cjs`, adding actual pipeline/lineage regressions and moving historical AU manifest assertions to immutable rev8. Also active manifest9, rev8 snapshot and this report. No new execution dependency/member; sourceFiles remains250.

## D. Before/after actual plugin-order evidence

Zero-based positions observed from `server.config.plugins`:

| Pipeline | Presentation | React Babel | esbuild | Raw Outlet at presentation |
|---|---:|---:|---:|---|
|Former normal-stage configuration reproduced offline|15|4|10|false; expected ANCHOR_DRIFT|
|Fixed pre-stage configuration|4|5|11|true; compilation succeeds|

The baseline test removes only enforce from a fresh real plugin instance; production implementation body remains the exact old behavior. Baseline actual transformRequest reproduces AV failure once in a listener-free middleware harness. The expected rejection is a passing regression assertion, not an unexpected test failure or a retry of the live AV session.

Resolved fixed order: presentation → React Babel/refresh → Vite resolve/css → esbuild → normal plugins/import analysis. Both actual plugin order and observed raw input at hook were checked. Adding enforce alone established the required order; no alternative implementation needed.

## E. Actual Vite pipeline integration harness

Tests use installed Vite.createServer in **middleware mode**, never server.listen or the auto-starting entry import. TypeScript AST locates the unique actual `createServer({...})` expression in the pinned dedicated frontend entry. That exact expression is evaluated with actual React/presentation/devCssPlugins dependencies and an empty test envDir; frontend config was not copied into a separately maintained approximation. Entry SHA256 remains `cecd399201fde662b701d0ce286d43f317ac22cfb53223683e66be2abda3cba9`.

Only offline resource overrides: middlewareModetrue,port0,wsfalse,hmrfalse,watchnull,preTransformRequestsfalse,emptywarmup,envFilefalse,private testcache and no-discovery/include-empty optimizer. These do not set/override transform stage ordering. The original source root/plugins/React/CSS/define configuration is retained.

Additional test-local net.Server.listen denial counts all attempted listeners: **0attempts**. Actual httpServer is null; no HTTP/WebSocket listener. Existing acceptance-offline-guard stays preloaded; no app startup, DB credential/runtime imports or network permissions added. Both baseline/fixed middleware containers close with await in normal path and finally; temporary cache/evidence stays under fresh build temp directories, no production ACL/file cleanup.

Tests call **server.transformRequest** on actual source modules through installed resolver/load/pre/React/esbuild/import-analysis pipeline. Missing/duplicate/unexpected raw-layout cases also use actual resolved pluginContainer.transform, not a standalone helper. No browser/DOM acceptance claim.

## F. DashboardLayout compilation

Actual transform output parses as JavaScript with zero syntax diagnostics; raw `<Outlet />` is gone only after the correct pre hook; compiled JSX runtime output exists. Exactly one historical-warning ID in compiled module. The captured actual pre-hook output is parsed as TSX: aside is inside main and before Outlet, with exactly one banner; existing expanded/collapsed sidebar margins and wrapping/accessibility classes present. Existing AU static React rendering checks remain additional coverage for component output.

No banner was inserted outside responsive layout; no duplicate banner or malformed JSX. Pixel visibility at all browser widths still requires actual Edge evidence; successful pipeline compilation does not itself prove layout pixels.

## G. Other affected transform branches

Ten actual modules compiled successfully through the serve pipeline:

1. layouts/DashboardLayout.tsx.
2. pages/devices/DeviceDetailPage.tsx.
3. pages/dashboard/DashboardPage.tsx.
4. pages/reports/ReportsPage.tsx.
5. types/device.ts.
6. components/sensors/SensorValueCard.tsx (DEV card re-export).
7. dev/ui-only-sensor-card.tsx.
8. types/sensor.ts.
9. pages/sensors/SensorHistoryPage.tsx.
10. components/sensors/SensorHistoryChart.tsx.

Tests inspect decoded actual compiled string/template literals: stored/nonLIVE device labels, current connection unverified/MQTTtắt, historical Dashboard/Reports notes, Vietnam timezone, unavailable measurement, SOILuncalibrated/notforautomaticirrigation and measurement-unit metadata. No API records or arbitrary fixture presented to Website.

## H. Negative regressions / DEV-only isolation

Actual resolved pre pipeline rejects missing Outlet, duplicate Outlet and unexpected changed Outlet signature using original ANCHOR_DRIFT. Direct helper unit tests remain. Real build-mode resolveConfig excludes apply:serve presentation plugin; independently compiled original production layout contains no DEV banner. This is additional isolation evidence, **not vite-build used in place of serve tests**. Actual production Vite config remains free of presentation plugin imports and production source hashes remain baseline-compatible.

The deliberate drift inputs are in-memory synthetic source, never written to production component. No anchor check relaxed. Build resolution runs without writing a production bundle.

## I. Historical / SOIL / controls / charts safety

AU component tests retained: actual DEV-transformed layout/detail/report rendering, all3device connection statuses qualified, exact existing sensor values/unit/timestamp, null not zero, SOIL100uncalibrated warning. PumpPresentation disabled policy makes canOn/canOfffalse forOFF/ON/UNKNOWN. Existing API/read-only/auth/pre-frontend/MQTT/DeviceCommand/Automation-deny/native/ownership/cleanup tests retained.

Historical record mappings/12readings/schema/measurement timestamps unchanged. Original chart bucket aggregation byte/hash unchanged; existing three-HUM-samples→one2hmean72.4/count3 test still passes. No demand for three rendered points or fabricated samples.

**SOIL_SENSOR_QUALITY_BLOCKED** / **AUTO_IRRIGATION_PHYSICAL_NOT_EXECUTED** remain. Source tests do not prove live hardware state, calibration or water flow.

## J. Tests / typechecks / native completion

| Actual check | Result | Native evidence |
|---|---|---|
|Targeted actual Vite pipeline parent/subtests|**18/18PASS**,fail/cancel/skip0|Node22460 exit0;`build/phase-aw-pipeline-1793817749515/`|
|Full9related offline suites|**320/320PASS**,fail/cancel/skip0|Node13276 exit0;`build/phase-aw-regression-1793817806045/`|
|Backend typecheck|PASS|Node3924 exit0;`build/phase-aw-backend-typecheck-1793817806076/`|
|Frontend typecheck|PASS|Node6964 exit0;`build/phase-aw-frontend-typecheck-1793817806103/`|
|Node syntax plugin/test|PASS|native0 each|
|Actual10modules compilation / transformed TSX checks|PASS|actual Vite test assertions and final suite native0|
|Final source/runtime/path audit|PASS|native0;final `integrity.json`|

Full suite includes303top-level tests plus17nested pipeline subtests, **320total**, not inferred from historical301. Nine suites: ui-ai,ui-only-pin-audit,ui-only-supervisor,ui-only,ui-launcher-exit,edge-smoke-observer,edge-smoke-analysis,browser-startup-diagnosis,preflight-boundary. Existing offline guard,test-concurrency1. No unexpected regression failed; baseline rejection and negative drift are intentional assertions. Both targeted and full runs preserve their evidence.

Node native handles retained via .NET; stdout/stderr captured separately and120s deadlines finite; timeout would remain unknown/no kill. Actual final native0 at18:43:45.6349551Z; backend18:43:36.9549703Z;frontend18:43:42.7108277Z. Outer tool native completions0; no PASS inferred solely from TAP. Backend `tsc -p backend/tsconfig.json --noEmit`;frontend `tsc -p frontend/tsconfig.app.json --noEmit --incremental false`.

Final pipeline evidence: `build/phase-aw-regression-1793817806045/aw-vite-FqzQgl/aw-vite-pipeline.json`, SHA256 `e67df641adb574e1ae855fb6632b04dc134a99eac5ad9339945fd2b6e7ee45d1`. Contains installed versions/order/module completion/listen0/closedcontainers, no secrets/source-body dumps. Final TAP SHA256 `7fe2a97db37a6426815a21dcfd2225c6782c18cc76ca0ce2bd46395d8147db26`.

## K. Manifest revision9 / lineage / hashes

Actual pipeline PASS was established before creating revision9; subsequent full regression and final audit passed.

| Artifact | SHA256 |
|---|---|
|Immutable rev8/previousManifestSha256|`5fb515a8b55a634336752a5462c05143f2497f218e151988adfd5f8cdf0a83f4`|
|Active revision9|`2b23c8cd86f288d7ba5842e3f2850e37cbaf7f0221c1d8075a1f597d337e9af9`|
|Presentation plugin|`f1f6dd63847a37ceddefccc49ee1c171db2bde9881aacceee5ff074324bc6915`|
|Reviewed offline UI test|`65d447497670ba60c53c1425862074a1e8adcf51b27c2d695b4a5781c959319e`|

Version/purpose/schema unchanged; previousManifestFile points to exact rev8 snapshot. At18:44:26.7073205Z fresh final verification: **250/250source hashes**, same sourceFiles members,**4/4runtime binaries** unchanged,**3/3listed offline-test hashes**,canonical/no duplicate/traversal/reparse PASS. Actual runtime constants equal manifest. Only plugin execution-source hash and reviewed UI test hash changed. Runtime entry/config source remains pinned unchanged. No hash guessed, old manifest activated with new source or failed live gate disguised by new pins. Revision9 is not execution approval.

## L. Explicit no-live-action record

No PostgreSQL startup/connect, real API55001/frontend55173 listener,startup production, Edge/Playwright, MQTT CONNECT/SUBSCRIBE/PUBLISH,DeviceCommand/ON/OFF,Automation,broker/credential changes,migration/restore/seed,frozen-record edits,firmware/reset/hardware/pump-power actions. No AV attempt/approval reused or new live attempt marker created.

Only offline Vite middleware resources permitted by AW were instantiated, with no listener and both containers closed. Existing full regressions may use their guard-owned ephemeral synthetic HTTP fixture; none of that is real DEV API/frontend or database acceptance. Final real metadata inspection:DEVports55433/55001/55173 empty,postmaster.pid absent. Historical reports AT/AU/AV untouched.

## M. Remaining actual-browser requirements

Still requires a newly approved supervised historical UI-only session pinned to revision9: actual module rendering, banner full visibility across widths/sidebar modes, stored-state labels in DeviceDetail/Dashboard/Reports,4×3Historyrows,4charts/aggregation/unit/time,SOILwarning/disabledcontrols, sanitized zone latest-readings OPTIONS/GET Network evidence, bounded data/audit comparison and ownedcleanup. Do not reuse AV1/1 or claim AU unit tests/pipelinecompile equal browser E2E.

No new features or infrastructure are needed for this fix. Rollback if separately required: remove exactly enforce property, verify oldpluginhash against rev8 and restore coherent test/manifest pins; this reintroduces known AV rendering defect, so do not execute it as a solution. No DB rollback required; no rollback performed.

## N. Final verdict

```text
PHASE AW RESULT
Root cause: VITE_TRANSFORM_ORDER_CONFIRMED
Plugin pre-transform ordering: VERIFIED
Actual Vite pipeline: PASS
DashboardLayout compilation: PASS
DeviceDetail transformation: PASS
Dashboard/Reports transformation: PASS
Fail-closed anchor checks: PASS
DEV-only isolation: PASS
Historical/SOIL labels: PASS (offline)
Read-only regressions: PASS
MQTT/Commands/Automation deny: PASS
Offline tests: 320/320 PASS
Backend typecheck: PASS
Frontend typecheck: PASS
Manifest revision9: 250/250 PASS
Runtime binaries: 4/4 PASS
Actual PostgreSQL: NOT_STARTED
Actual API/frontend: NOT_STARTED (offline listener-free Vite middleware only)
Actual Edge: NOT_EXECUTED
MQTT: NOT_CONNECTED
DeviceCommand/Pump ON/OFF: 0 ACTIONS
Automation: NOT_ENABLED
Final: READY_FOR_NEW_UI_ACCEPTANCE_APPROVAL
```

**STOP after Phase AW. Không tự bắt đầu phiên nghiệm thu mới.**
