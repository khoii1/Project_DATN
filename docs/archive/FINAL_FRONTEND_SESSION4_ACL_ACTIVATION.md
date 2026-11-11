# Session 4 — Approved ACL activation: blocked before write

**SESSION4_ACL_REMEDIATION_BLOCKED**. The current Windows token cannot open handles with ACCESS_SYSTEM_SECURITY to read SACL. The native error is **1314 / ERROR_PRIVILEGE_NOT_HELD**. The user explicitly requires SACL before/after verification and forbids proceeding with UNKNOWN properties. No ACL write was attempted; no rollback is needed.

## Approval and fixed authority

Genuine approval: C:/Users/Acer Swift3/.codex/attachments/3f55f381-8ad2-4966-8698-0b65bd9e658e/Pasted text.txt, SHA256 4c26a92eb4b5f0ad05eaf435cf54db1ecbace044321ca96e3b61a1ede365032a. Scope: exact sixteen targets, current operator S-1-5-21-1432835263-483988321-3159128977-1001, no elevation/ownership takeover, no automatic rollback or Website execution. This approval was not expanded.

The original snapshot matches e0563d9d66829438929d69dd7051e377f1de9d508f8f83bf7af314a727c34397. Exact private before/after proposal and new read-only dry-run result match 9a70bec0cfe635025ccbbc7ddce196242af67758f918d06d02250b6bebaed161. The approved dry-run, native identity helper and original collector hashes all match. New dry-run output is C:/Users/Acer Swift3/AppData/Local/SmartAgricultureAclReview/session4-20261107-01/dry-run-approved-preapply-01.private.json; existing evidence was not overwritten.

## Actual privilege gate

whoami /priv exited0 and lists no SeSecurityPrivilege in the current process token. A separate native probe uses CreateFile with OPEN_EXISTING, OPEN_REPARSE_POINT/BACKUP_SEMANTICS, share read/write/delete, then immediately disposes the handle. It imports no ACL-setting function and never requests WRITE_DAC/WRITE_OWNER for C:\.

| Actual capability | Win32 result |
|---|---|
| File READ_CONTROL + READ_ATTRIBUTES | 0 — available |
| File READ_CONTROL + WRITE_DAC + READ_ATTRIBUTES | 0 — available |
| File READ_CONTROL + ACCESS_SYSTEM_SECURITY + READ_ATTRIBUTES | 1314 — privilege unavailable |
| C:\ READ_CONTROL + ACCESS_SYSTEM_SECURITY + READ_ATTRIBUTES | 1314 — privilege unavailable |
| Native PowerShell host completion | exit0; gate result BLOCKED |

Probe source: build/session4-acl-activation-20261107-1/native-access-probe.ps1, SHA256 83d0567182b2ea585c510092ee9d91b07750076797da5451e4decc11ef469f43. No privilege was enabled, requested through elevation, borrowed or bypassed. These probe facts are from the tool's actual native result, not a successful write or a synthetic SACL read. A native host exit0 means the diagnostic completed; it does not turn error1314 into PASS.

The previous original-security snapshot contains owner/group/DACL only (AccessControlSections7); it is not evidence of SACL. DACL-only SetSecurityInfo could preserve SACL by construction, but that does not satisfy the requested actual before/after SACL verification. The requirement was therefore retained, not relaxed.

## Writer preparation and race control

Writer preparation stopped at the failed real privilege prerequisite. **No functional DACL writer or mutation entry point was finalized or run**; writer review is BLOCKED, not PASS. There are no fabricated new-writer test results, per-object write receipts, apply-attempt marker or execution journal. Staging contains only the read-only probe, test output and independent evidence/report helper.

For a future reviewed writer, a held-handle strategy is required: open and hold the root read-only, and all exact targets with independently checked canonical/native identities, suitable READ_CONTROL/WRITE_DAC/SACL-read access, no delete sharing on mutable target/ancestor handles, and appropriate data-write exclusion for files. Validate existing handles/sharing conflicts, memory mappings and trusted/untrusted DACL mutation races; stop on any conflict, do not kill processes. Use the same held handles for identity/security reads and any narrowly reviewed DACL-only operation. Owner/group/SACL must be captured and verified. Native directory inheritance/propagation must be controlled and independently checked. This design has **not** been proved or implemented as a mutation transaction here. It is not reported as a passed race gate.

## Fresh read-only checks

- Approved dry-run on final pinned bytes: exit0, 17 native metadata checks, 16 exact proposals, zero project ACL writes, original SDDL/identity/hash match. It validates in-memory descriptors; it does not prove applied permissions or actual inheritance propagation.
- Existing focused tests rerun: **42/42 PASS**, native exit0. No new writer tests are claimed. TAP SHA256 8894488dc55814b7f3b31f8a3363890a14b07df9477e764f25ab0dff69e1cdb2.
- Independent native postcheck: exit0; all **17 canonical identities/link counts, owners and DACL/group descriptors** match original; all **5 file hashes** match. Root DACL/owner/identity unchanged. SACL remains NOT_VERIFIED; zero writes is separately established by the absence of mutation code execution.
- Installed source lineage: **APPROVED_DELTA_VALID**; 250 baseline = 248 unchanged + 2 approved historical replacements; **16 active helpers**. Independent source/runtime/historical hash union: **288/288 MATCH**. Immutable REV10 and source descriptors unchanged.
- Dedicated listener/source-reader check returned empty lists. No process was stopped or restarted. This is not a system-wide assertion that no foreign process can access a source path, and not a passed concurrency gate.
- Actual resource ACL gate remains **BLOCKED_UNTRUSTED_WRITE**. All original DACLs still match; no applied read-only resource authority PASS is claimed.

