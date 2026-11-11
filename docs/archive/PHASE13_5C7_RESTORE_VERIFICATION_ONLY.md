# Phase13.5C.7 — Existing restore verification only

23/10/2026, UTC+7. **PRODUCTION_DATA_RESTORE_ACCEPTANCE_PASS — nghiệm thu thực tế trên database đã restore:15bảng/34.205dòng khớp archive, schema/quyền PASS, startup capture sạch lỗi, recovery shutdown graceful. Không restore bổ sung.** Kết quả cuối tại mục8 thay thế snapshot pending ở mục7.

## 1. Approval và giới hạn

Đọc đầy đủ attachment `22ba947c-6b6d-4d0c-939d-560ccdbab8e6/Pasted text.txt`, PHASE13.5C.7 — APPROVED VERIFICATION-ONLY OF EXISTING RESTORE. Chỉ một lần start recovery hiện hữu, SQL READ ONLY, đọc archive, kiểm chứng, graceful stop và evidence mới. Không provisioning, initdb, restore-to-database, role/database/table create, DML, reference DB hoặc production migration.

Không dùng lại provisioning/restore executor C.6. Actual restore đã dùng1/1; file attempt/error history giữ nguyên.

## 2. Identity preflight

- Target đã restore:127.0.0.1:55434/smart_agriculture_recovery_13_5c_01/public, PGDATA `%LOCALAPPDATA%\SmartAgriculturePostgresRecovery\phase13-5c-recovery-01\data`.
- pg_controldata read-only đúng systemID7699532241714573532, state shut down; PG_VERSION17. Không listener55434 trước start.
- Registered identity và original restore marker khớp, C.6 outcome restoreExit0/clusterStoppedtrue. Actual database name/identity phải xác nhận SQL sau start, không dựa TCP riêng lẻ.
- Five recovery directory owner/protectedDACL/operator+SYSTEM FullControl/no reparse được kiểm lại PASS; ngoài known sync, không sửa ACL.
- Archive SHA256 pin `04D4F89DF6440B627FBB86CBC5B1AC1FEDF931BF51064D26AB354E9E24230640`; metadata thuộc run20261022-220757-53a520a7936841a38d76b3af68c700f0. Không pg_dump mới.
- Production5432/systemID7472695863566132416/server-start2026-10-16 không đổi; baseline READ ONLY PENDING0/commands43. Test55433 không được dùng làm target.

## 3. Startup capture fix và tests

Module `phase13-5c7-native.cjs` dùng spawnSync với stdinignore/stdout+stderr **direct file descriptors create-new** thay vì pipes. Descendant giữ file handles không khiến parent collector chờ pipeEOF. Timeout hữu hạn; `native.error`, signal hoặc exit khác0 luôn fail, không bỏ qua ETIMEDOUT dù status0. Nếu start lỗi nhưng instance đã lên, finally chỉ stop đúng pinned recovery identity/PGDATA, không retry.

Startup PASS chỉ được ghi sau native capture sạch lỗi **và** actual SQL identity/config (loopback/port/SCRAM/registered system/DB) đều PASS. Không dùng exit0 hoặc listener riêng lẻ.

Tests thực hiện offline: **54/54 PASS** =44contract/comparator/BOM/resume tests +10native/schema/verification tests. Các test mới kiểm stdout/stderr/exit7, cleanexit0, timeout, misleadingstatus0+ETIMEDOUT, inherited descendant handles, create-new preservation, DDL parser và AST/defaultPLAN_ONLY/no-DML runner. Sau chỉnh parentheses trong PowerShell filename array,10/10tests mới được chạy lại PASS, hash final mới pin trước launch. Synthetic test log fixtures ở build, không secrets; không start PostgreSQL trong tests.

## 4. Files và SHA256 trước launch

| Artifact | SHA256 |
| --- | --- |
| scripts/phase13-5c7-verification-only.ps1 | 4FF07D952A9E4CEE71D6C09FB5F1DE03A30E756361940680170297540253FCF3 |
| backend/scripts/phase13-5c7-verify.cjs | DA25EC31097816B61278CC55DDAA03426C73BF989DC940209FFA50504F13F940 |
| backend/scripts/phase13-5c7-native.cjs | 4507548409A553EAAB5FD586334F5E66DD86C40F781BEABAEB1989B0EC16BD2E |
| backend/scripts/phase13-5c7-schema.cjs | 138D1051663D3AB22568C0D72796071B2F9A4C6143491BC0DA72FDAD7CD90207 |
| backend/scripts/phase13-5c7-production-readonly.cjs | 6333113355E28B6EB840F4474A5EF345CD6FDEFE3EF26A845C01618B88F78E3F |
| inherited typed comparator | 4E1E4E2A0A781D7484AEBF7DA22FF39DC639F78B90731325C650FBFCC9D3D212 |

