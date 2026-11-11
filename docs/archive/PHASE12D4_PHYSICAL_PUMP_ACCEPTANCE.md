# Phase 12D.4 — Nghiệm thu sau lần chạy bơm vật lý

Ngày kiểm tra: 20/10/2026, 20:59–21:03 Việt Nam (UTC+7).

## 1. Kết luận

**PHYSICAL_PUMP_PARTIAL.** Đã có bằng chứng command/ACK, lưu PostgreSQL, tự tắt MAX_RUNTIME và người dùng quan sát bơm chạy/tự dừng khoảng 1 giây. Đã hoàn nguyên an toàn và người dùng xác nhận rút adapter.

Không đánh dấu toàn phiên PASS vì:

- Thực tế có **hai lệnh ON riêng biệt** thay vì một lệnh được duyệt. Người dùng đã làm rõ trong yêu cầu Phase13.1 rằng đây là hai thao tác có chủ đích của họ, **không phải bằng chứng lỗi duplicate-submit**. Hai ON vẫn vượt phạm vi một ON của phê duyệtB; giữ nguyên lịch sử.
- Người dùng chưa xác nhận riêng nước có chảy. Không suy ra lưu lượng từ ACK/GPIO.
- Browser E2E trực tiếp và độ rộng xung GPIO đo bằng thiết bị chưa được kiểm chứng.
- **LONG_TERM_STABILITY_NOT_VERIFIED** cho Windows Time 45–60 phút; chỉ có SHORT_PREFLIGHT_PASS theo tiêu chí rút ngắn do người dùng yêu cầu.

Đủ cơ sở lập kế hoạch Phase 13 và kiểm thử quyết định tưới trong môi trường cô lập; **chưa đủ cơ sở bật tưới tự động trên phần cứng**. Không còn lượt ON nào trong phạm vi phê duyệt cũ.

## 2. Phạm vi và phương pháp

- Chỉ SELECT trong transaction READ ONLY bằng `build/phase12d3d-result-readonly.cjs`, đọc file log, GET API và subscribe MQTT thụ động. Diagnostic đăng nhập hợp lệ chỉ để GET; không chạy seed.
- Không phát ON/OFF, không thử lại bơm, không sửa firmware, schema, migration, dữ liệu lịch sử hoặc bật automation.
- Không khởi động lại backend trong Phase 12D.4: runtime đã ở trạng thái khóa; không cần hoàn nguyên thêm.
- Quan sát vật lý do người dùng cung cấp: “bơm hoạt động tốt và tự dừng sau 1s”, sau đó “xác nhận đã rút điện”. Xác nhận rút điện đã đáp ứng yêu cầu; không yêu cầu lặp lại.

## 3. An toàn runtime sau thử

| Điều kiện | Bằng chứng | Kết quả |
| --- | --- | --- |
| Commands=false, Automation=false, TestMode=true, cap1 | Startup PID13016 lúc13:53:17.306Z; listener5000 vẫn PID13016 khi nghiệm thu | PASS |
| API khóa | GET lúc13:59:24.637Z: gatewayMode DISABLED, controlEnabled false | PASS |
| Không còn lệnh chờ | SELECT13:59:23.991Z: PENDING=0 | PASS |
| ESP32 ONLINE | lastSeen13:59:20.353Z và các heartbeat mới | PASS |
| OFF mới | DB/API stateAt13:59:22.018Z, không dùng OFF lịch sử | PASS |
| Bốn cảm biến cập nhật | Cùng recordedAt13:59:19.862Z, receivedAt13:59:20.356Z, sourceMQTT | PASS |
| Adapter đã ngắt | Xác nhận trực tiếp của người dùng sau thử | PASS theo xác nhận người dùng |

Giá trị SELECT tại thời điểm trên: TEMP_01=26.8, HUM_01=62.8, LIGHT_01=2.5, SOIL_01=5.72. Đây là dữ liệu backend nhận, không phải chứng nhận hiệu chuẩn cảm biến.

Observer chỉ subscribe đã thu PERIODIC OFF mới14:00:22.620Z, QoS1/retain=false/dup=false, API sau đó khớp timestamp. Chốt GET14:02:54.696Z: vẫnONLINE/OFF mới14:02:53.779Z, gatewayDISABLED/controlEnabledfalse và đủ4readingsMQTT14:02:49.862Z. Không dùng retainedstatusOFFLINE cũ trả về lúc subscribe để mô tả thiết bị hiện tại.

