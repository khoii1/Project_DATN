# Phase 13.5D.1E — Trusted pre-start collector preparation (OFFLINE)

## PART A — Collector architecture and files

Conclusion: **PHASE13_5D1E_OFFLINE_COLLECTORS_READY**. This accepts candidate code and offline contracts only. No live collector was executed or enabled.

| New file | Purpose |
| --- | --- |
| `scripts/phase13-5d1e-readonly-sql.cjs` | Two fixed read-only SQL specifications, exact-statement allowlist and disabled execution plan. |
| `scripts/phase13-5d1e-validators.cjs` | Pure PostgreSQL, Windows process, broker, operator and NTFS output validators. |
| `scripts/phase13-5d1e-evidence-collectors.cjs` | Offline session, native-output decoder, immutable evidence issuance, freshness checks, aggregate readiness and sanitizer. |
| `scripts/phase13-5d1e-evidence-collectors.test.cjs` | 126 mock-only tests, including negative SQL/trust/process/native cases. |
| `report/phase13-5d1e-offline-collectors-summary.json` | Sanitized test results, hashes, restrictions and remaining gaps. |
| This report | PART A–H handoff. |

Reviewed D.1C launcher/console host, D.1D contracts/adapter/report, Prisma schema (especially Device/Actuator/DeviceCommand mappings), server startup attestation, runtime config loader, MQTT client configuration/subscriptions and C.7 verified restore report. Compared schema fingerprint formulas with existing migration review artifacts, without executing them. Separate D.0/D.1 file reports were not found in the current docs tree; their reported status is historical conversation context, not newly collected evidence.

D.1C/D.1D source hashes match their reviewed baseline; no shared or application source was changed. No .env/config.local.h/passwordfile contents were read. No database driver, MQTT/HTTP client, child-process executor or filesystem reader is imported by the new collector modules. The test harness reads only nonsecret local source files. No private production storage was created.

### Interfaces

- `planSql()`: PLAN_ONLY, exact target, stage order, finite time/output limits; no connection or credential fields with secret values.
- `createOfflineSession({runId})`: session-local collection/verification context, no IO on construction.
- `collectMock(kind, nativeFixture, now, optionalExactSql)`: parses one mock result per collector, recomputes validation, emits immutable OFFLINE evidence or sanitized BLOCKED result. No user-supplied execution callback.
- `inspect(item, now)`: requires the actual item issued by this session, unchanged and fresh. JSON copies or items from another session cannot substitute collector attestation.
- `evaluate(now)`: all six groups required; process must be absent; no live or startup authorization even on success.
- `executeLive(...)`: always throws `LIVE_PRODUCTION_PREFLIGHT_NOT_AUTHORIZED`. CLI arguments cannot unlock it; default CLI prints PLAN_ONLY.
- `sanitize(...)`: allowlist status/reason codes only; excludes raw outputs, credentials, paths, nested evidence and arbitrary error messages.

The decoder supports mocked native stdout/stderr/exit/error/signal/timeout results, not an installed production psql/PowerShell transport. Live OS/SQL readers and trustworthy acquisition/approval integration require a separate phase; changing a string or supplying a token cannot enable them here.

## PART B — PostgreSQL read-only query specifications

Pinned candidate target: PostgreSQL17, `127.0.0.1:5432/smart_agriculture/public`, systemID `7472695863566132416`, PGDATA `C:/Program Files/PostgreSQL/17/data`. Never substitute 55433/55434 or DATABASE_URL fallback. No actual connection was made.

Both specifications begin with `BEGIN READ ONLY`, set LOCAL search_path=pg_catalog, statement_timeout=3000ms, lock_timeout=500ms and idle_in_transaction_session_timeout=5000ms, then issue one SELECT returning one JSON object and COMMIT. Proposed native outer deadline=8000ms/output limit=1MiB. These limits are candidate settings, not evidence they were applied on a live connection.

### Stage 1: catalog

Reads actual database/principal, server version, address/port, systemID, PGDATA, server start time, primary/recovery state, transaction read-only flag, database/schema owner, six required relation identities and RLS flags. Inspects legacy column/constraint fingerprints using the existing baseline formulas. Requires all five Phase12 fields: transport, expires_at, max_run_seconds, acknowledged_at, correlation_id.

