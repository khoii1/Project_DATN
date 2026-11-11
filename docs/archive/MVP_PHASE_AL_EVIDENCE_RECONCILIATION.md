# Phase AL — Offline Evidence Reconciliation and Post-Review Failure Assessment

Ngày review: **04/11/2026, UTC+7**. Phạm vi: đọc báo cáo, artifacts và các record liên quan trong session journal hiện hữu; chỉ tạo báo cáo này. Không thực thi lại diagnostic, classifier, hậu kiểm AK hoặc tests/native helpers. Không sửa source, manifests, binaries, approval hay artifacts lịch sử.

**Kết luận: AK_DIAGNOSTIC_CHAIN_EVIDENCE_VALID.** Đủ bằng chứng riêng cho `ALL_OBSERVED_NATIVE_EXITS_ZERO` của invocation `04f249`. Hậu kiểm `466e8a` vẫn `POST_REVIEW_NATIVE_COMPLETION_UNDETERMINED`. Verdict toàn phiên AK giữ nguyên `HASH_ONLY_NATIVE_DIAGNOSTIC_OUTCOME_UNKNOWN`.

## 1. Evidence được đọc và giới hạn

Đã đọc [AK](MVP_PHASE_AK_NATIVE_DIAGNOSTIC_EXECUTION.md), [AJ](MVP_PHASE_AJ_NATIVE_DIAGNOSTIC_PREPARATION.md), [AI](MVP_PHASE_AI_OFFLINE_DIAGNOSIS.md), các native artifacts, approval/marker/provenance và source capture/exit liên quan. Đã đọc record gốc của các invocation cụ thể trong local session journal, thay vì chỉ tin giá trị được chép vào completion-review.json.

Private run hiện hữu:

`C:\DATN\test-instances\phase13-3b\hash-only-native-1793646806048-57cd748a21d6`

Private plan hiện hữu:

`C:\DATN\test-instances\phase13-3b\hash-only-plan-1793646771950-a5cac817e7fa`

Journal hiện hữu:

`C:\Users\Acer Swift3\.codex\sessions\2026\08\26\rollout-2026-08-26T10-47-04-01a03c2d-b71e-7cb3-8ee6-f1f9eed11306.jsonl`

Chỉ trích metadata/source của các lời gọi liên quan, không sao chép toàn bộ journal. Các lần đọc file trong AL kết thúc native0; đó là file inspection được phê duyệt, không phải một diagnostic mới hoặc replay của hậu kiểm AK. Không kiểm tra tiến trình hiện tại, event logs mới, network hoặc database.

## 2. Hai invocation độc lập

| Thuộc tính | Diagnostic chính | Hậu kiểm riêng |
| --- | --- | --- |
| Tool chunk | `04f249` | `466e8a` |
| Tool call ID | `call_20b521bcfc414048bdcdf4bb0ede7708` | `call_fab0ed286af1475ea06afe8f4f6acbb4` — có hai exec_command tuần tự trong call này |
| Transport | Pinned launcher → Node observer → PowerShell -File → Node file target | PowerShell here-string → Node qua stdin/pipeline |
| Tool native exit | **0** | **-1073741819 / 0xC0000005** |
| Child native capture | Ba tầng qua parent handles/events | Không có PID/exit độc lập cho Node và shell hậu kiểm |
| Giá trị stdout | Phù hợp native evidence | JSON PASS đã in không chứng minh successful completion |

Record gốc journal dòng 27941/27944 xác nhận command của diagnostic, host PID12008, thời điểm và tool exit0. Dòng 27959/27963 xác nhận source hậu kiểm và kết quả `466e8a`. Những số dòng là vị trí đọc trong journal hiện hữu, không phải ID evidence mới.

Không dùng exit của `466e8a` thay exit của `04f249`. Không dùng JSON PASS trong `466e8a` để nâng verdict hậu kiểm.

## 3. Native exit correlation — 4/4 VERIFIED

```text
PowerShell launcher PID12008
  -> Node observer PID16784
     -> PowerShell outer PID13664
        -> Node target PID2368
```

