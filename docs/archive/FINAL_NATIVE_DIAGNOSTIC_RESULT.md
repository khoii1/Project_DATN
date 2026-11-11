# Smart Agriculture — Native execution recovery diagnostic

Ngày05/11/2026. **NATIVE_BOUNDARY_PARTIAL**. Đã thực hiện đúng một diagnostic file-based: Node target, observer, outer và tool invocation đều có native exit0, không timeout/error. Tuy nhiên, raw OS ExitTime của hai PowerShell child là `1601-01-01`, không hợp lệ; tool host không có OS exit timestamp/separate stdout-stderr counts từ interface công cụ. Không công nhận toàn bộ evidence contract VERIFIED, không sửa wrapper hoặc retry.

## 1. Genuine approval và phạm vi

User attachment: `a091f47c-c3c7-4ebe-ba9c-f8d07c1cd5ea/Pasted text.txt`, tiêu đề “SMART AGRICULTURE IoT — NATIVE EXECUTION RECOVERY”, USER APPROVED — ONE NATIVE DIAGNOSTIC.

Approval SHA256: `4e3cece5a8dfae137c8fd883944ab34581977b0137c73ac62889246506277c99`.

Scope: một target Node vô hại, READ-ONLY / FILE-BASED / INDEPENDENT NATIVE OBSERVER; maximum1/no retry. Không replay AX hash verification/membership helper. Không dùng lại approval AX/AZ. Không startup website hoặc tiếp tục supervised acceptance.

## 2. Source review và thiết kế tối thiểu

Đã đối chiếu AX/AY/AZ và AJ/AK/AL, source observer/classifier và held-handle transport. AK có chain native0 nhưng hậu kiểm khác lỗi; không sửa kết luận lịch sử. AJ main/pins/target hardcode revision4 không được chạy hoặc coi hợp lệ cho revision9.

Tái sử dụng nguyên **hai function definitions** `Observe-Collector` và `Write-NewJson` từ AZ observer, extract bằng PowerShell AST vào private `held-handle.ps1`. Không gọi main AZ/Event Log collector. `Observe-Collector` giữ .NET Process handle, lấy PID/StartTime/ExitCode/ExitTime, đọc BaseStreams async có cap gộp, timeout hữu hạn và Dispose, không retry/kill.

Script tạm mới chỉ ở private evidence directory, không repository source:

| File | Vai trò | SHA256 |
|---|---|---|
| held-handle.ps1 | Function transport tái sử dụng | 2f920c97295a92389b3c39237f186da579c952c0a8c9679d50e099e682a88f8c |
| common.ps1 | Private scope/hash/ACL/self-identity và child metadata validation | 65c53ff2b324ebd77d3462ec3a108375fa6bd99dcfa9d8086f6022d27a3692bc |
| stage.ps1 | Hai roles OUTER/OBSERVER; giữ handle child trực tiếp | 388c0c388d32fda6e864290450ee4d07886651d729e0f2015c47393c650b532c |
| invoke-once.ps1 | Tool-host entry, create-new attempt, giữ handle outer | 33c7db6db7cadd24f9720c1a3b726a25c8d019f43e0fd45beab9cb72bc9c2b4c |
| target.cjs | Không imports; chỉ marker/PID/ppid/execPath và exitCode0 | 62e37b9dcada438afaad5c690a99df56e864678008b1efe4cb241a094b0d2f9c |
| synthetic-review.ps1 | Fake processes/streams và source/AST review | 2f9e1298132c382810d49a1b276c568f52002e1d425e1cc4fdbead8b33b94567 |

Original AZ observer SHA256 `9cb59b3e5bff80f222c68d4aeafa01000047891a59f1c65ea78fded6af47d26c` đã kiểm tra trước extract. Không thay file gốc.

Absolute binaries được kiểm tra hash trước execution và trong stages:

- PowerShell: `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`, SHA256 `60c9b29843624dd8af6b6a7b26147753be6aeef65098b9a503cc50850afe410f`.
- Node: `C:\Program Files\nodejs\node.exe`, SHA256 `fdddbf4581e046b8102815d56208d6a248950bb554570b81519a8a5dacfee95d`.

