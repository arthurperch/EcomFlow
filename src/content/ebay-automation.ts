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
  imageUrl?: string;
  images?: string[];
  asin?: string;
  brand?: string;
  features?: string[];
  index?: number;
  total?: number;
  listType?: 'opti' | 'seo' | 'standard';
}

console.log('eBay automation content script loaded on:', window.location.href);

/**
 * Auto-click the Create Listing button on eBay help/landing pages
 */
async function autoClickCreateListingButton() {
  console.log('Looking for Create Listing button...');
  
  // Wait a bit for page to load
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Try the specific selector you provided
  const selectors = [
    '.create-listing-btn a.fake-btn',
    '.create-listing-btn>a.fake-btn',
    'a.fake-btn',
    '.create-listing-btn a',
    'a[href*="sell"]',
    'a[href*="create"]',
    'button[type="submit"]'
  ];
  
  for (const selector of selectors) {
    const buttons = document.querySelectorAll(selector);
    console.log(`Checking selector "${selector}": found ${buttons.length} elements`);
    
    for (const btn of buttons) {
      const text = btn.textContent?.toLowerCase() || '';
      const href = (btn as HTMLAnchorElement).href?.toLowerCase() || '';
      
      console.log(`  Button text: "${text}", href: "${href}"`);
      
      if (text.includes('create') || text.includes('list') || text.includes('sell') || 
          href.includes('sell') || href.includes('create')) {
        console.log('✓ Found Create Listing button! Clicking...', btn);
        (btn as HTMLElement).click();
        
        // Store that we clicked to avoid auto-filling on the current page
        await chrome.storage.local.set({ justClickedCreateButton: true });
        
        return true;
      }
    }
  }
  
  console.log('⚠ Create Listing button not found with any selector');
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
 * Fetch full product data from Amazon by opening the page and scraping it
 */
async function fetchAmazonProductData(amazonUrl: string): Promise<Partial<ProductData>> {
  try {
    const asin = extractAsin(amazonUrl);
    console.log('Fetching Amazon product data for ASIN:', asin);
    
    // Fetch the Amazon page
    const response = await fetch(amazonUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Amazon page: ${response.status}`);
    }
    
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Extract title
    let title = doc.querySelector('#productTitle')?.textContent?.trim() || '';
    if (!title) {
      title = doc.querySelector('h1.a-size-large')?.textContent?.trim() || '';
    }
    
    // Extract price
    let price = '';
    const priceWhole = doc.querySelector('.a-price-whole')?.textContent?.trim() || '';
    const priceFraction = doc.querySelector('.a-price-fraction')?.textContent?.trim() || '';
    if (priceWhole) {
      price = `$${priceWhole}${priceFraction}`;
    } else {
      price = doc.querySelector('.a-price .a-offscreen')?.textContent?.trim() || '';
    }
    
    // Extract brand
    const brand = doc.querySelector('#bylineInfo')?.textContent?.trim().replace('Visit the ', '').replace(' Store', '') || '';
    
    // Extract features/description
    const features: string[] = [];
    doc.querySelectorAll('#feature-bullets ul li span').forEach(el => {
      const text = el.textContent?.trim();
      if (text && text.length > 5) {
        features.push(text);
      }
    });
    
    // Extract images
    const images: string[] = [];
    doc.querySelectorAll('#altImages img').forEach(img => {
      const src = (img as HTMLImageElement).src;
      if (src && !src.includes('play-icon') && !src.includes('video')) {
        // Get high-res version
        const hiRes = src.replace(/\._.*?_\./, '.');
        images.push(hiRes);
      }
    });
    
    // Main image
    const mainImage = doc.querySelector('#landingImage, #imgBlkFront')?.getAttribute('src') || '';
    if (mainImage && !images.includes(mainImage)) {
      images.unshift(mainImage);
    }
    
    // Build description
    let description = '';
    if (brand) description += `Brand: ${brand}\n\n`;
    if (features.length > 0) {
      description += 'Features:\n' + features.map(f => `• ${f}`).join('\n');
    }
    
    console.log('✓ Fetched Amazon data:', { title, price, brand, features: features.length, images: images.length });
    
    return {
      amazonUrl,
      asin: asin || undefined,
      title: title || `Product ${asin}`,
      description: description || `Amazon product ${asin}`,
      price,
      brand,
      features,
      images: images.slice(0, 10), // Limit to 10 images
      imageUrl: images[0] || ''
    };
  } catch (error) {
    console.error('Error fetching Amazon data:', error);
    
    // Fallback to basic data
    const asin = extractAsin(amazonUrl);
    return {
      amazonUrl,
      asin: asin || undefined,
      title: `Product from Amazon ${asin || ''}`,
      description: `Amazon ASIN: ${asin}\nSource: ${amazonUrl}`,
      price: '',
      imageUrl: ''
    };
  }
}

/**
 * Auto-fill the eBay listing form with product data
 */
async function autoFillEbayForm(product: ProductData) {
  console.log('Starting auto-fill with product:', product);
  
  // Wait for form elements to load
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const listTypeLabel = product.listType?.toUpperCase() || 'STANDARD';
  console.log(`Using ${listTypeLabel}-List mode`);
  
  let fieldsCompleted = 0;
  
  // Fill Title
  if (product.title) {
    const titleSelectors = [
      'input[name*="title"]',
      'input[id*="title"]',
      'textarea[name*="title"]',
      'input[placeholder*="title" i]',
      '#listings\\.title',
      '[data-testid="title-input"]'
    ];
    
    for (const selector of titleSelectors) {
      const titleInput = document.querySelector(selector) as HTMLInputElement;
      if (titleInput && titleInput.offsetParent !== null) { // Check if visible
        titleInput.focus();
        titleInput.value = product.title;
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
        titleInput.dispatchEvent(new Event('change', { bubbles: true }));
        titleInput.dispatchEvent(new Event('blur', { bubbles: true }));
        console.log('✓ Title filled:', product.title);
        fieldsCompleted++;
        break;
      }
    }
  }
  
  // Fill Description
  if (product.description) {
    const descSelectors = [
      'textarea[name*="description"]',
      'textarea[id*="description"]',
      'div[contenteditable="true"]',
      '[data-testid="description-textarea"]',
      '#listings\\.description'
    ];
    
    let fullDescription = product.description;
    
    // Add pricing info if available
    if (product.price) {
      fullDescription = `Price: ${product.price}\n\n${fullDescription}`;
    }
    
    // Add source reference
    fullDescription += `\n\n---\n[${listTypeLabel}-List] Source: ${product.amazonUrl}`;
    if (product.asin) {
      fullDescription += `\nASIN: ${product.asin}`;
    }
    
    for (const selector of descSelectors) {
      const descInput = document.querySelector(selector) as HTMLElement;
      if (descInput && descInput.offsetParent !== null) {
        descInput.focus();
        
        if (descInput.tagName === 'TEXTAREA') {
          (descInput as HTMLTextAreaElement).value = fullDescription;
          descInput.dispatchEvent(new Event('input', { bubbles: true }));
          descInput.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (descInput.contentEditable === 'true') {
          descInput.innerText = fullDescription;
          descInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        descInput.dispatchEvent(new Event('blur', { bubbles: true }));
        console.log('✓ Description filled');
        fieldsCompleted++;
        break;
      }
    }
  }
  
  // Fill Price (if available)
  if (product.price) {
    const priceValue = product.price.replace(/[^0-9.]/g, '');
    const priceSelectors = [
      'input[name*="price"]',
      'input[id*="price"]',
      'input[placeholder*="price" i]',
      '[data-testid="price-input"]'
    ];
    
    for (const selector of priceSelectors) {
      const priceInput = document.querySelector(selector) as HTMLInputElement;
      if (priceInput && priceInput.offsetParent !== null) {
        priceInput.focus();
        priceInput.value = priceValue;
        priceInput.dispatchEvent(new Event('input', { bubbles: true }));
        priceInput.dispatchEvent(new Event('change', { bubbles: true }));
        priceInput.dispatchEvent(new Event('blur', { bubbles: true }));
        console.log('✓ Price filled:', priceValue);
        fieldsCompleted++;
        break;
      }
    }
  }
  
  // Set Condition to New (if available)
  await new Promise(resolve => setTimeout(resolve, 500));
  const conditionSelectors = [
    'select[name*="condition"]',
    'select[id*="condition"]',
    '[data-testid="condition-select"]'
  ];
  
  for (const selector of conditionSelectors) {
    const conditionSelect = document.querySelector(selector) as HTMLSelectElement;
    if (conditionSelect && conditionSelect.offsetParent !== null) {
      // Try to select "New"
      const newOption = Array.from(conditionSelect.options).find(opt => 
        opt.text.toLowerCase().includes('new')
      );
      if (newOption) {
        conditionSelect.value = newOption.value;
        conditionSelect.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('✓ Condition set to: New');
        fieldsCompleted++;
      }
      break;
    }
  }
  
  // Set Quantity to 1
  const quantitySelectors = [
    'input[name*="quantity"]',
    'input[id*="quantity"]',
    '[data-testid="quantity-input"]'
  ];
  
  for (const selector of quantitySelectors) {
    const qtyInput = document.querySelector(selector) as HTMLInputElement;
    if (qtyInput && qtyInput.offsetParent !== null) {
      qtyInput.focus();
      qtyInput.value = '1';
      qtyInput.dispatchEvent(new Event('input', { bubbles: true }));
      qtyInput.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('✓ Quantity set to: 1');
      fieldsCompleted++;
      break;
    }
  }
  
  console.log(`✓ eBay form auto-fill complete (${product.index! + 1}/${product.total}) - ${fieldsCompleted} fields filled`);
  
  // Show success message
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 999999;
    font-size: 16px;
    font-family: Arial, sans-serif;
  `;
  notification.textContent = `✓ Auto-filled ${fieldsCompleted} fields from Amazon (${product.index! + 1}/${product.total})`;
  document.body.appendChild(notification);
  
  setTimeout(() => notification.remove(), 5000);
}

// Main automation logic when eBay page loads
(async function initEbayAutomation() {
  console.log('Initializing eBay automation...');
  
  // Check if we're on an eBay help/start page that needs button clicking
  if (window.location.href.includes('ebay.com/help/selling') || 
      window.location.href.includes('ebay.com/sell/start') ||
      document.querySelector('.create-listing-btn')) {
    
    chrome.storage.local.get(['automationInProgress', 'justClickedCreateButton'], async (data: any) => {
      if (data.automationInProgress && !data.justClickedCreateButton) {
        console.log('On eBay start page, attempting to click Create Listing button...');
        const clicked = await autoClickCreateListingButton();
        if (clicked) {
          console.log('✓ Button clicked, waiting for next page...');
        }
        return;
      }
    });
  }
  
  // Check if we're on eBay listing creation/edit page
  if (!window.location.href.includes('ebay.com/sell') && 
      !window.location.href.includes('ebay.com/list') &&
      !window.location.href.includes('ebay.com/sl/sell')) {
    console.log('Not on eBay listing page, skipping auto-fill');
    return;
  }

  console.log('On eBay listing page, checking for pending automation...');

  // Wait a bit for page to load
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Clear the button click flag
  chrome.storage.local.remove(['justClickedCreateButton']);

  // Check for pending automation data
  chrome.storage.local.get(['automationInProgress', 'pendingUrls'], async (data: any) => {
    if (!data.automationInProgress) {
      console.log('No automation in progress');
      return;
    }

    console.log('Automation in progress, looking for product data...');

    // Find this tab's product data
    chrome.storage.local.get(null, async (allData: any) => {
      // Find the first unused product
      for (let i = 0; i < 100; i++) {
        const key = `pendingProduct_${i}`;
        if (allData[key] && !allData[`processed_${i}`]) {
          const productData = allData[key] as ProductData;
          console.log(`Found product data at index ${i}:`, productData);

          // Fetch full data from Amazon URL
          console.log('Fetching Amazon product details...');
          const amazonData = await fetchAmazonProductData(productData.amazonUrl);
          const fullProduct = { ...productData, ...amazonData };
          
          console.log('Full product data ready:', fullProduct);

          // Auto-fill the form
          await autoFillEbayForm(fullProduct);

          // Mark this product as processed
          await chrome.storage.local.set({ [`processed_${i}`]: true });

          // Check if all products are processed
          const pendingUrls = allData.pendingUrls || [];
          let allProcessed = true;
          for (let j = 0; j < pendingUrls.length; j++) {
            if (!allData[`processed_${j}`]) {
              allProcessed = false;
              break;
            }
          }

          if (allProcessed) {
            console.log('✓ All products processed, cleaning up storage...');
            // Clean up storage
            const keysToRemove = ['automationInProgress', 'pendingUrls', 'automationType'];
            for (let j = 0; j < pendingUrls.length; j++) {
              keysToRemove.push(`pendingProduct_${j}`);
              keysToRemove.push(`processed_${j}`);
            }
            chrome.storage.local.remove(keysToRemove);
            console.log('✓ Cleanup complete!');
          }

          break;
        }
      }
    });
  });
})();

export {};
