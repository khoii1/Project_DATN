# MVP P0-02B — Targeted credential handoff & read-only acceptance

Ngày28/10/2026. Chỉ đọc source, Windows metadata và chuẩn bị SQL mới. Không khởi động backend/DB/broker, không dùng SQL R1 hoặc chạy migration.

## PART A — WINDOWS PROCESS EVIDENCE

| Thành phần | Evidence mới | Giới hạn |
|---|---|---|
| Backend5000 / frontend5173 | Không listener trước/sau | Không có serving-process flags để attest |
| PostgreSQL5432 | Listener PID7848, parent5444; created2026-10-16T05:13:42.3920800Z | Image path thực tế chưa đọc được |
| PostgreSQL service | postgresql-x64-17 Running, servicePID5444=pg_ctl, NetworkService; pg_ctl parent là SCM | Service metadata không thay bằng chứng image đã nạp |
| Service configuration | PathName chứa expected pg_ctl.exe và PGDATA C:\Program Files\PostgreSQL\17\data | Chỉ xuất boolean khớp đường dẫn, không dump command line |
| Broker loopback1883 | Service mosquitto Running, PID4572, LocalSystem, created2026-10-16T05:13:40.3969060Z | Image/config runtime chưa verified |
| Broker LAN1883 | PID9052, created2026-10-28T03:41:11.9020190Z; owner operator; image C:\Program Files\Mosquitto\mosquitto.exe qua QueryFullProcessImageName | Config argument không đọc được; không suy config mặc định |

Đã dùng Win32_Service, Win32_Process, Get-NetTCPConnection và OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION)/QueryFullProcessImageName. Với PostgreSQL/pg_ctl/service broker, OpenProcess trả Access denied5; giữ NOT_VERIFIED, không elevation/sửaACL.

Snapshot cuối 2026-10-28T11:03:04Z vẫn cùng PID/creation/parent và listeners. Không gửi MQTT CONNECT/PUBLISH/SUBSCRIBE; listener không chứng minh authenticated subscription. Backend exit root cause vẫn UNKNOWN.

## PART B — CREDENTIAL HANDOFF READINESS

Operator đã xác nhận Username trong ứng dụng là **postgres**. Tài liệu backup trước dùng role này làm DBA; chưa có bằng chứng role hiện tại là non-superuser/read-only. Không khẳng định mọi role tên postgres luôn là superuser, nhưng cũng không thể coi nó đủ điều kiện chỉ dựa vào tên.

P0-02B không cho dùng superuser thay role chỉ đọc khi chưa có phê duyệt phù hợp. Vì chưa xác nhận được một login role hiện hữu đủ điều kiện, **dừng trước connection**, không hỏi/nhập mật khẩu bằng role postgres và không tạo/reset/grant role.

Không đọc password từ .env/backup/Credential Manager, không nhận password qua chat, không đưa vào argv/environment/file. Không mở terminal mật khẩu vì role gate chưa đạt. Ứng dụng có thể lưu credential hoặc dùng cơ chế xác thực khác; việc operator không nhập mật khẩu khi mở ứng dụng không chứng minh PostgreSQL không có role/password.

Pinned client đã khớp:

```text
C:\Program Files\PostgreSQL\17\bin\psql.exe
PostgreSQL17.2
SHA256 462604E525498D5AFFF38EE401025678A9E33D4DBAFB29DF1CDA87ACE70C5A2A
```

## PART C — ACTUAL READ-ONLY SQL RESULTS

**SQL connection attempts=0. Không có actual SQL results hoặc native SQL exit code.** Không dùng kết quả lịch sử để điền vào báo cáo.

Đã chuẩn bị riêng [mvp-p0-02b-readonly.sql](../scripts/mvp-p0-02b-readonly.sql), SHA256:

```text
DF19282E58D42843311F70DD6160AEB67D562533D77E553928C89455AA857CAA
```

