/**
 * Automation Commands Handler
 * Executes automation commands sent from background service worker
 * Provides: click, type, scroll, wait, extract, navigate
 */

console.log('🤖 Automation Commands Handler loaded');

interface AutomationCommand {
    type: 'click' | 'type' | 'scroll' | 'wait' | 'navigate' | 'extract' | 'custom';
    target?: string;
    value?: any;
    options?: any;
}

/**
 * Main command executor
 */
async function executeCommand(command: AutomationCommand): Promise<any> {
    console.log(`⚡ Executing: ${command.type}`, command.target);

    try {
        switch (command.type) {
            case 'click':
                return await autoClick(command.target!, command.options);

            case 'type':
                return await autoType(command.target!, command.value, command.options);

            case 'scroll':
                return await autoScroll(command.target || null, command.value, command.options);

            case 'wait':
                return await autoWait(command.value, command.options);

            case 'navigate':
                return await autoNavigate(command.value);

            case 'extract':
                return await autoExtract(command.target!, command.options);

            case 'custom':
                return await executeCustomCommand(command);

            default:
                throw new Error(`Unknown command type: ${command.type}`);
        }
    } catch (error) {
        console.error(`❌ Command failed:`, error);
        throw error;
    }
}

/**
 * AUTO CLICK - Click element by selector
 */
async function autoClick(selector: string, options: any = {}): Promise<boolean> {
    const {
        waitForElement = 5000,
        highlight = true,
        scrollIntoView = true,
        multiple = false
    } = options;

    // Wait for element
    const element = await waitForElement ?
        await waitForSelector(selector, waitForElement) :
        document.querySelector(selector);

    if (!element) {
        throw new Error(`Element not found: ${selector}`);
    }

    // Handle multiple elements
    if (multiple) {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
            await clickElement(el as HTMLElement, { highlight, scrollIntoView });
            await delay(300);
        }
        return true;
    }

    return await clickElement(element as HTMLElement, { highlight, scrollIntoView });
}

async function clickElement(element: HTMLElement, options: any = {}): Promise<boolean> {
    const { highlight = true, scrollIntoView = true } = options;

    try {
        // Scroll into view
        if (scrollIntoView) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await delay(500);
        }

        // Highlight element
        if (highlight) {
            const originalBg = element.style.backgroundColor;
            const originalBorder = element.style.border;

            element.style.backgroundColor = '#90EE90';
            element.style.border = '3px solid #00FF00';
            element.style.transition = 'all 0.3s';

            await delay(300);

            element.style.backgroundColor = originalBg;
            element.style.border = originalBorder;
        }

        // Multiple click attempts for reliability
        element.click();

        // Also try event dispatch
        element.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
        }));

        console.log(`✓ Clicked:`, element);
        return true;

    } catch (error) {
        console.error('Click failed:', error);
        throw error;
    }
}

/**
 * AUTO TYPE - Type text into input field
 */
async function autoType(selector: string, text: string, options: any = {}): Promise<boolean> {
    const {
        waitForElement = 5000,
        clearFirst = true,
        typingDelay = 50,
        triggerEvents = true
    } = options;

    const element = await waitForSelector(selector, waitForElement) as HTMLInputElement | HTMLTextAreaElement;

    if (!element) {
        throw new Error(`Element not found: ${selector}`);
    }

    try {
        // Focus element
        element.focus();
        await delay(100);

        // Clear existing value
        if (clearFirst) {
            element.value = '';
            element.dispatchEvent(new Event('input', { bubbles: true }));
            await delay(100);
        }

        // Type character by character
        for (const char of text) {
            element.value += char;

            if (triggerEvents) {
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
                element.dispatchEvent(new KeyboardEvent('keypress', { key: char, bubbles: true }));
                element.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
            }

            if (typingDelay > 0) {
                await delay(typingDelay);
            }
        }

        // Final events
        if (triggerEvents) {
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.dispatchEvent(new Event('blur', { bubbles: true }));
        }

        console.log(`✓ Typed into:`, selector, `"${text}"`);
        return true;

    } catch (error) {
        console.error('Type failed:', error);
        throw error;
    }
}

/**
 * AUTO SCROLL - Scroll page or element
 */
