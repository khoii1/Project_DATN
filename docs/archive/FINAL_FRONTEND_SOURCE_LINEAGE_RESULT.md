# Source-lineage integration — pre-apply result

06/11/2026. **SOURCE_LINEAGE_BLOCKED**. Phê duyệt đúng hai patch đã được xác nhận, nhưng mandatory lineage gate chưa đạt. **Không ghi vào hai active files**, không partial apply hoặc rollback.

## 1. Approval và ranh giới thực thi

Approval thật: attachment `88c3785e-466a-4027-989c-71d3e5ecdb22/Pasted text.txt`.

SHA256: `1e8d88d02f1f5066418746bae36c1f3a6bbd4c16df024b4d930b477f5f7b0dc8`.

Phạm vi: hai exact source replacements, offline verification; không Website execution. Điều kiện bắt buộc mục3/5 của yêu cầu là phải chứng minh đường lineage tương thích trước khi ghi; nếu cần overlay contract chưa được review thì STOP. Điều kiện này **chưa đạt**. Không phải thiếu phê duyệt lại hai patch.

Báo cáo trước đã đánh giá readiness chưa đủ chặt: có hash của approval reference chưa đồng nghĩa contract đã xác thực đúng hai cặp old→new. Pre-apply review này phát hiện khoảng trống trước khi source bị thay đổi.

## 2. Hashes thực tế

| Target | Original và actual final SHA256 | Approved candidate SHA256 | Status |
|---|---|---|---|
| `scripts/mvp-ui-only-supervisor.cjs` | `2ac398b3d654c2af2beb5bd8e5adabfbe18eeb24bccf7ca9d18562c3d9166e4b` | `b7d62547db2b8bd10b49fcd82a33f98cdea7d6623177ea21e433396ba7a5e0b2` | BLOCKED, unchanged |
| `scripts/mvp-ui-only-runtime.cjs` | `671f45fc7c4cc3e237a4035e2db950405c4412dba7bd28dfe60ff15f62c772bf` | `ad31e89eba5980c792c72a5afc4594ed8c8a89ade7f6195bf8678368664f1e83` | BLOCKED, unchanged |

Approved staged sources vẫn tồn tại tại:
`build/frontend-lifecycle-integration-4d13ea9ad1794ce0a1fd549f4fb63094/staged/scripts/`.

Hai unified diff giữ đúng hashes đã duyệt:

- Supervisor: `fa2a16d4794038bf44daa17a9d4cba146e99605233d0f4799c9b9900b93e78b8`.
- Runtime: `55a2038d5681a640d0cd2e271274363cd96eb1bff54b11cc5cdf9cac44b12a50`.

Supplemental pins file `docs/FINAL_FRONTEND_LIFECYCLE_SOURCE_PINS.json` đúng SHA256:
`b3b51b7ad27f97e3b1bb3a2e1212b45739f8543a04638c232b124119465c462f`.

Active REV10 baseline đúng SHA256:
`47e8072cdc0a711dd277c5468976b6deb0d297264b41b1ce83a02f6ebf72e3bb`.

Fresh verification:250 original source pins,4 runtime pins,4 offline-test pins,13 supplemental implementation/helper pins, supplemental test/handoff pins và4 Edge/Playwright pins đều khớp. Không drift ngoài phạm vi. Owner hai target đúng operator SID; source files dùng inherited DACL, không reparse ở target/canonical ancestors. Không sửa ACL hoặc tạo private backup storage.

## 3. Source-lineage findings

### A. Existing REV10 gate không có approved-delta path

`mvp-ui-only-pin-audit.cjs:auditPins()` so trực tiếp mọi source với `manifest.sourceHashes`. Khi **chỉ chiếu hai approved candidates trong memory**, đúng248 files còn khớp baseline và hai replacements khớp candidate hashes; nhưng actual REV10 audit vẫn từ chối bằng **SOURCE_DRIFT**. Không ghi projection vào filesystem.

