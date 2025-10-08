(function(){console.log("🔍 eBay Sold Items Scanner loaded on:",window.location.href);let x=new Map;function A(){const t=window.location.href;return(t.includes("/str/")||t.includes("/usr/")||t.includes("/sch/"))&&(t.includes("LH_Sold=1")||t.includes("LH_Complete=1")||t.includes("_sop=13"))}function w(t){var o,s,e,n,r,a;try{const l=t.querySelector(".s-item__title, h3.s-item__title"),f=((o=l==null?void 0:l.textContent)==null?void 0:o.trim())||"",i=t.querySelector(".s-item__price"),v=((s=i==null?void 0:i.textContent)==null?void 0:s.trim())||"",d=t.querySelector(".s-item__title--tag, .s-item__title--tagBlock, .POSITIVE"),_=((e=d==null?void 0:d.textContent)==null?void 0:e.trim())||"",C=q(_),I=L(t),c=t.querySelector(".s-item__image-img"),$=(c==null?void 0:c.src)||(c==null?void 0:c.getAttribute("data-src"))||"",u=t.querySelector("a.s-item__link"),m=(u==null?void 0:u.href)||"",z=D(m),p=t.querySelector(".s-item__seller-info-text"),T=((n=p==null?void 0:p.textContent)==null?void 0:n.trim())||S(),g=t.querySelector(".s-item__subtitle"),k=((r=g==null?void 0:g.textContent)==null?void 0:r.trim())||"",h=t.querySelector(".SECONDARY_INFO"),N=((a=h==null?void 0:h.textContent)==null?void 0:a.trim())||"";return!f||!m?null:{title:f,price:v,soldCount:I,soldDate:C,imageUrl:$,itemUrl:m,itemNumber:z,sellerName:T,category:k,condition:N}}catch(l){return console.error("Error extracting sold item data:",l),null}}function q(t){if(!t)return"";const o=[/Sold\s+([A-Za-z]+\s+\d+,\s+\d{4})/i,/Sold\s+(\d+\/\d+\/\d{4})/i,/Sold\s+([A-Za-z]+\s+\d+)/i];for(const s of o){const e=t.match(s);if(e)return e[1]}return""}function D(t){const o=t.match(/\/itm\/(\d+)|\/(\d{12})/);return o?o[1]||o[2]:""}function S(){const t=window.location.href,o=[/_ssn=([^&]+)/,/\/usr\/([^\/\?]+)/,/\/str\/([^\/\?]+)/];for(const s of o){const e=t.match(s);if(e)return decodeURIComponent(e[1])}return""}function L(t){const o=t.querySelector(".s-item__hotness, .s-item__quantitySold");if(!o)return 1;const e=(o.textContent||"").match(/(\d+(?:,\d+)*)/);return e?parseInt(e[1].replace(/,/g,""),10):1}async function M(){console.log("📊 Scanning for sold items...");const t=[],o=[".s-item",".srp-results .s-item","li.s-item"];let s=[];for(const e of o){const n=Array.from(document.querySelectorAll(e));if(n.length>0){s=n,console.log(`Found ${n.length} sold listings`);break}}for(const e of s){const n=w(e);n&&(t.push(n),console.log(`✓ Sold item: ${n.title} - ${n.price} (${n.soldDate})`))}return t}function U(t,o){const s=document.createElement("div");s.className="sold-item-overlay",s.style.cssText=`
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 6px;
    `;const e=document.createElement("button");e.innerHTML="🛒 Auto-Purchase",e.className="overlay-btn purchase-btn",e.style.cssText=`
        background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
        color: white;
        border: none;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(255, 107, 107, 0.4);
        transition: all 0.2s;
        white-space: nowrap;
    `,e.onmouseover=()=>{e.style.transform="scale(1.05)",e.style.boxShadow="0 4px 12px rgba(255, 107, 107, 0.6)"},e.onmouseout=()=>{e.style.transform="scale(1)",e.style.boxShadow="0 2px 8px rgba(255, 107, 107, 0.4)"},e.onclick=async()=>{await P(t)};const n=document.createElement("button");n.innerHTML="📦 Find Amazon",n.className="overlay-btn amazon-btn",n.style.cssText=`
        background: linear-gradient(135deg, #ff9900 0%, #ff8800 100%);
        color: white;
        border: none;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(255, 153, 0, 0.4);
        transition: all 0.2s;
        white-space: nowrap;
    `,n.onmouseover=()=>{n.style.transform="scale(1.05)",n.style.boxShadow="0 4px 12px rgba(255, 153, 0, 0.6)"},n.onmouseout=()=>{n.style.transform="scale(1)",n.style.boxShadow="0 2px 8px rgba(255, 153, 0, 0.4)"},n.onclick=()=>{const a=`https://www.amazon.com/s?k=${encodeURIComponent(t.title)}`;window.open(a,"_blank")};const r=document.createElement("button");return r.innerHTML="🔍 Details",r.className="overlay-btn details-btn",r.style.cssText=`
        background: linear-gradient(135deg, #4ecdc4 0%, #44a5a0 100%);
        color: white;
        border: none;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(78, 205, 196, 0.4);
        transition: all 0.2s;
        white-space: nowrap;
    `,r.onmouseover=()=>{r.style.transform="scale(1.05)"},r.onmouseout=()=>{r.style.transform="scale(1)"},r.onclick=()=>{O(t)},s.appendChild(e),s.appendChild(n),s.appendChild(r),s}async function P(t){console.log("🛒 Starting auto-purchase for:",t.title),await chrome.storage.local.set({autoPurchaseItem:t,autoPurchaseInProgress:!0});const o=`https://www.amazon.com/s?k=${encodeURIComponent(t.title)}`;chrome.tabs.create({url:o},s=>{console.log("✓ Opened Amazon search for auto-purchase")}),chrome.runtime.sendMessage({type:"showNotification",title:"Auto-Purchase Started",message:`Searching Amazon for: ${t.title.slice(0,50)}...`})}function O(t){var e;const o=document.createElement("div");o.style.cssText=`
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
    `;const s=document.createElement("div");s.style.cssText=`
        background: white;
        border-radius: 16px;
        padding: 30px;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
    `,s.innerHTML=`
        <h2 style="margin-top: 0; color: #333;">Sold Item Details</h2>
        <div style="margin-bottom: 20px;">
            <img src="${t.imageUrl}" style="max-width: 100%; border-radius: 8px;" />
        </div>
        <div style="color: #333; line-height: 1.6;">
            <p><strong>Title:</strong> ${t.title}</p>
            <p><strong>Price:</strong> ${t.price}</p>
            <p><strong>Sold Date:</strong> ${t.soldDate}</p>
            <p><strong>Item Number:</strong> ${t.itemNumber}</p>
            <p><strong>Seller:</strong> ${t.sellerName}</p>
            ${t.category?`<p><strong>Category:</strong> ${t.category}</p>`:""}
            ${t.condition?`<p><strong>Condition:</strong> ${t.condition}</p>`:""}
        </div>
        <button id="closeModal" style="
            background: #e74c3c;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 12px 24px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            margin-top: 20px;
        ">Close</button>
    `,o.appendChild(s),document.body.appendChild(o),o.onclick=n=>{n.target===o&&o.remove()},(e=s.querySelector("#closeModal"))==null||e.addEventListener("click",()=>{o.remove()})}function y(){const t=[".s-item","li.s-item"];for(const o of t)document.querySelectorAll(o).forEach((e,n)=>{if(x.has(`item-${n}`))return;const r=w(e);if(r){e.style.position="relative";const a=U(r);e.appendChild(a),x.set(`item-${n}`,a)}});console.log(`✓ Added overlays to ${x.size} sold items`)}async function b(){console.log("🚀 Initializing Sold Items Scanner..."),A()?(console.log("✓ On seller sold items page"),setTimeout(async()=>{const o=await M();y(),chrome.runtime.sendMessage({type:"soldItemsScanned",items:o,sellerName:S()})},2e3)):console.log('ℹ️ Not on sold items page. Use "View Sold Items" button to navigate.');let t;window.addEventListener("scroll",()=>{clearTimeout(t),t=setTimeout(()=>{y()},500)})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",b):b();
})()
