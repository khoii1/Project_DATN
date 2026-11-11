# Phase13.5C.4 — Production backup after backend recovery

Ngày22/10/2026 (UTC+7). **ĐÃ HOÀN TẤT BACKUP VÀ KIỂM TRA ARCHIVE — PASS** sau khi người dùng nhập credential trực tiếp cục bộ. Kết quả cuối tại mục8 thay thế snapshot chờ input ở mục6–7. Không restore hoặc migration.

## 1. Approval lineage

Sử dụng tin nhắn người dùng `PHASE 13.5C.3 — APPROVED PRODUCTION DATABASE BACKUP`: đồng ý một backup local trên ổC, residual cloud risk, attestation và một lượt pg_dump; C.4 cho phép sửa gate/tiếp tục trong đúng phạm vi này. Không xin lại approval tương tự.

- StorageApprovalId: `phase13-5c3-storage-20261022-01`.
- BackupApprovalId: `phase13-5c3-backup-20261022-01`.
- CloudBackupScope vẫn NOT_VERIFIED; không biến risk acceptance thành scope VERIFIED.
- BitLocker theo bằng chứng Administrator người dùng: C: Used Space Only100%, XTS-AES128, Protection On; không có đo/key mới. Không bảo vệ khỏi admin/malware/cloud copy khi unlocked hoặc hỏng toàn ổC.

## 2. Gate mới — không hardcode PID

`scripts/phase13-5c-production-backup.ps1` gọi helper `phase13-5c4-runtime-gate.ps1`:

1. Lấy đúng một owner PID listener5000; process thực phải là node, giữ process StartTime để phát hiện PID reuse.
2. Tìm đúng một `build/*.state.json` khớp PID, không chọn log phiên cũ theo filename/PID hardcode.
3. Đối chiếu RUNNING/command, path stdout/exit cùng stem, không exit marker, attempt file cùng phiên, runId/startedAt/Attempts=1. OS process start phải khớp state trong10giây.
4. Đọc attestation trong stdout đúng phiên. Nếu chưa flush thì kiểm tra có giới hạn10giây, đồng thời kiểm PID/StartTime; thiếu evidence => NOT_VERIFIED/STOP, không suy diễn flags sai hoặc dùng log lịch sử.
5. Protected API probe `backend/scripts/phase13-5c4-runtime-api.cjs` dùng một normal login account hiện hữu, token chỉ RAM; GET health/live-evidence/actuator. Yêu cầu database/MQTT connected, Commands=false/Automation=false/TestMode=true, gateway DISABLED/controlEnabled=false. Cap1 từ startup attestation cùng process; API live-evidence hiện không expose cap riêng, không sửa API contract.
6. Đọc lại listener/StartTime sau API; mọi mâu thuẫn PID/state/log/API => STOP.

Không đọc `.env` để thay runtime flags, không dùng attestation PID22400 cũ. Inventory metadata vẫn có trường startupAttestation lịch sử; trường đó **không dùng làm gate**. Gate mới là evidence hiện hành riêng.

Gate thực tế PASS lúc `2026-10-22T14:57:08Z`: listener/state/log PID15264, process start14:45:27.4805785Z; serving attestation14:45:35.118Z; false/false/testtrue/cap1; protected API gatewayDISABLED/controlfalse. Không restart backend để đọc log.

Trong backup: recheck runtime trước dump/sau backup, so PID/StartTime xuyên phiên; native process dài được poll listener mỗi1giây, stop khi backend đổi/dừng. Identity/PENDING/command count kiểm tra trước và sau. File attempt create-new theo approval ngăn gọi lại dump sau một lượt đã bắt đầu.

## 3. Script hashes và tests

