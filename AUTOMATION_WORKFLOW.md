# eBay Bulk Listing Automation - 2-Step Workflow

## Overview
The automation now follows a proper 2-step workflow:
1. **STEP 1**: Open Amazon URLs → Scrape product data → Store temporarily
2. **STEP 2**: Open eBay → Auto-search with product title → Auto-fill form → Submit

## How It Works

### Step 1: Amazon Scraping (amazon-scraper.ts)
When you click **Opti-List**, **Seo-List**, or **Standard-List**:

1. **BulkLister** opens Amazon tabs (one at a time)
2. **amazon-scraper.ts** content script runs on each Amazon page
3. Scrapes the following data:
   - Product title
   - Price
   - Brand
   - Features (bullet points)
   - Images (high-res versions)
   - ASIN
   - Description (auto-generated from above)
4. Stores scraped data in `chrome.storage.local` as `scrapedProduct_0`, `scrapedProduct_1`, etc.
5. Automatically opens eBay search page
6. Closes the Amazon tab after 2 seconds

### Step 2: eBay Automation (ebay-automation.ts)
After Amazon data is scraped:

1. **eBay Search** (`ebay.com/sl/sell?sr=shListingsCTA`):
   - Auto-fills search box using selector: `.se-search-box .se-search-box__field.textbox input:placeholder-shown`
   - Uses scraped product title as search query
   - Presses Enter to submit search
   - Waits for results page

2. **Create Listing Button**:
   - Finds and clicks: `.create-listing-btn a.fake-btn`
   - Waits for listing creation form

3. **Auto-Fill Form**:
   - Title: Amazon product title
   - Description: Auto-generated from features
   - Price: Amazon price + markup (based on list type)
   - Condition: "New"
   - Quantity: 1
   - Category: Auto-detected
   - Item specifics: Brand, ASIN, etc.

## Storage Keys

### During Automation:
- `automationInProgress`: Boolean flag
- `automationStep`: "scrape_amazon" or "ebay_listing"
- `automationType`: "opti", "seo", or "standard"
- `pendingUrls`: Array of Amazon URLs

### Per Product:
- `pendingProduct_${i}`: Initial product data from BulkLister
- `scrapedProduct_${i}`: Full scraped data from Amazon
- `searched_${i}`: Boolean - has search been executed?
- `processed_${i}`: Boolean - has form been filled?

## Selectors Used

### Amazon:
- Title: `#productTitle`
- Price: `.a-price-whole`, `.a-price-fraction`
- Brand: `#bylineInfo`
- Features: `#feature-bullets ul li span.a-list-item`
- Images: `#altImages img`, `#main-image`, `#landingImage`

### eBay:
- Search box: `.se-search-box .se-search-box__field.textbox input:placeholder-shown`
- Create Listing: `.create-listing-btn a.fake-btn`
- Title input: `input[name="title"]`, `#title`
- Description: `textarea[name="description"]`, `#description`
- Price: `input[name="price"]`, `#price`
- Condition: `select[name="condition"]`, `#condition`
- Quantity: `input[name="quantity"]`, `#quantity`

## Timing

- **Between Amazon tabs**: 1000ms (1 second)
- **Amazon page load**: 2000ms wait before scraping
- **eBay page load**: 3000ms wait before searching
- **Before Enter press**: 500ms after filling search box
- **Amazon tab close**: 2000ms after opening eBay

## Success Indicators

### Amazon Scraping:
- ✓ Green notification appears: "Scraped: [product title]"
- ✓ Console logs: "Scraping complete!"
- ✓ eBay tab opens automatically

### eBay Search:
- ✓ Search box fills with product title
- ✓ Console logs: "Search submitted!"
- ✓ Page navigates to search results

### eBay Form Fill:
- ✓ All fields populated
- ✓ Console logs: "Form auto-filled successfully"
- ✓ Green notification: "Auto-filled: [product title]"

## Single-Threaded Processing

The automation processes one URL at a time:
1. Open Amazon URL #1
2. Scrape data
3. Open eBay for #1
4. Fill form
5. Repeat for URL #2, etc.

This ensures reliable data capture and prevents race conditions.

## Debugging

### Check Console:
- Open DevTools (F12)
- Look for logs prefixed with:
  - "Amazon scraping script loaded"
  - "Starting Amazon product scrape"
  - "On eBay sell/search page"
  - "Found scraped product at index"

### Check Storage:
```javascript
chrome.storage.local.get(null, (data) => console.log(data));
```

### Common Issues:
1. **Search not executing**: Check if selector matches eBay's search box
2. **Data not scraping**: Verify Amazon page fully loaded
3. **Form not filling**: Check if Create Listing button was clicked
4. **Tabs not opening**: Check permissions in manifest.json

## Future Enhancements

- [ ] Batch processing with parallel tabs
- [ ] Progress bar in extension popup
- [ ] Error recovery and retry logic
- [ ] Custom field mappings
- [ ] Image upload automation
- [ ] Category selection logic
