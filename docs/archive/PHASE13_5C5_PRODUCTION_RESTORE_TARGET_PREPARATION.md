# Phase13.5C.5 — Production restore target preparation

22/10/2026, UTC+7. Đã đọc báo cáo Phase13.5C và Phase13.5C.4, review backup private ở chế độ read-only. **Chưa tạo thư mục/cluster recovery, initdb, start instance hoặc restore dữ liệu production.**

## 1. Kết luận

```text
PRODUCTION_BACKUP_ARCHIVE_VERIFIED
RECOVERY_TARGET_PLAN_READY
PRODUCTION_DATA_RESTORE_NOT_PERFORMED
PRODUCTION_MIGRATION_NOT_PERFORMED
AUTOMATION_ACTIVE=false
VERIFIED_LIVE_NOT_READY
CLOUD_BACKUP_SCOPE_NOT_VERIFIED
PHYSICAL_PUMP_NOT_TRIGGERED
```

PLAN_READY là thiết kế và pure guard đã chuẩn bị, không phải instance đã provision hoặc restore executor đã được nghiệm thu. Chờ phê duyệt vị trí/NTFS và phạm vi lưu, xử lý production data tại recovery target mới. Approval backup local cũ không tự áp dụng cho recovery storage hoặc restore.

## 2. Backup hiện có — kiểm tra lại chỉ đọc

Run: `20261022-220757-53a520a7936841a38d76b3af68c700f0`, tại thư mục production backup private đã được duyệt, ngoài Git.

| Artifact | Kết quả đọc lại |
| --- | --- |
| smart_agriculture.dump | 635,219bytes |
| Dump SHA256 | 04D4F89DF6440B627FBB86CBC5B1AC1FEDF931BF51064D26AB354E9E24230640 |
| Roles SHA256 | 263B533FEA856D34B9660D8C966DCFB2A74B7B85D5DB44298E0041998652255D |
| Manifest/list evidence Phase13.5C.4 | pg_dump exit0, pg_restore --list exit0; RestoreVerified=false |
| TOC object owners | chỉ postgres |
| Prisma migrations trong backup manifest | 11; local migration checksums vẫn khớp |

Hash được tính lại từ dump và role metadata, khớp private manifest. Đọc TOC đã lưu, không cần chạy lại --list; không chạy pg_dump mới. Không đưa dump, SQL data hoặc nội dung người dùng vào report/Git.

Database properties trong private manifest:

- Source smart_agriculture/public/127.0.0.1:5432, PostgreSQL17.2, systemID7472695863566132416.
- Owner postgres; encodingUTF8; LC_COLLATE và LC_CTYPE đều `English_United States.1252`.
- Connection limit-1; allow_connections=true.
- Database ACL source: PUBLIC CONNECT/TEMPORARY; postgres CREATE/CONNECT/TEMPORARY, không grantable. Không có password/hash trong mapping metadata.

Custom archive giữ object schema/ownership/grants, nhưng target tên khác nên phải tái tạo database-level properties/ACL tường minh; không `--create` để vô tình tạo tên source.

## 3. Recovery target đề xuất để review

| Thành phần | Đề xuất — chưa tạo |
| --- | --- |
| Native binaries | PostgreSQL17 đã có, ưu tiên17.2 tương thích archive |
| Host / port | chỉ127.0.0.1:55434 |
| Container ngoài Git | `%LOCALAPPDATA%\SmartAgriculturePostgresRecovery` |
| Instance root | `%LOCALAPPDATA%\SmartAgriculturePostgresRecovery\phase13-5c-recovery-01` |
| PGDATA | instance root\data |
| Logs | instance root\logs-private |
| Evidence/canonical digests/identity | instance root\evidence-private |
| Primary restore database | smart_agriculture_recovery_13_5c_01 |
| Optional independent second restore DB | smart_agriculture_recovery_reference_13_5c_01 — chỉ nếu được duyệt rõ |
| Windows process owner | operator Acer Swift3, SID S-1-5-21-1432835263-483988321-3159128977-1001 |
| New recovery DBA | sa_recovery_dba, credential mới riêng chỉ recovery |
| Archive object owner | postgres NOLOGIN, không dùng production password |

Đường dẫn absolute instance root: `C:\Users\Acer Swift3\AppData\Local\SmartAgriculturePostgresRecovery\phase13-5c-recovery-01`.

Đã kiểm tra read-only: container/root chưa tồn tại; chuỗi parent không có unexpected reparse; ngoài repository/known OneDrive root. Không thấy listener55434 hoặc55433 tại preflight. C: còn108,984,844,288bytes ở snapshot capacity; recheck trước provisioning, không lấy compressed dump size làm dự toán PGDATA.

