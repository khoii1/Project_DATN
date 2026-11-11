# READY policy source bundle activation

06/11/2026, UTC+7. **READY_POLICY_SOURCE_ACTIVATION_COMPLETE**.

Đã áp dụng đúng bốn approved source replacements và tạo mới một descriptor từ exact candidate bytes. Bootstrap anchor là bước ghi cuối cùng. Installed-source verification đạt; regression đạt253/253 sau lượt supervisor chạy riêng, với một timeout-like failure ở lượt song song được giữ lại và ghi rõ bên dưới.

Không chạy Website, PostgreSQL/API/frontend, Edge/Playwright, MQTT hoặc phần cứng. Historical Website approval vẫn **1/1 consumed**.

## 1. Genuine approval và immutable anchors

Approval hiện tại:
`C:\Users\Acer Swift3\.codex\attachments\20aeb519-8e3b-472c-a1f8-928a877cb5df\Pasted text.txt`

SHA256: `193981193c082846b5e1b2878468fe699b5908a6931424492d3b55484481a8a1`.

Scope: four source replacements + one new descriptor, source-lineage checks và offline testing. Không lấy source activation permission làm quyền mở Website. Không tạo execution plan hoặc live attempt mới.

Machine-readable staged proposal SHA256 đã đối chiếu trước khi load candidates:
`44e23fafc45c61426528ce0dc2d242f4f61b0d5fa158e6967d4d0b41c328f8c0`.

Các anchors sau giữ nguyên:

| File/authority | SHA256 |
|---|---|
| REV10 manifest | `47e8072cdc0a711dd277c5468976b6deb0d297264b41b1ce83a02f6ebf72e3bb` |
| Historical supplemental document | `b3b51b7ad27f97e3b1bb3a2e1212b45739f8543a04638c232b124119465c462f` |
| Historical hardening descriptor | `4f336378455fc5bc7a9bb570d324e18cab6b43fe1c932842ba85e530728f3c07` |
| Approved Supervisor | `b7d62547db2b8bd10b49fcd82a33f98cdea7d6623177ea21e433396ba7a5e0b2` |
| Approved Runtime | `ad31e89eba5980c792c72a5afc4594ed8c8a89ade7f6195bf8678368664f1e83` |

API, Worker, source-contract, launcher, pinned tests, React frontend, firmware, database schema và historical authority documents không bị sửa. Không tạo REV11.

## 2. Private evidence và originals

Evidence directory:
`C:\DATN\Project_datn\build\ready-policy-activation-20261106-1`

Owner: `S-1-5-21-1432835263-483988321-3159128977-1001`. Protected DACL chỉ operator và SYSTEM FullControl. Không sửa ACL repository, production hoặc các target files.

Create-new backups đã kiểm tra exact old hashes:

- `bridge.cjs.original`
- `strict-lineage.cjs.original`
- `lineage-fs.cjs.original`
- `lineage-anchor.cjs.original`

Backups kế thừa chỉ operator/SYSTEM từ private directory. `before-write.json` lưu approval, before identities/SDDL/hash và write order. Từng artifact có create-new write-attempt/outcome riêng. Không xóa staged sources, originals hoặc failed-test evidence.

Các active target files có inherited repository DACL sẵn có; owner đúng operator và không reparse. Không tuyên bố source directory là protected storage chống mọi concurrent writer. Source readers/listeners đã được kiểm tra vắng mặt; runtime gates/hashes vẫn được giữ.

## 3. Mandatory pre-apply gates

| Gate | Kết quả trước source writes |
|---|---|
| Exact genuine source-activation approval | PASS |
| Proposal44e hash, exact four old hashes | PASS |
| Four candidate hashes + unified diffs | PASS |
| New descriptor candidate c634, destination chưa tồn tại | PASS |
| Owner/canonical/ACL/reparse | PASS qua actual Windows metadata và executor identities |
| REV10/b3/4f/Supervisor/Runtime immutable pins | PASS |
| Current actual effective source | `APPROVED_DELTA_VALID`, 248+2 |
| Current supplemental/runtime/browser/test pins | PASS, helpers16/runtime4/browser4/offline4 |
| Candidate projected bundle | `APPROVED_DELTA_VALID`, exact new helper authority |
| Independent source-only negative controls | **14/14 rejected as required** |
| Missing parent + wrong review-reference bytes | **2/2 rejected as required** |
| Targeted policy/source/lineage tests | **41/41 PASS**, native exit0 |
| Dedicated DEV source readers/processes và listeners55433/55001/55173 | Không có trước apply; rechecked trước từng write |

