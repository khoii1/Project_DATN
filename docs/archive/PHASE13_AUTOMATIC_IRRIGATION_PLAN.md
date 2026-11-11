# Phase 13 — Kế hoạch tưới tự động, ưu tiên dry-run

> Cập nhật Phase13.2: fixture/mock preview có authentication/scope và UI đã triển khai, browser E2E trên mock PASS. Persistence vẫn DESIGN_ONLY, VERIFIED_LIVE chưa triển khai, ACTIVE=false. Xem [báo cáo và proposal Phase13.2](PHASE13_2_SHADOW_PREVIEW_AND_PERSISTENCE_DESIGN.md).

> Cập nhật Phase13.1 ngày20/10/2026: pure shadow engine đã triển khai và kiểm thử offline, chưa tích hợp production/ACTIVE. Xem [báo cáo Phase13.1](PHASE13_1_SHADOW_DECISION_ENGINE.md). Người dùng xác nhận haiON trước là hai thao tác có chủ đích, không phải bằng chứng duplicate-submit. Nội dung bên dưới là kế hoạch tổng thể; các phần persistence/atomicity/ACTIVE chưa được triển khai.

Ngày khảo sát:20/10/2026. **DESIGN_ONLY — AUTOMATION_DISABLED.** Không có tính năng nào dưới đây được triển khai/kích hoạt trong lần lập kế hoạch này.

## 1. Điều kiện đầu vào

Runtime đang khóa: commands=false, automation=false, testMode=true/cap1giây, firmwareENABLE_PUMP_COMMANDS=true giữ nguyên, adapter đã rút theo xác nhận người dùng. Không sử dụng lại phê duyệtB cho tự động thật.

Phase12D.4 kết luận PHYSICAL_PUMP_PARTIAL: luồng vật lý tự dừng đã có bằng chứng, nhưng phát sinh haiON, chưa xác nhận riêng nước và chưa nghiệm thu WindowsTime dài hạn. Các giới hạn này không biến mất khi chuyển sang thiết kế.

## 2. Kiến trúc thực tế có thể tái sử dụng

| Thành phần | Source | Hiện có / giới hạn |
| --- | --- | --- |
| Ingestreading và trigger |`backend/src/services/telemetry-ingestion.service.ts` |Sau ghi reading, gọi evaluation với readings mới; không dùng làm dry-run trực tiếp vì evaluation hiện có ghiDB |
| MQTT trust đầu vào |`backend/src/mqtt/mqtt-telemetry.adapter.ts` |Chỉ trigger side-effects khi fresh, non-retained/non-dup; directingest vẫn cần kiểm tra nguồn trong policy |
| Quyết định ngưỡng |`backend/src/services/automation-evaluation.service.ts` |Hysteresis, stale check, claim lastEvaluatedAt, manualoverride/cooldown; trả outcome nhưng chưa có decisionaudit bền vững tại đây |
| CRUD/scope |`backend/src/services/automation-rule.service.ts`, routes/repository/validator tương ứng |SOIL_MOISTURE/PUMP/cùngzone, ngưỡngbật<ngưỡngtắt, một ruleenabled/actuator, RBAC/farm scope |
| Command safety |`backend/src/services/device-command.service.ts` |ONLINE/freshheartbeat, currentOFFconfirmed, allowlist, flags, broker, PENDING, manualpriority, capruntime |
| ACK/lifecycle |`backend/src/gateways/mqtt-device.gateway.ts` |LivecommandId, expiry, schema/topic/identity match, timestampguard, không coi PUBACK làsuccess |
| OFFfresh |`backend/src/mqtt/mqtt-pump-state.adapter.ts`, `mqtt-state-observer.ts` |RecoveryUNKNOWN, freshOFF trongsession; không lấy OFFcũ để vượtgate |
| UI |`frontend/src/components/automation/AutomationPanel.tsx`, `pages/irrigation/IrrigationPage.tsx` |RuleCRUD/manualoverride và commandhistory; phầnmanual/history poll2giây, AutomationPanel chưa cópolling quyết định liên tục |
| Firmware fail-safe |`firmware/SmartAgricultureESP32/PumpProtocol.h`, `.ino` |Monotonicautostop, max5giây, timestamp/duplicate/session guard, periodicOFF15giây; không nângcap |

