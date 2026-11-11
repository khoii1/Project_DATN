# Phase 13.4A — Live provenance và clock-health adapter

Ngày: **21/10/2026, UTC+7**. Triển khai nền tảng quan sát/correlation thật và clock-health read-only; không tưới tự động hoặc gửi lệnh phần cứng.

```text
PHASE13_4A_IMPLEMENTED
PROVENANCE_TESTS_PASS — 67 test mới PASS
CLOCK_HEALTH_ADAPTER_PASS — offline + Windows runtime ngắn
VERIFIED_LIVE_NOT_READY
AUTOMATION_ACTIVE=false
PHYSICAL_PUMP_NOT_TRIGGERED
LONG_TERM_STABILITY_NOT_VERIFIED
```

IMPLEMENTED là hoàn tất foundation trong phạm vi Phase13.4A, **không phải đã xác thực publisher ESP32 hoặc có full live decision snapshot**. Khi thiếu bằng chứng, assembler trả `LIVE_OBSERVED_NOT_VERIFIED`/`BLOCKED`, `snapshot=null`, `decision=null`, `engineCalled=false`. Không phát WOULD_ON từ dữ liệu live chưa đủ trust.

## 1. Kiến trúc thực hiện

```text
MQTT callback
  → context: callbackReceivedAt/QoS/retain/dup/observer generation + start
  → telemetry adapter: schema/topic validation hiện có
  → bounded receipt store: digest/timestamp/high-water/session checks
  → ingestion hiện có, giữ nguyên ghi DB/presence/alerts/evaluator
  → RETURNING rows: readingId/value/recordedAt/dbReceivedAt
  → correlate chính xác với receipt, chỉ trong RAM

GET /api/live-evidence?deviceId=...
  → authentication + existing farm/device scope
  → clock-health read-only, single-flight/cache TTL
  → DB transaction READ ONLY đối chiếu lại readingId và actuator OFF
  → assembler phân loại assurance, không có command/engine side effects
```

Receipt store không import Prisma/env/engine/gateway hoặc network. Assembler không import hay gọi DeviceCommand service, MQTT gateway hoặc evaluator. Không nối pure engine vào ingestion/evaluator production. Engine Phase13.1 giữ nguyên; hiện không gọi engine từ assembler vì chưa đủ publisher assurance và policy/cycle/budget/safety production. Nếu bổ sung nguồn này trong Phase sau, chỉ được gọi với mode SHADOW sau kiểm tra trust, không mặc định nâng thành ACTIVE.

## 2. File tạo/sửa

Tạo:

- `backend/src/services/live-provenance/evidence-store.ts`: receipt/correlation/OFF envelopes, bounded cache, TTL, session invalidation và anti-replay.
- `backend/src/services/live-provenance/clock-health.ts`: parser/assessment và cached single-flight clock adapter, wall/monotonic jump detection.
- `backend/src/services/live-provenance/windows-time.ts`: wrapper chỉ đọc w32tm có timeout.
- `backend/src/services/live-provenance/snapshot-assembler.ts`: phân loại dữ liệu live và liệt kê bằng chứng thiếu, không dựng state giả.
- `backend/src/routes/live-evidence.route.ts`: GET scoped, strict query, SELECT và đối chiếu evidence.
- `backend/scripts/live-provenance.test.cjs`: 67 closed-loader/offline tests.
- `backend/scripts/phase13-4a-live-verification.cjs`: auth hợp lệ, GET/SELECT verification ba sample, không control request.
- Báo cáo này; artifacts `report/phase13_4a/`.

Sửa trực tiếp:

- `mqtt/mqtt.types.ts`: optional QoS/generation/sessionStartedAt trong transport context, **không thay JSON MQTT schema**.
- `mqtt/mqtt-client.service.ts`: capture metadata tại callback trước khi queue xử lý.
- `mqtt/mqtt-state-observer.ts`: reset receipt cache cùng observer generation.
- `mqtt/mqtt-telemetry.adapter.ts`: quan sát receipt sau validation, correlate kết quả ingestion; instrumentation error không chặn ingestion hiện hữu.
- `mqtt/mqtt-pump-state.adapter.ts`: chỉ bổ sung OFF envelope sau DB commit ảnh hưởng row và generation vẫn hợp lệ.
- `repositories/sensor-reading.repository.ts`: thêm `receivedAt` vào SELECT RETURNING hiện hữu, không đổi cách insert/skipDuplicates.
- `services/telemetry-ingestion.service.ts`: thêm trường kết quả `correlation`; không thêm DB write và không đổi thứ tự gọi presence/alerts/evaluator.
- `routes/index.ts`: mount GET live evidence.
- `scripts/mqtt-pump.test.cjs`: mock instrumentation RAM trong regression loader cũ; test mới kiểm tra instrumentation thật riêng, không mở quyền truy cập DB/MQTT của regression.
- `backend/package.json`: thêm `test:live-provenance`.

