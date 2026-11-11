# Final supervised DEV historical Website acceptance

05/11/2026, UTC+7. **HISTORICAL_WEBSITE_UI_PARTIAL**.

Đã hoàn tất đúng một phiên: fresh integrity/native preflight, actual SQL READ ONLY, auth/CORS/API/frontend, bounded post-check và graceful cleanup PASS. Hai ảnh Edge thật xác nhận render, banner mới và TEMP chart; chưa đủ bằng chứng cho12historyrows/4charts/DeviceDetail/Dashboard/Reports/controls/Network. Không gọi thiếu evidence là application failure hoặc suy toàn bộ Website đã ACCEPTED.

## A. Approval, plan và attempt

Genuine approval: `C:\Users\Acer Swift3\.codex\attachments\489e7331-9873-44e9-bd96-3fbc22f48664\Pasted text.txt`.

Approval/private-copy SHA256: `cae85a5695c95973d2f8e6a63fd0d58b2adfcc6a4b31b6ebdbbd306c5d4321c1`.

Scope ONE_DEV_UI_ONLY_HISTORICAL_SESSION, maxSessions1, manualSeconds600, no retry/extension. Người dùng nhập Website DEV password qua Get-Credential, xác nhận “đã nhập”; không reset hoặc lấy password từ chat/file credential cũ. Reviewed transient UTF-8 stdin handoff giữ nguyên. Existing DEV-only app/JWT decrypt scope dùng theo reviewed plan, không production credential fallback.

Plan directory: `C:\DATN\test-instances\phase13-3b\ui-only-plan-1793882568230-4bc976a270f9`.

PlanFile `plan.json` SHA256 `1929e45e0a28eb39bf1906da6fe6b215d5d59f4ed8f7c589bf620b41482b42ca`. Approval copy/provenance/plan mới, protected sole-operator owner/DACL, no reparse; operator SID `S-1-5-21-1432835263-483988321-3159128977-1001`.

Run: `C:\DATN\test-instances\phase13-3b\ui-only-historical-1793882711517-295593e9e113`.

Approval-bound `ui-only-approved-cae85a5695c95973d2f8e6a63fd0d58b2adfcc6a4b31b6ebdbbd306c5d4321c1.attempt.json` và run attempt mới được tạo; **1/1 consumed**. Không reuse AX/AV/diagnostic approval.

Chỉ launcher `scripts/mvp-ui-only-session.ps1` chạy interactive PowerShell. Parent retained .NET Process handle để independently observe launcher completion; không alternate DEV lifecycle, không private harmless diagnostic thay native preflight.

## B. Fresh source/runtime integrity

Fresh pre-start review tool invocation `52a29f`, PID23196, native exit0:

- Active manifest revision9 SHA256 **2b23c8cd86f288d7ba5842e3f2850e37cbaf7f0221c1d8075a1f597d337e9af9**.
- **250/250 source hashes**, **4/4 binary hashes**, **3/3 listed offline-test hashes** PASS; đây là hash review, không chạy lại tests320.
- Exact previous file `PHASE_AE_UI_ONLY_SOURCE_MANIFEST.rev8.json`, revision8/hash **5fb515a8b55a634336752a5462c05143f2497f218e151988adfd5f8cdf0a83f4** PASS.
- Path containment/canonical identity, no duplicate/traversal/reparse PASS. Runtime sourceFiles membership được dựng tĩnh từ pinned SCRIPTS + recursive source trees và khớp250entries; sau đó existing launcher/supervisor checkPlan/validateApproval còn gọi actual runtime sourceFiles và kiểm pins trước lifecycle.
- Runtime constants equality với manifest PASS. Private root owner/protected sole operator ACE PASS; data NTFS được fresh native preflight kiểm riêng.

| Runtime binary | Verified SHA256 |
|---|---|
| Node | fdddbf4581e046b8102815d56208d6a248950bb554570b81519a8a5dacfee95d |
| pg_ctl | fc644446b0236e623e3e6fe2699446259efb8e61bd9aba838d6394a2be6987b8 |
| pg_controldata | 6896f8a705afb5cbaad843017d6d8aed5f5d76e32b3179e66750aaa5f193cc40 |
| postgres | 94a8ea85cffd4a15c21290ca555a06438d3f7621b001bea6b1373c210d5a1746 |

