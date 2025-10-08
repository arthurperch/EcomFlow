# Testing Guide - Amazon to eBay Automation

## What to Expect

### Step 1: Amazon Scraping
When you click **Opti-List**, **Seo-List**, or **Standard-List**:

1. ✅ Amazon tab opens with the product URL
2. ✅ After ~2 seconds, green notification appears: "Scraped: [product title]"
3. ✅ Console logs show:
   ```
   Amazon scraping script loaded
   Starting Amazon product scrape...
   ✓ Title scraped: [title]
   ✓ Price scraped: [price]
   ✓ Brand scraped: [brand]
   ✓ Features scraped: X
   ✓ Images scraped: X
   ✓ Scraping complete!
   📦 Preparing to open eBay with scraped title
   ✅ Product data saved to storage with title
   🔄 Closing Amazon tab...
   🌐 Opening eBay search page...
   ```
4. ✅ Amazon tab closes
5. ✅ eBay search page opens: `https://www.ebay.com/sl/sell?sr=shListingsCTA`

### Step 2: eBay Search
Once eBay page loads:

1. ✅ After ~3 seconds, console logs show:
   ```
   🔍 On eBay sell/search page, looking for scraped product data...
   📦 Checking storage for scraped products...
   📊 Found 1 scraped products in storage
   ✅ Found scraped product at index 0
   📝 Full product title: [full title]
   🎯 Starting auto-search for: [title]
   ✅ Found search input with selector: [selector]
   👆 Focused search input
   📝 Pasted title into search box
   ⌨️  Pressing Enter to submit search...
   ✅ Search submitted with Enter key!
   ```
2. ✅ Search box turns light green (visual feedback)
3. ✅ Green notification appears: "Searching: [product title]"
4. ✅ Page navigates to search results

### Step 3: Create Listing
After search results load:

1. ✅ Script finds and clicks "Create Listing" button
2. ✅ Listing form opens

### Step 4: Auto-Fill
On the listing form:

1. ✅ All fields auto-fill with scraped data
2. ✅ Green notification: "Auto-filled: [product title]"

## How to Test

1. **Open Chrome DevTools** (F12) and go to Console tab
2. **Load the extension**:
   - Go to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `c:\dev\EcomFlow\apps\extension\dist`
3. **Add a test Amazon URL** to Bulk Lister
4. **Click Opti-List** (or Seo/Standard)
5. **Watch the console logs** to see each step

## Debugging Commands

### Check Storage:
```javascript
chrome.storage.local.get(null, (data) => {
  console.log('All storage:', data);
  // Look for scrapedProduct_0
  if (data.scrapedProduct_0) {
    console.log('Title stored:', data.scrapedProduct_0.title);
    console.log('Search title:', data.scrapedProduct_0.searchTitle);
  }
});
```

### Clear Storage:
```javascript
chrome.storage.local.clear(() => console.log('Storage cleared'));
```

### Check if Automation Running:
```javascript
chrome.storage.local.get(['automationInProgress', 'automationStep'], (data) => {
  console.log('Automation status:', data);
});
```

## Common Issues & Fixes

### Issue: Amazon tab doesn't close
**Fix**: Check console for errors. The tab should close automatically after eBay opens.

### Issue: eBay search box not found
**Fix**: 
1. Check if you're on the correct eBay page: `ebay.com/sl/sell?sr=shListingsCTA`
2. Console will show which selector was tried
3. Inspect the search box element and verify the selector

### Issue: Title not pasted
**Fix**:
1. Check console logs for "📝 Pasted title into search box"
2. Verify storage has the title: Run debugging command above
3. Look for "searchTitle" or "title" field in scrapedProduct_0

### Issue: Enter key doesn't work
**Fix**:
- The script tries 3 different Enter key events (keydown, keypress, keyup)
- If none work, eBay's search form might be using a different submit method
- Check for a search button and try clicking it instead

## Visual Indicators

✅ **Green notifications** = Success at each step
🟢 **Light green search box** = Title pasted successfully
📝 **Console logs with emojis** = Easy to track progress

## Expected Timeline

- Amazon page load: ~2 seconds
- Scraping: ~1 second
- Storage save: ~0.5 seconds
- Tab close + eBay open: ~1 second
- eBay page load: ~3 seconds
- Search box fill + Enter: ~0.5 seconds
- **Total: ~8 seconds per product**

## Next Steps After Testing

If everything works:
1. ✅ Try with multiple URLs (will process one at a time)
2. ✅ Test all three list types (Opti/Seo/Standard)
3. ✅ Verify form auto-fill with different products
4. ✅ Check price calculation based on list type

If something doesn't work:
1. Share console logs
2. Share screenshot of the search box element
3. Share which step failed
