# Pre-session 4 — Offline integration

Final status: **PRE_SESSION4_INTEGRATION_PARTIAL**.

Staged implementation and offline regressions are complete. Actual filesystem ACL verification blocks trusted resource authority. No candidate was activated, no observer was copied/run, and no Website session was started.

## Authority and unchanged active baseline

- User preparation attachment SHA256: c9383548b9a333580f801af1b5db303d448adc4984bf9cb38d4d9fe4bfee9f6b. This authorizes preparation only.
- Immutable REV10: 47e8072cdc0a711dd277c5468976b6deb0d297264b41b1ce83a02f6ebf72e3bb.
- Active parent: docs/FINAL_FRONTEND_THIRD_BLOCKER_PINS.json, SHA256 1bfd2e3431908fb3ab6f0bdc7cea487e6fb9650e6f7fca72477537b40745bd55.
- Independent installed verification: APPROVED_DELTA_VALID; baseline 250 = 248 unchanged + 2 historically approved replacements, 16 helpers. Independent hash union: **288/288 matched**, native exit0. These two baseline differences are authorized historical deltas, not new drift.
- Staged resource layer proposes **17** helpers, explicitly adding resource-authority.cjs. The active helper catalogue remains 16.
- Evidence: build/pre-session4-integration-20261107-1/offline-proof.json (SHA256 41e884a4cd2dcdeafb4601ca76c8d783b7a03a69459d334fd29e64e0aa7ea38c). Dedicated listener/reader checks returned empty lists. This is not a claim about all production runtime flags.

## Actual staging implementation

All candidates, unified diffs, test helpers and results are under build/pre-session4-integration-20261107-1/. Six existing source replacements plus one new helper are proposed. No application/frontend source, runtime policy, firmware or current manifest was edited.

1. worker.execute performs existing native ownership, stdin credential and session checks, then calls resource-authority.preflight before the browser attempt. The added execute export retains those gates and enables injected-IO tests.
2. The helper constructs its own trusted lineage IO, validates immutable authority/runtime binaries and genuine approval/consumed-marker/session binding. It accepts no externally supplied proof issuer or IO implementation in its public API.
3. Five exact dependencies are verified for hashes, canonical paths, operator owner, ancestors, reparse status, known safe ACL and stable metadata. A private WeakMap brands a frozen proof; it binds the same session object, run, worker/parent PID, captured session fields, wall time, monotonic lifetime and approval/session deadlines. A run cannot mint a second proof.
4. adapter passes the process-local proof/session into its existing route boundary. Invalid supplied proof blocks the browser path. Missing proof grants no favicon permission. The actual worker always requires preflight; legacy synthetic adapter callers without proof retain default DENY for the favicon.
5. policy permits only exact GET/HEAD http://127.0.0.1:55173/favicon.svg, with a valid proof. Query, fragment, userinfo, encoded/case/prefix aliases, other assets, unknown API GET, external origins and mutation endpoints remain denied. Existing sensor ISO query behavior is unchanged.
6. At grant use, full strict source/runtime verification and dependency identity/hash checks run again. Fake approved objects, cloned/serialized/foreign-session/stale proof and post-verification drift fail closed. This is process-local integrity within the reviewed worker, not an OS sandbox against arbitrary code execution inside Node.
7. strict-lineage, lineage-fs and the staged anchor bind a fixed exact-resource descriptor to the current parent. Mutable execution plans cannot repin helpers, binaries, dependencies or grants. Native ACL inspection is read-only.

adapter.cjs genuinely needs modification to transport the private proof to the existing request boundary. source-contract.cjs, native-host.ps1, the supervisor and runtime require no source replacement in this proposal.

## Candidate hashes and diffs

Each candidate and same-name .patch lives in the staging directory. proposal.json records paths and rationale, SHA256 f451df7e57d94011527918b1598359e167cfdbe2929c1582bc31dbfda1360d4d.