Không dùng5432 hoặc55433; không ghi đè PGDATA/test databases Phase13.3B/13.5B/C. Không thêm Windows service/Docker. Future start bằng native pg_ctl đúng PGDATA sau approval; graceful stop đúng instance sau nghiệm thu, giữ dữ liệu/logs, không tự cleanup.

### NTFS / encryption / cloud

Đề xuất đúng5directory mới: container, instance root, data, logs-private, evidence-private. Tất cả owner operator; protected DACL không kế thừa từ cha, chỉ operator và SYSTEM FullControl/OI/CI. Không Users/Authenticated Users/Everyone/sandbox group. Mọi file PGDATA/log/evidence mới chỉ kế thừa hai ACE từ private directory; nghiệm thu owner/ACE/inheritance/reparse sau tạo. Không đổi ACL LocalAppData/repository/backup storage/production hoặc parent hiện hữu.

initdb chỉ được dùng data directory riêng chưa có cluster và trống; nếu công cụ tự thay ACL thì đọc lại nghiệm thu trước start/production-data write, sai khác =>STOP, không tự repair rộng. Existing target path/cluster/database không đủ điều kiện thì STOP, không xóa/reset/initdb lại.

Cùng ổC có BitLocker XTS-AES128/Protection On theo bằng chứng Administrator người dùng ở C.2; chưa đo Administrator mới, không đọc key. Bảo vệ at-rest khi khóa, không chống admin/malware khi unlocked hoặc mất cả ổC. CLOUD_BACKUP_SCOPE_NOT_VERIFIED cho recovery location; scope ngoài known roots không chứng minh ngoài mọi custom sync. Người dùng phải đồng ý residual risk cho **nơi chứa restored production data mới**, không tái dùng approval backup cũ để suy ra điều này. Recovery key người dùng giữ độc lập, không chat/Git/PGDATA.

## 4. Provisioning và identity runbook — CHỈ SAU PHÊ DUYỆT

1. Phê duyệt location/5directory/NTFS và quyền lưu production data; xác nhận ngưỡng disk reserve đủ cho PGDATA, WAL, logs và optional2DB. Không ghi credential vào CLI/log. Review/hash future provisioning executor trước chạy.
2. Kiểm tra không listener55434, root chưa tồn tại, no reparse/known sync; tạo private storage và nghiệm thu thực tế. Không thay parent ACL.
3. PostgreSQL17 initdb với DBA `sa_recovery_dba`, password mới qua interactive local prompt; không copy production role/password/DATABASE_URL. Không dùng trust. Không tự tái sử dụng passwordfile production hoặc plaintext pwfile.
4. Trước start, cấu hình riêng chỉ `listen_addresses='127.0.0.1'`, port55434, SCRAM authentication và HBA cho đúng recovery DBA/database từ127.0.0.1/32; không wildcard LAN/IPv6 listener. Chặn role login không cần thiết. Không đổi production config/firewall/services.
5. Thu system identifier thật bằng pg_controldata đúng PGDATA, đối chiếu với SQL identity khi server khởi động. ID mới phải khác production7472695863566132416 và test7698826681383327460. Ghi identity private manifest gắn path/port/creation timestamp/operator, pin giá trị đó trước DDL/restore. Không lấy ID bất kỳ từ kết nối rồi tự coi approved; fixture ID trong tests không phải ID instance.
6. Trước mỗi thao tác có thể ghi: kiểm tra host127.0.0.1, port55434, PGDATA exact, server major17, registered ID exact, database/role/schema exact, server-start/process expected. Sai bất kỳ =>STOP. Không fallback DATABASE_URL/PGSERVICE/PGHOST production; child environment chỉ recovery, scrub PG overrides.
7. Tạo database **tên mới chưa tồn tại**, TEMPLATEtemplate0, UTF8 và locale đúng source nếu PostgreSQL17 hỗ trợ locale đó; không fallback locale âm thầm. Đối chiếu source locale provider/version nếu archive hoặc source metadata hiện tại bổ sung được; manifest C.4 chưa ghi provider/version, nên chưa tuyên bố tương đương locale đầy đủ. SQL identity trước CREATE DATABASE dùng maintenance database recovery đã duyệt riêng; guard database restore chỉ áp dụng sau khi target DB được tạo.
8. Không sửa connection của backend/frontend/MQTT; không chạy recovery app. Recovery DBA không dùng làm application runtime; không mở service tự khởi động. Loopback không ngăn local admin/malware nên không phải isolation tuyệt đối.

## 5. Role/ownership/privileges mapping

