# Phase 13.3B — PostgreSQL persistence verification

## Kết quả thực thi B sau phê duyệt — 21/10/2026

```text
POSTGRESQL_PERSISTENCE_PASS — ISOLATED_TEST_ONLY
POSTGRESQL_INTEGRATION_TESTS: 38/38 PASS
OFFLINE_REGRESSION: 243/243 PASS
PRODUCTION_MIGRATION_NOT_APPLIED
AUTOMATION_ACTIVE=false
PHYSICAL_PUMP_NOT_TRIGGERED
TEST_CLUSTER_STOPPED — DATA_RETAINED
```

**Phê duyệt đã nhận:** thông điệp người dùng “APPROVAL — PHASE 13.3B EXECUTION”, trước bootstrap ngày 21/10/2026. Cho phép đúng native cluster/test DB/schema/ba role ở preflight, migration nền/proposal, client test, adapter và integration synthetic. Không bao gồm production migration, VERIFIED_LIVE, ACTIVE hoặc thử phần cứng. Lúc bootstrap hoàn thành cluster bắt đầu nhận kết nối tại **2026-10-20T18:59:39.993302Z** (01:59:39.993302 ngày 21/10 UTC+7). Thời điểm server trong SQL/log hiển thị `2026-10-21 01:59:39.993302+07`.

### Topology và danh tính thực tế

- PostgreSQL native **17.2**, chỉ listen **127.0.0.1:55433**, PID khi chạy **17660**.
- PGDATA: `C:\DATN\test-instances\phase13-3b\data`, không thuộc cluster production 5432.
- DB `smart_agriculture_test_phase13_3b`, schema `phase13_test_phase13_3b`.
- Ba login mới: `phase13_test_admin`, `phase13_test_migrator`, `phase13_test_app`; mật khẩu ngẫu nhiên riêng, không in vào terminal/Git/báo cáo. Thư mục instance bị tắt inheritance và chỉ cấp quyền cho Windows user đang thực hiện; credentials nằm ngoài repository trong thư mục được bảo vệ này.
- Bootstrap dùng admin test; DDL/fixture setup dùng migrator; **mọi domain integration/runtime concurrency dùng app test**. SQL xác nhận app không superuser, không CREATEDB, không CREATEROLE và không sở hữu audit table.
- Trước từng DDL migration: SQL identity đúng database/user/host/port/schema; kết nối admin trên cùng endpoint kiểm tra `data_directory` tuyệt đối. Bootstrap được kiểm tra riêng theo maintenance DB test, không giả định DB/schema đã tồn tại.
- Không dùng Docker, không tạo Windows service. Không dùng credential production cho test, không fallback production URL.

### Schema, migration và adapter đã triển khai

Đã replay **11 file migration SQL nền** rồi additive proposal, CHECK và partial indexes trên schema test, trong một transaction migration. Đây là SQL replay có manifest/hash, **không phải `prisma migrate deploy` hay thay `_prisma_migrations` production**. Test schema có **20 bảng**: 14 base + 6 ledger; không có bản sao dữ liệu production hoặc seed thật.

SQL manifests/hashes và identity được giữ trong `migration-evidence.json` của instance. Các FK composite, RESTRICT, unique/partial unique, budget/duration/version/expiry/provenance CHECK đã có hiệu lực trên PostgreSQL và được kiểm tra bằng các thao tác vi phạm có chủ đích.

Prisma Client riêng tại `build/phase13-3b-client`; schema generate riêng tại `backend/build/phase13-3b-test.prisma`. Client production `backend/node_modules/.prisma/client` vẫn có LastWriteTime **16/10/2026 18:09:49**, không regenerate trong Phase này. Schema production không đổi.

Adapter mới: `backend/src/services/irrigation-persistence/postgres-test.repository.ts`:

- Chỉ nhận client được inject, không import Prisma singleton/env/MQTT/server; không tự mở kết nối production.
- Mỗi transaction xác minh database `smart_agriculture_test_phase13_3b`, role `phase13_test_app`, schema test, loopback/55433 và server-start identity khớp bằng chứng PGDATA ban đầu. Sai target hoặc server identity đổi → STOP.
- **READ COMMITTED + safety-row `SELECT ... FOR UPDATE`** theo actuator/mode, giữ lock đến commit, CAS version mọi mutable record; unique constraints là lớp bảo vệ thêm. Không dùng mutex RAM để bảo đảm PG concurrency.
- Mapping đầy đủ safety/cycle/budget/intent/reservation/decision audit; tất cả SHADOW. `policySnapshot` dùng envelope `{ rule, cycleTrusted }`, không tự gán VERIFIED_LIVE. Budget trusted trong test chỉ là ledger test được kiểm soát.
- Tạo reservation/budget/cycle/intent/audit cùng transaction; `createMany(skipDuplicates)` giữ audit evaluation idempotent. Retry key chỉ trả kết quả cũ, không được diễn giải thành quyền publish lại.
- Không có dispatcher/MQTT publish, DeviceCommand create hoặc production integration. Không tự retry transaction/ON sau lỗi serialization hay uncertainty; caller nhận lỗi để đối soát.
- Fault/UNCERTAIN, ngân sách, cooldown/soak và session recovery vẫn theo foundation; adapter không tự clear latch/arm từ OFF cũ.

### Kết quả PostgreSQL thật: 38/38 PASS

Lượt cuối bắt đầu **2026-10-20T19:09:10.215Z**, kết thúc **19:09:19.399Z** (02:09 ngày 21/10 UTC+7).

| Nhóm | Bằng chứng đã chạy trên PostgreSQL thật |
| --- | --- |
| Atomic reservation | Một intent/reservation/audit và một đơn vị ngân sách; replay trả cùng intent, payload khác cùng key bị chặn |
| Rollback | Chủ đích gây FK violation tại insert intent/audit và CHECK violation tại budget update; transaction rollback, không còn budget/reservation/intent/audit mới, cycle/safety version không tăng |
| Concurrency connections | Hai Prisma clients/connections tranh cùng key hoặc khác key/cùng actuator: chỉ một reservation, không double-budget |
| Concurrency processes | Hai Node processes độc lập cho same-key và different-key; PID lưu trong evidence, một RESERVED và bên kia REPLAY/BLOCKED |
| Kill trước commit | Kill worker thật khi transaction đang mở sau safety UPDATE; kết nối đóng và PostgreSQL rollback, không lưu fault/version chưa commit |
| Kill sau commit/claim/publish/ACK | Kill worker ở cả bốn mốc, process mới đọc lại cùng intent; recovery giữ budget, UNCERTAIN, UNKNOWN/fault, cycle untrusted. Process thứ ba xác nhận latch/state vẫn tồn tại; không replay ON |
| ACK mô phỏng | APPLIED/REJECTED/TIMEOUT, publish uncertainty, broker loss; late/duplicate ACK không mở lại intent, UNCERTAIN không hoàn quota |
| Fresh OFF | Old OFF, wrong session, retained OFF bị từ chối; OFF mới đúng session sau ACK đưa cycle SOAK và lưu cooldown. OFF sau recovery không tự clear fault |
| Fail-closed | OFFLINE, UNKNOWN, untrusted reading, old OFF, manual override, emergency, fault, persisted cooldown, quota và clock rollback/high-water đều chặn reservation |
| UTC+7 midnight | Ngày mới có budget riêng, giữ row/quota ngày trước; midnight không xóa fault/manual override |
| CAS/serialization | CAS sai version rollback; hai transaction SERIALIZABLE đọc cùng version rồi ghi: một commit, một PostgreSQL **SQLSTATE 40001** |
| Constraints | FK thiếu cycle, duplicate idempotency, một open cycle/intent, budget vượt trần, duration SHADOW≠1, expiry sai, consumedKeys không là array, version âm, reservation seconds=0, VERIFIED_LIVE thiếu reading FK đều bị từ chối; Device delete bị RESTRICT, không mất ledger |
| Audit | App UPDATE/DELETE audit thực tế bị từ chối; SQL `has_table_privilege`/`has_schema_privilege` xác nhận không TRUNCATE/CREATE. Không thực hiện TRUNCATE hoặc CREATE thử để kiểm tra quyền |
| Audit idempotency | Duplicate evaluation chỉ giữ một audit row, không mutate log cũ |

Không thay ACK/OFF mô phỏng bằng bản tin ESP32. Thời gian reading/clock/session trong fixture được dịch sang các ngày khác nhau để cô lập budget; **không phải thời gian đo vật lý hoặc bằng chứng NTP**. Kịch bản test không kết nối gateway/broker.

