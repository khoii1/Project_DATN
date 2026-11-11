# Phase 13.4B — Live Observation UI & Trust Readiness

Ngày thực hiện: **21/10/2026, UTC+7**.

```text
PHASE13_4B_IMPLEMENTED (read-only observation boundary)
LIVE_OBSERVATION_UI_PASS (actual headless Edge, all APIs mocked)
VERIFIED_LIVE_NOT_READY
AUTOMATION_ACTIVE=false
PHYSICAL_PUMP_NOT_TRIGGERED
```

Không chạy máy bơm, không gửi ON/OFF, không tạo DeviceCommand. Không thay firmware/ACL/credentials/NTP, không migrate production, không generate Prisma Client hoặc khởi động instance test 55433. Production backend PID3572 không restart trong phase này.

## 1. Giao diện và kiến trúc

Mở `/irrigation` → **Mô phỏng tưới tự động** → **Dữ liệu cảm biến thực tế**. Tab mặc định vẫn FIXTURE/MOCK để giữ hành vi cũ. Hai loại không chia sẻ result, draft hoặc budget:

- FIXTURE/MOCK: giữ form/kịch bản/history RAM cũ, gọi `/api/shadow-preview` và pure engine chỉ cho fixture.
- LIVE: chỉ đọc `/api/live-evidence?deviceId=...`, không gọi engine, không có nút ON/OFF hoặc kết quả WOULD_ON; giữ source `LIVE_OBSERVED_NOT_VERIFIED`, readiness=false, decision/snapshot=null.

Không đổi authentication, RBAC hoặc device/farm scope. Device list tiếp tục lấy qua service hiện có, chỉ hiển thị ESP32-GF-A-01 trong phạm vi được phép. Không dùng token giả của E2E với backend thật.

## 2. File tạo/sửa trong phase này

| File | Thay đổi |
| --- | --- |
| `frontend/src/components/automation/ShadowPreviewPanel.tsx` | Tab nguồn, pause fixture khi live, mount live theo device key |
| `frontend/src/components/automation/LiveObservationPanel.tsx` | GET polling, view provenance/trust, local TTL aging |
| `frontend/src/services/live-evidence.service.ts` | Axios GET + AbortSignal, timeout riêng20s, từ chối fixture/trust/decision injection |
| `frontend/src/types/live-evidence.ts` | Contract observation frontend |
| `frontend/src/utils/live-observation.ts` | Pure projection correlation/session/TTL/UTC+7, fail-closed |
| `frontend/scripts/live-observation.fixture.cjs` | Synthetic fixture chỉ dùng unit/browser mock |
| `frontend/scripts/live-observation.test.cjs` | Unit/service/SSR tests, không phải browser E2E |
| `frontend/scripts/live-observation.e2e.cjs` | Edge thực, toàn bộ `/api/**` mock, abort mọi mutation |
| `frontend/scripts/shadow-preview.test.cjs` | Mock import component mới, giữ test fixture cũ |
| `frontend/package.json` | `test:live-observation`, `test:live-e2e` |
| `docs/PHASE13_4B_PRODUCTION_PERSISTENCE_PROPOSAL.md` | Additive rollout proposal/checklist, không apply |
| Báo cáo này | Kết quả và giới hạn |

Artifact: `report/phase13_4b/browser-result.json`, `live-zero-off.png`, `live-stale.png`, `live-evidence.json`; frontend `dist` được tạo cục bộ. Giữ các thay đổi cũ của người dùng trong dirty worktree, không commit/reset. Không sửa backend source trong phase này.

## 3. Provenance hiển thị

SOIL_01 `%` dùng null/finite handling, **0% không biến thành thiếu dữ liệu**. Hiển thị DeviceCode/SensorCode, readingId, recordedAt, callbackReceivedAt, DB receivedAt, sourceMQTT, topic, receiptId, payload digest (không phải chữ ký), QoS/retained/dup, kết quả correlation; timestamp format Asia/Ho_Chi_Minh UTC+7, không viết lại timestamp đo.

ESP32 hiển thị ONLINE/OFFLINE hoặc UNKNOWN/STALE; lỗi HTTP không tự kết luận OFFLINE. MQTT status là **receipt evidence**, không phải cam kết transport vẫn đang connected tại từng thời điểm giữa hai GET. Relay OFF chỉ khi có commit-observed OFF mới, non-retained/QoS1/non-duplicate, đúng topic/device/observer generation, presence còn mới. OFF age/recordedAt/reason, observer session/generation/start, ESP32 boot session NOT_PROVIDED, clock/source/offset/lastsync và missing readiness đều hiển thị.

