# Phase13.5C.6 — Controlled production-data restore rehearsal

### Theo dõi nghiệm thu tiếp nối

**Kết quả tổng hợp cuối23/10/2026: PRODUCTION_DATA_RESTORE_ACCEPTANCE_PASS** sau Phase13.5C.7 verification-only trên database hiện hữu; không restore/provisioning thêm.15bảng/34.205dòng có count/typedSHA256 khớp archive,165columns/38constraints/75indexes/22enums/11migrations và permissions PASS. Native startupcapture sạch lỗi, recovery đã shutdowngraceful; production Commandsfalse/Automationfalse/PENDING0/tổng43. Xem `PHASE13_5C7_RESTORE_VERIFICATION_ONLY.md` mục8 và `report/phase13-5c7-outcome.json`. Source-snapshot equality và cloudscope vẫn NOT_VERIFIED. Error/mismatch C.6 bên dưới được giữ như lịch sử, không sửa thành một phiên cũ PASS.

Snapshot C.6 tại23/10/2026, UTC+7; phiên bắt đầu22/10: controlled resume thực hiện đúng một restore exit0 nhưng acceptance lúc đóPARTIAL do COPY-text timestamp mismatch. Recovery đã shutdowngraceful. Mục10 giữ lịch sử này; **nghiệm thu tiếp nối C.7 đã PASS như cập nhật đầu báo cáo**, không chạy lại restore hoặc overwrite error evidence.

## 1. Approval

Đã đọc đầy đủ attachment `98f24106-6467-4384-8c30-71d067f03f72/Pasted text.txt`, tiêu đề PHASE13.5C.6 — APPROVED CONTROLLED PRODUCTION BACKUP RESTORE REHEARSAL.

Phê duyệt: đúng một independent PG17 instance127.0.0.1:55434, đúng5directory mới, một initdb, một restore vào smart_agriculture_recovery_13_5c_01; local production-data handling/residual cloud risk; role mapping; stop graceful/giữ evidence. **Không reference database/second restore, migration production, app/MQTT target, cleanup hoặc điều khiển bơm.** Không cần xin lại phạm vi đã được duyệt.

Approval reference trong evidence: `PHASE13.5C.6_USER_ATTACHMENT_98f24106`.

## 2. Preflight

- Đã đọc báo cáo C.5 và kế thừa pinned archive C.4. Source smart_agriculture5432/systemID7472695863566132416/PGDATA production xác minh READ ONLY, PENDING0/tổngDeviceCommand43; locale provider hiện hữu `c` (libc).
- Recovery target chưa tồn tại và55434 trống trước launch; test55433 không chạy hoặc bị can thiệp. Production5000PID15264/5432PID7848 vẫn phục vụ.
- Wrapper kiểm PG17 binaries/initdb/pg_ctl/pg_controldata/pg_restore/psql --version, disk≥2GiB, NTFS, operatorSID/no reparse/known sync, đúng hash archive trước provisioning.
- Recovery root ngoài Git/known OneDrive, CLOUD_BACKUP_SCOPE_NOT_VERIFIED; người dùng đã chấp nhận residual risk riêng cho restored data. BitLocker ổC XTS-AES128/ProtectionOn theo bằng chứng Administrator đã cung cấp, không đọc recovery key; không bảo vệ khỏi admin/malware/same-disk failure.

## 3. Code và tests

| File | SHA256 đã kiểm trước launch |
| --- | --- |
| scripts/phase13-5c6-recovery-rehearsal.ps1 | F8FBB4E45F2585788DA0A66C77419F7A4974B0F8A1AFCF5AABE3C4ABBC0DBEA0 |
| backend/scripts/phase13-5c6-restore.cjs | 7A333706E78323A6436488E571B3810765285160D6D5ED0ACF61D9125D49AF5E |
| backend/scripts/phase13-5c6-archive-compare.cjs | EF134BB7473260FEF4DAF68F90F25DB5367A8DB60B983541894C485CB6584DC1 |
| inherited recovery contract | 9C342F43BD4B452106BB4A9708D1F30F71F5258EEA79D5438AD5C78E574C9543 |

