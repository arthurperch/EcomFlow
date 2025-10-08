/**
 * Amazon Product Overlay - Find Similar Product on eBay
 * Shows floating button on Amazon product pages to search eBay
 */

console.log('🔍 Amazon Product Overlay loaded on:', window.location.href);

let overlayButton: HTMLElement | null = null;

interface ProductInfo {
    title: string;
    asin: string;
    brand?: string;
    price?: string;
    imageUrl?: string;
}

/**
 * Extract ASIN from Amazon URL or page
 */
function extractASIN(): string | null {
    // Try URL patterns
    const urlPatterns = [
        /\/dp\/([A-Z0-9]{10})/,
        /\/gp\/product\/([A-Z0-9]{10})/,
        /\/ASIN\/([A-Z0-9]{10})/,
        /product\/([A-Z0-9]{10})/
    ];

    const url = window.location.href;
    for (const pattern of urlPatterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }

    // Try to find ASIN in page content
    const asinEl = document.querySelector('[data-asin]');
    if (asinEl) {
        const asin = asinEl.getAttribute('data-asin');
        if (asin && asin.length === 10) return asin;
    }

    return null;
}

/**
 * Extract product information from Amazon page
 */
function extractProductInfo(): ProductInfo | null {
    const asin = extractASIN();
    if (!asin) return null;

    // Extract title
    const titleEl = document.querySelector('#productTitle, h1.product-title') as HTMLElement;
    const title = titleEl?.textContent?.trim() || '';

    // Extract brand
    const brandEl = document.querySelector('#bylineInfo, .po-brand .po-break-word') as HTMLElement;
    const brand = brandEl?.textContent?.trim().replace('Brand:', '').replace('Visit the', '').replace('Store', '').trim() || '';

    // Extract price
    const priceEl = document.querySelector('.a-price .a-offscreen, #priceblock_ourprice, #priceblock_dealprice') as HTMLElement;
    const price = priceEl?.textContent?.trim() || '';

    // Extract main image
    const imgEl = document.querySelector('#landingImage, #imgBlkFront') as HTMLImageElement;
    const imageUrl = imgEl?.src || '';

    return {
        title,
        asin,
        brand,
        price,
        imageUrl
    };
}

/**
 * Create eBay search URL from product info
 */
function createEbaySearchUrl(product: ProductInfo): string {
    // Create search query
    let searchQuery = '';

    if (product.brand) {
        searchQuery = `${product.brand} ${product.title}`;
    } else {
        searchQuery = product.title;
    }

    // Clean up the search query
    searchQuery = searchQuery
        .replace(/\([^)]*\)/g, '') // Remove parentheses content
        .replace(/\s+/g, ' ')      // Normalize spaces
        .trim()
        .slice(0, 200);            // Limit length

    // Encode for URL
    const encodedQuery = encodeURIComponent(searchQuery);

    // Return eBay search URL
    return `https://www.ebay.com/sch/i.html?_nkw=${encodedQuery}&_sop=12&LH_Sold=1&LH_Complete=1&rt=nc`;
}

/**
 * Create the floating overlay button
 */
