# Phase 13.5D.1D — Production recovery adapter candidate (OFFLINE)

## PART A — Files created and scope

Implemented and verified on 2026-10-25. Only new D.1D files were added:

| File | Purpose |
| --- | --- |
| `scripts/phase13-5d1d-contracts.cjs` | Pure plan, evidence, identity, runtime, monitor and sanitized-report contracts. |
| `scripts/phase13-5d1d-recovery-adapter.cjs` | PLAN_ONLY facade; permanently denied production entrypoint; explicit synthetic-only integration. |
| `scripts/phase13-5d1d-recovery-adapter.test.cjs` | 75 offline contract and actual Windows synthetic lifecycle tests. |
| `report/phase13-5d1d-offline-adapter-summary.json` | Sanitized offline test summary, source hashes and limitations. |
| This document | Source review, evidence, restrictions and future startup prerequisites. |

Generated test evidence was created in NEW `build/phase13-5d1c-offline/d1d-*` run directories. No existing evidence was deleted or overwritten. No application runtime, D.1C source, configuration, credentials or firmware was changed. No commit or push.

Read D.1C report, launcher, console host, fixture and tests; reviewed `backend/src/server.ts`, `config/database.ts`, `config/env.ts`, `mqtt/mqtt-pump-state.adapter.ts` and `services/pump-command-policy.ts`. Reviewed installed dotenv loader source, not environment secrets. D.1A/D.1B history is provided by the conversation; separate file reports were not found and are not claimed as inspected artifacts.

## PART B — Adapter architecture

Seven distinct exported functions: `buildPlan`, `validatePreStart`, `verifyProcessIdentity`, `validateRuntime`, `monitorDecision`, `sanitizeReport`, plus facade `prepare`. `buildPlan().startup` is the candidate startup specification. These contracts do not import platform, filesystem, application, credential or network modules.

Default import has no side effects. Default CLI prints PLAN_ONLY without creating an attempt. Any CLI argument is refused. `executeProduction()` unconditionally throws `PRODUCTION_STARTUP_NOT_AUTHORIZED`, regardless of approval/token. There is no live executor or live evidence collector, and no production stop executor. The required evidence interface names are recorded in the plan; their live implementations remain unavailable.

Future specification only:

```text
C:\Program Files\nodejs\node.exe --import tsx src/server.ts
working directory: C:\DATN\Project_datn\backend
PORT=5000
MQTT_ENABLED=true
MQTT_COMMANDS_ENABLED=false
MQTT_AUTOMATION_COMMANDS_ENABLED=false
MQTT_PUMP_TEST_MODE=true
MQTT_PUMP_MAX_RUN_SECONDS=1
```

The candidate also pins the previously specified LAN endpoint `mqtt://172.20.10.2:1883`; this is NOT a current reachability finding. No npm lifecycle wrapper or arbitrary executable/arguments are accepted. The specification carries no secret values. Before any future execution, credentials and inherited environment need a separately approved, secret-safe handoff; do not use the synthetic runner's minimal environment as a real backend environment.

`config/env.ts` calls `dotenv.config()` without override. The installed dotenv `populate()` overwrites existing values only when `override === true`. Injected safety values therefore take precedence under the reviewed loader. This is source evidence, not effective serving-process attestation. Future collectors must exclude inherited code-injection options such as NODE_OPTIONS and independently prove actual runtime policy.

### Startup side effects explicitly reviewed

`server.ts` connects Prisma and awaits `recoverMqttCommands()` before HTTP listen when database connection succeeds. That recovery transaction:

- Marks **all** MQTT/PENDING DeviceCommands FAILED with `BACKEND_RESTARTED_NO_REPLAY`, not just the configured actuator's commands.
- Sets the configured actuator UNKNOWN. With Commands=false, this update is limited to an actuator with MQTT command history; enabling commands changes that condition.

After startup, presence/watchdog updates, MQTT SensorReading ingestion, alerts and legacy automation metadata writes may occur. Commands=false is NOT database read-only. The adapter neither executes these effects nor bypasses recovery. The mock approval contract requires acknowledgement of all six side-effect categories. No fabricated OFF is created.

## PART C — Pre-start safety contracts

All evidence is injected; no live evidence was collected. Each envelope requires source kind/collector/reference, checkedAt/expiresAt, exact target and value. Unknown envelope fields (including self-declared PASS), missing values, wrong target, expired/future evidence and extended caller TTLs block. Only MOCK inputs can pass the offline contract. FIXTURE, HISTORICAL and self-declared LIVE never establish authorization. Even complete mocks return `productionAuthorized=false`, `liveEvidenceVerified=false`.