PowerShell binary pin `60c9b29843624dd8af6b6a7b26147753be6aeef65098b9a503cc50850afe410f` cũng khớp. Supervisor post-check lặp source/runtime comparison PASS; cuối cùng manifest hash không đổi. Không source/test/runtime/manifest patch.

## C. Actual native preflight

Fresh diagnostic evidence của **reviewed supervisor preflight**, không harmless target:

`C:\DATN\test-instances\phase13-3b\preflight-process-diagnostic-1793882712452-07ffc0`.

Manifest của preflight pin đúng approval mới, preflight source `A23A8AA468B967BC34366A575AB29902222AF6A340F865A7FF1A09B194F4917E`. Actual chain:

```text
Launcher16372 -> supervisor11344 -> preflight observer20008
    -> PowerShell outer16376 -> Node preflight8012
        -> pg_controldata11320
        -> PowerShell NTFS/listeners4692
```

| Boundary | Independent native outcome |
|---|---|
| Preflight PowerShell outer16376, parent20008 | exit0,12:45:12.558Z–12:45:16.237Z, timeoutfalse/stderr0 |
| Node8012, parent16376 | exit0, completion12:45:16.2054483Z, timeoutfalse/errornull/stderr0 |
| pg_controldata11320, parent8012 | exit0,12:45:13.376Z, timeoutfalse/signalnull/stderr0 |
| NTFS/listener helper4692, parent8012 | exit0,12:45:16.172Z, timeoutfalse/signalnull/stderr0 |

Node trace có checks-returned; existing classifier accepted D_ALL_NATIVE_EXITS_ZERO. Supervisor preflight stage completed12:45:16.284Z; parent native adapter accepted preflight observer exit0 trước cluster start. Không lấy stdout PASS hoặc harmless diagnostic trước làm bằng chứng này.

Facts: PGDATA `C:\DATN\test-instances\phase13-3b\data`, systemID **7698826681383327460**, state **shut down**, pinned PostgreSQL17 binaries; private root/data operator-only, owner matched, root protected, no reparse, DEVports0. Existing preflight giữ PG_VERSION/identity assertions; không initdb/migrate/seed/restore.

**Separate monitoring incident:** một invocation chỉ đọc marker/state (`776c0e`, session1543) in snapshot rồi tool host kết thúc `-1073741819` (`a7ae9e`). Không ghi invocation đó là nativePASS, không dùng nó xác nhận startup. Đây là invocation độc lập với launcher/supervisor/preflight chain nêu trên. Không query event logs, replay failed gate hoặc tự sửa; source faulting PID/module của monitoring invocation vẫn UNKNOWN. Metadata supervisor được đối chiếu lại từ saved artifacts bằng các read invocations native0. Sự cố này không chứng minh preflight children đã crash, và cũng không được xóa khỏi báo cáo vì Website đã render.

## D. PostgreSQL và six-path real READ ONLY

pg_ctl start PID14604 exit0,12:45:16.284Z–12:45:17.234Z. Existing adapter đối chiếu live postmaster/listener PID/start trước SQL; không ghi nhầm pg_ctl PID là postgres master PID.

Actual SQL snapshot stage12:45:18.766Z–12:45:20.177Z, post stage12:55:38.462Z–12:55:38.666Z, đều validated:

- Database **smart_agriculture_mvp_dev**, app role **sa_mvp_dev_app**, schema **public**, endpoint **127.0.0.1:55433**; exact control identity như trên.
- **11 migrations** với names/checksums/finished/not rolled back PASS theo reviewed frozen contract.
- **8 identities**:1farm/1zone/1device/4sensors/1actuator, đúng frozen mapping, không provisioning hoặc tạo trùng.
- **12 stored readings +12 derived units**, sourceMQTT, expected row/sensor IDs, recordedAt/receivedAt/finite values PASS trước/sau. Unit được suy từ authoritative sensor metadata, không bịa persisted unit column.
- Real READ ONLY **6/6 paths**: single,concurrent,batch,callback,nested,repository. Actual connection metadata đều `transaction_read_only=on`, db/role/port/schema đúng. Connection backend PIDs17388/21188; concurrent path dùng hai PID. poolVerification3transactions/readonlyon. Không dùng fake repository thay PostgreSQL.

