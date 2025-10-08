(function(){console.log("🔍 Amazon Product Overlay loaded on:",window.location.href);let s=null;function f(){const e=[/\/dp\/([A-Z0-9]{10})/,/\/gp\/product\/([A-Z0-9]{10})/,/\/ASIN\/([A-Z0-9]{10})/,/product\/([A-Z0-9]{10})/],o=window.location.href;for(const t of e){const n=o.match(t);if(n)return n[1]}const i=document.querySelector("[data-asin]");if(i){const t=i.getAttribute("data-asin");if(t&&t.length===10)return t}return null}function y(){var d,u,p;const e=f();if(!e)return null;const o=document.querySelector("#productTitle, h1.product-title"),i=((d=o==null?void 0:o.textContent)==null?void 0:d.trim())||"",t=document.querySelector("#bylineInfo, .po-brand .po-break-word"),n=((u=t==null?void 0:t.textContent)==null?void 0:u.trim().replace("Brand:","").replace("Visit the","").replace("Store","").trim())||"",r=document.querySelector(".a-price .a-offscreen, #priceblock_ourprice, #priceblock_dealprice"),l=((p=r==null?void 0:r.textContent)==null?void 0:p.trim())||"",a=document.querySelector("#landingImage, #imgBlkFront"),g=(a==null?void 0:a.src)||"";return{title:i,asin:e,brand:n,price:l,imageUrl:g}}function x(){if(s||!c())return;const e=y();if(!e||!e.title){console.log("Could not extract product info, skipping overlay");return}console.log("✅ Extracted product:",e);const o=document.createElement("div");o.id="amazon-ebay-overlay",o.style.cssText=`
        position: fixed;
        top: 100px;
        right: 20px;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        animation: slideIn 0.3s ease-out;
    `;const i=document.createElement("style");i.textContent=`
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `,document.head.appendChild(i);const t=document.createElement("button");t.innerHTML=`
        <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 18px;">🔍</span>
            <div style="text-align: left; line-height: 1.3;">
                <div style="font-weight: 700; font-size: 14px;">Find on eBay</div>
                <div style="font-size: 11px; opacity: 0.9;">View sold listings</div>
            </div>
        </div>
    `,t.style.cssText=`
        background: linear-gradient(135deg, #e53238 0%, #ff6b6b 100%);
        color: white;
        border: none;
        border-radius: 12px;
        padding: 14px 20px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(229, 50, 56, 0.4);
        transition: all 0.2s;
        min-width: 180px;
    `,t.onmouseover=()=>{t.style.transform="translateY(-2px)",t.style.boxShadow="0 6px 25px rgba(229, 50, 56, 0.5)"},t.onmouseout=()=>{t.style.transform="translateY(0)",t.style.boxShadow="0 4px 20px rgba(229, 50, 56, 0.4)"},t.onclick=()=>{console.log("🔍 Starting eBay search for:",e.title),chrome.runtime.sendMessage({type:"findOnEbayByImage",imageUrl:e.imageUrl,productData:e},a=>{a&&a.success?(console.log("✅ eBay search opened successfully"),a.searchQuery&&console.log("🔍 Search query:",a.searchQuery)):console.error("❌ eBay search failed:",a==null?void 0:a.error)}),chrome.storage.local.set({lastAmazonProduct:e,lastSearchType:"optimized"})};const n=document.createElement("button");n.innerHTML=`
        <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">📊</span>
            <span>Research Item</span>
        </div>
    `,n.style.cssText=`
        background: linear-gradient(135deg, #2ecc40 0%, #27ae60 100%);
        color: white;
        border: none;
        border-radius: 12px;
        padding: 12px 20px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 15px rgba(46, 204, 64, 0.3);
        transition: all 0.2s;
        min-width: 180px;
    `,n.onmouseover=()=>{n.style.transform="translateY(-2px)",n.style.boxShadow="0 6px 20px rgba(46, 204, 64, 0.4)"},n.onmouseout=()=>{n.style.transform="translateY(0)",n.style.boxShadow="0 4px 15px rgba(46, 204, 64, 0.3)"},n.onclick=async()=>{await chrome.storage.local.set({researchProduct:e,researchMode:"amazon-to-ebay"});const a=chrome.runtime.getURL("index.html#/competitor-research");window.open(a,"_blank")};const r=document.createElement("button");r.textContent="✕",r.style.cssText=`
        background: rgba(0, 0, 0, 0.7);
        color: white;
        border: none;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        transition: all 0.2s;
        align-self: flex-end;
    `,r.onmouseover=()=>{r.style.background="rgba(229, 50, 56, 0.9)",r.style.transform="scale(1.1)"},r.onmouseout=()=>{r.style.background="rgba(0, 0, 0, 0.7)",r.style.transform="scale(1)"},r.onclick=()=>{o.remove(),s=null};const l=document.createElement("div");l.style.cssText=`
        background: white;
        border-radius: 12px;
        padding: 12px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        max-width: 180px;
        font-size: 12px;
        color: #333;
    `,l.innerHTML=`
        <div style="font-weight: 600; margin-bottom: 6px; color: #e53238;">Product Info</div>
        <div style="font-size: 11px; line-height: 1.4; color: #666;">
            <strong>ASIN:</strong> ${e.asin}<br>
            ${e.brand?`<strong>Brand:</strong> ${e.brand.slice(0,20)}<br>`:""}
            ${e.price?`<strong>Price:</strong> ${e.price}`:""}
        </div>
    `,o.appendChild(r),o.appendChild(t),o.appendChild(n),o.appendChild(l),document.body.appendChild(o),s=o,console.log("✅ Overlay button created")}function c(){const e=window.location.href;return(e.includes("/dp/")||e.includes("/gp/product/")||e.includes("/ASIN/"))&&!e.includes("/reviews/")}function m(){console.log("🚀 Initializing Amazon Product Overlay..."),c()&&setTimeout(()=>{x()},1500);let e=window.location.href;new MutationObserver(()=>{const o=window.location.href;o!==e&&(e=o,s&&(s.remove(),s=null),c()&&setTimeout(x,1500))}).observe(document.body,{childList:!0,subtree:!0})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",m):m();
})()
