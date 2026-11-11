# Phase AI — Offline Native Completion Diagnosis & UI-Only Safety Gate Completion

Ngày báo cáo: 03/11/2026, UTC+7. Phạm vi: đọc bằng chứng, sửa nguồn DEV-only tối thiểu và tests offline. Không thực thi lại AH.

## A. Phase AH failure evidence

[AH](MVP_PHASE_AH_UI_ONLY_ACCEPTANCE.md) giữ nguyên **HISTORICAL_WEBSITE_UI_BLOCKED**. Lệnh baseline đã xuất matching observations 250 sources/4 binaries, nhưng tool completion `-1073741819` (`0xC0000005`). Không dùng stdout để thay exit verification.

Đã tìm timestamp thật trong local session journal, chỉ trích metadata liên quan, không sao chép hội thoại/credentials:

- Call ID: `call_d175512db19247c1b6f167e26740cad6`.
- Tool request UTC: **2026-11-02T18:23:33.255Z**.
- Tool result UTC: **2026-11-02T18:23:40.806Z**.
- Đây là **01:23:33–01:23:40 ngày03/11/2026 UTC+7**.
- Không có independent outer/Node PID và child exit riêng trong record này.

Không dựng timestamp từ file report. AH không tạo attempt/run hoặc startup. AI không thay lịch sử AH.

## B. Native process boundary analysis

Exact invocation là inline JavaScript trong PowerShell here-string, truyền bằng `@' ... '@ | node` trong `exec_command`; không có standalone baseline script file. PowerShell tạo native Node child và truyền stdin. Script đọc/hash filesystem và import runtime modules không tự startup; không gọi actual `preflight()` hoặc native PostgreSQL executable. Source không load Prisma client/engine trong bước baseline.

Inline script không giữ process handle hoặc gọi `WaitForExit()` để ghi independent native exit của Node. `$LASTEXITCODE` riêng của Node không được lưu; tool trả completion của shell invocation. Do đó không thể suy rằng Node crash chỉ vì tool result nonzero, hoặc outer PowerShell crash chỉ vì JSON đã flush.

Không có bằng chứng cụ thể lỗi encoding, stream Dispose hoặc cleanup nào trong source gây access violation. Không sửa Windows/Node/PostgreSQL, không thay exit assertions hoặc thêm `process.exit(0)`.

Đã đối chiếu Q/R và helpers: R từng tách Node observer → outer PowerShell → preflight Node → hai native children; `mvp-native-exit.cjs` giữ native `exit` độc lập với descendant pipe EOF. Đây là design/reference evidence, không phải một lượt chẩn đoán mới. Giữ nguyên native launcher và helpers hiện hành vì chưa chứng minh source defect gây crash AH.

## C. Event 1000/1001 và WER correlation

Đọc Application log trong exact bounded window **2026-11-02T18:23:20Z–18:24:00Z**: **CRASH_EVENT_NOT_FOUND_IN_AH_WINDOW** cho IDs1000/1001 bằng quyền hiện tại. Không mở rộng thành quét toàn bộ event log.

Read-only WER metadata có một ReportArchive directory trong window, ReportQueue không có directory khớp:

| Trường WER | Kết quả |
| --- | --- |
| EventType | APPCRASH |
| EventTime UTC, chuyển từ FILETIME | 2026-11-02T18:23:35.3649042Z |
| Application | powershell.exe / Windows PowerShell |
| AppPath | C:\WINDOWS\System32\WindowsPowerShell\v1.0\powershell.exe |
| Fault module | ntdll.dll |
| Exception | c0000005 |
| Report ID | c236f626-eccd-4c7f-8d04-23cb967897d8 |
| PID/parent link với AH | Không có bằng chứng liên kết |

WER xác nhận một PowerShell crash xảy ra cùng thời điểm, **chưa đủ gán nó cho outer process của AH** vì không có PID/start-time relationship đã ghi. Không đọc dump, nâng quyền, sửa WER/registry hoặc tạo deliberate access violation.

## D. Root cause và native diagnostic preparation

**NATIVE_FAILURE_BOUNDARY_UNDETERMINED**. PowerShell/ntdll crash là candidate correlation mạnh về thời gian; root cause, Node native exit và tool-host boundary vẫn chưa chứng minh. Không kết luận Prisma, PostgreSQL, MQTT, firmware hoặc pipeline cleanup gây lỗi.

Thêm offline-only `scripts/mvp-ui-native-boundary.cjs`:

