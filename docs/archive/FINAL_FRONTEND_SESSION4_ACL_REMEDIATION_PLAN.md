# Session 4 — NTFS ACL remediation preparation

**SESSION4_ACL_REMEDIATION_READY_FOR_APPROVAL** — the exact Option A design, private before/after descriptors, dry-run and revised metadata candidates are ready for review. **ACL_REMEDIATION_NOT_APPLIED**. Actual resource authority remains BLOCKED_UNTRUSTED_WRITE. This verdict does not authorize activation or Website execution.

## 1. Scope and native collection

The user attachment authorizes read-only project inspection and staged preparation only (SHA256 cf1def4c16fe84bfcfe358f28e07be4505b0256570138191d24cffa63560ec1e). No old execution approval was reused. Current operator: S-1-5-21-1432835263-483988321-3159128977-1001.

Native collection used Get-Acl/GetAccessRules, Get-Item, Get-FileHash and held CreateFile handles opened with zero requested access and read/write/delete sharing. GetFileInformationByHandle supplies volume serial/file index/link count; GetFinalPathNameByHandle supplies canonical paths. Handles are disposed. The collector compares native identity and SDDL before/after each capture. It did not request WRITE_DAC, WRITE_OWNER, DELETE or file content write access.

Captured 17 unique paths: five files, eleven mutable ancestor directories, and C:\ as a read-only boundary. All five files have the exact approved SHA256 and a single link. All paths have canonical DACLs and no reparse/junction/symlink was found. File and non-root ancestor owner is the operator. C:\ remains owned by TrustedInstaller; no ownership change is proposed.

| Exact file | Stable volume:file-index | Actual SHA256 |
|---|---|---|
| C:\DATN\Project_datn\frontend\index.html | 9CF3D9FA:0016000000043CE7 | 1e49e388e9330af8cc1e16a73773603ff3f5da25d23fedfcd0ebd939c68d13b3 |
| C:\DATN\Project_datn\frontend\node_modules\vite\dist\node\chunks\config.js | 9CF3D9FA:00070000000B71E8 | c2fcfa51206dc1f8d22120ef4a82af8b9acdc02f4476520b6a0897d12a724ba3 |
| C:\DATN\Project_datn\frontend\public\favicon.svg | 9CF3D9FA:0025000000032114 | 0654e9c9d4fed9e1244875e901c80f3e8c66bb5b06cbbd97276c0dc689f55022 |
| C:\DATN\Project_datn\frontend\src\main.tsx | 9CF3D9FA:0013000000043DBD | 15d22597ed6216783c18850331538d72836ecca79649748b24400ff1d546c6b9 |
| C:\DATN\Project_datn\scripts\mvp-ui-only-frontend.mjs | 9CF3D9FA:000C0000000D48C4 | cecd399201fde662b701d0ce286d43f317ac22cfb53223683e66be2abda3cba9 |

All five file DACLs are currently unprotected/inherited. Each has Administrators FullControl, SYSTEM FullControl, Users ReadAndExecute, and Authenticated Users Modify. The captured rules have no DENY ACE. There is no Everyone write ACE and no additional untrusted write trustee in these captured chains. Full ACLs, ACE flags, trustee SIDs, original SDDL and owner are retained privately, not duplicated in the repository.

## 2. Parent permissions and replacement risk

The inheritance source is **C:\**: Authenticated Users has an explicit inherit-only generic ACE (mask 0xE0010000: generic read/write/execute plus DELETE) propagated to descendants. On each captured file/directory it produces effective Modify (1245631, 0x1301BF). C:\ itself also permits Authenticated Users CreateDirectories (4); its inherit-only ACE is not effective on C:\ itself.

Important distinction: effective Modify here includes DELETE (0x10000), WriteData/AddFile (2), AppendData/AddSubdirectory (4), WriteEA (16), WriteAttributes (256). It **does not include DELETE_CHILD (64), WRITE_DAC (0x40000) or WRITE_OWNER (0x80000)**. Those latter rights are held by the trusted SYSTEM/Administrators FullControl principals; the operator is the owner and receives explicit FullControl in the proposed descriptors.

