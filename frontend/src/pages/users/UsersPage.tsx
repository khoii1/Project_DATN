import { ChevronLeft, ChevronRight, Pencil, Plus, RefreshCw, Search, ShieldCheck, UserRoundX, Users } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { UserFormModal, type UserFormValue } from "../../components/users/UserFormModal";
import { UserStatusDialog } from "../../components/users/UserStatusDialog";
import { getApiErrorMessage } from "../../services/api";
import { userService, type UserListData, type UserRecord } from "../../services/user.service";
import { roleLabels, type UserRole, type UserStatus } from "../../types/auth";

const roleBadge: Record<UserRole, string> = {
  ADMIN: "bg-violet-50 text-violet-700",
  FARM_OWNER: "bg-sky-50 text-sky-700",
  STAFF: "bg-slate-100 text-slate-600",
};
const dateFormatter = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
const initialData: UserListData = { items: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } };

export function UsersPage() {
  const [data, setData] = useState<UserListData>(initialData);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [status, setStatus] = useState<UserStatus | "">("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [formUser, setFormUser] = useState<UserRecord | null | undefined>(undefined);
  const [statusUser, setStatusUser] = useState<UserRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [feedback, setFeedback] = useState("");

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setPageError("");
    try {
      setData(await userService.getUsers({ search, role, status, page, limit: 10 }));
    } catch (error) {
      setPageError(getApiErrorMessage(error, "Không thể tải danh sách người dùng"));
    } finally {
      setIsLoading(false);
    }
  }, [search, role, status, page]);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };
  const closeModals = () => {
    if (!isSubmitting) {
      setFormUser(undefined);
      setStatusUser(null);
      setModalError("");
    }
  };

  const handleFormSubmit = async (value: UserFormValue) => {
    setIsSubmitting(true);
    setModalError("");
    try {
      if (formUser) {
        await userService.updateUser(formUser.id, { fullName: value.fullName, phone: value.phone || null, role: value.role });
        setFeedback("Cập nhật người dùng thành công");
      } else {
        await userService.createUser({ fullName: value.fullName, email: value.email, phone: value.phone || undefined, password: value.password, role: value.role });
        setFeedback("Tạo người dùng thành công");
      }
      setFormUser(undefined);
      await loadUsers();
    } catch (error) {
      setModalError(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async () => {
    if (!statusUser) return;
    setIsSubmitting(true);
    setModalError("");
    try {
      const nextStatus: UserStatus = statusUser.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await userService.updateUser(statusUser.id, { status: nextStatus });
      setFeedback(nextStatus === "ACTIVE" ? "Đã kích hoạt tài khoản" : "Đã ngừng hoạt động tài khoản");
      setStatusUser(null);
      await loadUsers();
    } catch (error) {
      setModalError(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <PageHeader title="Người dùng" description="Quản lý tài khoản, vai trò và trạng thái truy cập hệ thống." eyebrow="Quản trị hệ thống" />
        <button onClick={() => { setModalError(""); setFormUser(null); }} className="flex h-11 items-center justify-center gap-2 self-start rounded-xl bg-brand-600 px-4 text-sm font-bold text-white hover:bg-brand-700 sm:self-auto"><Plus className="h-4 w-4" />Thêm người dùng</button>
      </div>

      {feedback && <div role="status" className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"><span>{feedback}</span><button onClick={() => setFeedback("")} aria-label="Đóng thông báo">×</button></div>}

      <section className="surface-card overflow-hidden">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <form onSubmit={handleSearch} className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_190px_190px_auto]">
            <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Tìm theo tên, email, số điện thoại" className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm focus:border-brand-500" /></div>
            <select value={role} onChange={(event) => { setRole(event.target.value as UserRole | ""); setPage(1); }} className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-600"><option value="">Tất cả vai trò</option><option value="ADMIN">Quản trị viên</option><option value="FARM_OWNER">Chủ trang trại</option><option value="STAFF">Nhân viên</option></select>
            <select value={status} onChange={(event) => { setStatus(event.target.value as UserStatus | ""); setPage(1); }} className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-600"><option value="">Tất cả trạng thái</option><option value="ACTIVE">Hoạt động</option><option value="INACTIVE">Ngừng hoạt động</option></select>
            <button type="submit" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Tìm kiếm</button>
          </form>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-5">{[1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}</div>
        ) : pageError ? (
          <div className="grid min-h-64 place-items-center p-8 text-center"><div><RefreshCw className="mx-auto h-8 w-8 text-red-400" /><p className="mt-3 text-sm font-semibold text-red-600">{pageError}</p><button onClick={() => void loadUsers()} className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold">Thử lại</button></div></div>
        ) : data.items.length === 0 ? (
          <div className="grid min-h-64 place-items-center p-8 text-center"><div><Users className="mx-auto h-10 w-10 text-slate-300" /><h2 className="mt-3 font-bold text-slate-700">Chưa có người dùng phù hợp</h2><p className="mt-1 text-sm text-slate-400">Thử thay đổi bộ lọc hoặc thêm tài khoản mới.</p></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3.5">Họ tên</th><th className="px-5 py-3.5">Liên hệ</th><th className="px-5 py-3.5">Vai trò</th><th className="px-5 py-3.5">Trạng thái</th><th className="px-5 py-3.5">Ngày tạo</th><th className="px-5 py-3.5 text-right">Thao tác</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-xs font-bold text-brand-700">{user.fullName.split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase()}</span><div><p className="text-sm font-bold text-slate-800">{user.fullName}</p><p className="mt-0.5 text-xs text-slate-400">{user.id.slice(0, 8)}</p></div></div></td>
                    <td className="px-5 py-4"><p className="text-sm text-slate-700">{user.email}</p><p className="mt-1 text-xs text-slate-400">{user.phone || "Chưa cập nhật SĐT"}</p></td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${roleBadge[user.role]}`}>{roleLabels[user.role]}</span></td>
                    <td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 text-xs font-bold ${user.status === "ACTIVE" ? "text-emerald-700" : "text-slate-400"}`}><span className={`h-2 w-2 rounded-full ${user.status === "ACTIVE" ? "bg-emerald-500" : "bg-slate-300"}`} />{user.status === "ACTIVE" ? "Hoạt động" : "Ngừng hoạt động"}</span></td>
                    <td className="px-5 py-4 text-sm text-slate-500">{dateFormatter.format(new Date(user.createdAt))}</td>
                    <td className="px-5 py-4"><div className="flex justify-end gap-1"><button onClick={() => { setModalError(""); setFormUser(user); }} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label={`Chỉnh sửa ${user.fullName}`}><Pencil className="h-4 w-4" /></button><button onClick={() => { setModalError(""); setStatusUser(user); }} className={`rounded-lg p-2 ${user.status === "ACTIVE" ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"}`} aria-label={`${user.status === "ACTIVE" ? "Ngừng hoạt động" : "Kích hoạt"} ${user.fullName}`}>{user.status === "ACTIVE" ? <UserRoundX className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-sm text-slate-500 sm:flex-row"><p>Hiển thị {data.items.length} / {data.pagination.total} người dùng</p><div className="flex items-center gap-2"><button onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40" aria-label="Trang trước"><ChevronLeft className="h-4 w-4" /></button><span className="px-2 text-xs font-bold">Trang {data.pagination.page} / {data.pagination.totalPages}</span><button onClick={() => setPage((value) => Math.min(data.pagination.totalPages, value + 1))} disabled={page >= data.pagination.totalPages} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40" aria-label="Trang sau"><ChevronRight className="h-4 w-4" /></button></div></div>
      </section>

      {formUser !== undefined && <UserFormModal user={formUser} isSubmitting={isSubmitting} error={modalError} onClose={closeModals} onSubmit={handleFormSubmit} />}
      {statusUser && <UserStatusDialog user={statusUser} isSubmitting={isSubmitting} error={modalError} onCancel={closeModals} onConfirm={handleStatusChange} />}
    </div>
  );
}
