/**
 * eBay Sold Items Scanner
 * Specifically targets SOLD listings from seller stores
 * Extracts detailed sales data and customer order information
 */

console.log('🔍 eBay Sold Items Scanner loaded on:', window.location.href);

interface SoldItemData {
    title: string;
    price: string;
    soldCount: number;
    soldDate: string;
    imageUrl: string;
    itemUrl: string;
    itemNumber: string;
    sellerName: string;
    buyerName?: string;
    shippingAddress?: string;
    orderNumber?: string;
    category?: string;
    condition?: string;
}

let overlayButtons: Map<string, HTMLElement> = new Map();
let scannedItems: SoldItemData[] = [];

/**
 * Check if we're on a seller's sold items page
 */
function isSellerSoldItemsPage(): boolean {
    const url = window.location.href;
    return (
        (url.includes('/str/') || url.includes('/usr/') || url.includes('/sch/')) &&
        (url.includes('LH_Sold=1') || url.includes('LH_Complete=1') || url.includes('_sop=13'))
    );
}

/**
 * Navigate to seller's sold listings
 */
async function navigateToSoldListings(sellerName: string): Promise<void> {
    const soldUrl = `https://www.ebay.com/sch/i.html?_ssn=${sellerName}&LH_Complete=1&LH_Sold=1&_sop=13&rt=nc`;
    window.location.href = soldUrl;
}

/**
 * Extract sold item data from listing element
 */
function extractSoldItemData(el: Element): SoldItemData | null {
    try {
        // Title
        const titleEl = el.querySelector('.s-item__title, h3.s-item__title') as HTMLElement;
        const title = titleEl?.textContent?.trim() || '';

        // Price - sold price
        const priceEl = el.querySelector('.s-item__price') as HTMLElement;
        const price = priceEl?.textContent?.trim() || '';

        // Sold date/count
        const soldEl = el.querySelector('.s-item__title--tag, .s-item__title--tagBlock, .POSITIVE') as HTMLElement;
        const soldText = soldEl?.textContent?.trim() || '';
        const soldDate = extractSoldDate(soldText);
        const soldCount = extractSoldCountFromElement(el);

        // Image
        const imgEl = el.querySelector('.s-item__image-img') as HTMLImageElement;
        const imageUrl = imgEl?.src || imgEl?.getAttribute('data-src') || '';

        // Item URL and number
        const linkEl = el.querySelector('a.s-item__link') as HTMLAnchorElement;
        const itemUrl = linkEl?.href || '';
        const itemNumber = extractItemNumber(itemUrl);

        // Seller name
        const sellerEl = el.querySelector('.s-item__seller-info-text') as HTMLElement;
        const sellerName = sellerEl?.textContent?.trim() || extractSellerFromUrl();

        // Category
        const categoryEl = el.querySelector('.s-item__subtitle') as HTMLElement;
        const category = categoryEl?.textContent?.trim() || '';

        // Condition
        const conditionEl = el.querySelector('.SECONDARY_INFO') as HTMLElement;
        const condition = conditionEl?.textContent?.trim() || '';

        if (!title || !itemUrl) {
            return null;
        }

        return {
            title,
            price,
            soldCount,
            soldDate,
            imageUrl,
            itemUrl,
            itemNumber,
            sellerName,
            category,
            condition
        };
    } catch (error) {
        console.error('Error extracting sold item data:', error);
        return null;
    }
}

/**
 * Extract sold date from text like "Sold Jan 15, 2025"
 */
function extractSoldDate(text: string): string {
    if (!text) return '';

    const patterns = [
        /Sold\s+([A-Za-z]+\s+\d+,\s+\d{4})/i,
        /Sold\s+(\d+\/\d+\/\d{4})/i,
        /Sold\s+([A-Za-z]+\s+\d+)/i
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return match[1];
    }

    return '';
}

/**
 * Extract item number from eBay URL
 */
function extractItemNumber(url: string): string {
    const match = url.match(/\/itm\/(\d+)|\/(\d{12})/);
    return match ? (match[1] || match[2]) : '';
}

/**
 * Extract seller name from URL
 */
