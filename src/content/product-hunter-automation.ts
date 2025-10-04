/**
 * Product Hunter Automation Script
 * Extracts Amazon product data and triggers eBay listing automation
 */

interface ProductData {
  url: string;
  title: string;
  description: string;
  price?: string;
  imageUrl?: string;
  asin?: string;
}

/**
 * Extract product data from the first row in the Product Hunter results table
 */
function extractFirstProductData(): ProductData | null {
  const table = document.getElementById('productTable');
  if (!table) {
    console.error('Product table not found');
    return null;
  }

  const tbody = table.querySelector('tbody');
  if (!tbody) {
    console.error('Table body not found');
    return null;
  }

  const firstRow = tbody.querySelector('tr');
  if (!firstRow) {
    console.error('No products found in table');
    return null;
  }

  try {
    // Extract data from the first row
    const cells = firstRow.querySelectorAll('td');
    
    // Get image
    const imageCell = cells[0];
    const img = imageCell?.querySelector('img');
    const imageUrl = img?.src || '';

    // Get title and URL
    const titleCell = cells[1];
    const titleLink = titleCell?.querySelector('a');
    const title = titleLink?.textContent?.trim() || '';
    const url = titleLink?.href || '';

    // Get price
    const priceCell = cells[2];
    const price = priceCell?.textContent?.trim() || '';

    // Get ASIN (hidden column)
    const asinCell = cells[4]; // The hidden ASIN column
    const asin = asinCell?.textContent?.trim() || '';

    // For description, we'll need to fetch it from Amazon or use title as fallback
    const description = `${title}\n\nPrice: ${price}\nASIN: ${asin}`;

    return {
      url,
      title,
      description,
      price,
      imageUrl,
      asin
    };
  } catch (error) {
    console.error('Error extracting product data:', error);
    return null;
  }
}

/**
 * Start the eBay automation process
 */
async function startEbayAutomation() {
  console.log('Starting eBay automation...');

  // Extract product data from the first result
  const product = extractFirstProductData();
  
  if (!product) {
    alert('No products found. Please run a search first.');
    return;
  }

  console.log('Extracted product data:', product);

  // Open eBay listing page in a new tab
  const ebayUrl = 'https://www.ebay.com/help/selling/listings/creating-listing?id=4105';
  
  // Store product data in chrome storage
  await chrome.storage.local.set({ 
    pendingProduct: product,
    automationInProgress: true 
  });

  // Open eBay in new tab
  chrome.tabs.create({ url: ebayUrl }, (tab: any) => {
    console.log('Opened eBay tab:', tab.id);
    
    // Send message to content script after a delay to ensure page loads
    setTimeout(() => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'START_EBAY_AUTOMATION',
          product
        }).catch((err: any) => console.log('Message send delayed, will retry on page load'));
      }
    }, 3000);
  });
}

/**
 * Initialize the automation button
 */
function initializeAutomation() {
  // Wait for the page to load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachButtonHandler);
  } else {
    attachButtonHandler();
  }
}

/**
 * Attach click handler to the Bulk List button
 */
function attachButtonHandler() {
  // Find the "Bulk List" button
  const bulkListBtn = document.getElementById('exportResultsToBulk');
  
  if (bulkListBtn) {
    console.log('Found Bulk List button, attaching automation handler');
    
    // Remove existing click handlers and add our automation
    const newBtn = bulkListBtn.cloneNode(true) as HTMLElement;
    bulkListBtn.parentNode?.replaceChild(newBtn, bulkListBtn);
    
    newBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Confirm with user
      if (confirm('Start eBay listing automation with the first product?')) {
        await startEbayAutomation();
      }
    });
    
    console.log('Automation handler attached to Bulk List button');
  } else {
    console.log('Bulk List button not found yet, will retry...');
    // Retry after a short delay
    setTimeout(attachButtonHandler, 1000);
  }
}

// Initialize when script loads
initializeAutomation();

export {};
