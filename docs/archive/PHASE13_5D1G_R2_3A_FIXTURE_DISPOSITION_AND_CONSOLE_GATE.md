# Phase 13.5D.1G-R2.3A — Fixture disposition & console gate hardening

**PHASE13_5D1G_R2_3A_FIXTURE_AND_CONSOLE_READY**, giới hạn **offline synthetic-only**. Hai fixture cũ đã được xử lý bằng identity-bound abnormal termination; không còn matching fixture hoặc native outcome chưa xử lý trong census cuối. Không chạy initdb thật và không mở quyền chạy initdb từ executor mới.

Ngày: 27/10/2026, UTC+7. Phê duyệt: attachment `d2cf30f0-054e-4ef6-8f87-e9db517c1da7/Pasted text.txt`. Không bao gồm PostgreSQL startup, SQL integration hoặc production startup.

## PART A — HISTORICAL R2.3 FAILURE

R2.3 giữ nguyên **11/14 PASS**, `FINAL_CONSOLE_MEMBERS_REFUSED`, không real initdb attempt và không marker R2.3 tại root. Hai child được CreateProcessW suspended nhưng host thoát khi gate từ chối; observer sau đó timeout với JobActive=1. Không sửa các outcome UNKNOWN cũ thành PASS.

Đã đọc source R23 native/executor/host/observer/tests. Thêm bộ R23A độc lập thay vì ghi đè source/evidence của R23. Các source R23 gốc trước/sau đều cùng SHA256; root vẫn đúng 10 evidence files lịch sử. R1 vẫn là initdb failure exit1, không tái thực thi wrapper R1.

## PART B — FRESH FIXTURE PROCESS IDENTITY

Inspection read-only được thực hiện **trước mọi external test mới** bằng held native process handle, OS token, CIM parent metadata và thread state:

| Thuộc tính | Fixture A | Fixture B |
| --- | --- | --- |
| Run | r23-1793118266854-70cd449e | r23-1793118269698-1d1437b5 |
| PID | 8580 | 7376 |
| Creation FILETIME | 134375918683355399 | 134375918710140004 |
| Executable | run directory tương ứng / fixture.exe | run directory tương ứng / fixture.exe |
| SHA256 | 07F002E788F2DEAFCAAF4DF74E93E6F56EC02CFCF5A626A8A843DB2A7F724F40 | 16EACEFE35DA401ED60C9308953A2C8F23EE75C5A9B4D23DDE914C5CE94E135C |
| Owner SID | S-1-5-21-1432835263-483988321-3159128977-1001 | cùng operator SID |
| Parent PID theo OS | 7240 | 16612 |
| Native state trước disposition | active, chưa có exit | active, chưa có exit |
| Threads | một thread12724: Wait/Suspended | một thread3404: Wait/Suspended |
| Job | named job không còn query được | named job không còn query được |

Manifest gốc xác nhận TEST, exact run directory và fixture source hash `6833147CF784F8FFF247B88FF4D48FF3CE70B4461C9DCEA3B909FCB511351F87`. Manifest gốc **không có trường binary hash riêng**; binary hash được pin trong `identity.json` gốc. Đã đối chiếu cả manifest source/run context, identity record và SHA256 file executable hiện tại; không tuyên bố manifest có trường mà thực tế không có.

Named job không query được không bị diễn giải thành Active=0. Host/observer cũ đã có exit/timeout history; không tác động PID parent/observer. Chỉ hai process có exact identity nêu trên được phép disposition. Không dùng PID đơn lẻ, không đụng process trùng PID nhưng khác FILETIME.

## PART C — MANUAL DISPOSITION OUTCOMES

Native helper mở process handle có QUERY/SYNCHRONIZE/TERMINATE, rồi kiểm lại **trên chính handle đó**: creation FILETIME, image path, operator token SID, file hash, trạng thái active và namespace fixture được cho phép. Không có TerminateJobObject, taskkill hoặc production executable fallback.

| Fixture | Phân loại | Native exit quan sát được | Exit timestamp UTC | Graceful |
| --- | --- | --- | --- | --- |
| A8580 | ABNORMAL_FIXTURE_DISPOSITION | 238 | 2026-10-27T16:40:35.0852354Z | false |
| B7376 | ABNORMAL_FIXTURE_DISPOSITION | 238 | 2026-10-27T16:40:35.2104004Z | false |

