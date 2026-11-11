# Phase AK — Approved One-Shot Hash-Only Native Boundary Diagnostic

Ngày báo cáo: 03/11/2026, UTC+7.

**Final session verdict: HASH_ONLY_NATIVE_DIAGNOSTIC_OUTCOME_UNKNOWN.** Approved diagnostic chain có independent native exits0 ở tất cả các tầng; một **invocation hậu kiểm khác** lại trả `0xC0000005`. Dừng, không retry. Không đồng nhất hai invocation hoặc sửa artifacts để che bất thường.

## A. Actual approval / scope

User-provided Phase AK attachment: `417fa729-b11f-4ea0-8ffc-ca0010c4e760/Pasted text.txt`.

Actual approval SHA256:

`ec70cf2998ec99d75fa1cd636eeacec1d426a9ca16ffa27a9c184c5d9f0f4eba`

Scope **ONE_HASH_ONLY_NATIVE_BOUNDARY_DIAGNOSTIC**, max1/no retry. Quyền là approval AK thật; không dùng AH/AI/AJ preparation hoặc manifest như authorization. Không hỏi lại approval cùng phạm vi.

## B. PlanFile / private-run identity

Private plan directory:

`C:\DATN\test-instances\phase13-3b\hash-only-plan-1793646771950-a5cac817e7fa`

- `user-approval.txt`: exact byte copy của attachment AK, hash khớp A.
- `approval-provenance.json`: origin path/hash, copy hash, actual UTC creation, operator SID và PlanFile hash; không fabricated platform metadata.
- `plan.json`: exact12fields AJ; version1, approved=true từ genuine approval, maxAttempts1, noRetrytrue, exact hashes, operator SID, expiry **2026-11-02T19:42:52.0507158Z** (30 phút sau tạo theo actual clock).
- Plan SHA256 `6f2e5507868aedd26c7d6adc58016a2661a0e99c8fc69ac1d9b709878850e662`.

Plan directory và từng file mới: owner operator, protected operator-only FullControl DACL, no reparse, create-new. Không sửa ACL parent hoặc PGDATA.

Launcher tạo fresh run:

`C:\DATN\test-instances\phase13-3b\hash-only-native-1793646806048-57cd748a21d6`

Run owner SID `S-1-5-21-1432835263-483988321-3159128977-1001`; protected DACL, duy nhất operator FullControl. Existing runtime artifact files kiểm tra sau execution cũng chỉ có operator FullControl. File evidence mới kế thừa private ACL; không tuyên bố từng runtime file có protected DACL riêng.

## C. UI manifest revision4 verification

Pinned manifest SHA256:

`b0c8974c6c4244652951963cae28f4eb9d56f07a562de9e32df6c5e16a015d56`

Pre-execution checks native exit0: revision4/version1/purpose, 250/250 source hashes, source path scope/canonical/reparse/duplicate checks và exact revision3 lineage. Revision3 snapshot SHA256 `9dba4f40586e31db45f8fac63147d71875bb6260d8a66fa75df9b656460cbc8a` khớp.

Actual target sau đó trả **HASH_CHECKS_PASS / revision4 / sourceCount250 / runtimeCount4**; Node native exit0 từ parent handle. Pinned target code kiểm tra source membership, hashes, lineage, runtime declarations dưới dạng text và binary files; không execute PostgreSQL hoặc import application runtime.

## D. AJ source-pin set / execution binaries

Pinned AJ source set SHA256:

`5c7165d76a01f371635950a4365a728ff01c94f98724b843859670502582ab94`

Pre-execution native exit0 xác minh **6/6 exact AJ source files**, **4/4 UI runtime binaries**, **2/2 diagnostic execution binaries**. Node/PS hashes đúng AJ, không source drift/pin update. Đọc actual policy, launcher, schema và source-pin file trước execution; không thay hoặc tạo launcher khác.

Node: `C:\Program Files\nodejs\node.exe`, hash `fdddbf4581e046b8102815d56208d6a248950bb554570b81519a8a5dacfee95d`.

PowerShell: `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`, hash `60c9b29843624dd8af6b6a7b26147753be6aeef65098b9a503cc50850afe410f`.

## E. One-shot approval consumption

Create-new marker:

`C:\DATN\test-instances\phase13-3b\hash-only-approved-ec70cf2998ec99d75fa1cd636eeacec1d426a9ca16ffa27a9c184c5d9f0f4eba.attempt.json`

Marker binds exact approval hash và run path. Observer-attempt records max1 before outer spawn. **Attempt used: 1/1.** Không sửa/xóa marker hoặc chạy lại launcher/target/outer/observer.

Marker SHA256 được lệnh hậu kiểm tính trước abnormal completion: `9c31fc8d90713c6dc8fc1342a51340d76f8921d5b58ca2a5f8c7645cc18700ba` — observation chưa được một lượt hậu kiểm native0 riêng xác nhận lại; không retry để xác nhận.

## F. Actual process tree

```text
PowerShell launcher/tool shell PID12008
  -> Node observer PID16784
     -> PowerShell outer PID13664
        -> Node hash-only target PID2368
```

