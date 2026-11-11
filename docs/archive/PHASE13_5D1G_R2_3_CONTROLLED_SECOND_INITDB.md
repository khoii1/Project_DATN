# Phase 13.5D.1G-R2.3 — Controlled second initdb attempt

**PHASE13_5D1G_R2_3_INITDB_BLOCKED**. Dừng tại executor preparation gate; **không thực hiện initdb lần hai**. Candidate mới không đạt offline external integration tests. Không nới điều kiện, không force-kill và không retry để ép PASS.

## PART A — APPROVAL & RUN ID

Phê duyệt thật: attachment `84e2c1ff-0de0-4a92-9933-8c1b01ea36f7/Pasted text.txt`, Phase13.5D.1G-R2.3, tối đa một lần initdb mới tại đúng `C:\DATN\test-instances\phase13-5d1g\data`. Reference: `USER-R23-84e2c1ff-0de0-4a92-9933-8c1b01ea36f7`; đây là nhãn liên kết attachment, không phải một phê duyệt mới do Agent tạo.

Actual live run ID: **NOT_CREATED**. Root marker `initdb-attempt-r23-<runId>.json`: **NOT_CREATED**. Quyền initdb mới sử dụng **0/1**. R1 vẫn đã sử dụng 1/1 theo phê duyệt R1, exit1; không reset lịch sử.

Hai run ID dưới đây **chỉ là offline fixture tests**, không phải attempt initdb:

- `r23-1793118266854-70cd449e`
- `r23-1793118269698-1d1437b5`

Tất cả evidence mới nằm dưới `build/phase13-5d1g-r23/`; root test cũ không bị ghi thêm file. Thời điểm test: 27/10/2026 khoảng 16:24:26–16:24:33 UTC, tức 23:24:26–23:24:33 UTC+7.

## PART B — FINAL EXECUTOR SOURCE / TESTS / HASHES

Đã review source/report R1/R2/R2.1/R2.2; không dùng lại wrapper R1 hoặc cơ chế cooperative reader cancellation.

Candidate mới thêm:

| File dưới `scripts/` | Chức năng | SHA256 của bản kiểm thử bị chặn |
| --- | --- | --- |
| phase13-5d1g-r23-native.cs | Fixed initdb command, visible-console candidate, suspended launch, Job Object query | 07E256CFAAE1449D870EE102FD823F6991C94BA01263EBC85070BEF101645C29 |
| phase13-5d1g-r23-executor.cjs | PLAN_ONLY, fixed spec, evidence hashes/preflight/postcheck | A2E7C7F679213374EF55C6FF76545B1844160C2D75CE87A3E083831F0C9659E7 |
| phase13-5d1g-r23-common.ps1 | Manifest/source verification, create-new atomic metadata | B3DAB389AC44EB5FBBDB3AFA43AE70B20D822AE6B90C594C81D10A9F8BFA6092 |
| phase13-5d1g-r23-host.ps1 | Separate console, readiness gate, held handles, observer gate | 97C6DF249A63232F39F7A2C75EA7E30F59F22DFE88AC53C063438667162E46D7 |
| phase13-5d1g-r23-observer.ps1 | Independent native handle and job accounting, bounded UNKNOWN outcome | 64D75BFD6DF2116098A672AB940D0D3E90AD05EF13BCD6C654FF8C4613989CBD |
| phase13-5d1g-r23-fixture.cs | No-input synthetic external executable, no database code | 6833147CF784F8FFF247B88FF4D48FF3CE70B4461C9DCEA3B909FCB511351F87 |
| phase13-5d1g-r23-executor.test.cjs | Offline contract and actual external supervision tests | 0D567AD050A39240B3715143FC8D219BEE806C731CB348D69B2713B959129A6C |

Đây là **source snapshot của candidate không đạt**, không phải final pin được nghiệm thu để chạy initdb thật. Không sửa source sau lượt tests này để chạy tiếp trong cùng phiên.

Kế thừa nguyên bản R22 native helpers `C0D530F558ABB6BF251AF5E46558A1621F948D7D8D467F7FC8D6B0E98E614F50` và read-only root guard `786CE08BFFECDFC4658C366F8C120807DB2F5F46C6CEE5CED95823B5026D94EA`.

Kết quả thực thi:

- C# helper compilation: PASS.
- PowerShell AST common/host/observer: PASS.
- `node --test scripts/phase13-5d1g-r23-executor.test.cjs`: native runner **exit1**, **14 tests: 11 PASS, 3 FAIL**. Ba FAIL bao gồm hai external subtests và parent test; không phải ba initdb attempts.
- Hai external cases dự kiến success/exit7 đều bị chặn ở cùng console-membership gate, trước ResumeThread.
- Không chạy lại regression R22/R21/211 sau failure để tiếp tục live execution. Kết quả 274/274 của R2.2 chỉ là bằng chứng lịch sử, không được tính là R2.3 PASS.

Candidate dùng Job Object mặc định, kiểm tra limit flags=0, không đặt kill-on-close và không có TerminateJobObject. Mục tiêu là giữ accounting của descendants, vì Windows initdb có thể tự re-execute với restricted token rồi đợi exit của child. [PostgreSQL REL_17_2 restricted-token source](https://github.com/postgres/postgres/blob/REL_17_2/src/common/restricted_token.c). Chức năng descendants chưa đạt nghiệm thu với initdb thật.

## PART C — FRESH PRE-START GATES

Kiểm tra read-only đầu phiên và sau tests, snapshot cuối `2026-10-27T16:26:29.847Z`:

| Gate | Kết quả |
| --- | --- |
| Exact canonical root, ancestors/reparse checks | PASS |
| Owner SID | `S-1-5-21-1432835263-483988321-3159128977-1001` |
| Protected DACL | Đúng hai Allow FullControl ACE cho operator/SYSTEM; không inherited ACE |
| Historical file whitelist/hash | PASS, đúng 10 file; không thay đổi |
| PGDATA/PG_VERSION | Chưa tồn tại |
| initdb process trong snapshot | 0 |
| Port55435 listener | 0 |
| Binary initdb/version/hash | PASS, 17.2, hash đúng pin |
| Fresh live console/operator readiness | NOT_VERIFIED; không mở live console nhập mật khẩu |
| External executor lifecycle | **FAIL**, còn hai synthetic processes chưa có exit xác định |

Không kết nối PostgreSQL5432/55433/55434/55435. Không tuyên bố complete global inspection của các postgres process không thuộc target. Target chưa bao giờ có PGDATA/PG_VERSION sau R1, root chỉ chứa evidence thất bại và không listener; đây là bằng chứng filesystem/process baseline, không phải SQL health check.

Binary chỉ được gọi với `--help` và `--version`, không với PGDATA. SHA256 vẫn:

```text
94FDD98979F268FE58198EFC02BB7C765D11E1EB827FAD0CA13B2DC1FA379BFC
```

## PART D — VISIBLE CONSOLE & PASSWORD INPUT

Đã chuẩn bị nhánh visible operator console, yêu cầu operator nhấn R khi nhìn thấy cửa sổ, sẵn sàng dùng password test mới và không recording; chỉ sau đó mới chạy fresh gates/marker. Nhánh này **chưa được chạy** do tests thất bại.

Không hỏi, nhập, inject, ghi file hoặc log mật khẩu. Không transcript console. Hai tests chỉ chạy fixture không có input/password trong console riêng ẩn; không dùng chúng làm bằng chứng visible operator console hoặc real initdb input.

**Điểm đứt đã chứng minh:** `phase13-5d1g-r23-host.ps1`, gate ném `FINAL_CONSOLE_MEMBERS_REFUSED`, sau khi observer-ready được ghi nhưng trước ResumeThread. Gate yêu cầu console có đúng host+child (và visible nếu EXECUTE). Logs hiện chưa lưu actual membership tại đúng thời điểm từ chối, nên chưa đủ bằng chứng kết luận chính xác count/PID nào gây lỗi. Không đoán đây là lỗi initdb, NTFS hoặc password.

Ở test này, observer `Start-Process` và thời điểm child còn suspended cần được điều tra trong phiên sửa riêng. Không bỏ gate hoặc resume child để lấp thiếu evidence.

## PART E — NATIVE INITDB RESULT

**NOT_EXECUTED**. Actual initdb creation/resume/exit/duration/signal: **N/A**. Không suy exit initdb từ wrapper test exit2.

Fixture evidence:

| Run | Child PID | Native creation FILETIME | Host PID | Host creation FILETIME | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| r23-1793118266854-70cd449e | 8580 | 134375918683355399 | 7240 | 134375918668815316 | created suspended; resumed=false; UNKNOWN_NATIVE_OUTCOME |
| r23-1793118269698-1d1437b5 | 7376 | 134375918710140004 | 16612 | 134375918697171261 | created suspended; resumed=false; UNKNOWN_NATIVE_OUTCOME |

Host native wrapper exit2 là lỗi gate của fixture. Independent observer đã giữ handle đúng child, ghi ready với JobActive=1/JobFlags=0. Sau deadline, cả hai observer ghi `observer-unknown.json`, JobActive=1, không native exit. Kiểm tra lại bằng native process handles xác minh đúng PID/FILETIME/image và `Exited=false`; không giả rằng child đã dừng vì host exit.

Test harness đã chạy hai scenario synthetic theo suite; đó không phải retry initdb. Việc còn fixture chưa kết thúc là **lỗi lifecycle của candidate**, không phải cleanup PASS. Không có force-kill, manual resume hoặc attempt thứ ba từ Agent.

## PART F — TEST CLUSTER IDENTITY

- PGDATA: đúng đường dẫn pin nhưng **NOT_CREATED**.
- PG_VERSION/systemID: **NOT_CREATED / NOT_VERIFIED**.
- `pg_controldata`: **NOT_EXECUTED**.
- Authentication files: **NOT_CREATED**. Candidate giữ SCRAM args; không tạo hoặc thay `trust`.
- Required cluster files: chưa tồn tại; không đạt INITDB_PASS.
- Các systemID exclusion kế thừa: production7472695863566132416, test7698826681383327460, recovery7699532241714573532. Không truy cập/chỉnh sửa cluster đó trong phiên này.

## PART G — PROCESS & EVIDENCE INTEGRITY

Root evidence cũ giữ nguyên, bao gồm:

```text
43814FB64198DD08F660E6D6EE8EA762B807D81B36A5DA4AE4AF5DA9083DD22C  initdb-attempt.json
03D63D6F5396E3BDC64CEAC84263568B013BAC7758E7869451B8A94B4AB11138  resume-r1-outcome.json
```

Evidence mới:

- `build/phase13-5d1g-r23/offline-tests-1793118273763.json`
- `build/phase13-5d1g-r23/blocked-review-1793118439789.json`: approval attachment hash, source hashes, outcomes/observer evidence và số liệu test thực tế.
- Hai run directories chứa manifest, source hashes, console-ready, identity, observer-ready, outcome, observer-unknown và logs metadata; giữ nguyên không overwrite.

**Manual disposition còn mở:** fixture PID8580 và PID7376 theo đúng image trong hai run directories và FILETIME nêu trên. Không dùng PID đơn lẻ ở thời điểm tương lai nếu chưa đối chiếu identity; PID có thể được tái sử dụng. Không tự Stop-Process/taskkill/kill, không tự resume để cleanup. Cần giải quyết các fixture này và nghiệm thu lại executor trước mọi real initdb attempt.

## PART H — BEFORE/AFTER SAFETY

- Root cũ và NTFS: không sửa; không delete/recreate, không reset PGDATA.
- New actual-initdb marker: không tạo; actual initdb vẫn0/1 của R2.3.
- Không start PostgreSQL server hoặc kết nối SQL; không CREATE DATABASE/ROLE/schema, migration, backup/restore.
- Không restart/start backend/MQTT, không truy cập credentials, không firmware/ESP32/relay/pump action.
- Không tuyên bố production health/flags đã xác minh live; không thực hiện live production preflight trong phạm vi này.
- Các process mới còn chưa kết thúc là **synthetic fixtures**, được ghi rõ thay vì tuyên bố toàn bộ cleanup PASS.

## PART I — FINAL VERDICT

```text
PHASE13_5D1G_R2_3_INITDB_BLOCKED
SECOND_INITDB_ATTEMPT_NOT_PERFORMED
REAL_INITDB_PASSWORD_INPUT_NOT_VERIFIED
SQL_R1_NOT_EXECUTED
POSTGRES_TEST_SERVER_NOT_STARTED
LIVE_PRODUCTION_PREFLIGHT_NOT_PERFORMED
BACKEND_RECOVERY_NOT_PERFORMED
PRODUCTION_MIGRATION_NOT_PERFORMED
PHYSICAL_PUMP_NOT_TRIGGERED
```

Dừng theo yêu cầu khi executor preparation gate không đạt. Không chuyển sang live initdb, SQL integration hoặc backend recovery. Cần xử lý thủ công fixture còn sống và sửa/kiểm thử gate console trong phiên tiếp theo; không tái thử initdb trong phiên này.
