# Phase 13.5D.1G — Isolated PostgreSQL SQL integration

## PART A — Isolated target identity

**PHASE13_5D1G_ISOLATED_SQL_INTEGRATION_PARTIAL/BLOCKED** — stopped at the new root directory NTFS gate, BEFORE initdb or any SQL connection. No automatic retry, ACL repair, alternate target or cluster reuse was performed.

| Check | Actual result |
| --- | --- |
| Approved target | `127.0.0.1:55435`, PGDATA `C:\DATN\test-instances\phase13-5d1g\data`. |
| Initial path/port | Root did not exist; canonical path matched; port55435 had0listeners. |
| Ancestors | C:\, C:\DATN and C:\DATN\test-instances were not reparse points; workspace/test parent owned by operator. Parent ACLs were read, not modified. |
| Operator SID | `S-1-5-21-1432835263-483988321-3159128977-1001`. |
| PostgreSQL binaries | Explicit PostgreSQL17 bin paths; initdb/psql/pg_ctl report17.2; four binary SHA256 pins verified before execution. initdb executable is NotSigned, recorded rather than claimed signature-verified. |
| New root after stopped attempt | Exists, empty, operator-owned, no reparse; DACL still inherited/unprotected. Therefore NTFS gate FAILED. |
| PGDATA | Does not exist. |
| initdb attempts / cluster start attempts | **0 / 0**. The preparation wrapper was invoked once, but never reached initdb. |
| Test system identifier | NOT_CREATED / NOT_VERIFIED. No invented systemID. |
| Final port55435 |0listeners. No running D.1G cluster to shut down. |

Existing postgres processes were observed via Windows process metadata only; some protected process paths/command lines were inaccessible. They were not selected, connected, stopped or altered. No PostgreSQL5432/55433/55434 connection occurred.

### Actual failure and root cause

The single approved preparation invocation was:

```text
node scripts/phase13-5d1g-isolated-run.cjs --approved-isolated-d1g
```

Node wrapper exit1, sanitized result `STOP / ROOT_CREATION_OR_NTFS_STOP / productionConnected=false`.

The new empty directory was created; constructing its protected DACL failed before Set-Acl. The bootstrap passed SID **strings** to the `FileSystemAccessRule` constructor. That overload treats the identity as an account name; `AddAccessRule` could not translate it and raised `System.Security.Principal.IdentityNotMappedException` (wrapped by PowerShell MethodInvocationException).

This cause was reproduced after STOP using an in-memory DirectorySecurity object with the same SID-string constructor. A second in-memory object using actual `SecurityIdentifier` objects successfully produced a protected two-rule DACL. **Neither reproduction calls Set-Acl, New-Item or initdb.** This is a source bug, not evidence that Administrator elevation is needed.

The original nested PowerShell stdout/stderr/exit details were captured only in the wrapper's RAM and not persisted before it threw. The exact nested native exit code is therefore NOT_VERIFIED. Do not replace it with the later reproduction's error evidence. The outer Node exit1, returned STOP reason, empty directory and independent in-memory root-cause reproduction are the evidence available. Bootstrap capture must be improved before a future resume.

## PART B — Synthetic schema and controlled mapping

Prepared source only; schema/roles/database/data have NOT been created:

- Dedicated SCRAM-authenticated new test cluster, loopback55435, independent randomly generated test credentials kept only in RAM. No production credential/config import or plaintext credential file.
- Synthetic database `smart_agriculture_d1g`, owner `d1g_dba`; separate non-superuser read-only `d1g_reader` and negative-test `d1g_other` roles.
- Eleven local migration SQL files, validated against inherited checksum pins; synthetic Prisma history and synthetic User/Farm/Zone/Device/Actuator/DeviceCommand fixtures. No production archive, rows or passwords used.
- A single initdb marker and create-new logs/outcome only after root NTFS passes. Since it failed, no marker/log/data files were created under the empty root. Test credentials generated in RAM were never installed into a server and disappeared with the failed process.

`phase13-5d1g-mapping.cjs` allows only five identity-literal changes:

| Source literal | Test replacement | Exact occurrences |
| --- | --- | --- |
| `'smart_agriculture'` | Explicit allowlisted synthetic database name |3|
| `'5432'` | `'55435'` |3|
| `'7472695863566132416'` | Newly verified test systemID, never production/recovery IDs |3|
| `'C:/Program Files/PostgreSQL/17/data'` | `'C:/DATN/test-instances/phase13-5d1g/data'` |3|
| `'postgres'` | `'d1g_dba'` for owner identity guards |6|

Every replacement has a fixed expected count and rejects collision; reverse mapping must restore the original byte string and SHA256. Transaction logic, SELECT bodies, read-only/isolation/timeouts, fingerprints and stop gates are unchanged. Source R1 hash exactly matches `9C47BD805608012D74916033AB061495311C29AD9A588D3AAFAD36578A2F9774`.

An **offline-only placeholder** systemID `7777777777777777777` demonstrated reversibility before any root creation: mapped hash `C38A3A6CC98EBD8B69A3D4E580CE626CF279AD1659CE2EA0F40745415C2E9AE4`, reverse hash matches source. This is NOT a real test-cluster identifier or the final executable mapping. No actual mapped SQL run/hash tied to a created cluster exists yet.

## PART C — SQL R1 actual integration

**NOT_PERFORMED. Zero R1 SQL executions; zero PostgreSQL connections.**

Consequently all real-server checks remain NOT_VERIFIED: syntax, \gset/\if, BEGIN REPEATABLE READ READ ONLY, read-only settings, six JSON outputs, principal/system/DB identity, migration/command baseline, snapshot consistency, catalog comparisons, actual AccessShareLocks and transaction completion.

The source runner validates the mapped test identity directly; it does not relabel real test output as production evidence. Its planned setup writes are separate from R1 reads, and all target/role selection is allowlisted to the new test cluster. None of those paths was reached.

No R1 defect was discovered by real SQL, because SQL never ran. Do not propose an SQL R2 as though R1 failed integration. The observed defect is the D.1G NTFS bootstrap/capture path.

## PART D — Lock / DDL-race tests

Prepared in the new runner but **NOT_EXECUTED**:

- Synthetic PENDING, fingerprint drift, missing relation, unexpected irrigation object and table replacement cases in separate allowlisted cloned synthetic databases.
- Wrong-principal acceptance/rejection, with explicit expected reader identity checked outside R1; R1's own SQL does not independently pin current principal to a specific reader.
- Exact-byte streamed R1 pause after access probes, concurrent synthetic ALTER TABLE with500ms lock_timeout, expected55P03, and continuation without changing R1 bytes.
- Exact-byte streamed pause before probes, concurrent synthetic DDL, and detection/reporting of any stale-catalog acceptance. The code must report FAIL and STOP if R1 accepts drift, not alter its SQL to pass.

No concurrency result, DDL protection guarantee, OID safety guarantee, snapshot mismatch test or SQLSTATE from PostgreSQL is claimed. Further test coverage (including real restart/snapshot scenarios) still requires implementation/review and actual execution; a prepared test list is not acceptance.

## PART E — Native capture and failure handling

The new runner pins explicit PostgreSQL binaries, selects only127.0.0.1:55435, never imports DATABASE_URL/ORM/MQTT/config, and checks actual SQL identity before planned DDL. Native database operations would use separate create-new file descriptors, explicit environment and bounded time/output checks. Unknown native errors stop rather than retry. These paths remain unexercised on PostgreSQL.

The **root-creation prelude** failed before those database-operation logs existed. Its lack of persisted nested error details is a known limitation; do not claim complete native evidence capture PASS for this attempt. The sanitizer preserved a coarse error code, not the full native outcome. Root cause was identified by independent no-filesystem-mutation reproduction.

No cleanup or ACL repair was performed after STOP. The empty new directory is retained. No production directory/ACL was changed. There was no test server to stop; final55435listener count is0 and PGDATA remains absent. Existing data/logs/evidence were not overwritten or deleted.

## PART F — Offline regression results

Final command:

```text
node --test scripts/phase13-5d1g-mapping.test.cjs scripts/phase13-5d1f-native-transport.test.cjs scripts/phase13-5d1e-evidence-collectors.test.cjs
```