New verification runner không import C.6 executor. Recovery connection được tạo fixed endpoint và credential RAM riêng; không .env/productionURL fallback. Production SELECT diagnostic là module riêng explicit5432, không dùng URL đó cho recovery.

## 5. Các kiểm chứng được triển khai — chưa coi là PASS thực tế

- Fresh session evidence `verification-c7-01.*`/public `report/phase13-5c7-outcome.json`; create-new approval/logs/catalog/outcome, không overwrite lỗi cũ.
- Archive schema extraction `pg_restore --schema-only --file=-` không kết nối DB. Parser đã đọc actual archive offline:15tables/165columns/38constraints/22enums/0userfunctions/0usertriggers; đây là expected archive counts, chưa phải target verification result.
- Full columns/type/default/nullability so với archive DDL; all table names vàCOPY column order. Unknown DDL/collation/generated/inline constructs không hỗ trợ sẽ failclosed, không skip.
- PK/FK/UNIQUE/CHECK definitions từ archive DDL và validatedstatus; indexes/definitions/validity so stable archive-era metadata; enums so archiveDDL, userfunctions/triggers kiểm expected0.
- Table/index ownership/relationACL, public schemaACL và enum defaultACL, internal triggerenabledstatus; không bỏ quaNULL/default semantics. DB properties/ACL và11migrationrows/checksum/timestamps so manifest.
- COPY archive vs SQL READ ONLY COPY target: count+deterministic length-framed SHA256 multiset, preserve duplicates/NULL/Unicode/escapes. Timestamptz normalization chỉ cột pg_catalog đúngtype, preserve6fractionaldigits/NULL/infinity; không normalize text. Unsupported extreme formats failclosed.
- Không tạo probe role. Dùng existing NOLOGIN nonadmin ownerpostgres và built-in pg_read_all_stats: effective privileges bằng catalog, positive/negative SELECT trong READ ONLY transactions/SETLOCALROLE, không DML privilege probes.
- Mọi Prisma query trong READ ONLY REPEATABLE READ; native psql COPY trong BEGINREADONLY, PGOPTIONS default_transaction_read_only=on. Không schema/data mutation để làmPASS.

Raw archive/COPY output chỉ nằm trong private native logs ngoài repo được operator+SYSTEM bảo vệ, không public report/chat; password/token không ghi log. Public report chỉ checks/counts/digest metadata. Mismatch chỉ table/type/hash metadata, không rawrow.

## 6. Production safety

Wrapper dùng current process listener/startup-state/attestation + healthGET và SELECT-only diagnostic. Không login/authPOST trong phase này. Commandsfalse/Automationfalse/TestModetrue/cap1 bắt buộc; PENDING0/tổng43 trước/sau, backendPID/StartTime không đổi. Nếu bất thường chỉ STOP, không production restart.

Trong verification, kiểm productionhealth/servingprocess còn sống tại các identity/data boundaries. Không backend recovery startup, MQTT commands, credentials production change, firmware/reset hoặc pump power. Source-snapshot per-row equality tại dump time vẫn NOT_VERIFIED: archive-vs-target equality không phải independent source-snapshot proof.

## 7. Phiên đã mở — pending secure local input

Interactive PowerShell PID15656, launch `2026-10-22T17:36:53.064Z` =00:36:53 ngày23/10/2026 UTC+7. Người dùng nhập existing recovery password qua Read-Host -AsSecureString, chuyển childstdin RAM; không passwordCLI/chat/plaintext file. Không cần phê duyệt lại cùng phạm vi.

Đã bắt đầu wrapper theo approval; cần đọc outcome sau input để xác nhận native start/checks/stop. Không gọi lại wrapper nếu có lỗi hoặc sessionmarker đã tồn tại.

```text
RECOVERY_IDENTITY: PREFLIGHT_CONTROL_VERIFIED; SQL_RECHECK_PENDING
NATIVE_STARTUP_CAPTURE: OFFLINE_TEST_PASS; REAL_EXECUTION_PENDING
EXISTING_RESTORE_DATA_VERIFICATION_PARTIAL — PENDING
RESTORE_SCHEMA_PERMISSION_VERIFICATION_PARTIAL — PENDING
PRODUCTION_DATA_RESTORE_ACCEPTANCE_PARTIAL — PENDING
RECOVERY_CLUSTER_STOPPED_GRACEFULLY: NOT_VERIFIED_FOR_C7 — NOT_STARTED_YET
PRODUCTION_MIGRATION_NOT_PERFORMED
AUTOMATION_ACTIVE=false — PREFLIGHT
VERIFIED_LIVE_NOT_READY
PHYSICAL_PUMP_NOT_TRIGGERED
```