Default trong `backend/src/config/env.ts` (không khẳng định là giá trịenvruntime hiện tại): cooldown60giây, manualoverride15phút, maxreadingage300giây. Các giá trị này cần policy riêng cho phần cứng thật; không dùng mặc định làm bằng chứng an toàn đã nghiệm thu.

## 3. Các khoảng trống cần giải quyết trước ACTIVE

1. `AutomationReading` hiện chỉ cóid/sensorId/value/recordedAt; chưa mang source/receivedAt và MQTTtrust vào purepolicy. Phải chống đườngingestkhác hoặc timestampgiả vượtguard.
2. Ngưỡnghysteresis hiện dùng trạngtháiGPIO làm state. Với pulse1giây, máy tự OFF trong khi đất vẫn khô, rule có thể đề nghịON lại mỗi cooldown. Cần trạngthái chu kỳ tưới, soak/re-evaluate và rearm rõ ràng, không coi relayOFF là reset chu kỳ.
3. Chưa có giới hạn tổngthời gian/ngày, ngân sách atomic, faultlatch sauACK_TIMEOUT và durabledecisionaudit tại evaluator.
4. Chưa thấy runtime clock-health gate kiểm tra WindowsNTP trướcON trong commandservice. Firmware timestampguard2giây không thay cho kiểm tra sứckhỏeclock phía backend. Không nới guard để tránhTIMEOUT.
5. Người dùng đã xác nhận haiON phiênvậtlý là hai thao tác có chủ đích, không có bằng chứng duplicate-submit. Vẫn cần quota phiên thử và idempotency cho một ý định trong thiết kế nhiều instance; không retry phần cứng hoặc gán lỗi UI từ hai ý định riêng biệt.
6. Rule create hiện default enabled=true nếu bỏ field; không dùng default này khi đưa rulethật mới lên. Ruleenabled không đồng nghĩa physicalautomationenabled. Chế độSHADOW phải có ranhgiới không thể gọi gateway dù ruleenabled.
7. “Tắt rule” hiện chỉ ngừng tạo lệnh mới, không dừng relay đangON; UI đã mô tả điều này. EmergencyStop phải được thiết kế riêng, không dựa vào toggle rule.

## 4. Thiết kế đề xuất

### 4.1 Ba chế độ tách biệt

- DISABLED: không tạo command. Có thể hiển thị dữ liệu/trạngthái.
- SHADOW/DRY_RUN: hàmquyếtđịnh thuần nhận snapshot+clock giảlập, trảWOULD_ON/WOULD_SKIP/...; **không import gateway, không tạo DeviceCommand, không thay rule/readingDB thật**. Logfile môphỏng hoặc DBtest riêng nếu cần persistence.
- ACTIVE: chỉ sau dry-runPASS, antoànđượcphêduyệt, có cảflagcho phépcommand vàautomation cùngmodeACTIVE rõràng. DefaultDISABLED, không tự chuyển từSHADOW sangACTIVE khi backendrestart.

Tái sử dụng service/gateway đã có; không sửaMQTTtopic/schema hoặc firmware để làm bước đầu. Không truyền `options.gateway` giả vào service trênDBthật: đó vẫn có thể tạo command/đổiactuator, không phải dry-run antoàn.

### 4.2 Input và điều kiện fail-closed

Chỉ dùngSOIL_01 đã cấu hình trênESP32-GF-A-01/cùngzonePUMP_01, sourceMQTT, sốfinite trong0..100; số0 là dữliệuthật chứkhôngmissing nhưng vẫn phải qua kiểmtrađộtbiến/hiệuchuẩn. Snapshot gồm readingId, recordedAt, receivedAt, trustflags, device/presence/actuatorfreshsession, ruleversion, clockhealth.

