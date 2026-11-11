# Phase 13.5C.2 — Production backup approval readiness

Ngày 22/10/2026. Chỉ review và chuẩn bị phê duyệt; chưa tạo attestation hay backup production. Kế thừa nghiệm thu NTFS/restore Phase13.5C/C.1, không chạy lại các suite đã PASS.

## 1. Bằng chứng mã hóa người dùng cung cấp

Ảnh `manage-bde -status C:` chạy Administrator cho thấy:

| Thuộc tính | Giá trị |
| --- | --- |
| Volume | C: [OS Volume], 475.96 GB |
| BitLocker Version | 2.0 |
| Conversion Status | Used Space Only Encrypted |
| Percentage Encrypted | 100.0% |
| Encryption Method | XTS-AES 128 |
| Protection Status | Protection On |
| Lock Status | Unlocked |
| Protector types | TPM; Numerical Password |

**ENCRYPTION_VERIFIED — phạm vi ổ C, theo ảnh Administrator người dùng cung cấp.** Đây là 100% theo chế độ Used Space Only, không phải bằng chứng đã mã hóa/ghi đè mọi sector trống hoặc dữ liệu từng bị xóa. Ảnh không có thời điểm đo có thể kiểm chứng độc lập; không tuyên bố là truy vấn Administrator mới do Agent thực hiện.

Không đọc recovery key, không tự nâng quyền, không đổi BitLocker. Protector type Numerical Password không phải nội dung recovery key.

BitLocker bảo vệ dữ liệu at-rest khi ổ bị khóa; hiện ổ Unlocked. Không bảo đảm chống admin, malware, tiến trình có quyền đọc hoặc dữ liệu bị đồng bộ/copy khỏi ổ. File dump custom-format tự nó không mã hóa. Nếu cần bảo vệ bản sao khi rời ổ C, phải duyệt thêm mã hóa file/container và quản lý khóa độc lập; không tự cài phần mềm hoặc tạo plaintext password.

Recovery key cần được người dùng giữ ở nơi độc lập, an toàn và có thể truy xuất khi khôi phục; vị trí/khả năng phục hồi key chưa được nghiệm thu, không yêu cầu gửi key vào chat.

## 2. NTFS và rủi ro cloud còn mở

Đọc lại hai thư mục hiện có bằng helper đã nghiệm thu: PASS operator/owner/protected DACL/exact operator+SYSTEM FullControl/no reparse. Tổng số file vẫn 0, attestation chưa tồn tại. Không tạo lại thư mục hoặc sửa ACL.

Target: `%LOCALAPPDATA%\SmartAgriculturePostgresBackups\production`, ngoài repository và known OneDrive root đã kiểm tra ở C.1. Không mở rộng thành kiểm kê mọi công cụ backup.

**CLOUD_BACKUP_SCOPE_NOT_VERIFIED.** Custom backup/sync vẫn có thể đọc và chuyển dump cùng metadata ra nơi khác nếu có quyền. Người dùng cần quyết định chấp nhận rủi ro còn lại cho một phiên lưu cục bộ, hoặc chọn mã hóa file bổ sung trước backup. Chấp thuận rủi ro không đổi trạng thái scope thành VERIFIED.

## 3. Review script backup

Đã đọc lại `scripts/phase13-5c-production-backup.ps1`. SHA256 không đổi:

`00C547E85C84B85B48D24D6A361968C41DD8BAC48059B95ED8E76AC89D4992E8`

Helper `scripts/phase13-5c-backup-security.ps1` SHA256:

`EE463654C397BA83F627F2BDEBAF01FCB43B73DE72ADD1D291C81A5445F19E6F`

Default PLAN_ONLY; Execute cần cả StorageApprovalId, BackupApprovalId, attestation và ShouldProcess. Các guard kiểm tra source identity PG17/127.0.0.1:5432/smart_agriculture/public/system ID7472695863566132416/PGDATA production, migration checksum, PENDING=0, runtime đúng PID với false/false/testtrue/cap1s và dung lượng.

Backup dự kiến: `pg_dump -Fc`, `pg_dumpall --roles-only --no-role-passwords`, SHA256, `pg_restore --list`, native stdout/stderr/exit code. Mỗi run dùng timestamp+GUID, không overwrite; giữ artifacts lỗi, không tự retry. Metadata roles-only không phải toàn bộ globals/tablespace. List/hash không chứng minh restore production đã PASS.

Credential chỉ nhập cục bộ bằng SecureString; child environment tạm thời, không CLI/report hoặc plaintext password file. Dù không ghi password xuống đĩa, quyền admin/process inspection vẫn có rủi ro đọc bộ nhớ/environment; không tuyên bố chống malware/admin.

Không chạy Execute hoặc pg_dump trong phase này. Không sửa source script backup hoặc bỏ gate.

## 4. Cách attestation cho thư mục đã tồn tại — chuẩn bị, chưa thực hiện

Không chạy lại `phase13-5c-prepare-backup-storage.ps1`: script cũ đòi NEW_TARGETS và không phù hợp hai thư mục đã tồn tại.

