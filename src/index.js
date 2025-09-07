
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";

import "./index.css";
import Home from "./Home";
import Saved from "./saved";
import Login from "./login";
import reportWebVitals from "./reportWebVitals";

function Root() {
  const [savedRecipes, setSavedRecipes] = React.useState([]);
  const [user, setUser] = React.useState(undefined);


  React.useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (u) => setUser(u ?? null));
    return unsub;
  }, []);


  React.useEffect(() => {
    if (!user) {
      setSavedRecipes([]);
      return;
    }
    const key = `savedRecipes:${user.uid}`;
    const raw = localStorage.getItem(key);
    try {
      setSavedRecipes(raw ? JSON.parse(raw) : []);
    } catch {
      setSavedRecipes([]);
    }
  }, [user]);


  React.useEffect(() => {
    if (!user) return;
    const key = `savedRecipes:${user.uid}`;
    localStorage.setItem(key, JSON.stringify(savedRecipes));
  }, [user, savedRecipes]);


  if (user === undefined) {
    return <div style={{ padding: 24, textAlign: "center" }}>Loading…</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            user ? (
              <Home savedRecipes={savedRecipes} setSavedRecipes={setSavedRecipes} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/saved"
          element={
            user ? (
              <Saved savedRecipes={savedRecipes} setSavedRecipes={setSavedRecipes} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <Login />}
        />
      </Routes>
    </BrowserRouter>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);

reportWebVitals();