Trước launch:36/36 offline tests PASS (28contract+8executor/COPY tests), Node syntax, PowerShell AST/default PLAN_ONLY, compile C# asynchronous stdout/stderr pump. Không DB/native restore trong tests. Final wrapper message/argument quoting thay đổi được chạy lại8/8tests và pin hash mới trước launch; không đổi code sau launch.

Guard contract chặn5432/55433/production/testsystemID, target không rỗng, wrong archive/hash/role/database; referenceDB không được gọi. Executor không đọc .env hoặc production credentials, chỉ explicit recovery URL trong RAM; scrub PG/DATABASE_URL overrides ở native child. Mọi DDL/restore kiểm target identity/registered system/start trước thực hiện. Chỉ source catalog inventory đọc từ report cũ, không dùng source live làm data snapshot.

Source diagnostic READ ONLY lần đầu không chạy do PowerShell/node -e quote error, sau đó sửa cách truyền script qua stdin và query thành công; không có production write từ lỗi quoting.

## 4. Storage/provisioning hiện tại

Launch interactive PowerShell PID3336 lúc `2026-10-22T15:54:54.519Z` (22:54:54UTC+7). Giữ đúng một phiên, không retry.

Đã tạo đúng5directory explicit mới:

1. `%LOCALAPPDATA%\SmartAgriculturePostgresRecovery`
2. `...\phase13-5c-recovery-01`
3. `...\phase13-5c-recovery-01\data`
4. `...\phase13-5c-recovery-01\logs-private`
5. `...\phase13-5c-recovery-01\evidence-private`

Owner operatorSID S-1-5-21-1432835263-483988321-3159128977-1001, protected DACL, chỉ operator và SYSTEM FullControl/OI/CI, không inherited broad ACE. Đã đọc lại/helper nghiệm thu cả5folder sau tạo. Không sửa ACL parent/repository/production. PGDATA internal directories do initdb tạo không phải additional application staging directories; cần kiểm NTFS lại sau initdb trước start/restore.