Dừng khi cần local input. Không tự restore lại, provisioning hoặc chuyển migration/Phase13.5D.

## 8. Nghiệm thu thực tế — PASS

Người dùng xác nhận đã nhập credential recovery trực tiếp. Đã đọc outcome của đúng phiên C.7, không chạy lại runner, không initdb/provisioning hoặc restore-to-database.

### Thời gian và identity

- Started `2026-10-22T17:39:44.356Z` =00:39:44 ngày23/10/2026 UTC+7.
- Ended `2026-10-22T17:39:47.579Z` =00:39:47 ngày23/10/2026 UTC+7.
- SQL identity exact127.0.0.1:55434, smart_agriculture_recovery_13_5c_01/public, sa_recovery_dba, PostgreSQL17.2/version170002, PGDATA đúng instance cũ, systemID7699532241714573532, inRecovery=false.
- Đúng một start recovery trong C.7; không target5432/test55433, không thêm database/reference DB hoặc app connection.

### Native startup capture thực tế

| Operation | Native result |
| --- | --- |
| pg_ctl start | exit0, errorCode=null, signal=null,319ms; stdout54bytes/stderr0 |
| Startup SQL identity/config | exact DB/system/PGDATA/loopback55434/SCRAM PASS |
| pg_ctl stop | exit0, errorCode=null, signal=null,139ms; stdout58bytes/stderr0 |
| pg_controldata sau stop | exit0, systemID đúng, state shut down |
| Listener55434 sau stop | 0 |

Tất cả22native operations exit0/no native.error/no signal; không ETIMEDOUT như C.6. Startup capture PASS dựa thêm SQL config/identity, không chỉ exit0/listener. DirectfileFDs + stdinignore đã giải quyết hành vi capture trong lần khởi động thực tế này; không cam kết mọi kiểu Windows process launch khác đã nghiệm thu.

Hai pg_restore calls ở C.7 là **schema-only/data-only extraction với --file=-, không database argument/kết nối**, không actual restore.15psqlCOPYoperations đều BEGINREADONLY và exit0. Actual restore-to-database tổng toàn chuỗi vẫn duy nhất1lượt C.6, thêm0lượt ở C.7.

### Data và schema/permission checks

13checks thực tế PASS, chi tiết trong `report/phase13-5c7-outcome.json`:

| Phạm vi | Nghiệm thu |
| --- | --- |
| Tables/COPY data | **15/15bảng**, tổng**34.205dòng**, count và typedSHA256digests khớp archive |
| Columns | **165columns**, toàn bộ type/default/nullability khớp archiveDDL |
| PK/FK/UNIQUE/CHECK | **38constraints**, definition khớp archive, validated |
| Indexes | **75indexes**, definitions khớp stablearchive-era metadata, đềuvalid |
| Enums | **22enumtypes**, labels/order khớp archiveDDL |
| User functions/triggers | **0functions/0usertriggers** đúng archive; internalFKtriggers enabled |
| Owners/ACL | Relationnames/owners, relationACL normalized, schemaACL, enumownership/defaultACL PASS |
| Database | UTF8/locale/owner/properties và databaseACL đúng backupmanifest/mapping |
| Prisma | **11migrations**, names/checksums/finishedAt/rolledBackAt normalized khớp manifest |
| Non-admin effective privileges | Existing ownerpostgres đượcSELECT; pg_read_all_stats không owner/member, khôngSELECTusers hoặcINSERTcommands |
| Actual permission probe | READONLY SELECT với SETLOCALROLEpostgres thành công; pg_read_all_stats bị42501 đúng kỳ vọng |

Không tạo probe role hoặc login mới; không chạy write-permission probes. Các quyền ghi chỉ kiểm qua catalog, không thực hiện DML.

Typed timestamp normalization được áp dụng cho3columns thật có type timestamptz trong dataset hiện hữu. Toàn bộ15table digests đã PASS, thay cho mismatch raw+07/UTC của C.6. Duplicates được giữ trong multiset count/digest; NULL/escapedCOPY/Unicode không bị chỉnh; text trông giốngtimestamp không tựnormalize. Mỗi row được length-framed trước SHA256, sort deterministic; timestamp giữ fractional precision tới6digits, không làm tròn mất microseconds.

