# Phase AJ — Independent Hash-Only Native Process Diagnostic Preparation

Ngày báo cáo: 03/11/2026, UTC+7. **IMPLEMENT + OFFLINE SYNTHETIC TESTS ONLY.** Không thực thi diagnostic thật hoặc resume AH.

## A. AH/AI evidence và baseline

Kế thừa [AH](MVP_PHASE_AH_UI_ONLY_ACCEPTANCE.md), [AI](MVP_PHASE_AI_OFFLINE_DIAGNOSIS.md), [AG](MVP_PHASE_AG_RUNTIME_PIN_REMEDIATION.md) và [AE](MVP_UI_ONLY_SUPERVISOR_PREPARATION.md). AH vẫn BLOCKED; native boundary **UNDETERMINED**. AI ghi WER powershell.exe/ntdll.dll/c0000005 cùng cửa sổ AH, nhưng thiếu PID relationship, không phải root-cause confirmation.

Trước implementation AJ, read-only source review xác nhận active UI manifest revision4 SHA256:

`b0c8974c6c4244652951963cae28f4eb9d56f07a562de9e32df6c5e16a015d56`

250/250 source hashes và 4/4 binary hashes khớp; không cập nhật baseline. Exact PowerShell executable SHA256 cũng khớp historical R pin. Không gọi `preflight()` hoặc AJ target để thực hiện review này.

Y twelve stored readings, AG corrected postgres pin, AI six-path readonly coverage và persisted ActivityLog comparison giữ nguyên. Không đọc/sửa DB hoặc nâng soil quality.

## B. Diagnostic architecture

```text
Operator's PowerShell launcher (holds observer Process handle)
  -> independent Node observer (holds outer ChildProcess handle)
     -> dedicated PowerShell -File host (holds target Process handle)
        -> Node target.cjs --approved-run <private-run>
           -> read-only filesystem hashing only
```

Node chạy file JavaScript trực tiếp, không dùng literal `-File` switch của PowerShell. Không inline here-string/stdin source transport như AH; không gọi Phase R `--node-preflight`.

Không node nào tự chứng nhận native exit của chính nó: parent ghi exit từ handle. Observer outcome để `observerNativeExit=AWAITING_LAUNCHER_HANDLE`; launcher ghi independent observer native exit riêng. Full PASS còn cần tool completion được đối chiếu, không chỉ outcome.json.

## C. Source implementation

Thêm năm runtime files riêng, một test và một source-pin set; không wire vào UI-only hoặc production:

| File | Vai trò |
| --- | --- |
| scripts/mvp-hash-diagnostic-policy.cjs | Approval schema, exact source/runtime pins, canonical/private-run lineage validation; import không IO |
| scripts/mvp-hash-only-target.cjs | Pure/injected hash checker và gated future target entry |
| scripts/mvp-hash-diagnostic-outer.ps1 | Một Node target; giữ handle, native PID/exit, filtered target-result verification |
| scripts/mvp-hash-diagnostic-observer.cjs | Một outer PS; spawn/exit/error/deadline evidence, one-shot adapter và chain classifier |
| scripts/mvp-hash-diagnostic-once.ps1 | Private plan gate, create-new run/approval consumption, launch observer một lần, giữ observer native exit |
| scripts/mvp-hash-diagnostic.test.cjs | Fake filesystem/processes, source graph, AST và fake .NET handle tests |
| docs/PHASE_AJ_NATIVE_DIAGNOSTIC_SOURCE_PINS.json | Separate source pins, không là approval |

Tái sử dụng **unchanged** pure classifier `mvp-ui-native-boundary.cjs` từ AI. Adapter native học theo reviewed R/native-exit pattern nhưng cần spawn callback riêng; không sửa helpers R hoặc source AI. Không patch node_modules hoặc thay binaries.

## D. Process ownership / native exit contract

- Launcher kiểm tra exact operator SID `S-1-5-21-1432835263-483988321-3159128977-1001` và private ACL trước tạo run. `UseShellExecute=false`, exact executable path, source/binary pins và closed environment.
- Observer phải có actual `process.ppid` khớp launcher receipt. Outer native spawn event ghi actual PID, parent observer PID và timestamp; giữ direct ChildProcess handle.
- Outer kiểm tra operator SID, run ACL/reparse, own `$PID` khớp outer-start record; một .NET Process handle ghi actual Node PID, parent `$PID`, start/end UTC, OS `StartTime` và `ExitCode`.
- Launcher ghi observer PID/parent/start/OS StartTime/end/actual `ExitCode` từ held .NET Process handle. Không suy native exit từ stdout.
- Handle-created lineage là ownership basis; không tra cứu tiến trình theo PID cũ rồi kill. OS process-owner lookup cho mọi tầng chưa được chạy thật; future NTFS/SID/native relationship checks phải đạt.
- Node target chỉ xuất filtered hash result/PID/parent; PS đối chiếu actual held PID/parent/counts/revision. JSON hợp lệ không thay native code: target exit3 vẫn là3, access-violation code vẫn giữ nguyên trong native artifact.
- Outer propagate known target nonzero, launch failure3, timeout/unknown4, invalid-result3. Observer own policy exit3/4 phân biệt với outer native code lưu riêng. Launcher propagate actual observer code; không rewrite success.

