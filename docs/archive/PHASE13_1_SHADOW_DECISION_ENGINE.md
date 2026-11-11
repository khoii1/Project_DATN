# Phase 13.1 — Pure shadow decision engine

> Cập nhật Phase13.2: đã thêm read-only fixture/mock preview adapter/API/UI, xem [báo cáo Phase13.2](PHASE13_2_SHADOW_PREVIEW_AND_PERSISTENCE_DESIGN.md). Boundary test chỉ cho phép adapter preview được kiểm tra riêng import pure engine; telemetry/gateway/evaluator production vẫn không import engine. Pure core tiếp tục không I/O, không command hoặc DB writes. Các kết quả/giới hạn Phase13.1 bên dưới là nền tảng của preview, không phải nghiệm thu persistence/ACTIVE.

Ngày: 20/10/2026. Phạm vi: phần mềm offline, không kích hoạt phần cứng.

```text
PHASE13_1_IMPLEMENTED
SHADOW_TESTS_PASS
AUTOMATION_ACTIVE=false
PHYSICAL_PUMP_NOT_TRIGGERED
```

## 1. Kết quả và ranh giới

Đã triển khai bộ quyết định thuần `decideIrrigation(snapshot)` trả WOULD_ON / WOULD_SKIP / BLOCKED, cùng bản sao state chu kỳ và ngân sách đề xuất. `advanceShadowCycle(snapshot,event)` mô phỏng ACK/pulse/OFF/soak bằng sự kiện test, không xử lý MQTT thật.

Engine không có đường thực thi tới gateway, DeviceCommand service, Prisma, env, server hoặc scheduler. Không được nối vào telemetry ingestion production trong Phase này. Không tạo rule, decision history hoặc command trong database thật. Các snapshot fixture không phải dữ liệu production.

92 test shadow và 67 test regression offline đều PASS. Chưa triển khai persistence/atomic transaction/multi-instance, HTTP API shadow hoặc frontend shadow. Không gọi các phần này là PASS.

## 2. File tạo/sửa

| File | Vai trò |
| --- | --- |
| `backend/src/services/automatic-irrigation/shadow-schema.ts` | Zod strict schemas và TypeScript input/output types |
| `backend/src/services/automatic-irrigation/decision-engine.ts` | Validation, fail-closed guards, hysteresis, reservation mô phỏng |
| `backend/src/services/automatic-irrigation/shadow-cycle.ts` | Sự kiện test cho pulse/ACK/soak/fault, không hoàn ngân sách timeout |
| `backend/scripts/shadow-irrigation.test.cjs` | 92 unit/boundary tests offline, fake time và state |
| `backend/scripts/fixtures/shadow-irrigation.json` | Snapshot và ba ví dụ minh họa, không phải policy sản xuất |
| `backend/scripts/shadow-irrigation-demo.ts` | CLI đọc fixture JSON, không kết nối broker/DB |
| `backend/package.json` | Thêm `test:shadow`, `simulate:shadow`; không thay dependency |
| `docs/PHASE12D4_PHYSICAL_PUMP_ACCEPTANCE.md` | Làm rõ hai ON do người dùng chủ động, không phải bằng chứng double-submit |
| `docs/PHASE13_AUTOMATIC_IRRIGATION_PLAN.md` | Cập nhật tiến độ shadow và thông tin hai ON |
| Báo cáo này | Hợp đồng, kiểm thử và giới hạn Phase13.1 |

Không sửa firmware, Prisma schema/migrations, MQTT topic/schema, auth/RBAC/farm scope, pipeline telemetry, evaluator production, service command hoặc frontend. Không cài package. Worktree có các thay đổi từ các Phase trước; không hoàn nguyên hoặc nhận chúng là thay đổi Phase13.1.

## 3. Tái sử dụng kiến trúc an toàn hiện có

Đã đối chiếu evaluator/rule service/telemetry ingestion, device-command service, pump-command-policy, MQTT telemetry/state adapters/state observer, AutomationRule trong Prisma và kế hoạch Phase13.

