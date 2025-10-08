// ...existing code...
import React, { useState } from "react";
import "./BulkLister.css";

// --- Design System Components ---
const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 className="bl-section-header">{children}</h2>
);

const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
    <div className="bl-card" style={style}>{children}</div>
);

type ButtonVariant = "accent" | "secondary" | "danger" | "yellow";
const Button: React.FC<{
    children: React.ReactNode;
    onClick?: () => void;
    type?: "button" | "submit";
    variant?: ButtonVariant;
    disabled?: boolean;
    ariaLabel?: string;
    style?: React.CSSProperties;
}> = ({ children, onClick, type = "button", variant = "accent", disabled, ariaLabel, style }) => (
    <button
        type={type}
        className={`bl-btn bl-btn-${variant}`}
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        style={style}
    >
        {children}
    </button>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input className="bl-input" {...props} />
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
    <select className="bl-select" {...props} />
);

const Checkbox: React.FC<{
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    id: string;
    ariaLabel?: string;
}> = ({ label, checked, onChange, id, ariaLabel }) => (
    <label className="bl-checkbox-row" htmlFor={id}>
        <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={e => onChange(e.target.checked)}
            aria-label={ariaLabel || label}
        />
        <span>{label}</span>
    </label>
);

// --- Main Bulk Lister Page ---
const defaultState = {
    links: "",
    threadCount: 1,
    minPrice: "",
    maxPrice: "",
    fbaOnly: false,
    closeErrored: false,
    chineseSellers: false,
    addGpsr: false,
    optimizeSlow: false,
    paused: false,
    position: 1,
    total: 0,
    success: 0,
    failed: 0,
    percent: 0,
};

type State = typeof defaultState;