| Sensor | Three values | Unit | RecordedAt UTC+7,02/11/2026 |
|---|---|---|---|
| TEMP_01 |30.2 /30.2 /30.2 |°C |19:11:18 /19:11:33 /19:11:48 |
| HUM_01 |72.5 /72.3 /72.4 |% |như trên |
| LIGHT_01 |5 /5 /5 |lux |như trên |
| SOIL_01 |100 /100 /100 |% |như trên; quality/calibration BLOCKED |

ReceivedAt frozen batches12:11:19.216Z/34.167Z/49.210Z. Actual validated snapshots chứng minh DB values; không dùng SQL PASS để đánh12UIrows PASS.

## E. API/CORS/auth/frontend

Actual dedicated API PID15580 bind55001; frontend PID20360 bind55173, loopback only theo owned listener assertions. Supervisor actual policy: MQTTdisabled, commandsfalse, automationfalse, testtrue,cap1 và memory-only audit; structured policyVerified=true. Không suy production policy từ DEV.

Đúng thứ tự:

1. API ready12:45:28.920Z.
2. OPTIONSlogin **204**, OPTIONSme **204**; exact Origin/method/headers/Vary, emptybody, no credentials/cache checks PASS.
3. One direct DEV POSTlogin **200**, authenticatedIdentityMatched/tokenReturned/responseOrigin/memoryAudit PASS; token không lưu trong báo cáo.
4. Structured preFrontend gate passed12:45:29.401Z; requests loginOptions1/readOptions1/login1, transactions/audit unchanged.
5. Frontend start sau gate, ready12:45:38.444Z.

Readiness/CORS/login không thay browser DOM/Network acceptance. OPTIONS ở đây là auth/login/me, **không** zone latest-readings.

## F. Manual window và thay đổi chỉ dẫn browser

Manual inspection **12:45:38.444Z–12:55:38.461Z** (19:45:38–19:55:38 UTC+7), configured600seconds, không gia hạn/retry. Operator được checklist/sensor values/time/aggregation/10PNG intake trước startup; agent báo FINAL_DEV_WEBSITE_MANUAL_BROWSER_READY sau kiểm evidence. Thời gian supervisor bắt đầu không bị reset khi thông báo READY.

Operator cung cấp hai ảnh mới và trả lời “đây”; không có full per-item attestation. Sau đó operator cho phép agent tự đăng nhập/kiểm tra Website, là thay đổi chỉ dẫn browser trong thời gian còn lại, **không** quyền mở rộng window/lifecycle. Agent đọc Browser skill và thử kết nối công cụ browser hiện có; connector không có browser để điều khiển. Không lấy được authenticated Edge tab, không thực hiện login/navigation/screenshot tự động hoặc mở alternative Playwright/Edge. Giới hạn được thông báo ngay; không lấy mật khẩu từ chat/config hoặc kéo dài phiên để khắc phục connector.

## G. Actual Edge evidence và verdict từng mục

Hai PNG mới được kiểm tra trực quan, signature/size và copy **nguyên byte** vào private run, hash source/destination khớp. Không crop/edit/tạo ảnh; không password/JWT/Cookie/Authorization thấy trong ảnh. Source ở `C:\Users\Acer Swift3\Pictures\Screenshots`.

| Private image | Original | Size / SHA256 |
|---|---|---|
|01-activity-banner.png |Screenshot2026-11-05 194857.png |172027bytes;6e2dcdc0fd6b8ab1222f0a799cc7d7360d8c2bf43645b5dfa9e6cfde340cdbfd |
|02-temp-partial.png |Screenshot2026-11-05 194945.png |118300bytes;f88557b311718fc711446f8fd0f4bc3e3a768da00a3083888cc641538a7bfff1 |

