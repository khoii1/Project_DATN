# Session 4 — Edge binary drift and integrity gate review

**EDGE_DRIFT_INCONCLUSIVE_BLOCKED**. Current executable identity and offline Authenticode publisher checks are consistent with Microsoft Edge157.0.4341.42. Exact provenance of the replacement is **PROVENANCE_NOT_ESTABLISHED**; no new pin or execution authority is approved. Global integrity remains **287/288 MATCH / BLOCKED**. A separate Group-only authority is recommended for review as the narrower way to unblock read-only metadata work.

## 1. Current Edge identity

| Field | Observed |
|---|---|
| Absolute path | C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe |
| Canonical native path | \\?\C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe |
| Original expected SHA256 | d35d48b11f0439eeeddbbff0bf54856e922f5e1506a2f3098b5a808fcec4068b |
| Independently observed SHA256 | **d258e512aa24947cfbef0c0033d8c3cd56ecb40f7b2ad59802fa75c4e4f3324d** |
| Size | 5073736 bytes |
| FileVersion / ProductVersion | 157.0.4341.42 / 157.0.4341.42 |
| PE OriginalFilename | msedge.exe |
| PE ProductName | Microsoft Edge |
| Windows volume:file index | 9CF3D9FA:000B000000196BBC |
| Link count | 1 |
| File last-write UTC | 2026-11-05T07:28:59.1773261Z — metadata only, not an installation proof |

The file exists, is a regular file and has no observed reparse point. All inspected ancestors through C:\ also show no reparse point. Native identity before/after metadata collection matches. Separate SHA256 reads before/after signature inspection and the final288-file audit agree with the same d258... value. No Edge launch or updater/installer command was used.

File owner is SYSTEM. Application/Microsoft ancestors are owned by Administrators, Program Files(x86)/root by TrustedInstaller. Conservative inspection of effective Allow masks found no untrusted write/DELETE/WRITE_DAC/WRITE_OWNER grant on the binary or inspected non-root ancestors, and no untrusted root DELETE_CHILD/DAC/owner bypass. Inherit-only ACEs were distinguished from current-object grants, including generic rights. Administrators/SYSTEM/TrustedInstaller can legitimately replace these objects; this is not proof against privileged compromise or an exhaustive AccessCheck for every token. No raw SDDL/security descriptor was printed.

## 2. Offline Authenticode

**SIGNATURE_VALID under the specified offline trust policy**. WinVerifyTrust returned **0 /0x00000000**. The helper explicitly uses WTD_CACHE_ONLY_URL_RETRIEVAL0x1000 and WTD_REVOCATION_CHECK_NONE0x10, WTD_UI_NONE, and closes trust state. No URL retrieval, chain download or online revocation check is authorized or requested. Get-AuthenticodeSignature was deliberately not used because its network behavior was not bounded here.

- Signer: CN=Microsoft Corporation, O=Microsoft Corporation, L=Redmond, S=Washington, C=US.
- Issuer: CN=Microsoft Code Signing PCA 2024, O=Microsoft Corporation, C=US.
- Signer certificate thumbprint: 4028CAD637509D4744B17EC5B42AED8D7A31E6AF.
- Certificate validity: 2026-04-16T19:00:11.0000000Z to 2027-04-15T19:00:11.0000000Z.
- Signature-helper invocation: exit0. This is native trust verification support for publisher/content, not adoption of a source pin.
- Fresh revocation status, an independently reviewed full certificate-chain inventory and assurance against compromised local trust configuration are **NOT_VERIFIED**. Offline validity is not a claim of current online revocation clearance.

Timestamp extraction was attempted locally from the PE certificate table/SignedCms. That separate invocation emitted an RFC3161 attribute and timestamp claim20261105072651.291Z, then the tool reported **-1073741819 /0xC0000005**. Its exact parent/child failure boundary was not independently identified. The timestamp claim is **NOT_COMPLETION_VERIFIED / NOT_SEPARATELY_TRUST_VERIFIED** and is not used as evidence of a successful diagnostic or a replacement time. The helper was not retried. Independent WinVerifyTrust exit0 remains a separate recorded result. No native-execution repair, debugger or WER configuration was attempted.

## 3. Installed version and provenance

Read-only registry values agree with the PE version:

- HKLM WOW6432Node EdgeUpdate Clients stable registration: Microsoft Edge157.0.4341.42, location matches the inspected Application directory.
- HKCU Edge BLBeacon:157.0.4341.42.

