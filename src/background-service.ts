/**
 * EcomFlow Background Service Worker
 * Centralized automation backend with command system
 * Based on EbayLister4 architecture
 */

console.log('🚀 EcomFlow Background Service Worker Loaded');

// ===== STATE MANAGEMENT =====
interface AutomationState {
    running: boolean;
    currentTask: string | null;
    queue: AutomationCommand[];
    tabStates: Map<number, TabState>;
    settings: GlobalSettings;
}

interface TabState {
    tabId: number;
    url: string;
    status: 'loading' | 'complete' | 'error';
    data: any;
    lastAction: string;
    timestamp: number;
}

interface AutomationCommand {
    id: string;
    type: 'click' | 'type' | 'scroll' | 'wait' | 'navigate' | 'extract' | 'custom';
    target?: string;
    value?: any;
    tabId?: number;
    retries?: number;
    callback?: string;
}

interface GlobalSettings {
    delays: {
        betweenActions: number;
        pageLoad: number;
        typing: number;
    };
    retryAttempts: number;
    debugMode: boolean;
}

const state: AutomationState = {
    running: false,
    currentTask: null,
    queue: [],
    tabStates: new Map(),
    settings: {
        delays: {
            betweenActions: 500,
            pageLoad: 2000,
            typing: 50
        },
        retryAttempts: 3,
        debugMode: true
    }
};

// ===== MESSAGE ROUTING =====
/**
 * Main message listener
 */
chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
    console.log('📨 Message received:', message.type, 'from tab:', sender.tab?.id);

    // Route messages to appropriate handlers
    switch (message.type) {
        // Amazon to eBay automation
        case 'amazonDataScraped':
            handleAmazonDataScraped(message, sender, sendResponse);
            break;

        case 'findOnEbayByImage':
            handleFindOnEbayByImage(message, sender, sendResponse);
            break;

        // Competitor research
        case 'research_competitor':
            handleResearchCompetitor(message, sender, sendResponse);
            return true; // Async response

        case 'soldItemsScanned':
            handleSoldItemsScanned(message, sender, sendResponse);
            break;

        case 'competitorScanProgress':
        case 'competitorScanResults':
        case 'competitorScanError':
            broadcastToAllTabs(message);
            break;

        // Automation commands
        case 'executeAutomationCommand':
            executeAutomationCommand(message.command, sendResponse);
            return true; // Async response

        case 'queueCommands':
            queueCommands(message.commands, sendResponse);
            return true;

        // Tab management
        case 'getTabState':
            sendResponse({ state: state.tabStates.get(message.tabId) });
            break;

        case 'updateTabState':
            updateTabState(message.tabId, message.data);
            sendResponse({ success: true });
            break;

        // Notifications
        case 'showNotification':
            showNotification(message.title, message.message, message.iconUrl);
            break;

        // Profit calculation
        case 'calculateProfit':
            sendResponse(calculateProfit(message.data));
            break;

        // VERO check
        case 'checkVERO':
            sendResponse({ isVERO: checkVEROList(message.title || message.brand) });
            break;

        default:
            console.log('⚠️ Unknown message type:', message.type);
    }

    return false;
});

// ===== AMAZON TO EBAY AUTOMATION =====
async function handleAmazonDataScraped(message: any, sender: any, sendResponse: any) {
    const { asin, data } = message;
    const amazonTabId = sender.tab?.id;

    console.log('📦 Amazon scraping complete for ASIN:', asin);
    console.log('🔄 Opening eBay and closing Amazon tab:', amazonTabId);

    try {
        // Open eBay listing page
        const ebayTab = await chrome.tabs.create({
            url: 'https://www.ebay.com/sl/sell?sr=shListingsCTA',
            active: true
        });

        console.log('✅ eBay tab opened:', ebayTab.id);

        // Track tab state
        updateTabState(ebayTab.id, {
            source: 'amazon',
            asin: asin,
            productData: data,
            timestamp: Date.now()
        });

        // Wait for eBay tab to load
        chrome.tabs.onUpdated.addListener(function ebayLoadListener(tabId: any, changeInfo: any) {
            if (tabId === ebayTab.id && changeInfo.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(ebayLoadListener);

                console.log('🎯 eBay tab loaded, sending trigger message...');

                setTimeout(() => {
                    chrome.tabs.sendMessage(ebayTab.id!, {
                        type: 'startEbayListing',
                        asin: asin,
                        productData: data
                    }, (response: any) => {
                        console.log('📨 eBay automation response:', response);
                    });
                }, state.settings.delays.pageLoad);
            }
        });

        // Close Amazon tab after delay
        if (amazonTabId) {
            setTimeout(() => {
                chrome.tabs.remove(amazonTabId, () => {
                    console.log('✅ Amazon tab closed:', amazonTabId);
                });
            }, 1000);
        }

        sendResponse({ success: true, ebayTabId: ebayTab.id });

    } catch (error) {
        console.error('❌ Error in Amazon to eBay flow:', error);
        sendResponse({ success: false, error: String(error) });
    }
}