Không sửa firmware, `.env`, password/ACL/firewall, Prisma schema/migration, evaluator production, decision engine hoặc UI FIXTURE/MOCK.

## 3. Receipt, correlation và assurance

Mỗi receipt gồm: deviceCode/sensorCode/topic, SHA256 payload digest, recordedAt, **callbackReceivedAt**, QoS, retain/dup, topicMatches, policyVersion `13.4A-observation-v1`, generation, sessionId/sessionStartedAt và `sessionKind=BACKEND_OBSERVER`.

Guard quan sát:

- Exact topic/identity target ESP32-GF-A-01, schema được telemetry adapter kiểm tra trước.
- Chỉ QoS1, non-retained/non-DUP, có callback time/session metadata hợp lệ.
- Không trước observer session; stale45giây, future tolerance2giây; high-water per sensor chặn same timestamp/out-of-order, digest chặn payload replay.
- Tối đa256 reading entries,256 sensor high-water keys,256 digest entries; TTL45giây, OFF TTL30giây. Capacity mới không được cấp vô hạn; reading/digest cũ được thu hồi, không nới guard để nhận lại lịch sử.
- Backend restart tạo store mới; observer reset/reconnect/disconnect xóa cache và generation đổi. Correlation hoàn thành muộn từ session cũ không còn entry để nâng trust. Rollback wall clock làm cache invalidated cho đến reset session.

Correlation được tạo từ **rows vừa RETURNING bởi createManyAndReturn**, không truy vấn một reading lịch sử rồi tự coi là receipt mới. Mỗi row phải có đúng sensorCode/value/recordedAt/source MQTT/id và dbReceivedAt hữu hạn; result trùng/mất/không khớp không tạo correlated reading. DB duplicate skipped trả không có row mới → không mượn readingId cũ. GET sau đó SELECT lại exact readingId trong đúng sensor/device scope và kiểm tra value/recordedAt/dbReceivedAt trước khi trả envelope.

`dbReceivedAt` là DB default now(), không phải thời điểm callback. Hai mốc được lưu độc lập trong evidence. Kết quả correlation là **quan sát kỹ thuật đã đối chiếu**, không đủ để tuyên bố publisher được xác thực.

**Mọi receipt giữ `publisherIdentityAssurance=NOT_VERIFIED`.** MQTT3 subscriber không có publisher username; backend kết nối broker thành công chỉ chứng minh kết nối của backend. Digest không phải chữ ký/authentication. Chưa có broker/ACL attestation được model hóa/duyệt hoặc device identity signature; tuyệt đối không set authenticated/verified/trusted=true cho publisher. Config anonymous=false và credentials hiện hữu không tự biến receipt thành full VERIFIED_LIVE.

## 4. Session và OFF evidence

OFF envelope chỉ được capture sau validation/commit hiện hữu, nếu generation vẫn đúng và observer ready. Gồm device/actuator/state/reason, recordedAt/callbackReceivedAt, digest, retain/dup/QoS, generation/start/sessionId, source verification `BACKEND_COMMIT_OBSERVED_NOT_PUBLISHER_AUTHENTICATED`.

GET còn SELECT actuator currentState/lastStateChangedAt và đòi timestamp đúng envelope; DB bị thay đổi, chưa có commit, OFF cũ, reconnect hoặc TTL hết → không trả OFF như bằng chứng hiện tại. Test kiểm tra zero affected rows, DB failure và reconnect giữa commit không tạo envelope hợp lệ.

SessionId do backend tạo có prefix `backend-observer:`. **Không phải ESP32 boot ID**; API trả `deviceBootSession=NOT_PROVIDED_BY_FIRMWARE`. Không thêm field/topic vào firmware. OFF là GPIO report, không là motor/water feedback.

## 5. Clock-health adapter và giới hạn

Chỉ gọi executable cố định `C:\Windows\System32\w32tm.exe` với:

```text
/query /status /verbose
/query /peers
/stripchart /computer:time.windows.com /samples:3 /dataonly
```

