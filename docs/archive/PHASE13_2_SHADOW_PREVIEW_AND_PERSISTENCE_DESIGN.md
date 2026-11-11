# Phase 13.2 — Shadow preview và thiết kế persistence

Ngày thực hiện: 20/10/2026. Repository: `C:\DATN\Project_datn`.

```text
PHASE13_2_IMPLEMENTED
SHADOW_PREVIEW_PASS
AUTOMATION_ACTIVE=false
PHYSICAL_PUMP_NOT_TRIGGERED
PERSISTENCE_DESIGN_ONLY
VERIFIED_LIVE_NOT_IMPLEMENTED
```

## 1. Kết quả và phạm vi

Đã triển khai giao diện preview dùng pure engine Phase13.1 thông qua GET API có xác thực/phạm vi thiết bị. Có thể thay tham số giả lập, xem quyết định bằng tiếng Việt, chu kỳ/ngân sách đề xuất và lịch sử tối đa20 lượt trong RAM của trang. Không tạo quy tắc, reading, cycle, reservation, DeviceCommand hoặc decision log trong database production.

Đã kiểm tra browser E2E thật bằng Edge headless với **tất cả API được mock**, không dùng tài khoản hoặc token thật trong E2E. Không gọi đây là browser nghiệm thu điều khiển bơm thật. Persistence bên dưới chỉ là proposal, chưa sửa Prisma schema, chưa tạo hoặc áp dụng migration.

## 2. Kiến trúc và ranh giới

```text
Irrigation → tab Mô phỏng tưới tự động
  → Axios GET /api/shadow-preview (AbortSignal)
  → authenticate + deviceRepository.findAccessibleById (farm/RBAC scope, SELECT)
  → previewShadow: dựng snapshot FIXTURE/MOCK ở backend
  → decideIrrigation của Phase13.1
  → kết quả + nguồn + reasonVi + diagnostics
  → UI hiển thị / history RAM (không ghi DB)
```

Preview service chỉ import Zod và pure engine/types. Không import gateway, DeviceCommand service, evaluator production, env hoặc Prisma. Route chỉ SELECT thiết bị có thể đọc theo repository/scoping hiện có; không lấy trạng thái thật rồi giả định MQTT trust. Không sửa telemetry ingestion hoặc Command/ACK contract.

Frontend không tính lại quyết định tưới. Nó chỉ dựng query các nút điều khiển giả lập, hiển thị kết quả backend, định dạng thời gian Việt Nam và lưu lịch sử RAM. Các default20%/40% chỉ là fixture minh họa Phase13.1.

## 3. Danh sách file

### Backend

- `src/services/shadow-preview/preview.service.ts`: strict query schema, dựng snapshot synthetic, gọi pure engine, thông điệp tiếng Việt và diagnostics.
- `src/routes/shadow-preview.route.ts`: authentication, SELECT theo scope, GET/no-store, không mutation route.
- `src/routes/index.ts`: đăng ký route preview.
- `scripts/shadow-preview-harness.cjs`: closed-loader offline, fake repository/JWT, HTTP server test cô lập.
- `scripts/shadow-preview.test.cjs`:39 test preview/API/trust/boundary.
- `scripts/shadow-irrigation.test.cjs`: giữ92 test; cập nhật allowlist static boundary chỉ cho thêm adapter shadow-preview đã được kiểm tra riêng, không cho telemetry/gateway import engine.
- `package.json`: thêm `test:shadow-preview`, không thêm dependency.

### Frontend

- `src/types/shadow-preview.ts`: controls/DTO/default fixture.
- `src/services/shadow-preview.service.ts`: GET/cancellation, từ chối provenance ngoài FIXTURE/MOCK và mode không SHADOW.
- `src/components/automation/ShadowPreviewPanel.tsx`: form, kết quả, trạng thái giả lập và history RAM.
- `src/pages/irrigation/IrrigationPage.tsx`: thêm tab shadow; dừng polling manual/history khi ở shadow.
- `scripts/shadow-preview.test.cjs`:5 SSR/service tests, không phải browser E2E.
- `scripts/shadow-preview.e2e.cjs`: Edge headless context cô lập, mock toàn bộ API, ảnh và JSON kết quả.
- `package.json`: thêm `test:shadow-preview`, `test:shadow-e2e`.

Ngoài ra có diagnostic GET cục bộ git-ignored `build/phase13_2-preview-verification.cjs` và artifact `report/phase13_2/`. Không cài package; dùng playwright-core/Edge đã có trên máy. Không commit mật khẩu/token vào file hoặc ảnh.

