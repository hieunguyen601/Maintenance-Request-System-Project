import { Link, useLocation, useNavigate } from "react-router";
import { useState, type FormEvent } from "react";
import { GoogleLogin } from "@react-oauth/google";
import api from "../../services/api";
import type { Role } from "../../services/types";
import { errorMessage } from "../../services/errors";
import AuthLayout from "../components/AuthLayout";
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const signin = async (url: string, body: object) => {
    setPending(true);
    setError("");
    try {
      const { data } = await api.post<{ token: string; user: { role: Role } }>(
        url,
        body,
      );
      if (!["tenant", "maintenance", "manager"].includes(data.user.role))
        throw new Error("Invalid role");
      localStorage.setItem("token", data.token);
      navigate(`/${data.user.role}/dashboard`, { replace: true });
    } catch (err) {
      setError(
        errorMessage(
          err,
          "Could not sign in. Check your connection and try again.",
        ),
      );
    } finally {
      setPending(false);
    }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void signin("/login", form);
  };
  return (
    <AuthLayout>
      <h1 className="login-title">Sign in</h1>
      <p className="login-subtitle">Enter your account details to continue.</p>
      {location.state?.message && (
        <p className="login-notice" role="status">
          {location.state.message}
        </p>
      )}
      {error && (
        <p className="login-error" role="alert">
          {error}
        </p>
      )}
      <form className="login-form" onSubmit={submit}>
        <div className="input-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            placeholder="name@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="input-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <button className="signIn-btn" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
        <>
          <div className="divider">
            <span>or continue with</span>
          </div>
          <div className="auth-google">
            {!pending && (
              <GoogleLogin
                onSuccess={(response) => {
                  if (response.credential)
                    void signin("/auth/google", {
                      credential: response.credential,
                    });
                  else setError("No Google credential received.");
                }}
                onError={() =>
                  setError("Google login failed. Please try again.")
                }
              />
            )}
          </div>
        </>
      )}
      <p className="signup-prompt">
        New here? <Link to="/signup">Create an account</Link>
      </p>
    </AuthLayout>
  );
}