| Tầng | PID | Parent PID | Native exit | Bằng chứng độc lập |
| --- | ---: | ---: | ---: | --- |
| Node target | 2368 | 13664 | 0 | target-native-exit.json; outer giữ .NET Process handle và đọc ExitCode |
| PowerShell outer | 13664 | 16784 | 0 | outer-native-exit.json; observer nhận native ChildProcess completion |
| Node observer | 16784 | 12008 | 0 | observer-native-exit.json; launcher giữ .NET Process handle và đọc ExitCode |
| PowerShell launcher | 12008 | NOT_VERIFIED | 0 | Tool native completion `04f249`, liên kết host PID/start output với launcher-receipt.json |

Launcher exit được xác nhận ở tool boundary, không phải tự chứng nhận từ một JSON file. Command gốc gọi launcher rồi `exit $LASTEXITCODE`; launcher source dùng actual observer ExitCode, không chuyển lỗi thành success. Ba child artifacts có independentNativeExit=true, timeout=false, error=null, signal=null. Tool không báo timeout cho launcher; không suy ra một launcher timeout field không được capture.

`observer-outcome.json` chứa observerNativeExit=AWAITING_LAUNCHER_HANDLE là đúng thiết kế. Actual observer completion lấy từ file do launcher ghi sau đó. Không coi trạng thái provisional này là lỗi hoặc thay bằng một giá trị tự tạo.

## 4. Timestamps và thứ tự thực tế

Tất cả mốc dưới đây là **02/11/2026 UTC**; tương ứng **03/11/2026 UTC+7**. Không đổi ngày sự kiện thành ngày review AL.

| Mốc | UTC |
| --- | --- |
| Launcher OS start | 19:13:25.0430288Z |
| Launcher invocation | 19:13:25.3121553Z |
| Approval consumed | 19:13:26.0610251Z |
| Launcher receipt | 19:13:26.1028301Z |
| Observer start request / OS start | 19:13:26.1334263Z / 19:13:26.1390066Z |
| Observer attempt | 19:13:26.329Z |
| Outer spawn observed | 19:13:26.374Z |
| Target start request / OS start | 19:13:27.1771114Z / 19:13:27.1857549Z |
| Target ended | 19:13:27.7347715Z |
| Outer ended | 19:13:27.786Z |
| Observer outcome written | 19:13:27.788Z |
| Observer ended | 19:13:27.8048563Z |
| Diagnostic tool result recorded in journal | 19:13:27.862Z |

Thứ tự nhất quán: parent tạo child, target kết thúc trước outer, outer trước observer, sau đó tool trả completion. Outer OS creation timestamp và launcher parent PID **NOT_VERIFIED**; outer spawn time không được đổi tên thành OS StartTime.

## 5. Approval và exactly-one-attempt evidence

Approval AK SHA256 được ghi nhất quán trong provenance, plan, marker và hậu kiểm:

`ec70cf2998ec99d75fa1cd636eeacec1d426a9ca16ffa27a9c184c5d9f0f4eba`

Plan SHA256 được ghi:

`6f2e5507868aedd26c7d6adc58016a2661a0e99c8fc69ac1d9b709878850e662`

Marker hiện hữu:

`C:\DATN\test-instances\phase13-3b\hash-only-approved-ec70cf2998ec99d75fa1cd636eeacec1d426a9ca16ffa27a9c184c5d9f0f4eba.attempt.json`

Marker trỏ đúng private run; approval.json giới hạn maxAttempts=1/noRetry=true; observer-attempt có maximumAttempts=1 và đúng PID/parent. Execution nằm trước expiry 19:42:52.0507158Z. Provenance ghi noExecutionAttemptCreated=true ở thời điểm tạo plan trước execution, không mâu thuẫn marker được tạo sau đó.

Existing journal cho thấy đúng một launcher invocation và một chuỗi target được ghi nhận trong phiên được duyệt. Hậu kiểm không gọi target/observer executor lần hai: nó chỉ require policy và classifier rồi đọc/hash files. **AK consumed 1/1; AL new attempts 0.** Đây là xác nhận phạm vi evidence đã lưu, không phải giám sát toàn máy để chứng minh không có bất kỳ process ngoài phiên.