| Hạng mục | Kết quả | Evidence / thiếu gì |
|---|---|---|
| Actual Edge render | **PASS trong hai trang đã thấy** | Localhost55173, authenticated owner UI, layout/content bình thường; không Vite overlay/anchor drift trong ảnh |
| Historical banner / sidebar | **PASS** | Activity screenshot: banner đầy đủ trong content area, không bị sidebar che |
| Memory audit / stale / quality notices | **PASS cho banner** | Nêu12MQTThistorical/notLIVE, state không currentGPIO, memory-only audit, SOIL chưa hiệu chuẩn/không auto, controlslocked |
| History12rows | **PARTIAL** | TEMP hiển thị2rows đầy đủ19:11:48/33,30.2°C/sourceMQTT/received time; dòng thứ3 dưới viewport. Stats count3 không thay việc nhìn đủ3rows×4sensors |
| Charts4types | **PARTIAL** | TEMP: latest/min/avg/max30.2,count3,resolution2h và1meanpoint phù hợp. HUM/LIGHT/SOIL chưa có ảnh; HUM expectedmean72.4/min72.3/max72.5 chưa visualverify |
| Vietnam time / history read label | **PASS trong ảnh TEMP** | Recorded02/11/2026,19:11; nhãn “Lần đọc dữ liệu lịch sử19:49:28 5/11/26” không gọi fresh sensor sample |
| Device Detail | **NOT_VERIFIED** | Không ảnh mới; không reuse AT làm evidence phiên này |
| Dashboard/Reports | **NOT_VERIFIED** | Không ảnh mới; chưa visualverify latest cards/Reports wording sauAW |
| Historical/SOIL warnings tổng thể | **PARTIAL** | BannerPASS; chưa ảnh SOIL card/history hoặc Detail/Dashboard/Reports |
| Controls disabled visual | **NOT_VERIFIED** | Banner tuyên bố locked và actual APIpolicyPASS, nhưng không ảnh controls hoặc specific operator observation; không click để thử |
| Browser Network latest-readings | **NOT_VERIFIED** | Không method/status/response-shape screenshot hay observation cụ thể. OPTIONS NOT_OBSERVED; không tạo request để ép PASS |

Không ảnh phiên AT/AV/AS được tái sử dụng làm evidence mới. “Đây” không được chuyển thành12boolean alltrue. **Không tạo operator-acceptance.json giả**; supervisor manual.accepted=false/reasonMANUAL_WINDOW_EXPIRED. Thiếu ảnh không chứng minh ứng dụng sai, nhưng chưa đáp ứng final acceptance contract.

## H. Post-check và bounded comparison

Actual read-only post-verification completed12:55:38.666Z, validateSnapshot PASS, không mở SQL session mới ngoài reviewed lifecycle.

BeforeDigest = AfterDigest:

`17bea009981099eae108d0450adda101faea28836094b2cee00376c5776b6e3b`

Persisted ActivityLog **68→68**, migrations/8identities/12readings/12units/counts mapping giữ nguyên trong compared scope. Frozen safety counts enforced trước/sau: DeviceCommand0/PENDING0/enabledAutomation0/actuatorOn0. Memory-only login audit không thêm persistedActivityLog. Không tuyên bố bounded digest chứng minh zero writes trên mọi database object.

## I. Graceful cleanup / independent completion

| Boundary | Kết quả UTC05/11/2026 |
|---|---|
| Frontend20360 | Native0,12:55:39.108Z–39.309Z |
| API15580 / pools | Native0,12:55:39.310Z–39.645Z; reviewed no-other-clients gatePASS |
| pg_ctl smart stop3836 | Native0,12:55:39.645Z–39.849Z |
| Control shutdown / DEVports | Reviewed adapter checksPASS trước summary12:55:41.605Z |
| Supervisor11344 | Native**3**,unknownfalse,stderr metric0; known incomplete-manual policy |
| Launcher16372 | Independent retained-handle native**3**, creation12:44:59.0411739Z,OSexit12:55:41.7226644Z,observed12:55:41.7478513Z; timeoutfalse/errornull |
| Parent tool session73336 | Exit**3**, completion chunk8ea54a; không masked thành0 |

Supervisor native metadata `stdoutBytes=85/stderrBytes=0` là tên metric legacy từ StreamReader string.Length của launcher, không khẳng định UTF8byte count độc lập. Không credential/stdout content được xuất ra báo cáo. Code3 là đúng policy cho chưa đủ manual checklist; **không native crash/accessviolation hoặc cleanup failure**.

