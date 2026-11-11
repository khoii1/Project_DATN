# Strict source-lineage validation — offline completion

Ngày: 2026-11-06. Phạm vi: triển khai validator và kiểm thử offline theo yêu cầu `f3cad0e5-c086-4e40-b872-de66947ae466`. Không áp dụng hai staged replacements, không chạy Website.

## 1. Kết quả và root cause

**STRICT_LINEAGE_READY_FOR_PATCH_APPROVAL** — implementation và kiểm thử offline đạt. Đây không phải quyền apply hoặc bằng chứng nghiệm thu browser.

Lỗi `LINEAGE_SCOPE_ENFORCEMENT_MISSING` đã được xử lý: validator cũ chấp nhận helper/source hashes do execution plan cung cấp, nên plan có thể repin file thứ ba. Validator mới tính authority độc lập từ REV10 bất biến, genuine two-file approval, supplemental document bất biến và bootstrap hardening riêng. Hash trong plan chỉ là giá trị cần đối chiếu, không cấp quyền thay source.

Kết quả đọc file thật và phép chiếu offline:

| Kiểm tra | Kết quả |
|---|---|
| REV10 actual bytes, 250 source + 4 runtime + 4 offline-test pins | `REV10_BASELINE_VALID` |
| Hai active Supervisor/Runtime | `BASELINE_UNPATCHED`; giữ nguyên old hashes |
| Chiếu đúng hai candidate trong memory | `APPROVED_DELTA_VALID` / `APPROVED_TWO_FILE_DELTA_VALID` |
| Effective source trong phép chiếu | `EFFECTIVE_SOURCE_VALID`: 248 unchanged + 2 approved replacements |
| Raw REV10 audit trên phép chiếu | Vẫn từ chối `SOURCE_DRIFT` như thiết kế; không bypass/sửa auditor |
| Thay file thứ ba và cập nhật plan theo hash mới | Bị chặn |
| Apply source thực tế | Không thực hiện |

## 2. Files và SHA256

| File | Thay đổi | SHA256 |
|---|---|---|
| `scripts/frontend-acceptance/source-contract.cjs` | Thay trust vào plan bằng strict gate; gắn post-session gate | `26c5fd2b6661e7afcc8c9ee3497487b04d7d56ce156a21f9a0fa0a1ca4966392` |
| `scripts/frontend-acceptance/strict-lineage.cjs` | Pure verifier, fixed authority, strict JSON/catalogue, stable reads | `f7e81e63806b20fafe5fb608e63ba2a733a7bc034eb9fc3de89112f0b16cedba` |
| `scripts/frontend-acceptance/lineage-fs.cjs` | Read-only Windows ownership/reparse/file-identity adapter | `e0e58acceeb6e8fc850f23173dbb217dd2c4df45e6a8813efde372b9449fee15` |
| `scripts/frontend-acceptance/lineage-anchor.cjs` | Trusted bootstrap với descriptor digest cố định | `2eb46c304a659725b554ecbd2cc900b7c993951618637d6a9e5d8f4c3285cc89` |
| `scripts/frontend-acceptance/lineage-test-support.cjs` | Memory-only source projection và fake trusted IO | `8d2b5b40233176e40e25557b6e516d2ed9414c1f56e751d1eaadfb591b4d14eb` |
| `scripts/frontend-acceptance/strict-lineage.test.cjs` | 31 targeted tests | `99412623516353d34ded06882e02567600a5681d112ef5ced5e2854a9b52fa44` |
| `scripts/frontend-acceptance/strict-lineage-integration.test.cjs` | 8 tests trên exact staged paths với fake lifecycle | `04704d6222589b97dd615cf9b901341e7bf0936dafab255cddded853691110f2` |
| `scripts/frontend-acceptance/bridge.test.cjs` | Nâng fixture sang independent lineage IO; đổi assertion lỗi tương ứng | `cb0eb1c00f97cbdf301737f9bcca6d677463146014b3598fe9fc033bfb7db273` |
| `docs/FINAL_FRONTEND_STRICT_HARDENING_PINS.json` | Descriptor hardening, không phải execution approval | `4f336378455fc5bc7a9bb570d324e18cab6b43fe1c932842ba85e530728f3c07` |