PowerShell child dùng `-NoLogo -NoProfile -NonInteractive -File`, Node dùng absolute target file. Không executable source qua stdin/inline JS. Closed child environment chỉ SystemRoot/WINDIR/PATH cố định và private TEMP/TMP; không credentials/application environment. Không import Smart Agriculture/Prisma/MQTT, không đọc250sources hoặc membership/runtime helper. Chỉ kiểm tra **hash manifest hiện hữu**, không coi đó là full UI freshness verification.

## 3. Pre-execution review và tests

**30/30 synthetic checks PASS**, native runner exit0, chunk `71cf10`. Dùng fake processes/MemoryStreams, không tạo child native từ synthetic tests và không chạy Node target. Bao gồm actual transport functions với fake handle: zero/nonzero/-1073741819, one start/Dispose, combined byte cap, timeout không giả zero, launch failure, stderr refusal, PID/parent/executable/creation mismatch, deadline expired, no-import target, file-based args/closed env, không kill/live fallback, create-new marker và AST năm scripts.

Thêm một synthetic save check PASS: ordered native record được ghi bằng create-new, không giữ raw stdout, có completion authority. Review/ACL/hashes hoàn tất native0, chunk `ccf43d`.

**Giới hạn tests đã bộc lộ:** fixture dùng ExitTime hợp lệ, chưa có regression từ chối OS ExitTime zero/1601. Không dùng30tests để nâng native evidence không hợp lệ thành VERIFIED. Không thêm/sửa tests hoặc scripts sau invocation để chạy lại trong approval này.

## 4. Attempt và execution bounds

Private run: `C:\DATN\test-instances\phase13-3b\native-recovery-1793880415829-cae04835`.

Owner/operator SID `S-1-5-21-1432835263-483988321-3159128977-1001`; root Protected DACL, sole operator FullControl, no unexpected reparse. Các file kế thừa sole operator ACE. Readback owner/ACE/reparse trước/sau PASS; không sửa parent/production ACL.

Review hash: `52562f2f5c2236a0c9ceb231ae29ef42b33555ef2ff2ff146ac9457d3734d3a5`. Review/entry hash được pin lại trong tool invocation trước execution.

Approval-bound marker tạo mới đúng một lần ngoài project:

`C:\DATN\test-instances\phase13-3b\native-recovery-approved-4e3cece5a8dfae137c8fd883944ab34581977b0137c73ac62889246506277c99.attempt.json`

Local `attempt.json`: **1/1**, started `2026-11-05T12:10:21.3710696Z`, expiry `12:10:51.3710696Z`. Mỗi child dùng remaining time từ cùng expiry30s, không cộng ba deadline30s. Whole tool invocation wall time **4.4729488s**; executor result ghi `12:10:24.6381689Z`, trong deadline.

Mỗi child stdout+stderr cap8KiB, ba child tối đa24KiB; không forward raw child output lên tool host. Tool-host stdout chỉ literal completion marker ngắn. Actual measured child totals:121stdout bytes,0stderr bytes, không cap exceed. Tool interface không cung cấp separate stream-byte counters của host; không gọi các giá trị đó là measured.

## 5. Actual process tree và OS identity

```text
Tool-host PowerShell PID3984 (OS parent6956, parent ngoài phạm vi quan sát handle)
└── PowerShell OUTER PID13632
    └── PowerShell OBSERVER PID11356
        └── Node TARGET PID4928
```

Tool-host/outer/observer lấy actual ParentProcessId, executable và owner SID bằng Win32_Process/GetOwnerSid cho **chính process của mình**. Child start crosscheck với .NET parent-held handle. Node output process.ppid/execPath từ OS-backed Node properties được so exact với actual handle PID/creator và pinned executable, không suy parent chỉ từ cây dự kiến. Node dùng inherited current process token, không alternate credentials; không có independent GetOwnerSid capture cho target đã thoát nhanh.

Tất cả timestamps sau thuộc UTC ngày05/11/2026 (cộng7giờ là giờ Việt Nam):