| Artifact | SHA256 trước thực thi |
| --- | --- |
| scripts/phase13-5c-production-backup.ps1 | 7E9D0F596FA7321C76BE7046139C091F87EE4A962AF2746AA7B32D273A8EF223 |
| scripts/phase13-5c4-runtime-gate.ps1 | 5B63796FFA5D24C9FDA928767F27D4D1184CEFC3400DED979CB51F099F3471F0 |
| backend/scripts/phase13-5c4-runtime-api.cjs | 764E0171B599496647E4977686BF91F409A1ED47F0FFB1BF6782364FD6499FC4 |
| scripts/phase13-5c-backup-security.ps1 | EE463654C397BA83F627F2BDEBAF01FCB43B73DE72ADD1D291C81A5445F19E6F |
| scripts/phase13-5c3-attest-existing-storage.ps1 | EC40D7CB64B42B2A631AFBE629487FB64E1E61F0230D7F203DA70B67AA82F8F3 |
| scripts/phase13-5c4-execute-once.ps1 | C9C6C92B790D21E12CC782B2A3F00D49C27FAA9EE971EEAA0EF40375AE4468ED |

- `phase13-5c4-runtime-gate.tests.ps1`:23/23 PASS, gồm valid fixture, mismatch PID/start, unsafe/missing/wrong-type flags, disconnected health, gateway enable, AST và không hardcode backendPID/log cũ. Tests này offline, không kết nối DB/command.
- `node --test backend/scripts/backup-restore-readiness.test.cjs`:16/16 PASS. Sửa assertion cũ đòi storage chưa tồn tại thành so existence/entries trước-sau PLAN_ONLY, vì storage đã được duyệt tạo ở C.1; không bỏ test no-write.
- Node runtime probe syntax PASS; wrapper AST PASS. Không chạy lại toàn bộ regression/restore synthetic.
- Đây không phải production dump integration PASS cho tới khi native execution/manifest thực tế được nghiệm thu.

## 4. Storage attestation thực tế

Writer hẹp được hash-check rồi execute đúng một lần theo approval, không tạo lại thư mục hoặc repair ACL. `storage-approval.private.json` được create-new thành công tại `%LOCALAPPDATA%\SmartAgriculturePostgresBackups\production`.

SHA256 attestation: `65E23E6F448E52F3F7E9E67344DE412E7280DFC24303874DA2926BB3F2D7A7AF`.

File829bytes, owner operatorSID S-1-5-21-1432835263-483988321-3159128977-1001; exact operator+SYSTEM FullControl, no unexpected reparse. Quyền file kế thừa chỉ hai ACE từ protected parent đã nghiệm thu. Hai directory owner/protected DACL/inheritance đã recheck, không thay ACL.

Payload: đúng storage/backup IDs, nguồn tin nhắn approval, scope một backup/no migration/no restore, DataHandlingApproved=true, ResidualRiskAccepted=true, CloudBackupScope=NOT_VERIFIED, EncryptionStatus dựa bằng chứng người dùng; không credential/key/database content.

## 5. Database và runtime baseline

`report/phase13-5c4-production-inventory.json` SELECT READ ONLY; snapshot health14:58:27.015Z:

- smart_agriculture/public,127.0.0.1:5432, PostgreSQL17.2, system identifier7472695863566132416.
- PGDATA C:/Program Files/PostgreSQL/17/data; server start2026-10-16 12:13:43.656514+07.
-11migrations/local checksum khớp, chưa có6irrigation ledgers.
- DeviceCommand43, PENDING0, ESP32ONLINE; health DB/MQTTconnected.
- Runtime an toàn dựa gate hiện hành ở mục2, không attestation lịch sử trong inventory.

Backend vẫn giữ chạy; không broker/PG restart, firmware/reset/credential changes, migration/DDL, ON/OFF hoặc pump power.

## 6. Phiên interactive backup

Đã mở cửa sổ PowerShell interactive (không Administrator) để người dùng nhập `Read-Host -AsSecureString` trực tiếp tại máy. Không transcript, không password qua chat/CLI/log. Password native child environment chỉ trong RAM, không file plaintext.

