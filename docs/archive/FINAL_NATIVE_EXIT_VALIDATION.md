# One-shot native exit validation

Ngày05/11/2026. **NATIVE_BOUNDARY_VERIFIED** trong phạm vi harmless diagnostic này. Đúng một invocation, required OUTER/OBSERVER/TARGET đều native exit0 và OS ExitTime VALID, validator/identity/readback PASS. **Không chứng minh root cause crash AX đã được sửa**, không cấp quyền khởi động Website.

## 1. Approval, phạm vi và attempt

Genuine user approval attachment: `305f6712-0408-41fd-9d14-308980876dda/Pasted text.txt`, “ONE-SHOT NATIVE EXIT VALIDATION”. Approval SHA256:

`d6eb34e7243e77675cc56c7477cd99030003034099a633334e0a7bb84df78847`.

READ-ONLY / FILE-BASED / INDEPENDENT HELD-HANDLE OBSERVER, maximum1/no retry,30seconds total,65.536bytes output. Không replay AX, không reuse approval cũ. [Diagnostic trước](FINAL_NATIVE_DIAGNOSTIC_RESULT.md) vẫn PARTIAL và consumed1/1; [offline fix](FINAL_NATIVE_EXIT_TIMESTAMP_FIX.md) vẫn là historical synthetic evidence.

New private run:

`C:\DATN\test-instances\phase13-3b\native-exit-validation-1793881698059-c6963558`

Fresh global create-new marker:

`C:\DATN\test-instances\phase13-3b\native-exit-validation-approved-d6eb34e7243e77675cc56c7477cd99030003034099a633334e0a7bb84df78847.attempt.json`

Local `attempt.json` ghi **1/1**, started `2026-11-05T12:30:39.3008795Z`, expires `12:31:09.3008795Z`. Không có attempt thứ hai. Không sửa/xóa marker hoặc evidence cũ.

## 2. Pre-execution review và source pins

Đã đọc lại FINAL_NATIVE_DIAGNOSTIC_RESULT, FINAL_NATIVE_EXIT_TIMESTAMP_FIX, AX/AY/AZ và AK/AL contracts. Không chạy AX freshness/membership helper hoặc Event Log collector. Exact approved patch hashes đều khớp; không gọi target trong review.

| Source | SHA256 đã pin và kiểm trước/sau |
|---|---|
| held-handle.ps1, copy nguyên patched definitions | ec6838a6162e00a4802ad548246bf28031a507cd30b86e5a2bc276c45758962f |
| validator.ps1, copy nguyên patched validator | f9e9033b01bd655611288cf04edc0fe0bb8bff387cac2ee1a05af8aae7c2e002 |
| synthetic-tests.ps1 tại patch directory gốc, chỉ kiểm hash | b6fdcf6243c671acc0eb71f5abd65ab84437b6840635af32b63f4f15f1b2064c |
| target.cjs, harmless file đã review | 62e37b9dcada438afaad5c690a99df56e864678008b1efe4cb241a094b0d2f9c |
| common.ps1, private wiring | bef4add35b7ed7d46bdd27c0bd510157f2cf0333f291cdd4d516988a7c74f567 |
| stage.ps1, private OUTER/OBSERVER entry | b6a0f684f116e5102a31a646a28d3442fb0a7cc931dd9279af36f741cddc7904 |
| invoke-once.ps1, private one-shot executor | cc86bafec55e40d7cd19edefa1e9f851cab01cb9b972c3771e1b291f3b06ccb7 |
| integration-review.ps1, synthetic wiring review | a68cb8771cf6b72d02c9f5081823fe851fc53192b2e8dcc547498bcd9e8dbefd |

Review JSON SHA256 `e36a48af96a18361d0b07a3515097131f30d3404ae5824c0bff69743d3e4e35a` được pin lại trước invocation; source membership ở đây chỉ là private diagnostic sources, không phải full project250sources revalidation.

Absolute binaries và hashes:

- `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`: `60c9b29843624dd8af6b6a7b26147753be6aeef65098b9a503cc50850afe410f`.
- `C:\Program Files\nodejs\node.exe`: `fdddbf4581e046b8102815d56208d6a248950bb554570b81519a8a5dacfee95d`.

Operator/root owner SID `S-1-5-21-1432835263-483988321-3159128977-1001`; root Protected DACL, sole operator FullControl, no reparse. Pre/post file owner/ACE readback PASS; files inherit sole operator ACE. Không thay parent hoặc production ACL. Child environment được clear, chỉ có SystemRoot/WINDIR/fixedPATH và private TEMP/TMP; không credentials/Node options/application secrets.

## 3. Integration call path và synthetic review

Private wiring tái sử dụng stages của diagnostic trước dưới run mới, **không sửa project supervisor**:

```text
invoke-once.ps1 -> common.ps1 -> patched held-handle.ps1 + validator.ps1
    -> Observe-Collector(OUTER) -> save native -> Assert-NativeSuccess
    -> Assert-ChildIdentity -> Write-ValidationReceipt -> final executor result

OUTER stage -> Observe-Collector(OBSERVER) -> same validation/receipt order
OBSERVER stage -> Observe-Collector(Node TARGET) -> same validation/receipt order
```