Rejects proposed irrigation relation/type/function namespace conflicts, including the six ledgers and Irrigation enum types. Prefix detection is deliberately conservative and can block additional irrigation-prefixed objects for review. Six baseline relations must be ordinary tables, not views/foreign tables, with RLS disabled; this prevents accepting an unexpected read path with a user-policy expression.

Catalog fingerprints: columns `390c65cfe11f3b8695a6bc5ff21d94d4`; constraints `2e5981464ef4017e1ad5a6854ba17cc2`. MD5 is retained solely for compatibility/drift checking, not cryptographic authorization.

### Stage 2: command/migration baseline

Only decoded after fresh successful stage1 evidence in the same offline session. Rechecks actual database/address/port/systemID/principal/server start/read-only status; a changed principal or database restart blocks. Requires exact 11 Prisma rows/names/checksums/finished states and no rollback. Pins are inherited read-only from D.1D and independently compared with the eleven local migration.sql hashes in tests.

Reads total DeviceCommand and **all-database PENDING** counts, status aggregate breakdown, and exactly one configured `ESP32-GF-A-01/PUMP_01` actuator's state/timestamp. Counts are decimal strings validated against safe integer limits; breakdown must sum to total. Total is NOT pinned to historical43: fixtures verify totals57 and0. PENDING must equal0. No command bodies, user profiles, migration logs, readings or unnecessary business data are selected.

An observed UNKNOWN is allowed only as a recovery baseline; an historical OFF timestamp remains historical. OFF is not invented or upgraded to session-fresh. ON, missing actuator, duplicate actuator or OFF without a timestamp blocks. This collector does not certify physical motor/water state.

### Query safety and limitations

- Exact SQL strings are allowlisted, not accepted because they merely begin with SELECT/READ ONLY. Extra statements, comments, whitespace variants and arbitrary query stages are refused.
- All invoked functions are reviewed `pg_catalog` built-ins. There is no public/user-defined function call, DDL/DML, temp table, advisory lock, SELECT INTO, permission change, pg_sleep, COPY, backup or restore operation.
- READ ONLY alone does not make arbitrary SQL safe. Tests reject injected calls such as public.side_effect(), set_config(), advisory locks and statements outside the allowlist.
- No SQL syntax/runtime/privilege test was performed on PostgreSQL. SQL_INTEGRATION_NOT_VERIFIED. Missing permission to read PGDATA/systemID in a future phase must STOP, not trigger automatic GRANT or use a different connection.
- Stages currently describe separate read-only transactions. A future transport must bind acquisition to the verified connection, recheck identity and catalog before accepting the full snapshot, and address catalog/DDL races between stages. It must not infer a shared atomic snapshot from these fixtures. No live transport or cross-stage schema-locking guarantee is implemented here.

## PART C — Windows process and broker identity

Process DTOs include complete before/after process and listener inventories, PID, exact UTC start ticks, executable, parent PID, normalized working directory and entrypoint. The two snapshots must agree; incomplete enumeration, unknown Node origins or backend wrappers are fail-closed, not assumed absent. This conservative policy may require review of unrelated Node processes in a future phase.

Classifications are separate from startup permission:

| Classification | Pre-start safe? |
| --- | --- |
| BACKEND_ABSENT, with no listener or unresolved attempt | Yes, mock contract only. |
| STARTUP_IN_PROGRESS | No. |
| BACKEND_PRESENT_NO_LISTENER | No. |
| BACKEND_RUNNING_IDENTITY_MATCHED | No; avoid duplicate launch. |
| PID_REUSED / stale unresolved state / unknown owner | BLOCKED. |

State JSON does not prove running. Attempt records are checked against the current process identity; stale RUNNING/VERIFIED state or missing matching process remains unresolved and blocks. A fresh STARTING attempt cannot hide another stale attempt. Terminal EXITED/FAILED records require consistent exit code and no matching live process; those records are still only mock acquisition evidence here, not live native exit authentication.

Future Windows acquisition should use read-only Win32_Process/Get-Process and Get-NetTCPConnection snapshots, exact PID/start-time/parent checks, current attempt marker/state/exit evidence, and a second identity read. It must not expose raw command lines that could contain secrets or infer inaccessible cwd/entrypoint from guesses. Inaccessible metadata must remain UNKNOWN/BLOCKED. No such commands were executed in D.1E.