## 6. Hash-only result và existing artifact integrity

`target-native-exit.json` ghi HASH_CHECKS_PASS, revision4, sourceCount250, runtimeCount4; stdout214 bytes/stderr0. Native target exit0 và outer exit0 corroborate kết quả này. Vì vậy có thể xác nhận **PASS_EVIDENCE_CONFIRMED** cho hash-only diagnostic trong cửa sổ AK.

Các pin lịch sử khớp giữa approval và reports:

- UI manifest rev4: `b0c8974c6c4244652951963cae28f4eb9d56f07a562de9e32df6c5e16a015d56`.
- AJ source-pin set: `5c7165d76a01f371635950a4365a728ff01c94f98724b843859670502582ab94`.

Các field native trong completion-review.json khớp các artifact riêng đã đọc, bao gồm PID/parent/code/timestamps/hashChecks. Companion anomaly ghi cùng invocation IDs và giữ đúng sự phân biệt hai kết quả. Không thấy mâu thuẫn nội dung trong các evidence này.

AL không tính lại 250 source hashes, không rehash binaries và không replay sourceIntegrityAfter logic. Các artifact SHA256 đã ghi trong AK/completion-review vẫn là observations lịch sử; AL không tuyên bố một cuộc nghiệm thu hash post-state mới. Byte immutability tuyệt đối kể từ khi tạo, current source/binary integrity và chống sửa đổi bởi operator/admin **NOT_VERIFIED** trong AL. Không có signed external evidence chain để suy ra mức bảo đảm đó.

completion-review.json giữ nguyên verdict PASS provisional; post-review-tool-anomaly.json giữ nguyên lời đính chính. Cả hai tiếp tục tồn tại, không overwrite để hòa giải khác biệt. File tồn tại và các field khớp không xóa abnormal tool completion.

## 7. Ownership và cleanup evidence

Journal gốc `a04adc` native0 đã đọc native artifacts và xác nhận run owner/operator SID, protected DACL, một operator FullControl ACE. `202715` native0 xác nhận bốn PID2368/13664/16784/12008 đều ABSENT_AFTER_RECORDED_NATIVE_EXIT và các artifact khi đó operator-only.

Do đó **tracked diagnostic cleanup PASS** theo snapshot lịch sử. Cơ sở ownership là process được parent tạo/giữ handle, PID linkage và run/operator checks. OS owner lookup độc lập cho từng process **NOT_VERIFIED**, không suy từ owner của thư mục.

Không có PID/handle riêng của hậu kiểm `466e8a`, nên cleanup/ownership toàn phiên vẫn **PARTIAL**. Không biết hậu kiểm còn process hay không không phải bằng chứng có process còn sống. AL không tra PID cũ, không kill hoặc Dispose process và không xác nhận current-machine cleanup.

## 8. Source-level assessment của hậu kiểm

Source của command `466e8a` đã được đọc từ journal, không thực thi lại. Nó dùng `@' ... '@ | node`, đọc artifacts, require policy và pure classifyChain, kiểm tra approval/marker binding, hash sources/binaries, ghi completion-review.json bằng flag wx rồi console.log JSON. Không gọi hash-only target entry, PostgreSQL executable, application startup hoặc MQTT.

Command không giữ Node Process handle, không capture Node PID/parent/native ExitCode độc lập và không có observer bên ngoài cho shell. Không lưu riêng `$LASTEXITCODE` của Node. Vì vậy tool code -1073741819 chỉ xác nhận abnormal completion của invocation được quan sát; chưa phân biệt Node, PowerShell hay tool boundary.

Artifact và stdout đã xuất hiện trước khi tool báo abnormal completion. Không có trace về thời điểm flush/termination ở từng process, nên không xác định được lỗi xảy ra trong stream cleanup, process exit hoặc giai đoạn khác. Không dùng stdout làm exit evidence.

