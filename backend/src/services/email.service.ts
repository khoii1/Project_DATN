import { env } from "../config/env";
import { AppError } from "../utils/app-error";

interface SendPasswordResetOtpParams {
  to: string;
  fullName: string;
  otpCode: string;
  expiresInMinutes?: number;
  purpose?: "reset-password" | "register";
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildOtpEmailTemplate({ fullName, otpCode, expiresInMinutes = 5, purpose = "reset-password" }: Omit<SendPasswordResetOtpParams, "to">) {
  const safeName = escapeHtml(fullName);
  const isRegister = purpose === "register";
  const subject = isRegister
    ? `[Smart Agriculture] Mã OTP xác thực đăng ký tài khoản: ${otpCode}`
    : `[Smart Agriculture] Mã OTP đặt lại mật khẩu: ${otpCode}`;
  const heading = isRegister ? "Xác thực Email đăng ký tài khoản" : "Mã xác thực đặt lại mật khẩu";
  const intro = isRegister
    ? "Cảm ơn bạn đã đăng ký tài khoản trên hệ thống Nông Nghiệp Thông Minh. Vui lòng nhập mã xác thực 6 chữ số dưới đây vào màn hình đăng ký để hoàn tất tạo tài khoản:"
    : "Hệ thống vừa nhận được yêu cầu khôi phục mật khẩu cho tài khoản của bạn. Vui lòng nhập mã xác thực 6 chữ số dưới đây vào màn hình đặt lại mật khẩu:";
  const ignoreNote = isRegister
    ? "Nếu bạn không đăng ký tài khoản, hãy bỏ qua email này — sẽ không có tài khoản nào được tạo."
    : "Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này — tài khoản của bạn vẫn an toàn.";
  const textBody = [
    `Xin chào ${fullName},`,
    "",
    intro,
    `Mã xác thực OTP của bạn là: ${otpCode}`,
    "",
    `Mã có hiệu lực trong ${expiresInMinutes} phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.`,
    ignoreNote,
  ].join("\n");

  const htmlBody = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
</head>
<body style="margin:0;padding:24px;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:#103b2d;padding:24px 28px;color:#ffffff;">
      <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#a7f3d0;font-weight:bold;">Smart Agriculture IoT</div>
      <h1 style="margin:8px 0 0;font-size:22px;font-weight:bold;">${heading}</h1>
    </div>
    <div style="padding:28px;">
      <p style="margin:0 0 14px;font-size:15px;line-height:1.6;">Xin chào <strong>${safeName}</strong>,</p>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#475569;">
        ${intro}
      </p>
      <div style="margin:24px 0;padding:18px;background:#ecfdf5;border:1px dashed #10b981;border-radius:12px;text-align:center;">
        <div style="font-size:12px;color:#047857;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;font-weight:bold;">Mã xác thực OTP</div>
        <div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#065f46;">${otpCode}</div>
      </div>
      <p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#64748b;">
        ⏳ Mã xác thực có hiệu lực trong vòng <strong>${expiresInMinutes} phút</strong>. Tuyệt đối không chia sẻ mã này cho người khác.
      </p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#94a3b8;">
        ${ignoreNote}
      </p>
    </div>
    <div style="padding:14px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;text-align:center;">
      © 2026 Hệ thống Nông Nghiệp Thông Minh · Đồ Án Tốt Nghiệp
    </div>
  </div>
</body>
</html>`.trim();

  return { subject, textBody, htmlBody };
}

export const emailService = {
  isConfigured(): boolean {
    return Boolean(env.emailWebhookUrl);
  },

  async sendPasswordResetOtpEmail(params: SendPasswordResetOtpParams): Promise<void> {
    if (!env.emailWebhookUrl) {
      throw new AppError(503, "Máy chủ chưa cấu hình dịch vụ gửi Email (thiếu EMAIL_WEBHOOK_URL)");
    }

    const { subject, textBody, htmlBody } = buildOtpEmailTemplate(params);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(env.emailWebhookUrl, {
        method: "POST",
        redirect: "follow",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify({
          to: params.to,
          subject,
          body: textBody,
          htmlBody,
          senderName: env.emailSenderName,
          ...(env.emailWebhookSecret ? { secret: env.emailWebhookSecret } : {}),
        }),
        signal: controller.signal,
      });

      const rawText = await response.text();
      if (rawText.includes("accounts.google.com") || rawText.includes("ServiceLogin")) {
        throw new AppError(
          502,
          "Google Apps Script chưa mở quyền truy cập 'Anyone' (Bất kỳ ai). Vui lòng kiểm tra lại cấu hình Deploy.",
        );
      }

      if (rawText) {
        try {
          const parsed = JSON.parse(rawText) as { status?: string; message?: string };
          if (parsed.status === "unauthorized") {
            throw new AppError(502, "Mã bí mật EMAIL_WEBHOOK_SECRET không khớp với Google Apps Script");
          }
          if (parsed.status === "error") {
            throw new AppError(502, `Không thể gửi email OTP: ${parsed.message ?? "Lỗi từ dịch vụ gửi mail"}`);
          }
        } catch (err) {
          if (err instanceof AppError) throw err;
        }
      }

      if (!response.ok) {
        throw new AppError(502, `Dịch vụ gửi Email phản hồi lỗi (HTTP ${response.status})`);
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error("[Email Service Error]", error);
      throw new AppError(502, "Không thể kết nối tới dịch vụ gửi Email, vui lòng thử lại sau ít giây");
    } finally {
      clearTimeout(timeout);
    }
  },
};
