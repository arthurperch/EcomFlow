


import React, { useState, useEffect } from 'react';
import './ProductHunter.css';

interface ProductData {
    url: string;
    title: string;
    description: string;
    price?: string;
    imageUrl?: string;
    asin?: string;
}

const ProductHunter: React.FC = () => {
    const [optionsOpen, setOptionsOpen] = useState(false);

    // Automation handler for Bulk List button
    const handleBulkListAutomation = async () => {
        if (!confirm('Start eBay listing automation with the first product?')) {
            return;
        }

        // Extract product data from the first row
        const product = extractFirstProductData();

        if (!product) {
            alert('No products found. Please run a search first.');
            return;
        }

        console.log('Starting eBay automation with:', product);

        try {
            // Store product data in chrome storage
            await chrome.storage.local.set({
                pendingProduct: product,
                automationInProgress: true
            });

            // Open eBay listing page in new tab
            const ebayUrl = 'https://www.ebay.com/help/selling/listings/creating-listing?id=4105';
            chrome.tabs.create({ url: ebayUrl });
        } catch (error) {
            console.error('Automation error:', error);
            alert('Failed to start automation: ' + error);
        }
    };

    // Extract product data from first table row
    const extractFirstProductData = (): ProductData | null => {
        const table = document.getElementById('productTable');
        if (!table) return null;

        const tbody = table.querySelector('tbody');
        if (!tbody) return null;

        const firstRow = tbody.querySelector('tr');
        if (!firstRow) return null;

        try {
            const cells = firstRow.querySelectorAll('td');

            const imageCell = cells[0];
            const img = imageCell?.querySelector('img');
            const imageUrl = img?.src || '';

            const titleCell = cells[1];
            const titleLink = titleCell?.querySelector('a');
            const title = titleLink?.textContent?.trim() || '';
            const url = titleLink?.href || '';

            const priceCell = cells[2];
            const price = priceCell?.textContent?.trim() || '';

            const asinCell = cells[4];
            const asin = asinCell?.textContent?.trim() || '';

            const description = `${title}\n\nPrice: ${price}\nASIN: ${asin}`;

            return { url, title, description, price, imageUrl, asin };
        } catch (error) {
            console.error('Error extracting product data:', error);
            return null;
        }
    };

    useEffect(() => {
        // Attach click handler to the Bulk List button after component mounts
        const attachHandler = () => {
            const bulkListBtn = document.getElementById('exportResultsToBulk');
            if (bulkListBtn) {
                bulkListBtn.addEventListener('click', handleBulkListAutomation);
            }
        };

        // Wait for DOM to be ready
        setTimeout(attachHandler, 100);

        return () => {
            const bulkListBtn = document.getElementById('exportResultsToBulk');
            if (bulkListBtn) {
                bulkListBtn.removeEventListener('click', handleBulkListAutomation);
            }
        };
    }, []);

    return (
        <div className="ph-root" style={{ minHeight: '100vh', width: '100vw', background: '#181e27' }}>
            <main className="ph-main" style={{ width: '100vw', maxWidth: '100vw', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <header className="ph-header">
                    <h2 className="ph-section-header" style={{ fontSize: '2.5rem', padding: '18px 60px', width: '100%', maxWidth: 1200 }}>Product Hunting</h2>
                </header>
                <div className="ph-results-settings-row" style={{ width: '100%', maxWidth: 1600, gap: 80, alignItems: 'flex-start', justifyContent: 'center' }}>
                    <div className="ph-card ph-main-card wide ph-results-col" style={{ flex: 2, minWidth: 0, maxWidth: '100%' }}>
                        <div className="container" style={{ maxWidth: '100%', width: '100%' }}>
                            <div className="search-container" style={{ marginBottom: 32 }}>
                                <h3 className="ph-section-subheader" style={{ fontSize: '1.5rem' }}>Search Terms</h3>
                                <textarea id="searchTerms" rows={8} cols={100} style={{ fontSize: '1.25rem', minHeight: 120, width: '100%' }} placeholder="Enter titles or keywords, one per line"></textarea>
                                <div className="ph-search-actions" style={{ marginTop: 12, gap: 18 }}>
                                    <button id="clearTerms" className="btn clear" style={{ fontSize: '1.15rem', padding: '12px 28px' }}>Clear</button>
                                    <button id="importTerms" className="btn exportResults" style={{ fontSize: '1.15rem', padding: '12px 28px' }}>Import</button>
                                    <button id="searchTitles" className="btn searchTitle" style={{ fontSize: '1.15rem', padding: '12px 28px' }}>Search Titles</button>
                                </div>
                                <p id="totalSearchTerms" style={{ fontSize: '1.1rem', color: '#7ecbff', marginTop: 8 }}>0 terms</p>
                            </div>
                            <div className="result-container" id="resultContainer" style={{ background: '#202736', borderRadius: 16, boxShadow: '0 2px 24px 0 #000a', padding: 32, marginBottom: 32, width: '100%' }}>
                                <h3 className="ph-section-subheader" style={{ fontSize: '1.5rem' }}>Results</h3>
                                <div className="textarea-wrapper">
                                    <table id="productTable" style={{ width: '100%', fontSize: '1.15rem' }}>
                                        <thead>
                                            <tr>
                                                <th>Image</th>
                                                <th>Title</th>
                                                <th>Price</th>
                                                <th>Reviews</th>
                                                <th style={{ display: 'none' }}>Asin</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* Table rows will be dynamically added here */}
                                        </tbody>
                                    </table>
                                </div>
                                <p id="totalResults" style={{ fontSize: '1.1rem', color: '#7ecbff', marginTop: 8 }}>0 results</p>
                                <div className="ph-results-actions" style={{ margin: '18px 0 12px 0', gap: 18 }}>
                                    <button id="clearResults" className="btn clear" style={{ fontSize: '1.15rem', padding: '12px 28px' }}>Clear</button>
                                    <button id="exportResults" className="btn exportResults" style={{ fontSize: '1.15rem', padding: '12px 28px' }}>Export</button>
                                    <button id="exportResultsToBulk" className="btn" style={{ fontSize: '1.15rem', padding: '12px 28px' }}>Bulk List</button>
                                </div>
                                <div className="ph-results-filters" style={{ gap: 18, marginBottom: 18, flexWrap: 'wrap' }}>
                                    <label htmlFor="minPriceForResults">Min Price:</label>
                                    <input type="number" id="minPriceForResults" defaultValue={0} style={{ width: 120, fontSize: '1.1rem' }} />
                                    <label htmlFor="maxPriceForResults">Max Price:</label>
                                    <input type="number" id="maxPriceForResults" defaultValue={1000} style={{ width: 120, fontSize: '1.1rem' }} />
                                    <label htmlFor="minReviewsForResults">Min Reviews:</label>
                                    <input type="number" id="minReviewsForResults" defaultValue={0} style={{ width: 120, fontSize: '1.1rem' }} />
                                    <label htmlFor="maxReviewsForResults">Max Reviews:</label>
                                    <input type="number" id="maxReviewsForResults" defaultValue={1000000} style={{ width: 120, fontSize: '1.1rem' }} />
                                    <button id="applyFiltersForResults" className="btn" style={{ fontSize: '1.1rem', padding: '10px 22px' }}>Apply Filters</button>
                                    <button id="sortButtonForResults" className="btn" style={{ fontSize: '1.1rem', padding: '10px 22px' }}>Sort Price: High to Low</button>
                                </div>
                                <div className="progress-container" style={{ margin: '18px 0' }}>
                                    <p style={{ fontSize: '1.1rem', color: '#7ecbff' }}>Progress <span className="progress-percentage"></span></p>
                                    <div id="progress-bar" style={{ width: '100%', height: 16, background: '#eee', borderRadius: 8, overflow: 'hidden', marginTop: 6 }}>
                                        <span className="progress-percentage" style={{ display: 'block', height: '100%', background: '#1e90ff', borderRadius: 8, width: 0, transition: 'width 0.3s' }}></span>
                                    </div>
                                    <div className="ph-results-actions" style={{ marginTop: 18, gap: 18, display: 'flex', flexDirection: 'row' }}>
                                        <button id="pause_button" className="btn" style={{ fontSize: '1.15rem', padding: '12px 28px' }} disabled>Pause</button>
                                        <button id="resume_button" className="btn" style={{ fontSize: '1.15rem', padding: '12px 28px' }}>Resume</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="settings-card" style={{ flex: 1, minWidth: 340, maxWidth: 500, background: '#202736', borderRadius: 16, boxShadow: '0 2px 24px 0 #000a', padding: 40, color: '#fff', display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <h2 className="settings-title" style={{ fontSize: '2rem', color: '#7ecbff', marginBottom: 18 }}>Settings</h2>
                        <div className="settings-group" style={{ marginBottom: 18 }}>
                            <label htmlFor="numberToExtract" style={{ fontSize: '1.15rem' }}>Number of items to extract for each search term:</label>
                            <input type="number" id="numberToExtract" defaultValue={2} min={1} style={{ fontSize: '1.15rem', padding: '12px 18px', borderRadius: 8 }} />
                        </div>
                        <div className="settings-group" style={{ marginBottom: 18 }}>
                            <h4 style={{ fontSize: '1.2rem', color: '#7ecbff', marginBottom: 8 }}>Filters</h4>
                            <label htmlFor="minPrice" style={{ fontSize: '1.1rem' }}>Min Price</label>
                            <input type="number" id="minPrice" name="minPrice" defaultValue={0} min={0} max={9999} style={{ fontSize: '1.1rem', padding: '10px 16px', borderRadius: 8 }} />
                            <label htmlFor="maxPrice" style={{ fontSize: '1.1rem' }}>Max Price</label>
                            <input type="number" id="maxPrice" name="maxPrice" defaultValue={100} min={0} max={9999} style={{ fontSize: '1.1rem', padding: '10px 16px', borderRadius: 8 }} />
                            <label htmlFor="min_reviews" style={{ fontSize: '1.1rem' }}>Minimum Reviews</label>
                            <input type="number" id="min_reviews" defaultValue={100} min={0} max={9999} style={{ fontSize: '1.1rem', padding: '10px 16px', borderRadius: 8 }} />
                            <label htmlFor="max_reviews" style={{ fontSize: '1.1rem' }}>Maximum Reviews</label>
                            <input type="number" id="max_reviews" defaultValue={100000} min={0} max={999999} style={{ fontSize: '1.1rem', padding: '10px 16px', borderRadius: 8 }} />
                            <label htmlFor="max_similiar_niche_items" style={{ fontSize: '1.1rem' }}>Maximum Similar Niche Items</label>
                            <input type="number" id="max_similiar_niche_items" defaultValue={2} min={0} max={9999} style={{ fontSize: '1.1rem', padding: '10px 16px', borderRadius: 8 }} />
                        </div>
                        <div className="settings-group" style={{ marginBottom: 18 }}>
                            <button
                                className={`btn advance-options-btn${!optionsOpen ? ' highlight' : ''}`}
                                style={{ fontSize: '1.15rem', padding: '12px 28px', width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}
                                onClick={() => setOptionsOpen(v => !v)}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    Advance Options
                                    {!optionsOpen && (
                                        <span className="more-options-badge" style={{ background: '#ffe066', color: '#222', borderRadius: 8, fontSize: '0.95rem', padding: '2px 10px', marginLeft: 10, fontWeight: 600 }}>
                                            More options
                                        </span>
                                    )}
                                </span>
                                <span
                                    className={`arrow${optionsOpen ? ' open' : ''}`}
                                    style={{ fontSize: 22, marginLeft: 8, transition: 'transform 0.2s', display: 'inline-block', transform: optionsOpen ? 'rotate(180deg)' : 'rotate(0deg)', color: !optionsOpen ? '#ffb300' : '#7ecbff' }}
                                >
                                    ▼
                                </span>
                            </button>
                            {optionsOpen && (
                                <div className="settings-options-checks" style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 18 }}>
                                    <label style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 10 }}><input type="checkbox" id="prioritizeAmazonChoice" defaultChecked /> Amazon Choice (Prioritize)</label>
                                    <label style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 10 }}><input type="checkbox" id="prioritizeBestSellers" defaultChecked /> Best Seller (Prioritize)</label>
                                    <label style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 10 }}><input type="checkbox" id="sort-by-reviews" defaultChecked /> Sort By: Highest Reviewed</label>
                                    <label style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 10 }}><input type="checkbox" id="duplicate_protection" defaultChecked /> Don't Get Duplicate Item</label>
                                    <label style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 10 }}><input type="checkbox" id="vero_protection_switch" defaultChecked /> Don't Get VERO Item</label>
                                    <label style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 10 }}><input type="checkbox" id="remove_books" defaultChecked /> Remove Books</label>
                                    <label style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 10 }}><input type="checkbox" id="amazon_is_seller" /> Amazon is the Seller</label>
                                    <label htmlFor="required_keywords_checkbox" style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <input type="checkbox" id="required_keywords_checkbox" style={{ marginRight: 8 }} /> Required Keywords In Title — <a href="#" id="openKeywordModal">set list</a>
                                    </label>
                                    <label htmlFor="restricted_words" style={{ fontSize: '1.1rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        Don't Get Items With These Words (Separate with newlines)
                                        <textarea id="restricted_words" rows={6} style={{ fontSize: '1.1rem', minHeight: 80, borderRadius: 8, marginTop: 4 }} placeholder="Enter restricted words, one per line"></textarea>
                                    </label>
                                    <label htmlFor="product_hunter_supplier" style={{ fontSize: '1.1rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        Supplier
                                        <select id="product_hunter_supplier" style={{ fontSize: '1.1rem', padding: '10px 16px', borderRadius: 8, marginTop: 4 }}>
                                            <option value="amazon">Amazon</option>
                                            <option value="home-depot">Home Depot</option>
                                        </select>
                                    </label>
                                </div>
                            )}
                        </div>
                        {/* Pause/Resume buttons moved to results section */}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ProductHunter;