- Không replay roles SQL/global dump tự động. Role metadata372bytes cần review riêng, không dùng nó để đổi postgres role/password production.
- initdb superuser tên mới sa_recovery_dba. Trong recovery cluster, tạo `postgres` **NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS**, chỉ để giữ archive object ownership và database owner. Nếu role đã tồn tại với quyền khác thì STOP/review, không tự alter role sẵn có.
- Restore bằng recovery DBA có quyền local cần thiết, giữ owner/ACL trong archive; không `--no-owner`/`--no-acl` rồi báo quyền khớp.
- PostgreSQL built-in pg_database_owner dùng đúng semantics database owner. Ánh xạ DB-level owner/ACL từ private manifest bằng explicit grants/revokes chỉ trên fresh recovery DB. Nếu muốn thắt PUBLIC privileges so source, ghi security delta rõ, không tuyên bố ACL equality.
- Cố ý không tái lập production postgres superuser/login credential. Object ownership/ACL có thể preserve, còn role-level privilege topology thay đổi có chủ đích; không tuyên bố disaster role equivalence.
- Probe role mới sa_recovery_probe nếu được duyệt, NOSUPERUSER/NOCREATEDB/NOCREATEROLE/NOBYPASSRLS, không member owner/DBA. Không cấp quyền ghi/app runtime. So has_table_privilege/has_schema_privilege và catalog ACL canonical; mutation privilege probes dùng rolled-back transactions chỉ nếu approval test ghi target cho phép, không trong phase này.

## 6. Restore runbook và guard đã chuẩn bị

Pure contract: `backend/scripts/phase13-5c5-recovery-contract.cjs`. CLI chỉ xuất PLAN_ONLY, không import DB client, không child process/initdb/restore. Export assertIdentity/assertEmptyTarget/restoreArgs để future executor gọi; không có nhánh Execute trong phase này.

Guard thực tế đã viết:

- Bắt buộc registered independent systemID, đúng path/port/host/role/schema/PG17 và không standby.
- Cấm production5432, test55433, source database smart_agriculture, PGDATA production/test, rolepostgres làm executor.
- Chỉ primary recovery DB được phép; optional reference phải có scope riêng.
- Empty-target: userRelations/userRoutines/userTypes/nonDefaultExtensions đều0 và userSchemas đúng public. Future executor phải thu counts từ catalog **thật**, không gán0 để vượt kiểm tra. Extension plpgsql mặc định không coi là dữ liệu người dùng; mọi extension khác phải review trước emptiness gate.
- Đúng archive absolute path + SHA256 đã pin; chưa restoreApproved thì không tạo argument list.
- Native args có explicit recovery host/port/user/database, `-w --exit-on-error --single-transaction`; không --clean/--create/--no-owner/--no-acl. -w yêu cầu credential local đã cấp cho child, không tự hỏi password trên native stdin hoặc fallback production.

Future executor còn phải implement/review: provisioning và connection identity adapter, private secure credential input, native stream capture/exit/timeouts, actual catalog emptiness queries, read-only comparisons và shutdown. **Chưa nghiệm thu các phần execute này; pure tests không thay integration.**

Trình tự sau approval restore:

1. Recheck source archive hash/NTFS, target registration/identity, fresh database existence marker và actual empty schema; kiểm process target/bind, production runtime/commands baseline.
2. Tạo restore-attempt marker create-new trong private evidence, không overwrite. Capture `pg_restore --exit-on-error --single-transaction` stdout/stderr/exit code/thời gian tại private log, không in data/errors có thể chứa user values.
3. Restore failure/timeout/unknown outcome =>STOP và giữ failed target/evidence; không DROP/TRUNCATE/--clean hoặc retry. Không coi transaction rollback là nghiệm thu durable commit.
4. Success mới đọc catalog/data qua READ ONLY REPEATABLE READ, timezoneUTC/DateStyle/float serialization cố định; so migrations11/checksums/timestamps từ archive, TOC objects, columns/types/defaults/nullability, indexes/validity, CHECK/FK/validation, functions/triggers/enums/owners/grants, database ACL explicit mapping.
5. Không yêu cầu6irrigation tables hoặc14irrigation RESTRICT FK của synthetic rehearsal: backup production này ở baseline11migrations **chưa có** ledger migration. So theo archive production thật, không synthetic fixture.
6. Ghi private counts/digests/elapsed/ACL results; report chỉ status/counts/digest summary, không bảng dữ liệu người dùng, credentials, JWT hoặc SQL chứa data.
7. Verify production health/PENDING/count không đổi bởi rehearsal, recovery không có app/MQTT client; stop graceful đúng recovery PGDATA/process sau nghiệm thu; giữ artifacts và không cleanup khi chưa duyệt.

