import {
  LayoutDashboard,
  ClipboardList,
  PlusCircle,
  Wrench,
  Building2,
  LogOut,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router";
import "./Sidebar.css";
import BrandLogo from "./BrandLogo";

type Role = "tenant" | "maintenance" | "manager";

type SidebarProps = {
  role: Role;
};

type SidebarLink = {
  label: string;
  path: string;
  icon: LucideIcon;
};

const sidebarLinks: Record<Role, SidebarLink[]> = {
  tenant: [
    { label: "Dashboard", path: "/tenant/dashboard", icon: LayoutDashboard },
    { label: "My Requests", path: "/tenant/requests", icon: ClipboardList },
    { label: "New Request", path: "/tenant/requests/new", icon: PlusCircle },
    { label: "My Apartment", path: "/tenant/apartment", icon: Building2 },
    { label: "My Profile", path: "/tenant/profile", icon: UserRound },
  ],

  maintenance: [
    {
      label: "Dashboard",
      path: "/maintenance/dashboard",
      icon: LayoutDashboard,
    },
    { label: "Assigned Requests", path: "/maintenance/requests", icon: Wrench },
    { label: "My Profile", path: "/maintenance/profile", icon: UserRound },
  ],

  manager: [
    { label: "Dashboard", path: "/manager/dashboard", icon: LayoutDashboard },
    { label: "All Requests", path: "/manager/requests", icon: ClipboardList },
    { label: "Apartments", path: "/manager/apartments", icon: Building2 },
    { label: "Accounts & Team", path: "/manager/users", icon: Users },
    { label: "My Profile", path: "/manager/profile", icon: UserRound },
  ],
};

function Sidebar({ role }: SidebarProps) {
  const navigate = useNavigate();

  const logOut = () => {
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  const links = sidebarLinks[role] || [];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <BrandLogo />
        <small>
          {role === "tenant"
            ? "Resident portal"
            : role === "manager"
              ? "Property management"
              : "Staff portal"}
        </small>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              end
              key={link.path}
              to={link.path}
              className="sidebar-link"
            >
              <Icon size={20} />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
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
