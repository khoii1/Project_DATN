# Phase 13.5D.1G-R2.1 — Windows console lifecycle hardening

27/10/2026, UTC+7. **PHASE13_5D1G_R2_1_CONSOLE_LIFECYCLE_READY**, limited to the new supervised **synthetic** implementation. Real initdb password input remains NOT_VERIFIED and no second attempt is authorized or executed.

## PART A — Original failure analysis

Reviewed the three R2 sources, R2 report and original disconnect evidence. R2 placed ReadConsoleW on the fixture's main execution path, while another thread called FreeConsole. In the observed Windows run the pending read/detach did not finish before the8s outer timeout. Native error ETIMEDOUT/SIGTERM, null exitCode and UNKNOWN_NATIVE_OUTCOME were correctly blocked, but voluntary cancellation/resource closure were unproved.

This is an observed fixture/lifecycle design failure, not a universal claim that FreeConsole always hangs or that all Windows console reads behave the same. FreeConsole is not treated as a cancellation primitive in the new implementation.

Original evidence is unchanged:

```text
AD796A274DF1D11E684EFB41B37152BBF7476B6ED2946DD4AFEA29D606EDF15B  R2 disconnect/result.json
9DA73EFABB66FC86CDA54E63090A298B9ADD35DF933729BF0460515A69C180E9  R2 disconnect/attempt.json
```

The old attempt was not rerun, cleaned or relabeled. R2's18/19 history remains a failure history; no old expected assertion was weakened. New code uses new run IDs under `build/phase13-5d1g-r21-offline`, not the old root.

## PART B — Windows console cancellation design

The implementation is separate from the legacy R2 helper:

```text
Node coordinator -> PowerShell supervisor (owns private console) -> synthetic C# child
                                                            child control loop + dedicated reader thread
Node coordinator -> independent observer (holds child's verified native process handle)
```

Only fixed synthetic sources/executables in the dedicated offline run directory can be used. There is no PostgreSQL, network, credential-file, backend or hardware path. The new executeInitdb entrypoint unconditionally denies.

The supervisor detaches only itself from any inherited console and allocates a hidden console for the fixture. The compiled child shares it. The supervisor is never in ReadConsoleW; the child reader thread does the blocking input, while a separate child control loop publishes heartbeats, detects requests/host loss and owns cancellation state.

For cooperative cancellation the child sets a permanent cancellation flag, prevents a next prompt, and calls CancelSynchronousIo on the handle of **its own known reader thread**. It waits for actual reader completion, mode restoration and handle release before terminal publication. API return alone is insufficient. Microsoft's contract describes cancellation as a request; operations can finish normally or be aborted, so completion must be observed. [CancelSynchronousIo](https://learn.microsoft.com/en-us/windows/win32/api/ioapiset/nf-ioapiset-cancelsynchronousio), [pending-I/O cancellation considerations](https://learn.microsoft.com/en-us/windows/win32/fileio/canceling-pending-i-o-operations).

The THREAD_TERMINATE access right is used to open this thread handle as required by the API; CancelSynchronousIo does not terminate the thread. No force kill is used to establish graceful success.

### Control events

Before CTRL_C_EVENT the supervisor checks its actual owned child, exact start ticks, executable, and current console members. Membership must be **exactly supervisor+child**. A wrong PID/start time or additional member refuses the signal. This is necessary because CTRL_C_EVENT is not safely scoped by an arbitrary nonzero process-group ID; group0 reaches processes sharing the caller's console. [Microsoft GenerateConsoleCtrlEvent contract](https://learn.microsoft.com/en-us/windows/console/generateconsolectrlevent).

The host installs a custom handler, not the inheritable ignore-Ctrl-C flag. The child records its real handler observation. File cancellation requests additionally bind nonce/PID/start ticks. Invalid requests are never redirected to another PID. Console membership is an observed snapshot, not a security boundary against malicious same-user attachment after the check; the acceptance here concerns controlled fixture processes.

### Failure cleanup is not graceful success