**Fixture isolation và giữ lịch sử:** engine có target cố định nên các case dùng một thiết bị/actuator synthetic. Giữa case, migrator đóng cycle trước và chuyển open intent sang CANCELLED với lý do `SYNTHETIC_CASE_ARCHIVE_PREVIOUS_<status>`, chuẩn bị safety fixture mới; không DELETE/TRUNCATE/reset DB. Trạng thái UNCERTAIN/fault/budget trước archive được chụp trong evidence của từng case. Đây là thao tác sắp xếp fixture, **không phải cơ chế runtime reconcile/clear fault được triển khai**. Mỗi lượt chạy dùng dải ngày mới, không reset budget cũ. Không xóa dữ liệu của những lượt lỗi trước.

Test DB cuối lượt có **0 DeviceCommand, 0 SensorReading, 0 AutomationRule**; có 134 audit rows tổng của các lượt thử được giữ lại. Không được hiểu con số audit tổng là 134 test; lượt cuối có 38 cases.

### Các vấn đề phát hiện và đã xử lý

1. `pg_ctl start` trên Windows đã khởi động server nhưng helper bị giữ pipe output: dừng đúng Node bootstrap helper, giữ nguyên server test và tiếp tục bằng SQL identity. Đã sửa cách spawn pg_ctl dùng stdio ignore/Windows hidden; không đụng service production.
2. Generate schema đặt ngoài backend khiến Prisma tìm package ở root và tự chạy npm. Đã dừng quá trình auto-install, hoàn nguyên **chỉ thay đổi package.json/package-lock.json root do công cụ tạo**, chuyển schema generate vào `backend/build` và dùng `PRISMA_GENERATE_SKIP_AUTOINSTALL=1`. Client riêng generate thành công; dependency artifacts đã phát sinh trong root node_modules không bị xóa diện rộng vì đó là thư mục dùng chung. Backend manifest chỉ thêm script test có chủ đích; root manifests không còn diff.
3. Assertion ban đầu coi serialization luôn là Prisma P2034; với raw SQL, Prisma trả **P2010/meta.code=40001**. Đã kiểm chứng SQLSTATE và sửa assertion, không nới transaction/constraint. CHECK budget có thể được Prisma bọc `PrismaClientUnknownRequestError`; test đối chiếu tên CHECK/23514 thay vì coi mọi exception là PASS.
4. Khi rerun, case midnight có thể dùng lại ngày ngân sách đã giữ từ lượt trước và gặp P2002. Đã sửa fixture chọn dải ngày mới sau high-water test và cách nhau hai ngày; không xóa/reset ngân sách hoặc bỏ unique constraint.

Các attempt lỗi được giữ trong `integration-attempt-*.json`; kết quả cuối đã chạy lại đủ 38 cases PASS, không che lỗi bằng sửa dữ liệu production hay bỏ assertion.

### Regression và production sau thực thi

- **243/243 offline PASS**: shadow92 + preview39 + persistence45 + pump40 + presence27; chạy lại sau integration.
- Backend `tsc --noEmit` PASS; composed Prisma schema validate PASS 6.19.3, datamodel-only diff offline. Không sửa frontend nên không chạy browser E2E mới.
- Production SELECT cuối **2026-10-20T19:10:44.694Z**: vẫn smart_agriculture/public, server 17.2/start `2026-10-16 12:13:43.656514+07`; 11 migrations, pending/checksum mismatch/unfinished=0, chưa có sáu bảng proposal. DB/role test không tồn tại trên server production.
- Production schema và pure engine/telemetry/evaluator/preview route hashes giữ nguyên. Schema SHA-256 `A45A2B799ECD666328A911424A75D12986EF4248F15FC716455197CD62957B4D`.
- PostgreSQL production PID **7848**, backend **23660**, broker listeners **23312/4572** không đổi; không restart chúng.
- Safe configuration diagnostic: commands=false, automation=false, pumpTestMode=true. API runtime xác nhận `controlEnabled=false`, `gatewayMode=DISABLED`; **0 PENDING**, số lệnh phiên vật lý cũ vẫn 2, không phát sinh lệnh mới từ Phase này.
- **Không được gọi thiết bị thật ONLINE/OFF ở cuối phiên:** API lúc `19:10:00.638Z` trả ESP32 **OFFLINE**, PUMP_01 **UNKNOWN**, lastSeen `18:49:05.590Z`, last OFF-state timestamp `18:48:58.497Z`. Health lúc `19:10:35.554Z`: database connected, **MQTT disconnected**, dù broker process còn listening. LastSeen xảy ra trước lúc cluster test khởi động. Chưa điều tra nguyên nhân mất MQTT trong phạm vi này, không suy đoán chắc chắn do mạng hoặc do test. Không sửa network/firmware/broker để lấy trạng thái PASS.
- Giữ firmware ENABLE_PUMP_COMMANDS=true như trước, không mở Serial/flash. Adapter bơm giữ trạng thái đã rút theo xác nhận trước đó; không có quan sát vật lý mới. Windows Time dài hạn vẫn NOT VERIFIED.