Các exit được đọc từ held native handles sau wait; không suy từ việc PID biến mất. Thời gian địa phương là 23:40:35 UTC+7. Original outcome hashes giữ nguyên:

```text
6FDC76839E90E66018906DEF2406272E57AE436930444CDDD6C2C9FCA81631AE  Fixture A outcome.json
8943BC2B19D48413C1BF5E15A08769D7696864142B9EB115C244E4EC57267BE0  Fixture B outcome.json
```

Evidence mới, không overwrite:

`build/phase13-5d1g-r23a/disposition-1793119234535-0cca9aa9/`

Mỗi fixture có inspection, disposition-attempt và disposition-result. Helper này chỉ dành cho synthetic fixture trong namespace R23/R23A, không phải cleanup policy của initdb thật. Không gọi abnormal termination là graceful success.

## PART D — CONSOLE MEMBERSHIP ROOT CAUSE

Trước khi đổi gate, chạy diagnostic mới với guard R23 nguyên nghĩa và thêm metadata tại đúng vị trí từ chối:

`build/phase13-5d1g-r23a/r23a-1793119456562-567b2bbc/`

| Stage | Actual members | Child | Observer |
| --- | --- | --- | --- |
| Sau CreateProcessW suspended | [19780] (host) | PID18120, FILETIME134375930579983775; chưa resume | chưa start |
| Sau observer-ready, ngay trước gate | [19780] | vẫn suspended, chưa resume | PID5728, console members riêng [5728] |
| Legacy gate expected | [19780,18120] | yêu cầu child đã attach | observer đã sẵn sàng nhưng ở console khác |

**Nguyên nhân đã chứng minh trong môi trường synthetic này:** gate kiểm tra child membership quá sớm. CreateProcessW trả native identity/handle cho suspended child nhưng child chưa xuất hiện trong GetConsoleProcessList. Observer-ready chứng minh observer có handle, không chứng minh child đã attach console.

Diagnostic giữ BLOCKED, không resume để thu thập thêm evidence; fixture này được disposition bất thường, native exit238, JobActive=0 và census không còn matching process. Không sửa evidence của lượt R23 cũ để thêm membership suy đoán.

Một probe sau hardening (`r23a-1793119563454-e911feb5`) quan sát pre-resume host-only, rồi post-resume đúng host+child; khoảng chưa chứng minh console membership là42ms. Lượt acceptance cuối quan sát37ms và38ms ở hai case success/nonzero. Các khoảng này được đo cho fixture, **không phải bảo đảm cho initdb thật**.

Start-Process observer trong diagnostic gốc tạo console riêng; không có bằng chứng nó là nguyên nhân lỗi R23. Negative test sau đó cố ý cho observer attach console host để chứng minh gate vẫn chặn observer membership ngoài dự kiến.

## PART E — EXECUTOR CHANGES

Thêm9 source/test files, không sửa source R23 cũ:

- `scripts/phase13-5d1g-r23a-disposition.cs`: identity-bound abnormal termination, native owner inspection; không nhận production executable.
- `scripts/phase13-5d1g-r23a-dispose-history.ps1`: fixed historical identity list, inspection/attempt/result create-new, default INSPECT.
- `scripts/phase13-5d1g-r23a-native.cs`: fixed synthetic launcher, native handles, suspended start, query-only job accounting; không có real initdb launch method.
- `scripts/phase13-5d1g-r23a-fixture.cs`: synthetic lifetime/detach cases và native read-only PID/FILETIME census, không password/input/database code.
- `scripts/phase13-5d1g-r23a-common.ps1`: source manifest verification, atomic metadata, console snapshots và fixture-only cleanup.
- `scripts/phase13-5d1g-r23a-host.ps1`: phased gates, actual suspended-thread observation, independent observer checks, ongoing console membership monitoring.
- `scripts/phase13-5d1g-r23a-observer.ps1`: native process/job observation; identity-bound abnormal fixture disposition nếu host thoát trước resume.
- `scripts/phase13-5d1g-r23a-offline.cjs`: PLAN_ONLY default, exact synthetic scenarios/run directory, duplicate refusal, no real execution entrypoint, final native census.
- `scripts/phase13-5d1g-r23a-offline.test.cjs`: tests bên dưới.