If the child intentionally ignores cancellation, the700ms graceful deadline produces GRACEFUL_STOP_TIMEOUT. A separate fixture-only cleanup request then permits the test child to cancel its reader and exit23 as **ABNORMAL_TEST_CLEANUP**. That later closure does not retroactively change the timeout to success.

An observer fallback can terminate only the exact pinned synthetic executable after native-handle timeout and renewed PID/start/path checks. It records ABNORMAL_TEST_CLEANUP. This force-kill fallback was **not used** in the final actual tests; only its fail-closed classification was unit-tested. It must not be transplanted as an initdb/production cleanup policy.

## PART C — Supervisor, identity and independent native observation

| Layer | Evidence / responsibility |
| --- | --- |
| Coordinator | Create-new attempt, source hash, nonce, fixed helper paths, no arbitrary executable/arguments, no automatic retry. |
| Supervisor | Compiles fixed C# fixture; records actual compiler native exit; private console, child native process object/PID/start ticks/executable hash. |
| Child readiness | PID/start ticks, host PID/start ticks, nonce, timestamp and initial exact two-member console. Supervisor validates before start gate. |
| Child heartbeat | PID/start ticks/nonce, pending-read phase and time. Supervisor uses only fresh, matching complete records. |
| Child control loop | Not blocked in read; identity-bound requests, owned-reader cancellation, host identity-loss detection and terminal resource state. |
| Observer | Opens/holds the actual child's native process handle before start is allowed; checks exact path `run/synthetic-child.exe`, hash and start time; records native exit independently of supervisor. |
| Terminal publication | Child/observer/supervisor JSON uses create-new pending file, flush and atomic move. Incomplete JSON never establishes outcome. |
| Acceptance | Native observed exit must match child's PID/start/nonce/intended exit and supervisor observation when present. Missing/mismatched/error evidence stays BLOCKED/UNKNOWN. |

Observer continuity matters when the supervisor exits: the child detects host PID/start loss, cooperatively stops its reader and exits23, while the already-open independent native handle still yields a trustworthy exit result. The final result remains SUPERVISOR_LOST_CANCELLED/BLOCKED, not password success.

All output is fixed status/metadata and public synthetic fixture data. Test canary input is never passed through argv, passwords/environment or a plaintext credential file. Console input mode and screen-buffer canary checks cover no echo for the normal synthetic reader. Buffers/strings are not claimed securely zeroized against privileged memory inspection.

## PART D — Actual synthetic disconnect and cancellation results

Final run prefix: `r21-tests-1793110715363-df49d0`.

| Case | Child PID | Native exit | Actual interpretation |
| --- | --- | --- | --- |
| Operator Ctrl+C simulation |21040|0|CONTROLLED_CANCEL_SUCCESS; real handler observed; reader completed; mode restored; handles released. |
| Supervisor cancel |8224|0|CONTROLLED_CANCEL_SUCCESS, same completion evidence. |
| Loss before read |15188|23|CONSOLE_LOST_RECOVERED; known native failure, still BLOCKED. |
| Loss during blocking read |20376|23|Actual child detach attempted during pending ReadConsoleW; separate control loop cancels reader; detach/read finish; handles released; CONSOLE_LOST_RECOVERED, still BLOCKED. |
| Ignore cancellation |12560|23|GRACEFUL_STOP_TIMEOUT retained; subsequent cooperative fixture cleanup marked ABNORMAL_TEST_CLEANUP. |
| Supervisor disappears |16624|23|Independent observer confirms SUPERVISOR_LOST_CANCELLED; BLOCKED. |
| Additional console member |2604|23|No Ctrl+C sent; refused scope; fixture cleanup only. Extra allowed guest naturally exits0. |

The loss-during result is no longer the old8s ETIMEDOUT: it has atomic child terminal metadata, resources/handles released and matching independent native exit23. Mode restoration is false after detach because the child no longer owns that console; it is not claimed restored. It is never accepted as normal input or controlled-cancel success.

Unknown loss remains a distinct outcome. Unit tests remove/corrupt terminal/native evidence, change PID/start/nonce or add a native error: classification becomes CONSOLE_LOST_UNKNOWN/BLOCKED/no-retry. The actual tests above do not claim every possible physical console destruction/terminal-host failure has been reproduced.