const BulkLister: React.FC = () => {
    const [state, setState] = useState<State>(defaultState);
    const [log, setLog] = useState<string>("");
    const [statusMap, setStatusMap] = useState<Record<string, { url: string, status: string, message: string }>>({});

    // Extract ASIN from Amazon URL
    const extractAsin = (url: string): string | null => {
        const match = url.match(/\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})|\/ASIN\/([A-Z0-9]{10})/i);
        return match ? (match[1] || match[2] || match[3]) : null;
    };

    // Handlers
    const handleClear = () => setState(s => ({ ...s, links: "" }));
    const handleReset = () => setState(defaultState);
    const handlePause = () => setState(s => ({ ...s, paused: true }));
    const handleResume = () => setState(s => ({ ...s, paused: false }));
    const handleStatusReport = () => {
        console.log('Current State:', state);
        console.log('Status Map:', statusMap);
        chrome.storage.local.get(null, (data: any) => {
            console.log('All Storage:', data);
        });
    };

    // eBay Automation - Step 1: Open Amazon tabs to scrape data
    const startEbayAutomation = async (listType: 'opti' | 'seo' | 'standard') => {
        const urls = state.links.split('\n').map(s => s.trim()).filter(Boolean);
        if (!urls.length) {
            setLog(l => l + '\nNo Amazon links provided.');
            alert('Please enter Amazon product URLs first.');
            return;
        }

        setLog(l => l + `\nStarting ${listType.toUpperCase()}-List automation for ${urls.length} URLs...`);
        setLog(l => l + '\n📋 STEP 1: Opening Amazon pages to scrape product data...');

        try {
            // Initialize status map
            const initialStatus: Record<string, { url: string, status: string, message: string }> = {};
            urls.forEach(url => {
                const asin = extractAsin(url);
                if (asin) {
                    initialStatus[asin] = {
                        url,
                        status: 'pending',
                        message: 'Waiting to scrape...'
                    };
                }
            });
            setStatusMap(initialStatus);

            // Store the list type and URLs for the automation
            await chrome.storage.local.set({
                automationType: listType,
                pendingUrls: urls,
                automationInProgress: true,
                automationStep: 'scrape_amazon',
                amazonLinksStatus: Object.values(initialStatus) // Track status like bulk_post
            });

            // Process each URL - open Amazon tab to scrape
            for (let i = 0; i < urls.length; i++) {
                const url = urls[i];
                const asin = extractAsin(url);
                setLog(l => l + `\n[${i + 1}/${urls.length}] Opening Amazon: ${url}`);

                if (asin) {
                    setLog(l => l + `\n  🔑 ASIN: ${asin}`);
                }

                // Store individual product data with ASIN
                await chrome.storage.local.set({
                    [`pendingProduct_${i}`]: {
                        url,
                        amazonUrl: url,
                        asin: asin || `unknown_${i}`,
                        index: i,
                        total: urls.length,
                        listType,
                        scrapingComplete: false,
                        status: 'pending'
                    }
                });

                // Open Amazon tab to scrape data
                setTimeout(() => {
                    setLog(l => l + `\n  → Scraping product data...`);
                    chrome.tabs.create({
                        url: url,
                        active: i === 0 // Only make first tab active
                    });
                }, i * 2000); // 2 second delay between tabs to avoid overwhelming
            }

            setLog(l => l + `\n✓ Opened ${urls.length} Amazon tabs for scraping`);
            setLog(l => l + '\n⏳ Please wait for all tabs to finish scraping...');
            setLog(l => l + '\n📌 STEP 2 will start automatically: Opening eBay and searching');
        } catch (e) {
            setLog(l => l + `\nError: ${String(e)}`);
            alert('Automation failed: ' + String(e));
        }
    };

    // Handler for each list type
    const handleOptiList = () => startEbayAutomation('opti');
    const handleSeoList = () => startEbayAutomation('seo');
    const handleStandardList = () => startEbayAutomation('standard');

    // Listen for messages from content scripts
    React.useEffect(() => {
        const messageListener = (message: any, _sender: any, sendResponse: (response?: any) => void) => {
            console.log('📨 Received message in BulkLister:', message);

            if (message.type === 'amazonDataScraped') {
                const { asin, data } = message;
                setLog(l => l + `\n✅ Scraped: ${data.title?.substring(0, 40)}... (ASIN: ${asin})`);
                setStatusMap(prev => ({
                    ...prev,
                    [asin]: {
                        url: data.amazonUrl,
                        status: 'scraped',
                        message: 'Data scraped successfully'
                    }
                }));
            } else if (message.type === 'itemListed') {
                const { asin, message: msg } = message;
                setLog(l => l + `\n🎉 Listed: ${msg} (ASIN: ${asin})`);
                setStatusMap(prev => ({
                    ...prev,
                    [asin]: {
                        ...prev[asin],
                        status: 'listed',
                        message: msg
                    }
                }));
            } else if (message.type === 'itemFailed') {
                const { asin, message: msg } = message;
                setLog(l => l + `\n❌ Failed: ${msg} (ASIN: ${asin})`);
                setStatusMap(prev => ({
                    ...prev,
                    [asin]: {
                        ...prev[asin],
                        status: 'failed',
                        message: msg
                    }
                }));
            }

            sendResponse({ received: true });
        };

        chrome.runtime.onMessage.addListener(messageListener);

        return () => {
            chrome.runtime.onMessage.removeListener(messageListener);
        };
    }, []);

    // Progress bar width
    const progress = Math.min(100, Math.max(0, state.percent));
    return (
        <div className="bl-root">
            <header className="bl-header">
                <SectionHeader>Bulk Lister</SectionHeader>
            </header>
            <main className="bl-main">
                <Card style={{ maxWidth: 1100, width: '100%' }}>
                    <form className="bl-form" autoComplete="off" onSubmit={e => e.preventDefault()}>
                        <div className="bl-form-row">
                            <label htmlFor="bl-links" className="bl-label">Amazon Links</label>
                            <textarea
                                id="bl-links"
                                className="bl-textarea"
                                rows={5}
                                value={state.links}
                                onChange={e => setState(s => ({ ...s, links: e.target.value }))}
                                aria-label="Amazon Links (newline separated)"
                                spellCheck={false}
                            />
                        </div>
                        <div className="bl-form-row bl-btn-row bl-btn-row-wide">
                            <Button variant="accent" onClick={handleOptiList} style={{ fontSize: '1rem', padding: '10px 18px', minWidth: 120 }}>Opti-List</Button>
                            <Button variant="secondary" onClick={handleSeoList} style={{ fontSize: '1rem', padding: '10px 18px', minWidth: 120 }}>Seo-List</Button>
                            <Button variant="secondary" onClick={handleStandardList} style={{ fontSize: '1rem', padding: '10px 18px', minWidth: 120 }}>Standard-List</Button>
                            <Button variant="yellow" onClick={handleClear} ariaLabel="Clear Links" style={{ fontSize: '1rem', padding: '10px 18px', minWidth: 120 }}>Clear Links</Button>
                            <Button variant="yellow" onClick={handleReset} ariaLabel="Reset & Terminate" style={{ fontSize: '1rem', padding: '10px 18px', minWidth: 120 }}>Reset & Terminate</Button>
                            <Button variant="secondary" onClick={handleStatusReport} ariaLabel="Status Report" style={{ fontSize: '1rem', padding: '10px 18px', minWidth: 120 }}>Status Report</Button>
                        </div>
                        <div className="bl-form-row bl-btn-row bl-pause-resume-row" style={{ alignItems: 'center', display: 'flex' }}>
                            <Button
                                variant="secondary"
                                onClick={handlePause}
                                ariaLabel="Pause"
                                disabled={state.paused}
                                style={{ fontSize: '1rem', padding: '10px 18px', minWidth: 120, background: '#e74c3c', color: '#fff', marginRight: 16 }}
                            >
                                Pause
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={handleResume}
                                ariaLabel="Resume"
                                disabled={!state.paused}
                                style={{ fontSize: '1rem', padding: '10px 18px', minWidth: 120, background: '#2ecc40', color: '#fff', marginRight: 24 }}
                            >
                                Resume
                            </Button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <label htmlFor="bl-position-input" style={{ fontSize: '1rem', marginRight: 4, marginBottom: 0 }}>Position:</label>
                                <input
                                    id="bl-position-input"
                                    type="number"
                                    min={1}
                                    max={state.total || 1}
                                    value={state.position}
                                    onChange={e => setState(s => ({ ...s, position: Number(e.target.value) }))}
                                    style={{ width: 60, fontSize: '1rem', marginRight: 4, padding: '2px 6px' }}
                                />
                                <span style={{ fontSize: '1rem', marginRight: 4 }}>/ {state.total || 1}</span>
                                <Button
                                    variant="secondary"
                                    onClick={handleStatusReport}
                                    ariaLabel="Status Report"
                                    style={{ fontSize: '0.8rem', padding: '2px 10px', minWidth: 0, height: 28, marginLeft: 4, opacity: 0.7, borderRadius: 4 }}
                                >
                                    Status Report
                                </Button>
                            </div>
                        </div>
                        <div className="bl-form-row bl-grid" style={{ fontSize: '1rem' }}>
                            <div>
                                <label htmlFor="bl-thread" className="bl-label">Thread Count</label>
                                <Select
                                    id="bl-thread"
                                    value={state.threadCount}
                                    onChange={e => setState(s => ({ ...s, threadCount: Number(e.target.value) }))}
                                    aria-label="Thread Count"
                                >
                                    {Array.from({ length: 10 }, (_, i) => (
                                        <option key={i + 1} value={i + 1}>{i + 1}</option>
                                    ))}
                                </Select>
                            </div>
                            <div>
                                <label htmlFor="bl-min" className="bl-label">Min Price</label>
                                <Input
                                    id="bl-min"
                                    type="number"
                                    min={0}
                                    value={state.minPrice}
                                    onChange={e => setState(s => ({ ...s, minPrice: e.target.value }))}
                                    aria-label="Min Price"
                                />
                            </div>
                            <div>
                                <label htmlFor="bl-max" className="bl-label">Max Price</label>
                                <Input
                                    id="bl-max"
                                    type="number"
                                    min={0}
                                    value={state.maxPrice}
                                    onChange={e => setState(s => ({ ...s, maxPrice: e.target.value }))}
                                    aria-label="Max Price"
                                />
                            </div>
                        </div>
                        <div className="bl-form-row bl-checkboxes" style={{ fontSize: '1rem' }}>
                            <Checkbox id="bl-fba" label="FBA Only" checked={state.fbaOnly} onChange={v => setState(s => ({ ...s, fbaOnly: v }))} />
                            <Checkbox id="bl-close-err" label="Close Errored Listings" checked={state.closeErrored} onChange={v => setState(s => ({ ...s, closeErrored: v }))} />
                            <Checkbox id="bl-china" label="List Chinese Sellers Only (EU ONLY)" checked={state.chineseSellers} onChange={v => setState(s => ({ ...s, chineseSellers: v }))} />
                            <Checkbox id="bl-gpsr" label="Add GPSR" checked={state.addGpsr} onChange={v => setState(s => ({ ...s, addGpsr: v }))} />
                            <Checkbox id="bl-slow" label="Optimize for slow computers" checked={state.optimizeSlow} onChange={v => setState(s => ({ ...s, optimizeSlow: v }))} />
                        </div>
                        <div className="bl-form-row bl-progress-row" style={{ fontSize: '1rem', marginTop: 24, marginBottom: 8 }}>
                            <div className="bl-progress-bar-outer" aria-label="Progress" style={{ height: 16 }}>
                                <div
                                    className="bl-progress-bar-inner"
                                    style={{ width: `${progress}%`, height: 16 }}
                                    aria-valuenow={progress}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    role="progressbar"
                                />
                            </div>
                            <span className="bl-progress-text" style={{ fontSize: '1rem', marginLeft: 18 }}>{progress}%</span>
                            <span className="bl-progress-counts" style={{ fontSize: '1rem', marginLeft: 18 }}>
                                <span className="bl-success">{state.success} ✓</span> /
                                <span className="bl-failed">{state.failed} ✗</span>
                            </span>
                        </div>
                        {/* Hidden Add-Links section */}
                        <div className="bl-add-links" style={{ display: "none" }}>
                            <label htmlFor="bl-add-links" className="bl-label">Add Links</label>
                            <textarea id="bl-add-links" className="bl-textarea" rows={3} />
                            <div className="bl-form-row bl-btn-row">
                                <Button variant="secondary">Import</Button>
                                <Button variant="accent">Add</Button>
                            </div>
                        </div>
                        <div className="bl-form-row">
                            <pre style={{ background: '#f8f8f8', color: '#333', fontSize: 13, padding: 10, borderRadius: 6, minHeight: 40, marginTop: 10, maxHeight: 200, overflow: 'auto' }}>{log}</pre>
                        </div>
                    </form>
                </Card>
            </main>
        </div>
    );
};

// ...existing code...
export default BulkLister;