Launcher invocation chỉ gọi exact pinned script một lần bằng actual PlanFile; trước call có ghi current host PID/start UTC, sau call propagate `$LASTEXITCODE`. Không alternative process launcher hoặc file-source fallback.

| Layer | PID | Parent | Native exit | Timeout | Independent source |
| --- | ---: | ---: | ---: | --- | --- |
| Node target | 2368 | 13664 | 0 | false | Outer held .NET Process handle |
| PowerShell outer | 13664 | 16784 | 0 | false | Observer direct ChildProcess exit event |
| Node observer | 16784 | 12008 | 0 | false | Launcher held .NET Process handle |
| PowerShell launcher | 12008 | Không thu thập | 0 | Không có timeout từ tool | exec_command native completion, same invocation PID/receipt |

Không dựng launcher parent PID hoặc outer OS StartTime khi không có dữ liệu.

## G. Node target native evidence

`target-native-exit.json`:

- Start request UTC **2026-11-02T19:13:27.1771114Z**.
- OS process StartTime UTC **19:13:27.1857549Z**.
- End UTC **19:13:27.7347715Z**.
- PID2368/parent13664, native0, timeoutfalse, signalnull, errornull, independentNativeExittrue, spawnObservedtrue.
- stdout214 bytes/stderr0; filtered hashChecks **PASS /250/4/rev4**.

Actual native0 quan sát từ handle, không chỉ JSON. Target không DB session, PostgreSQL preflight, network hoặc credentials.

## H. PowerShell outer native evidence

`outer-start.json`: actual spawn event PID13664/parent16784, UTC **2026-11-02T19:13:26.374Z**.

`outer-native-exit.json`: end **19:13:27.786Z**, native0, signal/errornull, timeoutfalse, independentNativeExittrue. Outer OS creation timestamp chưa capture; spawn timestamp không được gọi là OS StartTime.

Đúng một Node target được outer handle giữ/ghi evidence. Không tăng25s deadline hoặc retry.

## I. Observer / launcher native evidence

Observer attempt UTC **19:13:26.329Z**, PID16784/parent12008, max1.

`observer-native-exit.json` từ launcher:

- Start request **19:13:26.1334263Z**, OS StartTime **19:13:26.1390066Z**.
- End **19:13:27.8048563Z**, native0, independentNativeExittrue, timeoutfalse, signal/errornull.

`observer-outcome.json` vẫn ghi `AWAITING_LAUNCHER_HANDLE`; đây là provisional own-exit status đúng thiết kế, không được dùng thay file observer-native-exit.

Launcher host PID12008 OS StartTime **19:13:25.0430288Z**, invocation **19:13:25.3121553Z**. Tool execution native exit **0**, chunk `04f249`, elapsed2.63s; output run path khớp artifacts. Các mốc execution này là **02:13:25–02:13:27 ngày03/11/2026 UTC+7**.

## J. Tool completion comparison / post-review anomaly

**Diagnostic invocation `04f249`:** launcher native0/tool0, matching actual PID12008 và receipt; independent target/outer/observer exits đều0.

**Artifact/ownership read invocation `202715`:** tool native0; đã đọc independent artifacts và xác nhận cả bốn tracked PIDs absent, existing artifacts operator-only.

**Post-execution review invocation `466e8a`:** một lệnh Node qua PowerShell inline/stdin riêng để đọc artifacts, classify và rehash post-state. Nó đã tạo `completion-review.json` và in verdict PASS, nhưng tool completion sau đó là **-1073741819 / 0xC0000005**. Không có independent Node/outer PID cho invocation hậu kiểm này. Không thể xác định tiến trình nào lỗi hoặc suy root cause.

`completion-review.json` đã ghi trước lỗi phải được giữ nguyên như provisional evidence, **không đủ final-session PASS**. Không overwrite để thay verdict. Companion create-new `post-review-tool-anomaly.json` ghi rõ tool failure và final conservative disposition. Không chạy lại hậu kiểm hoặc diagnostic.

Đây không phải một target/outer/observer attempt thứ hai. Tuy nhiên, yêu cầu hậu kiểm/native completion toàn phiên chưa được đáp ứng đầy đủ nên chưa chốt final session PASS.

## K. Classification / errors / timeouts

Diagnostic chain được đọc bằng artifact-review tool exit0 và có đủ native metadata:

**ALL_OBSERVED_NATIVE_EXITS_ZERO** cho approved diagnostic invocation.

Post-review invocation: **NATIVE_FAILURE_BOUNDARY_UNDETERMINED**; không gán Node hoặc PowerShell failure CONFIRMED. Không đổi classifier input `tool.code=0` của diagnostic invocation thành exit của một invocation khác; ghi riêng từng boundary.

Không timeout ở tracked diagnostic chain. Bất thường hậu kiểm khiến **final session HASH_ONLY_NATIVE_DIAGNOSTIC_OUTCOME_UNKNOWN**. Dừng theo rule AK; không retry, force-kill, source fix hoặc diagnostic mở rộng.

