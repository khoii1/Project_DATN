# Session 4 — Windows SACL privilege readiness

**SESSION4_SACL_CAPABILITY_BLOCKED**. The current process token is Limited/non-elevated and SeSecurityPrivilege is **NOT_ASSIGNED**. No elevated operator context has been supplied. Actual SACL capture: **0/17**. No privilege adjustment or security metadata mutation was performed.

## Actual token evidence

- Operator SID: S-1-5-21-1432835263-483988321-3159128977-1001, matching the fixed approved operator. No account substitution or impersonation.
- GetTokenInformation(TokenElevation): **0 / not elevated**, native error0.
- GetTokenInformation(TokenElevationType): **3 / TokenElevationTypeLimited**, native error0.
- OpenProcessToken(TOKEN_QUERY), LookupPrivilegeValue(SeSecurityPrivilege), GetTokenInformation(TokenPrivileges): native errors **0/0/0**. Lookup of the privilege LUID does not imply that it is assigned to the process token.
- Full queried privilege list did not contain SeSecurityPrivilege. Classification: **NOT_ASSIGNED**, rather than PRESENT_DISABLED or UNKNOWN. This describes this token, not every possible elevated token for the account and not the Local Security Policy assignment.
- No AdjustTokenPrivileges call occurred: temporaryEnableError=null. Restore was a no-op (error0); before/after token state and attributes match. No SACL handles were opened after the missing-privilege gate.
- Prior native open probes returned1314; this invocation does not claim to have repeated those SACL probes. Current token APIs directly explain why automatic capture must stop.

Private actual-token evidence: C:\Users\Acer Swift3\AppData\Local\SmartAgricultureAclReview\session4-20261107-01\sacl-readonly-79cfa708b71448d99beeb4669e379885.private.json, SHA256 42083ef0f3a1731541f021def50b76ac11ce7286e14eefe7e6a3cbe4e098e546. No actual SACL data exists in this diagnostic file. The prior private original snapshot was neither overwritten nor treated as SACL evidence.

## Reviewed probe

Source: build/session4-sacl-readiness-20261107-1/sacl-readonly.ps1.

SHA256: **0f5fa3304bbb6a6202299128aaac2864d384d91cef6f9c562198a41475c2b850**. PowerShell AST: zero errors, host exit0. C# source compiles in the focused tests. Tests inspect the native bindings to ensure no Set-Acl, SetSecurityInfo/SetNamedSecurityInfo, WRITE_OWNER, ownership takeover, automatic elevation or identity-substitution path.

The probe checks operator SID, pinned original evidence, private-directory/file permissions and exact scope before use. Default invocation queries the token only. In a separately operator-provided context, -CaptureSacl requests the fixed seventeen paths. -EnableExistingPrivilege only permits a temporary transition from already-present/disabled SeSecurityPrivilege in that probe process. It checks AdjustTokenPrivileges BOOL plus Win32 last error; ERROR_NOT_ALL_ASSIGNED1300 is failure, never successful assignment. The previous privilege attributes are restored in finally; restoration error or mismatch blocks readiness. It does not grant a missing right, change user rights policy or alter the parent process token.

The capture path opens READ_CONTROL + READ_ATTRIBUTES + ACCESS_SYSTEM_SECURITY, OPEN_EXISTING and reparse-aware native handles; reads owner/group/DACL/SACL using GetSecurityInfo; retains full SDDL only in a new private evidence file. Native canonical path, volume:file index, type, link count, reparse state, original owner/group/DACL portions and five file hashes are checked. It compares a second read and requires the complete exact 17-path set. An unreadable path stops further capture, records BLOCKED/PARTIAL and cannot yield READY. Confirmed null or absent SACL is distinguishable from an unreadable SACL by descriptor control/SDDL; no synthetic SACL is substituted. This read-only snapshot is not an ACL-writer race-control proof.

## Native completion limitation

The tool's outer PowerShell execution returned **exit1**, with a complete JSON diagnostic and the matching create-new private evidence. The probe deliberately uses script exit3 when readiness is blocked. However, an independent held child-process native-exit receipt was not collected for this invocation; the child native exit is therefore **NOT_INDEPENDENTLY_OBSERVED**, not asserted as3 or0. Outer exit1 is preserved in current-tool-receipt.json. JSON output and private evidence do not turn it into native completion PASS. There was no retry of the token diagnostic after NOT_ASSIGNED was established.

