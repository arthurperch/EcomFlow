/**
 * Competitor Research Content Script
 * Scans eBay seller stores and extracts high-selling products
 */

console.log('🔍 Competitor Research content script loaded on:', window.location.href);

interface ProductData {
    title: string;
    price: string;
    soldCount: number;
    imageUrl: string;
    productUrl: string;
    sellerName: string;
    watcherCount?: number;
    listingDate?: string;
    soldDate?: string;           // NEW: When item was sold (e.g., "Oct 6, 2025")
    soldTimestamp?: number;      // NEW: Timestamp for date calculations
    daysAgo?: number;            // NEW: Days since sold
    itemLocation?: string;
    shippingCost?: string;
    condition?: string;
    recentlySold?: number;       // Sold in last 30 days
    dailySalesRate?: number;
    lifetimeSold?: number;       // NEW: Total sold across all listings
}

let scanInProgress = false;
let overlayButtons: HTMLElement | null = null;

/**
 * Extract sold count from text like "123 sold" or "1,234 sold" or "123+ sold"
 * Also handles "Almost gone" and other eBay urgency messages
 */
function extractSoldCount(text: string): number {
    if (!text) return 0;

    const patterns = [
        /(\d+(?:,\d+)*)\+?\s*sold/i,              // "123 sold" or "123+ sold"
        /sold:\s*(\d+(?:,\d+)*)/i,                // "Sold: 123"
        /(\d+(?:,\d+)*)\s*items?\s*sold/i,        // "123 items sold"
        /Quantity\s*sold:\s*(\d+(?:,\d+)*)/i,     // "Quantity sold: 123"
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            return parseInt(match[1].replace(/,/g, ''), 10);
        }
    }

    return 0;
}

/**
 * Extract watcher count from text like "123 watchers"
 */
function extractWatcherCount(text: string): number {
    if (!text) return 0;

    const patterns = [
        /(\d+(?:,\d+)*)\s*watchers?/i,
        /(\d+(?:,\d+)*)\s*watching/i,
        /(\d+(?:,\d+)*)\s*people?\s*watching/i
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            return parseInt(match[1].replace(/,/g, ''), 10);
        }
    }

    return 0;
}

/**
 * Extract sold date from eBay listing
 * Formats: "Sold Oct 6, 2025", "Sold Oct 6", "3d ago", "2h ago"
 */
