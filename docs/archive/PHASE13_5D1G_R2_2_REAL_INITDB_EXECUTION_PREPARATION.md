# Phase 13.5D.1G-R2.2 — Real initdb execution preparation

Ngày kiểm tra: 27/10/2026 (UTC+7). Phạm vi **offline preparation only** theo attachment R2.2; không phải phê duyệt initdb lần hai.

## PART A — CURRENT STATE & ARTIFACT INTEGRITY

Đã đọc attachment, source/report R1, R2, R2.1 và kiểm tra read-only root `C:\DATN\test-instances\phase13-5d1g` trước/sau kiểm thử.

| Điều kiện hiện tại | Kết quả |
| --- | --- |
| Canonical root/ancestors, không symlink/reparse bất thường | PASS |
| Owner/operator | `S-1-5-21-1432835263-483988321-3159128977-1001` |
| Root DACL | Protected; đúng hai Allow FullControl ACE cho operator và SYSTEM; không inherited ACE |
| Evidence lịch sử | Đúng 10 file; tên, kích thước và SHA256 trước/sau giống nhau |
| PGDATA `root\data` | Chưa tồn tại |
| Listener 55435 | 0; chỉ đọc bảng TCP của Windows, không kết nối PostgreSQL |
| Process có tên initdb | 0 trong snapshot cuối; không phải bảo đảm không có race sau snapshot |
| Attempt R1 | Một attempt đã có kết quả exit1, `NATIVE_UNEXPECTED_OUTCOME_STOP_initdb`; không còn là attempt chưa biết outcome |
| Attempt mới tại root cũ | Không tạo |

SHA256 lịch sử giữ nguyên:

```text
43814FB64198DD08F660E6D6EE8EA762B807D81B36A5DA4AE4AF5DA9083DD22C  initdb-attempt.json
03D63D6F5396E3BDC64CEAC84263568B013BAC7758E7869451B8A94B4AB11138  resume-r1-outcome.json
```

Manifest cả 10 file và ACL được lưu trong evidence mới dưới `build/phase13-5d1g-r22-offline/`. Không ghi đè evidence cũ, không sửa ACL, không yêu cầu root rỗng. R2 vẫn là lịch sử 18/19; không đổi kết quả cũ. Không chạy lại wrapper R1.

Một lệnh PowerShell đọc attachment đầu phiên đã trả native `0xC0000005` sau khi xuất nội dung; không có thao tác thay đổi trạng thái trong lệnh đó. Không quy lỗi này cho initdb hoặc coi lệnh đó thành công. Các lần kiểm tra native sau có exit code riêng.

## PART B — REAL INITDB INPUT CONTRACT REVIEW

Binary pin: `C:\Program Files\PostgreSQL\17\bin\initdb.exe`, **17.2**, SHA256:

```text
94FDD98979F268FE58198EFC02BB7C765D11E1EB827FAD0CA13B2DC1FA379BFC
```

Chỉ chạy binary với `--help` và `--version`; cả hai exit0, không signal/native error. Help có `--pwprompt`. Không chạy initdb với PGDATA.