Phased gate chỉ dùng cho synthetic:

1. Initial console phải đúng host, không unknown additional members.
2. Child được tạo suspended; held handle/native FILETIME/image kiểm chứng identity. Observer phải có matching handle, nonce và process identity. Native thread inspection phải xác nhận suspended.
3. Pre-resume host console phải **chỉ host**; observer ở console riêng. Không chấp nhận child chưa attach như thể đã attach. Wrong PID/start/handle, observer exit hoặc thêm member đều BLOCKED trước resume.
4. Chỉ synthetic profile mới được resume sau các gate này. Sau resume phải quan sát đúng host+child trong attach window500ms. Không thấy child hoặc có member khác thì BLOCKED; tiếp tục kiểm membership trong khi child còn active.
5. Mọi interval chưa xác minh child membership có record `realInitdbSafe=false`. Không tự áp dụng profile này cho R23 LIVE.
6. Nếu gate lỗi khi fixture còn sống, cleanup exact owned fixture bằng handle-bound identity/hash/owner, ghi ABNORMAL_FIXTURE_DISPOSITION. Host mất thì observer có thể làm cleanup tương tự; observer mất thì host giữ handle và xử lý. Không terminate process dựa trên dữ liệu PID giả lập của negative test.

Snapshot ghi host/child/observer PID+FILETIME, expected/actual member PIDs, native identity có thể đọc, timestamp, stage, suspended/resumed và reason. Không đọc/lưu raw console screen, command-line secrets, environment hoặc password.

## PART F — OFFLINE EXTERNAL TESTS

Final suite: **22/22 PASS**, gồm21 subtests và một parent, runner exit0/signal=null. Có đủ13 actual external scenarios, run IDs mới. Evidence:

`build/phase13-5d1g-r23a/tests-1793120043394.json`

| Case | Kết quả đúng được xác minh | Native child exit |
| --- | --- | --- |
| Diagnostic legacy guard | BLOCKED; host-only trước resume, không resume | 238 abnormal |
| Success | SYNTHETIC_PASS; pre host-only, post exact host+child | 0 tự thoát |
| Nonzero | BLOCKED/NATIVE_NONZERO; không đổi thành success | 7 tự thoát |
| Missing child membership | BLOCKED sau child cố ý detach | 238 abnormal |
| Unexpected member | BLOCKED trước resume; extra owned guest cũng disposition | 238 abnormal |
| Observer tham gia host console | BLOCKED, actual observer PID có trong list | 238 abnormal |
| Gate error khi suspended | BLOCKED, không resume, fixture được track/dispose | 238 abnormal |
| Wrong requested PID/start time | BLOCKED/NATIVE_IDENTITY_REFUSED | 238 abnormal |
| PID reuse simulation | BLOCKED do mismatch FILETIME; không ép OS reuse PID | 238 abnormal |
| Wrong native handle | BLOCKED khi đưa host handle vào child identity check | 238 abnormal |
| Host exit trước resume | BLOCKED; observer thấy host native exit0 rồi dispose fixture | 238 abnormal |
| Observer exit | BLOCKED; host thấy native observer exit7, giữ handle/dispose fixture | 238 abnormal |

Ở observer-exit case, chỉ host còn quan sát native child exit; record đánh dấu `independentNativeHandle=false`, không giả rằng observer vẫn hoạt động. Đó là negative lifecycle PASS, không phải successful-launch acceptance.

Mỗi negative test bắt buộc BLOCKED và kiểm chứng cleanup/exit tương ứng, không chỉ đổi expected label. Missing-member test có hai nhánh timing hợp lệ: chưa từng attach hoặc attach rồi mất membership; cả hai đều bắt buộc BLOCKED và kiểm snapshot tương ứng. Duplicate attempt phải từ chối trước launch, không overwrite marker.

Các tests còn lại kiểm PLAN/no real initdb, stage-specific contract, historical evidence, hash drift, AST, absence của PGDATA/marker/listener và process census. Cleanup abnormal không được tính như graceful PASS. Không có real password test trong phase này.