- Import lại **hàm thuần** `pumpRuntimeLimit` từ `services/pump-command-policy.ts` để áp trần test mode 1 giây. Không import production config hoặc command service để lấy cap.
- Giữ cùng semantics ngưỡng: đất < thresholdOn là khô; >= thresholdOff là đủ ẩm; ON threshold phải nhỏ hơn OFF threshold.
- Giữ nguyên nguyên tắc ONLINE/heartbeat mới, current-session OFF mới, source MQTT, non-retained/non-duplicate, timestamp tolerance không vượt 2 giây và OFF freshness tối đa30giây.
- Hysteresis/cooldown/fault được mô hình hóa rõ thay cho việc gọi evaluator hiện có. Evaluator production có DB writes nên tuyệt đối không tái sử dụng nó để chạy shadow.
- Các policy như TTL reading/clock, rest/soak/quota phải do caller cung cấp. Không đọc `.env` hay suy ra ngưỡng nông học từ seed.

Đây là module mô phỏng cô lập, không phải hệ thống ACTIVE thứ hai. Trước tích hợp production sau này cần chốt một nguồn policy thống nhất và kiểm thử tương thích; không tự thay semantics evaluator đang chạy trong Phase này.

## 4. Hợp đồng đầu vào

`shadowSnapshotSchema` là schema strict, không coercion, không default những trường an toàn bị thiếu. `decideIrrigation` nhận `unknown`; dữ liệu không hợp lệ trả BLOCKED/SNAPSHOT_INVALID, recommendedRunSeconds=null.

| Nhóm | Các trường chính |
| --- | --- |
| Mode/thời gian | `mode: DISABLED \| SHADOW`, `now` ISO có timezone, caller truyền clock giả lập |
| Reading | readingId/deviceCode/sensorCode/source/value/recordedAt/receivedAt; MQTT verified/topicMatches/authenticated/retained/duplicate/outOfOrder |
| Device | deviceCode, connectionStatus, lastSeenAt, sessionId/sessionStartedAt, brokerHealthy |
| Actuator | actuatorCode, state ON/OFF/UNKNOWN, pending, OFF evidence hoặc null |
| OFF evidence | sessionId, recordedAt/receivedAt, source, verified, retained/duplicate |
| Rule | id/version/enabled, thresholdOn/Off, minRestSeconds/soakSeconds/pulseSeconds, maxRunsPerDay/dailyBudgetSeconds/maxPulsesPerCycle, freshness TTLs/clock TTL/maxOffset/futureTolerance |
| Safety | manualOverrideUntil, faultLatched, emergencyStop, lastActuatorOffAt chung cho actuator |
| Clock | health HEALTHY/UNHEALTHY/UNKNOWN, checkedAt, offsetMs hoặc null |
| Cycle | id/session/rule/version/actuator/trusted/phase, timestamps, last reading, pulsesInCycle, consumedKeys; null nếu chưa phục hồi được |
| Budget | actuatorCode, UTC+7 day, trusted, reservedRuns/reservedSeconds |

Target cố định cho Phase này: ESP32-GF-A-01 / SOIL_01 / PUMP_01. Mismatch bị BLOCKED, không tự normalize danh tính không khớp. Value0% và100% hợp lệ; null/NaN/Infinity/ngoài0..100 bị chặn.

Các cờ verified/authenticated/trusted là **bằng chứng snapshot caller khẳng định**, không phải engine đã tự xác thực broker hoặc chữ ký. Caller future phải có adapter tin cậy và không cho client tự khai các cờ để đi tới ACTIVE. Phase này chỉ dùng fixture offline.

`now` cũng là dữ liệu truyền vào, không có Date.now(), w32tm, đọc NTP hay random ID. Fixture có thời gian cố định để tái lập test, không dùng đồng hồ máy chạy test làm clock vận hành.

## 5. Hợp đồng đầu ra

`IrrigationDecision` gồm mode/outcome/reasonCode/message, deviceCode/actuatorCode/sensorCode, soilMoisture, evaluatedAt, readingId/cycleId, recommendedRunSeconds, idempotencyKey, phaseTransitions, nextCycle/nextBudget.

- WOULD_ON chỉ là đề xuất 1 giây trong SHADOW. Không phải command payload, ACK, relay state hoặc bằng chứng bơm đã bật.
- nextCycle/nextBudget là bản sao JSON-compatible, caller phải truyền tiếp nếu muốn mô phỏng nhiều bước. Không sửa snapshot input, không giữ mutable state module-level.
- Snapshot không parse được: mode trả DISABLED, evaluatedAt=null và state output=null; không tự tạo timestamp mới để làm dữ liệu trông hợp lệ.
- BLOCKED/WOULD_SKIP không trả runtime hoặc key mới. Safety guard ưu tiên trước xét ngưỡng; snapshot không an toàn vẫn BLOCKED ngay cả khi đất đủ ẩm.

