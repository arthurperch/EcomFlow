(function(){console.log("🔍 Competitor Research content script loaded on:",window.location.href);let P=!1,I=null;function B(e){if(!e)return 0;const o=[/(\d+(?:,\d+)*)\+?\s*sold/i,/sold:\s*(\d+(?:,\d+)*)/i,/(\d+(?:,\d+)*)\s*items?\s*sold/i,/Quantity\s*sold:\s*(\d+(?:,\d+)*)/i];for(const s of o){const t=e.match(s);if(t)return parseInt(t[1].replace(/,/g,""),10)}return 0}function H(e){if(!e)return 0;const o=[/(\d+(?:,\d+)*)\s*watchers?/i,/(\d+(?:,\d+)*)\s*watching/i,/(\d+(?:,\d+)*)\s*people?\s*watching/i];for(const s of o){const t=e.match(s);if(t)return parseInt(t[1].replace(/,/g,""),10)}return 0}function Y(e){var o;try{const s=[".su-styled-text.positive.default",".su-styled-text.positive",".su-styled-text",".positive.default",".positive",".POSITIVE",".s-item__title--tag",".s-item__purchase-options-with-icon",".s-item__detail--primary",".s-item__hotness",'span[class*="POSITIVE"]','span[class*="positive"]',".s-item__subtitle",".s-item__info",'span[style*="color"]'];let t="";for(const n of s){const a=e.querySelector(n);if(a){const l=((o=a.textContent)==null?void 0:o.trim())||"";if(console.log(`   🔍 Checking selector "${n}": "${l.substring(0,50)}..."`),l.toLowerCase().includes("sold")){t=l,console.log(`   ✅✅✅ FOUND! Selector "${n}" matched: "${t}"`);break}}}if(!t){console.log("   🔍 No selector matched, searching entire element text...");const n=e.textContent||"";let a=n.match(/Sold\s+[A-Za-z]+\s+\d+(?:,\s+\d{4})?/i);a||(a=n.match(/Sold[\s:]+([A-Za-z]{3,9})\s+(\d{1,2})(?:,?\s+(\d{4}))?/i)),a?(t=a[0],console.log(`   ✅ Found sold date in element text: "${t}"`)):console.log('   ❌ No "Sold" pattern found in element text')}if(!t)return console.log("   ❌ NO SOLD DATE FOUND for this item"),{};console.log(`   📅 Processing sold date text: "${t}"`);const r=t.match(/Sold\s+([A-Za-z]+)\s+(\d+)(?:,\s+(\d{4}))?/i);if(r){const n=r[1],a=parseInt(r[2]),l=r[3]?parseInt(r[3]):new Date().getFullYear(),c={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11}[n.toLowerCase().slice(0,3)];if(c!==void 0){const u=new Date(l,c,a),d=Math.floor((new Date().getTime()-u.getTime())/(1e3*60*60*24));return console.log(`✅ Parsed sold date: ${n} ${a}, ${l} (${d} days ago)`),{dateString:`${n} ${a}, ${l}`,timestamp:u.getTime(),daysAgo:Math.max(0,d)}}}const i=t.match(/(\d+)([dhw])\s*ago/i);if(i){const n=parseInt(i[1]),a=i[2].toLowerCase();let l=0;a==="d"?l=n:a==="h"?l=0:a==="w"&&(l=n*7);const m=new Date,c=new Date(m.getTime()-l*24*60*60*1e3);return console.log(`✅ Parsed relative sold date: ${n}${a} ago (${l} days ago)`),{dateString:`${n}${a} ago`,timestamp:c.getTime(),daysAgo:l}}}catch(s){console.error("Error extracting sold date:",s)}return{}}function j(e){return e===0?0:parseFloat((e/30).toFixed(2))}function G(e,o){try{const s=e.querySelector(".s-item__image-wrapper, .s-item__image-section");if(!s||s.querySelector(".ecomflow-sold-overlay"))return;const t=document.createElement("div");t.className="ecomflow-sold-overlay",t.style.cssText=`
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(40, 167, 69, 0.95);
            color: white;
            font-size: 32px;
            font-weight: bold;
            padding: 12px 24px;
            border-radius: 50%;
            width: 80px;
            height: 80px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
            pointer-events: none;
            animation: ecomflowPulse 0.5s ease-in-out;
        `,t.textContent=o.toString();const r=s;if(window.getComputedStyle(r).position==="static"&&(r.style.position="relative"),e.style.cssText+=`
            outline: 3px solid #2ecc40;
            outline-offset: 2px;
            background: rgba(46, 204, 64, 0.05);
            transition: all 0.3s ease;
        `,setTimeout(()=>{e.style.outline="",e.style.outlineOffset="",e.style.background=""},1e3),!document.getElementById("ecomflow-animations")){const i=document.createElement("style");i.id="ecomflow-animations",i.textContent=`
                @keyframes ecomflowPulse {
                    0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
                    50% { transform: translate(-50%, -50%) scale(1.1); }
                    100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                }
                @keyframes ecomflowScanHighlight {
                    0% { outline-color: #2ecc40; background: rgba(46, 204, 64, 0.2); }
                    100% { outline-color: #2ecc40; background: rgba(46, 204, 64, 0.05); }
                }
                .ecomflow-scan-progress {
                    position: fixed !important;
                    top: 50% !important;
                    left: 50% !important;
                    transform: translate(-50%, -50%) !important;
                    z-index: 999999 !important;
                    background: white !important;
                    padding: 40px 60px !important;
                    border-radius: 16px !important;
                    box-shadow: 0 12px 48px rgba(0,0,0,0.4) !important;
                    text-align: center !important;
                    min-width: 400px !important;
                    border: 3px solid #3498db !important;
                }
                .ecomflow-scan-progress .spinner {
                    width: 80px;
                    height: 80px;
                    border: 8px solid #f3f3f3;
                    border-top: 8px solid #3498db;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                    margin: 0 auto 25px;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `,document.head.appendChild(i)}r.appendChild(t)}catch(s){console.error("Error adding sold overlay:",s)}}function N(e,o,s){let t=document.getElementById("ecomflow-scan-progress");return t||(t=document.createElement("div"),t.id="ecomflow-scan-progress",t.className="ecomflow-scan-progress",document.body.appendChild(t)),t.innerHTML=`
        <div class="spinner"></div>
        <div style="font-size: 20px; font-weight: bold; color: #333; margin-bottom: 15px;">
            🔍 Scanning Products...
        </div>
        <div style="font-size: 48px; font-weight: bold; color: #28a745; margin-bottom: 10px; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            ${e}
        </div>
        <div style="font-size: 16px; color: #666; margin-bottom: 15px;">
            ✅ Products with sales found
        </div>
        <div style="font-size: 16px; color: #999; margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
            📊 Progress: ${o} / ${s} items scanned
        </div>
        <div style="font-size: 14px; color: #aaa; margin-top: 10px;">
            ${Math.round(o/s*100)}% Complete
        </div>
    `,t}function Q(){let e=document.getElementById("ecomflow-scan-progress");e||(e=document.createElement("div"),e.id="ecomflow-scan-progress",e.className="ecomflow-scan-progress",document.body.appendChild(e)),e.innerHTML=`
        <div class="spinner"></div>
        <div style="font-size: 22px; font-weight: bold; color: #333; margin-bottom: 15px;">
            🚀 Starting Scan...
        </div>
        <div style="font-size: 16px; color: #666;">
            Preparing to scan sold items
        </div>
    `}function Z(e){let o=document.getElementById("ecomflow-scan-progress");o||(o=document.createElement("div"),o.id="ecomflow-scan-progress",o.className="ecomflow-scan-progress",document.body.appendChild(o)),o.innerHTML=`
        <div style="font-size: 64px; margin-bottom: 20px;">✅</div>
        <div style="font-size: 24px; font-weight: bold; color: #28a745; margin-bottom: 15px;">
            Scan Complete!
        </div>
        <div style="font-size: 40px; font-weight: bold; color: #333; margin-bottom: 10px;">
            ${e}
        </div>
        <div style="font-size: 16px; color: #666; margin-bottom: 10px;">
            Unique products found
        </div>
        <div style="font-size: 14px; color: #999;">
            (Duplicates combined)
        </div>
    `}function M(){const e=document.getElementById("ecomflow-scan-progress");e&&e.remove()}function V(e,o){var s,t,r,i,n,a,l;try{console.log("🔍 Scanning item element:",e.className);const m=e.querySelector(".su-styled-text.primary.default, span.su-styled-text.primary, .s-item__title, h3.s-item__title"),c=((s=m==null?void 0:m.textContent)==null?void 0:s.trim())||"",u=e.querySelector(".s-card__price, span.su-styled-text.positive.bold, .s-item__price, span.s-item__price"),g=((t=u==null?void 0:u.textContent)==null?void 0:t.trim())||"0",d=e.querySelector(".s-card__image, img.s-card__image, .s-item__image-img, img.s-item__image-img"),S=(d==null?void 0:d.src)||(d==null?void 0:d.getAttribute("data-src"))||"",b=e.querySelector("a.su-link, a.s-item__link"),C=(b==null?void 0:b.href)||"";console.log(`   📝 Title: ${c.substring(0,60)}${c.length>60?"...":""}`),console.log(`   💵 Price: $${g}`),console.log(`   🖼️ Image: ${S?"Found":"NOT FOUND"}`),console.log(`   🔗 URL: ${C?"Found":"NOT FOUND"}`);const $=e.querySelector(".s-item__hotness, .s-item__quantity-sold, .vi-qty-purchases, .s-item__quantitySold");let h=((r=$==null?void 0:$.textContent)==null?void 0:r.trim())||"";if(!h||h===""){console.log("   🔍 No sold text in specific elements, searching entire element...");const w=e.textContent||"";console.log(`   📄 Element text (first 300 chars): "${w.substring(0,300)}..."`);let y=w.match(/(\d+\+?\s+sold)/i);y||(y=w.match(/(sold\s+[A-Za-z]+\s+\d+(?:,\s+\d{4})?)/i)),y||(y=w.match(/(sold[^\n]{0,30})/i)),y?(h=y[0],console.log(`   ✅ Found sold text in element content: "${h}"`)):(console.log("   ❌❌❌ NO SOLD TEXT FOUND AT ALL in element"),console.log(`   📄 Full element text: "${w}"`))}else console.log(`   ✅ Found sold text in specific element: "${h}"`);const p=B(h);console.log(`   📊 Extracted soldCount: ${p}`);const f=Y(e);console.log("   📅 Extracted soldDate:",f);const x=p>0?p:f.dateString?1:0;console.log(`   🎯 Effective sold count: ${x} (soldCount=${p}, hasDate=${!!f.dateString})`),x>0?console.log(`   ✅ FOUND SOLD ITEM: ${p>0?p+" items":"Yes"} ${f.dateString?`(Sold: ${f.dateString})`:""}`):console.log("   ❌ NO SOLD DATA - SKIPPING THIS ITEM");const _=e.querySelector(".s-item__watchcount, .vi-HBI-watchcount"),E=((i=_==null?void 0:_.textContent)==null?void 0:i.trim())||"",k=H(E),v=e.querySelector(".s-item__subtitle, .SECONDARY_INFO"),R=((n=v==null?void 0:v.textContent)==null?void 0:n.trim())||"Not specified",T=e.querySelector(".s-item__shipping, .s-item__freeXDays, .vi-acc-del-range"),z=((a=T==null?void 0:T.textContent)==null?void 0:a.trim())||"",D=e.querySelector(".s-item__location, .s-item__itemLocation"),q=((l=D==null?void 0:D.textContent)==null?void 0:l.trim().replace("From","").trim())||"";if(!c||!C)return null;const F=j(x);return x>0&&G(e,x),{title:c,price:g,soldCount:x,imageUrl:S,productUrl:C,sellerName:o,watcherCount:k,condition:R,shippingCost:z,itemLocation:q,dailySalesRate:F,soldDate:f.dateString,soldTimestamp:f.timestamp,daysAgo:f.daysAgo,recentlySold:p,lifetimeSold:p}}catch(m){return console.error("Error extracting product data:",m),null}}function W(e){const o=new Map;for(const t of e){const r=t.title.toLowerCase().replace(/[^a-z0-9\s]/g,"").replace(/\s+/g," ").trim();if(console.log(`🔍 Processing: "${t.title.substring(0,50)}..." → Key: "${r.substring(0,40)}..."`),o.has(r)){const i=o.get(r),n=(i.soldCount||0)+(t.soldCount||0);console.log(`   🔁 DUPLICATE! Combining quantities: ${i.soldCount} + ${t.soldCount} = ${n}`),i.soldCount=n,i.lifetimeSold=n,t.soldTimestamp&&(!i.soldTimestamp||t.soldTimestamp>i.soldTimestamp)&&(i.soldDate=t.soldDate,i.soldTimestamp=t.soldTimestamp,i.daysAgo=t.daysAgo,console.log(`   📅 Updated to more recent date: ${t.soldDate}`)),t.price<i.price&&(i.price=t.price,console.log(`   💰 Updated to lower price: $${t.price}`))}else console.log("   ✨ NEW product added to map"),o.set(r,{...t})}const s=Array.from(o.values());return s.sort((t,r)=>(r.soldCount||0)-(t.soldCount||0)),console.log(`
📊 DEDUPLICATION SUMMARY:`),console.log(`   Original items: ${e.length}`),console.log(`   Unique products: ${s.length}`),console.log(`   Duplicates removed: ${e.length-s.length}`),console.log(`   Total quantity: ${s.reduce((t,r)=>t+(r.soldCount||0),0)}`),console.log(`
🏆 TOP 5 PRODUCTS BY QUANTITY:`),s.slice(0,5).forEach((t,r)=>{console.log(`   ${r+1}. "${t.title.substring(0,50)}..." - Qty: ${t.soldCount} - $${t.price}`)}),s}async function L(){var m;console.log("📊 Scanning current page for products..."),Q();const e=[],o=await chrome.storage.local.get(["competitorScanSeller","competitorMinSales"]),s=o.competitorScanSeller||"Unknown",t=o.competitorMinSales||0,r=[".su-card-container__content",".su-card-container",".s-item",".srp-results .s-item",".b-list__items_nofooter .s-item","li.s-item"];let i=[];for(const c of r){const u=Array.from(document.querySelectorAll(c));if(u.length>0){i=u,console.log(`Found ${u.length} listings using selector: ${c}`);break}}if(i.length===0)return console.log("No product listings found on this page"),M(),e;let n=0;const a=i.length;console.log(`🔍 Starting to scan ${i.length} items...`),console.log(`📊 Filter settings: minSales=${t}, sellerName=${s}`);for(let c=0;c<i.length;c++){const u=i[c];console.log(`
========== ITEM ${c+1}/${a} ==========`),N(n,c+1,a),u.scrollIntoView({behavior:"smooth",block:"center"});const g=u;g.style.cssText+=`
            outline: 4px solid #2ecc40 !important;
            outline-offset: 4px !important;
            background: rgba(46, 204, 64, 0.15) !important;
            box-shadow: 0 0 20px rgba(46, 204, 64, 0.5) !important;
            transform: scale(1.02) !important;
            transition: all 0.3s ease !important;
            z-index: 9999 !important;
            position: relative !important;
        `;const d=V(u,s);setTimeout(()=>{g.style.outline="",g.style.outlineOffset="",g.style.background="",g.style.boxShadow="",g.style.transform=""},800),console.log("📦 Product extraction result:",d?{title:((m=d.title)==null?void 0:m.substring(0,50))+"...",soldCount:d.soldCount,soldDate:d.soldDate,daysAgo:d.daysAgo,price:d.price}:"NULL"),d?(console.log(`🔍 Checking filter: product.soldCount (${d.soldCount}) >= minSales (${t}) = ${d.soldCount>=t}`),d.soldCount>=t?(e.push(d),n++,console.log(`✅✅✅ ADDED TO RESULTS! Item #${n}:`,{title:d.title.substring(0,50)+"...",soldCount:d.soldCount,soldDate:d.soldDate||"No date found",daysAgo:d.daysAgo!==void 0?`${d.daysAgo} days`:"Unknown",price:d.price}),N(n,c+1,a)):console.log(`❌❌❌ FILTERED OUT: soldCount (${d.soldCount}) < minSales (${t})`)):console.log("❌ Product extraction returned NULL"),await new Promise(S=>setTimeout(S,50))}console.log(`📦 Extracted ${e.length} products with ${t}+ sales`),console.log(`📅 Products with dates: ${e.filter(c=>c.soldDate).length}/${e.length}`),console.log(`🔄 Deduplicating ${e.length} products...`);const l=W(e);return console.log(`✅ After deduplication: ${l.length} unique products`),console.log(`📊 Total quantity sold: ${l.reduce((c,u)=>c+(u.soldCount||0),0)}`),Z(l.length),setTimeout(()=>M(),2e3),l}function O(){const e=document.querySelector('a.pagination__next, a[aria-label*="Next"]');return!!e&&!e.classList.contains("disabled")}function K(){const e=document.querySelector('a.pagination__next, a[aria-label*="Next"]');return e&&!e.classList.contains("disabled")?(console.log("📄 Going to next page..."),e.click(),!0):!1}async function X(){const e=window.location.href;let o="";const s=e.match(/\/usr\/([^/?]+)/);s&&(o=s[1]);const t=e.match(/\/str\/([^/?]+)/);t&&(o=t[1]);const r=e.match(/[?&]_ssn=([^&]+)/);if(r&&(o=decodeURIComponent(r[1])),!o){alert("❌ Could not detect seller username from current page URL"),console.error("Could not extract seller name from URL:",e);return}console.log("🔍 Redirecting to SOLD items for seller:",o);const i=`https://www.ebay.com/sch/i.html?_ssn=${encodeURIComponent(o)}&LH_Complete=1&LH_Sold=1&_sop=13&rt=nc&_ipg=200`;await chrome.storage.local.set({competitorScanInProgress:!0,competitorScanSeller:o}),window.location.href=i}async function J(){var i;if(P){console.log("Scan already in progress");return}const e=window.location.href;if(!(e.includes("LH_Sold=1")||e.includes("LH_Complete=1"))){console.log("🔄 Redirecting to SOLD items filtered page...");let n="";if(n=new URLSearchParams(window.location.search).get("_ssn")||"",!n){const l=e.match(/\/usr\/([^\/\?]+)/),m=e.match(/\/str\/([^\/\?]+)/);n=((i=l||m)==null?void 0:i[1])||""}if(!n){const l=document.querySelector('a[href*="/usr/"], a[href*="/str/"]');if(l){const c=(l.getAttribute("href")||"").match(/\/(usr|str)\/([^\/\?]+)/);n=(c==null?void 0:c[2])||""}}if(n){const l=`https://www.ebay.com/sch/i.html?_ssn=${encodeURIComponent(n)}&LH_Complete=1&LH_Sold=1&_sop=13&rt=nc&_ipg=200`;console.log(`✅ Redirecting to: ${l}`),await chrome.storage.local.set({competitorScanInProgress:!0,competitorScanSeller:n}),window.location.href=l;return}else{console.error("❌ Could not extract seller name from URL"),alert("Could not find seller name. Please make sure you are on a seller store page.");return}}P=!0;const s=[];let t=0;const r=10;try{console.log("✅ On SOLD items page, starting scan...");const n=await L();s.push(...n),t++,chrome.runtime.sendMessage({type:"competitorScanProgress",progress:10,found:s.length});let a=O();for(;a&&t<r&&(await new Promise(c=>setTimeout(c,2e3)),!!K());){await new Promise(c=>setTimeout(c,3e3));const l=await L();s.push(...l),t++;const m=Math.min(90,10+t/r*80);chrome.runtime.sendMessage({type:"competitorScanProgress",progress:Math.round(m),found:s.length}),a=O()}console.log(`✅ Scan complete! Found ${s.length} products across ${t} pages`),chrome.runtime.sendMessage({type:"competitorScanResults",products:s,pageCount:t})}catch(n){console.error("Error during scan:",n),chrome.runtime.sendMessage({type:"competitorScanError",error:String(n)})}finally{P=!1,await chrome.storage.local.remove("competitorScanInProgress")}}function ee(){if(I||!U())return;const e=document.createElement("div");e.id="competitor-research-overlay",e.style.cssText=`
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        gap: 10px;
    `;const o=document.createElement("button");o.textContent="🔍 Scan Store",o.style.cssText=`
        background: #2ecc40;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 12px 24px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: background 0.2s;
    `,o.onmouseover=()=>o.style.background="#27ae60",o.onmouseout=()=>o.style.background="#2ecc40",o.onclick=()=>X();const s=document.createElement("button");s.textContent="✕",s.style.cssText=`
        background: #e74c3c;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `,s.onclick=()=>{e.remove(),I=null},e.appendChild(o),e.appendChild(s),document.body.appendChild(e),I=e,console.log("✅ Overlay buttons created")}function U(){const e=window.location.href;return e.includes("/usr/")||e.includes("/str/")||e.includes("/sch/")&&e.includes("/m.html")||e.includes("/sch/i.html")&&e.includes("_ssn=")}async function A(){console.log("🚀 Initializing Competitor Research..."),(await chrome.storage.local.get(["competitorScanInProgress"])).competitorScanInProgress&&(console.log("📊 Scan in progress, starting scan..."),setTimeout(()=>{J()},2e3)),U()&&setTimeout(ee,1e3)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",A):A();chrome.runtime.onMessage.addListener((e,o,s)=>{if(console.log("📨 Competitor Research received message:",e.type),e.type==="startCompetitorScraping"){const{username:t}=e;return console.log("�🚀🚀 ===== STARTING COMPETITOR SCRAPING ===== 🚀🚀🚀"),console.log("📍 Username:",t),console.log("📍 Current URL:",window.location.href),console.log("📍 Time:",new Date().toLocaleTimeString()),(async()=>{try{console.log("🔄 Calling scanCurrentPage()...");const r=await L();console.log(`✅✅✅ SCAN COMPLETE! Found ${r.length} products from ${t}`),chrome.runtime.sendMessage({type:"competitorScanResults",username:t,products:r,timestamp:Date.now()},i=>{console.log("📤 Results sent to background")}),chrome.storage.local.get(["competitorResults"],i=>{const a=[...i.competitorResults||[],...r];chrome.storage.local.set({competitorResults:a,lastCompetitorScan:{username:t,timestamp:Date.now(),productCount:r.length}})}),s({success:!0,productCount:r.length})}catch(r){console.error("❌ Scraping error:",r),s({success:!1,error:String(r)})}})(),!0}});
})()