| Gate | Maximum age/window | Required mock contract |
| --- | --- | --- |
| Physical | 120 s | Fresh operator reference; adapter disconnected; USB-only ESP32. |
| Process | 10 s | No backend, no port5000 listener, no attempt in progress, no unresolved prior outcome. |
| Database | 30 s | READ ONLY; PG17; 127.0.0.1:5432/smart_agriculture/public; systemID7472695863566132416; pinned PGDATA. |
| Migrations | 30 s | Exact 11 names/checksums/finished states; no rollbacks; baseline fingerprints and no conflicts. |
| Commands | 10 s | PENDING=0; nonnegative total and baseline digest. |
| Actuator | 10 s | Direct observation of correct device/actuator; OFF or UNKNOWN baseline, not ON. |
| Broker | 10 s | PID/start time, listener owner, LAN/non-loopback, executable/config identity and reviewed config hash match. |
| Configuration | 30 s | Exact safe overrides, no inherited injection options, no secret values in DTO. |
| Storage | 30 s | Narrow proposed private path; operator owner; protected DACL; only operator/SYSTEM FullControl; no unexpected reparse/conflict; actual approval/risk handling required later. |
| Approval | 60 s | Current run-bound D.1D offline scope, one attempt, side-effect review; C.3/history or production-authorizing input rejected. |

These windows are conservative candidate policies, not measured live collection timing. Evidence must be recollected near a future launch; never extend expiry to accommodate a slow preflight. UNKNOWN **gate outcome** blocks. An explicitly observed actuator state UNKNOWN is a permissible backend recovery baseline, not proof of OFF and not permission to turn ON. Fresh post-start OFF is still required for recovery acceptance.

Storage paths and synthetic operator SID are mock values; no private production log directory was created or accepted. Cloud/backup scope remains NOT_VERIFIED. There is no new data-handling authorization.

Runtime validator requires the same wrapper/host/child identities and parent chain, PID + start ticks, port5000 listener owned by the child, a startup attestation tied to that child's start time, and a post-collection identity recheck. Both log and API attestations must show false/false/testtrue/cap1; gateway DISABLED, controlEnabled=false, database/MQTT connected. Missing or mismatched evidence blocks. Live collectors and protected API authentication are not implemented or exercised here.

## PART D — Windows graceful stop integration

Only the unchanged D.1C **synthetic** path is invoked, lazily and after explicit D.1D offline test permission plus complete mock preflight. The old D.1C offline capability string is an internal fixture API selector, NOT reuse of any C.3 or production startup approval. Candidate production executable/args/env are never handed to the fixture runner.

Inherited lifecycle: create-new attempt/stop markers; single attempt; PID/start-time checks; wrapper/host/child identity; dedicated console with exactly host+child; host heartbeat and wrapper lease; atomic metadata publication; bounded separate stdout/stderr; native exit-code preservation; no automatic restart and no force kill.

Latest D.1D synthetic run prefix: `d1d-1792945910260-2f98a0`.

| Suffix | Actual fixture result | Contract interpretation |
| --- | --- | --- |
| -1 | SIGINT observed; fake resources closed; exit0 | SYNTHETIC_PASS. |
| -2 | Voluntary exit7 | Failure preserved; one launch only. |
| -3 | Voluntary exit0; duplicate attempt rejected | Marker bytes unchanged; no overwrite/retry. |
| -4 | SIGINT ignored; stop timeout; fixture later self-exits23 | BLOCKED, not graceful success; no force kill. |
| -5 | Wrapper heartbeat lost; host lease stops fixture; exit0 | MONITOR_LOST remains BLOCKED despite exit0. |

Two D.1D test invocations produced ten separate run directories; none was overwritten. Post-test PID+start-ticks inspection found zero matching child/host processes remaining across those ten runs. Prior failed evidence from D.1C remains untouched.

Real server source registers SIGINT/SIGTERM and stops watchdog, MQTT, HTTP and Prisma. **Actual backend console attachment and actual HTTP/MQTT/Prisma shutdown are NOT_VERIFIED.** The synthetic fixture closes fake resources only. A future live adapter needs explicit execution/stop approval and lifecycle acceptance; do not substitute a force kill if the real server hangs. No change to server.ts was needed for this offline candidate.

## PART E — Tests actually executed

| Command/check | Actual result |
| --- | --- |
| `node --test scripts/phase13-5d1d-recovery-adapter.test.cjs` (final source) | 75/75 PASS; native exit0; 12,137 ms. |
| `node --test scripts/phase13-5d1c-launcher.test.cjs` | 21/21 PASS; native exit0; 22,007 ms. |
| `node --check` on all three new CJS files | PASS, exit0. |
| Default adapter CLI | PLAN_ONLY; launched=false; productionAuthorized=false. |
| Four inherited artifact hashes | Before/after identical. |

