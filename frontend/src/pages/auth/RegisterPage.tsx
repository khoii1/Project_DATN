import { Eye, EyeOff, KeyRound, Leaf, Loader2, LockKeyhole, Mail, Phone, Sprout, User } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getApiErrorMessage } from "../../services/api";
import { authService } from "../../services/auth.service";

interface FormErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [step, setStep] = useState<"form" | "verify">("form");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"FARM_OWNER" | "STAFF">("FARM_OWNER");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [issuedCode, setIssuedCode] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [resendNotice, setResendNotice] = useState("");
  const [isResending, setIsResending] = useState(false);

  const validateForm = (): boolean => {
    const nextErrors: FormErrors = {};
    if (fullName.trim().length < 2) nextErrors.fullName = "Họ và tên phải có ít nhất 2 ký tự";
    if (!email.trim()) nextErrors.email = "Email không được để trống";
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) nextErrors.email = "Email chưa đúng định dạng";
    if (phone.trim() && !/^[0-9+().\s-]{6,20}$/.test(phone.trim())) nextErrors.phone = "Số điện thoại chưa hợp lệ";
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      nextErrors.password = "Mật khẩu tối thiểu 8 ký tự, gồm ít nhất 1 chữ cái và 1 chữ số";
    }
    if (confirmPassword !== password) nextErrors.confirmPassword = "Mật khẩu xác nhận không khớp";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const sendOtp = async (isResend = false) => {
    setServerError("");
    setResendNotice("");
    try {
      if (isResend) setIsResending(true);
      else setIsSubmitting(true);
      const res = await authService.requestRegisterOtp(email.trim(), fullName.trim());
      setEmailSent(Boolean(res.emailSent));
      if (!res.emailSent && res.verificationCode) {
        setIssuedCode(res.verificationCode);
        setOtpCode(res.verificationCode);
      } else {
        setIssuedCode("");
        setOtpCode("");
      }
      if (isResend) setResendNotice("Đã gửi lại mã OTP 6 chữ số mới tới hộp thư của bạn!");
      setStep("verify");
    } catch (error) {
      setServerError(getApiErrorMessage(error, "Không thể gửi mã xác thực qua Email, vui lòng thử lại"));
    } finally {
      setIsSubmitting(false);
      setIsResending(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError("");
    if (step === "form") {
      if (!validateForm()) return;
      await sendOtp(false);
      return;
    }

    if (!/^\d{6}$/.test(otpCode.trim())) {
      setServerError("Mã xác thực gồm đúng 6 chữ số");
      return;
    }
    if (!register) return;

    try {
      setIsSubmitting(true);
      await register({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        password,
        role,
        otpCode: otpCode.trim(),
      });
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setServerError(getApiErrorMessage(error, "Không thể đăng ký tài khoản, vui lòng thử lại"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden bg-[#103b2d] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -right-32 -top-32 h-[430px] w-[430px] rounded-full border-[80px] border-white/5" />
        <div className="absolute -bottom-44 -left-28 h-[500px] w-[500px] rounded-full border-[90px] border-emerald-300/5" />
        <div className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-brand-700"><Leaf className="h-6 w-6" /></span>
          <div>
            <p className="font-bold">Smart Agriculture</p>
            <p className="text-[10px] uppercase tracking-[.22em] text-emerald-200/60">Farm Management</p>
          </div>
        </div>
        <div className="relative max-w-xl py-12">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-emerald-100">
            <Sprout className="h-3.5 w-3.5" />Bắt đầu canh tác thông minh
          </span>
          <h1 className="mt-7 text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
            Khởi tạo không gian<br />nông trại số của bạn.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-emerald-50/65">
            Tạo tài khoản Chủ trang trại để thiết lập khu vực trồng trọt riêng, hoặc đăng ký Nhân viên để tham gia vận hành nông trại.
          </p>
        </div>
        <p className="relative text-xs text-emerald-100/40">© 2026 Smart Agriculture · Graduation Project</p>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-slate-50/60 px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white"><Leaf className="h-5 w-5" /></span>
            <span className="font-bold text-slate-900">Smart Agriculture</span>
          </div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-brand-600">Tạo tài khoản mới</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Đăng ký tài khoản</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Điền thông tin bên dưới để truy cập hệ thống quản lý nông nghiệp thông minh.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            {step === "verify" ? (
              <>
                {emailSent ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm leading-6 text-emerald-900">
                    Mã OTP 6 chữ số đã được gửi tới hộp thư <b>{email.trim()}</b> (hiệu lực 5 phút). Vui lòng kiểm tra Hộp thư đến hoặc mục Thư rác (Spam).
                  </div>
                ) : issuedCode ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-900">
                    Mã xác thực đăng ký (chế độ Local, hiệu lực 5 phút): <b className="tracking-widest">{issuedCode}</b>
                  </div>
                ) : null}
                {resendNotice && (
                  <div className="rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-xs font-semibold text-sky-800">{resendNotice}</div>
                )}
                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="reg-otp" className="text-sm font-semibold text-slate-700">Mã xác thực Email (6 chữ số)</label>
                    <button
                      type="button"
                      disabled={isResending || isSubmitting}
                      onClick={() => void sendOtp(true)}
                      className="text-xs font-bold text-brand-700 hover:underline disabled:opacity-50"
                    >
                      {isResending ? "Đang gửi lại..." : "Gửi lại mã OTP"}
                    </button>
                  </div>
                  <div className="relative mt-1.5">
                    <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="reg-otp"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="Nhập mã 6 chữ số từ Email"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-bold tracking-widest text-slate-800 shadow-sm focus:border-brand-500"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep("form");
                    setServerError("");
                    setResendNotice("");
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 hover:underline"
                >
                  ← Quay lại sửa thông tin đăng ký
                </button>
              </>
            ) : (
              <>
            <div>
              <label htmlFor="fullName" className="text-sm font-semibold text-slate-700">Họ và tên</label>
              <div className="relative mt-1.5">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nhập họ và tên đầy đủ"
                  className={`h-11 w-full rounded-xl border bg-white pl-10 pr-4 text-sm text-slate-800 shadow-sm ${errors.fullName ? "border-red-400" : "border-slate-200 focus:border-brand-500"}`}
                />
              </div>
              {errors.fullName && <p className="mt-1 text-xs font-medium text-red-600">{errors.fullName}</p>}
            </div>

            <div>
              <label htmlFor="reg-email" className="text-sm font-semibold text-slate-700">Email đăng nhập</label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tenban@example.com"
                  className={`h-11 w-full rounded-xl border bg-white pl-10 pr-4 text-sm text-slate-800 shadow-sm ${errors.email ? "border-red-400" : "border-slate-200 focus:border-brand-500"}`}
                />
              </div>
              {errors.email && <p className="mt-1 text-xs font-medium text-red-600">{errors.email}</p>}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="phone" className="text-sm font-semibold text-slate-700">Số điện thoại</label>
                <div className="relative mt-1.5">
                  <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Tùy chọn"
                    className={`h-11 w-full rounded-xl border bg-white pl-10 pr-3 text-sm text-slate-800 shadow-sm ${errors.phone ? "border-red-400" : "border-slate-200 focus:border-brand-500"}`}
                  />
                </div>
                {errors.phone && <p className="mt-1 text-xs font-medium text-red-600">{errors.phone}</p>}
              </div>

              <div>
                <label htmlFor="role" className="text-sm font-semibold text-slate-700">Vai trò sử dụng</label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as "FARM_OWNER" | "STAFF")}
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-brand-500"
                >
                  <option value="FARM_OWNER">Chủ trang trại</option>
                  <option value="STAFF">Nhân viên</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="reg-password" className="text-sm font-semibold text-slate-700">Mật khẩu</label>
              <div className="relative mt-1.5">
                <LockKeyhole className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 8 ký tự (chữ và số)"
                  className={`h-11 w-full rounded-xl border bg-white pl-10 pr-11 text-sm text-slate-800 shadow-sm ${errors.password ? "border-red-400" : "border-slate-200 focus:border-brand-500"}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-slate-700"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs font-medium text-red-600">{errors.password}</p>}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-700">Xác nhận mật khẩu</label>
              <div className="relative mt-1.5">
                <LockKeyhole className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  className={`h-11 w-full rounded-xl border bg-white pl-10 pr-4 text-sm text-slate-800 shadow-sm ${errors.confirmPassword ? "border-red-400" : "border-slate-200 focus:border-brand-500"}`}
                />
              </div>
              {errors.confirmPassword && <p className="mt-1 text-xs font-medium text-red-600">{errors.confirmPassword}</p>}
            </div>
              </>
            )}

            {serverError && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-bold text-white shadow-lg shadow-brand-600/15 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting
                ? step === "form" ? "Đang gửi mã OTP..." : "Đang tạo tài khoản..."
                : step === "form" ? "Gửi mã xác thực Email" : "Xác nhận & Tạo tài khoản"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Đã có tài khoản?{" "}
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="font-bold text-brand-700 hover:underline"
            >
              Đăng nhập ngay
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