Infinity/NULL/invalidformat và khác biệt microsecond có regression tests; không tuyên bố production dataset chứa đầy đủ các edge cases đó. Extreme timestampformat ngoài parser được failclosed và chưa được nghiệm thu. Per-table counts/SHA256 giữ trong private evidence, không rawdata hoặc hashcredentials ra public report/chat.

### Runtime production trước/sau và bảo mật artifacts

Private before/after evidence xác nhận:

- Backend PID15264 trước/sau, StartTime không đổi; PostgreSQL/MQTTconnected.
- Commands=false, Automation=false, TestMode=true, effective cap1s tại attestation đúng servingprocess; không dựa PID/log cũ.
- DeviceCommand43→43, PENDING0→0. SELECT-only diagnostic sau độc lập tiếp tục xác nhận43/0 và production5432/systemID7472695863566132416/server-start2026-10-16 không đổi.
- Không authPOST/login trong C.7; production checks chỉ healthGET+SELECT/metadata. Không migration, credentials change, MQTT ON/OFF, backend/broker/PGproduction restart hoặc phần cứng.

Five private directories vẫn owner/operator+SYSTEM protectedDACL;50file mới C.7 (native logs/catalog/session/approval/runtime evidence) được kiểm owner/exacttwoAllowFullControlACE/no reparse PASS. RawCOPY/schema outputs chỉ private location ngoài Git, không đưa vào repository/report/chat. Không password recovery/JWT/recoverykey trong logs.

DumpSHA256 đọc lại vẫn `04D4F89DF6440B627FBB86CBC5B1AC1FEDF931BF51064D26AB354E9E24230640`. Các hashes script/comparator ở mục4 vẫn khớp sau execution, không đổi mã giữa secureinput và verification.

Error evidence ban đầuC.6 còn nguyên A4AB17...B19851B(public) và59A979...BCB237(private); resume outcome/error được giữ. Native logs C.7 có prefixverification-c7-01, không overwrite logs cũ. PGDATA/database/logs được giữ sau graceful stop, không cleanup.

### Bằng chứng authoritative

- Public metadata: `report/phase13-5c7-outcome.json`.
- Private result: recovery evidence-private/verification-c7-01.private.json (22native operations,13checks,15table counts/digests).
- Private catalog: verification-c7-01-catalog.private.json.
- Private production-before/after: verification-c7-01.production-before.private.json / verification-c7-01.production-after.private.json.
- Native logs prefixverification-c7-01 trong logs-private; recovery startup server log riêng.

### Giới hạn và kết luận cuối

AcceptancePASS ở đây là khả năng đọc/khôi phục/kiểm chứng **archive đã pin** trên independent existing recovery DB, không independent proof mọi row production tại đúng pg_dump snapshot. Source-snapshot equality vẫn NOT_VERIFIED do không có exported snapshot/source per-row digest cùng thời điểm dump; không so với source live đang tiếp tục ingest để tự tuyên bố equality.

Index/relationACL semantic checks dùng metadata before/after dump đã chứng minh stable; không tuyên bố cryptographic provenance cho source catalog. Rolepostgres ở recovery cố ý NOLOGIN/non-superuser, không phục hồi authentication topology/production secrets. Không benchmark RTO toàn disaster/bare-machine/key recovery/PITR; backup/recovery cùng ổC vẫn có rủi ro mất cả ổ, CLOUD_BACKUP_SCOPE_NOT_VERIFIED giữ nguyên. Các giới hạn đã nêu không bị xóa bởi kết quả archive restoration PASS.

```text
RECOVERY_IDENTITY_VERIFIED
NATIVE_STARTUP_CAPTURE_PASS
EXISTING_RESTORE_DATA_VERIFICATION_PASS
RESTORE_SCHEMA_PERMISSION_VERIFICATION_PASS
PRODUCTION_DATA_RESTORE_ACCEPTANCE_PASS
RECOVERY_CLUSTER_STOPPED_GRACEFULLY
PRODUCTION_MIGRATION_NOT_PERFORMED
AUTOMATION_ACTIVE=false
VERIFIED_LIVE_NOT_READY
PHYSICAL_PUMP_NOT_TRIGGERED
CLOUD_BACKUP_SCOPE_NOT_VERIFIED
SOURCE_SNAPSHOT_EQUALITY_NOT_VERIFIED
```

**Đã dừng sau Phase13.5C.7. Không restore lại, không migration production hoặc tự chuyển Phase13.5D.**
