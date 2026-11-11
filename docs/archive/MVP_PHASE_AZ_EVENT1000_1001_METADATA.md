# Phase AZ — One-shot Application Event 1000/1001 metadata

Ngày thực hiện: 05/11/2026. Kết luận: **EVENT_METADATA_COLLECTION_COMPLETE**; tương quan AX: **CANDIDATE_CRASH_EVENT_FOUND**. Đã thu đủ metadata trong phạm vi được duyệt; chưa chứng minh PID bị crash chính là process của AX và chưa xác định nguyên nhân gốc.

## 1. Authorization và giới hạn

Phê duyệt thực tế: attachment `c3b6fd7e-d24c-45e0-8e7e-59adfda4d3ff/Pasted text.txt`, tiêu đề “PHASE AZ — ONE-SHOT WINDOWS APPLICATION EVENT 1000/1001 FORENSICS”. Bản sao approval lưu riêng tư; SHA256 bên dưới.

| Điều kiện | Phạm vi và kết quả |
|---|---|
| Scope | ONE_BOUNDED_READ_ONLY_EVENT_METADATA_COLLECTION |
| Channel / Event IDs | Application / 1000, 1001 |
| TimeCreated UTC, inclusive | 2026-11-05T11:01:50Z đến 2026-11-05T11:03:10Z |
| Giờ Việt Nam | 18:01:50–18:03:10 ngày 05/11/2026 |
| Attempts | **1/1**, không retry |
| Records combined | Tối đa 50; thực tế **4**, limitReached=false |
| Collector deadline | 30.000 ms; thực tế quan sát **1.298 ms** |
| Combined stdout/stderr cap | 65.536 bytes; thực tế **3.258 / 0 bytes** |
| Quyền | Quyền operator hiện có; không elevation |

Không mở rộng channel/window, không truy cập WER directories/crash dumps/registry và không tái chạy AX.

## 2. Collector, observer và kiểm tra trước execution

Collector/observer mới được lưu **ngoài repository** trong evidence directory riêng, không sửa project execution source/tests/manifest. Dùng executable tuyệt đối `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`; executable SHA256 `60c9b29843624dd8af6b6a7b26147753be6aeef65098b9a503cc50850afe410f`.

Collector dùng EventLogQuery với time/ID filter ngay trong truy vấn, EventLogReader bounded, allowlist XML fields; không xuất raw Message/XML. XML resolver bị tắt, missing fields ghi `NOT_RECORDED`; không lấy provider execution PID thay faulting application PID. Event1001 chỉ map P1/P2/P4/P5/P7/P8 thành app/version/module/version/exception/offset khi EventName=APPCRASH. ProcessId hex và process FILETIME được chuẩn hóa nhưng vẫn giữ raw metadata.

Observer giữ native process handle, lấy PID/OS creation/exit độc lập với JSON stdout. Đọc stdout/stderr theo byte với cap gộp, finite deadline; kiểm tra metadata PID/parent/start khớp process đã tạo. Không force-kill unknown process, không retry/fallback. Tool host còn quan sát observer bằng held handle riêng.

Trước attempt, **38/38 synthetic checks PASS**: 26 checks đầu và 12 checks bổ sung, cả hai PowerShell test processes native exit0. Chỉ extract function definitions qua AST, không gọi collector trong tests. Bao gồm XML allowlist, biên inclusive, missing/invalid fields, PID/FILETIME, metadata validation, cap stdout+stderr, timeout, start failure, native nonzero `-1073741819`, one-start behavior và cleanup bằng fake process/streams. AST scripts hợp lệ. Đây là tests collector riêng tư, không phải chạy lại project regression hoặc tạo crash thật.

## 3. One-shot process tree và native completion

```text
Tool-host PowerShell PID 14628
└── observer PowerShell PID 16420
    └── collector PowerShell PID 22952
```

| Process | OS creation UTC | Native exit UTC | Exit / observation |
|---|---|---|---|
| Observer 16420, parent 14628 | 11:40:51.7330766Z | 11:40:53.9668710Z | 0, held handle từ parent |
| Collector 22952, parent 16420 | 11:40:52.5708303Z | 11:40:53.7626184Z | 0, held handle từ observer |

Ngày của tất cả timestamps ở bảng: 2026-11-05. Observer observation start/end `11:40:51.7203775Z` / `11:40:54.1037005Z`, elapsed 2.384 ms, stdout 90 bytes, stderr 0. Collector observation start/end `11:40:52.5664397Z` / `11:40:53.8635960Z`, elapsed 1.298 ms. Collector self-reported collection interval `11:40:52.9567412Z`–`11:40:53.7367660Z`; không dùng các self-reported fields thay native exit.