function extractSoldDate(element: Element): { dateString?: string; timestamp?: number; daysAgo?: number } {
    try {
        // Try multiple selectors for sold date - eBay uses different classes
        // Based on actual eBay HTML: <span class="su-styled-text positive default">Sold Jul 27, 2025</span>
        const selectors = [
            '.su-styled-text.positive.default',  // EXACT match from eBay HTML!
            '.su-styled-text.positive',          // Fallback without .default
            '.su-styled-text',                   // Even broader fallback
            '.positive.default',                 // Without su-styled-text
            '.positive',                         // Just .positive
            '.POSITIVE',                         // Uppercase variant
            '.s-item__title--tag',               // Older eBay class
            '.s-item__purchase-options-with-icon',
            '.s-item__detail--primary',
            '.s-item__hotness',
            'span[class*="POSITIVE"]',
            'span[class*="positive"]',
            '.s-item__subtitle',
            '.s-item__info',
            'span[style*="color"]',
        ];

        let text = '';
        for (const selector of selectors) {
            const el = element.querySelector(selector);
            if (el) {
                const content = el.textContent?.trim() || '';
                console.log(`   🔍 Checking selector "${selector}": "${content.substring(0, 50)}..."`);
                if (content.toLowerCase().includes('sold')) {
                    text = content;
                    console.log(`   ✅✅✅ FOUND! Selector "${selector}" matched: "${text}"`);
                    break;
                }
            }
        }

        // Also check all text within the item element - MOST RELIABLE
        if (!text) {
            console.log(`   🔍 No selector matched, searching entire element text...`);
            const allText = element.textContent || '';

            // Try multiple patterns
            // Pattern 1: "Sold Jul 27, 2025" or "Sold Jul 27"
            let soldMatch = allText.match(/Sold\s+[A-Za-z]+\s+\d+(?:,\s+\d{4})?/i);

            // Pattern 2: Look for just "Sold" followed by date
            if (!soldMatch) {
                soldMatch = allText.match(/Sold[\s:]+([A-Za-z]{3,9})\s+(\d{1,2})(?:,?\s+(\d{4}))?/i);
            }

            if (soldMatch) {
                text = soldMatch[0];
                console.log(`   ✅ Found sold date in element text: "${text}"`);
            } else {
                console.log(`   ❌ No "Sold" pattern found in element text`);
            }
        }

        if (!text) {
            console.log(`   ❌ NO SOLD DATE FOUND for this item`);
            return {};
        }

        console.log(`   📅 Processing sold date text: "${text}"`);

        // Pattern 1: "Sold Oct 6, 2025" or "Sold Oct 6"
        const dateMatch = text.match(/Sold\s+([A-Za-z]+)\s+(\d+)(?:,\s+(\d{4}))?/i);
        if (dateMatch) {
            const monthStr = dateMatch[1];
            const day = parseInt(dateMatch[2]);
            const year = dateMatch[3] ? parseInt(dateMatch[3]) : new Date().getFullYear();

            const months: Record<string, number> = {
                'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
                'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
            };

            const month = months[monthStr.toLowerCase().slice(0, 3)];
            if (month !== undefined) {
                const soldDate = new Date(year, month, day);
                const now = new Date();
                const daysAgo = Math.floor((now.getTime() - soldDate.getTime()) / (1000 * 60 * 60 * 24));

                console.log(`✅ Parsed sold date: ${monthStr} ${day}, ${year} (${daysAgo} days ago)`);

                return {
                    dateString: `${monthStr} ${day}, ${year}`,
                    timestamp: soldDate.getTime(),
                    daysAgo: Math.max(0, daysAgo)
                };
            }
        }

        // Pattern 2: "3d ago", "2h ago", "1w ago"
        const relativeMatch = text.match(/(\d+)([dhw])\s*ago/i);
        if (relativeMatch) {
            const value = parseInt(relativeMatch[1]);
            const unit = relativeMatch[2].toLowerCase();

            let daysAgo = 0;
            if (unit === 'd') daysAgo = value;
            else if (unit === 'h') daysAgo = 0; // Same day
            else if (unit === 'w') daysAgo = value * 7;

            const now = new Date();
            const soldDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));

            console.log(`✅ Parsed relative sold date: ${value}${unit} ago (${daysAgo} days ago)`);

            return {
                dateString: `${value}${unit} ago`,
                timestamp: soldDate.getTime(),
                daysAgo
            };
        }

    } catch (error) {
        console.error('Error extracting sold date:', error);
    }

    return {};
}/**
 * Calculate daily sales rate from sold count
 * This is an estimate based on typical eBay listing durations
 */
function calculateDailySalesRate(soldCount: number): number {
    if (soldCount === 0) return 0;

    // Assume average listing age of 30 days
    // This is a rough estimate - actual listing dates would be better
    const estimatedDays = 30;
    return parseFloat((soldCount / estimatedDays).toFixed(2));
}

/**
 * Add visual overlay showing sold count on product image
 */