AH cũng có inline here-string/stdin → Node và tool 0xC0000005 sau matching output. Điểm giống nhau tạo giả thuyết về execution transport, **không chứng minh root cause chung**. AI ghi WER powershell.exe/ntdll.dll cùng cửa sổ AH nhưng không có PID linkage; không chuyển WER đó sang sự cố AK. Không có bằng chứng độc lập để gán lỗi cho Node, PowerShell, ntdll.dll, Prisma hoặc PostgreSQL. Không sửa source/runtime theo giả thuyết này.

## 9. Confirmed và còn mở

| Nhận định | Kết quả |
| --- | --- |
| Approved diagnostic chain đúng PID/parent và bốn native exits0 | VERIFIED |
| ALL_OBSERVED_NATIVE_EXITS_ZERO cho 04f249 | CONFIRMED |
| Hash-only rev4/250sources/4binaries trong AK | PASS_EVIDENCE_CONFIRMED |
| Approval consumption và một recorded diagnostic attempt | VERIFIED |
| Diagnostic tracked cleanup tại snapshot AK | PASS |
| Hậu kiểm 466e8a abnormal tool completion | CONFIRMED |
| Process/module/root cause của hậu kiểm | UNDETERMINED |
| Hậu kiểm hoàn tất thành công | NOT_VERIFIED |
| Native runtime đã hết lỗi vĩnh viễn | NOT_VERIFIED |
| Current DB/PENDING/runtime flags hoặc live UI readiness | NOT_VERIFIED; ngoài phạm vi |

## 10. Hành động tối thiểu — chọn hướng A

**EXISTING_EVIDENCE_SUFFICIENT** cho diagnostic chain. Chấp nhận independent native evidence đã có, giữ AK overall UNKNOWN và không chạy lại target. Không cần thêm diagnostic attempt để chứng minh lại bốn exit đã được lưu.

Phần còn thiếu là native completion/process boundary của hậu kiểm inline riêng. Điều này không làm mất ba handle-native exits và launcher/tool0 của invocation chính. Nếu cần chốt riêng hậu kiểm thành công trước một quyết định thực thi tiếp theo, chỉ đề xuất file inspection qua transport có native completion độc lập, với phạm vi mới; không replay hash target hoặc lệnh rehash AK. AL không triển khai hay chạy procedure đó.

Bước phát triển có ích tiếp theo là review phạm vi một phiên UI-only mới dựa trên manifest4 và existing diagnostic evidence, giữ các gate SQL read-only/audit/identity/cleanup hiện hữu. Đây chỉ là đề xuất: **chưa tuyên bố UI-only safety preflight hiện tại PASS hoặc cho phép startup**. Actual SQL guard/privileges, frozen data baseline, browser/manual UI và post-check vẫn phải được nghiệm thu theo phê duyệt riêng. Không tái dùng approval AK.

## 11. Final verdict và safety

```text
PHASE AL RESULT

AK diagnostic chain:
VALID — AK_DIAGNOSTIC_CHAIN_EVIDENCE_VALID

Four independent native exits:
4/4 VERIFIED

Hash-only diagnostic:
PASS_EVIDENCE_CONFIRMED

Separate post-review:
NATIVE_OUTCOME_UNKNOWN
POST_REVIEW_NATIVE_COMPLETION_UNDETERMINED

AK historical verdict:
UNCHANGED — HASH_ONLY_NATIVE_DIAGNOSTIC_OUTCOME_UNKNOWN

New diagnostic attempts:
0

PostgreSQL/API/Frontend:
NOT_STARTED

Browser:
NOT_STARTED

MQTT:
NOT_CONNECTED by Agent

DeviceCommand/ON/OFF:
0 ACTIONS

Automation:
NOT_ENABLED by Agent

Soil quality:
SOIL_SENSOR_QUALITY_BLOCKED

Final recommendation:
EXISTING_EVIDENCE_SUFFICIENT
```

Không database connection, credentials read, migration/restore/seed, service startup/restart, new approval/attempt marker hoặc tác động ESP32/bơm. Không sửa các readings/records đã nghiệm thu. Không chạy regression tests vì không sửa code và scope chỉ review evidence. Chỉ thêm báo cáo AL; các reports/artifacts lịch sử giữ nguyên.

**STOP sau Phase AL.**
