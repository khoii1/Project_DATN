# Approved strict-lineage source activation

Ngày: 2026-11-06. **SOURCE_ACTIVATION_COMPLETE**.

Đã thay thế đúng hai active files Supervisor/Runtime bằng exact approved candidate bytes, mỗi target một lượt ghi; không retry hoặc rollback. Strict hardening đã được đối chiếu với các hashes người dùng phê duyệt. Không chạy Website/browser, PostgreSQL, API, frontend, MQTT hoặc phần cứng.

## 1. Approval provenance

Approval hiện tại:

`C:\Users\Acer Swift3\.codex\attachments\6721d474-d1f6-49e1-9523-5270196720d0\Pasted text.txt`

SHA256: `8e5a066b0293cbfd5cebe61e7aefb25f871f5b6ca7e9687eb2dd9d7641240a8d`.

Phạm vi: exact two-file source activation + verified hardening, offline verification. **Không có quyền Website execution trong văn bản này.** Không tạo live approval, không tiêu thụ session 0/1.

Authority lịch sử được giữ nguyên:

| Authority | SHA256 |
|---|---|
| Manifest REV10 | `47e8072cdc0a711dd277c5468976b6deb0d297264b41b1ce83a02f6ebf72e3bb` |
| Original two-file approval `88c3785e-466a-4027-989c-71d3e5ecdb22` | `1e8d88d02f1f5066418746bae36c1f3a6bbd4c16df024b4d930b477f5f7b0dc8` |
| Supplemental document b3 | `b3b51b7ad27f97e3b1bb3a2e1212b45739f8543a04638c232b124119465c462f` |
| Offline hardening approval `f3cad0e5-c086-4e40-b872-de66947ae466` | `d4ff17ff9f6d470e740163407fb7b3924fbad598a66a4d89f118426aeef9bd64` |
| Hardening descriptor | `4f336378455fc5bc7a9bb570d324e18cab6b43fe1c932842ba85e530728f3c07` |
| Bootstrap anchor | `2eb46c304a659725b554ecbd2cc900b7c993951618637d6a9e5d8f4c3285cc89` |
| Strict validator | `f7e81e63806b20fafe5fb608e63ba2a733a7bc034eb9fc3de89112f0b16cedba` |
| Source contract | `26c5fd2b6661e7afcc8c9ee3497487b04d7d56ce156a21f9a0fa0a1ca4966392` |
| Filesystem verifier | `e0e58acceeb6e8fc850f23173dbb217dd2c4df45e6a8813efde372b9449fee15` |

Không sửa các authority documents, hardening sources/hashes hoặc frontend. Không tạo REV11. Current source activation approval không thay thế genuine fixed two-file lineage reference trong verifier.

## 2. Evidence và originals

Evidence riêng:

`C:\DATN\Project_datn\build\source-activation-d35c4f433ef641abbdb75515592a26d6`

Owner: `S-1-5-21-1432835263-483988321-3159128977-1001`.

Directory protected DACL, chỉ operator và SYSTEM FullControl. Original backups là create-new, hash verified và chỉ có ACE operator/SYSTEM qua inheritance:

- `mvp-ui-only-supervisor.cjs.original`
- `mvp-ui-only-runtime.cjs.original`

Target identities, owner và SDDL được lưu tại `source-write-before.json`; post ACL tại `postapply-acl.json`. Hai targets có inherited DACL sẵn có: Administrators/SYSTEM FullControl, Users ReadAndExecute và Authenticated Users Modify. Đây không phải protected source storage; không tuyên bố môi trường chống concurrent modification tuyệt đối. Owner/canonical/reparse/stable-state và hashes đã được kiểm tra, **không sửa target/parent/repository ACL**. Các sources này không chứa credential.

## 3. Mandatory pre-apply gates