| Future target | Current SHA256 | Candidate SHA256 | Unified diff SHA256 |
|---|---|---|---|
| scripts/frontend-acceptance/resource-authority.cjs | NEW — not installed | 86726da11ac354eabd119d5f4d4aff7ad446ba871024693baa5ac3f8e1dc56d1 | 24706dc4959bd9bd0de51d3219f575c8e4b6340189c6f3ede09b2c8fbff4fa34 |
| scripts/frontend-acceptance/policy.cjs | 4e9c282e925f132832a4aa5e3b295b7c040da1b25d35e98a7d4d384d0d9c30e8 | 0af2e27e506e9b36ab2b87583078741484c74363e10bb625292795c12c04d089 | de05750a21bb4c5c7fd0ea2fa48372f2e4dcf4b1465aeef6446a5644a0e600ff |
| scripts/frontend-acceptance/adapter.cjs | 44c9f7dd5750dbe44e942e6baaf6923e037ec58754870c6bb52db798c9b0f7f4 | 09bb9755ec186ccfe22c5fc1b2cce20399edbb329a2c1a0c5ebd5cea0de54a16 | 3037e74423b4357df5beb0a8092fca6abe46593369eb6f1c77d75b02a678264a |
| scripts/frontend-acceptance/worker.cjs | b5430a2d7d1de0971424b613e0e1703e2e50485b222207e36677d3d5f0c7440c | 2701da9117a0155d0da6e4c64e7114d1cdb84e037c9df47d853d28da4d950e77 | 995de8c18fafce6fc16108fc4294cdf7012ee3f33c4ec93865581ae27b2455d1 |
| scripts/frontend-acceptance/strict-lineage.cjs | 2dc1300ac926e8a8348afacf569113531130b62f24a9d9499737796670a1043a | 91576a706a01d8cc92d2df940e78e1db6b8af56598bf9a9aff044e8cb5d4d27d | d1aab44cb43cf6a66199292b7d083954f112ec0e8ca14db613e925957e6d5ce7 |
| scripts/frontend-acceptance/lineage-fs.cjs | fab9d64c3235ea730b63a34ab6299dd3409e4d6be88d062ac7aa9bd429694f3b | 90c320b7913bd762a3f13d3964302e1ab7534f78e32c27eb7a2897186a544132 | d4906c14e41a4a46abf4b02822c5be4136d641fb94aba2c6fb901b56a6918aee |
| scripts/frontend-acceptance/lineage-anchor.cjs | a5c374167a55f824a2aeb791b6afbee2c97eda249912e063a713254e71cb814d | 9be9dec1b27f4bde7b89f1418ce9d8ca7f2f8e1c03bf3407f1e69bcd4028edba | 47c57c9d34926d50fb22b7d954097611d4bcfcc0f77949a7d226161e10520315 |

Descriptor candidate: build/pre-session4-integration-20261107-1/FINAL_FRONTEND_EXACT_RESOURCE_INTEGRATION_PINS.json.

Descriptor SHA256: **ad3972349c784ec167d87907e53b5e6a4464fd728d909bf09e1ef83bd5ee1e5d**. Future target: docs/FINAL_FRONTEND_EXACT_RESOURCE_INTEGRATION_PINS.json; it is not currently installed. Parent binding remains 1bfd2e3431908fb3ab6f0bdc7cea487e6fb9650e6f7fca72477537b40745bd55. No REV11 is proposed.

## Exact dependencies and actual filesystem blocker

| Dependency | SHA256 | Actual ACL gate |
|---|---|---|
| frontend/index.html | 1e49e388e9330af8cc1e16a73773603ff3f5da25d23fedfcd0ebd939c68d13b3 | BLOCKED |
| frontend/public/favicon.svg | 0654e9c9d4fed9e1244875e901c80f3e8c66bb5b06cbbd97276c0dc689f55022 | BLOCKED |
| scripts/mvp-ui-only-frontend.mjs | cecd399201fde662b701d0ce286d43f317ac22cfb53223683e66be2abda3cba9 | BLOCKED |
| frontend/src/main.tsx | 15d22597ed6216783c18850331538d72836ecca79649748b24400ff1d546c6b9 | BLOCKED |
| frontend/node_modules/vite/dist/node/chunks/config.js | c2fcfa51206dc1f8d22120ef4a82af8b9acdc02f4476520b6a0897d12a724ba3 | BLOCKED |