Classification API `classifyChain(evidence)` phân biệt:

```text
NODE_TARGET_NATIVE_FAILURE_CONFIRMED
POWERSHELL_OUTER_NATIVE_FAILURE_CONFIRMED
OBSERVER_NATIVE_FAILURE_CONFIRMED
TOOL_HOST_FAILURE_CONFIRMED
ALL_OBSERVED_NATIVE_EXITS_ZERO
NATIVE_FAILURE_BOUNDARY_UNDETERMINED
```

CONFIRMED cần independent completion và parent linkage phù hợp; label nonzero boundary không tự chứng minh crash/root cause. Missing PID, parent mismatch, observer own exit thiếu, tool linkage thiếu hoặc timeout giữ UNKNOWN. Wrapper policy exit4 sau target timeout **không** bị gọi là outer native fault confirmation.

## E. Hash-only target / safety boundary

Target import graph: built-in fs/path/assert và local policy; policy chỉ dùng fs/path/crypto/assert. Không import UI runtime, PostgreSQL helpers, child_process, Prisma, dotenv, backend, MQTT, HTTP hoặc browser. Không filesystem access khi import; pure checker chỉ chạy với explicit call.

Future real target:

1. Verify exact revision4 manifest hash và revision3 snapshot lineage.
2. Verify 250 entries, hash format, canonical paths, duplicate/traversal/reparse và source bytes.
3. Đọc pinned runtime source **như text**, parse riêng `SCRIPTS`/`RUNTIME` declarations; không eval hoặc require runtime. Membership gồm explicit script set và backend/src/frontend/src như contract hiện hành.
4. So runtime constants với manifest và hash exact bốn executable files, không execute chúng.
5. Xuất filtered status/counts/revision/hash/PID/parent. Không raw environment/argv/error content/credential.

Parser cố ý chấp nhận đúng declaration format đã review; source declaration thay đổi sẽ fail closed, không tự cập nhật hashes. Không gọi actual target/checker bằng real filesystem trong AJ. Tests chạy source checker với fake filesystem và synthetic binary bytes; ordinary source-integrity/hash reviews không phải real AJ target execution.

## F. Approval / private-run schema

Future PlanFile phải có **đúng** các fields sau, không extra fields chứa secrets:

| Field | Contract |
| --- | --- |
| version | 1 |
| scope | ONE_HASH_ONLY_NATIVE_BOUNDARY_DIAGNOSTIC |
| approved | Boolean true, chỉ sau genuine fresh user approval |
| maxAttempts | 1 |
| noRetry | Boolean true |
| operatorSid | Exact operator SID ở D |
| expiresAt | Future UTC, tối đa24h |
| manifestSha256 | Exact revision4 hash ở A |
| sourcePinSetFile | C:\DATN\Project_datn\docs\PHASE_AJ_NATIVE_DIAGNOSTIC_SOURCE_PINS.json |
| sourcePinSetSha256 | Exact separate pin-set hash ở I |
| userApprovalFile | Genuine new approval evidence path, không credentials |
| userApprovalSha256 | SHA256 của evidence thật |

Reject AH/AF/AI/AJ-preparation attachments như execution approval. JSON boolean không tự là quyền người dùng; source pin set có purpose `AJ_SOURCE_PINS_ONLY_NOT_EXECUTION_APPROVAL`, không approved=true.

Future launcher nhận existing private PlanFile và private parent: owner operator, protected DACL duy nhất operator FullControl, no reparse. Dùng existing private TEST root `C:\DATN\test-instances\phase13-3b`; không tạo/start cluster. Fresh run factory chỉ tạo `hash-only-native-<milliseconds>-<hex>` với protected operator-only DACL, verify lại sau tạo. Không đổi ACL root/PGDATA/production.

Create-new consumption marker `hash-only-approved-<approvalSHA256>.attempt.json` gắn exact run; approval copy/launcher receipt nằm trong run, observer-attempt create-new trước spawn outer. Copy/rename plan không tạo lượt mới. Không overwrite/delete evidence; không credentials trong artifacts. AJ không tạo actual plan/run/marker; fake approvals/attempts chỉ nằm trong synthetic fixtures.

