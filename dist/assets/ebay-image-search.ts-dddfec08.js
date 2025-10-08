(function(){console.log("🖼️ eBay Image Search automation loaded on:",window.location.href);function u(){return window.location.href.includes("ebay.com/sh/search")}async function l(t){console.log("📥 Fetching image from:",t);try{const e=await fetch(t);if(!e.ok)throw new Error(`Failed to fetch image: ${e.status}`);const o=await e.blob();return console.log("✅ Image fetched successfully, size:",o.size),o}catch(e){throw console.error("❌ Error fetching image:",e),e}}async function m(t,e){console.log("🔍 Starting eBay image search automation");try{await f(".sh-main",1e4);const o=document.querySelector('input[type="file"]');if(o){console.log("✅ Found file input element");const n=await l(t),r=new File([n],"search-image.jpg",{type:"image/jpeg"}),a=new DataTransfer;a.items.add(r),o.files=a.files;const i=new Event("change",{bubbles:!0});o.dispatchEvent(i),console.log("✅ Image uploaded to eBay search"),c("✅ Image uploaded! Searching eBay...",3e3)}else{console.log("⚠️ No file input found, looking for alternative methods...");const n=document.querySelector('input[placeholder*="image"]');if(n){n.value=t,n.dispatchEvent(new Event("input",{bubbles:!0})),n.dispatchEvent(new Event("change",{bubbles:!0}));const r=document.querySelector('button[type="submit"], button.btn-prim');r&&setTimeout(()=>r.click(),500),console.log("✅ Image URL submitted to eBay search")}else{const r=document.querySelector('.sh-drop-zone, [data-test-id="drop-zone"]');r?(console.log("📋 Found drop zone, attempting to trigger upload interface"),r.click(),setTimeout(async()=>{const a=document.querySelector('input[type="file"]');if(a){const i=await l(t),g=new File([i],"search-image.jpg",{type:"image/jpeg"}),s=new DataTransfer;s.items.add(g),a.files=s.files,a.dispatchEvent(new Event("change",{bubbles:!0})),console.log("✅ Image uploaded via drop zone")}},1e3)):(console.error("❌ Could not find any upload method"),c("⚠️ Could not auto-upload. Please upload manually.",5e3),p(t))}}}catch(o){console.error("❌ Error performing image search:",o),c("❌ Auto-upload failed. Using text search instead...",3e3),e!=null&&e.title&&setTimeout(()=>{window.location.href=`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(e.title)}&_sop=12&LH_Sold=1&LH_Complete=1`},2e3)}}function p(t){var o,n;const e=document.createElement("div");e.style.cssText=`
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
    `,e.innerHTML=`
        <div style="font-size: 16px; font-weight: bold; color: #333; margin-bottom: 10px;">
            📸 Image URL for Manual Upload
        </div>
        <div style="background: #f5f5f5; padding: 10px; border-radius: 6px; margin-bottom: 15px; word-break: break-all; font-size: 12px;">
            ${t}
        </div>
        <div style="display: flex; gap: 10px; justify-content: center;">
            <button id="copyImageUrl" style="background: #2ecc40; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold;">
                📋 Copy URL
            </button>
            <button id="closeOverlay" style="background: #e53238; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold;">
                ✕ Close
            </button>
        </div>
    `,document.body.appendChild(e),(o=document.getElementById("copyImageUrl"))==null||o.addEventListener("click",()=>{navigator.clipboard.writeText(t),c("✅ Image URL copied to clipboard!",2e3)}),(n=document.getElementById("closeOverlay"))==null||n.addEventListener("click",()=>{e.remove()})}function f(t,e=5e3){return new Promise((o,n)=>{const r=document.querySelector(t);if(r){o(r);return}const a=new MutationObserver(()=>{const i=document.querySelector(t);i&&(a.disconnect(),o(i))});a.observe(document.body,{childList:!0,subtree:!0}),setTimeout(()=>{a.disconnect(),n(new Error(`Element ${t} not found within ${e}ms`))},e)})}function c(t,e=3e3){const o=document.createElement("div");o.style.cssText=`
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
    `,o.textContent=t;const n=document.createElement("style");n.textContent=`
        @keyframes slideInFromRight {
            from { transform: translateX(400px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `,document.head.appendChild(n),document.body.appendChild(o),setTimeout(()=>{o.style.animation="slideInFromRight 0.3s ease-out reverse",setTimeout(()=>o.remove(),300)},e)}chrome.runtime.onMessage.addListener((t,e,o)=>{if(console.log("📨 eBay Image Search received message:",t.type),t.type==="performImageSearch"){const{imageUrl:n,productData:r}=t;if(u())return m(n,r).then(()=>{o({success:!0})}).catch(a=>{console.error("Error in performImageSearch:",a),o({success:!1,error:a.message})}),!0;console.warn("⚠️ Not on eBay visual search page"),o({success:!1,error:"Not on visual search page"})}return!1});async function d(){if(!u())return;const e=(await chrome.storage.local.get(["pendingImageSearch"])).pendingImageSearch;e&&e.imageUrl&&(console.log("📋 Found pending image search:",e.imageUrl),await chrome.storage.local.remove(["pendingImageSearch"]),await m(e.imageUrl,e.productData))}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",d):d();console.log("✅ eBay Image Search automation ready");
})()
