# Kịch bản giới thiệu hiện trạng dự án Smart Agriculture IoT

**Đối tượng:** người hướng dẫn đồ án.  
**Mục đích:** giới thiệu các chức năng hiện có, báo cáo tiến độ và xin góp ý.  
**Thời lượng:** khoảng **6 phút 40 giây**, gồm lời nói và chuyển trang.  
**Cập nhật:** 16/11/2026.

Đây là buổi xem trước sản phẩm, chưa phải nghiệm thu cuối hoặc báo cáo bảo vệ. Chỉ cần trình bày luồng chính, không đi sâu source code, số lượng tests hay các giai đoạn kỹ thuật trước đây.

## 1. Chuẩn bị ngắn trước khi giới thiệu

- Mở sẵn Website của bản demo đang sử dụng, kiểm tra đăng nhập và các trang chính.
- Chọn trước farm/zone có dữ liệu cảm biến; đặt khoảng thời gian biểu đồ có dữ liệu.
- Dùng tài khoản chủ trang trại để giới thiệu nghiệp vụ. Trang quản lý người dùng chỉ mở nếu có tài khoản ADMIN phù hợp.
- Giữ adapter bơm ngắt điện, quyền điều khiển và Automation khóa; phần này chỉ giới thiệu giao diện và kết quả thử trước, không cần chạy bơm.
- Nếu giới thiệu SHADOW, dùng bản demo có tab mô phỏng. Bản main được audit trước đó chưa mount tab này; không hứa thao tác trên giao diện khi bản đang mở chưa có.
- Biết dữ liệu đang là cảm biến thật đang cập nhật, dữ liệu lịch sử hay mô phỏng để nói đúng. Không cần mở Arduino IDE, terminal hoặc DevTools trong buổi giới thiệu.

## 2. Thứ tự và thời gian

| Thời gian | Màn hình / nội dung |
|---|---|
| 00:00–00:30 | Giới thiệu mục tiêu |
| 00:30–01:00 | Đăng nhập và vai trò |
| 01:00–01:50 | Dashboard tổng quan |
| 01:50–02:40 | Trang trại, khu vực, cây trồng |
| 02:40–03:40 | Thiết bị, cảm biến, lịch sử và biểu đồ |
| 03:40–04:15 | Cảnh báo |
| 04:15–05:20 | Điều khiển tưới thủ công và tự động SHADOW |
| 05:20–06:00 | Báo cáo, nhật ký, cài đặt |
| 06:00–06:40 | Hiện trạng, phần còn thiếu và xin góp ý |

Các đoạn trích dưới đây có thể đọc gần như nguyên văn. Giữa các đoạn, dành vài giây chỉ vào thông tin trên màn hình, không cần nói liên tục.

## 3. Kịch bản nói và thao tác

### Bước 1 — Giới thiệu mục tiêu · 30 giây

**Màn hình:** trang đăng nhập hoặc Dashboard đã chuẩn bị.

**Lời nói:**

> Em xin giới thiệu hiện trạng dự án Smart Agriculture IoT của em. Mục tiêu là xây dựng một hệ thống hỗ trợ quản lý trang trại, theo dõi các chỉ số môi trường và hỗ trợ tưới tiêu trên Website. Hôm nay em sẽ đi qua các chức năng hiện có và trình bày những phần còn cần hoàn thiện để thầy/cô góp ý trước.

Không cần mở sơ đồ kiến trúc riêng. Nếu muốn giới thiệu công nghệ, thêm một câu:

> Hệ thống sử dụng ESP32 thu thập dữ liệu, MQTT để truyền dữ liệu, backend xử lý và lưu vào PostgreSQL, còn Website React để người dùng theo dõi và thao tác.

### Bước 2 — Đăng nhập và phân quyền · 30 giây

**Thao tác:** đăng nhập bằng tài khoản demo đã kiểm tra trước; chỉ tên người dùng và thanh menu. Không đọc hoặc trình chiếu mật khẩu.

