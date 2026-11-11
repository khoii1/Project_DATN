# PHASE 13.5D.1G-R2.4 — REAL EXECUTOR FINALIZATION & EXECUTION APPROVAL GATE

Ngày kiểm chứng: 28/10/2026, UTC+7. Phạm vi: implementation/offline Windows synthetic processes, không phải nghiệm thu initdb thật.

## PART A — BASELINE

- R2.3B baseline322/322 PASS. Candidate R2.4 tạo riêng; không sửa nguồn/evidence R2.3B/R2.3A.
- Root C:\DATN\test-instances\phase13-5d1g có đúng10 evidence files, tên/kích thước/SHA256 khớp package R2.3B. PGDATA data và PG_VERSION chưa tồn tại.
- Operator/owner SID: S-1-5-21-1432835263-483988321-3159128977-1001. Protected DACL đúng2 ACE Allow FullControl operator+SYSTEM, không inherited.
- Snapshot cuối: port55435 không listener, initdb processes0. Không kết nối SQL.
- Attempt thứ nhất vẫn FAIL exit1 do --pwfile=-; lượt initdb thứ hai0/1 chưa dùng. Không tạo real marker mới.
- 23 source kế thừa và10 historical files hash PASS. Evidence: build/phase13-5d1g-r24/final-integrity-census-1793170196284.json.

## PART B — REAL EXECUTOR INTEGRATION

Đã triển khai nhánh real trong native supervisor, không chỉ tạo invocation specification. Nhánh này LOCKED, chưa được chạy.

Các file mới (không sửa source cũ):

- r24-executor.cjs: PLAN_ONLY mặc định, compile/manifest/hash, previous outcomes, future issuer/launcher. API executeInitdb cũ luôn từ chối.
- r24-gate.cs: target/root/binary checks, run-bound release, operator ceremony và create-new real marker.
- r24-native.cs: fixed CreateProcessW suspended, Job Object và native handles.
- r24-runtime.cs: host/independent observer; real lỗi không gọi fixture disposer.
- r24-policy.cjs: exact invocation, descendant allowlist.
- r24-fixture.cs và r24-executor.test.cjs: synthetic external tests.
- r22-native.cs là dependency chỉ đọc, giữ nguyên hash.

CLI flag hoặc approval R2.3 cũ không mở khóa. Release tương lai cần đúng run/manifest/bundle/operator/target/maxAttempts1, reference mới và expiry tối đa10phút. Native host kiểm tra release trước console/marker/CreateProcessW. Thiếu release đã test exit3.

DPAPI CurrentUser bảo vệ operator attestation; entropy ràng buộc run/manifest/bundle. Đây không phải xác thực sự kiện ChatGPT; operator cùng tài khoản là thành phần tin cậy. Không tuyên bố chống operator/admin độc hại. [Microsoft DPAPI](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.dataprotectionscope?view=netframework-4.8.1).

## PART C — VISIBLE CONSOLE

Kiểm tra UserInteractive/session, tạo console của chính host, xác minh visible và native membership. Đã sửa ShowWindow: lần đầu có thể chịu STARTUPINFO/SW_HIDE; gọi show tường minh và quan sát trong deadline, vẫn fail-closed. [Microsoft ShowWindow](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-showwindow).

Future issuer yêu cầu gõ đúng public approval phrase (120s). Future host yêu cầu R để xác nhận đúng cửa sổ, transcript/recording tắt và mật khẩu test mới sẵn sàng; Q hủy,120s. Không stdin/clipboard automation. Initdb giữ --pwprompt để operator nhập trực tiếp hai lần. Không password argv/env/file/log/chat hoặc console transcript.

Visible-console synthetic PASS; operator-ready test chỉ SIMULATED_OFFLINE_ONLY. Real password echo/confirmation và binary thật: NOT VERIFIED. Code không chứng minh được không có phần mềm ghi màn hình ngoài tiến trình; operator phải xác nhận.

## PART D — FINAL SAFETY GATES

