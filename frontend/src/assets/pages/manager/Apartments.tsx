import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import api from "../../../services/api";
import type { Apartment, User } from "../../../services/types";
import { errorMessage } from "../../../services/errors";
const empty = { unit_number: "", building: "", floor: "", tenant_id: "" };
export default function Apartments() {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [tenants, setTenants] = useState<User[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    try {
      const [units, users] = await Promise.all([
        api.get<Apartment[]>("/manager/apartments"),
        api.get<User[]>("/manager/users"),
      ]);
      setApartments(units.data);
      setTenants(users.data.filter((user) => user.role === "tenant"));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const data = { ...form, tenant_id: Number(form.tenant_id) };
      if (editing !== null)
        await api.patch(`/manager/apartments/${editing}`, data);
      else await api.post("/apartment", data);
      setSuccess(
        editing !== null
          ? "Apartment updated."
          : "Apartment added and assigned.",
      );
      setForm(empty);
      setEditing(null);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="workspace-page">
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">Property management</span>
          <h1>Apartments</h1>
          <p className="muted">
            Manage your units and connect each tenant with their home.
          </p>
        </div>
      </div>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="notice success" role="status">
          {success}
        </p>
      )}
      <div className="split-grid">
        <section className="workspace-card padded">
          <h2>{editing !== null ? "Edit apartment" : "Add apartment"}</h2>
          <p className="muted">Each tenant can have one assigned apartment.</p>
          <form className="workspace-form" onSubmit={save}>
            {(["building", "unit_number", "floor"] as const).map((key) => (
              <label key={key}>
                {key === "unit_number"
                  ? "Unit number"
                  : key === "building"
                    ? "Building"
                    : "Floor"}
                <input
                  required
                  maxLength={key === "building" ? 200 : 100}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </label>
            ))}
            <label>
              Tenant
              <select
                required
                value={form.tenant_id}
                onChange={(e) =>
                  setForm({ ...form, tenant_id: e.target.value })
                }
              >
                <option value="">Select a tenant</option>
                {tenants
                  .filter(
                    (tenant) =>
                      !apartments.some(
                        (a) => a.tenant_id === tenant.id && a.id !== editing,
                      ),
                  )
                  .map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.first_name} {tenant.last_name} · {tenant.email}
                    </option>
                  ))}
              </select>
            </label>
            {!tenants.length && !loading && (
              <p className="muted">
                Create a tenant account on the Accounts page first.
              </p>
            )}
            <div className="button-row">
              <button className="primary-button" disabled={saving || loading}>
                <Plus size={16} />
                {saving
                  ? "Saving…"
                  : editing !== null
                    ? "Save changes"
                    : "Add apartment"}
              </button>
              {editing !== null && (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setForm(empty);
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>
        <section className="workspace-card">
          <div className="card-heading">
            <h2>Property directory</h2>
            <span className="muted">{apartments.length} units</span>
          </div>
          {loading ? (
            <p className="empty-state" role="status">
              Loading apartments…
            </p>
          ) : !apartments.length ? (
            <div className="empty-state">
              No apartments yet. Add the first unit using the form.
            </div>
          ) : (
            <div className="workspace-table-wrap">
              <table className="workspace-table">
                <thead>
                  <tr>
                    <th>Location</th>
                    <th>Tenant</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {apartments.map((apartment) => (
                    <tr key={apartment.id}>
                      <td>
                        {apartment.building}
                        <span className="cell-note">
                          Unit {apartment.unit_number} · Floor {apartment.floor}
                        </span>
                      </td>
                      <td>
                        {apartment.first_name} {apartment.last_name}
                        <span className="cell-note">{apartment.email}</span>
                      </td>
                      <td>
                        <button
                          className="secondary-button small"
                          onClick={() => {
                            setEditing(apartment.id);
                            setForm({
                              building: apartment.building,
                              unit_number: apartment.unit_number,
                              floor: apartment.floor,
                              tenant_id: String(apartment.tenant_id),
                            });
                            setSuccess("");
                          }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