Mỗi command timeout8giây/maxBuffer64KiB/hidden window. Status/peers được đọc song song trong **một** measurement; refresh concurrent được coalesce, không spawn thêm measurement trùng. Cache measurement30giây, TTL60giây; không timer/scheduler background. Non-Windows, quyền đọc lỗi, timeout hoặc output không nhận diện được → UNKNOWN, không giữ HEALTHY cũ sau một lần đọc thất bại.

Policy hiện tại fail-closed:

- Source đúng `time.windows.com,0x8`, peer đó Active (không lấy Active của peer khác).
- Leap0, stratum1..15, LastSyncError0; sync age không quá3600giây.
- Có đủ3 offset samples; lấy sample có trị tuyệt đối lớn nhất, maxabs500ms. Vượt → UNHEALTHY.
- Missing/unsupported locale/format/stale sync/source/peer → UNKNOWN; unsynchronized/error → UNHEALTHY.
- So elapsed wall clock với monotonic; wall rollback hoặc lệch bước >2giây → latch UNKNOWN/CLOCK_JUMP_LATCHED trong đời adapter. Không tự rearm hoặc sửa đồng hồ.

Output có health/reason/source/LastSyncError/Leap/stratum/offset/checkedAt/TTL/jump và LastSuccessfulSync. **LastSuccessfulSync được suy ra xấp xỉ từ `Time since Last Good Sync Time` và statusReadAt**, đánh dấu `lastSuccessfulSyncBasis=STATUS_AGE_APPROXIMATE`, tránh đoán định dạng ngày SA/CH theo locale. Không gọi đó là timestamp chính xác lấy trực tiếp từ event log.

Assurance luôn `SHORT_TERM_READ_ONLY_MEASUREMENT`, `longTermStability=NOT_VERIFIED`. Đây là kiểm tra chức năng/ngắn hạn; không chứng minh độ chính xác tuyệt đối hoặc ổn định45–60phút. Không chạy resync, sửa registry/peer, firmware NTP hoặc timestamp guard2giây.

## 6. API, assembler và website

Endpoint mới: **GET `/api/live-evidence?deviceId=<device trong farm scope>`**, Bearer session hiện hữu, no-store. Chỉ strict query `deviceId`; các trường trusted/verified/authenticated/source/snapshot/cycle/budget do HTTP client gửi bị400. Không auth401, không trong scope404, không mutation endpoint. Clock query chỉ chạy sau auth/scope check; receipt/session được lấy lại sau async clock query để tránh dùng evidence trước reconnect.

Khi reading/OFF/presence/clock đủ để quan sát ngắn nhưng thiếu các bằng chứng còn lại:

```json
{
  "mode": "SHADOW",
  "source": "LIVE_OBSERVED_NOT_VERIFIED",
  "verifiedLiveReady": false,
  "publisherIdentityAssurance": "NOT_VERIFIED",
  "policy": null,
  "cycle": null,
  "budget": null,
  "safety": null,
  "snapshot": null,
  "decision": null,
  "engineCalled": false
}
```

Notice: “Đã nhận dữ liệu cảm biến thật — Chưa đủ bằng chứng để cấp VERIFIED_LIVE.” Thiếu correlation mới thì notice ghi chưa đủ evidence trong phiên; presence/clock/OFF không đạt thì status BLOCKED. Không dùng fixture hoặc PostgreSQL test để điền cycle/budget/safety còn thiếu.

UI Phase13.2 giữ nguyên FIXTURE/MOCK, không thêm live panel/nút bơm trong Phase này. GET fixture được kiểm tra lại thực tế:200/FIXTURE/WOULD_ON **chỉ mô phỏng**, clockUNKNOWN→CLOCK_UNKNOWN, client trusted=true400, no auth401. Không được diễn giải WOULD_ON của fixture là kết quả live.

## 7. Kiểm thử offline

```powershell
cd C:\DATN\Project_datn\backend
npm run test:live-provenance
node --test scripts/live-provenance.test.cjs scripts/irrigation-persistence.test.cjs scripts/shadow-irrigation.test.cjs scripts/shadow-preview.test.cjs scripts/mqtt-pump.test.cjs scripts/device-presence.test.cjs
node node_modules/typescript/bin/tsc --noEmit
```

| Suite | Kết quả |
| --- | --- |
| Provenance/clock/API/instrumentation mới | **67/67 PASS** |
| Shadow Phase13.1 | 92/92 PASS |
| Preview Phase13.2 | 39/39 PASS |
| Persistence fake | 45/45 PASS |
| Pump offline | 40/40 PASS |
| Presence offline | 27/27 PASS |
| Tổng | **310/310 PASS, 0 FAIL, 0 SKIP** |
| Backend TypeScript | PASS |