Vì vậy **persistence test cô lập PASS, nhưng production device/MQTT readiness chưa đạt**. Không dùng kết luận này để mở lệnh hay thử tưới.

### File tạo/sửa và artifact

Tạo mới:

- `backend/src/services/irrigation-persistence/postgres-test.repository.ts`.
- `backend/scripts/phase13-3b-bootstrap.cjs`, `phase13-3b-test-context.cjs`, `phase13-3b-migrate.cjs`.
- `backend/scripts/phase13-3b-integration.cjs`, `phase13-3b-stop.cjs`, `phase13-3b-export-evidence.cjs`.

Sửa:

- `backend/package.json`: thêm `test:irrigation-postgres`; cần truyền `--approved-phase13-3b`, không tự chạy DB tests trong regression mặc định.
- `backend/scripts/phase13-3b-preflight.ts`: làm rõ `testDatabaseCreatedByThisDiagnostic`/`ddlExecutedByThisDiagnostic`, tránh hiểu nhầm diagnostic tạo test DB.
- Báo cáo này. Không nối module mới vào production imports.

Bằng chứng chia sẻ không chứa credentials: [report/phase13_3b/postgresql-results.json](../report/phase13_3b/postgresql-results.json). Có identity, hashes migration, tên case, PID/SQLSTATE và shutdown.

Bằng chứng chi tiết giữ ngoài Git tại `C:\DATN\test-instances\phase13-3b`: `bootstrap-evidence.json`, `migration-evidence.json`, `integration-results.json`, các attempt, fixtures, `shutdown-evidence.json`, logs và PGDATA. Không đưa credential/password files vào báo cáo hoặc yêu cầu người dùng gửi nội dung chúng.

### Shutdown và giới hạn còn lại

Đã xác minh đúng test cluster rồi chạy `pg_ctl -D <exact test PGDATA> -m fast -w stop`. Shutdown thành công lúc **2026-10-20T19:10:02.520Z** (02:10:02 ngày 21/10 UTC+7); log ghi “database system is shut down”, 55433 không còn listener, PGDATA/PG_VERSION vẫn tồn tại. Không DROP/reset database, role hoặc xóa thư mục. Không cần khởi động lại test cluster để bàn giao.

Giới hạn chưa nghiệm thu:

- Đã kill/restart **Node workers thật**, chưa thực hiện reboot Windows hoặc crash PostgreSQL/WAL/power-loss test. Clean shutdown có log checkpoint, không thay bằng chứng crash recovery của PostgreSQL.
- Constraint/provenance ở mức schema và synthetic SHADOW đã test; VERIFIED_LIVE receipt trust, production adapter/evaluator/preview persistence chưa triển khai.
- Fault reconciliation/rearm còn cần thiết kế/phê duyệt riêng; test fixture archive không phải cơ chế vận hành.
- Append-only áp dụng cho app role; admin/migrator sở hữu test vẫn có quyền bảo trì, chưa phải chống DBA sửa lịch sử.
- Chưa load/stress/failover dài hạn, không cam kết exactly-once MQTT hoặc đo phần cứng.
- MQTT production hiện disconnected, ESP32 OFFLINE; phải xử lý riêng trước bất kỳ preflight phần cứng/ACTIVE nào.

**Dừng sau Phase 13.3B.** Muốn sang Phase 13.4 cần phạm vi VERIFIED_LIVE/read-only evidence được duyệt riêng, khôi phục MQTT/device readiness và thiết kế trust/reconciliation phù hợp; kết quả này không cho phép migration production, bật automation hay thử bơm.

---

## Phụ lục — preflight A trước khi nhận phê duyệt (lịch sử)

Ngày: **21/10/2026, UTC+7**. Phiên hiện tại chỉ thực hiện **Bước A — preflight read-only/offline**.

