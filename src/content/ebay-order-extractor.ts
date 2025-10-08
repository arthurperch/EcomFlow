/**
 * eBay Order Extractor
 * Extracts buyer information from eBay order pages for fulfillment automation
 * Enables: Auto-purchase from Amazon using eBay customer data
 */

console.log('📦 eBay Order Extractor loaded');

interface BuyerInfo {
    name: string;
    address: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    };
    phone?: string;
    email?: string;
}

interface OrderInfo {
    orderId: string;
    orderDate: string;
    itemTitle: string;
    itemNumber: string;
    quantity: number;
    price: number;
    shippingCost: number;
    totalPaid: number;
    buyer: BuyerInfo;
    status: string;
}

/**
 * Check if current page is an eBay order page
 */
function isOrderPage(): boolean {
    const url = window.location.href;
    return (
        url.includes('ebay.com/sh/ord') || // Order details
        url.includes('ebay.com/mye/myebay/purchase') || // Purchase history
        url.includes('ebay.com/sh/orders') || // Orders page
        url.includes('ebay.com/mye/myebay/summary') // Summary page
    );
}

/**
 * Extract order information from eBay order page
 */
function extractOrderInfo(): OrderInfo | null {
    try {
        console.log('🔍 Extracting order information...');

        // Try different selectors based on page type
        const orderId = extractOrderId();
        if (!orderId) {
            console.log('❌ No order ID found');
            return null;
        }

        const order: OrderInfo = {
            orderId,
            orderDate: extractOrderDate(),
            itemTitle: extractItemTitle(),
            itemNumber: extractItemNumber(),
            quantity: extractQuantity(),
            price: extractPrice(),
            shippingCost: extractShippingCost(),
            totalPaid: extractTotalPaid(),
            buyer: extractBuyerInfo(),
            status: extractOrderStatus()
        };

        console.log('✅ Order extracted:', order);
        return order;

    } catch (error) {
        console.error('❌ Order extraction failed:', error);
        return null;
    }
}

/**
 * Extract Order ID
 */
function extractOrderId(): string {
    // Multiple selector strategies
    const selectors = [
        '[data-test-id="ORDER_ID"]',
        '.order-id',
        '[class*="orderId"]',
        '[class*="order-number"]'
    ];

    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element?.textContent) {
            return element.textContent.trim().replace(/Order #:?/i, '').trim();
        }
    }

    // Try extracting from URL
    const urlMatch = window.location.href.match(/orderid[=\/](\d+-\d+)/i);
    if (urlMatch) return urlMatch[1];

    // Try finding in page text
    const bodyText = document.body.textContent || '';
    const textMatch = bodyText.match(/Order #?\s*(\d+-\d+)/i);
    if (textMatch) return textMatch[1];

    return '';
}

/**
 * Extract Order Date
 */
function extractOrderDate(): string {
    const selectors = [
        '[data-test-id="ORDER_DATE"]',
        '.order-date',
        '[class*="orderDate"]',
        '[class*="purchase-date"]'
    ];

    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element?.textContent) {
            return element.textContent.trim();
        }
    }

    return '';
}

/**
 * Extract Item Title
 */
function extractItemTitle(): string {
    const selectors = [
        '[data-test-id="ITEM_TITLE"]',
        '.item-title',
        '[class*="itemTitle"]',
        'h1.product-title',
        '.item-name'
    ];

    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element?.textContent) {
            return element.textContent.trim();
        }
    }

    return '';
}

/**
 * Extract Item Number
 */
function extractItemNumber(): string {
    const selectors = [
        '[data-test-id="ITEM_NUMBER"]',
        '.item-number',
        '[class*="itemNumber"]'
    ];

    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element?.textContent) {
            return element.textContent.trim().replace(/Item #:?/i, '').trim();
        }
    }

    // Try URL
    const urlMatch = window.location.href.match(/item[=\/](\d+)/i);
    if (urlMatch) return urlMatch[1];

    return '';
}

/**
 * Extract Quantity
 */
function extractQuantity(): number {
    const selectors = [
        '[data-test-id="QUANTITY"]',
        '.quantity',
        '[class*="qty"]'
    ];

    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element?.textContent) {
            const match = element.textContent.match(/\d+/);
            if (match) return parseInt(match[0]);
        }
    }

    return 1;
}

