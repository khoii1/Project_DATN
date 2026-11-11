# Session 4 — Supplemental Group baseline preparation

**SESSION4_GROUP_BASELINE_BLOCKED**. Offline collector/comparison preparation is complete, but actual capture preconditions failed: the installed Edge executable hash differs from the pinned source-lineage catalogue. No supplemental Group file or independent capture receipt was created. No source pin was changed to bypass this gate.

## 1. Original defect and scope

The original managed AccessControlSections mask7 includes Owner4 + Access2 + Audit1 and excludes Group8. The native Win32 SECURITY_INFORMATION mask7 includes Owner1 + Group2 + DACL4. The immutable original snapshot therefore records owner/DACL, not an historical Group baseline or an actual SACL read. This known contract defect is preserved in the new comparison design rather than papered over by dropping Group.

Original snapshot: C:/Users/Acer Swift3/AppData/Local/SmartAgricultureAclReview/session4-20261107-01/original-security.private.json, SHA256 e0563d9d66829438929d69dd7051e377f1de9d508f8f83bf7af314a727c34397. Reviewed diagnostic candidate build/session4-sacl-probe-remediation-20261107-1/sacl-readonly.final-candidate.ps1, SHA256 f3dc59c7fdfb6c0a37b931b0a973f1d67433d7b0f92c99a59bde6cc3e34a563d. Both still match, unmodified. Read-only parsing of the original confirms17/17 rows have no Group. That is not a new native Group capture.

## 2. Actual source preflight blocker

Existing strict source verification returned SOURCE_LINEAGE_BLOCKED:BINARY_OR_TEST_DRIFT; its tool invocation exited1. Independent read-only hash inventory completed with exit0 and isolated **one** mismatch in288 entries:

| Artifact | Expected immutable pin | Actual observed hash |
|---|---|---|
| C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe | d35d48b11f0439eeeddbbff0bf54856e922f5e1506a2f3098b5a808fcec4068b | d258e512aa24947cfbef0c0033d8c3cd56ecb40f7b2ad59802fa75c4e4f3324d |

**287/288 MATCH**. Source code, manifest and other catalogued entries match their expected hashes. The full strict source-lineage result is BLOCKED, not APPROVED_DELTA_VALID. Cause of the executable change is not established; no Edge process, installer, repair or version fallback was run. A browser auto-update is a possible explanation, not a conclusion from a hash alone.

Group metadata itself does not require a browser. However, the requested original-source-integrity precondition and existing complete authority catalogue include this executable. The Agent did not unilaterally exclude it, substitute its new hash or reclassify failed verification as PASS. The capture stopped **before** invoking the collector or reading new Group metadata for this baseline. source-proof.cjs produced no successful source-proof.json. source-inventory.json and expected-source-pins.json retain the original expected hashes; the latter SHA256 is 1f4f4c0678bef4594fbddc8e9e36a5b65ffb05249d328348cb71af732fb15507.

## 3. Prepared ordinary-user collector

Collector: build/session4-group-baseline-20261108-1/group-collector.final-candidate.ps1.

It has no caller-supplied target or expected-hash arguments. The exact path set is the five approved files and their eleven ancestor directories plus root C:\, exactly17. It verifies the pinned original snapshot, exact source catalogue, pinned helper hashes and same operator SID, then queries ordinary-token elevation via TOKEN_QUERY only. An elevated token or an unknown token API result is refused. No privilege adjustment, SACL request, ownership takeover or existing-security setter is present in the collector/native helpers.

It reads .NET descriptors using named Owner|Group|Access flags (14), and compares old fields using named Owner|Access (6). Native canonical path, Windows volume/file index and links use the unchanged reviewed read-only identity helper SHA2567f1a74cc2b34fc63607bd484e82414c34958a65abea0280c3dc654b9dd414b8a. Every row checks original owner/DACL, type, identity, canonical spelling, reparse absence, appropriate single-link files, exact Group SID and the five file hashes. A second native identity/descriptor read detects intervening drift. The pinned source hashes must all match first; the collector cannot adopt a new Edge pin from a plan.

The prepared schema includes schemaVersion, originalSnapshotSha256, exact17-path identity bindings, capturedUtc, operator SID/token PID/elevation/native status, owner/group/DACL metadata, consistency flags, metadata SHA256 and helper/source-catalogue hashes. Group state is explicitly NEWLY_CAPTURED_SUPPLEMENTAL_BASELINE, never HISTORICALLY_VERIFIED_GROUP_UNCHANGED. Actual SACL read remains false.