Broker DTO requires LAN endpoint/local adapter address, backend candidate endpoint match, listener owner PID/start time, stable process before/after, expected executable/config path from that process, matching approved/observed config SHA256 and scoped review reference. Loopback-only broker, wrong PID/config/hash or a changed process blocks. `172.20.10.2` is a **candidate/historical pin**, not a live reachability finding. Broker assurance is OS/config identity only: no MQTT CONNECT/SUBSCRIBE/PUBLISH, authentication, ACL success or backend MQTT session was tested. Future collectors must safely handle included config files, command-line listener overrides and actual effective broker identity; a root config hash alone cannot establish all of that.

## PART D — Evidence trust, physical safety and storage

Each issued item has runID/kind, collector ID, MOCK_COLLECTED source, session-local attestation, exact target, source collection time, fixed expiration, projected/validated value, verification result, SHA256 of mock output and query SHA256 for SQL stages. No supplied PASS or unknown top-level field is accepted as validation. Bad data latches the session; a second call cannot automatically retry or replace the failed collector. Duplicate collection is refused.

| Group | Fixed TTL |
| --- | --- |
| Catalog/storage | 30s |
| Command baseline/process/broker | 10s |
| Operator physical confirmation | 120s, also bounded by the original confirmation time |

Time is supplied explicitly for deterministic tests and must be valid UTC ISO time. Stale/future evidence, extended caller TTL, wrong collector/run/target or missing attestation blocks. Issued evidence is deeply frozen and must remain in its issuing session's WeakSet. This prevents caller-built/JSON-replayed objects from being treated as issued evidence, **not** an attacker-proof signature or live attestation. SHA256 proves content identity only; it does not authenticate publisher/source. MOCK_FIXTURE inputs and all resulting evidence always have `productionAuthorized=false`, `liveEvidenceVerified=false`.

D.1D remains unchanged and deliberately rejects this new MOCK_COLLECTED shape. There is no automatic evidence relabeling, no bridge that upgrades mock into live trust, and no startup approval reuse. A future integration needs a reviewed live acquisition interface and a separately scoped authorization design.

Physical contract: run-bound operator reference, fresh confirmation time, adapter5V disconnected and USB-only ESP32. No new physical confirmation was requested or assumed in this offline phase. All example confirmations are fixtures.

Storage contract: proposed narrow path outside Git under `C:\Users\<operator>\AppData\Local\SmartAgricultureRuntimeRecovery\<runID>`, operator SID owner, protected DACL, exactly operator+SYSTEM Allow FullControl noninherited ACEs, no unexpected reparse in every path component, create-new and no existing-run conflict. Requires separate run-bound data-handling approval and explicit residual risk acceptance. CLOUD_BACKUP_SCOPE_NOT_VERIFIED is preserved; a caller's VERIFIED claim is rejected. These are mocks only; no folder, ACL or approval artifact was created or changed.

## PART E — Offline tests actually executed

Command: `node --test scripts/phase13-5d1e-evidence-collectors.test.cjs`.

Final result: **126/126 PASS, 0 FAIL, 0 skipped, native test-runner exit0** (final recorded run307.733ms). Initial122-test iteration also passed before principal/recovery/future-server-start coverage was added. No failed test evidence was deleted. Mock native errors/exits are fixture outcomes, not real psql/Windows process executions.

Coverage includes all requested negative cases: DB/system/schema/checksum/missing migration/ledger conflicts, PENDING, missing actuator, PID/start-time/listener mismatch, stale state/duplicate backend, endpoint/LAN versus loopback, missing physical/storage approval, expired/future evidence, forbidden SQL/functions, error/nonzero/signal/timeout/oversize/partial JSON, secret canary redaction, disabled live execution and no retry. Additional tests cover RLS/view replacement, principal change, command count consistency, immutable/session-bound evidence and unchanged inherited hashes.

All four new CJS files pass `node --check` (exit0); default CLI prints PLAN_ONLY/executionEnabled=false. Module import tests run without process/filesystem/network capabilities and permit only pure contracts/crypto imports. No actual query, network call, child process or service action is needed for D.1E tests.

D.1C and D.1D regressions were not rerun: shared source is unchanged and seven inherited SHA256 assertions pass. Their earlier21/21 and75/75 results remain historical, not additional tests run in this phase. No application-wide or SQL integration PASS is claimed.

## PART F — Final source hashes