Không sửa frontend, API, firmware, database, credentials hoặc runtime policy. Không tạo REV11. Không thay source `mvp-ui-only-pin-audit.cjs`.

## 3. Authority, provenance và bootstrap

Các anchors lịch sử vẫn nguyên bytes:

- REV10 `docs/PHASE_AE_UI_ONLY_SOURCE_MANIFEST.json`: `47e8072cdc0a711dd277c5468976b6deb0d297264b41b1ce83a02f6ebf72e3bb`.
- Supplemental `docs/FINAL_FRONTEND_LIFECYCLE_SOURCE_PINS.json`: `b3b51b7ad27f97e3b1bb3a2e1212b45739f8543a04638c232b124119465c462f`.
- Genuine two-file approval `88c3785e-466a-4027-989c-71d3e5ecdb22/Pasted text.txt`: `1e8d88d02f1f5066418746bae36c1f3a6bbd4c16df024b4d930b477f5f7b0dc8`.
- Current **offline hardening** approval `f3cad0e5-c086-4e40-b872-de66947ae466/Pasted text.txt`: `d4ff17ff9f6d470e740163407fb7b3924fbad598a66a4d89f118426aeef9bd64`.

Hai cặp replacement cố định trong verifier:

| Path | Old SHA256 | Approved new SHA256 |
|---|---|---|
| `scripts/mvp-ui-only-supervisor.cjs` | `2ac398b3d654c2af2beb5bd8e5adabfbe18eeb24bccf7ca9d18562c3d9166e4b` | `b7d62547db2b8bd10b49fcd82a33f98cdea7d6623177ea21e433396ba7a5e0b2` |
| `scripts/mvp-ui-only-runtime.cjs` | `671f45fc7c4cc3e237a4035e2db950405c4412dba7bd28dfe60ff15f62c772bf` | `ad31e89eba5980c792c72a5afc4594ed8c8a89ade7f6195bf8678368664f1e83` |

Supplemental document cũ cũng pin `source-contract.cjs` và `bridge.test.cjs`. Hai file này được sửa theo quyền hardening hiện tại, **không** theo quyền two-file replacement. Vì vậy không thay b3 document hoặc giả rằng mọi old helper pin còn khớp. Descriptor riêng chỉ cho phép hai override đó, kiểm tra old hashes từ b3, cộng hai module strict/fs mới. Bootstrap anchor bổ sung pin thứ 16 vào catalogue helpers; plan không chọn được descriptor/hash hoặc phạm vi override.

`lineage-anchor.cjs` giữ cố định SHA256 descriptor. Anchor được load bởi source-contract, không từ execution plan. Pin của anchor được chụp trước validation rồi so với source bytes và helper map. Descriptor không tự chứa hash anchor, tránh vòng tự tham chiếu.

**Ranh giới tin cậy:** trước lần activation sau, operator/executor phải đối chiếu SHA256 công khai của bootstrap anchor và bộ validator đã review. Không có tuyên bố rằng một executable tùy ý bị thay trước khi load có thể tự chứng minh chính nó. Không dùng `plan.lineageAuthority` làm trust root. Bộ hardening mới còn cần được chấp nhận rõ trong source activation review; current approval chỉ cho triển khai/test offline.

## 4. Thuật toán fail-closed

