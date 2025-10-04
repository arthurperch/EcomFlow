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
}

console.log('eBay automation content script loaded on:', window.location.href);

let justClickedCreateButton = false;

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
  console.log('Initializing eBay automation...');
  
  // Wait a bit for page to load
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Check for pending automation data
  chrome.storage.local.get(['automationInProgress'], async (data: any) => {
    if (!data.automationInProgress) {
      console.log('No automation in progress');
      return;
    }
    
    console.log('Automation in progress!');
    
    // If we're on the sell page or initial listing page, try to click Create Listing button
    if ((window.location.href.includes('ebay.com/sl/sell') || 
         window.location.href.includes('ebay.com/sell') ||
         window.location.href.includes('selling/listings')) && 
        !justClickedCreateButton) {
      console.log('On sell page, looking for Create Listing button...');
      const clicked = await autoClickCreateListingButton();
      if (clicked) {
        console.log('✓ Clicked Create Listing button, waiting for listing form...');
        return; // Wait for the next page to load
      }
    }
    
    // If we're on the listing creation form, auto-fill it
    if (window.location.href.includes('ebay.com/sell/create') || 
        window.location.href.includes('ebay.com/list') ||
        justClickedCreateButton) {
      console.log('On listing creation form, looking for product data...');

      // Find this tab's product data
      chrome.storage.local.get(null, async (allData: any) => {
        // Find the first unused product
        for (let i = 0; i < 100; i++) {
          const key = `pendingProduct_${i}`;
          if (allData[key] && !allData[`processed_${i}`]) {
            const productData = allData[key] as ProductData;
            console.log(`Found product data at index ${i}:`, productData);

            // Fetch full data from Amazon URL
            const amazonData = await fetchAmazonProductData(productData.amazonUrl);
            const fullProduct = { ...productData, ...amazonData };

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
              console.log('All products processed, cleaning up...');
              // Clean up storage
              const keysToRemove = ['automationInProgress', 'pendingUrls', 'automationType'];
              for (let j = 0; j < pendingUrls.length; j++) {
                keysToRemove.push(`pendingProduct_${j}`);
                keysToRemove.push(`processed_${j}`);
              }
              chrome.storage.local.remove(keysToRemove);
            }

            break;
          }
        }
      });
    }
  });
})();

export {};