function createOverlayButton() {
    if (overlayButton || !isProductPage()) {
        return;
    }

    const product = extractProductInfo();
    if (!product || !product.title) {
        console.log('Could not extract product info, skipping overlay');
        return;
    }

    console.log('✅ Extracted product:', product);

    // Create overlay container
    const overlay = document.createElement('div');
    overlay.id = 'amazon-ebay-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        animation: slideIn 0.3s ease-out;
    `;

    // Add slide-in animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);

    // Create main button - Find on eBay
    const findButton = document.createElement('button');
    findButton.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 18px;">🔍</span>
            <div style="text-align: left; line-height: 1.3;">
                <div style="font-weight: 700; font-size: 14px;">Find on eBay</div>
                <div style="font-size: 11px; opacity: 0.9;">View sold listings</div>
            </div>
        </div>
    `;
    findButton.style.cssText = `
        background: linear-gradient(135deg, #e53238 0%, #ff6b6b 100%);
        color: white;
        border: none;
        border-radius: 12px;
        padding: 14px 20px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(229, 50, 56, 0.4);
        transition: all 0.2s;
        min-width: 180px;
    `;
    findButton.onmouseover = () => {
        findButton.style.transform = 'translateY(-2px)';
        findButton.style.boxShadow = '0 6px 25px rgba(229, 50, 56, 0.5)';
    };
    findButton.onmouseout = () => {
        findButton.style.transform = 'translateY(0)';
        findButton.style.boxShadow = '0 4px 20px rgba(229, 50, 56, 0.4)';
    };
    findButton.onclick = () => {
        // Use optimized search instead of image search
        console.log('🔍 Starting eBay search for:', product.title);

        // Send message to background service for eBay search
        chrome.runtime.sendMessage({
            type: 'findOnEbayByImage',
            imageUrl: product.imageUrl,
            productData: product
        }, (response: any) => {
            if (response && response.success) {
                console.log('✅ eBay search opened successfully');
                if (response.searchQuery) {
                    console.log('🔍 Search query:', response.searchQuery);
                }
            } else {
                console.error('❌ eBay search failed:', response?.error);
            }
        });

        // Store product data for potential later use
        chrome.storage.local.set({
            lastAmazonProduct: product,
            lastSearchType: 'optimized'
        });
    };

    // Create research button - Advanced Research
    const researchButton = document.createElement('button');
    researchButton.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">📊</span>
            <span>Research Item</span>
        </div>
    `;
    researchButton.style.cssText = `
        background: linear-gradient(135deg, #2ecc40 0%, #27ae60 100%);
        color: white;
        border: none;
        border-radius: 12px;
        padding: 12px 20px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 15px rgba(46, 204, 64, 0.3);
        transition: all 0.2s;
        min-width: 180px;
    `;
    researchButton.onmouseover = () => {
        researchButton.style.transform = 'translateY(-2px)';
        researchButton.style.boxShadow = '0 6px 20px rgba(46, 204, 64, 0.4)';
    };
    researchButton.onmouseout = () => {
        researchButton.style.transform = 'translateY(0)';
        researchButton.style.boxShadow = '0 4px 15px rgba(46, 204, 64, 0.3)';
    };
    researchButton.onclick = async () => {
        // Store product for research
        await chrome.storage.local.set({
            researchProduct: product,
            researchMode: 'amazon-to-ebay'
        });

        // Open competitor research page
        const extensionUrl = chrome.runtime.getURL('index.html#/competitor-research');
        window.open(extensionUrl, '_blank');
    };

    // Create close button
    const closeButton = document.createElement('button');
    closeButton.textContent = '✕';
    closeButton.style.cssText = `
        background: rgba(0, 0, 0, 0.7);
        color: white;
        border: none;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        transition: all 0.2s;
        align-self: flex-end;
    `;
    closeButton.onmouseover = () => {
        closeButton.style.background = 'rgba(229, 50, 56, 0.9)';
        closeButton.style.transform = 'scale(1.1)';
    };
    closeButton.onmouseout = () => {
        closeButton.style.background = 'rgba(0, 0, 0, 0.7)';
        closeButton.style.transform = 'scale(1)';
    };
    closeButton.onclick = () => {
        overlay.remove();
        overlayButton = null;
    };

    // Add info card
    const infoCard = document.createElement('div');
    infoCard.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 12px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        max-width: 180px;
        font-size: 12px;
        color: #333;
    `;
    infoCard.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 6px; color: #e53238;">Product Info</div>
        <div style="font-size: 11px; line-height: 1.4; color: #666;">
            <strong>ASIN:</strong> ${product.asin}<br>
            ${product.brand ? `<strong>Brand:</strong> ${product.brand.slice(0, 20)}<br>` : ''}
            ${product.price ? `<strong>Price:</strong> ${product.price}` : ''}
        </div>
    `;

    overlay.appendChild(closeButton);
    overlay.appendChild(findButton);
    overlay.appendChild(researchButton);
    overlay.appendChild(infoCard);

    document.body.appendChild(overlay);
    overlayButton = overlay;

    console.log('✅ Overlay button created');
}

/**
 * Check if current page is a product page
 */
function isProductPage(): boolean {
    const url = window.location.href;
    return (
        url.includes('/dp/') ||
        url.includes('/gp/product/') ||
        url.includes('/ASIN/')
    ) && !url.includes('/reviews/');
}

/**
 * Initialize the overlay
 */
function initialize() {
    console.log('🚀 Initializing Amazon Product Overlay...');

    if (isProductPage()) {
        // Wait for page to load
        setTimeout(() => {
            createOverlayButton();
        }, 1500);
    }

    // Listen for navigation changes (for SPAs)
    let lastUrl = window.location.href;
    new MutationObserver(() => {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            if (overlayButton) {
                overlayButton.remove();
                overlayButton = null;
            }
            if (isProductPage()) {
                setTimeout(createOverlayButton, 1500);
            }
        }
    }).observe(document.body, { childList: true, subtree: true });
}

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

export { };
