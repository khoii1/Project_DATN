# Phase 13.5D.1G-R2.3B — Real initdb executor integration & offline acceptance

28/10/2026, UTC+7. **PHASE13_5D1G_R2_3B_REAL_INITDB_EXECUTOR_OFFLINE_READY** cho candidate core, policy và approval package. Đây không phải nghiệm thu initdb thật hoặc quyền mở khóa thực thi. Current launcher chỉ chạy synthetic; `executeInitdb()` tiếp tục từ chối vô điều kiện. Không sử dụng approval R2.3 làm execution token.

## PART A — BASELINE & SOURCE INTEGRITY

Đã review source R23 native/executor/host/observer, toàn bộ source R23A, reports R23/R23A và source PostgreSQL đúng tag REL_17_2. Không sửa hoặc gọi live executor R23 đã FAIL. Thêm candidate R23B độc lập; chỉ tái sử dụng primitive quan sát native đã pin của R22.

Read-only baseline và final checks:

- Root đúng `C:\DATN\test-instances\phase13-5d1g`; canonical/reparse checks PASS.
- Owner/operator SID `S-1-5-21-1432835263-483988321-3159128977-1001`; protected DACL, đúng operator/SYSTEM FullControl, không thay ACL.
- Đúng10 evidence files lịch sử, cùng byte counts/hashes; PGDATA/PG_VERSION chưa tồn tại; initdb process0; listener55435=0.
- R23 source và R23A source vẫn đúng hashes của `source-integrity-1793120119550.json`; không đổi failure reports/outcomes, không sửa marker R1.
- Hai fixture8580/7376 đã có abnormal native exit238 ở R23A; không terminate lại theo PID lịch sử. Final census xác nhận không matching identity.

Manifest đầy đủ10files nằm trong approval package và final-verification artifact bên dưới. Hai hash quan trọng vẫn:

```text
43814FB64198DD08F660E6D6EE8EA762B807D81B36A5DA4AE4AF5DA9083DD22C  initdb-attempt.json
03D63D6F5396E3BDC64CEAC84263568B013BAC7758E7869451B8A94B4AB11138  resume-r1-outcome.json
```

Không tạo marker initdb mới tại root, không tạo PGDATA và không kết nối PostgreSQL5432/55433/55434/55435. Chỉ gọi actual binary với `--help` và `--version`, cả hai native exit0/no signal/no stderr, version17.2 và hash đúng pin.

## PART B — R2.3A PHASED GATE INTEGRATION

Candidate gồm native C# supervisor/observer/fixture và Node coordinator. Console fixture là private hidden console, không nhận password. Visible operator console là yêu cầu của real specification; không mở real password session trong phase này.

Pre-resume:

1. Actual host console phải chỉ host.
2. Root native handle/PID/FILETIME/path/hash/owner/parent phải đúng. Root còn suspended theo OS thread state, không chỉ theo biến `resumed=false`.
3. Job có đúng root, limit flags0; observer có independent matching root handle, nonce, PID/FILETIME và executable identity riêng.
4. Không đòi suspended child đã xuất hiện trong console list. Unknown member, identity mismatch, observer exit hoặc Job drift đều từ chối.

Post-resume:

- Quan sát bounded attach; ghi interval thực tế. Budget synthetic700ms; proposed real observation budget2000ms là điểm chuyển UNKNOWN/manual, **không phải cam kết initdb sẽ attach đúng hạn**.
- Console phải có host và chỉ các process thuộc verified Job/ancestry policy. Root đã attach mà còn sống thì không được tự biến mất khỏi console.
- Không yêu cầu lifetime luôn có hai members; re-exec/backend hợp lệ có thể làm console nhiều hơn hai members. Không yêu cầu mọi descendant phải attach console nếu policy không bắt buộc.
- Resumed=true đồng nghĩa `sideEffectsPossible=true`. Negative post-resume test có file side-effect **synthetic trong run directory**, chứng minh không được gắn nhãn pre-side-effect safety sau resume. Không ghi side-effect giả vào target PGDATA.
- Success phải có terminal consensus giữa host và observer: native PID/FILETIME/exit code/exit timestamp khớp, policy accepted, JobActive0, không host loss. Wrapper exit0 không thay native result.

## PART C — POSTGRESQL-SPECIFIC PROCESS REVIEW

