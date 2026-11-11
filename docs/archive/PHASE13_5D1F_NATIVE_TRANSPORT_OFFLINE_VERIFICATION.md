# Phase 13.5D.1F — Native transport implementation and OFFLINE verification

## PART A — Files created / modified

Implemented on 26/10/2026, UTC+7. All changes are new D.1F files:

| File | Purpose |
| --- | --- |
| `scripts/phase13-5d1f-native-transport.cjs` | Fixed invocation plans, native result decoder, consistency validation, single-attempt mock transport and sanitizer. |
| `scripts/phase13-5d1f-sql-revision.cjs` | Controlled SQL revision R1, composing the original two SELECT specifications inside a single read-only transaction. |
| `scripts/phase13-5d1f-windows-transport.ps1` | Default PLAN_ONLY wrapper; denied live entrypoint; dormant read-only acquisition specification; bounded stdin access-denied fixture protocol. |
| `scripts/phase13-5d1f-fixtures.cjs` | Synthetic SQL transaction and Windows process/broker outputs; no live state/secrets. |
| `scripts/phase13-5d1f-native-transport.test.cjs` | 69 offline tests, including actual PowerShell AST/default/fixture runs without OS metadata acquisition. |
| `report/phase13-5d1f-offline-native-transport-summary.json` | Sanitized test/hash/status evidence. |
| This report | PART A–H handoff and remaining approval boundaries. |

No existing D.1C/D.1D/D.1E/C.7 source was modified. Twelve inherited source hashes were checked before implementation and asserted unchanged in final tests. Reviewed the D.1C/D.1D/D.1E reports, collectors/validators, D.1D startup contracts, PostgreSQL DeviceCommand/Actuator schema, eleven migration checksum pins and C.7 native capture helper. No production config/credential values were read. No Git commit/push.

## PART B — Native transport architecture

`buildPlan(kind)` defaults to postgres/PLAN_ONLY. Plans are deep frozen; executionEnabled=false, liveAuthorized=false, shell=false, no inherited environment, maxAttempts=1, autoRetry=false. `executeLive()` always denies, independent of mode/approval/token. Any CLI argument denies; default CLI prints a disabled PLAN_ONLY summary. There is no live spawn/SQL/API/MQTT branch in the Node transport.

### Fixed PostgreSQL17 invocation

```text
C:\Program Files\PostgreSQL\17\bin\psql.exe
--no-psqlrc --no-password --quiet --tuples-only --no-align
--set=ON_ERROR_STOP=1
--host=127.0.0.1 --port=5432 --dbname=smart_agriculture --file=-
```

R1 SQL is supplied via the specification's stdin, not interpolated into a shell or command-line SQL argument. The caller cannot replace SQL, binary, argument order, database/port, shell mode, output cap, deadline or environment. Exact complete-plan comparison rejects changes before decoding results.

The closed environment specification contains only fixed PGCLIENTENCODING, PGTZ, PGDATESTYLE, PGCONNECT_TIMEOUT, read-only PGOPTIONS and PGAPPNAME. It does not inherit DATABASE_URL, PGSERVICE/PGSERVICEFILE, PGHOST/PGPORT/PGDATABASE, NODE_OPTIONS or passwords. OS environment and local secure credential handoff still require review in a future phase. CredentialHandling is explicitly UNAVAILABLE; --no-password prevents an unintended interactive prompt. No production connection, password request, passfile creation or secret handling occurred.

### Native result handling

`createMockTransport({runId}).collect(kind, plan, fixtureResult, now)` simulates one acquisition per kind. Inputs must have an exact envelope, OFFLINE_NATIVE_FIXTURE source, run binding and matching invocation SHA256. Those labels/digests are correlation for fixtures, NOT authentication or production approval.

Native status, error, signal, timedOut and timestamps are independently checked. **status=0 plus error=ETIMEDOUT is BLOCKED**, not success. Candidate outer deadline=8000ms; separate stdout/stderr caps=1MiB each. Any stderr output is conservatively rejected; oversize, partial JSON, invalid JSON, missing records or extra records block. Native output is never included in error reports. Unknown exceptions become a fixed reason code, not a raw stack/message. All failures latch the transport session; duplicate collection cannot retry or replace the attempt.