Independent read12:56:29.3637403Z, native0 (`b7babc`): zeroDEVlisteners55433/55001/55173, launcher/supervisor/API/frontend knownPIDs đều absent, postmaster.pid absent; private run operator-owned/protected, manifest unchanged. Không force-kill hoặc stop foreign process. **Graceful cleanup PASS**. Không mở lại Website sau cleanup.

## J. Evidence hashes

| Artifact trong private run | SHA256 |
|---|---|
| summary.json |6f685cfc447a73e703094a550921f6b6fa47053ee8569ea7e2c10aa144d9f791 |
| attempt.json |41f5d1f42bb5f50657709032a7157ab45f41f238355ef82f0a260d4c66447c84 |
| supervisor-native-exit.json |358d5e8d98530683f9306cd6301cd854da9f7acf1955f456307a9cff0423ac96 |
| independent-post-cleanup.json |191d4569f2301e5f27c4b93e6a4dadc5d87b00aeb6d3c120f257e9f08eb46f52 |
| screenshot-intake-01.json |e14e20d07b5706f74e5b4a8017aebc8d89f5876d7eb3e492ae49fbdee7e5c5d2 |

Launcher independent start/exit và approval/source review/provenance giữ trong plan directory; preflight process records giữ riêng tại mụcC. Không overwrite evidence hoặc historical report.

## K. Remaining work và safety

Backend/SQL/auth/CORS/Vite render của các trang đã xem hoạt động trong phiên DEV. Phần thiếu để chốt final historical UI là **coverage/evidence**, đặc biệt12UIrows,4charts,Detail/Dashboard/Reports labels, disabled controls và Network. Không cần thêm cluster, migration production hoặc feature mới để giải quyết các mục này. Browser automation connector không khả dụng trong phiên không chứng minh lỗi ứng dụng.

Nguyên nhân crash AX và monitoring invocation riêng vẫn UNKNOWN; native preflight thực của phiên này đã PASS, không tuyên bố lỗi Windows đã sửa vĩnh viễn. SOIL chưa hiệu chuẩn, automatic physical/VERIFIED_LIVE giữBLOCKED. Không dùng SOIL100 để tưới tự động.

Không production startup/access, migrations/seed/restore/initdb, credential reset/rotation, broker/ACL changes, MQTT CONNECT/SUBSCRIBE/PUBLISH, DeviceCommand, ON/OFF, automation enablement, ESP32reset/flash hoặc power actions. Current production flags/health/PENDING không được xác minh bằng DEV này. Không source/runtime/manifest patch, hotfix/retry/windowextension. Chỉ report/private plan/evidence được tạo.

## L. Final status

```text
SMART AGRICULTURE — FINAL DEV WEBSITE ACCEPTANCE
Approval: APPROVED
Attempt: 1/1
Manifest revision9: PASS
Native preflight: PASS
PostgreSQL DEV: PASS
11 migrations: PASS
Real READ ONLY 6/6: PASS
8 identities: PASS
12 readings/units: PASS
API readiness: PASS
CORS204/204: PASS
Direct login200: PASS
Frontend readiness: PASS
Actual Edge render: PASS (observed pages)
History12rows: PARTIAL
Charts4types: PARTIAL
Device Detail: NOT_VERIFIED
Dashboard/Reports: NOT_VERIFIED
Historical/SOIL warnings: PARTIAL (banner PASS)
Controls disabled: NOT_VERIFIED visually (API policy PASS)
Network latest-readings: NOT_VERIFIED
Database comparison: UNCHANGED (bounded scope)
ActivityLog: UNCHANGED (68 -> 68)
Graceful cleanup: PASS
MQTT: 0 ACTIONS BY AGENT
DeviceCommand: 0 ACTIONS BY AGENT
Pump ON/OFF: 0 ACTIONS BY AGENT
Automation: NOT_ENABLED BY AGENT
FINAL: HISTORICAL_WEBSITE_UI_PARTIAL
```

Attempt consumed1/1. STOP; không tự chạy lại Website, diagnostic hoặc phase tiếp theo.
