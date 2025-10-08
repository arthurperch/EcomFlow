import React, { useState, useRef } from 'react';
import './CompetitorResearch.css';

interface ProductResult {
    title: string;
    price: string;
    soldCount: number;
    imageUrl: string;
    productUrl: string;
    sellerName: string;
    listingDate?: string;
    watcherCount?: number;
    itemLocation?: string;
    shippingCost?: string;
    condition?: string;
    recentlySold?: number;
    dailySalesRate?: number;
    soldDate?: string;          // NEW: Date when item was sold
    soldTimestamp?: number;     // NEW: Timestamp for calculations
    daysAgo?: number;           // NEW: Days since sold
    lifetimeSold?: number;      // NEW: Total lifetime sold
}

const CompetitorResearch: React.FC = () => {
    const [sellerInput, setSellerInput] = useState('');
    const [sellers, setSellers] = useState<string[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [running, setRunning] = useState(false);
    const [minSales, setMinSales] = useState('10');
    const [dateRange, setDateRange] = useState('all');  // NEW: Date range filter

    // Use ref to track scanning state for immediate access
    const isScanningRef = useRef(false);
    const [results, setResults] = useState<ProductResult[]>([]);
    const [scanning, setScanning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [log, setLog] = useState('');
    const [currentUser, setCurrentUser] = useState('');
    const [competitorCount, setCompetitorCount] = useState(0);

    // Load saved position and sellers on mount
    React.useEffect(() => {
        const loadSavedData = async () => {
            const data = await chrome.storage.local.get(['ebayCompetitors', 'competitor_position', 'competitorMinSales']);

            if (data.ebayCompetitors) {
                const savedSellers = data.ebayCompetitors;
                setSellerInput(savedSellers.join('\n'));
                setSellers(savedSellers);
                setCompetitorCount(savedSellers.length);
            }

            if (data.competitor_position !== undefined) {
                setCurrentIndex(data.competitor_position);
                if (data.ebayCompetitors && data.ebayCompetitors[data.competitor_position]) {
                    setCurrentUser(data.ebayCompetitors[data.competitor_position]);
                }
            }

            if (data.competitorMinSales) {
                setMinSales(data.competitorMinSales);
            }
        };

        loadSavedData();
    }, []);

    // Listen for competitor scan results
    React.useEffect(() => {
        const messageListener = (message: any) => {
            if (message.type === 'competitorScanResults') {
                const { username, products, timestamp } = message;

                console.log(`📊 Received ${products.length} products from ${username}`);

                setLog(l => l + `\n✅ Received ${products.length} SOLD products from ${username}\n`);

                // Filter and add ONLY products with sales data
                setResults(prev => {
                    const minSalesNum = parseInt(minSales) || 0;
                    // Only include products that have sold count > 0 (actual sold data)
                    const filtered = products.filter((p: ProductResult) =>
                        p.soldCount > 0 && p.soldCount >= minSalesNum
                    );

                    console.log(`📊 Filtered: ${filtered.length}/${products.length} products passed minSales filter (${minSalesNum})`);
                    setLog(l => l + `\n📊 Progress: ${((prev.length + filtered.length) / 100 * 100).toFixed(0)}% (${prev.length + filtered.length} SOLD items found)\n`);

                    return [...prev, ...filtered];
                });
            }
        };

        chrome.runtime.onMessage.addListener(messageListener);

        return () => {
            chrome.runtime.onMessage.removeListener(messageListener);
        };
    }, [minSales]);

    // Parse seller input (multiple usernames) and save to storage
    const parseSellers = async () => {
        const lines = sellerInput.split('\n').map(l => l.trim()).filter(Boolean);
        let parsed: string[] = [];

        for (const line of lines) {
            // Extract seller name from URL or username
            if (line.includes('ebay.com')) {
                const match = line.match(/(?:usr|str)\/([^\/\?]+)|_ssn=([^&]+)/);
                if (match) {
                    parsed.push(match[1] || match[2]);
                }
            } else {
                parsed.push(line);
            }
        }

        // Remove duplicates (case-insensitive)
        parsed = parsed.filter((seller, index) =>
            parsed.findIndex(s => s.toLowerCase() === seller.toLowerCase()) === index
        );

        setSellers(parsed);
        setCompetitorCount(parsed.length);

        // Save to storage
        await chrome.storage.local.set({
            ebayCompetitors: parsed,
            competitorMinSales: minSales
        });

        // Update textarea with cleaned list
        setSellerInput(parsed.join('\n'));

        setLog(`✓ Parsed ${parsed.length} sellers\n`);
        return parsed;
    };

    // Save current position to storage
    const savePosition = async () => {
        await chrome.storage.local.set({
            competitor_position: currentIndex
        });
        console.log('Position saved:', currentIndex);
    };

    // Start automated scanning
    const startScanning = async () => {
        const parsedSellers = await parseSellers();

        if (parsedSellers.length === 0) {
            alert('Please enter at least one eBay seller username or URL');
            return;
        }

        setRunning(true);
        isScanningRef.current = true; // Set ref immediately
        setLog(l => l + `\n🚀 Starting automated scan from position ${currentIndex + 1}...\n`);

        // Process each seller starting from current index
        for (let i = currentIndex; i < parsedSellers.length; i++) {
            // Check ref for immediate stop response
            if (!isScanningRef.current) {
                console.log('⏸️ Scan stopped by user');
                setLog(l => l + '\n⏸️ Scan stopped by user\n');
                break;
            }

            setCurrentIndex(i);
            setCurrentUser(parsedSellers[i]);

            const seller = parsedSellers[i];
            setLog(l => l + `\n[${i + 1}/${parsedSellers.length}] 🔍 Scanning: ${seller}\n`);

            await processSeller(seller);

            // Save position after each seller
            await chrome.storage.local.set({ competitor_position: i });

            // Wait between sellers (3 seconds)
            if (i < parsedSellers.length - 1 && isScanningRef.current) {
                setLog(l => l + `⏳ Waiting 3 seconds before next seller...\n`);
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }

        isScanningRef.current = false;
        setRunning(false);
        setLog(l => l + `\n✅ Scan complete! Processed ${parsedSellers.length} sellers.\n`);
    };

    // Process individual seller - Wait for scan completion
    const processSeller = async (seller: string): Promise<void> => {
        return new Promise(async (resolve, reject) => {
            try {
                setLog(l => l + `  📡 Opening sold items page for: ${seller}\n`);

                // Set up listener for this specific seller's results
                const resultListener = (message: any) => {
                    if (message.type === 'competitorScanResults' && message.username === seller) {
                        console.log(`✅ Received results for ${seller}, scan complete`);
                        chrome.runtime.onMessage.removeListener(resultListener);
                        resolve();
                    }
                };

                // Add temporary listener for this scan
                chrome.runtime.onMessage.addListener(resultListener);

                // Send message to background service to start research
                const response = await chrome.runtime.sendMessage({
                    type: 'research_competitor',
                    username: seller
                });

                if (response && response.success) {
                    setLog(l => l + `  ✅ Tab opened for ${seller}, scanning in progress...\n`);

                    // Set a timeout in case the scan hangs (30 seconds max)
                    setTimeout(() => {
                        chrome.runtime.onMessage.removeListener(resultListener);
                        setLog(l => l + `  ⚠️ Scan timeout for ${seller} (30s elapsed)\n`);
                        resolve();
                    }, 30000);
                } else {
                    chrome.runtime.onMessage.removeListener(resultListener);
                    setLog(l => l + `  ❌ Failed to start research: ${response?.error || 'Unknown error'}\n`);
                    resolve();
                }

            } catch (error) {
                setLog(l => l + `  ❌ Error processing ${seller}: ${error}\n`);
                resolve();
            }
        });
    };    // Stop scanning
    const stopScanning = async () => {
        console.log('🛑 STOP button clicked - stopping scan...');
        isScanningRef.current = false; // Stop immediately
        setRunning(false);
        await chrome.storage.local.set({ competitor_position: currentIndex });
        setLog(l => l + '\n🛑 STOP: Scan stopped by user at position ' + (currentIndex + 1) + '\n');
    };

    // Reset to beginning
    const resetPosition = async () => {
        setCurrentIndex(0);
        setCurrentUser('');
        setResults([]);
        setLog('');
        await chrome.storage.local.set({ competitor_position: 0 });
        await chrome.storage.local.remove('savedEbaySearchItems');
        setLog('✅ Reset to beginning\n');
    };

    // View sold items for single seller - Show popup with collected data
    const viewSoldItems = async () => {
        // Check if we have any results in storage
        const storage = await chrome.storage.local.get(['competitorResults', 'lastCompetitorScan']);
        const storedResults = storage.competitorResults || [];
        const lastScan = storage.lastCompetitorScan;

        if (storedResults.length === 0) {
            alert('No sold items data found. Please run a scan first using the RUN or Scan Store buttons.');
            return;
        }

        // Show modal popup with results
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 999999;
            display: flex;
            justify-content: center;
            align-items: center;
        `;

        const popup = document.createElement('div');
        popup.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 30px;
            max-width: 90%;
            max-height: 90%;
            overflow: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        `;

        popup.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #333;">📊 Sold Items Data</h2>
                <button id="close-modal" style="background: #e74c3c; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 16px;">✕ Close</button>
            </div>
            
            ${lastScan ? `
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="margin: 5px 0;"><strong>Last Scan:</strong> ${lastScan.username || 'Unknown'}</p>
                    <p style="margin: 5px 0;"><strong>Time:</strong> ${new Date(lastScan.timestamp).toLocaleString()}</p>
                    <p style="margin: 5px 0;"><strong>Items Found:</strong> ${lastScan.productCount || storedResults.length}</p>
                </div>
            ` : ''}
            
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead>
                        <tr style="background: #3498db; color: white;">
                            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">#</th>
                            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Image</th>
                            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Title</th>
                            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Price</th>
                            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Sold Count</th>
                            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Sold Date</th>
                            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Days Ago</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${storedResults.map((item: any, index: number) => `
                            <tr style="border-bottom: 1px solid #ddd; ${index % 2 === 0 ? 'background: #f9f9f9;' : ''}">
                                <td style="padding: 10px; border: 1px solid #ddd;">${index + 1}</td>
                                <td style="padding: 10px; border: 1px solid #ddd;">
                                    <img src="${item.imageUrl || ''}" alt="Product" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22%3E%3Crect width=%2260%22 height=%2260%22 fill=%22%23ddd%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22%3ENo Img%3C/text%3E%3C/svg%3E'" />
                                </td>
                                <td style="padding: 10px; border: 1px solid #ddd;">
                                    <a href="${item.productUrl || '#'}" target="_blank" style="color: #3498db; text-decoration: none;">
                                        ${(item.title || 'No title').substring(0, 80)}${(item.title || '').length > 80 ? '...' : ''}
                                    </a>
                                </td>
                                <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">$${(item.price || 0).toFixed(2)}</td>
                                <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                                    <span style="background: #28a745; color: white; padding: 4px 12px; border-radius: 12px; font-weight: bold;">
                                        ${item.soldCount || 0}
                                    </span>
                                </td>
                                <td style="padding: 10px; border: 1px solid #ddd;">${item.soldDate || 'N/A'}</td>
                                <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                                    ${item.daysAgo !== undefined ? `${item.daysAgo} days` : 'N/A'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div style="margin-top: 20px; text-align: center;">
                <p style="color: #666;">Total: ${storedResults.length} sold items</p>
            </div>
        `;

        modal.appendChild(popup);
        document.body.appendChild(modal);

        // Close modal on button click or outside click
        const closeBtn = popup.querySelector('#close-modal');
        closeBtn?.addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        setLog(l => l + `\n✓ Viewing ${storedResults.length} stored sold items\n`);
    };

    const clearResults = () => {
        setResults([]);
        setLog('');
        setProgress(0);
    };

    const exportResults = () => {
        if (results.length === 0) {
            alert('No results to export');
            return;
        }

        // Convert to CSV with all fields
        const headers = [
            'Title',
            'Price',
            'Total Sold',
            'Sold Date',
            'Days Ago',
            'Daily Sales Rate',
            'Watchers',
            'Condition',
            'Location',
            'Shipping',
            'Seller',
            'Product URL',
            'Image URL'
        ];
        const rows = results.map(r => [
            r.title,
            r.price,
            r.soldCount,
            r.soldDate || '',
            r.daysAgo !== undefined ? r.daysAgo : '',
            r.dailySalesRate || 0,
            r.watcherCount || 0,
            r.condition || '',
            r.itemLocation || '',
            r.shippingCost || '',
            r.sellerName,
            r.productUrl,
            r.imageUrl
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        // Download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ebay-competitor-research-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        setLog(l => l + `\n✓ Exported ${results.length} results to CSV\n`);
    };

    // Listen for messages from content script
    React.useEffect(() => {
        const messageListener = (message: any) => {
            if (message.type === 'competitorScanProgress') {
                setProgress(message.progress);
                setLog(l => l + `📊 Progress: ${message.progress}% (${message.found} SOLD items found)\n`);
            }

            if (message.type === 'competitorScanResults') {
                const { products } = message;

                // Apply date range filter
                const filteredProducts = filterProductsByDateRange(products, dateRange, parseInt(minSales));

                setResults(filteredProducts);
                setScanning(false);
                setProgress(100);
                setLog(l => l + `\n✅ Scan complete! Found ${filteredProducts.length} SOLD products matching filters\n`);
            }

            if (message.type === 'competitorScanError') {
                setLog(l => l + `\n❌ Error: ${message.error}\n`);
                setScanning(false);
            }
        };

        chrome.runtime.onMessage.addListener(messageListener);
        return () => chrome.runtime.onMessage.removeListener(messageListener);
    }, [minSales, dateRange]);

    // NEW: Filter products by date range
    const filterProductsByDateRange = (products: ProductResult[], range: string, minSalesNum: number): ProductResult[] => {
        return products.filter((p: ProductResult) => {
            // Must have sold data
            if (!p.soldCount || p.soldCount === 0 || p.soldCount < minSalesNum) {
                return false;
            }

            // If "all time", include everything with sales
            if (range === 'all') {
                return true;
            }

            // Filter by date range if daysAgo is available
            if (p.daysAgo !== undefined) {
                const rangeDays = parseInt(range);
                return p.daysAgo <= rangeDays;
            }

            // If no date info, include it (assume recent)
            return true;
        });
    };

    return (
        <div className="cr-root">
            <div className="cr-main">
                <header className="cr-header">
                    <h1 className="cr-section-header">🔍 Competitor Research</h1>
                    <p style={{ color: '#aaa', fontSize: '1.1rem' }}>
                        Find high-selling products from eBay seller stores - SOLD ITEMS ONLY
                    </p>
                </header>

                <div className="cr-content">
                    {/* Input Section */}
                    <div className="cr-card">
                        <h2 className="cr-section-subheader">Competitor Scanner</h2>

                        <div className="cr-input-group">
                            <label>eBay Seller Usernames (one per line):</label>
                            <textarea
                                value={sellerInput}
                                onChange={(e) => setSellerInput(e.target.value)}
                                placeholder="Enter seller usernames or URLs&#10;happyhomesteadhauls&#10;https://www.ebay.com/usr/seller-name&#10;https://www.ebay.com/str/store-name"
                                rows={8}
                                disabled={running}
                                style={{
                                    width: '100%',
                                    background: '#232b3a',
                                    color: '#fff',
                                    border: '1px solid #2a3242',
                                    borderRadius: '8px',
                                    fontSize: '1.05rem',
                                    padding: '12px',
                                    fontFamily: 'monospace',
                                    resize: 'vertical'
                                }}
                            />
                            <small style={{ color: '#aaa', marginTop: '8px', display: 'block' }}>
                                Enter usernames directly or paste full eBay URLs
                            </small>
                        </div>

                        {sellers.length > 0 && (
                            <div className="cr-sellers-list" style={{
                                background: '#232b3a',
                                borderRadius: '8px',
                                padding: '12px',
                                marginBottom: '16px'
                            }}>
                                <strong style={{ color: '#7ecbff' }}>Parsed Sellers ({sellers.length}):</strong>
                                <div style={{ marginTop: '8px', color: '#aaa', fontSize: '0.95rem' }}>
                                    {sellers.map((seller, idx) => (
                                        <div key={idx} style={{
                                            padding: '4px 0',
                                            color: idx === currentIndex && running ? '#2ecc40' : '#aaa'
                                        }}>
                                            {idx === currentIndex && running && '▶ '}
                                            {idx + 1}. {seller}
                                            {idx < currentIndex && running && ' ✓'}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="cr-input-group">
                            <label>Minimum Sales Count:</label>
                            <input
                                type="number"
                                value={minSales}
                                onChange={(e) => setMinSales(e.target.value)}
                                min="0"
                                disabled={running}
                            />
                            <small style={{ color: '#aaa' }}>
                                Only show sold items with at least this many sales
                            </small>
                        </div>

                        {/* NEW: Date Range Filter */}
                        <div className="cr-input-group">
                            <label>Date Range Filter:</label>
                            <select
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value)}
                                disabled={running}
                                style={{
                                    width: '100%',
                                    background: '#232b3a',
                                    color: '#fff',
                                    border: '1px solid #2a3242',
                                    borderRadius: '8px',
                                    fontSize: '1.05rem',
                                    padding: '12px',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="all">All Time (Lifetime)</option>
                                <option value="1">Last 1 Day</option>
                                <option value="7">Last 7 Days</option>
                                <option value="14">Last 14 Days</option>
                                <option value="30">Last 30 Days</option>
                                <option value="60">Last 60 Days</option>
                                <option value="90">Last 90 Days</option>
                            </select>
                            <small style={{ color: '#aaa' }}>
                                Filter sold items by date range (based on sold date)
                            </small>
                        </div>

                        {/* Scan Info Display */}
                        <div style={{
                            background: '#232b3a',
                            borderRadius: '8px',
                            padding: '16px',
                            marginBottom: '16px',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '12px'
                        }}>
                            <div>
                                <strong style={{ color: '#7ecbff' }}>Current Position:</strong>
                                <div style={{ fontSize: '1.3rem', color: '#2ecc40', marginTop: '4px' }}>
                                    {currentIndex + 1}
                                </div>
                            </div>
                            <div>
                                <strong style={{ color: '#7ecbff' }}>Competitor Count:</strong>
                                <div style={{ fontSize: '1.3rem', color: '#2ecc40', marginTop: '4px' }}>
                                    {competitorCount}
                                </div>
                            </div>
                            <div>
                                <strong style={{ color: '#7ecbff' }}>Scanning User:</strong>
                                <div style={{ fontSize: '1rem', color: '#fff', marginTop: '4px', wordBreak: 'break-all' }}>
                                    {currentUser || '-'}
                                </div>
                            </div>
                        </div>

                        <div className="cr-actions">
                            {!running ? (
                                <button id="run" className="btn btn-run" onClick={startScanning}>
                                    ▶️ RUN SCAN
                                </button>
                            ) : (
                                <button className="btn btn-stop" onClick={stopScanning} style={{
                                    animation: 'pulse 1.5s infinite',
                                    fontSize: '1.1rem',
                                    fontWeight: 'bold'
                                }}>
                                    🛑 STOP SCAN
                                </button>
                            )}
                            <button
                                className="btn btn-secondary"
                                onClick={viewSoldItems}
                                disabled={running || !sellerInput.trim()}
                            >
                                View Sold Items
                            </button>
                            <button className="btn btn-secondary" onClick={resetPosition}>
                                Reset
                            </button>
                            <button className="btn btn-secondary" onClick={clearResults}>
                                Clear Results
                            </button>
                            <button
                                className="btn btn-export"
                                onClick={exportResults}
                                disabled={results.length === 0}
                            >
                                Export CSV
                            </button>
                        </div>

                        {/* Running Status */}
                        {running && (
                            <div style={{
                                background: '#232b3a',
                                borderRadius: '8px',
                                padding: '16px',
                                marginTop: '16px',
                                border: '2px solid #2ecc40'
                            }}>
                                <div style={{ fontSize: '1.2rem', color: '#2ecc40', marginBottom: '8px' }}>
                                    🔄 Scanning in progress...
                                </div>
                                <div style={{ color: '#aaa' }}>
                                    Processing seller {currentIndex + 1} of {sellers.length}
                                </div>
                                {sellers[currentIndex] && (
                                    <div style={{ color: '#7ecbff', marginTop: '4px' }}>
                                        Current: {sellers[currentIndex]}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Progress Bar */}
                        {scanning && (
                            <div className="cr-progress">
                                <div className="cr-progress-bar">
                                    <div
                                        className="cr-progress-fill"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <div className="cr-progress-text">{progress}%</div>
                            </div>
                        )}

                        {/* Log */}
                        {log && (
                            <div className="cr-log">
                                <h3>Scan Log:</h3>
                                <pre>{log}</pre>
                            </div>
                        )}
                    </div>

                    {/* Results Section */}
                    {results.length > 0 && (
                        <div className="cr-card">
                            <h2 className="cr-section-subheader">
                                📦 SOLD Items Results ({results.length} products with sales data)
                            </h2>

                            <div style={{
                                background: '#232b3a',
                                padding: '12px',
                                borderRadius: '8px',
                                marginBottom: '16px',
                                color: '#2ecc40'
                            }}>
                                ✅ Showing only products with verified sold data from eBay
                            </div>

                            {/* Summary Statistics */}
                            <div style={{
                                background: '#232b3a',
                                borderRadius: '8px',
                                padding: '16px',
                                marginBottom: '16px',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(4, 1fr)',
                                gap: '16px'
                            }}>
                                <div>
                                    <strong style={{ color: '#7ecbff' }}>Total Products:</strong>
                                    <div style={{ fontSize: '1.5rem', color: '#2ecc40', marginTop: '4px' }}>
                                        {results.length}
                                    </div>
                                </div>
                                <div>
                                    <strong style={{ color: '#7ecbff' }}>Total Lifetime Sold:</strong>
                                    <div style={{ fontSize: '1.5rem', color: '#2ecc40', marginTop: '4px' }}>
                                        {results.reduce((sum, p) => sum + (p.lifetimeSold || p.soldCount), 0).toLocaleString()}
                                    </div>
                                </div>
                                <div>
                                    <strong style={{ color: '#7ecbff' }}>Avg Sold Per Item:</strong>
                                    <div style={{ fontSize: '1.5rem', color: '#ff851b', marginTop: '4px' }}>
                                        {(results.reduce((sum, p) => sum + p.soldCount, 0) / results.length).toFixed(1)}
                                    </div>
                                </div>
                                <div>
                                    <strong style={{ color: '#7ecbff' }}>Date Range:</strong>
                                    <div style={{ fontSize: '1.2rem', color: '#fff', marginTop: '4px' }}>
                                        {dateRange === 'all' ? 'All Time' : `Last ${dateRange} Days`}
                                    </div>
                                </div>
                            </div>

                            {/* DATE BREAKDOWN - NEW! */}
                            <div style={{
                                background: 'linear-gradient(135deg, #1e2530 0%, #232b3a 100%)',
                                borderRadius: '12px',
                                padding: '20px',
                                marginBottom: '16px',
                                border: '2px solid #2ecc40'
                            }}>
                                <h3 style={{ color: '#2ecc40', marginBottom: '16px', fontSize: '1.3rem' }}>
                                    📊 SOLD ITEMS BY DATE RANGE
                                </h3>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                                    gap: '12px'
                                }}>
                                    {[
                                        { label: 'Last 1 Day', days: 1 },
                                        { label: 'Last 7 Days', days: 7 },
                                        { label: 'Last 14 Days', days: 14 },
                                        { label: 'Last 30 Days', days: 30 },
                                        { label: 'Last 60 Days', days: 60 },
                                        { label: 'Last 90 Days', days: 90 }
                                    ].map(range => {
                                        const count = results.filter(p =>
                                            p.daysAgo !== undefined && p.daysAgo <= range.days
                                        ).reduce((sum, p) => sum + p.soldCount, 0);

                                        return (
                                            <div key={range.days} style={{
                                                background: '#1a1f2a',
                                                padding: '12px',
                                                borderRadius: '8px',
                                                textAlign: 'center',
                                                border: '1px solid #2a3242'
                                            }}>
                                                <div style={{ color: '#7ecbff', fontSize: '0.9rem', marginBottom: '6px' }}>
                                                    {range.label}
                                                </div>
                                                <div style={{ fontSize: '1.8rem', color: '#2ecc40', fontWeight: 'bold' }}>
                                                    {count.toLocaleString()}
                                                </div>
                                                <div style={{ color: '#aaa', fontSize: '0.85rem', marginTop: '4px' }}>
                                                    items sold
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Items with dates vs no dates */}
                                <div style={{
                                    marginTop: '16px',
                                    padding: '12px',
                                    background: '#1a1f2a',
                                    borderRadius: '8px',
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '12px'
                                }}>
                                    <div>
                                        <span style={{ color: '#7ecbff' }}>Items with Date Info: </span>
                                        <strong style={{ color: '#2ecc40', fontSize: '1.2rem' }}>
                                            {results.filter(p => p.soldDate).length}
                                        </strong>
                                    </div>
                                    <div>
                                        <span style={{ color: '#7ecbff' }}>Items without Date: </span>
                                        <strong style={{ color: '#ff851b', fontSize: '1.2rem' }}>
                                            {results.filter(p => !p.soldDate).length}
                                        </strong>
                                    </div>
                                </div>
                            </div>

                            <div className="cr-table-wrapper">
                                <table className="cr-table">
                                    <thead>
                                        <tr>
                                            <th>Image</th>
                                            <th>Title</th>
                                            <th>Price</th>
                                            <th>Total Sold</th>
                                            <th>Sold Date</th>
                                            <th>Daily Rate</th>
                                            <th>Watchers</th>
                                            <th>Condition</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {results
                                            .sort((a, b) => b.soldCount - a.soldCount)
                                            .map((product, idx) => (
                                                <tr key={idx}>
                                                    <td>
                                                        <img
                                                            src={product.imageUrl}
                                                            alt={product.title}
                                                            className="cr-product-image"
                                                        />
                                                    </td>
                                                    <td className="cr-product-title">
                                                        <div>{product.title}</div>
                                                        {product.itemLocation && (
                                                            <div style={{ fontSize: '0.85rem', color: '#aaa', marginTop: '4px' }}>
                                                                📍 {product.itemLocation}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="cr-price">
                                                        <div>{product.price}</div>
                                                        {product.shippingCost && (
                                                            <div style={{ fontSize: '0.85rem', color: '#aaa', marginTop: '4px' }}>
                                                                {product.shippingCost}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="cr-sold">
                                                        <div style={{
                                                            background: product.soldCount > 10 ? '#28a745' :
                                                                product.soldCount > 5 ? '#ff851b' :
                                                                    '#6c757d',
                                                            color: 'white',
                                                            padding: '6px 12px',
                                                            borderRadius: '20px',
                                                            fontWeight: 'bold',
                                                            fontSize: '1.1rem',
                                                            display: 'inline-block',
                                                            minWidth: '60px',
                                                            textAlign: 'center'
                                                        }}>
                                                            {product.soldCount}
                                                            {product.soldCount > 1 && <span style={{ fontSize: '0.85rem' }}> qty</span>}
                                                        </div>
                                                    </td>
                                                    <td className="cr-sold-date">
                                                        {product.soldDate ? (
                                                            <div>
                                                                <div style={{ color: '#fff' }}>{product.soldDate}</div>
                                                                {product.daysAgo !== undefined && (
                                                                    <div style={{ fontSize: '0.85rem', color: '#aaa' }}>
                                                                        ({product.daysAgo} days ago)
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span style={{ color: '#666' }}>-</span>
                                                        )}
                                                    </td>
                                                    <td className="cr-daily-rate">
                                                        {product.dailySalesRate ? (
                                                            <span style={{ color: '#ff851b', fontWeight: 600 }}>
                                                                {product.dailySalesRate}/day
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="cr-watchers">
                                                        {product.watcherCount ? (
                                                            <span style={{ color: '#7ecbff' }}>
                                                                👁️ {product.watcherCount}
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="cr-condition">
                                                        {product.condition || 'N/A'}
                                                    </td>
                                                    <td>
                                                        <a
                                                            href={product.productUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn btn-small"
                                                        >
                                                            View
                                                        </a>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CompetitorResearch;
