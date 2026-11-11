# Phase 13.3A — Persistence foundation an toàn cho tưới tự động

Ngày kiểm tra: **21/10/2026, UTC+7**. Phạm vi: schema/migration proposal, repository contract, domain transaction orchestration và kiểm thử offline. Không triển khai persistence lên PostgreSQL đang vận hành.

## 1. Kết luận và giới hạn nghiệm thu

| Hạng mục | Kết quả |
| --- | --- |
| Nền tảng phần mềm trong phạm vi Phase 13.3A | **PHASE13_3A_IMPLEMENTED** |
| Unit test persistence | **PERSISTENCE_UNIT_TESTS_PASS — 45/45** |
| Toàn bộ regression backend offline | **PASS — 243/243** |
| TypeScript backend | **PASS — `tsc --noEmit`** |
| Prisma schema đề xuất đã ghép đầy đủ quan hệ | **PASS — Prisma validate 6.19.3** |
| Migration production | **PRODUCTION_MIGRATION_NOT_APPLIED** |
| Atomicity/concurrency/restart trên PostgreSQL thật | **NOT VERIFIED** |
| Automation ACTIVE | **false** |
| Tác động máy bơm trong Phase này | **PHYSICAL_PUMP_NOT_TRIGGERED** |

**Đây chưa phải persistence PostgreSQL hoạt động thực tế.** Chưa có PostgreSQL repository adapter, chưa tạo database test, chưa áp dụng DDL/CHECK/partial indexes, chưa kiểm chứng process crash hoặc nhiều backend process với database thật. Fake repository giữ dữ liệu RAM và mô hình hóa khôi phục từ bản sao dữ liệu; không chứng minh dữ liệu tồn tại qua process restart thật.

Không nối module mới vào telemetry ingestion, automation evaluator, HTTP route, MQTT gateway hoặc Shadow Preview. Website và lịch sử RAM Phase 13.2 giữ nguyên. Không có scheduler ACTIVE, dispatcher, phát ON/OFF hay tạo DeviceCommand mới từ module này.

## 2. File tạo/sửa trong Phase này

Tạo mới:

- `backend/prisma/proposals/irrigation-persistence.prisma`: fragment sáu model, enum và relations.
- `backend/prisma/proposals/irrigation-constraints.sql`: CHECK và partial unique indexes bổ sung, **proposal only**.
- `backend/src/services/irrigation-persistence/repository.ts`: DTO, transaction/repository contracts.
- `backend/src/services/irrigation-persistence/foundation.ts`: reserve, idempotency, lifecycle ledger mô phỏng, fresh OFF và recovery.
- `backend/src/services/irrigation-persistence/test-database-guard.ts`: pure guard cho endpoint database test được phê duyệt sau này; không kết nối database.
- `backend/scripts/irrigation-persistence-fake.cjs`: fake transaction, CAS, uniqueness, rollback và fault injection.
- `backend/scripts/irrigation-persistence.test.cjs`: 45 unit tests offline.
- `backend/scripts/prepare-irrigation-schema.cjs`: ghép schema, validate và tạo SQL diff **từ hai file schema**, không truy cập PostgreSQL.
- Báo cáo này.

Sửa trực tiếp:

- `backend/package.json`: thêm `test:irrigation-persistence` và `schema:irrigation-proposal`.
- `backend/scripts/shadow-irrigation.test.cjs`: cho phép module foundation đã được kiểm thử trong kiểm tra import boundary. Pure engine không đổi; test mới kiểm tra foundation không được production route/evaluator/preview/telemetry import.

Artifact có thể tạo lại, nằm trong thư mục build được ignore:

- `build/phase13-3a-schema/schema.prisma`: schema hoàn chỉnh để validate, không phải schema production.
- `build/phase13-3a-schema/migration-proposal.sql`: additive DDL diff cộng CHECK/partial indexes; chưa thực thi.

`backend/prisma/schema.prisma`, Prisma Client đang dùng, migrations hiện hữu, firmware, frontend và các service production không được sửa trong Phase này. Các thay đổi từ những Phase trước trong dirty worktree được giữ nguyên.

## 3. Thiết kế schema cuối

