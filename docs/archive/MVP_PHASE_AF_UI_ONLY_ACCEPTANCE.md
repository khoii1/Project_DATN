# AF — Approved One-Shot Supervised UI-Only Historical Acceptance

Ngày kiểm tra: 03/11/2026, UTC+7.

**Kết quả: HISTORICAL_WEBSITE_UI_BLOCKED — dừng tại runtime hash gate, trước startup.**

## A. Approval và phạm vi

Phê duyệt thực tế: attachment `1b0509d8-0f42-444e-9b47-ffd602a187bd/Pasted text.txt`.

Approval SHA256: `15266E9661283C3C94EC4263D810F953D8E5827421229D9013E4704332F1BF29`.

Scope `ONE_DEV_UI_ONLY_HISTORICAL_SESSION`, tối đa một phiên, không retry; historical data only, không MQTT/production/hardware. Không yêu cầu phê duyệt lại cùng phạm vi.

Đã đối chiếu báo cáo [AE](MVP_UI_ONLY_SUPERVISOR_PREPARATION.md), bằng chứng Y, supervisor/runtime/worker, launcher, readonly adapter và API boundary. Báo cáo AE đã được tách file theo yêu cầu người dùng; không coi liên kết thay thế là thiếu contract.

## B. Private run và attempt

Chưa tạo private execution plan, run, approval-consumption marker hoặc attempt. Runtime integrity gate thất bại trước các bước này. Không dùng lại run Y/AB hoặc approval cũ. Không đọc/decrypt credentials.

## C. Source và runtime integrity

Manifest: `docs/PHASE_AE_UI_ONLY_SOURCE_MANIFEST.json`, revision 2.

SHA256 manifest khớp baseline AE:

`9f3d8e6115975d8739996e461187249c39a44f969c5c31b18045bbfa7bb6bf59`

**SOURCE_MANIFEST_250_VERIFIED_PASS**: đúng 250 entries, toàn bộ SHA256 khớp; kiểm tra canonical paths, phạm vi repository, không trùng canonical paths, không traversal, không symbolic-link/reparse bất thường qua kiểm tra filesystem Node; tập required sources khớp `sourceFiles()` của runtime. Markdown reports không nằm trong manifest. Không sửa source hoặc cập nhật expected hashes.

| Runtime binary | Đối chiếu với pin AE |
| --- | --- |
| node.exe | PASS |
| pg_ctl.exe | PASS |
| pg_controldata.exe | PASS |
| postgres.exe | BLOCKED — expected pin không hợp lệ |

File: `C:\Program Files\PostgreSQL\17\bin\postgres.exe`.

- Expected trong manifest và `mvp-ui-only-runtime.cjs`: `94a8ea85cffd4a15c21290ca555a06438d3f7621b001beae6b1373c210d5a1746`.
- Expected có **65 ký tự**, không phải SHA256 hex hợp lệ.
- Actual SHA256: `94A8EA85CFFD4A15C21290CA555A06438D3F7621B001BEA6B1373C210D5A1746`.
- Actual có 64 ký tự; file size 9,890,304 bytes; file/product version 17.2; last-write UTC `2024-12-17T10:31:04.0000000Z`.

Đây là **invalid baseline pin** đã xác định bằng source/manifest/file hashing. Không suy rằng binary bị sửa hoặc PostgreSQL lỗi từ sự khác biệt này. Chưa nghiệm thu lại nguồn gốc binary cho một baseline mới. Không chạy binary để thử, không tự thay pin bằng actual hash nhằm vượt gate.

Các phép kiểm tra file dùng PowerShell/Node đã kết thúc native exit 0. Chúng không phải fresh DEV preflight và không thay bằng chứng process tree/SQL của phiên thật.

## D. Fresh native preflight

NOT_EXECUTED. Không chạy original preflight, pg_controldata, pg_ctl hoặc native diagnostic observer. Không có process tree preflight hoặc native startup evidence để báo PASS.

## E. PostgreSQL DEV identity

NOT_VERIFIED trong AF. Không khởi động hoặc kết nối database; không dùng identity Y làm bằng chứng hiện tại. Không truy cập production 5432.

## F. Real PostgreSQL transaction read-only