## 4. Private evidence and independent verification

Intended directory is the already-protected private directory alongside the original snapshot. New files use group-baseline-<GUID>.private.json, CREATE_NEW only. In-memory FileSecurity fixes owner to the approved operator and protected canonical DACL with exactly operator and SYSTEM FullControl. Actual owner/ACE/reparse checks occur before writing metadata and again after close. There is no existing-owner repair or overwrite fallback. A failure stops; no permission relaxation is provided.

**Actual new-file creation: NOT_EXECUTED** because source integrity failed. Ordinary-user explicit-owner creation is therefore not claimed verified by these memory tests. No new private Group file was written.

Independent verification is deliberately not claimed inside a collector's self-report. The baseline schema records PENDING_SEPARATE_PINNED_RECEIPT. A separate read-only process would need to verify the same17 objects, Group, original owner/DACL, native identity, hashes and complete source pins; a separate protected receipt would bind original+supplement hashes with an actual native completion. The baseline must not be edited to change a pending status to PASS. A future reviewed comparison authority must pin both the captured baseline and that independent receipt.

Current independent-verifier.template.ps1 is a **blocked design/binding stub**, not a completed verifier or evidence receipt. It immediately refuses an absent/unbound baseline hash. Because there is no actual baseline, no arbitrary path/hash is accepted and no independent17/17 verification was executed. This implementation/binding remains an explicit unfinished item after source-gate resolution, not a passed gate.

Actual supplemental path: **NOT_CREATED**. Actual supplemental SHA256: **NOT_AVAILABLE**. Actual Group capture: **0/17**. Independent actual verification: **NOT_EXECUTED**. No synthetic file or fake hash fills these fields.

## 5. Revised comparison contract

build/session4-group-baseline-20261108-1/comparison-functions.ps1 defines a pure structural document validator and field-comparison core. The original snapshot is authoritative only for recorded owner/DACL and identity/type/link/file hash fields. Group must match a separately captured supplemental SID bound to that same original object. Original descriptor fields are projected with named .NET flags; Group is not discarded or invented.

The staged integrated probe is build/session4-group-baseline-20261108-1/sacl-group-comparison.final-candidate.ps1. Its C# SECURITY_INFORMATION flags are named Owner/Group/Dacl/Sacl, so the enum domains cannot be confused by a bare7. The actual SACL capture path remains distinct and needs a later appropriate read-only authorization; it was not executed here.

Production-facing Compare-CaptureMetadata calls Get-BoundGroupData, which **unconditionally throws GROUP_BASELINE_AUTHORITY_UNBOUND in this draft**. There is no execution-plan hash override, approved:true field or fallback to original missing Group. This refusal occurs before token/privilege operation in the staged probe main flow. No new source activation is involved.

The pure core supports tests but is not an authority issuer: its results explicitly say saclVerified=false and writerAuthorized=false. Structurally valid synthetic17-row data is not sufficient to bind the wrapper. It rejects missing/wrong Group, canonical/fileID/link/owner/DACL drift, reparse/hardlink anomalies, unknown numeric metadata and unsupported descriptor scope. Owner/DACL comparison remains exact for the named recorded fields; Group comparison is exact to the new pinned baseline, never a historical equality claim.

Future review must bind actual baseline+receipt paths and exact hashes in separately reviewed code/authority after real capture. The current draft has no values to bind. It cannot grant trust or proceed merely because a mutable JSON file exists.

## 6. Candidates, unified diffs and hashes

| Candidate | SHA256 | Unified diff SHA256 |
|---|---|---|
| build\session4-group-baseline-20261108-1\group-collector.final-candidate.ps1 | 76310613c95563a22cc376633ce8a378ee4f5f2f13785c1cd3faad650778cd4c | 0da4fb3ab56c510c0075e11d00f39b4aea1c5beda9b46d8324ba19967dcecb68 |
| build\session4-group-baseline-20261108-1\sacl-group-comparison.final-candidate.ps1 | b0c8a07a7fc33ed4e9a0bedcfae926c76a18878225469f917c4c315c9a1763be | be47fbb2dec526fcaf1b6e5fa99487b151e247cab0c5a80f1bb28e4fb4f1584f |