```text
PHASE13_3B_PREFLIGHT_READY (phương án đã chuẩn bị, chưa có test instance)
AWAITING_TEST_DB_APPROVAL
POSTGRESQL_PERSISTENCE_NOT_VERIFIED
PRODUCTION_MIGRATION_NOT_APPLIED
AUTOMATION_ACTIVE=false
PHYSICAL_PUMP_NOT_TRIGGERED
```

Chưa có phê duyệt riêng cho môi trường test cụ thể. Bước B và mọi integration test ghi database **NOT RUN**. READY ở đây chỉ có nghĩa có công cụ và phương án để trình duyệt; không có nghĩa đã xác minh kết nối test độc lập hoặc được phép chạy DDL. Gate thực thi B vẫn đóng. Nếu không xác minh được target sau khi được duyệt, phải STOP.

## 1. Production đã xác minh bằng SQL

Diagnostic mới: `backend/scripts/phase13-3b-preflight.ts`. Chỉ import config/Prisma để chạy SELECT trong transaction `READ ONLY`; không import server, gateway, evaluator hoặc command service. Không in URL đầy đủ, mật khẩu hay token. Không chạy migrate status vì có thể kiểm tra migration trực tiếp bằng SELECT và đối chiếu SHA-256 file.

Snapshot **2026-10-20T18:48:27.189Z**, tức 01:48 ngày 21/10 UTC+7:

| Thuộc tính | Bằng chứng |
| --- | --- |
| Datasource | `backend/prisma/schema.prisma`: PostgreSQL, `env("DATABASE_URL")` |
| Endpoint cấu hình, đã bỏ credentials | localhost:5432 / smart_agriculture / public |
| `current_database()` | smart_agriculture |
| `current_user` | postgres |
| `inet_server_addr()` / port | ::1/128 / 5432 |
| `current_schema()` | public |
| Server version | PostgreSQL 17.2 |
| Transaction read-only | on |
| Server start | 2026-10-16 12:13:43.656514+07 |
| Role production | superuser=true, createdb=true, createrole=true |
| Migration hiện có | 11; latest `20261014090000_mqtt_pump_commands` |
| Pending / unfinished / checksum mismatch | 0 / 0 / 0 |
| Sáu bảng proposal trong public | Không tồn tại |
| Proposed test DB/role trên server production | Chưa tồn tại |

PostgreSQL service `postgresql-x64-17` Running/Automatic; listener 5432 PID **7848**, bind 0.0.0.0 và ::. Không thay listener/firewall/service. Backend 5000 vẫn PID **23660**.

**Không sử dụng role/credential production cho test.** Role hiện tại có quyền rất rộng, vì vậy không chọn phương án tạo test database trên cùng server 5432. Cùng server dù khác DB vẫn chia sẻ cluster/catalog/resource và rủi ro credential; instance riêng là phương án phù hợp hơn.

## 2. Công cụ và topology test đề xuất

Đã kiểm tra:

- PostgreSQL 17.2 có `postgres.exe`, `initdb.exe`, `pg_ctl.exe`, `psql.exe`, `createdb.exe`, `pg_dump.exe` tại `C:\Program Files\PostgreSQL\17\bin`.
- Docker CLI 29.4.1 có sẵn; context desktop-linux nhưng Docker Engine không truy cập được, `com.docker.service` Stopped. Không mở Docker Desktop hoặc khởi động dịch vụ.
- Port **55433** chưa có listener tại thời điểm preflight; phải kiểm tra lại trước khi start test.
- Thư mục dự kiến `C:\DATN\test-instances\phase13-3b` chưa tồn tại. Ổ C còn khoảng 101.79 GB lúc kiểm tra.

**Đề xuất chọn native PostgreSQL 17 instance riêng**, dùng binary đã cài, không cần cài package/tải Docker image hay khởi động Docker. Không tạo Windows service mới; chỉ khởi chạy process test với data directory riêng sau khi được duyệt. Khả năng initdb/start thành công dưới Windows token hiện tại **chưa kiểm chứng**, không tự nâng quyền hoặc fallback sang production nếu thất bại.