An ordinary authenticated non-admin token matching Authenticated Users/Users has content-write and DELETE grants on the existing files. File-only hardening still leaves ancestor-directory DELETE/rename and namespace replacement paths: an untrusted actor can rename a writable ancestor, then substitute a new path under the writable parent. A hypothetical parent DELETE_CHILD also defeats child-file-only protection and is covered by tests, but **was not observed as an Authenticated Users grant in this capture**. Root C:\ has no observed untrusted DELETE_CHILD/WRITE_DAC/WRITE_OWNER; its CreateDirectories right alone cannot rename/delete a properly protected existing DATN directory.

Effective-access qualification: ordered DACL masks are evaluated for a modeled ordinary Authenticated Users+Users+Everyone token, and unknown untrusted allow-write trustees are conservatively rejected. This is not Windows AccessCheck against every local/domain user, nor a complete account/group/privilege inventory. Administrators, SYSTEM, the operator, malware running as them, owner override and privileged backup/restore semantics are outside the untrusted-user guarantee.

## 3. Selected option and exact target scope

**Option A — narrow per-object hardening**, proposed for **16 objects**, without recursion. All parents up to DATN are necessary to close ancestor rename paths. No change to C:\, any other directory, entire repository tree or whole node_modules is proposed.

| Captured path | Stable volume:file-index | Proposed treatment |
|---|---|---|
| C:\ | 9CF3D9FA:0005000000000005 | READ ONLY — unchanged boundary |
| C:\DATN | 9CF3D9FA:002A000000098CB0 | Proposed this-directory DACL change |
| C:\DATN\Project_datn | 9CF3D9FA:0056000000038D0C | Proposed this-directory DACL change |
| C:\DATN\Project_datn\frontend | 9CF3D9FA:0015000000042C33 | Proposed this-directory DACL change |
| C:\DATN\Project_datn\frontend\node_modules | 9CF3D9FA:00100000000ABA43 | Proposed this-directory DACL change |
| C:\DATN\Project_datn\frontend\node_modules\vite | 9CF3D9FA:000E0000000AC0DA | Proposed this-directory DACL change |
| C:\DATN\Project_datn\frontend\node_modules\vite\dist | 9CF3D9FA:00090000000B3E8E | Proposed this-directory DACL change |
| C:\DATN\Project_datn\frontend\node_modules\vite\dist\node | 9CF3D9FA:000B0000000B4132 | Proposed this-directory DACL change |
| C:\DATN\Project_datn\frontend\node_modules\vite\dist\node\chunks | 9CF3D9FA:00090000000B45D7 | Proposed this-directory DACL change |
| C:\DATN\Project_datn\frontend\public | 9CF3D9FA:00450000000320B4 | Proposed this-directory DACL change |
| C:\DATN\Project_datn\frontend\src | 9CF3D9FA:000F000000043D95 | Proposed this-directory DACL change |
| C:\DATN\Project_datn\scripts | 9CF3D9FA:005E00000000E0AB | Proposed this-directory DACL change |

Add the five files from section 1 to the eleven directory targets above. Changing the effective rights on C:\DATN is a real scope impact: other non-operator users lose create/rename/write rights on that directory itself. Operator/SYSTEM/Administrators retain access. The directory's existing inheritable permission payload is preserved to avoid blanket restriction of sibling projects or other descendants. Approval must explicitly include all sixteen paths; five-file approval alone is insufficient.

**Option B — protected runtime layout** was considered and is not selected. A copied favicon or five-file copy cannot prove that Vite reads the protected resolver, index, launcher, imports, package tree and entrypoint. Moving the runtime would need a reviewed resolved dependency closure, root/import/module resolution changes and a new source authority. No such copy/layout/runtime change was made. If the owner cannot approve changes to DATN itself, Option B requires a separate design; this plan must not be narrowed silently to the five files.

## 4. Exact before/after DACL design