| Gate | Kết quả trước khi ghi target |
|---|---|
| Current approval scope/hash | PASS — source activation only |
| REV10 và hai original hashes | PASS — 250 source chưa drift |
| Candidate bytes và unified diff hashes | PASS — đúng b7/ad31 và hai patch hashes đã duyệt |
| Hardening descriptor/bootstrap/core/contract/fs hashes | PASS — independent hashes trước khi load verifier |
| Supplemental source/test/browser pins | PASS — immutable b3 + exact hardening overrides, helpers16 |
| Source catalogue | PASS — actual `runtime.sourceFiles()` trùng exact250 baseline paths |
| Owner/canonical/reparse/ACL | PASS — đúng operator, đọc được metadata, không reparse; ACL được ghi nhận |
| Actual pre-apply strict state | `BASELINE_UNPATCHED` |
| Memory projection | `APPROVED_DELTA_VALID`, 248 unchanged + 2 approved |
| Third source + mutable plan repin | BLOCKED như yêu cầu |
| Check-plan/pre-start/READY/post gates | PASS trong exact staged-path offline integration |
| Legacy MANUAL và lifecycle safety | PASS — 83 regressions |
| Pre-apply functional tests | 129/129 + 83/83, native exit0 |

`before-verification.json` lưu kết quả source-only verifier. Object dùng cho phép đối chiếu hashes không có live execution approval/session; không lưu executable live plan. Historical PostgreSQL binary provenance được đọc lại từ evidence cũ bằng `historicalProvenance()`, không chạy PostgreSQL binary hoặc mở DB.

Ngay trước source writes, executor recheck fixed authority pins, actual250 hashes, helpers16, runtime4/offline-test4/browser4, candidate/patch hashes và target SDDL. Mỗi target được kiểm tra lại old hash/SDDL trước khi ghi.

## 4. Actual source writes

| Target | Original SHA256 và backup | Candidate = active after SHA256 | Outcome |
|---|---|---|---|
| `scripts/mvp-ui-only-supervisor.cjs` | `2ac398b3d654c2af2beb5bd8e5adabfbe18eeb24bccf7ca9d18562c3d9166e4b` | `b7d62547db2b8bd10b49fcd82a33f98cdea7d6623177ea21e433396ba7a5e0b2` | APPLIED; 1 write; ACL unchanged |
| `scripts/mvp-ui-only-runtime.cjs` | `671f45fc7c4cc3e237a4035e2db950405c4412dba7bd28dfe60ff15f62c772bf` | `ad31e89eba5980c792c72a5afc4594ed8c8a89ade7f6195bf8678368664f1e83` | APPLIED; 1 write; ACL unchanged |

Staged folder vẫn giữ nguyên:
`build/frontend-lifecycle-integration-4d13ea9ad1794ce0a1fd549f4fb63094/staged/scripts/`.

Unified diffs không thay đổi:

- Supervisor: `fa2a16d4794038bf44daa17a9d4cba146e99605233d0f4799c9b9900b93e78b8`.
- Runtime: `55a2038d5681a640d0cd2e271274363cd96eb1bff54b11cc5cdf9cac44b12a50`.

Executor evidence script `apply-exact-two.ps1` SHA256:
`69a18ced4c62b18319402862da380d1c3cb1ebd83d838f1c32ca0c765179b57d`.

Mỗi write có marker/outcome create-new. `source-write-complete.json` ghi writes2/retry0/rollback0. Không thay nội dung candidates, không sửa helper hoặc third project source, không xóa backups/evidence.

## 5. Post-apply strict verification

Actual file reads bằng Windows metadata adapter:

- `REV10_BASELINE_VALID` cho immutable authority document.
- `APPROVED_TWO_FILE_DELTA_VALID` và `EFFECTIVE_SOURCE_VALID` cho actual installed source.
- **248/248** baseline paths còn lại khớp exact hashes.
- **2/2** replacements khớp approved new hashes.
- Exact source catalogue250, không extra/missing paths.
- Supplemental helpers **16/16**, runtime4, baseline offline-test4 và Edge/Playwright4 được xác minh.
- Third-source change + plan repin vẫn bị strict verifier từ chối.
- Independent PowerShell SHA256 comparison: **292/292 MATCH**, native host exit0.
- Target SDDL sau ghi khớp before; originals khớp old hashes; không reparse.