Cả hai records: independentNativeExit=true, timeout=false, outputExceeded=false, byteCountsExact=true, signal=null, error=null. Tool invocation hoàn thành exit0, chunk `b0e04b`. Outcome `NATIVE_AND_METADATA_PASS`. Chỉ một collector invocation; các lần đọc JSON evidence sau đó không query Event Log lại.

## 4. Event metadata

TimeCreated là **thời điểm ghi Event**, không tự coi là chính xác thời điểm process crash. Tất cả mốc dưới đây là UTC ngày 2026-11-05.

| RecordId | Provider / ID | TimeCreated | App / module / exception | Faulting PID | Report ID |
|---|---|---|---|---|---|
| 67175 | Application Error / 1000 | 11:02:20.0635063Z | powershell.exe / ntdll.dll / c0000005 | **1512**, raw 0x5e8 | 212c4842-489e-472c-99ca-8b9f2379033d |
| 67176 | Windows Error Reporting / 1001, APPCRASH | 11:02:24.3012256Z | powershell.exe / ntdll.dll / c0000005 | NOT_RECORDED | 212c4842-489e-472c-99ca-8b9f2379033d |
| 67177 | Windows Error Reporting / 1001, VisualStudioNonFatalErrors2 | 11:02:24.6459972Z | NOT_RECORDED / NOT_RECORDED / NOT_RECORDED | NOT_RECORDED | 3bfba047-585f-4d93-a916-14e650e2033c |
| 67179 | Windows Error Reporting / 1001, APPCRASH | 11:02:31.8176830Z | powershell.exe / ntdll.dll / c0000005 | NOT_RECORDED | 212c4842-489e-472c-99ca-8b9f2379033d |

Candidate group gồm 67175/67176/67179 có cùng Report ID và signature; không phải bằng chứng ba crash khác nhau. Record 67177 là report khác, không gán vào candidate group hoặc AX.

Metadata bổ sung của Event1000 67175:

- App path: `C:\WINDOWS\System32\WindowsPowerShell\v1.0\powershell.exe`; version `10.0.26100.9549`.
- Module path: `C:\WINDOWS\SYSTEM32\ntdll.dll`; version `10.0.26100.9711`.
- Fault offset: `000000000001d74d`.
- Process creation UTC: **2026-11-05T11:02:11.3174118Z**; raw FILETIME `0x1dd6d151b71ea66`.
- EventName/package identifiers: NOT_RECORDED.

Hai APPCRASH 1001 ghi cùng app/module versions và offset, nhưng không ghi app/module path, faulting PID hoặc process creation. Không bổ sung các field thiếu bằng suy luận. Record 67177 chỉ giữ identifiers thuộc allowlist; không xuất report parameters không liên quan.

## 5. Correlation với AX

Nguồn lịch sử: [AX](MVP_PHASE_AX_FINAL_HISTORICAL_UI_ACCEPTANCE.md), [AY](MVP_PHASE_AY_NATIVE_COMPLETION_DIAGNOSIS.md) và journal timestamps đã review trong AY. Không sửa kết luận các phase đó.

| AX evidence | UTC 05/11/2026 | Diễn giải |
|---|---|---|
| Invocation request | 11:02:11.187Z | Trước candidate OS creation khoảng 130 ms |
| Printed checkedUtc | 11:02:19.6238809Z | Trước Event1000 khoảng 440 ms; không phải OS exit/flush timestamp |
| Tool yielded session32916 | 11:02:21.614Z | Session ID của tool, **không phải Windows PID** |
| Tool reported abnormal completion | 11:02:30.963Z | Exit -1073741819 / 0xC0000005; không phải OS crash timestamp |
| Post-stop metadata | 11:03:06.3932254Z | Historical no consumed marker/DEV startup evidence; không replay |

Candidate process được tạo ngay sau invocation, Event1000 nằm gần output, exception phù hợp abnormal completion; hai WER APPCRASH liên kết chắc với Event1000 qua Report ID. Đây là bằng chứng mạnh về **một powershell.exe PID1512 đã crash trong cửa sổ**.

Tuy nhiên AX không lưu actual shell/Node PID, parent PID hoặc independently observed OS creation/exit. Event metadata cũng không cung cấp process parent relationship để nối vào AX. Vì vậy chưa chứng minh PID1512 là outer AX host hoặc một child cụ thể. Không gán crash cho Node, pg_controldata hay membership helper; không dùng session32916 làm PID.

**Classification: CANDIDATE_CRASH_EVENT_FOUND.** Faulting executable/module được xác lập cho event candidate; **faulting executable của chính AX vẫn NOT_CONFIRMED**. `ntdll.dll` là nơi báo fault, chưa chứng minh là nguồn gốc memory corruption. Không có bằng chứng đủ để sửa component hoặc bỏ safety gate.

