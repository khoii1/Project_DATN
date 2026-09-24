import { ArrowLeft, CalendarDays, Leaf, MapPin, Pencil, Plus, RefreshCw, Ruler, Trash2, UserRound, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { FarmFormModal } from "../../components/farms/FarmFormModal";
import { StaffAssignmentModal } from "../../components/farms/StaffAssignmentModal";
import { ZoneFormModal } from "../../components/zones/ZoneFormModal";
import { useAuth } from "../../hooks/useAuth";
import { getApiErrorMessage } from "../../services/api";
import { farmService, type FarmInput } from "../../services/farm.service";
import { zoneService, type ZoneInput } from "../../services/zone.service";
import type { AuthUser } from "../../types/auth";
import type { Farm, FarmStaffAssignment, Zone } from "../../types/farm";
import { farmStatusLabels, zoneStatusLabels } from "../../types/farm";

const dateFormatter = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

export function FarmDetailPage() {
  const { farmId = "" } = useParams();
  const { user } = useAuth();
  const canManage = user?.role !== "STAFF";
  const [farm, setFarm] = useState<Farm | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [staff, setStaff] = useState<FarmStaffAssignment[]>([]);
  const [candidates, setCandidates] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [editFarm, setEditFarm] = useState(false);
  const [zoneModal, setZoneModal] = useState<Zone | null | undefined>(undefined);
  const [assignModal, setAssignModal] = useState(false);
  const [removeAssignment, setRemoveAssignment] = useState<FarmStaffAssignment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [farmData, zoneData] = await Promise.all([farmService.get(farmId), zoneService.list({ farmId, limit: 100 })]);
      setFarm(farmData); setZones(zoneData.items);
      if (canManage) setStaff(await farmService.staff(farmId));
    } catch (requestError) { setError(getApiErrorMessage(requestError, "Không thể tải chi tiết trang trại")); }
    finally { setLoading(false); }
  }, [farmId, canManage]);
  useEffect(() => { void load(); }, [load]);

  const submitFarm = async (input: FarmInput) => {
    setSubmitting(true); setModalError("");
    try { await farmService.update(farmId, input); setEditFarm(false); setFeedback("Cập nhật trang trại thành công"); await load(); }
    catch (requestError) { setModalError(getApiErrorMessage(requestError)); }
    finally { setSubmitting(false); }
  };
  const submitZone = async (input: ZoneInput) => {
    setSubmitting(true); setModalError("");
    try {
      if (zoneModal) await zoneService.update(zoneModal.id, input); else await zoneService.create(input);
      setZoneModal(undefined); setFeedback(zoneModal ? "Cập nhật khu vực thành công" : "Tạo khu vực thành công"); await load();
    } catch (requestError) { setModalError(getApiErrorMessage(requestError)); }
    finally { setSubmitting(false); }
  };
  const openAssignment = async () => {
    setModalError(""); setAssignModal(true);
    try { setCandidates(await farmService.staffCandidates(farmId)); }
    catch (requestError) { setModalError(getApiErrorMessage(requestError)); }
  };
  const assign = async (staffId: string) => {
    setSubmitting(true); setModalError("");
    try { await farmService.assignStaff(farmId, staffId); setAssignModal(false); setFeedback("Phân công nhân viên thành công"); await load(); }
    catch (requestError) { setModalError(getApiErrorMessage(requestError)); }
    finally { setSubmitting(false); }
  };
  const remove = async () => {
    if (!removeAssignment) return;
    setSubmitting(true); setModalError("");
    try { await farmService.removeStaff(farmId, removeAssignment.staffId); setRemoveAssignment(null); setFeedback("Đã gỡ nhân viên khỏi trang trại"); await load(); }
    catch (requestError) { setModalError(getApiErrorMessage(requestError)); }
    finally { setSubmitting(false); }
  };
  const toggleIrrigationPermission = async (assignment: FarmStaffAssignment) => {
    setSubmitting(true); setModalError("");
    try {
      await farmService.updateStaffPermission(farmId, assignment.staffId, !assignment.canControlIrrigation);
      setFeedback(`Đã ${assignment.canControlIrrigation ? "thu hồi" : "cấp"} quyền điều khiển tưới cho ${assignment.staff.fullName}`);
      await load();
    } catch (requestError) { setModalError(getApiErrorMessage(requestError)); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="space-y-4"><div className="h-32 animate-pulse rounded-2xl bg-slate-100" /><div className="h-80 animate-pulse rounded-2xl bg-slate-100" /></div>;
  if (error || !farm) return <div className="surface-card grid min-h-80 place-items-center p-8 text-center"><div><RefreshCw className="mx-auto h-9 w-9 text-red-400" /><h1 className="mt-4 text-lg font-bold">Không thể mở trang trại</h1><p className="mt-2 text-sm text-red-600">{error}</p><Link to="/farms" className="mt-5 inline-block rounded-xl border px-4 py-2 text-sm font-semibold">Quay lại danh sách</Link></div></div>;

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><Link to="/farms" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand-700"><ArrowLeft className="h-4 w-4" />Danh sách trang trại</Link><div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold text-slate-950">{farm.name}</h1><span className={`rounded-full px-3 py-1 text-xs font-bold ${farm.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{farmStatusLabels[farm.status]}</span></div><p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500"><MapPin className="h-4 w-4" />{farm.address || "Chưa cập nhật địa chỉ"}</p></div>{canManage && <button onClick={() => { setModalError(""); setEditFarm(true); }} className="flex h-11 items-center gap-2 rounded-xl border bg-white px-4 text-sm font-bold"><Pencil className="h-4 w-4" />Chỉnh sửa</button>}</div>
    {feedback && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{feedback}</div>}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
      { icon: Ruler, label: "Diện tích", value: farm.areaHectares ? `${farm.areaHectares} ha` : "Chưa cập nhật" },
      { icon: MapPin, label: "Khu vực", value: `${farm._count.zones} khu vực` },
      { icon: Leaf, label: "Cây trồng", value: `${farm.cropCount ?? 0} cây trồng` },
      { icon: Users, label: "Nhân viên", value: canManage ? `${farm._count.staffAssignments} người` : "Theo phân công" },
    ].map((item) => <div key={item.label} className="surface-card flex items-center gap-4 p-5"><span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700"><item.icon className="h-5 w-5" /></span><div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{item.label}</p><p className="mt-1 font-bold text-slate-800">{item.value}</p></div></div>)}</section>
    <section className="surface-card p-5"><div className="grid gap-5 md:grid-cols-3"><div className="md:col-span-2"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Mô tả</p><p className="mt-2 text-sm leading-6 text-slate-600">{farm.description || "Chưa có mô tả cho trang trại này."}</p></div><div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Chủ sở hữu</p><p className="mt-2 flex items-center gap-2 font-bold"><UserRound className="h-4 w-4 text-brand-600" />{farm.owner.fullName}</p><p className="mt-1 text-sm text-slate-500">{farm.owner.email}</p><p className="mt-3 flex items-center gap-2 text-xs text-slate-400"><CalendarDays className="h-4 w-4" />Tạo ngày {dateFormatter.format(new Date(farm.createdAt))}</p></div></div></section>
    <section className="surface-card overflow-hidden"><div className="flex items-center justify-between border-b p-5"><div><h2 className="text-lg font-bold">Khu vực trồng</h2><p className="mt-1 text-sm text-slate-500">Các khu vực thuộc trang trại này.</p></div>{canManage && farm.status === "ACTIVE" && <button onClick={() => { setModalError(""); setZoneModal(null); }} className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white"><Plus className="h-4 w-4" />Thêm khu vực</button>}</div>{zones.length === 0 ? <p className="p-8 text-center text-sm text-slate-400">Chưa có khu vực trồng.</p> : <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">{zones.map((zone) => <article key={zone.id} className="rounded-2xl border p-4"><div className="flex items-start justify-between"><div><Link to={`/zones/${zone.id}`} className="font-bold text-slate-800 hover:text-brand-700">{zone.name}</Link><p className="mt-1 text-xs text-slate-400">{zone.areaHectares ? `${zone.areaHectares} ha` : "Chưa có diện tích"}</p></div><span className={`rounded-full px-2 py-1 text-[11px] font-bold ${zone.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{zoneStatusLabels[zone.status]}</span></div><p className="mt-4 text-sm text-slate-500">{zone._count.crops} cây trồng</p>{canManage && <button onClick={() => { setModalError(""); setZoneModal(zone); }} className="mt-3 flex items-center gap-1 text-xs font-bold text-brand-700"><Pencil className="h-3.5 w-3.5" />Chỉnh sửa</button>}</article>)}</div>}</section>
    {canManage && <section className="surface-card overflow-hidden"><div className="flex items-center justify-between border-b p-5"><div><h2 className="text-lg font-bold">Nhân viên được phân công</h2><p className="mt-1 text-sm text-slate-500">Quyền xem dữ liệu và điều khiển hệ thống tưới của trang trại.</p></div><button onClick={() => void openAssignment()} className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold"><Plus className="h-4 w-4" />Phân công</button></div>{modalError && !assignModal && !removeAssignment && <p role="alert" className="mx-5 mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{modalError}</p>}{staff.length === 0 ? <p className="p-8 text-center text-sm text-slate-400">Chưa phân công nhân viên.</p> : <div className="divide-y">{staff.map((assignment) => <div key={assignment.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-slate-800">{assignment.staff.fullName}</p><p className="mt-1 text-sm text-slate-500">{assignment.staff.email}</p></div><div className="flex items-center gap-3"><span className="text-xs font-semibold text-slate-500">Điều khiển tưới</span><button disabled={submitting} onClick={() => void toggleIrrigationPermission(assignment)} aria-label={`${assignment.canControlIrrigation ? "Thu hồi" : "Cấp"} quyền tưới cho ${assignment.staff.fullName}`} className={`rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-50 ${assignment.canControlIrrigation ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{assignment.canControlIrrigation ? "Được phép" : "Chỉ xem"}</button><button onClick={() => { setModalError(""); setRemoveAssignment(assignment); }} className="rounded-lg p-2 text-red-500 hover:bg-red-50" aria-label={`Gỡ ${assignment.staff.fullName}`}><Trash2 className="h-4 w-4" /></button></div></div>)}</div>}</section>}
    {editFarm && <FarmFormModal farm={farm} currentRole={user!.role} owners={[]} loading={submitting} error={modalError} onClose={() => setEditFarm(false)} onSubmit={submitFarm} />}
    {zoneModal !== undefined && <ZoneFormModal zone={zoneModal} farms={[farm]} preselectedFarmId={farm.id} loading={submitting} error={modalError} onClose={() => setZoneModal(undefined)} onSubmit={submitZone} />}
    {assignModal && <StaffAssignmentModal candidates={candidates} loading={submitting} error={modalError} onClose={() => setAssignModal(false)} onAssign={assign} />}
    {removeAssignment && <ConfirmDialog title="Gỡ nhân viên khỏi trang trại?" description={`${removeAssignment.staff.fullName} sẽ không còn quyền xem dữ liệu của trang trại này.`} confirmLabel="Gỡ phân công" tone="danger" loading={submitting} error={modalError} onCancel={() => setRemoveAssignment(null)} onConfirm={remove} />}
  </div>;
}
