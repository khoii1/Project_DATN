import { Bell, ChevronDown, Menu, Settings, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { pageTitleByPath } from "../../constants/navigation";
import { useAuth } from "../../hooks/useAuth";
import { roleLabels } from "../../types/auth";

interface TopbarProps { onOpenMobile: () => void; }

export function Topbar({ onOpenMobile }: TopbarProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pageTitle = pageTitleByPath[pathname] ?? "Smart Agriculture";
  const initials = user?.fullName.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase() ?? "U";

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button onClick={onOpenMobile} className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 lg:hidden" aria-label="Mở menu">
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="hidden text-xs font-medium text-slate-400 sm:block">Smart Agriculture /</p>
          <h2 className="truncate text-base font-bold text-slate-900 sm:mt-0.5">{pageTitle}</h2>
        </div>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-3">
        <button className="relative rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800" aria-label="Thông báo">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>
        <div ref={menuRef} className="relative">
          <button onClick={() => setMenuOpen((current) => !current)} className="flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-slate-100 sm:pr-2" aria-haspopup="menu" aria-expanded={menuOpen}>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-100 text-sm font-bold text-brand-700">{initials}</span>
            <span className="hidden text-left md:block">
              <span className="block text-sm font-semibold leading-4 text-slate-800">{user?.fullName}</span>
              <span className="mt-1 block text-[11px] text-slate-400">{user ? roleLabels[user.role] : ""}</span>
            </span>
            <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl" role="menu">
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50" role="menuitem"><UserRound className="h-4 w-4" />Hồ sơ</button>
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50" role="menuitem"><Settings className="h-4 w-4" />Cài đặt</button>
              <div className="my-1 border-t border-slate-100" />
              <button onClick={() => void handleLogout()} className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50" role="menuitem">Đăng xuất</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
