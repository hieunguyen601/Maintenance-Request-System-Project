import { useEffect, useState, type FormEvent } from "react";
import api from "../../../services/api";
import type { User } from "../../../services/types";
import { errorMessage } from "../../../services/errors";
export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [password, setPassword] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    api
      .get<User>("/me")
      .then((response) => setUser(response.data))
      .catch((err) => setError(errorMessage(err)));
  }, []);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      setUser(
        (
          await api.patch<User>("/me", {
            first_name: user.first_name,
            last_name: user.last_name,
          })
        ).data,
      );
      setSuccess("Profile updated.");
      window.dispatchEvent(new Event("profile-updated"));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (password.new_password !== password.confirm_password) {
      setError("New passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      await api.patch("/me/password", password);
      setSuccess("Password updated.");
      setPassword({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
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
          <span className="eyebrow">Account settings</span>
          <h1>My profile</h1>
          <p className="muted">
            Keep your details and account security up to date.
          </p>
        </div>
      </div>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="notice success">
          {success}
        </p>
      )}
      {!user ? (
        !error && <p role="status">Loading profile…</p>
      ) : (
        <div className="split-grid">
          <section className="workspace-card padded">
            <h2>Personal details</h2>
            <form className="workspace-form" onSubmit={save}>
              <label>
                First name
                <input
                  required
                  maxLength={200}
                  value={user.first_name}
                  onChange={(e) =>
                    setUser({ ...user, first_name: e.target.value })
                  }
                />
              </label>
              <label>
                Last name
                <input
                  required
                  maxLength={200}
                  value={user.last_name}
                  onChange={(e) =>
                    setUser({ ...user, last_name: e.target.value })
                  }
                />
              </label>
              <label>
                Email
                <input readOnly value={user.email} />
              </label>
              <p className="muted">Account role: {user.role}</p>
              <button className="primary-button" disabled={saving}>
                Save profile
              </button>
            </form>
          </section>
          <section className="workspace-card padded">
            <h2>Change password</h2>
            <p className="muted">
              Google accounts use Google to manage their password.
            </p>
            {user.has_password !== false && (
              <form className="workspace-form" onSubmit={changePassword}>
                <label>
                  Current password
                  <input
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password.current_password}
                    onChange={(e) =>
                      setPassword({
                        ...password,
                        current_password: e.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  New password
                  <input
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={72}
                    value={password.new_password}
                    onChange={(e) =>
                      setPassword({ ...password, new_password: e.target.value })
                    }
                  />
                </label>
                <label>
                  Confirm new password
                  <input
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password.confirm_password}
                    onChange={(e) =>
                      setPassword({
                        ...password,
                        confirm_password: e.target.value,
                      })
                    }
                  />
                </label>
                <button className="primary-button" disabled={saving}>
                  Update password
                </button>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
