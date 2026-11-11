# Phase13.5D.1C — Offline backend recovery launcher implementation

Ngày25/10/2026, UTC+7. Approval: attachment `a45fc6b3-71f5-435b-bd0d-2b9f0a9d9afc`, OFFLINE TOOLING IMPLEMENTATION & TESTING ONLY.

## PART A — FILES CREATED

| File | Mục đích |
| --- | --- |
| `scripts/phase13-5d1c-launcher.cjs` | PLAN_ONLY default; single-attempt synthetic adapter; lifecycle/identity/evidence; pure mock recovery/runtime contract checks |
| `scripts/phase13-5d1c-console-host.ps1` | Private hidden Windows console; synthetic child ownership; bounded stdout/stderr capture; console SIGINT; wrapper lease protection |
| `scripts/phase13-5d1c-synthetic-child.cjs` | No imports/network/database; readiness, fake resource, SIGINT handler, voluntary exits and finite negative fixtures |
| `scripts/phase13-5d1c-launcher.test.cjs` |21 offline unit/lifecycle tests, including real Windows synthetic processes |
| `report/phase13-5d1c-offline-launcher-summary.json` | Sanitized counts/hashes/results; no runtime production data |
| This document | Scope, evidence, limits and future approval boundary |

Không sửa bất kỳ file đã tồn tại trước phase này. Không thay server.ts, .env, MQTT policy, firmware, services/tasks hoặc Git index/history. Test-generated directories dưới `build/phase13-5d1c-offline/` chỉ chứa synthetic output và compiler temp files; chưa được duyệt cho secrets hoặc production logs.

## PART B — LAUNCHER ARCHITECTURE

Default CLI:

```powershell
node scripts/phase13-5d1c-launcher.cjs
```

Chỉ trả `PLAN_ONLY`, launched=false, productionAuthorized=false; không tạo attempt. CLI có argument bị từ chối. Programmatic execution chỉ có `SYNTHETIC` với approval token offline cố định. Đây không phải token cấp quyền production. Mode PRODUCTION luôn bị từ chối.

Production execution adapter CHƯA được triển khai. Không có nhánh gọi backend/src/server.ts, npm, PostgreSQL, MQTT hoặc HTTP. Vì vậy OFFLINE_LAUNCHER_READY không có nghĩa có thể đổi mode/approval để startup production.

### Ownership / evidence

- Run ID bị giới hạn ký tự; directory mới độc quyền, kiểm ancestor symlink/junction; existing run => STOP.
- Attempt create-new trước launch; một console host / một synthetic child mỗi run, không retry.
- Record wrapper PID/start, host PID/start ticks, child PID/start ticks, executable, fixture/helper hashes và parent relationship.
- Child READY phải khớp nonce và PID. Nonce chỉ là correlation fixture, không phải secret/authentication credential.
- State snapshots create-new theo sequence: STARTING -> RUNNING_UNVERIFIED -> VERIFIED -> EXITED/FAILED; MONITOR_LOST khi mất bằng chứng.
- Mọi state ghi mode SYNTHETIC/proof OFFLINE_FIXTURE_ONLY. Listener ownership là NOT_APPLICABLE_NO_NETWORK; không bind port5000 hoặc bất kỳ socket fixture nào.
- Pure observedState từ chối missing/future/stale heartbeat, identity thiếu, PID reuse và exit identity mismatch. VERIFIED không được suy từ stale state file.
- Host heartbeat append-only; wrapper heartbeat lease được host kiểm bằng monotonic stopwatch. Sau2giây mất lease, host chỉ gửi graceful signal tới own verified child, không restart.
- Startup readiness deadline hữu hạn; monitor tổng12giây, graceful-stop deadline700ms trong fixture. Đây là tham số test, không phải timeout production đã nghiệm thu.
- Child stdout/stderr riêng, tối đa1MiB/stream, flush từng block. Helper stdout/stderr dùng file handles riêng và capture exit code. Không có pipes chờ descendant EOF ở tầng helper capture.
- Host JSON metadata được ghi/flush vào create-new pending file rồi atomic File.Move, không overwrite destination. Reader không coi incomplete JSON là readiness; monitor deadline vẫn hữu hạn.
- Environment gửi helper/child chỉ gồm hệ thống cần thiết và TEMP/TMP của run. Không đọc .env; không truyền NODE_OPTIONS, DATABASE_URL, JWT/MQTT credentials từ environment kế thừa.