## 7. So sánh dữ liệu đúng snapshot — giới hạn và phương án

Archive snapshot nằm trong `2026-10-22T15:07:58.3603749Z`–`15:07:59.0263028Z`; exact exported snapshot ID không lưu. Source tiếp tục ghi sensor readings/presence/activity. **Không so row count/digest của source hiện tại với restored snapshot rồi kết luận mismatch hoặc làm giả timestamp.**

Backup manifest có source identity, DB properties,11migration rows và before/after safety counts, nhưng **không có snapshot-consistent per-table row counts/data digests/catalog manifest của chính snapshot dump**. Pre/post inventory catalog dùng để nhận biết schema baseline, không phải bằng chứng data snapshot tương đương từng row.

Nghiệm thu tối thiểu: verify pinned archive hash, successful restore all TOC entries, PostgreSQL constraints/catalog,11migration rows/checksums và persisted data có thể đọc; compute SHA256 per-table trên canonical row serialization/sort ổn định trong một READ ONLY snapshot, gồm explicit column/type/order và row count; digests giữ private. Không dùng MD5 như bằng chứng chống sửa đổi đối kháng.

Nếu cần kiểm tra reproducibility dữ liệu từ **cùng archive**, có thể duyệt restore thứ hai vào optional reference DB mới trên recovery cluster, không lấy source live. So deterministic row-count/SHA256 và catalogs giữa hai restores, sequences/index validity/constraints/privileges theo cùng phương pháp. Đây chỉ chứng minh hai lần restore cùng archive nhất quán, **không phải bằng chứng độc lập rằng archive khớp mọi row của production tại snapshot ban đầu**. Optional second restore/DB cần nêu rõ trong approval, không tự thực hiện.

Nếu yêu cầu bằng chứng source-snapshot equality mạnh hơn, cần một workflow backup/snapshot evidence mới được duyệt riêng trong tương lai; không chạy pg_dump lại hoặc retroactively gán snapshot/digests cho backup hiện tại. Giữ trạng thái nguồn-snapshot per-row equality NOT_VERIFIED dù restore sau này thành công.

## 8. Tests và runtime safety thực tế

Chỉ chạy28/28 tests pure contract mới: identity mismatch, production/test exclusions, wrong database/user/schema/version, nonempty tables/functions/types/extensions/schema, separate approval, archive mismatch/hash, optional reference scope và restore flags. Không DB connections hoặc native restore/initdb trong tests. Không chạy lại bộ tests/restore đã PASS trước đây.

SHA256:

- contract: `9C342F43BD4B452106BB4A9708D1F30F71F5258EEA79D5438AD5C78E574C9543`.
- tests: `D031ADD66B894800D89EE84921FB48C3AF36CDB3D0466017A44B9143F8BA10E1`.

Read-only runtime22/10/2026 lúc22:26:15UTC+7: backend5000 PID15264 vẫn chạy; startup attestation đúng process false/false/testtrue/cap1; API health database/MQTTconnected. SELECT READ ONLY: PENDING0, DeviceCommand43, ESP32ONLINE, lastSeen15:26:12.775Z. PostgreSQL5432 PID7848 và brokerLAN1883 PID13308 giữ nguyên; loopback broker4572 không can thiệp. Không thêm auth login trong phase này.

Không restart dịch vụ, đổi credentials/Windows Time, firmware/reset/COM, ON/OFF, cấp nguồn bơm, migration production, main schema/startup wiring hoặc VERIFIED_LIVE/ACTIVE. Không có recovery PGDATA/log/data mới được tạo. Adapter giữ ngắt theo quy định vận hành; không có đo xác nhận nguồn vật lý mới từ SQL.

## 9. Phê duyệt còn cần

Người dùng cần duyệt riêng:

1. **Vị trí/NTFS/cluster mới:**5directory nêu trên, PG17/loopback55434, operator+SYSTEM ACL, credential recovery mới nhập cục bộ, residual cloud/same-disk risk; không sửa production hoặc test55433.
2. **Xử lý production data/restore:** primary DB mới, role mapping/ACL như thiết kế, capture private logs/digests, một restore có kiểm soát không overwrite, stop graceful/giữ evidence. Có hoặc không optional reference DB phải ghi rõ. Không bao gồm migration, app startup, pump control hoặc cleanup.

Có thể duyệt hai phạm vi trong một tin nhắn rõ ràng sau khi review. Chưa coi chúng được cấp ở Phase13.5C.5. **DỪNG tại RECOVERY_TARGET_PLAN_READY; chưa tạo cluster hoặc restore dữ liệu thật.**