NOT_EXECUTED / BLOCKED. Chưa có actual SQL verification cho single/concurrent/batch/callback paths trong AF. Kết quả synthetic AE không thay cho nghiệm thu này.

## G. Eight mappings và twelve readings

Chưa truy vấn hoặc đối chiếu lại. Các IDs và giá trị tham chiếu Y/AE được giữ nguyên; không tạo/sửa/xóa readings hoặc identity records. Business counters và audit persistence trước/sau chưa được đo trong AF.

## H. DEV API và authentication

NOT_EXECUTED. Không start API 55001, không login, không nhận JWT, không đánh dấu memory-only audit PASS. Không xác minh runtime flags chỉ từ cấu hình source.

## I. Frontend readiness

NOT_EXECUTED. Không start frontend 55173 hoặc yêu cầu operator mở website.

## J. Manual browser và screenshots

NOT_EXECUTED. Không launch Edge/Playwright, không có manual window hoặc screenshot mới; không tạo ảnh giả thay evidence.

## K. Historical labeling, timezone và soil

Live visual verification NOT_VERIFIED. Tham chiếu vẫn là `STORED_HARDWARE_DATA_FROM_PHASE_Y`, ngày 02/11/2026, không gọi dữ liệu cũ là telemetry live. Giữ `SOIL_SENSOR_QUALITY_BLOCKED`; historical SOIL numeric 100% không chứng minh calibration hoặc chất lượng cảm biến.

## L. Post-acceptance integrity

NOT_VERIFIED vì không có session/database baseline hoặc post-check. Không tuyên bố independent zero-write proof từ source review. Không có DB access hoặc business mutation nào được Agent thực hiện trong AF.

## M. Cleanup và ownership

Không tạo owned service/process dài hạn, nên không có tài nguyên AF cần shutdown. Không stop/restart backend, PostgreSQL, broker hoặc thiết bị. Cleanup của một phiên chạy thật chưa được kiểm thử trong AF.

## N. Final classifications và bước tối thiểu tiếp theo

| Hạng mục | Kết quả |
| --- | --- |
| Approval | APPROVED |
| Source integrity | 250/250 PASS |
| Runtime binary pins | BLOCKED — postgres.exe pin 65 ký tự |
| Fresh preflight | BLOCKED / NOT_EXECUTED |
| PostgreSQL DEV identity | BLOCKED / NOT_VERIFIED |
| Real PostgreSQL readonly enforcement | BLOCKED / NOT_EXECUTED |
| Historical mappings 8/8 | BLOCKED / NOT_VERIFIED |
| Stored readings 12/12 | BLOCKED / NOT_VERIFIED |
| DEV API | BLOCKED / NOT_EXECUTED |
| Authentication | NOT_EXECUTED |
| Memory-only audit | NOT_VERIFIED |
| Frontend readiness | BLOCKED / NOT_EXECUTED |
| Manual browser acceptance | NOT_EXECUTED |
| History/chart correlation | BLOCKED / NOT_VERIFIED |
| Historical/stale labeling | NOT_VERIFIED trên UI thật |
| Soil quality | BLOCKED |
| MQTT CONNECT | 0 thao tác Agent |
| MQTT application PUBLISH | 0 thao tác Agent; không independent packet capture |
| DeviceCommand created | NOT_VERIFIED qua DB; không thao tác tạo lệnh |
| ON/OFF commands | 0 |
| Automation runtime | NOT_VERIFIED; không bật Automation |
| Business data before/after | NOT_VERIFIED |
| Cleanup | Không phát sinh owned resources; actual session cleanup NOT_EXECUTED |
| Final verdict | HISTORICAL_WEBSITE_UI_BLOCKED |

Bước tối thiểu được đề xuất: review offline nguồn gốc binary và pin sai; sửa có kiểm thử riêng runtime constant + manifest/report liên quan, không sửa PostgreSQL binary hoặc safety policy. Baseline mới phải được review trước một phiên thực thi tiếp theo. Không tự thực hiện remediation/retry trong AF và không coi approval hiện tại tự động chấp thuận source hashes mới.

**STOP trước startup.** Không MQTT, DB startup/connect, API/frontend/browser, production access, migration/seed/restore, credential changes hoặc tác động phần cứng.