| Thành phần xin duyệt | Giá trị dự kiến |
| --- | --- |
| Instance/data root | `C:\DATN\test-instances\phase13-3b` |
| PGDATA | `C:\DATN\test-instances\phase13-3b\data` |
| Log | `C:\DATN\test-instances\phase13-3b\logs` |
| Binding | Chỉ 127.0.0.1:55433; không expose LAN |
| Database | `smart_agriculture_test_phase13_3b` |
| Schema | `phase13_test_phase13_3b` |
| Bootstrap admin riêng | `phase13_test_admin`, chỉ thuộc cluster test |
| DDL/migration owner | `phase13_test_migrator`, không dùng làm app test |
| Runtime app test | `phase13_test_app`, không superuser/createdb/createrole, không sở hữu bảng |
| Credentials | Mật khẩu test mới, riêng từng login; không tái sử dụng production, không log/commit |
| Mode/source | Chỉ SHADOW và FIXTURE/MOCK |
| Fixture | Dữ liệu synthetic trong DB test; không copy readings/users/rules/commands production |

Cluster test chia sẻ CPU/RAM/đĩa của máy Windows nhưng không chia sẻ data directory, catalog hoặc role với production. Dự kiến giới hạn connections/bộ nhớ của **cluster test** và số worker để tránh áp lực tài nguyên. Các cấu hình test và ACL thư mục secrets cần được review trước khi áp dụng; không thay cấu hình cluster production.

## 3. Phê duyệt và gate danh tính trước DDL

Trong yêu cầu Phase 13.3B, người dùng chỉ cho phép Bước A và yêu cầu xin duyệt riêng trước DDL. **Chưa nhận approval B**, chưa tạo DB/role/cluster, chưa viết credential test hoặc generate client test.

Sau approval cần hai lớp xác minh:

1. Pure guard `assertIsolatedTestDatabase`: approval=true, exact database/schema test, loopback, test role prefix, mật khẩu riêng, không trùng tên DB/credential production, từ chối query option ngoài schema. Guard hiện chưa kiểm tra exact approved port hoặc data directory; wrapper B phải so exact host/port/role với manifest đã duyệt và xác minh danh tính SQL, không chỉ tin `environment=ISOLATED_TEST`.
2. Kết nối SQL thực: xác nhận database/user/server address/port/schema và cluster data directory/start identity khớp manifest. Mismatch → STOP trước DDL; không fallback sang `DATABASE_URL` production.

Lệnh **chỉ đọc** kiểm tra connection target, sau khi test instance/DB tồn tại và được phê duyệt; `-W` nhập mật khẩu tương tác, không đặt mật khẩu trong câu lệnh:

```powershell
& 'C:\Program Files\PostgreSQL\17\bin\psql.exe' -X -W -h 127.0.0.1 -p 55433 -U phase13_test_app -d smart_agriculture_test_phase13_3b -v ON_ERROR_STOP=1 -c 'SELECT current_database(), current_user, inet_server_addr(), inet_server_port(), current_schema(), current_setting(''search_path'');'
```

SQL identity đầy đủ dùng trong harness và trước migration:

```sql
SELECT current_database(), current_user, inet_server_addr(), inet_server_port(),
       current_schema(), current_setting('search_path'),
       pg_postmaster_start_time();
-- Chỉ bootstrap admin test có quyền cần thiết, không chạy bằng app role:
SHOW data_directory;
```

Trước schema DDL, harness phải SET search_path tới schema test rồi SELECT lại: `current_schema()` đúng `phase13_test_phase13_3b`, role và port đúng approved target. Không dùng search_path production/public để áp dụng proposal unqualified.

**Bootstrap phải phân biệt với migration**: DB/schema test chưa tồn tại nên không thể giả vờ đã kết nối vào chúng. Sau initdb được duyệt, trước CREATE ROLE/DATABASE, kết nối maintenance database của **cluster test mới** và đối chiếu role bootstrap, port 55433, loopback, PGDATA chính xác. Trước CREATE SCHEMA, kết nối đúng DB test bằng migrator, xác minh identity; schema dự kiến được xác nhận chưa tồn tại. Sau CREATE SCHEMA, kiểm tra exact schema bằng SQL và guard trước mọi DDL bảng/index. Đây là các thao tác B tương lai, không được thực hiện trong preflight này.

## 4. Review schema và kế hoạch migration test

Đã đọc lại schema hiện tại, fragment sáu model, CHECK/partial indexes, guard và các báo cáo Phase 13.3A/13.2/kế hoạch Phase 13.

