# Hệ thống Nông nghiệp Thông minh IoT (Smart Agriculture)

Đồ án tốt nghiệp xây dựng hệ sinh thái giám sát môi trường và điều khiển tưới tiêu thông minh đa nền tảng (**Mạch phần cứng ESP32** $\leftrightarrow$ **MQTT Broker** $\leftrightarrow$ **Backend RESTful API & SQL Server** $\leftrightarrow$ **Website Quản trị React** & **Ứng dụng Di động React Native - Expo Go**).

---

## 1. Kiến trúc & Công nghệ sử dụng

- **Phần cứng & Vi điều khiển (`firmware/SmartAgricultureESP32/`):**
  - Vi điều khiển **ESP32 DevKit V1** lập trình bằng **C/C++ (Arduino Framework + FreeRTOS)**.
  - Đọc 4 cảm biến thực tế chu kỳ **5 giây/lần**: Nhiệt độ & Độ ẩm không khí (`DHT22`), Cường độ ánh sáng (`BH1750` giao tiếp I2C), Độ ẩm đất (`LM393` ADC 12-bit).
  - Điều khiển Relay máy bơm nước (`GPIO26`) qua giao thức **MQTT QoS 1** có cơ chế xác nhận hai chiều (`ACK`) và tự ngắt an toàn khi mất kết nối mạng.
- **Trạm trung chuyển bản tin IoT:** **Eclipse Mosquitto MQTT Broker** (xác thực tài khoản/mật khẩu và phân quyền ACL theo thiết bị).
- **Backend API (`backend/`):** **Node.js + Express + TypeScript**, **Prisma ORM**, xác thực **JWT**, kiểm tra dữ liệu **Zod**, phân quyền **RBAC** (`ADMIN`, `FARM_OWNER`, `STAFF`).
- **Cơ sở dữ liệu:** **Microsoft SQL Server** (`smart_agriculture`, bảng mã `Vietnamese_CI_AS`).
- **Giao diện Website (`frontend/`):** **React 19 + TypeScript + Vite + Tailwind CSS + Recharts**.
- **Ứng dụng Di động (`mobile/`):** **React Native + Expo Go (TypeScript)** + **react-native-svg** chạy trực tiếp trên cả Android, iPhone (qua Expo Go) và Web, đồng bộ thời gian thực với Backend và Website.

---

## 2. Chức năng nổi bật

1. **Xác thực & Tài khoản:** Đăng nhập, Đăng ký tài khoản mới (`Chủ trang trại` / `Nhân viên`), Quên mật khẩu & Đặt lại mật khẩu bằng mã xác thực 6 số, Đổi mật khẩu & Cập nhật hồ sơ.
2. **Giám sát môi trường thời gian thực:** Tự động cập nhật thông số 4 cảm biến mỗi **5 giây**, xem biểu đồ lịch sử biến thiên theo khung giờ/ngày và thống kê *Thấp nhất – Trung bình – Cao nhất*.
3. **Điều khiển Tưới Tự động kết hợp Thủ công:**
   - **Tưới tự động thật:** Tự bật máy bơm khi độ ẩm đất xuống dưới ngưỡng cài đặt (ví dụ `< 30%`) và tự ngắt khi đất đủ ẩm (`>= 45%`).
   - **Tưới thủ công linh hoạt:** Bấm **Bật / Tắt máy bơm** trực tiếp trên Web hoặc Điện thoại bất kỳ lúc nào (tự động ưu tiên thao tác tay và hỗ trợ nút **Chuyển về tự động ngay**).
4. **Cảnh báo vượt ngưỡng:** Tự động phát cảnh báo theo mức độ (*Thông tin / Cảnh báo / Nghiêm trọng*), hỗ trợ xác nhận đã xem và đóng sự cố.
5. **Quản trị nông trại & Báo cáo CSV/Excel:** Quản lý Trang trại, Phân quyền nhân viên tưới, Khu vực, Cây trồng, Thiết bị IoT, Người dùng, Nhật ký hoạt động và Xuất báo cáo **Excel/CSV** tiếng Việt chuẩn `UTF-8 BOM`.

---

## 3. Sơ đồ kết nối chân phần cứng ESP32

| Linh kiện | Chân kết nối trên ESP32 | Ghi chú |
|---|---|---|
| Cảm biến `DHT22` (Nhiệt độ & Độ ẩm KK) | `GPIO 4` | Nguồn 3.3V |
| Cảm biến `BH1750` (Ánh sáng - I2C) | `SDA: GPIO 21`, `SCL: GPIO 22` | Địa chỉ I2C `0x23` |
| Cảm biến `LM393` (Độ ẩm đất - Analog) | `GPIO 34` (`AO`) | Đọc ADC 12-bit |
| Module Relay Máy bơm nước | `GPIO 26` | `HIGH` = Bật, `LOW` = Tắt |

---

## 4. Khởi chạy nhanh hệ thống (1-Click)

### Khởi động toàn bộ dịch vụ (Mosquitto + Backend SQL Server + Website)
- **Cách 1:** Nhấp đúp chuột vào file **`start-demo.bat`** tại thư mục gốc (để dừng toàn bộ, nhấp đúp **`stop-demo.bat`**).
- **Cách 2 (Terminal):**
  ```powershell
  npm run demo:start
  # Để dừng toàn bộ:
  npm run demo:stop
  ```

### Khởi chạy Ứng dụng Mobile React Native (Expo Go)
- **Quét mã QR bằng điện thoại (Android / iPhone):**
  1. Tải ứng dụng **Expo Go** trên Google Play hoặc App Store.
  2. Kết nối điện thoại và máy tính vào cùng một mạng Wi-Fi (hoặc Hotspot).
  3. Nhấp đúp file **`start-mobile.bat`** (hoặc chạy `npm run mobile:start`) rồi mở **Expo Go** quét mã QR trên màn hình Terminal.
  4. Ứng dụng sẽ tự động nhận diện địa chỉ IP máy chủ Backend (`http://<IP-máy-tính>:5000`) mà không cần nhập thủ công.
- **Chạy giao diện Mobile trên trình duyệt máy tính:** Nhấn phím `w` trong cửa sổ **`start-mobile.bat`** (hoặc chạy `npm run mobile:web`).

---

## 5. Tài khoản mặc định để trải nghiệm

| Vai trò | Email | Mật khẩu |
|---|---|---|
| **Quản trị viên (`ADMIN`)** | `admin@smartagri.local` | `Admin123` |
| **Chủ trang trại (`FARM_OWNER`)** | `owner@smartagri.local` | `Owner123` |
| **Nhân viên (`STAFF`)** | `staff@smartagri.local` | `Staff123` |
