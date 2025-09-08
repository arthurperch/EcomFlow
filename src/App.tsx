import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import BulkLister from "./pages/BulkLister";
import ProductHunter from "./pages/ProductHunter";
import DuplicateChecker from "./pages/DuplicateChecker";
import ImageTemplate from "./pages/ImageTemplate";
import Tracker from "./pages/Tracker";
import CompetitorResearch from "./pages/CompetitorResearch";
import BoostMyListings from "./pages/BoostMyListings";
import "./PopupRoot.css";

const PopupMenu: React.FC = () => {
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
    const openTab = (hash: string) => {
        if (chrome && chrome.tabs && chrome.runtime && chrome.runtime.getURL) {
            chrome.tabs.create({ url: chrome.runtime.getURL(`index.html#${hash}`) });
        }
    };
    return (
        <nav style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
            <button style={menuBtnStyle} onClick={() => openTab("/bulk-lister")}>Open Bulk Lister</button>
            <button style={menuBtnStyle} onClick={() => openTab("/product-hunter")}>Open Product Hunter</button>
            <a href="#/duplicate-checker" style={menuBtnStyle}>Open Duplicate Checker</a>
            <a href="#/image-template" style={menuBtnStyle}>Open Image Template</a>
            <a href="#/tracker" style={menuBtnStyle}>Open Tracker</a>
            <a href="#/competitor-research" style={menuBtnStyle}>Open Competitor Research</a>
            <a href="#/boost-my-listings" style={menuBtnStyle}>Boost My Listings</a>
        </nav>
    );
};

const App: React.FC = () => {
    const location = useLocation();
    if (location.pathname === "/bulk-lister") return <BulkLister />;
    if (location.pathname === "/product-hunter") return <ProductHunter />;
    if (location.pathname === "/" || location.hash === "" || location.hash === "#/") {
        return (
            <div className="popup-root" style={{ position: "relative", width: "100%", minHeight: "420px" }}>
                <header style={{ fontSize: 24, fontWeight: 800, marginBottom: 24, letterSpacing: "-1px", color: "#3730a3", textAlign: "left" }}>
                    EcomFlow
                </header>
                <PopupMenu />
            </div>
        );
    }
    return (
        <Routes>
            <Route path="/duplicate-checker" element={<DuplicateChecker />} />
            <Route path="/image-template" element={<ImageTemplate />} />
            <Route path="/tracker" element={<Tracker />} />
            <Route path="/competitor-research" element={<CompetitorResearch />} />
            <Route path="/boost-my-listings" element={<BoostMyListings />} />
        </Routes>
    );
};

export default App;