## 6. Hysteresis và pulse + soak

Trong vùng thresholdOn <= value < thresholdOff: cycleIDLE trả WOULD_SKIP/HYSTERESIS_IDLE; cycle đã có ý định/reevaluation trả WOULD_SKIP/HYSTERESIS_HOLD và giữ phase. Không tạo ON trong vùng này. Thiếu cycle trusted hoặc sai session/ruleversion thì BLOCKED, không tự tái khởi tạo IDLE sau restart.

Chu trình mô phỏng:

```text
IDLE/REEVALUATE -> ELIGIBLE -> PENDING_ACK
  ACK_APPLIED -> PULSE_ACTIVE
  PULSE_ELAPSED -> WAIT_FRESH_OFF
  OFF_REPORTED mới -> SOAK
  hết min-rest/soak + reading mới sau OFF -> REEVALUATE

PENDING_ACK + ACK_TIMEOUT/ACK_REJECTED -> FAULT_LOCKED
```

ELIGIBLE là bước audit trung gian trong phaseTransitions; quyết định WOULD_ON atomically trong mô hình thuần trả nextCycle=PENDING_ACK và reservation, tránh caller quên reserve. Không tạo lệnh hoặc fake ACK. Phase ELIGIBLE cũng được nhận trong schema cho snapshot mô phỏng có nguồn trusted.

OFF_REPORTED phải là OFF mới hơn pulse start và OFF trước đó, đúng session và fresh non-retained/non-duplicate. Periodic OFF cũ trước pulse không kết thúc pulse. Phải nhận OFF mới dù timer mô phỏng đã hết: không mặc định timer elapsed đồng nghĩa đã nhận OFF.

Sau OFF: cooldown chung actuator và soak được kiểm tra độc lập, cần readingId khác và recordedAt mới hơn reading đã dùng/OFF. OFF mới định kỳ không tự reset lịch sử pulse. Đất liên tục khô bị chặn bởi quota, daily budget hoặc maxPulsesPerCycle, không bật tiếp ngay vì relay đã OFF.

Transition event là đầu vào của harness offline, không phải endpoint hoặc parser ACK thật. Timer elapsed dùng thời gian test truyền vào; engine không có timer/loop nền. Không thay đổi monotonic fail-safe firmware.

## 7. Clock health và fail-closed

- Chỉ HEALTHY với checkedAt không tương lai, còn TTL, offset hữu hạn có giá trị và abs(offset)<=policy mới được đề xuất ON.
- UNKNOWN/UNHEALTHY, offset null, checkedAt thiếu/sai/future hoặc quá hạn -> BLOCKED.
- Reading recordedAt/receivedAt phải mới và hợp lý với nhau, futureTolerance<=2000ms; presence/OFF cũng có freshness riêng.
- Cycle/session/last timestamp tương lai, thiếu OFF sau pulse, budget ngày cũ hoặc mất state sau restart -> BLOCKED.

**Không gọi w32tm, không resync, không sửa guard2giây.** Việc cung cấp clock-health snapshot thật và nghiệm thu WindowsTime45–60phút vẫn chưa được triển khai/xác minh bởi module này.

## 8. Idempotency, quota và ngân sách mô phỏng

Key deterministic là JSON tuple `[ruleId, ruleVersion, actuatorCode, cycleId, pulseIndex]`. CycleId do harness/caller cấp, không tự sinh theo wall clock. Reevaluation cùng input cho cùng key và cùng output; **không đồng nghĩa chỉ một backend instance được quyền thực thi**.

Khi WOULD_ON, output tăng reservedRuns/reservedSeconds và pulsesInCycle, thêm key consumed, chuyển PENDING_ACK. Khi truyền state output vào lần sau, cùng reading/cycle hoặc cycle in-flight không đề xuất ON lặp. ACK_TIMEOUT/REJECTED khóa FAULT_LOCKED, không trả lại reservation và không tự retry; late ACK không tự gỡ fault.

Daily budget theo ngàyUTC+7, không tự reset khi snapshot budget khác ngày; yêu cầu caller cung cấp trạng thái ngày mới trusted. Cooldown dựa lastActuatorOffAt chung, không chỉ rule. Phase13.2 cần persistence/atomic reserve, concurrent locks, idempotency storage, restart recovery và chính sách day-boundary. Caller bỏ state output hoặc khai sai trusted có thể mô phỏng lại cùng ý định; không tuyên bố đã chống điều đó qua instances/restarts.

