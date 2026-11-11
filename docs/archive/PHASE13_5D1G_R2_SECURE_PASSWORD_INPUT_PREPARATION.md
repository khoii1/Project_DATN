# Phase 13.5D.1G-R2 — Secure initdb password input preparation

## PART A — Current state and evidence

27/10/2026, UTC+7. **PHASE13_5D1G_R2_PASSWORD_INPUT_BLOCKED**: option/source research and most console tests succeeded, but console-disconnect behavior exposed an unresolved blocking-read/lifecycle problem. No second initdb was run or authorized by this tooling.

Read-only before/after checks of `C:\DATN\test-instances\phase13-5d1g`:

- Same operator owner SID `S-1-5-21-1432835263-483988321-3159128977-1001`, protected DACL,2ACEs, no unexpected root reparse at initial inspection.
- **10existing evidence files**, no PGDATA, no55435listener. No old root/ACL/file was modified or recreated.
- `initdb-attempt.json` remains SHA256 `43814FB64198DD08F660E6D6EE8EA762B807D81B36A5DA4AE4AF5DA9083DD22C`.
- `resume-r1-outcome.json` remains SHA256 `03D63D6F5396E3BDC64CEAC84263568B013BAC7758E7869451B8A94B4AB11138`.
- R1's known initdb exit1/file-minus failure remains historical FAIL; it was not relabeled PASS. No new marker was created in the old root.

Only actual binary invocations were `initdb.exe --help` and `--version`, both inspection-only, never initialization. No PostgreSQL connection on5432/55433/55434/55435, pg_ctl action, backend/MQTT operation, ACL change or hardware action.

## PART B — PostgreSQL17.2 password options

The exact installed binary reports17.2, lists `-W, --pwprompt`, and retains SHA256 `94FDD98979F268FE58198EFC02BB7C765D11E1EB827FAD0CA13B2DC1FA379BFC`. Its help describes --pwfile as a filename; the earlier actual failure proved that `-` was not stdin for this build. That mechanism is not reused.