- Pure classifier chỉ dùng independent native completion + PID relationship, không dùng stdout.
- Phân biệt child failure, outer failure, tool completion failure hoặc unknown.
- Injected observer preparation dùng whitelist metadata, giữ actual abnormal code/signal, deadline hữu hạn tối đa45s, không retry/kill, không phản chiếu raw errors/secrets.
- **Không có real native adapter hoặc CLI tự chạy**; tests chỉ inject fake process evidence. Không wire vào runtime/launcher.

Native completion remediation: **BLOCKED**; observer classifier/one-shot protocol đã chuẩn bị offline, không tuyên bố crash đã được chữa.

## E. Minimal source changes

Không sửa backend production, schema, firmware, server.ts, broker hoặc PostgreSQL binaries. Active source changes chỉ gồm:

| File | Thay đổi |
| --- | --- |
| scripts/mvp-ui-only-readonly.cjs | Coverage gate dùng chính readonlyPrisma, verify sáu paths và attestation |
| scripts/mvp-ui-only-api.cjs | Chạy coverage + actual repository probe trước load app/listen; trả attestation |
| scripts/mvp-ui-only-worker.cjs | Guarded persisted ActivityLog count; chuyển coverage evidence qua IPC |
| scripts/mvp-ui-only-runtime.cjs | Giữ coverage evidence trong API lifecycle result |
| scripts/mvp-ui-only-supervisor.cjs | Require coverage; require persisted count; exact audit comparison và summary metadata |

Fixtures AE được cập nhật để cung cấp coverage/audit metadata mới. AG lineage test chuyển sang immutable revision-3 snapshot để tiếp tục kiểm tra lịch sử 2→3, không áp các expectations revision3 vào active revision4. Real-filesystem audit vẫn kiểm tra active manifest và binaries. Thêm `scripts/mvp-ui-ai.test.cjs` cho coverage/audit/native classification. Không nâng expected hashes để retry AH.

## F. Read-only transaction coverage

API tạo một coverage gate từ **exact factory-registered raw datasource**. Proxy đó cũng được install vào actual application repositories. Không tạo alternate PrismaClient/pool.

Trước khi load app/listen, future session phải hoàn tất:

| Path | Probe và transaction behavior |
| --- | --- |
| Single | Scoped SensorReading count |
| Concurrent | SensorReading + Device counts; mỗi operation có guarded transaction riêng |
| Batch | Proxy `$transaction([read, count])`, cùng verified transaction |
| Callback | Proxy `$transaction(tx => read)` |
| Nested | Nested proxy callback tái sử dụng transaction đã verified; không tạo nested native Prisma transaction/savepoint/pool |
| Repository | Actual `sensorReadingRepository.list()` qua installed proxy và batch transaction |

Mỗi transaction dùng READ ONLY trước domain reads, `SET LOCAL statement_timeout='5000ms'`, RepeatableRead, maxWait2s, transaction timeout8s; cùng transaction xác minh DB `smart_agriculture_mvp_dev`, role `sa_mvp_dev_app`, port55433, schema public, readonly on và backend PID. Callback metadata chỉ chứa identity/PID/readonly, không row contents hoặc secrets.

Source call graph: `sensorReadingRepository.list/statistics` thực sự dùng array `$transaction`; activity-log listing cũng dùng array transaction. Callback/nested là supported proxy paths được exercise rõ ràng để nghiệm thu, không giả rằng application hiện đang cần nested native transactions. Actual repository probe import sau boundary installation và trước app creation; không fake repository trong real mode. Coverage failure chặn listen ngay trong API library; supervisor còn require attestation trước frontend readiness.

Attestation lưu từng path và số transaction/observed connection IDs; không hứa concurrent pool luôn dùng hai physical connections khác nhau. Các ORM/raw/mutation escape restrictions giữ nguyên. Tests không mở connection thật.

**READONLY_COVERAGE_OFFLINE_PASS**; actual PostgreSQL behavior và privilege compatibility vẫn NOT_VERIFIED.

## G. Persisted ActivityLog baseline/post-check

Schema thực tế: Prisma `ActivityLog`, mapped table `activity_logs`; `activity-log.repository.ts` đã dùng `prisma.activityLog.count`. Không tạo tên bảng/cột mới.

Worker snapshot lấy **`tx.activityLog.count()`** trong guarded READ ONLY transaction trước API startup và sau manual window. Lỗi query/invalid count → `AUDIT_PERSISTENCE_BASELINE_BLOCKED`; không substitute0, không sửa DB grants. Chỉ đọc count, không lấy audit row body.