Hai tài liệu Phase13.1 và kế hoạch Phase13 tổng thể được thêm ghi chú tiến độ/boundary mới; phần pure engine và các kết quả lịch sử giữ nguyên.

## 4. Endpoint và trust contract

### Endpoint đã triển khai

`GET /api/shadow-preview?deviceId=<id trong farm scope>&soilMoisture=18&clockHealth=HEALTHY`

- Cần Bearer session hợp lệ. Reuse `authenticate` và `deviceRepository.findAccessibleById`, không thay RBAC/farm scope.
- Chỉ cho thiết bị trong scope có deviceCode ESP32-GF-A-01;404 nếu không có quyền hoặc không phù hợp. STAFF có quyền đọc có thể xem mô phỏng; không đồng nghĩa có quyền điều khiển bơm.
- Response `Cache-Control: no-store`. Không có POST/PATCH/DELETE preview; Express tự hỗ trợ HEAD cho GET.
- Query strict: deviceId; soilMoisture/thresholdOn/thresholdOff; connectionStatus; clockHealth; pumpState; brokerHealthy/faultLatched dưới dạng true/false string; cooldownSeconds/soakSeconds; reservedRuns/reservedSeconds; cyclePhase; readingScenario FRESH/STALE/FUTURE/RETAINED/DUPLICATE.
- Runtime đề xuất vẫn1giây, quota3lượt/ngày và budget3giây chỉ là policy fixture; không được client đổi thành lệnh thật.
- Client gửi `verified`, `authenticated`, `trusted`, `snapshot`, `cycle`, `budget`, `now`, `mode`, `command` hoặc `source` bị400. Không thể tự nâng dữ liệu giả thành VERIFIED_LIVE.

### Response

Envelope `{success,message,data}`; data gồm:

- `source: FIXTURE | MOCK`: mặc định fixture; thay bất kỳ thông số kịch bản thì MOCK.
- `liveVerification: NOT_VERIFIED`, `independentScenario:true`.
- `notice`, `evaluatedAt`, `reasonVi`, `decision` gốc engine, `settings`, `diagnostics`.
- Diagnostics: device/sensor/actuator code, clock/device/broker/pump giả lập, cooldown/soak remaining, quota/budget sau reservation mô phỏng, cycleBefore/cycleAfter.

**VERIFIED_LIVE chưa triển khai.** PostgreSQL hiện không đủ receipt metadata/trust flags/session provenance của mọi reading để dựng live snapshot đã xác thực. Preview không dùng SensorReading thật rồi tự gán verified=true. Những verified/authenticated/trusted=true trong snapshot server-owned chỉ mô tả giả thiết fixture, được bọc nguồn FIXTURE/MOCK và cảnh báo rõ; không có đường ACTIVE sử dụng snapshot đó.

Timestamp evaluation/reading/OFF/clock trong snapshot này do backend dựng cho kịch bản, **không phải thời gian cảm biến hoặc xác nhận NTP thực tế**. UI luôn ghi “mô phỏng”; không dùng kết quả này nghiệm thu Windows Time.

### Tính độc lập giữa các lượt

Mỗi GET đánh giá một kịch bản độc lập. `nextCycle/nextBudget` chỉ là đề xuất cho lượt đó; không mang lên production hoặc tự tích lũy giữa polling. Chọn cyclePhase, cooldown, soak hoặc budget là đặt dữ kiện giả lập đầu vào, không gửi ACK/transition thật. Phase13.1 vẫn có offline transition harness cho mô phỏng nhiều bước đầy đủ. Không gọi history20dòng là lịch sử cycle bền vững.

## 5. Giao diện và cách xem

Mở `http://localhost:5173/irrigation`, chọn **Mô phỏng tưới tự động**. Chọn đúng device trong phạm vi đọc. Form có soil/thresholds, ESP32/clock/relay/MQTT giả lập, scenario timestamp, cooldown, soak, budget, fault và8cycle phases.

Nút “Chạy mô phỏng” chỉ áp dụng form vào GET preview. “Đặt lại fixture” không sửa rule thật. Không có nút gửi MQTT/actuator command trong panel này. Panel có:

- Banner **CHẾ ĐỘ SHADOW — KHÔNG ĐIỀU KHIỂN MÁY BƠM**.
- WOULD_ON: “Hệ thống sẽ đề xuất tưới nếu ở chế độ ACTIVE.”
- WOULD_SKIP: “Chưa cần tưới theo quy tắc hiện tại.”
- BLOCKED: “Không được phép tưới vì điều kiện an toàn chưa đạt.”
- ReasonCode và lý do Việt; giá trị0% không bị thay bằng “không có dữ liệu”.
- Source FIXTURE/MOCK và LIVE NOT_VERIFIED; các chỉ số clock/relay hiện trong panel là giả lập, không trộn với trạng thái thiết bị thật.
- History hiển thị thời điểmVN, readingId,soil,rule,outcome,reason,cycleId,budget/source; bounded20, mất khi refresh hoặc rời tab.

Polling preview10giây tùy chọn; dùng controller chung đã có, không request chồng, abort/ignore response cũ khi đổi form/device hoặc unmount, dừng khi tab ẩn và refresh khi quay lại. Tắt checkbox dùng interval0, chỉ load/refresh thủ công; không có background job backend. Lỗi API được hiển thị, không biến thành trạng thái relay thật.

Ảnh kiểm tra bằng mock:

![Preview WOULD_ON từ fixture](../report/phase13_2/shadow-would-on.png)

![Preview BLOCKED từ mock](../report/phase13_2/shadow-blocked.png)

## 6. Kiểm thử và bằng chứng

| Kiểm tra | Kết quả |
| --- | --- |
| Pure shadow Phase13.1 |92/92 PASS |
| Backend preview/API/trust injection |39/39 PASS |
| Pump regression offline |40/40 PASS |
| Presence regression offline |27/27 PASS |
| Frontend shadow SSR/service |5/5 PASS |
| Frontend irrigation regression |8/8 PASS |
| Polling regression |12/12 PASS |
| Backend `tsc --noEmit` |PASS |
| Frontend typecheck/build |PASS, chỉ cảnh báo bundle>500kB |
| Frontend ESLint |PASS |
| Browser E2E thật, toàn bộ API mock |PASS, Edge headless |

198 backend test,13frontend SSR/service/regression và12polling test đã chạy, không chạy API regression có ghi DB thật. Headless E2E độc lập với các unit test, không suy E2E PASS từ SSR.

E2E kiểm tra: WOULD_ON/SKIP/BLOCKED/reason Việt; soil0/100; thresholds ON/OFF; hysteresis; clockUNKNOWN; deviceOFFLINE; pumpUNKNOWN; stale/future; cooldown/soak; quota/budget; fault; cyclepending; response race; API500/recovery; polling10giây; navigation/unmount không phát GET preview tiếp; refresh về default. App thực chạy StrictMode. Artifact `report/phase13_2/browser-result.json`:39preview GET,24 checkpoint, không mutation request, không pageerror. Browser mặc định tích hợp không khả dụng; đã dùng Playwright-core/Edge có sẵn, không điều khiển tab hay session người dùng.

Mock E2E interceptor chặn mọi non-GET API request, không forward requestAPI ra server thật, sử dụng token giả không hợp lệ trên production. Closed-loader backend chỉ cho express/zod/pure modules và fake read repository/JWT, không cho import config/database/MQTT/gateway. Spy/import boundary ghi nhận MQTTpublish0/DeviceCommandcreate0/DBwrites0/actuatormutations0 trong test; không phải đo toàn bộ lưu lượng DB của dịch vụ production đang ingest dữ liệu thật.

GET endpoint thực sau nạp code cũng được kiểm chứng riêng lúc16:52:01.512Z: fixture200/FIXTURE/WOULD_ON, clockUNKNOWN→CLOCK_UNKNOWN, injectedtrusted=true→400, không auth→401. Normal login chỉ lấy session để GET, không seed hoặc gọi control endpoint.

## 7. Runtime và hoàn nguyên an toàn

Để nạp route mới, đã dừng đúng cây backend/helper cũ do agent tạo sau khi kiểm tra ownership và PENDING0, rồi khởi động backend với processenv rõràng false/false/true; không sửa `.env`. Không dùng helper mở command.

Startup đúng backendprocess PID23660 lúc2026-10-20T16:51:15.716Z: commandsEnabled=false, automationEnabled=false, testMode=true, effectiveMaxRunSeconds1. DB/MQTTconnected/subscriptionsrestored. Recovery backend bình thường có thể tạm UNKNOWN, sau đó nhận OFF mới thật; **không có UPDATE/épOFF thủ công từ preview hoặc diagnostic**. Telemetry/presence vẫn do pipeline có sẵn xử lý, không đổi logic.