**Giới hạn contract hiện có:** live-evidence chỉ expose evidence OFF, không expose trusted ON evidence. Vì vậy khi thiếu fresh OFF (kể cả DB có ON/historical OFF), live view hiển thị UNKNOWN, không đoán ON. Việc hiển thị ON có chứng cứ trực tiếp còn NOT VERIFIED và cần endpoint/evidence contract được review ở phase sau. Không dùng actuator DB cũ để lách giới hạn. OFF chỉ là báo cáo GPIO, không chứng minh động cơ/nước ngừng.

## 4. Polling/race/TTL

- Reuse `usePolling` / serial `createPollingController`, interval10s tính sau khi request trước xong. Timeout riêng20s vì clock-health có phép đo read-only bounded; không đổi Axios client chung.
- StrictMode dispatch timer0, cleanup abort; refresh liên tục coalesce, không overlap cùng scope. Đổi device dùng keyed panel mới, abort/ignore response cũ; hai request khác scope có thể cùng tồn tại ngắn ở server sau client abort nhưng không ghi đè UI.
- Rời live/shadow unmount dừng poll; document.hidden dừng/abort, visible fetch lại. Fixture polling dừng trong live và ngược lại.
- Timer hiển thị1s chỉ khi visible để tính age = server evaluatedAt + max(local wall elapsed, monotonic elapsed). Không cập nhật recordedAt. ReadingTTL<=45s, OFF30s, presence30s, clockTTL backend; stale/future/mismatch không được coi là fresh. Timer trình bày không phải worker/scheduler backend.
- Lỗi403/404/500 hiện alert, invalidates current OFF/health, giữ giá trị cũ chỉ với nhãn lịch sử/STALE. Không fallbackfixture. 401 tuân theo interceptor hiện tại: xóa session và về login, không giữ đăng nhập trái contract.
- Sau reconnect/generation mới, cache backend đòi evidence mới; frontend cũng so session/generation. Không rehydrate OFF từ localStorage hoặc fixture.

## 5. Kiểm thử thực tế

| Kiểm tra | Kết quả |
| --- | --- |
| Backend presence/pump/shadow/preview/persistence offline/live provenance | **310/310 PASS** |
| Backend TypeScript `tsc --noEmit` | PASS |
| Frontend live unit/service/SSR | 16/16 PASS (sau bản cuối) |
| Frontend polling | 12/12 PASS |
| Frontend irrigation | 8/8 PASS |
| Frontend fixture SSR/service | 5/5 PASS |
| Frontend TypeScript + Vite build | PASS; có warning bundle>500kB, không phải build failure |
| Frontend ESLint | PASS |
| Edge live mock E2E | PASS, 17 nhóm checks; không page error/mutation |
| Edge fixture regression E2E | PASS, 24 checks; không mutation |

E2E dùng **Microsoft Edge headless thực** qua Playwright có sẵn. Đã thử browser skill tích hợp nhưng runtime trả `Browser is not available: iab`, sau đó chuyển fallback Edge theo yêu cầu; không suy ra browserPASS từ SSR. Screenshot đã xem trực tiếp để kiểm tra layout.

Các case live:0%, OFF/provenance, thiếu publisher/cycle/budget/safety, clockUNKNOWN, deviceOFFLINE, MQTT receipt mất/reconnect, observer session cũ, fresh recovery, TTL cũ và local aging, hidden/foreground,403/404/500/401logout, refresh serial, device race, polling10s, mode switch/unmount, reload defaults. Tất cả API được route mock, không forward unknown, chặn nonGET. Test hidden dùng visibilitychange có kiểm soát trong browser context; không tuyên bố đã mô phỏng OS minimize/sleep thực tế. Không test broker outage vật lý bằng cách restart broker.

Lệnh tái kiểm thử an toàn:

```powershell
cd C:\DATN\Project_datn\frontend
npm run test:live-observation
npm run test:polling
npm run test:irrigation
npm run test:shadow-preview
npm run test:live-e2e
npm run test:shadow-e2e
npm run build
npm run lint
```

E2E yêu cầu Vite đang chạy5173; đã mở Vite loopback127.0.0.1:5173 trong phiên để test và xem UI, không khởi chạy thêm backend/broker. Không chạy PostgreSQL integration lại hoặc suite API có ghi dữ liệu.

## 6. Ba mẫu live GET + SELECT READ ONLY

`report/phase13_4b/live-evidence.json` lưu toàn bộ metadata và row đối chiếu, không token/credential. Reuse probe13.4A bằng bản source trong bộ nhớ chỉ đổi output dir sang phase13_4b, không sửa script gốc/không overwrite evidence13_4A. Đăng nhập qua auth hợp lệ hiện có, sau đó GET + SQL transactionREADONLY. Probe lần đầu dùng VM gặp **cross-realm deepStrictEqual** (array có cấu trúc giống nhưng khác realm), không phải lỗi PostgreSQL/API; đã dừng, chạy lại cùng probe trong realm Node thông thường, 3 samples hoàn tất.

