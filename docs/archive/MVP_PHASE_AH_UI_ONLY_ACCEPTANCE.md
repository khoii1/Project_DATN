# Phase AH — Approved One-Shot Real DEV UI-Only Historical Acceptance

Ngày báo cáo: 03/11/2026, UTC+7.

**HISTORICAL_WEBSITE_UI_BLOCKED — dừng trước startup vì lệnh xác minh baseline có native completion bất thường. Không retry.**

## A. Actual approval và scope

Approval mới: attachment `d7beea37-4806-492f-9250-659741611ee7/Pasted text.txt`.

SHA256 được lệnh kiểm tra tính và xuất: `cd31a7a1544da5178f766e9a4fa4ef7c1ee3d0ef24873c52b51610c2c09e26fb`.

Scope `ONE_DEV_UI_ONLY_HISTORICAL_SESSION`, tối đa một phiên, không retry; chỉ historical readings Y trên DEV55433/API55001/frontend55173, không MQTT/production/hardware. Người dùng đã cấp quyền; không thiếu approval khởi động DEV và không yêu cầu phê duyệt lại cùng phạm vi.

Đã đọc yêu cầu AH, báo cáo AG, nguồn supervisor/worker/launcher và đối chiếu manifest runtime/source. Tài liệu AE, AF, AG và bằng chứng Y được kế thừa, không sửa verdict hoặc dữ liệu lịch sử.

## B. Manifest revision 3 và fresh integrity check

Expected manifest SHA256 từ AG:

`9dba4f40586e31db45f8fac63147d71875bb6260d8a66fa75df9b656460cbc8a`

Lệnh Node qua PowerShell kiểm tra read-only:

- Manifest revision/hash.
- Snapshot revision 2 và `previousManifestSha256`.
- Đúng 250 source members và membership với `sourceFiles()`.
- Canonical paths, trùng canonical path, traversal và symlink/reparse qua filesystem.
- SHA256 của toàn bộ source files.
- Equality runtime constants/manifest, format 64 lowercase hex và hashes bốn runtime binaries.
- Hash approval AH và sự tồn tại approval-consumption marker tương ứng.

Lệnh chỉ đọc source, metadata, binary bytes để hash và import module không tự startup. Không chạy PostgreSQL binary hoặc đọc credentials.

Stdout đã in:

```json
{"manifestRevision":3,"manifestSHA256":"9dba4f40586e31db45f8fac63147d71875bb6260d8a66fa75df9b656460cbc8a","sourceMatches":250,"runtimeMatches":4,"lineageVerified":true,"approvalSHA256":"cd31a7a1544da5178f766e9a4fa4ef7c1ee3d0ef24873c52b51610c2c09e26fb","AHMarkerExists":false,"executionStarted":false}
```

Tuy nhiên, **tool completion của chính lệnh này là exit `-1073741819` (`0xC0000005`)**, không phải 0. Vì vậy kết quả stdout chỉ là computed observations, **không đủ chứng nhận source/runtime gate PASS theo execution contract AH**. Không sửa pin, manifest hoặc binary để vượt lỗi.

Nguồn AG và source hiện hành được Git báo untracked ở các file launcher/runtime/supervisor/worker/manifest; không suy có reviewed commit. Không thay đổi working-tree source trong AH.

## C. Private run và attempt

Không tạo PlanFile, private execution run, launcher receipt, approval-consumption marker hoặc attempt. Lệnh kiểm tra marker đã xuất `AHMarkerExists=false`; không có thao tác tạo marker nào trong AH.

Không chạy `mvp-ui-only-session.ps1`, `--execute`, `--check-plan` hoặc reuse approval AF. Không lưu/decrypt password, JWT, cookie hoặc database URL.

## D. Native completion và fresh preflight

| Thao tác | Tool completion | Phạm vi |
| --- | --- | --- |
| Đọc attachment AH | exit0 | Read-only text |
| Đọc source/reports | exit0 | Read-only text |
| Git status/source search | exit0 | Read-only metadata/source |
| Baseline hash/lineage check | **-1073741819** | Read-only filesystem; đã in JSON trước completion |

Lệnh baseline dùng PowerShell host và `node` child qua stdin pipeline. Không có independent process observer trong bước này. Chưa thu được PID/native exit riêng cho từng tầng nên **không thể xác định outer PowerShell hay Node là tiến trình lỗi**, không có faulting module hoặc root cause đã chứng minh. Mã lỗi tương ứng Windows access-violation status, không tự chứng minh thành phần nào đã crash.

Original supervised fresh preflight chưa được gọi: không chạy pg_controldata, helper ACL/listener hoặc native preflight observer. Không dùng kết quả lịch sử Y hoặc JSON baseline làm preflight exit0. Dừng downstream ngay sau nonzero; không thử lại lệnh để lấy PASS.

## E. PostgreSQL DEV startup và identity

NOT_EXECUTED. Không start PostgreSQL, gọi pg_ctl hoặc mở SQL connection. Target identity/role/schema/11 migrations/capabilities chưa được xác minh thực tế trong AH. Không kết nối production5432.

## F. Real transaction read-only verification