// ===== COMPETITOR RESEARCH =====
async function handleResearchCompetitor(message: any, sender: any, sendResponse: any) {
    const { username } = message;

    console.log('🎯🎯🎯 ===== BACKGROUND: RESEARCH COMPETITOR REQUEST ===== 🎯🎯🎯');
    console.log('📍 Seller Username:', username);
    console.log('📍 Time:', new Date().toLocaleTimeString());

    try {
        // Build sold items URL
        const soldUrl = `https://www.ebay.com/sch/i.html?_ssn=${encodeURIComponent(username)}&LH_Complete=1&LH_Sold=1&_sop=13&rt=nc&_ipg=200`;

        console.log('🔗 Opening URL:', soldUrl);

        // Create tab for scraping - VISIBLE so user can see each item being scanned
        const tab = await chrome.tabs.create({
            url: soldUrl,
            active: true  // Show the tab so user sees real-time scanning!
        });

        console.log('✅ Tab created! Tab ID:', tab.id);

        // Store research state
        updateTabState(tab.id, {
            researchUsername: username,
            researchUrl: soldUrl,
            researchStartTime: Date.now(),
            status: 'scraping'
        });

        // Wait for page to load and content script to scrape
        chrome.tabs.onUpdated.addListener(function competitorLoadListener(tabId: any, changeInfo: any) {
            if (tabId === tab.id && changeInfo.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(competitorLoadListener);

                console.log('✅ Page loaded! Status: complete');
                console.log('⏰ Waiting 2 seconds for page to fully render...');

                // Send message to content script to start scraping
                setTimeout(() => {
                    console.log('📨 Sending startCompetitorScraping message to tab:', tab.id);

                    chrome.tabs.sendMessage(tab.id!, {
                        type: 'startCompetitorScraping',
                        username: username
                    }, (response: any) => {
                        if (chrome.runtime.lastError) {
                            console.error('❌ Error sending message:', chrome.runtime.lastError);
                        } else {
                            console.log('✅ Scraping message sent! Response:', response);
                        }
                    });
                }, 2000); // Wait 2 seconds for page to fully render
            }
        });

        sendResponse({
            success: true,
            didResearch: true,
            tabId: tab.id,
            message: `Started researching ${username}`
        });

    } catch (error) {
        console.error('❌ Error in competitor research:', error);
        sendResponse({
            success: false,
            didResearch: false,
            error: String(error)
        });
    }
}

