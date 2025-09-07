import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { auth, signOut } from "./firebase";
import "./Home.css";
import "./saved.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import logoImg from "./Assets/logo.png";


function RecipeModal({ meal, onClose }) {
  const ingredientImage = (name) =>
    `https://www.themealdb.com/images/ingredients/${encodeURIComponent(name)}-Small.png`;

  const parseIngredients = (m) => {
    const out = [];
    for (let i = 1; i <= 20; i++) {
      const ing = m[`strIngredient${i}`];
      const meas = m[`strMeasure${i}`];
      if (ing && ing.trim())
        out.push({ name: ing.trim(), meas: (meas || "").trim(), img: ingredientImage(ing.trim()) });
    }
    return out;
  };

  useEffect(() => {
    // disable scroll when modal opens
    document.body.style.overflow = "hidden";

    return () => {
      // re-enable scroll when modal closes
      document.body.style.overflow = "auto";
    };
  }, []);

  const parseSteps = (text = "") =>
    text.split(/\r?\n|(?<=\.)\s+/).map((s) => s.trim()).filter(Boolean);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const ings = parseIngredients(meal);
  const steps = parseSteps(meal.strInstructions);

  return (
    <div className="modal" onClick={onClose}>
      <div
        className="modal-body"
        role="dialog"
        aria-modal="true"
        aria-label={`${meal.strMeal} details`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating close button */}
        <button
          className="modal-close modal-close--floating"
          onClick={onClose}
          aria-label="Close"
        >
          <i className="bi bi-x"></i>
        </button>

        <div className="modal-content">
          <h4 className="section-title">Ingredients</h4>
          <div className="ing-grid">
            {ings.map((x, i) => (
              <div key={i} className="ing-card">
                <img className="ing-thumb" src={x.img} alt={x.name} />
                <div>
                  <div className="ing-label">{x.name}</div>
                  <div className="ing-meas">{x.meas || "\u00A0"}</div>
                </div>
              </div>
            ))}
          </div>

          <h4 className="section-title">Instructions</h4>
          <ul className="instructions">{steps.map((s, i) => <li key={i}>{s}</li>)}</ul>

          {meal.strYoutube && (
            <a className="modal-yt" href={meal.strYoutube} target="_blank" rel="noreferrer">
              Youtube
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Saved({ savedRecipes = [], setSavedRecipes = () => { } }) {
  const location = useLocation();

  // filters (client-side)
  const [showCats, setShowCats] = useState(false);
  const [showCuisine, setShowCuisine] = useState(false);
  const [categories, setCategories] = useState([]);
  const [cuisines, setCuisines] = useState([]);
  const [activeCat, setActiveCat] = useState("All");
  const [activeCuisine, setActiveCuisine] = useState("All");
  const [activeTab, setActiveTab] = useState(null);
  const catRef = useRef(null);
  const cuisineRef = useRef(null);

  const [selected, setSelected] = useState(null);


  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef(null);
  const navigate = useNavigate();

  // close dropdown when clicking outside
  useEffect(() => {
    const onDocClick = (e) => {
      if (!(profileRef.current && profileRef.current.contains(e.target))) {
        setShowProfile(false);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 16;

  // build dropdown options from saved items
  useEffect(() => {
    const cset = new Set(), aset = new Set();
    savedRecipes.forEach((m) => {
      if (m.strCategory) cset.add(m.strCategory);
      if (m.strArea) aset.add(m.strArea);
    });
    setCategories(Array.from(cset).sort());
    setCuisines(Array.from(aset).sort());
  }, [savedRecipes]);

  // click-outside to close dropdowns
  useEffect(() => {
    const onDocClick = (e) => {
      if (!(catRef.current && catRef.current.contains(e.target))) setShowCats(false);
      if (!(cuisineRef.current && cuisineRef.current.contains(e.target))) setShowCuisine(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  // filtered list
  const visibleRecipes = useMemo(
    () =>
      savedRecipes.filter(
        (m) =>
          (activeCat === "All" || m.strCategory === activeCat) &&
          (activeCuisine === "All" || m.strArea === activeCuisine)
      ),
    [savedRecipes, activeCat, activeCuisine]
  );


  const totalPages = Math.max(1, Math.ceil(visibleRecipes.length / pageSize));
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const paginatedRecipes = visibleRecipes.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const unsave = (id) => setSavedRecipes(savedRecipes.filter((r) => r.idMeal !== id));

  return (
    <div className="app">
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="logo"><img src={logoImg} alt="Smart Chef logo" /></div>

        <ul className="nav-links">
          <li className={location.pathname === "/" ? "active" : ""}>
            <Link to="/" state={{ fromSaved: true }}>Home</Link>
          </li>
          <li className={location.pathname === "/about" ? "active" : ""}><Link to="/about">About</Link></li>

          <li
            className={`nav-cat ${activeTab === "category" && activeCat !== "All" ? "active" : ""}`}
            ref={catRef}
          >
            <button
              className="cat-trigger"
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowCuisine(false); setShowCats((s) => !s); }}
            >
              Categories
            </button>
            {showCats && (
              <ul className="cat-dropdown" role="menu">
                {["All", ...categories].map((cat) => (
                  <li key={cat}>
                    <button
                      type="button"
                      className={`cat-item ${activeCat === cat ? "active" : ""}`}
                      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setActiveCat(cat); setActiveTab("category"); setShowCats(false); setCurrentPage(1); }}
                    >
                      {cat}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>

          <li
            className={`nav-cuisine ${activeTab === "cuisine" && activeCuisine !== "All" ? "active" : ""}`}
            ref={cuisineRef}
          >
            <button
              className="cuisine-trigger"
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowCats(false); setShowCuisine((s) => !s); }}
            >
              Cuisine
            </button>
            {showCuisine && (
              <ul className="cuisine-dropdown" role="menu">
                {["All", ...cuisines].map((area) => (
                  <li key={area}>
                    <button
                      type="button"
                      className={`cuisine-item ${activeCuisine === area ? "active" : ""}`}
                      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setActiveCuisine(area); setActiveTab("cuisine"); setShowCuisine(false); setCurrentPage(1); }}
                    >
                      {area}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        </ul>

        {/* Profile menu */}
        <div className="profile" ref={profileRef}>
          <button
            type="button"
            className="profile-btn"
            aria-label="Profile menu"
            onClick={(e) => {
              e.stopPropagation();
              setShowProfile((s) => !s);
            }}
            title="Profile"
          >
            {auth.currentUser && auth.currentUser.photoURL ? (
              <img
                src={auth.currentUser.photoURL}
                alt="Profile"
                className="profile-img"
              />
            ) : (
              <i className="bi bi-person-circle"></i>
            )}
          </button>


          {showProfile && (
            <div className="profile-menu" role="menu">
              <button
                className="profile-item"
                onClick={() => {
                  setShowProfile(false);
                  navigate("/saved");
                }}
              >
                <i className="bi bi-heart"></i>
                <span>Saved Recipes</span>
              </button>

              <button
                className="profile-item"
                onClick={async () => {
                  setShowProfile(false);
                  try {
                    await signOut(auth);
                  } finally {
                    navigate("/login", { replace: true });
                  }
                }}
              >
                <i className="bi bi-box-arrow-right"></i>
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>

      </nav>

      {/* CONTENT */}
      <div className="wrap saved-wrap">
        {visibleRecipes.length === 0 ? (
          <div className="saved-empty">
            <div className="empty-panel" role="status" aria-live="polite">
              <div className="bi bi-file-earmark-x empty-icon" aria-hidden="true">

              </div>
              <h3 className="empty-title">This section is currently empty.</h3>
              <p className="empty-subtitle">You haven't saved any recipes yet.</p>
            </div>
          </div>
        ) : (
          <>
            <main className="saved-grid">
              {paginatedRecipes.map((m) => (
                <article key={m.idMeal} className="recipe-card">
                  <div className="card-media">
                    <img src={m.strMealThumb} alt={m.strMeal} />
                    <button
                      className="card-overlay"
                      onClick={() => setSelected(m)}
                      aria-label={`View details for ${m.strMeal}`}
                    >
                      View Details
                    </button>
                  </div>

                  <button
                    className="heart-btn active"
                    onClick={() => unsave(m.idMeal)}
                    aria-label="Unsave recipe"
                    title="Unsave recipe"
                  >
                    <i className="bi bi-heart-fill" />
                  </button>

                  <div className="card-body">
                    <span className="category">{m.strCategory || "—"} · {m.strArea || "—"}</span>
                    <h3>{m.strMeal}</h3>
                    {m.strInstructions && <p>{m.strInstructions.slice(0, 140)}…</p>}
                  </div>
                </article>
              ))}
            </main>

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="wrap">
                <div className="pagination">
                  <span
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className={currentPage === 1 ? "disabled" : ""}
                  >
                    &lt;
                  </span>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <span
                      key={i}
                      className={currentPage === i + 1 ? "active" : ""}
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </span>
                  ))}
                  <span
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className={currentPage === totalPages ? "disabled" : ""}
                  >
                    &gt;
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selected && <RecipeModal meal={selected} onClose={() => setSelected(null)} />}

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer1">
          <p className="footer2">
            Your trusted companion for recipes that inspire and meals that matter. Because every dish tells a story. Cook, share, and enjoy with Recipedia
          </p>
          <div className="flogo">
            <img src={require("./Assets/logo.png")} alt="Smart Chef" className="footer-logo" />
            <img src={require("./Assets/api logo.png")} alt="TheMealDB" className="footer-logo" />
          </div>
        </div>
        <div className="footer-bottom">
          <small>Copyright © 2025 Recipedia All Rights Reserved.</small>
        </div>
      </footer>
    </div>
  );
}