ChặnON khi bất kỳ điều kiện: OFFLINE/heartbeatcũ, actuatorUNKNOWN hoặc thiếuOFFconfirmed trongsession, brokerdown, readingcũ/future/retained/duplicate/out-of-order/saiidentity, clockhealthUNKNOWN/UNHEALTHY, pendingcommand, manualoverride, kill-switch, faultlatch, cooldown/soak chưaqua, hếtngânsách. Recheck trong criticalsection ngay trước tạo command, không chỉ kiểmtra trongUI.

Đề xuất ban đầu maxreadingage45giây cho chu kỳ đo15giây, yêu cầu một số sample liên tiếp đángtin trước đề nghịtưới; đây là tham số cần kiểmthử/duyệt, chưa được cài đặt. Kiểmtra cảrecordedAt vàreceivedAt; độtrễnhận không phải phép đo riêng clockskew.

Clockhealthadapter chỉđọc nguồn/thờigiansync/lỗi/offset với TTLsnapshot; stalehealth hoặc mấtquyềnđọc -> UNKNOWN -> khôngON. TrênWindows có thể táisử dụng cách đoW32Time read-only; backend không tựresync/đổi registry. Clockjump phảihuỷ quyếtđịnh, hết hạn snapshot và không tự phục hồi mộtýđịnhON cũ.

### 4.3 Tưới dạng pulse + soak

NgưỡngbậtL vàtắtH phải0<=L<H<=100. Giá trị cụthể chỉ chọn sau hiệu chuẩnSOIL_01 và thử vớiđất/cây, không mặcđịnh mộtngưỡng nônghọc.

Chu kỳ đềxuất: IDLE -> ELIGIBLE -> PENDING_ACK -> PULSE_ACTIVE -> WAIT_FRESH_OFF -> SOAK -> REEVALUATE. Mọi lỗi/timeout -> FAULT_LOCKED; không tự tạoON khác. DeviceOFFLINE làm mất xácnhậnstate, không báo đãtắtvậtlý. NhậnMAX_RUNTIME/OFFmới là kếtthúc pulse, không phải kếtthúc nhu cầu tưới.

- Đất<L cósamplemới liên tiếp vàđủguard mới đềnghịpulse.
- L..H: giữtrạngtháichukỳ, không daođộng.
- Đất>=H: không tạoON tiếp; nếuđangON có thể đềnghịOFF qua cơchếan toàn đãđượcphêduyệtởgiaiđoạntriểnkhai. Không gửiOFFtronglầnlập kếhoạch.
- Saupulse phải cóOFFmới vàsoakinterval mới xétreadingmới khácreading đãdùng. Drypersistentlykhôngđược phépON vôhạn.

Giữ mỗi pulse<=1giây khi testMode=true, backendkiểmtrađộclậpfrontend. FirmwareMAX_PUMP_SECONDS5 làtrầnfailsafe, không phải cho phép tựtưới5giây. Cooldown/minrest tính peractuator từ OFFconfirmed, áp dụng xuyênrule vàmanual/auto theo chínhsách; không chỉ perrule. Sốminrest/soak cụthể phải duyệt sau shadowtest.

### 4.4 Ngân sách, concurrency, restart

Dailybudget tính trên timezoneAsia/Bangkok/UTC+7, tổng **reserved runtime** theoactuator trêncácnguồn liênquan, không chỉcommandSUCCESS. Lock/atomicreserve trướcpublish, mộtcycle/idempotencykey duy nhất cho snapshotreading+ruleversion+actuator. DBpendingunique hiện có không thay thế quota/ngânsách.

ACK_TIMEOUT/mấtkếtnối cóthểđãchạyvậtlý: không trả lại ngân sách chỉ vì thiếuACK, không tựretryON và không táiphátON cũ sau reconnect. Chỉ release phầnchưa thểphát khi cóbằngchứng chắcchắn; phươngánđầutiên tínhbảothủ toànreservedseconds. Restart không resetquota/cooldown/fault; cầnstatebềnvững vàtáiđốichiếuOFFmới trướcre-arm. Clockrollback/dayboundarykhôngđượctạo thêm ngân sách tráiýđịnh.

### 4.5 Dừng và giám sát