| GET sample UTC | ReadingId / SOIL_01 | RecordedAt UTC | OFF recordedAt UTC / reason |
| --- | --- | --- | --- |
| 04:35:29.954 | cmvhmcj1t00bnumr8d1d4ytp6 /23.18% | 04:35:23.285 | 04:35:19.800 /PERIODIC |
| 04:35:49.644 | cmvhmcunr00btumr8cqrasear /23.18% | 04:35:38.285 | 04:35:34.951 /PERIODIC |
| 04:36:04.680 | cmvhmda2p00bxumr8v06q2bjg /24.89% | 04:35:53.285 | 04:35:54.376 /MQTT_LOST |

Tất cả ngày21/10/2026; cộng7giờ để đọc VN. Cả3 có correlation id/value/recordedAt/dbReceivedAt khớp SQL, đủ4sensor/sourceMQTT ở cùng batch, deviceONLINE, PENDING0, Commandsfalse/Automationfalse/testModetrue, verifiedLiveReadyfalse/decisionnull/engineCalledfalse. ClockHEALTHY với offset lần lượt khoảng−45.26/−46.51/−46.51ms; **chỉ short-term**, stability45–60phút NOT VERIFIED.

Sample3 callback04:35:58.654 cách recordedAt khoảng5.369s; đây là độ trễ đường truyền/queue quan sát được, không thể coi toàn bộ là clock skew. OFF reasonMQTT_LOST là fail-safe report khi thiết bị gặp mất MQTT ngắn; không tự kết luận broker backend đã restart. Log backend tiếp tục nhận OFF mới04:36:09.482/04:36:24.627. Không can thiệp mạng hoặc restart để làm đẹp kết quả; nguyên nhân chi tiết disconnect ngắn chưa được xác minh. Cả3 vẫn chỉ OBSERVED, không publisher authenticated.

API401 khi không auth,400 khi query trusted/verified injection đã đối chiếu thực tế. Mock403/scope race E2E không thay thế một phiên thử phân quyền chéo farm thật; backend regression hiện có kiểm tra scope.

## 7. Publisher assurance — read-only review

Broker LAN PID1340 dùng Mosquitto executable `C:\Program Files\mosquitto\mosquitto.exe`, config `C:\mosquitto\config\mosquitto.conf`, ACL `C:\mosquitto\config\acl`, passwordfile `C:\mosquitto\config\passwords`. Chỉ đọc username, không in hash/mật khẩu. Listener1883LAN, anonymousfalse, chưa có TLS/certificate directives trong config này.

- Passwordfile có account riêng `ESP32-GF-A-01` và `smartagri_backend`; firmware username đúng deviceCode. Tồn tại account riêng **không chứng minh secret chưa được copy/sử dụng ở board khác**: credential sharing NOT VERIFIED.
- Pattern `%u` cho telemetry/status/commandacks và subscribecommands ràng buộc namespace theo authenticated username. `pattern` Mosquitto áp dụng toàn cục, không chỉ userblock ngay trước. Exact userESP32 có write actuator/state của chính nó; backend read telemetry/status/ACK wildcard, read stateESP32 cụ thể và write commands.
- Username backend khác device, không có quyền ghi namespace ESP32 từ pattern `%u` đơn thuần. Tuy nhiên policy trên disk + subscriber payload không chứng minh publisher identity từng packet hay active ACL hash đã được attested độc lập.
- MQTT3 PUBLISH delivery không kèm authenticated publisher username/certificate; ClientId/topic/deviceCode/digest không phải bằng chứng mật mã identity. MQTT QoS1 PUBACK chỉ xác nhận broker xử lý, không chứng minh DB/publisher.

Mức đề xuất:

| Mức | Bằng chứng cần | Hiện tại |
| --- | --- | --- |
| OBSERVED | callback MQTT nonretained, freshness/session, DB correlation | Đạt trong các mẫu; vẫn publisher NOT_VERIFIED |
| BROKER_POLICY_ATTESTED | Attestation config/ACL hash/version hiệu lực, connection principal và deny matrix, account lifecycle/secret isolation, TLS/server authentication, audit protection | Chưa đủ; review file không tự nâng cấp |
| DEVICE_IDENTITY_VERIFIED | Identity riêng chống giả mạo/replay, provisioning/rotation/revocation, mTLS device identity hoặc signed envelopes gắn device/boot/sequence/time và trust root được kiểm tra | Chưa có trong contract hiện tại |

Mức cao hơn cần thiết kế riêng, có thể đổi identity/protocol/schema/provisioning sau phê duyệt. Không tự sửa ACL/password/firmware, không thêm trường client tự khai báo trusted để vượt guard.

