import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router";
import api from "./services/api";
type Role = "tenant" | "maintenance" | "manager";

type Props = {
    allowedRole: Role;
};

const dashboardPaths: Record<Role, string> = {
    tenant: "/tenant/dashboard",
    maintenance: "/maintenance/dashboard",
    manager: "/manager/dashboard",
};

function RoleGuard({ allowedRole }: Props) {
    const [role, setRole] = useState<Role | null>(null);
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);

    useEffect(() => {
        let active = true;

        const checkUser = async () => {
            try {
                const response = await api.get<{ role: Role }>("/me");

                if (active) {
                    setRole(response.data.role);
                    setAuthenticated(true);
                }
            } catch (error) {
                if (active) {
                    setAuthenticated(false);
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        checkUser();

        return () => {
            active = false;
        };
    }, []);

    if (loading) {
        return <p>Checking session...</p>;
    }

    if (!authenticated || !role) {
        return <Navigate to="/login" replace />;
    }

    if (role !== allowedRole) {
        return <Navigate to={dashboardPaths[role]} replace />;
    }

    return <Outlet />;
}

export default RoleGuard;