The existing MicrosoftEdgeUpdate.log was read locally; the filtered read covered12,857 lines in that snapshot. Version-specific entries mention old156.0.4314.58 and new157.0.4341.42. Safely extracted line references include12537 onward and12839/12850/12851, with local log text around11/08/26 09:23–09:32. These are raw local-log timestamp strings, not independently attested UTC installation times. Only versions, tag categories and line numbers were emitted; raw updater messages, URLs, identifiers or command lines were not disclosed.

The bounded Application-log search (since2026-11-01, up to1,000 events, matching Edge/MsiInstaller records) returned no matching records. This is not proof that no relevant event exists outside that window/query. No source authenticated installer receipt, old-to-new file hash association, replacement PID/actor, or cryptographically bound installation time was obtained. Version tags in updater logs do not by themselves establish that the exact current executable was installed by that operation. Log authentication/integrity was not established.

**PROVENANCE_NOT_ESTABLISHED.** Observations support an ordinary Microsoft version transition as a hypothesis, but do not prove who/when/why the binary was replaced. No unexpected product/signer/canonical/reparse identity was observed. Lack of provenance is not labeled malicious replacement, nor converted into approved provenance. File timestamp and signature publisher alone are insufficient.

The first provenance-reader invocation exited1 because its variable name collided with PowerShell's automatic Matches variable. The reader was corrected to use versionRows; the bounded read then exited0. Failure output is retained, not treated as a successful audit or a security-gate bypass.

## 4. Full integrity authority remains blocked

The immutable lifecycle supplement b3b51b7a... contains browserBinaryHashes for Edge and Playwright sources. strict-lineage.cjs compares the plan against this exact catalogue (line83) and checks actual browser binaries (line89). The installed worker verifies the Edge pin, establishes the native spawn observer, and launches Edge through Playwright in its browser acceptance path (worker lines6/24/35). Thus the Edge pin has a real Website/browser purpose.

The current complete independent inventory is **287/288**, exactly one mismatch: msedge.exe. All other expected entries match. The old d35d... expected value remains intact in the original supplement, global manifest, parent authority and staged expected catalogue. Expected global hash data was not replaced with observed values. The known-blocked strict preflight was not retried; this task used permitted independent hash inventory, not another acceptance attempt.

GLOBAL SOURCE-LINEAGE: **BLOCKED**. This report does not use SOURCE_LINEAGE_PASS or288/288. Existing focused26/26 evidence and reviewed source hashes remain intact; no old test outcome is rewritten as a current browser/native acceptance result.

## 5. Group collector dependency analysis

Actual group-collector.final-candidate.ps1 executes PowerShell metadata/file/hash operations, imports group-functions.ps1 and group-native.ps1, and the pinned native-identity-readonly.ps1. Those helpers use .NET FileSecurity/RawSecurityDescriptor/SHA256/FileStream and kernel32/advapi32 token/file identity reads. Group-native queries TOKEN_QUERY/elevation only. New evidence creation uses explicit operator-owned protected CREATE_NEW security. No browser/Playwright/MQTT/database import, executable launch or network operation is present in that Group capture flow.

The collector still loops through the **entire** pinned288-entry expected-source-pins.json before metadata collection. That is why Edge blocks it: Edge is a global gate input, **not a runtime dependency loaded/executed by Group collection**. The current collector cannot be used under a Group-only contract unchanged; a new separately reviewed collector revision/guard is required.

Direct/indirect dependencies requiring review include:

- Fixed original snapshot and exact17-path identity binding; original owner/DACL and five file hashes.
- Exact collector/helper bytes, authority/catalogue bytes and any independent verifier/launcher introduced later.
- Windows PowerShell.exe, System.Management.Automation, Security/Management/Utility modules and manifests; importantly Get-FileHash is a script in Microsoft.PowerShell.Utility.psm1, not just a compiled cmdlet.
- .NET CLR/mscorlib, CodeDOM/Add-Type compiler csc.exe, and kernel32/advapi32/native OS loader/servicing trust.
- Explicit module resolution, startup environment and compiler TEMP directory. NoProfile alone is insufficient against injected PSModulePath, CLR profiling/startup configuration or mutable helper/import resolution.