- Proposal riêng: `backend/prisma/proposals/irrigation-persistence.prisma` và `irrigation-constraints.sql`.
- Script `prepare-irrigation-schema.cjs` ghép vào **bản sao** schema, validate và diff offline; URL dummy localhost:1, không kết nối DB.
- Generated `build/phase13-3a-schema/migration-proposal.sql` chỉ thêm ledger và supporting indexes vào schema nền đã tồn tại. **Không được apply file này vào DB trống rồi giả định đủ base tables.**
- DDL proposal unqualified, vì vậy cần search_path test được xác minh; không dùng public production.
- Composite FKs giữ mode/actuator/device/cycle thống nhất, RESTRICT lịch sử; partial unique giữ một open cycle/intent; version/budget/duration/expiry/provenance có CHECK như báo cáo 13.3A.
- CHECK/partial indexes và quyền audit mới chỉ review source, chưa chứng minh PostgreSQL thực thi thành công.

Kế hoạch sau approval:

1. Khởi tạo cluster test riêng với auth SCRAM và loopback, kiểm tra identity theo từng bootstrap gate ở trên. Không dùng production credential.
2. Tạo role/db/schema đúng manifest. Migrator sở hữu schema/table; app chỉ có quyền cần thiết.
3. Dựng schema nền bằng **11 migration SQL hiện có** theo thứ tự vào schema test, không chạy seed. Review SQL trước khi chạy. Cách này giữ các partial indexes legacy không biểu diễn đủ trong Prisma datamodel: pending command, enabled automation rule, active alert.
4. Review/apply additive proposal trên đúng base schema trong transaction và với ON_ERROR_STOP. Kiểm tra catalogs, FK, constraints, indexes, mode defaults; ghi hashes và kết quả từng bước.
5. Generate Prisma Client test riêng từ schema test copy với output ngoài client production; không sửa `backend/prisma/schema.prisma` hoặc regenerate client đang chạy.
6. Triển khai PostgreSQL repository adapter chỉ được import bởi harness. Explicit test URL bắt buộc, không đọc fallback env production. Transaction khóa safety theo actor/mode, CAS version, unique constraints, thứ tự lock nhất quán; mọi lần connect phải qua gate target.
7. App role không sở hữu audit table, chỉ SELECT/INSERT audit, không UPDATE/DELETE/TRUNCATE, không CREATE schema. Kiểm thử denial thực tế; ghi chú append-only trong SQL chưa đủ bảo vệ. Migration/admin credential không được dùng trong concurrency test app.

Không áp dụng migration production, không nối adapter vào route/preview/telemetry/evaluator/scheduler.

## 5. Test matrix — chưa chạy integration

| Nhóm | Kịch bản bắt buộc | Kết quả phiên này |
| --- | --- | --- |
| Atomic | Reserve; lỗi intent/budget/audit; rollback; serialization conflict | **NOT RUN** |
| Concurrency | Hai connections và hai processes độc lập; same key/different key; unique conflict; không vượt quota | **NOT RUN** |
| Restart/crash | Kill trước commit/sau commit; crash trước publish mô phỏng hoặc publish uncertainty; giữ journal/budget/fault, không replay | **NOT RUN** |
| ACK giả lập | APPLIED/REJECTED/TIMEOUT/late/duplicate/broker loss, giữ UNCERTAIN reservation | **NOT RUN** |
| Clock/budget | Midnight UTC+7, rollback, quota/day high-water, cooldown/soak xuyên restart | **NOT RUN** |
| Safety | OFFLINE/UNKNOWN/old OFF/new session OFF, manual override/emergency/fault latch | **NOT RUN** |
| Constraints | Composite FK, unique/partial unique, CHECK, RESTRICT và audit permissions | **NOT RUN** |

Mọi ACK/OFF integration tương lai là fixture, không MQTT subscription/publish đến ESP32 hoặc broker thật. Hai service objects trong fake test không thay cho hai PG connections/processes. Không tuyên bố POSTGRESQL_PERSISTENCE_PASS từ kết quả unit test.

## 6. Regression offline đã chạy lại

```powershell
cd C:\DATN\Project_datn\backend
node node_modules/tsx/dist/cli.mjs scripts/phase13-3b-preflight.ts
node --test scripts/irrigation-persistence.test.cjs scripts/shadow-irrigation.test.cjs scripts/shadow-preview.test.cjs scripts/mqtt-pump.test.cjs scripts/device-presence.test.cjs
node node_modules/typescript/bin/tsc --noEmit
npm run schema:irrigation-proposal
```

