import { Outlet } from "react-router";
import Sidebar from "../components/Sidebar";
import "./DashboardLayout.css"

type Role = "tenant" | "maintenance" | "manager";

function DashboardLayout({ role }: { role: Role }) {
    return (
        <div className="dashboard-layout">
            <Sidebar role={role} />

            <main className="dashboard-content">
                <Outlet />
            </main>
        </div>
    );
}

export default DashboardLayout;