Node synthetic test invocation exited0; its compiled-classifier PowerShell child exited0 with checked status/signal/error/stderr. The independent original identity/DACL/hash check also exited0. Those completions are separate from the blocked privilege probe.

## Focused offline tests

**22/22 PASS**, native Node exit0. TAP SHA256 65ef61970e08c90d06dbd42e86bdae036abd0f30cb7b66a375a0f6f76e191b93.

Tests cover missing/disabled privilege, enabled evidence, ERROR_NOT_ALL_ASSIGNED1300, ERROR_PRIVILEGE_NOT_HELD1314 preservation, owner/path/identity/DACL/source substitution, partial/unknown SACL, unknown/nonzero native completion, failed privilege restoration, identity substitution and security-mutation rejection. Actual C# ClassifyPrivilege is compiled and called with four synthetic present/attribute combinations without invoking token APIs. Static checks enforce existing-only enable logic, native-error checks, restoration in finally and redacted console output.

The independent evidence guard is an offline synthetic review schema; it cannot authorize a writer. These tests do **not** verify successful real temporary privilege enabling/restoring or actual SACL retrieval. Those paths remain NOT_VERIFIED until an authorized suitable token is supplied. No fake token or SACL evidence was promoted to native PASS. No previous42/417 suites were rerun.

## Original filesystem and source integrity

- Independent read-only check: **17/17 canonical paths, volume/file identities, link counts and original owner/group/DACL descriptors MATCH**; five dependency SHA256 values MATCH. Native exit0. C:\ remains a read-only boundary.
- Installed source-lineage: APPROVED_DELTA_VALID; 250 baseline = 248 unchanged + 2 historical approved replacements, 16 active helpers. Independent source/runtime/test/authority hashes: **288/288 MATCH**. REV10 and descriptors unchanged.
- Existing ACL blocker remains. No DACL/SACL/owner/group or project-file write occurred. New evidence/test/probe/report files only were created. This does not claim that SACL contents were read or independently compared.

## Required operator action

1. Open **Windows PowerShell → Run as administrator** yourself under the same approved operator account. The Agent has not opened/elevated a context, changed accounts or created a privileged task.
2. Run **whoami /priv** and check SeSecurityPrivilege. Administrator membership alone is not sufficient. If the elevated token still lacks this privilege, stop and ask an authorized Windows administrator to inspect the applicable User Rights Assignment / Manage auditing and security log policy. Do not change it as part of this task.
3. If the new authorized token has the privilege (enabled or disabled), verify the exact script hash above before requesting the read-only capture. The prepared invocation below runs only the read-only probe in a child that inherits the manually supplied context. Existing disabled privilege may be enabled temporarily only inside that child; no new right is assigned.

```powershell
whoami /priv
Get-FileHash -Algorithm SHA256 -LiteralPath 'C:\DATN\Project_datn\build\session4-sacl-readiness-20261107-1\sacl-readonly.ps1'
# Continue only if the hash matches this report and the authorized token has the privilege.
& "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -File 'C:\DATN\Project_datn\build\session4-sacl-readiness-20261107-1\sacl-readonly.ps1' -CaptureSacl -EnableExistingPrivilege
$probeNativeExit = $LASTEXITCODE
"Probe native exit: $probeNativeExit"
```

Share only the redacted summary/native exit or private evidence path for review, not SDDL contents or credentials. The probe must verify identity, token state and actual reads again in that new context. Do not infer success from elevation or an exit code alone. This handoff is not authorization to assign Windows privileges, modify ACL or run the ACL writer.

## Writer readiness and stop

Elevated-context capability: **NOT_PROVIDED / NOT_VERIFIED**.

Actual SACL reads: **0/17**. SACL native completion: BLOCKED/NOT_VERIFIED. ACL writer readiness: BLOCKED_PENDING_PRIVILEGE_CONTEXT_AND_FULL_WRITER_REVIEW. Actual temporary privilege activation/restoration: NOT_EXECUTED. No ACL apply attempt, automatic rollback or permission bypass.

Final: **SESSION4_SACL_CAPABILITY_BLOCKED**.

ACL writes0; active source/REV10 unchanged; observer not copied/activated; Website session4 not executed; Edge/PostgreSQL/API/Frontend not started; MQTT not connected; DeviceCommand/ON/OFF/Automation/pump actions0. Source quality and prior browser limitations remain unchanged. STOP awaiting an operator-provided suitable context.
