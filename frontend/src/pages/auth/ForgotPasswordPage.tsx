import { CheckCircle2, Eye, EyeOff, KeyRound, Leaf, Loader2, LockKeyhole, Mail, Sprout } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../../services/api";
import { authService } from "../../services/auth.service";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"request" | "reset" | "done">("request");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [issuedCode, setIssuedCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequestOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Vui lòng nhập đúng định dạng Email đã đăng ký");
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await authService.forgotPassword(email.trim());
      if (res.verificationCode) {
        setIssuedCode(res.verificationCode);
        setOtpCode(res.verificationCode);
      }
      setStep("reset");
    } catch (err) {
      setError(getApiErrorMessage(err, "Không thể tạo mã xác thực, vui lòng thử lại"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(otpCode.trim())) {
      setError("Mã xác thực gồm đúng 6 chữ số");
      return;
    }
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError("Mật khẩu mới phải có ít nhất 8 ký tự, gồm cả chữ cái và chữ số");
      return;
    }
    if (confirmPassword !== newPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }
    try {
      setIsSubmitting(true);
      await authService.resetPassword({
        email: email.trim(),
        otpCode: otpCode.trim(),
        newPassword,
      });
      setStep("done");
    } catch (err) {
      setError(getApiErrorMessage(err, "Không thể đặt lại mật khẩu"));
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
            <Sprout className="h-3.5 w-3.5" />Bảo mật tài khoản
          </span>
          <h1 className="mt-7 text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
            Khôi phục quyền truy cập<br />nhanh chóng & an toàn.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-emerald-50/65">
            Xác thực qua mã khôi phục 6 chữ số có hiệu lực 5 phút để thiết lập lại mật khẩu mới cho tài khoản của bạn.
          </p>
        </div>
        <p className="relative text-xs text-emerald-100/40">© 2026 Smart Agriculture · Graduation Project</p>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-slate-50/60 px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white"><Leaf className="h-5 w-5" /></span>
            <span className="font-bold text-slate-900">Smart Agriculture</span>
          </div>

          {step === "done" ? (
            <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
              <CheckCircle2 className="mx-auto h-12 w-12 text-brand-600" />
              <h2 className="mt-4 text-2xl font-bold text-slate-900">Đặt lại mật khẩu thành công!</h2>
              <p className="mt-2 text-sm text-slate-500">
                Mật khẩu mới cho tài khoản <b>{email.trim()}</b> đã được lưu. Bạn có thể đăng nhập ngay bây giờ.
              </p>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="mt-6 flex h-11 w-full items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white hover:bg-brand-700"
              >
                Quay lại Đăng nhập
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-brand-600">Khôi phục tài khoản</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Quên mật khẩu</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {step === "request"
                  ? "Nhập địa chỉ Email tài khoản của bạn để nhận mã xác thực 6 chữ số."
                  : `Nhập mã xác thực 6 số và mật khẩu mới cho tài khoản ${email.trim()}.`}
              </p>

              {step === "request" ? (
                <form onSubmit={handleRequestOtp} className="mt-7 space-y-5" noValidate>
                  <div>
                    <label htmlFor="reset-email" className="text-sm font-semibold text-slate-700">Email đã đăng ký</label>
                    <div className="relative mt-2">
                      <Mail className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                      <input
                        id="reset-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Nhập địa chỉ Email của bạn"
                        className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-800 shadow-sm focus:border-brand-500"
                      />
                    </div>
                  </div>
                  {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-bold text-white shadow-lg shadow-brand-600/15 hover:bg-brand-700 disabled:opacity-70"
                  >
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isSubmitting ? "Đang kiểm tra..." : "Nhận mã xác thực"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="mt-6 space-y-4" noValidate>
                  {issuedCode && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-900">
                      Mã xác thực khôi phục (hiệu lực 5 phút): <b className="tracking-widest">{issuedCode}</b>
                    </div>
                  )}
                  <div>
                    <label htmlFor="otp-code" className="text-sm font-semibold text-slate-700">Mã xác thực (6 chữ số)</label>
                    <div className="relative mt-1.5">
                      <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        id="otp-code"
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="Nhập mã 6 chữ số"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-bold tracking-widest text-slate-800 shadow-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="new-pass" className="text-sm font-semibold text-slate-700">Mật khẩu mới</label>
                    <div className="relative mt-1.5">
                      <LockKeyhole className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        id="new-pass"
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Tối thiểu 8 ký tự (chữ và số)"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-11 text-sm text-slate-800 shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-slate-700"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="confirm-new-pass" className="text-sm font-semibold text-slate-700">Xác nhận mật khẩu mới</label>
                    <div className="relative mt-1.5">
                      <LockKeyhole className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        id="confirm-new-pass"
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Nhập lại mật khẩu mới"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-800 shadow-sm"
                      />
                    </div>
                  </div>
                  {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-bold text-white shadow-lg shadow-brand-600/15 hover:bg-brand-700 disabled:opacity-70"
                  >
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isSubmitting ? "Đang cập nhật..." : "Đặt lại mật khẩu mới"}
                  </button>
                </form>
              )}

              <p className="mt-6 text-center text-sm text-slate-600">
                Nhớ mật khẩu rồi?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="font-bold text-brand-700 hover:underline"
                >
                  Quay lại Đăng nhập
                </button>
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
