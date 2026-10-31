import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Send } from "lucide-react";
import api from "../../../services/api";
import type { Apartment } from "../../../services/types";
import { errorMessage } from "../../../services/errors";
export default function NewRequest() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category_id: "",
    priority: "medium",
  });
  const [categories, setCategories] = useState<{ id: number; name: string }[]>(
    [],
  );
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([api.get("/category"), api.get<Apartment | null>("/apartment")])
      .then(([category, unit]) => {
        setCategories(category.data);
        setApartment(unit.data);
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/request", {
        ...form,
        category_id: Number(form.category_id),
      });
      navigate("/tenant/requests");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="workspace-page narrow">
      <Link className="text-link" to="/tenant/requests">
        <ArrowLeft size={16} /> Back to requests
      </Link>
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">Maintenance Services</span>
          <h1>New maintenance request</h1>
          <p className="muted">
            Describe the issue and where it is in your apartment.
          </p>
        </div>
      </div>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Loading apartment and categories…</p>
      ) : !apartment ? (
        <div className="notice info">
          Your apartment has not been assigned. Contact your property manager
          before submitting a request.
        </div>
      ) : (
        <section className="workspace-card padded">
          <p className="notice info">
            {apartment.building} · Unit {apartment.unit_number} · Floor{" "}
            {apartment.floor}
          </p>
          <form className="workspace-form" onSubmit={submit}>
            <label>
              Request title
              <input
                required
                maxLength={500}
                placeholder="e.g. Kitchen sink is leaking"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label>
              Category
              <select
                required
                value={form.category_id}
                onChange={(e) =>
                  setForm({ ...form, category_id: e.target.value })
                }
              >
                <option value="">Choose a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Description
              <textarea
                required
                maxLength={5000}
                rows={6}
                placeholder="Where is the issue? When did it start? Include any details that will help the team prepare."
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </label>
            <fieldset className="priority-options">
              <legend>Priority</legend>
              {["low", "medium", "high"].map((priority) => (
                <label key={priority}>
                  <input
                    type="radio"
                    name="priority"
                    value={priority}
                    checked={form.priority === priority}
                    onChange={(e) =>
                      setForm({ ...form, priority: e.target.value })
                    }
                  />
                  <span>{priority}</span>
                </label>
              ))}
            </fieldset>
            <p className="muted">
              For immediate danger or a building emergency, contact emergency
              services or your property's emergency maintenance line.
            </p>
            <div className="button-row">
              <button className="primary-button" disabled={saving}>
                <Send size={16} />
                {saving ? "Submitting…" : "Submit request"}
              </button>
              <Link className="secondary-button" to="/tenant/requests">
                Cancel
              </Link>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
