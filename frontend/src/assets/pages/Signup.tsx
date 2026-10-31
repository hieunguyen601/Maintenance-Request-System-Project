import { GoogleLogin } from "@react-oauth/google";
import { Link, useNavigate } from "react-router";
import { useState, type FormEvent } from "react";
import api from "../../services/api";
import type { Role } from "../../services/types";
import { errorMessage } from "../../services/errors";
import AuthLayout from "../components/AuthLayout";
export default function Signup() {
  const navigate = useNavigate();
  const [user, setUser] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (user.password !== user.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    try {
      await api.post("/user", {
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        password: user.password,
      });
      navigate("/login", {
        state: { message: "Your account is ready. Sign in to continue." },
      });
    } catch (err) {
      setError(
        errorMessage(err, "Could not create your account. Please try again."),
      );
    } finally {
      setPending(false);
    }
  };
  const googleSignup = async (credential: string) => {
    setPending(true);
    setError("");
    try {
      const { data } = await api.post<{ token: string; user: { role: Role } }>(
        "/auth/google",
        { credential },
      );
      if (!["tenant", "maintenance", "manager"].includes(data.user.role))
        throw new Error("Invalid role");
      localStorage.setItem("token", data.token);
      navigate(`/${data.user.role}/dashboard`, { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Google sign up failed. Please try again."));
    } finally {
      setPending(false);
    }
  };
  return (
    <AuthLayout>
      <h1 className="login-title">Create an account</h1>
      <p className="login-subtitle">
        Register to submit and track maintenance requests.
      </p>
      {error && (
        <p className="login-error" role="alert">
          {error}
        </p>
      )}
      <form className="login-form" onSubmit={submit}>
        <div className="name-row">
          {(["first_name", "last_name"] as const).map((key) => (
            <div className="input-group" key={key}>
              <label htmlFor={key}>
                {key === "first_name" ? "First name" : "Last name"}
              </label>
              <input
                id={key}
                required
                autoComplete={
                  key === "first_name" ? "given-name" : "family-name"
                }
                maxLength={200}
                value={user[key]}
                onChange={(e) => setUser({ ...user, [key]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <div className="input-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            maxLength={200}
            value={user.email}
            onChange={(e) => setUser({ ...user, email: e.target.value })}
          />
        </div>
        <div className="input-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            placeholder="At least 8 characters"
            value={user.password}
            onChange={(e) => setUser({ ...user, password: e.target.value })}
          />
        </div>
        <div className="input-group">
          <label htmlFor="confirmPassword">Confirm password</label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={user.confirmPassword}
            onChange={(e) =>
              setUser({ ...user, confirmPassword: e.target.value })
            }
          />
        </div>
        <button className="signIn-btn" disabled={pending}>
          {pending ? "Please wait…" : "Create account"}
        </button>
      </form>
      {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
        <>
          <div className="divider">
            <span>or sign up with</span>
          </div>
          <div className="auth-google">
            {pending ? (
              <p role="status">Creating your session…</p>
            ) : (
              <GoogleLogin
                text="signup_with"
                onSuccess={(response) => {
                  if (response.credential)
                    void googleSignup(response.credential);
                  else setError("No Google credential received.");
                }}
                onError={() =>
                  setError("Google sign up failed. Please try again.")
                }
              />
            )}
          </div>
        </>
      )}
      <p className="auth-description">
        Your property manager will assign your apartment after registration.
        Staff accounts are created by a manager.
      </p>
      <p className="signup-prompt">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