Exact per-path original/proposed SDDL, owner, file identity and file hash are in private dry-run-02.private.json. Original snapshot SHA256: e0563d9d66829438929d69dd7051e377f1de9d508f8f83bf7af314a727c34397. Dry-run descriptor artifact SHA256: 9a70bec0cfe635025ccbbc7ddce196242af67758f918d06d02250b6bebaed161.

For each target file: protected DACL; inherited ACEs converted to explicit; remove only Authenticated Users effective Modify; retain SYSTEM and Administrators FullControl and Users ReadAndExecute; add operator FullControl, this file only. No DENY is added. Owner, group, content, file identity and SACL must remain unchanged.

For each target directory: protected DACL; convert inherited ACEs to explicit; remove only Authenticated Users effective Modify on **this directory**; preserve byte-equivalent inheritable ACE payloads (ignoring the inherited-source flag) for SYSTEM, Administrators, Users and Authenticated Users inherit-only generic rights; add operator FullControl **this directory only**, without inheritance. All sixteen exact path objects are independently protected; untrusted inherit-only rights remain effective on unprotected non-target children by design. C:\ is checked, never mutated.

Windows RawSecurityDescriptor/RawAcl are used in memory to construct proposals. DirectorySecurity/FileSecurity parsers confirm canonical/protected descriptors, unchanged owner, trusted FullControl and an exact inheritable-projection match. Original descriptors round-trip exactly. No project Set-Acl, icacls, SetFileSecurity, file replacement or security mutation was executed.

Operator Node/Vite read, execute, import and file update rights are preserved; npm updates can still replace files as operator. Any package update/reinstall, rename or recreated file invalidates pinned hash/identity/ACL assumptions and requires fresh review. The proposal protects only these exact dependency paths and their namespace chain; it is not a hardening claim for the entire source tree.

## 5. Dry-run transaction, application and rollback design

Private evidence directory: C:/Users/Acer Swift3/AppData/Local/SmartAgricultureAclReview/session4-20261107-01. The new private evidence base/run directories were created with operator+SYSTEM FullControl only and a protected DACL. Files inherit only those two trusted entries. No ACL on an existing project/production/parent folder was changed. Original SDDL was captured before any proposal computation. This is security metadata evidence, not a database or disk backup.

Dry-run script: build/session4-acl-review-20261107-1/dry-run.ps1, SHA256 **afcd348ea625ee7c1df8ce8d51e22bce48716dee3ac6e34d66289a57af92570b**. Companion native identity helper SHA256 7f1a74cc2b34fc63607bd484e82414c34958a65abea0280c3dc654b9dd414b8a. Collector SHA256 33850f1e6db17bfaa30fca818a0411c514dfeee2fed6e8b25716c7ffe50ddbf1. All three PowerShell ASTs parsed with zero errors and native exit0. dry-run.ps1 has no apply switch or project security-write path; a wrong original-evidence hash is refused. It reads only the fixed private snapshot, exact expected path set and current project metadata, builds descriptors in memory and writes a create-new private proposal result.

Final-byte invocation performed (exit0):

```powershell
& '.\build\session4-acl-review-20261107-1\dry-run.ps1' -OriginalEvidence 'C:/Users/Acer Swift3/AppData/Local/SmartAgricultureAclReview/session4-20261107-01/original-security.private.json' -OriginalSha256 'e0563d9d66829438929d69dd7051e377f1de9d508f8f83bf7af314a727c34397' -ResultName 'dry-run-02.private.json'
```

Result: 17 native metadata checks, 16 proposed targets, descriptor/inheritance/rollback checks PASS, **0 active ACL writes**. A first dry-run-01 result is preserved; the second invocation tests the final script's added exact original-hash pin. It is also dry-run only and uses a distinct create-new artifact. This command must not be rerun with an existing result name.

Future application requires a separately reviewed writer and explicit permission. Transaction requirements:

1. Rehash writer, dry-run/helper, private original and exact proposal independently of mutable plans; verify operator, owner, canonical paths, reparse absence, volume/file index/link count, all original SDDL and five hashes. Reject any drift and require a fresh plan, not a new caller-selected hash. Ensure no untrusted activity can race the operation; hold appropriately reviewed handles/exclusive mutation coordination. No real writer is supplied or authorized in this phase.
2. Create a new private journal with per-object BEFORE/AFTER and outcome. Apply exact DACL only, deepest files/directories first and DATN last; preserve owner/group/SACL/content/identity. No recursive reset or new inheritance grants. A multi-object ACL update is **not atomic**.
3. Independently read actual native metadata after each change and at completion. Validate all sixteen proposed DACLs, all seventeen identities, safe parent chains, content hashes, trusted access, and expected inheritance behavior of affected non-target descendants. DirectorySecurity parsing and inheritable payload equality here are not proof of actual Windows propagation after a future write.
4. Any error, unexpected automatic inheritance effect, identity change or incomplete postcheck => PARTIAL_STOP, never COMPLETE; preserve journal. Do not modify extra objects, delete/recreate a path or grant broad access to recover. No Website/activation follows a partial transaction.
5. Rollback design: only the same verified objects and journaled modifications; restore original DACL from the private snapshot, parent-first then children to reestablish original inheritance, with per-step verification. Do not set owner or overwrite data. Stop on identity/owner/parent drift. A rollback restores the original broad risk and cannot be called a successful remediation. SDDL round-trip is verified; real application/rollback and propagation are NOT_PERFORMED/NOT_VERIFIED. Any automatic rollback permission must be explicit in the future writer approval.

No UAC change, ownership takeover or Administrator elevation is requested for this preparation.

## 6. Focused tests and independent results

| Verification | Actual result | Native exit |
|---|---|---|
| Pure ACL model tests | 27/27 PASS | 0 |
| Revised metadata collector tests | 15/15 PASS | 0 |
| Read-only original native collection | 17 paths captured | 0 |
| Final-byte native dry-run | 16 proposals; no mutation | 0 |
| Revised metadata on actual five files | five unsafe chains correctly reported | 0 |
| Independent postcheck | all 17 original identities/ACLs and five hashes unchanged | 0 |
| Node syntax | four focused candidates/test modules PASS | 0 |
| PowerShell AST | three scripts; zero parser errors | 0 |

Total focused tests: **42/42 PASS**. metadata-tests.tap SHA256 23f2dbcc3444b3cd8c835e2ae3f51fb02b4d84dd26b8618c400909df95264828; acl-model-tests.tap SHA256 7c79ee74523d0a20e23aa009b3fdd70829dab70d46c0b901f01a33fb8d6a164d. There was no rerun of 417 earlier regressions. Native metadata tests execute the exact revised PowerShell collector with Get-Acl/Get-Item overridden by controlled in-memory Windows security descriptors, not real project ACLs. No synthetic descriptor is used as live authority. The actual Windows metadata invocation separately returned aclSafe=false for all five files, correctly keeping source proof blocked.

Tests cover generic-right mapping, untrusted direct/inherited writes, file DELETE, parent DELETE_CHILD, ancestor DELETE, WRITE_DAC/WRITE_OWNER, unknown trustees/owner, canonical/reparse/hash/hardlink/ID errors, trusted access preservation, partial outcomes, rollback modeling, fake approved metadata, and parent stamp drift. The actual candidate IO rejects ancestor identity/ctime drift after capture. Native receipt metadata and these mocks do not verify natural Edge graceful close.

One preparatory Node command was rejected by the PowerShell parser because of quoting, before it executed (exit1). It was replaced by extract-native.cjs, without changing evidence or any project state. No native access violation occurred in this task's collector/tests/dry-run. The report generator's command and all final native invocations have explicit completion checks.

## 7. Source integration consistency and required revision

The prior staged six replacements + one new helper, descriptor, hashes and diffs remain intact. The active parent descriptor matches 1bfd2e3431908fb3ab6f0bdc7cea487e6fb9650e6f7fca72477537b40745bd55; active REV10 remains 47e8072cdc0a711dd277c5468976b6deb0d297264b41b1ce83a02f6ebf72e3bb. Active sources still match their previously reviewed current hashes; the new helper/descriptor are absent from active locations.

