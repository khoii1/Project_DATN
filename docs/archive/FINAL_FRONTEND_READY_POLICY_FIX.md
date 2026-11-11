# READY policy contract fix — staged, not activated

06/11/2026, UTC+7. **READY_POLICY_FIX_READY_FOR_SOURCE_APPROVAL**.

Đã triển khai candidate Bridge kiểm tra đúng bảy trường, trích xuất policy từ actual API source, chạy regression bằng controlled module injection và chuẩn bị source-lineage proposal. **Không thay active source, không mở Website hoặc chạy lại phiên đã consume.**

## 1. Authorization và root cause

Current offline preparation request:
`C:\Users\Acer Swift3\.codex\attachments\765e707f-c586-4aa6-a96e-9dbb47b1d92a\Pasted text.txt`

SHA256: `364cb7448bf5fbdbb1a063c04b3f4bd0d7e7cda359b61c7fba83596de0cb4fa1`.

Phạm vi: staged implementation, regressions và lineage proposal. Không có source-activation hoặc Website execution permission trong request này.

Historical Website acceptance vẫn BLOCKED, attempt **1/1 consumed**. Lỗi lịch sử được ghi tổng quát ở gate `automated-browser`, chưa có assertion stack gốc. Offline test mới tái hiện được **source contract defect**: active old Bridge từ chối chính policy bảy trường trích xuất từ API, còn candidate chấp nhận. Không dựa vào việc đổi fake fixture rồi suy ra implementation đúng.

Actual policy chain:

1. `mvp-ui-only-api.cjs:startUIOnly()` tạo literal policy7 fields trong return value.
2. Nhánh `START_API` của `mvp-ui-only-worker.cjs` truyền nguyên `lifecycle.policy` tới Runtime.
3. Runtime đưa API object vào READY input.
4. Active Bridge dùng exact-object assertion với chỉ5 fields, nên hai metadata fields hợp lệ làm assertion từ chối.

Không cần sửa API, Worker hoặc runtime lifecycle. Functional patch duy nhất là một dòng trong **staged Bridge**. Ba authority candidates ở phần5 chỉ là proposal theo yêu cầu lineage, không phải thay đổi API/business logic hoặc active validator.

## 2. Actual API schema và verification độc lập

```js
{
  commands: false,
  automation: false,
  testMode: true,
  maxRunSeconds: 1,
  mqtt: 'disabled',
  audit: 'DEV_MEMORY_ONLY',
  data: 'HISTORICAL_PHASE_Y'
}
```

Actual API SHA256: `abc8f02183cbe510b49662d4031ea6efde2b92758457202e7b4ce9e326c9b96a`.

Actual Worker SHA256: `7ef4f085a18fa17e0c20a53b8db628a179f1d6af39fd5f3f37e0509d9258afd4`.

`policy-source.cjs` đọc actual files, đối chiếu SHA256 với immutable REV10 trước khi parse TypeScript AST. Nó tìm đúng return policy trong `startUIOnly`, chỉ chấp nhận unique literal property assignments (boolean/string/number); không import/start API hoặc load application/DB.

Worker test lấy **actual AST block** của nhánh `m.cmd==='START_API'`, thực thi block đó trong VM với `startUIOnly` dependency giả trả actual extracted policy. Kiểm tra object identity và đủ7 fields; Worker không được tự bỏ extra metadata. Đây là kiểm thử actual source branch với dependencies giả, **không phải Worker process/IPC/live SQL test**.

Fixture policy cũ không phải nguồn authority. Schema được trích từ pinned implementation rồi đối chiếu independently với expected literal7 fields.

## 3. Minimal Bridge diff

Active original assertion:

```js
assert.deepEqual(input.api.policy, {
  commands: false, automation: false, mqtt: 'disabled',
  maxRunSeconds: 1, testMode: true
});
```

Candidate thêm đúng `audit:'DEV_MEMORY_ONLY'` và `data:'HISTORICAL_PHASE_Y'` vào expected object, vẫn dùng `node:assert/strict` exact deep equality. Không partial matching, không xóa fields trước khi so sánh, không chấp nhận arbitrary extra keys hoặc giảm safety checks.