`before-proof.json` được tạo sau khi actual current authority và projected candidate authority đều PASS. Candidate core được compile từ bytes đã pin vào memory, không dùng mutable plan để cấp quyền. Phép chiếu map logical candidate paths sang physical staged files đã qua actual owner/stat/reparse checks; canonical logical path chỉ phục vụ projection, không giả artifact đã được cài.

Negative controls chặn: fifth/unapproved baseline source + plan repin; Bridge/policy helper bytes và helper-plan repin; runtime/browser repin; extra/missing source paths; unknown ownership; reparse/canonical mismatch; missing/changed descriptor; wrong parent; wrong source approval. Targeted41 còn chặn wrong old/new pair, wrong preparation provenance và extra update scope. Không bỏ qua strict authority hiện hành.

Ngay trước writes executor kiểm tra lại all250 expected source hashes, current16 helper hashes, immutable pins, runtime/offline/browser pins, candidate/diff hashes và target SDDL. Không gọi application hoặc supervisor trong thời gian bundle đang thay dở.

## 4. Actual five-artifact writes

Thứ tự: **new descriptor → Bridge → strict validator → filesystem adapter → bootstrap anchor**. Anchor cuối cùng chuyển selection sang authority mới khi các phụ thuộc đã có exact bytes. Không chạy tổ hợp half-applied.

| Target | Old SHA256 / backup | Actual installed SHA256 | Outcome |
|---|---|---|---|
| `scripts/frontend-acceptance/bridge.cjs` | `2c667c0b5a46389f9fee3494a0b1c07ad4e275d8538362c80c2b1c694c7cabbb` | `f09b5c89f8278e3c27d49067b7ffe25fdb759e808eb6a231ebb1d228b26d49d1` | APPLIED |
| `scripts/frontend-acceptance/strict-lineage.cjs` | `f7e81e63806b20fafe5fb608e63ba2a733a7bc034eb9fc3de89112f0b16cedba` | `2e9458917803299c554606b663bd8cbccc4cce2a6c50437bf7f2e9233a044ba1` | APPLIED |
| `scripts/frontend-acceptance/lineage-fs.cjs` | `e0e58acceeb6e8fc850f23173dbb217dd2c4df45e6a8813efde372b9449fee15` | `7648683938e3c4ddcc59073b6fd9e6adaf502d597305c93affc1658c9dc6f605` | APPLIED |
| `scripts/frontend-acceptance/lineage-anchor.cjs` | `2eb46c304a659725b554ecbd2cc900b7c993951618637d6a9e5d8f4c3285cc89` | `dcea627f8d6fbc4802be437a21cae1b429da722942bdf0788461eaa1d331c22a` | APPLIED, last source write |
| `docs/FINAL_FRONTEND_READY_POLICY_HARDENING_PINS.json` | Không tồn tại trước apply | `c634f044958c4684420d957c1adea23bed2d7e5125d4b05fdd757d2f4061c79d` | CREATED, create-new |

Mỗi source được ghi một lần. Sau từng write: SHA256/owner/canonical/no-reparse PASS; source SDDL bằng before SDDL. New descriptor identity/owner/hash được xác minh. **Source retries0; rollback0; partial writes0.**

Four approved diff hashes giữ nguyên:

- Bridge: `449ea78005f0fb1474b821eb9cef520c7f72dfd870cfdce2f067a40b4bee1766`.
- Strict core: `c71b31ad2d8b2d41a667ff9596cb98749a48c42579b1b33a4ccba3e3a8be8a63`.
- Filesystem adapter: `c83eab163812e939307747573065a1a4966efaffc3a4fc0bf25877245bde1c07`.
- Bootstrap: `87af576db73a30998e6daa7a928cf113ec2b4bf3e5280e6584c47de313b38204`.

Executor `apply-once.ps1` SHA256: `b8017250a0a14835101d2ff73a2c0920422fd29aacf0399638143951e664a672`; AST PASS, native PowerShell execution exit0. `writes-complete.json` và từng outcome lưu trạng thái thực tế.

## 5. Installed source-lineage proof

