# Phase AP — Offline Pre-Frontend CORS/Auth Gate Remediation

Ngày04/11/2026 UTC+7. **READY_FOR_NEW_UI_ONLY_APPROVAL**. Source remediation, synthetic tests và manifest6; không live execution, không resumeAO.

## A. Phase AO blocker và baseline

[AO](MVP_PHASE_AO_UI_ONLY_BROWSER_ACCEPTANCE.md) dừng đúng tại execution-contract review, attempt0/1: supervisor mở frontend sau API health nhưng chưa await actual OPTIONS/direct-login gate. [AN](MVP_PHASE_AN_DEV_UI_ONLY_CORS_REMEDIATION.md) đã sửa restricted CORS shell; AP không sửa policy đó hoặc authentication production.

Đã đọc reviewed AE/AI supervisor, runtime/worker/API, readonly adapter, frozenYdataset, AN/AO reports và active manifest5. Trước sửa, exact rev5 SHA256 khớp `bb073209114dd4ed5bbf76abd10e1407a9e4f5a27f87e97b07ace63d78d780e5`; tạo immutable byte-copy snapshot. Không approval/attempt/live resource mới.

## B. Orchestration call graph

Existing launcher tiếp tục là `scripts/mvp-ui-only-session.ps1`; existing supervisor/runtime vẫn là lifecycle duy nhất. Không alternate launcher hoặc post-start watcher.

```text
fresh approval/source pins → private run + one-shot consumption
→ native DEV preflight → exact TEST cluster start
→ SQL identity/migrations/mapping/readings/audit baseline
→ API + actual six-path READ ONLY → API readiness
→ PRE-FRONTEND VERIFICATION (new, awaited)
   → worker observation → OPTIONS login → OPTIONS auth/me
   → observation unchanged → one direct DEV login → audit observation
   → supervisor validates full structured evidence
→ frontend start/readiness → bounded manual Edge inspection
→ guarded post-check → existing owned graceful cleanup
```

Local Website credential prompt occurs in launcher after plan verification and **before startup/attempt consumption**, then travels only over redirected anonymous stdin to the supervised Node child. No DEV service is left waiting while operator has not submitted the prompt.

## C. Mandatory stage and source changes

Supervisor inserts awaited `pre-frontend-verification` between api-readiness and frontend-start, deadline15s. It requires the adapter, sanitizes evidence for summary and independently validates shape, PID, HTTP status, individual booleans, request counts and outcome. `passed=true` alone, missing/extra/malformed evidence, foreignPID or failing fields cannot start frontend. Rejected attestations are explicitly marked passed=false in summary; raw fields/exceptions are not logged.

Changed existing execution sources only:

| File | Change |
| --- | --- |
| scripts/mvp-ui-only-supervisor.cjs | Await/validate pre-frontend gate, AbortController, derived-unit assertions/digest |
| scripts/mvp-ui-only-runtime.cjs | Closed UTF8 stdin credential parser; gate adapter using fixed loopback HTTP and existing worker IPC |
| scripts/mvp-ui-only-worker.cjs | Read-only metadata-derived unit evidence; GATE_OBSERVATION returns memory counters/policy without SQL |
| scripts/mvp-ui-only-api.cjs | Pure/injected gate verifier, bounded sanitized attestation and independent validation/sanitizer |
| scripts/mvp-ui-only-historical.cjs | Authoritative unit extraction/derivation/validation |
| scripts/mvp-ui-only-session.ps1 | Local secure Website prompt; private UTF8 stdin handoff; secret cleanup |

Two existing test files changed: `scripts/mvp-ui-only-supervisor.test.cjs`, `scripts/mvp-ui-only.test.cjs`. No new execution module/dependency, no production code/Prisma/firmware changes. Exact250source members retained.

## D. OPTIONS verification

Gate requests only fixed endpoints at http://127.0.0.1:55001:

1. OPTIONS/api/auth/login, exact Origin http://127.0.0.1:55173, requestedPOST, content-type.
2. OPTIONS/api/auth/me, sameOrigin, requestedGET, authorization.

Each must return204/emptybody, exact origin, only expected method/header, complete Vary set, no Allow-Credentials/Max-Age. Header-name comparisons use case-insensitive Headers lookup and normalized token sets; values/origin/method remain exact as applicable. No wildcard or arbitrary URL parameter, production fallback, command route, redirect following or automatic retry. Real adapter uses fetch redirect=error and per-request timeout3s.

Worker GATE_OBSERVATION before/after both preflights must have same guarded-transaction count and same memory-audit count, matching ownedAPIpid and disabled runtime policy. Observation itself executes no SQL/auth. This checks application-level effects through existing instrumentation; not an OS packet-capture or all-process proof.

AN `preflightPolicy`, `uiOnlyHttpBoundary` and actual routeAllowed decisions are unchanged. No generic OPTIONS bypass or expanded actual POST permission.

## E. Secure direct DEV login contract

After preflight PASS, exactly one POST/api/auth/login with existing DEV owner account. Launcher uses Get-Credential, prefilled `owner-a@mvp.invalid`, checks exact username, never hardcodes the password. No DPAPI userPassword fallback: that old provisioning value became stale after the separate user-approved password change. Existing DPAPI app DB/JWT handling stays inside worker as before.

`Send-UIOnlyWebsiteCredential` creates transient JSON, encodes UTF8 bytes, writes StandardInput.BaseStream, flushes/closes the pipe, clears byte buffer and drops plaintext references. No password in PlanFile, CLI, environment, files, logs or IPC evidence. Node parser accepts only exact email/password fields, <=4096 UTF8 bytes, bounded15s input wait; preserves Unicode and leading/trailing spaces, rejects missing/extra/malformed input. Scope/authentication are still real, not fixture substitution.

Windows PowerShell on this machine has CLR4.0.30319.42000 and **does not expose ProcessStartInfo.StandardInputEncoding**. Read-only reflection revealed this before execution; implementation uses BaseStream byte writes rather than that unsupported property. Offline AST/injected PSCredential/pipe tests PASS. No real credential prompt or decrypt in AP.

Operator prompt is interactive and precedes any service startup; it is not represented as an automatically timed OS dialog. Once child execution starts, stdin and verification deadlines apply. Cancellation/invalid credential stops before service startup. Future operator must run the reviewed launcher in an accessible local interactive session; prompt visibility and real credentials are not live-verified by AP.

Gate validates HTTP200, success===true, exact ownerID `mvp-owner-a`/email/roleFARM_OWNER/statusACTIVE, nonempty returned token, correct response allow-origin and one memory-audit increment with DEV_MEMORY_ONLY_NO_AUDIT_PERSISTENCE. Token/body/password remain transient; reference cleanup occurs on success/failure. Managed immutable strings cannot be guaranteed byte-zeroed by JavaScript/.NET; no claim of forensic memory erasure.

## F. Failure / timeout / cancellation

No retries: twoOPTIONS and at most onePOST, with early stop after first failure. Status codes are retained separately from sanitized reason labels (CORS_STATUS/CORS_HEADERS/LOGIN_STATUS/LOGIN_PAYLOAD/LOGIN_EVIDENCE/etc.). Transport, timeout, cancellation, credential-contract failure and observed redirect classification do not expose exception messages or raw response bodies. Response text is bounded to32768bytes for acceptance; oversized payloads fail closed.

Stage AbortController cancels underlying HTTP on stage completion/failure/deadline; runtime combines it with3s per-request timeout. Missing gate and malformed attestation are ordinary fail-closed failures. Existing owned API/worker/cluster cleanup runs; no duplicate shutdown implementation.

If the supervisor stage itself times out with unknown completion, its existing conservative policy remains: request graceful owned child shutdown, retain uncertain cluster for review rather than force-kill/claim full cleanup. Tests explicitly verify this disposition. Known completed HTTP failures can safely follow existing full owned cleanup. AP does not weaken native/process ownership policy.

