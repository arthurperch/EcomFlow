console.log('EcomFlow real background.js loaded');
import { TaskQueue } from './lib/queue';
// Settings from storage
let threadCount = 1;
chrome.storage.local.get(['threadCount']).then(({ threadCount: tc }) => { if (tc)
    threadCount = tc; });
chrome.storage.onChanged.addListener(changes => {
    if (changes.threadCount)
        threadCount = changes.threadCount.newValue || 1;
});
// Worker: for each URL => open tab, scrape, optimize, handoff to eBay
async function processTask(task) {
    const tab = await chrome.tabs.create({ url: task.url, active: false });
    try {
        // Wait for load
        await waitForTabComplete(tab.id);
        // Ask content script to extract
        const [{ result: extracted } = { result: null }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                // @ts-ignore – access global in content context
                return window.__OPTL_extract?.(document, location.href);
            }
        });
        if (!extracted)
            throw new Error('extract failed');
        // Optimize via local LLM (call from background for CORS simplicity)
        const optimized = await optimizeBackground(extracted);
        // Store interim result then open eBay and fill
        const payload = { extracted, optimized };
        await chrome.storage.local.set({ ['result:' + task.id]: payload });
        // Open eBay create‑listing page (you may parameterize URL as needed)
        const ebay = await chrome.tabs.create({ url: 'https://www.ebay.com/sl/sell', active: false });
        await waitForTabComplete(ebay.id);
        // Fill title/description via content script; images delegated to local agent
        await chrome.scripting.executeScript({
            target: { tabId: ebay.id },
            args: [payload],
            func: (payload) => {
                // @ts-ignore
                return window.__OPTL_fillEbay?.(payload);
            }
        });
        return payload;
    }
    finally {
        if (tab.id)
            chrome.tabs.remove(tab.id);
    }
}
// Helper to await a single tab update event to 'complete'
function waitForTabComplete(tabId) {
    return new Promise((resolve) => {
        const listener = (updatedTabId, changeInfo, tab) => {
            if (updatedTabId === tabId && changeInfo.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);
                resolve();
            }
        };
        chrome.tabs.onUpdated.addListener(listener);
    });
}
// Background LLM optimize (fetch to localhost:11434)
async function optimizeBackground(extracted) {
    const res = await fetch('http://localhost:11434/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'llama3.1:8b', stream: false,
            prompt: `Return JSON with ebayTitle (<=80 chars) and ebayHtmlDescription for this product.\nTitle:${extracted.title}\nBullets:${extracted.bullets.join(' | ')}\nDesc:${extracted.description.slice(0, 2000)}`
        })
    });
    const data = await res.json();
    const text = data.response || '';
    const json = (() => { try {
        return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
    }
    catch { } return null; })();
    if (!json)
        throw new Error('LLM parse error');
    return json;
}
// Queue
const queue = new TaskQueue(processTask, threadCount);
// Listen from popup: start pipeline
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    (async () => {
        if (msg.type === 'OPTL_START') {
            const urls = msg.urls || [];
            const results = [];
            for (const url of urls) {
                const task = { url, id: crypto.randomUUID() };
                results.push(await queue.push(task));
            }
            sendResponse({ ok: true, results });
        }
        if (msg.type === 'OPTL_SET_THREADS') {
            queue.setConcurrency(Math.max(1, msg.threads | 0));
            await chrome.storage.local.set({ threadCount: Math.max(1, msg.threads | 0) });
            sendResponse({ ok: true });
        }
    })().catch(e => sendResponse({ ok: false, error: String(e) }));
    return true; // async
});
