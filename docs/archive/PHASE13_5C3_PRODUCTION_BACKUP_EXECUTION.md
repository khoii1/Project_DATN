# Phase 13.5C.3 — Approved production backup execution

## Cập nhật sau approval khôi phục runtime

22/10/2026 khoảng21:47 UTC+7: backend đã khôi phục một lần thành PID15264, broker LAN tự xuất hiện lại trước thao tác của Agent với PID13308 nên không restart/chạy broker thứ hai. Đã xác minh3 batches/12 readings mới và3 PERIODIC OFF khớp DB/API, Commands=false/Automation=false/TestMode=true/cap1s, PENDING0/tổng43 không tăng. Xem `PHASE13_5C3_RUNTIME_RECOVERY.md` và evidence recovery tương ứng. Phần BLOCKED dưới đây là snapshot preflight lịch sử; trở ngại backend/broker đã được gỡ.

Backup vẫn CHƯA THỰC HIỆN, attestation chưa tạo; chưa nhập credential. Script backup hiện còn tham chiếu attestation startup của PID cũ trong file log cố định: cần cập nhật/review đúng serving-process evidence trước phiên thực thi, không bỏ gate hoặc dùng log PID22400. Không migration/restore/bật command.

Thời điểm chốt: 22/10/2026 21:42:54 UTC+7. **BLOCKED tại precheck; chưa tạo backup hoặc attestation.**

## 1. Approval và phạm vi

Nguồn: tin nhắn người dùng `PHASE 13.5C.3 — APPROVED PRODUCTION DATABASE BACKUP`, phê duyệt một bản sao lưu cục bộ smart_agriculture/127.0.0.1:5432, attestation hẹp, chấp nhận residual cloud risk; không migration/restore/restart/điều khiển bơm.

Nhãn kỹ thuật đã chuẩn bị, liên kết với chính tin nhắn trên (chưa ghi vào storage):

- StorageApprovalId: `phase13-5c3-storage-20261022-01`.
- BackupApprovalId: `phase13-5c3-backup-20261022-01`.

ID không phải token bảo mật hoặc xác nhận điều kiện runtime. Không tạo approval giả; phiên backup chưa được thực hiện, pg_dump production **0 lượt**.

## 2. Script review và hashes

Đã đọc lại báo cáo Phase13.5C/C.1/C.2, helper và script backup. Hash script cũ khớp kết quả đã review, không sửa backup execution code:

| File | SHA256 |
| --- | --- |
| scripts/phase13-5c-production-backup.ps1 | 00C547E85C84B85B48D24D6A361968C41DD8BAC48059B95ED8E76AC89D4992E8 |
| scripts/phase13-5c-backup-security.ps1 | EE463654C397BA83F627F2BDEBAF01FCB43B73DE72ADD1D291C81A5445F19E6F |
| scripts/phase13-5c3-attest-existing-storage.ps1 (mới) | EC40D7CB64B42B2A631AFBE629487FB64E1E61F0230D7F203DA70B67AA82F8F3 |

Script mới: existing directories only, exact operator/helper hash, ACL/no-reparse/known sync checks; default PLAN_ONLY; Execute yêu cầu đúng hai ID và AcceptResidualRisk. Tạo JSON bằng FileMode.CreateNew, không overwrite; kiểm tra owner/two ACE/readback sau tạo. Payload giữ DataHandlingApproved=true theo approval này, ResidualRiskAccepted=true, CloudBackupScope=NOT_VERIFIED, nguồn encryption là bằng chứng Administrator người dùng; không credentials hoặc database content. Không sửa ACL hiện hữu.

**Chưa thực thi nhánh tạo attestation**, vì runtime precheck không đạt. Chưa nghiệm thu nhánh write/file ACL trên file thực; không ghi PASS giả.

Kiểm tra offline không ghi storage:

- AST parse: PASS (0 lỗi).
- Default PLAN_ONLY: PASS, Written=false.
- Invalid approval/no residual-risk switch: bị từ chối đúng `EXACT_APPROVAL_AND_RESIDUAL_RISK_REQUIRED` trước ShouldProcess/write: PASS.
- File count toàn storage vẫn0; `storage-approval.private.json` không tồn tại.

Không chạy lại các suite domain/restore đã PASS. Không compile/flash hoặc import startup/gateway.

## 3. Database identity và baseline — read-only

Bằng chứng mới: `report/phase13-5c3-production-inventory.json`, thu bởi diagnostic inventory SELECT-only, transaction READ ONLY. Bổ sung selector `--phase13-5c3` chỉ để không overwrite evidence phase trước.

| Thuộc tính | Kết quả |
| --- | --- |
| Endpoint / database / schema | 127.0.0.1:5432 / smart_agriculture / public |
| Role / version | postgres / PostgreSQL17.2 |
| System identifier | 7472695863566132416 |
| PGDATA | C:/Program Files/PostgreSQL/17/data |
| PostgreSQL start | 2026-10-16 12:13:43.656514+07 |
| Migration history | 11 applied, local checksum khớp |
| Six irrigation ledgers | Chưa có trên production |
| DeviceCommand baseline | 43 |
| PENDING | 0 |

Không thay dữ liệu production ngoài ingestion hiện hữu; không DDL/migration. Không lấy credential từ diagnostic để chạy backup; diagnostic sử dụng cấu hình hiện hữu chỉ cho kết nối SELECT và không in secrets.

## 4. Điều kiện runtime KHÔNG đạt — điểm dừng