Hoàn nguyên thực tế trước Phase này: helper nhận `rollback` lúc13:53:15.633Z, dừng đúng PID17268, khởi động backend khóa PID13016. Hash `.env` không đổi; thay đổi thử nghiệm chỉ là biến môi trường của process. OFF mới sau reload13:53:18.399Z đã được tiếp nhận. Log tại `build/short-pump-session-2026-10-20T13-51-22-526Z.backend.log` và file `.jsonl` cùng prefix.

Broker LAN PID23312 lắng nghe0.0.0.0/[::]:1883; service loopbackPID4572 vẫn riêng biệt. Không tạo broker trùng, không thay ACL/firewall trong nghiệm thu.

## 4. Đối chiếu đúng phiên thử

Device: **ESP32-GF-A-01**, actuator: **PUMP_01**. Các timestamp sau là UTC ngày20/10/2026; cộng7giờ để đổi sang Việt Nam.

| Trường | ON thứ nhất | ON thứ hai |
| --- | --- | --- |
| CommandId/correlationId |6946e5a2-1b2c-4c84-8509-f0a8df9355f2 |c84751de-54a4-46cf-9478-d6ee46e5d638 |
| Database id |cmvgqtdpe000numbo4i2ip705 |cmvgqthvk000rumbocbl9g5bb |
| command/source/transport |TURN_ON/MANUAL/MQTT |TURN_ON/MANUAL/MQTT |
| requestedAt |13:52:42.135Z |13:52:47.549Z |
| sentAt |13:52:42.169Z |13:52:47.555Z |
| expiresAt |13:52:52.135Z |13:52:57.549Z |
| maxRunSeconds |1 |1 |
| acknowledgedAt |13:52:42.329Z |13:52:47.615Z |
| completedAt |13:52:42.330Z |13:52:47.616Z |
| status/failureReason |SUCCESS/null |SUCCESS/null |
| ACK result |APPLIED |APPLIED |
| ACK recordedAt |13:52:41.823Z |13:52:47.215Z |
| OFF reason |MAX_RUNTIME |MAX_RUNTIME |
| OFF recordedAt |13:52:43.012Z |13:52:48.237Z |

`issuedAt` không phải field riêng trong DeviceCommand. Code `backend/src/services/device-command.service.ts` gán cùng biến issuedAt cho `requestedAt` và gateway input; gateway dựng issuedAt ISO trong `backend/src/gateways/mqtt-device.gateway.ts`. Vì vậy issuedAt tái dựng từ code/DB bằng requestedAt ở bảng trên, **không gọi đó là payload command đã capture trực tiếp**.

### Bằng chứng truy vấn

Helper dùng Prisma SELECT tương đương lọc sau, không sửa dữ liệu:

```sql
SELECT dc.id, dc.correlation_id, dc.command, dc.source, dc.transport,
       dc.status, dc.requested_at, dc.sent_at, dc.expires_at,
       dc.max_run_seconds, dc.acknowledged_at, dc.completed_at,
       dc.failure_reason
FROM device_commands dc
JOIN actuators a ON a.id = dc.actuator_id
JOIN devices d ON d.id = a.device_id
WHERE d.device_code = 'ESP32-GF-A-01'
  AND a.actuator_code = 'PUMP_01'
  AND dc.requested_at >= TIMESTAMPTZ '2026-10-20T13:13:49Z'
ORDER BY dc.requested_at;
```

Kết quả helper lúc13:59:23.991Z vẫn đúng hai dòng trên. Không có ACK_TIMEOUT/failureReason cho hai lệnh; ACK_TIMEOUT ngày16/10 là bản ghi cũ, không bị sửa hoặc tính vào phiên này.

## 5. MQTT, firmware và website

Topic đã quan sát:

- ACK: `smart-agriculture/v1/devices/ESP32-GF-A-01/command-acks/PUMP_01`.
- State: `smart-agriculture/v1/devices/ESP32-GF-A-01/actuator/state`.

ACK thực tế ON1:

```json
{"schemaVersion":1,"commandId":"6946e5a2-1b2c-4c84-8509-f0a8df9355f2","deviceCode":"ESP32-GF-A-01","actuatorCode":"PUMP_01","type":"PUMP_SET","state":"ON","result":"APPLIED","recordedAt":"2026-10-20T13:52:41.823Z"}
```

OFF thực tế sau ON1:

```json
{"schemaVersion":1,"deviceCode":"ESP32-GF-A-01","actuatorCode":"PUMP_01","state":"OFF","reason":"MAX_RUNTIME","recordedAt":"2026-10-20T13:52:43.012Z"}
```

Cả hai ACK và hai OFF là QoS1, retain=false, dup=false theo rawlog `build/physical-pump-passive-2026-10-20T13-51-32-832Z.jsonl`. Hai UUID khác nhau là hai yêu cầu mới, không phải redelivery cùng commandId.

