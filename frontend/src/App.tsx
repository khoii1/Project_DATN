import { AppRoutes } from "./routes/AppRoutes";
import { AuthProvider } from "./contexts/AuthProvider";
import { Component, type ReactNode } from "react";

class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <main role="alert" className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <section className="surface-card max-w-lg p-6 text-center">
        <h1 className="text-xl font-bold">Không thể hiển thị trang</h1>
        <p className="mt-3 text-sm text-slate-600">Có lỗi khi tải giao diện. Hãy tải lại trang; nếu lỗi tiếp tục, liên hệ quản trị viên.</p>
        <button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-xl bg-brand-600 px-5 py-3 font-bold text-white">Tải lại trang</button>
      </section>
    </main>;
    return this.props.children;
  }
}

export default function App() {
  return <AppErrorBoundary><AuthProvider><AppRoutes /></AuthProvider></AppErrorBoundary>;
}
