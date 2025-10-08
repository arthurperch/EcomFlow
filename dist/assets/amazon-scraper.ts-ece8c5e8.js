(function(){console.log("Amazon scraping script loaded on:",window.location.href);function b(){const t=window.location.href.match(/\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})|\/ASIN\/([A-Z0-9]{10})/i);return t?t[1]||t[2]||t[3]:null}async function y(){var o,t,i,r;console.log("Starting Amazon product scrape...");try{let e="";const n=document.querySelector("#productTitle");n&&(e=((o=n.textContent)==null?void 0:o.trim())||"",console.log("✓ Title scraped:",e.substring(0,50)+"..."));let c="";const l=document.querySelector(".a-price-whole"),d=document.querySelector(".a-price-fraction");l&&(c=((t=l.textContent)==null?void 0:t.trim())||"",d&&(c+=((i=d.textContent)==null?void 0:i.trim())||""),c=c.replace(/[^0-9.]/g,""),console.log("✓ Price scraped:",c));let p="";const h=document.querySelector("#bylineInfo");h&&(p=((r=h.textContent)==null?void 0:r.replace(/^(Visit the|Brand:)\s*/i,"").trim())||"",console.log("✓ Brand scraped:",p));const u=[];document.querySelectorAll("#feature-bullets ul li span.a-list-item").forEach(g=>{var f;const s=(f=g.textContent)==null?void 0:f.trim();s&&s.length>0&&u.push(s)}),console.log("✓ Features scraped:",u.length);const m=[];document.querySelectorAll("#altImages img, #main-image, #landingImage").forEach(g=>{const s=g.getAttribute("src")||g.getAttribute("data-old-hires");if(s&&!s.includes("data:image")&&!m.includes(s)){const f=s.replace(/\._.*_\./,"._AC_SL1500_.");m.push(f)}}),console.log("✓ Images scraped:",m.length);let a="";e&&(a+=`${e}

`),p&&(a+=`Brand: ${p}

`),u.length>0&&(a+=`Features:
`,u.forEach(g=>{a+=`• ${g}
`}),a+=`
`);const w=b()||"";return a+=`Amazon ASIN: ${w}
`,a+=`Source: ${window.location.href}`,{title:e,price:c,brand:p,features:u,images:m,description:a,asin:w,amazonUrl:window.location.href}}catch(e){return console.error("Error scraping Amazon product:",e),null}}async function A(o,t,i,r){console.log("📦 Preparing to open eBay with scraped title:",o.title),console.log("🔑 Using ASIN as key:",o.asin);const e={...o,index:t,total:i,listType:r,scrapingComplete:!0,searchTitle:o.title,timestamp:Date.now(),status:"scraped"};await chrome.storage.local.set({[`scrapedProduct_${o.asin}`]:e,[`scrapedProduct_${t}`]:e}),console.log("✅ Product data saved with ASIN key:",`scrapedProduct_${o.asin}`),console.log("📊 Title:",o.title.substring(0,50)+"..."),await new Promise(n=>setTimeout(n,500)),chrome.runtime.sendMessage({type:"amazonDataScraped",asin:o.asin,data:e,action:"openEbayAndCloseAmazon"},n=>{console.log("✅ Message sent to background script"),n&&n.success&&console.log("🌐 eBay tab will be opened by background script")}),console.log("✅ Scraping complete, waiting for background script to manage tabs")}(async function(){await new Promise(t=>setTimeout(t,2e3)),chrome.storage.local.get(["automationInProgress","automationStep"],async t=>{if(!t.automationInProgress||t.automationStep!=="scrape_amazon"){console.log("No Amazon scraping needed");return}console.log("Automation in progress, checking for product data...");const i=window.location.href;chrome.storage.local.get(null,async r=>{for(let e=0;e<100;e++){const n=`pendingProduct_${e}`;if(r[n]&&r[n].amazonUrl===i&&!r[n].scrapingComplete){console.log(`Found product at index ${e}, starting scrape...`);const c=r[n],l=await y();if(l){console.log("✓ Scraping complete!");const d=document.createElement("div");d.style.cssText=`
              position: fixed;
              top: 20px;
              right: 20px;
              background: #28a745;
              color: white;
              padding: 15px 25px;
              border-radius: 8px;
              font-size: 16px;
              font-weight: bold;
              z-index: 999999;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            `,d.textContent=`✓ Scraped: ${l.title.substring(0,40)}...`,document.body.appendChild(d),await A(l,e,c.total,c.listType)}else console.error("Failed to scrape product data");break}}})})})();
})()
