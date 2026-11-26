# Hướng Dẫn Đưa Dự Án Lên Cloud Miễn Phí 100% (Supabase + HiveMQ Cloud + Render + Vercel)

Toàn bộ mã nguồn Backend, Website, Mobile (Expo Go) và Firmware ESP32 đã được cấu hình sẵn sàng cho môi trường Cloud. Bạn chỉ cần thực hiện lần lượt **5 bước đăng ký & dán biến môi trường** dưới đây (khoảng 10–15 phút):

---

## Bước 1: Tạo Cơ sở dữ liệu PostgreSQL trên Supabase (Miễn phí)

1. Truy cập **https://supabase.com** $\rightarrow$ Đăng nhập bằng GitHub $\rightarrow$ Bấm **New project**.
2. Điền thông tin:
   - **Name:** `smart-agriculture`
   - **Database Password:** Tự đặt mật khẩu dễ nhớ *(không dùng ký tự đặc biệt như `@`, `#`, `?` để tránh lỗi URL, ví dụ: `SmartAgri2026Pass`)* $\rightarrow$ Lưu lại mật khẩu này.
   - **Region:** Chọn `Southeast Asia (Singapore)` để tốc độ về Việt Nam nhanh nhất $\rightarrow$ Bấm **Create new project**.
3. Đợi 1 phút tạo xong, nhìn lên thanh trên cùng bấm nút **Connect** (hoặc vào *Project Settings $\rightarrow$ Database*):
   - Chọn tab **ORM** $\rightarrow$ **Prisma** (hoặc kéo xuống mục **Session pooler** - cổng `5432`, hỗ trợ **IPv4** cho Render Free).
   - Copy chuỗi kết nối dạng:
     ```text
     postgresql://postgres.[ma-du-an]:[MAT-KHAU-CUA-BAN]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
     ```
   - *(Quan trọng: Hãy dùng đúng link có chữ `.pooler.supabase.com:5432`, không dùng link `db.xxx.supabase.co` vì Render gói Free chỉ hỗ trợ mạng IPv4).*

---

## Bước 2: Tạo MQTT Broker trên HiveMQ Cloud (Miễn phí cho ESP32 & Backend)

1. Truy cập **https://console.hivemq.cloud** $\rightarrow$ Đăng ký/Đăng nhập miễn phí.
2. Chọn gói **Serverless (Free - $0/month)** $\rightarrow$ Bấm **Create Serverless Cluster**.
3. Sau khi Cluster tạo xong:
   - Copy dòng **Cluster URL**, ví dụ: `8a1b2c3d4e.s1.eu.hivemq.cloud`
   - Chuyển sang tab **Access Management** $\rightarrow$ Tạo tài khoản truy cập MQTT (Credentials):
     - **Username:** `smartagri`
     - **Password:** Ví dụ `SmartAgriMqtt2026`
     - **Permission:** Chọn **Publish and Subscribe** $\rightarrow$ Bấm **Add**.

---

## Bước 3: Deploy Backend lên Render.com (Tự động tạo bảng & tài khoản mẫu)

1. Truy cập **https://dashboard.render.com** $\rightarrow$ Đăng nhập bằng GitHub.
2. Bấm nút **New +** $\rightarrow$ Chọn **Blueprint** *(Cách nhanh nhất vì dự án đã có sẵn file `render.yaml`)*:
   - Chọn kho lưu trữ **`khoii1/Project_DATN`** $\rightarrow$ Bấm **Connect**.
   - Render sẽ đọc tự động file `render.yaml` và chỉ hỏi bạn điền **4 ô còn trống**:
     - `DATABASE_URL`: Dán chuỗi kết nối **Session pooler** từ **Bước 1 (Supabase)**.
     - `MQTT_BROKER_URL`: Điền `mqtts://<Cluster-URL-ở-Bước-2>:8883` *(ví dụ: `mqtts://8a1b2c3d4e.s1.eu.hivemq.cloud:8883`)*.
     - `MQTT_USERNAME`: Điền `smartagri` *(tài khoản vừa tạo ở Bước 2)*.
     - `MQTT_PASSWORD`: Điền mật khẩu vừa tạo ở Bước 2.
3. Bấm **Apply / Deploy**:
   - Đợi khoảng 2–3 phút. Backend sẽ **tự động tạo toàn bộ 14 bảng trên Supabase** và **tự động nạp sẵn 3 tài khoản mặc định + dữ liệu mẫu** (bạn không cần mở Terminal gõ lệnh nào cả!).
   - Khi hiện chữ **Live** màu xanh, copy đường dẫn Backend của bạn, ví dụ:
     `https://smart-agriculture-backend.onrender.com`
   - Mở thử trên trình duyệt: `https://smart-agriculture-backend.onrender.com/api/health` $\rightarrow$ Thấy `"database": "connected"` và `"mqtt": "connected"` là thành công 100%!

> *(Nếu bạn chọn **New $\rightarrow$ Web Service** thủ công thay vì Blueprint: đặt **Root Directory** = `backend`, **Build Command** = `npm install --include=dev && npm run build`, **Start Command** = `npm run start:cloud`, và chọn gói **Free**).*

---

## Bước 4: Deploy Website Quản trị lên Vercel (Miễn phí)