/**
 * Extract Price
 */
function extractPrice(): number {
    const selectors = [
        '[data-test-id="ITEM_PRICE"]',
        '.item-price',
        '[class*="itemPrice"]',
        '.price'
    ];

    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element?.textContent) {
            return parsePrice(element.textContent);
        }
    }

    return 0;
}

/**
 * Extract Shipping Cost
 */
function extractShippingCost(): number {
    const selectors = [
        '[data-test-id="SHIPPING_COST"]',
        '.shipping-cost',
        '[class*="shippingCost"]',
        '[class*="shipping-price"]'
    ];

    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element?.textContent) {
            return parsePrice(element.textContent);
        }
    }

    return 0;
}

/**
 * Extract Total Paid
 */
function extractTotalPaid(): number {
    const selectors = [
        '[data-test-id="TOTAL_PAID"]',
        '.total-paid',
        '[class*="totalPaid"]',
        '.order-total'
    ];

    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element?.textContent) {
            return parsePrice(element.textContent);
        }
    }

    return 0;
}

/**
 * Extract Order Status
 */
function extractOrderStatus(): string {
    const selectors = [
        '[data-test-id="ORDER_STATUS"]',
        '.order-status',
        '[class*="orderStatus"]',
        '.status'
    ];

    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element?.textContent) {
            return element.textContent.trim();
        }
    }

    return 'Unknown';
}

/**
 * Extract Buyer Information
 */
function extractBuyerInfo(): BuyerInfo {
    const buyer: BuyerInfo = {
        name: '',
        address: {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: ''
        }
    };

    // Extract name
    const nameSelectors = [
        '[data-test-id="BUYER_NAME"]',
        '.buyer-name',
        '[class*="buyerName"]',
        '[class*="shipping-name"]',
        '.ship-to-name'
    ];

    for (const selector of nameSelectors) {
        const element = document.querySelector(selector);
        if (element?.textContent) {
            buyer.name = element.textContent.trim();
            break;
        }
    }

    // Extract full address block
    const addressSelectors = [
        '[data-test-id="SHIPPING_ADDRESS"]',
        '.shipping-address',
        '[class*="shippingAddress"]',
        '.ship-to-address',
        '.delivery-address'
    ];

    for (const selector of addressSelectors) {
        const element = document.querySelector(selector);
        if (element?.textContent) {
            parseAddress(element.textContent, buyer.address);
            break;
        }
    }

    // Extract phone
    const phoneSelectors = [
        '[data-test-id="BUYER_PHONE"]',
        '.buyer-phone',
        '[class*="buyerPhone"]',
        '[class*="phone-number"]'
    ];

    for (const selector of phoneSelectors) {
        const element = document.querySelector(selector);
        if (element?.textContent) {
            buyer.phone = element.textContent.trim().replace(/Phone:?/i, '').trim();
            break;
        }
    }

    // Extract email
    const emailSelectors = [
        '[data-test-id="BUYER_EMAIL"]',
        '.buyer-email',
        '[class*="buyerEmail"]'
    ];

    for (const selector of emailSelectors) {
        const element = document.querySelector(selector);
        if (element?.textContent) {
            buyer.email = element.textContent.trim();
            break;
        }
    }

    return buyer;
}

/**
 * Parse address text into components
 */