1. Đọc metadata trước/sau từng file: canonical path, owner SID đã biết, reparse/ancestor checks và stable identity stamp. Project source phải thuộc operator SID đã pin. Adapter Windows dùng read-only PowerShell, timeout 15 giây; native nonzero/signal/error/stderr bị từ chối.
2. Xác minh raw REV10 hash trước khi parse và lấy trực tiếp exact 250-path catalogue. Kiểm tra runtime4/offline4.
3. Xác minh exact genuine approval reference/hash, raw supplemental document/hash và hai cặp old→new hardcoded. Không cho phép path thứ ba.
4. Xác minh hardening descriptor từ trusted bootstrap, đúng phê duyệt offline và đúng scope override/additions. Tính expected helper/runtime/browser maps độc lập; plan phải khớp exact path sets và values.
5. Mỗi source ngoài hai replacements phải đúng REV10. Hai replacements cùng old → `BASELINE_UNPATCHED`; cùng approved new → `APPROVED_DELTA_VALID`; partial hoặc hash khác → BLOCKED. Execution path bắt buộc effective state, không chạy baseline-unpatched như automated candidate.
6. Parse raw plan bằng strict JSON parser tại CLI paths để phát hiện duplicate/escaped duplicate keys trước khi normalization che chúng. Plan bytes phải tương đương parsed plan được kiểm tra. Path alias, thiếu/thừa pin, approval drift hoặc arbitrary repin đều bị chặn.
7. Đọc/hash lại toàn bộ catalogue đã lấy mẫu để phát hiện thay đổi trong quá trình verify. Chạy lại strict gate sau READY và sau session; không tái sử dụng verdict cũ làm post verdict.

Metadata/hash checks không phải file-lock transaction chống mọi thay đổi sau thời điểm cuối cùng kiểm tra. Root executable integrity cần external review như phần 3; việc nghiệm thu live chưa thực hiện.

## 5. Tích hợp với exact staged Supervisor/Runtime

Không sửa thêm hai candidate đã duyệt. Exact hashes b7/ad31 và hai unified diffs lịch sử vẫn nguyên:

- Supervisor diff: `fa2a16d4794038bf44daa17a9d4cba146e99605233d0f4799c9b9900b93e78b8`.
- Runtime diff: `55a2038d5681a640d0cd2e271274363cd96eb1bff54b11cc5cdf9cac44b12a50`.

| Execution path | Integration và kiểm chứng |
|---|---|
| Launcher `--check-plan` | Exact staged Runtime `checkPlan` gọi staged Supervisor `validateApproval`, rồi source-contract strict gate; raw argv plan được kiểm tra lại |
| Supervisor pre-start | Source-contract strict gate chạy trước prepare/start; unapproved repin bị từ chối |
| Trusted READY | Existing runtime `inspectRuntime` gọi `checkPlan` lại; strict gate không nhận snapshot hashes từ plan làm authority |
| Post-source | Source-contract đăng ký guard vào existing injected `io.verifyRuntime` trên cùng IO; giữ nguyên original runtime verifier, rồi chạy strict gate mới sau source loop của staged Supervisor |
| MANUAL/default | Không vào nhánh automated source-contract; 83 regressions và test legacy path giữ gates cũ |

Không thay lifecycle/native observer, CORS/auth/READ ONLY DB gates, credential transport, close-before-shutdown barrier, read-only browser request policy, one-launch/no-retry/no-fallback hoặc MQTT/Commands/Automation policy.

Post integration được kiểm thử bằng cách compile exact staged bytes trong test process với fake lifecycle. Fake browser stage thay helper sau READY rồi tự repin plan: post-verification vẫn BLOCKED, không accepted; cleanup đi đúng known-closed path. Không có browser/services thật trong các fake lifecycle tests.

## 6. Test evidence thực tế

Evidence: `build/strict-lineage-bd2f7c555bb8464faf7afed88d02e958/`.

| Kiểm tra | Kết quả thực tế |
|---|---|
| New strict lineage unit/negative tests | **31/31 PASS** |
| New staged-path integration tests | **8/8 PASS** |
| Existing adapter + bridge integration | **90/90 PASS** |
| Combined run | **129/129 PASS**, native exit0 |
| Existing supervisor regressions với staged preload | **83/83 PASS**, native exit0 |
| Node syntax, 8 changed/new CJS files | **8/8 PASS**, mỗi native exit0 |
| PowerShell AST: session, native-host, extracted readonly metadata helper | **3/3 PASS**, parser errors0, host exit0 |
| Independent Windows metadata/file projection | Actual `BASELINE_UNPATCHED`; memory projection `APPROVED_DELTA_VALID`, Node native exit0 |
| Independent PowerShell SHA256 vs Node-derived expected pins | **292/292 MATCH**, host exit0 |

