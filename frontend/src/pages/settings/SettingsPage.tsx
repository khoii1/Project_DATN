import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { KeyRound, ShieldCheck, UserCog } from "lucide-react";
import { PageHeader } from "../../components/common/PageHeader";
import { useAuth } from "../../hooks/useAuth";
import { getApiErrorMessage } from "../../services/api";
import { authService } from "../../services/auth.service";
import { roleLabels } from "../../types/auth";

export function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { hash: activeHash } = useLocation();

  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    setFullName(user?.fullName ?? "");
    setPhone(user?.phone ?? "");
  }, [user?.fullName, user?.phone]);

  useEffect(() => {
    if (typeof document === "undefined" || !activeHash) return;
    const sectionId = activeHash.replace(/^#/, "");
    if (sectionId !== "profile" && sectionId !== "security") return;
    const sectionEl = document.getElementById(sectionId);
    sectionEl?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    const inputId = sectionId === "profile" ? "settings-fullname" : "settings-current-password";
    const inputEl = document.getElementById(inputId) as HTMLInputElement | null;
    inputEl?.focus?.({ preventScroll: true });
  }, [activeHash]);

  const handleProfileSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();
    if (trimmedName.length < 2) {
      setProfileError("Họ tên phải có ít nhất 2 ký tự");
      return;
    }
    if (trimmedPhone && !/^[0-9+().\s-]{1,20}$/.test(trimmedPhone)) {
      setProfileError("Số điện thoại không hợp lệ (tối đa 20 ký tự)");
      return;
    }

    setProfileLoading(true);
    try {
      const updated = await authService.updateProfile({
        fullName: trimmedName,
        phone: trimmedPhone ? trimmedPhone : null,
      });
      updateUser?.(updated);
      setProfileSuccess("Đã lưu thông tin hồ sơ cá nhân.");
    } catch (error) {
      setProfileError(getApiErrorMessage(error, "Không thể cập nhật hồ sơ"));
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword) {
      setPasswordError("Vui lòng nhập mật khẩu hiện tại");
      return;
    }
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setPasswordError("Mật khẩu mới phải có ít nhất 8 ký tự, gồm cả chữ cái và chữ số");
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError("Mật khẩu mới phải khác mật khẩu hiện tại");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Xác nhận mật khẩu mới không khớp");
      return;
    }

    setPasswordLoading(true);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess("Đã đổi mật khẩu thành công.");
    } catch (error) {
      setPasswordError(getApiErrorMessage(error, "Không thể đổi mật khẩu"));
    } finally {
      setPasswordLoading(false);
    }
  };

  const inputClass =
    "mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cài đặt tài khoản"
        description="Quản lý thông tin hồ sơ cá nhân, bảo mật mật khẩu và phạm vi quyền hạn trên hệ thống."
      />

      {!user ? (
        <section className="surface-card p-5 sm:p-6">
          <p role="status" className="text-slate-500">Chưa có thông tin tài khoản.</p>
        </section>
      ) : (
        <>
          <section className="surface-card p-5 sm:p-6" aria-labelledby="account-overview-title">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="account-overview-title" className="text-lg font-bold text-slate-900">Tổng quan tài khoản & Phân quyền</h2>
                  <p className="text-xs text-slate-500">Email, vai trò và trạng thái hoạt động được quản lý theo chính sách phân quyền hệ thống.</p>
                </div>
              </div>
              {user.role === "ADMIN" && (
                <Link to="/users" className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-2.5 text-sm font-bold text-brand-700 transition hover:bg-brand-100/70">
                  Quản lý người dùng
                </Link>
              )}
            </div>

            <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Họ tên hiển thị", user.fullName],
                ["Địa chỉ Email", user.email],
                ["Vai trò hệ thống", roleLabels[user.role]],
                ["Trạng thái", user.status === "ACTIVE" ? "Đang hoạt động" : "Ngừng hoạt động"],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0 rounded-xl bg-slate-50/80 p-3.5">
                  <dt className="text-xs font-medium text-slate-500">{label}</dt>
                  <dd className="mt-1 break-words text-sm font-bold text-slate-800">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section
              id="profile"
              className={`surface-card scroll-mt-24 p-5 transition sm:p-6 ${activeHash === "#profile" ? "ring-2 ring-brand-500/40" : ""}`}
              aria-labelledby="profile-title"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700">
                  <UserCog className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="profile-title" className="text-lg font-bold text-slate-900">Cập nhật hồ sơ cá nhân</h2>
                  <p className="text-xs text-slate-500">Chỉnh sửa họ tên và số điện thoại liên hệ của bạn.</p>
                </div>
              </div>

              <form onSubmit={handleProfileSubmit} className="mt-5 space-y-4">
                {profileError && (
                  <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {profileError}
                  </div>
                )}
                {profileSuccess && (
                  <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {profileSuccess}
                  </div>
                )}

                <div>
                  <label htmlFor="settings-email" className="block text-sm font-semibold text-slate-700">Email đăng nhập (Chỉ đọc)</label>
                  <input
                    id="settings-email"
                    type="email"
                    value={user.email}
                    disabled
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="settings-fullname" className="block text-sm font-semibold text-slate-700">Họ và tên</label>
                  <input
                    id="settings-fullname"
                    aria-label="Họ và tên"
                    type="text"
                    required
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Nhập họ và tên"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="settings-phone" className="block text-sm font-semibold text-slate-700">Số điện thoại</label>
                  <input
                    id="settings-phone"
                    aria-label="Số điện thoại"
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="Ví dụ: 0901234567"
                    className={inputClass}
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
                  >
                    {profileLoading ? "Đang lưu..." : "Lưu thay đổi hồ sơ"}
                  </button>
                </div>
              </form>
            </section>

            <section
              id="security"
              className={`surface-card scroll-mt-24 p-5 transition sm:p-6 ${activeHash === "#security" ? "ring-2 ring-amber-500/40" : ""}`}
              aria-labelledby="security-title"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="security-title" className="text-lg font-bold text-slate-900">Đổi mật khẩu bảo mật</h2>
                  <p className="text-xs text-slate-500">Mật khẩu mới cần tối thiểu 8 ký tự, bao gồm chữ cái và chữ số.</p>
                </div>
              </div>

              <form onSubmit={handlePasswordSubmit} className="mt-5 space-y-4">
                {passwordError && (
                  <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {passwordSuccess}
                  </div>
                )}

                <div>
                  <label htmlFor="settings-current-password" className="block text-sm font-semibold text-slate-700">Mật khẩu hiện tại</label>
                  <input
                    id="settings-current-password"
                    aria-label="Mật khẩu hiện tại"
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    placeholder="Nhập mật khẩu đang sử dụng"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="settings-new-password" className="block text-sm font-semibold text-slate-700">Mật khẩu mới</label>
                  <input
                    id="settings-new-password"
                    aria-label="Mật khẩu mới"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Tối thiểu 8 ký tự, có chữ và số"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="settings-confirm-password" className="block text-sm font-semibold text-slate-700">Xác nhận mật khẩu mới</label>
                  <input
                    id="settings-confirm-password"
                    aria-label="Xác nhận mật khẩu mới"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    className={inputClass}
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    {passwordLoading ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