Results carry invocation/output digests and a10s expiration anchored to acquisition start, not a newly invented measurement timestamp. They remain productionAuthorized=false/liveEvidenceVerified=false. Consumers in a future live design must recheck freshness at the decision point; these results do not bypass D.1D or relabel D.1E mock evidence.

### C.7 lesson and actual capture boundary

C.7 uses create-new direct file descriptors to avoid waiting for descendant-inherited pipe EOF; it also checks native.error even when status appears successful. Its generic helper inherits an environment by default and reads captured files after completion. It was reviewed, not invoked/copied as a production executor or treated as a complete bounded secret-safe capture solution.

This phase deliberately simulates psql invocation/results as required. The actual processes run in tests are finite PowerShell AST/PLAN_ONLY/access-denied fixture invocations only, with controlled OS environment, timeout8s and maxBuffer1MiB; no descendants, OS acquisition, psql or network calls. Those test invocations exited0 without native errors. There is no new generic native executor for arbitrary commands or production output-file writer. No production run directory, marker or capture file was created; no existing evidence was overwritten. Durable create-new private logs and live byte-enforced capture/lifecycle handling remain prerequisites of a later approved executor.

## PART C — SQL consistency review and controlled revision R1

### Why a revision is necessary

D.1E's two specifications each have their own BEGIN READ ONLY/COMMIT. Executing them independently cannot prove a shared snapshot, even if database/systemID match. Their original bytes/hash remain unchanged. R1 extracts the exact reviewed SELECT bodies and composes a **new, separately hashed candidate**, not a silent change to pinned SQL.

R1 proposed sequence in one psql process/connection:

1. `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY`; fixed search_path and finite statement/lock/idle timeouts.
2. Emit transaction frame (backend PID, pg_current_snapshot, isolation/read-only state, AccessShareLock relation count).
3. Compute a catalog-only boolean guard and use fixed psql `\gset`/`\if` conditionals. Wrong target/systemID/primary/version/schema/owner/PGDATA/fingerprints/conflicts/relation kinds/RLS blocks with `\quit 3`, before baseline aggregates.
4. Emit catalog-before; issue six fixed `SELECT 1 FROM public.<baseline-table> LIMIT 0` queries. These are read-only relation-access probes intended to acquire AccessShareLock until transaction end, not advisory locks/temp tables or DML.
5. Recheck catalog guard and emit catalog-after-access; run the original migration/command/actuator SELECT.
6. Recheck catalog guard and emit catalog-final plus final transaction frame; COMMIT only through the successful nested conditional path.

No caller text is substituted into SQL or psql commands. Only a computed boolean is assigned by \gset. There is no \connect, \!, \include, \copy, user-defined function call, DDL/DML, GRANT, migration, backup or restore. Read-only probes can temporarily block conflicting DDL; that future operational impact must be approved. Normal telemetry DML is not intentionally locked out by AccessShareLock.

The offline decoder requires exactly six JSON records in the specified order. It requires identical transaction PID/snapshot, repeatable-read/read-only state, all six granted AccessShareLock relations at the end, and identical validated catalog objects before/after. It reuses D.1E migration/command/actuator validators, checking actual DB/system/principal/server-start consistency and PENDING=0, without hardcoding command total43. Fixture total58 is synthetic.

### Explicit limits / fail-closed behavior