## 8. Persistence production readiness

Proposal/checklist chi tiết: `docs/PHASE13_4B_PRODUCTION_PERSISTENCE_PROPOSAL.md`. Giữ lại sáu model additive, defaultDISABLED/FAULT_LOCKED/emergencyStop/UNKNOWN, safety row lock+CAS, atomic quota/reservation/intent/audit, idempotency/RESTRICT, crashUNCERTAIN không retryON và không hoànquota tùy tiện, manualoverride/faultlatch bền vững, read-only scoped history. Phải backup+restore rehearsal và migrationapproval riêng. Chưa có production policy/rule version, persistent cycle/budget/safety adapter tin cậy cho live; không dùng test55433 hoặc fixture điền vào.

## 9. SOIL_01 readiness

`firmware/SmartAgricultureESP32/config.local.h`: dryADC3500, wetADC1507. `PumpProtocol.h` chuyển `100*(dry-adc)/(dry-wet)`, clamp0..100, invalid calibration/ADC ngoài0..4095 trả invalid. `FirmwareDiagnostics.h` có kiểm tra calibration/finite/rail và log ADC samples; telemetry hiện không cung cấp rawADC/min/max/quality evidence đủ để backend phân biệt mọi lỗi tiếp xúc.

ADC>=3500 có thể ra0% do clamp (không phải null); ADC<=1507 có thể100%; hai đầu rail0/4095 hoặc stuck value có thể hỏng/mất tiếp xúc. Phần trăm không phải VWC đã hiệu chuẩn. Ba samples23.18/23.18/24.89 chỉ là quan sát ngắn, không đủ xác nhận độ nhiễu, drift, chất lượng đất hoặc ngưỡng cho cây. Nhiễu/độ mặn/nguồn/độ sâu/vị trí/tiếp xúc cần thí nghiệm tại đất thực, đo lặp min/max/variance, tình huống rút probe/rail, đối chiếu dry/wet và thiết bị tham chiếu.

Quality policy tương lai: finite/range, rail/clamp flags, stuck/rate-of-change/noise bounds, freshness/recordedAt-vs-receivedAt, quality+calibration version và fail-closed khi không đủ. NgưỡngON/OFF dựa cây/đất/rễ, sensor calibration và soak response, có hysteresis/cooldown/quota; không chọn20/40 từ fixture. Không sửa calibration/firmware trong phase này.

## 10. An toàn và điều kiện Phase13.4C

Runtime đã xác minh qua liveAPI: commands=false, automation=false, pumpTestMode=true; gatewayDISABLED/controlEnabledfalse qua actuatorAPI; PENDING0. Hai commandMANUAL thành công ngày20/10 vẫn là lịch sử, không có command mới do phase này. FirmwareENABLE_PUMP_COMMANDS=true giữ nguyên từ phase trước; adapter giữ ngắt theo xác nhận trước, không có cảm biến độc lập để chứng minh nguồn vật lý mới trong phiên.

Kiểm tra kết thúc lúc **04:40:16–17Z (11:40 UTC+7)**: SELECT PENDING0, đúng hai command lịch sử không đổi; ESP32ONLINE, relayOFF với stateAt04:40:11.555Z. Bốn MQTT readings04:40:08.284Z: TEMP33.3, HUM68.5, SOIL22.68, LIGHT0; DB receivedAt04:40:08.720Z. API cùng dữ liệu, controlEnabledfalse/gatewayDISABLED. Đây là snapshot thực tế cuối, không phải fixture.

Hash schema production, pure decision engine, production evaluator và shadow-preview route giữ nguyên so baseline13.4A. Backend/mosquitto/postgres production không restart; test55433 không listen. Lệnh build chỉ tạo frontend artifact. Browser mock không kết nối gateway; live probe chỉ auth thông thường + GET/SELECT.

Trước VERIFIED_LIVE: phê duyệt mức assurance và adapter chứng minh principal; device session đáng tin; policy/calibration/quality version; persistence rollout/leastprivilege/restore thực tế; state/clock quality gates; history read-only, audit/recovery và tests fail-closed đầy đủ. Có thể Phase13.4C tiếp tục xây adapter/attestation read-only, **không tự bật VERIFIED_LIVE hoặc ACTIVE vì UI/clock một lần PASS**.

Nghiệm thu thủ công: mở website→Irrigation→Mô phỏng→Dữ liệu thật, xem readingId/RecordedAt tự thay sau MQTT/polling; chuyển fixture chỉ thấy mô phỏng; lỗi/mất evidence không báo quyết định tưới, OFF quá30s trởUNKNOWN. Không nhấn BẬT/TẮT và giữ adapter ngắt.