All five actual hashes match. Owner matches the verified operator SID; native metadata reports no reparse point. However, all five files inherit Authenticated Users Modify. Actual generated metadata reader exited0 and returned aclKnown=true, aclSafe=false. Therefore **BLOCKED_UNTRUSTED_WRITE** is the actual resource gate result. No proof may be minted on this filesystem under this candidate. No ACL was modified. The successful integration fixtures use explicitly synthetic safe ACL metadata; their PASS is not acceptance of the real ACL.

## Observer integration review

Revised observer remains at build/pre-session4-readiness-20261107-1/capture-once.revised.ps1, SHA256 e1d045b452fb9790bfa74b9c27ca01149e1842d3fa201069e1f7743ea5fe0490.

Reviewed diff SHA256 dc5725df6377b8fa4b471088f97d1611f3544398699795e1cde34ea3c93b5387. Historical proposal SHA256 4c00038ed34dcbe142654b770a256f8f2a96e24540e0fb55bf4b838440f4a4d0. All exact references match.

New exact integrated review bundle: build/pre-session4-integration-20261107-1/EXACT_FUTURE_OBSERVER_REVIEW_BUNDLE.json, SHA256 **0cae57a075a2697ada63d9c68e49df6ddc958308e901e67a655b1e6291ac723e**. It binds the observer/diff/historical bundle/launcher, new source descriptor, proposal and bootstrap candidate. It is review material, not execution authorization. observer-bundle-review.cjs rejects altered observer bytes or mutable bundle repinning before any future installation.

Review confirms: one launcher and held native handle; exact genuine consumed marker; UTC freshness, expiry before/after handoff, marker not before launcher start; separate 300s prompt and 1100s runtime observation; unchanged 600s Website window. Native exit and valid OS ExitTime must come from the same held handle. Future/stale/wrong markers, invalid/unknown native timestamps and races fail closed. A native exit0 is preserved as native0 when the observer contract is blocked; contract failure is separate. There is no retry, fallback or foreign-process termination. Get-Credential cancellation remains NOT_VERIFIED.

Future installation, after separate authorization: independently rehash this exact bundle and all references against the external reviewed hashes; verify installed source authority and helper17, real ACL gates and pinned binaries; create a fresh private operator-owned execution plan with a genuine fresh approval; copy the exact observer only into that fresh plan without overwriting historical evidence. Rehash the destination, revalidate marker/expiry/ownership contract, then execute only within separately approved limits. No copy or execution occurred here; review helper must not be treated as permission to run.

## Offline tests and native results

| Suite | Actual result | Native exit | Evidence file in staging | Evidence SHA256 |
|---|---|---|---|---|
| Existing staged functional regressions | 254/254 PASS | 0 | final-regression-254.tap | a83bc0eddf905b101d9717b826c5c126d2eecdbd4c4681bf2a35aa5615c01757 |
| Supervisor (separate invocation) | 83/83 PASS | 0 | supervisor-83.tap | ca013c104826559888c2a3dc1b6e3e85160ae0fb045862fa28db814e43f11dde |
| Existing native/observer mocks | 26/26 PASS | 0 | native-mocks-26.tap | e309856b657bb721a665be6d02a4dfa9e9b257fece5e5b4009983048a6c7d00e |
| New actual worker/resource integration with injected IO | 48/48 PASS | 0 | new-second.tap | 4e65b33d416445bb2d05cc42ec9b8870b7dfa3a70b2b33607c4a6e24adf7f25f |
| Revised observer review (24 internal PowerShell assertions included) | 3/3 PASS | 0 | observer-review.tap | f5ee75e8cf3aee67253f65e14142b0a46c5b56ebaee8d18fc94805d4fb3816e3 |
| Exact observer bundle negative controls | 3/3 PASS | 0 | observer-bundle-review.tap | 7982c11dcb0ac8e78118b4bb7b604e0bace3ca90f6120cf9af5e0c54c9bb29a8 |