Legacy Assert-NativeSuccess function bị loại khỏi private common copy, không shadow patched validator. Assert-PatchedWiring kiểm actual function ScriptBlock.File tại đúng private patched files. Write-ValidationReceipt kiểm lại binding và gọi validator trước khi ghi `fullNativeEvidencePass=true`. Native metadata được save **trước** validation; lỗi không làm mất raw timestamp. Không fallback/retry/sửa raw timestamp nếu invalid.

**Historical baseline66/66** giữ nguyên, không chạy lại hoặc cộng thành test count mới. **17/17 integration synthetic checks mới PASS**, native harness exit0, tool chunk `f76369`: fake processes/streams, actual function binding, receipt path, zero/1601 và nonzero bị reject trước PASS artifact, AST và source ordering/file-based/closed-env checks. Real target invocations trong review:0.

Sau đó thêm một explicit genuine-approved boolean gate vào private common; pre-execution Assert-PrivateRun/hash/ACL/binding review PASS (`90108d`). Không sửa pinned patched observer/validator hoặc thực thi target để thử gate.

Target không imports, không file/network/DB/application access: chỉ JSON marker/PID/process.ppid/execPath, `process.exitCode=0`. Không JavaScript hoặc PowerShell source qua stdin; PowerShell stages dùng `-NoLogo -NoProfile -NonInteractive -File` và absolute paths.

## 4. Actual process tree và identity

```text
Tool-host PowerShell PID4296 (OS parent6956, ngoài required child boundary)
└── PowerShell OUTER PID12524
    └── PowerShell OBSERVER PID2252
        └── Node TARGET PID12304
```

Tool-host/outer/observer tự đọc Win32_Process.ParentProcessId/executable và GetOwnerSid; không suy parent từ cây dự kiến. Node process.ppid/execPath được crosscheck với actual retained-handle PID/creator và pinned executable; Node dùng inherited current token, không alternate credentials, không có separate GetOwnerSid capture cho Node đã thoát nhanh. OS start từ parent-held Process.StartTime khớp identity metadata.

| Role | Actual PID / parent | Exact executable | OS creation UTC,05/11/2026 |
|---|---|---|---|
| Tool-host executor | 4296 / 6956 | C:\WINDOWS\System32\WindowsPowerShell\v1.0\powershell.exe | 12:30:37.7304783Z |
| OUTER | 12524 / 4296 | C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe | 12:30:39.3985683Z |
| OBSERVER | 2252 / 12524 | C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe | 12:30:40.7352118Z |
| TARGET | 12304 / 2252 | C:\Program Files\nodejs\node.exe | 12:30:42.0602004Z |

## 5. Timestamp và independent native evidence

| Required child | Native exit / authority | osExitTimeUtc | observedCompletionUtc | Status / reason |
|---|---|---|---|---|
| OUTER12524 | **0**, retained handle tại PID4296 | 12:30:42.5661156Z | 12:30:42.5968764Z | VALID / OK |
| OBSERVER2252 | **0**, retained handle tại PID12524 | 12:30:42.3731653Z | 12:30:42.4031182Z | VALID / OK |
| TARGET12304 | **0**, retained handle tại PID2252 | 12:30:42.1504007Z | 12:30:42.2030652Z | VALID / OK |

Tất cả UTC thuộc05/11/2026. Với từng child: **OS creation ≤ OS exit ≤ observed completion PASS**. `observedCompletionUtc` được ghi sau WaitForExit(0)=true, khác OS ExitTime; không copy observed time để làm OS timestamp. Parent giữ handle đến signaled completion/native/time capture.

| Child | osExitTimeRaw, API local value | osExitTimeFileTimeDerived |
|---|---|---|
| OUTER | 2026-11-05T19:30:42.5661156+07:00 | 134383554425661156 |
| OBSERVER | 2026-11-05T19:30:42.3731653+07:00 | 134383554423731653 |
| TARGET | 2026-11-05T19:30:42.1504007+07:00 | 134383554421504007 |

Derived FILETIME được chuyển từ API DateTime, không giả là raw native GetProcessTimes buffer. Không zero/year1601/null hoặc invalid value nào trong ba child records. Mỗi child có `handleSignaled=true`, `processHandleRetained=true` (trong quan sát), `independentNativeExit=true`; timeout=false,error=null,signal=null,outputExceeded=false,byteCountsExact=true.

Các `outer/observer/target-validated.json` có đúng childPid/validatedByPid, nativeExit0, timestampVALID/OK và fullNativeEvidencePass=true. Không lấy marker stdout làm native PASS. Saved JSON được đọc lại và gọi pure timestamp/native validator lần nữa, crosscheck identity/receipt; **không chạy lại diagnostic**.