## 9. Reason codes

| Nhóm | Reason codes |
| --- | --- |
| Đề xuất / không tưới | SOIL_BELOW_THRESHOLD; SOIL_MOISTURE_SUFFICIENT; HYSTERESIS_IDLE; HYSTERESIS_HOLD |
| Schema / policy | SNAPSHOT_INVALID; AUTOMATION_DISABLED; INVALID_THRESHOLDS; POLICY_RUNTIME_EXCEEDED; IDENTITY_MISMATCH |
| Reading | READING_SOURCE_INVALID; MQTT_READING_UNTRUSTED; RETAINED_READING; DUPLICATE_READING; OUT_OF_ORDER_READING; FUTURE_READING; STALE_READING; READING_ALREADY_EVALUATED; READING_BEFORE_PULSE_OFF |
| Device / relay | DEVICE_NOT_ONLINE; PRESENCE_UNTRUSTED; BROKER_UNAVAILABLE; COMMAND_PENDING; PUMP_ALREADY_ON; PUMP_STATE_UNKNOWN; OFF_UNTRUSTED; OFF_SESSION_MISMATCH; OFF_STALE_OR_FUTURE |
| Clock | CLOCK_UNHEALTHY; CLOCK_UNKNOWN; CLOCK_SNAPSHOT_FUTURE; CLOCK_SNAPSHOT_STALE; CLOCK_OFFSET_UNTRUSTED |
| Cycle / safety | EMERGENCY_STOP; FAULT_LATCHED; CYCLE_STATE_UNTRUSTED; CYCLE_CONTEXT_MISMATCH; CYCLE_TIMESTAMP_FUTURE; CYCLE_IN_FLIGHT; PULSE_OFF_EVIDENCE_MISSING; MANUAL_OVERRIDE; COOLDOWN_ACTIVE; SOAK_ACTIVE |
| Quota / identity | BUDGET_STATE_UNTRUSTED; DAILY_RUN_LIMIT; DAILY_BUDGET_EXHAUSTED; CYCLE_PULSE_LIMIT; IDEMPOTENCY_KEY_CONSUMED |

Transition có reason riêng: SNAPSHOT_OR_EVENT_INVALID, TRANSITION_CONTEXT_UNTRUSTED, INVALID_TRANSITION, FRESH_PULSE_OFF_REQUIRED; hoặc SIMULATED_PULSE_ACTIVE, WAITING_FOR_NEW_OFF, SIMULATED_SOAK_STARTED, ACK_TIMEOUT, ACK_REJECTED. Message ghi rõ shadow/no command.

## 10. Kiểm thử đã chạy

Chạy trong thư mục `backend`:

| Lệnh | Kết quả |
| --- | --- |
| `npm run test:shadow` | **92/92 PASS** |
| `npm run test:pump` | **40/40 PASS**, mocks/VM offline |
| `npm run test:presence` | **27/27 PASS**, mocks/VM offline |
| `node node_modules/typescript/bin/tsc --noEmit` | PASS |
| Typecheck riêng CLI với strict/ES2022/CommonJS/noEmit | PASS |
| `npm run simulate:shadow` | PASS, ba ví dụ dưới |
| ESLint backend | N/A: backend chưa có lint script/config; không cài package mới |
| Browser E2E / hardware tests | NOT RUN / NOT VERIFIED trong Phase này |

Các test bao phủ đủ30 nhóm bắt buộc: boundaries0/ON/OFF/100; null/NaN/Infinity/out-of-range; stale/future/source/trust/retained/duplicate/out-of-order; OFFLINE/UNKNOWN/ON; OFFsessioncũ; brokerdown; clockhealth/TTL/offset; PENDING/manualoverride; cooldown/soak; dailybudget/quota; fault; cùngreading/key; restart; đất khô nhiều pulse. Bổ sung: late/duplicateACK, earlyelapsed, OFFcũ, dayUTC+7, per-cycle cap, sharedactuatorcooldown, output isolation và production import boundary.

Không chạy các API/integration test có thể ghi dữ liệu thật. Không chạy simulator hiện hữu `simulate:automation`/`simulate:irrigation`; CLI `simulate:shadow` mới hoàn toàn offline.

## 11. Bằng chứng không side effect