Đây là hành vi đúng của raw baseline gate; không được bỏ qua hoặc sửa baseline JSON để ép PASS. Chưa có reviewed alternate authority cho effective source với đúng hai replacements.

### B. Staged contract chỉ xác minh reference/hash consistency

`frontend-acceptance/source-contract.cjs:validate()` kiểm tra hash của `sourceLineageApprovalFile`, các required flags,13 helper names/bytes theo plan và fixed browser pins. Nó chưa:

- Ràng buộc baseline manifest hash với danh sách effective sources.
- Nhận diện/giới hạn đúng hai authorized target paths và old→new pairs.
- Ràng buộc mutable plan hashes với exact approved supplemental pins document SHA.
- Từ chối một source thứ ba được plan tự repin đồng bộ với source bytes.

Outer staged supervisor kiểm tra source bytes khớp `plan.sourceHashes`, nhưng không kiểm tra plan đó chỉ khác baseline ở hai cặp được duyệt. Active launcher gọi `--check-plan` qua runtime; không có gate khác bổ sung ràng buộc này.

### C. Negative-control proof

Offline diagnostic dùng actual validators và virtual readSource map, không sửa contract/tests/source:

1. Baseline actual250 source bytes khớp REV10.
2. Project đúng hai staged replacements: raw REV10 gate trả SOURCE_DRIFT.
3. Staged validator chấp nhận synthetic plan có lineage-reference hash nhưng không có old→new mapping được xác thực.
4. Thêm **một thay đổi thứ ba giả lập** cho `frontend/src/App.tsx` trong memory, đồng thời repin synthetic plan: staged validator vẫn chấp nhận.

Kết luận: **LINEAGE_SCOPE_ENFORCEMENT_MISSING**. Đây là kiểm chứng thiếu machine-enforced scope, không phải tuyên bố production bị xâm nhập. Synthetic approval/plan chỉ tồn tại trong test memory, không dùng current approval để tự tạo quyền live, không lưu thành executable plan. Approval thật chỉ được ghi nhận provenance riêng.

Do đó **SOURCE_LINEAGE_VERIFIED không thể được cấp** với đường hiện tại. Không apply dù toàn bộ approved file hashes đều đúng.

## 4. Tests chạy trong phiên này

| Check | Actual result / scope |
|---|---|
| Existing adapter/bridge integration suite | **90/90 PASS**, native exit0; helpers thực + staged supervisor trong fake tests, không phải post-apply effective-source verification |
| Supervisor regressions | **83/83 PASS**, native exit0, chạy trên active supervisor vẫn nguyên bản |
| New lineage diagnostic | Native exit0 sau assertions chứng minh gap; verdict **BLOCKED**, không phải lineage PASS |
| Node syntax |5 files:2 active,2 candidates,diagnostic;0 failures |
| PowerShell AST |3 files:unchanged launcher,native host,credential helper;0 errors |
| Source/candidate/diff/helper/binary integrity | PASS |

Các90 tests trước chưa có negative control giới hạn old→new/third-source này; chúng PASS không thay thế mandatory lineage acceptance. Không sửa tests hoặc source ngoài phạm vi để ép PASS. Vì patch chưa apply, không tuyên bố đã kiểm thử effective replaced source sau apply.

Diagnostic lần đầu dừng do Node22 AssertionError message có kèm hash diff; chỉ sửa collector trong evidence để kiểm tra error code/prefix và mismatching hashes chính xác. Không mask native exit, không nới source gate. Các logs/kết quả thật nằm trong evidence bên dưới.

## 5. Evidence và các thao tác không thực hiện

Evidence mới:
`build/source-lineage-preapply-d42f7903cc494df4813c38506582f96d/`

- `filesystem-precheck.json` — actual hashes/owner/reparse.
- `lineage-probe.cjs`, `lineage-probe-result.json` — memory-only projection/negative controls, approval provenance.
- `integration-tests.tap`, `active-supervisor-regressions.tap` — actual test output.
- `offline-verification.json`, post-integrity receipt — scopes và final hashes.