Pure `assessRecoveryContract`/`verifyServingEvidence` chỉ kiểm DTO mocks: exact DB target/systemID,11migrations/PENDING0, fresh physical confirmation, process/port/broker prerequisites và safe flags/cap/gateway/listener identity. Chúng KHÔNG thu evidence live, không xác thực nguồn input và luôn không cấp production authorization.

## PART C — GRACEFUL STOP VERIFICATION

### Cơ chế Windows đã chạy thực tế

1. PowerShell helper mới detach CHÍNH NÓ khỏi console kế thừa, allocate console riêng, ẩn window.
2. Cài custom Ctrl-C handler cho host, KHÔNG dùng inheritable ignore-Ctrl-C flag.
3. Start Node fixture chia sẻ console riêng; fixture cài process.on('SIGINT').
4. Trước signal, kiểm child PID + exact start ticks, console member count đúng2 và members chính xác host+child.
5. GenerateConsoleCtrlEvent(CTRL_C_EVENT,0) chỉ trong console riêng đó.
6. Node nhận SIGINT, clear fake interval resource, ghi RESOURCE_CLOSED và tự process.exit(0).
7. Host drain stdout/stderr có timeout, ghi exit code/timestamp. Không dùng Stop-Process/taskkill/.Kill/process.kill.

### Bằng chứng final suite

Root `build/phase13-5d1c-offline/test-1792944465845-d728be-*`.

| Case | Run suffix | Bằng chứng |
| --- | --- | --- |
| Graceful | -3 | child12572/host15416; console đúng2members; SHUTDOWN_SIGNAL:SIGINT -> RESOURCE_CLOSED; child0/host0; no self-expiry/force-kill |
| Wrapper lease lost | -9 | child24560/host9848; WRAPPER_HEARTBEAT_LOST; graceful child0; overall MONITOR_LOST, không restart |
| Wrong identity | -10 | stop request bị từ chối; không signal; fixture tự hết hạn exit23 |
| Signal ignored | -11 | có SIGINT nhưng không đóng fake resource; timeout được ghi; tự hết hạn exit23; KHÔNG gọi đây là graceful success |

Sau final suite:9synthetic runs đều có child exit và host exit; host exit0; không còn process khớp exact recorded PID/start của9host+9child. Negative fixture self-expiry là cơ chế giới hạn test, không phải graceful stop và không được suy thành fallback production.

Windows SIGINT delivery/resource closure đã verified trên synthetic Node child. Chưa verified shutdown Prisma/MQTT/HTTP của backend thật, hoặc behavior khi đổi console host/toolchain. Không claim đã thử backend.

## PART D — OFFLINE TEST RESULTS

Final command:

```powershell
node --test scripts/phase13-5d1c-launcher.test.cjs
```

**21 tests /21PASS /0FAIL /0SKIP /0CANCEL; native exit0; duration21850.0113ms.**

Coverage:

1. Default PLAN_ONLY không launch/tạo attempt.
2. Production mode, missing/old approval bị từ chối.
3. Child/credential options ngoài allowlist bị chặn.
4. Path traversal/arbitrary scenario bị chặn.
5. Missing identity/PID reuse/start/executable/host mismatch.
6. Missing/future/stale heartbeat và process absence.
7. Exit status đúng identity, không dùng exit evidence PID reuse.
8. Create-new không overwrite bytes cũ.
9. Partial JSON không cấp evidence.
10. Real Windows synthetic SIGINT/resource closure/exit0.
11. Spontaneous exit0, capture đủ tail cả2streams.
12. Exit7 preserved, không restart.
13. Separate stdout/stderr, inherited synthetic secret canary không leak.
14. Duplicate attempt không launch/overwrite.
15. Startup timeout và graceful fixture cleanup.
16. Wrapper heartbeat lease loss.
17. Wrong-stop identity refused, không signal nhầm.
18. Graceful-stop failure/timeout không bị gọi thành PASS.
19. Pre-start safety contract negative mocks.
20. Serving identity/listener/effective runtime mocks.
21. PowerShell AST và source no-force-kill/no-production calls checks.

Node --check PASS cho cả3CJS; default CLI thực tế trả PLAN_ONLY không launch.

### Failures giữ nguyên trong lịch sử

- Initial implementation:20/20PASS.
- Hardening run prefix `test-1792944396899-bdae36`:18/20PASS,2FAIL do monitor đọc JSON trong lúc helper đang ghi (Unexpected end of JSON input).
- Sửa atomic host metadata publication và fail-closed bounded reader; bổ sung regression partial JSON; final21/21PASS như trên.
- Các run directories/error context/attempt hashes được giữ, không xóa hoặc sửa failure thành PASS. Không retry production: mọi lần launch là synthetic fixture của test run mới.

