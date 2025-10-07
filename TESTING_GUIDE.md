# Testing the eBay Automation

## Quick Start

### 1. Load the Extension
```powershell
# The extension is already built in:
# C:\dev\EcomFlow\apps\extension\dist
```

1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the folder: `C:\dev\EcomFlow\apps\extension\dist`

### 2. Test the Automation

#### Step 1: Prepare Amazon URLs
Get some Amazon product URLs. For example:
```
https://www.amazon.com/dp/B08N5WRWNW
https://www.amazon.com/dp/B07XJ8C8F5
https://www.amazon.com/dp/B0863TXGM3
```

#### Step 2: Open Bulk Lister
1. Click the extension icon in Chrome
2. Click "Open Bulk Lister"
3. Paste your Amazon URLs in the "Amazon Links" field (one per line)

#### Step 3: Start Automation
Choose your listing mode:
- Click **"Opti-List"** for optimized listings
- Click **"Seo-List"** for SEO-optimized listings  
- Click **"Standard-List"** for standard listings

#### Step 4: Watch the Magic! ✨
- Multiple eBay tabs will open automatically (one per URL)
- Each tab opens with a 500ms delay
- Each listing form auto-fills with product data
- Check the console log for progress updates

#### Step 5: Complete the Listings
In each eBay tab:
1. Review the auto-filled title and description
2. Add category, condition, price, quantity
3. Upload product images
4. Configure shipping
5. Click "List Item" to publish

## Expected Behavior

✅ **What Should Happen:**
1. You paste 3 Amazon URLs and click "Opti-List"
2. 3 eBay listing tabs open automatically
3. Each tab waits 1.5 seconds, then auto-fills basic data
4. Console shows: "✓ eBay form auto-fill complete (1/3)", "(2/3)", "(3/3)"
5. All tabs are ready for you to complete manually

✅ **Console Output:**
```
Starting OPTI-List automation for 3 URLs...
Opening eBay listing pages...
[1/3] Processing: https://www.amazon.com/dp/B08N5WRWNW
[2/3] Processing: https://www.amazon.com/dp/B07XJ8C8F5
[3/3] Processing: https://www.amazon.com/dp/B0863TXGM3
✓ Opened 3 eBay listing tabs
Please complete the listings in each tab.
```

✅ **In Each eBay Tab Console:**
```
eBay automation content script loaded on: https://www.ebay.com/sell/create
On eBay listing page, checking for pending automation...
Automation in progress, looking for product data...
Found product data at index 0: {amazonUrl: "...", listType: "opti"}
Extracted ASIN: B08N5WRWNW
Using OPTI-List mode
✓ Title filled: Product from https://www.amazon.com/dp/B08N5WRWNW
✓ Description filled
✓ eBay form auto-fill complete (1/3)
```

## Testing Different Scenarios

### Test 1: Single Product (Opti-List)
```
Input: 1 Amazon URL
Button: Opti-List
Expected: 1 tab opens, auto-fills, marked as [OPTI-List]
```

### Test 2: Multiple Products (Seo-List)
```
Input: 5 Amazon URLs
Button: Seo-List
Expected: 5 tabs open with 500ms delays, each marked as [SEO-List]
```

### Test 3: Many Products (Standard-List)
```
Input: 10 Amazon URLs
Button: Standard-List
Expected: 10 tabs open, first is active, rest in background
```

### Test 4: No URLs
```
Input: (empty field)
Button: Opti-List
Expected: Alert "Please enter Amazon product URLs first."
```

## Debugging

### Check Storage Data
Open Console (F12) on any page and run:
```javascript
chrome.storage.local.get(null, console.log);
```

Expected output:
```javascript
{
  automationType: "opti",
  automationInProgress: true,
  pendingUrls: ["url1", "url2", "url3"],
  pendingProduct_0: {url: "...", amazonUrl: "...", index: 0, total: 3, listType: "opti"},
  pendingProduct_1: {...},
  pendingProduct_2: {...},
  processed_0: true,  // After auto-fill completes
  processed_1: false,
  processed_2: false
}
```

### Check Automation Progress
```javascript
chrome.storage.local.get(['automationInProgress', 'pendingUrls'], console.log);
```

### Clear Stuck Automation
If automation gets stuck, clear storage:
```javascript
chrome.storage.local.clear();
console.log('Storage cleared');
```

### Check Specific Product
```javascript
chrome.storage.local.get(['pendingProduct_0'], console.log);
```

## Troubleshooting

### Problem: No tabs opening
**Symptoms:** Click button, nothing happens

**Solutions:**
- Check browser allows pop-ups for the extension
- Check Console for JavaScript errors
- Verify URLs are valid Amazon URLs
- Try with just 1 URL first

**Debug:**
```javascript
// Check if URLs are being stored
chrome.storage.local.get(['pendingUrls'], console.log);
```