Other real cases: success/no-echo confirmation exit0; mismatch and missing input exit23; already-exited child exit0 without password-success inference; native nonzero exit7; timeout-triggered cooperative cancellation exit0; wrong PID/start and simulated PID reuse refuse all signals. Each case has its own new attempt and observer-native-exit record.

The PID-reuse fixture intentionally presents the same numeric PID with wrong start ticks; it does not force Windows to recycle an actual PID. Wrong-member/identity cases were cleaned through an explicitly labeled fixture-only path, not by signaling an unrelated process. No global OS-wide interference audit is claimed; actual signal lists contain only the verified host/child, and the extra guest receives no control event and exits normally.

## PART E — Tests and regression

Final new suite:

```text
node --test scripts/phase13-5d1g-r21-lifecycle.test.cjs
23/23 PASS, 0FAIL, 0SKIP, native runner exit0; 51036.698ms
```

This includes16actual Windows lifecycle runs and7additional identity/classification/duplicate/AST/integrity tests. Negative test PASS means the unsafe outcome was rejected, not that the input operation succeeded. All16actual runs have consistent child terminal/native exit metadata, independent observer exit0, no outer forced cleanup, no observer force kill, no canary in captured logs and zero matching processes remaining in each run's exact PID/start census.

The16runs include5cooperative **ABNORMAL_TEST_CLEANUP** cases: ignored cancellation and four identity/member refusal cases. They remain blocked; none is called graceful success.

Final read-only census across all actual fixture identities created during development and both full suites checked **129PID/start-time pairs**,0matching remaining,0unknown checks. Compiler processes were observed through their held Process objects and native exit codes; they are not included in that129pair count.

Existing regression:

```text
node --test scripts/phase13-5d1g-resume.test.cjs scripts/phase13-5d1g-mapping.test.cjs scripts/phase13-5d1f-native-transport.test.cjs scripts/phase13-5d1e-evidence-collectors.test.cjs
211/211 PASS, runner exit0; 2742.870ms
```

234distinct final tests passed (23new +211existing). The old R2 suite was18/19 historically, not a previously passing regression; it is preserved unchanged and was not rerun on its already-unknown attempt. Its standalone unsupervised helper is a legacy reproduction, not the R2.1 execution path. No claim that those old assertions were changed to pass.

Node syntax and both new PowerShell AST checks PASS. C# compilation is exercised per real run, with native compiler exit metadata. An initial development probe misclassified compiler completion using a PowerShell native-exit variable;3pre-child failure directories remain. The supervisor now observes the compiler's own Process.ExitCode/WaitForExit directly. No runtime child was launched in those initial compile-gate failures. Later probes and both full suites are separate new attempts; their old artifacts were not overwritten or deleted.

## PART F — Files, hashes and evidence

All source changes are **new R2.1 files**; no old R2/R1/SQL/application file was modified:

| New file | Purpose |
| --- | --- |
| `scripts/phase13-5d1g-r21-child.cs` | Independent control loop and owned reader thread; hidden input, heartbeat, cancellation, detach tests and atomic terminal result. |
| `scripts/phase13-5d1g-r21-supervisor.ps1` | Private console ownership, readiness/member/identity gates, bounded cancel and explicit fixture cleanup. |
| `scripts/phase13-5d1g-r21-observer.ps1` | Native process-handle observation independent of supervisor, guarded abnormal-test-only fallback. |
| `scripts/phase13-5d1g-r21-lifecycle.cjs` | Fixed coordinator, single-attempt evidence, terminal classification and exact-identity post-test census. |
| `scripts/phase13-5d1g-r21-lifecycle.test.cjs` |23tests. |
| This report and new summary | Sanitized handoff; no old report overwrite. |

Before state for these five source paths: absent. Final SHA256:

