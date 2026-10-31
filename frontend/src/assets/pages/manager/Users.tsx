import { useCallback, useEffect, useState, type FormEvent } from "react";
import api from "../../../services/api";
import type { User } from "../../../services/types";
import { errorMessage } from "../../../services/errors";
const empty = {
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  role: "maintenance",
};
export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const load = useCallback(async () => {
    try {
      setUsers((await api.get<User[]>("/manager/users")).data);
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
      await api.post("/manager/users", form);
      setSuccess(
        "Account created. Share the initial password securely; the user can change it in their profile.",
      );
      setForm(empty);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  const filtered = users.filter((user) =>
    `${user.first_name} ${user.last_name} ${user.email} ${user.role}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <div className="workspace-page">
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">Property management</span>
          <h1>Accounts & team</h1>
          <p className="muted">
            Create staff access and find residents in your property.
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
          <h2>Create an account</h2>
          <form className="workspace-form" onSubmit={save}>
            {(["first_name", "last_name", "email", "password"] as const).map(
              (key) => (
                <label key={key}>
                  {key === "first_name"
                    ? "First name"
                    : key === "last_name"
                      ? "Last name"
                      : key === "email"
                        ? "Email"
                        : "Initial password"}
                  <input
                    type={
                      key === "password"
                        ? "password"
                        : key === "email"
                          ? "email"
                          : "text"
                    }
                    autoComplete={key === "password" ? "new-password" : "off"}
                    required
                    minLength={key === "password" ? 8 : 1}
                    maxLength={key === "password" ? 72 : 200}
                    value={form[key]}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.value })
                    }
                  />
                </label>
              ),
            )}
            <label>
              Role
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="maintenance">Maintenance staff</option>
                <option value="tenant">Tenant</option>
                <option value="manager">Property manager</option>
              </select>
            </label>
            <button className="primary-button" disabled={saving}>
              {saving ? "Creating…" : "Create account"}
            </button>
          </form>
        </section>
        <section className="workspace-card">
          <div className="card-heading">
            <h2>Directory</h2>
            <span className="muted">{users.length} accounts</span>
          </div>
          <div className="workspace-toolbar">
            <input
              aria-label="Search accounts"
              placeholder="Search name, email, or role…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {loading ? (
            <p className="empty-state" role="status">
              Loading accounts…
            </p>
          ) : (
            <div className="workspace-table-wrap">
              <table className="workspace-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => (
                    <tr key={user.id}>
                      <td>
                        {user.first_name} {user.last_name}
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span className="work-badge">{user.role}</span>
                      </td>
                    </tr>
                  ))}
                  {!filtered.length && (
                    <tr>
                      <td colSpan={3}>No matching accounts.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