1. Truy cập **https://vercel.com/new** $\rightarrow$ Đăng nhập bằng GitHub.
2. Chọn kho lưu trữ **`khoii1/Project_DATN`** $\rightarrow$ Bấm **Import**.
3. Tại màn hình cấu hình:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Bấm **Edit** $\rightarrow$ Chọn thư mục **`frontend`** $\rightarrow$ Bấm Continue.
   - Mở mục **Environment Variables**, thêm **1 biến duy nhất**:
     - **Name:** `VITE_API_BASE_URL`
     - **Value:** `https://smart-agriculture-backend.onrender.com/api` *(thay bằng link Render thật của bạn ở Bước 3)*.
4. Bấm **Deploy**!
   - Sau 45 giây, bạn nhận ngay tên miền public có HTTPS (ví dụ `https://project-datn.vercel.app`).
   - Đăng nhập ngay bằng tài khoản mặc định:
     - **Admin:** `admin@gmail.com` / `Admin123`
     - **Chủ trang trại:** `owner@gmail.com` / `Admin123`
     - **Nhân viên:** `staff@gmail.com` / `Admin123`

---

## Bước 5: Kết nối App Mobile (Expo Go) & Mạch ESP32 thật lên Cloud

### 1. Trên Điện thoại (React Native + Expo Go):
- Mở ứng dụng trên **Expo Go**, tại màn hình Đăng nhập bấm nút **`Máy chủ: ...`** ở dưới cùng (hoặc vào *Quản lý $\rightarrow$ Hồ sơ & Cài đặt*).
- Nhập địa chỉ Render của bạn: `https://smart-agriculture-backend.onrender.com` $\rightarrow$ Bấm **Kiểm tra kết nối** $\rightarrow$ **Lưu địa chỉ**.
- Bây giờ điện thoại dùng **4G / 5G ở bất kỳ đâu** cũng xem biểu đồ và bật/tắt máy bơm được!

### 2. Trên Mạch phần cứng ESP32 (`firmware/SmartAgricultureESP32/config.local.h`):
Mở file `config.local.h` trong Arduino IDE và đổi 4 dòng sau sang HiveMQ Cloud rồi nạp lại mạch:
```cpp
static constexpr bool ENABLE_PUMP_COMMANDS = true;
static constexpr char MQTT_HOST[] = "8a1b2c3d4e.s1.eu.hivemq.cloud"; // Cluster URL ở Bước 2
static constexpr unsigned short MQTT_PORT = 8883;                    // Cổng 8883 tự động bật mã hóa TLS
static constexpr char MQTT_USERNAME[] = "smartagri";                 // Username ở Bước 2
static constexpr char MQTT_PASSWORD[] = "SmartAgriMqtt2026";         // Password ở Bước 2
```
*(Khi đặt `MQTT_PORT = 8883`, code ESP32 đã tự động chuyển sang `WiFiClientSecure` TLS để gửi cảm biến 5 giây/lần và nhận lệnh bật/tắt bơm từ Render qua Internet!)*

---

## Bước 6: Bật gửi mã OTP 6 số thật về Gmail (Miễn phí 100%, không cần mua tên miền)
Vì Render gói Free chặn cổng SMTP truyền thống (`465`/`587`), dự án sử dụng cầu nối **Google Apps Script qua HTTPS (cổng 443)** để gửi mail trực tiếp từ máy chủ Gmail chính thức của Google (vào thẳng Hộp thư chính, gửi tới mọi Email bất kỳ):

1. Truy cập **https://script.google.com/** (đăng nhập bằng Gmail của bạn) $\rightarrow$ bấm **`+ Dự án mới`** (*New project*).
2. Xóa code mặc định trong `Code.gs`, copy toàn bộ nội dung từ file `backend/scripts/google-apps-script-email.gs` dán vào $\rightarrow$ bấm **`Ctrl + S`** để lưu.
3. Ở góc phải trên cùng, bấm **`Triển khai` (Deploy)** $\rightarrow$ **`Tùy chọn triển khai mới` (New deployment)**:
   - Bấm biểu tượng bánh răng $\rightarrow$ chọn **`Ứng dụng web` (Web app)**.
   - **Thực thi dưới dạng (Execute as):** `Tôi` (*Me*).
   - **Ai có quyền truy cập (Who has access):** Bắt buộc chọn **`Bất kỳ ai` (Anyone)**.
   - Bấm **`Triển khai`** $\rightarrow$ **`Ủy quyền truy cập`** $\rightarrow$ chọn tài khoản Gmail $\rightarrow$ bấm **`Advanced` (Nâng cao)** $\rightarrow$ **`Go to ... (unsafe)`** $\rightarrow$ **`Allow` (Cho phép)**.
4. Copy đường link **URL ứng dụng web** (`https://script.google.com/macros/s/.../exec`).
5. Mở dự án Backend trên **Render** $\rightarrow$ mục **Environment** $\rightarrow$ thêm biến:
   - `EMAIL_WEBHOOK_URL` = *(dán link `https://script.google.com/macros/s/.../exec` vừa copy)*
   - Bấm **Save Changes** là xong!

---

## Mẹo nhỏ: Giữ Backend Render Free thức 24/7 không bị ngủ sau 15 phút
Gói Free của Render sẽ tạm nghỉ nếu sau 15 phút không có ai mở web. Để giữ Backend chạy xuyên suốt 24/7 lắng nghe ESP32:
1. Vào trang miễn phí **https://cron-job.org** $\rightarrow$ Đăng ký tài khoản $\rightarrow$ **Create Cronjob**.
2. Điền **URL:** `https://smart-agriculture-backend.onrender.com/api/health`
3. Chọn lịch chạy (**Execution schedule**): **Every 10 minutes** (mỗi 10 phút) $\rightarrow$ **Create**.
Hệ thống của bạn sẽ thức 24/7 hoàn toàn miễn phí!
