import { Loader2, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import type { UserRecord } from "../../services/user.service";
import type { UserRole } from "../../types/auth";

export interface UserFormValue {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
}

interface UserFormModalProps {
  user: UserRecord | null;
  isSubmitting: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (value: UserFormValue) => Promise<void>;
}

const emptyForm: UserFormValue = { fullName: "", email: "", phone: "", password: "", role: "STAFF" };

export function UserFormModal({ user, isSubmitting, error, onClose, onSubmit }: UserFormModalProps) {
  const [form, setForm] = useState<UserFormValue>(emptyForm);

  useEffect(() => {
    setForm(user ? { fullName: user.fullName, email: user.email, phone: user.phone ?? "", password: "", role: user.role } : emptyForm);
  }, [user]);

  const setField = <K extends keyof UserFormValue>(field: K, value: UserFormValue[K]) => setForm((current) => ({ ...current, [field]: value }));
  const handleSubmit = (event: FormEvent) => { event.preventDefault(); void onSubmit(form); };
  const inputClass = "mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-800 focus:border-brand-500";

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="user-form-title">
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6"><div><p className="text-xs font-bold uppercase tracking-wider text-brand-600">Quản lý tài khoản</p><h2 id="user-form-title" className="mt-1 text-xl font-bold text-slate-900">{user ? "Chỉnh sửa người dùng" : "Thêm người dùng"}</h2></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Đóng"><X className="h-5 w-5" /></button></div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Họ và tên *<input required minLength={2} value={form.fullName} onChange={(event) => setField("fullName", event.target.value)} className={inputClass} /></label>
          {!user && <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Email *<input required type="email" value={form.email} onChange={(event) => setField("email", event.target.value)} className={inputClass} /></label>}
          <label className="text-sm font-semibold text-slate-700">Số điện thoại<input value={form.phone} onChange={(event) => setField("phone", event.target.value)} className={inputClass} placeholder="0901234567" /></label>
          <label className="text-sm font-semibold text-slate-700">Vai trò *<select value={form.role} onChange={(event) => setField("role", event.target.value as UserRole)} className={inputClass}><option value="ADMIN">Quản trị viên</option><option value="FARM_OWNER">Chủ trang trại</option><option value="STAFF">Nhân viên</option></select></label>
          {!user && <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Mật khẩu *<input required type="password" minLength={8} value={form.password} onChange={(event) => setField("password", event.target.value)} className={inputClass} placeholder="Tối thiểu 8 ký tự, gồm chữ và số" /></label>}
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:col-span-2">{error}</div>}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 px-5 py-4 sm:px-6"><button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Hủy</button><button type="submit" disabled={isSubmitting} className="flex min-w-32 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60">{isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}{user ? "Lưu thay đổi" : "Tạo người dùng"}</button></div>
      </form>
    </div>
  );
}