Read-only runtime-dependencies.ps1 records actual local module/assembly/compiler paths and hashes in runtime-dependencies-receipt.json. They are **observed candidates, not approved pins**. This inventory is not a complete transitive Windows DLL closure or proof of a closed environment. A Group-only implementation must review its trust boundary, prevent unexpected imports/child executables/network, and retain a clear trusted-Windows servicing assumption; it cannot claim that every OS dependency is now independently authorized merely because it was listed.

## 6. Option A — Separate reviewed Edge re-pin

Artifact: build/session4-edge-integrity-review-20261108-1/option-a-edge-overlay.proposal.json, SHA256 98d637269c9191459b61402ee69c12b281bed0645467318b3229a55e74658e26.

It proposes one exact observed candidate pair, old d35d... to d258..., preserving the original immutable supplement and parent descriptor1bfd2e3431908fb3ab6f0bdc7cea487e6fb9650e6f7fca72477537b40745bd55. Version/signature observations and unresolved provenance accompany it. **repinReady=false; NOT_APPROVED_NOT_IMPLEMENTED**. Under the requested requirement for adequate provenance, this option is currently blocked for execution, not offered as a justified silent acceptance.

A future authorized change needs a versioned overlay and externally fixed validator/bootstrap authority, exact old/new pairs, tests rejecting all other binary replacement/plan repin, and review of browser/launch/approval references. Editing immutable historical pins in place or accepting a new execution-plan hash is prohibited. Blast radius is global/browser trust: a newly signed browser version can still change launch behavior or compatibility with installed Playwright; those are NOT_VERIFIED by static metadata. No browser capability retry or Website session is authorized here.

## 7. Option B — Separate Group-only read-only authority

Recommended **for design review**, not activation: **SESSION4_GROUP_READONLY_AUTHORITY_V1_CANDIDATE**.

Artifact: build/session4-edge-integrity-review-20261108-1/option-b-group-only-authority.proposal.json, SHA256 e921fe20b0f8c498bdd748b264bb5d849cf6abb9fdebb5dfce893cba4bce39c9.

This names an independent policy for exactly17 original-bound objects, ordinary token and approved operator SID, no network, no SACL/ACL mutation, strict canonical/native identity/link/reparse/type checks, unchanged original owner/DACL and five file hashes, plus protected operator/SYSTEM CREATE_NEW output. Original snapshot SHA remains e0563d9d66829438929d69dd7051e377f1de9d508f8f83bf7af314a727c34397. The artifact records current reviewed collector/helper starting-point hashes and observed runtime candidates, not a new operative grant.

Required source revision would replace only the Group collector's global-catalogue prerequisite with an exact separately anchored Group-only guard; keep global authority untouched and blocked. Review explicit runtime/module/compiler/environment dependencies and independent verification before any valid proof. The independent verifier is currently a binding/design stub and must be completed, tested and pinned. No executable Group proof is issued by this task: review-policy.cjs rejects all execution, including approved:true objects. Its positive design-review result explicitly says activated=false/proofIssued=false.

The Group-only outcome must have a distinct result type and may never be used as global lineage, browser, Website, elevated SACL or ACL-writer authorization. It must not print288/288 or upgrade the global state. If its own binding, identity, source/runtime integrity or output-security checks cannot be proved, stop. Original Group would still be NEWLY_CAPTURED_SUPPLEMENTAL_BASELINE, not historical Group unchanged.

Benefits: reduces unrelated browser-update coupling for a metadata-only operation. Risks: duplicate/underspecified authority, missing runtime/module dependencies, confused proof consumers or mutable plan repin. Mitigation: exact named scope, explicit independent approval, fixed source/runtime hashes, deny-only unbound draft, no fallback and caller/result separation. No separate policy is activated and no collector patch is applied in this review.

## 8. Offline validation and native outcomes

**25/25 tests PASS**, Node runner exit0; review-tests.tap SHA256 117f8b82c66b23cca47027e52ad04982e604f2dcdea5efd65d87329c67c6313f. Tests distinguish valid offline publisher observations from pin/provenance approval; reject unknown/invalid signatures, wrong signer/product/filename/hash/reparse/native completion; retain287/288 and old pin; retain PROVENANCE_NOT_ESTABLISHED; reject scope expansion, arbitrary approved:true/execution calls, missing activation and all browser/SACL/ACL/Website/MQTT/pump/Automation use of Group-only design. Existing26-test evidence and its staged sources remain unmodified. They were not rerun merely to repeat an old result.