**208/208 PASS**,0FAIL/0SKIP, test-runner exit0, duration1772.890ms:13D.1G offline tests +69D.1F +126D.1E. This is **not SQL integration PASS**.

Before the attempt,12D.1G mapping/static tests passed; after failure, one regression was added to reproduce the SID constructor problem and prove the proposed constructor fix **in RAM only**. The executed runner itself was not changed or retried. Its source hash remains the exact pre-execution value. The failing root-creation attempt remains FAIL/BLOCKED despite offline regression PASS.

Both new CJS runtime modules passed Node syntax checks. Inherited D.1C/D.1D/D.1E/F sources remain at pinned hashes; the12inherited-artifact assertions in the F suite pass. No application-wide, production runtime or SQL regression was run.

## PART G — Source hashes and evidence

New source hashes:

```text
7DB10BE4BAB21454CCB03C8D48981907AD442E7046C2C54F145346AF152C7C27  phase13-5d1g-isolated-run.cjs (before execution = after failure)
C5D83DB451C984E53EFCFCE187B9CB5591A344AA2604F742F674435B416AE2C0  phase13-5d1g-mapping.cjs
325B8D26AD5E4B50983E2C4C21F986043D44D1F0F52F41F78F6FABEDB039AFC4  phase13-5d1g-mapping.test.cjs before attempt (12tests)
CB18EB929980292A06824B81FD03C289AE6363A831CE91E4B6C33DE5365ACBA1  phase13-5d1g-mapping.test.cjs final (13tests, extra offline regression)
```

Pinned binaries (17.2):

```text
94FDD98979F268FE58198EFC02BB7C765D11E1EB827FAD0CA13B2DC1FA379BFC  initdb.exe
FC644446B0236E623E3E6FE2699446259EFB8E61BD9ABA838D6394A2BE6987B8  pg_ctl.exe
462604E525498D5AFFF38EE401025678A9E33D4DBAFB29DF1CDA87ACE70C5A2A  psql.exe
6896F8A705AFB5CBAAD843017D6D8AED5F5D76E32B3179E66750AAA5F193CC40  pg_controldata.exe
```

Sanitized failure/state evidence: `report/phase13-5d1g-isolated-sql-summary.json`. It records0SQL operations and the final empty/unprotected directory, not a fabricated database identity or successful shutdown. Existing F/E reports retain their original status/hashes.

### Proposed next action — approval required before resume

Do **not** rerun the current wrapper: its target-must-not-exist guard will correctly stop on the retained empty root. Do not delete/recreate the directory to evade that gate.

Prepare a separately reviewed resume path for this exact empty root. It should preserve failure evidence, validate owner/reparse/port/emptiness again, persist bootstrap native errors with create-new semantics, construct each FileSystemAccessRule with an actual SecurityIdentifier object, apply ACL **only to this new test root**, verify operator+SYSTEM/protected DACL, and only then perform the first initdb attempt. No parent/production ACL changes, no automatic elevation, no different cluster and no initdb retry.

The in-memory constructor change has passed regression, but filesystem ACL application and resume execution have **not** been performed. A specific resume approval is needed because the original precondition “target path does not exist” is no longer true.

## PART H — Verdict

```text
PHASE13_5D1G_ISOLATED_SQL_INTEGRATION_PARTIAL/BLOCKED
ISOLATED_ROOT_NTFS_GATE_FAILED
INITDB_NOT_PERFORMED
SQL_INTEGRATION_NOT_PERFORMED
SQL_R1_SOURCE_UNCHANGED
TEST_INSTANCE_NOT_CREATED
TEST_PORT_55435_NOT_LISTENING
LIVE_PRODUCTION_PREFLIGHT_NOT_PERFORMED
BACKEND_RECOVERY_NOT_PERFORMED
PRODUCTION_MIGRATION_NOT_PERFORMED
PRODUCTION_STARTUP_NOT_AUTHORIZED
PHYSICAL_PUMP_NOT_TRIGGERED
```

Stopped after the failed root gate. No production DB connection/read/copy, backup/archive fixture, service/backend/broker startup, role/credential production change, MQTT command, hardware action or Git commit/push. Current production runtime flags/PENDING/telemetry were not inspected and are not claimed verified.
