/**
 * eBay Automation Content Script
 * Handles automated listing creation on eBay from Amazon products
 */

interface ProductData {
    url: string;
    amazonUrl: string;
    title?: string;
    description?: string;
    price?: string;
    brand?: string;
    features?: string[];
    images?: string[];
    imageUrl?: string;
    asin?: string;
    index?: number;
    total?: number;
    listType?: 'opti' | 'seo' | 'standard';
    searchTitle?: string;
}

console.log('🚀 eBay automation content script loaded on:', window.location.href);
console.log('🕒 Load timestamp:', new Date().toISOString());

let justClickedCreateButton = false;
let searchExecuted = false;

// Listen for trigger message from background script
chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
    console.log('📨 eBay automation received message:', message.type);

    if (message.type === 'startEbayListing') {
        console.log('🎯 Received startEbayListing trigger!');
        console.log('📦 ASIN:', message.asin);
        console.log('📦 Product Data:', message.productData);

        // Start the listing process
        startListingFromMessage(message.asin, message.productData);

        sendResponse({ success: true, message: 'eBay listing automation started' });
    }

    return true;
});

async function startListingFromMessage(asin: string, productData: any) {
    console.log('🚀 Starting eBay listing automation for ASIN:', asin);

    // Wait for page to fully load
    await new Promise(resolve => setTimeout(resolve, 2000));

    const titleToSearch = productData.searchTitle || productData.title;
    if (!titleToSearch) {
        console.error('❌ No title found in product data!');
        return;
    }

    console.log('🔎 Searching for:', titleToSearch);
    const searched = await autoSearchEbay(titleToSearch);

    if (searched) {
        // Mark as searched using ASIN
        await chrome.storage.local.set({
            [`searched_${asin}`]: true,
            [`currentAsin`]: asin
        });
        console.log('✅ Search executed successfully for ASIN:', asin);
    } else {
        console.error('❌ Failed to execute search for ASIN:', asin);
    }
}

/**
 * Auto-fill and submit the eBay search box
 */
async function autoSearchEbay(searchTitle: string) {
    console.log('🔎 Auto-searching eBay for:', searchTitle);

    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Try specific eBay search box selector first (user provided)
    const primarySelector = '.se-search-box .se-search-box__field.textbox input:placeholder-shown';

    // Fallback selectors
    const searchSelectors = [
        primarySelector,
        '.se-search-box input[type="text"]',
        'input[name="query"]',
        'input[placeholder*="search" i]',
        'input[type="search"]',
        'input[id*="search"]',
        'input.search-input',
        '#gh-ac'
    ];

    console.log('🔍 Searching for search input with selectors...');

    for (const selector of searchSelectors) {
        const searchInput = document.querySelector(selector) as HTMLInputElement;
        if (searchInput && searchInput.offsetParent !== null) {
            console.log('✅ Found search input with selector:', selector);

            // Focus the input
            searchInput.focus();
            console.log('👆 Focused search input');

            // Clear existing value
            searchInput.value = '';

            // Type the search title (paste from temp storage)
            searchInput.value = searchTitle;
            console.log('📝 Pasted title into search box:', searchTitle.substring(0, 50) + '...');

            // Trigger input events
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            searchInput.dispatchEvent(new Event('change', { bubbles: true }));

            // Show visual feedback
            searchInput.style.backgroundColor = '#90EE90'; // Light green
            setTimeout(() => {
                searchInput.style.backgroundColor = '';
            }, 1000);

            // Wait a bit for any autocomplete
            await new Promise(resolve => setTimeout(resolve, 500));

            // Press Enter to search
            console.log('⌨️  Pressing Enter to submit search...');

            const enterEvent = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true
            });
            searchInput.dispatchEvent(enterEvent);

            // Also try keyup and keypress
            searchInput.dispatchEvent(new KeyboardEvent('keypress', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true
            }));

            searchInput.dispatchEvent(new KeyboardEvent('keyup', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true
            }));

            searchExecuted = true;
            console.log('✅ Search submitted with Enter key!');

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
            notification.textContent = `✓ Searching: ${searchTitle.substring(0, 40)}...`;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);

            return true;
        }
    }

    console.error('❌ Search input not found with any selector!');
    return false;
}

/**
 * Extract ASIN from Amazon URL
 */
function extractAsin(url: string): string | null {
    const match = url.match(/\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})|\/ASIN\/([A-Z0-9]{10})/i);
    return match ? (match[1] || match[2] || match[3]) : null;
}

