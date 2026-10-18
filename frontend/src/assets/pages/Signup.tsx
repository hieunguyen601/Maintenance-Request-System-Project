import googleIcon from "../images/google.png";
import { Link } from "react-router";
import "./Login.css";
import api from "../../services/api";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router";

type UserInfo = {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    role: string;
    confirmPassword: string;
};

function Signup() {
    const navigate = useNavigate();
    const [user, setUser] = useState<UserInfo>({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        role: "",
        confirmPassword: "",
    });

    const [error, setError] = useState("");

    const handleSignUp = (
        event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => {
        const { name, value } = event.target;
        setUser((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmitSignUp = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");

        if (user.password !== user.confirmPassword) {
            setError("Passwords do not match!");
            return;
        }

        try {
            const response = await api.post("/user", {
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                password: user.password,
                role: user.role,
            });
            console.log("Signed up successfully!", response.data);
            navigate("/login");
        } catch (error) {
            console.error("Error signing up", error);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <h1 className="login-title">Maintenance Services</h1>
                <h2 className="login-subtitle">Sign Up</h2>

                {error && (
                    <p role="status" className="error-message">
                        {error}
                    </p>
                )}

                <form className="login-form" onSubmit={handleSubmitSignUp}>
                    <div className="name-row">
                        <div className="input-group">
                            <label htmlFor="first_name">First Name</label>
                            <input
                                type="text"
                                name="first_name"
                                id="first_name"
                                placeholder="Henry"
                                onChange={handleSignUp}
                                value={user.first_name}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label htmlFor="last_name">Last Name</label>
                            <input
                                type="text"
                                name="last_name"
                                id="last_name"
                                placeholder="Nguyen"
                                onChange={handleSignUp}
                                value={user.last_name}
                                required
                            />
                        </div>
                    </div>
                    <div className="input-group email-input">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            name="email"
                            id="email"
                            placeholder="name@example.com"
                            onChange={handleSignUp}
                            value={user.email}
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
                            onChange={handleSignUp}
                            value={user.password}
                            required
                        />
                    </div>

                    <div className="input-group confirm-password-input">
                        <label htmlFor="confirmPassword">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            name="confirmPassword"
                            id="confirmPassword"
                            placeholder="Confirm your password"
                            value={user.confirmPassword}
                            onChange={handleSignUp}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="role">Role</label>
                        <select
                            onChange={handleSignUp}
                            value={user.role}
                            name="role"
                            id="role"
                            required
                        >
                            <option value="" disabled>
                                Choose your role
                            </option>
                            <option value="tenant">Tenant</option>
                            <option value="maintenance">
                                Maintenance Staff
                            </option>
                            <option value="manager">
                                Property Manager
                            </option>
                        </select>
                    </div>

                    <button type="submit" className="signIn-btn">
                        Sign up
                    </button>

                    <div className="divider">
                        <span>or sign up with</span>
                    </div>

                    <button type="button" className="google-login">
                        <img src={googleIcon} alt="Google" />
                        <span className="google-btn-text">Google</span>
                    </button>
                </form>

                <p className="signup-prompt">
                    Already have an account?{" "}
                    <Link to="/login">Sign In here</Link>
                </p>
            </div>
        </div>
    );
}

export default Signup;