Nguồn thiết kế: fragment Prisma và file CHECK SQL nêu trên. Chạy script ghép mới có schema đầy đủ inverse relations; **không dùng fragment độc lập để migrate**.

| Model | Nội dung và ràng buộc chính |
| --- | --- |
| IrrigationCycle | Actuator/Device, optional AutomationRule, policy key/version/snapshot, session generation, phase, reading markers, consumed keys, pulse count, soakUntil, version, closedAt. Một cycle chưa đóng cho mỗi actuator/mode qua partial unique index đề xuất. |
| IrrigationDecisionLog | Append-only theo contract; evaluationKey unique, outcome/reason, nguồn, mode, evidence JSON, policy, readingReference, optional FK SensorReading/Intent/Cycle. Fixture không giả mạo FK reading production. |
| IrrigationDailyBudget | Unique `(actuatorId, mode, localDay)`, reservedRuns/reservedSeconds, maxRuns/maxSeconds, version; CHECK counters không âm/không vượt quota. |
| IrrigationBudgetReservation | Một reservation cho một intent; seconds/status/reason, version, createdAt/settledAt; composite FKs giữ cùng actuator/cycle/mode/budget. |
| CommandIntent | Key/fingerprint/correlation, cycle/pulse slot, session, trạng thái, duration/expiry, thời điểm claim/publish/ACK, optional FK DeviceCommand. Unique `(mode,idempotencyKey)`, `(cycleId,pulseIndex)`; tối đa một open intent trên actuator/mode qua partial index. |
| IrrigationSafetyState | PK `(actuatorId,mode)`, Device, version, fault latch/reason, emergency stop, UNKNOWN mặc định, session, evidence OFF, cooldown/manual override, last accepted server time/day high-water. Mặc định fault/emergency=true, không tự arm. |

Thiết kế quan hệ:

- Cycle và Safety tham chiếu composite Actuator `(id,deviceId)` để không ghép sai thiết bị.
- Cycle có FK Device; optional AutomationRule dùng `(automationRuleId,actuatorId)` để không ghép sai actuator.
- Intent → Cycle; Reservation → Intent/Cycle/Budget; DecisionLog → Actuator và optional Cycle/Intent/SensorReading.
- Optional Intent → DeviceCommand dùng `(deviceCommandId,actuatorId)`. Hiện chưa tạo hay liên kết DeviceCommand thật.
- Các FK mới đều **ON DELETE RESTRICT / ON UPDATE RESTRICT**, không cascade xóa lịch sử. Không sửa cascade của schema cũ; FK RESTRICT mới sẽ chặn xóa hàng đang được ledger tham chiếu nếu được triển khai sau này.
- Script ghép thêm supporting composite unique indexes/inverse relations vào **bản sao** các model Actuator/AutomationRule/DeviceCommand; không sửa file schema production.
- Composite FKs giữa các bảng ledger giữ thống nhất `mode`; dữ liệu SHADOW không dùng chung budget/safety với ACTIVE.
- Timestamp dùng `Timestamptz(3)`; ngày ngân sách dùng `Date` tính theo UTC+7. JSON cho policy/evidence/consumed keys, không thay thế khóa quan hệ.
- Mutable rows có version; audit log không có update API. Quyền append-only của role database còn phải cấu hình và kiểm chứng trong bước migration được phê duyệt, chưa được SQL comment tự động bảo đảm.

Enums có DISABLED/SHADOW/ACTIVE và VERIFIED_LIVE để chuẩn bị tương lai; **domain hiện chỉ chấp nhận SHADOW + FIXTURE/MOCK**. ACTIVE/VERIFIED_LIVE trong schema không có nghĩa đã có evaluator/adapter hoặc được phép kích hoạt.

CHECK đề xuất: version/count hợp lệ, consumedKeys là array, quota bounds, duration 1–5 giây, SHADOW đúng 1 giây, expiry sau issuedAt và trong 30 giây; ACTIVE cần AutomationRule, ACTIVE audit cần VERIFIED_LIVE, VERIFIED_LIVE cần FK SensorReading thật. Các CHECK/partial indexes mới chỉ được viết ra file, **chưa chạy trên PostgreSQL**.

## 4. Repository và atomic reservation

