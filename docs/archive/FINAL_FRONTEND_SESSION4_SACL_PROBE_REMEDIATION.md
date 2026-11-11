# Session 4 — Offline SACL probe diagnostics remediation

**OFFLINE_DIAGNOSTIC_CANDIDATE_PREPARED**. A descriptor-mask contract defect is confirmed. Evidence ownership failure is confirmed. Original probe remains unchanged; candidate was never executed against a token/filesystem capture. No privileged execution, ACL/owner modification, source activation or Website session occurred.

## A. Original evidence and precise line73 diagnosis

Original probe: build/session4-sacl-readiness-20261107-1/sacl-readonly.ps1, SHA256 **0f5fa3304bbb6a6202299128aaac2864d384d91cef6f9c562198a41475c2b850**.

Reviewed operator evidence: C:/Users/Acer Swift3/AppData/Local/SmartAgricultureAclReview/session4-20261107-01/sacl-readonly-1e8aa709965b485a8b6152e2f18ff5db.private.json, SHA256 **1eaccc2d63fbf1fde0a33d264359c9b1c1a354f9dbfa296c0667e55e17ed441d**. It records PRESENT_DISABLED before/after, elevated=1, elevationType=2, temporary enable0, restore0, accepted captures0, generic IDENTITY_OR_ORIGINAL_DESCRIPTOR_DRIFT. Those are historical operator-run facts, not a privileged operation by the Agent in this task.

The original line73 joins five conditions with OR. Its catch/evidence retained no failed-field flags and no actual rejected Capture. Therefore that historical run cannot establish canonical/fileID/link/reparse matches or which combination failed. There is no basis to silently normalize an identity or classify it as harmless.

**Confirmed source defect: numeric mask7 crosses two different flag domains.**

| API domain | Values | Meaning of7 |
|---|---|---|
| .NET AccessControlSections | Audit1, Access2, Owner4, Group8 | Owner + DACL + Audit; excludes Group |
| Win32 SECURITY_INFORMATION | OWNER1, GROUP2, DACL4, SACL8 | Owner + Group + DACL |

The pinned original collector calls GetSecurityDescriptorSddlForm((AccessControlSections)7). The native C# Read calls GetSecurityInfo(...,15) then Sddl(sd,7), whose7 is the Win32 domain. The field called OwnerGroupDacl therefore contains Group, while the original snapshot does not. Get-Acl without -Audit also did not retrieve an actual SACL for the old snapshot. Identical numeric masks do not describe identical recorded fields.

Read-only verification on all17 current objects, using ordinary Get-Acl only:

- Original managed-mask7 output matches pinned snapshot: **17/17 EXACT**.
- Managed Owner|Access (6) also matches original: **17/17 EXACT**.
- Parsed snapshot Group fields present: **0/17**.
- Current Get-Acl output using Owner|Group|Access (14) has Group present: **17/17**.
- Comparing those full O/G/D descriptors to the old O/D snapshot with the reviewed parser gives **DIFFERENT**, not representation-equivalent.

Thus OWNER_GROUP_DACL_MISMATCH is a confirmed **comparison-contract problem**, specifically omitted baseline Group versus included native Group. The historical failure's exact set of predicates is still **NOT_RECORDED**; another identity mismatch in that run cannot be excluded. No native elevated Read was repeated to manufacture those missing facts. Earlier reports describing managed-mask7 as owner/group/DACL evidence overstated coverage: they verified the mask7 owner/access portions, not an original Group baseline.

## B. Diagnostic candidate and comparison behavior

Candidate: build/session4-sacl-probe-remediation-20261107-1/sacl-readonly.final-candidate.ps1.

SHA256: **f3dc59c7fdfb6c0a37b931b0a973f1d67433d7b0f92c99a59bde6cc3e34a563d**.

Unified diff: build/session4-sacl-probe-remediation-20261107-1/sacl-readonly.final-candidate.ps1.patch, SHA256 **49adb879f69be9a132c407a5190baf3f60915affa8be6aa823fdf30068bb8299**.

The final candidate embeds the reviewed memory-only functions from build/session4-sacl-probe-remediation-20261107-1/diagnostic-functions.ps1. Its console diagnostic contains only rowIndex, accepted boolean, flags, representation status and Group-field-presence booleans. No raw SDDL/SACL, native fileID, canonical value or affected path is added to console diagnostics.