## G. Structured attestation

Summary adds `preFrontendGate`, with version/APIpid/apiReady, both preflight records, directDevLogin record, transaction/audit/policy checks, exact request counts and completed/passed/failureReason. Each record carries attempted/status and independent expected-property flags. No password/token/cookie/Authorization value/raw response or arbitrary exception field.

Supervisor validates exact key sets and every required fact/status (204/204/200, matching ownedAPIpid, count1each), not only worker/verifier flags. Evidence sanitizer whitelists fields/types; invalid extra fields cannot reach summary. Failure keeps actual valid HTTP status but forces summarypassed=false. Gate state comes from existing worker IPC tied to same API process; no external-trust upgrade or publisher assurance claim.

## H. Expected-unit validation

Actual schema: neither Sensor nor SensorReading has a persisted unit column. `SensorReading` stores sensorId/value/source/recordedAt/receivedAt; sensor.type is authoritative input. Production sensor.service derives presentation units from `backend/src/constants/sensor-metadata.ts`. Frontend has matching metadata in `frontend/src/types/sensor.ts`.

Expected existing mapping: TEMP→°C, AIR_HUMIDITY→%, LIGHT→lux, SOIL_MOISTURE→%. AP copies these known authoritative values into frozen expected metadata and checks them against **both actual pinned source tables** using a narrow parser, no eval/production runtime import. Missing/duplicate/wrong unit metadata blocks verification.

Each snapshot derives12 `measurementUnits` entries from actual readingID/sensorID and mapped sensor.type. Supervisor independently validates exact reading/sensor/type/unit evidence, with strict equality. Existing frozen rowID/value/source/recordedAt/receivedAt checks remain. No unit field is invented or added to DB rows; no stored value changes. Full original mapping/row/count/migration digest remains and now also includes derived-unit evidence.

This is sensor-type/mapping/presentation unit verification, not per-row persisted unit, soil calibration or physical sensor quality acceptance.

## I. Positive / negative offline tests

Covered: exact APIready→OPTIONS→login→frontend sequence; request headers/URLs/redirect policy; Unicode/space credential semantics; safe evidence; memory audit/no preflight SQL; correct identity and units.

Negative coverage includes OPTIONS403/500/read failure/nonemptybody, origin/wildcard/method/header/Vary/credentials/cache mismatch, login401/500/timeout/invalidJSON/oversize/successfalse/missingtoken/wrongID/email/role/status/origin, memory audit/ownership mismatch, absent/malformed/extra-secret attestation, missing implementation, stage deadline cancellation, absent/invalid/oversized/timedout stdin, wrong/missing units/types/metadata. Gate failures cannot start frontend; known-owned cleanup, uncertain-timeout disposition and no duplicate requests are asserted. No synthetic secret/token is reflected in summary.

Tests use injected HTTP responses/credentials/processes, fake datastore and existing offline guard. AN synthetic actual Express/CORS/auth test continues using only a guard-owned ephemeral loopback port0 and fake credentials; never realAPI55001/frontend55173/database/MQTT. Existing native AST/propagation tests use synthetic helper processes; no live launcher or real credential prompt.

## J. Regression / native completion evidence

Final **255/255 PASS**, fail0/cancelled0/skipped0/todo0. Node test PID7448 actual native0, signal/errornull, timeoutfalse; parent held process handle and tool completion0. Finite120s runner wait, no stdout-only/native override or historical stdin-source replay.

```powershell
node --require ./scripts/acceptance-offline-guard.cjs --test --test-concurrency=1 --test-reporter=tap scripts/mvp-ui-ai.test.cjs scripts/mvp-ui-only-pin-audit.test.cjs scripts/mvp-ui-only-supervisor.test.cjs scripts/mvp-ui-only.test.cjs scripts/mvp-ui-launcher-exit.test.cjs scripts/mvp-edge-smoke-observer.test.cjs scripts/mvp-edge-smoke-analysis.test.cjs scripts/mvp-browser-startup-diagnosis.test.cjs scripts/mvp-preflight-boundary.test.cjs
```