- Wrapper PID14496; marker `build/phase13-5c4-interactive-once.attempt.json`, started14:59:06.610Z.
- Wrapper pin hashes trước gọi script, create-new marker, không tự retry.
- Outcome dự kiến `report/phase13-5c4-interactive-outcome.json` chỉ chứa status/exit metadata đã redact, không nội dung DB.
- Script backup dùng run directory timestamp+GUID private, pg_dump-Fc, roles-only/no-role-passwords, native streams/exit logs, SHA256/list và manifest riêng tư ngoài Git.

Tại lần quan sát14:59:18Z: storage mới chỉ có attestation; chưa có run directory/dump/backup-attempt marker. Chưa có outcome. **Không có native exit code pg_dump, kích thước/hash dump hoặc --list để công bố.** Session marker không chứng minh đã nhập credential hoặc backup thành công.

## 7. Snapshot lịch sử trước input — đã được thay thế bởi mục8

```text
BACKEND_RUNTIME_GATE_PASS (snapshot trước prompt)
PRODUCTION_BACKUP_CREATED_NOT_PERFORMED (chưa có evidence native)
BACKUP_ARCHIVE_CHECK_NOT_PERFORMED
BACKUP_STORAGE_NTFS_VERIFIED
CLOUD_BACKUP_SCOPE_NOT_VERIFIED
PRODUCTION_DATA_RESTORE_NOT_VERIFIED
PRODUCTION_MIGRATION_NOT_PERFORMED
AUTOMATION_ACTIVE=false (protected runtime snapshot)
PHYSICAL_PUMP_NOT_TRIGGERED
```

Sau input cục bộ sẽ đọc outcome/private manifest, đối chiếu SHA256/bytes/list/native codes và ACL files thực tế; runtime/PENDING/command count phải giữ nguyên. Không launch lại wrapper/pg_dump nếu lỗi, giữ evidence. Không restore hoặc migration sau backup.

Restore rehearsal production-data cần approval riêng cho target độc lập và quyền lưu dữ liệu thật; archive/list/hash không thay RESTORE_PRODUCTION_DATA_VERIFIED. Cloud scope giữ NOT_VERIFIED.

## 8. Kết quả nghiệm thu cuối sau input cục bộ — PASS

Người dùng trả lời “tôi đã nhập pass”; chỉ đọc kết quả phiên đã mở, không gọi lại script backup/pg_dump. Wrapper outcome: BACKUP_SCRIPT_COMPLETED, ExitCode0, kết thúc `2026-10-22T15:08:00.7730715Z` (22:08:00UTC+7).

### Run và artifacts

Run ID: `20261022-220757-53a520a7936841a38d76b3af68c700f0`.

Đường dẫn private ngoài Git:

`C:\Users\Acer Swift3\AppData\Local\SmartAgriculturePostgresBackups\production\20261022-220757-53a520a7936841a38d76b3af68c700f0`

| Operation/file | Kết quả |
| --- | --- |
| Actual pg_dump -Fc | Exit0; started15:07:58.3603749Z, ended15:07:59.0263028Z |
| smart_agriculture.dump | 635,219bytes |
| Dump SHA256 | 04D4F89DF6440B627FBB86CBC5B1AC1FEDF931BF51064D26AB354E9E24230640 |
| Actual pg_dumpall --roles-only --no-role-passwords | Exit0 |
| roles-no-passwords.sql | 372bytes |
| Roles SHA256 | 263B533FEA856D34B9660D8C966DCFB2A74B7B85D5DB44298E0041998652255D |
| pg_restore --list | Exit0; private archive list10,239bytes |
| Source identity SELECT trước/sau | psql exit0/0, target/system ID đúng |

SHA256 đã được tính lại từ cả hai file thực tế, khớp private manifest. Kiểm tra role metadata trong bộ nhớ không thấy PASSWORD literal/NULL, SCRAM-SHA-256 verifier hoặc md5 verifier; không in lại file. Database dump vẫn chứa dữ liệu production nhạy cảm, không được coi đã sanitized.