Staging/evidence folder:
`build/ready-policy-fix-20261106-1/`

| Artifact | SHA256 |
|---|---|
| Active Bridge, vẫn nguyên | `2c667c0b5a46389f9fee3494a0b1c07ad4e275d8538362c80c2b1c694c7cabbb` |
| `bridge.cjs` candidate | `f09b5c89f8278e3c27d49067b7ffe25fdb759e808eb6a231ebb1d228b26d49d1` |
| `bridge.cjs.patch`, unified diff −1/+1 | `449ea78005f0fb1474b821eb9cef520c7f72dfd870cfdce2f067a40b4bee1766` |
| `ready-policy.test.cjs` | `9d3e90160cf1496410c8822ac71b89cfc9742d0933f1835c4dd677942f504075` |
| `policy-source.cjs` | `3837b4ecb586c47153e61363e9f1ed12ebe2ffb528dc2369dfaab2e61446b070` |
| `candidate-preload.cjs` | `21965f7f22bfddb5e18aff4e254d1bda571afa3f8efde4f857b45b2977712d8b` |
| `staging-support.cjs` | `9d69e9393c8eed79e15d5ddbe5f3abc8d29f7bc67b060adb39625582eb31f86e` |

Không apply candidate vào `scripts/frontend-acceptance/bridge.cjs`.

## 4. Tests thực tế

| Suite | Kết quả thực thi | Native exit |
|---|---|---|
| New policy/source/lineage controls | **41/41 PASS** | 0 |
| Existing adapter + bridge regressions | **90/90 PASS** | 0, combined suite bên dưới |
| Existing lineage integration | **8/8 PASS** | 0, combined suite bên dưới |
| Combined adapter/bridge/lineage integration | **98/98 PASS** | 0 |
| Existing strict-lineage tests | **31/31 PASS** | 0 |
| Supervisor regressions | **83/83 PASS** | 0 |
| Node syntax, eight staged CJS files | **8/8 PASS** | từng exit0 |
| Existing launcher/native-host/credential-handoff PowerShell AST | **3/3 PASS**, zero parser errors | host0 |

**253/253 functional tests PASS** =41+98+31+83. Không cộng syntax hoặc rerun vào tổng.

New tests xác nhận:

- Exact actual seven-field policy PASS; active five-field validator từ chối policy đó.
- Five-field policy, missing/wrong/undefined audit hoặc data, field thứ8 và extra symbol key bị BLOCK.
- Commands/automation bật, MQTT khác disabled, testModefalse, runtime0/2/string và string boolean bị BLOCK.
- Null/undefined/array/string/number/boolean policy bị BLOCK.
- Actual Worker branch forward object nguyên vẹn; không normalize/bỏ unknown metadata để vượt Bridge.
- `ready:true` không thay được structured CORS/auth hoặc owned/native binding.
- Candidate lineage chấp nhận exact projected bundle; current active lineage vẫn từ chối new Bridge chưa được duyệt activation.
- Wrong old/new/review reference, extra scope, missing update, parent tamper, third-source/helper repin và self-issued plan trust root đều bị BLOCK.

### Controlled injection và giới hạn

`candidate-preload.cjs` nạp staged Bridge/authority candidates trong test process dưới original module identity; không ghi active files. Existing bridge tests chứa policy5 fields trong fixture: chỉ literal fixture đó được thay trong memory bằng actual extracted policy. Fake `startAPI` fixture được bổ sung hai metadata fields từ actual API schema, giữ nguyên năm safety values và mọi test assertions. Không sửa assertions để bỏ qua lỗi.

Memory-only lineage IO chiếu cả candidate sources và descriptor/bootstrap tương ứng, không nói current authority đã cho phép Bridge mới. Strict31 dùng thêm historical fixture preload đã được hash-review từ source activation để mô tả baseline/partial replacement bằng exact archived old2 bytes; không rollback active files.

Supervisor83 giữ MANUAL behavior và gates. Adapter90 kiểm tra credential security, read-only HTTP/WS, one-launch/no-retry, close barrier/native UNKNOWN và simulated95-cell traversal. Không browser thật, không screenshots nghiệm thu hoặc live READY trong các tests này.