### Problem: Tabs open but no auto-fill
**Symptoms:** eBay tabs open, forms remain empty

**Solutions:**
- Check Console in eBay tab for errors
- Verify you're on the correct eBay listing page
- Check storage contains product data
- Wait longer (some eBay pages load slowly)

**Debug:**
```javascript
// In eBay tab console:
chrome.storage.local.get(null, console.log);
// Should show pendingProduct_X entries
```

### Problem: Only first product auto-fills
**Symptoms:** First tab works, others don't

**Solutions:**
- Check if products are marked as processed
- Each tab should pick up the next unprocessed product
- Try reloading the eBay tabs

**Debug:**
```javascript
// Check which are processed
chrome.storage.local.get(null, (data) => {
  for (let i = 0; i < 10; i++) {
    if (data[`processed_${i}`] !== undefined) {
      console.log(`Product ${i}: ${data[`processed_${i}`] ? 'DONE' : 'PENDING'}`);
    }
  }
});
```

### Problem: Automation doesn't clean up
**Symptoms:** Old data remains in storage

**Solutions:**
- Manually clear: `chrome.storage.local.clear()`
- Check all tabs processed their products
- Reload extension

### Problem: Wrong list type applied
**Symptoms:** Clicked "Seo-List" but shows "[OPTI-List]"

**Solutions:**
- Check storage: `chrome.storage.local.get(['automationType'], console.log)`
- Clear storage and retry
- Verify correct button was clicked

## Advanced Testing

### Test Concurrent Automations
1. Start automation with 3 URLs
2. Before tabs finish loading, start another with 2 URLs
3. Verify both complete correctly (may need to avoid this scenario)

### Test Error Recovery
1. Start automation
2. Close one eBay tab before it auto-fills
3. Other tabs should still work
4. Refresh closed tab - should still auto-fill if not processed

### Test ASIN Extraction
Various Amazon URL formats:
```javascript
// Test in Console
function extractAsin(url) {
  const match = url.match(/\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})|\/ASIN\/([A-Z0-9]{10})/i);
  return match ? (match[1] || match[2] || match[3]) : null;
}

// Test these:
extractAsin('https://www.amazon.com/dp/B08N5WRWNW');           // Should return: B08N5WRWNW
extractAsin('https://www.amazon.com/gp/product/B08N5WRWNW');  // Should return: B08N5WRWNW
extractAsin('https://amazon.com/Some-Product/dp/B08N5WRWNW'); // Should return: B08N5WRWNW
```

## Performance Benchmarks

| URLs | Expected Tab Open Time | Expected Auto-Fill Time | Total Time |
|------|----------------------|------------------------|------------|
| 1    | ~500ms              | ~2s                    | ~2.5s      |
| 3    | ~1.5s               | ~2s per tab            | ~7.5s      |
| 5    | ~2.5s               | ~2s per tab            | ~12.5s     |
| 10   | ~5s                 | ~2s per tab            | ~25s       |

## Visual Verification Checklist

In the Bulk Lister log output, you should see:
- ✅ "Starting [TYPE]-List automation for X URLs..."
- ✅ "Opening eBay listing pages..."
- ✅ "[1/X] Processing: [URL]"
- ✅ "✓ Opened X eBay listing tabs"

In each eBay tab, you should see:
- ✅ Title field has product text
- ✅ Description field has ASIN and source URL
- ✅ Description includes "[TYPE-List]" marker
- ✅ Console shows "✓ eBay form auto-fill complete (X/Y)"

## Known Limitations

1. **Tab Limits**: Browser may limit number of tabs opened at once
   - Chrome typically allows ~500 tabs
   - Performance degrades with 50+ tabs open
   - Recommended: Process in batches of 10-20

2. **eBay Rate Limits**: Opening too many listings rapidly may trigger eBay's protection
   - Current 500ms delay helps but not guaranteed
   - Consider increasing delay for large batches

3. **Popup Blockers**: Some browsers block multiple tab opens
   - Ensure pop-ups allowed for extension
   - May need to whitelist eBay.com

4. **Form Field Variations**: eBay may change form selectors
   - Update selectors in ebay-automation.ts if needed
   - Multiple fallback selectors provided

## Next Development Phase

When ready to enhance beyond basic auto-fill:

1. **Full Amazon Data Fetching**
   - Scrape or API call for full product details
   - Get real title, description, price, images
   - Handle rate limiting and errors

2. **Image Upload**
   - Download images from Amazon
   - Upload to eBay using their upload API
   - Handle multiple images per product

3. **Smart Field Mapping**
   - Category detection and selection
   - Condition mapping
   - Shipping template selection
   - Pricing rules application

4. **Queue Management**
   - Proper queue for large batches
   - Pause/resume functionality
   - Error retry logic
   - Progress tracking UI
