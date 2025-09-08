import React from "react";
import { HashRouter as Router, Routes, Route, useLocation, Link } from "react-router-dom";
import BulkLister from "./pages/BulkLister";
import DuplicateChecker from "./pages/DuplicateChecker";
import ProductHunter from "./pages/ProductHunter";
import ImageTemplate from "./pages/ImageTemplate";
import Tracker from "./pages/Tracker";
import CompetitorResearch from "./pages/CompetitorResearch";
import BoostMyListings from "./pages/BoostMyListings";
import "./PopupRoot.css";

// Helper: detect if running in a Chrome extension popup
function isPopupWindow() {
  return window.innerWidth <= 420 && window.innerHeight <= 700 && !window.opener;
}

// Simple menu for popup
const Menu = () => {
  const menuBtnStyle: React.CSSProperties = {
    borderRadius: 10,
    padding: "12px 18px",
    background: "#f3f4f6",
    color: "#3730a3",
    border: "none",
    textAlign: "left",
    fontWeight: 600,
    fontSize: 16,
    cursor: "pointer",
    marginBottom: 2,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    transition: "background 0.2s, color 0.2s",
    textDecoration: "none",
    display: "block",
  };
  return (
    <nav style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
      <Link to="/duplicate-checker" style={menuBtnStyle}>Open Duplicate Checker</Link>
      <Link to="/product-hunter" style={menuBtnStyle}>Open Product Hunter</Link>
      <a
        href="#/bulk-lister"
        target="_blank"
        rel="noopener noreferrer"
        style={menuBtnStyle}
      >
        Open Bulk Lister in Tab
      </a>
      <Link to="/image-template" style={menuBtnStyle}>Open Image Template</Link>
      <Link to="/tracker" style={menuBtnStyle}>Open Tracker</Link>
      <Link to="/competitor-research" style={menuBtnStyle}>Open Competitor Research</Link>
      <Link to="/boost-my-listings" style={menuBtnStyle}>Boost My Listings</Link>
    </nav>
  );
};

// Conditional rendering based on location
function AppRoutes() {
  const location = useLocation();
  // If opened in a tab at /bulk-lister, show only BulkLister
  if (
    location.pathname === "/bulk-lister" ||
    location.hash === "#/bulk-lister"
  ) {
    return <BulkLister />;
  }
  // Otherwise, show the popup menu and routes
  return (
    <div className="popup-root" style={{ position: "relative", width: "100%", minHeight: "420px" }}>
      <header style={{ fontSize: 24, fontWeight: 800, marginBottom: 24, letterSpacing: "-1px", color: "#3730a3", textAlign: "left" }}>
        EcomFlow
      </header>
      <Menu />
      <Routes>
        <Route path="/duplicate-checker" element={<DuplicateChecker />} />
        <Route path="/product-hunter" element={<ProductHunter />} />
        <Route path="/image-template" element={<ImageTemplate />} />
        <Route path="/tracker" element={<Tracker />} />
        <Route path="/competitor-research" element={<CompetitorResearch />} />
        <Route path="/boost-my-listings" element={<BoostMyListings />} />
      </Routes>
    </div>
  );
}

const App: React.FC = () => (
  <Router>
    <Routes>
      <Route path="/bulk-lister" element={<BulkLister />} />
      <Route path="/*" element={<AppRoutes />} />
    </Routes>
  </Router>
);

export default App;