Tool invocation `5c71cf` có **native exit0**, wall time4.9464916s. Tool-host OS ExitTime và separate stream-byte counters không được interface cung cấp: **NOT_RECORDED_BY_TOOL_INTERFACE**. Không bịa giá trị hoặc lấy tool completion time làm OS exit. Approval hiện tại yêu cầu full timestamp validation ở **required child boundaries**, đồng thời cho phép ghi đúng giới hạn tool host; thiếu metadata tool host này không được âm thầm coi là đã đo.

## 6. Limits và cleanup

Deadline chung: attempt12:30:39.3008795Z → expiry12:31:09.3008795Z. Execution result ghi12:30:42.7998400Z, trong deadline; không cộng ba deadline30s. Child observation elapsed: outer3317ms,observer1741ms,target217ms.

Cap8KiB gộp stdout/stderr cho mỗi child, tối đa24KiB qua ba pipes, dưới tổng64KiB; không forward raw child output lên host. Actual measured child output: OUTER0/0bytes, OBSERVER0/0bytes, TARGET121/0bytes. Tool-host chỉ xuất literal completion marker ngắn, không có measured separate stream counts từ tool. Không overflow hoặc retry.

Ba native records ghi `handleStreamCleanupState=PATCHED_FINALLY_COMPLETED_NO_EXCEPTION`: patched function đã return sau finally Dispose mọi stream/memory buffer và Process, không có cleanup exception. Đây là evidence control flow/disposal calls, **không phải external scan mọi OS handle**. Không force-kill hoặc cleanup process ngoài ownership. Không child timeout/UNKNOWN cần xử lý bổ sung.

## 7. Evidence integrity và verdict

Private files create-new; sau execution chỉ đọc saved evidence/hash/ACL và thêm completion/review summaries. Không blocked artifacts. Source drift0, NTFS readbackPASS, manifest revision9 trước/sau vẫn:

`2b23c8cd86f288d7ba5842e3f2850e37cbaf7f0221c1d8075a1f597d337e9af9`.

| Artifact | SHA256 |
|---|---|
| outer-native.json | 41aa4936fb7d60bc1c80d959640061f6c300c89d3de038cf6e6c36bc7ab378cd |
| observer-native.json | 703327809fdaac24b7142cc3e64d4b9c92549a9995eb3fe4d9cc5f28cb7363af |
| target-native.json | 57c5071060c007a795fdb5f9ce3adca48e3d5c77d43a1f5c1f2a204b8cd47f63 |
| external-tool-completion.json | 64611c80176fb1f8c72a7c4568e275775c806e4db1bc2103e4fae408b735a8ac |
| final-review.json | 9815d883d8b0ca9eb64fff48642cdffa1178ac9cc31fdea092c92959dc422a40 |

External-tool-completion artifact là bản ghi metadata thật từ tool result do assistant lưu, không là child tự khẳng định parent exit. Review sau execution native exit0 (`244cb8`) xác nhận ba validators và saved identity relationships PASS.

**NATIVE_BOUNDARY_VERIFIED** chỉ cho harmless file-based path và patched timestamp validation trong một lượt này. Nguyên nhân timestamp1601 trước đây vẫn UNKNOWN; kết quả phù hợp với bản sửa nhưng không chứng minh nguyên nhân đã được tái hiện/loại bỏ vĩnh viễn. Root cause/access violation Phase AX vẫn **UNKNOWN**; faulting process linkage vẫn NOT_CONFIRMED. Không nâng historical website acceptance từ diagnostic PASS.

## 8. No-live-actions và hard stop

Không replay AX, không project supervisor/source/tests/manifest changes, DB/startup/production access, API/frontend/Edge/Playwright, MQTT CONNECT/SUBSCRIBE/PUBLISH, migration/seed/restore, DeviceCommand/ON/OFF/automation, firmware/reset/hardware. Không đọc/ghi dữ liệu ứng dụng. Không kiểm lại runtime flags/PENDING hiện tại; không dùng source defaults làm runtime attestation.

Chỉ private wiring/evidence được tạo và báo cáo này được thêm vào repository; báo cáo cũ giữ nguyên. Attempt allowance đã dùng1/1. STOP; không tự mở Website acceptance. Bước tiếp theo nếu người dùng muốn nghiệm thu UI là một phạm vi supervised Website riêng, giữ đủ freshness/native/SQL/CORS/auth/data/cleanup gates, không tự coi diagnostic này thay toàn bộ preflight đó.

```text
NATIVE EXIT VALIDATION RESULT
Authorization: APPROVED
Attempt: 1/1
Patched observer integration: PASS
Validator integration: PASS
Source pins: PASS
Outer native exit: PASS (0)
Observer native exit: PASS (0)
Target native exit: PASS (0)
Outer OS ExitTime: VALID
Observer OS ExitTime: VALID
Target OS ExitTime: VALID
Actual process PIDs: tool4296 -> outer12524 -> observer2252 -> target12304
Deadline/output: PASS
AX root cause: UNKNOWN
Project source/manifest: UNCHANGED
PostgreSQL/API/Frontend: NOT_STARTED
MQTT: NOT_CONNECTED
DeviceCommand/Pump ON-OFF: 0 ACTIONS
Automation: NOT_ENABLED
FINAL: NATIVE_BOUNDARY_VERIFIED
```