async function autoScroll(selector: string | null, value: number | 'top' | 'bottom', options: any = {}): Promise<boolean> {
    const { smooth = true, behavior = 'smooth' } = options;

    try {
        if (selector) {
            // Scroll specific element
            const element = document.querySelector(selector);
            if (!element) throw new Error(`Element not found: ${selector}`);

            if (value === 'top') {
                element.scrollTop = 0;
            } else if (value === 'bottom') {
                element.scrollTop = element.scrollHeight;
            } else {
                element.scrollTop = value as number;
            }
        } else {
            // Scroll window
            if (value === 'top') {
                window.scrollTo({ top: 0, behavior: behavior as ScrollBehavior });
            } else if (value === 'bottom') {
                window.scrollTo({ top: document.body.scrollHeight, behavior: behavior as ScrollBehavior });
            } else {
                window.scrollTo({ top: value as number, behavior: behavior as ScrollBehavior });
            }
        }

        await delay(500);
        console.log(`✓ Scrolled${selector ? ` ${selector}` : ''} to:`, value);
        return true;

    } catch (error) {
        console.error('Scroll failed:', error);
        throw error;
    }
}

/**
 * AUTO WAIT - Wait for condition or time
 */
async function autoWait(value: number | string, options: any = {}): Promise<boolean> {
    const { timeout = 10000 } = options;

    if (typeof value === 'number') {
        // Wait for milliseconds
        await delay(value);
        console.log(`✓ Waited ${value}ms`);
        return true;
    }

    if (typeof value === 'string') {
        // Wait for selector
        const element = await waitForSelector(value, timeout);
        console.log(`✓ Element appeared:`, value);
        return !!element;
    }

    return false;
}

/**
 * AUTO NAVIGATE - Navigate to URL
 */
async function autoNavigate(url: string): Promise<boolean> {
    try {
        window.location.href = url;
        console.log(`✓ Navigating to:`, url);
        return true;
    } catch (error) {
        console.error('Navigation failed:', error);
        throw error;
    }
}

/**
 * AUTO EXTRACT - Extract data from page
 */
async function autoExtract(selector: string, options: any = {}): Promise<any> {
    const {
        attribute = 'textContent',
        multiple = false,
        transform = null
    } = options;

    try {
        if (multiple) {
            const elements = Array.from(document.querySelectorAll(selector));
            let results = elements.map(el =>
                attribute === 'textContent' ? el.textContent?.trim() : (el as any)[attribute]
            );

            if (transform) {
                results = results.map(transform);
            }

            console.log(`✓ Extracted ${results.length} items from:`, selector);
            return results;
        }

        const element = document.querySelector(selector);
        if (!element) throw new Error(`Element not found: ${selector}`);

        let result = attribute === 'textContent' ?
            element.textContent?.trim() :
            (element as any)[attribute];

        if (transform) {
            result = transform(result);
        }

        console.log(`✓ Extracted from:`, selector, result);
        return result;

    } catch (error) {
        console.error('Extract failed:', error);
        throw error;
    }
}

/**
 * EXECUTE CUSTOM COMMAND
 */
async function executeCustomCommand(command: AutomationCommand): Promise<any> {
    // Custom command execution logic
    const { value } = command;

    if (value && typeof value === 'function') {
        return await value();
    }

    if (value && typeof value === 'string') {
        // Execute as eval (use with caution!)
        return eval(value);
    }

    throw new Error('Invalid custom command');
}

/**
 * UTILITY: Wait for selector
 */
function waitForSelector(selector: string, timeout: number = 10000): Promise<Element | null> {
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
                clearTimeout(timeoutId);
                resolve(element);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        const timeoutId = setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Timeout waiting for selector: ${selector}`));
        }, timeout);
    });
}

/**
 * UTILITY: Delay
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Listen for automation commands from background
 */
chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
    if (message.type === 'automationCommand') {
        executeCommand(message.command)
            .then(result => {
                sendResponse({ success: true, result });
            })
            .catch(error => {
                sendResponse({ success: false, error: String(error) });
            });

        return true; // Async response
    }
});

// Export for use in other content scripts
(window as any).automationCommands = {
    execute: executeCommand,
    click: autoClick,
    type: autoType,
    scroll: autoScroll,
    wait: autoWait,
    navigate: autoNavigate,
    extract: autoExtract
};

console.log('✅ Automation commands ready');

export {
    executeCommand,
    autoClick,
    autoType,
    autoScroll,
    autoWait,
    autoNavigate,
    autoExtract
};