| Gate | Kết quả |
|---|---|
| Canonical/reparse/operator/owner/protected DACL | Native read-only preflight PASS |
| Exact10 historical files+hashes | PASS, khớp R2.3B |
| PGDATA/PG_VERSION absent;55435free;initdb0 | PASS snapshot; đo mới trước future launch |
| Initdb/postgres/cmd hashes và8 exact descendant rules | PASS |
| Missing release/old approval | LOCKED, exit3 trước real side effects |
| Wrong plan/hash/target/claims/snapshot | Native offline matrix từ chối |
| Unresolved attempt/process | Terminal outcomes+census; root whitelist chặn marker lạ |
| Operator/observer-ready trước ResumeThread | Synthetic PASS; real operator NOT PERFORMED |
| Closed child env | SystemRoot/WINDIR/ComSpec cố định, TEMP/TMP riêng; không PGcredentials/hooks |

Matrix: plan6, claims11, snapshots13 cases. Claims chỉ public data trong memory, không release thực. DPAPI memory-only roundtrip và wrong-entropy rejection PASS, không token file. Actual issuer+private ACL ceremony chưa thực hiện.

Native read-only preflight candidate cuối exit0, 2026-10-28T06:50:06.957Z. Không phải live production preflight. Future execution phải lấy evidence mới tại launch.

## PART E — PROCESS LIFECYCLE

1. Kiểm tra release, operator-ready, fresh preflight; create-new real marker; spawn đúng initdb suspended.
2. Giữ process/thread handle; Job assignment; PID/FILETIME/path/hash/owner/token/parent; independent observer giữ handle và báo ready trước ResumeThread.
3. Sau ResumeThread ghi sideEffectsPossible=true; bounded console attach2s. Theo dõi toàn Job, không coi root exit0 là tất cả descendants hoàn tất.
4. Allowlist exact initdb/restricted re-exec/cmd/postgres theo parent/depth/hash; không tự whitelist unknown. Job flags0, không kill-on-close; active8/depth3/lifetime64.
5. Terminal consensus host/observer cần identity/exit code/exit time/jobActive0. Native exit0 chỉ INITDB_NATIVE_EXIT0_FILES_NOT_YET_VERIFIED, chưa xác minh cluster.
6. Real deadline120s, observer130s: UNKNOWN/manual disposition, không kill/retry/xóa partial PGDATA. Mất observer/host hoặc identity bất thường phải dừng.

Deadline tính cả thời gian nhập password; cần chuẩn bị trước. Không bảo đảm real child đã kết thúc khi deadline đến vì không force-kill.

## PART F — OFFLINE TEST RESULTS

Final R2.4 **29/29 PASS**. External cases: success, visible-console, nonzero, restricted re-exec, valid/invalid descendants, wrong Job, unexpected/missing console membership, early exit, wrong PID/FILETIME/hash, observer/host loss, pre/post failure, timeout/UNKNOWN. Có password boundary, duplicate/no-retry và real branch locked.

Giữ failure history: acceptance đầu **10/13 PASS,3FAIL**, CONSOLE_VISIBILITY_UNKNOWN trước root/Job/attempt. Run r24-1793168953215-04a06178 có failure-state; host exit được quan sát, không child identity/attempt. Đây không phải lỗi initdb hoặc child leak. Đã sửa explicit show; acceptance sau29/29 PASS, final pipeline29/29 PASS. Không ghi đè failures hoặc cộng lượt chạy lặp thành unique test.

Fault-injection có abnormal fixture disposal đúng native identity; không coi graceful và không áp dụng với real initdb.

## PART G — REGRESSION & CENSUS