/**
 * Fetch full product data from Amazon by actually fetching the page
 */
async function fetchAmazonProductData(amazonUrl: string): Promise<Partial<ProductData>> {
    try {
        const asin = extractAsin(amazonUrl);
        console.log('Fetching Amazon product data for ASIN:', asin);

        // Fetch the Amazon page
        const response = await fetch(amazonUrl);
        const html = await response.text();

        // Create a temporary DOM parser
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Extract title
        let title = '';
        const titleElement = doc.querySelector('#productTitle');
        if (titleElement) {
            title = titleElement.textContent?.trim() || '';
        }

        // Extract price
        let price = '';
        const priceWhole = doc.querySelector('.a-price-whole');
        const priceFraction = doc.querySelector('.a-price-fraction');
        if (priceWhole) {
            price = priceWhole.textContent?.trim() || '';
            if (priceFraction) {
                price += priceFraction.textContent?.trim() || '';
            }
            price = price.replace(/[^0-9.]/g, '');
        }

        // Extract brand
        let brand = '';
        const brandElement = doc.querySelector('#bylineInfo');
        if (brandElement) {
            brand = brandElement.textContent?.replace(/^(Visit the|Brand:)\s*/i, '').trim() || '';
        }

        // Extract features
        const features: string[] = [];
        const featureElements = doc.querySelectorAll('#feature-bullets ul li span.a-list-item');
        featureElements.forEach(el => {
            const text = el.textContent?.trim();
            if (text && text.length > 0) {
                features.push(text);
            }
        });

        // Extract images
        const images: string[] = [];
        const imageElements = doc.querySelectorAll('#altImages img, #main-image, #landingImage');
        imageElements.forEach(img => {
            const src = img.getAttribute('src') || img.getAttribute('data-old-hires');
            if (src && !src.includes('data:image') && !images.includes(src)) {
                // Try to get high-res version
                const highResSrc = src.replace(/\._.*_\./, '._AC_SL1500_.');
                images.push(highResSrc);
            }
        });

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
        description += `Amazon ASIN: ${asin}\n`;
        description += `Source: ${amazonUrl}`;

        console.log('✓ Extracted Amazon product data:', { title, price, brand, featuresCount: features.length, imagesCount: images.length });

        return {
            amazonUrl,
            asin: asin || undefined,
            title,
            description,
            price,
            brand,
            features,
            images,
            imageUrl: images[0] || ''
        };
    } catch (error) {
        console.error('Error fetching Amazon data:', error);
        const asin = extractAsin(amazonUrl);
        return {
            amazonUrl,
            asin: asin || undefined,
            title: `Product ASIN: ${asin}`,
            description: `Amazon ASIN: ${asin}\nSource: ${amazonUrl}`
        };
    }
}

/**
 * Handle eBay Product Identification Page
 * This page appears after search: /sl/prelist/identify?sr=sug&title
 * Need to: 1) Select category, 2) Select condition, 3) Click Continue
 */