function parseAddress(addressText: string, address: BuyerInfo['address']): void {
    const lines = addressText.split('\n').map(l => l.trim()).filter(l => l);

    if (lines.length >= 3) {
        // Standard format: Street, City State ZIP, Country
        address.street = lines[0];

        // Parse "City, State ZIP"
        const cityStateZip = lines[1];
        const match = cityStateZip.match(/^(.+?),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
        if (match) {
            address.city = match[1];
            address.state = match[2];
            address.zipCode = match[3];
        }

        address.country = lines[2] || 'United States';
    }
}

/**
 * Parse price from text
 */
function parsePrice(text: string): number {
    const match = text.match(/\$?([\d,]+\.?\d*)/);
    if (match) {
        return parseFloat(match[1].replace(/,/g, ''));
    }
    return 0;
}

/**
 * Create fulfillment overlay on order page
 */
function createFulfillmentOverlay(order: OrderInfo): void {
    // Remove existing overlay
    const existing = document.getElementById('ebay-fulfillment-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'ebay-fulfillment-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 120px;
        right: 20px;
        z-index: 999999;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        min-width: 300px;
        max-width: 400px;
        font-family: Arial, sans-serif;
        animation: slideIn 0.3s ease-out;
    `;

    overlay.innerHTML = `
        <style>
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        </style>
        <h3 style="margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid rgba(255,255,255,0.3); padding-bottom: 10px;">
            📦 Order Fulfillment
        </h3>
        <div style="margin-bottom: 15px; font-size: 13px; line-height: 1.6;">
            <div><strong>Order:</strong> ${order.orderId}</div>
            <div><strong>Item:</strong> ${order.itemTitle.substring(0, 50)}...</div>
            <div><strong>Buyer:</strong> ${order.buyer.name}</div>
            <div><strong>Ship To:</strong> ${order.buyer.address.city}, ${order.buyer.address.state}</div>
        </div>
        <button id="fulfill-on-amazon-btn" style="
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            transition: all 0.2s;
            margin-bottom: 10px;
        ">🚀 Fulfill on Amazon</button>
        <button id="copy-address-btn" style="
            width: 100%;
            padding: 10px;
            background: rgba(255,255,255,0.2);
            color: white;
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: 8px;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s;
        ">📋 Copy Address</button>
    `;

    document.body.appendChild(overlay);

    // Fulfill button handler
    const fulfillBtn = document.getElementById('fulfill-on-amazon-btn');
    fulfillBtn?.addEventListener('click', () => {
        handleFulfillment(order);
    });

    // Copy address button
    const copyBtn = document.getElementById('copy-address-btn');
    copyBtn?.addEventListener('click', () => {
        copyAddressToClipboard(order.buyer);
    });

    // Hover effects
    fulfillBtn?.addEventListener('mouseover', () => {
        fulfillBtn.style.transform = 'translateY(-2px)';
        fulfillBtn.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
    });
    fulfillBtn?.addEventListener('mouseout', () => {
        fulfillBtn.style.transform = 'translateY(0)';
        fulfillBtn.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
    });
}

/**
 * Handle order fulfillment workflow
 */
async function handleFulfillment(order: OrderInfo): Promise<void> {
    console.log('🚀 Starting fulfillment for order:', order.orderId);

    // Store order data in chrome storage
    await chrome.storage.local.set({
        currentFulfillmentOrder: order,
        fulfillmentTimestamp: Date.now()
    });

    // Send message to background service
    chrome.runtime.sendMessage({
        type: 'startFulfillment',
        orderData: order
    }, (response: any) => {
        if (response?.success) {
            console.log('✅ Fulfillment workflow started');

            // Show notification
            chrome.runtime.sendMessage({
                type: 'showNotification',
                title: 'Fulfillment Started',
                message: `Searching Amazon for: ${order.itemTitle.substring(0, 50)}...`
            });
        }
    });

    // Open Amazon search
    const amazonSearchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(order.itemTitle)}`;
    window.open(amazonSearchUrl, '_blank');
}

/**
 * Copy address to clipboard
 */
function copyAddressToClipboard(buyer: BuyerInfo): void {
    const addressText = `${buyer.name}
${buyer.address.street}
${buyer.address.city}, ${buyer.address.state} ${buyer.address.zipCode}
${buyer.address.country}
${buyer.phone ? 'Phone: ' + buyer.phone : ''}`;

    navigator.clipboard.writeText(addressText).then(() => {
        console.log('✅ Address copied to clipboard');

        // Show confirmation
        const btn = document.getElementById('copy-address-btn');
        if (btn) {
            const originalText = btn.textContent;
            btn.textContent = '✅ Copied!';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        }
    });
}

/**
 * Initialize on page load
 */
function init(): void {
    if (!isOrderPage()) {
        console.log('Not an order page, skipping overlay');
        return;
    }

    console.log('✅ Order page detected');

    // Wait for page to fully load
    setTimeout(() => {
        const order = extractOrderInfo();
        if (order) {
            createFulfillmentOverlay(order);
        }
    }, 2000);
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export for testing
export { extractOrderInfo, extractBuyerInfo, isOrderPage };