function addSoldCountOverlay(element: Element, soldCount: number): void {
    try {
        // Find the image wrapper
        const imgWrapper = element.querySelector('.s-item__image-wrapper, .s-item__image-section');
        if (!imgWrapper) return;

        // Check if overlay already exists
        if (imgWrapper.querySelector('.ecomflow-sold-overlay')) return;

        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'ecomflow-sold-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(40, 167, 69, 0.95);
            color: white;
            font-size: 32px;
            font-weight: bold;
            padding: 12px 24px;
            border-radius: 50%;
            width: 80px;
            height: 80px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
            pointer-events: none;
            animation: ecomflowPulse 0.5s ease-in-out;
        `;
        overlay.textContent = soldCount.toString();

        // Make sure wrapper has relative positioning
        const wrapper = imgWrapper as HTMLElement;
        if (window.getComputedStyle(wrapper).position === 'static') {
            wrapper.style.position = 'relative';
        }

        // Add scanning highlight to the entire item to show it's being scanned RIGHT NOW
        (element as HTMLElement).style.cssText += `
            outline: 3px solid #2ecc40;
            outline-offset: 2px;
            background: rgba(46, 204, 64, 0.05);
            transition: all 0.3s ease;
        `;

        // Remove highlight after 1 second
        setTimeout(() => {
            (element as HTMLElement).style.outline = '';
            (element as HTMLElement).style.outlineOffset = '';
            (element as HTMLElement).style.background = '';
        }, 1000);

        // Add animation keyframes if not already added
        if (!document.getElementById('ecomflow-animations')) {
            const style = document.createElement('style');
            style.id = 'ecomflow-animations';
            style.textContent = `
                @keyframes ecomflowPulse {
                    0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
                    50% { transform: translate(-50%, -50%) scale(1.1); }
                    100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                }
                @keyframes ecomflowScanHighlight {
                    0% { outline-color: #2ecc40; background: rgba(46, 204, 64, 0.2); }
                    100% { outline-color: #2ecc40; background: rgba(46, 204, 64, 0.05); }
                }
                .ecomflow-scan-progress {
                    position: fixed !important;
                    top: 50% !important;
                    left: 50% !important;
                    transform: translate(-50%, -50%) !important;
                    z-index: 999999 !important;
                    background: white !important;
                    padding: 40px 60px !important;
                    border-radius: 16px !important;
                    box-shadow: 0 12px 48px rgba(0,0,0,0.4) !important;
                    text-align: center !important;
                    min-width: 400px !important;
                    border: 3px solid #3498db !important;
                }
                .ecomflow-scan-progress .spinner {
                    width: 80px;
                    height: 80px;
                    border: 8px solid #f3f3f3;
                    border-top: 8px solid #3498db;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                    margin: 0 auto 25px;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }

        wrapper.appendChild(overlay);
    } catch (error) {
        console.error('Error adding sold overlay:', error);
    }
}

/**
 * Show scan progress indicator
 */
function showScanProgress(found: number, current: number, total: number): HTMLElement {
    let progress = document.getElementById('ecomflow-scan-progress') as HTMLElement;

    if (!progress) {
        progress = document.createElement('div');
        progress.id = 'ecomflow-scan-progress';
        progress.className = 'ecomflow-scan-progress';
        document.body.appendChild(progress);
    }

    progress.innerHTML = `
        <div class="spinner"></div>
        <div style="font-size: 20px; font-weight: bold; color: #333; margin-bottom: 15px;">
            🔍 Scanning Products...
        </div>
        <div style="font-size: 48px; font-weight: bold; color: #28a745; margin-bottom: 10px; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            ${found}
        </div>
        <div style="font-size: 16px; color: #666; margin-bottom: 15px;">
            ✅ Products with sales found
        </div>
        <div style="font-size: 16px; color: #999; margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
            📊 Progress: ${current} / ${total} items scanned
        </div>
        <div style="font-size: 14px; color: #aaa; margin-top: 10px;">
            ${Math.round((current / total) * 100)}% Complete
        </div>
    `;

    return progress;
}

/**
 * Show "Starting scan..." message
 */
function showStartingScanMessage(): void {
    let progress = document.getElementById('ecomflow-scan-progress') as HTMLElement;

    if (!progress) {
        progress = document.createElement('div');
        progress.id = 'ecomflow-scan-progress';
        progress.className = 'ecomflow-scan-progress';
        document.body.appendChild(progress);
    }

    progress.innerHTML = `
        <div class="spinner"></div>
        <div style="font-size: 22px; font-weight: bold; color: #333; margin-bottom: 15px;">
            🚀 Starting Scan...
        </div>
        <div style="font-size: 16px; color: #666;">
            Preparing to scan sold items
        </div>
    `;
}

/**
 * Show completion message
 */
function showCompletionMessage(count: number): void {
    let progress = document.getElementById('ecomflow-scan-progress') as HTMLElement;

    if (!progress) {
        progress = document.createElement('div');
        progress.id = 'ecomflow-scan-progress';
        progress.className = 'ecomflow-scan-progress';
        document.body.appendChild(progress);
    }

    progress.innerHTML = `
        <div style="font-size: 64px; margin-bottom: 20px;">✅</div>
        <div style="font-size: 24px; font-weight: bold; color: #28a745; margin-bottom: 15px;">
            Scan Complete!
        </div>
        <div style="font-size: 40px; font-weight: bold; color: #333; margin-bottom: 10px;">
            ${count}
        </div>
        <div style="font-size: 16px; color: #666; margin-bottom: 10px;">
            Unique products found
        </div>
        <div style="font-size: 14px; color: #999;">
            (Duplicates combined)
        </div>
    `;
}

/**
 * Hide scan progress indicator
 */
function hideScanProgress(): void {
    const progress = document.getElementById('ecomflow-scan-progress');
    if (progress) {
        progress.remove();
    }
}

/**
 * Extract product data from a listing element
 */
function extractProductFromElement(el: Element, sellerName: string): ProductData | null {
    try {
        // DEBUG: Log the element structure
        console.log('🔍 Scanning item element:', el.className);

        // UPDATED SELECTORS based on actual eBay HTML structure
        // Title: <span class="su-styled-text primary default">
        const titleEl = el.querySelector('.su-styled-text.primary.default, span.su-styled-text.primary, .s-item__title, h3.s-item__title') as HTMLElement;
        const title = titleEl?.textContent?.trim() || '';

        // Price: <span class="su-styled-text positive bold large-1 s-card__price">
        const priceEl = el.querySelector('.s-card__price, span.su-styled-text.positive.bold, .s-item__price, span.s-item__price') as HTMLElement;
        const price = priceEl?.textContent?.trim() || '0';

        // Image: <img class="s-card__image">
        const imgEl = el.querySelector('.s-card__image, img.s-card__image, .s-item__image-img, img.s-item__image-img') as HTMLImageElement;
        const imageUrl = imgEl?.src || imgEl?.getAttribute('data-src') || '';

        // Product URL: <a class="su-link">
        const linkEl = el.querySelector('a.su-link, a.s-item__link') as HTMLAnchorElement;
        const productUrl = linkEl?.href || '';

        console.log(`   📝 Title: ${title.substring(0, 60)}${title.length > 60 ? '...' : ''}`);
        console.log(`   💵 Price: $${price}`);
        console.log(`   🖼️ Image: ${imageUrl ? 'Found' : 'NOT FOUND'}`);
        console.log(`   🔗 URL: ${productUrl ? 'Found' : 'NOT FOUND'}`);

        // Try multiple selectors for sold count
        const soldEl = el.querySelector('.s-item__hotness, .s-item__quantity-sold, .vi-qty-purchases, .s-item__quantitySold') as HTMLElement;
        let soldText = soldEl?.textContent?.trim() || '';

        // CRITICAL FIX: On sold items pages, the "Sold" text is NOT in these classes
        // Search the entire element text content for sold information
        if (!soldText || soldText === '') {
            console.log(`   🔍 No sold text in specific elements, searching entire element...`);

            // Try to find ANY text with "sold" in it - MULTIPLE PATTERNS
            const allText = el.textContent || '';
            console.log(`   📄 Element text (first 300 chars): "${allText.substring(0, 300)}..."`);

            // Pattern 1: "123 sold" or "123+ sold"
            let soldMatch = allText.match(/(\d+\+?\s+sold)/i);

            // Pattern 2: "Sold Jul 27, 2025" or "Sold Jul 27"
            if (!soldMatch) {
                soldMatch = allText.match(/(sold\s+[A-Za-z]+\s+\d+(?:,\s+\d{4})?)/i);
            }

            // Pattern 3: Just find "Sold" followed by anything
            if (!soldMatch) {
                soldMatch = allText.match(/(sold[^\n]{0,30})/i);
            }

            if (soldMatch) {
                soldText = soldMatch[0];
                console.log(`   ✅ Found sold text in element content: "${soldText}"`);
            } else {
                console.log(`   ❌❌❌ NO SOLD TEXT FOUND AT ALL in element`);
                console.log(`   📄 Full element text: "${allText}"`);
            }
        } else {
            console.log(`   ✅ Found sold text in specific element: "${soldText}"`);
        }

        const soldCount = extractSoldCount(soldText);
        console.log(`   📊 Extracted soldCount: ${soldCount}`);

        // Extract sold date - NEW!
        const soldDateInfo = extractSoldDate(el);
        console.log(`   📅 Extracted soldDate:`, soldDateInfo);

        // On sold items pages, items don't show sold count - they show sold DATE
        // If we find a sold date but no sold count, treat it as 1 sold
        const effectiveSoldCount = soldCount > 0 ? soldCount : (soldDateInfo.dateString ? 1 : 0);
        console.log(`   🎯 Effective sold count: ${effectiveSoldCount} (soldCount=${soldCount}, hasDate=${!!soldDateInfo.dateString})`);

        if (effectiveSoldCount > 0) {
            console.log(`   ✅ FOUND SOLD ITEM: ${soldCount > 0 ? soldCount + ' items' : 'Yes'} ${soldDateInfo.dateString ? `(Sold: ${soldDateInfo.dateString})` : ''}`);
        } else {
            console.log(`   ❌ NO SOLD DATA - SKIPPING THIS ITEM`);
        }

        // Extract watcher count
        const watcherEl = el.querySelector('.s-item__watchcount, .vi-HBI-watchcount') as HTMLElement;
        const watcherText = watcherEl?.textContent?.trim() || '';
        const watcherCount = extractWatcherCount(watcherText);

        // Extract condition
        const conditionEl = el.querySelector('.s-item__subtitle, .SECONDARY_INFO') as HTMLElement;
        const condition = conditionEl?.textContent?.trim() || 'Not specified';

        // Extract shipping cost
        const shippingEl = el.querySelector('.s-item__shipping, .s-item__freeXDays, .vi-acc-del-range') as HTMLElement;
        const shippingCost = shippingEl?.textContent?.trim() || '';

        // Extract location
        const locationEl = el.querySelector('.s-item__location, .s-item__itemLocation') as HTMLElement;
        const itemLocation = locationEl?.textContent?.trim().replace('From', '').trim() || '';

        // soldDateInfo already extracted above

        if (!title || !productUrl) {
            return null;
        }

        // Calculate daily sales rate - use effectiveSoldCount
        const dailySalesRate = calculateDailySalesRate(effectiveSoldCount);

        // Add visual overlay if product has sales
        if (effectiveSoldCount > 0) {
            addSoldCountOverlay(el, effectiveSoldCount);
        }

        return {
            title,
            price,
            soldCount: effectiveSoldCount,  // Use effective count
            imageUrl,
            productUrl,
            sellerName,
            watcherCount,
            condition,
            shippingCost,
            itemLocation,
            dailySalesRate,
            soldDate: soldDateInfo.dateString,          // NEW: Sold date string
            soldTimestamp: soldDateInfo.timestamp,      // NEW: Timestamp for calculations
            daysAgo: soldDateInfo.daysAgo,              // NEW: Days since sold
            recentlySold: soldCount,                    // Assume all are recent for now
            lifetimeSold: soldCount                     // NEW: Lifetime sold (same as soldCount for individual items)
        };
    } catch (error) {
        console.error('Error extracting product data:', error);
        return null;
    }
}

/**
 * Deduplicate products - combine items with same title and sum quantities
 */
function deduplicateProducts(products: ProductData[]): ProductData[] {
    const productMap = new Map<string, ProductData>();

    for (const product of products) {
        // Create a normalized key for matching duplicates
        // Remove extra spaces, special chars, and convert to lowercase
        const normalizedTitle = product.title
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        console.log(`🔍 Processing: "${product.title.substring(0, 50)}..." → Key: "${normalizedTitle.substring(0, 40)}..."`);

        if (productMap.has(normalizedTitle)) {
            // DUPLICATE FOUND - Combine quantities
            const existing = productMap.get(normalizedTitle)!;
            const newQty = (existing.soldCount || 0) + (product.soldCount || 0);

            console.log(`   🔁 DUPLICATE! Combining quantities: ${existing.soldCount} + ${product.soldCount} = ${newQty}`);

            // Update quantity
            existing.soldCount = newQty;
            existing.lifetimeSold = newQty;

            // Keep the most recent sold date
            if (product.soldTimestamp && (!existing.soldTimestamp || product.soldTimestamp > existing.soldTimestamp)) {
                existing.soldDate = product.soldDate;
                existing.soldTimestamp = product.soldTimestamp;
                existing.daysAgo = product.daysAgo;
                console.log(`   📅 Updated to more recent date: ${product.soldDate}`);
            }

            // Use the lower price (best deal)
            if (product.price < existing.price) {
                existing.price = product.price;
                console.log(`   💰 Updated to lower price: $${product.price}`);
            }
        } else {
            // NEW PRODUCT - Add to map
            console.log(`   ✨ NEW product added to map`);
            productMap.set(normalizedTitle, { ...product });
        }
    }

    const result = Array.from(productMap.values());

    // Sort by total quantity sold (highest first)
    result.sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));

    console.log(`\n📊 DEDUPLICATION SUMMARY:`);
    console.log(`   Original items: ${products.length}`);
    console.log(`   Unique products: ${result.length}`);
    console.log(`   Duplicates removed: ${products.length - result.length}`);
    console.log(`   Total quantity: ${result.reduce((sum, p) => sum + (p.soldCount || 0), 0)}`);

    // Show top 5 products by quantity
    console.log(`\n🏆 TOP 5 PRODUCTS BY QUANTITY:`);
    result.slice(0, 5).forEach((p, i) => {
        console.log(`   ${i + 1}. "${p.title.substring(0, 50)}..." - Qty: ${p.soldCount} - $${p.price}`);
    });

    return result;
}

/**
 * Scan the current page for products
 */
async function scanCurrentPage(): Promise<ProductData[]> {
    console.log('📊 Scanning current page for products...');

    // Show "Starting scan" message immediately
    showStartingScanMessage();

    const products: ProductData[] = [];

    // Check storage for seller name
    const storage = await chrome.storage.local.get(['competitorScanSeller', 'competitorMinSales']);
    const sellerName = storage.competitorScanSeller || 'Unknown';
    const minSales = storage.competitorMinSales || 0;

    // Try different selectors for product listings - UPDATED WITH REAL EBAY CLASSES
    const selectors = [
        '.su-card-container__content',    // NEW: Modern eBay card structure
        '.su-card-container',              // NEW: Card container
        '.s-item',                         // Classic selector
        '.srp-results .s-item',
        '.b-list__items_nofooter .s-item',
        'li.s-item'
    ];

    let listingElements: Element[] = [];
    for (const selector of selectors) {
        const elements = Array.from(document.querySelectorAll(selector));
        if (elements.length > 0) {
            listingElements = elements;
            console.log(`Found ${elements.length} listings using selector: ${selector}`);
            break;
        }
    }

    if (listingElements.length === 0) {
        console.log('No product listings found on this page');
        hideScanProgress();
        return products;
    }

    // Show progress indicator
    let foundCount = 0;
    const totalItems = listingElements.length;

    // Extract data from each listing with visual feedback
    console.log(`🔍 Starting to scan ${listingElements.length} items...`);
    console.log(`📊 Filter settings: minSales=${minSales}, sellerName=${sellerName}`);

    for (let i = 0; i < listingElements.length; i++) {
        const el = listingElements[i];

        console.log(`\n========== ITEM ${i + 1}/${totalItems} ==========`);

        // Update progress
        showScanProgress(foundCount, i + 1, totalItems);

        // Scroll item into view so user can see it being scanned
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Add pulsing highlight to show this item is being scanned RIGHT NOW
        const elHtml = el as HTMLElement;
        elHtml.style.cssText += `
            outline: 4px solid #2ecc40 !important;
            outline-offset: 4px !important;
            background: rgba(46, 204, 64, 0.15) !important;
            box-shadow: 0 0 20px rgba(46, 204, 64, 0.5) !important;
            transform: scale(1.02) !important;
            transition: all 0.3s ease !important;
            z-index: 9999 !important;
            position: relative !important;
        `;

        const product = extractProductFromElement(el, sellerName);

        // Remove highlight after extraction
        setTimeout(() => {
            elHtml.style.outline = '';
            elHtml.style.outlineOffset = '';
            elHtml.style.background = '';
            elHtml.style.boxShadow = '';
            elHtml.style.transform = '';
        }, 800);

        console.log(`📦 Product extraction result:`, product ? {
            title: product.title?.substring(0, 50) + '...',
            soldCount: product.soldCount,
            soldDate: product.soldDate,
            daysAgo: product.daysAgo,
            price: product.price
        } : 'NULL');

        if (product) {
            console.log(`🔍 Checking filter: product.soldCount (${product.soldCount}) >= minSales (${minSales}) = ${product.soldCount >= minSales}`);

            if (product.soldCount >= minSales) {
                products.push(product);
                foundCount++;
                console.log(`✅✅✅ ADDED TO RESULTS! Item #${foundCount}:`, {
                    title: product.title.substring(0, 50) + '...',
                    soldCount: product.soldCount,
                    soldDate: product.soldDate || 'No date found',
                    daysAgo: product.daysAgo !== undefined ? `${product.daysAgo} days` : 'Unknown',
                    price: product.price
                });

                // Update progress with new count
                showScanProgress(foundCount, i + 1, totalItems);
            } else {
                console.log(`❌❌❌ FILTERED OUT: soldCount (${product.soldCount}) < minSales (${minSales})`);
            }
        } else {
            console.log(`❌ Product extraction returned NULL`);
        }

        // Small delay to make scanning visible (50ms per item)
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log(`📦 Extracted ${products.length} products with ${minSales}+ sales`);
    console.log(`📅 Products with dates: ${products.filter(p => p.soldDate).length}/${products.length}`);

    // DEDUPLICATE: Combine duplicate items and sum their quantities
    console.log(`🔄 Deduplicating ${products.length} products...`);
    const deduplicatedProducts = deduplicateProducts(products);
    console.log(`✅ After deduplication: ${deduplicatedProducts.length} unique products`);
    console.log(`📊 Total quantity sold: ${deduplicatedProducts.reduce((sum, p) => sum + (p.soldCount || 0), 0)}`);

    // Show completion message
    showCompletionMessage(deduplicatedProducts.length);

    // Hide progress after showing completion for 2 seconds
    setTimeout(() => hideScanProgress(), 2000);

    return deduplicatedProducts;
}

/**
 * Check if there's a next page button
 */
function hasNextPage(): boolean {
    const nextButton = document.querySelector('a.pagination__next, a[aria-label*="Next"]');
    return !!nextButton && !nextButton.classList.contains('disabled');
}

/**
 * Click the next page button
 */
function goToNextPage(): boolean {
    const nextButton = document.querySelector('a.pagination__next, a[aria-label*="Next"]') as HTMLAnchorElement;
    if (nextButton && !nextButton.classList.contains('disabled')) {
        console.log('📄 Going to next page...');
        nextButton.click();
        return true;
    }
    return false;
}

/**
 * Redirect to SOLD items filter page and start scanning
 */
async function redirectToSoldItemsAndScan() {
    const currentUrl = window.location.href;

    // Extract seller username from current URL
    let sellerName = '';

    // Pattern 1: /usr/username
    const usrMatch = currentUrl.match(/\/usr\/([^/?]+)/);
    if (usrMatch) {
        sellerName = usrMatch[1];
    }

    // Pattern 2: /str/storename
    const strMatch = currentUrl.match(/\/str\/([^/?]+)/);
    if (strMatch) {
        sellerName = strMatch[1];
    }

    // Pattern 3: Already on search page with _ssn parameter
    const ssnMatch = currentUrl.match(/[?&]_ssn=([^&]+)/);
    if (ssnMatch) {
        sellerName = decodeURIComponent(ssnMatch[1]);
    }

    if (!sellerName) {
        alert('❌ Could not detect seller username from current page URL');
        console.error('Could not extract seller name from URL:', currentUrl);
        return;
    }

    console.log('🔍 Redirecting to SOLD items for seller:', sellerName);

    // Build SOLD items URL with all filters
    const soldUrl = `https://www.ebay.com/sch/i.html?_ssn=${encodeURIComponent(sellerName)}&LH_Complete=1&LH_Sold=1&_sop=13&rt=nc&_ipg=200`;

    // Set flag in storage so we know to start scanning after redirect
    await chrome.storage.local.set({
        competitorScanInProgress: true,
        competitorScanSeller: sellerName
    });

    // Redirect to sold items page
    window.location.href = soldUrl;
}

/**
 * Start scanning multiple pages
 */
async function startMultiPageScan() {
    if (scanInProgress) {
        console.log('Scan already in progress');
        return;
    }

    // Check if we're already on a sold items filtered page
    const currentUrl = window.location.href;
    const hasSoldFilter = currentUrl.includes('LH_Sold=1') || currentUrl.includes('LH_Complete=1');

    // If NOT on sold items page, redirect to sold items first
    if (!hasSoldFilter) {
        console.log('🔄 Redirecting to SOLD items filtered page...');

        // Extract seller username from current URL
        let sellerName = '';

        // Try to get from URL parameter _ssn
        const urlParams = new URLSearchParams(window.location.search);
        sellerName = urlParams.get('_ssn') || '';

        // If not found, try to extract from /usr/ or /str/ patterns
        if (!sellerName) {
            const usrMatch = currentUrl.match(/\/usr\/([^\/\?]+)/);
            const strMatch = currentUrl.match(/\/str\/([^\/\?]+)/);
            sellerName = (usrMatch || strMatch)?.[1] || '';
        }

        // If still not found, try to get from page content
        if (!sellerName) {
            const sellerLink = document.querySelector('a[href*="/usr/"], a[href*="/str/"]');
            if (sellerLink) {
                const href = sellerLink.getAttribute('href') || '';
                const match = href.match(/\/(usr|str)\/([^\/\?]+)/);
                sellerName = match?.[2] || '';
            }
        }

        if (sellerName) {
            // Build sold items URL
            const soldUrl = `https://www.ebay.com/sch/i.html?_ssn=${encodeURIComponent(sellerName)}&LH_Complete=1&LH_Sold=1&_sop=13&rt=nc&_ipg=200`;
            console.log(`✅ Redirecting to: ${soldUrl}`);

            // Mark scan as in progress so it resumes after redirect
            await chrome.storage.local.set({
                competitorScanInProgress: true,
                competitorScanSeller: sellerName
            });

            // Redirect to sold items page
            window.location.href = soldUrl;
            return;
        } else {
            console.error('❌ Could not extract seller name from URL');
            alert('Could not find seller name. Please make sure you are on a seller store page.');
            return;
        }
    }

    scanInProgress = true;
    const allProducts: ProductData[] = [];
    let pageCount = 0;
    const maxPages = 10; // Limit to prevent infinite loops

    try {
        console.log('✅ On SOLD items page, starting scan...');

        // Scan current page
        const products = await scanCurrentPage();
        allProducts.push(...products);
        pageCount++;

        // Send progress update
        chrome.runtime.sendMessage({
            type: 'competitorScanProgress',
            progress: 10,
            found: allProducts.length
        });

        // Check if we should scan more pages
        let hasMore = hasNextPage();

        while (hasMore && pageCount < maxPages) {
            // Wait for page to load
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Go to next page
            if (!goToNextPage()) break;

            // Wait for new page to load
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Scan new page
            const newProducts = await scanCurrentPage();
            allProducts.push(...newProducts);
            pageCount++;

            // Update progress
            const progress = Math.min(90, 10 + (pageCount / maxPages) * 80);
            chrome.runtime.sendMessage({
                type: 'competitorScanProgress',
                progress: Math.round(progress),
                found: allProducts.length
            });

            hasMore = hasNextPage();
        }

        // Send final results
        console.log(`✅ Scan complete! Found ${allProducts.length} products across ${pageCount} pages`);
        chrome.runtime.sendMessage({
            type: 'competitorScanResults',
            products: allProducts,
            pageCount
        });

    } catch (error) {
        console.error('Error during scan:', error);
        chrome.runtime.sendMessage({
            type: 'competitorScanError',
            error: String(error)
        });
    } finally {
        scanInProgress = false;
        await chrome.storage.local.remove('competitorScanInProgress');
    }
}

/**
 * Create overlay buttons on eBay seller pages
 */
function createOverlayButtons() {
    if (overlayButtons || !isSellerPage()) {
        return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'competitor-research-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        gap: 10px;
    `;

    const scanButton = document.createElement('button');
    scanButton.textContent = '🔍 Scan Store';
    scanButton.style.cssText = `
        background: #2ecc40;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 12px 24px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: background 0.2s;
    `;
    scanButton.onmouseover = () => scanButton.style.background = '#27ae60';
    scanButton.onmouseout = () => scanButton.style.background = '#2ecc40';
    scanButton.onclick = () => redirectToSoldItemsAndScan();

    const closeButton = document.createElement('button');
    closeButton.textContent = '✕';
    closeButton.style.cssText = `
        background: #e74c3c;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    closeButton.onclick = () => {
        overlay.remove();
        overlayButtons = null;
    };

    overlay.appendChild(scanButton);
    overlay.appendChild(closeButton);
    document.body.appendChild(overlay);
    overlayButtons = overlay;

    console.log('✅ Overlay buttons created');
}

/**
 * Check if current page is a seller store page or sold items search
 */
function isSellerPage(): boolean {
    const url = window.location.href;
    return (
        url.includes('/usr/') ||
        url.includes('/str/') ||
        (url.includes('/sch/') && url.includes('/m.html')) ||
        (url.includes('/sch/i.html') && url.includes('_ssn='))  // Sold items search with seller filter
    );
}

/**
 * Initialize the content script
 */
async function initialize() {
    console.log('🚀 Initializing Competitor Research...');

    // Check if scan is in progress
    const storage = await chrome.storage.local.get(['competitorScanInProgress']);

    if (storage.competitorScanInProgress) {
        console.log('📊 Scan in progress, starting scan...');

        // Wait a bit for page to fully load
        setTimeout(() => {
            startMultiPageScan();
        }, 2000);
    }

    // Add overlay buttons if on seller page
    if (isSellerPage()) {
        setTimeout(createOverlayButtons, 1000);
    }
}

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

// ===== MESSAGE LISTENER =====
chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
    console.log('📨 Competitor Research received message:', message.type);

    if (message.type === 'startCompetitorScraping') {
        const { username } = message;

        console.log('�🚀🚀 ===== STARTING COMPETITOR SCRAPING ===== 🚀🚀🚀');
        console.log('📍 Username:', username);
        console.log('📍 Current URL:', window.location.href);
        console.log('📍 Time:', new Date().toLocaleTimeString());

        // Start scraping immediately
        (async () => {
            try {
                console.log('🔄 Calling scanCurrentPage()...');
                const products = await scanCurrentPage();

                console.log(`✅✅✅ SCAN COMPLETE! Found ${products.length} products from ${username}`);

                // Send results back to background
                chrome.runtime.sendMessage({
                    type: 'competitorScanResults',
                    username: username,
                    products: products,
                    timestamp: Date.now()
                }, (response: any) => {
                    console.log('📤 Results sent to background');
                });

                // Also send to any open UI pages
                chrome.storage.local.get(['competitorResults'], (storage: any) => {
                    const existing = storage.competitorResults || [];
                    const updated = [...existing, ...products];

                    chrome.storage.local.set({
                        competitorResults: updated,
                        lastCompetitorScan: {
                            username,
                            timestamp: Date.now(),
                            productCount: products.length
                        }
                    });
                });

                sendResponse({
                    success: true,
                    productCount: products.length
                });

            } catch (error) {
                console.error('❌ Scraping error:', error);
                sendResponse({
                    success: false,
                    error: String(error)
                });
            }
        })();

        return true; // Async response
    }
});

export { };