| Suite tuần tự | PASS | Native exit | Log |
|---|---:|---:|---|
| r24-final | 29/29 | 0 | build/phase13-5d1g-r24/r24-final-1793169789761.log |
| r23b-regression | 26/26 | 0 | build/phase13-5d1g-r24/r23b-regression-1793169789761.log |
| r23a-regression | 22/22 | 0 | build/phase13-5d1g-r24/r23a-regression-1793169789761.log |
| r22-regression | 40/40 | 0 | build/phase13-5d1g-r24/r22-regression-1793169789761.log |
| r21-regression | 23/23 | 0 | build/phase13-5d1g-r24/r21-regression-1793169789761.log |
| foundation-regression | 211/211 | 0 | build/phase13-5d1g-r24/foundation-regression-1793169789761.log |

**351/351 PASS**, fail/skipped/cancelled0. Evidence: build/phase13-5d1g-r24/sequential-outcomes-1793169789761.json.

R2.4 final native census:39 completed synthetic runs,129 PID/creation FILETIME identities,0 MATCHING_ACTIVE. ABSENT/EXITED/DIFFERENT_IDENTITY phân biệt PID reuse. Không phát minh child identity cho failure trước root. CIM read-only lúc06:49:56Z cũng0 scoped fixture/supervisor/initdb. Regression suites có census riêng.

Historical fixtures8580/7376 đã dispose R2.3A; không dispose lại theo stale PID. Tất cả R2.4 runs không execution-release.dpapi/release-issued.json. Root giữ10 files, không PGDATA/real marker.

## PART H — SOURCE HASHES

| File | SHA256 |
|---|---|
| scripts/phase13-5d1g-r22-native.cs | C0D530F558ABB6BF251AF5E46558A1621F948D7D8D467F7FC8D6B0E98E614F50 |
| scripts/phase13-5d1g-r24-native.cs | D5F35893F70C955B2B99318B40AFEB05BD879414092EEB5F27287FBDB2226528 |
| scripts/phase13-5d1g-r24-runtime.cs | 1B0E5C14908D9754471183C568350FF87164C0D57EF9B2B63370DF8DB554C4E6 |
| scripts/phase13-5d1g-r24-fixture.cs | FA2F273D4843BED2921AF22D962B93FB91BD401A0272C0BC525838DBA88224AE |
| scripts/phase13-5d1g-r24-gate.cs | 065D7AF9E99B50CF1A26398FB3062FA6D229AAE733F827F9E9EC02B7E49CE3E2 |
| scripts/phase13-5d1g-r24-policy.cjs | F108BFE96B9613A67330CFCAE022BED200CE18A6456E74B3C81C4826363347D4 |
| scripts/phase13-5d1g-r24-executor.cjs | 9396C5C3A46ED6F775CC9C3CE760A931E0DF80F65F4E5837D5C8992CDA52E081 |
| scripts/phase13-5d1g-r24-executor.test.cjs | E6211F6F80EF32C4C74623FE148BE3D956666D2E49393011F3A647AD38FE5E3A |

- Bundle: 57C7078AF5E34F2080E835E3FF64BC5C81388CBC6855C24E7025A090DD52D32C
- initdb17.2: 94FDD98979F268FE58198EFC02BB7C765D11E1EB827FAD0CA13B2DC1FA379BFC
- supervisor: 76E3E2E08AA13AF822844B06F3045EC783C3E0E161D9647118B1F83EB6CEBFAD
- fixture (synthetic/census): D497C88E32D7349A632635B5BC10E89B092FC74B04199C46253BA1EA86F97836
- postgres.exe: 94A8EA85CFFD4A15C21290CA555A06438D3F7621B001BEA6B1373C210D5A1746
- cmd.exe: 15CD209C995B7D3009C91CA40892D5B8F1FB162F3E5F10716642EA278E8E0D7B

Bất kỳ source/binary/manifest drift nào làm package không còn áp dụng; phải review/test/hash lại.

## PART I — EXECUTION APPROVAL PACKAGE

Package: build/phase13-5d1g-r24/execution-approval-package-r24-1793170167584-5b2b65bc.json