**Raw REV10 source audit: EXPECTED_TWO_FILE_DRIFT.** Raw auditor vẫn hoạt động và từ chối actual source khi gặp approved replacements. Phân tích exact250 hashes xác nhận chỉ hai paths ở bảng trên khác baseline. Không báo raw source250/250 PASS sau activation, không thay manifest để ép raw audit đạt.

`after-verification.json`, `postapply-independent-sha256.json` và `postapply-acl.json` lưu các đối chiếu này. Không dùng một JSON verdict hoặc mutable plan thay thế đọc/hash actual source.

## 6. Offline regressions sau apply

| Suite/check | Kết quả thực thi sau apply |
|---|---|
| Strict-lineage unit/negative tests | **31/31 PASS**, native exit0 |
| Strict staged-path integration | **8/8 PASS**, native exit0 cùng adapter/bridge |
| Browser adapter + bridge/security/assertions | **90/90 PASS**, native exit0 |
| Integration combined | **98/98 PASS**, native exit0 |
| Supervisor regressions, import active Supervisor trực tiếp, không staged preload | **83/83 PASS**, native exit0 |
| Node syntax: active2 + core/contract/fs/anchor | **6/6 PASS**, từng native exit0 |
| PowerShell AST: launcher/native host/credential handoff/executor/metadata helper | **5/5 PASS**, zero parser errors, host exit0 |

**212/212 functional tests PASS** sau activation; không cộng pre-apply rerun hoặc syntax/hash checks vào count.

Các nhóm credential UTF-8 handoff/redaction, read-only request deny, simulated95 cells (19 routes × 5 widths), close-before-shutdown, UNKNOWN/native cleanup/timeouts, no-retry/no-fallback và legacy MANUAL thuộc hai suites 90 và83 trên. Không chạy Edge hoặc services để kiểm tra các nhóm này; đều fake dependencies/offline assertions.

### Baseline fixture sau activation

Hai strict unit cases mô tả *original baseline* và *partial replacement* trước đây đọc original bytes từ active paths. Sau activation, original bytes không còn ở đó. Không sửa pinned test source để đổi expected result.

Post-apply strict31 chạy với `historical-fixture-preload.cjs` trong evidence directory: xác minh active2 có approved new hashes và backups2 có exact old hashes trước; chỉ cung cấp archived old bytes cho hai **fixture consumers** `strict-lineage.test.cjs` và `lineage-test-support.cjs`. Default approved projection vẫn lấy exact candidate bytes. Validator/authority source không bị mock hoặc bypass.

Đây là explicit in-memory historical fixture, không phải báo active files khớp old hashes. Effective source check thật ở phần5 chạy **không preload**; integration98 và active supervisor83 cũng chạy **không preload**. Test harness cũ cần fixture preload này khi chạy unit baseline cases trên installed source; không dùng raw unadapted fixture command để suy ra source drift. Đây là giới hạn tái lập tests được ghi rõ, không cấp quyền sửa third pinned source.

Exact staged integration bytes giống active bytes đã hash-verified; suite98 vẫn compile staged bytes trong memory như thiết kế cũ. Active supervisor83 import installed code trực tiếp. Không coi các kết quả này là real browser/DEV lifecycle verification.

## 7. Diagnostic/evidence preparation issues

Các lỗi thu evidence sau được giữ minh bạch, không che bằng việc bỏ source gate:

1. Trước tạo evidence directory, constructor nhận SID dưới dạng string gây `IdentityNotMappedException`. Không có thư mục hoặc source write ở bước đó. Dùng typed `SecurityIdentifier`, sau đó tạo directory với đúng operator/SYSTEM DACL và nghiệm thu ACL thực tế.
2. Read-only collector `verify.cjs` gọi raw auditor thiếu các arguments runtime/provenance nên native exit1; dừng trước source writes. Collector gốc được giữ lại. `verify-v2.cjs` bổ sung đầy đủ runtime pins, binary reader và **actual historical provenance verification**, rồi chạy lại source gates thành công (không nới verifier). `before-verification.json` chỉ được tạo khi toàn bộ checks PASS.
3. Post-supervisor TAP ban đầu được redirect nhầm sang tên evidence tạm dưới build; đã chuyển vào private run. PowerShell `Set-Acl` báo thiếu `SeSecurityPrivilege` khi đặt security descriptor mới cho file evidence này. Không nâng quyền, không sửa target/production ACL. Sau đó cập nhật **chỉ Access DACL của file evidence mới** qua .NET Access-only API, rồi đọc lại: owner operator, protected DACL, operator/SYSTEM FullControl. Nội dung TAP không chứa credentials.
4. Final evidence collector ban đầu đọc TAP do Windows PowerShell redirect (UTF-16LE BOM) như UTF-8 nên không nhận pass-count. Collector dừng, không chạy lại tests hoặc ghi source. Đọc lại đúng BOM/encoding xác nhận 31/98/83 PASS và fail0; `completion.json` ghi rõ encoding từng TAP.

Không có source write bị lỗi, retry hoặc partial apply. Những lỗi evidence preparation không được ghi thành test PASS; các test counts/native exits ở phần6 lấy từ từng test runner thật.

## 8. Compatibility và bước kế tiếp

Source activation đã hoàn tất. Launcher `--check-plan` giữ nguyên đường gọi active Runtime → active Supervisor → strict contract. Exact-path offline tests kiểm tra cả source/plan mismatch và post-session helper repin. Pre-start và READY dùng cùng strict authority; original runtime verifier vẫn được giữ trong chained post gate. MANUAL/default giữ nguyên 83 regressions.

Không có live `--execute`, không có fresh Website approval hoặc executable future plan được tạo. Trước một supervised Website acceptance cần:

1. **Approval riêng cho một phiên Website** ≤600 giây, một browser launch, read-only historical UI, credential reuse và verified-owned cleanup theo existing contract. Current source activation approval không đáp ứng scope đó.
2. Fresh integrity check active2/REV10/hardening/helpers/binaries; effective plan phải dùng independently derived250/16 pins và genuine approval. Không repin khi phát hiện drift.
3. Existing DEV identity/READ ONLY DB/pre-start/CORS/auth/READY gates phải đạt tại thời điểm chạy; nhập Website credential qua prompt cục bộ, không dùng DB/MQTT secrets.
4. Native close-before-shutdown và source/DB postchecks vẫn phải đạt. UNKNOWN thì báo trạng thái thật và không force-kill/retry.

Không thể tuyên bố Website/browser acceptance PASS từ offline tests. Live MQTT, SOIL calibration/quality, physical auto-irrigation và production migration không được nâng trạng thái bởi activation này. `SOIL_SENSOR_QUALITY_BLOCKED` giữ nguyên. Nếu cần rollback hai source sau này phải có scope riêng; không tự rollback trong phiên này.

## 9. Final verdict

```text
SMART AGRICULTURE — APPROVED SOURCE ACTIVATION
Authorization: APPROVED
Supervisor patch: APPLIED
Runtime patch: APPLIED
Strict hardening descriptor: VERIFIED
REV10 manifest: UNCHANGED
Raw REV10 source audit: EXPECTED_TWO_FILE_DRIFT
Effective source lineage: VERIFIED
Unchanged baseline sources: 248/248 PASS
Approved replacements: 2/2 PASS
Supplemental pins: PASS (16 helper pins)
Strict-lineage tests: 31/31 PASS
Strict-lineage integration: 8/8 PASS
Adapter/bridge integration: 90/90 PASS
Supervisor regressions: 83/83 PASS
Actual browser acceptance: NOT_EXECUTED
Website live attempts: 0/1
Edge/browser launches: 0
PostgreSQL/API/Frontend: NOT_STARTED
MQTT: NOT_CONNECTED
Pump ON/OFF: 0 ACTIONS
Automation: NOT_ENABLED
FINAL: SOURCE_ACTIVATION_COMPLETE
```

STOP. Không chuyển sang Website acceptance bằng approval hiện tại.
