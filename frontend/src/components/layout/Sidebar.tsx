import { ChevronLeft, ChevronRight, Leaf, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { navigationItems } from "../../constants/navigation";
import { useAuth } from "../../hooks/useAuth";

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
}

export function Sidebar({ collapsed, mobileOpen, onToggleCollapse, onCloseMobile }: SidebarProps) {
  const { user } = useAuth();
  const visibleNavigationItems = navigationItems.filter((item) => !item.roles || (user && item.roles.includes(user.role)));
  return (
    <>
      {mobileOpen && (
        <button
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] lg:hidden"
          onClick={onCloseMobile}
          aria-label="Đóng menu"
        />
      )}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/10 bg-[#103b2d] text-white transition-all duration-300 lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"} ${collapsed ? "lg:w-20" : "w-[280px] lg:w-[268px]"}`}>
        <div className="flex h-[76px] items-center gap-3 border-b border-white/10 px-5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-brand-700 shadow-lg shadow-black/10">
            <Leaf className="h-6 w-6" aria-hidden="true" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold tracking-tight">Smart Agriculture</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200/70">Farm Management</p>
            </div>
          )}
          <button onClick={onCloseMobile} className="ml-auto rounded-lg p-2 text-emerald-100 hover:bg-white/10 lg:hidden" aria-label="Đóng thanh điều hướng">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-5" aria-label="Điều hướng chính">
          {!collapsed && <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200/50">Không gian làm việc</p>}
          <ul className="space-y-1">
            {visibleNavigationItems.map(({ label, path, icon: Icon }) => (
              <li key={path}>
                <NavLink
                  to={path}
                  title={collapsed ? label : undefined}
                  onClick={onCloseMobile}
                  className={({ isActive }) => `group flex h-11 items-center rounded-xl text-sm font-medium transition ${collapsed ? "justify-center px-0" : "gap-3 px-3"} ${isActive ? "bg-white text-brand-800 shadow-sm" : "text-emerald-50/75 hover:bg-white/10 hover:text-white"}`}
                >
                  <Icon className="h-[19px] w-[19px] shrink-0" aria-hidden="true" />
                  {!collapsed && <span className="truncate">{label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden border-t border-white/10 p-3 lg:block">
          <button onClick={onToggleCollapse} className={`flex h-10 w-full items-center rounded-xl text-sm font-medium text-emerald-50/75 transition hover:bg-white/10 hover:text-white ${collapsed ? "justify-center" : "gap-3 px-3"}`} title={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}>
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <><ChevronLeft className="h-5 w-5" /><span>Thu gọn menu</span></>}
          </button>
        </div>
      </aside>
    </>
  );
}
