# Phase AR — Offline DEV UI-only Dashboard read-route remediation

Completed: 2026-11-05 UTC+7. Scope: source review, minimal dedicated DEV-shell fix, synthetic tests. No live execution approval consumed.

## A. Phase AQ partial acceptance

[Phase AQ](MVP_PHASE_AQ_UI_ONLY_BROWSER_ACCEPTANCE.md) remains **HISTORICAL_WEBSITE_UI_PARTIAL**. Real operator screenshots and confirmation established login, Dashboard navigation, sensor/device lists and activity-log display. AQ also established 6/6 read-only paths, 8/8 identities, 12/12 stored readings/derived units, persisted audit count 68→68 and graceful cleanup. Dashboard showed an API-update error and empty monitoring panels. History/Charts/Device Detail were not fully accepted. AR does not rewrite that historical verdict or claim current live connectivity.

## B. Exact Dashboard request graph

Trace: `frontend/src/pages/dashboard/DashboardPage.tsx` → corresponding `frontend/src/services/*.service.ts` → Axios `api.ts` → dedicated shell `routeAllowed` and `preflightPathAllowed` → existing authenticated Express routers/controllers/services.

All requests below are GET. The frontend configures JSON Content-Type and adds Bearer Authorization when authenticated; those headers require a browser preflight. The dedicated origin remains exactly `http://127.0.0.1:55173`. Query parameters do not alter the canonical pathname catalogue. Listed backend routes exist and actual GET/HEAD requests are allowed by the original shell policy.

| Dashboard usage / request | Backend route exists | routeAllowed | CORS catalogue before → after | Expected service result / behavior |
|---|---|---|---|---|
| Mount: `/api/health` | Yes, health router | Yes | Match → match | Full health response envelope; health is public |
| Mount: `/api/reports/overview?from&to` | Yes, report router | Yes | Match → match | Authenticated overview object |
| Mount: `/api/activity-logs?page=1&limit=5` | Yes, activity-log router | Yes | Match → match | Authenticated paginated activity list |
| Summary polling: `/api/devices/summary` | Yes, device router | Yes | Match → match | Authenticated device summary |
| Summary polling: `/api/alerts/summary` | Yes, alert router | Yes | Match → match | Authenticated alert summary |
| Summary polling: `/api/alerts?active=true&limit=5` | Yes, alert router | Yes | Match → match | Authenticated paginated alerts |
| Farm selector: `/api/farms?status=ACTIVE&limit=100` | Yes, farm router | Yes | Match → match | Authorized farm list |
| Zone selector: `/api/zones?farmId&status=ACTIVE&limit=100` | Yes, zone router | Yes | Match → match | Authorized zone list |
| Monitoring: `/api/zones/:zoneId/latest-readings` | Yes, zone router `/:zoneId/latest-readings` | Yes | **Missing → match** | `{zone,sensors}`; each sensor retains type/value/unit/recordedAt; absent measurement stays null |
| Monitoring: `/api/alerts?zoneId&active=true&limit=100` | Yes, alert router | Yes | Match → match | Authorized paginated alerts |
| Monitoring: `/api/actuators?zoneId&type=PUMP&limit=20` | Yes, actuator router | Yes | Match → match | Pump list with runtime control disabled; no fabricated fresh OFF |
| Monitoring: `/api/automation-rules?zoneId&enabled=true&limit=100` | Yes, automation-rule router | Yes | Match → match | List read only; empty list is valid and does not enable automation |

Every row except zone latest-readings is **ROUTE_CONTRACT_MATCHED** at the reviewed method/path/auth/CORS boundary. Zone latest-readings was **ROUTE_CONTRACT_CONFIRMED_MISMATCH**, now corrected offline. This classification does not claim actual browser delivery, current DB availability or successful live responses for every endpoint.

## C. Confirmed mismatch and evidence limits

`sensorService.zoneLatest(zoneId)` calls the existing zone route. Original `routeAllowed` already accepted its GET/HEAD requests, but preflight catalogue omitted it. The mismatch is confirmed by source and synthetic HTTP tests. AQ did not capture the exact browser Network status of every failing request; this omission is not proven to explain every Dashboard symptom.

## D. Minimal changes and rollback

Only execution-source change: `scripts/mvp-ui-only-api.cjs`, adding this single existing-read pattern in `preflightPathAllowed`:

```diff
+ /^\/api\/zones\/[A-Za-z0-9_-]+\/latest-readings$/.test(p)||
```

