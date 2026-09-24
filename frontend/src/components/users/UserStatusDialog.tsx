import { AlertTriangle, Loader2 } from "lucide-react";
import type { UserRecord } from "../../services/user.service";

interface UserStatusDialogProps {
  user: UserRecord;
  isSubmitting: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export function UserStatusDialog({ user, isSubmitting, error, onCancel, onConfirm }: UserStatusDialogProps) {
  const deactivating = user.status === "ACTIVE";
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className={`grid h-12 w-12 place-items-center rounded-xl ${deactivating ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}><AlertTriangle className="h-6 w-6" /></div><h2 className="mt-5 text-xl font-bold text-slate-900">{deactivating ? "Ngừng hoạt động tài khoản?" : "Kích hoạt lại tài khoản?"}</h2><p className="mt-3 text-sm leading-6 text-slate-500">{deactivating ? `${user.fullName} sẽ không thể đăng nhập hoặc sử dụng token hiện tại.` : `${user.fullName} sẽ có thể đăng nhập lại hệ thống.`}</p>{error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}<div className="mt-6 flex justify-end gap-3"><button onClick={onCancel} disabled={isSubmitting} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Hủy</button><button onClick={() => void onConfirm()} disabled={isSubmitting} className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60 ${deactivating ? "bg-amber-600 hover:bg-amber-700" : "bg-brand-600 hover:bg-brand-700"}`}>{isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}{deactivating ? "Ngừng hoạt động" : "Kích hoạt"}</button></div></div>
    </div>
  );
}
