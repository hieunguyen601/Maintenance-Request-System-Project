import DashboardLayout from "./assets/Layouts/DashboardLayout";
import Login from "./assets/pages/Login";
import SignUp from "./assets/pages/Signup";
import TenantDashboard from "./assets/pages/tenant/Dashboard";
import MaintenanceDashboard from "./assets/pages/maintenance/MaintenanceDashboard";
import ManagerDashboard from "./assets/pages/manager/ManagerDashboard";
import RoleGuard from "./RoleGuard";
import "./App.css";
import { Route, Routes, Navigate } from "react-router";
import NewRequest from "./assets/pages/tenant/NewRequest";
import MyRequests from "./assets/pages/tenant/MyRequests";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />

      <Route element={<RoleGuard allowedRole="tenant" />}>
        <Route element={<DashboardLayout role="tenant" />}>
          <Route path="/tenant/dashboard" element={<TenantDashboard />} />
          <Route path="/tenant/requests" element={<MyRequests />} />
          <Route path="/tenant/requests/new" element={<NewRequest />} />
        </Route>
      </Route>

      <Route element={<RoleGuard allowedRole="maintenance" />}>
        <Route element={<DashboardLayout role="maintenance" />}>
          <Route
            path="/maintenance/dashboard"
            element={<MaintenanceDashboard />}
          />
        </Route>
      </Route>

      <Route element={<RoleGuard allowedRole="manager" />}>
        <Route element={<DashboardLayout role="manager" />}>
          <Route path="/manager/dashboard" element={<ManagerDashboard />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