| Role | Actual PID / parent | Exact executable path | OS creation UTC |
|---|---|---|---|
| Tool host executor | 3984 / 6956 | C:\WINDOWS\System32\WindowsPowerShell\v1.0\powershell.exe | 12:10:20.0407314Z |
| Outer | 13632 / 3984 | C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe | 12:10:21.4726117Z |
| Observer | 11356 / 13632 | C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe | 12:10:22.7819205Z |
| Target | 4928 / 11356 | C:\Program Files\nodejs\node.exe | 12:10:24.1368716Z |

## 6. Independent native completion và metadata defect

| Role | Native exit / independent authority | Raw OS ExitTime | Observed completed by UTC | stdout/stderr bytes |
|---|---|---|---|---|
| Tool host | **0**, exec_command chunk a6974c | NOT_RECORDED | Tool result đã trả completion; exact OS timestamp NOT_RECORDED | NOT_RECORDED separately |
| Outer | **0**, held handle tại PID3984 | **1601-01-01T00:00:00Z — INVALID** | 12:10:24.5818788Z | 0 / 0 |
| Observer | **0**, held handle tại PID13632 | **1601-01-01T00:00:00Z — INVALID** | 12:10:24.4600326Z | 0 / 0 |
| Target | **0**, held handle tại PID11356 | 12:10:24.2328466Z — VALID | 12:10:24.3164865Z | 121 / 0 |

Outer observation elapsed3113ms; observer1683ms; target183ms. Ba native records: independentNativeExit=true, timeout=false, error=null, signal=null, outputExceeded=false, byteCountsExact=true. Signal của tool host không được interface expose riêng; native completion code0 có thật. Không có tool session ID được dùng làm PID.

Native code0 được lấy sau HasExited từ retained handles, **không từ target marker**. Marker chỉ dùng kiểm output shape/content và crosscheck target identity. Tool completion exit0 là bằng chứng ngoài target, không dùng marker tool làm PASS.

`processExitUtc=1601` không thể là thời điểm thoát process sinh năm2026. Vì vậy hai field này phải giữ **INVALID**, không thay bằng observation `endedUtc` hoặc timestamp tự ước lượng. `endedUtc` chỉ là thời điểm observer đã hoàn tất quan sát/cleanup, là upper bound của exit được quan sát, không phải OS ExitTime chính xác.

`execution-result.json` raw ghi `REQUIRED_CHILD_BOUNDARIES_PASS` vì checks ban đầu xác minh native code/identity mà chưa reject invalid ExitTime. Sau đọc evidence, kết luận cuối ở `final-classification.json` là **NATIVE_BOUNDARY_PARTIAL**; không sửa/overwrite raw result để che lỗ hổng validation. Không đủ bằng chứng để xác định vì sao OS/.NET trả giá trị1601 trong lần này; không suy đã tìm ra nguyên nhân native crash AX.

## 7. Evidence readback và tính bất biến

Sau execution chỉ đọc saved metadata/hash/ACL, tạo summary mới; không query Event Log/WER hoặc chạy lại diagnostic. No blocked artifacts do stage errors; source hashes vẫn khớp pinned review. Manifest revision9 giữ exact SHA256 `2b23c8cd86f288d7ba5842e3f2850e37cbaf7f0221c1d8075a1f597d337e9af9` trước/sau; không kiểm lại250members hoặc nâng revision.

| Private artifact | SHA256 |
|---|---|
| outer-native.json | 8cd8544b56a00ee0dcc98e1e814a81789e068109196edea2541f190e95000ac8 |
| observer-native.json | 415aa59c0131c9ae9bbdca66ca672f486cdcc283ea5561ce057a6c4687be647f |
| target-native.json | 22be79b162f9bab3f986495c4dcf40ad2c2c7bf27b10b8f5063a3f7644bd1a98 |
| external-tool-completion.json | daf50a9745ef8c752e7619ca96936f58e0cb44eaefe2efcda6dd5c75cd238522 |
| final-classification.json | 50d886420ba944e721f669cf09d12849e453ef5558b9f3c96d9e6cc62d27d147 |
| post-review.json | b051b2ea6d17fd11ce9c57e307b90182c6196c17bed554e968dc099616500037 |