Nút tắtAUTO dừng ýđịnhmới; nút emergencyStop táchriêng để locklatch+cốgắngOFF khi cókênhhợplệ, không gọi thànhcông nếu thiếubáocáo. Ngắtadapter tại chỗ là phươngtiệnđộclậpưu tiênkhibấtthường. Khôngđược tựbậtAUTO lại khi reload/reconnect hoặc userđóngdialog.

Nhật ký decision dựkiến: ruleversion, readingId/source/times/value, mode, clockhealth, presence/stateevidence, thresholds, cooldown/budgetbefore-after, outcome/reasoncode, cycleId, commandId/ACK/OFFlinks, actor. Không ghi credential. Websitehiển thị "môphỏng" rõràng, latestdecision/fault/cooldown/ngânsách, history cóphạmvi farm/RBAC vàpolling cócancellation.

## 5. Dữ liệu và phê duyệt kiến trúc

PrismamodelAutomationRule hiện chỉ cóthresholds/enabled/lastEvaluatedAt/lastCommandAttemptAt vàliênkếtcommands; chưa cócácfieldquota/decisionaudit/cycle. Trướcimplement phải đềxuất schema/APIcontract riêng cho policy, cycle/decisionlog/budgetreservation (hoặc thiết kếkhác tươngđương) vàxinphêduyệt migration. **Không có migration hoặc DBchange trong kếhoạch này.** Không lách bằng nhétstatean toàn vào frontend/localStorage.

## 6. Lộ trình và kiểm thử không phần cứng

1. P13.0: ghi nhận haiON có chủ đích, chốt quota thử và idempotency theo ý định; kiểm định calibrationSOIL_01, chốt policy threshold/rest/budget và phương ánclockhealth. Không mở flags.
2. P13.1: puredecisionengine với fakeclock, fixtures và fakegateway có assertionpublishCount=0 choDISABLED/SHADOW; không dùngPostgreSQLhiệntại.
3. P13.2: concurrency/restart/idempotency/budget trên DBtest côlập vàMQTTtestkhôngtrỏbrokerthật. Migrationtest chỉ trên DBtest sauphêduyệt schema.
4. P13.3: UI mockE2E cho quyếtđịnh/history/toggle/fault/polling, doubleclick và haiintent khácnhau. Không đánhE2EPASS bằng unittests.
5. P13.4: shadow trênsnapshot/read-onlydữliệuthật sauphêduyệt; decisionlog không làmđổiDeviceCommand/actuatorDBthật, không tạo command. Đánhgiá sai lệch đất/cảm biến vàtần suất đềnghị.
6. P13.5: chỉ đềxuất nghiệmthuautomationphầncứng cóphêduyệtriêng, adapterngắttrongchuẩnbị, pulse1giây, mộtlầncógiámsátvàrollback. Không tựtriểnkhai từbáocáo này.

Ma trận kiểmthử bắtbuộc: L/Hboundary+hysteresis; soil0/null/NaN/saturation; stale/future/out-of-order/retained/duplicate; OFFLINE/UNKNOWN; OFFcũ saurestart; brokerreconnect; clockunsynced/jump; pending/ACKAPPLIED/REJECTED/TIMEOUT/lateACK; minrest/soak/manualoverride; đaactuator/đa instance; dailybudget/dayboundary; idempotency/doubleclick; faultlatch/kill-switch; telemetrykhôngbịảnhhưởng. KhôngretryON sauACK_TIMEOUT, khônggửiON quá1giây ởtestmode.

## 7. Exit gate

Phase13.1 hiện **PHASE13_1_IMPLEMENTED / SHADOW_TESTS_PASS / AUTOMATION_DISABLED**; persistence và tích hợp ACTIVE **NOT IMPLEMENTED**. HaiON đã hiểu là hai thao tác có chủ đích. Chỉ chuyển ACTIVE khi policy được duyệt, pure shadow+DBtest+browsermock có bằng chứngPASS, clockgate fail-closed, telemetry/statefresh, hạn mức bền vững, hướng dẫn ngắt nguồn/rollback và phê duyệt phần cứng riêng. Nước chảy/hiệu quả tưới cần quan sát hoặc đo độc lập; ACK/GPIO không đủ. Không gọi WindowsTime dài hạnPASS khi chưa nghiệm thu.