## 6. Private evidence và hashes

Private directory: `C:\DATN\test-instances\phase13-3b\event-metadata-az-1793878446053-2543d471`.

Owner/operator SID `S-1-5-21-1432835263-483988321-3159128977-1001`; root Protected DACL, chỉ operator FullControl. Sau khi ghi correlation, đọc lại owner/ACE/reparse của root và mọi file: PASS, không unexpected ACE/reparse. File mới inherit sole operator ACE từ private root; không sửa parent/production ACL. Không copy metadata vào Git ngoài bảng allowlisted trong báo cáo này.

| Artifact | SHA256 |
|---|---|
| authorization.txt | 32840f937ec5daf443f714fc23230be820ef2bd9d16e0c16b7d7cf6bf7f8885a |
| collector.ps1 | 917be776873816e669df06fb6c4085db0fe237a2f5d2e2ece504d68467f7e18f |
| observer.ps1 | 9cb59b3e5bff80f222c68d4aeafa01000047891a59f1c65ea78fded6af47d26c |
| review.json | e1e17844cc22b843ca98a2a4ecb5d397622ba61bea36c7ac300877783334e104 |
| collector-native-exit.json | 41da2994d3cad2ef682f501a93a328c3325448b468d45dd3606b0afd71280c69 |
| observer-native-exit.json | e4a6407868e873b527639375486a05d27c50f56d415d9854b3179c7de9c708c6 |
| event-metadata.private.json | c2e34dba1a45810f2db5afd921f64d12a42f2a2c1fb9e590d6f8c8048e3018f0 |
| collection-outcome.json | 895b648c4d239beb2204b0b27c41851e1d432f44e5b4afeb4991ae086248b844 |
| correlation-result.json | 2d7a5c230b2fbb756cec32969b463132efb88ae77e55ab95157a1db11c11bcd4 |

Collector/observer/approval hashes trùng pinned pre-execution review khi kiểm tra lại. Synthetic evidence giữ trong `synthetic-review.json` và `synthetic-additional.json`; attempt marker `collector-attempt.json` giữ nguyên. Không overwrite/xóa evidence cũ. Redaction review: chỉ metadata allowlist, process completion, approval và reviewed collector source; không password/JWT/token, raw unrelated event content hay dump.

## 7. Minimal next step và hard stop

Không có sửa project source phù hợp bằng chứng lúc này. Nếu người dùng muốn tiếp tục, cần **phê duyệt riêng** cho một phép kiểm tra tối thiểu có observer giữ handle và ghi exact PID/parent/OS start/native exit của từng boundary trước khi chạy. Mục đích là phân biệt outer PowerShell với child; không tự coi việc đổi wrapper đã sửa crash hoặc cho phép website acceptance. Không cần mở rộng infrastructure hoặc thu dump trong AZ.

Không thực hiện phép kiểm tra đó ở phase này. Không khởi động DB/API/frontend/Edge, không MQTT CONNECT/SUBSCRIBE/PUBLISH, không DeviceCommand, ON/OFF, automation hay thao tác phần cứng. Không thay đổi runtime flags/credentials/ACL/registry; không tuyên bố fresh runtime health. Project execution source/tests/manifest thay đổi **0**; chỉ thêm báo cáo này và private evidence được duyệt.

## 8. Final result

```text
PHASE AZ RESULT
Authorization: APPROVED
Scope: READ_ONLY_APPLICATION_EVENT_METADATA
Collector attempts: 1/1
Time window: 2026-11-05T11:01:50Z to 2026-11-05T11:03:10Z inclusive
Event IDs: 1000,1001
Maximum records: 50
Collector deadline: 30s
Output cap: 65536 bytes
Observer native completion: PASS
Collector PID/parent: 22952 / 16420
Collector native exit: 0
Event records: 4; limitReached=false
Faulting application: powershell.exe (candidate event; AX NOT_CONFIRMED)
Faulting module: ntdll.dll (candidate event; root cause NOT_CONFIRMED)
Exception code: c0000005 (candidate event)
AX correlation: CANDIDATE_CRASH_EVENT_FOUND
AX attempt history: 0/1 UNCHANGED
PostgreSQL: NOT_STARTED
API/frontend: NOT_STARTED
Edge: NOT_EXECUTED
MQTT: NOT_CONNECTED
DeviceCommand: 0 ACTIONS
Pump ON/OFF: 0 ACTIONS
Automation: NOT_ENABLED
Project source/manifest changes: 0
AX replay: NOT_EXECUTED
FINAL: EVENT_METADATA_COLLECTION_COMPLETE
```

STOP tại Phase AZ. Không tự bắt đầu phase tiếp theo.