Other changes: `scripts/mvp-ui-only.test.cjs` adds contract fixtures/regressions; active source manifest advances to revision 7; exact revision 6 bytes are preserved at `docs/PHASE_AE_UI_ONLY_SOURCE_MANIFEST.rev6.json`; this report is new. No source membership expansion.

Exact origin, GET/HEAD semantics, normalization, auth, requested-header allowlist, mutation deny, actual routeAllowed, worker, supervisor, native lifecycle, production CORS and shared Dashboard remain unchanged. Rollback is an offline reviewed removal of the one catalogue line with a new explicitly reviewed manifest revision; do not overwrite historical manifest snapshots or reuse an old execution approval.

## E. Dashboard response/error-handling review

Status: **REVIEWED**, not FIXED_DEV_ONLY. Monitoring uses one `Promise.all` for zone readings, alerts, pumps and automation rules. One rejection rejects the batch, discarding otherwise successful responses from that update. `usePolling` retains previously received data and exposes an error; a scope reset clears monitoring data. An initial failure can therefore combine an error banner with generic empty-state wording. `sensorError` is initialized/reset but not assigned from the polling failure. Mount-only overview/activity requests catch failures without displaying a dedicated panel error; some overview fallbacks use zero.

Actual frontend services propagate HTTP failures; null measurement stays null. TypeScript types are not runtime response-schema validation. A CORS rejection, 401/403, 404, 500, missing data and historical data are different cases and cannot be diagnosed from empty cards alone. Synthetic tests exercise unauthorized 401, missing-zone 404, read-error 500, denied command 403, null readings and current response shapes. No actual Network failure classification was collected in AR.

Proposed separately scoped improvement: a dedicated DEV presentation adapter could keep successful panel reads and show explicit per-panel unavailable/error states, retaining valid previous values without inventing zero or LIVE labels. Shared Dashboard/error-handling changes require **FRONTEND_SCOPE_EXPANSION_REQUIRED** and were not made. This is not a blocker to the minimal reviewed route fix; it remains a browser-acceptance concern.

## F. Synthetic HTTP validation

Tests execute the actual dedicated Express shell/router/controller/service chain against a guarded fake datasource. Actual frontend service modules are transpiled and called through an injected HTTP client that performs OPTIONS then GET. Only guard-owned ephemeral loopback test listeners are used; no API55001, frontend55173, PostgreSQL, Edge or MQTT is started.

Verified: exact-origin zone OPTIONS GET/HEAD204, exact CORS headers, actual authenticated zone GET and response shape, all four monitoring reads together, summary/dropdown/health/report/activity reads, preflight zero DB/auth/audit mutation, failed reads propagated and absent measurements null. Fixtures exercise the stored historical identity/value/time contract in memory; no database record is read or modified.

Negative coverage: wrong origin, unsupported method/header, unknown zone suffix/endpoint, encoded/traversal bypasses, POST latest-readings, actuator commands, DeviceCommand, live-evidence and shadow-preview denial. Existing AN/AP authentication/pre-frontend gate, order and independent attestation validation remain covered. Native/approval/ownership/cleanup regressions remain included.

## G. Historical presentation and data correctness

Frozen eight identity mappings, twelve historical readings, values, recordedAt/receivedAt and derived measurement-unit logic were not edited. Test fixture rows are byte-equal before/after reads. Current backend response maps correctly to frontend service contracts. Pump remains UNKNOWN/controlEnabled=false/gatewayMode=DISABLED in synthetic runtime without trustworthy fresh MQTT state; no historical OFF is promoted to current evidence.

Historical notice and dedicated sensor presentation tests continue to prohibit LIVE claims and preserve Vietnam-time formatting/quality warnings. These are offline checks; they do not establish visual browser layout. **SOIL_SENSOR_QUALITY_BLOCKED** remains; historical SOIL values are not calibration proof. **AUTO_IRRIGATION_PHYSICAL_NOT_EXECUTED**.

## H. Read-only and command-deny invariants

Six-path guarded read-only, unchanged persistent-audit, immutable historical snapshot, auth and command-deny tests PASS. Synthetic login uses memory-only audit. No real persisted audit or records were accessed. No DeviceCommand/ON/OFF action; no MQTT or automation activation. Production startup and firmware are unchanged.

## I. Tests, typechecks and native completion