96 distinct tests passed (75 new +21 inherited), not 96 live tests. A preliminary D.1D run also passed 75/75; final run followed an additional strict API effective-cap check. Both sets of synthetic evidence were preserved. The expected failure scenarios are PASS assertions of fail-closed behavior, not successful child execution.

Negative coverage includes missing/stale evidence for all ten gates; wrong/expired/historical approval; wrong DB/systemID/migrations; wrong broker identity; PENDING>0; Commands/Automation=true; bad cap/test mode; absent physical confirmation; wrong serving PID/start time; missing effective log/API flags; PID reuse; duplicate attempt/overwrite; exit0/7; graceful timeout; wrapper loss; secret canary redaction; no retry. Source/import tests prohibit application/network/credential-loader imports in the new adapter/contracts. The all-eleven migration checksum test reads local SQL files only.

No database, MQTT, API, actual server import/start, production service action, full application regression or live runtime preflight occurred. Production flags/PENDING/device state are **NOT_VERIFIED in this phase**; file configuration and mock fixtures are not substituted for runtime evidence.

## PART F — SHA256

Final new code:

```text
22E12B76C328EA9E2B6A93564F2FCEF2BA0F2CD56B77817265A6092521030B86  phase13-5d1d-contracts.cjs
1AEC6EB4A1A6CA866CCD396372D4BA80ACFEFBB74549A3F3E56BC1BA5B62261E  phase13-5d1d-recovery-adapter.cjs
6E80C0F000E0B9A4F4310FDFE1FE628542CD83867F50B16FF02860835AC58C7E  phase13-5d1d-recovery-adapter.test.cjs
```

Inherited D.1C, before = after:

```text
051EE903D7B7988E6FF151459EE6DB0451768A19BDF826B78187906CF628C75A  phase13-5d1c-launcher.cjs
C9810B5D56A34C9AC46CA65E51CE2ED12F5333950A1DD3D877C2685575617EA3  phase13-5d1c-console-host.ps1
DB97A4BB4FCA87E9231DDC1B5D39AB75A662FCE240E544C192669DDC1BA904CF  phase13-5d1c-synthetic-child.cjs
990BCC218E2DF5987C033C432B974065D3845F4E5A0A7BBEAADDA31B63AC9E10  phase13-5d1c-launcher.test.cjs
```

Report/evidence document hashes are calculated externally after writing, not embedded recursively in themselves. Code hashes and comparisons are also recorded in the sanitized summary.

## PART G — Future controlled startup prerequisites (not performed)

1. Separate approval for bounded production SQL READ ONLY preflight; implement/review trusted live collectors, no production fallback or self-declared trust.
2. Fresh physical adapter-disconnected confirmation; verify current ESP32/broker/network identities. Do not reuse historical physical confirmation.
3. Accept a new private log location with actual operator SID, owner/DACL/reparse checks and scoped data-handling approval. Existing backup/staging approvals do not authorize arbitrary runtime logs.
4. Separate production startup approval identifying reviewed source hashes, one run/attempt, safe environment/secret handling and all startup DML effects. D.1D approval does not authorize it.
5. Implement/review the locked-out production execution and graceful-stop capabilities in a separately approved phase. Do not simply pass a token to this candidate: it cannot launch production.
6. Recollect fresh mandatory evidence; ensure no duplicate process/listener or unresolved attempt. Create-new markers; fixed backend command; no retry.
7. Prove actual PID/start time/parent/console/listener identities and effective runtime from serving-process log plus protected API; verify DB/MQTT connections, Commands=false, Automation=false, testtrue/cap1, gateway DISABLED.
8. Accept three new complete telemetry batches (12 readings) and three new non-retained/nonduplicate session-bound OFF receipts via MQTT -> PostgreSQL -> API. Source timestamps must be after startup; old database OFF is not recovery acceptance. These live observation collectors/correlation checks remain future work.
9. Compare command count/PENDING before/after. Recovery can fail old PENDING but cannot replay ON. If anything conflicts, stop acceptance; use only an approved identity-bound graceful-stop path and preserve unresolved evidence.
10. Hand off to Phase13.5D.1 only after explicit authorization and actual evidence. No migration, VERIFIED_LIVE, ACTIVE or pump operation is implied.

## PART H — Final verdict

`PHASE13_5D1D_OFFLINE_ADAPTER_READY`

READY means the **offline candidate and tested contracts** are ready for review, NOT that production recovery is executable or live safety is verified.

```text
PRODUCTION_STARTUP_NOT_AUTHORIZED
BACKEND_RECOVERY_NOT_PERFORMED
PRODUCTION_MIGRATION_NOT_PERFORMED
AUTOMATION_ACTIVE_NOT_AUTHORIZED
PHYSICAL_PUMP_NOT_TRIGGERED
```

Stopped at D.1D. No subsequent phase or hardware action was performed.
