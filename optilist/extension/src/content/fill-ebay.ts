import { PipelineResult } from '../types';

function sleep(ms: number){ return new Promise(r => setTimeout(r, ms)); }

async function typeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string){
  el.focus();
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

async function setHtmlInEditor(html: string){
  // eBay uses a rich text editor in an iframe; best‑effort targeting
  const iframe = document.querySelector('iframe[title*="Description"], iframe[aria-label*="Description"]') as HTMLIFrameElement | null;
  if(iframe?.contentDocument){
    iframe.contentDocument.body.innerHTML = html;
    return true;
  }
  // Fallback: textarea
  const txt = document.querySelector('textarea[name="description"], textarea[aria-label*="Description"]') as HTMLTextAreaElement | null;
  if(txt){ await typeValue(txt, html); return true; }
  return false;
}

async function fillBasicFields(p: PipelineResult){
  const titleInput = document.querySelector('input[name="title"], input[aria-label*="Title"]') as HTMLInputElement | null;
  if(titleInput) await typeValue(titleInput, p.optimized.ebayTitle);
  await setHtmlInEditor(p.optimized.ebayHtmlDescription);
}

async function requestImageUpload(urls: string[]){
  // Delegate to local agent (Puppeteer) to handle native file uploads reliably
  await fetch('http://localhost:3449/create-listing/images', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrls: urls })
  }).catch(()=>{});
}

// Expose to background
// @ts-ignore
window.__OPTL_fillEbay = async (payload: PipelineResult) => {
  await sleep(1500); // give page time to mount editor
  await fillBasicFields(payload);
  await requestImageUpload(payload.extracted.images.slice(0,12));
  return true;
};
