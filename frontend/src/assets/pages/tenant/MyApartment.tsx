import { useEffect, useState } from "react";
import { Building2, MapPin } from "lucide-react";
import { Link } from "react-router";
import api from "../../../services/api";
import type { Apartment } from "../../../services/types";
import { errorMessage } from "../../../services/errors";
export default function MyApartment() {
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .get<Apartment | null>("/apartment")
      .then((response) => setApartment(response.data))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);
  return (
    <div className="workspace-page">
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">Resident workspace</span>
          <h1>My apartment</h1>
          <p className="muted">Your home and property details.</p>
        </div>
      </div>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <section className="workspace-card padded">
        {loading ? (
          <p role="status">Loading your apartment…</p>
        ) : apartment ? (
          <>
            <span className="metric-icon blue">
              <Building2 size={24} />
            </span>
            <h2>Unit {apartment.unit_number}</h2>
            <p className="muted">
              <MapPin size={16} /> {apartment.building} · Floor{" "}
              {apartment.floor}
            </p>
            <hr />
            <p>
              Need a repair? Send a maintenance request and track the team’s
              progress.
            </p>
            <Link className="primary-button" to="/tenant/requests/new">
              Request maintenance
            </Link>
          </>
        ) : (
          <div className="empty-state">
            <Building2 size={40} />
            <h2>Your apartment is not assigned yet</h2>
            <p>
              Contact your property manager to connect your account to an
              apartment. You can submit maintenance requests once it is
              assigned.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
