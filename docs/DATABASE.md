# Database

PostgreSQL được truy cập qua Prisma 6.19.0. Schema chuẩn nằm tại `backend/prisma/schema.prisma`; lịch sử cấu trúc nằm tại `backend/prisma/migrations/`.

## Models và quan hệ

| Model | Vai trò và quan hệ chính |
|---|---|
| `User` | Tài khoản; có thể sở hữu Farm, được gán làm STAFF, tạo cấu hình/command và phát sinh ActivityLog |
| `Farm` | Thuộc một owner; chứa assignments, Zones và ActivityLogs |
| `FarmStaffAssignment` | Nối Farm–User STAFF, chứa `canControlIrrigation` |
| `Zone` | Thuộc Farm; chứa Crops và Devices |
| `Crop` | Thuộc Zone, lưu mùa vụ/trạng thái |
| `Device` | Thuộc Zone; chứa Sensors và Actuators; lưu trạng thái vận hành/kết nối |
| `Sensor` | Thuộc Device; chứa Readings, AlertRules, Alerts và AutomationRules |
| `SensorReading` | Giá trị sensor tại thời điểm, nguồn `SIMULATOR`/`MQTT` |
| `AlertRule` | Quy tắc ngưỡng cho Sensor |
| `Alert` | Snapshot sự cố và vòng đời của AlertRule/Sensor |
| `Actuator` | Thuộc Device; chứa DeviceCommands và AutomationRules |
| `DeviceCommand` | Lệnh ON/OFF thủ công hoặc automation, có correlation/status/result |
| `AutomationRule` | Nối soil Sensor với PUMP Actuator, lưu ngưỡng và watermark |
| `ActivityLog` | Audit event, tùy chọn gắn User và Farm |

Cascade chính: xóa Farm kéo theo assignment/Zone; Zone kéo theo Crop/Device; Device kéo theo Sensor/Actuator; Sensor kéo theo reading/rule/alert/automation; Actuator kéo theo command/automation. Các quan hệ audit/creator/requester phù hợp dùng `SetNull`; owner của Farm dùng `Restrict`.

## Enums

- Quyền/tài khoản: `UserRole { ADMIN, FARM_OWNER, STAFF }`, `UserStatus { ACTIVE, INACTIVE }`.
- Farm/Zone/Crop: `FarmStatus`, `ZoneStatus` đều `{ ACTIVE, INACTIVE }`; `CropStatus { PLANNED, GROWING, HARVESTED, CANCELLED }`.
- Device: `DeviceType { CONTROLLER, GATEWAY, OTHER }`, `DeviceStatus { ACTIVE, INACTIVE, MAINTENANCE }`, `DeviceConnectionStatus { ONLINE, OFFLINE, UNKNOWN }`.
- Sensor: `SensorType { TEMP, AIR_HUMIDITY, SOIL_MOISTURE, LIGHT }`, `SensorStatus { ACTIVE, INACTIVE }`, `SensorReadingSource { SIMULATOR, MQTT }`.
- Alert: `AlertOperator { LT, LTE, GT, GTE }`, `AlertSeverity { INFO, WARNING, CRITICAL }`, `AlertStatus { OPEN, ACKNOWLEDGED, RESOLVED }`, `AlertResolutionReason { AUTO_RECOVERED, MANUAL, RULE_DISABLED, RULE_UPDATED }`.
- Actuator/command: `ActuatorType { PUMP, VALVE, RELAY, OTHER }`, `ActuatorStatus { ACTIVE, INACTIVE, MAINTENANCE }`, `ActuatorState { ON, OFF, UNKNOWN }`, `DeviceCommandType { TURN_ON, TURN_OFF }`, `DeviceCommandSource { MANUAL, AUTOMATION }`, `DeviceCommandStatus { PENDING, SUCCESS, FAILED }`.
- `ActivityAction`: login/logout; create/update/activate/deactivate user; create/update/status Farm/Zone/Crop/Device/Sensor/Actuator; staff assign/remove/irrigation permission; create/update/enable/disable AlertRule và AutomationRule; acknowledge/manual resolve Alert; issue command.

## Unique constraints và partial indexes

Tên dưới đây lấy trực tiếp từ migration:

- `users_email_key`: email duy nhất.
- `farm_staff_assignments_farm_id_staff_id_key`: một STAFF chỉ được gán một lần trong một Farm.
- `zones_farm_id_name_key`: tên Zone duy nhất trong Farm.
- `devices_device_code_key`: device code toàn cục duy nhất.
- `sensors_device_id_sensor_code_key`: sensor code duy nhất trong Device.
- `sensor_readings_sensor_id_recorded_at_key`: idempotency theo Sensor và thời gian.
- `actuators_device_id_actuator_code_key`: actuator code duy nhất trong Device.
- `device_commands_correlation_id_key`: correlation ID duy nhất.
- `alerts_one_active_per_rule_idx`: tối đa một Alert `OPEN`/`ACKNOWLEDGED` trên mỗi rule.
- `device_commands_one_pending_per_actuator_idx`: tối đa một command `PENDING` trên mỗi actuator.
- `automation_rules_one_enabled_per_actuator_idx`: tối đa một AutomationRule enabled trên mỗi actuator.

Schema còn có indexes phục vụ scope/filter/time-series, ví dụ owner/status/createdAt, foreign key, `(sensor_id, recorded_at DESC)`, alert status/openedAt và activity farm/time.

## Migrations

Có đúng **10 migrations**, theo thứ tự:

1. `20260826044448_add_users_auth`
2. `20260826053517_add_farms_zones_crops`
3. `20260826064902_add_iot_devices`
4. `20260826091140_add_sensors_and_readings`
5. `20260826143000_rename_temperature_sensor_type_to_temp`
6. `20260827022817_add_alert_rules_and_alerts`
7. `20260827032735_add_actuators_and_device_commands`
8. `20260827113854_add_automation_rules`
9. `20260827120000_add_automation_enabled_rule_index`
10. `20260827150000_add_activity_log_farm_scope`

## Seed

`npm --prefix backend run prisma:seed` tạo dữ liệu dev có thể chạy lặp lại: ba role demo, Green Farm, Zone A/B, crops, STAFF có quyền tưới, hai ESP32 demo, bốn sensor `TEMP_01/HUM_01/SOIL_01/LIGHT_01`, reading nguồn simulator, alert rules, `PUMP_01` và automation rule. Password demo nằm trong seed để phục vụ local QA; tuyệt đối không dùng ở production.

Lưu ý khi nâng Prisma: cấu hình seed hiện đặt trong `package.json`, cơ chế được Prisma 7 cảnh báo cần di chuyển.

