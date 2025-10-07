# eBay Automation Feature

## Overview
This feature automates the process of creating eBay listings from Amazon product URLs using the Bulk Lister page.

## How It Works

### 1. Bulk Lister Page
- Enter Amazon product URLs (one per line) in the "Amazon Links" textarea
- Click one of three listing modes:
  - **Opti-List** - Optimized listings
  - **Seo-List** - SEO-optimized listings  
  - **Standard-List** - Standard listings

### 2. Automated Tab Opening
- The system automatically opens a new eBay listing tab for **each Amazon URL**
- Each tab opens with a 500ms delay to prevent overwhelming the browser
- Only the first tab becomes active; others open in the background

### 3. Auto-Fill Process
- Each eBay listing page automatically detects it should be filled
- The content script:
  - Extracts the ASIN from the Amazon URL
  - Creates basic product information
  - Auto-fills the eBay listing form with available data
  - Adds a source reference noting the Amazon URL and list type

### 4. Complete Listings
- Each tab is ready for you to complete the listing manually
- Add additional details (category, condition, price, images, etc.)
- Submit each listing when ready

## Files Created/Modified

### 1. `/apps/extension/src/pages/BulkLister.tsx` (Updated)
Added automation functions:
- `startEbayAutomation()` - Main automation orchestrator
- `handleOptiList()` - Opti-List button handler
- `handleSeoList()` - Seo-List button handler  
- `handleStandardList()` - Standard-List button handler

Features:
- Validates Amazon URLs are provided
- Stores list type and URLs in Chrome storage
- Opens multiple eBay tabs with delays
- Provides console logging for tracking

### 2. `/apps/extension/src/content/ebay-automation.ts` (Updated)
Enhanced content script that:
- Runs on all eBay listing pages
- Detects pending automation from storage
- Fetches Amazon product data (ASIN extraction)
- Auto-fills eBay listing forms
- Tracks which products have been processed
- Cleans up storage when all listings are complete

Functions:
- `extractAsin()` - Extracts ASIN from Amazon URLs
- `fetchAmazonProductData()` - Gets product information
- `autoFillEbayForm()` - Fills eBay form fields
- `initEbayAutomation()` - Main initialization function

### 3. `/apps/extension/manifest.config.ts` (Already Updated)
Includes:
- Content script registration for eBay pages
- Required permissions (tabs, storage, scripting)
- Host permissions for eBay and Amazon

## Usage

### Step 1: Add Amazon URLs
1. Open the Bulk Lister page
2. Paste Amazon product URLs in the "Amazon Links" field
3. One URL per line, for example:
   ```
   https://www.amazon.com/dp/B08N5WRWNW
   https://www.amazon.com/dp/B07XJ8C8F5
   https://www.amazon.com/dp/B0863TXGM3
   ```

### Step 2: Start Automation
Click one of:
- **Opti-List** - For optimized listings
- **Seo-List** - For SEO-focused listings
- **Standard-List** - For standard listings

### Step 3: Monitor Progress
- Check the log output in the Bulk Lister page
- Watch as eBay tabs open automatically
- Each tab will auto-fill with product data

### Step 4: Complete Each Listing
For each eBay tab:
1. Review the auto-filled title and description
2. Add product category
3. Set condition (New, Used, etc.)
4. Add price and quantity
5. Upload images
6. Configure shipping options
7. Click "List Item" to publish

## Technical Details

### Data Storage Structure
```javascript
{
  automationType: 'opti' | 'seo' | 'standard',
  automationInProgress: true,
  pendingUrls: ['url1', 'url2', ...],
  pendingProduct_0: { url, amazonUrl, index, total, listType },
  pendingProduct_1: { url, amazonUrl, index, total, listType },
  // ... one entry per URL
  processed_0: true,  // marked after auto-fill
  processed_1: false, // not yet processed
  // ...
}
```

### Tab Opening Logic
- Opens one tab per Amazon URL
- 500ms delay between tabs
- First tab active, rest in background
- Prevents browser tab limit issues

### Auto-Fill Logic
- Waits 1.5s for page load
- Checks for `automationInProgress` flag
- Finds first unprocessed product
- Fetches Amazon data (ASIN extraction)
- Fills form fields with smart selectors
- Marks product as processed
- Cleans up when all done

## Current Status

✅ **Fully Implemented:**
- Multiple Amazon URL support
- Three listing mode buttons (Opti, Seo, Standard)
- Automatic tab opening for each URL
- Tab opening delays to prevent overwhelming
- ASIN extraction from Amazon URLs
- Auto-fill of basic product data
- List type tracking (Opti/Seo/Standard)
- Automatic cleanup after all products processed
- Console logging for debugging

🔄 **Ready for Enhancement:**
- Fetch full product details from Amazon (requires API/scraping)
- Auto-upload product images
- Auto-select categories
- Auto-fill pricing based on rules
- Auto-configure shipping options

## Examples

### Example 1: List 3 Products with Opti-List
```
Input (Amazon Links):
https://www.amazon.com/dp/B08N5WRWNW
https://www.amazon.com/dp/B07XJ8C8F5  
https://www.amazon.com/dp/B0863TXGM3

Action: Click "Opti-List"

Result: 
- 3 eBay tabs open automatically
- Each has ASIN and source URL filled
- Each marked as "[OPTI-List]" in description
```

### Example 2: SEO-Optimized Listings
```
Input: 5 Amazon URLs
Action: Click "Seo-List"
Result: 5 eBay tabs open with [SEO-List] marking
```

## Debugging

### Check Storage Data
Open Console (F12) and run:
```javascript
chrome.storage.local.get(null, console.log);
```

### Check Automation Status
```javascript
chrome.storage.local.get(['automationInProgress', 'pendingUrls'], console.log);
```

### Clear Automation Data
```javascript
chrome.storage.local.clear();
```

### Console Logs to Look For
- "eBay automation content script loaded on: [URL]"
- "On eBay listing page, checking for pending automation..."
- "Found product data at index X:"
- "✓ Title filled: [title]"
- "✓ eBay form auto-fill complete (X/Y)"

## Troubleshooting

### Problem: No tabs opening
**Solution:** 
- Check that you entered valid Amazon URLs
- Ensure pop-ups are allowed for the extension
- Check browser console for errors

### Problem: Auto-fill not working
**Solution:**
- Check Console for "No automation in progress"
- Verify storage contains product data
- Try manually: `chrome.storage.local.get(null, console.log)`
- Reload the eBay tab

### Problem: Some products not processing
**Solution:**
- Check which products are marked as `processed_X: true`
- Manually clear storage and retry
- Ensure tabs are actually on eBay listing page

## Next Development Steps

1. **Amazon Product Scraping**
   - Integrate with your Amazon scraping backend
   - Fetch full title, description, images, price
   - Use product data API if available

2. **Image Upload Automation**
   - Download images from Amazon
   - Upload via eBay's image upload interface
   - Handle multiple images per listing

3. **Smart Category Selection**
   - Map Amazon categories to eBay categories
   - Auto-select based on product type
   - Fallback to manual selection

4. **Pricing Rules**
   - Apply markup/markdown rules
   - Consider shipping costs
   - Competitive pricing analysis

5. **Bulk Actions**
   - Process all listings at once
   - Queue management
   - Error recovery and retry logic