| Kiểm tra | Kết quả thực tế |
| --- | --- |
| Phase 13.1 shadow | 92 PASS |
| Phase 13.2 preview | 39 PASS |
| Persistence fake | 45 PASS |
| Pump offline | 40 PASS |
| Presence offline | 27 PASS |
| Tổng | **243/243 PASS, 0 FAIL, 0 SKIP** |
| TypeScript | PASS |
| Prisma composed proposal validate | PASS, Prisma 6.19.3 |
| PostgreSQL DDL/integration | NOT RUN |

Không sửa frontend nên không chạy lại browser E2E. Không cài package, không khởi động thêm service, không migration hoặc generate client.

## 7. Runtime và không thay đổi production

Snapshot API lúc **2026-10-20T18:48:55.363Z**:

- ESP32-GF-A-01 ONLINE; lastSeen `18:48:50.644Z`.
- PUMP_01 OFF, stateAt `18:48:43.375Z`; `controlEnabled=false`, `gatewayMode=DISABLED`.
- Bốn MQTT readings tại `18:48:50.428Z`: TEMP_01=22.9; HUM_01=61.1; SOIL_01=15.3; LIGHT_01=0.
- SELECT preflight: PENDING=0. Safe env diagnostic: commands=false, automation=false, testMode=true. Đây là config diagnostic nạp; API chứng minh control thực tế disabled. Backend PID 23660 không đổi và không restart trong phiên.
- Schema production SHA-256 vẫn `A45A2B799ECD666328A911424A75D12986EF4248F15FC716455197CD62957B4D`; không có sáu bảng proposal trên production, migration checksums không lệch.
- Không DDL/DML từ script preflight; ứng dụng đang chạy vẫn ingest telemetry bình thường. Không tuyên bố toàn server ngừng ghi dữ liệu.
- Không gửi ON/OFF, không tạo command production, không thay rule/readings, không flash firmware. Firmware ENABLE_PUMP_COMMANDS=true giữ nguyên. Adapter giữ trạng thái rút điện theo xác nhận trước đó; không quan sát vật lý mới và không có cảm biến nguồn độc lập.
- Windows Time nghiệm thu dài hạn vẫn NOT VERIFIED, không resync/đổi peer trong Phase này.

## 8. Cleanup và rollback cần được duyệt

- Khi kết thúc test: đóng harness/client, xác minh PID/port/PGDATA thuộc test rồi dừng đúng cluster qua `pg_ctl` với exact data directory; không stop service PostgreSQL 17 production.
- Mặc định giữ log, SQL hashes và dữ liệu test để đối chiếu; không DROP/reset/xóa thư mục tự động.
- Nếu migration lỗi: rollback transaction test, thu log, dừng adapter/harness; không fallback production hoặc nới constraints để lấy PASS. DDL bootstrap đã commit phải được ghi nhận riêng, không giả định rollback transaction xóa cả cluster/database.
- Cleanup phá hủy/drop DB/role/xóa PGDATA cần phê duyệt riêng với exact target. Trước thao tác phải xác minh lại manifest, connection identity và đường dẫn tuyệt đối; không dùng root workspace/home hoặc glob rộng.
- Production rollback không cần vì chưa thay đổi production. Giữ ledger/audit nếu triển khai về sau, không tự xóa lịch sử để reset budget.

## 9. Điểm dừng và điều kiện tiếp theo

Đề nghị người dùng phê duyệt cụ thể: **tạo native PostgreSQL 17 test cluster riêng tại `C:\DATN\test-instances\phase13-3b`, chỉ listen 127.0.0.1:55433; database/schema/roles đúng bảng mục 2; tạo credentials test mới; dựng schema nền và proposal trên test; generate client test; triển khai adapter và chạy integration tests synthetic. Không cho phép migration production hoặc destructive cleanup.**

Nếu người dùng chọn Docker thay native, cần duyệt lại topology/container/port/volume và quyền khởi động Docker, không tự chuyển phương án.

Phase 13.4 chưa đủ điều kiện: cần approval B, target isolation SQL PASS, PG adapter/integration/concurrency/crash/constraints/audit thực tế PASS và kế hoạch VERIFIED_LIVE trust riêng. Không bật ACTIVE automation chỉ vì persistence test đạt.

**Dừng tại AWAITING_TEST_DB_APPROVAL.**
