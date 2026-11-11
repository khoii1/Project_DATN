# Phase13.5C.3 — Runtime recovery

Ngày22/10/2026, UTC+7; theo yêu cầu người dùng “hãy kiểm tra và khôi phục lại”.

## Kết quả

- BACKEND_RECOVERY_PASS: đúng một Node backend mới PID15264 trên5000, launcher/logger PowerShell PID21836 chạy ẩn giữ capture stdout/stderr. Không chạy backend thứ hai.
- MQTT_CONNECTION_PASS: health connected, startup connect/subscriptions/off-observer logs xác nhận kết nối172.20.10.2:1883.
- LIVE_TELEMETRY_RECOVERY_PASS:3 batches mới/12 MQTT readings khớp database và REST history API.
- FRESH_PERIODIC_OFF_PASS:3 packet PERIODIC OFF mới, QoS1, retain=false, dup=false, cùng observer session, DB/API timestamp khớp; ESP32 ONLINE.
- Serving runtime PID15264: Commands=false, Automation=false, TestMode=true, effectiveMaxRunSeconds=1. Protected live-evidence API cũng xác nhận false/false/testtrue; actuator API gatewayMode=DISABLED, controlEnabled=false.
- DeviceCommand43→43; PENDING0→0; không ON/OFF mới.
- CLOCK_HEALTH_UNKNOWN: không xác nhận Windows Time/SNTP đã đạt nghiệm thu; không thay cấu hình thời gian.
- PRODUCTION_BACKUP_NOT_PERFORMED; PRODUCTION_MIGRATION_NOT_PERFORMED; VERIFIED_LIVE_NOT_READY; PHYSICAL_PUMP_NOT_TRIGGERED.

## Hiện trạng và thao tác

Preflight trước đó backend/LAN broker không phục vụ. Khi refresh, LAN broker đã chạy lại PID13308, bind0.0.0.0/::1883. Không restart hoặc tạo broker khác. Loopback brokerPID4572 không đổi. Không đọc được ExecutablePath/CommandLine PID13308 bằng quyền hiện tại; không tuyên bố đã xác minh lại config của PID mới. Netstat xác nhận backend15264 kết nối broker13308 tại172.20.10.2, và ESP32 peer172.20.10.3 có TCP connection. Successful backend auth/subscriptions và MQTT receipts mới chứng minh luồng cần thiết hoạt động, không phải chỉ TCP listener.

Wi-Fi máy Windows vẫn172.20.10.2. PostgreSQL5432 PID7848/systemID7472695863566132416/PGDATA C:/Program Files/PostgreSQL/17/data, migration11/checksums đúng; không restart, migration hoặc sửa trực tiếp DB để ép OFF. Chưa xác định nguyên nhân hai tiến trình cũ đã dừng.

Đọc startup/recovery source trước launch: startup await recoverMqttCommands rồi listen/start MQTT/watchdog, không migration/seed. Baseline PENDING0. Recovery tự invalidates trạng thái theo contract; OFF sau đó đến từ ESP32, không publish giả. Những DML recovery/ingestion/metadata bình thường thuộc phạm vi khôi phục backend; không claim database bất biến khi ingestion chạy.

Script mới `scripts/phase13-5c3-recover-backend.ps1` parse PASS, SHA256 lúc launch:

`EE57BFB3C31094940743F53CA19854E5D4C43C3B030E5F4861A41D3C67FE0997`

Một launch được ghi marker create-new; node `--import tsx src/server.ts`, cwdbackend. Chỉ inject environment vào child: MQTT_ENABLED=true, LAN broker172.20.10.2, false/false/testtrue/max1, PORT5000. Không sửa .env, credentials, firmware hoặc startup production. Không dùng lại marker one-attempt13.5A.3 hoặc overwrite bằng chứng cũ. Capture không phải Windows service/supervisor; không hứa tự phục hồi lâu dài.

Launch timestamp14:45:27.432Z; serving runtime attestation14:45:35.118Z (21:45:35UTC+7). Logger file buffer4KB khiến file stdout ban đầu0bytes, dù API đã phục vụ; verifier lần đầu dừng RUNTIME_ATTESTATION_MISSING. Không restart backend để xử lý buffering. Đã giữ error evidence riêng, bổ sung diagnostic fallback protected API + exact listener PID, không dùng log lịch sử làm runtime. Sau khi buffer flush, đọc lại log startup PID15264/cap1/false/false và MQTT subscriptions thành công. Không dựa fallback để bật command.

## Verification evidence

- `build/phase13-5c3-recovery-20261022-01.attempt.json` / `.state.json` / `.stdout.log` / `.stderr.log`.
- `report/phase13-5c3-recovery-20261022-01-baseline.json`: SELECT-only baseline43/PENDING0; đối chiếu thêm pre-start production inventory.
- `report/phase13-5c3-recovery-20261022-01-initial-log-buffered.json`: verifier ban đầu thất bại do startup log chưa flush.
- `report/phase13-5c3-recovery-20261022-01.json`: final verification PASS, actual readings IDs/timestamps/values, API/DB correlation, fresh OFF packet metadata, session, final runtime/state/command count.

Ba batch recordedAtUTC:14:46:57.582Z,14:47:12.582Z,14:47:27.582Z; chi tiết authoritative trong JSON. Không dùng telemetry trước startup. OFF được chọn theo receipt mới và DB/API exact timestamp; không lấy trạng thái lịch sử. Không suy luận motor/nước từ GPIO OFF.

Verifier dùng đúng một normal login account hiện hữu để GET protected live-evidence/actuator/history; token chỉ RAM, không ghi report/log. LOGIN_SUCCESS activity thông thường là expected auth side effect; không seed, giả token hoặc tạo command. Browser E2E không thực hiện, frontend không tự khởi động.

Thay diagnostic `phase13-5a3-live-recovery.cjs` chỉ thêm prefix recovery và API-runtime fallback khi log buffer; nhánh cũ vẫn kiểm log bắt buộc. Không sửa runtime domain, main schema hoặc engine, không cần chạy lại full regression.

## Điểm dừng và backup

Giữ backend đang chạy. Không gửi tín hiệu dừng launcher/logger; exit-code file chưa tồn tại vì backend còn chạy, không giả exit0.

Không tiếp tục pg_dump trong thao tác khôi phục này. Storage vẫn chưa có attestation/dump. Trước khi thực hiện backup đã duyệt, cần review/update log locator trong script backup: hiện hard-code log PID22400 cũ nên sẽ fail PID gate với15264; không lấy log cũ để vượt safety. Credential phải nhập cục bộ qua secure prompt, không chat/CLI. Không cần xin lại approval backup đã cấp nếu giữ nguyên phạm vi; không tự restore/migration sau backup.

Giữ adapter bơm ngắt theo yêu cầu vận hành, không tác động nguồn, GPIO, COM hoặc reset. Nguồn adapter không thể đo từ backend; không tuyên bố có xác minh vật lý mới.