External tool completion artifact là bản ghi assistant chép metadata thực từ tool result `a6974c` để nối invocation, không giả là native artifact do child tự biết exit của parent. Private artifact raw fields không chứa secrets/environment/command lines.

## 8. So sánh AX/AZ và những điều còn UNKNOWN

- **AX:** không replay. Diagnostic target này không đọc project membership/hash250, không chạy NTFS/listener preflight cũ, không load runtime. Một harmless target native0 không chứng minh toàn AX command sẽ thành công.
- **AZ:** tái sử dụng function observer, không chạy collector lần nữa. Event1000 powershell1512/ntdll/c0000005 vẫn chỉ CANDIDATE_CRASH_EVENT_FOUND với AX; không gán PID1512 cho cây process mới.
- File-based transport với closed env và independent handles đã chạy native0 trong lần này. Không chứng minh inline PowerShell là root cause hoặc ntdll gây memory corruption, không chứng minh lỗi hệ thống đã được sửa vĩnh viễn.
- Exact OS ExitTime cho outer/observer và tool-host separate stream counters/OS exit chưa đủ. Native exit-code observation PASS, whole evidence contract PARTIAL. Không có crash mới được ghi nhận bởi các native exit codes của invocation này; không query event logs để tuyên bố toàn Windows không có lỗi.

## 9. Bước nhỏ nhất tiếp theo

Giữ STOP. Đề xuất review offline hẹp trên transport hiện có: xác định cách lấy/validate process exit-time hoặc ghi rõ observed exit detection time theo contract; thêm synthetic invalid/zero ExitTime case và không trả fullPASS khi metadata chưa đủ. Không thêm framework hoặc sửa project runtime; không làm việc đó sau invocation trong approval hiện tại.

Sau preparation đạt mới xin scope thực thi phù hợp cho **một** diagnostic mới nếu vẫn cần. Không dùng lại approval đã consumed1/1 và không tự chuyển sang Website. Nếu evidence native đã đủ theo contract được duyệt sau này, phiên supervised Website sẽ được phê duyệt riêng với checklist có sẵn; không cần initdb/migration production hoặc MQTT/pump để nghiệm thu historical UI.

## 10. No-live-action record và final output

Không start/connect PostgreSQL/Backend/Frontend/MQTT/Edge; không đọc/ghi production DB, migrations/restore/seed, EventLog/dump/registry mới, credentials, DeviceCommand, ON/OFF, automation, firmware/reset/hardware. Không thay runtime flags; current runtime health/PENDING **không được xác minh lại** trong diagnostic này. Không force-kill hay stop process khác. Child processes hoàn tất exit0, owned handles/streams đã Dispose.

Chỉ tạo private diagnostic artifacts và báo cáo này. Repository execution source/tests/manifest thay đổi0; không sửa báo cáo lịch sử hoặc bộ tài liệu completion đã bàn giao trước.

```text
SMART AGRICULTURE — NATIVE DIAGNOSTIC
Authorization: APPROVED
Attempt: 1/1
File-based diagnostic: PASS (target execution; full metadata PARTIAL)
Outer native completion: PASS (exit0; raw OS ExitTime INVALID)
Observer native completion: PASS (exit0; raw OS ExitTime INVALID)
Target native completion: PASS (exit0; valid OS times)
Actual PIDs: tool3984 -> outer13632 -> observer11356 -> Node4928
Native exit codes: tool0 / outer0 / observer0 / target0
Faulting process of AX: NOT_CONFIRMED
Project source changes: 0
Manifest changes: 0
PostgreSQL: NOT_STARTED
Backend API: NOT_STARTED
Frontend: NOT_STARTED
MQTT: NOT_CONNECTED
DeviceCommand: 0 ACTIONS
Pump ON/OFF: 0 ACTIONS
Automation: NOT_ENABLED
FINAL: NATIVE_BOUNDARY_PARTIAL
```

Diagnostic allowance đã dùng1/1. STOP; không retry hoặc tự bắt đầu phiên Website.
