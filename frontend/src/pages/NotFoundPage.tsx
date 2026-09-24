import { ArrowLeft, Leaf } from "lucide-react";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-center">
      <div><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-100 text-brand-700"><Leaf className="h-7 w-7" /></div><p className="mt-7 text-7xl font-black tracking-tight text-brand-600">404</p><h1 className="mt-4 text-2xl font-bold text-slate-900">Không tìm thấy trang</h1><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">Trang bạn đang truy cập không tồn tại hoặc đã được di chuyển.</p><Link to="/dashboard" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700"><ArrowLeft className="h-4 w-4" />Quay lại Dashboard</Link></div>
    </main>
  );
}