Native evidence có9operations exit0/no timeout: identity SELECT,4version checks, actual dump, actual role dump, archive list và postidentity SELECT. Hai entry mang tên pg_dump.exe trong native log là `--version` và **đúng một actual pg_dump-Fc**, không phải hai lượt backup. Tương tự role/list binaries có version checks riêng. Chỉ một run directory, một file.dump và một approval attempt marker; không tự retry.

Private run chứa native-exits.private.json, stdout/stderr logs của operations sau tạo run, archive-list.private.txt và backup-manifest.private.json. Chỉ metadata/hash/size/status được đưa vào báo cáo; không copy dump, roles SQL, token hoặc database contents vào repository.

### Identity và runtime sau backup

Private manifest ghi before/after identity: smart_agriculture/public/127.0.0.1:5432, PostgreSQL17.2, system identifier7472695863566132416. Inventory READ ONLY sau nghiệm thu lúc15:08:50.027Z xác nhận PGDATA/server-start/migration11/checksums không thay đổi, chưa có6ledger production, ESP32ONLINE và health DB/MQTTconnected.

- DeviceCommand43→43; PENDING0→0.
- Backend PID15264 trước/sau, không restart; process StartTime khớp cùng serving process.
- Startup attestation đúng phiên + protected API sau backup: Commands=false, Automation=false, TestMode=true, effective cap1s; gatewayDISABLED, controlEnabled=false.
- Recheck độc lập sau đọc artifacts lúc15:08:56.590Z vẫn cùngPID15264 và API an toàn/connected.
- Token normal API login chỉ RAM; LOGIN_SUCCESS activity thông thường có thể được ghi bởi auth hiện hữu. Không tạo DeviceCommand, không thay credentials, firmware, schema/startup hoặc MQTT command policy.

Evidence catalog SELECT: `report/phase13-5c4-production-inventory-after.json`. Trường startupAttestation PID22400 cũ trong diagnostic inventory vẫn là lịch sử và không được dùng để kết luận runtime; authoritative runtime là private manifest gate mới đối chiếu state/attempt/process/API PID15264.

### NTFS và data handling

Đã kiểm tra độc lập lại owner/operatorSID, hai ACE Allow operator+SYSTEM FullControl và no reparse của **16file** trong toàn backup storage (14file run + attestation + approval attempt marker). Cả container/production/run directory đều protected DACL đúng owner/two ACE; files kế thừa đúng quyền private parent, không có principal rộng.

Không sửa ACL của thư mục hiện hữu hoặc PostgreSQL production/parent. Attestation giữ DataHandlingApproved=true/ResidualRiskAccepted=true/CloudBackupScope=NOT_VERIFIED đúng approval đã cấp. Marker create-new đã tiêu thụ lượt backup này; không tái sử dụng để dump lại.

### Kết luận cuối

```text
BACKEND_RUNTIME_GATE_PASS
PRODUCTION_BACKUP_CREATED_PASS
BACKUP_ARCHIVE_CHECK_PASS
BACKUP_STORAGE_NTFS_VERIFIED
CLOUD_BACKUP_SCOPE_NOT_VERIFIED
PRODUCTION_DATA_RESTORE_NOT_VERIFIED
PRODUCTION_MIGRATION_NOT_PERFORMED
AUTOMATION_ACTIVE=false
PHYSICAL_PUMP_NOT_TRIGGERED
```

Giới hạn: hash/list PASS chưa chứng minh restore được dữ liệu production; chưa có restore target được phê duyệt, role mapping/recovery-key/off-device recovery/RTO chưa nghiệm thu. Logical dump là snapshot trong cửa sổ bắt đầu/kết thúc, không bao gồm telemetry commit sau snapshot; không hứa RPO0/PITR. Bản sao cùng ổC không bảo vệ khỏi hỏng toàn ổ. Không nâng VERIFIED_LIVE/ACTIVE.

**DỪNG sau backup và báo cáo. Không restore, migration hoặc chuyển Phase13.5D. Giữ backend/broker/PostgreSQL đang chạy.**