## G. Timeout / no-retry handling

- Target process wait25s; bounded output drain tối đa2×1s sau native exit.
- Observer outer deadline40s.
- Launcher observer wait45s.
- Deadline outcome code null/UNKNOWN, không child thứ hai, fallback, kill hoặc retry. Late native exit không đổi outcome đã ghi thành PASS.
- Disposal chỉ đóng owned process handle, không termination. Unknown/timeout có thể để child còn chạy; giữ evidence và operator review, không giả cleanup PASS.

Filesystem/security/source-validation calls vẫn chịu khả năng OS blocking; native deadlines không phải OS-level watchdog cho mọi filesystem call. Launcher wait hữu hạn bảo đảm không tự coi một observer chưa kết thúc là success.

## H. Synthetic tests / native results

Final **201/201 PASS**, fail/skipped/cancelled0, Node runner native exit0, signal/error null:

- **43 AJ tests**: import graph/no IO on import, synthetic 250/4 checks, source/revision/path/hash/approval drift, scope/expiry/owner/secret-field rejection, each native failure boundary, tool/native mismatch, incomplete evidence, fake launch failure, timeout/late exit, policy-exit4 unknown handling, duplicate-attempt/no retry, no secret reflection.
- **158 related AI/AE/AG/preflight regressions** giữ PASS.
- PowerShell parses both real source files by AST, extracts only `Invoke-HashTargetHandle`, invokes it with **fake objects**, checks exit0/3/abnormal, timeout, launch failure, invalid JSON/PID, dispose/start count. Không execute outer/launcher main hoặc real target.
- Native Node adapter tested bằng injected EventEmitter ChildProcess; không native PS/Node diagnostic spawn.
- Node syntax bốn new JS/test files native0. PowerShell AST PASS. Không thay TypeScript/domain files; không chạy lại unrelated system acceptance hoặc typecheck đã PASS ở AI.

```powershell
node --require ./scripts/acceptance-offline-guard.cjs --test --test-concurrency=1 --test-reporter=tap scripts/mvp-hash-diagnostic.test.cjs scripts/mvp-ui-ai.test.cjs scripts/mvp-ui-only-pin-audit.test.cjs scripts/mvp-ui-only-supervisor.test.cjs scripts/mvp-ui-only.test.cjs scripts/mvp-ui-launcher-exit.test.cjs scripts/mvp-edge-smoke-observer.test.cjs scripts/mvp-edge-smoke-analysis.test.cjs scripts/mvp-browser-startup-diagnosis.test.cjs scripts/mvp-preflight-boundary.test.cjs
```

Evidence: `build/phase-aj-acceptance-1793646129258/{regression.tap,stderr.txt,outcome.json,source-pins-review.json}`. TAP SHA256 `fa34a0ec76f90261e57b94ebec6c9a7ff0f4c751d4c5d8bf87cdaae3d5eae165`; stderr rỗng. Prior offline199-test run giữ riêng tại `build/phase-aj-offline-1793645766781`; final added case prevents timeout policy exit4 misclassification, không sửa baseline để vượt execution failure.

Intermediate200-test evidence giữ tại `build/phase-aj-final-1793645899530`; lượt cuối thêm malformed observer/outer PID rejection trước khi chốt pins. Cả ba lượt là offline tests, không real diagnostic attempt hoặc retry AH.

## I. Exact source SHA256 pins

Separate pin set SHA256:

**`5c7165d76a01f371635950a4365a728ff01c94f98724b843859670502582ab94`**

| Source | SHA256 |
| --- | --- |
| mvp-hash-diagnostic-policy.cjs | 605d18784b43eaa602e2af6043c4f4a1d537e81d20650d81d99b419bf5aa9200 |
| mvp-hash-only-target.cjs | b2f96e2c775825fa77b9810f4319f75182e365124a56fa863d92bb402bbf2aca |
| mvp-hash-diagnostic-observer.cjs | b7c796ccec7395563ae4a5817de2d8b2d0a73a50ba6a657a5584f7f23895ee35 |
| mvp-hash-diagnostic-outer.ps1 | e973e0190d53521c6126984a5c81a8e8e496b135e8ca92a79f64360f8285b88e |
| mvp-hash-diagnostic-once.ps1 | b0d9037dfaad57d60f640d276ce61172f25b0134f697f89b17a042304e7d4121 |
| mvp-ui-native-boundary.cjs — reused unchanged | b2f6206df966fe0de10c8616e76ae17be6335244888356c9bbdb52cd9acfffd5 |
| mvp-hash-diagnostic.test.cjs — offline test | 28c1f30933478ca99406ad94f292333d146d9bd6651cf34e5d36e5174d28b0f5 |

