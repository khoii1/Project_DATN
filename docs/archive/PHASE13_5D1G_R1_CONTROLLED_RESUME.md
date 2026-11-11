# Phase 13.5D.1G-R1 — Controlled existing-root resume

## PART A — Approval and before state

Executed once under the user's D.1G-R1 controlled resume approval. Scope was the existing root `C:\DATN\test-instances\phase13-5d1g`, projected PGDATA `data`, loopback55435, PostgreSQL17.2, synthetic data only. No other cluster or production operation was authorized or selected.

Fresh pre-resume inspection confirmed root empty, expected operator owner/SID, no PGDATA, no reparse, no55435listener and no existing initdb marker. Operator SID: `S-1-5-21-1432835263-483988321-3159128977-1001`. Protected unrelated postgres process command lines were inaccessible (7records); this was not reported as complete global process inspection. Target absence was also supported by the never-initialized empty root, absent PGDATA/markers and no target listener; no matching visible target process existed.

The original D.1G failure report/evidence was preserved. Original summary SHA256 remains `317959ABCCB272EB6BB77F5D0AF309F4942C5B6CD4BA9172E92C357B98F1DC01`.

Resume run reference: `d1g-resume-r1-0c4c6b23-ebcc-482f-862c-4e5ca805f90f`.

Actual run: **26/10/2026 01:13:50.731–01:13:52.899 UTC+7** (`2026-10-25T18:13:50.731Z` through `18:13:52.899Z`). UTC dates are25October; local/client date is26October.

## PART B — SID constructor fix

Added `scripts/phase13-5d1g-resume-root.ps1` with a dedicated existing-empty-root path, not the original root-must-not-exist bootstrap.

- Operator obtained as a `SecurityIdentifier` object; exact SID checked before modification.
- SYSTEM constructed with `WellKnownSidType.LocalSystemSid` as a SecurityIdentifier object.
- FileSystemAccessRule receives SID **objects**, not account-name strings.
- In-memory DACL checks require owner/operator, protected inheritance, exactly operator/SYSTEM Allow FullControl, noninherited ACEs and expected inheritance flags.
- PLAN_ONLY and TEST_DACL do not modify filesystem permissions. Live ACL application requires the explicit resume mode.

The executed resume uses this corrected helper; the old new-root bootstrap is not invoked. No directory was deleted/recreated. No ACL was changed on parent directories, repository or production.

## PART C — Bootstrap error capture

Added a separate Node resume entrypoint and updated the shared D.1G runner only to support this approved path, capture and identity checks. It records native PowerShell exit/error/signal, start/end, run reference, helper hash, checkpoint, sanitized category/reason and unknown-outcome flag.

Before NTFS acceptance, only sanitized bootstrap metadata is written create-new to `report/<runReference>-bootstrap.json`; raw output, credentials and environment are not persisted there. After acceptance, the same sanitized metadata is stored create-new in the protected root. Database native logs and all markers also use create-new semantics.

Actual bootstrap result:

| Field | Observed |
| --- | --- |
| Native PowerShell exit |0|
| Native error / signal |null / null|
| stderr present |false|
| Checkpoint |VERIFY_ACTUAL_DACL|
| Result |ROOT_NTFS_VERIFIED|
| Unknown outcome |false|

Unlike the original failure, this is actual nested native evidence, not inferred from the Node wrapper status. No Administrator elevation was attempted.

## PART D — Actual NTFS acceptance

**PASS**, verified by the helper after Set-Acl and independently read again after stopping:

- Existing root owner is the expected operator SID.
- Protected DACL; inheritance disabled at this root.
- Exactly2ACE principals: operator and SYSTEM, Allow FullControl.
- No unexpected reparse point.
- Root still empty immediately after ACL acceptance, before markers/logs.
- Parent ACL fingerprints before/after match; parent permissions were not changed.

After the failed initdb attempt the root contains **10files** of new logs/markers/outcome evidence. All10files were read-only checked: correct operator owner and only operator/SYSTEM Allow FullControl;0file ACL failures. The root is no longer empty and must not be passed through an empty-root gate again or emptied to evade it.

## PART E — First initdb and test identity