NOT_EXECUTED. Chưa có actual SQL evidence cho single/concurrent/batch/callback/nested/application paths. Không sử dụng 129 tests AG để thay thế actual transaction verification.

Source review còn cho thấy một khoảng trống cần giải quyết trước execution tiếp theo: worker `SNAPSHOT` hiện chạy hai `readTransaction` concurrent và snapshot trực tiếp; chưa có pre-serving exercise/attestation riêng cho guarded ORM batch/callback/nested paths mà AH yêu cầu. Đây là thiếu evidence/gate coverage, không phải bằng chứng dữ liệu đã bị ghi.

## G. Eight mappings và twelve readings

NOT_VERIFIED trong AH: không truy vấn DB. Không tạo/sửa/xóa/upsert records/readings hoặc thay timestamps.

Source review: snapshot hiện có counts `commands`, `pending`, `enabledAutomation`, `actuatorOn`, `allReadings`; **chưa lấy persisted ActivityLog count**. Vì vậy supervisor hiện tại chưa đáp ứng đầy đủ baseline/post-check ActivityLog mà AH yêu cầu. Không dùng memory-only audit counter thay cho persisted DB count. Chưa sửa source hoặc tạo baseline mới để bù thiếu trong phiên execution này.

## H. API runtime/authentication/guards

NOT_EXECUTED. Không API startup, login, HTTP requests hoặc JWT. Commands/Automation/MQTT disabled là thiết kế source được review, **không phải effective runtime attestation đã thực hiện trong AH**.

## I. Frontend readiness

NOT_EXECUTED. Không start Vite/front-end, không kiểm tra HTTP/bundle trên port55173. Chưa có readiness để yêu cầu operator mở Edge.

## J. Manual browser evidence

NOT_EXECUTED. Không mở browser, Playwright hoặc manual window; không thu screenshot/checklist mới và không tự điền PASS. Không gửi `PHASE_AH_MANUAL_BROWSER_READY` khi chưa có services sẵn sàng.

## K. Historical labels/timezone/soil

Visual acceptance NOT_VERIFIED. Tham chiếu Y vẫn là stored hardware readings ngày02/11/2026, không current telemetry hoặc realtime update. SOIL numeric100% không chứng minh calibration. Giữ **SOIL_SENSOR_QUALITY_BLOCKED**; không dùng soil data này cho automatic irrigation.

## L. Post-check integrity

NOT_VERIFIED vì không có DB baseline/post-check trong AH. Không tuyên bố counters unchanged hoặc independent zero-write proof. Trong các thao tác Agent đã thực hiện, không có SQL mutation hoặc database connection.

## M. Cleanup

Không tạo owned DEV services hoặc execution worker nên không có resources AH cần shutdown. **Cleanup session: NOT_EXECUTED / không phát sinh tài nguyên**. Không stop/restart PostgreSQL, backend, broker hoặc ESP32. Không force-kill/retry.

## N. Final result và remaining blockers

```text
PHASE AH RESULT

Approval: APPROVED
Manifest rev3: BLOCKED (250 matching observations; native completion nonzero)
Runtime hashes: BLOCKED (4 matching observations; native completion nonzero)
Fresh preflight: BLOCKED / NOT_EXECUTED
PostgreSQL DEV identity: BLOCKED / NOT_VERIFIED
Real readonly transactions: BLOCKED / NOT_EXECUTED
Identity records: BLOCKED / NOT_VERIFIED
Historical readings: BLOCKED / NOT_VERIFIED
API startup: NOT_EXECUTED
Authentication: NOT_EXECUTED
Memory audit: NOT_VERIFIED
Frontend readiness: NOT_EXECUTED
Manual browser: NOT_EXECUTED
History/charts: BLOCKED / NOT_VERIFIED
Asia/Ho_Chi_Minh: NOT_VERIFIED
Historical/soil notices: NOT_VERIFIED
Post-acceptance data integrity: NOT_VERIFIED
MQTT CONNECT: 0 actions by Agent
MQTT application PUBLISH: 0 actions by Agent; NOT_INDEPENDENTLY_VERIFIED
DeviceCommand actions: 0 actions by Agent; DB counts NOT_VERIFIED
Pump ON/OFF: 0
Automation: NOT_VERIFIED runtime; no enable action
Cleanup: NOT_EXECUTED (no owned services created)

FINAL VERDICT: HISTORICAL_WEBSITE_UI_BLOCKED
```

Bước tiếp theo tối thiểu được đề xuất: chẩn đoán offline native completion boundary để phân biệt host/Node, không retry live session; review riêng hai gate coverage gaps ở F/G và kiểm thử trước khi thay baseline đã pin. Không đổi PostgreSQL identity/role/PGDATA, không giảm timestamp/readonly/safety guards và không coi stdout là completion PASS.

Phê duyệt AH là có thật; blocker không phải thiếu permission. Tuy nhiên phiên này dừng theo quy tắc FAIL/UNKNOWN của chính AH. Không tự sửa source, đổi expected hashes, tạo session khác hoặc chuyển sang phase tiếp theo.

**STOP. Không live DEV startup, MQTT, production, migrations, DeviceCommand, ON/OFF, Automation hoặc hardware actions.**