- This is **SQL_R1_OFFLINE_REVIEW_PASS**, NOT SQL_INTEGRATION_PASS. R1 has never been run on any PostgreSQL instance in this phase. Real psql conditional syntax, privileges, lock acquisition and DDL/catalog race behavior remain SQL_INTEGRATION_NOT_VERIFIED.
- RR snapshot tokens, catalog rechecks and modeled locks prevent accepting mixed fixture states; they are not proof that arbitrary concurrent DDL is impossible. Before live use, review catalog-cache/DDL races around initial access, relation identity/OID binding and protected read path, then test on an approved isolated instance or coordinated no-DDL window. Do not claim guaranteed live consistency from these tests.
- If actual connection/snapshot/lock/catalog proof is missing or inconsistent, collection must remain BLOCKED; do not fall back to two independent psql sessions, remove guards, extend timeouts or assume the data is compatible.
- No source revision was made just to accept invalid fixtures. Negative tests deliberately change snapshot/PID/principal/server-start/catalog/migrations/locks and remain rejected. AccessShare/guard semantics require real SQL acceptance before any future live approval.

## PART D — Windows process / broker acquisition

Fixed candidate Windows wrapper path is under this repository; binary is the explicit Windows PowerShell path. No arbitrary shell command/interpolation is accepted by the transport. Default mode returns PLAN_ONLY only. The live entrypoint unconditionally throws.

`Get-D1FReadOnlySpecification` contains a **dormant, uninvoked** acquisition scriptblock: Get-CimInstance Win32_Process with finite CIM timeout, Get-NetTCPConnection restricted to listening5000/1883, Get-Process owner identities with exact UTC start ticks/path, and a second CIM snapshot. Raw command lines are not exported. In this phase that scriptblock is source for review, not an operational live reader.

Positive fixture results are checked using D.1E's before/after process, listener, startup-attempt and broker validators. Missing metadata, changed PID/start, unresolved/stale state, duplicate/unknown backend, wrong listener owner, wrong broker executable/config/hash, wrong LAN address or loopback broker blocks. Running/starting backend cannot be treated as absent to permit a duplicate startup.

The PowerShell OFFLINE_FIXTURE protocol accepts only a bounded, synthetic ACCESS_DENIED scenario and emits NOT_VERIFIED/PROCESS_METADATA_UNAVAILABLE without raw metadata. Invalid input returns NOT_VERIFIED/OFFLINE_FIXTURE_REJECTED and exit2. It does not pretend to derive positive live metadata from inaccessible APIs. Positive process/broker tests use synthetic normalized DTOs in memory, not OS acquisitions.

Remaining live acquisition work: trustworthy cwd/entrypoint attestation (Win32_Process alone does not provide cwd), identity-bound previous-attempt/exit provenance, real Win32-to-DTO normalization, safe broker command-line/config/include/override interpretation, approved metadata/config-hash source and collector attestation. Broker credentials/passwordfile are not read. A historical172.20.10.2 pin is not evidence that the current machine owns that IP or the broker is connected. No MQTT CONNECT/SUBSCRIBE/PUBLISH or API call was performed.

## PART E — Offline tests actually run

```text
node --test scripts/phase13-5d1f-native-transport.test.cjs scripts/phase13-5d1e-evidence-collectors.test.cjs
```

Final combined suite: **195/195 PASS, 0FAIL, 0SKIP, native runner exit0**, duration1559.161ms. This is69new D.1F +126D.1E regression tests. A preliminary D.1F-only run passed66/66 before three additional coverage tests; no failed test output/evidence was deleted or rewritten.

All four new CJS files pass node --check. PowerShell AST parsing PASS, wrapper PLAN_ONLY PASS and actual ACCESS_DENIED synthetic stdin test PASS. No production port/socket/DB/API was accessed to produce these results.

Coverage maps to all required categories: disabled default/live denial; wrong binary/path/arguments/environment/SQL; wrong database/port/systemID; nonzero/error-despite0/signal/timeout; stdout/stderr size caps; malformed JSON; incomplete process metadata; stale attempt/PID reuse/listener owner; broker executable/config/LAN; stage/snapshot/catalog mismatch; stale/future evidence; duplicate/no-retry; redaction; no production executor; twelve inherited code hashes unchanged.

No SQL integration, full application regression, real psql output capture or actual Windows process/broker collection PASS is claimed. D.1C/D.1D tests were not rerun because shared sources were not modified; their old counts are historical, not added to195.