Existing regressions: **363/363 PASS** (254 + 83 + 26). New focused tests: **54/54 PASS** (48 + 3 + 3), total **417/417** final tests. The observer's 24 inner assertions are not counted as additional top-level tests. Seven staged JavaScript candidates passed node --check, each exit0. The exact revised PowerShell observer tests parse/extract pure functions; they do not invoke observer main or launch a diagnostic target.

Negative controls cover fake/serialized/replayed proof, wrong parent/descriptor, extra source/helper and arbitrary repin, changed dependency/source/binary, owner/ACL/reparse/canonical mismatch, absent READY authority, expired execution approval/marker/session mismatch, aliases, external/mutation endpoints and observer drift. Existing cancellation, one-launch, cleanup, CLOSED barrier, READY7 and ownership regressions remain passing. The actual worker test intentionally encounters a forbidden request and verifies mocked bounded shutdown (fake worker exit3), one mock browser open/close and zero native child spawns. No synthetic native receipt is reported as OS evidence.

Controlled test projection loads staged candidates without modifying installed files or pinned tests. Native filesystem/process/browser IO in integration fixtures is injected memory metadata; no real Edge, server, DB or network action is used. The separate independent active-file proof uses no projection.

Preserved intermediate failures: regression-progress-254.tap had 253/254 PASS (native1) because the test projection expected an obsolete READY helper hash; new-progress.tap had 27/48 PASS (native1) because a synthetic session was 600001ms long. Fixed fixture metadata/deadline only, without weakening installed pins or the 600000ms gate. Both failed outputs remain available. Initial Python decoding used the Windows default encoding and was corrected to explicit UTF-8 before candidate generation completed.

Separately, one read-only PowerShell source-reading command emitted output then exited -1073741819 / 0xC0000005. Its output is not native PASS; root cause was not investigated or claimed fixed in this scope. The later independent metadata/hash verification and final test invocations have their own recorded exit0 outcomes.

## Remaining conditions and decision

- **Actual ACL is blocking**: a separate narrowly scoped filesystem approval/design is needed before modifying access rights on the exact dependencies or preparing an equivalently reviewed protected source layout. Do not alter parent/repository ACL broadly, relax this gate or assume current staged bytes are tamper-protected by hashes alone.
- Staged source activation requires separate approval for the seven exact source candidates and new descriptor/anchor with parent lineage. No old activation approval was reused.
- Observer installation and a fresh one-shot Website session require separate explicit authorization after source and actual filesystem gates pass. No fourth live attempt was consumed.
- Historical UNKNOWN_DENIED_GET remains UNKNOWN. The favicon grant does not prove the historical failure was favicon or that live delivery/browser acceptance is fixed.
- Real browser screenshots, 19-page/5-viewport completion, live native receipts and Get-Credential cancellation are not newly verified here. SOIL_SENSOR_QUALITY_BLOCKED remains unchanged.

Safety: ACTIVE_SOURCE_UNCHANGED; REV10_UNCHANGED; OBSERVER_NOT_COPIED_OR_EXECUTED; WEBSITE_SESSION4_NOT_EXECUTED; POSTGRESQL_API_FRONTEND_NOT_STARTED; MQTT_NOT_CONNECTED; DEVICECOMMAND_NOT_CREATED; AUTOMATION_NOT_ENABLED; PHYSICAL_PUMP_NOT_TRIGGERED. Production runtime flags/PENDING were not queried and are not claimed freshly verified.

**STOP — PRE_SESSION4_INTEGRATION_PARTIAL.**