**Lời nói:**

> Hệ thống có chức năng đăng nhập và phân quyền theo ba nhóm: quản trị viên, chủ trang trại và nhân viên. Mỗi người dùng được truy cập dữ liệu theo phạm vi của mình. Tài khoản em dùng ở đây là chủ trang trại; quyền quản lý người dùng thuộc quản trị viên, còn quyền điều khiển tưới của nhân viên được phân công riêng.

Nếu đã đăng nhập sẵn, giới thiệu nhanh thay vì logout rồi login lại.

### Bước 3 — Dashboard tổng quan · 50 giây

**Thao tác:** mở Dashboard, chọn đúng farm/zone, chỉ các thẻ tổng quan và bốn chỉ số cảm biến.

**Lời nói:**

> Dashboard là màn hình tổng quan. Người dùng có thể xem số trang trại, khu vực, thiết bị và cảnh báo. Phía dưới là nhiệt độ, độ ẩm không khí, ánh sáng và độ ẩm đất của khu vực đang chọn. Mỗi giá trị có đơn vị và thời điểm đo để người dùng biết dữ liệu được ghi nhận lúc nào. Giao diện có cơ chế tự cập nhật, không cần tải lại trang thủ công.

**Chọn đúng một câu phù hợp với phiên đang mở:**

- Nếu đang nhận dữ liệu mới từ ESP32: “Các thẻ này đang nhận dữ liệu từ ESP32 thật; em có thể đối chiếu qua thời điểm đo tiếp tục thay đổi.”
- Nếu đang xem dữ liệu đã lưu: “Ở phiên này em giới thiệu bằng dữ liệu đã lưu; đây không phải xác nhận thiết bị đang gửi dữ liệu ngay lúc này.”
- Nếu đang mở simulator: “Các giá trị trong phiên này là dữ liệu mô phỏng để giới thiệu chức năng giao diện.”

Không dành thời gian chờ giá trị biến động; tiếp tục chuyển trang nếu chu kỳ cập nhật chưa tới.

### Bước 4 — Quản lý trang trại, khu vực và cây trồng · 50 giây

**Thao tác:** lần lượt mở Trang trại → chi tiết một farm → Khu vực trồng → Cây trồng. Không cần mở mọi biểu mẫu.

**Lời nói:**

> Phần quản lý được tổ chức theo trang trại và khu vực trồng. Trong mỗi khu vực có cây trồng, thiết bị và cảm biến tương ứng. Các trang danh sách hỗ trợ tìm kiếm, lọc và cập nhật thông tin theo quyền của tài khoản. Trang cây trồng lưu các thông tin như tên cây, ngày trồng và trạng thái. Chủ trang trại cũng có thể phân công nhân viên để quản lý dữ liệu trong phạm vi phù hợp.

Nếu cần minh họa form, mở **Thêm** hoặc **Sửa**, chỉ các trường rồi đóng. Không cần tạo/xóa records trong buổi xem trước; giữ nguyên mapping của ESP32.

### Bước 5 — Thiết bị, cảm biến và biểu đồ · 1 phút

**Thao tác:** Thiết bị → chi tiết ESP32-GF-A-01 → Dữ liệu cảm biến → Lịch sử & biểu đồ. Chọn một cảm biến và khoảng thời gian đã chuẩn bị.

**Lời nói:**

> Trang thiết bị hiển thị mã thiết bị, vị trí, trạng thái kết nối và lần nhận tín hiệu gần nhất. Với ESP32, hệ thống đọc nhiệt độ và độ ẩm không khí từ DHT22, ánh sáng từ BH1750 và tín hiệu độ ẩm đất từ cảm biến analog.
>
> Dữ liệu được lưu để xem lại trong trang lịch sử. Người dùng chọn cảm biến và khoảng thời gian để xem bảng readings, biểu đồ, giá trị thấp nhất, cao nhất và trung bình. Nhờ đó không chỉ xem được giá trị hiện tại mà còn theo dõi xu hướng trước đó.