| Check | Actual result | Evidence |
|---|---|---|
| Targeted three suites | 208/208 PASS, native0 | `build/phase-ar-targeted-1793812144298/` |
| Final nine relevant offline suites | **284/284 PASS**, failed/cancelled/skipped0, Node native0, tool host0 | `build/phase-ar-final-1793812343679/` |
| Backend `tsc -p backend/tsconfig.json --noEmit` | PASS, native0 | `build/phase-ar-backend-typecheck-1793812144378/` |
| Frontend `tsc -p frontend/tsconfig.app.json --noEmit --incremental false` | PASS, native0 | `build/phase-ar-frontend-typecheck-1793812144360/` |
| Node `--check` API and test sources | PASS, native0 each | Final `integrity.json` |
| Runtime source-membership/pin-object equality | PASS, native0 | Final `membership-check.cjs` |

Final nine suites: ui-ai, ui-only-pin-audit, ui-only-supervisor, ui-only, ui-launcher-exit, edge-smoke-observer, edge-smoke-analysis, browser-startup-diagnosis, preflight-boundary. All run under `acceptance-offline-guard.cjs`, serial test concurrency. Final test process PID11396, native0 at `2026-11-04T17:12:33.1925650Z`. Held .NET process handle captured stdout/stderr/native exit with a finite 120s deadline. No success inferred solely from TAP output.

Final TAP SHA256: `0aa8e0ee9418b1d99ce15d4e5752e65abb255ea6d69b1e079adc18af21228dd5`.

One auxiliary membership `node -e` command initially failed with SyntaxError/native1 because Windows PowerShell stripped argument quotes. It executed no membership logic. A file-based equivalent completed native0; it was not a service/preflight retry, and no error was relabeled PASS. No domain regression failed.

## J. Manifest revision 7 and hashes

| Artifact | SHA256 |
|---|---|
| Exact immutable revision 6 snapshot | `6c5cf2c26bb86f0f15545e99cb9f04069f8ca316a83c52dec8b90e8c11871177` |
| Active revision 7 manifest | `000b8bfce621851eeae4829a9618fa289d23358fc0d352387a852e48bad473b7` |
| Reviewed API source | `abc8f02183cbe510b49662d4031ea6efde2b92758457202e7b4ce9e326c9b96a` |
| Reviewed UI-only test | `ef171641a1c6bfcc649852bd59b55c83d5706afcd6251e8de5bf2a6f990874e5` |

Revision7 previousManifestFile points to exact rev6; previousManifestSha256 matches its actual bytes. **250/250 source hashes**, **4/4 runtime hashes**, **3/3 listed offline-test hashes** PASS. Same membership as runtime `sourceFiles()` and rev6; only API execution-source hash and the reviewed test hash changed. Canonical paths, duplicates, traversal and reparse checks PASS. Four runtime binaries are byte-pinned unchanged from rev6; runtime pin object also equals the actual adapter's RUNTIME. Manifest remains source pins only, not execution approval.

## K. Explicit no-live-actions record

Real PostgreSQL NOT_STARTED; actual API/frontend NOT_STARTED; Edge NOT_EXECUTED; MQTT NOT_CONNECTED; credentials NOT_READ; DeviceCommand/ON/OFF **0 ACTIONS**. No migration/seed/restore/reset/flash/service restart/ACL change. No existing approval or attempt marker reused. Evidence created only for this offline work under build and the specified report/manifest files.

Final read-only inspection at `2026-11-04T17:13:10.8365952Z`: no listeners on 55433/55001/55173 and test PGDATA postmaster.pid absent. Runtime safety flags on an actual running service were not claimed from source or synthetic tests.

## L. Remaining browser gaps

Actual Dashboard route delivery after this fix, error-free monitoring panels, History/Charts, Device Detail and complete historical/SOIL warning presentation remain NOT_VERIFIED. Clipped historical banner and potentially ambiguous online labels remain known UI concerns. Existing screenshots do not become a new browser PASS. AR does not establish live hardware E2E, soil quality or physical auto-irrigation.

## M. Recommended next supervised session and final verdict

A newly approved DEV UI-only historical session should pin revision7 and unchanged isolated identity, retain current auth/read-only/native/cleanup gates, and verify the actual Dashboard Network results before interpreting empty panels. Operator should capture Dashboard, History/Charts, Device Detail and historical/SOIL warnings. Check zone latest-readings OPTIONS204 and authenticated GET shape, other monitoring responses, disabled pump controls and no command/audit mutation. Stop on safety/identity contradiction; collect failures without live MQTT or hardware actions. Do not reuse AQ authorization.

**READY_FOR_NEW_DASHBOARD_UI_ACCEPTANCE_APPROVAL**

Dashboard audit COMPLETE; zone/other reviewed read contracts OFFLINE_PASS; response handling REVIEWED; historical correctness OFFLINE_PASS; login/CORS/read-only/command-deny regressions PASS. Live website acceptance remains partial. STOP after Phase AR.