Static source review: BEGIN REPEATABLE READ READ ONLY; statement3s/lock500ms/idle10s; pg_catalog search_path; built-in/catalog SELECT và aggregates; conditional systemID/PGDATA theo quyền; migration names/checksums; command aggregates; đúng ESP32/PUMP_01; ROLLBACK kết thúc. Identity mismatch hoặc thiếu privilege trả NOT_VERIFIED và dừng trước business-table queries. Không SQL R1/UDF/DML/DDL.

File SQL **chưa được PostgreSQL parse/execute**, không gọi SQL acceptance PASS. Không tạo live executor/password wrapper. Nếu sau này dùng cần role được duyệt, terminal native không transcript, closed environment, connect timeout3s, session default_read_only, client output cap64KiB/deadline hữu hạn, current SQL hash, một connection và không retry. Password không qua environment. Không chạy SQL từ prompt tùy ý; psql phải dùng -X -W và fixed --file.

## PART D — MIGRATION / PENDING / ACTUATOR

- Target dự kiến từ baseline: 127.0.0.1:5432/smart_agriculture/public, systemID7472695863566132416, PostgreSQL17.2, PGDATA C:/Program Files/PostgreSQL/17/data.
- Source có11 migrations; DB migration history/checksums **NOT_VERIFIED hiện tại**.
- DeviceCommand total/PENDING/anomalies: **NOT_VERIFIED**. Không dùng total43/PENDING0 lịch sử.
- Device/PUMP_01 state, state timestamp, fresh OFF, ESP32 connectivity: **NOT_VERIFIED**.
- Không có SQL snapshot hoặc quyền đọc identity đã được xác minh trong phiên này.

## PART E — BACKEND STARTUP SAFETY

Đã đọc lại server.ts, config/database.ts, config/env.ts, mqtt-pump-state.adapter.ts, mqtt-gateway.runtime.ts, command/gateway/presence/watchdog source.

Startup kết nối Prisma rồi await recoverMqttCommands trước listen:

- Toàn bộ MQTT/PENDING có thể chuyển FAILED/BACKEND_RESTARTED_NO_REPLAY.
- Actuator allowlisted có lịch sử MQTT có thể thành UNKNOWN ngay cả commandsfalse.
- MQTT ingestion/presence/watchdog/alerts/legacy automation metadata có thể ghi DB.
- Không có migration/seed trong startup path đã đọc. Commandsfalse không làm startup thành read-only.
- dotenv không override environment đã cấp. Command dispatch runtime có checks khóa, không fallback mock khi disabled.
- void bootstrap() chưa có catch ngoài cùng; recovery exception có thể dừng process trước listen. Đây là rủi ro source, không phải exit root cause đã chứng minh.

Expected flags tương lai: MQTT_ENABLED=true; MQTT_COMMANDS_ENABLED=false; MQTT_AUTOMATION_COMMANDS_ENABLED=false; MQTT_PUMP_TEST_MODE=true; MQTT_PUMP_MAX_RUN_SECONDS=1. Gateway DISABLED/controlEnabledfalse chỉ được attest sau serving process thực sự chạy; hiện chưa verified.

## PART F — NEXT EXECUTION APPROVAL PACKAGE

**Production startup package chưa sẵn sàng.** Không đề xuất startup dựa trên credential/identity chưa đạt. Không dùng R2.5/SQL R1/backup approval để mở khóa.

Nếu sau này mở lại đường production, cần role/secure terminal được duyệt, SQL identity/migrations/PENDING mới, đủ process/broker identity và không unresolved startup attempt; trước startup operator xác nhận adapter5V đã ngắt. Cwd C:\DATN\Project_datn\backend; Node executable C:\Program Files\nodejs\node.exe; invocation dự kiến --import tsx src/server.ts; phải pin/hash lại và cấp flags trong đúng process.

