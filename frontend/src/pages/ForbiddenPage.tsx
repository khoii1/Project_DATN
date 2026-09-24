import { ShieldX } from "lucide-react";
import { Link } from "react-router-dom";

export function ForbiddenPage() {
  return (
    <div className="surface-card grid min-h-[65vh] place-items-center p-8 text-center">
      <div><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-red-50 text-red-600"><ShieldX className="h-8 w-8" /></div><p className="mt-6 text-6xl font-black text-slate-200">403</p><h1 className="mt-3 text-2xl font-bold text-slate-900">Bạn không có quyền truy cập</h1><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">Tài khoản hiện tại không được phép sử dụng chức năng này.</p><Link to="/dashboard" className="mt-7 inline-flex rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700">Quay lại Dashboard</Link></div>
    </div>
  );
}