Đúng source17.2: Windows `get_restricted_token()` có thể re-execute cùng command line bằng restricted token, đặt `PG_RESTRICT_EXEC=1`, đợi child và truyền lại exit code. Nó được gọi trước `setup_pgdata()`. Không suy root PID là process duy nhất sẽ thực hiện initialization. [Restricted-token source](https://github.com/postgres/postgres/blob/REL_17_2/src/common/restricted_token.c).

Initdb gọi backend cho kiểm tra cấu hình, bootstrap `--boot` và standalone `--single`. Các command pipe dùng `popen_check`; password SQL đi qua stream nội bộ, không phải dữ liệu monitor được phép ghi lại. Contract `--pwprompt` yêu cầu hai lượt nhập trực tiếp, không echo. Không đọc pipe, raw command line, màn hình hoặc environment của real child. [Initdb source REL_17_2](https://github.com/postgres/postgres/blob/REL_17_2/src/bin/initdb/initdb.c).

Microsoft mô tả `_popen` chạy command processor. Vì thế candidate chuẩn bị cả profile command processor, nhưng không khẳng định packaged binary đã được quan sát có một topology cố định. [Microsoft CRT popen](https://learn.microsoft.com/en-us/cpp/c-runtime-library/reference/popen-wpopen).

Real profiles được chuẩn bị với exact path/hash, không dựa vào tên process:

| Role | Parent hợp lệ | Depth | Điều kiện bổ sung |
| --- | --- | --- | --- |
| Root initdb | supervisor tạo và giữ handle | 0 | exact pinned initdb17.2 |
| Restricted re-exec | root | 1 | cùng pinned initdb; actual restricted-token evidence phải true |
| Command processor | root hoặc restricted re-exec | 1 hoặc2 | exact System32 cmd.exe/hash |
| Backend trực tiếp | root hoặc restricted re-exec | 1 hoặc2 | exact PostgreSQL17 postgres.exe/hash |
| Backend qua shell | shell tương ứng | 2 hoặc3 | exact postgres.exe/hash |

Mọi role còn cần operator SID, native parent graph, Job membership, FILETIME hợp lệ, exact depth và bounded counts. `restricted=false` trong rule nghĩa là không yêu cầu flag, không phải assertion token không restricted. Unknown binary, wrapper hoặc missing parent proof bị chặn; không whitelist thêm theo tên để “cho qua”.

Restricted-token test là **mô phỏng cấu trúc re-exec**, không gọi CreateRestrictedToken và không biến native flagfalse thành true. Khả năng đọc metadata của real restricted child, actual CRT topology và live compatibility vẫn NOT_VERIFIED.

## PART D — NATIVE PROCESS / JOB / CONSOLE POLICY

Native monitor lấy:

- Held process handles, PID và creation FILETIME; QueryFullProcessImageNameW và SHA256.
- Parent PID từ NtQueryInformationProcess/ProcessBasicInformation; TokenUser SID và IsTokenRestricted.
- Actual Job PID list và IsProcessInJob; timestamps phải phù hợp với known parent đã được giữ handle.
- Active process bound8, depth3, lifetime recorded-process bound64. Giữ handles của parent đã exit để không tự liên kết PID tái sử dụng với parent khác.

Job flags phải0 khi tạo, pre-resume, từng sample và terminal. Không đặt kill-on-close/breakaway. Partial/truncated Job PID list hoặc không đọc được metadata làm UNKNOWN/BLOCKED, không coi đó là danh sách đầy đủ. Default child Job association và nested Job semantics được đối chiếu với [Microsoft Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects), [Job process ID list](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-jobobject_basic_process_id_list).

Generic rule schema được dùng trong native tracker; fixture profiles bind exact compiled synthetic binaries, real profile proposal bind exact initdb/cmd/postgres binaries. Profile không được phép tự nâng executable giả lập thành evidence live.

Failure policy:

- Trước resume: không resume real child để cleanup. Giữ handle/state/evidence, manual disposition.
- Sau resume: side effects có thể đã xảy ra; không tự retry, không delete partial PGDATA, không force-kill real initdb.
- Trong **OFFLINE_ONLY** tests, chỉ fixture/foreign fixture của chính run được abnormal disposition sau revalidation path/hash/owner/FILETIME qua held handle; exit238 được ghi `ABNORMAL_FIXTURE_DISPOSITION`, graceful=false.
- Supervisor loss được observer ghi UNKNOWN, dù sau đó fixture cleanup tạo terminal exit238. Observer loss cũng BLOCKED; không giả independent terminal evidence vẫn có.
- Global synthetic previous-attempt guard từ chối thiếu terminal/census. Hai probe sớm có native exits xác định nhưng schema chưa có census được đối chiếu read-only trong `legacy-native-census.json`, liên kết SHA256 result gốc. Không overwrite probe results và không coi file này là approval.

## PART E — EXTERNAL SYNTHETIC TESTS

**26/26 PASS**, gồm25 subtests/một parent; đủ17 actual external scenarios, mới hoàn toàn, không PostgreSQL initialization. Final summary: `build/phase13-5d1g-r23b/tests-1793160562671.json`.

| Case | Final operation outcome | Native root |
| --- | --- | --- |
| Success | OFFLINE_SYNTHETIC_PASS | exit0 |
| Nonzero | BLOCKED/NATIVE_NONZERO | exit7 |
| Re-exec simulation | PASS, hai verified Job processes | exit0 |
| Additional descendant | PASS, root→reexec→backend, ba verified processes | exit0 |
| Wrong descendant identity/path | BLOCKED | exit238 abnormal |
| Child/member ngoài Job | BLOCKED, actual inJob=false | exit238 abnormal |
| Unexpected console binary | BLOCKED | exit238 abnormal |
| Missing/lost root console membership | BLOCKED | exit238 abnormal |
| Early root exit trước observer ready | BLOCKED, không dùng exit0 làm success | exit0 |
| Wrong requested PID/FILETIME/hash | BLOCKED trước resume, ba cases | exit238 abnormal |
| Observer loss | BLOCKED trước resume | exit238 abnormal |
| Supervisor loss | UNKNOWN_NATIVE_OUTCOME giữ nguyên | exit238 abnormal sau cleanup |
| Pre-resume gate error | BLOCKED, resumed=false | exit238 abnormal |
| Post-resume gate error | BLOCKED, sideEffectsPossible=true | exit238 abnormal |
| Unknown/timeout simulation | UNKNOWN giữ nguyên, không retry | exit238 abnormal sau cleanup |

Các test khác: exact PLAN_ONLY/password boundary, real launch denied, real role rules, duplicate marker refusal, hash/run drift, missing observer/native error fail-closed, previous-native-outcome guard, root/ACL/evidence preservation.

Secret boundary test đặt **public synthetic canary** trong environment của test process. Child environments được đóng và fixture từ chối nếu nhận PGPASSWORD/DATABASE_URL. Canary không xuất hiện trong JSON/logs. Không nhập hay lưu password thật; không biến kết quả này thành real password-input acceptance.

### Failure evidence được giữ

1. Lượt đầu14/17 PASS,3FAIL: missing-child negative tìm ra bug khi root từng attach rồi FreeConsole; monitor chỉ chặn member lạ nên trả PASS sai. Đã sửa yêu cầu root còn sống phải tiếp tục thuộc console. Không đổi assertion sang cho phép PASS; test vẫn bắt buộc BLOCKED, với snapshot xác định missing/lost stage. Partial-case count cũng FAIL để không tuyên bố đủ17cases.
2. Lượt sau26/26 PASS; tiếp đó previous-attempt guard mới phát hiện hai probe cũ thiếu trường census. Lượt bị chặn4/10 PASS,6FAIL trước external case mới. Đã làm fresh native read-only reconciliation, pin source result hashes, giữ result gốc; không nới guard thành bỏ qua unresolved process.
3. Final26/26 PASS với guard đầy đủ, partial Job checks, terminal consensus và native census. Không xóa các summaries/logs FAIL hoặc thay lịch sử R23 11/14.

Các artifacts liên quan: `tests-1793159960617.json`, `sequential-outcomes-1793160301539.json`, `legacy-native-census.json`, và final logs bên dưới.

## PART F — REGRESSION & PROCESS CENSUS

Chạy **tuần tự**, không chạy process suites song song:

| Suite | Kết quả | Native runner |
| --- | --- | --- |
| R23B final | 26/26,71625.9476ms | exit0, signal=null |
| R23A | 22/22,85036.1016ms | exit0, signal=null |
| R2.2 | 40/40,80189.4796ms | exit0, signal=null |
| R2.1 | 23/23,80415.5563ms | exit0, signal=null |
| R1/mapping/transport/collectors | 211/211,3267.8422ms | exit0, signal=null |

**Final acceptance322/322 PASS**; không cộng các lượt chạy lặp. Outcomes và TAP logs: `build/phase13-5d1g-r23b/sequential-outcomes-1793160491021.json` và các `*-1793160491021.log`.

Final verification: `build/phase13-5d1g-r23b/final-verification-1793160952663.json`:

- Native read-only census exit0, error=null, signal=null; **162 cặp PID/FILETIME, matchingRemaining0**, gồm B root/descendants/host/observer/sidecars và hai historical fixtures.
- OS path census không thấy readable fixture/synthetic-child/supervisor thuộc namespace thử nghiệm còn chạy. Các suite regression còn có census riêng cho identities của chúng.
- Native exits và JobActive0 được kiểm trước khi chuyển case; operation UNKNOWN không bị đổi thành PASS sau fixture disposition.
- Root10files/hashes/DACL vẫn như baseline; PGDATA absent, initdb process0, listener55435=0. Không sửa/xóa historical evidence và không chạy SQL R1.

## PART G — SOURCE HASHES

Thêm6 code/test files và báo cáo này. Không sửa R23/R23A, firmware, main Prisma schema, backend startup hoặc configuration.

| File dưới `scripts/` | Final SHA256 |
| --- | --- |
| phase13-5d1g-r23b-native.cs | 21AC661DBE674E58B936A6CC1E70C9F889B0954F934EFE33346EC82A60F585E0 |
| phase13-5d1g-r23b-runtime.cs | 18C3783713AB7E439CED0B1AB0576FC0DCA14DE43DDE8B4C8EA810335A2ED360 |
| phase13-5d1g-r23b-fixture.cs | FA2F273D4843BED2921AF22D962B93FB91BD401A0272C0BC525838DBA88224AE |
| phase13-5d1g-r23b-policy.cjs | 6B3B25A48702E2FCBE04C78759B3E77A469D13FBBAA025A19BCA7EC466DED258 |
| phase13-5d1g-r23b-executor.cjs | 5EE4950D894C56E5F86DFEFD423A49818E2012F0C4112CC6A5CC92D58D02F5C5 |
| phase13-5d1g-r23b-executor.test.cjs | 1B1BE816D274AA354C340CA2AC10752665E0F49AFB901DD186A3256F92D7E8F4 |

Reused R22 observation primitive: `C0D530F558ABB6BF251AF5E46558A1621F948D7D8D467F7FC8D6B0E98E614F50`. Exact compile hashes của từng native exe nằm trong manifest riêng của mỗi run. Final source hashes được kiểm lại sau toàn bộ tests; không thay source đã pin để chạy attempt thật trong phase này.

## PART H — REAL INITDB EXECUTION APPROVAL PACKAGE

Hồ sơ riêng: `build/phase13-5d1g-r23b/execution-approval-package-1793160580013.json`, chuẩn bị lúc `2026-10-28T04:09:40.012Z` (11:09:40 UTC+7). Hồ sơ có source hashes, original10evidence hashes/byte counts, root/ACL snapshot, binary help/version native results, rule profiles và closed-environment proposal.

Exact binary pins:

```text
94FDD98979F268FE58198EFC02BB7C765D11E1EB827FAD0CA13B2DC1FA379BFC  PostgreSQL17.2 initdb.exe
94A8EA85CFFD4A15C21290CA555A06438D3F7621B001BEA6B1373C210D5A1746  same-install postgres.exe
15CD209C995B7D3009C91CA40892D5B8F1FB162F3E5F10716642EA278E8E0D7B  C:\Windows\System32\cmd.exe
```

Fields hiện tại: `executionEnabled=false`, `futureExecutionApproval=null`, `historicalApprovalToken=null`, `operatorVisibleConfirmation=null`, password input NOT_VERIFIED. Offline preparation approval hash chỉ truy nguyên R23B, không cấp quyền initdb.

Phiên tương lai cần:

1. Phê duyệt **mới**, đúng một lần initdb, không SQL R1/server startup. Không tự tái sử dụng R23 approval.
2. Review/pin unlock/integration diff và final source hashes trước khi chạy; current public launcher vẫn chỉ có synthetic paths, real API luôn deny. Không tuyên bố chỉ sửa một flag là đủ hoặc current bytes đã được phép chạy thật.
3. Fresh exact root canonical/owner/protected DACL/reparse và whitelist10files/hash, PGDATA absent, port55435 free, không pending native/attempt outcome. Snapshots hiện tại không thay fresh precheck.
4. Private visible operator console: xác nhận nhìn thấy/ready/no recording trước launch, không stdin pipe/injection/clipboard/transcript. Người dùng nhập password test mới hai lần trực tiếp; không gửi chat, argv, environment hoặc plaintext file.
5. Exact args: `-D C:\DATN\test-instances\phase13-5d1g\data -U d1g_dba --pwprompt --auth-host=scram-sha-256 --auth-local=scram-sha-256 --encoding=UTF8 --locale=C --no-clean`. Cwd exact existing root;55435 không phải initdb argument.
6. Một create-new marker `initdb-attempt-r23b-<newRunId>.json` tại root, sau fresh gates. Không tạo marker này trong offline phase. Pin binaries, schema/profile hashes, closed outer environment; không truyền DATABASE_URL/PGPASSWORD hoặc đặt PG_RESTRICT_EXEC để bỏ cơ chế của PostgreSQL.
7. Held native root handle, actual suspended state và independent observer trước resume; dynamic descendant/console policy như trên. Resume có thể bắt đầu PGDATA side effects trước post gate, phải được chấp nhận rõ trong execution plan.
8. Proposed deadline120s monotonic; không input/force-kill/retry để giải quyết timeout. UNKNOWN/manual, bảo toàn partial PGDATA và evidence. Không tự mở rộng whitelist nếu thấy wrapper khác.
9. Exit0 cần terminal consensus, no unresolved descendants/JobActive0, PG_VERSION17, required files và read-only pg_controldata systemID mới khác production7472695863566132416/test7698826681383327460/recovery7699532241714573532. Không start server hoặc mở SQL connection chỉ vì initdb PASS.

## PART I — REMAINING RISKS

- **Real launch adapter/visible operator integration vẫn bị khóa**, current runtime chỉ chạy external synthetic executables. Candidate core/profile/schema đã nghiệm thu offline, không tuyên bố current executable có live mode sẵn để dùng ngay hoặc unlock diff không cần review.
- Actual PostgreSQL restricted token, command processor/build-toolchain topology, actual password prompt/cancellation và startup compatibility chưa được chạy. Exact hash/profile rejection có thể làm phiên thật BLOCKED; không bảo đảm mọi legitimate short-lived descendant sẽ được thu thập kịp.
- Nếu parent biến mất trước khi monitor giữ được native identity, không dựng graph theo PID/name lịch sử; giữ UNKNOWN. Snapshot races/partial Job queries không được diễn giải thành complete proof.
- Native parent/Job/owner/hash checks giả định host/operator và source/binaries tin cậy. Không chống mọi same-user injection, arbitrary privileged tampering hoặc TOCTOU. Không đọc remote command line/pipe/password để đổi lấy lời khẳng định rộng hơn.
- Native sampling bounds là acceptance policy, không phải giới hạn thời gian an toàn vật lý hoặc bằng chứng pre-side-effect safety. Synthetic abnormal cleanup không bao giờ trở thành real initdb timeout behavior.
- Không thực hiện production health/flags preflight, không backend recovery, không chứng minh runtime production từ file cấu hình. Không dùng fixtures để nâng VERIFIED_LIVE/automation trust.

## PART J — FINAL VERDICT

```text
PHASE13_5D1G_R2_3B_REAL_INITDB_EXECUTOR_OFFLINE_READY
SECOND_INITDB_ATTEMPT_NOT_PERFORMED
REAL_INITDB_PASSWORD_INPUT_NOT_VERIFIED
SQL_R1_NOT_EXECUTED
LIVE_PRODUCTION_PREFLIGHT_NOT_PERFORMED
BACKEND_RECOVERY_NOT_PERFORMED
PRODUCTION_MIGRATION_NOT_PERFORMED
PHYSICAL_PUMP_NOT_TRIGGERED
```

Offline acceptance322/322 PASS; final matching process census0; source/history integrity PASS. Không initdb với PGDATA, không PostgreSQL startup/connect, backup/restore, backend/MQTT start/restart hoặc phần cứng. Không commit/push. Dừng tại R23B và approval package; không tự chuyển sang thực thi thật.