`IrrigationRepository.transaction(actuatorId, work)` là boundary. Adapter tương lai phải cung cấp SERIALIZABLE hoặc locking tương đương, khóa safety row theo actuator/mode, CAS với expectedVersion, unique constraints và rollback toàn transaction. Mọi object đọc ra phải là detached copy.

Một lần reserve hợp lệ thực hiện trong cùng transaction:

1. Lock safety; kiểm tra key/fingerprint, clock rollback/day high-water, persisted context và immutable policy.
2. Chặn open/UNCERTAIN intent trên cùng actuator, bất kể key hoặc cycle khác.
3. Kiểm tra clock health trước khi cấp hàng ngân sách ngày mới; đọc budget/cycle/safety từ repository, không tin bản reset do caller gửi.
4. Chạy pure engine Phase 13.1 không đổi semantics; kiểm tra persisted cooldown/soak trước khi gọi engine.
5. Với WOULD_ON: CAS budget và cycle; insert intent SHADOW và reservation; append audit; CAS safety high-water/time.
6. Chỉ commit khi tất cả thành công. Lỗi insert/audit/CAS phải rollback cả budget, cycle, intent và reservation.

Audit mapping lưu rule/version, reading reference, timestamps recorded/received, clock, MQTT/off evidence, session, policy fingerprint và budget trước/sau. Các quyết định đã qua engine được append audit. Một số guard từ chối trước engine trả reason trực tiếp; **chưa phải pipeline audit đầy đủ cho mọi request bị chặn**.

Fake repo dùng shared queue tuần tự hóa transaction toàn store, mạnh hơn và đơn giản hơn lock từng actuator của PostgreSQL. Hai service objects cùng store là phép thử mô hình, không phải hai backend instances/database connections thật.

## 5. Idempotency, ngân sách và lỗi không chắc chắn

- Key được kiểm tra hình dạng, key unique; fingerprint SHA-256 canonical JSON của target/cycle/source/policy/reading/session. Thứ tự key JSON không làm thay đổi fingerprint. Thời điểm retry không là thành phần identity.
- Cùng key/cùng fingerprint: trả REPLAY như lookup kết quả cũ, **không cấp quyền publish lại**. Cùng key/khác payload: BLOCKED.
- Key khác nhưng actuator đang có RESERVED/DISPATCH_CLAIMED/PUBLISHED/ACKED/UNCERTAIN: BLOCKED.
- Không cam kết exactly-once MQTT; không có network publish trong module.
- Budget được giữ trước hành động giả lập. ACK APPLIED đánh dấu reservation CHARGED nhưng không giảm reserved counters; đây là tổng ngân sách đã cam kết/tiêu thụ trong ngày, tránh tái sử dụng quota.
- ACK_REJECTED được xử lý bảo thủ: giữ reservation UNCERTAIN và fault, không tự hoàn quota. Chưa có chức năng giải phóng/reconcile tự động.
- ACK_TIMEOUT, publish uncertainty, broker loss ở giai đoạn chờ kết quả hoặc expiry: UNCERTAIN + fault/UNKNOWN, giữ ngân sách, không retry ON. Late/duplicate ACK không mở lại intent terminal. ACKED vẫn chặn intent mới cho đến fresh OFF hoàn tất.
- Ngày mới UTC+7 có budget row mới nhưng không xóa row cũ, fault, manual override, open intent, cooldown hoặc soak.
- Đồng hồ quay lùi hoặc ngày nhỏ hơn high-water: fault latch/UNKNOWN, không cấp reservation mới. Không reset ngân sách để vượt clock guard.

## 6. Lifecycle và restart recovery

`recordLifecycle` chỉ là ledger simulation: RESERVED → DISPATCH_CLAIMED → PUBLISHED → ACKED. Không nhận gateway callback và không gọi MQTT. Correlation/session/status phải khớp; không có tự động retry sau crash.

`acceptOff` chỉ chấp nhận snapshot SHADOW với intent ACKED, đúng session/device/actuator/policy, OFF verified MQTT, không retained/duplicate, timestamp mới hơn pulse và OFF trước, trong freshness window, không future/rollback. Sau đó mới lưu SOAK, cooldown và COMPLETED. Không update Actuator production và không tự clear fault.