Chỉ một biểu đồ đại diện là đủ; giới thiệu rằng có thể đổi sang các loại cảm biến còn lại. Nếu chỉ thấy một điểm do gom nhóm thời gian, không gọi đó là lỗi mất dữ liệu.

### Bước 6 — Cảnh báo · 35 giây

**Thao tác:** mở Cảnh báo, chỉ danh sách và khu vực quy tắc cảnh báo.

**Lời nói:**

> Hệ thống có chức năng cảnh báo theo ngưỡng cấu hình của cảm biến. Người dùng có thể xem mức độ, trạng thái và thời điểm phát sinh, đồng thời xác nhận đã xem cảnh báo. Khi điều kiện môi trường phục hồi, cảnh báo được xử lý theo vòng đời tương ứng. Chức năng này giúp người quản lý nhận biết tình trạng bất thường mà không phải theo dõi từng số đo liên tục.

Nếu danh sách trống, nói: “Hiện phạm vi này chưa có cảnh báo đang hoạt động; em giới thiệu phần quy tắc và cách quản lý ở đây.” Không tạo dữ liệu giả hoặc thay ngưỡng chỉ để có cảnh báo ngay.

### Bước 7 — Điều khiển tưới và tự động SHADOW · 1 phút 5 giây

**Thao tác:** mở Điều khiển tưới → điều khiển thủ công → lịch sử lệnh. Sau đó mở tab mô phỏng nếu bản demo đang dùng có hỗ trợ.

**Lời nói phần thủ công:**

> Phần tưới có giao diện bật/tắt máy bơm, hiển thị trạng thái và lịch sử lệnh. Lệnh đi từ Website qua backend và MQTT đến ESP32, sau đó có phản hồi để cập nhật kết quả. Ở bản TEST trước đó, em đã thử bơm thật chạy khoảng một giây, có nước chảy và tự dừng. Buổi giới thiệu này em giữ điều khiển khóa và không chạy lại bơm.

**Lời nói phần tự động:**

> Với tưới tự động, hiện em có phần SHADOW để mô phỏng quyết định theo độ ẩm đất. Thuật toán xét ngưỡng bắt đầu, ngưỡng dừng, thời gian nghỉ, giới hạn tưới và tình trạng thiết bị. Nếu dữ liệu cũ hoặc thiết bị offline thì quyết định bị chặn. Kết quả mô phỏng không phát lệnh đến bơm. Phần này còn cần hiệu chuẩn cảm biến đất và kiểm chứng thêm trước khi tự tưới thực tế.

**Nếu còn thời gian:** dùng đúng preset SHADOW đã chuẩn bị để hiển thị một trường hợp đề xuất tưới và một trường hợp OFFLINE/STALE bị chặn. Không giải thích mọi tham số hoặc sửa cấu hình giữa buổi.

**Nếu không có tab SHADOW:** nói “Phần thuật toán SHADOW đã có ở bản thử nghiệm riêng, chưa tích hợp vào giao diện em đang mở” rồi tiếp tục. Không bật legacy automation để thay thế cho mô phỏng.

### Bước 8 — Báo cáo, nhật ký và cài đặt · 40 giây

**Thao tác:** mở Báo cáo → Nhật ký hoạt động → Cài đặt. Trang Users chỉ giới thiệu nếu đang có quyền ADMIN.

**Lời nói:**

> Trang báo cáo tổng hợp dữ liệu theo thời gian, trang trại và khu vực, đồng thời hỗ trợ xuất CSV. Nhật ký hoạt động giúp xem lại người thao tác, nội dung và thời điểm thực hiện. Phần cài đặt hỗ trợ thông tin cá nhân và đổi mật khẩu; quản trị viên có thêm chức năng quản lý tài khoản. Đây là các chức năng hỗ trợ quản lý và theo dõi quá trình sử dụng hệ thống.