Final evidence `build/phase-ap-final-1793803728273/`: stdout.txt TAP, empty stderr.txt, outcome.json and integrity.json. TAP SHA256:

`7bcd87b7e5b5262a23ce2e0593b11c949cec171b7d94d23b8bf19880095ee71d`

Intermediate successful targeted178/178 and179/179, earlier full255/255 retained in build/phase-ap-*; final rerun followed the additional rejected-attestation summary correction. No failed live attempt, no deleted evidence. Six-path READONLY, persistedActivityLog, frozen identity/readings, command/MQTT/evaluator deny, approval/native ownership and cleanup regressions remain PASS.

## K. Syntax / typechecks

- Final changed JS/test Node --check PASS, native0.
- PowerShell launcher AST PASS; synthetic prompt/UTF8-byte handoff functions PASS under actual Windows PowerShell, fake credential only.
- Backend tsc --noEmit native0/PID11116; evidence `build/phase-ap-backend-typecheck-1793803543023/`.
- Frontend tsc --noEmit --incremental false native0/PID19896; evidence `build/phase-ap-frontend-typecheck-1793803543018/`.

No production source changed and no typecheck connected DB. Typechecks are compile validation, not live acceptance.

## L. Manifest6 lineage / SHA256

Preserved exact revision5 bytes at `docs/PHASE_AE_UI_ONLY_SOURCE_MANIFEST.rev5.json`, SHA256 `bb073209114dd4ed5bbf76abd10e1407a9e4f5a27f87e97b07ace63d78d780e5`.

Active `docs/PHASE_AE_UI_ONLY_SOURCE_MANIFEST.json`: revision6, existing version1/purposeSOURCE_PINS_ONLY_NOT_EXECUTION_APPROVAL. previousManifestFile/Sha256 point to exact rev5. Six reviewed execution hashes and two existing offline-test hashes changed;250source membership/fourruntime pins unchanged. No credential/approval embedded and no self-reference.

**Final revision6 SHA256:**

`6c5cf2c26bb86f0f15545e99cb9f04069f8ca316a83c52dec8b90e8c11871177`

Final native0 audit:250/250source hashes, sourceFiles exact membership, canonical paths/no traversal/reparse/duplicate, rev5 lineage, fourbinaries/currentruntimeconstants agreement, testhashes and finalsyntax/AST PASS. No binary execution for hashing.

## M. Exact source / runtime hashes

| Changed execution file | SHA256 |
| --- | --- |
| mvp-ui-only-api.cjs | 6c1fdaa98662a44d1cceefb86cc94c1a16cf9369c03769298e323586d283fc4e |
| mvp-ui-only-historical.cjs | 052c458ad7f6487d2610ae3bbd2e6f6079129a12856f529101f3dd1a08f6e057 |
| mvp-ui-only-runtime.cjs | 671f45fc7c4cc3e237a4035e2db950405c4412dba7bd28dfe60ff15f62c772bf |
| mvp-ui-only-session.ps1 | d01b1c6b78ef9cdb07c9a8dd7b3b8977799729d82b32d26c13593084f9f5be86 |
| mvp-ui-only-supervisor.cjs | 2ac398b3d654c2af2beb5bd8e5adabfbe18eeb24bccf7ca9d18562c3d9166e4b |
| mvp-ui-only-worker.cjs | 7ef4f085a18fa17e0c20a53b8db628a179f1d6af39fd5f3f37e0509d9258afd4 |
| mvp-ui-only-supervisor.test.cjs | 8f8c4877a3ad95abee464dff417ad692c7f60a8726d42c06e3697057d352fdd2 |
| mvp-ui-only.test.cjs | 0e6c8db826456e4f92038588ab9869159b80fa4b42f57160340a9ea74cc6a969 |

