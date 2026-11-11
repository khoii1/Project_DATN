# Phase 13.5C.1 — Secure production backup storage

Ngày thực hiện: 22/10/2026. Phạm vi: tạo hai thư mục rỗng, kiểm tra NTFS và runtime chỉ đọc; KHÔNG sao lưu production.

## 1. Kết luận

| Điều kiện | Kết quả |
| --- | --- |
| Tạo đúng hai thư mục | BACKUP_STORAGE_DIRECTORIES_CREATED |
| Owner, DACL, inheritance và reparse | BACKUP_STORAGE_NTFS_VERIFIED |
| Mã hóa ổ đĩa / backup | ENCRYPTION_NOT_VERIFIED |
| Toàn bộ phạm vi cloud/backup | CLOUD_BACKUP_SCOPE_NOT_VERIFIED |
| Backup production | PRODUCTION_BACKUP_NOT_PERFORMED |
| Migration production | PRODUCTION_MIGRATION_NOT_PERFORMED |
| Automation | AUTOMATION_ACTIVE=false |
| Trust readiness | VERIFIED_LIVE_NOT_READY |

Việc tạo thư mục rỗng KHÔNG phải phê duyệt lưu dữ liệu production. Không có dump, credential, recovery key hoặc file xác nhận data-handling trong hai thư mục.

## 2. Script và hash trước thực thi

Script storage Phase13.5C cũ có nhánh ghi `storage-approval.private.json` với `DataHandlingApproved=true`; không chạy nhánh này vì vượt phê duyệt hiện tại. Giữ nguyên script cũ, dùng biến thể empty-only mới.

| File | SHA256 đã đối chiếu trước thực thi |
| --- | --- |
| scripts/phase13-5c1-create-empty-backup-storage.ps1 | D4E74C0B9F4C51481FF1C355C1500E4780556670AA74A2C090780E7B8BCDFF22 |
| scripts/phase13-5c-backup-security.ps1 | EE463654C397BA83F627F2BDEBAF01FCB43B73DE72ADD1D291C81A5445F19E6F |
| scripts/phase13-5c-production-backup.ps1 (review, PLAN_ONLY) | 00C547E85C84B85B48D24D6A361968C41DD8BAC48059B95ED8E76AC89D4992E8 |

Script mới được chạy đúng một lần với `-ExecuteApproved -EmptyOnlyApproval -Confirm:$false` theo phê duyệt người dùng. Refuse target đã tồn tại, không sửa ACL hiện hữu, không tự cleanup. PowerShell AST parse: 0 lỗi. Không chạy lại script sau khi tạo.

## 3. Thư mục và quyền thực tế

Thời điểm nghiệm thu: `2026-10-22T08:41:28.5770286Z` (15:41:28 UTC+7).

Hai đường dẫn thực:

- `C:\Users\Acer Swift3\AppData\Local\SmartAgriculturePostgresBackups`
- `C:\Users\Acer Swift3\AppData\Local\SmartAgriculturePostgresBackups\production`

Operator được kiểm tra bằng WindowsIdentity: `S-1-5-21-1432835263-483988321-3159128977-1001`. LocalApplicationData khớp đường dẫn đã duyệt; filesystem NTFS. Kiểm tra chuỗi thư mục cha không có reparse point bất thường.

Cả hai thư mục sau tạo được đọc lại và PASS:

- Owner chính xác operator SID.
- Protected DACL; không nhận ACE kế thừa từ cha.
- Đúng hai ACE Allow explicit: operator và SYSTEM (`S-1-5-18`), mỗi principal FullControl.
- Hai ACE có ContainerInherit/ObjectInherit để bảo vệ nội dung tạo về sau; bản thân ACE không inherited.
- Không có ACE Users, Authenticated Users, Everyone hoặc CodexSandboxUsers.
- ReparsePoint=false; operator thực tế đọc/liệt kê thành công. Khả năng ghi được cấp bởi FullControl và thao tác tạo child đã thành công; không tạo probe file để giữ thư mục rỗng.
- Container chỉ chứa thư mục con `production`; `production` không có entry. Tổng số file toàn cây = 0.

SDDL trước/sau của LocalAppData, repository và PostgreSQL production PGDATA khớp, không thay ACL các vị trí này. Không dùng lại hoặc sửa `C:\DATN\backups`.

Bằng chứng: `report/phase13-5c1-storage-created.json` chứa hash, owner, từng ACE, inheritance, reparse, children và đối chiếu parent ACL.

## 4. Encryption và cloud scope

Đã chạy read-only `manage-bde.exe -status C:`: native exit code **1**, thông báo quyền truy cập tài nguyên bị từ chối, cần administrative rights. Không nâng quyền hoặc thay cấu hình; không thể kết luận BitLocker đang bật hay tắt. Không đọc/in recovery key.

Known OneDrive root: `C:\Users\Acer Swift3\OneDrive`; target nằm ngoài root đó và ngoài Git repository. Không có biến Dropbox; các đường dẫn mặc định Dropbox/Google Drive trong user profile không tồn tại. Những kiểm tra này không chứng minh không có custom sync/backup hoặc Google Drive mapping khác. Không kiểm kê toàn bộ phần mềm backup. Vì vậy cloud/backup scope tổng thể vẫn NOT_VERIFIED.

NTFS hạn chế đọc thông thường không phải mã hóa; định dạng custom/compression của pg_dump cũng không mã hóa. Chưa cho phép lưu dữ liệu thật vào target.

Các lựa chọn cần người dùng quyết định trước backup:

1. Chạy PowerShell Administrator với `manage-bde.exe -status C:` để xác minh trạng thái mã hóa hiện hữu; không gửi recovery key. Nếu cần bật mã hóa, phải có phê duyệt riêng và lưu recovery key ở nơi độc lập, không cùng dump/repository/chat.
2. Hoặc duyệt riêng cơ chế mã hóa từng backup/container, công cụ và cách giữ khóa ngoài máy/thư mục dump. `7z.exe`/`gpg.exe` chưa thấy trong PATH, không tự cài hoặc tạo mật khẩu plaintext.

Trước khi lưu dữ liệu production cần chốt phạm vi sync đã biết, biện pháp bảo vệ phù hợp và phê duyệt data-handling riêng. Không coi kết quả NTFS là đã hoàn tất các điều kiện này.

## 5. Review production backup PLAN_ONLY

Đã chạy script production backup ở mặc định: kết quả PLAN_ONLY, ProductionBackupPerformed=false, CredentialsRequested=false. Không gọi pg_dump production.

Runbook cho phiên được phê duyệt sau này:

1. Phê duyệt bảo vệ/lưu dữ liệu và phiên backup riêng; nghiệm thu lại ACL, encryption/sync, dung lượng, source identity và runtime an toàn.
2. Giữ nguyên gate: script hiện yêu cầu `storage-approval.private.json` khớp operator/approval và DataHandlingApproved=true. File này chưa tồn tại, vì vậy chưa đủ điều kiện Execute. Cần bước attestation hẹp được review/phê duyệt riêng cho thư mục đã tồn tại; không chạy lại script tạo thư mục cũ hoặc tự bỏ gate.
3. PG17 `pg_dump -Fc` từ 127.0.0.1:5432/smart_agriculture; mỗi lần tạo run directory mới timestamp+GUID, không overwrite. Không đặt dump trong Git.
4. `pg_dumpall --roles-only --no-role-passwords` chỉ metadata role, không password hash. Globals khác như tablespace cần review riêng nếu phát sinh; không coi roles-only là toàn bộ cluster globals.
5. Thu native stdout/stderr/exit code bằng ProcessStartInfo, đọc hai stream bất đồng bộ; giữ log riêng tư. Input mật khẩu cục bộ SecureString, truyền child environment tạm thời, không CLI/report/pgpass plaintext. Không in credential/JWT/database URL hoặc dữ liệu dump.
6. Kiểm tra SHA256, kích thước, `pg_restore --list`; list/hash không thay cho restore nghiệm thu. Restore sau này chỉ target độc lập được phê duyệt. Capture failure riêng, giữ partial artifacts, không tự retry/ghi đè.

Script production hiện không bị sửa. Không có data-handling attestation hoặc approval ID giả được tạo trong phase này.

## 6. Runtime read-only trước/sau

Sau kiểm tra: `2026-10-22T08:43:29.877Z`. Bằng chứng `report/phase13-5c1-production-inventory.json` và `report/phase13-5c1-production-inventory-after.json`.

- Backend port5000 PID22400 vẫn chạy; health database=connected, mqtt=connected.
- Startup safety attestation khớp PID listener22400: Commands=false, Automation=false, testMode=true, effectiveMaxRunSeconds=1. Không login API để tránh authentication writes; flags dựa log startup của đúng process còn phục vụ, không tuyên bố đã đọc protected runtime endpoint mới.
- Broker LAN1883 PID3592; instance loopback riêng PID4572 không bị can thiệp. PostgreSQL5432 PID7848. Không có listener test55433.
- Production identity: smart_agriculture/public, system ID7472695863566132416, PGDATA `C:/Program Files/PostgreSQL/17/data`, PostgreSQL17.2. Truy vấn transaction read_only=on.
- Migration11/checksum khớp; chưa có sáu ledger production. Không chạy DDL/migration.
- DeviceCommand43 trước và sau; PENDING=0; không tạo command mới.
- ESP32 ONLINE, lastSeen `08:43:22.061Z`; PUMP_01 OFF, timestamp trạng thái `08:43:21.812Z`. Đây là trạng thái phần mềm/GPIO được lưu, không phải feedback động cơ/nước.
- Bốn readings mới cùng recordedAt `08:43:19.732Z`, receivedAt `08:43:19.951Z`: TEMP24.5, HUM46.3, SOIL5.77, LIGHT0. Giá trị0 không bị coi là thiếu dữ liệu.

Không restart backend/broker/PostgreSQL; không sửa credentials, firmware, schema/startup; không phát ON/OFF hoặc cấp nguồn bơm. Trạng thái nguồn adapter giữ theo xác nhận vận hành trước đó, không thể đo vật lý từ các truy vấn này.

## 7. Thay đổi và kiểm tra trong phase

- Thêm `scripts/phase13-5c1-create-empty-backup-storage.ps1`: giới hạn tạo hai thư mục không chứa file/attestation.
- Bổ sung selector `--phase13-5c1` trong `backend/scripts/phase13-5b-inventory.cjs` để evidence riêng, không đổi runtime backend.
- Thêm báo cáo này và ba evidence JSON nêu trên.
- Thực thi create + đọc lại ACL/owner/inheritance/reparse/empty/parent SDDL: PASS.
- Script AST: PASS (0 lỗi). Production backup mặc định PLAN_ONLY: PASS.
- BitLocker read-only: NOT_VERIFIED (access denied); cloud scope tổng thể: NOT_VERIFIED.
- Không chạy lại 528 regression hoặc 33 restore tests: không đổi domain/runtime/backup execution code; kế thừa kết quả Phase13.5C, không ghi chúng là test mới.

Dừng ở storage rỗng. Chưa backup production, chưa migration, chưa bật VERIFIED_LIVE/ACTIVE hoặc kích hoạt máy bơm.