It separately evaluates CANONICAL_MISMATCH, FILE_ID_MISMATCH, LINK_COUNT_MISMATCH, REPARSE_DETECTED, OWNER_GROUP_DACL_MISMATCH and METADATA_UNKNOWN. String identity comparisons are ordinal, without case folding, path normalization, fileID substitution or relaxed link checks. Every failing flag is retained, not just the first. Missing properties/invalid descriptors are rejected. The native-read attempt/success counts are separated from accepted captures. Exceptions retain a safe category, native error when available and row index instead of raw exception text. The reviewed C# query additionally records TokenOwner SID/error for future attribution of default-owner behavior.

**Strict descriptor acceptance is not relaxed.** Compare-DescriptorRepresentation uses .NET RawSecurityDescriptor to parse independently of the native GetSecurityInfo/ConvertSecurityDescriptorToStringSecurityDescriptor path. It compares complete binary self-relative descriptors; it does not sort ACEs, ignore flags/owner/group, map generic rights or drop fields. SID aliases such as BA versus S-1-5-32-544 are demonstrated binary-equivalent, including variants of all17 real pinned snapshot SDDLs. That is parser evidence, not proof that the rejected native descriptor differed only in representation. Even BINARY_EQUIVALENT textual variants retain OWNER_GROUP_DACL_MISMATCH under the unchanged strict string gate.

Missing baseline Group is now explicitly METADATA_UNKNOWN; two equally absent Group fields cannot turn into verified Group. The candidate is diagnostic and intentionally remains fail-closed with the existing incomplete snapshot contract. It is **not** a patch that silently accepts owner/DACL-only equality as verification of owner/group/DACL.

A later reviewed comparison-contract fix should use named enums, preserve the old immutable snapshot, compare only fields actually recorded there, and separately capture/pin missing Group and SACL metadata in a new approved baseline. The new fields cannot be retroactively claimed equal to data absent from the old baseline. No such baseline or comparison-gate change was applied here.

## C. Elevated evidence ownership

Read-only inspection confirms the historical output file has owner **S-1-5-32-544 / Administrators**, with exactly operator and SYSTEM FullControl Allow ACEs. The parent remains the protected operator+SYSTEM directory. This is distinct from evidence-data exposure through an extra Allow ACE: the file fails because the probe pins operator ownership. Administrators ownership may allow a group member to change the DACL; it cannot simply be accepted because existing Allow entries are narrow.

The old creation path is File.Open(CreateNew,Write,None) with no explicit creation security descriptor. Parent DACL inheritance does not assert owner=operator. A newly created object may receive the elevated token's default owner rather than the token user. This explains why owner selection and inherited DACL can diverge. The elevated token's TokenOwner was not captured in that old record, so the **specific default-owner attribution is SUPPORTED, not independently recorded**. The immediate OUTPUT_ACL_REFUSED cause—actual Administrators owner versus required operator—is CONFIRMED.

Proposed narrow contract for future new evidence only:

1. Build a FileSecurity descriptor in memory with explicit owner=the exact operator, protected canonical DACL, and exactly two non-inherited FullControl Allow entries for operator and SYSTEM.
2. Pass that descriptor to the .NET Framework FileStream CREATE_NEW overload at object creation. No open-existing, overwrite, owner-repair, Set-Acl/SetSecurityInfo/WRITE_OWNER call is introduced. Name collision refuses creation.
3. Verify actual owner, protected canonical DACL, exact two ACEs and no reparse immediately after creation, while the exclusive stream is held, **before writing any diagnostic/SACL bytes**. Verify again after close. If creation/verification fails, stop and preserve the empty/private artifact; do not repair owner, broaden rights or reuse an old file.

FileSecurity.SetOwner/SetAccessRuleProtection in this candidate operate on an in-memory creation descriptor, not an existing file. This is preparation for new-file creation security, not an existing-object mutation permission. The FileStream constructor overload exists in the installed Windows PowerShell/.NET environment, and memory descriptor tests pass. **Actual explicit-owner file creation under an elevated token is NOT_VERIFIED and was not executed here.** It may still fail; the owner check stays mandatory. No existing file, including the Administrators-owned evidence, was changed.

## D. Tests and native completion