Không xuất nhiều file hoặc thay mật khẩu trong lúc giới thiệu. Nếu cần tiết kiệm thời gian, chỉ mở Reports và chỉ vào các menu còn lại.

### Bước 9 — Báo cáo hiện trạng và xin góp ý · 40 giây

**Thao tác:** quay về Dashboard hoặc giữ màn hình báo cáo.

**Lời nói:**

> Đến hiện tại, em đã xây dựng các nhóm chức năng quản lý, giám sát cảm biến, lưu lịch sử, biểu đồ, cảnh báo và báo cáo. Luồng ESP32 thật và thử tưới thủ công đã có kết quả kiểm tra trên bản TEST. Phần tự động hiện được trình diễn ở chế độ SHADOW, chưa nghiệm thu tưới tự động vật lý.
>
> Trong thời gian tiếp theo, em dự định hoàn thiện tính ổn định của bản demo, kiểm tra lại các luồng giao diện và hiệu chuẩn độ ẩm đất nếu tiếp tục triển khai tự tưới thật. Em mong thầy/cô góp ý về phạm vi chức năng, cách tổ chức giao diện và những nội dung cần ưu tiên để hoàn thiện đồ án.

## 4. Những ý cần nhớ khi trình bày

- Nói “em đã xây dựng”, “em đã thử trên bản TEST” và “phần này còn cần hoàn thiện” đúng theo hiện trạng; không cần dùng các nhãn PASS/BLOCKED hoặc tên Phase với người hướng dẫn.
- Không gọi dữ liệu lịch sử là LIVE, mô phỏng là dữ liệu thật hoặc SHADOW là tự tưới vật lý.
- Không cần đi hết 19 page components. Các nhóm chức năng trên đủ để giới thiệu tổng quan trong 6–7 phút.
- Không cần trình bày commit, binary hash, số migrations, native diagnostics hay toàn bộ test counts, trừ khi người hướng dẫn hỏi sâu.
- Nếu Website lỗi, nói đúng tình trạng rồi dùng ảnh đã chuẩn bị có ghi nguồn; không biến buổi báo cáo thành phiên sửa lỗi hoặc thử bơm.

## 5. Nếu người hướng dẫn hỏi thêm

**“Phần nào đang chạy thật?”**  
“Em đã kiểm tra luồng ESP32 → MQTT → backend → database và có kết quả thử bơm thủ công trên bản TEST. Dữ liệu trên màn hình hôm nay cần phân biệt theo phiên đang mở; phần SHADOW là mô phỏng quyết định.”

**“Tại sao chưa cho tự tưới?”**  
“Cảm biến đất chưa được hiệu chuẩn thực nghiệm đầy đủ. Em đang kiểm tra thuật toán bằng SHADOW trước để tránh dùng số đo chưa tin cậy điều khiển bơm.”

**“Hướng hoàn thiện tiếp theo là gì?”**  
“Em sẽ chốt một bản demo ổn định, rà soát giao diện và xử lý lỗi; nếu phạm vi đồ án cần tự tưới thật thì ưu tiên hiệu chuẩn đất và kiểm chứng an toàn trước khi bật chức năng.”

**“Có cần mở Arduino IDE khi dùng hệ thống?”**  
“Không cần. ESP32 chạy firmware đã nạp khi được cấp nguồn. Để Website nhận dữ liệu trực tiếp thì cần broker MQTT, backend, database và frontend hoạt động.”

---

**Phạm vi tài liệu:** thay kịch bản bảo vệ 20 phút trước bằng kịch bản báo cáo tiến độ 6–7 phút. Không ghi nhận runtime mới hoặc thực hiện thao tác vận hành. Nguồn bối cảnh: `PROJECT_HANDOFF_CHATGPT.md` và hồ sơ bản TEST ngày 08/11/2026.