Test mới bao phủ: valid receipt/zero, topic sai, retain/DUP/QoS/missing callback, stale/future/same-time/out-of-order/digest replay, mismatch value/sensor/time/source/id/DB time/result duplicate, no historical readingId borrowing, TTL/capacity, reconnect/in-flight correlation invalidation, old/new/session OFF, commit failure/reconnect, HEALTHY/UNKNOWN/UNHEALTHY/offset/peer/TTL/jump/timeout/single-flight, missing persistence/publisher assurance, strict GET/auth/scope/trust injection, không engine/command/DB mutation path từ module mới.

Closed loader từ chối dependency không được phép; DB/MQTT/Windows boundaries đều fake hoặc bị cấm trong offline tests. Test ingestion mock chứng minh thứ tự vẫn **write → presence → alerts → evaluator**, cùng rows/giá trị0; chỉ thêm correlation sau đó. Test evidence hook throw vẫn trả accepted khi ingestion thành công; ingestion failure không có correlated evidence. Source boundary không cho các module mới import command/evaluator/DB singleton; GET dùng transaction READ ONLY.

Lỗi test ban đầu: pump regression loader chưa mock dependency RAM mới; đã thêm mock riêng, không cho phép import thực vào DB/MQTT. Một static assertion nhận nhầm `crypto.Hash.update()` là DB update; đã giới hạn nhận diện DB mutation, không bỏ test. Kết quả trên là lần chạy lại đầy đủ sau sửa, không coi attempt lỗi là PASS.

Không chạy lại PostgreSQL integration38 vì cluster test vẫn dừng; kết quả Phase13.3B là lịch sử. Không frontend/browser E2E mới vì UI không đổi. Không cài package hoặc generate/migrate Prisma.

## 8. Runtime reload và bằng chứng live

Trước reload: kiểm tra listener/command line và parent-child đúng backend agent quản lý, PENDING0, hai command phiên vật lý cũ không đổi. Đã reload riêng backend để nạp instrumentation, rồi reload lần nữa sau khi bổ sung kiểm tra actuator DB/OFF envelope cuối cùng. Không động broker hoặc PostgreSQL. Lần gọi diagnostic quá sớm trước server ready thất bại kết nối; đã kiểm tra startup trước khi gọi lại, không đổi config/flags.

Runtime cuối:

- Backend **PID3572**, startup **2026-10-21T04:10:04.975Z = 11:10:04.975 UTC+7**; parent launcher2828.
- Log: `testMode=true`, `effectiveMaxRunSeconds=1`, `commandsEnabled=false`, `automationEnabled=false`; MQTT connected172.20.10.2:1883, telemetry/status/state subscriptions restored.
- Observer session start **04:10:04.992Z**, sessionKind BACKEND_OBSERVER.
- Broker LAN PID1340 và service loopback4572 không restart. Production PostgreSQL5432 PID7848 không restart; 55433 vẫn không có listener.

[Artifact live cuối](../report/phase13_4a/live-evidence.json) lưu ba GET samples và SELECT riêng khớp DB; bản trước được giữ thành `previous-*.json`, không chứa token/password.

| SOIL recordedAt UTC | ReadingId | CallbackReceivedAt | dbReceivedAt | SOIL % |
| --- | --- | --- | --- | ---: |
| 04:10:08.285Z | cmvhlg22m0003umr881mdlu6c | 04:10:08.610Z | 04:10:08.638Z | 22.13 |
| 04:10:23.285Z | cmvhlgdp50009umr8f9n2u409 | 04:10:23.696Z | 04:10:23.705Z | 22.23 |
| 04:10:53.285Z | cmvhlh0uk000humr8z448m3ku | 04:10:53.701Z | 04:10:53.708Z | 23.23 |

Mỗi sample có đủ **4 SensorReadings MQTT** cùng recordedAt trong DB (TEMP_01/HUM_01/LIGHT_01/SOIL_01); SOIL readingId/value/time/DB receipt khớp envelope/API và SELECT độc lập. Probe lấy mẫu mỗi15giây cộng thời gian GET/clock query nên không cam kết chọn ba batch liên tiếp; đã thấy ba batch mới khác nhau, không chạy monitor dài.