The official documentation identifies --pwprompt as interactive superuser password entry. [PostgreSQL17 initdb documentation](https://www.postgresql.org/docs/17/app-initdb.html).

In the exact REL_17_2 source, get_su_pwd invokes two hidden-input prompts and exits on mismatch. File input instead calls fopen on the supplied filename. This explains the prior failure but is not proof that this packaged Windows binary behaves correctly in every console environment. [REL_17_2 initdb source](https://github.com/postgres/postgres/blob/REL_17_2/src/bin/initdb/initdb.c).

The tagged common prompt implementation opens CONIN$/CONOUT$ on Windows, disables echo using console mode, reads input and restores the mode. If those handles cannot be opened, or under its MSYS-specific branch, it can fall back to stdin/stderr. Its comments also identify console-code-page limitations for non-ASCII input. Therefore a redirected stdin pipe is not an interchangeable interactive-console contract; the future launcher must prove an attached console and reject unsupported environments. [REL_17_2 sprompt source](https://github.com/postgres/postgres/blob/REL_17_2/src/common/sprompt.c).

These are source observations. Help output alone is not input acceptance, and a synthetic Windows API reader is not the real PostgreSQL CRT reader.

## PART C — Proposed secure input method

New `scripts/phase13-5d1g-r2-password-plan.cjs` contains a disabled future specification:

- Pinned initdb binary/hash, exact existing target PGDATA and independent d1g_dba role.
- --pwprompt, SCRAM local/host auth; never --pwfile=- or trust.
- Operator types a new independent test password directly into a visible owned console and confirms it, not into chat, argv, a file or global environment.
- No agent password injection, transcript recording, clipboard workflow or production credential reuse. The password is not returned to the launcher in logs.
- Proposed prompt deadline120s, single attempt, explicit new approval and new marker. --no-clean is proposed to retain failure data; it is not an executed change.

`executeInitdb()` always denies with SECOND_INITDB_ATTEMPT_NOT_AUTHORIZED. Default CLI is PLAN_ONLY. The helper accepts only fixed synthetic scenario names and a safe run ID, not an executable, password, SQL, credential environment or arbitrary arguments. `inspectionSpec` permits only --help/--version.

No password or credential was requested from the operator. All injected characters in this phase are a clearly labeled public synthetic canary, not a usable credential. Managed/CRT memory zeroization is NOT guaranteed; neither OS memory/screen access by privileged software nor malware protection is claimed.

## PART D — Windows console design and blocker

Added `phase13-5d1g-r2-console-fixture.ps1`. It is a dedicated synthetic PowerShell child only, with no PostgreSQL launch path. It detaches **itself** from any inherited console, allocates its own hidden test console, and verifies exactly one attached member with its own PID. It never detaches the user's console or signals unrelated processes.

The C# fixture opens CONIN$/CONOUT$, sets actual input mode without ENABLE_ECHO_INPUT, prompts twice, and uses ReadConsoleW. Synthetic key events are injected with WriteConsoleInputW into that private console. Successful cases compare both inputs in RAM and restore the previous mode. No input strings are serialized.

No-echo validation is not based solely on a boolean: the fixture inspects its own console screen buffer, returns only whether the synthetic canary was visible, and never persists the buffer. The deliberate echo-enabled negative case actually detected visible canary content and blocked. This calibrates the screen check for the test environment; it is not a proof for real initdb's CRT or every terminal.

The timeout fixture wakes **its own synthetic reader** by injecting a newline after a short monotonic test delay. That is NOT an approved way to timeout real initdb: do not inject empty input into the real program. Future operator-deadline enforcement/cancellation needs a separate safe implementation.

### Unresolved disconnect failure

During a pending ReadConsoleW, the fixture attempted FreeConsole. It did not produce a verified disconnected/voluntary-exit result before the outer8s native deadline:

```text
native exitCode=null
native errorCode=ETIMEDOUT
native signal=SIGTERM
elapsedMs=8049
classification=UNKNOWN_NATIVE_OUTCOME
retry=false
```

Node's outer timeout terminated only its owned synthetic child. This is **not graceful stop** and must not become the real initdb timeout strategy. Fixture PID12396 was later absent on a read-only PID-existence check; that observation is not retroactive proof of graceful cancellation or of a known terminal result at timeout.

The fail-closed classifier correctly blocked/no-retried the unknown native outcome, but the intended disconnect integration assertion failed. No retry of this uncertain disconnect attempt was performed; its directory and metadata remain intact. Production/real-initdb input lifecycle remains unverified, so readiness is BLOCKED.

## PART E — Synthetic integration test results

New suite: `node --test scripts/phase13-5d1g-r2-password-input.test.cjs`.

**18/19 PASS,1FAIL,0SKIP**, runner exit1;18710.132ms. The failure is preserved, not converted to PASS by weakening the expected lifecycle behavior.

Run prefix: `build/phase13-5d1g-r2-offline/r2-tests-1793108557125-c8fcd5-*`.

| Scenario | Actual result | Test |
| --- | --- | --- |
| Interactive/no-echo/two matching entries | exit0; SYNTHETIC_CONFIRMED; two prompts; no echo; mode restored |PASS|
| Confirmation mismatch | exit23; CONFIRMATION_MISMATCH |PASS|
| Missing input | exit23; MISSING_INPUT |PASS|
| Synthetic prompt timeout | exit23; PROMPT_TIMEOUT |PASS, fixture-only wakeup|
| Operator cancellation simulation | Actual private-console Ctrl+C observed; exit23; OPERATOR_CANCELLED |PASS, not actual human/initdb cancellation|
| Native nonzero after confirmation | exit7; rejected |PASS|
| Deliberate echo-enabled mode | Console canary visible; ECHO_UNSAFE; rejected |PASS|
| No console | NO_CONSOLE; rejected without stdin fallback |PASS|
| Console loss during blocking read | ETIMEDOUT/SIGTERM; UNKNOWN_NATIVE_OUTCOME, no retry |**FAIL** lifecycle assertion|
| Duplicate attempt | Existing marker bytes preserved; no second child |PASS|

Other tests cover real-initdb denial, inspection allowlist, no credential argv/env/file channel, native error despite exit0, missing confirmation/no-echo proof, AST and inherited evidence hashes.

All10suite attempt directories use new names/create-new markers/logs. A preliminary successful console probe has its own separate directory; it is not counted as a second run of the failed attempt. In all suite stdout/stderr/attempt/result files the synthetic input canary was absent. No plaintext password file was created. Add-Type may use compiler temporary artifacts under the dedicated synthetic directory; those contain only public fixture source/data, never a real credential. No private test-root file or ACL was changed.

## PART F — Hashes and regression

Existing regression command (excludes the new failed suite):

```text
node --test scripts/phase13-5d1g-resume.test.cjs scripts/phase13-5d1g-mapping.test.cjs scripts/phase13-5d1f-native-transport.test.cjs scripts/phase13-5d1e-evidence-collectors.test.cjs
```

**211/211 PASS**, exit0;3212.872ms. R1 runner/accepted ACL helper/old summaries/attempt/outcome hashes remain unchanged. Both new CJS files pass Node syntax; new PowerShell AST test passed. This regression result does not erase the new18/19 outcome.

New source SHA256:

```text
F37A75EC916624FD08ABC5BC9EFEE5578882D645DB65D6B0B70493020E07D5AF  phase13-5d1g-r2-password-plan.cjs
C464A8B51B04FDF0CE7E7FD973266FC8DCCF459C5BDB823DB26537BA66036837  phase13-5d1g-r2-console-fixture.ps1
F9E2B197C4F29BBB880F9A937CF7697C0C975CFD296DD928F102FDD92DDA5BED  phase13-5d1g-r2-password-input.test.cjs
```

Preserved disconnect evidence SHA256:

```text
AD796A274DF1D11E684EFB41B37152BBF7476B6ED2946DD4AFEA29D606EDF15B  disconnect/result.json
9DA73EFABB66FC86CDA54E63090A298B9ADD35DF933729BF0460515A69C180E9  disconnect/attempt.json
```

Old initdb binary remains at its pinned hash. Old R1 runner `855B3EAD...4699B`, root helper `EA18F33C...704C1`, D.1G summary `317959AB...1DC01`, and R1 summary `D21BC5DB...037D` are unchanged. Full hashes are asserted in tests; no old regression/evidence source was patched.

## PART G — Requirements before a second initdb approval

Do not request/run another real initdb just because --pwprompt exists. First resolve the console-disconnect/blocking-read lifecycle and real-program deadline/cancellation design in a separate controlled preparation change, preserving this failure. No automatic retry, arbitrary PID signaling or silent switch to file/stdin/trust fallback.

After preparation is actually ready, a future execution approval must explicitly allow exactly **one new initdb attempt**, retain the old1/1 marker and logs, and pin new run ID/source/binary hashes. It must acknowledge that R1's root now contains10expected evidence files, not an empty directory. Validate a whitelisted contents/hash baseline rather than delete/recreate or overwrite old evidence.

Immediately before that separately approved attempt: reread owner/DACL/ancestors/reparse, confirm absent PGDATA and free55435, verify no target process/unknown previous attempt, and preserve all prior files. Create a **new** run-bound initdb marker with create-new semantics, never overwrite initdb-attempt.json. Verify a visible conventional Windows console and exact owned process identity; avoid MSYS/ISE/pipe assumptions and password in command lines, environment or files.

The actual binary's prompt/input/confirmation behavior has NOT been tested. Such a test necessarily reaches initdb's real execution path and requires that new approval. On timeout/disconnect/unknown outcome: block and inspect, do not retry. A prepared future --pwprompt argument array is not an executable approval.

## PART H — Verdict

```text
PHASE13_5D1G_R2_PASSWORD_INPUT_BLOCKED
PINNED_INITDB_PWPROMPT_OPTION_CONFIRMED
SYNTHETIC_NO_ECHO_CONFIRMATION_PASS
SYNTHETIC_DISCONNECT_LIFECYCLE_FAIL
REAL_INITDB_PASSWORD_INPUT_NOT_VERIFIED
SECOND_INITDB_ATTEMPT_NOT_PERFORMED
SQL_R1_NOT_EXECUTED
PRODUCTION_DATABASE_NOT_MODIFIED
BACKEND_RECOVERY_NOT_PERFORMED
PHYSICAL_PUMP_NOT_TRIGGERED
```

Stopped after preserving the new failure and completing unrelated existing offline regression. No real initdb (other than allowed help/version inspection), cluster, database connection, ACL mutation, backend/MQTT launch or physical action occurred.