Execution binary pins: Node `fdddbf4581e046b8102815d56208d6a248950bb554570b81519a8a5dacfee95d`; PowerShell `60c9b29843624dd8af6b6a7b26147753be6aeef65098b9a503cc50850afe410f`. Pin-set sources/self-referencing hash không tạo vòng: pin set không chứa hash của chính nó; approval tương lai pin exact file hash bên ngoài.

## J. Manifest compatibility

**UI-only revision4 UNCHANGED_VERIFIED**: exact bytes/hash ở A không đổi, 250members không đổi; source hashes/binaries kiểm tra đầu phiên và related filesystem regression đều PASS. Không tích hợp AJ vào active UI runtime, không tăng revision, không sửa PostgreSQL pin đã nghiệm thu AG.

Không sửa source AI hoặc báo cáo AH thành PASS. New diagnostic files được quản lý riêng; approval AH không áp dụng cho tool mới. Không sửa tám identities/12readings hoặc startup production.

## K. Remaining limitations / verdict

Không chạy real target, outer host, observer hoặc launcher main. Future Windows native handles, owner/ACL factory, file parser against actual baseline, process startup/cleanup compatibility chưa nghiệm thu end-to-end. Tests đảm bảo logic offline, không chứng minh actual native stability hoặc chữa access violation.

`-File`/file-source transport khác cơ chế stdin AH. Một lần file-based diagnostic thành công chỉ chứng minh lần đó, không root cause của AH hoặc lỗi đã hết vĩnh viễn. Không OS-level network isolation/packet-capture claim; target source import graph không có network behavior. Operator/admin tampering và hash-to-open races không bị loại trừ tuyệt đối bởi file pins/NTFS.

```text
PHASE AJ RESULT

Hash-only target: PREPARED_PASS
PowerShell outer: PREPARED_PASS
Independent observer: PREPARED_PASS
Native exit propagation: OFFLINE_PASS
Offline tests: 201/201 PASS
Diagnostic source hashes: VERIFIED
UI-only manifest rev4: UNCHANGED_VERIFIED
Actual hash-only diagnostic: NOT_EXECUTED
PostgreSQL DEV: NOT_STARTED
API / Frontend: NOT_STARTED
Browser: NOT_EXECUTED
MQTT CONNECT: 0
DeviceCommand / ON/OFF: 0 actions by Agent
Automation: NOT_ENABLED
Soil quality: BLOCKED
Final: READY_FOR_ONE_SHOT_NATIVE_DIAGNOSTIC_APPROVAL
```

## L. Exact future one-shot procedure — NOT EXECUTED

1. Có **approval mới** scope `ONE_HASH_ONLY_NATIVE_BOUNDARY_DIAGNOSTIC`, pin exact source-pin set SHA256 ở I, UI manifest4 hash ở A, Node/PS paths/pins, operator SID, một attempt/no retry. Không reuse AH hoặc AJ preparation.
2. Sau approval, tạo một private PlanFile create-new với schema F tại existing private operator-only directory; verify owner/protected DACL/reparse. Không ghi secrets. Không tạo trong AJ.
3. Chạy đúng một lần:

```powershell
& 'C:\DATN\Project_datn\scripts\mvp-hash-diagnostic-once.ps1' -PlanFile '<NEW_PRIVATE_APPROVED_PLAN_JSON>'
```

4. Launcher revalidates approval/source/binary/manifest/NTFS rồi consume approval và tạo run. Observer → PS `-File` → Node file target, mỗi tầng một process; không dùng `--node-preflight`, startup hoặc MQTT.
5. Đọc `target-native-exit.json`, `outer-native-exit.json`, `observer-native-exit.json`, launcher receipt, spawn/attempt/outcome và actual linked tool completion. Verify parent/PID/start/native code/signal/error/timeout. Chỉ classify full success khi đủ independent native exits và tool completion; không dựa vào stdout/outcome alone. Kết quả success duy nhất của phiên đó là `HASH_ONLY_NATIVE_DIAGNOSTIC_PASS`.
6. Nếu fail/unknown: STOP, không retry/kill/fallback. Preserve artifacts và phân loại ownership/outcome thực tế. Không chuyển sang UI-only dù diagnostic PASS; UI acceptance vẫn cần phạm vi phê duyệt riêng.

Rollback source nếu cần review chỉ là bỏ integration/proposal của AJ và invalidate pin set; hiện không có integration vào UI/runtime hoặc dữ liệu để rollback. Không xóa evidence hay thực hiện rollback trong phase này.

**STOP sau AJ. Không thực hiện procedure này trước phê duyệt riêng.**