The first aggregate evidence helper invocation exited1 because its constructed test-pin map omitted the historically approved bridge.test.cjs replacement (expected obsolete 45230c9f..., actual approved cb0eb1c0...). Installed strict lineage verification had passed. The helper was corrected to read the replacement from the pinned active descriptor, matching the existing independent verification contract; no file, descriptor or expected authority hash was changed. The corrected evidence helper completed with exit0. This tooling error is distinct from the native privilege blocker.

## Exact sixteen-object outcomes

| Approved target | Actual DACL outcome |
|---|---|
| C:\DATN | NOT_ATTEMPTED — 0 writes |
| C:\DATN\Project_datn | NOT_ATTEMPTED — 0 writes |
| C:\DATN\Project_datn\frontend | NOT_ATTEMPTED — 0 writes |
| C:\DATN\Project_datn\frontend\node_modules | NOT_ATTEMPTED — 0 writes |
| C:\DATN\Project_datn\frontend\node_modules\vite | NOT_ATTEMPTED — 0 writes |
| C:\DATN\Project_datn\frontend\node_modules\vite\dist | NOT_ATTEMPTED — 0 writes |
| C:\DATN\Project_datn\frontend\node_modules\vite\dist\node | NOT_ATTEMPTED — 0 writes |
| C:\DATN\Project_datn\frontend\node_modules\vite\dist\node\chunks | NOT_ATTEMPTED — 0 writes |
| C:\DATN\Project_datn\frontend\public | NOT_ATTEMPTED — 0 writes |
| C:\DATN\Project_datn\frontend\src | NOT_ATTEMPTED — 0 writes |
| C:\DATN\Project_datn\scripts | NOT_ATTEMPTED — 0 writes |
| C:\DATN\Project_datn\frontend\index.html | NOT_ATTEMPTED — 0 writes |
| C:\DATN\Project_datn\frontend\public\favicon.svg | NOT_ATTEMPTED — 0 writes |
| C:\DATN\Project_datn\scripts\mvp-ui-only-frontend.mjs | NOT_ATTEMPTED — 0 writes |
| C:\DATN\Project_datn\frontend\src\main.tsx | NOT_ATTEMPTED — 0 writes |
| C:\DATN\Project_datn\frontend\node_modules\vite\dist\node\chunks\config.js | NOT_ATTEMPTED — 0 writes |

Files applied **0/5**. Directories applied **0/11**. Total **0/16**. C:\ was never a mutation target. Other-resource inheritance changes: none caused by this task (no ACL writes); actual post-application propagation testing NOT_PERFORMED. Rollback NOT_INVOKED. No ownership, group, content or permission repair was attempted.

The approved DATN impact remains part of the future design: unauthorized users would lose create/rename/write rights on DATN itself while reviewed inheritable payloads remain. No such change happened here.

## Remaining blocker and next action

The next execution environment must make the required native SACL reads available without weakening the contract. An operator-managed appropriately privileged Windows context can be reviewed separately; this Agent did not elevate or change privileges. Before any write, obtain fresh SACL metadata, finish/review the fixed-path held-handle writer and race/propagation tests on final bytes, then repeat all current identity/hash/ACL/source gates. Do not use this report as a new privilege/elevation authorization or as a successful write attempt. Original approval has not consumed an ACL-write attempt, but its gates remain mandatory and any changed execution scope must be explicit.

Active source integration, revised descriptor/anchor activation, private observer and a genuine new Website approval remain separate. None is authorized by completing this ACL prerequisite.

```text
Authorization: APPROVED_EXACT_16_TARGETS
Writer review: BLOCKED
Pre-apply security gates: BLOCKED
Dry-run: PASS (read-only)
Files DACL applied: 0/5
Directories DACL applied: 0/11
Total targets: 0/16
C:\ root: DACL/OWNER/IDENTITY UNCHANGED; SACL VERIFICATION BLOCKED
Owner/group/content: UNCHANGED
SACL: NOT_VERIFIED — native error1314
Five file hashes: 5/5 MATCH
Native identities: 17/17 VERIFIED
Effective Authenticated Users write: BLOCKED — not removed
Parent namespace replacement risk: BLOCKED
Source lineage: PASS
Resource dependency ACL gate: BLOCKED
Active application source changed: NO
REV10 changed: NO
Private observer activated: NO
Website session4: NOT_EXECUTED
Edge launches: 0
PostgreSQL/API/Frontend: NOT_STARTED
MQTT: NOT_CONNECTED
Pump actions: 0
Automation enabled: NO
FINAL: SESSION4_ACL_REMEDIATION_BLOCKED
```

**STOP before the first ACL write.**