Tổng functional tests: **212/212 PASS** (39 mới + 90 integration + 83 regression). Không coi syntax/hash checks là functional tests.

Negative controls bao gồm: một replacement; sai old/new; thay App.tsx; thay App.tsx + plan repin; extra/missing/duplicate/case-alias path; wrong baseline/approval/scope; supplemental/helper/runtime/browser repin; unreadable/unknown/wrong owner; reparse/canonical mismatch; read race; drift sau READY; post helper repin; plan tự cấp hardening authority; extra hardening override; raw plan duplicate/mismatch. Các tests legacy/no-retry/unknown native cleanup vẫn đạt.

Artifacts chính:

- `final-lineage-and-integration.tap`: 129 tests.
- `supervisor-final.tap`: 83 regressions trên exact staged Supervisor.
- `independent-projection.json`: computed effective250, helpers16 và baseline status.
- `independent-powershell-hashes.json`: 292 independent SHA256 results.
- `unchanged-integrity.json`: active/candidate/diff integrity.
- `hardening-source-hashes.json`, `syntax.json`, `powershell-ast.json`.
- `source-contract.original.cjs`: public source snapshot trước hardening.

Một lệnh chuẩn bị AST ban đầu tham chiếu nhầm tên file host không tồn tại và dừng trước kết quả AST; sau đó dùng đúng ba files liên quan, đạt 3/3. Không chạy hay sửa host/browser vì lỗi tên file này.

## 7. Điều kiện áp dụng tiếp theo và rollback

Cần approval riêng, hẹp cho **source activation**, ghi rõ:

1. Chấp nhận exact hardening descriptor `4f3363…f3c07`, bootstrap `2eb46c…5cc89` và validator/helper hashes đầy đủ ở phần 2; bảo toàn REV10/b3 lịch sử. Không cho execution plan tự repin.
2. Cho áp dụng đúng hai replacements b7/ad31 lên đúng hai active old hashes sau fresh integrity check. Không có staged delta mới trong phase này.
3. Cho tạo effective execution plan250 = baseline248 + approved2, helpers16 theo trusted authority, runtime4/browser4 và genuine fresh execution approval nếu sau đó muốn chạy Website. Source approval không tự cấp quyền live session.

Nếu source drift hoặc missing owner/approval/helper pin: STOP, không copy đè/repin để vượt gate. Rollback source khi được duyệt sau này phải dùng đúng old2 và snapshot source-contract/old supplemental bytes tương thích; không chạy automated mode bằng tổ hợp half-applied. Không tự đổi manifest hoặc khởi động runtime trong rollback preparation.

Cần phê duyệt **Website session riêng** trước startup/read-only DB/browser. Chưa kiểm chứng launcher thực thi live với bộ helper mới; tests là fake integration + real-file read-only verification. Trạng thái production runtime không được suy ra từ offline tests.

## 8. Final verdict

```text
SMART AGRICULTURE — STRICT SOURCE LINEAGE
Authorization: APPROVED (offline validator hardening)
REV10 baseline: UNCHANGED
Two active Supervisor/Runtime files: UNCHANGED
Strict validator: IMPLEMENTED
Approved two-file delta: VERIFIED (in-memory projection only)
Third-source repin rejection: PASS
Supplemental pins enforcement: PASS (immutable old document + separately pinned hardening)
Launcher check-plan integration: PASS (exact staged path, synthetic IO)
Post-source validation: PASS (exact staged lifecycle, synthetic IO)
New negative/integration tests: 39/39 PASS
Integration tests: 90/90 PASS
Supervisor regressions: 83/83 PASS
Actual Edge/Website execution: NOT_EXECUTED
Website live attempt: 0/1
Source replacements applied: 0
REV11: NOT_CREATED
Database/MQTT/DeviceCommand/ON/OFF/Automation/hardware actions: NOT_EXECUTED
FINAL: STRICT_LINEAGE_READY_FOR_PATCH_APPROVAL
```

STOP sau offline hardening và tests. Không sử dụng approval này để apply source hoặc chạy Website.
