chrome.runtime.onInstalled.addListener(() => {
    console.log('EcomFlow extension installed');
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background received message:', message.type, 'from tab:', sender.tab?.id);

    // Handle Amazon scraping complete - open eBay and close Amazon tab
    if (message.type === 'amazonDataScraped' && message.action === 'openEbayAndCloseAmazon') {
        const amazonTabId = sender.tab?.id;
        const { asin, data } = message;

        console.log('📦 Amazon scraping complete for ASIN:', asin);
        console.log('🔄 Opening eBay and closing Amazon tab:', amazonTabId);

        // Open eBay tab first
        chrome.tabs.create({
            url: 'https://www.ebay.com/sl/sell?sr=shListingsCTA',
            active: true
        }, (ebayTab) => {
            console.log('✅ eBay tab opened:', ebayTab.id);

            // Wait for eBay tab to load, then send trigger message
            chrome.tabs.onUpdated.addListener(function ebayLoadListener(tabId, changeInfo) {
                if (tabId === ebayTab.id && changeInfo.status === 'complete') {
                    // Remove this listener
                    chrome.tabs.onUpdated.removeListener(ebayLoadListener);

                    console.log('🎯 eBay tab loaded, sending trigger message...');

                    // Send message to eBay tab to start automation
                    setTimeout(() => {
                        chrome.tabs.sendMessage(ebayTab.id, {
                            type: 'startEbayListing',
                            asin: asin,
                            productData: data
                        }, (response) => {
                            console.log('📨 eBay automation response:', response);
                        });
                    }, 2000); // Wait 2 seconds for content script to initialize
                }
            });

            // Close Amazon tab after a short delay
            setTimeout(() => {
                if (amazonTabId) {
                    chrome.tabs.remove(amazonTabId, () => {
                        console.log('✅ Amazon tab closed:', amazonTabId);
                    });
                }
            }, 1000);
        });

        sendResponse({ success: true, message: 'eBay tab opened, Amazon tab will close' });
        return true; // Keep message channel open for async response
    }

    // Forward other messages to extension pages (like BulkLister)
    if (message.type === 'amazonDataScraped' || message.type === 'itemListed' || message.type === 'itemFailed') {
        // Broadcast to all extension pages
        chrome.runtime.sendMessage(message);
        sendResponse({ success: true, forwarded: true });
        return true;
    }
});