function extractSellerFromUrl(): string {
    const url = window.location.href;
    const patterns = [
        /_ssn=([^&]+)/,
        /\/usr\/([^\/\?]+)/,
        /\/str\/([^\/\?]+)/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return decodeURIComponent(match[1]);
    }

    return '';
}

/**
 * Extract sold count from element
 */
function extractSoldCountFromElement(el: Element): number {
    const soldEl = el.querySelector('.s-item__hotness, .s-item__quantitySold') as HTMLElement;
    if (!soldEl) return 1; // If it's sold, at least 1

    const text = soldEl.textContent || '';
    const match = text.match(/(\d+(?:,\d+)*)/);
    return match ? parseInt(match[1].replace(/,/g, ''), 10) : 1;
}

/**
 * Scan current page for sold items
 */
async function scanSoldItems(): Promise<SoldItemData[]> {
    console.log('📊 Scanning for sold items...');

    const items: SoldItemData[] = [];
    const selectors = [
        '.s-item',
        '.srp-results .s-item',
        'li.s-item'
    ];

    let listingElements: Element[] = [];
    for (const selector of selectors) {
        const elements = Array.from(document.querySelectorAll(selector));
        if (elements.length > 0) {
            listingElements = elements;
            console.log(`Found ${elements.length} sold listings`);
            break;
        }
    }

    for (const el of listingElements) {
        const item = extractSoldItemData(el);
        if (item) {
            items.push(item);
            console.log(`✓ Sold item: ${item.title} - ${item.price} (${item.soldDate})`);
        }
    }

    return items;
}

/**
 * Create overlay button for sold item
 */
function createSoldItemOverlay(item: SoldItemData, element: Element): HTMLElement {
    const overlay = document.createElement('div');
    overlay.className = 'sold-item-overlay';
    overlay.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 6px;
    `;

    // Auto-Purchase button
    const purchaseBtn = document.createElement('button');
    purchaseBtn.innerHTML = '🛒 Auto-Purchase';
    purchaseBtn.className = 'overlay-btn purchase-btn';
    purchaseBtn.style.cssText = `
        background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
        color: white;
        border: none;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(255, 107, 107, 0.4);
        transition: all 0.2s;
        white-space: nowrap;
    `;
    purchaseBtn.onmouseover = () => {
        purchaseBtn.style.transform = 'scale(1.05)';
        purchaseBtn.style.boxShadow = '0 4px 12px rgba(255, 107, 107, 0.6)';
    };
    purchaseBtn.onmouseout = () => {
        purchaseBtn.style.transform = 'scale(1)';
        purchaseBtn.style.boxShadow = '0 2px 8px rgba(255, 107, 107, 0.4)';
    };
    purchaseBtn.onclick = async () => {
        await handleAutoPurchase(item);
    };

    // Find on Amazon button
    const amazonBtn = document.createElement('button');
    amazonBtn.innerHTML = '📦 Find Amazon';
    amazonBtn.className = 'overlay-btn amazon-btn';
    amazonBtn.style.cssText = `
        background: linear-gradient(135deg, #ff9900 0%, #ff8800 100%);
        color: white;
        border: none;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(255, 153, 0, 0.4);
        transition: all 0.2s;
        white-space: nowrap;
    `;
    amazonBtn.onmouseover = () => {
        amazonBtn.style.transform = 'scale(1.05)';
        amazonBtn.style.boxShadow = '0 4px 12px rgba(255, 153, 0, 0.6)';
    };
    amazonBtn.onmouseout = () => {
        amazonBtn.style.transform = 'scale(1)';
        amazonBtn.style.boxShadow = '0 2px 8px rgba(255, 153, 0, 0.4)';
    };
    amazonBtn.onclick = () => {
        const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(item.title)}`;
        window.open(searchUrl, '_blank');
    };

    // View Details button
    const detailsBtn = document.createElement('button');
    detailsBtn.innerHTML = '🔍 Details';
    detailsBtn.className = 'overlay-btn details-btn';
    detailsBtn.style.cssText = `
        background: linear-gradient(135deg, #4ecdc4 0%, #44a5a0 100%);
        color: white;
        border: none;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(78, 205, 196, 0.4);
        transition: all 0.2s;
        white-space: nowrap;
    `;
    detailsBtn.onmouseover = () => {
        detailsBtn.style.transform = 'scale(1.05)';
    };
    detailsBtn.onmouseout = () => {
        detailsBtn.style.transform = 'scale(1)';
    };
    detailsBtn.onclick = () => {
        showItemDetails(item);
    };

    overlay.appendChild(purchaseBtn);
    overlay.appendChild(amazonBtn);
    overlay.appendChild(detailsBtn);

    return overlay;
}