A confirmed gap in the **unactivated** prior lineage-fs candidate is addressed by a separate revision: its ACL collector checked effective file rights but only reparse status on parents, and its identity stamp covered just the file. It did not prove namespace protection. Revised lineage-fs.parent-aware.cjs checks every ancestor's effective write/DELETE/DELETE_CHILD/DAC/owner exposure, skips inherit-only ACEs on the current object, maps Windows generic masks explicitly, and treats C:\ as the specified root boundary. Ancestor owner/SDDL form part of the ACL fingerprint; every ancestor native filesystem identity/ctime is included in the state stamp and canonical/reparse checks; multiple file links are denied. Unsafe parent metadata causes aclSafe=false, not a relaxed grant. Unknown access/control states remain fail-closed.

Only lineage-fs and the descriptor-binding anchor differ from the prior seven-file source proposal. The helper, policy, adapter, worker and strict verifier are byte-identical to those reviewed. No fresh resource grant, extra helper or plan-controlled authority is added. Future helper catalogue remains exactly 17. Favicon stays exact GET/HEAD http://127.0.0.1:55173/favicon.svg with no query/fragment/userinfo/aliases; proof flow, sensor ISO behavior, denied endpoints and controls are unchanged.

Revised proposal: build/session4-acl-review-20261107-1/revised-source-proposal.json (SHA256 7fa1bf808cc5420b30d0299ff4c55450c08a5f0a42c15f1385d04efa6e16ca34). Five unchanged source candidates continue to reference their exact earlier staging paths. New diffs compare final candidates to current active bytes.

| Future target | Current SHA256 | Revised proposal candidate SHA256 | Diff SHA256 |
|---|---|---|---|
| scripts/frontend-acceptance/resource-authority.cjs | NEW, absent active | 86726da11ac354eabd119d5f4d4aff7ad446ba871024693baa5ac3f8e1dc56d1 | 24706dc4959bd9bd0de51d3219f575c8e4b6340189c6f3ede09b2c8fbff4fa34 |
| scripts/frontend-acceptance/policy.cjs | 4e9c282e925f132832a4aa5e3b295b7c040da1b25d35e98a7d4d384d0d9c30e8 | 0af2e27e506e9b36ab2b87583078741484c74363e10bb625292795c12c04d089 | de05750a21bb4c5c7fd0ea2fa48372f2e4dcf4b1465aeef6446a5644a0e600ff |
| scripts/frontend-acceptance/adapter.cjs | 44c9f7dd5750dbe44e942e6baaf6923e037ec58754870c6bb52db798c9b0f7f4 | 09bb9755ec186ccfe22c5fc1b2cce20399edbb329a2c1a0c5ebd5cea0de54a16 | 3037e74423b4357df5beb0a8092fca6abe46593369eb6f1c77d75b02a678264a |
| scripts/frontend-acceptance/worker.cjs | b5430a2d7d1de0971424b613e0e1703e2e50485b222207e36677d3d5f0c7440c | 2701da9117a0155d0da6e4c64e7114d1cdb84e037c9df47d853d28da4d950e77 | 995de8c18fafce6fc16108fc4294cdf7012ee3f33c4ec93865581ae27b2455d1 |
| scripts/frontend-acceptance/strict-lineage.cjs | 2dc1300ac926e8a8348afacf569113531130b62f24a9d9499737796670a1043a | 91576a706a01d8cc92d2df940e78e1db6b8af56598bf9a9aff044e8cb5d4d27d | d1aab44cb43cf6a66199292b7d083954f112ec0e8ca14db613e925957e6d5ce7 |
| scripts/frontend-acceptance/lineage-fs.cjs | fab9d64c3235ea730b63a34ab6299dd3409e4d6be88d062ac7aa9bd429694f3b | 7e9212248d75deacd1489065cd465f59ca74c7e3fa8f36f987c525c51e242f6e | b9dccfd4e6a13ff130ec569101cd75d3ef9d6ff15ac787968748dbb5758a9ad7 |
| scripts/frontend-acceptance/lineage-anchor.cjs | a5c374167a55f824a2aeb791b6afbee2c97eda249912e063a713254e71cb814d | a650e6e0532684c00e0bdb68fe5b14757d89493c910ef63ceeb8557f09fc4541 | b2d8602cc89e430464c9591a5e54b6a4acf160dd4352a2bed2490ebe945b3b80 |