Approval phải bao gồm các recovery/ingestion writes phía trên, PID/start-time/stdout/stderr/native-exit, graceful stop, no force-kill/no retry/no migration/seed/commands/automation. Không triển khai những thao tác đó trong P0-02B.

## PART G — DEVELOPMENT TARGET FALLBACK

Ưu tiên **tái sử dụng cluster TEST cũ**, không phải initdb thêm một cluster hoặc R2.x mới:

| Hạng mục | Target đề xuất, chưa provision/start |
|---|---|
| PostgreSQL | Existing test PGDATA C:\DATN\test-instances\phase13-3b\data, PostgreSQL17, loopback127.0.0.1:55433 |
| Database mới | smart_agriculture_mvp_dev, schema public; không dùng hoặc ghi đè các DB rehearsal cũ |
| Role mới chỉ trên TEST | sa_mvp_dev_migrator và sa_mvp_dev_app, không dùng production credential; app không superuser/owner/migrator |
| Schema | Chỉ11 baseline migrations; không6 ledger proposal, không production DDL |
| Fixtures | Synthetic owner/staff/farms/zones/sensors/readings/alerts, nhãn DEMO/SIMULATOR; không copy production data |
| Backend |127.0.0.1:55001, commandsfalse/automationfalse/testtrue/cap1; MQTT_ENABLED=false trong lần acceptance quản trị đầu |
| Frontend |127.0.0.1:55173, API base trỏ55001, không trỏ5000 |
| MQTT/command demo | Dùng browser mock/SHADOW đã PASS, không broker/ESP32 identity thật, không real command gateway |

Read-only filesystem check: test PGDATA cũ tồn tại. Các port55433/55001/55173 không listener tại kiểm tra này; phải kiểm tra lại trước execution. Chưa xác minh systemID/control state của cluster cho phiên dev mới; đây là **pre-start gate**, không tự coi đã PASS.

Phạm vi cần approval riêng, cụ thể: kiểm tra systemID/PGDATA/port/owner; graceful start đúng existing TEST cluster nếu đủ điều kiện; nếu cluster không đúng thì STOP, không initdb/fallback production. Tạo đúng database/roles test mới với password mới nhập cục bộ; baseline migrations và synthetic fixtures chỉ trong database mới; start một backend55001 và frontend55173; chạy login/CRUD/RBAC/chart/alerts acceptance trên dữ liệu dev; dừng các process/cluster do phiên đó tạo sau kiểm thử, giữ data/evidence. Không drop/reset/overwrite database hiện hữu.

Credentials/config dev cần phương thức cục bộ được review, không qua chat/argv/log; không đọc lại production secrets. Luồng sensor fixture→DB/API/UI phải ghi rõ SIMULATOR; không nâng thành live hardware. Tiếp nhận MQTT thật là acceptance riêng sau này, không giả đã đạt bằng fallback này.

Không provision/start test cluster, tạo role/database hoặc áp dụng baseline migrations trong P0-02B. Đây là đường ngắn cho MVP quản trị và simulation, không khép yêu cầu telemetry phần cứng hoặc automatic physical.

## PART H — FINAL VERDICT

**MVP_P0_02B_BLOCKED_DEV_FALLBACK_REQUIRED** — đã giải quyết thêm service/LAN image evidence; không có approved read-only login/credential và identity production còn thiếu. Không lặp production preflight hoặc mở thêm R2.x.

```text
SQL_CONNECTED_FALSE
SQL_READ_ONLY_VERIFIED_FALSE
DB_IDENTITY_VERIFIED_FALSE
PENDING_VERIFIED_FALSE
BACKEND_STARTUP_NOT_PERFORMED
PRODUCTION_MIGRATION_NOT_PERFORMED
PHYSICAL_PUMP_NOT_TRIGGERED
```

STOP. Những thay đổi duy nhất là SQL chuẩn bị mới và báo cáo này; không sửa production/source runtime/config/credentials/ACL.