```text
50BDF2AA3A1FD19F621F98AEB77217A5730912A5180280628041FCAC3187599C  phase13-5d1e-readonly-sql.cjs
5FD56795063766B34B696FEC39816301678CD1DB09B129131ABE06AB9FAAAE87  phase13-5d1e-validators.cjs
9B1A70C6DA816D39C37EE3583770AD62D689ADC3D75CB3D47EAAEAEDB67C3B1F  phase13-5d1e-evidence-collectors.cjs
F32BFC9253470B77BC3DA031079712EE0A09DDE0E55CBAD5452169A17FA34D18  phase13-5d1e-evidence-collectors.test.cjs
```

Inherited before=after:

```text
051EE903D7B7988E6FF151459EE6DB0451768A19BDF826B78187906CF628C75A  phase13-5d1c-launcher.cjs
C9810B5D56A34C9AC46CA65E51CE2ED12F5333950A1DD3D877C2685575617EA3  phase13-5d1c-console-host.ps1
DB97A4BB4FCA87E9231DDC1B5D39AB75A662FCE240E544C192669DDC1BA904CF  phase13-5d1c-synthetic-child.cjs
990BCC218E2DF5987C033C432B974065D3845F4E5A0A7BBEAADDA31B63AC9E10  phase13-5d1c-launcher.test.cjs
22E12B76C328EA9E2B6A93564F2FCEF2BA0F2CD56B77817265A6092521030B86  phase13-5d1d-contracts.cjs
1AEC6EB4A1A6CA866CCD396372D4BA80ACFEFBB74549A3F3E56BC1BA5B62261E  phase13-5d1d-recovery-adapter.cjs
6E80C0F000E0B9A4F4310FDFE1FE628542CD83867F50B16FF02860835AC58C7E  phase13-5d1d-recovery-adapter.test.cjs
```

## PART G — Future live preflight scope (requires new approval)

1. Implement/review disabled native acquisition transports and bind evidence to the actual approved collector process/code, target, run and acquired snapshots. A mock source label/hash is not sufficient live provenance. Keep production startup unavailable in a read-only collection phase.
2. Request narrowly scoped read-only approval for exact production target/systemID, fixed queries, bounded process/listener/config-metadata inspection and any protected private evidence location. No startup, DDL/DML, role grants, backups or service changes included.
3. Use an approved existing read-capable principal with explicit target; no DATABASE_URL/test/recovery fallback. If credentials are needed, use local secure input/RAM only; no passwords in chat, CLI, environment dumps or logs. Insufficient privilege: STOP, not auto-elevate or GRANT.
4. Before business-table aggregates, validate identity/catalog. Verify primary/server-start/principal/connection binding and protect against schema changes across acquisition stages; recollect near the decision point rather than extending TTL. Review PostgreSQL syntax/permissions only after that separate approval.
5. Obtain current operator physical confirmation and actual log-storage approval/NTFS/reparse evidence. Do not reuse fixture or historical confirmations, backup approval or cloud VERIFIED claims.
6. Collect process/broker metadata using finite deadlines and sanitized output. Prove listener ownership and effective broker instance, distinguish LAN/loopback and reject unknown source/config overrides. No MQTT connection is implied by OS evidence.
7. On wrong identity, drift, nonzero/native error/timeout/partial output, changed PID or unresolved prior attempt: STOP, preserve sanitized evidence and do not retry or repair. Incomplete evidence must never be upgraded to PASS.
8. Backend effective flags, telemetry/session-fresh OFF and actual graceful shutdown still require a later, separately approved controlled startup. Commands=false does not imply database read-only during that later startup. D.1E cannot authorize it.

## PART H — Verdict and safety

```text
PHASE13_5D1E_OFFLINE_COLLECTORS_READY
LIVE_PRODUCTION_PREFLIGHT_NOT_PERFORMED
BACKEND_RECOVERY_NOT_PERFORMED
PRODUCTION_MIGRATION_NOT_PERFORMED
PRODUCTION_STARTUP_NOT_AUTHORIZED
PHYSICAL_PUMP_NOT_TRIGGERED
```

Current runtime flags/PENDING/device/broker state are NOT_VERIFIED in this offline-only phase. They were not modified, and fixture values are not substituted as runtime proof. No PostgreSQL5432/55433/55434, MQTT or production API connection; no backend/service startup/restart; no credentials/firmware change; no ON/OFF or pump action; no Git commit/push. Stopped at D.1E.