- Run: r24-1793170167584-5b2b65bc
- Manifest SHA256: 51A119BAABE2DB36FFCD1C422DA9583C7963E1B77E55F252D276F3814C39F82F
- Directory: C:\DATN\Project_datn\build\phase13-5d1g-r24\r24-1793170167584-5b2b65bc
- executionApproved=false; releaseIssued=false; approval reference chưa được cấp.

Invocation bên trong supervisor, KHÔNG chạy trực tiếp:

~~~text
"C:\Program Files\PostgreSQL\17\bin\initdb.exe" -D "C:\DATN\test-instances\phase13-5d1g\data" -U d1g_dba --pwprompt --auth-host=scram-sha-256 --auth-local=scram-sha-256 --encoding=UTF8 --locale=C --no-clean
Working directory: C:\DATN\test-instances\phase13-5d1g
~~~

Future workflow CHỈ sau approval mới: nạp proposal trong package, gọi Node API issueRelease(proposal,newReference); operator gõ exact phrase; xác minh release/outcome; gọi launchApproved(proposal). Entry points dùng closed environment. Không gọi supervisor với môi trường tùy ý. Không chạy workflow này trong preparation.

Đề xuất xác nhận riêng, CHƯA được cấp:

> Tôi phê duyệt R2.4 EXECUTION cho run r24-1793170167584-5b2b65bc, manifest SHA256 51A119BAABE2DB36FFCD1C422DA9583C7963E1B77E55F252D276F3814C39F82F, source bundle SHA256 57C7078AF5E34F2080E835E3FF64BC5C81388CBC6855C24E7025A090DD52D32C: đúng MỘT lần initdb trên target đã pin, nhập mật khẩu test trực tiếp; không start server, không SQL R1, không production. Timeout/UNKNOWN phải dừng, không retry và không xóa partial PGDATA.

Local public phrase template (reference mới phải liên kết approval thật, không dùng placeholder):

~~~text
APPROVE R24 r24-1793170167584-5b2b65bc 57C7078AF5E34F2080E835E3FF64BC5C81388CBC6855C24E7025A090DD52D32C ONE INITDB <NEW_R24_EXEC_REFERENCE>
~~~

Future marker: C:\DATN\test-instances\phase13-5d1g\initdb-attempt-r24-r24-1793170167584-5b2b65bc.json. Create-new, chứa run/manifest/bundle/maxAttempts/time; không overwrite marker cũ hoặc xóa để retry.

Fresh checklist: source/binary/manifest hashes; đúng operator/interactive console; root owner/DACL/reparse/exact10files; PGDATA/PG_VERSION absent;55435free; không unresolved attempts/processes; release unexpired; observer-ready trước ResumeThread. Tất cả thu mới tại launch.

Giữ mọi log/outcome/marker/failure, không secrets, không overwrite/delete. UNKNOWN/partial PGDATA cần quyết định riêng; không tạo run khác để retry. Native initdb password mechanism và PostgreSQL restricted re-exec/descendants thực tế chưa nghiệm thu; synthetic chỉ chứng minh executor policy. Không tự start server/SQL sau initdb.

## PART J — FINAL VERDICT

**PHASE13_5D1G_R2_4_EXECUTOR_APPROVAL_READY** — implementation offline hoàn tất, final351/351 PASS, run/hash đã pin. Không có execution approval mới/release trong phase này.

- SECOND_INITDB_ATTEMPT_NOT_PERFORMED
- REAL_INITDB_PASSWORD_INPUT_NOT_VERIFIED
- SQL_R1_NOT_EXECUTED
- POSTGRES_TEST_SERVER_NOT_STARTED
- LIVE_PRODUCTION_PREFLIGHT_NOT_PERFORMED
- BACKEND_RECOVERY_NOT_PERFORMED
- PRODUCTION_MIGRATION_NOT_PERFORMED
- PHYSICAL_PUMP_NOT_TRIGGERED
- REAL_INITDB_EXECUTION_REQUIRES_NEW_EXPLICIT_APPROVAL

Dừng tại R2.4; không tự chuyển execution, SQL R1, recovery hoặc phase khác.