Closed module graph chỉ cho phép `zod`, ba module shadow và `pump-command-policy.ts` thuần. Loader VM từ chối mọi dependency khác, cung cấp spy MQTT/Prisma với counter và throw nếu bị gọi; fake Date từ chối implicit wall clock. AST assertion cấm dynamic require/import, eval, network/timers, Date.now/Math.random trong core. Test source production xác nhận không có import/invoke shadow từ bất kỳ fileproduction nào ngoài foldershadow.

Kết quả spy trên các đánh giá/test:

```text
mqttPublished=0
deviceCommandsCreated=0
productionDbWrites=0
actuatorMutations=0
```

Test snapshot immutability/output isolation PASS. Đây là bảo đảm ranh giới của module/test harness hiện tại, không phải đo lưu lượng toàn bộ hệ thống production. Backend thật vẫn ingest telemetry bình thường; không tuyên bố PostgreSQL ngừng tất cả writes của dịch vụ đang vận hành.

Xác minh runtime riêng bằng GET read-only: cổng5000 vẫn PID13016, APIgatewayDISABLED/controlEnabledfalse, ONLINE/OFF mới và bốnreadingMQTT. Không reload backend hoặc sửa processenv/.env trong Phase này. Fixture/demo không import config/env hoặc production DB.

Kiểm tra SELECT chốt2026-10-20T16:02:20.463Z: PENDING0, sốcommand từ phiên thử vật lý vẫn2 (không phát sinh command mới). Startup metadata của đúngPID13016 vẫn commandsEnabled=false, automationEnabled=false, testMode=true, effectiveMaxRunSeconds=1. Đây là truy vấn kiểm chứng riêng, không phải engine truy cập database.

## 12. Demo tái lập

```powershell
cd C:\DATN\Project_datn\backend
npm run test:shadow
npm run simulate:shadow
# Hoặc JSON fixture offline riêng:
npm run simulate:shadow -- scripts/fixtures/shadow-irrigation.json
```

Fixture minh họa dùng ON20%, OFF40%, min-rest30giây, soak60giây, pulse1giây, quota3lượt/3giây/ngày. **Không phải cấu hình production hoặc khuyến nghị ngưỡng cho cây.**

| Ví dụ | Kết quả | Reason |
| --- | --- | --- |
| Soil18%, đủ mọi guard | WOULD_ON, recommendedRunSeconds1 | SOIL_BELOW_THRESHOLD |
| Soil45%, đủ mọi guard | WOULD_SKIP | SOIL_MOISTURE_SUFFICIENT |
| Soil18%, clockUNKNOWN | BLOCKED | CLOCK_UNKNOWN |

CLI hiển thị các counter0 như mô tả ranh giới offline, không giả mạo là telemetry counter từ production. Bằng chứng enforce nằm trong VM/AST/import boundary tests.

## 13. LM393 và việc chưa làm

LM393/đầu dò đất chịu ảnh hưởng calibrationADC, điện áp, tiếp xúc, loạiđất, nhiễu và lão hóa. Phần trăm tuyến tính firmware không mặc nhiên là độẩm thể tích chính xác. Chưa dùng kết quả demo để tự chọn threshold cho cây. Không thay mapping ADC, firmware hoặc ngưỡng thật.

Cần Phase sau: calibration và quality policy readings; clock-health adapter; persistence/atomic quota/cycle/idempotency và migration được duyệt; decisionaudit/farm-scoped API/UI; browser mocks; shadow trên data thật với adapter đángtin; restart/multi-instance/fault-recovery acceptance. Không tự mở ACTIVE khi các phần này chưa hoàn tất/phê duyệt.

## 14. Làm rõ nghiệm thu 12D.4 và kết luận

Theo thông tin mới do người dùng cung cấp, hai ON phiên trước là hai thao tác chủ động, không có bằng chứng double-submit. Vẫn vượt phạm vi mộtON của phê duyệtB; không sửa lịch sử và không xin dùng lại lượt thử. Bơm chạy/tự dừng tốt theo người dùng, không tuyên bố đo chính xác GPIO. WindowsTime dài hạn vẫn NOT VERIFIED.

**PASS cho triển khai pure shadow và offline tests Phase13.1.** ACTIVE/integration/persistence/hardware automation vẫn NOT IMPLEMENTED/NOT VERIFIED. Không có lệnh ON/OFF hoặc tác động phần cứng từ lần triển khai này.
