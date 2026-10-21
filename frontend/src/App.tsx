import Dashboard from "./assets/pages/tenant/Dashboard";
import DashboardLayout from "./assets/Layouts/DashboardLayout";
import MyRequests from "./assets/pages/tenant/MyRequests";
import MyApartment from "./assets/pages/tenant/MyApartment";
import Profile from "./assets/pages/tenant/Profile";
import NewRequest from "./assets/pages/tenant/NewRequest";
import Login from "./assets/pages/Login";
import SignUp from "./assets/pages/Signup";
import "./App.css";
import { Route, Routes, Navigate } from "react-router";
import ProtectedRoute from "./assets/protectedRoute/ProtectedRoute";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/tenant/dashboard" element={<Dashboard />} />
          <Route path="/my-requests" element={<MyRequests />} />
          <Route path="/requests/new" element={<NewRequest />} />
          <Route path="/my-apartment" element={<MyApartment />} />
          <Route path="/my-profile" element={<Profile />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