Snapshot inventory trả `BACKEND_UNAVAILABLE_NOT_RESTARTED`. Kiểm tra bổ sung trực tiếp xác nhận:

- Không có listener5000; process cũ PID22400 không còn được Get-Process tìm thấy.
- GET `http://127.0.0.1:5000/api/health` thất bại: Unable to connect to the remote server.
- Không còn listener broker LAN0.0.0.0/::1883 PID3592 từng thấy ở C.2.
- Chỉ còn Mosquitto loopback127.0.0.1/::1:1883 PID4572.
- PostgreSQL5432 vẫn listen0.0.0.0/:: PID7848.

Vì vậy **không thể xác minh runtime Commands=false/Automation=false/TestMode=true/cap1s của backend đang phục vụ**. Startup attestation PID22400 trong log là lịch sử, không dùng để thay runtime đã dừng.

DB còn ghi device ONLINE tại snapshot không chứng minh kết nối MQTT hiện tại, nhất là khi backend không còn phục vụ. Không kết luận ESP32 firmware lỗi hoặc ONLINE thực tế từ DB presence cũ. Nguyên nhân backend/LAN broker dừng chưa xác định trong phạm vi precheck này.

Đã STOP trước attestation và backup đúng yêu cầu khi sai khác quan trọng. Không restart dịch vụ hoặc đổi broker sang loopback để bỏ qua gate; không đọc/mở COM hoặc reset ESP32.

## 5. Storage/encryption/cloud

Hai thư mục được helper đọc lại nghiệm thu owner/protected DACL/exact operator+SYSTEM FullControl/no reparse: **BACKUP_STORAGE_NTFS_VERIFIED**. Không tạo lại thư mục; chưa có dump/run directory/file mới trong storage. Không sửa parent/repository/PGDATA ACL.

BitLocker kế thừa ảnh Administrator đã được người dùng cung cấp ở C.2: ổC Used Space Only Encrypted100%, XTS-AES128, Protection On, Unlocked. ENCRYPTION_VERIFIED chỉ phạm vi ổC theo bằng chứng đó; không phải đo Administrator mới, không đọc recovery key.

**CLOUD_BACKUP_SCOPE_NOT_VERIFIED**, người dùng đã chấp nhận residual risk cho một bản backup này; không đổi thành VERIFIED. BitLocker không bảo vệ trước malware/admin/copy ra cloud khi ổ mở khóa; bản sao cùng ổC không bảo vệ khỏi hỏng toàn ổ.

## 6. Kết quả backup và nghiệm thu

| Mục | Kết quả thực tế |
| --- | --- |
| Attestation create-new | NOT_PERFORMED do runtime gate |
| Backup run ID | NONE |
| pg_dump -Fc | NOT_RUN; không có native exit code |
| pg_dumpall roles/no-role-passwords | NOT_RUN |
| pg_restore --list | NOT_RUN |
| Dump bytes/SHA256 | N/A — chưa có dump |
| Role metadata/no-password-hash | NOT_VERIFIED — chưa tạo file |
| ACL dump files | N/A — không có file backup |
| Runtime sau kiểm tra | Backend/LAN broker unavailable, không can thiệp; PostgreSQL vẫn phục vụ |
| Restore production data | NOT_VERIFIED, không thực hiện |

Không ghi exit0 hoặc PASS cho tác vụ chưa chạy. Không tự retry; lượt pg_dump thực tế0, chưa tiêu thụ lượt backup được duyệt.

## 7. Tiếp tục sau khi khôi phục runtime

Cần khôi phục đúng backend và Mosquitto LAN theo thao tác người dùng hoặc approval khôi phục riêng; approval backup này cấm restart nên Agent không thực hiện. Sau đó kiểm tra lại runtime/identity/PENDING0/baseline/hash/NTFS; nếu đạt mới thực thi attestation và một lượt backup trong phạm vi đã duyệt. Không cần yêu cầu lại approval backup chỉ vì precheck dừng, trừ khi phạm vi hoặc điều kiện dữ liệu thay đổi.

Khi tới credential prompt: người dùng nhập trực tiếp cục bộ qua Read-Host -AsSecureString; không gửi password qua chat/CLI/log. Chưa tới bước prompt ở phiên này.

Ngay cả archive/list/hash PASS ở phiên sau vẫn cần approval restore production-data vào target độc lập trước nghiệm thu recovery; không tự restore hoặc migration.

## 8. Kết luận

```text
PRODUCTION_BACKUP_CREATED: NOT_PERFORMED — PREFLIGHT_BLOCKED
BACKUP_ARCHIVE_CHECK: NOT_VERIFIED — NO_ARCHIVE
BACKUP_STORAGE_NTFS_VERIFIED
CLOUD_BACKUP_SCOPE_NOT_VERIFIED
RESTORE_PRODUCTION_DATA_NOT_VERIFIED
PRODUCTION_MIGRATION_NOT_PERFORMED
AUTOMATION_ACTIVE: NOT_VERIFIED_RUNTIME — BACKEND_NOT_RUNNING; NOT_ENABLED_BY_THIS_SESSION
VERIFIED_LIVE_NOT_READY
PHYSICAL_PUMP_NOT_TRIGGERED
```

Không gán FAIL cho một native backup chưa được gọi; điều kiện preflight runtime FAIL, không phải lỗi archive. Không tuyên bố AUTOMATION_ACTIVE=false của runtime không tồn tại chỉ từ log cũ. Dừng tại Phase13.5C.3, không chuyển restore/migration/Phase13.5D.