## L. Filesystem hash-only results / evidence hashes

Actual target hash-only **PASS**, được handle-native0 corroborate. Source/parser/lineage/assertions nằm trong exact target hash AJ; không dùng fake fixtures cho real target.

Selected artifact SHA256 được hậu kiểm tính trước tool failure (computed observations, không nâng completion của chính hậu kiểm thành PASS):

| Artifact | SHA256 |
| --- | --- |
| target-native-exit.json | 7781999b20e654c337c08207a55242db57e111d510ee27cb600be801907354de |
| outer-native-exit.json | 3285aba1c74470e26f34a9e1e056051702b5bf66ca8246cd4cb5666dc946489b |
| observer-native-exit.json | 3e833d2d36e04f8be057d4caa7cf3ad09a29611af120fd7ee54111c95066ea19 |
| completion-review.json | e03e0063ae9a39af11b569c694eff2338ffa5c16eda3aeb237768c19a0de6aaf |

Không password, DB/MQTT credentials, JWT, raw environment hoặc raw argv trong report/artifacts đã kiểm tra. Approval text là exact supplied task authorization, không chứa application credentials.

## M. Ownership / cleanup

Read-only process inspection tool `202715`, native0, xác nhận PIDs **2368,13664,16784,12008 đều ABSENT_AFTER_RECORDED_NATIVE_EXIT**. Independent handle exits0 đã có trước đó; không tra stale PID rồi terminate.

Tracked diagnostic cleanup **PASS**: không còn owned diagnostic process theo evidence này, không có DEV service nào được start để stop. Không kill/dispose thay cho termination.

Riêng invocation hậu kiểm abnormal không có independent PID/handle evidence. Không tuyên bố toàn bộ tooling/process environment sạch lỗi; overall cleanup/ownership kết luận **PARTIAL** vì boundary hậu kiểm chưa phân biệt. Không biết process còn chạy hay không không đồng nghĩa có process đang chạy; không bịa PID để xử lý.

## N. Source/manifest integrity after execution

Target thực tế đã chứng minh exact pinned baseline trong execution window. Post-review invocation tính lại 250 UI source hashes, 4 UI binaries, 6 AJ sources, 2 diagnostic binaries, manifest/source-pin set/approval/marker binding và ghi không có mismatch trước khi tạo review file.

Do native completion của post-review nonzero, các thông tin này chỉ là **observations, chưa certified post-review PASS**. Không rerun để ép verification. Không có thao tác Agent sửa source/expected pins/binaries, DB hoặc historical readings trong AK.

## O. Final verdict / remaining limitations

```text
PHASE AK — ONE-SHOT HASH-ONLY NATIVE DIAGNOSTIC

Approval: APPROVED
Approval SHA256: ec70cf2998ec99d75fa1cd636eeacec1d426a9ca16ffa27a9c184c5d9f0f4eba
Manifest: REV4 VERIFIED during diagnostic
Source integrity: 250/250 PASS during diagnostic
Runtime binary hashes: 4/4 PASS during diagnostic
AJ source pin set: VERIFIED before execution
Private run: hash-only-native-1793646806048-57cd748a21d6
Attempt: 1/1
Node target: PID2368 / parent13664 / native0 / timeoutfalse
PowerShell outer: PID13664 / parent16784 / native0 / timeoutfalse
Node observer: PID16784 / parent12008 / native0 / timeoutfalse
PowerShell launcher: PID12008 / native0 / no timeout reported
Tool completion: diagnostic0 MATCH; post-review -1073741819 ABNORMAL
Native process classification: ALL_OBSERVED_NATIVE_EXITS_ZERO (diagnostic chain)
Post-review boundary: NATIVE_FAILURE_BOUNDARY_UNDETERMINED
Filesystem hash-only: PASS (actual target)
PostgreSQL preflight: NOT_EXECUTED
PostgreSQL DEV: NOT_STARTED
Backend API: NOT_STARTED
Frontend: NOT_STARTED
Edge/Playwright: NOT_EXECUTED
MQTT CONNECT: 0
MQTT PUBLISH: 0 actions by Agent
DeviceCommand: 0 actions by Agent
Pump ON/OFF: 0
Automation: NOT_ENABLED
Cleanup: PARTIAL overall; tracked diagnostic processes PASS
Final verdict: HASH_ONLY_NATIVE_DIAGNOSTIC_OUTCOME_UNKNOWN
```

Một file-based chain thành công không chữa hoặc chứng minh độ ổn định của inline stdin transport AH. Bất thường hậu kiểm càng không cho phép khẳng định lỗi native hệ thống đã hết. Không retry, không reuse consumed approval, không tự chuyển UI-only session.

Bước tiếp theo chỉ được đề xuất: review existing native artifacts và anomaly companion bằng một read-only transport có independent completion, tránh inline/stdin ambiguity; cần scope riêng nếu muốn thêm thực thi/chẩn đoán. Không dùng việc hậu kiểm lỗi để chạy lại actual target hoặc tạo run khác. Giữ SOIL_SENSOR_QUALITY_BLOCKED.

**STOP sau AK.**
