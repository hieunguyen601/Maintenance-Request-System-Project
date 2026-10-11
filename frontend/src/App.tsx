import Dashboard from "./assets/pages/Dashboard";
import DashboardLayout from "./assets/Layouts/DashboardLayout";
import MyRequests from "./assets/pages/MyRequests";
import MyApartment from "./assets/pages/MyApartment";
import Profile from "./assets/pages/Profile";
import NewRequest from "./assets/pages/NewRequest";

import "./App.css";
import { Route, Routes } from "react-router";

function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/my-requests" element={<MyRequests />} />
        <Route path="/requests/new" element={<NewRequest />} />
        <Route path="/my-apartment" element={<MyApartment />} />
        <Route path="/my-profile" element={<Profile />} />
      </Route>
    </Routes>
  );
}

export default App;
