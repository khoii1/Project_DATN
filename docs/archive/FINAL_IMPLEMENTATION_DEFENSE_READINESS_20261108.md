# Bàn giao demo Smart Agriculture — 08/11/2026

## Cập nhật ESP32 thật

**REAL_ESP32_TELEMETRY_PASS** sau phê duyệt flash riêng: một lượt upload đúng hash, chip ESP32-D0WD-V3, bốn vùng hash verified;10 chu kỳ/40 readings vật lý đối chiếu Serial/PUBACK/MQTT TEST/PostgreSQL TEST/API. Operator xác nhận và cung cấp ảnh Website; cả bốn giá trị trong ảnh khớp API theo timestamp. Simulator đã dừng. Commands/Automation khóa, PENDING0, command count15→15; không kích hoạt bơm.

[Báo cáo hiện hành và bằng chứng](C:/DATN/dev-instances/defense-demo-20261108-01/docs/REAL_ESP32_TELEMETRY_ACCEPTANCE.md). Các phần sau giữ baseline simulator trước phiên flash; không coi chúng là trạng thái hiện tại.

Phiên bản phát triển độc lập: `C:\DATN\dev-instances\defense-demo-20261108-01`.

**SOFTWARE_API_TEST_PASS_BROWSER_NOT_VERIFIED**. Website TEST hiện phục vụ tại http://127.0.0.1:55873; đây là dữ liệu cảm biến mô phỏng, không kết nối bơm/ESP32 thật.

## Tài liệu bàn giao

- [Hướng dẫn chạy demo](C:/DATN/dev-instances/defense-demo-20261108-01/docs/DEMO_RUNBOOK.md).
- [Kết quả build, lint và kiểm thử](C:/DATN/dev-instances/defense-demo-20261108-01/docs/FINAL_TEST_RESULTS.md).
- [Kịch bản bảo vệ](C:/DATN/dev-instances/defense-demo-20261108-01/docs/DEFENSE_DEMO_SCRIPT.md).
- [Trạng thái từng chức năng và việc còn thiếu](C:/DATN/dev-instances/defense-demo-20261108-01/docs/FINAL_PROJECT_STATUS.md).

## Kết quả đã chạy

- Backend và frontend build/typecheck PASS; frontend lint PASS, native exit0.
- Offline regression 558/558 PASS; guard mới của demo 6/6 PASS.
- Isolated runtime acceptance 51/51 PASS; gồm nhóm API mở rộng 43/43 và mock irrigation 7/7, không cộng trùng các nhóm này.
- MQTT TEST → PostgreSQL TEST → API: 12/12 readings mới đối chiếu thành công; simulator tiếp tục gửi bốn kênh mỗi5giây, refresh API kiểm chứng timestamp mới sau6,5giây.
- Commands/Automation khóa, gateway DISABLED, PENDING0 trong TEST; không MQTT command publication. Mô phỏng ON/OFF/ACK/watchdog không phải bằng chứng bơm vật lý.
- Đối chiếu595 source file đãcopy: source gốc giữ nguyên baseline; thayđổi chỉ trong workingcopy. Diff/hashes tại `build/final-handoff` của workingcopy.

## Còn một bước cần người dùng

Cập nhật sau ảnh lỗi Vite: đã sửa Tailwind config/content resolution trong workingcopy. CSS DEV trả HTTP200 có brand theme;2/2 kiểm thử CSS và frontend build/typecheck exit0. Chi tiết trong FINAL_TEST_RESULTS của workingcopy. BuildPASS trước đó chưa bao phủ CSSDEV; controller nay có thêm gate cho stylesheet.

Mở URL trên, đăng nhập `owner-a@mvp.invalid` / `Demo123!`, xác nhận Dashboard có bốn cảm biến và tự cập nhật sau10–15giây. Nếu cần, chọn **MVP SIMULATOR FARM A / MVP SIMULATOR ZONE A**.

Chưa đánh dấu DEMO_SOFTWARE_READY khi việc sử dụng UI trực quan còn chưa xác minh. Không có phiên browser tự động hoặc Session4 mới; chưa nghiệm thu đủ19trang/5viewport.

Giữ nguyên frozen snapshot/manifest/pins/evidence; không re-pin Edge hoặc vượt global integrity287/288. Không production startup/recovery/migration, không firmware/hardware/pump. Tài liệu mới này chỉ làm chỉ mục, không thay thế báo cáo lịch sử.