OFF envelope PERIODIC trong ba GET lần lượt recordedAt **04:10:18.322Z / 04:10:33.427Z / 04:10:48.581Z**, tất cả mới hơn session start, retain=false, dup=false, QoS1, generation cùng reading; DB timestamp actuator khớp envelope. Không dùng OFF trước reload.

Clock cả ba lần **HEALTHY**. Offset conservative của các measurement khoảng **−33.1592ms** và **−34.6876ms**, TTL60000ms, LastSyncError0/Leap0/peerActive/source0x8. LastSuccessfulSync suy ra xấp xỉ **04:04:52.56Z**, không phải thời gian đo cảm biến.

API actuator kiểm tra cuối **04:11:47.477Z**: ONLINE/OFF, stateAt04:11:34.111Z, lastSeen04:11:38.658Z, controlEnabled=false/gatewayModeDISABLED. Bốn readings MQTT04:11:38.285Z: TEMP32.6, HUM68.5, SOIL22.18, LIGHT0. SELECT04:11:48.519Z: **PENDING0, command count phiên vật lý cũ vẫn2**. Không có command mới từ Phase này.

## 9. An toàn và rollback phần mềm

- Không gửi ON/OFF, không simulator/flash/cấp nguồn bơm, không sửa GPIO/topic/JSON MQTT, không tạo AutomationRule/DeviceCommand/reading giả hoặc ledger production.
- Pure engine, evaluator production, preview route và Prisma schema giữ nguyên hash; schema SHA256 `A45A2B799ECD666328A911424A75D12986EF4248F15FC716455197CD62957B4D`.
- Shadow modules/GET chỉ RAM/SELECT/Windows read-only. DB vẫn ghi readings/presence/recovery theo pipeline ứng dụng bình thường; không tuyên bố toàn server zero-write.
- Firmware ENABLE_PUMP_COMMANDS=true giữ nguyên từ phê duyệt trước; giữ adapter rút điện theo điều kiện hiện tại, không có phép đo nguồn độc lập mới. OFF GPIO không xác nhận động cơ/nước.
- Không thay auth/RBAC/farm scope/session người dùng; GET live evidence dùng cùng middleware/repository scope.
- Nếu cần rollback: gỡ mount GET và các hook evidence trong MQTT/context/observer, bỏ correlation addition/receivedAt SELECT và các module mới; reload đúng backend với false/false/testMode=true, chờ OFF mới. Không restore/reset DB, migration hoặc flash firmware. Đây là hướng dẫn, chưa thực hiện rollback vì kiểm thử đạt.

## 10. Những phần VERIFIED_LIVE chưa đáp ứng và Phase13.4B

1. Chốt assurance của publisher: MQTT3 metadata không có username/chữ ký; cần policy/broker ACL attestation và/hoặc device identity evidence được duyệt. Không gán authenticated=true chỉ vì broker/backend login thành công.
2. Định nghĩa session contract: hiện chỉ backend observer generation, không ESP32 boot ID. Nếu cần firmware boot ID hoặc MQTT contract mới phải có task/phê duyệt riêng; không giả mạo device session.
3. Chưa có source production cho policy/rule phiên bản, durable cycle/budget/safety và fault review. Không dùng fixture hoặc test cluster55433 để điền các trường trusted, không mở migration production ngầm.
4. Clock parser fail-closed với output không nhận diện; mới kiểm chứng trên Windows hiện tại, không nghiệm thu mọi locale/version, sleep/resume dài hạn hoặc external NTP trust/precision tuyệt đối. Không thay kết luận LONG_TERM_NOT_VERIFIED.
5. LM393: mapping dry3500/wet1507 là phần trăm tuyến tính/clamped, không VWC/nông học đã hiệu chuẩn. Telemetry chưa mang raw ADC/rail/calibration version/health; soil0 vẫn là số hợp lệ nhưng chưa đủ lý do tưới. Chưa thay firmware/calibration/ngưỡng20/40 fixture.
6. Cache chỉ trong RAM, hết TTL/reset mất evidence là thiết kế fail-closed; chưa persistent provenance/retention multi-instance. Audit lâu dài hoặc migration cần phạm vi riêng.

**Phase13.4A foundation và kiểm thử PASS; full VERIFIED_LIVE NOT_READY.** Phase13.4B nên chốt trust contract/persistence source/calibration và tests cho assembler hoàn chỉnh trước khi gọi engine trên full live snapshot. Giữ ACTIVE=false, Commands/Automation=false; không có quyền thử bơm hoặc migration production từ báo cáo này.