## PART F — SHA256 and inherited integrity

Final new source:

```text
99AE01D0E5585611D5CB8A8A1136E96332F1E9833EF57B1635DF9B48290AC078  phase13-5d1f-native-transport.cjs
27553EBCD7B3905C1C6368AB39298DC1651A32F0FDF2F60FCC0C05F5730F4839  phase13-5d1f-sql-revision.cjs
665BBB23C818E3670DF8472FF4D2CB83FB1907AF3D8099A51A17FE5B901CA594  phase13-5d1f-windows-transport.ps1
4C7C195FDF2A3011643238E5E9031B4A4B51DDA5B3E06B3C9FD69AC18540F04A  phase13-5d1f-fixtures.cjs
9CBB54F06BE202068C7CA58EF9261D3BD22B4A9A4B57360DB23698DBC2374877  phase13-5d1f-native-transport.test.cjs
```

Exact generated R1 SQL UTF8 SHA256: `9C47BD805608012D74916033AB061495311C29AD9A588D3AAFAD36578A2F9774`.

Original D.1E SQL module remains `50BDF2AA3A1FD19F621F98AEB77217A5730912A5180280628041FCAC3187599C`. D.1E validators/collectors/tests, D.1C four sources and D.1D three sources also remain at their reported reviewed hashes. C.7 native helper remains `4507548409A553EAAB5FD586334F5E66DD86C40F781BEABAEB1989B0EC16BD2E`. All12before/after assertions PASS. No old artifact was silently revised; R1 has its own source/hash and remains offline-only.

## PART G — Future live read-only preflight plan

1. Separately approve/test R1 syntax, permission, relation-lock/OID and DDL-race handling on an isolated SQL environment; never substitute production for unapproved SQL integration. Preserve original D.1E revision/hash and review any further revision explicitly.
2. Finish/review native IO adapters with byte-enforced separate streams, finite deadlines, single-attempt lifecycle and create-new private evidence. Do not simply invoke the old C.7 generic helper or remove the live-denial gate.
3. Separately approve exact read-only target5432/smart_agriculture/systemID7472695863566132416, fixed source/binary hashes, bounded Windows process/listener metadata and safe broker configuration metadata. No backend startup/migration/service changes included.
4. Arrange approved local credential handoff and private storage before any live native call. No passwords in argv/chat/logs; no arbitrary inherited PG service/environment, no production URL fallback or automatic privilege changes. Credential handling remains unavailable in this phase.
5. Bind native results to actual collector identity, process, target, run and time. Mock source labels/output hashes are insufficient attestation. Recheck current Windows/backend/broker identities and physical/storage gates without recycling historical approvals.
6. Require a controlled no-DDL window or accepted catalog/OID race protection for the SQL read path. Stop on mismatch, missing proof, permission failure, output truncation, nonzero/native error/timeout, unknown process or stale evidence; no retries or automatic repair.
7. Current runtime Commands/Automation/PENDING/device/telemetry state remains NOT_VERIFIED here. Future backend effective flags and live readings/OFF require a separately approved recovery startup; this transport cannot authorize it.

## PART H — Verdict

```text
PHASE13_5D1F_OFFLINE_NATIVE_TRANSPORT_READY
SQL_INTEGRATION_NOT_VERIFIED
LIVE_NATIVE_ACQUISITION_NOT_VERIFIED
LIVE_PRODUCTION_PREFLIGHT_NOT_PERFORMED
BACKEND_RECOVERY_NOT_PERFORMED
PRODUCTION_MIGRATION_NOT_PERFORMED
PRODUCTION_STARTUP_NOT_AUTHORIZED
PHYSICAL_PUMP_NOT_TRIGGERED
```

READY is limited to disabled invocation/decoder candidates, reviewed SQL revision and offline tests, not a working/approved production executor. No database5432/55433/55434, MQTT or production API connection; no backend/service startup/restart; no .env/credentials/firmware/ACL change; no ON/OFF or hardware action. Stopped at D.1F.