Supervisor require safe nonnegative integer; lưu `auditPersistence.before/after` trong summary và kiểm tra **exact equality** trước full snapshot digest comparison. Count tăng hoặc giảm đều fail post-check. Memory-only audit counter vẫn độc lập, production audit không bị vô hiệu hóa. Không phát sinh audit event thật trong AI.

**AUDIT_PERSISTENCE_BASELINE_OFFLINE_PASS**; real SQL query/permissions chưa nghiệm thu.

## H. Offline tests và native completion

**158/158 PASS**, fail/cancelled/skipped0, test runner native exit0, signal/error null:

- 129 tests AG/AE/preflight regression, với fixture/lineage updates nêu trên.
- 25 tests AI: ordered readonly paths, seven connection identity failure positions, repository actual method body under injected proxy, failure-before-listen, query/write/raw refusal, persisted audit/error/wrong-DB, independent RAM audit, native classification/redaction/deadline/no retry.
- 4 supervisor cases thêm: persisted count tăng/giảm, thiếu audit baseline, thiếu coverage attestation.

```powershell
node --require ./scripts/acceptance-offline-guard.cjs --test --test-concurrency=1 --test-reporter=tap scripts/mvp-ui-ai.test.cjs scripts/mvp-ui-only-pin-audit.test.cjs scripts/mvp-ui-only-supervisor.test.cjs scripts/mvp-ui-only.test.cjs scripts/mvp-ui-launcher-exit.test.cjs scripts/mvp-edge-smoke-observer.test.cjs scripts/mvp-edge-smoke-analysis.test.cjs scripts/mvp-browser-startup-diagnosis.test.cjs scripts/mvp-preflight-boundary.test.cjs
```

Final evidence: `build/phase-ai-final-1793644614837/` gồm `regression.tap`, `stderr.txt`, `outcome.json`, `integrity.json`, `provenance-revalidated.json`, `native-correlation.json`. TAP SHA256: `5d5bce0cee2e837b2ab3aea9ef2a2aa7d3fa5fe7921d02f7632749511881a654`; stderr rỗng. Intermediate offline evidence giữ tại `build/phase-ai-offline-1793644458106/`; không overwrite.

Node syntax changed/new sources PASS, native0. PowerShell source không đổi; AST/helper regression PASS trong suite. Backend `tsc --noEmit` và frontend `tsc --noEmit --incremental false` đều native exit0. Typecheck chỉ kiểm tra mã nguồn, không kết nối database hoặc chạy services. Tests chỉ mở synthetic Node/PowerShell helper processes theo suites đã review; không real Edge, HTTP server, PostgreSQL hoặc MQTT.

## I. Manifest revision 3 → 4 và hashes

Revision3 giữ nguyên byte tại `docs/PHASE_AE_UI_ONLY_SOURCE_MANIFEST.rev3.json`, SHA256 `9dba4f40586e31db45f8fac63147d71875bb6260d8a66fa75df9b656460cbc8a`. Revision2 snapshot và reports AE/AF/AG/AH không sửa.

Active manifest `docs/PHASE_AE_UI_ONLY_SOURCE_MANIFEST.json`: revision **4**, version/schema1, purpose **SOURCE_PINS_ONLY_NOT_EXECUTION_APPROVAL**. Exact250members giữ nguyên; chỉ năm active source hashes ở E và hai existing offline-test hashes cập nhật theo reviewed changes. Hai new offline helper/test không là execution dependencies nên không thêm source membership. Four runtime pins **không đổi**, bao gồm corrected postgres.exe pin AG. Lineage `previousManifestFile/Sha256` trỏ exact revision3; không self-reference.

Final manifest SHA256:

**`b0c8974c6c4244652951963cae28f4eb9d56f07a562de9e32df6c5e16a015d56`**

| File | SHA256 |
| --- | --- |
| mvp-ui-only-supervisor.cjs | 5317d2a1a6bb23642eb94e9d64ecbe88c1f3bb8f6eb18b593b760bb6fa12dca3 |
| mvp-ui-only-runtime.cjs | 0f2ad283971e699fa2a9e5c6a6a66353301a29389e39d4b18c4fea5d17c7f1dd |
| mvp-ui-only-worker.cjs | 46c143cbe78ed9d4d5ce3cfd945c373562e51801be46e96f762987f0f7624e59 |
| mvp-ui-only-readonly.cjs | ad137e3437d32d254b6f79fb092ec2175b35b9082e381b681cae191fcdf60e9c |
| mvp-ui-only-api.cjs | 3266319dba8ec06e6e5eff231912b5c01803740c02c74b8b46ee7dabec52fc59 |
| mvp-ui-native-boundary.cjs | b2f6206df966fe0de10c8616e76ae17be6335244888356c9bbdb52cd9acfffd5 |
| mvp-ui-ai.test.cjs | a1cd22f3918ace34eccd12d873ed440df550991098579c624f3934bf11fca83f |

