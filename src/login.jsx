import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  auth,
  provider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from "./firebase";
import "./login.css";
import logo from "./Assets/transparent.png";
import bg from "./Assets/login.png";

export default function Login() {
  const navigate = useNavigate();

  // Handle redirect return
  useEffect(() => {
    getRedirectResult(auth).then(() => {
      if (auth.currentUser) navigate("/", { replace: true });
    });
  }, [navigate]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
      navigate("/", { replace: true });
    } catch {
      await signInWithRedirect(auth, provider);
    }
  };

  return (
    <div
      className="login-page"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <div className="login-overlay" />

      <div className="auth-card">
        <img src={logo} alt="Smart Chef" className="auth-logo" />

        <h1 className="auth-title">WELCOME TO RECIPEDIA</h1>

        <p className="auth-subtitle">
          Discover recipes you love, explore flavors from around the world,
          and make every meal special with Recipedia! Your trusted kitchen
          companion for everyday inspiration.
        </p>

        <button className="google-btn" onClick={handleGoogleLogin}>
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt=""
            aria-hidden="true"
          />
          <span>Continue with Google</span>
        </button>
      </div>
    </div>
  );
}