Marker create-new `evidence-private/initdb.attempt.private.json` đã tồn tại. Một initdb native được bắt đầu, credential mới qua native `initdb -W` prompt không echo, không pwfile/CLI password. stdout/stderr được pump bất đồng bộ vào private logs và console, không thu keyboard input. Dùng native prompt thay vì giả định `--pwfile=-` là stdin; nguồn implementation PostgreSQL17 đọc pwfile bằng fopen, còn -W là interactive ([PostgreSQL source](https://raw.githubusercontent.com/postgres/postgres/REL_17_STABLE/src/bin/initdb/initdb.c)).

Sau initdb, người dùng sẽ nhập lại cùng credential recovery mới qua Read-Host -AsSecureString để chuyển vào Node qua anonymous stdin pipe trong RAM; không plaintext password file, không ghi credential vào report/Git/log. Yêu cầu password≥12ký tự, khác production. Credential không tự được persist ngoài PostgreSQL SCRAM verifier trong PGDATA được bảo vệ; người dùng tự giữ password manager.

Snapshot ban đầu15:55:05Z: initdb stdout439bytes, chưa có provision.private.json hoặc outcome. **Không có initdb exit code, systemID mới hoặc restore exit code để tuyên bố PASS.** Không re-run script nếu user đang ở prompt; nếu lỗi phải STOP, giữ target/evidence.

## 5. Luồng đã chuẩn bị, CHƯA nghiệm thu thực tế

Sau input và initdb exit0:

- Đọc lại5directory NTFS; ghi config chỉ recovery `listen_addresses=127.0.0.1`, port55434, password_encryption scram-sha-256, HBA chỉ recovery DBA từloopback. Không trust/LAN/Windows service/autostart.
- pg_controldata pin systemID khác production và test; save registered-identity private. Start đúng PGDATA, SQL identity exacthost/port/role/db/schema/PG17/systemID/server-start và HBA/config xác nhận.
- Maintenance DB recovery chỉ phục vụ provisioning. Rolepostgres NOLOGIN/NOSUPERUSER/NOCREATEDB/NOCREATEROLE/NOREPLICATION/NOBYPASSRLS; DBA sa_recovery_dba với credential mới. Không replay roleglobals. Probe role không quản trị chỉ NOLOGIN để kiểm effective permissions/SET ROLE READ ONLY, không dùng app runtime.
- Fresh target TEMPLATEtemplate0/UTF8/libc/English_United States.1252, ownerpostgres; actual empty catalog gate trước restore. Database ACL mapPUBLIC CONNECT/TEMP và owner quyền theo private source manifest.
- Attempt marker create-new, đúng một actual pg_restore có explicit recovery target, --exit-on-error/--single-transaction; không --clean/--create/--no-owner/--no-acl, không overwrite/retry.
- Error hoặc unknown outcome giữ evidence; finally disconnect clients và stop recovery đúng registered PGDATA/systemID (không5432/55433), không cleanup.

## 6. Data comparison được triển khai

Không tạo reference DB/restore thứ hai. Sau actual restore exit0, đọc archive bằng `pg_restore --data-only --file=-` **không có host/database/kết nối**, chỉ extract COPY vào RAM; đây không phải second database restore. Không lưu raw archive data hoặc COPY rows ra repo/chat; stdout chứa data không ghi file.

Parse COPY table/column rõ ràng, không chấp nhận format/schema bất ngờ hoặc block thiếu terminator. Target COPY TO STDOUT chạy trong transaction READ ONLY, timezoneUTC/DateStyleISO/intervalstylepostgres/extra_float_digits3. So multiset từng dòng COPY-text: count+SHA256 với sort deterministic và length-framed encoding; giữ duplicate/NULL/escaped newline/tab/Unicode. Chỉ counts/digests private, không raw row values.

Schema: so archive-era inventories before/after stable, restored columns5legacy tables/constraints/indexes/enums/function names và tất cả object names/owners; indexes valid, constraints validated,11Prisma migration rows/checksums/timestamps normalizeUTC, DB properties/normalizedACL, relationACL normalize default thay vì skipNULL. Non-admin probe kiểm effective privileges và SELECT users bị42501 trong READ ONLY transaction.

Giới hạn dự kiến vẫn phải báo trung thực: bản backup không có complete snapshot catalog digest/full column/triggers reference tại dump time. Digest target-vs-archive nếu PASS chứng minh archive rows khớp restore, **không phải bằng chứng độc lập source-snapshot per-row equality**. Không yêu cầu6irrigation ledgers hoặc14FK của synthetic rehearsal xuất hiện. Mọi schema gaps còn lại được phân loại PARTIAL, không giả PASS toàn bộ.

## 7. Trạng thái tạm thời và điểm phối hợp

```text
RECOVERY_CLUSTER_CREATED: NOT_VERIFIED — initdb chưa trả kết quả
RECOVERY_CLUSTER_IDENTITY_NOT_VERIFIED
RECOVERY_STORAGE_NTFS_VERIFIED — five explicit folders at creation
PRODUCTION_DATA_RESTORE_NOT_VERIFIED — chưa có native restore outcome
RESTORE_SCHEMA_DATA_COMPARISON_PARTIAL — execution pending
RECOVERY_CLUSTER_STOPPED_GRACEFULLY: NOT_VERIFIED — cluster chưa start
PRODUCTION_MIGRATION_NOT_PERFORMED
CLOUD_BACKUP_SCOPE_NOT_VERIFIED
AUTOMATION_ACTIVE=false — preflight current serving runtime
VERIFIED_LIVE_NOT_READY
PHYSICAL_PUMP_NOT_TRIGGERED
```

Chờ người dùng hoàn tất credential prompt, sau đó đọc `report/phase13-5c6-outcome.json` và private evidence để cập nhật kết quả thực tế. Không khai PRODUCTION_DATABASE_UNCHANGED theo nghĩa business rows bất biến: ingestion vẫn chạy; chỉ có thể xác nhận không có production writes/migration từ executor, catalogs/process/safety counts không đổi sau đối chiếu.

Không tự resume/reinitdb/restore lại khi lỗi. Không chuyển Phase13.5D hoặc migration production.

## 8. Kết quả sau người dùng hoàn tất input — STOPPED_NO_RETRY

Người dùng xác nhận đã nhập xong. Đọc outcome của chính phiên đã duyệt, không gọi lại initdb hoặc restore.

### Kết quả thực tế

- `initdbExitCode=0`, PG_VERSION17, đúng marker approval. Five explicit directory NTFS được nghiệm thu lại sau initdb: owner/operator, protected DACL và exactoperator+SYSTEM FullControl/no reparse PASS.
- pg_controldata read-only: system identifier mới **7699532241714573532**, khác production7472695863566132416 và test7698826681383327460; cluster state **shut down**.
- Node executor started `2026-10-22T16:37:50.888Z`, dừng `16:37:50.896Z` (23:37:50UTC+7), statusSTOPPED_NO_RETRY, SyntaxError; restoreAttempted=false, restoreExit=null, clusterStarted=false, checks=[] .
- Không có registered-identity private SQL attestation hoặc restore.attempt marker; không target database production-data đã restore. Không listener55434, không start server hoặc pg_restore trong phiên.
- Cluster đang shut down vì **chưa được start**, không phải đã nghiệm thu lệnh graceful stop. Giữ nguyên PGDATA/logs/evidence; không DROP/reset/xóa target.

### Nguyên nhân và sửa offline

`provision.private.json` do Windows PowerShell5 `Set-Content -Encoding UTF8` tạo có BOM EFBBBF. Executor dùng `JSON.parse(fs.readFileSync(...,'utf8'))` không strip BOM tại bước đọc provisioning. Đã tái hiện SyntaxError bằng chính file metadata (không password), còn BOM-safe parser đọc đúng initdbExitCode0. Lỗi có sẵn trong diagnostic executor, không phải lỗi initdb, credential production hoặc firmware.

Đã sửa **offline** `backend/scripts/phase13-5c6-restore.cjs`: dùng parseJson loại một BOM đầu chuỗi cho input/provision/manifest/catalog evidence; không bỏ gate identity/empty-target/approval. Thêm regression BOM/BOM-free và invalidJSONfailclosed;38/38 offline tests PASS (28contract+10executor/COPY tests), không kết nối DB hoặc restore trong tests.

SHA256 executor sau sửa: `9F23B9A46A32956084DFC28B339AAC1CE539C92A883987BE89D7F50F21CC8057`. Hash này **chưa thực thi**. Hash trước launch ở mục3 được giữ như lịch sử phiên thất bại. Không overwrite outcome/error evidence cũ và không re-run executor sau sửa.

### Production sau dừng

Read-only cuối lúc `2026-10-22T16:40:05.406Z` (23:40:05UTC+7):

- Backend PID15264 không đổi; protected live runtime + startup attestation cùng process Commands=false/Automation=false/TestMode=true/cap1s; gatewayDISABLED/controlEnabledfalse.
- Health PostgreSQL/MQTTconnected; production5432/systemID7472695863566132416/server-start2026-10-16 12:13:43.656514+07 không đổi.
- DeviceCommand43, PENDING0; không command mới, không ON/OFF.
- Không khởi động backend thứ hai, không restart broker/PG5432, không migration/schema/credential change hoặc tác động ESP32/bơm.
- Các normal login dùng protected runtime probe có thể ghi LOGIN_SUCCESS như auth hiện hữu. Ingestion tiếp tục ghi telemetry; PRODUCTION_DATABASE_UNCHANGED ở đây chỉ nghĩa không có restore/migration/business-data mutation từ recovery executor và identity/process/safety count không đổi, không có nghĩa mọi production row bất biến.

### Kết luận cập nhật

```text
RECOVERY_CLUSTER_CREATED_PASS
RECOVERY_CLUSTER_IDENTITY_NOT_VERIFIED — independent control ID known, SQL identity not executed
RECOVERY_STORAGE_NTFS_VERIFIED — five approved directories after initdb
PRODUCTION_DATA_RESTORE_NOT_VERIFIED — NOT_PERFORMED; actual restore attempts0
RESTORE_SCHEMA_DATA_COMPARISON_PARTIAL — no restored target to compare
RECOVERY_CLUSTER_STOPPED_GRACEFULLY: NOT_VERIFIED — NEVER_STARTED, current state shut down
PRODUCTION_DATABASE_UNCHANGED — no recovery writes to production; normal ingestion/auth caveat above
PRODUCTION_MIGRATION_NOT_PERFORMED
CLOUD_BACKUP_SCOPE_NOT_VERIFIED
AUTOMATION_ACTIVE=false
VERIFIED_LIVE_NOT_READY
PHYSICAL_PUMP_NOT_TRIGGERED
```

**Dừng theo no-retry.** Cần phê duyệt tiếp tục có kiểm soát sau lỗi executor: sử dụng cluster hiện hữu đã initdb thành công, không tạo lại5directory/initdb/reset, giữ error evidence và một lượt restore còn chưa sử dụng. Phải review một resume path riêng xác minh PGDATA/controlID7699532241714573532/shut-down/không target DB/không restore marker, pin executor hash mới, nhập lại credential recovery cục bộ vì credential trước không được lưu. Không tự chạy lại script provisioning vốn yêu cầu đường dẫn mới hoặc tự vượt existing-path guard. Không yêu cầu mật khẩu qua chat.

## 9. Controlled resume được phê duyệt — đang chờ input cục bộ

Người dùng đã gửi `PHASE13.5C.6 — APPROVED CONTROLLED RESTORE RESUME`, cho phép đúng cluster hiện hữu7699532241714573532, provisioning còn thiếu và một lượt restore chưa dùng; không initdb/reset/tạo lại thư mục, không reference DB hoặc overwrite evidence cũ.

Resume path mới: `scripts/phase13-5c6-resume-existing.ps1`. Không gọi wrapper provisioning cũ, không có initdb.exe, directory create hoặc remove/reset. Đã kiểm lại:

- PG_VERSION17; pg_controldata exact systemID7699532241714573532, state shut down.
- Five recovery directory NTFS vẫn PASS, port55434 chưa có listener, không postmaster.pid/restore marker/registered identity của một restore cũ.
- Offline database storage OIDs chỉ1,4,5 tương ứng initial cluster; không kết luận SQL name từ OID này. Sau start sẽ query pg_database thật và từ chối nếu target database hoặc role đã tồn tại, **trước khi CREATE**.
- Recovery config đã có127.0.0.1:55434/SCRAM/HBA đúng DBAloopback; chỉ xác minh, không rewrite config đã đúng.
- Archive hash pinned không đổi; production baseline PENDING0/tổng43.

Executor có mode resume riêng, exact expected recovery systemID, control(shut-down) trước start, CreateNew đăng ký identity/restore marker. Native logs prefixresume-01; private result/public outcome mới, không ghi đè outcome/logs cũ. Nếu session evidence đã tồn tại thì từ chối và không save đè. Startup/provision/restore vẫn giữ identity/empty-target/SQL/database/mapping safety gates.

Hashes đã pin trước launch:

- resume wrapper: `605598E5B575F123001946FA63C7FD947C7B3473E23CF5E47CF2A7401D99AC9B`.
- executor hiện hành: `DE73D4D423F92FAD6CC3E03EDACF987AE3F32977AEE9F85A66F682FDC693573C`.
- Tests:40/40 PASS offline (28contract+12executor/COPY/BOM/resume guards), AST/default PLAN_ONLY, không initdb/restore trong tests.

Old error evidence hashes trước resume, giữ để đối chiếu sau:

- report/phase13-5c6-outcome.json: `A4AB17DAC3EC7CC885D2C8F8C0CA5C36C0D7CD5C84824732933CDA0A1B19851B`.
- private restore-result.private.json: `59A979723B88D847F90CD776F352E98F69B63FBDBEB01976056BE46467BCB237`.

Đã mở đúng một interactive resume PowerShell PID9296 lúc `2026-10-22T16:55:17.835Z` (23:55:17UTC+7), theo phê duyệt mới. Resume approval reference: `USER_APPROVED_CONTROLLED_RESTORE_RESUME_7699532241714573532`; CreateNew `resume-01.approval.private.json` và production-before-resume-01.private.json. Hiện tại chưa có restore.attempt marker hoặc outcome resume, đang chờ Read-Host -AsSecureString cho credential recovery hiện hữu; không password production/CLI/chat/plaintext file.

Output dự kiến riêng: `report/phase13-5c6-resume-01-outcome.json`, private `restore-result-resume-01.private.json`, logresume-01 trong logs-private. Chỉ sau native exit0 và comparison thực mới cập nhật kết luận restore; nếu lỗi STOP giữ evidence, không retry. Dừng đúng Phase13.5C.6 sau verification/graceful shutdown, không migration/restore thứ hai.

## 10. Controlled resume — kết quả thực tế, PARTIAL, đã dừng

Người dùng xác nhận đã nhập credential recovery cục bộ. Chỉ đọc kết quả phiên resume, không gọi lại executor/initdb/restore.

### Identity, provisioning và actual restore

- Resume started `2026-10-22T16:58:32.268Z` (23:58:32UTC+7), ended16:59:11.343Z (23:59:11UTC+7).
- SQL identity verified: PostgreSQL17.2/version170002, sa_recovery_dba,127.0.0.1:55434/public, database smart_agriculture_recovery_13_5c_01, PGDATA exact, systemID7699532241714573532, inRecovery=false. Khác production5432/test55433.
- Role/database fresh-name check PASS trước CREATE; postgres NOLOGIN/không superuser được tạo đúng mapping, không replay globals hoặc dùng production credential.
- Actual empty-target PASS: userRelations0/userRoutines0/userTypes0/nonDefaultExtensions0/userSchemas=[public] trước restore. Locale/encoding/database owner/ACL theo phương án đã review.
- Native **pg_restore thực sự exit0**, elapsed1217ms (operation log1214ms), stdout/stderr0bytes; --exit-on-error và --single-transaction, không --clean/--create/--no-owner/--no-acl.
- Đúng một actual restore operation và một create-new restore marker. Không initdb lại, không optional reference DB/second restore. Archive data extraction --data-only/--file=- chỉ đọc archive không kết nối DB.

### Schema/ownership/ACL đã kiểm chứng

12checks PASS trước khi comparator dừng:

1. Loopback/SCRAM/port config thật.
2. Fresh role/database names trước provisioning.
3. Columns5legacy tables khớp archive-era stable inventories.
4. Constraints khớp archive-era inventories.
5. Indexes khớp archive-era inventories.
6. Enums khớp archive-era inventories.
7. Function names khớp archive-era inventories.
8. Tất cả public relation names/owners khớp, ownerpostgres.
9. Indexes valid và constraints validated.
10.11Prisma migration rows/checksums/timestamps normalizedUTC khớp backup manifest.
11. Database properties và normalized database ACL mapping khớp.
12. Relation ACL normalized/default semantics khớp; không skip NULL ACL.

**Chưa hoàn tất** full-table data digests, non-admin effective-permission/actual SELECT probe (nằm sau data loop), full-column/triggers reference comparison. Không nâng12checks thành full restore acceptance PASS.

### Comparator mismatch — chẩn đoán và bản sửa OFFLINE

Outcome STOPPED_NO_RETRY: `ARCHIVE_TARGET_COPY_DATA_MISMATCH`, ngay bảng `_prisma_migrations`;0table digest hoàn tất. Target COPY dùngUTC, còn archive có timestampoffset+07. Read-only extraction của chính archive xác nhận11migration COPY rows, offset+07; finished_at instants normalizedUTC khớp private backup manifest. Check migration SQL trước đó cũng đã PASS normalizedUTC. Đây là bằng chứng comparator raw-text không xử lý khác biểu diễn timezone; **không phải bằng chứng tất cả data đã hỏng hoặc đã khớp**. Các khác biệt khác chưa được loại trừ cho tới khi typed comparison hoàn tất.

Đã sửa code **offline**, không start recovery hoặc chạy lại data verifier:

- Comparator nhận timestampColumns từ pg_catalog type timestamptz, chỉ chuẩn hóa đúng cột typed; không sửa text có nội dung giống ngày giờ.
- Chuẩn hóa timezone về cùng instant nhưng giữ tối đa6fractional digits, không mất microseconds qua JavaScriptDate; preserve NULL/infinity/duplicate rows. Input format không hỗ trợ phải failclosed.
- Executor lấy typed column metadata từ target khi dùng comparator tương lai; raw rows không in/lưu repo.
-44/44 tests offline PASS, gồm typed+07/UTC equality, khác microsecond vẫn fail, plain-text timestamp không được tự normalize, NULL/infinity/invalid format và BOM/resume guards.

Hashes sau sửa, **chưa được thực thi trên target thật**:

- executor: `43F99C73AAE242E635A5CCDF2A02731409765FD4C8CA4848175365A0BDA64B4F`.
- archive comparator: `4E1E4E2A0A781D7484AEBF7DA22FF39DC639F78B90731325C650FBFCC9D3D212`.

### Lỗi diagnostic native phát hiện thêm

Operation start ghi pg_ctl exit0 nhưng spawnSync.error=ETIMEDOUT/elapsed35011ms. Executor cũ chỉ kiểm status0, nên đã tiếp tục thay vì failclosed khi native capture có error. Đây là **lỗi gate thực sự của executor**; không được coi operation đó sạch lỗi. Recovery server thực tế đã start và SQL identity/config gates sau đó PASS, nhưng các check sau không xóa được hạn chế của native-start capture.

Khả năng liên quan pipe handle/process inheritance trên Windows chưa được chứng minh đầy đủ. Đã bổ sung assertNativeResult để từ chối native.error ngay cả khi status0, với regression test PASS; **chưa nghiệm thu lại native startup capture**. Một verification-only runner tương lai cần cơ chế start/capture không giữ inherited pipe và review riêng; không dùng lại executor restore để thử. Không retry start/restore trong lượt này.

### Shutdown và evidence preservation

- Native pg_ctl stop đúng recovery PGDATA/systemID exit0, elapsed1452ms, no timeout; clients disconnect trước stop.
- pg_controldata sau cùng:7699532241714573532, shut down; không listener55434/55433. Recovery PGDATA/database/logs/evidence được giữ, không cleanup.
-24private log/evidence files đã đọc lại metadata: owneroperator, chỉoperator+SYSTEM AllowFullControl, no reparse;5approved directory protectedDACL vẫn PASS. Không đổi ACL production/parent.
- Error evidence của phiên BOM ban đầu vẫn nguyên SHA256 A4AB17...B19851B (public outcome) và59A979...BCB237 (private result), đối chiếu full hashes ở mục9. Không overwrite lịch sử.
- Resume outcome riêng: `report/phase13-5c6-resume-01-outcome.json`; private `restore-result-resume-01.private.json`; registered identity/restore marker và native logs có prefixresume-01.

### Production safety sau resume

Read-only kiểm tra cuối23/10/2026 lúc00:01:51UTC+7 (`2026-10-22T17:01:51.001Z`):

- Backend cùngPID15264, DB/MQTTconnected; Commands=false/Automation=false/TestMode=true/cap1s; gatewayDISABLED/controlEnabled=false qua protected API cùng process.
- DeviceCommand43/PENDING0; production5432/systemID7472695863566132416/server-start2026-10-16 12:13:43.656514+07 không đổi.
- Không migration/DDL/restore production, không restart production services, không app kết nối recovery, không ON/OFF/ESP32/pump power.
- PRODUCTION_DATABASE_UNCHANGED nghĩa không recovery mutation/catalog migration/command tăng trên production; normal ingestion và auth login activity vẫn tiếp tục theo runtime hiện hữu, không tuyên bố mọi row production bất biến.

### Kết luận trung thực

```text
RECOVERY_CLUSTER_CREATED_PASS
RECOVERY_CLUSTER_IDENTITY_VERIFIED
RECOVERY_STORAGE_NTFS_VERIFIED
PRODUCTION_DATA_RESTORE_NOT_VERIFIED — native restore exit0, full acceptance incomplete
RESTORE_SCHEMA_DATA_COMPARISON_PARTIAL
RECOVERY_CLUSTER_STOPPED_GRACEFULLY
PRODUCTION_DATABASE_UNCHANGED — normal ingestion/auth caveat above
PRODUCTION_MIGRATION_NOT_PERFORMED
CLOUD_BACKUP_SCOPE_NOT_VERIFIED
AUTOMATION_ACTIVE=false
VERIFIED_LIVE_NOT_READY
PHYSICAL_PUMP_NOT_TRIGGERED
```

**Lượt actual restore đã dùng1/1. Không được restore lại.** Muốn hoàn tất nghiệm thu cần phê duyệt một phiên **verification-only** trên database đã restore: input recovery credential cục bộ, pin identity/new runner hash, start riêng instance cũ, chỉ READ ONLY typed comparisons/permission checks, giữ evidence riêng, stop graceful; không CREATE database/role, không initdb, không pg_restore-to-database hoặc destructive reset. Hiện đã STOP, chưa thực hiện phiên này. Không chuyển Phase13.5D hoặc migration production.