Revised descriptor candidate: build/session4-acl-review-20261107-1/FINAL_FRONTEND_EXACT_RESOURCE_INTEGRATION_PINS.revised.json, SHA256 **555d6dc81063f06abf59ab31b0dcfc560f57868735ab648c4bb91f195e233497**. Future target is unchanged; the active parent binding is unchanged. Prior descriptor ad3972349c784ec167d87907e53b5e6a4464fd728d909bf09e1ef83bd5ee1e5d is preserved, not silently overwritten.

The revised source/descriptor require a separate review and source activation approval. The previous 417 tests describe their original candidates; they are not relabeled as full regression evidence for this revision. This revision has 42 focused checks including the changed native metadata logic and actual chain-drift guard. Full staged regression can be required as part of subsequent source review if needed; none was repeated solely for count.

## 8. Observer and historical native error

The revised observer remains in its original staging location with SHA256 e1d045b452fb9790bfa74b9c27ca01149e1842d3fa201069e1f7743ea5fe0490. Its bytes/diff were not changed or copied. The source descriptor/anchor update necessitates a separate revised review-bundle file: build/session4-acl-review-20261107-1/EXACT_FUTURE_OBSERVER_REVIEW_BUNDLE.revised.json (SHA256 e19ea349bdc352ddc1cfef0cbacd509fd6dc1307840b5217d71a30a81c8e7a29); only descriptor/proposal/anchor references change. This file does not authorize observer installation or execution.

The historical read-only PowerShell invocation with 0xC0000005 is recorded in FINAL_FRONTEND_PRE_SESSION4_INTEGRATION.md. Available evidence identifies a source-reading invocation, while the subsequent dedicated metadata collector had a separate exit0 result. There is no retained faulting-module/PID evidence sufficient to connect that failure to the metadata collector; **causal relationship UNKNOWN**. Its emitted output remains unusable as native completion PASS. The failed command was not rerun. This task uses bounded read-only child invocations, checks native status/signal/error/stderr and stops on abnormal completion. No debugger, WER configuration or native stability claim was introduced.

## 9. Remaining authorization

- Review the exact sixteen-object DACL scope, especially DATN itself, and loss of untrusted this-directory write/rename rights while retaining inheritable payloads. Review private per-object before/after SDDL and rollback journal design.
- Separately authorize implementation/review of a narrow apply writer, then exact application/postverification/conditional rollback. This dry-run-only script cannot apply the change. Native propagation, actual permissions after mutation and actual rollback remain unverified until that approved operation.
- Separately approve revised source descriptor/anchor activation, with current source and runtime identity gates. Do not activate old metadata logic as if it checked parent access.
- Only after actual ACL/source/runtime gates pass can a fresh observer installation and one-shot Website session be approved. Historical approvals stay consumed. Do not assume this plan alone fixes full runtime or private-directory trust gates.

## 10. Final state

SESSION4_ACL_REMEDIATION_READY_FOR_APPROVAL

ACTUAL_ACL_REMEDIATION_NOT_APPLIED; ACTUAL_RESOURCE_AUTHORITY_BLOCKED_UNTRUSTED_WRITE; MODELED_SAFE_ACL_PASS; ACTIVE_SOURCE_AND_REV10_UNCHANGED; OBSERVER_NOT_COPIED_OR_EXECUTED; WEBSITE_SESSION4_NOT_EXECUTED.

No PostgreSQL/API/Frontend/Edge/MQTT startup or connection, DeviceCommand, Automation, ON/OFF, migration/seed/restore, firmware or physical pump action occurred. Current production flags/PENDING were not queried and are not claimed freshly verified. Historical UNKNOWN_DENIED_GET and natural Edge graceful close remain UNKNOWN/NOT_VERIFIED; SOIL_SENSOR_QUALITY_BLOCKED remains unchanged.

**STOP after preparation.**