### Lỗi trung gian được giữ nguyên

Lượt đầu đầy đủ22/22 PASS. Sau khi bổ sung native suspended-state evidence, một lượt chạy song song với regressions bị:

- R23A:9/12 PASS,3FAIL (bao gồm parent/count-completeness), abort các scenario còn lại khi `CENSUS_UNKNOWN_STOP`.
- R21:22/23 PASS,1FAIL do `PROCESS_CLEANUP_NOT_VERIFIED`/cleanup=null.
- R22:40/40 PASS; R1:211/211 PASS.

Native fixture exits của hai case lỗi census vẫn xác định: A exit7 và R21 supervisor-cancel exit0; không có bằng chứng chúng còn chạy. Không sửa results FAIL. Native transport details của census PowerShell cũ không được lưu đầy đủ, nên **không kết luận CPU/load hay crash cụ thể là root cause** của lỗi census.

Thay riêng census của R23A bằng native read-only handle/FILETIME helper và lưu native exit/error/signal/byte counts. Chạy lại suite liên quan tuần tự với run IDs mới, giữ nguyên yêu cầu gate, native exit và absence. Source R21 không đổi; lượt sequential của R21 sau đó23/23 PASS. Không lấy việc rerun PASS để xóa hoặc relabel lỗi trước.

## PART G — REGRESSION & ARTIFACT HASHES

| Final acceptance | Tests | Runner |
| --- | --- | --- |
| R23A native census version | 22/22 PASS,42506.7354ms | exit0, no signal |
| R2.2 regression | 40/40 PASS,51754.5169ms | exit0, no signal |
| R2.1 sequential regression | 23/23 PASS,41297.7463ms | exit0, no signal |
| R1/mapping/native-transport/collectors | 211/211 PASS,2518.9739ms | exit0, no signal |

**Final acceptance tổng296/296 PASS**; không cộng các lượt lặp hoặc gọi tất cả lịch sử đều PASS. TAP/native outcomes:

- `r23a-native-census-1793120000853.log`
- `r21-sequential-1793120000853.log`
- `r22-regression-1793119809624.log`
- `r1-regression-1793119809624.log`
- `sequential-outcomes-1793120000853.json`
- Lượt FAIL vẫn ở `regression-outcomes-1793119809624.json` và các logs tương ứng.

Một câu lệnh orchestration ban đầu bị Node module-format error trước khi khởi chạy tests; đã sửa wrapper ngoài test code. Không có fixture/initdb attempt từ câu lệnh đó.

Before/after source hashes đầy đủ: `build/phase13-5d1g-r23a/source-integrity-1793120119550.json`. “Before” của các file A là bản diagnostic trước khi đổi gate; source R23 gốc được đối chiếu với snapshot trước disposition và **tất cả giữ nguyên**.

| Source R23A | Before diagnostic | Final SHA256 |
| --- | --- | --- |
| common.ps1 | 02BAD18A12A8858D7E3634FE4CF823EB73327BC820B60A654390A0E7E29AC72A | 08726698B9F5C18A5B7B4897449E7D4B07D97EF03F345325A808894AC982F221 |
| dispose-history.ps1 | NEW (không nằm trong diagnostic manifest) | E2BA1A434D99BCE745D7DFBE360F6832017A0FCFB87732017A432DA70AFD817A |
| disposition.cs | 9873AAA387EF452B2954EF883022E681C0C86613D3E90B9CCBC3EBD7B9855D6A | 9873AAA387EF452B2954EF883022E681C0C86613D3E90B9CCBC3EBD7B9855D6A |
| fixture.cs | 7682ABCE7B7F6E56ACEA2A9619B6C4735FDDB9767382E055D8564EBC3865D60F | 473BFFDDBED9B0F38F895B49802FC12E6B9E564076CA8FB866651EB5BA2D3B97 |
| host.ps1 | 406B20447AE749B094AA232BCE45FE7B17EB896A5E76D24F0D5C88410A3F0BC5 | 76BE75D6DFA43A98710A3B6810EFB8B4E339742A2DBDB6926BED05ECC3C09834 |
| native.cs | 4C512E2D1B9B4299C0CADAC2FC86066A3D151434B2BA4E5C33F75EF18CE78947 | 1055C244A8E761AA2095FE9E0AF84B6A1F4C1C589DE801BBC50B8B192E6A61FF |
| observer.ps1 | 581DE279E333C14346078F5EA4CF2E190A1D70459A35B551093B5226710F2F00 | 7EDC2F883D602AEF7E3A1D778C7B873FDA9B929F32DC3AA44EB04C5DBF38682A |
| offline.cjs | C8CE15461A5BAC5390224C63770C1C24CA231EB76BC9137D24E03545C71CDC3D | 41E3E68C5551C60614A7316AAA0DFEC01E46A388A0F90A79FD0BC99055395D2B |
| offline.test.cjs | NEW | 7989B8E9CDF352049A4B489E6C57BAB3891FC66F1BB4CA80AD10D74F5C1D1FD3 |