`verify.cjs after` chạy **không preload**, bằng installed core/fs/anchor và actual filesystem reads/Windows metadata:

- Effective source248+2 PASS, exact250 catalogue.
- New Bridge/core/fs/anchor và descriptor khớp exact approved hashes.
- New descriptor kiểm fixed old→new Bridge pair, preparation review reference và immutable parent4f; original hardening scope giữ nguyên.
- Supplemental16 helper hashes PASS; runtime4/browser4/offline4 PASS.
- Source-contract, historical b3/4f và other helpers/tests vẫn đúng authority tương ứng.
- Third/fifth-source và arbitrary helper-plan repin vẫn bị chặn;14 independent negative controls chạy lại sau apply đều từ chối.
- Independent PowerShell Get-FileHash: **282/282 MATCH**, native exit0.

**Raw REV10 source audit: EXPECTED_TWO_FILE_DRIFT**, chỉ Supervisor/Runtime đã được duyệt từ phase trước khác old baseline. Bốn READY-policy helpers không thuộc baseline250 mà thuộc supplemental authority. Không sửa raw auditor hoặc manifest để ép PASS. `final-integrity.json` ghi exact raw baseline differences và actual4 helper changes riêng.

Bootstrap mới là externally approved executable trust root; nó không tự chứng minh một arbitrary replacement chưa được review. Current activation approval đã chấp nhận exact dcea/c634 bundle; plan vẫn không chọn trust root hoặc repin ngoài phạm vi. Current preparation reference trong descriptor không cấp live execution permission.

## 6. Actual READY contract sau apply

Installed Bridge chấp nhận exact policy bảy trường:

```js
{
  commands: false, automation: false, testMode: true,
  maxRunSeconds: 1, mqtt: 'disabled',
  audit: 'DEV_MEMORY_ONLY', data: 'HISTORICAL_PHASE_Y'
}
```

Policy lấy từ AST của actual pinned API implementation; Worker `START_API` source branch được kiểm thử bằng dependency stub và chuyển nguyên metadata. Không thay API/Worker response hoặc dùng fake5-field fixture làm nguồn schema.

Missing/wrong audit/data, extra eighth field, unsafe commands/automation/MQTT/testMode/runtime, wrong types, fake ready=true và missing authority đều bị từ chối. Đây là **offline contract validation**, không phải live API/IPC/READY/browser proof.

## 7. Post-activation regressions và native exits

| Suite | Post-apply result | Native exit |
|---|---|---|
| Targeted actual-policy/source/lineage controls | **41/41 PASS** | 0 |
| Adapter/Bridge + lineage integration | **98/98 PASS** =90+8 | 0 |
| Strict-lineage unit/negative | **31/31 PASS** | 0 |
| Supervisor, first concurrent run | **82/83 PASS**,1 failure | **1** |
| Supervisor, isolated rerun, unchanged test/source/timeouts | **83/83 PASS** | **0** |
| Node syntax: installed helpers/contract and evidence harnesses | **8/8 PASS** | từng0 |
| PowerShell AST: launcher/native-host/credential-handoff/executor | **4/4 PASS**, zero parser errors | host0 |

Final distinct functional coverage: **253/253 PASS** (41+98+31+83). Không cộng các lượt rerun vào count, không xóa first failure.

### First-run supervisor failure

Test82, `AP launcher secure credential functions pass synthetic UTF8 data only through private stdin`, thấy child native status `null` thay vì0; duration8033ms, test `spawnSync` timeout được cấu hình8000ms. Ba suites khác đang chạy cùng lúc. Actual `error.code`/signal của child không được test gốc lưu, nên không kết luận chắc chắn CPU contention hoặc native crash là root cause.

Chạy lại **riêng** cả83 tests trên installed source, không fixture/candidate preload, không sửa assertions hoặc nâng timeout:83/83 PASS, exit0, tổng khoảng1.19giây. Đây là offline regression rerun do failure cần kiểm tra, không phải Website retry hoặc source-write retry. Native synthetic handoff failure không được che thành PASS trong log đầu.

Giới hạn còn lại: intermittent latency/native-child behavior ở lượt song song chưa được chẩn đoán đầy đủ. Không coi isolated PASS là bằng chứng lỗi Windows/native đã được sửa vĩnh viễn. Không mở thêm hạng mục hoặc chạy diagnostic/live session trong phase này.

