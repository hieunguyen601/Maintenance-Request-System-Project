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
import AssignedRequests from "./assets/pages/maintenance/AssignedRequests";
import AllRequests from "./assets/pages/manager/AllRequests";
import Apartments from "./assets/pages/manager/Apartments";
import Users from "./assets/pages/manager/Users";
import MyApartment from "./assets/pages/tenant/MyApartment";
import Profile from "./assets/pages/tenant/Profile";

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
          <Route path="/tenant/apartment" element={<MyApartment />} />
          <Route path="/tenant/profile" element={<Profile />} />
        </Route>
      </Route>

      <Route element={<RoleGuard allowedRole="maintenance" />}>
        <Route element={<DashboardLayout role="maintenance" />}>
          <Route
            path="/maintenance/dashboard"
            element={<MaintenanceDashboard />}
          />
          <Route path="/maintenance/requests" element={<AssignedRequests />} />
          <Route path="/maintenance/profile" element={<Profile />} />
        </Route>
      </Route>

      <Route element={<RoleGuard allowedRole="manager" />}>
        <Route element={<DashboardLayout role="manager" />}>
          <Route path="/manager/dashboard" element={<ManagerDashboard />} />
          <Route path="/manager/requests" element={<AllRequests />} />
          <Route path="/manager/apartments" element={<Apartments />} />
          <Route path="/manager/users" element={<Users />} />
          <Route path="/manager/profile" element={<Profile />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
