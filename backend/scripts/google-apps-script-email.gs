/**
 * CẦU NỐI GỬI EMAIL OTP MIỄN PHÍ QUA GOOGLE APPS SCRIPT (HTTPS PORT 443)
 * Tương thích 100% với Render Free (không bị chặn cổng SMTP 465/587) & vào thẳng Hộp thư chính Gmail.
 *
 * HƯỚNG DẪN CÀI ĐẶT TRONG 1 PHÚT:
 * 1. Truy cập https://script.google.com/ (đăng nhập bằng Gmail của bạn) -> bấm "+ Dự án mới" (New project).
 * 2. Xóa toàn bộ code mặc định trong file Code.gs, dán toàn bộ nội dung file này vào rồi bấm Ctrl + S (Lưu).
 * 3. Ở góc trên bên phải, bấm nút màu xanh "Triển khai" (Deploy) -> "Tùy chọn triển khai mới" (New deployment).
 * 4. Bấm biểu tượng bánh răng (Chọn loại / Select type) -> chọn "Ứng dụng web" (Web app):
 *    - Thực thi dưới dạng (Execute as): "Tôi" (Me)
 *    - Ai có quyền truy cập (Who has access): BẮT BUỘC CHỌN "Bất kỳ ai" (Anyone)
 * 5. Bấm "Triển khai" (Deploy) -> Bấm "Ủy quyền truy cập" (Authorize access):
 *    - Chọn tài khoản Gmail của bạn -> Nếu hiện cảnh báo "Google hasn't verified this app",
 *      bấm "Advanced" (Nâng cao) -> bấm "Go to ... (unsafe)" -> bấm "Allow" (Cho phép).
 * 6. Copy đường link "URL ứng dụng web" (có dạng https://script.google.com/macros/s/.../exec)
 *    và dán vào biến môi trường EMAIL_WEBHOOK_URL trên Render!
 */

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);

    // Nếu bạn có đặt EMAIL_WEBHOOK_SECRET trên Render thì điền chuỗi giống hệt vào dưới đây (để trống nếu không dùng):
    var EXPECTED_SECRET = "";
    if (EXPECTED_SECRET && payload.secret !== EXPECTED_SECRET) {
      return ContentService.createTextOutput(
        JSON.stringify({ status: "unauthorized", message: "Invalid secret token" })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    if (!payload.to || !payload.subject) {
      return ContentService.createTextOutput(
        JSON.stringify({ status: "error", message: "Missing recipient or subject" })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    MailApp.sendEmail({
      to: payload.to,
      subject: payload.subject,
      body: payload.body || "",
      htmlBody: payload.htmlBody || payload.body || "",
      name: payload.senderName || "Smart Agriculture IoT",
    });

    return ContentService.createTextOutput(
      JSON.stringify({ status: "success", message: "OTP email sent" })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: String(err) })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
