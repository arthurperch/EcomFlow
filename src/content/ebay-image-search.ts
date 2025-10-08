/**
 * eBay Image Search Automation
 * Automates the process of uploading an image to eBay's visual search
 */

console.log('🖼️ eBay Image Search automation loaded on:', window.location.href);

interface ImageSearchRequest {
    imageUrl: string;
    productData?: any;
}

/**
 * Check if we're on eBay's visual search page
 */
function isEbayVisualSearchPage(): boolean {
    return window.location.href.includes('ebay.com/sh/search');
}

/**
 * Convert image URL to Blob for upload
 */
async function fetchImageAsBlob(imageUrl: string): Promise<Blob> {
    console.log('📥 Fetching image from:', imageUrl);

    try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status}`);
        }
        const blob = await response.blob();
        console.log('✅ Image fetched successfully, size:', blob.size);
        return blob;
    } catch (error) {
        console.error('❌ Error fetching image:', error);
        throw error;
    }
}

/**
 * Perform image search on eBay
 */
async function performImageSearch(imageUrl: string, productData?: any): Promise<void> {
    console.log('🔍 Starting eBay image search automation');

    try {
        // Wait for page to fully load
        await waitForElement('.sh-main', 10000);

        // Method 1: Try to find file input for image upload
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

        if (fileInput) {
            console.log('✅ Found file input element');

            // Fetch the image as a blob
            const imageBlob = await fetchImageAsBlob(imageUrl);

            // Create a File object from the blob
            const file = new File([imageBlob], 'search-image.jpg', { type: 'image/jpeg' });

            // Create a DataTransfer to set the file
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInput.files = dataTransfer.files;

            // Trigger change event
            const changeEvent = new Event('change', { bubbles: true });
            fileInput.dispatchEvent(changeEvent);

            console.log('✅ Image uploaded to eBay search');

            // Show success notification
            showNotification('✅ Image uploaded! Searching eBay...', 3000);

        } else {
            // Method 2: Look for image URL input or drag-drop area
            console.log('⚠️ No file input found, looking for alternative methods...');

            const imageUrlInput = document.querySelector('input[placeholder*="image"]') as HTMLInputElement;
            if (imageUrlInput) {
                imageUrlInput.value = imageUrl;
                imageUrlInput.dispatchEvent(new Event('input', { bubbles: true }));
                imageUrlInput.dispatchEvent(new Event('change', { bubbles: true }));

                // Look for search button
                const searchButton = document.querySelector('button[type="submit"], button.btn-prim') as HTMLButtonElement;
                if (searchButton) {
                    setTimeout(() => searchButton.click(), 500);
                }

                console.log('✅ Image URL submitted to eBay search');
            } else {
                // Method 3: Try drag-drop area
                const dropZone = document.querySelector('.sh-drop-zone, [data-test-id="drop-zone"]');
                if (dropZone) {
                    console.log('📋 Found drop zone, attempting to trigger upload interface');
                    (dropZone as HTMLElement).click();

                    // Wait a moment and try file input again
                    setTimeout(async () => {
                        const delayedFileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
                        if (delayedFileInput) {
                            const imageBlob = await fetchImageAsBlob(imageUrl);
                            const file = new File([imageBlob], 'search-image.jpg', { type: 'image/jpeg' });
                            const dataTransfer = new DataTransfer();
                            dataTransfer.items.add(file);
                            delayedFileInput.files = dataTransfer.files;
                            delayedFileInput.dispatchEvent(new Event('change', { bubbles: true }));
                            console.log('✅ Image uploaded via drop zone');
                        }
                    }, 1000);
                } else {
                    console.error('❌ Could not find any upload method');
                    showNotification('⚠️ Could not auto-upload. Please upload manually.', 5000);

                    // Show the image URL to user for manual upload
                    displayImageUrlForManualUpload(imageUrl);
                }
            }
        }

    } catch (error) {
        console.error('❌ Error performing image search:', error);
        showNotification('❌ Auto-upload failed. Using text search instead...', 3000);

        // Fallback to text search
        if (productData?.title) {
            setTimeout(() => {
                window.location.href = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(productData.title)}&_sop=12&LH_Sold=1&LH_Complete=1`;
            }, 2000);
        }
    }
}

/**
 * Display image URL for manual upload if automation fails
 */
function displayImageUrlForManualUpload(imageUrl: string): void {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: white;
        border: 3px solid #e53238;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        z-index: 999999;
        max-width: 500px;
        text-align: center;
    `;

    overlay.innerHTML = `
        <div style="font-size: 16px; font-weight: bold; color: #333; margin-bottom: 10px;">
            📸 Image URL for Manual Upload
        </div>
        <div style="background: #f5f5f5; padding: 10px; border-radius: 6px; margin-bottom: 15px; word-break: break-all; font-size: 12px;">
            ${imageUrl}
        </div>
        <div style="display: flex; gap: 10px; justify-content: center;">
            <button id="copyImageUrl" style="background: #2ecc40; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold;">
                📋 Copy URL
            </button>
            <button id="closeOverlay" style="background: #e53238; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold;">
                ✕ Close
            </button>
        </div>
    `;

    document.body.appendChild(overlay);

    // Copy button
    document.getElementById('copyImageUrl')?.addEventListener('click', () => {
        navigator.clipboard.writeText(imageUrl);
        showNotification('✅ Image URL copied to clipboard!', 2000);
    });

    // Close button
    document.getElementById('closeOverlay')?.addEventListener('click', () => {
        overlay.remove();
    });
}

/**
 * Wait for element to appear
 */
function waitForElement(selector: string, timeout: number = 5000): Promise<Element> {
    return new Promise((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element) {
            resolve(element);
            return;
        }

        const observer = new MutationObserver(() => {
            const element = document.querySelector(selector);
            if (element) {
                observer.disconnect();
                resolve(element);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        }, timeout);
    });
}

/**
 * Show temporary notification
 */
function showNotification(message: string, duration: number = 3000): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #2ecc40 0%, #27ae60 100%);
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 999999;
        font-weight: 600;
        font-size: 14px;
        animation: slideInFromRight 0.3s ease-out;
    `;
    notification.textContent = message;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInFromRight {
            from { transform: translateX(400px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideInFromRight 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

/**
 * Listen for messages from background service
 */
chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
    console.log('📨 eBay Image Search received message:', message.type);

    if (message.type === 'performImageSearch') {
        const { imageUrl, productData } = message;

        if (isEbayVisualSearchPage()) {
            performImageSearch(imageUrl, productData)
                .then(() => {
                    sendResponse({ success: true });
                })
                .catch((error: any) => {
                    console.error('Error in performImageSearch:', error);
                    sendResponse({ success: false, error: error.message });
                });

            return true; // Async response
        } else {
            console.warn('⚠️ Not on eBay visual search page');
            sendResponse({ success: false, error: 'Not on visual search page' });
        }
    }

    return false;
});

/**
 * Check for pending image search on page load
 */
async function checkPendingImageSearch() {
    if (!isEbayVisualSearchPage()) return;

    const storage = await chrome.storage.local.get(['pendingImageSearch']);
    const pending = storage.pendingImageSearch;

    if (pending && pending.imageUrl) {
        console.log('📋 Found pending image search:', pending.imageUrl);

        // Clear the pending search
        await chrome.storage.local.remove(['pendingImageSearch']);

        // Perform the search
        await performImageSearch(pending.imageUrl, pending.productData);
    }
}

// Check for pending search when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkPendingImageSearch);
} else {
    checkPendingImageSearch();
}

console.log('✅ eBay Image Search automation ready');
