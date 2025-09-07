
import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { auth, signOut } from "./firebase";
import "./Home.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import logoImg from "./Assets/logo.png";

const API = "https://www.themealdb.com/api/json/v1/1";
const fetchJson = (url) => fetch(url).then((r) => r.json());


function RecipeModal({ meal, onClose }) {
  const ingredientImage = (name) =>
    `https://www.themealdb.com/images/ingredients/${encodeURIComponent(name)}-Small.png`;

  const parseIngredients = (m) => {
    const out = [];
    for (let i = 1; i <= 20; i++) {
      const ing = m[`strIngredient${i}`];
      const meas = m[`strMeasure${i}`];
      if (ing && ing.trim()) {
        const name = ing.trim();
        out.push({ name, meas: (meas || "").trim(), img: ingredientImage(name) });
      }
    }
    return out;
  };

  const parseSteps = (text = "") =>
    text
      .split(/\r?\n|(?<=\.)\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const ings = parseIngredients(meal);
  const steps = parseSteps(meal.strInstructions);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    return () => {

      document.body.style.overflow = "auto";
    };
  }, []);

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


        {/* Content starts immediately with Ingredients */}
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
          <ul className="instructions">
            {steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>

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

export default function Home({ savedRecipes = [], setSavedRecipes = () => { } }) {
  const location = useLocation();

  // UI state
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const [activeTab, setActiveTab] = useState(null);

  // dropdowns
  const [showCats, setShowCats] = useState(false);
  const [categories, setCategories] = useState([]);
  const [activeCat, setActiveCat] = useState("All");
  const catRef = useRef(null);

  // profile dropdown
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef(null);
  const navigate = useNavigate();

  const [showCuisine, setShowCuisine] = useState(false);
  const [cuisines, setCuisines] = useState([]);
  const [activeCuisine, setActiveCuisine] = useState("All");
  const cuisineRef = useRef(null);

  // data + pagination
  const [allMealIds, setAllMealIds] = useState([]);
  const [allIdsCache, setAllIdsCache] = useState([]); // cache full catalog (all ~304)
  const [recipes, setRecipes] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 16;
  const totalPages = Math.ceil(allMealIds.length / pageSize);


  const MICRO_DELAY = 150;

  // ======== FULL CATALOG HELPERS========
  const LETTERS = "abcdefghijklmnopqrstuvwxyz0123456789".split("");

  async function fetchAllMealIds() {
    const ids = new Set();
    for (const ch of LETTERS) {
      const res = await fetchJson(`${API}/search.php?f=${ch}`);
      (res.meals || []).forEach((m) => ids.add(m.idMeal));
    }
    return Array.from(ids);
  }

  const fetchJson = async (url) => {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      console.warn("fetch failed:", url, e.message);
      return { meals: [] };
    }
  };


  useEffect(() => {
    const onDocClick = (e) => {
      if (!(catRef.current && catRef.current.contains(e.target))) setShowCats(false);
      if (!(cuisineRef.current && cuisineRef.current.contains(e.target))) setShowCuisine(false);
      if (!(profileRef.current && profileRef.current.contains(e.target))) setShowProfile(false); // ⬅️
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  // ======== PAGE LOADING ========
  async function fetchDetailsByIds(ids) {
    if (!ids.length) return [];
    const results = await Promise.all(ids.map((id) => fetchJson(`${API}/lookup.php?i=${id}`)));
    return results
      .map((r) => (r.meals && r.meals[0] ? r.meals[0] : null))
      .filter(Boolean);
  }

  async function loadPage(page, ids = allMealIds) {
    const start = (page - 1) * pageSize;
    const end = page * pageSize;
    const pageIds = ids.slice(start, end);
    const full = await fetchDetailsByIds(pageIds);
    setRecipes(full);
  }

  // ======== INITIAL LOAD (ALL RECIPES) ========
  useEffect(() => {

    fetchJson(`${API}/list.php?c=list`).then((d) =>
      setCategories((d.meals || []).map((m) => m.strCategory))
    );
    fetchJson(`${API}/list.php?a=list`).then((d) => {
      const arr = (d.meals || []).map((m) => m.strArea).filter(Boolean);
      setCuisines(Array.from(new Set(arr)));
    });

    (async () => {
      setLoading(true);
      const ids = await fetchAllMealIds();
      setAllIdsCache(ids);
      setAllMealIds(ids);
      setCurrentPage(1);
      await loadPage(1, ids);
      setLoading(false);
    })();
  }, []);

  // ======== CLICK-OUTSIDE TO CLOSE MENUS ========
  useEffect(() => {
    const onDocClick = (e) => {
      if (!(catRef.current && catRef.current.contains(e.target))) setShowCats(false);
      if (!(cuisineRef.current && cuisineRef.current.contains(e.target))) setShowCuisine(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  // ======== RETURNING FROM SAVED -> RESET TO ALL ========
  const triggeredFromSaved = useRef(false);
  useEffect(() => {
    if (!triggeredFromSaved.current && location.state?.fromSaved) {
      triggeredFromSaved.current = true;
      handleGoHome();
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location.state]);

  // ======== FILTERING ========
  async function getIdsForFilters(cat, area) {
    const catAll = cat === "All";
    const areaAll = area === "All";

    if (catAll && areaAll) {

      if (allIdsCache.length) return allIdsCache;
      const ids = await fetchAllMealIds();
      setAllIdsCache(ids);
      return ids;
    }

    const [catIds, areaIds] = await Promise.all([
      catAll
        ? null
        : fetchJson(`${API}/filter.php?c=${encodeURIComponent(cat)}`).then((d) =>
          (d.meals || []).map((m) => m.idMeal)
        ),
      areaAll
        ? null
        : fetchJson(`${API}/filter.php?a=${encodeURIComponent(area)}`).then((d) =>
          (d.meals || []).map((m) => m.idMeal)
        ),
    ]);

    if (catIds && areaIds) {
      const set = new Set(catIds);
      return areaIds.filter((x) => set.has(x));
    }
    return (catIds || areaIds) ?? [];
  }



  async function handleSelectCategory(cat) {
    setActiveCat(cat);
    setActiveTab("category");
    setShowCats(false);
    setLoading(true);

    const ids = await getIdsForFilters(cat, activeCuisine);
    setAllMealIds(ids);
    setCurrentPage(1);

    setTimeout(async () => {
      await loadPage(1, ids);
      setLoading(false);
    }, MICRO_DELAY);
  }

  async function handleSelectCuisine(area) {
    setActiveCuisine(area);
    setActiveTab("cuisine");
    setShowCuisine(false);
    setLoading(true);

    const ids = await getIdsForFilters(activeCat, area);
    setAllMealIds(ids);
    setCurrentPage(1);

    setTimeout(async () => {
      await loadPage(1, ids);
      setLoading(false);
    }, MICRO_DELAY);
  }

  // ======== SEARCH ========
  async function handleSearchSubmit(e) {
    e.preventDefault();
    setLoading(true);

    const data = await fetchJson(`${API}/search.php?s=${encodeURIComponent(query)}`);
    const ids = (data.meals || []).map((m) => m.idMeal);
    setActiveCat("All");
    setActiveCuisine("All");
    setActiveTab(null);
    setAllMealIds(ids);
    setCurrentPage(1);

    setTimeout(async () => {
      await loadPage(1, ids);
      setLoading(false);
    }, MICRO_DELAY);
  }

  // ======== HOME (RESET TO ALL) ========
  async function handleGoHome() {
    setActiveCat("All");
    setActiveCuisine("All");
    setActiveTab(null);
    setLoading(true);

    const ids = allIdsCache.length ? allIdsCache : await fetchAllMealIds();
    if (!allIdsCache.length) setAllIdsCache(ids);

    setAllMealIds(ids);
    setCurrentPage(1);

    setTimeout(async () => {
      await loadPage(1, ids);
      setLoading(false);
    }, MICRO_DELAY);
  }

  // ======== PAGINATION EFFECTS ========
  useEffect(() => {
    if (!allMealIds.length) {
      setRecipes([]);
      return;
    }
    setLoading(true);
    (async () => {
      await loadPage(currentPage);
      setLoading(false);
      document.querySelector(".grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
    })();

  }, [currentPage]);

  useEffect(() => {
    const tp = Math.max(1, Math.ceil(allMealIds.length / pageSize));
    if (currentPage > tp) setCurrentPage(tp);

  }, [allMealIds]);

  return (
    <div className="app">
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="logo">
          <img src={logoImg} alt="Smart Chef logo" />
        </div>

        <ul className="nav-links">
          <li
            className={
              location.pathname === "/" && activeCat === "All" && activeCuisine === "All"
                ? "active"
                : ""
            }
          >
            <Link to="/" onClick={handleGoHome}>Home</Link>
          </li>

          <li className={location.pathname === "/about" ? "active" : ""}>
            <Link to="/about">About</Link>
          </li>

          <li
            className={`nav-cat ${activeTab === "category" && activeCat !== "All" ? "active" : ""}`}
            ref={catRef}
          >
            <button
              className="cat-trigger"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowCuisine(false);
                setShowCats((s) => !s);
              }}
            >
              Categories
            </button>
            {showCats && (
              <ul className="cat-dropdown" role="menu" aria-label="Categories">
                {["All", ...categories].map((cat) => (
                  <li key={cat}>
                    <button
                      type="button"
                      className={`cat-item ${activeCat === cat ? "active" : ""}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelectCategory(cat);
                      }}
                    >
                      {cat}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>

          <li
            className={`nav-cuisine ${activeTab === "cuisine" && activeCuisine !== "All" ? "active" : ""
              }`}
            ref={cuisineRef}
          >
            <button
              className="cuisine-trigger"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowCats(false);
                setShowCuisine((s) => !s);
              }}
            >
              Cuisine
            </button>
            {showCuisine && (
              <ul className="cuisine-dropdown" role="menu" aria-label="Cuisine">
                {["All", ...cuisines].map((area) => (
                  <li key={area}>
                    <button
                      type="button"
                      className={`cuisine-item ${activeCuisine === area ? "active" : ""}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelectCuisine(area);
                      }}
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

      {/* Home */}
      <header className="hero">
        <div className="hero-overlay">
          <div className="hero-content">
            <h1>SMART RECIPES. TASTIER MEALS.</h1>
            <p>
              Explore a world of flavors, discover handcrafted recipes, and let the aroma of our
              passion for cooking fill your kitchen
            </p>

            <form className="search-bar" onSubmit={handleSearchSubmit}>
              <i className="bi bi-search search-icon" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by dish, ingredient, …"
              />
            </form>
          </div>
        </div>
      </header>

      {/* DESCRIPTION */}
      <section className="description wrap">
        <p>
          Discover authentic flavors and cuisines from around the world, with hundreds of recipes ready to inspire your next meal.
          Bring people together with good food and explore our collection of smart recipes that make every day special.
        </p>
      </section>

      {/* BREADCRUMB */}
      <div className="wrap breadcrumb-wrap">
        <span className="breadcrumb">
          {activeCat !== "All" ? `Category > ${activeCat}` : "All Recipes"}
          {activeCuisine !== "All" ? ` · Cuisine > ${activeCuisine}` : ""}
        </span>
        <div className="breadcrumb-line" />
      </div>

      {/* GRID */}
      <main className="wrap grid">
        {loading && <div className="loading">Loading</div>}

        {!loading &&
          recipes.map((m) => (
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

              {/* ♥ toggle */}
              <button
                className={`heart-btn ${savedRecipes.some((r) => r.idMeal === m.idMeal) ? "active" : ""
                  }`}
                onClick={() => {
                  if (savedRecipes.some((r) => r.idMeal === m.idMeal)) {
                    setSavedRecipes(savedRecipes.filter((r) => r.idMeal !== m.idMeal));
                  } else {
                    setSavedRecipes([...savedRecipes, m]);
                  }
                }}
                aria-label="Save recipe"
                title="Save recipe"
              >
                <i className="bi bi-heart-fill"></i>
              </button>

              <div className="card-body">
                <span className="category">
                  {m.strCategory || "—"} · {m.strArea || "—"}
                </span>
                <h3>{m.strMeal}</h3>
                {m.strInstructions && <p>{m.strInstructions.slice(0, 140)}…</p>}
              </div>
            </article>
          ))}
      </main>

      {/* PAGINATION */}
      {!loading && totalPages > 1 && (
        <div className="wrap">
          <div className="pagination">
            {/** window calc */}
            {(() => {
              const MAX_BTNS = 22;
              const half = Math.floor(MAX_BTNS / 2);


              let start = Math.max(1, currentPage - half);
              let end = start + MAX_BTNS - 1;
              if (end > totalPages) {
                end = totalPages;
                start = Math.max(1, end - MAX_BTNS + 1);
              }

              const goPrev = () => setCurrentPage((p) => Math.max(1, p - 1));
              const goNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

              return (
                <>
                  <span onClick={goPrev} className={currentPage === 1 ? "disabled" : ""}>
                    &lt;
                  </span>

                  {Array.from({ length: end - start + 1 }, (_, i) => start + i).map((num) => (
                    <span
                      key={num}
                      className={currentPage === num ? "active" : ""}
                      onClick={() => setCurrentPage(num)}
                    >
                      {num}
                    </span>
                  ))}

                  <span
                    onClick={goNext}
                    className={currentPage === totalPages ? "disabled" : ""}
                  >
                    &gt;
                  </span>
                </>
              );
            })()}
          </div>
        </div>
      )}



      {/* MODAL */}
      {selected && <RecipeModal meal={selected} onClose={() => setSelected(null)} />}

      {/* FOOTER */}
      <footer className="site-footer">
        <div className="footer-top">
          <p className="footer-copy">
            Your trusted companion for recipes that inspire and meals that matter. Because every dish tells a story. Cook, share, and enjoy with Recipedia.
          </p>
          <div className="footer-logos">
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