The first and only initdb attempt marker was created after NTFS acceptance. Explicit PostgreSQL17.2 binary hashes matched the previously pinned evidence. Authentication arguments were SCRAM for host/local, not trust. New independent random test credentials existed only in process RAM, not argv/plaintext files/chat/logs.

The existing test55433 systemID was read using **pg_controldata on its local PGDATA**, not a network/SQL connection. Native exit0, no error/signal; ID `7698826681383327460`. Exclusion set was production `7472695863566132416`, existing test `7698826681383327460`, recovery `7699532241714573532`. No control/config/service mutation occurred on those peers.

### initdb actual result — FAIL, STOP

```text
initdb: error: could not open file "-" for reading: No such file or directory
```

The pinned PostgreSQL17.2 Windows binary treated `--pwfile=-` as a literal filename, not stdin. This exposed a second bootstrap assumption that offline fixtures had not exercised. It is **not** a SQL R1 failure or database permission failure.

| Native initdb field | Actual |
| --- | --- |
| Attempts used |**1/1**|
| Exit code |**1**|
| Native error / signal |null / null|
| Elapsed |270ms|
| stdout / stderr |290 /79bytes|
| PGDATA / PG_VERSION |Both absent after failure|
| New test systemID |NOT_CREATED / NOT_VERIFIED|
| Server start attempts |0|

The runner stopped immediately on the known nonzero exit. No second initdb, credential workaround, password file, trust authentication, directory reset or alternate target was attempted. Credentials were never installed into a running server and disappeared with the failed process. The existing `initdb-attempt.json` remains intact even though PGDATA was not created.

## PART F — Actual SQL R1 integration

**NOT_PERFORMED:**0PostgreSQL connections,0synthetic database/role/migration setups,0R1 executions. No fabricated actual test identity or mapped SQL hash.

R1 source still matches `9C47BD805608012D74916033AB061495311C29AD9A588D3AAFAD36578A2F9774`. Offline mapping/reverse-byte tests passed before execution; actual mapping tied to a new systemID was never reached.

Real psql conditional syntax, repeatable-read/read-only behavior, six output records, snapshot/catalog/migration/command checks and actual relation locks remain NOT_VERIFIED. No SQL R2 is proposed as a fix for this initdb invocation failure; R1 itself was not changed or run.

## PART G — Lock / DDL-race results

All SQL concurrency, PENDING, wrong principal/identity, fingerprint drift, missing relation, unexpected object, native SQLSTATE and DDL timeout cases remain **NOT_EXECUTED**. No AccessShareLock, OID-race or transaction completion claim is made.

SQLSTATE is not applicable to this failure: no PostgreSQL server/SQL session existed. Native initdb exit1 must not be recorded as a SQLSTATE or a transaction rollback.

## PART H — Regression, source hashes and evidence

### Tests before actual resume

```text
node --test scripts/phase13-5d1g-resume.test.cjs scripts/phase13-5d1g-mapping.test.cjs scripts/phase13-5d1f-native-transport.test.cjs scripts/phase13-5d1e-evidence-collectors.test.cjs
```

**211/211 PASS**,0FAIL/0SKIP, runner exit0,2333.565ms:3resume +13D.1G +69D.1F +126D.1E tests. PowerShell AST, constructor/DACL checks in RAM, resume scope/capture checks and Node syntax passed. The actual initdb failure remains FAIL; offline test PASS does not override it. No further initdb/SQL execution was performed after STOP.

### Files added / modified

| Artifact | Change |
| --- | --- |
| `scripts/phase13-5d1g-resume-root.ps1` | New existing-root gates, correct SID objects, root-only ACL acceptance and sanitized native output. |
| `scripts/phase13-5d1g-resume.cjs` | New explicit approved resume entrypoint. |
| `scripts/phase13-5d1g-resume.test.cjs` | New offline AST/DACL/scope tests. |
| `scripts/phase13-5d1g-isolated-run.cjs` | Modified: new resume branch/capture, peer-ID exclusion, PG_VERSION check and separate outcome filename; existing SQL R1/mapping logic unchanged. |
| This report and new sanitized summary | New evidence; earlier reports/summaries unchanged. |

Hashes pinned before execution and verified unchanged afterward:

```text
7DB10BE4BAB21454CCB03C8D48981907AD442E7046C2C54F145346AF152C7C27  isolated-run.cjs BEFORE approved resume edits
855B3EADF534E214D7112FE11190A356CBC952ABFF81493656D11A02BFF4699B  isolated-run.cjs AFTER edits / executed / final
26EC6C3176FB27533262CD64475D26DD11599F8020BDEA49CF362B0948F68110  phase13-5d1g-resume.cjs
EA18F33C8FD072A6F524AD831278A3124B0E4256FE7C15667458D7267AA704C1  phase13-5d1g-resume-root.ps1
3BCF646B2C2C3D96C300698E7A18D4E5E87240378CF9E0A2DE6250907CE62E5F  phase13-5d1g-resume.test.cjs
```

D.1C/D.1D/D.1E/F and C.7 code hashes remain unchanged; inherited source assertions passed. No production application/config/firmware source edits.

### Preserved actual evidence

All following root artifacts were created new, after ACL acceptance:

- `attempt.json`, `initdb-attempt.json`, `resume-r1-bootstrap.json`, `resume-r1-outcome.json`.
- `logs/001-existing-test-control.{stdout.log,stderr.log,native.json}`.
- `logs/002-initdb.{stdout.log,stderr.log,native.json}`.

Metadata hashes:

```text
03D63D6F5396E3BDC64CEAC84263568B013BAC7758E7869451B8A94B4AB11138  resume-r1-outcome.json
D7A3567A6A02CFA6C5A6CC93B6989B966F78E414DC6F21DEB24D291AC9CDACF6  logs/002-initdb.native.json
```

Sanitized repository evidence: `report/phase13-5d1g-resume-r1-summary.json` and the unique run-reference bootstrap metadata file. No raw credentials, environment, recovery keys, production data or private raw database output is published.

## PART I — Final safety comparison and next requirement

| Item | Final state |
| --- | --- |
| Test root ACL |PASS, protected owner/operator+SYSTEM only.|
| Parent ACLs |Unchanged by verified fingerprints.|
| First initdb |Known FAIL exit1;1/1used, marker retained.|
| PGDATA / server / listener55435 |No data directory, no created cluster/server,0listeners.|
| Graceful shutdown |NOT_APPLICABLE: no server was started; no pg_ctl stop was needed or invoked.|
| SQL/R1/concurrency |NOT_PERFORMED.|
| Production/test55433/recovery55434 network connections |0. Peer test identity checked only by read-only local pg_controldata.|
| Production changes / backend / MQTT / hardware |None performed.|

Current production Commands/Automation/PENDING/telemetry were not inspected and are not claimed verified. No existing evidence was deleted, no cleanup or source patch was applied to bypass initdb after its failure.

### Do not rerun the current resume

The approved first-initdb allowance is consumed. Root now intentionally contains evidence and must not be emptied or treated as an empty-root resume. Further execution needs a **new explicit approval** acknowledging that first attempt failed before PGDATA creation.

Recommended preparation for that separate session: validate a password-input method actually supported by this PostgreSQL17.2 Windows binary, preserving RAM-only/local secure handling. A supervised local `--pwprompt`/secure console workflow can be reviewed; do not claim it is verified yet or substitute a plaintext password file under this approval. Preserve the old attempt marker and logs; a new session would require its own create-new marker and exact known-failure/root-content gates. Do not automatically retry or change authentication.

## PART J — Verdict

```text
PHASE13_5D1G_ISOLATED_SQL_INTEGRATION_PARTIAL/BLOCKED
RESUME_ROOT_NTFS_ACCEPTANCE_PASS
BOOTSTRAP_NATIVE_CAPTURE_PASS_FOR_THIS_RESUME
FIRST_INITDB_FAILED_EXIT_1
INITDB_ATTEMPTS_USED_1_OF_1
SQL_INTEGRATION_NOT_PERFORMED
TEST_CLUSTER_NOT_CREATED
TEST_PORT_55435_NOT_LISTENING
LIVE_PRODUCTION_PREFLIGHT_NOT_PERFORMED
BACKEND_RECOVERY_NOT_PERFORMED
PRODUCTION_MIGRATION_NOT_PERFORMED
PRODUCTION_STARTUP_NOT_AUTHORIZED
PHYSICAL_PUMP_NOT_TRIGGERED
```

Stopped at the failed initdb checkpoint. No self-authorized retry, SQL R2, production preflight, backend startup or phase transition.