SELECT kiểm chứng trước reload16:50:30 và sau16:52:02: commandCount vẫn2 của phiên vật lý cũ, PENDING0. Sau reload ONLINE/OFFmới16:51:54.570Z; đủ4readingMQTT16:51:50.198Z, không cóDeviceCommandmới. Không chạy firmware, không cấp nguồnadapter, không gửiON/OFF, không thayGPIO/ACL/topic. Adapter giữ trạng thái đã rút theo xác nhận người dùng trước đó; không có quan sát vật lý độc lập mới trong Phase13.2.

Những writes do auth/telemetry/presence/recovery bình thường của ứng dụng đang vận hành không được mô tả là “hệ thống ngừng mọi DBwrite”. Khẳng định zero-write ở đây áp dụng cho đường shadow preview, không có decision/cycle/quota/command mới do chức năng preview.

## 8. Persistence proposal — chưa áp dụng

### Mục tiêu và nguyên tắc

Persistence ACTIVE là Phase sau, không dùng history RAM. Khóa theoactuator trước tất cả reservation; không chỉ mutex trong mộtprocess. Không coi cờtrusted lưuDB là chứng minh session MQTT mới. Không tự phát lạiON sau restart, ACK_TIMEOUT hoặc kết quả không rõ.

Mô hình đề xuất (Prisma sketch, **không phải schema production hiện tại**, chưa chạy validate/migrate):

```prisma
model IrrigationCycle {
  id                 String   @id @default(cuid())
  actuatorId         String
  ruleId             String
  ruleVersion        Int
  mode               String   // SHADOW/ACTIVE, default DISABLED at policy layer
  phase              String   // eight cycle phases
  version            Int      @default(0) // optimistic concurrency
  sessionGeneration  String
  sessionStartedAt   DateTime
  lastReadingId      String?
  lastOffEvidenceId  String?
  lastOffAt          DateTime?
  soakUntil          DateTime?
  pulses             Int      @default(0)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  @@index([actuatorId, phase])
}

model IrrigationDecisionLog {
  id              String   @id @default(cuid())
  cycleId         String?
  actuatorId      String
  ruleId          String
  ruleVersion     Int
  readingId       String
  evaluationKey   String   @unique
  source          String   // FIXTURE/MOCK/VERIFIED_LIVE
  mode            String
  outcome         String
  reasonCode      String
  evidence        Json     // no secrets; timestamps/identity/session/clock refs
  evaluatedAt     DateTime
  createdAt       DateTime @default(now())
  @@index([actuatorId, evaluatedAt])
}

model IrrigationDailyBudget {
  id              String   @id @default(cuid())
  actuatorId      String
  localDay        DateTime @db.Date // UTC+7-derived calendar date
  reservedRuns    Int      @default(0)
  reservedSeconds Int      @default(0)
  maxRuns         Int
  maxSeconds      Int
  version         Int      @default(0)
  @@unique([actuatorId, localDay])
}

model IrrigationBudgetReservation {
  id             String   @id @default(cuid())
  budgetId       String
  cycleId        String
  intentId       String   @unique
  seconds        Int
  status         String   // RESERVED/CHARGED/UNCERTAIN/RELEASED
  reason         String?
  createdAt      DateTime @default(now())
  settledAt      DateTime?
  @@index([budgetId, status])
}

model CommandIntent {
  id                  String   @id @default(cuid())
  idempotencyKey      String   @unique
  actuatorId          String
  cycleId             String
  pulseIndex          Int
  correlationId       String   @unique
  deviceCommandId     String?  @unique
  status              String   // RESERVED/DISPATCH_CLAIMED/PUBLISHED/ACKED/UNCERTAIN/CANCELLED
  desiredState        String
  maxRunSeconds       Int
  issuedAt            DateTime
  expiresAt           DateTime
  dispatchClaimedAt   DateTime?
  acknowledgedAt      DateTime?
  createdAt           DateTime @default(now())
  @@unique([cycleId, pulseIndex])
}

model IrrigationSafetyState {
  actuatorId             String   @id
  version                Int      @default(0)
  faultLatched           Boolean  @default(true) // explicit safe arm required
  faultReason            String?
  lastConfirmedOffAt     DateTime?
  lastOffEvidenceId      String?
  cooldownUntil          DateTime?
  manualOverrideUntil    DateTime?
  lastAcceptedServerTime DateTime?
  budgetDayHighWater     DateTime? @db.Date
  armedSessionGeneration String?
  updatedAt              DateTime @updatedAt
}
```

