# Kịch bản demo và thu bằng chứng

Bản chuẩn bị05/11/2026; **chưa thực hiện phiên mới**. Mục tiêu demo phần mềm trên DEV với12 readings ESP32 đã lưu; nói rõ historical/not-LIVE, không trình diễn như telemetry hiện tại. Dùng browser operator đã hoạt động; không bắt buộc giải quyết Playwright để chụp màn hình thật.

## Trước startup

Chuẩn bị thư mục ảnh, tài khoản Website DEV hiện hữu nhập cục bộ, thời gian operator sẵn sàng trong cửa sổ được duyệt. Không ghi password/token vào ảnh. Native diagnostic phải qua execution gate riêng trước. Phiên UI cần approval mới, dùng source/manifest nhất quán, không tái dùng AX/AZ hoặc marker consumed.

Existing supervised contract phải giữ: exact TEST identity/PGDATA/systemID55433,11migrations,8registration identities và12readings/units; guarded READ ONLY6/6paths, CORS204/204, login200 trước frontend; command count/PENDING/digests/ActivityLog baseline và postcheck; Commands/Automationfalse, testtrue/cap1, MQTTdisabled, gatewayDISABLED. Không startup production, seed, reset hoặc thay credentials.

## Thứ tự trong một cửa sổ đã duyệt

| Bước | Thao tác operator / lời giải thích | Evidence và tiêu chí |
|---|---|---|
| 1 | Đăng nhập DEV tại URL do launcher READY cung cấp | Không lỗi auth/CORS; không ghi token |
| 2 | Dashboard, chọn đúng Farm/Zone ESP32 |4cards TEMP/HUM/LIGHT/SOIL, value/unit/timeUTC+7, banner không sidebar che, historical rõ, không Vite overlay/API error |
| 3 | Sensors → History; range30ngày bao gồm02/11 | Chọn từng4sensor, mỗi sensor3rows; tổng12, không yêu cầu12rows trên một sensor; ghi timestamp/value/units |
| 4 | Charts cho cả4loại | Screenshot từng loại, count3; ba phép đo cách15s có thể chung bucket2h thành một điểm, **không phải mất2rows**; không sửa aggregation chỉ để có nhiều điểm |
| 5 | Device Detail | ESP32-GF-A-01, model/farm/zone/4sensors đúng; trạng thái historical, không khẳng định ONLINE hiện tại |
| 6 | Dashboard/Reports/Activity Logs | Snapshot historical, login audit memory-only được giải thích; report aggregate không chứng minh số liệu live |
| 7 | Irrigation và SOIL | Pump/automation controls disabled; soil100% vẫn chưa hiệu chuẩn/không dùng auto; không nhấn ON/OFF |
| 8 | DevTools Network, filter latest-readings | Mở trước Dashboard request; ghi path/status OPTIONS và GET thành công, không chụp Authorization/request headers/token. OPTIONS có thể được browser cache; nếu không capture thì ghi thiếu evidence, không suy từ GET |
| 9 | Kết thúc đúng deadline | Operator dừng thao tác; owned graceful cleanup, DB digest/ActivityLog/control counts không đổi theo contract |

Ảnh gợi ý: `01-dashboard.png`, `02-history-TEMP.png`, `03-history-HUM.png`, `04-history-LIGHT.png`, `05-history-SOIL.png`, `06-chart-*`, `07-device-detail.png`, `08-reports.png`, `09-controls-soil.png`, `10-network-status.png`. Đây chỉ là tên dự kiến, không tạo screenshot giả hoặc coi file ảnh đã tồn tại.

## Lời trình bày ngắn

“ESP32 đã gửi3batches×4sensor thật qua MQTT và được đối chiếu DB/API ở Phase Y. Website hôm nay đọc lại12readings đó bằng chế độ chỉ đọc. Soil chưa được hiệu chuẩn nên hệ thống không dùng nó để tự tưới. Tưới thủ công từng có thử motor tự dừng khoảng1giây; phiên này khóa điều khiển. Logic tự động được kiểm thử SHADOW, không phải tưới tự động thật.”

Khi lỗi: lưu đúng thông báo/path/status theo scope; không retry/hotpatch/gia hạn trong phiên. Nếu không mở được website, dùng ảnh/evidence đã nghiệm thu có nhãn ngày/phạm vi, nói rõ live demo chưa đạt; không giả PASS.

## Kiểm thử vật lý tách riêng — không thực hiện trong demo này

Chỉ sau phê duyệt cụ thể và operator giám sát: xác nhận nguồn/relay/dây/khu vực phù hợp, adapter ngắt trong precheck, thiết bị ONLINE/NTP và fresh OFF, serving testtrue/cap1/automationfalse/PENDING0. Cấp nguồn tại chỗ, nếu tự chạy trước lệnh thì ngắt độc lập và hủy. Operator gửi đúng số ON được duyệt, không retry; thu ACK/CommandId/MAX_RUNTIME/DB/API và quan sát motor/nước riêng. Nếu bất thường, ngắt adapter ngay, không chờ OFF qua mạng. Kết thúc rút adapter, khóa flags và xác minh fresh OFF/PENDING0. Outage/failsafe và automatic physical cần scope riêng; không dùng SOIL chưa hiệu chuẩn làm trigger.
