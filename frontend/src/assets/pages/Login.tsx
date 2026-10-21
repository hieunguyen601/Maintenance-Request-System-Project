import googleIcon from "../images/google.png";
import { Link, useNavigate } from "react-router";
import api from "../../services/api";
import { useState, type FormEvent, type ChangeEvent } from "react";
import { isAxiosError } from "axios";
import "./Login.css";

function Login() {
    const [loginData, setLoginData] = useState({
        email: "",
        password: "",
    });

    const [error, setError] = useState("");

    const navigate = useNavigate();

    const handleLogin = (event: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setLoginData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");

        try {
            const response = await api.post("/login", loginData);

            console.log("Signed In Successfully!", response.data);
            localStorage.setItem("token", response.data.token);
            navigate("/dashboard");
        } catch (err: unknown) {
            if (isAxiosError(err) && err.response?.status === 401) {
                setError("Invalid email or password. Please try again!");
            } else {
                setError("Something went wrong. Please try again!");
            }
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <h1 className="login-title">Maintenance Services</h1>
                <h2 className="login-subtitle">Welcome Back</h2>
                {error && (
                    <p className="login-error" role="alert">
                        {error}
                    </p>
                )}
                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="input-group email-input">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            name="email"
                            id="email"
                            placeholder="name@example.com"
                            value={loginData.email}
                            onChange={handleLogin}
                            required
                        />
                    </div>

                    <div className="input-group password-input">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            name="password"
                            id="password"
                            placeholder="Enter your password"
                            value={loginData.password}
                            onChange={handleLogin}
                            required
                        />
                    </div>

                    <button type="button" className="forgot-password">
                        Forgot Password?
                    </button>

                    <button type="submit" className="signIn-btn">
                        Sign in
                    </button>

                    <div className="divider">
                        <span>or continue with</span>
                    </div>

                    <button type="button" className="google-login">
                        <img src={googleIcon} alt="Google" />
                        <span className="google-btn-text">Google</span>
                    </button>
                </form>

                <p className="signup-prompt">
                    Don't have an account yet?{" "}
                    <Link to="/signup">Register for free</Link>
                </p>
            </div>
        </div>
    );
}

export default Login;