Sau phê duyệt riêng, chuẩn bị/review một bước attestation hẹp:

1. Đối chiếu hash helper, operator SID, target thực/no reparse/known sync và ACL cả hai thư mục; không tạo lại hoặc repair ACL.
2. Liên kết approval thật của người dùng với StorageApprovalId/BackupApprovalId có thể truy nguyên. ID chỉ là nhãn kỹ thuật cho phê duyệt đã nhận, không phải bằng chứng thay thế sự đồng ý; chưa cấp hoặc giả ID ở phase này.
3. Chỉ khi người dùng đồng ý lưu production và chấp nhận residual cloud risk, tạo duy nhất `storage-approval.private.json` bằng create-new/no-overwrite trong production directory đã bảo vệ. File nhận ACL phù hợp từ cha và phải được đọc lại kiểm tra; không chứa credential, key hoặc database content.
4. Trường tương thích gate hiện hữu: StorageApprovalId, OperatorSid, DataHandlingApproved=true, CreatedAt. Thêm nguồn approval, EncryptionStatus=ENCRYPTION_VERIFIED_C_USER_PROVIDED_EVIDENCE, CloudBackupScope=NOT_VERIFIED và ResidualRiskAccepted=true; không giả cloud VERIFIED.
5. Nếu file đã tồn tại hoặc ACL/đường dẫn khác dự kiến: STOP, không overwrite/repair. Đối chiếu attestation rồi mới gọi backup đúng approval; tuyệt đối không kèm migration/restore.

Đây là thiết kế để review và triển khai trong phiên được duyệt, chưa có attestation writer mới hoặc attestation thực tế. Không cần tạo lại hai thư mục. Nếu bổ sung writer ở phiên sau, phải parse/test offline và hash trước chạy; không chỉ ghi file bằng tay để vượt gate.

## 5. Checklist phê duyệt DUY NHẤT — chưa được cấp

Người dùng có thể duyệt một lần với toàn bộ phạm vi sau:

> Tôi cho phép một phiên backup PostgreSQL17 database smart_agriculture tại 127.0.0.1:5432 vào thư mục production đã nghiệm thu NTFS trên ổ C có BitLocker Protection On. Tôi hiểu CLOUD_BACKUP_SCOPE_NOT_VERIFIED và chấp nhận rủi ro cloud/backup còn lại cho việc lưu cục bộ này; điều đó không xác minh scope. Cho phép chuẩn bị/review/test offline và thực thi bước attestation hẹp cho hai thư mục đã tồn tại, liên kết đúng phê duyệt này, không sửa ACL. Cho phép tạo một run directory mới, pg_dump custom-format, role metadata không password hash, SHA256, pg_restore --list và log riêng tư. Không migration, restore, restart dịch vụ, thay credential hoặc kích hoạt bơm; không tự retry khi lỗi. Credential nhập cục bộ, không qua chat. Dừng sau báo cáo backup và runtime.

Trước chạy: xác minh lại source identity/runtime/PENDING=0/dung lượng/ACL; nếu khác dự kiến phải STOP. Nếu người dùng không chấp nhận residual risk, chọn mã hóa file bổ sung và review trước khi cấp phê duyệt. Không cần một approval migration đi kèm.

## 6. Runtime và an toàn

Read-only health lúc `2026-10-22T09:56:42.510Z`: database connected, MQTT connected. Listener backend5000 PID22400, PostgreSQL5432 PID7848, brokerLAN1883 PID3592 và brokerloopback PID4572 không đổi so với C.1. Startup safety attestation của backend được đối chiếu riêng với PID listener; không gọi login gây ghi auth log.

SELECT qua Prisma: DeviceCommand PENDING=0, native command cuối exit0. Lần gọi đầu đã trả pending0 nhưng lỗi JavaScript cleanup do PowerShell expand `$disconnect`; đã sửa cách truyền source và chạy lại SELECT thành công, không có ghi database hoặc restart dịch vụ.

Không restart, không ON/OFF, không đổi credentials, không flash/reset, không cấp nguồn bơm, không migration, không nối irrigation startup. Không chạy lại 528/33 tests vì không thay code runtime/backup execution. Chỉ thêm tài liệu này; chưa lưu dữ liệu production trong backup storage.

## 7. Kết luận

**READY_FOR_PRODUCTION_BACKUP_APPROVAL**: encryption ổ C đã có bằng chứng người dùng, NTFS vẫn PASS và phương án attestation/checklist đã được review. Đây là sẵn sàng XIN PHÊ DUYỆT, không phải đủ quyền thực thi ngay.

Còn thiếu: phê duyệt backup/data-handling riêng với quyết định residual cloud risk; sau phê duyệt mới triển khai/kiểm thử bước attestation hẹp và recheck tại thời điểm chạy.

ENCRYPTION_VERIFIED (C: only) · CLOUD_BACKUP_SCOPE_NOT_VERIFIED · PRODUCTION_BACKUP_NOT_PERFORMED · PRODUCTION_MIGRATION_NOT_PERFORMED · AUTOMATION_ACTIVE=false · VERIFIED_LIVE_NOT_READY.
