import { Outlet } from "react-router";
import Sidebar from "../components/Sidebar";
import "./DashboardLayout.css"

function DashboardLayout() {
    return (
        <div className="dashboard-layout">
            <Sidebar />

            <main className="dashboard-content">
                <Outlet />
            </main>
        </div>
    )
}

export default DashboardLayout;