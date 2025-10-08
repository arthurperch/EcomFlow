# EcomFlow Extension - System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ECOMFLOW EXTENSION                                │
│                         Chrome Extension (Manifest V3)                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKGROUND SERVICE WORKER                         │
│                        (background-service.ts - 450 lines)                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │  Message Router  │  │   Tab Manager    │  │  Command Queue   │         │
│  │  15+ msg types   │  │  Map<id, state>  │  │  Async processor │         │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘         │
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │ Profit Calc      │  │  VERO Checker    │  │  Notifications   │         │
│  │ eBay/PayPal fees │  │  18+ brands      │  │  Chrome API      │         │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘         │
│                                                                             │
│  Key Functions:                                                             │
│  • handleFindOnEbayByImage() - Opens eBay image search                     │
│  • handleAmazonDataScraped() - Amazon → eBay workflow                      │
│  • executeAutomationCommand() - Runs commands with retry                   │
│  • queueCommands() - Command queue management                              │
│  • calculateProfit() - Profit calculation                                  │
│  • checkVEROList() - Brand protection                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ chrome.runtime.sendMessage()
                                      │ chrome.runtime.onMessage
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        │                             │                             │
        ▼                             ▼                             ▼

┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
│   EBAY CONTENT      │   │  AMAZON CONTENT     │   │  AUTOMATION         │
│   SCRIPTS           │   │  SCRIPTS            │   │  COMMANDS           │
└─────────────────────┘   └─────────────────────┘   └─────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          EBAY PAGE SCRIPTS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │  ebay-sold-items-scanner.ts (400 lines)                      │          │
│  ├──────────────────────────────────────────────────────────────┤          │
│  │  Purpose: Detect SOLD items, add overlay buttons             │          │
│  │                                                               │          │
│  │  Detection:                                                   │          │
│  │  • Checks URL for: LH_Sold=1&LH_Complete=1                   │          │
│  │  • isSellerSoldItemsPage()                                   │          │
│  │                                                               │          │
│  │  Overlay Buttons (3 per item):                               │          │
│  │  ┌────────────────────────────────────────────────────────┐  │          │
│  │  │  🛒 Auto-Purchase (red gradient)                       │  │          │
│  │  │  → handleAutoPurchase()                                │  │          │
│  │  │  → Stores item data                                    │  │          │
│  │  │  → Opens Amazon search                                 │  │          │
│  │  └────────────────────────────────────────────────────────┘  │          │
│  │  ┌────────────────────────────────────────────────────────┐  │          │
│  │  │  📦 Find Amazon (orange gradient)                      │  │          │
│  │  │  → Opens Amazon search in new tab                     │  │          │
│  │  └────────────────────────────────────────────────────────┘  │          │
│  │  ┌────────────────────────────────────────────────────────┐  │          │
│  │  │  🔍 Details (teal gradient)                            │  │          │
│  │  │  → showItemDetails()                                   │  │          │
│  │  │  → Modal with full info                               │  │          │
│  │  └────────────────────────────────────────────────────────┘  │          │
│  │                                                               │          │
│  │  Data Extracted (12 fields):                                 │          │
│  │  • title, price, soldDate, soldCount, itemNumber             │          │
│  │  • image, url, sellerName, condition, shippingCost           │          │
│  │  • itemLocation, watcherCount                                │          │
│  └──────────────────────────────────────────────────────────────┘          │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │  ebay-order-extractor.ts (550 lines)                         │          │
│  ├──────────────────────────────────────────────────────────────┤          │
│  │  Purpose: Extract buyer info for order fulfillment           │          │
│  │                                                               │          │
│  │  Detection:                                                   │          │
│  │  • isOrderPage() checks for order URLs                       │          │
│  │  • ebay.com/sh/ord, ebay.com/mye/myebay/purchase            │          │
│  │                                                               │          │
│  │  Extracted Data:                                             │          │
│  │  OrderInfo {                                                 │          │
│  │    orderId, orderDate, itemTitle, itemNumber                 │          │
│  │    quantity, price, shippingCost, totalPaid                  │          │
│  │    buyer: {                                                  │          │
│  │      name, address {street, city, state, zip, country}       │          │
│  │      phone, email                                            │          │
│  │    }                                                         │          │
│  │  }                                                           │          │
│  │                                                               │          │
│  │  Fulfillment Overlay (purple gradient):                      │          │
│  │  ┌────────────────────────────────────────────────────────┐  │          │
│  │  │  📦 Order Fulfillment                                  │  │          │
│  │  │  ─────────────────────────────────────────────────────│  │          │
│  │  │  Order: 12345-67890                                   │  │          │
│  │  │  Item: Product Title...                               │  │          │
│  │  │  Buyer: John Doe                                      │  │          │
│  │  │  Ship To: New York, NY                                │  │          │
│  │  │                                                        │  │          │
│  │  │  [🚀 Fulfill on Amazon]                               │  │          │
│  │  │  → Opens Amazon search                                │  │          │
│  │  │  → Stores order data                                  │  │          │
│  │  │                                                        │  │          │
│  │  │  [📋 Copy Address]                                    │  │          │
│  │  │  → Copies formatted address to clipboard             │  │          │
│  │  └────────────────────────────────────────────────────────┘  │          │
│  └──────────────────────────────────────────────────────────────┘          │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │  competitor-research.ts (290 lines) - ENHANCED               │          │
│  ├──────────────────────────────────────────────────────────────┤          │
│  │  Purpose: Extract product data from seller pages             │          │
│  │                                                               │          │
│  │  New Fields:                                                 │          │
│  │  • watcherCount - From "X watching" text                     │          │
│  │  • dailySalesRate - soldCount / 30 days                      │          │
│  │  • condition - New, Used, Refurbished                        │          │
│  │  • shippingCost - Extracted from shipping info               │          │
│  │  • itemLocation - Geographic location                        │          │
│  │                                                               │          │
│  │  Functions:                                                  │          │
│  │  • extractWatcherCount() - Regex parsing                     │          │
│  │  • calculateDailySalesRate() - Math calculation              │          │
│  │  • Multi-page scanning (10 page limit)                       │          │
│  └──────────────────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        AMAZON PAGE SCRIPTS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │  amazon-product-overlay.ts (346 lines) - UPDATED             │          │
│  ├──────────────────────────────────────────────────────────────┤          │
│  │  Purpose: Floating overlay with eBay image search            │          │
│  │                                                               │          │
│  │  Extraction:                                                 │          │
│  │  extractProductInfo() returns:                               │          │
│  │  {                                                           │          │
│  │    title: string                                             │          │
│  │    asin: string                                              │          │
│  │    brand: string                                             │          │
│  │    price: number                                             │          │
│  │    imageUrl: string  ← KEY FOR IMAGE SEARCH                  │          │
│  │  }                                                           │          │
│  │                                                               │          │
│  │  Overlay (fixed right side):                                 │          │
│  │  ┌────────────────────────────────────────────────────────┐  │          │
│  │  │  Amazon → eBay                                         │  │          │
│  │  │  ─────────────────────────────────────────────────────│  │          │
│  │  │  ASIN: B08N5WRWNW                                     │  │          │
│  │  │  Brand: Example Brand                                 │  │          │
│  │  │  Price: $49.99                                        │  │          │
│  │  │                                                        │  │          │
│  │  │  [🔍 Find on eBay] (red gradient)                     │  │          │
│  │  │  → chrome.runtime.sendMessage({                       │  │          │
│  │  │       type: 'findOnEbayByImage',                      │  │          │
│  │  │       imageUrl: product.imageUrl                      │  │          │
│  │  │     })                                                │  │          │
│  │  │  → Background opens eBay IMAGE SEARCH                 │  │          │
│  │  │                                                        │  │          │
│  │  │  [📊 Research Item] (purple gradient)                 │  │          │
│  │  │  → Stores product data                                │  │          │
│  │  └────────────────────────────────────────────────────────┘  │          │
│  │                                                               │          │
│  │  KEY CHANGE:                                                 │          │
│  │  BEFORE: createEbaySearchUrl(product) → TEXT SEARCH          │          │
│  │  AFTER:  findOnEbayByImage(imageUrl) → IMAGE SEARCH ✅       │          │
│  └──────────────────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    AUTOMATION COMMANDS (ALL PAGES)                          │
│                  automation-commands.ts (400 lines)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  Purpose: Execute automation commands with retry logic                     │
│                                                                             │
│  Commands (6 types):                                                        │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │  1. autoClick(selector, options)                            │           │
│  │     • Waits for element (5s default)                        │           │
│  │     • Highlights element (green flash)                      │           │
│  │     • Scrolls into view                                     │           │
│  │     • Multiple click methods                                │           │
│  │     • Support for multiple elements                         │           │
│  └─────────────────────────────────────────────────────────────┘           │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │  2. autoType(selector, text, options)                       │           │
│  │     • Character-by-character typing                         │           │
│  │     • Typing delay: 50ms default                            │           │
│  │     • Triggers: input, keydown, keypress, keyup events      │           │
│  │     • Clear first option                                    │           │
│  └─────────────────────────────────────────────────────────────┘           │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │  3. autoScroll(selector, value, options)                    │           │
│  │     • Scroll to: top, bottom, or position                   │           │
│  │     • Smooth scrolling                                      │           │
│  │     • Element or window scrolling                           │           │
│  └─────────────────────────────────────────────────────────────┘           │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │  4. autoWait(value, options)                                │           │
│  │     • Wait for milliseconds                                 │           │
│  │     • Wait for selector to appear                           │           │
│  │     • Timeout: 10s default                                  │           │
│  └─────────────────────────────────────────────────────────────┘           │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │  5. autoNavigate(url)                                       │           │
│  │     • Navigate to URL                                       │           │
│  │     • Page load waiting                                     │           │
│  └─────────────────────────────────────────────────────────────┘           │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │  6. autoExtract(selector, options)                          │           │
│  │     • Extract text or attributes                            │           │
│  │     • Single or multiple elements                           │           │
│  │     • Transform function support                            │           │
│  └─────────────────────────────────────────────────────────────┘           │
│                                                                             │
│  Features:                                                                  │
│  • Retry logic: 3 attempts per command                                     │
│  • MutationObserver for dynamic elements                                   │
│  • Element highlighting during execution                                   │
│  • Exported to window object for reuse                                     │
│  • Chrome runtime message listener                                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            UI COMPONENTS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │  CompetitorResearch.tsx (300 lines) - REBUILT               │          │
│  ├──────────────────────────────────────────────────────────────┤          │
│  │  Purpose: EbayLister4-style multi-seller scanning UI         │          │
│  │                                                               │          │
│  │  Layout:                                                     │          │
│  │  ┌────────────────────────────────────────────────────────┐  │          │
│  │  │  🔍 Competitor Research                                │  │          │
│  │  │  ─────────────────────────────────────────────────────│  │          │
│  │  │                                                        │  │          │
│  │  │  Multi-Seller Input:                                  │  │          │
│  │  │  ┌──────────────────────────────────────────────────┐ │  │          │
│  │  │  │ happyhomesteadhauls                              │ │  │          │
│  │  │  │ anothersellerstore                               │ │  │          │
│  │  │  │ thirdsellerstore                                 │ │  │          │
│  │  │  └──────────────────────────────────────────────────┘ │  │          │
│  │  │                                                        │  │          │
│  │  │  [Parse Sellers] [View Sold Items]                   │  │          │
│  │  │                                                        │  │          │
│  │  │  Parsed Sellers:                                      │  │          │
│  │  │  ▶ 1. happyhomesteadhauls  ← GREEN HIGHLIGHT         │  │          │
│  │  │    2. anothersellerstore                             │  │          │
│  │  │    3. thirdsellerstore ✓   ← COMPLETED               │  │          │
│  │  │                                                        │  │          │
│  │  │  ┌──────────────────────────────────────────────────┐ │  │          │
│  │  │  │ 🔄 Running...                                    │ │  │          │
│  │  │  │ Processing seller 1 of 3                         │ │  │          │
│  │  │  │ Current: happyhomesteadhauls                     │ │  │          │
│  │  │  └──────────────────────────────────────────────────┘ │  │          │
│  │  │                                                        │  │          │
│  │  │  [Start Automated Scan] [Stop Scanning]              │  │          │
│  │  │  [Clear Results] [Export CSV]                        │  │          │
│  │  │                                                        │  │          │
│  │  │  Results Table:                                       │  │          │
│  │  │  ┌────────┬───────┬───────┬──────┬──────────┬─────┐  │  │          │
│  │  │  │ Title  │ Price │ Sold  │ Rate │ Watchers │ ... │  │  │          │
│  │  │  ├────────┼───────┼───────┼──────┼──────────┼─────┤  │  │          │
│  │  │  │ Item 1 │ $50   │ 1,234 │ 41.1 │   45     │ ... │  │  │          │
│  │  │  │ Item 2 │ $75   │   890 │ 29.7 │   32     │ ... │  │  │          │
│  │  │  └────────┴───────┴───────┴──────┴──────────┴─────┘  │  │          │
│  │  └────────────────────────────────────────────────────────┘  │          │
│  │                                                               │          │
│  │  Features:                                                   │          │
│  │  • parseSellers() - Extract usernames from URLs             │          │
│  │  • startScanning() - Loop with 3-second delays              │          │
│  │  • processSeller() - Build sold URL, open tab               │          │
│  │  • Progress tracking (seller X of Y)                        │          │
│  │  • Green highlight on current seller                        │          │
│  │  • Checkmarks on completed sellers                          │          │
│  │  • Running state box with green border                      │          │
│  │  • Export CSV with all fields                               │          │
│  └──────────────────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATA FLOWS                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. IMAGE SEARCH WORKFLOW                                                   │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │  Amazon Page                                                │           │
│  │    ↓ extractProductInfo()                                   │           │
│  │  {title, asin, brand, price, imageUrl}                      │           │
│  │    ↓ User clicks "Find on eBay"                             │           │
│  │  chrome.runtime.sendMessage({                               │           │
│  │    type: 'findOnEbayByImage',                               │           │
│  │    imageUrl: product.imageUrl                               │           │
│  │  })                                                         │           │
│  │    ↓ Background Service                                     │           │
│  │  handleFindOnEbayByImage(message)                           │           │
│  │    ↓ Build URL                                              │           │
│  │  https://www.ebay.com/sch/i.html?                           │           │
│  │    _fsrp=1&_imgSrch=Y&_nkw=[imageUrl]                       │           │
│  │    ↓ chrome.tabs.create()                                   │           │
│  │  eBay opens with IMAGE SEARCH results ✅                    │           │
│  └─────────────────────────────────────────────────────────────┘           │
│                                                                             │
│  2. ORDER FULFILLMENT WORKFLOW                                              │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │  eBay Order Page                                            │           │
│  │    ↓ isOrderPage()                                          │           │
│  │  Detected: ebay.com/sh/ord                                  │           │
│  │    ↓ extractOrderInfo()                                     │           │
│  │  {orderId, itemTitle, buyer: {...}}                         │           │
│  │    ↓ createFulfillmentOverlay()                             │           │
│  │  Purple overlay with buttons                                │           │
│  │    ↓ User clicks "🚀 Fulfill on Amazon"                     │           │
│  │  chrome.storage.local.set({currentFulfillmentOrder})        │           │
│  │    ↓ chrome.runtime.sendMessage({                           │           │
│  │      type: 'startFulfillment',                              │           │
│  │      orderData: order                                       │           │
│  │    })                                                       │           │
│  │    ↓ Background Service                                     │           │
│  │  Notification: "Fulfillment Started"                        │           │
│  │    ↓ window.open()                                          │           │
│  │  Amazon search: "product title"                             │           │
│  │    ↓ User finds product                                     │           │
│  │  (Future: Auto-add to cart, auto-fill address)             │           │
│  └─────────────────────────────────────────────────────────────┘           │
│                                                                             │
│  3. MULTI-SELLER SCANNING WORKFLOW                                          │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │  CompetitorResearch UI                                      │           │
│  │    ↓ User enters sellers (one per line)                     │           │
│  │  happyhomesteadhauls                                        │           │
│  │  anotherstore                                               │           │
│  │    ↓ Click "Parse Sellers"                                  │           │
│  │  parseSellers() → ['happyhomesteadhauls', 'anotherstore']   │           │
│  │    ↓ Click "Start Automated Scan"                           │           │
│  │  startScanning()                                            │           │
│  │    ↓ Loop: for each seller                                  │           │
│  │  processSeller(seller)                                      │           │
│  │    ↓ Build sold URL                                         │           │
│  │  ?_ssn=happyhomesteadhauls&LH_Complete=1&LH_Sold=1         │           │
│  │    ↓ chrome.tabs.create()                                   │           │
│  │  Opens sold items page                                      │           │
│  │    ↓ Wait 3 seconds                                         │           │
│  │  Progress: "Processing seller 1 of 2"                       │           │
│  │    ↓ Green highlight on current                             │           │
│  │  ▶ happyhomesteadhauls                                      │           │
│  │    ↓ Move to next seller                                    │           │
│  │  Checkmark on completed: happyhomesteadhauls ✓              │           │
│  │    ↓ Repeat until done                                      │           │
│  │  All sellers scanned                                        │           │
│  └─────────────────────────────────────────────────────────────┘           │
│                                                                             │
│  4. AUTOMATION COMMAND WORKFLOW                                             │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │  Background Service                                         │           │
│  │    ↓ queueCommands([cmd1, cmd2, cmd3])                      │           │
│  │  automationState.queue = [...]                              │           │
│  │    ↓ processCommandQueue()                                  │           │
│  │  For each command:                                          │           │
│  │    ↓ chrome.runtime.sendMessage({                           │           │
│  │      type: 'automationCommand',                             │           │
│  │      command: {type: 'click', target: '.btn'}               │           │
│  │    })                                                       │           │
│  │    ↓ Content Script (automation-commands.ts)                │           │
│  │  executeCommand(command)                                    │           │
│  │    ↓ Route to handler                                       │           │
│  │  autoClick(selector, options)                               │           │
│  │    ↓ Wait for element (MutationObserver)                    │           │
│  │  element = await waitForSelector(selector)                  │           │
│  │    ↓ Highlight element (green flash)                        │           │
│  │  element.style.backgroundColor = '#90EE90'                  │           │
│  │    ↓ Scroll into view                                       │           │
│  │  element.scrollIntoView()                                   │           │
│  │    ↓ Click element                                          │           │
│  │  element.click()                                            │           │
│  │    ↓ Retry on failure (3 attempts)                          │           │
│  │  If error: retry command                                    │           │
│  │    ↓ Response                                               │           │
│  │  {success: true, result: true}                              │           │
│  │    ↓ Background Service                                     │           │
│  │  Update tab state, move to next command                     │           │
│  └─────────────────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          CHROME STORAGE DATA                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  chrome.storage.local                                                       │
│  ├── lastAmazonProduct: {title, asin, brand, price, imageUrl}              │
│  ├── lastSearchType: 'image'                                                │
│  ├── currentFulfillmentOrder: {orderId, buyer: {...}, ...}                 │
│  ├── fulfillmentTimestamp: 1234567890                                       │
│  ├── soldItemsData: [{title, price, soldDate, ...}, ...]                   │
│  ├── competitorResults: [{seller, products: [...]}, ...]                   │
│  └── parsedSellers: ['seller1', 'seller2', ...]                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         MESSAGE TYPES (15+)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. findOnEbayByImage        - Amazon → eBay image search                  │
│  2. amazonDataScraped         - Amazon product data extracted               │
│  3. soldItemsScanned          - Sold items data ready                       │
│  4. startFulfillment          - Begin order fulfillment                     │
│  5. automationCommand         - Execute automation command                  │
│  6. queueCommands             - Add commands to queue                       │
│  7. updateTabState            - Update tab tracking                         │
│  8. showNotification          - Display Chrome notification                 │
│  9. calculateProfit           - Request profit calculation                  │
│  10. checkVERO                - Check against VERO list                     │
│  11. checkRestrictedWords     - Filter restricted words                     │
│  12. getAutomationState       - Retrieve current state                      │
│  13. broadcastToAllTabs       - Send message to all tabs                    │
│  14. startMultiSellerScan     - Begin multi-seller automation               │
│  15. stopMultiSellerScan      - Stop automation                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         KEY TECHNOLOGIES                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  • TypeScript                - Type-safe development                        │
│  • React                     - UI components                                │
│  • Chrome Extension API      - Manifest V3                                  │
│  • Chrome Storage API        - Data persistence                             │
│  • Chrome Tabs API           - Tab management                               │
│  • Chrome Notifications API  - User notifications                           │
│  • MutationObserver          - DOM change detection                         │
│  • Async/Await               - Asynchronous operations                      │
│  • CSS Gradients             - Modern UI design                             │
│  • eBay Image Search API     - Visual product matching                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         PERFORMANCE METRICS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  Build Time:              2.6 seconds                                       │
│  Modules:                 59                                                │
│  Total Size:              280 KB (90 KB gzipped)                            │
│  Background Service:      5.87 KB (2.58 KB gzipped)                         │
│  Automation Commands:     5.11 KB (1.81 KB gzipped)                         │
│  Sold Items Scanner:      8.01 KB (2.83 KB gzipped)                         │
│  Order Extractor:         8.46 KB (2.82 KB gzipped)                         │
│  Amazon Overlay:          6.33 KB (2.20 KB gzipped)                         │
│  Delays:                  500ms actions, 2000ms page load                   │
│  Retry Attempts:          3 per command                                     │
│  MutationObserver:        10s timeout                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 System Overview

This architecture diagram shows the complete EcomFlow Extension system with:

1. **Background Service Worker** - Centralized automation backend
2. **Content Scripts** - Page-specific functionality (eBay, Amazon)
3. **Automation Commands** - Reusable command system
4. **UI Components** - React-based interface
5. **Data Flows** - How information moves through the system
6. **Storage** - Persistent data management
7. **Message Passing** - Inter-component communication

All components work together to provide:
- ✅ eBay image search (not text)
- ✅ Sold items detection and overlay
- ✅ Order fulfillment automation
- ✅ Multi-seller scanning
- ✅ Profit calculation
- ✅ VERO protection

---

**Last Updated:** January 2025  
**Version:** 0.0.1  
**Architecture:** Manifest V3, TypeScript, React