Final focused suite: **12/12 top-level tests PASS**, Node native exit0; TAP SHA256 08d100ef9741c9908f1ca6b0915c7c50be2b3cfb69230aee34e59324916fb25a. PowerShell child status/signal/error/stderr are checked explicitly by the harness. No timeout or nonzero completion is changed to PASS.

The memory-only tests cover each mismatch independently, exact matching descriptors/identity, missing fields, no canonical normalization, SID-alias binary equivalence, true permission differences, missing baseline Group, owner/ACE/protection rejection, FileStream constructor availability, C# compilation/classifier, privilege enable/restore error gates, unknown native completion, partial capture, static absence of existing-security mutation/elevation APIs, reparse rejection checks, redacted console diagnostics and original probe/snapshot hash preservation. The actual17-row descriptor-scope test uses Get-Acl without -Audit; it performs no SACL read or privilege adjustment.

PowerShell AST for final candidate: zero errors, host exit0. Node syntax and independent source checks completed without changing sources. Native C# Read, Query, EnableExisting and Restore are **not invoked** by these compilation/classification tests. Real privilege enable/restore and elevated output creation remain historical/not newly verified as appropriate. The candidate's whole main script is never run or dot-sourced by tests.

Intermediate evidence is retained: the initial generator stopped on an exact-anchor assertion before writing a candidate, caused by JavaScript replacement-string dollar expansion; a replacement callback fixed the generator. An initial focused run was6/7 PASS (exit1): a draft semantic parser incorrectly required a Group field in the old snapshot, exposing the actual missing-Group contract. The parser now represents missing Group faithfully in diagnostic binary comparison, while acceptance explicitly rejects missing Group baseline as unknown. Initial candidates/logs and subsequent7/7 and12/12 outputs remain in staging; only focused tests were rerun after final changes.

## E. Integrity and safety

Original snapshot SHA256 remains e0563d9d66829438929d69dd7051e377f1de9d508f8f83bf7af314a727c34397. Active probe hash remains0f5fa3304bbb6a6202299128aaac2864d384d91cef6f9c562198a41475c2b850. Both historical evidence files were preserved.

Installed source-lineage: APPROVED_DELTA_VALID; baseline250 =248 unchanged+2 authorized historical replacements; active helpers16; independent source/runtime/test/authority hashes **288/288 MATCH**. REV10 and source descriptors unchanged. No activated candidate or observer copy.

No elevated process was launched, current privilege adjusted, SACL captured, filesystem owner/security changed, source activated, service started, MQTT connected, DeviceCommand created, Website/browser run or pump/Automation triggered. Only staged code/tests/diffs and this report were written. The future explicit-owner creation code was inspected and tested in memory, never executed against a filesystem path.

## F. Safe operator handoff and remaining conditions

**Do not run this candidate now.** The current task authorizes offline preparation only, and the baseline-Group contract remains a known blocker. A candidate run is not required to rediscover the confirmed enum-domain defect.

Before a separately authorized read-only diagnostic: review the final hash/diff and proposed new-evidence creation-security contract; establish how missing Group is to be captured in separately pinned new evidence without overwriting the original; verify the exact operator, token privilege and final-byte source hashes. If a diagnostic-only run is explicitly chosen despite the known baseline gap, its expected outcome remains fail-closed with safe row flags. Do not present it as a17/17 acceptance attempt.

Under a **fresh appropriate read-only authorization**, the operator may manually open the approved Windows PowerShell context, verify the candidate SHA256, and invoke a child with -NoProfile -NonInteractive -File pointing to the staged candidate, -CaptureSacl and -EnableExistingPrivilege. Capture the child native exit with LASTEXITCODE (or an independently reviewed native runner). Existing-only temporary enable must restore successfully; no new privilege assignment, owner repair or automatic retry. Share only safe flags, summary/native exit and private evidence path, never raw SACL/SDDL. Do not use the original active script or overwrite evidence to bypass a failed check.

Remaining: historical exact identity flags unrecorded; missing original Group baseline; actual corrected-field comparison policy not yet approved; real explicit-owner evidence creation under elevated context not verified; zero newly accepted SACL captures; full ACL writer/race/propagation review still blocked. This preparation provides diagnostic precision, not SACL capability or ACL remediation acceptance.

**STOP — offline preparation complete; no privileged/live execution.**