Each diff is the candidate path plus .patch. The new collector diff is an addition from /dev/null. The comparison probe diff is against the preserved f3dc... diagnostic candidate. Helper hashes:

| Helper | SHA256 |
|---|---|
| build/session4-group-baseline-20261108-1/group-functions.ps1 | b13a45a5dd5711025cf093f7913513c90da2030ac94563be487ffb99b540f721 |
| build/session4-group-baseline-20261108-1/group-native.ps1 | cd2744af9f2e589ba8e27c64d379969f9ed42705b7a9f4f1a7684f00860f7e69 |
| build/session4-group-baseline-20261108-1/comparison-functions.ps1 | a77e997ac8c267f85817a289ab0e15b5d5121944e8ac766f52c8e2bb1761e347 |
| build/session4-group-baseline-20261108-1/independent-verifier.template.ps1 | 69927df6a2b618fa90d26a379ff51ae60d4086dbf234340dd6f8a1e3e95b9d65 |

None is installed or activated. Prior intermediate staging candidates are retained; final-candidate paths above are the review targets.

## 7. Focused tests and native receipts

Final suite: **26/26 PASS**, Node completion exit0. Evidence build/session4-group-baseline-20261108-1/focused-final-26.tap, SHA256 de79bc2dc98a916bdc8925f7d14a88384edc2bfc35093b736523501469fba92f. PowerShell synthetic children have checked native status0, null signal, no process error/stderr; they do not execute the collector or elevated capture. Actual C# from the staged SACL probe is compiled and only its pure classifier is called, never native privilege/SACL APIs.

Coverage includes named .NET/Win32 mapping; original Group absence; original/new-source hashes preserved; separate owner/DACL and Group checks; wrong/absent Group; identity/canonical/reparse/link/numeric/owner/DACL drift; bad original hash; structural17-row synthetic document validation with real-authority rejection; fake approved JSON; protected-evidence owner and unexpected-ACE denial in memory; actual collector CheckHash rejection using mocked hashing; source/binary drift inventory and safe deny-only wrapper. Original17-row input is read only for parsing/schema tests, not a new Windows Group collection.

PowerShell AST: six staged scripts, zero errors, host exit0. Node syntax checks: targeted files only, no services or live tests. Earlier first suite was22/23 PASS (exit1) because a static assertion searched for uppercase PRIVATE rather than the actual Write-NewPrivateEvidence call; that assertion was corrected without loosening a gate. The subsequent23/23 and final26/26 logs are retained. No failed collector invocation was retried; **the collector was never invoked**.

Native execution receipts must be distinguished:

- Full existing source-preflight tool: exit1, BINARY_OR_TEST_DRIFT; **BLOCKED**.
- Read-only diagnostic hash inventory: exit0,287 matches and1 known mismatch; this is not source approval.
- Focused synthetic test runner/checked child hosts: exit0; **offline only**.
- Actual collector/evidence creation and independent Group verifier: **NOT_EXECUTED**; no fabricated native exit0.

## 8. Remaining work and stop

1. Review the changed Edge executable and the narrow authority/scope needed to resolve the source precondition. No pin replacement or unrelated browser operation is authorized by this report. An explicitly reviewed Group-only integrity contract could also be considered; it must not be silently substituted for the existing complete catalogue.
2. Once the relevant source gates genuinely pass, review final collector hashes and ordinary-user explicit-owner creation, then run the authorized exact17-object Group collection. Preserve the old snapshot.
3. Complete/bind the independent verifier with actual supplement identity/hash, verify all17 objects in a separate read-only process and pin its protected receipt. No existing evidence is overwritten.
4. Review/bind the actual supplemental comparison authority, test it on final bytes, then seek/retain a separate authorized SACL-read step. No elevated SACL probe, ACL writer or Website operation follows automatically.

**SESSION4_GROUP_BASELINE_BLOCKED**. Offline code/contract preparation done; actual supplemental baseline and independent verification not completed. Group values are not historically verified and were not newly captured in this task.

Original snapshot and f3dc... diagnostic bytes unchanged. Active application source, REV10, source descriptors, resource authority and observer unchanged. No ACL/SACL/owner modification, privilege adjustment, elevated execution, PostgreSQL/API/Frontend/Edge startup, MQTT connection, DeviceCommand, ON/OFF, Automation or physical pump action occurred. STOP.
