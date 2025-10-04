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
  asin?: string;
  index?: number;
  total?: number;
  listType?: 'opti' | 'seo' | 'standard';
}

console.log('eBay automation content script loaded on:', window.location.href);

/**
 * Extract ASIN from Amazon URL
 */
function extractAsin(url: string): string | null {
  const match = url.match(/\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})|\/ASIN\/([A-Z0-9]{10})/i);
  return match ? (match[1] || match[2] || match[3]) : null;
}

/**
 * Fetch product data from Amazon (simplified - you may need to use your backend)
 */
async function fetchAmazonProductData(amazonUrl: string): Promise<Partial<ProductData>> {
  try {
    const asin = extractAsin(amazonUrl);
    console.log('Extracted ASIN:', asin);
    
    // For now, return basic data - in production, you'd fetch from Amazon or your backend
    return {
      amazonUrl,
      asin: asin || undefined,
      title: `Product from ${amazonUrl}`,
      description: `Amazon ASIN: ${asin}\nSource: ${amazonUrl}`,
      price: '',
      imageUrl: ''
    };
  } catch (error) {
    console.error('Error fetching Amazon data:', error);
    return { amazonUrl };
  }
}

/**
 * Auto-fill the eBay listing form with product data
 */
async function autoFillEbayForm(product: ProductData) {
  console.log('Auto-filling eBay form with:', product);
  
  // Wait for form elements to load
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const listTypeLabel = product.listType?.toUpperCase() || 'STANDARD';
  console.log(`Using ${listTypeLabel}-List mode`);
  
  // Try to fill title field
  const titleSelectors = [
    'input[name*="title"]',
    'input[id*="title"]',
    'textarea[name*="title"]',
    'input[placeholder*="title" i]',
    '#listings\\.title'
  ];
  
  for (const selector of titleSelectors) {
    const titleInput = document.querySelector(selector) as HTMLInputElement;
    if (titleInput && product.title) {
      titleInput.value = product.title;
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      titleInput.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('✓ Title filled:', product.title);
      break;
    }
  }
  
  // Try to fill description field
  const descSelectors = [
    'textarea[name*="description"]',
    'textarea[id*="description"]',
    'div[contenteditable="true"]',
    'iframe[id*="description"]',
    '#listings\\.description'
  ];
  
  for (const selector of descSelectors) {
    const descriptionInput = document.querySelector(selector) as HTMLElement;
    if (descriptionInput && product.description) {
      if (descriptionInput.tagName === 'TEXTAREA') {
        (descriptionInput as HTMLTextAreaElement).value = product.description;
        descriptionInput.dispatchEvent(new Event('input', { bubbles: true }));
        descriptionInput.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (descriptionInput.tagName === 'DIV') {
        descriptionInput.innerText = product.description;
        descriptionInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      console.log('✓ Description filled');
      break;
    }
  }
  
  // Add Amazon URL reference
  const infoNote = `\n\n[${listTypeLabel}-List] Source: ${product.amazonUrl}`;
  const descField = document.querySelector('textarea[name*="description"]') as HTMLTextAreaElement;
  if (descField) {
    descField.value += infoNote;
    descField.dispatchEvent(new Event('input', { bubbles: true }));
  }
  
  console.log(`✓ eBay form auto-fill complete (${product.index! + 1}/${product.total})`);
}

// Main automation logic when eBay listing page loads
(async function initEbayAutomation() {
  // Check if we're on eBay listing creation page
  if (!window.location.href.includes('ebay.com/sell') && 
      !window.location.href.includes('ebay.com/list')) {
    console.log('Not on eBay listing page, skipping automation');
    return;
  }

  console.log('On eBay listing page, checking for pending automation...');

  // Wait a bit for page to load
  await new Promise(resolve => setTimeout(resolve, 1500));

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

          // Fetch additional data from Amazon URL
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
            const keysToRemove = ['automationInProgress', 'pendingUrls'];
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
  });
})();

export {};
