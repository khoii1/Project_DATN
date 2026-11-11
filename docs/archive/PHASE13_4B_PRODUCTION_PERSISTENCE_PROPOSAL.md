# Phase 13.4B — Production persistence proposal / deployment checklist

Ngày 21/10/2026 (UTC+7). **PROPOSAL ONLY — chưa áp dụng DDL, chưa generate client production, không cho phép ACTIVE.**

## 1. Phạm vi additive được đề xuất

Tái sử dụng proposal đã kiểm thử trên instance độc lập Phase 13.3B:

- `backend/prisma/proposals/irrigation-persistence.prisma`: IrrigationCycle, IrrigationDecisionLog, IrrigationDailyBudget, IrrigationBudgetReservation, CommandIntent, IrrigationSafetyState và enums/relations.
- `backend/prisma/proposals/irrigation-constraints.sql`: CHECK, partial unique, provenance và quota constraints.
- `build/phase13-3a-schema/migration-proposal.sql`: DDL generated đã review ở Phase 13.3A/B; là đầu vào review, **không phải migration được phép deploy**.
- `backend/src/services/irrigation-persistence/postgres-test.repository.ts`: adapter test; không import trực tiếp vào production vì có identity gate chỉ chấp nhận test instance.

Không copy dữ liệu/test credentials từ 55433. Không lấy state test làm state production. 38 integration PostgreSQL đã PASS trước đây không thay cho rehearsal trên bản sao schema production hiện tại.

Trước phê duyệt deployment phải compose lại proposal offline từ đúng schema/checksum hiện tại, diff chỉ được thêm sáu ledger và supporting constraints/indexes/enums. Không đổi bảng SensorReading/DeviceCommand/AutomationRule hoặc xóa dữ liệu. Rà soát thời gian lock khi thêm unique supporting indexes trên bảng nền: additive không đồng nghĩa zero-downtime. Nếu cần `CREATE INDEX CONCURRENTLY`, tách giai đoạn ngoài transaction, review invalid-index cleanup riêng; không tự sửa SQL khi triển khai.

## 2. Gate trước triển khai — tất cả cần phê duyệt riêng

1. Xác nhận database/user/address/port/schema, PGDATA/server identity đúng production dự kiến; không fallback URL. Quyền migrator tách runtime app; production hiện dùng quyền rộng cần kế hoạch least privilege riêng.
2. Khóa Commands/Automation, giữ test mode; đảm bảo không có pending/intents in-flight. Pump adapter ngắt nguồn. Snapshot số command, migrations/checksums, grants, schema và dung lượng.
3. Backup PostgreSQL custom format + globals/role grants được bảo vệ ACL ngoài Git. Ví dụ sau **chưa chạy**, nhập password tương tác, tên file tuyệt đối cần review trước:

```powershell
& 'C:\Program Files\PostgreSQL\17\bin\pg_dump.exe' -W -h localhost -p 5432 -U '<approved-backup-role>' -d smart_agriculture -Fc -f 'C:\DATN\backups\<approved-timestamp>\smart_agriculture.dump'
& 'C:\Program Files\PostgreSQL\17\bin\pg_restore.exe' --list 'C:\DATN\backups\<approved-timestamp>\smart_agriculture.dump'
```

4. Hash/size/readability chỉ chứng minh file tồn tại; bắt buộc restore vào **instance rehearsal được phê duyệt riêng**, không production và không tự mở lại 55433. Kiểm tra constraints/rows/relations, app read-only và thời gian khôi phục. Globals có thông tin nhạy cảm, không đưa vào báo cáo/Git/log.
5. Review SQL, lock_timeout/statement_timeout, kế hoạch backup/WAL/PITR nếu yêu cầu, capacity và maintenance window. DDL transactional dùng ON_ERROR_STOP, rollback khi lỗi; concurrent indexes cần gate riêng. Chưa chuẩn bị lệnh `migrate deploy` vì migration/client production chưa được phê duyệt và đóng gói.
6. Client mới build ở artifact riêng, kiểm tra schema/client compatibility, không overwrite client backend đang chạy trước cutover. Bật chỉ API đọc history sau kiểm tra RBAC/farm scope, không evaluator side effects.

## 3. Invariants và transaction

- Cycle mặc định DISABLED/FAULT_LOCKED; safety mặc định faultLatched=true, emergencyStop=true, reportedState=UNKNOWN. Không auto-arm từ OFF lịch sử.
- Một open cycle/intent trên actuator+mode; idempotency key duy nhất và pulse index duy nhất. Lock safety row theo thứ tự nhất quán trước cycle/budget/reservation/intent/audit; CAS version, reserve + intent + audit trong cùng transaction.
- Quota atomic không âm/không vượt budget; ngày ngân sách UTC+7, giữ day high-water khi clock rollback. Không coi ngày mới là lệnh xóa fault/cooldown/manual override.
- App role không sở hữu audit table, chỉ SELECT/INSERT decision log, không UPDATE/DELETE/TRUNCATE; migration/admin role không làm runtime. Giữ RESTRICT lịch sử.
- Recovery RESERVED/CLAIMED/PUBLISHED/ACKED phải phân loại độ chắc chắn; trạng thái UNCERTAIN giữ reservation và fault, **không tự retry ON hoặc hoàn quota vì thiếu ACK**.
- Backend/broker restart hoặc mất evidence → UNKNOWN cho đến OFF mới cùng observer generation. Không đồng nhất observer session với ESP32 boot session; hiện firmware chưa cung cấp boot identity có xác thực.
- Manual override/emergency stop ưu tiên khóa phát lệnh; TTL override được persist và audit. Không tự clear fault/manual override sau restart; quy trình re-arm phải có quyền, lý do và evidence mới. Định nghĩa STOP riêng, không phụ thuộc duy nhất mạng.
- History API tương lai chỉ GET, paginate có giới hạn, scope theo farm/device/actuator, hiển thị UTC+7 nhưng lưu thời gian chuẩn UTC; trả source/policyVersion/trust/decision/reason/intent/quota/safety version. Không nối GET vào engine hoặc dispatch.

## 4. Rollback và nghiệm thu trước VERIFIED_LIVE

Nếu DDL lỗi trước commit: rollback transaction, lưu log không secrets; không seed/reset/drop. Nếu code lỗi sau commit: khóa dispatch, rollback application artifact, **giữ additive tables/audit/budget**, không dùng destructive down migration để xóa dấu vết. Restore/PITR toàn database chỉ sau quyết định riêng vì có thể mất telemetry phát sinh sau backup; phải có phương án đối chiếu/giữ readings mới.

Nghiệm thu lại trên rehearsal: atomic rollback, hai connections/processes, idempotency, crash/restart, UNCERTAIN, fault latch, quota/day-boundary, FK/CHECK/RESTRICT và audit privilege. Sau approval production, SELECT-only xác minh catalogs/defaults/grants trước khi API đọc dùng chúng. Việc ledger tồn tại không tự cấp publisher trust hoặc bật ACTIVE.

**Hiện tại:** production migration NOT_APPLIED; production client UNCHANGED; policy/cycle/budget/safety live UNAVAILABLE; VERIFIED_LIVE_NOT_READY; MQTT_AUTOMATION_COMMANDS_ENABLED=false.