Final audit revalidated 250/250 source hashes, membership/canonical/duplicate/traversal/reparse, revision lineage, 4/4 runtime hashes và historical AG provenance continuity bằng dữ liệu Y. Không chạy actual AH preflight hoặc PostgreSQL binaries để kiểm tra hash.

## J. Safety / no-live-actions

Không AH supervisor/launcher, baseline invocation replay, PostgreSQL startup/connect, pg_ctl start/stop, API/frontend/browser/MQTT, production access, DeviceCommand/ON/OFF, Automation, migrations/seed/restore, credentials/broker/ACL changes hoặc ESP32/hardware actions. Không decrypt credentials hoặc đọc database row contents. Tám identities và 12 readings không được truy cập/sửa qua DB. Giữ `SOIL_SENSOR_QUALITY_BLOCKED` và `AUTO_IRRIGATION_PHYSICAL_NOT_EXECUTED` cho phạm vi đang nghiệm thu.

Không tuyên bố current runtime flags/PENDING đã xác minh chỉ từ source. Không dùng synthetic success để nâng trust hoặc Website acceptance.

## K. Remaining blockers và final classification

```text
PHASE AI RESULT

Native failure boundary: UNDETERMINED
Native completion remediation: BLOCKED
Read-only coverage: OFFLINE_PASS
ActivityLog baseline: OFFLINE_PASS
Manifest: NEW_REVISION_VERIFIED (revision 4, 250/250)
Runtime binary hashes: 4/4 PASS
Offline regression: 158/158 PASS
Real PostgreSQL: NOT_STARTED
Real API/Frontend: NOT_STARTED
Browser: NOT_EXECUTED
MQTT CONNECT: 0
DeviceCommand: 0 actions by Agent
Automation: NOT_ENABLED
Soil quality: BLOCKED
Final readiness: READY_FOR_SEPARATE_NATIVE_DIAGNOSTIC_APPROVAL
```

Không tuyên bố READY_FOR_NEW_UI_ONLY_APPROVAL: native completion vẫn thiếu independent process evidence. Actual SQL guard, repository read/audit privileges, frozen data baseline, auth/browser/manual screenshots/post-check và cleanup chưa nghiệm thu thực tế.

## L. Minimal next-step recommendation

Đề xuất **một diagnostic riêng chỉ đọc filesystem**, không live acceptance: independent Node observer → dedicated PowerShell `-File` host → Node `-File` baseline hash-only target. Dùng process handles/native exit observation đã review từ R; file-based source transport tránh opaque inline stdin pipeline như một diagnostic design, **không gọi đó là fix root cause**. Hash-only target không gọi original PostgreSQL preflight/control helpers hoặc startup.

Phiên diagnostic tương lai phải review/pin exact observer/outer/target files và revision4; fresh private operator-only directory, new approval/attempt create-new, finite deadlines. Outer ghi Node PID/native exit riêng; observer ghi outer PID/native exit riêng, parent relationships/start/end/error/signal/timeout và đối chiếu tool completion. Giữ nonzero/unknown, không retry/kill. `mvp-ui-native-boundary.cjs` là tested classifier/injected protocol; **real transport binding chưa được thực thi hoặc chứng nhận**. Không chạy trực tiếp existing R `--node-preflight` để thay cho hash-only target vì nó có PostgreSQL control actions ngoài đề xuất này.

Chỉ sau khi native completion được phân biệt bằng evidence độc lập mới xét một approval UI-only mới với manifest4. Không reuse approval AH cho source đã thay. Không cần mở thêm chức năng IoT hoặc thay credentials/hạ tầng để xử lý blocker này.

Rollback phần source AI nếu cần review: phục hồi năm source + fixtures theo revision3 và invalidate plans; không chạy source rollback bằng manifest4. Không DB rollback vì AI không kết nối hoặc sửa database. Không tự thực hiện rollback trong phase này.

**STOP sau AI.**