// ===== EBAY IMAGE SEARCH =====
async function handleFindOnEbayByImage(message: any, sender: any, sendResponse: any) {
    const { imageUrl, productData } = message;

    console.log('� Finding on eBay with product data:', productData);

    try {
        // Create optimized search query from product data
        let searchQuery = '';

        if (productData.brand && productData.title) {
            // Use brand + shortened title for better results
            const shortTitle = productData.title
                .replace(/\([^)]*\)/g, '') // Remove parentheses
                .replace(/[,]/g, ' ') // Replace commas
                .replace(/\s+/g, ' ') // Normalize spaces
                .split(' ')
                .filter((word: string) => word.length > 0)
                .slice(0, 12) // Take first 12 words
                .join(' ')
                .trim();
            searchQuery = `${productData.brand} ${shortTitle}`;
        } else if (productData.title) {
            // Just use title if no brand
            searchQuery = productData.title
                .replace(/\([^)]*\)/g, '')
                .replace(/[,]/g, ' ')
                .replace(/\s+/g, ' ')
                .split(' ')
                .filter((word: string) => word.length > 0)
                .slice(0, 15)
                .join(' ')
                .trim();
        } else {
            throw new Error('No product data available');
        }

        console.log('🔍 Search query:', searchQuery);

        // Build eBay search URL with filters
        // _nkw: Search keywords
        // _sacat: 0 (all categories)
        // LH_Sold: 1 (Show sold items)
        // LH_Complete: 1 (Completed listings only)
        // rt: nc (No cache)
        const ebaySearchUrl = `https://www.ebay.com/sch/i.html?_from=R40&_nkw=${encodeURIComponent(searchQuery)}&_sacat=0&LH_Sold=1&LH_Complete=1&rt=nc`;

        console.log('🌐 Opening eBay search URL:', ebaySearchUrl);

        // Open eBay search in new tab
        const ebayTab = await chrome.tabs.create({
            url: ebaySearchUrl,
            active: true
        });

        console.log('✅ Opened eBay search in tab:', ebayTab.id);

        // Store search data for reference
        await chrome.storage.local.set({
            lastEbaySearch: {
                query: searchQuery,
                imageUrl: imageUrl,
                productData: productData,
                tabId: ebayTab.id,
                timestamp: Date.now()
            }
        });

        // Track the search
        updateTabState(ebayTab.id, {
            searchType: 'text',
            searchQuery: searchQuery,
            imageUrl: imageUrl,
            productData: productData,
            timestamp: Date.now()
        });

        sendResponse({ success: true, tabId: ebayTab.id, searchQuery: searchQuery });

    } catch (error) {
        console.error('❌ Error in eBay search:', error);

        // Final fallback: Basic search with just product title
        const fallbackQuery = productData?.title?.slice(0, 100) || 'product';
        const fallbackUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(fallbackQuery)}&LH_Sold=1&LH_Complete=1`;

        console.log('⚠️ Using fallback search:', fallbackQuery);

        const fallbackTab = await chrome.tabs.create({ url: fallbackUrl, active: true });

        sendResponse({ success: true, fallback: true, tabId: fallbackTab.id });
    }
}

// ===== SOLD ITEMS SCANNER =====
function handleSoldItemsScanned(message: any, sender: any, sendResponse: any) {
    const { items, sellerName } = message;

    console.log(`✅ Sold items scanned: ${items.length} items from ${sellerName}`);

    // Broadcast to all tabs (especially CompetitorResearch page)
    broadcastToAllTabs({
        type: 'soldItemsUpdate',
        items: items,
        sellerName: sellerName,
        timestamp: Date.now()
    });
}

// ===== AUTOMATION COMMAND SYSTEM =====
async function executeAutomationCommand(command: AutomationCommand, sendResponse: any) {
    console.log('🤖 Executing automation command:', command.type, command.target);

    try {
        if (!command.tabId) {
            throw new Error('Tab ID required for automation command');
        }

        // Send command to content script
        const response = await chrome.tabs.sendMessage(command.tabId, {
            type: 'automationCommand',
            command: command
        });

        console.log('✅ Command executed:', response);
        sendResponse({ success: true, result: response });

    } catch (error) {
        console.error('❌ Command execution failed:', error);

        // Retry logic
        if (command.retries && command.retries > 0) {
            console.log(`🔄 Retrying command (${command.retries} attempts left)...`);
            command.retries--;
            setTimeout(() => {
                executeAutomationCommand(command, sendResponse);
            }, 1000);
        } else {
            sendResponse({ success: false, error: String(error) });
        }
    }
}

async function queueCommands(commands: AutomationCommand[], sendResponse: any) {
    console.log(`📋 Queueing ${commands.length} commands`);

    state.queue.push(...commands);

    // Start processing if not already running
    if (!state.running) {
        processCommandQueue();
    }

    sendResponse({ success: true, queueLength: state.queue.length });
}

async function processCommandQueue() {
    if (state.running || state.queue.length === 0) {
        return;
    }

    state.running = true;
    console.log('🚀 Processing command queue...');

    while (state.queue.length > 0) {
        const command = state.queue.shift();
        if (!command) break;

        state.currentTask = `${command.type}:${command.target}`;

        try {
            await new Promise((resolve, reject) => {
                executeAutomationCommand(command, (response: any) => {
                    if (response.success) {
                        resolve(response.result);
                    } else {
                        reject(response.error);
                    }
                });
            });

            // Delay between commands
            await delay(state.settings.delays.betweenActions);

        } catch (error) {
            console.error('❌ Command failed in queue:', error);
        }
    }

    state.running = false;
    state.currentTask = null;
    console.log('✅ Command queue processing complete');
}

// ===== TAB MANAGEMENT =====
function updateTabState(tabId: number, data: any) {
    const existing = state.tabStates.get(tabId);

    state.tabStates.set(tabId, {
        tabId,
        url: data.url || existing?.url || '',
        status: data.status || 'complete',
        data: { ...(existing?.data || {}), ...data },
        lastAction: data.action || existing?.lastAction || 'init',
        timestamp: Date.now()
    });

    console.log(`📊 Tab state updated:`, tabId, data.action || 'data');
}

/**
 * Clean up tab state on tab close
 */
chrome.tabs.onRemoved.addListener((tabId: any) => {
    if (state.tabStates.has(tabId)) {
        console.log('🗑️ Tab closed, cleaning up state:', tabId);
        state.tabStates.delete(tabId);
    }
});

// ===== MESSAGING UTILITIES =====
async function broadcastToAllTabs(message: any) {
    try {
        const tabs = await chrome.tabs.query({});

        for (const tab of tabs) {
            if (tab.id) {
                try {
                    await chrome.tabs.sendMessage(tab.id, message);
                } catch (e) {
                    // Tab might not have content script, ignore
                }
            }
        }
    } catch (error) {
        console.error('Error broadcasting to tabs:', error);
    }
}

// ===== NOTIFICATIONS =====
function showNotification(title: string, message: string, iconUrl?: string) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: iconUrl || chrome.runtime.getURL('icons/icon128.png'),
        title: title,
        message: message,
        priority: 2
    });
}

// ===== PROFIT CALCULATOR =====
function calculateProfit(data: any): any {
    const {
        amazonPrice = 0,
        ebayPrice = 0,
        shippingCost = 0,
        ebayFees = 0.13, // 13% default eBay fee
        paypalFees = 0.029 // 2.9% PayPal fee
    } = data;

    const revenue = ebayPrice;
    const cost = amazonPrice + shippingCost;
    const fees = (revenue * ebayFees) + (revenue * paypalFees) + 0.30; // PayPal fixed fee
    const profit = revenue - cost - fees;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return {
        revenue,
        cost,
        fees,
        profit,
        margin: margin.toFixed(2),
        profitable: profit > 0
    };
}

// ===== VERO LIST CHECKING =====
const VERO_BRANDS = [
    'Hamilton Beach', 'Ninja', 'Remington', 'Apple', 'Pampers', 'Tide',
    'Gillette', 'Nike', 'Adidas', 'PlayStation', 'Sony', 'Microsoft',
    'Disney', 'Marvel', 'Coach', 'Louis Vuitton', 'Gucci', 'Prada'
    // Add more from VeroList.txt
];

function checkVEROList(text: string): boolean {
    if (!text) return false;

    const lowerText = text.toLowerCase();

    return VERO_BRANDS.some(brand =>
        lowerText.includes(brand.toLowerCase())
    );
}

// ===== RESTRICTED WORDS =====
const RESTRICTED_WORDS = [
    'replica', 'fake', 'knock-off', 'counterfeit', 'bootleg',
    'unauthorized', 'import', 'parallel import'
];

function checkRestrictedWords(text: string): string[] {
    if (!text) return [];

    const lowerText = text.toLowerCase();

    return RESTRICTED_WORDS.filter(word =>
        lowerText.includes(word.toLowerCase())
    );
}

// ===== UTILITY FUNCTIONS =====
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== EXTENSION LIFECYCLE =====
chrome.runtime.onInstalled.addListener((details: any) => {
    console.log('🎉 EcomFlow extension installed/updated:', details.reason);

    // Initialize default settings
    chrome.storage.local.set({
        settings: state.settings,
        veroList: VERO_BRANDS,
        restrictedWords: RESTRICTED_WORDS
    });
});

// ===== EXPORTS FOR TESTING =====
export {
    executeAutomationCommand,
    queueCommands,
    calculateProfit,
    checkVEROList,
    checkRestrictedWords
};