`recover` đổi open intents sang UNCERTAIN, giữ reservations/budget, cycle không còn trusted/FAULT_LOCKED; safety session mới, UNKNOWN và fault latch. Không phát lại lệnh, không dùng OFF cũ, không tự arm sau restart. Cooldown/soak/high-water không bị xóa. Những cơ chế này hiện được chứng minh bằng fake ledger; khả năng tồn tại qua restart thật phụ thuộc adapter PostgreSQL chưa triển khai.

## 7. Kiểm thử đã chạy

Tại thư mục `backend`:

```powershell
npm run test:irrigation-persistence
node --test scripts/irrigation-persistence.test.cjs scripts/shadow-irrigation.test.cjs scripts/shadow-preview.test.cjs scripts/mqtt-pump.test.cjs scripts/device-presence.test.cjs
node node_modules/typescript/bin/tsc --noEmit
npm run schema:irrigation-proposal
```

| Suite | Kết quả |
| --- | --- |
| Persistence foundation | 45 PASS |
| Phase 13.1 pure shadow | 92 PASS |
| Phase 13.2 preview | 39 PASS |
| Pump offline | 40 PASS |
| Presence offline | 27 PASS |
| Tổng | **243 PASS, 0 FAIL, 0 SKIP** |

Coverage persistence: idempotency/canonical JSON, 20 concurrent calls qua hai service objects, khác key/cùng actuator, rollback tại bốn điểm, version conflict, quota/budget không reset, persisted cooldown/soak/fault/manual override/emergency stop, midnight UTC+7, clock/day rollback, offline/UNKNOWN/untrusted reading/old OFF, các crash slots RESERVED/CLAIMED/PUBLISHED/ACKED, ACK timeout/late ACK/broker uncertainty/rejection, fresh OFF, test DB approval guard và import boundary.

Schema validate PASS. SQL diff tạo offline từ schema files với URL dummy localhost:1 chỉ để parse datasource; script không kết nối PostgreSQL và từ chối destructive DROP/TRUNCATE/DELETE trong diff. Không chạy `prisma generate`, migrate dev/deploy/reset, db push hoặc seed.

Không sửa frontend, do đó không chạy lại browser E2E/frontend suites trong Phase này; kết quả E2E mock Phase 13.2 là lịch sử, không được tính là PostgreSQL/UI persistence E2E mới.

## 8. Kiểm tra hệ thống đang chạy — chỉ đọc

Kiểm tra lúc **2026-10-20T18:38:31–46Z** (01:38 ngày 21/10 UTC+7):

- Backend port 5000 vẫn PID **23660**; Phase này không restart hay thay env runtime.
- API health HTTP 200: PostgreSQL connected, MQTT connected.
- API actuator: `controlEnabled=false`, `gatewayMode=DISABLED`, ESP32-GF-A-01 ONLINE, PUMP_01 OFF.
- API OFF timestamp `2026-10-20T18:38:23.112Z`; snapshot SELECT sau đó có OFF mới `2026-10-20T18:38:38.186Z` và lastSeen `18:38:38.451Z`. Đây là hai thời điểm đọc khác nhau, không phải timestamp mâu thuẫn.
- Bốn readings MQTT tại `2026-10-20T18:38:35.428Z`, receivedAt `18:38:35.580Z`: TEMP_01=24.4, HUM_01=66.9, SOIL_01=13.55, LIGHT_01=0. Giá trị 0 được giữ đúng.
- SELECT trong transaction READ ONLY: **PENDING=0**. Vẫn chỉ hai command thuộc phiên vật lý trước; không phát sinh command mới từ Phase này. Không chỉnh sửa command/readings/rules cũ.
- Diagnostic chỉ in safe configuration: commands=false, automation=false, pumpTestMode=true. Đây là cấu hình được diagnostic nạp; API xác nhận quyền điều khiển thực tế disabled. PID không đổi và startup runtime đã ghi nhận testMode=true/cap1s/automation=false ở Phase 13.2; không tuyên bố diagnostic đọc trực tiếp toàn bộ environment của process đang phục vụ.
- Firmware ENABLE_PUMP_COMMANDS=true giữ nguyên; không mở Serial/flash trong Phase này. Adapter rút điện dựa trên xác nhận người dùng trước đó, không có cảm biến nguồn để xác minh độc lập.
- Windows Time ổn định dài hạn 45–60 phút vẫn **NOT VERIFIED**; không đo lại hoặc thay cấu hình Windows Time trong Phase này.

