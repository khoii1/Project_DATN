# Offline native exit timestamp fix

05/11/2026. Phạm vi: OFFLINE REVIEW + MINIMAL PRIVATE PATCH + SYNTHETIC TESTS. **Không thực hiện diagnostic thật mới**; giữ nguyên verdict/attempt1/1 của [lượt trước](FINAL_NATIVE_DIAGNOSTIC_RESULT.md).

## Nguyên nhân và giới hạn bằng chứng

**Exact root cause khiến Outer/Observer trả ExitTime năm1601: UNKNOWN.** Source xác nhận observer cũ không gọi WaitForExit: tại hai nhánh nó dùng `HasExited`, lấy ExitCode rồi `.ExitTime.ToUniversalTime().ToString('o')`. Không có explicit FILETIME conversion trong script. `Assert-NativeSuccess` cũ kiểm exit0/timeout/error/streams nhưng không kiểm OS ExitTime, nên chấp nhận default/zero-epoch timestamp: **validator defect CONFIRMED**.

Runtime local đọc bằng reflection/file metadata: Windows PowerShell5.1.26100.9711, CLR4.0.30319.42000, System.dll4.8.9340.0. Không chạy process diagnostic để kiểm runtime này.

Microsoft reference source cho thấy HasExited có nhánh kiểm exit code trước signaled-handle; ExitTime đọc process times, có cache, rồi chuyển FILETIME thành DateTime. WaitForExit(int) kiểm process wait handle. Đây là cơ sở thay completion gate, **không chứng minh race cụ thể đã xảy ra trong phiên trước hoặc source reference khớp từng instruction của installed binary**. [Microsoft Process.cs](https://github.com/microsoft/referencesource/blob/main/System/services/monitoring/system/diagnosticts/Process.cs).

FILETIME lấy epoch01/01/1601; exit-time buffer chưa được định nghĩa nếu process chưa kết thúc theo API contract. Điều này phù hợp một khả năng cần phòng ngừa, không phải kết luận nguyên nhân. Không có raw native GetProcessTimes buffer của phiên cũ để chứng minh zero bắt nguồn ở đâu. `.ToUniversalTime()` và JSON round-trip không cung cấp lý do để đổi timestamp1601 thành giờ2026. [Microsoft GetProcessTimes](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-getprocesstimes).

Node ghi timestamp hợp lệ còn hai PowerShell ghi1601 là dữ kiện của phiên trước; khác biệt timing/runtime có thể liên quan nhưng chưa được tái hiện hoặc xác minh. Không quy lỗi ntdll, JSON hoặc PowerShell theo suy đoán.

## Minimal private patch

Thư mục mới operator-only:

`C:\DATN\test-instances\phase13-3b\native-exit-time-fix-1793881071014-3f61116c`

Chỉ chứa function definitions, fake tests và evidence; **không launcher/main, không wiring vào phiên cũ**. Bản cũ/evidence/review hashes giữ nguyên. Bản sao trước sửa là `held-handle.before.ps1`.

- `held-handle.ps1`: thay hai gate `HasExited` bằng bounded polling `WaitForExit(0)` trên retained Process; kiểm Handle tồn tại. Không dùng WaitForExit vô hạn, refresh/retry ExitTime hay fallback.
- Sau khi wait trảtrue, ghi **observedCompletionUtc** ngay; đọc native ExitCode độc lập, giữ nguyên nonzero/UNKNOWN. Sau đó đọc ExitTime đúng một lần, trước Dispose.
- **osExitTimeRaw** giữ giá trị API đọc được. **osExitTimeFileTimeDerived** chỉ là chuyển ngược DateTime→FILETIME để validation, không giả raw kernel buffer đã capture.
- **osExitTimeUtc** chỉ được ghi khi hợp lệ. Zero/1601, trước creation, sau observation, timezone/type sai, missing/unreadable đều **osExitTimeStatus=INVALID**, normalized UTC=null, có reason. Không thay bằng observedCompletionUtc/ước lượng. Chưa quan sát signaled completion thì NOT_OBSERVED.
- `validator.ps1`: giữ native gates và bắt buộc handle/signaled + timestamp VALID, raw/derived/UTC tương ứng và creation≤exit≤observation. Native exit0 nhưng time invalid vẫn bị từ chối full evidence PASS.

**Không kết luận WaitForExit(0) đã chữa lỗi thật.** Đây là gate đồng bộ phù hợp hơn và validation fail-closed đã được kiểm thử synthetic; còn cần phê duyệt mới nếu muốn chạy thật.

## Synthetic regression

**66/66 PASS**,0fail trong lượt hoàn chỉnh cuối; PowerShell harness native exit0, tool chunk `2ab069`. Fake process/MemoryStream, không spawn Node/PowerShell target con hoặc dùng process handle thật. AST ba scripts PASS.

Bao phủ: valid time, FILETIMEzero/year1601, beforecreation, futuretime, null/unreadable/type/zone sai; exit0 với invalid time; exit3/-1073741819/259 giữ nguyên; UNKNOWN exit; timeout/missing handle/process; wait-signal trước ExitCode/ExitTime; observed time khác OS time; combined byte cap/stderr/cleanup; metadata giả/incomplete bị reject; JSON giữ INVALID/raw/null và valid round-trip.

Lượt harness đầu exit1, chunk `8c5955`, do `$script:Cases` bị `$cases` array ghi đè vì PowerShell không phân biệt hoa/thường. Đã đổi tên collection test, giữ `synthetic-first-failure.json`; đây không phải diagnostic target failure và không xóa evidence. Các lỗi property-read trong fake có thể được PowerShell trả thành null; cả READ_FAILED/MISSING đều INVALID, không fullPASS.

| Private file | SHA256 |
|---|---|
| held-handle.ps1 | ec6838a6162e00a4802ad548246bf28031a507cd30b86e5a2bc276c45758962f |
| validator.ps1 | f9e9033b01bd655611288cf04edc0fe0bb8bff387cac2ee1a05af8aae7c2e002 |
| synthetic-tests.ps1 | b6fdcf6243c671acc0eb71f5abd65ab84437b6840635af32b63f4f15f1b2064c |
| synthetic-test-result.json | ebff20fa7cd796f18298dbe9acff254b5c47c221a2d6878c8864be347ad2804c |

`offline-review.json` ghi private ACL readback PASS, không old-evidence drift. Manifest revision9 vẫn `2b23c8cd86f288d7ba5842e3f2850e37cbaf7f0221c1d8075a1f597d337e9af9`. Không sửa project runtime/tests/manifest, API, DB hoặc firmware; chỉ thêm báo cáo này trong repository. Chưa giải quyết metadata tool-host nằm ngoài observer contract hoặc chứng minh wrapper end-to-end mới hoạt động.

## Kết luận

```text
Exact root cause of real invalid ExitTime: UNKNOWN
Missing timestamp validation: CONFIRMED
Minimal private patch: PREPARED
Synthetic tests: 66/66 PASS (native harness exit0)
Native exit code handling: PRESERVED
Timestamp validation: PASS (synthetic)
Project runtime/manifest: UNCHANGED
New native diagnostic: NOT_EXECUTED
Website/PostgreSQL/MQTT/Pump: NOT_STARTED
Previous diagnostic attempt: 1/1 UNCHANGED
```

STOP sau offline review/tests. Không tái dùng approval cũ; mọi lượt native mới cần phê duyệt riêng, source pin mới và integration review trước attempt. Không tự chuyển sang nghiệm thu Website.