Runtime pins unchanged:

| Binary | SHA256 |
| --- | --- |
| node.exe | fdddbf4581e046b8102815d56208d6a248950bb554570b81519a8a5dacfee95d |
| pg_ctl.exe | fc644446b0236e623e3e6fe2699446259efb8e61bd9aba838d6394a2be6987b8 |
| pg_controldata.exe | 6896f8a705afb5cbaad843017d6d8aed5f5d76e32b3179e66750aaa5f193cc40 |
| postgres.exe | 94a8ea85cffd4a15c21290ca555a06438d3f7621b001bea6b1373c210d5a1746 |

## N. Explicit no-live-action record

No AO attempt/approval reuse, private live plan/run/marker, initdb/pg_ctl/service startup, DB connection/DDL/DML/restore/seed, realOPTIONS/login/Website/Edge/Playwright/MQTT, broker/ACL/credential reset, DeviceCommand/ON/OFF/Automation, ESP32 flash/reset or pump action. No real credential/passwordfile/DPAPI read. Final read-only inspection: DEVlisteners55433/55001/55173=0, postmaster.pid absent. No production runtime flags/PENDING claim from source-only tests.

AO/AM/AN historical reports/verdicts remain unchanged. Added only reviewed source/test changes, manifest6/rev5snapshot, this report and offline evidence. Soil quality remains BLOCKED.

## O. Remaining prerequisites / next acceptance / rollback

Actual operator prompt visibility, private stdin process handoff, realHTTP/SQL observations, corrected credential match and gate runtime timing have **not been live-executed**. Expected-unit assertions likewise need actual frozen snapshot execution. Actual browser login/render/history/charts/timezone/warnings/screenshots/post-check/cleanup remain NOT_VERIFIED; synthetic tests do not supply these results.

A future session needs fresh explicit approval for reviewed manifest6/hash, existing TEST target, local Website credential prompt and DPAPI app credential path, one attempt/no retry, bounded manual window and cleanup. Do not reuse AO's manifest5 approval or source pins. Existing launcher now enforces the required order; no additional infrastructure is proposed. Operator uses current existing DEV Website account, not PostgreSQL/MQTT password or historical JWT. No password reset is required by this source change.

Rollback plan, not executed: reverse the six AP execution changes and two fixture/test changes to reviewed rev5, verify every source/test hash against preserved rev5 before making it active, then invalidate any rev6 execution plans. Do not simply switch manifest to5 while code remains6; rev5 still lacks the required pre-frontend orchestration. No DB rollback because AP did not modify DB. Preserve evidence and historical outcomes.

```text
PHASE AP RESULT

Pre-frontend CORS gate: OFFLINE_PASS
Pre-frontend direct-login gate: OFFLINE_PASS
Supervisor ordering: VERIFIED (offline)
Failure-before-frontend: OFFLINE_PASS
Secure credential handoff: PREPARED (synthetic only)
Expected-unit assertions: OFFLINE_PASS
Existing six-path READ ONLY regression: PASS
Persisted ActivityLog regression: PASS
CORS restrictions: PASS
Command/MQTT/Automation deny: PASS
Offline tests: 255/255 PASS
Backend typecheck: PASS
Frontend typecheck: PASS
Manifest revision6: 250/250 PASS
Runtime binaries: 4/4 PASS
Actual PostgreSQL: NOT_STARTED
Actual API/frontend: NOT_STARTED
Actual OPTIONS/login: NOT_EXECUTED
Actual Edge: NOT_EXECUTED
MQTT: NOT_CONNECTED
DeviceCommand/ON/OFF: 0 ACTIONS
Automation: NOT_ENABLED
Soil quality: BLOCKED
Final: READY_FOR_NEW_UI_ONLY_APPROVAL
```

**STOP sau Phase AP. Không tự mở phiên live hoặc chuyển phase.**