Hash SHA-256 trước/sau trùng nhau cho schema production, pure decision engine, telemetry ingestion, automation evaluator và preview route. Riêng schema production: `A45A2B799ECD666328A911424A75D12986EF4248F15FC716455197CD62957B4D`.

## 9. PostgreSQL test, migration và rollback đề xuất

Chưa cần tạo database để hoàn thành foundation offline. **Cần phê duyệt riêng trước cả việc tạo database test hoặc áp dụng migration vào database test.**

Pure `assertIsolatedTestDatabase` yêu cầu approval=true, tên database/schema test chính xác theo prefix, endpoint loopback PostgreSQL, tài khoản/mật khẩu test riêng, không trùng database name hoặc credential production, không có query options ngoài schema. Guard chỉ kiểm tra dữ liệu đầu vào, không tự chứng minh server đích hay quyền thực tế; người triển khai vẫn phải xác minh endpoint/database/schema/role độc lập. Repository environment label cũng không thay thế kiểm tra kết nối.

Quy trình sau phê duyệt:

1. Xác định và phê duyệt URL database/schema/role test cô lập; không dùng tài khoản/dữ liệu production. Tạo role/test DB chỉ sau phê duyệt.
2. Ghép lại proposal với schema hiện hành; review additive DDL, supporting indexes, FK RESTRICT, CHECK, partial indexes và default fail-closed. Prisma validate không thay thế SQL execution test.
3. Apply migration proposal **vào test trước**, generate client test riêng, triển khai PostgreSQL repository adapter có khóa/CAS/unique/rollback thực, không sửa client/schema production hiện tại.
4. Test bằng hai connections/processes, contention/serialization failure, rollback thực, unique/FK/CHECK violations, process termination trước/sau commit/publish, recovery, clock/midnight và audit permissions. Serialization retry chỉ được đánh giá lại transaction an toàn; tuyệt đối không được tự gửi lại ON đã có publish uncertainty.
5. Chỉ sau test PASS mới đề xuất phê duyệt production riêng, kèm backup/restore đã kiểm tra, review locks/index build, thời gian bảo trì và reconciliation plan. **Không có lệnh production migrate được thực thi trong Phase này.**

Rollback phần mềm hiện tại: không có module production import nên có thể bỏ dùng foundation/scripts mà không thay DB. Với migration tương lai: ưu tiên disable feature và giữ ledger/audit để đối soát; không tự DROP bảng có lịch sử hoặc reset budget. Nếu migration thất bại, dùng transaction/backup và kế hoạch restore đã được kiểm chứng trên test; restore production cần phê duyệt và đánh giá mất dữ liệu mới, không tự rollback dữ liệu bằng cách xóa lịch sử.

## 10. Điều kiện sang Phase 13.3B

- Phê duyệt riêng database test và phạm vi migration test; endpoint/role/schema được xác minh.
- Triển khai PostgreSQL repository adapter và mapping đầy đủ domain ↔ schema; kiểm chứng multi-connection atomicity, CAS, unique conflicts và durable restart. Hiện mapping mới ở mức contract/proposal, chưa phải adapter chạy được.
- Bổ sung integration tests cho audit append-only, các CHECK/partial indexes, timestamp/provenance, session recovery, quota không hoàn khi UNCERTAIN và xử lý fault thủ công có kiểm soát.
- Thiết kế VERIFIED_LIVE evidence từ backend đáng tin cậy; không tin verified flag do client gửi. Chưa có live ingestion/evaluator linkage.
- Thiết kế reconciliation/rearm được phê duyệt riêng; fresh OFF không tự xóa fault sau restart và không chứng minh động cơ/nước đã ngừng.
- Giữ commands=false, automation=false, pumpTestMode=true; không có thử bơm trong nghiệm thu persistence. Mọi ACTIVE automation hoặc phần cứng là giai đoạn phê duyệt khác.

**Dừng ở foundation offline. Chưa xin/áp dụng production migration, chưa chuyển website từ RAM sang database và chưa bật tưới tự động.**
