import React, { useEffect, useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import DuplicateChecker from './pages/DuplicateChecker';
import ProductHunter from './pages/ProductHunter';
import BulkLister from './pages/BulkLister';
import ImageTemplate from './pages/ImageTemplate';
import Tracker from './pages/Tracker';

const App: React.FC = () => {
    const [health, setHealth] = useState<'ok' | 'error' | null>(null);
    const [ebayPrice, setEbayPrice] = useState<number | null>(null);

    useEffect(() => {
        fetch('http://localhost:8080/health')
            .then((response) => {
                if (response.ok) setHealth('ok');
                else throw new Error('Health check failed');
            })
            .catch(() => setHealth('error'));
    }, []);

    const computePrice = async () => {
        const response = await fetch('http://localhost:8080/price/compute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mode: 'sustain',
                amazonPrice: 7.5,
                pct: 100,
                protective: [{ price_trigger: 7.5, protective_price: 15 }]
            })
        });

        if (response.ok) {
            const data = await response.json();
            setEbayPrice(data.ebayPrice);
        }
    };

    return (
        <div style={{ width: 360, padding: 16, fontFamily: 'Arial, sans-serif' }}>
            <header style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>EcomFlow</header>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Link to="/duplicate-checker">Open Duplicate Checker</Link>
                <Link to="/product-hunter">Open Product Hunter</Link>
                <Link to="/bulk-lister">Open Bulk Lister</Link>
                <Link to="/image-template">Open Image Template</Link>
                <Link to="/tracker">Open Tracker</Link>
                {/* Removed links for Competitor Research and Boost My Listings temporarily */}
            </nav>
            <div style={{ marginTop: 16, fontSize: 14 }}>
                Health: {health === 'ok' ? '✅' : health === 'error' ? '❌' : '...'}
            </div>
            <Routes>
                <Route path="/duplicate-checker" element={<DuplicateChecker />} />
                <Route path="/product-hunter" element={<ProductHunter />} />
                <Route path="/bulk-lister" element={<BulkLister />} />
                <Route path="/image-template" element={<ImageTemplate />} />
                <Route path="/tracker" element={<Tracker />} />
                {/* Removed routes for Competitor Research and Boost My Listings temporarily */}
            </Routes>
        </div>
    );
};

export default App;
