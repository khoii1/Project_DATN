import { Leaf } from "lucide-react";

export function AuthLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50">
      <div className="text-center"><span className="mx-auto grid h-14 w-14 animate-pulse place-items-center rounded-2xl bg-brand-600 text-white"><Leaf className="h-7 w-7" /></span><p className="mt-4 text-sm font-semibold text-slate-500">Đang xác thực phiên đăng nhập...</p></div>
    </main>
  );
}

