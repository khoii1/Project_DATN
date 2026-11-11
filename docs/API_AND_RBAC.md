# API và RBAC

Base URL mặc định: `http://localhost:5000/api`. Tất cả endpoint trừ health và login cần Bearer JWT.

## Nhóm API

| Prefix | Chức năng chính |
|---|---|
| `/health` | Trạng thái HTTP/database/MQTT |
| `/auth` | login, me (`GET`/`PATCH`), change-password (`PATCH`), logout |
| `/users` | list/detail/create/update user |
| `/farms` | CRUD Farm, staff list/candidates/assign/permission/remove |
| `/zones`, `/crops` | CRUD theo farm scope; latest readings của Zone |
| `/devices` | summary, CRUD, latest readings |
| `/sensors` | summary, CRUD, raw readings, chart, statistics |
| `/alert-rules`, `/alerts` | rule CRUD; alert summary/list/detail/acknowledge/resolve |
| `/actuators`, `/device-commands` | actuator CRUD/summary, issue command, history |
| `/automation-rules` | list/detail/create/update/enable/disable qua update |
| `/reports` | overview, sensors, alerts, irrigation, automation, CSV export |
| `/activity-logs` | audit log có filter/page/scope |

Không có public HTTP endpoint ingest telemetry. Telemetry đi qua service/simulator nội bộ hoặc MQTT adapter.

## Authentication

- Login kiểm tra user ACTIVE, bcrypt và trả JWT.
- JWT payload được middleware xác thực; `/auth/me` phục hồi user hiện tại.
- Login limiter: cửa sổ 15 phút, tối đa 10 lần ngoài development và 50 lần trong development.
- Logout ghi ActivityLog và client xóa token; server không có refresh token, blacklist hay revocation list.
- User routes được bảo vệ toàn router bằng ADMIN.

## Ma trận quyền

| Khả năng | ADMIN | FARM_OWNER | STAFF |
|---|---:|---:|---:|
| Quản lý user | ✅ toàn hệ thống | ⬜ | ⬜ |
| Xem Farm | ✅ tất cả | ✅ Farm sở hữu | ✅ Farm được gán |
| Tạo Farm | ✅ chọn owner ACTIVE | ✅ tự là owner | ⬜ |
| Sửa cấu hình Farm/Zone/Crop/Device/Sensor/Rule/Actuator | ✅ | ✅ trong Farm sở hữu | ⬜ |
| Quản lý staff trong Farm | ✅ | ✅ Farm sở hữu | ⬜ |
| Xem telemetry/alert/report | ✅ | ✅ Farm sở hữu | ✅ Farm được gán |
| Acknowledge Alert | ✅ | ✅ trong scope | ✅ trong scope |
| Resolve Alert thủ công | ✅ | ✅ trong scope | ⬜ |
| Điều khiển tưới thủ công | ✅ | ✅ trong scope | ✅ chỉ khi assignment có `canControlIrrigation=true` |

Command vẫn phải vượt qua safety checks; quyền không bảo đảm command sẽ thành công.

## Farm scope và chống IDOR

- ADMIN có danh sách farm không giới hạn.
- FARM_OWNER được lọc theo `Farm.ownerId`.
- STAFF được lọc qua `FarmStaffAssignment`.
- Service/repository truy vấn resource với scope actor; không chỉ kiểm tra sau khi đã load ID.
- Resource ngoài scope thường trả `404`; đúng scope nhưng role không được phép ghi trả `403`.
- STAFF chỉ có quyền read đối với cấu hình, ngoại trừ acknowledge Alert và manual irrigation khi có cờ quyền.
- Reports dùng danh sách farm truy cập được. Activity Log: ADMIN xem toàn hệ thống; OWNER xem log Farm sở hữu và log cá nhân phù hợp; STAFF giới hạn log của chính mình/phạm vi repository quy định.

## Validation và lỗi

Zod kiểm tra body/query/params. Global error handler chuẩn hóa lỗi; Prisma conflict quan trọng được chuyển thành `409`. CORS chỉ cho `CLIENT_URL` (và loopback dev được code cho phép). Không dựa vào việc UI ẩn nút để bảo vệ API.