Các relation/FK tớiActuator/AutomationRule/SensorReading/DeviceCommand và onDeleteRESTRICT, enum/checkconstraints, table mappings phải được hoàn thiện trong migration design được duyệt. Không coi sketch này là migration đầy đủ đã validate. Không cascade xóa bằng chứng hoặc ngân sách khi xóa rule. Thêm constraint counters>=0/seconds>0/caps, expiry>issuedAt, uniqueness mộtcycle đangactive/actuator bằng partialindexPostgreSQL; naming/SQL phải kiểm thử trên DBtest trước.

### Transaction và dispatcher strategy

1. Xác thực farm/device/role bằng dữ liệu backend; client chỉ gửi ý định/requestId, không cấp trust hoặc clockhealth.
2. Lấyclock-healthfresh doadapter backend thu, xác minhsource/time/session/reading/OFF, ruleversion/flags/kill-switch. CLOCKUNKNOWN hoặc rollback không cho reserve/publish.
3. Trong transaction SERIALIZABLE (hoặc explicit row locks tương đương), khóa actuator/safety trước, rồi dailybudget/cycle theo thứ tự nhất quán; recheck guard để tránh TOCTOU.
4. Tạo/lấy `CommandIntent` theo idempotencyKey; requestlặp trả cùngintent/result, không tạoUUID/correlation mới. Dùngunique(cycleId,pulseIndex) vàCASversion chống haiinstances cùngđềnghị.
5. Reserve runs/seconds bằng atomicUPDATE cóđiềukiện counter+request<=limit, insertreservation/decisionaudit/intent trong cùngtransaction; rollbacktoàn bộ nếu một bước khôngđạt. Áp dụng policybudget cho cảmanual/auto nếu muốn hạnmức chung, không bỏ sót manualruntime.
6. Commitýđịnh trướcnetwork. Dispatcherclaim mộtintent bằngCAS/rowlock vàghiDISPATCH_CLAIMED trướcpublish. Kiểmtra lạiclock/expiry/ONLINE/freshOFF/flags ngay trước publish. **Không hứa exactly-once network execution.**
7. Crash giữaclaim vàpublish hoặc giữapublish vàreceipt làUNCERTAIN: giữreservation, latchfault, yêu cầuOFFmới/review; không tựretryON để “bảo đảm giao hàng”. Intentcũ khi restart/expiry bịCANCELLED/UNCERTAIN, không phát lại theooutbox thông thường. Quy trình cho phép retrycủaOFF phải thiết kế riêng, không làm trong Phase này.
8. ACKmatchcorrelation/schema/topic/identity/timestamp trongtransaction kếtthúccommand+intent; lateACK không phục hồi ýđịnhđãhủy. MAX_RUNTIMEOFFmới gắn cycle/evidence vàđặtsoak/cooldown; ngân sách không hoàn lại chỉ vìtimeout hoặc không thấyUION.

### Những tình huống phải giải quyết

- **Haiinstances/duplicaterequest:** uniqueintent + lockingbudgetperactuator + versionCAS, không chỉ in-memoryMap hoặc nútdisabled.
- **Restart/PENDING:** đánh dấuphầnchưa rõ vàfault; journal/quotas/cooldown giữ nguyên, không rearm từOFFlịch sử. Backend/brokersession mới đòi evidence mới hơn sessionstart.
- **ACK_TIMEOUT:** charge/reservebảothủ, không trảseconds để cấp lượtONthaythế; không retryON. Reconciliation ghi rõ phần đãchắc/chưa chắc.
- **NgàyUTC+7:** localday từUTC+7 policy backend, không từclockclient. Budgetngàymới khôngresetfault/cyclepending/cooldown cũ. Midnight không “miễnphí” pulse vắtngày; chọn charge toànpulse vào ngàyissuedAt/reservation, policyđượcduyệt và audit.
- **Clockrollback:** clockhealthTTL, lastAcceptedServerTime/dayHighWater ngănmởlại ngàycũ; nếu thời gianquaylùi hoặc không khớp externalNTP thì BLOCKED, không tự cấp budgetmới. Monotonic dùng trongprocess không thay thếjournal qua restart.
- **FreshOFF:** chỉjournalEvidenceId/sessiongeneration đãverify, không chỉ booleantrusted từDB/client; mất trust->UNKNOWN/faultblocked. DBreading phải córeceipt/provenance đủ trước VERIFIED_LIVE.
- **Manualoverride/kill-switch:** latch/cooldown chungactuator vàpolicy manualđượcghi bền; tắtAUTO ngừngýđịnhmới, không giảđịnhrelay đãOFF. Ngắtadapter tại chỗ là độc lập vàưu tiên.