```text
082B2C98E26FCC31D6ECB92A21C7D9DE75A49E4CDF974690A32C18EC922B88C0  phase13-5d1g-r21-child.cs
6EC8012DFEA04DD8B05073D7A741E2EBF2BE1BE50E99F30A6889E82C0C33F015  phase13-5d1g-r21-supervisor.ps1
C9597E657AE4F6688546BD0D39CC54F5607B208068F6FF22EAC19341E5975C7E  phase13-5d1g-r21-observer.ps1
7DCDCFE126B90A8309F48A70EA7C5EAB41CBBFC9551DF18D7D3380692C90B0D2  phase13-5d1g-r21-lifecycle.cjs
F4C178762FDFF4EAF1CD07DA8B71326B9A6DBDBC8791BFDA66249049C89B5B68  phase13-5d1g-r21-lifecycle.test.cjs
```

R2 before=after:

```text
F37A75EC916624FD08ABC5BC9EFEE5578882D645DB65D6B0B70493020E07D5AF  phase13-5d1g-r2-password-plan.cjs
C464A8B51B04FDF0CE7E7FD973266FC8DCCF459C5BDB823DB26537BA66036837  phase13-5d1g-r2-console-fixture.ps1
F9E2B197C4F29BBB880F9A937CF7697C0C975CFD296DD928F102FDD92DDA5BED  phase13-5d1g-r2-password-input.test.cjs
```

Each final run retains attempt/source hash, compiler metadata, identity, child-ready/heartbeat, observer-ready/native-exit, supervisor-native-exit when present, atomic child-terminal, signal/refusal/deadline/cleanup evidence where relevant, wrapper exits and result.json. No marker is reused. Executable hashes differ per compilation and are stored with that run's actual process identity.

Old test root remains10files, protected DACL/two ACEs, absent PGDATA and no55435listener. Old initdb marker hash `43814FB64198DD08F660E6D6EE8EA762B807D81B36A5DA4AE4AF5DA9083DD22C` and R1 outcome `03D63D6F5396E3BDC64CEAC84263568B013BAC7758E7869451B8A94B4AB11138` still match. No old ACL, evidence, credential or runtime source was changed; no Git commit/push.

## PART G — Remaining real-initdb limitations

- The child is deliberately cooperative C# code. It knows and cancels its own reader thread; initdb is a different executable using CRT/common PostgreSQL input code. The launcher cannot assume that it can transplant this reader-thread cancellation into an unmodified external initdb.
- Real initdb --pwprompt input, confirmation, Ctrl+C and deadline/disconnect cleanup are **NOT_VERIFIED**. No real initdb invocation occurred in R2.1, including no new help/version execution in this phase.
- No actual password, plaintext credential file, password argv/environment or database connection was used. Public fixture canary/source/compiler artifacts are not credentials. No promise is made against admin/malware memory or screen access.
- Unknown or forced-cleanup outcomes cannot authorize a retry. The observer's forced cleanup is a strictly offline fixture safety mechanism, not a production-ready or initdb policy.
- Current Commands/Automation/device/PENDING state was not read and is not asserted verified. Those settings were not modified.
- A future phase still needs an explicitly reviewed real-program console/input integration and separate approval for exactly one new initdb attempt with a new create-new marker. The old1/1attempt marker remains consumed. No approval is inherited from this offline READY verdict.

## PART H — Verdict

```text
PHASE13_5D1G_R2_1_CONSOLE_LIFECYCLE_READY
SUPERVISED_SYNTHETIC_CANCEL_NATIVE_EXIT_VERIFIED
UNEXPECTED_CONSOLE_LOSS_FAIL_CLOSED
FIXTURE_PROCESS_LEAKS_0
REAL_INITDB_PASSWORD_INPUT_NOT_VERIFIED
SECOND_INITDB_ATTEMPT_NOT_PERFORMED
SQL_R1_NOT_EXECUTED
PRODUCTION_STARTUP_NOT_AUTHORIZED
PRODUCTION_MIGRATION_NOT_PERFORMED
PHYSICAL_PUMP_NOT_TRIGGERED
```

Stopped at R2.1. No cluster creation/start, PostgreSQL/MQTT/API connection, backend operation, ACL mutation, firmware/reset, ON/OFF or hardware action.