Trong source đúng tag REL_17_2, `get_su_pwd()` gọi hai prompt không echo rồi so khớp; mismatch kết thúc lỗi. `trapsig()` chỉ ghi nhận signal, còn kiểm tra lỗi diễn ra sau đó. Không suy ra Ctrl+C chắc chắn giải phóng prompt ngay hoặc hoàn thành trước deadline. Initdb còn có thể tạo tiến trình PostgreSQL con trong bootstrap; parent exit không chứng minh mọi descendant đã kết thúc. [Source initdb 17.2](https://github.com/postgres/postgres/blob/REL_17_2/src/bin/initdb/initdb.c).

Prompt Windows thử mở `CONIN$`/`CONOUT$`, đặt line/processed input và tắt echo, đọc rồi khôi phục mode. Khi console không phù hợp, source có nhánh fallback stdin/stderr; môi trường MSYS và console code page cũng cần được xét. Candidate tương lai phải từ chối môi trường không bảo đảm console, không tận dụng fallback để pipe mật khẩu. [Source sprompt 17.2](https://github.com/postgres/postgres/blob/REL_17_2/src/common/sprompt.c).

Không có prompt timeout được bảo đảm từ help. Đóng console, Ctrl+C trong CRT reader thật, operator không nhập và việc phục hồi console mode thật đều **NOT VERIFIED**. Help/source và synthetic C# không thay thế nghiệm thu binary thật. Không dùng lại `--pwfile=-`.

## PART C — VISIBLE OPERATOR CONSOLE DESIGN

Spec tương lai yêu cầu một cửa sổ console **hiển thị**, operator tự gõ mật khẩu test mới và xác nhận; không dùng production password. Không transcript/recording, clipboard automation, stdin pipe, password file, argv/environment chứa mật khẩu hoặc tự inject input. Launcher không nhận hoặc serialize mật khẩu.

Trước ResumeThread phải xác nhận console có thể tương tác, đúng host/child, operator nhìn thấy cửa sổ và sẵn sàng nhập. Không cho chạy trong phiên không tương tác/MSYS fallback. Dùng code page đã kiểm tra; không hứa hỗ trợ mọi ký tự Unicode qua CRT này.

Các bài automated ở phase này dùng **console ẩn chỉ cho public synthetic canary**, không nhận mật khẩu thật. C# fixture tự tạo key events cho canary cố định; supervisor không cung cấp input. Mode echo-off và screen buffer được kiểm tra mà không lưu nội dung màn hình/input. **Visible human input acceptance NOT VERIFIED**; nhánh hiển thị thật vẫn là thiết kế, chưa mở đường gọi initdb.

## PART D — EXTERNAL PROCESS SUPERVISION DESIGN

Candidate mới độc lập với cooperative reader/cancellation của R2.1:

```text
Node coordinator → PowerShell host → fixed external fake-initdb.exe
                 ↘ independent observer → held native process handle
```

- `execution-plan.cjs`: mặc định PLAN_ONLY; exact binary/hash/cwd/argument allowlist; `executeInitdb()` luôn ném `SECOND_INITDB_ATTEMPT_NOT_AUTHORIZED`. Không có nhánh gọi initdb thật.
- `native.cs`: CreateProcessW tạo fixture suspended, giữ native process/thread handles ngay khi tạo; GetProcessTimes lấy creation FILETIME, QueryFullProcessImageNameW lấy image trước khi CLR chạy. Không dựa vào Process.MainModule ở trạng thái chưa load.
- `host.ps1`: compile đúng fixture source đã hash, kiểm tra compiler native result; tạo console riêng, ghi PID + FILETIME của host/child. Chỉ sử dụng executable cố định trong run directory offline.
- `observer.ps1`: kiểm tra image/hash/PID/FILETIME rồi giữ process handle riêng **trước** khi child được resume; ghi native exit code và exit FILETIME thực tế.
- JSON evidence dùng create-new pending file, flush và move. Nonce, PID, FILETIME và native exit phải khớp. Wrapper exit0 không thay native evidence; native error dù exit0 vẫn BLOCKED.
- Run ID mới, attempt marker create-new, không overwrite hoặc retry. Deadline tương lai 120 giây là mốc chuyển sang UNKNOWN/manual, **không phải bảo đảm child đã dừng**.
- Không dùng `.Kill()`, TerminateProcess, taskkill hay CancelSynchronousIo trong candidate external. Không tái sử dụng fallback force-kill của observer R2.1.

Ctrl+C chỉ được thử với fixture trong console riêng sau khi kiểm tra membership đúng host+child và kiểm tra lại child identity. Không gửi vào console operator hiện có. CTRL_C_EVENT group0 tác động các process cùng console; arbitrary nonzero group ID không cung cấp cách giới hạn an toàn cho Ctrl+C. Kiểm tra membership là snapshot, không loại bỏ race với process cùng user cố ý attach. [Microsoft console control-event contract](https://learn.microsoft.com/en-us/windows/console/generateconsolectrlevent).

Nếu supervisor mất, observer vẫn có native handle; kết luận giữ UNKNOWN/manual. Nếu child exit trước observer-ready, dù host giữ được exit0, kết luận vẫn BLOCKED. Nếu timeout/console loss/native identity không rõ, không thử input, không kill, không retry và không khẳng định PGDATA an toàn để sử dụng.

Fixture không đọc cancellation/start JSON, không dùng reader-thread cancellation. Riêng fixture có timer tự kết thúc exit23 sau 2,3 giây để tránh để lại synthetic process. Các case dùng timer ghi **ABNORMAL_TEST_CLEANUP**, không được coi graceful. Khi cố tình gây gate fault, host resume đúng fixture tự hết hạn để thu dọn test; **không áp dụng nhánh này cho initdb thật**. Với real child còn suspended khi gate lỗi, giữ manual disposition, không resume để “cleanup”.

## PART E — SYNTHETIC INTEGRATION TEST RESULTS

Suite mới: `scripts/phase13-5d1g-r22-execution-plan.test.cjs`.

**40/40 PASS, 0 FAIL, 0 SKIP** (39 subtests và một parent test). Mỗi lượt suite chạy 12 external executables thật, nhưng đều là fixture, không phải PostgreSQL. Các failure scenario PASS nghĩa là **đã kiểm chứng chặn đúng**, không phải operation thành công.

| Case external | Native exit | Outcome được giữ |
| --- | --- | --- |
| Hai prompt khớp, echo-off, screen không có canary, mode restored | 0 | SYNTHETIC_EXTERNAL_PASS / CONFIRMED |
| Confirmation khác nhau | 1 | BLOCKED / CONFIRMATION_MISMATCH |
| Input rỗng | 23 | BLOCKED / MISSING_INPUT |
| Ctrl+C trong console riêng | 130 | BLOCKED / OPERATOR_CANCELLED; mode-restored=false, không gọi graceful |
| Native failure sau hai prompt | 7 | BLOCKED / NATIVE_NONZERO |
| Fixture mất console trước read | 23 | BLOCKED / CONSOLE_LOST |
| Supervisor tự exit khi child đang đọc | 23 do fixture timer | SUPERVISOR_LOST_UNKNOWN_MANUAL; ABNORMAL_TEST_CLEANUP |
| Child exit trước observer-ready | 0 chỉ host thấy | EXIT_BEFORE_OBSERVER_READY / BLOCKED |
| Wrong PID | 23 do fixture timer | PROCESS_IDENTITY_REFUSED; không signal PID sai |
| Wrong native start time | 23 do fixture timer | PROCESS_IDENTITY_REFUSED |
| PID reuse giả lập bằng start-time mismatch | 23 do fixture timer | PROCESS_IDENTITY_REFUSED; không gây reuse PID hệ điều hành thật |
| Deadline ngắn của fixture | 23 sau timeout | TIMEOUT_UNKNOWN_MANUAL; không đổi thành success sau cleanup |

Các test còn lại: PLAN_ONLY, real launch denied, executable/hash/cwd/PGDATA/flags drift, duplicate marker, evidence cũ còn nguyên, AST PowerShell, native error dù exit0, thiếu observer, native PID/time/nonce/code/exit timestamp sai, unknown host gate, không có secret transport/logging và không tác động coordinator ngoài console. Canary không xuất hiện trong stdout/stderr logs; không tạo password file. Mỗi external case kiểm tra child/host/observer đã thoát theo đúng PID+FILETIME; observer ở early-exit không mở được native handle và không được giả là đã quan sát child.

Console loss test này không tái hiện đóng cửa sổ initdb đang kẹt CRT read. Ctrl+C fixture dùng handler tự exit130, không chứng minh cleanup của PostgreSQL. Các giới hạn này không bị đổi thành PASS.

## PART F — REGRESSION & SOURCE HASHES

Đã chạy lại:

```powershell
node --test scripts/phase13-5d1g-r22-execution-plan.test.cjs
node --test scripts/phase13-5d1g-r21-lifecycle.test.cjs
node --test scripts/phase13-5d1g-resume.test.cjs scripts/phase13-5d1g-mapping.test.cjs scripts/phase13-5d1f-native-transport.test.cjs scripts/phase13-5d1e-evidence-collectors.test.cjs
```

Kết quả: **40 + 23 + 211 = 274 tests PASS**. R21 chỉ là regression cooperative synthetic, không cấp quyền real initdb. Không chạy lại R2 disconnect lỗi cũ để đổi lịch sử. AST host/observer PASS. Không cần typecheck backend vì không thay backend/domain/runtime source.

Files thêm mới trong phase này:

| File dưới `scripts/` | SHA256 |
| --- | --- |
| phase13-5d1g-r22-execution-plan.cjs | CF230214D28FE67A3A1268FBFC9117A1311092A1EA94B1E074C13977A04589F5 |
| phase13-5d1g-r22-execution-plan.test.cjs | 92C6125C8109FCB2BDFADF3333FC024D0CC5F5EDD6E998A36EC0D9C921E25D26 |
| phase13-5d1g-r22-root-state.cjs | 786CE08BFFECDFC4658C366F8C120807DB2F5F46C6CEE5CED95823B5026D94EA |
| phase13-5d1g-r22-native.cs | C0D530F558ABB6BF251AF5E46558A1621F948D7D8D467F7FC8D6B0E98E614F50 |
| phase13-5d1g-r22-fake-initdb.cs | B2B789C9A604F18E84061A8E1BE8DD07F4472245A723B78E1D7B495FD7FF14C1 |
| phase13-5d1g-r22-host.ps1 | 855074AB0283733DA96CE8088413F6D63EDE98358C6120E6E1FB279083FC4184 |
| phase13-5d1g-r22-observer.ps1 | 73A290B30A0EF999B1A02FE5F3A0D63702C8687F493E029DB959ACC63211A76E |

Thêm báo cáo này và sanitized evidence ở build; không sửa các files source cũ. Các baseline hash kiểm lại giữ nguyên:

```text
855B3EADF534E214D7112FE11190A356CBC952ABFF81493656D11A02BFF4699B  isolated-run.cjs
F37A75EC916624FD08ABC5BC9EFEE5578882D645DB65D6B0B70493020E07D5AF  r2-password-plan.cjs
7DCDCFE126B90A8309F48A70EA7C5EAB41CBBFC9551DF18D7D3380692C90B0D2  r21-lifecycle.cjs
```

Integrity artifact: `build/phase13-5d1g-r22-offline/integrity-1793115195960.json`; lưu exact binary help/version native results, source hashes và manifest root, không chứa credentials. Synthetic summaries và per-run logs giữ nguyên, không dùng chúng làm SQL evidence.

Final R22 evidence: `build/phase13-5d1g-r22-offline/test-1793115202032-7a2a5190-summary.json`; TAP log `r22-final-179311-1793115153892.log`, runner native exit0, signal=null, 40/40 trong 48117.595ms. Regression R21: `r21-regression-20261027.log`, 23/23 trong 48882.7307ms; regression 211 tests trả native exit0, 211/211 trong 2278.379ms theo tool transcript phiên này. Lượt R22 trước đó 40/40 và các probe vẫn được giữ, không ghi đè.

## PART G — SECOND INITDB EXECUTION APPROVAL PACKAGE

Đây là package đề xuất, **chưa thực thi và chưa tạo marker tại test root**:

1. Người dùng phê duyệt riêng đúng một lần initdb mới, không bao gồm SQL R1, start server hoặc production.
2. Pin lại source/executor hash sau review nhánh visible operator console; không chạy nguyên wrapper R1 hoặc dùng synthetic input driver cho real binary.
3. Cấp run ID duy nhất; create-new marker `initdb-attempt-r22-<runId>.json`, không chạm marker/log cũ. Ghi approval thật, không tự tạo approval giả hoặc reset số lượt cũ.
4. Kiểm tra lại canonical root/ancestors, owner SID, protected DACL, reparse, exact whitelist/hash 10 evidence files từ manifest; root được phép có evidence lịch sử.
5. Xác minh PGDATA chưa tồn tại, 55435 không listener, không còn process/attempt chưa giải quyết. Chặn nếu gate không đọc được hoặc state đã đổi. Snapshot hiện tại không thay precheck tương lai.
6. Pin exact executable/hash/version17.2 và cwd root. Spec args: `-D <pinned PGDATA> -U d1g_dba --pwprompt --auth-host=scram-sha-256 --auth-local=scram-sha-256 --encoding=UTF8 --locale=C --no-clean`. Port55435 chỉ dùng khi có quyền start server về sau, không phải argument initdb.
7. Console phải hiển thị trước input; không redirect input, không transcript; chỉ operator nhập password test mới trực tiếp hai lần. Không lấy password qua chat, stdin pipe, argv hoặc file.
8. Parent giữ native handle ngay khi CreateProcessW suspended; observer độc lập có handle trước ResumeThread; pin child/host/observer PID+native FILETIME, exact image/hash. Không tiếp tục nếu gate hoặc console không đạt.
9. Sau resume, quan sát native outcome; deadline120s chuyển UNKNOWN/manual, không terminate hoặc retry. Mất console/supervisor, early exit, handle failure hoặc inconsistent evidence đều dừng.
10. Nếu operator hủy, không mặc định child đã dừng: chỉ ghi nhận khi native exit thực sự quan sát được. Đối chiếu descendants/partial PGDATA read-only; không tự xóa/repair/recreate hoặc chuyển auth trust.
11. Exit0 chưa đủ cho start cluster/SQL R1; cần kiểm chứng output/PG_VERSION/identity và phê duyệt đúng phase tiếp theo. Với nonzero/UNKNOWN giữ logs, marker và mọi PGDATA do `--no-clean` để xử lý riêng.

## PART H — REMAINING RISKS

- Nhập mật khẩu thật trên packaged initdb17.2 và visible operator console chưa thử. CRT buffering, code page, cancellation và console closure có thể khác fixture.
- Timeout không bảo đảm chấm dứt process; sau UNKNOWN có thể còn initdb hoặc bootstrap descendants, kể cả process đang suspended. Manual disposition phải giải quyết trước attempt tiếp theo; không có automatic retry.
- Fixture tự hết hạn chỉ là test cleanup, không phải tính năng initdb. Native exit của parent không chứng minh toàn bộ process tree đã đóng.
- PID/FILETIME/hash và console-membership checks không chống mọi thay đổi do malware/admin hoặc process cùng user; code/binary còn có race giữa hash và launch. Phải giữ môi trường vận hành tin cậy, không tuyên bố credential isolation tuyệt đối.
- Không có live DB/catalog/runtime flags evidence trong R2.2. Không tuyên bố Commands/Automation runtime đã được xác minh hoặc backend đã phục hồi. Không truy cập credentials hay can thiệp hệ thống để lấp các khoảng trống này.
- Mọi marker/evidence mới của future real attempt vẫn cần approval và review executor cuối; PLAN_READY không phải READY_TO_EXECUTE tự động.

## PART I — FINAL VERDICT

**PHASE13_5D1G_R2_2_REAL_INITDB_EXECUTION_PLAN_READY** — đã chuẩn bị spec, candidate external supervision, offline tests và approval package. Fail-closed/manual là chính sách cho real cancellation chưa được chứng minh, không phải claim graceful recovery.

```text
REAL_INITDB_PASSWORD_INPUT_NOT_VERIFIED
SECOND_INITDB_ATTEMPT_NOT_PERFORMED
SQL_R1_NOT_EXECUTED
LIVE_PRODUCTION_PREFLIGHT_NOT_PERFORMED
BACKEND_RECOVERY_NOT_PERFORMED
PRODUCTION_MIGRATION_NOT_PERFORMED
PHYSICAL_PUMP_NOT_TRIGGERED
```

Dừng tại R2.2. Không kết nối PostgreSQL, không tạo/start cluster, không sửa authentication, không chạy SQL/migration/backup/restore hoặc tác động backend/MQTT/ESP32/máy bơm trong phase này.