/**
 * Handle auto-purchase workflow
 */
async function handleAutoPurchase(item: SoldItemData): Promise<void> {
    console.log('🛒 Starting auto-purchase for:', item.title);

    // Store item data
    await chrome.storage.local.set({
        autoPurchaseItem: item,
        autoPurchaseInProgress: true
    });

    // Open Amazon search
    const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(item.title)}`;
    chrome.tabs.create({ url: searchUrl }, (tab) => {
        console.log('✓ Opened Amazon search for auto-purchase');
    });

    // Send notification
    chrome.runtime.sendMessage({
        type: 'showNotification',
        title: 'Auto-Purchase Started',
        message: `Searching Amazon for: ${item.title.slice(0, 50)}...`
    });
}

/**
 * Show item details modal
 */
function showItemDetails(item: SoldItemData): void {
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
        align-items: center;
        justify-content: center;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        border-radius: 16px;
        padding: 30px;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
    `;

    content.innerHTML = `
        <h2 style="margin-top: 0; color: #333;">Sold Item Details</h2>
        <div style="margin-bottom: 20px;">
            <img src="${item.imageUrl}" style="max-width: 100%; border-radius: 8px;" />
        </div>
        <div style="color: #333; line-height: 1.6;">
            <p><strong>Title:</strong> ${item.title}</p>
            <p><strong>Price:</strong> ${item.price}</p>
            <p><strong>Sold Date:</strong> ${item.soldDate}</p>
            <p><strong>Item Number:</strong> ${item.itemNumber}</p>
            <p><strong>Seller:</strong> ${item.sellerName}</p>
            ${item.category ? `<p><strong>Category:</strong> ${item.category}</p>` : ''}
            ${item.condition ? `<p><strong>Condition:</strong> ${item.condition}</p>` : ''}
        </div>
        <button id="closeModal" style="
            background: #e74c3c;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 12px 24px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            margin-top: 20px;
        ">Close</button>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };

    content.querySelector('#closeModal')?.addEventListener('click', () => {
        modal.remove();
    });
}

/**
 * Add overlays to all sold items on page
 */
function addOverlaysToSoldItems(): void {
    const selectors = ['.s-item', 'li.s-item'];

    for (const selector of selectors) {
        const items = document.querySelectorAll(selector);

        items.forEach((item, index) => {
            // Skip if already has overlay
            if (overlayButtons.has(`item-${index}`)) return;

            const soldItemData = extractSoldItemData(item);
            if (soldItemData) {
                // Make item container position relative
                (item as HTMLElement).style.position = 'relative';

                // Create and add overlay
                const overlay = createSoldItemOverlay(soldItemData, item);
                item.appendChild(overlay);
                overlayButtons.set(`item-${index}`, overlay);
            }
        });
    }

    console.log(`✓ Added overlays to ${overlayButtons.size} sold items`);
}

/**
 * Initialize sold items scanner
 */
async function initialize(): Promise<void> {
    console.log('🚀 Initializing Sold Items Scanner...');

    // Check if we're on sold items page
    if (isSellerSoldItemsPage()) {
        console.log('✓ On seller sold items page');

        // Wait for page to load
        setTimeout(async () => {
            // Scan items
            const items = await scanSoldItems();
            scannedItems = items;

            // Add overlays
            addOverlaysToSoldItems();

            // Send to CompetitorResearch page
            chrome.runtime.sendMessage({
                type: 'soldItemsScanned',
                items: items,
                sellerName: extractSellerFromUrl()
            });
        }, 2000);
    } else {
        console.log('ℹ️ Not on sold items page. Use "View Sold Items" button to navigate.');
    }

    // Listen for scroll/pagination to add overlays to new items
    let scrollTimeout: NodeJS.Timeout;
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            addOverlaysToSoldItems();
        }, 500);
    });
}

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

export { };
