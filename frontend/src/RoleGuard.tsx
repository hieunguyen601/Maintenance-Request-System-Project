import { useCallback, useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router";
import { isAxiosError } from "axios";
import api from "./services/api";
import type { Role } from "./services/types";
export default function RoleGuard({ allowedRole }: { allowedRole: Role }) {
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const check = useCallback(async () => {
    setLoading(true);
    setError("");
    if (!localStorage.getItem("token")) {
      setRole(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get<{ role: Role }>("/me");
      setRole(
        ["tenant", "maintenance", "manager"].includes(data.role)
          ? data.role
          : null,
      );
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 401) {
        localStorage.removeItem("token");
        setRole(null);
      } else
        setError(
          "Unable to reach the server. Check that the backend is running and try again.",
        );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void check();
    const expire = () => {
      setRole(null);
    };
    window.addEventListener("session-expired", expire);
    return () => window.removeEventListener("session-expired", expire);
  }, [check]);
  if (loading)
    return (
      <main className="empty-state" role="status">
        Checking your session…
      </main>
    );
  if (error)
    return (
      <main className="empty-state">
        <p role="alert">{error}</p>
        <button className="primary-button" onClick={() => void check()}>
          Try again
        </button>
      </main>
    );
  if (!role) return <Navigate to="/login" replace />;
  if (role !== allowedRole)
    return <Navigate to={`/${role}/dashboard`} replace />;
  return <Outlet />;
}