Evidence: `ready-policy.tap`, `integration.tap`, `strict-lineage.tap`, `supervisor.tap`, `node-syntax.json`, `powershell-ast.json`, `source-and-evidence-hashes.json`, `active-integrity.json`.

## 5. Verified supplemental-lineage proposal

**Không thể chỉ copy Bridge mới rồi repin execution plan.** Active authority đúng thiết kế sẽ BLOCK vì b3 pin vẫn trỏ old Bridge và current hardening descriptor không cấp Bridge delta.

Đã chuẩn bị riêng proposal bundle trong staging, chưa áp dụng:

1. New descriptor candidate `FINAL_FRONTEND_READY_POLICY_HARDENING_PINS.json`: giữ historical hardening approval/replacements, thêm exact `readyPolicyUpdate` với old/new Bridge pair, fixed preparation-review reference và exact parent4f descriptor hash. Purpose ghi rõ source review, không live approval.
2. Strict-core candidate: chỉ khi trusted descriptor có exact update đã pin mới áp dụng Bridge helper pair; xác minh preparation reference bytes/hash, old Bridge pin và unchanged parent hardening scope. Không nhận authority từ execution plan, không thêm source thứ ba vào baseline250.
3. Filesystem adapter candidate: chỉ bổ sung đường dẫn parent descriptor và current preparation reference vào readonly ownership/stat catalogue để verifier đọc được các provenance files mới. Không đổi metadata PowerShell query, timeout hoặc native error handling.
4. Bootstrap candidate: trỏ tới **new descriptor path/hash**, giữ old descriptor file nguyên trạng. Giữ external-bootstrap SHA review requirement; descriptor không tự pin chính anchor của nó.

| Proposed active path | Old SHA256 | Candidate SHA256 |
|---|---|---|
| `scripts/frontend-acceptance/bridge.cjs` | `2c667c0b5a46389f9fee3494a0b1c07ad4e275d8538362c80c2b1c694c7cabbb` | `f09b5c89f8278e3c27d49067b7ffe25fdb759e808eb6a231ebb1d228b26d49d1` |
| `scripts/frontend-acceptance/strict-lineage.cjs` | `f7e81e63806b20fafe5fb608e63ba2a733a7bc034eb9fc3de89112f0b16cedba` | `2e9458917803299c554606b663bd8cbccc4cce2a6c50437bf7f2e9233a044ba1` |
| `scripts/frontend-acceptance/lineage-fs.cjs` | `e0e58acceeb6e8fc850f23173dbb217dd2c4df45e6a8813efde372b9449fee15` | `7648683938e3c4ddcc59073b6fd9e6adaf502d597305c93affc1658c9dc6f605` |
| `scripts/frontend-acceptance/lineage-anchor.cjs` | `2eb46c304a659725b554ecbd2cc900b7c993951618637d6a9e5d8f4c3285cc89` | `dcea627f8d6fbc4802be437a21cae1b429da722942bdf0788461eaa1d331c22a` |

New descriptor candidate SHA256:
`c634f044958c4684420d957c1adea23bed2d7e5125d4b05fdd757d2f4061c79d`.

Proposed future destination: `docs/FINAL_FRONTEND_READY_POLICY_HARDENING_PINS.json` — **chưa tồn tại ở active docs**. Candidate chỉ nằm trong staging folder.

Authority unified diff hashes:

- Strict core: `c71b31ad2d8b2d41a667ff9596cb98749a48c42579b1b33a4ccba3e3a8be8a63`.
- Filesystem adapter: `c83eab163812e939307747573065a1a4966efaffc3a4fc0bf25877245bde1c07`.
- Bootstrap: `87af576db73a30998e6daa7a928cf113ec2b4bf3e5280e6584c47de313b38204`.

Machine-readable proposal: `build/ready-policy-fix-20261106-1/proposal.json`, SHA256 `44e23fafc45c61426528ce0dc2d242f4f61b0d5fa158e6967d4d0b41c328f8c0`.

