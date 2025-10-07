import { extractFromAmazon } from '../lib/extract';

// Expose a function the background can call via chrome.scripting.executeScript
// @ts-ignore
window.__OPTL_extract = (doc: Document, href: string) => extractFromAmazon(doc, href);
