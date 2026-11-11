import { Eye, EyeOff, Leaf, Loader2, LockKeyhole, Mail, Sprout } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getApiErrorMessage } from "../../services/api";

interface FormErrors { email?: string; password?: string; }

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [remember, setRemember] = useState(true);
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError("");
    const nextErrors: FormErrors = {};
    if (!email.trim()) nextErrors.email = "Email không được để trống";
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) nextErrors.email = "Email chưa đúng định dạng";
    if (!password) nextErrors.password = "Mật khẩu không được để trống";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      setIsSubmitting(true);
      await login({ email: email.trim(), password, remember });
      const destination = (location.state as { from?: string } | null)?.from ?? "/dashboard";
      navigate(destination, { replace: true });
    } catch (error) {
      setServerError(getApiErrorMessage(error, "Không thể đăng nhập, vui lòng thử lại"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden bg-[#103b2d] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -right-32 -top-32 h-[430px] w-[430px] rounded-full border-[80px] border-white/5" />
        <div className="absolute -bottom-44 -left-28 h-[500px] w-[500px] rounded-full border-[90px] border-emerald-300/5" />
        <div className="relative flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-brand-700"><Leaf className="h-6 w-6" /></span><div><p className="font-bold">Smart Agriculture</p><p className="text-[10px] uppercase tracking-[.22em] text-emerald-200/60">Farm Management</p></div></div>
        <div className="relative max-w-xl py-12">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-emerald-100"><Sprout className="h-3.5 w-3.5" />Nông nghiệp bền vững</span>
          <h1 className="mt-7 text-4xl font-bold leading-tight tracking-tight xl:text-5xl">Hiểu từng thay đổi nhỏ,<br />nuôi dưỡng mùa vụ lớn.</h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-emerald-50/65">Một không gian quản lý tập trung giúp theo dõi trang trại, môi trường và vận hành thông minh hơn mỗi ngày.</p>
          <div className="mt-10 grid grid-cols-3 gap-4 border-t border-white/10 pt-7 text-sm"><div><b className="block text-xl">IoT</b><span className="text-xs text-emerald-100/55">Giám sát</span></div><div><b className="block text-xl">Quản lý</b><span className="text-xs text-emerald-100/55">Trang trại</span></div><div><b className="block text-xl">Theo dõi</b><span className="text-xs text-emerald-100/55">Thiết bị</span></div></div>
        </div>
        <p className="relative text-xs text-emerald-100/40">© 2026 Smart Agriculture · Graduation Project</p>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-slate-50/60 px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-9 flex items-center gap-3 lg:hidden"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white"><Leaf className="h-5 w-5" /></span><span className="font-bold text-slate-900">Smart Agriculture</span></div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-brand-600">Chào mừng trở lại</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Đăng nhập hệ thống</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">Nhập thông tin để truy cập bảng điều khiển nông nghiệp thông minh.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="text-sm font-semibold text-slate-700">Email</label>
              <div className="relative mt-2"><Mail className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" /><input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email được cấp của bạn" className={`h-12 w-full rounded-xl border bg-white pl-11 pr-4 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-300 ${errors.email ? "border-red-400" : "border-slate-200 focus:border-brand-500"}`} aria-invalid={Boolean(errors.email)} /></div>
              {errors.email && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.email}</p>}
            </div>
            <div>
              <label htmlFor="password" className="text-sm font-semibold text-slate-700">Mật khẩu</label>
              <div className="relative mt-2"><LockKeyhole className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" /><input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nhập mật khẩu" className={`h-12 w-full rounded-xl border bg-white pl-11 pr-12 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-300 ${errors.password ? "border-red-400" : "border-slate-200 focus:border-brand-500"}`} aria-invalid={Boolean(errors.password)} /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:text-slate-700" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>{showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}</button></div>
              {errors.password && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.password}</p>}
            </div>
            <label className="flex w-fit items-center gap-2.5 text-sm text-slate-600"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-brand-600" /><span>Ghi nhớ đăng nhập</span></label>
            {serverError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{serverError}</div>}
            <button type="submit" disabled={isSubmitting} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-bold text-white shadow-lg shadow-brand-600/15 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70">{isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}{isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}</button>
          </form>
          <div className="mt-7 rounded-xl border border-brand-100 bg-brand-50/70 p-3.5 text-center text-xs leading-5 text-brand-800">Đăng nhập bằng tài khoản được cấp cho môi trường đang sử dụng. Liên hệ quản trị viên nếu cần hỗ trợ.</div>
        </div>
      </section>
    </main>
  );
}
