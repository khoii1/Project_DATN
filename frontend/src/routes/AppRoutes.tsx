import { Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { NotFoundPage } from "../pages/NotFoundPage";
import { AlertsPage } from "../pages/alerts/AlertsPage";
import { LoginPage } from "../pages/auth/LoginPage";
import { CropsPage } from "../pages/crops/CropsPage";
import { DashboardPage } from "../pages/dashboard/DashboardPage";
import { DevicesPage } from "../pages/devices/DevicesPage";
import { DeviceDetailPage } from "../pages/devices/DeviceDetailPage";
import { FarmsPage } from "../pages/farms/FarmsPage";
import { FarmDetailPage } from "../pages/farms/FarmDetailPage";
import { IrrigationPage } from "../pages/irrigation/IrrigationPage";
import { SensorsPage } from "../pages/sensors/SensorsPage";
import { SettingsPage } from "../pages/settings/SettingsPage";
import { UsersPage } from "../pages/users/UsersPage";
import { ZonesPage } from "../pages/zones/ZonesPage";
import { ZoneDetailPage } from "../pages/zones/ZoneDetailPage";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { PublicOnlyRoute } from "../components/auth/PublicOnlyRoute";
import { RoleRoute } from "../components/auth/RoleRoute";
import { ForbiddenPage } from "../pages/ForbiddenPage";

const SensorHistoryPage = lazy(() => import("../pages/sensors/SensorHistoryPage").then((module) => ({ default: module.SensorHistoryPage })));
const ReportsPage = lazy(() => import('../pages/reports/ReportsPage').then((module) => ({ default: module.ReportsPage })));
const ActivityLogsPage = lazy(() => import('../pages/activity-logs/ActivityLogsPage').then((module) => ({ default: module.ActivityLogsPage })));

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/farms" element={<FarmsPage />} />
        <Route path="/farms/:farmId" element={<FarmDetailPage />} />
        <Route path="/zones" element={<ZonesPage />} />
        <Route path="/zones/:zoneId" element={<ZoneDetailPage />} />
        <Route path="/crops" element={<CropsPage />} />
        <Route path="/devices" element={<DevicesPage />} />
        <Route path="/devices/:deviceId" element={<DeviceDetailPage />} />
        <Route path="/sensors" element={<SensorsPage />} />
        <Route path="/sensors/history" element={<Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-slate-100" />}><SensorHistoryPage /></Suspense>} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/irrigation" element={<IrrigationPage />} />
        <Route path="/reports" element={<Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-slate-100" />}><ReportsPage /></Suspense>} />
        <Route path="/activity-logs" element={<Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-slate-100" />}><ActivityLogsPage /></Suspense>} />
        <Route path="/users" element={<RoleRoute roles={["ADMIN"]}><UsersPage /></RoleRoute>} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