Actual read-only command receipts:

| Invocation | Tool completion | Meaning |
|---|---|---|
| signature-offline.ps1 |0; WinVerifyTrust0 | offline cached signature valid; not provenance approval |
| file-metadata.ps1 |0 | version/hash/native identity/reparse/ACL metadata observed |
| provenance-readonly.ps1 first |1 | parsing bug; not PASS |
| corrected provenance-readonly.ps1 |0 | bounded filtered logs/events read |
| timestamp-offline.ps1 | -1073741819 /0xC0000005 | emitted timestamp not completion-verified; not retried |
| runtime-dependencies.ps1 |0 | observed module/runtime paths/hashes only |
| ordinary-token query |0; native query0 | elevated0, TokenElevationTypeLimited3, exact operator |
| independent proposal/hash review |0 | still287/288, no pin change |
| focused test runner |0 |25/25 offline tests |

The process boundary of the timestamp abnormal tool completion is unknown; no synthetic test or JSON output is used to replace that missing native completion. Five PowerShell scripts parse with zero AST errors; Node syntax checks apply to review helpers. These tests are review controls, not an actual browser execution, Group capture or provenance proof.

## 9. Artifacts and hashes

New review proposals have no active-code diff: they are separate JSON design artifacts, not applied patches. Old source/pin files remain byte-identical; no staged collector or global validator was rewritten in this task. Exact review files:

| File | SHA256 |
|---|---|
| build/session4-edge-integrity-review-20261108-1/signature-offline.ps1 | 8dd08d0e0062e527c713729fd1cfcea788a72b96aa61d13de49cd7c645d88d45 |
| build/session4-edge-integrity-review-20261108-1/file-metadata.ps1 | e5fe8aa34d38a95dbb73ce3a33fad9f4d7ff32c2d83dd7d7d8a68469a53d8763 |
| build/session4-edge-integrity-review-20261108-1/provenance-readonly.ps1 | a037eaa1f3acedd37a5916a14cb828d87dfe9b3096c458b21c7f6391346e6f2d |
| build/session4-edge-integrity-review-20261108-1/timestamp-offline.ps1 | c73229a7e9865a540c7a248afe71c6863d05ad77b5ecc07c8c4cc0b366d09a0b |
| build/session4-edge-integrity-review-20261108-1/runtime-dependencies.ps1 | a7fafeae209763fec3037696862d2db6b1a5c91c12b6654e2bd165e58a2d304c |
| build/session4-edge-integrity-review-20261108-1/review-policy.cjs | ff80cc1f0994edc4b059ee6ce9442ab9e510ac8d872f18a8df5074ac494cdbd8 |
| build/session4-edge-integrity-review-20261108-1/option-a-edge-overlay.proposal.json | 98d637269c9191459b61402ee69c12b281bed0645467318b3229a55e74658e26 |
| build/session4-edge-integrity-review-20261108-1/option-b-group-only-authority.proposal.json | e921fe20b0f8c498bdd748b264bb5d849cf6abb9fdebb5dfce893cba4bce39c9 |

Receipts retain redacted output and completion metadata. No raw updater messages, credentials or full security descriptors are saved to this report. Binary size/version/file identity and public signing-certificate data are review metadata.

## 10. Next explicitly authorized step

Choose/review the separately named **Group-only scope and its source/runtime boundary**, then explicitly authorize offline implementation and review of its exact guard/collector/independent-verifier revision. Activation or actual Group capture must wait for bound final hashes and a genuine separate authorization. This is the smallest proposed route that does not pretend a browser-pin issue was resolved. It does not authorize privileged SACL or ACL operations.

Alternatively, continue evidence review for a versioned Edge overlay and explicitly decide its provenance/trust requirements before any global re-pin. Current Option A is not ready for automatic acceptance.

Final: **EDGE_DRIFT_INCONCLUSIVE_BLOCKED**. Offline signature validity and matching product/version support Microsoft publisher identity; exact replacement provenance remains unknown. Global integrity stays287/288 BLOCKED. No pins, active source/REV10, ACL/owner, executable or Windows configuration changed. No administrator context, Edge/updater/installer, Group collector, SACL probe, ACL writer, Website/session4, backend/frontend/database/MQTT/DeviceCommand/Automation/pump action was started. STOP after review.
