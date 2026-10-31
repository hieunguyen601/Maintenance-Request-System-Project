import type { ReactNode } from "react";
import BrandLogo from "./BrandLogo";
import apartmentPhoto from "../images/apartments.avif";
import "../pages/Login.css";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="login-page">
      <aside className="auth-property">
        <img src={apartmentPhoto} alt="Apartment building" />
        <div className="auth-property-caption">
          <div>
            <strong>Luxury Apartment</strong>
            <span>Resident and staff portal</span>
          </div>
        </div>
      </aside>
      <main className="auth-main">
        <div className="login-card">
          <div className="auth-brand">
            <BrandLogo />
          </div>
          {children}
          <p className="auth-help">
            Need help with your account? Contact your property manager.
          </p>
        </div>
      </main>
    </div>
  );
}