async function autoHandleProductIdentification() {
    console.log('🎯 On product identification page, handling automatically...');
    console.log('📍 Current URL:', window.location.href);

    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Check if this is the category recommendation popup
    const pageTitle = document.querySelector('h1')?.textContent?.trim() || '';
    console.log('📄 Page title:', pageTitle);

    // STRATEGY 1: Try to click product cards (recommended matches)
    console.log('🎯 STRATEGY 1: Looking for product card matches...');
    const productCardSelectors = [
        '.product-button',
        'button.product-button',
        '.card-container__item button',
        '[class*="product-button"]'
    ];

    let productClicked = false;
    for (const selector of productCardSelectors) {
        const productCards = document.querySelectorAll(selector);
        if (productCards.length > 0) {
            console.log(`✅ Found ${productCards.length} product cards with selector: ${selector}`);

            // Click the first product card
            console.log('👆 Clicking first product match...');
            (productCards[0] as HTMLElement).click();
            productClicked = true;

            // Show notification
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
            notification.textContent = '✓ Selected matching product!';
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);

            // Wait for next page
            await new Promise(resolve => setTimeout(resolve, 2000));
            return true;
        }
    }

    if (!productClicked) {
        console.log('⚠️ No product cards found, trying STRATEGY 2...');
    }

    // STRATEGY 2: Click "Continue without match" button
    console.log('🎯 STRATEGY 2: Looking for "Continue without match" button...');
    const continueWithoutMatchSelectors = [
        'button.prelist-radix__next-action',
        '.prelist-radix__next-action',
        'button.btn--secondary.prelist-radix__next-action',
        'button[type="button"].prelist-radix__next-action'
    ];

    let continueClicked = false;
    for (const selector of continueWithoutMatchSelectors) {
        const buttons = document.querySelectorAll(selector);
        console.log(`🔍 Selector: ${selector} -> Found ${buttons.length} buttons`);

        for (const btn of buttons) {
            const text = btn.textContent?.trim().toLowerCase() || '';
            console.log(`   Button text: "${text}"`);

            if (text.includes('continue') || text.includes('without')) {
                console.log(`✅ Found "Continue without match" button!`);
                console.log('   HTML:', (btn as HTMLElement).outerHTML.substring(0, 200));

                // Scroll into view
                (btn as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
                await new Promise(resolve => setTimeout(resolve, 500));

                // Highlight the button
                (btn as HTMLElement).style.cssText += `
          background: #ff9800 !important;
          border: 3px solid #ff5722 !important;
          transform: scale(1.1);
        `;

                await new Promise(resolve => setTimeout(resolve, 500));

                // Click it
                (btn as HTMLElement).click();
                console.log('✅ Clicked "Continue without match" button!');
                continueClicked = true;

                // Show success notification
                const notification = document.createElement('div');
                notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #ff9800;
          color: white;
          padding: 15px 25px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: bold;
          z-index: 999999;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
                notification.textContent = '✓ Continuing to listing form...';
                document.body.appendChild(notification);
                setTimeout(() => notification.remove(), 3000);

                return true;
            }
        }

        if (continueClicked) break;
    }

    if (!continueClicked) {
        console.error('❌ Could not find "Continue without match" button');

        // STRATEGY 3: Try ANY button with "continue" in text
        console.log('🎯 STRATEGY 3: Trying ANY button with "continue" text...');
        const allButtons = document.querySelectorAll('button, a.btn, a.fake-btn');
        console.log(`🔍 Found ${allButtons.length} total buttons on page`);

        for (const btn of allButtons) {
            const text = btn.textContent?.trim().toLowerCase() || '';
            if (text.includes('continue') || text.includes('next') || text.includes('proceed')) {
                console.log(`✅ Found button with continue text: "${text}"`);
                (btn as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
                await new Promise(resolve => setTimeout(resolve, 500));
                (btn as HTMLElement).click();
                console.log('✅ Clicked button!');
                return true;
            }
        }
    }

    console.error('❌ Could not proceed - no continue button found');
    return false;
}

/**
 * Auto-handle condition selection dialog
 */
async function autoHandleConditionPicker() {
    console.log('🎯 Handling condition picker...');

    // Wait for dialog to fully load
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Look for "New" condition radio button or option
    const newConditionSelectors = [
        'input[type="radio"][value="1000"]', // eBay's "New" condition value
        'input[name*="condition"][id*="new" i]',
        'input[name*="condition"][value*="new" i]',
        'label:has(input[name*="condition"]):has-text("New")',
        'button[data-value="1000"]',
        '.conditions input[type="radio"]:first-of-type' // Usually "New" is first
    ];

    let conditionSelected = false;

    // Try to find and click "New" condition
    for (const selector of newConditionSelectors) {
        const conditionInput = document.querySelector(selector) as HTMLInputElement;
        if (conditionInput) {
            console.log(`✅ Found "New" condition with selector: ${selector}`);

            // Scroll into view
            conditionInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await new Promise(resolve => setTimeout(resolve, 300));

            // Click the radio or checkbox
            conditionInput.click();
            conditionInput.checked = true;
            conditionInput.dispatchEvent(new Event('change', { bubbles: true }));
            conditionInput.dispatchEvent(new Event('click', { bubbles: true }));

            console.log('✅ Selected "New" condition!');
            conditionSelected = true;
            break;
        }
    }

    // If not found, try clicking the label
    if (!conditionSelected) {
        const labels = document.querySelectorAll('label');
        for (const label of labels) {
            const text = label.textContent?.trim().toLowerCase() || '';
            if (text === 'new' || text.startsWith('new')) {
                console.log(`✅ Found "New" condition label`);
                (label as HTMLElement).click();
                conditionSelected = true;
                await new Promise(resolve => setTimeout(resolve, 500));
                break;
            }
        }
    }

    if (!conditionSelected) {
        console.warn('⚠️ Could not find "New" condition, trying first radio button...');
        const firstRadio = document.querySelector('input[type="radio"]') as HTMLInputElement;
        if (firstRadio) {
            firstRadio.click();
            firstRadio.checked = true;
            conditionSelected = true;
            console.log('✅ Selected first available condition');
        }
    }

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Now find and click the "Continue to listing" or "Done" button
    const continueButtonSelectors = [
        'button[type="button"]:has-text("Continue to listing")',
        'button:has-text("Continue")',
        'button.btn--primary',
        'button[class*="primary"]',
        'button:has-text("Done")',
        'button:has-text("Next")',
        '.nextAction button',
        '[class*="nextAction"] button'
    ];

    let continueClicked = false;

    for (const selector of continueButtonSelectors) {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
            const text = btn.textContent?.trim().toLowerCase() || '';
            if (text.includes('continue') || text.includes('done') || text.includes('next') || text.includes('list')) {
                console.log(`✅ Found continue button: "${text}"`);

                // Make sure it's not disabled
                if (!(btn as HTMLButtonElement).disabled) {
                    // Scroll into view
                    (btn as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // Highlight
                    (btn as HTMLElement).style.cssText += `
            background: #28a745 !important;
            border: 3px solid #1e7e34 !important;
            transform: scale(1.05);
          `;

                    await new Promise(resolve => setTimeout(resolve, 500));

                    // Click it
                    (btn as HTMLElement).click();
                    console.log('✅ Clicked continue button!');
                    continueClicked = true;

                    // Show notification
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
                    notification.textContent = '✓ Proceeding to listing form...';
                    document.body.appendChild(notification);
                    setTimeout(() => notification.remove(), 3000);

                    return true;
                } else {
                    console.warn('⚠️ Continue button is disabled');
                }
            }
        }

        if (continueClicked) break;
    }

    if (!continueClicked) {
        console.error('❌ Could not find or click continue button');
        return false;
    }

    return conditionSelected && continueClicked;
}

/**
 * Auto-click the Create Listing button on eBay
 */
async function autoClickCreateListingButton() {
    console.log('Looking for Create Listing button...');

    // Wait a moment for page to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Try the specific selector you provided
    const selectors = [
        '.create-listing-btn > a.fake-btn',
        '.create-listing-btn a.fake-btn',
        '.create-listing-btn a.fake-btn:visited',
        'a.fake-btn[href*="create"]',
        'a.fake-btn[href*="sell"]',
        'button[type="button"]:contains("Create")',
        'a:contains("Create listing")'
    ];

    for (const selector of selectors) {
        const buttons = document.querySelectorAll(selector);
        console.log(`Found ${buttons.length} elements for selector: ${selector}`);

        for (const btn of buttons) {
            const text = btn.textContent?.toLowerCase() || '';
            const href = (btn as HTMLAnchorElement).href?.toLowerCase() || '';

            if (text.includes('create') || text.includes('list') || href.includes('sell') || href.includes('create')) {
                console.log('✓ Found Create Listing button, clicking...', btn);
                justClickedCreateButton = true;
                (btn as HTMLElement).click();
                return true;
            }
        }
    }

    console.log('Create Listing button not found with any selector');
    return false;
}

/**
 * Auto-fill the eBay listing form with product data
 */
async function autoFillEbayForm(product: ProductData) {
    console.log('Auto-filling eBay form with:', product);

    // Wait for form elements to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    const listTypeLabel = product.listType?.toUpperCase() || 'STANDARD';
    console.log(`Using ${listTypeLabel}-List mode`);

    let fieldsCompleted = 0;

    // Fill title field
    const titleSelectors = [
        'input[name*="title"]',
        'input[id*="title"]',
        'textarea[name*="title"]',
        'input[placeholder*="title" i]',
        '#listings\\.title',
        'input[data-testid*="title"]'
    ];

    for (const selector of titleSelectors) {
        const titleInput = document.querySelector(selector) as HTMLInputElement;
        if (titleInput && titleInput.offsetParent !== null && product.title) {
            titleInput.focus();
            titleInput.value = product.title;
            titleInput.dispatchEvent(new Event('input', { bubbles: true }));
            titleInput.dispatchEvent(new Event('change', { bubbles: true }));
            titleInput.blur();
            console.log('✓ Title filled:', product.title.substring(0, 50) + '...');
            fieldsCompleted++;
            break;
        }
    }

    // Fill description field
    const descSelectors = [
        'textarea[name*="description"]',
        'textarea[id*="description"]',
        'div[contenteditable="true"]',
        'iframe[id*="description"]',
        '#listings\\.description',
        'textarea[data-testid*="description"]'
    ];

    for (const selector of descSelectors) {
        const descriptionInput = document.querySelector(selector) as HTMLElement;
        if (descriptionInput && descriptionInput.offsetParent !== null && product.description) {
            if (descriptionInput.tagName === 'TEXTAREA') {
                (descriptionInput as HTMLTextAreaElement).focus();
                (descriptionInput as HTMLTextAreaElement).value = product.description + `\n\n[${listTypeLabel}-List]`;
                descriptionInput.dispatchEvent(new Event('input', { bubbles: true }));
                descriptionInput.dispatchEvent(new Event('change', { bubbles: true }));
                (descriptionInput as HTMLTextAreaElement).blur();
            } else if (descriptionInput.tagName === 'DIV') {
                descriptionInput.focus();
                descriptionInput.innerText = product.description + `\n\n[${listTypeLabel}-List]`;
                descriptionInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            console.log('✓ Description filled');
            fieldsCompleted++;
            break;
        }
    }

    // Fill price field
    if (product.price) {
        const priceSelectors = [
            'input[name*="price"]',
            'input[id*="price"]',
            'input[placeholder*="price" i]',
            'input[type="number"]',
            'input[data-testid*="price"]'
        ];

        for (const selector of priceSelectors) {
            const priceInput = document.querySelector(selector) as HTMLInputElement;
            if (priceInput && priceInput.offsetParent !== null) {
                priceInput.focus();
                priceInput.value = product.price;
                priceInput.dispatchEvent(new Event('input', { bubbles: true }));
                priceInput.dispatchEvent(new Event('change', { bubbles: true }));
                priceInput.blur();
                console.log('✓ Price filled:', product.price);
                fieldsCompleted++;
                break;
            }
        }
    }

    // Set condition to "New"
    const conditionSelectors = [
        'select[name*="condition"]',
        'select[id*="condition"]',
        'input[name*="condition"][value*="New"]',
        'input[name*="condition"][value="1000"]'
    ];

    for (const selector of conditionSelectors) {
        const conditionInput = document.querySelector(selector);
        if (conditionInput) {
            if (conditionInput.tagName === 'SELECT') {
                const selectEl = conditionInput as HTMLSelectElement;
                // Try to find "New" option
                for (let i = 0; i < selectEl.options.length; i++) {
                    if (selectEl.options[i].text.toLowerCase().includes('new')) {
                        selectEl.selectedIndex = i;
                        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
                        console.log('✓ Condition set to New');
                        fieldsCompleted++;
                        break;
                    }
                }
            } else if (conditionInput.tagName === 'INPUT') {
                (conditionInput as HTMLInputElement).click();
                console.log('✓ Condition set to New');
                fieldsCompleted++;
            }
            break;
        }
    }

    // Set quantity to 1
    const quantitySelectors = [
        'input[name*="quantity"]',
        'input[id*="quantity"]',
        'input[placeholder*="quantity" i]'
    ];

    for (const selector of quantitySelectors) {
        const quantityInput = document.querySelector(selector) as HTMLInputElement;
        if (quantityInput && quantityInput.offsetParent !== null) {
            quantityInput.focus();
            quantityInput.value = '1';
            quantityInput.dispatchEvent(new Event('input', { bubbles: true }));
            quantityInput.dispatchEvent(new Event('change', { bubbles: true }));
            quantityInput.blur();
            console.log('✓ Quantity set to 1');
            fieldsCompleted++;
            break;
        }
    }

    console.log(`✓ eBay form auto-fill complete! Filled ${fieldsCompleted} fields (${product.index! + 1}/${product.total})`);

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
    notification.textContent = `✓ Auto-filled ${fieldsCompleted} fields with Amazon data!`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
}

// Main automation logic when eBay page loads
(async function initEbayAutomation() {
    console.log('🔧 Initializing eBay automation...');
    console.log('🕒 Init timestamp:', new Date().toISOString());

    // Wait a bit for page to load
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log('⏰ After initial delay');

    // Check for pending automation data
    chrome.storage.local.get(['automationInProgress'], async (data: any) => {
        console.log('📊 Storage check - automationInProgress:', data.automationInProgress);

        if (!data.automationInProgress) {
            console.log('⚠️ No automation in progress - exiting');
            return;
        }

        console.log('✅ Automation in progress confirmed!');

        // STEP 1: If we're on the search/sell page, auto-search for the product
        if ((window.location.href.includes('ebay.com/sl/sell?sr=shListingsCTA') ||
            window.location.href.includes('ebay.com/sl/sell')) &&
            !searchExecuted) {
            console.log('🔍 On eBay sell/search page, looking for scraped product data...');
            console.log('📍 Current URL:', window.location.href);

            // Find this tab's product data from scraped Amazon data
            chrome.storage.local.get(null, async (allData: any) => {
                console.log('📦 Checking storage for scraped products...');

                // Log all scraped products found (ASIN-based)
                const scrapedProducts = Object.keys(allData).filter(key =>
                    key.startsWith('scrapedProduct_') && key.length > 20 // ASIN keys are longer
                );
                console.log(`📊 Found ${scrapedProducts.length} ASIN-based scraped products in storage`);

                // Find the first scraped product that hasn't been searched yet
                // Priority: Check ASIN-based keys first
                for (const key of scrapedProducts) {
                    const productData = allData[key] as ProductData;
                    const asin = productData.asin;

                    if (asin && !allData[`searched_${asin}`]) {
                        console.log(`✅ Found scraped product with ASIN: ${asin}`);
                        console.log('� Title:', productData.title?.substring(0, 50));

                        const titleToSearch = productData.searchTitle || productData.title;
                        if (titleToSearch) {
                            console.log('🎯 Starting auto-search for:', titleToSearch);
                            const searched = await autoSearchEbay(titleToSearch);

                            if (searched) {
                                // Mark as searched using ASIN
                                await chrome.storage.local.set({
                                    [`searched_${asin}`]: true,
                                    [`currentAsin`]: asin // Track current ASIN for form filling
                                });
                                console.log('✅ Search executed successfully for ASIN:', asin);
                                console.log('⏳ Waiting for search results page to load...');
                            } else {
                                console.error('❌ Failed to execute search for ASIN:', asin);
                            }
                        } else {
                            console.error('❌ No title found in scraped product data!');
                        }
                        break;
                    }
                }
            });
            return;
        }

        // STEP 1.5: Handle product identification page (appears after search)
        if (window.location.href.includes('ebay.com/sl/prelist/identify') ||
            window.location.href.includes('ebay.com/sl/prelist') ||
            window.location.href.includes('prelist/identify')) {
            console.log('🎯 On product identification page!');

            // Wait a moment for page elements to load
            await new Promise(resolve => setTimeout(resolve, 1500));

            const handled = await autoHandleProductIdentification();
            if (handled) {
                console.log('✅ Product identification completed, waiting for next page...');

                // Wait for condition picker or listing form
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Check if condition picker appeared
                if (await autoHandleConditionPicker()) {
                    console.log('✅ Condition selected, proceeding to listing form...');
                }
            } else {
                console.error('❌ Failed to handle product identification page');
            }
            return;
        }

        // STEP 1.6: Handle condition selection dialog if it appears
        if (window.location.href.includes('ebay.com/sl/') &&
            document.querySelector('.conditions, [class*="condition"], [class*="CONDITION"]')) {
            console.log('🎯 On condition selection page!');

            await new Promise(resolve => setTimeout(resolve, 1000));

            if (await autoHandleConditionPicker()) {
                console.log('✅ Condition selected, waiting for listing form...');
            }
            return;
        }

        // STEP 2: If we're on the sell page after search, click Create Listing button
        if ((window.location.href.includes('ebay.com/sl/sell') ||
            window.location.href.includes('ebay.com/sell') ||
            window.location.href.includes('selling/listings')) &&
            !justClickedCreateButton &&
            searchExecuted) {
            console.log('On sell page after search, looking for Create Listing button...');
            const clicked = await autoClickCreateListingButton();
            if (clicked) {
                console.log('✓ Clicked Create Listing button, waiting for listing form...');
                return; // Wait for the next page to load
            }
        }

        // STEP 3: If we're on the listing creation form, auto-fill it
        if (window.location.href.includes('ebay.com/sell/create') ||
            window.location.href.includes('ebay.com/sl/list') ||
            window.location.href.includes('ebay.com/sl/create') ||
            window.location.href.includes('ebay.com/list') ||
            justClickedCreateButton) {
            console.log('✅ On listing creation form! URL:', window.location.href);
            console.log('📝 Looking for scraped product data...');

            // Find this tab's scraped product data by ASIN
            chrome.storage.local.get(null, async (allData: any) => {
                // Get current ASIN being processed
                const currentAsin = allData.currentAsin;

                if (currentAsin) {
                    const scrapedKey = `scrapedProduct_${currentAsin}`;

                    if (allData[scrapedKey] && !allData[`processed_${currentAsin}`]) {
                        const productData = allData[scrapedKey] as ProductData;
                        console.log(`✅ Found scraped product with ASIN: ${currentAsin}`);
                        console.log('📝 Title:', productData.title?.substring(0, 50));

                        try {
                            // Use the scraped data directly (no need to fetch from Amazon again)
                            await autoFillEbayForm(productData);

                            // Mark this product as processed (by ASIN)
                            await chrome.storage.local.set({ [`processed_${currentAsin}`]: true });

                            // Send success message to background script
                            chrome.runtime.sendMessage({
                                type: 'itemListed',
                                asin: currentAsin,
                                success: true,
                                message: 'Successfully listed: ' + productData.title
                            });

                            console.log('✅ Sent itemListed message for ASIN:', currentAsin);

                            // Check if all products are processed
                            const total = productData.total || 1;
                            let allProcessed = true;

                            // Check both ASIN-based and index-based keys
                            const allAsins = Object.keys(allData)
                                .filter(key => key.startsWith('scrapedProduct_') && key.length > 20)
                                .map(key => allData[key].asin)
                                .filter(Boolean);

                            for (const asin of allAsins) {
                                if (!allData[`processed_${asin}`]) {
                                    allProcessed = false;
                                    break;
                                }
                            }

                            if (allProcessed) {
                                console.log('🎉 All products processed, cleaning up...');
                                // Clean up storage
                                const keysToRemove = ['automationInProgress', 'pendingUrls', 'automationType', 'automationStep', 'currentAsin'];

                                // Remove ASIN-based keys
                                for (const asin of allAsins) {
                                    keysToRemove.push(`scrapedProduct_${asin}`);
                                    keysToRemove.push(`searched_${asin}`);
                                    keysToRemove.push(`processed_${asin}`);
                                }

                                // Remove index-based keys (backup)
                                for (let j = 0; j < total; j++) {
                                    keysToRemove.push(`pendingProduct_${j}`);
                                    keysToRemove.push(`scrapedProduct_${j}`);
                                    keysToRemove.push(`searched_${j}`);
                                    keysToRemove.push(`processed_${j}`);
                                }

                                chrome.storage.local.remove(keysToRemove);
                                console.log('🧹 Storage cleaned up');
                            }
                        } catch (error) {
                            console.error('❌ Error during form fill:', error);

                            // Send failure message
                            chrome.runtime.sendMessage({
                                type: 'itemFailed',
                                asin: currentAsin,
                                success: false,
                                message: 'Failed to list: ' + (error as Error).message
                            });
                        }

                        return; // Exit after processing
                    }
                } else {
                    console.warn('⚠️ No currentAsin found in storage, falling back to index-based lookup');

                    // Fallback to index-based lookup
                    for (let i = 0; i < 100; i++) {
                        const scrapedKey = `scrapedProduct_${i}`;
                        if (allData[scrapedKey] && !allData[`processed_${i}`]) {
                            const productData = allData[scrapedKey] as ProductData;
                            const asin = productData.asin || `index_${i}`;

                            console.log(`Found scraped product at index ${i}`);

                            try {
                                await autoFillEbayForm(productData);
                                await chrome.storage.local.set({ [`processed_${i}`]: true });

                                chrome.runtime.sendMessage({
                                    type: 'itemListed',
                                    asin: asin,
                                    success: true,
                                    message: 'Successfully listed: ' + productData.title
                                });
                            } catch (error) {
                                chrome.runtime.sendMessage({
                                    type: 'itemFailed',
                                    asin: asin,
                                    success: false,
                                    message: 'Failed: ' + (error as Error).message
                                });
                            }

                            return; // Exit after processing
                        }
                    }
                }
            });
        }
    });
})();

export { };
