/**
 * Amazon Scraping Content Script
 * Scrapes product data from Amazon pages and triggers eBay automation
 */

interface ScrapedProduct {
    title: string;
    price: string;
    brand: string;
    features: string[];
    images: string[];
    description: string;
    asin: string;
    amazonUrl: string;
}

console.log('Amazon scraping script loaded on:', window.location.href);

/**
 * Extract ASIN from current URL
 */
function extractAsin(): string | null {
    const url = window.location.href;
    const match = url.match(/\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})|\/ASIN\/([A-Z0-9]{10})/i);
    return match ? (match[1] || match[2] || match[3]) : null;
}

/**
 * Scrape all product data from the current Amazon page
 */
async function scrapeAmazonProduct(): Promise<ScrapedProduct | null> {
    console.log('Starting Amazon product scrape...');

    try {
        // Extract title
        let title = '';
        const titleElement = document.querySelector('#productTitle');
        if (titleElement) {
            title = titleElement.textContent?.trim() || '';
            console.log('✓ Title scraped:', title.substring(0, 50) + '...');
        }

        // Extract price
        let price = '';
        const priceWhole = document.querySelector('.a-price-whole');
        const priceFraction = document.querySelector('.a-price-fraction');
        if (priceWhole) {
            price = priceWhole.textContent?.trim() || '';
            if (priceFraction) {
                price += priceFraction.textContent?.trim() || '';
            }
            price = price.replace(/[^0-9.]/g, '');
            console.log('✓ Price scraped:', price);
        }

        // Extract brand
        let brand = '';
        const brandElement = document.querySelector('#bylineInfo');
        if (brandElement) {
            brand = brandElement.textContent?.replace(/^(Visit the|Brand:)\s*/i, '').trim() || '';
            console.log('✓ Brand scraped:', brand);
        }

        // Extract features
        const features: string[] = [];
        const featureElements = document.querySelectorAll('#feature-bullets ul li span.a-list-item');
        featureElements.forEach(el => {
            const text = el.textContent?.trim();
            if (text && text.length > 0) {
                features.push(text);
            }
        });
        console.log('✓ Features scraped:', features.length);

        // Extract images
        const images: string[] = [];
        const imageElements = document.querySelectorAll('#altImages img, #main-image, #landingImage');
        imageElements.forEach(img => {
            const src = img.getAttribute('src') || img.getAttribute('data-old-hires');
            if (src && !src.includes('data:image') && !images.includes(src)) {
                // Try to get high-res version
                const highResSrc = src.replace(/\._.*_\./, '._AC_SL1500_.');
                images.push(highResSrc);
            }
        });
        console.log('✓ Images scraped:', images.length);

        // Build description from features
        let description = '';
        if (title) description += `${title}\n\n`;
        if (brand) description += `Brand: ${brand}\n\n`;
        if (features.length > 0) {
            description += 'Features:\n';
            features.forEach(f => {
                description += `• ${f}\n`;
            });
            description += '\n';
        }

        const asin = extractAsin() || '';
        description += `Amazon ASIN: ${asin}\n`;
        description += `Source: ${window.location.href}`;

        return {
            title,
            price,
            brand,
            features,
            images,
            description,
            asin,
            amazonUrl: window.location.href
        };
    } catch (error) {
        console.error('Error scraping Amazon product:', error);
        return null;
    }
}

/**
 * Open eBay search page with the scraped title
 */
async function openEbaySearch(productData: ScrapedProduct, index: number, total: number, listType: string) {
    console.log('📦 Preparing to open eBay with scraped title:', productData.title);
    console.log('🔑 Using ASIN as key:', productData.asin);

    // Store the scraped data using ASIN as the key (more reliable than index)
    const dataToStore = {
        ...productData,
        index,
        total,
        listType,
        scrapingComplete: true,
        searchTitle: productData.title,
        timestamp: Date.now(),
        status: 'scraped' // Track status
    };

    // Store by ASIN (primary) and index (backup)
    await chrome.storage.local.set({
        [`scrapedProduct_${productData.asin}`]: dataToStore,
        [`scrapedProduct_${index}`]: dataToStore // Keep index-based for compatibility
    });

    console.log('✅ Product data saved with ASIN key:', `scrapedProduct_${productData.asin}`);
    console.log('📊 Title:', productData.title.substring(0, 50) + '...');

    // Wait a moment to ensure storage is committed
    await new Promise(resolve => setTimeout(resolve, 500));

    // Send message to background script to open eBay and close this tab
    chrome.runtime.sendMessage({
        type: 'amazonDataScraped',
        asin: productData.asin,
        data: dataToStore,
        action: 'openEbayAndCloseAmazon' // Tell background to handle tab management
    }, (response: any) => {
        console.log('✅ Message sent to background script');
        if (response && response.success) {
            console.log('🌐 eBay tab will be opened by background script');
        }
    });

    console.log('✅ Scraping complete, waiting for background script to manage tabs');
}

// Main scraping logic
(async function initAmazonScraping() {
    // Wait for page to fully load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if we should scrape this page
    chrome.storage.local.get(['automationInProgress', 'automationStep'], async (data: any) => {
        if (!data.automationInProgress || data.automationStep !== 'scrape_amazon') {
            console.log('No Amazon scraping needed');
            return;
        }

        console.log('Automation in progress, checking for product data...');

        // Find which product index this tab should handle
        const currentUrl = window.location.href;
        chrome.storage.local.get(null, async (allData: any) => {
            // Find the product that matches this URL
            for (let i = 0; i < 100; i++) {
                const key = `pendingProduct_${i}`;
                if (allData[key] && allData[key].amazonUrl === currentUrl && !allData[key].scrapingComplete) {
                    console.log(`Found product at index ${i}, starting scrape...`);

                    const productData = allData[key];

                    // Scrape the product
                    const scrapedData = await scrapeAmazonProduct();

                    if (scrapedData) {
                        console.log('✓ Scraping complete!');

                        // Show success notification
                        const notification = document.createElement('div');
                        notification.style.cssText = `
              position: fixed;
              top: 20px;
              right: 20px;
              background: #28a745;
              color: white;
              padding: 15px 25px;
              border-radius: 8px;
              font-size: 16px;
              font-weight: bold;
              z-index: 999999;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            `;
                        notification.textContent = `✓ Scraped: ${scrapedData.title.substring(0, 40)}...`;
                        document.body.appendChild(notification);

                        // Open eBay search page
                        await openEbaySearch(scrapedData, i, productData.total, productData.listType);
                    } else {
                        console.error('Failed to scrape product data');
                    }

                    break;
                }
            }
        });
    });
})();

export { };
