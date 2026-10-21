import {
    LayoutDashboard,
    ClipboardList,
    PlusCircle,
    House,
    UserRound,
    LogOut,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router";
import "./Sidebar.css";


function Sidebar() {
    const navigate = useNavigate();

    const logOut = () => {
        localStorage.removeItem('token');
        navigate("/login", {replace: true});
    }


    return (
        <aside className="sidebar">
            <div className="sidebar-logo">

                <p className="title">Apartment Maintenance Services</p>
            </div>
            <nav className="sidebar-nav">
                <NavLink to="/dashboard" className="sidebar-link">
                    <LayoutDashboard size={20} />
                    <span>Dashboard</span>
                </NavLink>

                <NavLink to="/requests/new" className="sidebar-link">
                    <PlusCircle size={20} />
                    <span>New Request</span>
                </NavLink>

                <NavLink to="/my-requests" className="sidebar-link">
                    <ClipboardList size={20} />
                    <span>My Requests</span>
                </NavLink>

                <NavLink to="/my-apartment" className="sidebar-link">
                    <House size={20} />
                    <span>My Apartment</span>
                </NavLink>

                <NavLink to="/my-profile" className="sidebar-link">
                    <UserRound size={20} />
                    <span>My Profile</span>
                </NavLink>
            </nav>

            <div className="sidebar-bottom">
                <button onClick={logOut} className="logout-btn" type="button">
                    <LogOut size={20} />
                    <span>Log Out</span>
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;