### Exact sources loaded và fixture-only adaptation

- `fixture-preload.cjs` **không thay Module code hoặc require cache** của Bridge/core/fs/anchor. Node original loader đọc installed files; per-process `loaded-modules-*.json` ghi đường dẫn/hash và đã đối chiếu approved new hashes.
- Existing Bridge fake fixture5 fields được bổ sung audit/data từ actual API AST trong memory; chỉ fixture literal thay đổi, không sửa pinned test file/assertions.
- Lineage fake IO dùng candidate bytes có hash bằng installed bytes; installed filesystem proof ở phần5 chạy hoàn toàn không preload.
- Strict31 dùng verified historical preload cho original/partial Supervisor/Runtime fixtures, không restore source.
- `ready-policy-installed.test.cjs` giữ41 cases. Hai comparisons cần old Bridge/core đọc exact private originals có verified old hashes; integrity case kiểm approved new hashes thay expected old state. Diff được lưu ở `test-fixture-adaptation.patch`, không sửa pinned tests để ép PASS.
- Supervisor isolated83 không preload, import installed Supervisor/Runtime và chạy original assertions.

Coverage gồm trusted READY, credential UTF-8/redaction, read-only HTTP/WS, close-before-shutdown, native UNKNOWN/crash/timeout, no-retry/no-fallback, simulated19×5 matrix và legacy MANUAL. Không real browser/services trong tests này.

## 8. Evidence và giới hạn live

Artifacts trong private directory:

- `before-proof.json`, `extra-precheck.json`, `after-proof.json`.
- `before-write.json`, four originals, per-artifact attempts/outcomes, `writes-complete.json`.
- `preapply-targeted.tap`, `post-targeted.tap`, `post-integration.tap`, `post-strict.tap`.
- `post-supervisor.tap` (**first failure retained**) và `post-supervisor-isolated.tap`.
- `node-syntax.json`, `powershell-ast.json`, per-process module-load receipts.
- `independent-expected.json`, `independent-hashes.json`, `final-integrity.json`.

Không passwords/JWT/database contents trong evidence. Không đổi credentials, broker/ACL, database, firmware hoặc hardware. New source-validation objects chỉ chứa hashes/lineage, không có genuine/fake live execution approval hoặc attempt.

Source activation đã hoàn tất, nhưng historical Website vẫn BLOCKED, session **1/1 consumed**. Chưa xác minh real READY binding, Edge login,19 routes/95 responsive cells, charts/screenshots, browser native cleanup hoặc DB after-session digest với bundle mới.

Bước kế tiếp cần **Website execution approval mới, riêng**, nếu người dùng muốn thử lại. Trước đó phải fresh-check installed pins và existing DEV/preflight/READ ONLY/CORS/auth/READY gates. Không suy rằng sửa policy bảo đảm mọi UI/browser assertion sẽ PASS. Không tái dùng approval lịch sử hoặc browser slot chưa mở. SOIL quality/VERIFIED_LIVE/automation readiness không được nâng trạng thái bởi phase này.

## 9. Final verdict

```text
SMART AGRICULTURE — READY POLICY SOURCE ACTIVATION
Authorization: APPROVED
Bridge: APPLIED
Strict-Lineage: APPLIED
Lineage-FS: APPLIED
Bootstrap Anchor: APPLIED
New Hardening Descriptor: CREATED
REV10 manifest: UNCHANGED
Supervisor/Runtime: UNCHANGED
Effective source lineage: VERIFIED
READY seven-field contract: PASS
Third-source repin rejection: PASS
Targeted tests: 41/41 PASS
Integration tests: 98/98 PASS
Strict-lineage tests: 31/31 PASS
Supervisor regressions: 83/83 PASS (isolated; first82/83 failure retained)
Total functional tests: 253/253 PASS after isolated rerun
Source files modified: 4/4
New descriptor files: 1/1
Source write retry/rollback: 0/0
Website acceptance (historical): BLOCKED
Historical session attempts: 1/1 CONSUMED
New DEV sessions: 0
New browser launches: 0
MQTT commands: 0
Pump ON/OFF: 0
Automation enabled: NO
FINAL: READY_POLICY_SOURCE_ACTIVATION_COMPLETE
```

STOP sau source activation/offline verification. Không tự chuyển sang Website acceptance.