Các tên trên đều có prefix `phase13-5d1g-r23a-` trong `scripts/`. Thêm báo cáo này; không commit/push Git.

### Final process/evidence census

`build/phase13-5d1g-r23a/final-census-1793120154568.json`:

- Native exit0, error=null, signal=null.
- Kiểm99 cặp PID/FILETIME ghi nhận từ các run A, host, observer, guest, hai fixture lịch sử và hai case census lỗi; **matchingRemaining=0**. Đây là99 identity checks, không khẳng định99 PID khác nhau.
- OS path census không còn readable fixture.exe khớp namespace R23/R23A.
- Snapshot root cuối `2026-10-27T16:55:57.533Z`:10files; protected owner/operator+SYSTEM ACL giữ nguyên; PGDATA absent; initdb process0; listener55435=0.
- Root hashes trước/sau trong final test summary giống nhau. Không ghi root marker mới hoặc thay dữ liệu lịch sử.

## PART H — REMAINING REAL INITDB LIMITATIONS

**Không xem R23A_READY là phê duyệt hoặc nghiệm thu real initdb.** Các khoảng từ ResumeThread tới actual console attach chỉ được thử trên synthetic child. Chưa chứng minh behavior của packaged initdb17.2, Windows CRT password prompt, restricted-token re-exec, visible human entry, Ctrl+C/console close hoặc descendants thật.

Real execution entrypoint của R23A luôn từ chối; không nối phased gate mới vào R23 LIVE. R23 live candidate cũ vẫn không được dùng trong phase này. Nếu thiết kế live tương lai cần post-resume membership check, phải đánh giá và phê duyệt riêng khoảng chưa chứng minh console membership; không tự coi37–42ms của fixture là giới hạn an toàn.

Termination/disposition chỉ được triển khai cho exact synthetic fixture theo quyền R23A. Không chuyển nó thành initdb timeout policy. Real timeout/unknown vẫn phải giữ UNKNOWN/manual/no retry, không force-kill theo policy fixture.

Console membership và hashes là các snapshot, không chống mọi TOCTOU hoặc malicious same-user attachment. Stress reliability của census PowerShell legacy khi chạy song song chưa được nghiệm thu; lỗi cũ được giữ. Không truy vấn production safety flags/health và không suy rằng chúng đã được xác minh từ offline tests.

## PART I — FINAL VERDICT

```text
PHASE13_5D1G_R2_3A_FIXTURE_AND_CONSOLE_READY
SECOND_INITDB_ATTEMPT_NOT_PERFORMED
SQL_R1_NOT_EXECUTED
POSTGRES_TEST_SERVER_NOT_STARTED
PRODUCTION_STARTUP_NOT_AUTHORIZED
PRODUCTION_MIGRATION_NOT_PERFORMED
PHYSICAL_PUMP_NOT_TRIGGERED
```

Hai fixture cũ đã có abnormal native exit được xác minh; current synthetic tests không để lại matching processes hoặc unresolved native outcomes. Real initdb vẫn0/1, không tạo PGDATA và không kết nối PostgreSQL5432/55433/55434/55435. Không restart backend/MQTT, không đổi `.env`, credentials, firmware hoặc ACL, không gửi ON/OFF. Dừng tại R23A, không tự chuyển sang initdb/SQL integration.