Proposal compatibility PASS bằng controlled in-memory projection; chưa nghiệm thu installed future bundle/OS metadata sau activation. Current preparation reference chứng minh nguồn của candidate review, **không giả là source-activation approval**. Future operator phải duyệt exact whole bundle trước khi tin bootstrap mới; execution approval vẫn là quyền riêng.

## 6. Active integrity và safety

Independent readonly check sau tests: actual active lineage vẫn `APPROVED_DELTA_VALID` theo authority cũ, 248 unchanged baseline +2 approved Supervisor/Runtime, helpers16. Không thay source để chạy tests.

- Active REV10: `47e8072cdc0a711dd277c5468976b6deb0d297264b41b1ce83a02f6ebf72e3bb`, unchanged.
- Active Supervisor: `b7d62547db2b8bd10b49fcd82a33f98cdea7d6623177ea21e433396ba7a5e0b2`, unchanged.
- Active Runtime: `ad31e89eba5980c792c72a5afc4594ed8c8a89ade7f6195bf8678368664f1e83`, unchanged.
- Active Bridge và active core/fs/anchor còn đúng old hashes ở phần5.
- Historical b3 supplemental document và4f hardening descriptor unchanged.
- API/Worker unchanged, không sửa response để hợp fixture.
- Không tạo/kích hoạt REV11, live plan, attempt marker mới hoặc operator attestation.
- New DEV sessions0, browser launches0, DB/API/frontend/MQTT/pump actions0. Không migration/seed/restore, credentials hoặc firmware changes.
- Không dùng tests offline để nâng SOIL quality, VERIFIED_LIVE hoặc real-browser acceptance.

## 7. Activation requirements và bước tiếp theo

Cần **source-lineage activation approval mới** cho exact four candidate paths và new descriptor ở phần5. Source approval phải nêu rõ giữ immutable REV10/b3/4f, không thay API/Worker/Supervisor/Runtime, không coi approval này là Website execution.

Khi được duyệt: fresh-check exact old hashes, owner/ACL/reparse và candidate/diff hashes; lưu originals/evidence; apply đúng scope; verify installed authority + Bridge và regressions. Không dùng mutable plan để repin nếu gặp drift, không dùng half-applied bundle để chạy Website.

Sau activation thành công mới cần **Website approval mới riêng**. Historical session đã consume1/1; browser0/1 không cho quyền tái dùng session. Real trusted READY, Edge login, routes19/cells95, charts/screenshots/native cleanup và DB postchecks vẫn chưa được nghiệm thu. Không khẳng định sửa policy đồng nghĩa mọi browser/UI checks sẽ PASS.

## 8. Final verdict

```text
SMART AGRICULTURE — READY POLICY FIX
Historical Website acceptance: BLOCKED
Historical Website attempts: 1/1 CONSUMED
API policy fields: 7
Bridge expected fields before fix: 5
Policy contract fix: PREPARED
Actual API schema validation: PASS (pinned source AST)
Seven-field policy regression: PASS
Unsafe policy rejection: PASS
Strict lineage compatibility: PASS (candidate projection; current authority still blocks unapproved Bridge)
Adapter/bridge tests: 90/90 PASS
Lineage integration: 8/8 PASS
Strict-lineage tests: 31/31 PASS
Supervisor regressions: 83/83 PASS
Additional targeted controls: 41/41 PASS
Total functional tests: 253/253 PASS
Staged source SHA256: f09b5c89f8278e3c27d49067b7ffe25fdb759e808eb6a231ebb1d228b26d49d1
Staged patch SHA256: 449ea78005f0fb1474b821eb9cef520c7f72dfd870cfdce2f067a40b4bee1766
Active REV10: UNCHANGED
Active Supervisor/Runtime: UNCHANGED
Active pinned Bridge: UNCHANGED
New browser launches: 0
New DEV sessions: 0
Database/MQTT/pump: NOT_STARTED
FINAL: READY_POLICY_FIX_READY_FOR_SOURCE_APPROVAL
```

STOP sau staging/tests/proposal. Không activation hoặc live retry.