Target writes0. Immutable backup/apply steps chưa được vào vì pre-apply lineage gate fail; không tạo backup mới của hai original files. Không partial replacement, retry hoặc rollback. Approved staged evidence cũ được giữ nguyên.

Không Edge/Playwright thật, Website/API/PostgreSQL startup, DB connection, MQTT, migration/seed/restore, DeviceCommand, ON/OFF, Automation, firmware/hardware hoặc credential prompt. Website attempt0/1 không đổi. Không suy runtime production flags hoặc hardware state từ offline tests.

## 6. Điều kiện cần để tiếp tục

Phê duyệt hai exact replacements hiện tại đã có. Việc còn thiếu là **review/authorization cho một validator lineage thực sự**, ngoài phạm vi hai approved candidates hiện tại:

1. Verify immutable REV10 baseline SHA và complete source set.
2. Bind authority với current genuine two-file approval và exact original/replacement hashes; allow đúng hai paths.
3. Bind exact supplemental pins document SHA và helper/binary values, không lấy arbitrary repins từ plan làm authority.
4. Verify248 baseline sources +2 approved replacements; reject third-file change, wrong old/new hash, extra/missing path, helper repin hoặc approval drift.
5. Nối cùng authority vào real launcher/check-plan và post-source validation. Báo rõ raw REV10 vs effective approved lineage; không gọi hai thứ là cùng một250/250 result.
6. Negative tests phải chứng minh projected approved replacements được nhận diện và unauthorized delta bị từ chối trước ghi/startup.

Các entry points cần review là `source-contract.cjs` và approved lineage path cho baseline audit/check-plan. Chưa tự sửa các file này hoặc tự chọn một execution-overlay/revision11 thay thế. Cần phạm vi phê duyệt riêng cho phần contract đó; không cần hỏi lại cùng nội dung phê duyệt hai exact patches nếu candidates không thay đổi.

Chỉ sau khi lineage contract đã được review và pre-apply tests đạt mới được vào backup/apply hai files. Live Website session vẫn cần approval riêng, fresh runtime safety/identity/CORS/auth/readonly gates và close-before-shutdown proof. Approval source integration hiện tại không bao gồm startup hoặc browser execution.

## 7. Final verdict

```text
SMART AGRICULTURE — SOURCE LINEAGE INTEGRATION
Authorization: APPROVED (conditional; two exact source patches)
Supervisor patch: BLOCKED
Runtime patch: BLOCKED
Supervisor SHA256: 2ac398b3d654c2af2beb5bd8e5adabfbe18eeb24bccf7ca9d18562c3d9166e4b
Runtime SHA256: 671f45fc7c4cc3e237a4035e2db950405c4412dba7bd28dfe60ff15f62c772bf
REV10 baseline: UNCHANGED
Effective source lineage: BLOCKED
Supplemental pins: PASS
Integration tests: 90/90 PASS (offline/staged scope)
Supervisor regressions: 83/83 PASS (unchanged active scope)
Browser adapter: BLOCKED for effective automated execution; offline core retained
Supervisor lifecycle bridge: BLOCKED (not activated)
Credential handoff: READY in existing offline-verified contract
Close-before-shutdown: BLOCKED for effective automated execution; staged tests PASS
Browser capability: VERIFIED (historical smoke)
Actual Website acceptance: NOT_EXECUTED
Website live attempts: 0/1
New browser launches: 0
Frontend source: UNCHANGED
Database/API/Frontend: NOT_STARTED
MQTT: NOT_CONNECTED
Pump ON/OFF: 0 ACTIONS
Automation: NOT_ENABLED
FINAL: SOURCE_LINEAGE_BLOCKED
```

STOP tại pre-apply gate, không tự harden contract hoặc chuyển sang Website acceptance.