Command publish QoS1/retain=false được xác nhận bằng `backend/src/mqtt/mqtt-client.service.ts:57`. Observer không đọc topic command (backend account có quyền publish, không giả định có quyền đọc). Vì vậy không có wire capture command đầy đủ, chỉ có DB/gateway source và ACK tương ứng.

Firmware `firmware/SmartAgricultureESP32/PumpProtocol.h`: khi elapsed monotonic đạt runtime, `forceOff()` thực thi nhánh ghi false và trả MAX_RUNTIME; `confirmedOff()` đòi ghi GPIO thành công. `.ino` báo OFF sau đó với timestamp mới. Đây là bằng chứng logic/GPIO được firmware báo, không phải đo độc lập chân GPIO hoặc lưu lượng.

Backend access log có hai `POST /api/actuators/demo_actuator_pump_a/commands` trả202, sau đó GET danh sách/summary và OFF committed. Source DB làMANUAL; phù hợp phiên người dùng thực hiện trên website. `frontend/src/pages/irrigation/IrrigationPage.tsx` gọi service từ dialog, polling2giây; UI có thể không kịp hiển thị phaON1giây. Không tự nhấn website, không có ảnh/E2E trực tiếp xác nhận từng trạng thái UI lần thử. API sau thử DISABLED/OFF đã xác minh, không coi API là bằng chứng browser E2E PASS.

## 6. Đánh giá bất thường và Windows Time

- Bơm tự dừng: PASS theo firmware reports, DB/API và quan sát người dùng. Không kết luận xungGPIO chính xác1.000ms từ chênh timestamp ACK/OFF.
- Hai ON cách requestedAt khoảng5.414giây: vượt điều kiện duy nhấtmộtON. Theo xác nhận mới của người dùng, cảhai do họ chủ động thao tác, không có bằng chứng lỗi double-submit trong phiên đó. Backend chỉ có khoảng nghỉON2giây, không có quota thửmộtlệnh nên cho phép hai ý định khác nhau cách5.4giây. Có thể bổ sung quota/idempotency cho các phiên thử sau, nhưng không gọi đây là sửa một lỗi double-submit đã chứng minh.
- Chưa phát hiện commandAUTOMATION trong phiên; automation runtimefalse. Không có command do agent phát. Không tự thử lại để điều tra.
- Windows lúc20:59:25: source0x8, peerActive/Mode3/Stratum4, LI0/Stratum5, LastSyncError0, LastSuccessfulSync20:53:20, PhaseOffset−0.0468640s. Truy vấn SystemTime-Service/Operational từ20:51:22 không trả event mới ở thời điểm đọc; không có bằng chứng lỗi stale mới. Không coi việc không có event là bằng chứng liên tục60phút.
- **LONG_TERM_STABILITY_NOT_VERIFIED** giữ nguyên; không nối các khoảng đã ngắt thành45–60phút hoặc sửa guard FUTURE_COMMAND2giây.

## 7. Bàn giao và điều kiện chuyển Phase13

Chỉ tạo hai báo cáo trong Phase12D.4; kiểm tra trực tiếp môi trường bằng đọc. Không chạy regression suite có ghiDB, không nạp firmware hay bật flags. Không tuyên bố lại test cũ đã được chạy trong Phase này.

Điều kiện còn thiếu trước tự động thật: kiểm soát quota/ý định phátON trong phiên thử, hiệu chuẩnSOIL_01, bổ sung safety policy thời gian/ngân sách/quota, nhật ký quyết định, kiểm thử dry-run và fault injection cô lập. Xem [kế hoạch Phase13](PHASE13_AUTOMATIC_IRRIGATION_PLAN.md) và [triển khai shadow Phase13.1](PHASE13_1_SHADOW_DECISION_ENGINE.md). Bật automation hoặc thử thêm phần cứng phải được phê duyệt riêng, không dùng lại quota phiênB đã sử dụng vượt giới hạn.

### Làm rõ theo thông tin mới ở Phase13.1

HaiON đã được người dùng xác nhận là thao tác có chủ đích; dữ liệu lịch sử/CommandId/ACK không thay đổi. Không có bằng chứng duplicate-submit. Bơm chạy và tự dừng tốt theo quan sát người dùng, không có phép đo độc lập độ rộngGPIO chính xác. WindowsTime dài hạn vẫn NOT VERIFIED. Kết luận tổng thể vẫn PHYSICAL_PUMP_PARTIAL theo phạm vi nghiệm thu và các bằng chứng còn thiếu, không vì một lỗi double-submit giả định.