### API contracts tương lai — chưa triển khai

- `GET /irrigation-cycles`, `/irrigation-decisions`, `/irrigation-budgets` trả scopedhistory/audit, phân biệtSIMULATEDvàACTUAL rõràng.
- Tạo/arm policyACTIVE cầnendpoint/role/approvalriêng, `expectedVersion` và`Idempotency-Key`. Không tái sử dụng GETpreview thành trigger. Client không được truyền verified/live/fault-clear tùyý.
- Faultreview/rearm là hành động riêng có RBAC, evidence mới vàaudit; không sửa trực tiếp stateOFF. MọicontrolAPIthật vẫn qua gateway/guardhiệnhữu khi đượcduyệt.
- Responsefuture cần intentId/cycleId/reservationId/correlationId/decisionReason/status, không đồng nhất requestaccepted với pumpapplied.

### Migration plan và rollback

1. Chốt schema/API/retention/constraints với người dùng, duyệt riêng trước áp dụng. Review và validate proposal offline trước tạo migration.
2. Dùng DBtest cô lập: kiểmtra connectionString/dbname/host allowlist, từ chối bất kỳ productionURL hoặc tên không đúngtest; backup DB thật chỉ ở giai đoạn có quyền, không làm ở Phase này.
3. Additive migration, test FK/partialunique/checks/concurrency/restart/dayboundary. Không seedcommand/reading vào DBproduction. Chính sáchngânsáchngàyđangchạy phải reconciliationbảothủ dữliệucũ, khôngresetquota để tạo budgetảo.
4. Deploy flagsDISABLED, shadow-first; chưa có approve thì không migratelênproduction, khôngdispatcherACTIVE.
5. Rollback vận hành: khóaflags vàdispatcher, giữ nguyênjournal/budget/reservations để không mấtlịch sử hoặc cấp trùngquota. Khôngdrop/resetDB, không revertvề phiênbản bỏquaguardkhi cònPENDING/UNCERTAIN. RollbackSQL chỉ sauđánhgiábackup/compatibility/phêduyệt.

Chưa tạo DBtest, chạy migration, concurrencyintegration hoặc xácminhatomic persistence trong Phase13.2. Tất cả là DESIGN_ONLY.

## 9. Rủi ro và điều kiện Phase13.3

- Trust MQTT/clock live chưa đủ, không hỗ trợ VERIFIED_LIVE. Lịch sử preview mất khi rời trang, không phục hồi cycle/budget giữarequest.
- NgưỡngLM393 và phầntrăm chưa hiệu chuẩn cho cây. Fixture không làm chứng minh hiệu quả tưới hoặc nướcchảy.
- WindowsTime45–60phút vẫn LONG_TERM_NOT_VERIFIED; previewclockHEALTHY là giả lập, không ghi đè kết luận đó.
- HaiON vật lý trước do người dùng chủ động; không gọi là lỗi doublesubmit đã được chứngminh. Quota/idempotency vẫn là yêu cầu an toàn của kiến trúc nhiềuinstances.
- Frontend bundle hiện có cảnhbáo>500kB; không sửa kiến trúc bundle ngoài phạm vi.

Phase13.3 chỉ nên bắt đầu sau duyệt persistence/transaction/API và môi trường DBtest côlập, cótestconcurrency/restart/timeout/dayboundary/trust. Tíchhợplive cần evidenceadapter thật; ACTIVE/hardwareautomatic cầnphêduyệt riêng sau shadowđạt. Không dùnglại quota phêduyệtB cũ để tựtưới.

## 10. Lệnh tái lập

```powershell
cd C:\DATN\Project_datn\backend
npm run test:shadow
npm run test:shadow-preview
npm run test:pump
npm run test:presence
node node_modules/typescript/bin/tsc --noEmit

cd C:\DATN\Project_datn\frontend
npm run test:shadow-preview
npm run test:shadow-e2e
npm run test:irrigation
npm run test:polling
npm run lint
npm run build
```

E2E cầnVite5173 vàEdge/playwright-core cósẵn; chỉmockAPI. Không chạy simulator/seed/migration hoặc integration suite cóghiDB. Báo cáo không tuyên bố đã nghiệmthu automationvật lý hoặc persistenceatomic.
