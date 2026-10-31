import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import api from "../../services/api";
import type { User } from "../../services/types";
export default function Navbar() {
  const { pathname } = useLocation();
  const role = pathname.split("/")[1];
  const page = pathname.split("/").slice(2).join("/");
  const pageNames: Record<string, string> = {
    dashboard: "Overview",
    requests: "Requests",
    "requests/new": "New request",
    apartment: "My apartment",
    apartments: "Apartments",
    users: "Accounts & Team",
    profile: "My profile",
  };
  const [user, setUser] = useState<User | null>(null);
  const load = useCallback(() => {
    api
      .get<User>("/me")
      .then((response) => setUser(response.data))
      .catch(() => {});
  }, []);
  useEffect(() => {
    load();
    window.addEventListener("profile-updated", load);
    return () => window.removeEventListener("profile-updated", load);
  }, [load]);
  return (
    <header className="workspace-topbar">
      <nav className="property-brand" aria-label="Breadcrumb">
        <Link to={`/${role}/dashboard`}>Home</Link>
        <span className="breadcrumb-separator" aria-hidden="true">
          /
        </span>
        <span aria-current="page">{pageNames[page] || "Maintenance"}</span>
      </nav>
      {user && (
        <Link to={`/${user.role}/profile`} className="profile-link">
          <span className="avatar">
            {user.first_name.charAt(0)}
            {user.last_name.charAt(0)}
          </span>
          <span>
            {user.first_name} {user.last_name}
            <small>
              {user.role === "maintenance"
                ? "Maintenance staff"
                : user.role === "manager"
                  ? "Property manager"
                  : "Resident"}
            </small>
          </span>
        </Link>
      )}
    </header>
  );
}