Không chạy domain regression528tests, backend startup hoặc database tests. Không có live preflight trong phase này. No-network claim dựa vào fixed fixture/no network imports + sanitized environment + source checks; chưa packet-capture hoặc OS firewall sandbox mọi child. Không gọi đây là sandbox chống malicious executable.

## PART E — ARTIFACT INTEGRITY

| Source | SHA256 final |
| --- | --- |
| scripts/phase13-5d1c-launcher.cjs | 051EE903D7B7988E6FF151459EE6DB0451768A19BDF826B78187906CF628C75A |
| scripts/phase13-5d1c-console-host.ps1 | C9810B5D56A34C9AC46CA65E51CE2ED12F5333950A1DD3D877C2685575617EA3 |
| scripts/phase13-5d1c-synthetic-child.cjs | DB97A4BB4FCA87E9231DDC1B5D39AB75A662FCE240E544C192669DDC1BA904CF |
| scripts/phase13-5d1c-launcher.test.cjs | 990BCC218E2DF5987C033C432B974065D3845F4E5A0A7BBEAADDA31B63AC9E10 |

Hash chỉ pin source tooling offline; không là approval startup. Không hash/config credentials hoặc đọc production passwordfile.

## PART F — SAFETY REVIEW

- Chỉ các file mới của phase này được tạo/sửa; không sửa application startup/firmware/config hoặc file phase cũ.
- Không import server, Prisma/dotenv/MQTT, không endpoint/DB connections, không process/service/task/firewall changes.
- Không kiểm live flags bằng file .env; current runtime vẫn NOT_VERIFIED trong phase này.
- Không cấp production authorization từ contract fixtures, historical attestation hoặc approval C.3.
- Không bật command/automation, không MQTT publish/ON/OFF, không cấp nguồn bơm.
- Test temp/compiler/evidence chỉ dưới dedicated offline fixture root; root không được coi private production storage/cloud scope verified.

## PART G — FUTURE CONTROLLED RECOVERY PLAN

Chưa có production adapter/startup branch. Cần scope riêng để xây dựng/review adapter: exact serving process/preflight evidence collector, private log storage/ACL, approved environment, backend entrypoint, grace-stop integration và approval reference mới. Không đơn giản đổi SYNTHETIC thành PRODUCTION.

Trước actual startup: fresh operator power-disconnected confirmation; no existing backend/port5000; approved SELECT-only PG5432 identity/system/migration baseline/command count/PENDING0; đúng LAN broker; safe environment false/false/testtrue/cap1; artifact hashes và private run storage.

Approval startup phải bao gồm recoverMqttCommands DML (all MQTT PENDING ->FAILED; configured actuator with MQTT history ->UNKNOWN khi commandsfalse) và normal ingestion/watchdog/alert/automation-metadata writes, không migration/seed/forcedOFF. Nếu PENDING trướcstart khác0, STOP để điều tra, không dùng recovery để dọn pending.

Post-start acceptance future: exact PID/start/listener + fresh attestation; health DB/MQTTconnected; gatewayDISABLED/controlfalse; commandcount không tăng/PENDING0;3new telemetry batches12readings và3fresh PERIODICOFF sau observer reset, DB/API correlation. Không dùng retained/history, không reset/flash/publish OFF giả. Protected API needs legitimate read access; không loginPOST/bypassRBAC ngoài approval.

Nếu native start/identity/flags/heartbeat/stop không đạt: không retry. Chỉ graceful stop đúng owned child được approval cho phép; nếu timeout không force kill tự động. Không chuyểnD.1/D.2/migration chỉ vì offline tests PASS.

## PART H — VERDICT

```text
PHASE13_5D1C_OFFLINE_LAUNCHER_READY
WINDOWS_SYNTHETIC_GRACEFUL_STOP_VERIFIED
OFFLINE_TESTS_PASS=21/21
PRODUCTION_EXECUTION_ADAPTER_NOT_IMPLEMENTED
PRODUCTION_STARTUP_NOT_AUTHORIZED
BACKEND_RECOVERY_NOT_PERFORMED
PRODUCTION_DATABASE_NOT_MODIFIED
PRODUCTION_MIGRATION_NOT_PERFORMED
NO_PRODUCTION_RUNTIME_CHANGES
PHYSICAL_PUMP_NOT_TRIGGERED
```

STOP sau offline implementation/testing. Không tự chạy startup hoặc live preflight.
