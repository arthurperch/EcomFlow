console.log("📦 eBay Order Extractor loaded");function d(){const t=window.location.href;return t.includes("ebay.com/sh/ord")||t.includes("ebay.com/mye/myebay/purchase")||t.includes("ebay.com/sh/orders")||t.includes("ebay.com/mye/myebay/summary")}function l(){try{console.log("🔍 Extracting order information...");const t=u();if(!t)return console.log("❌ No order ID found"),null;const o={orderId:t,orderDate:m(),itemTitle:f(),itemNumber:p(),quantity:x(),price:y(),shippingCost:g(),totalPaid:b(),buyer:C(),status:h()};return console.log("✅ Order extracted:",o),o}catch(t){return console.error("❌ Order extraction failed:",t),null}}function u(){const t=['[data-test-id="ORDER_ID"]',".order-id",'[class*="orderId"]','[class*="order-number"]'];for(const s of t){const i=document.querySelector(s);if(i!=null&&i.textContent)return i.textContent.trim().replace(/Order #:?/i,"").trim()}const o=window.location.href.match(/orderid[=\/](\d+-\d+)/i);if(o)return o[1];const n=(document.body.textContent||"").match(/Order #?\s*(\d+-\d+)/i);return n?n[1]:""}function m(){const t=['[data-test-id="ORDER_DATE"]',".order-date",'[class*="orderDate"]','[class*="purchase-date"]'];for(const o of t){const e=document.querySelector(o);if(e!=null&&e.textContent)return e.textContent.trim()}return""}function f(){const t=['[data-test-id="ITEM_TITLE"]',".item-title",'[class*="itemTitle"]',"h1.product-title",".item-name"];for(const o of t){const e=document.querySelector(o);if(e!=null&&e.textContent)return e.textContent.trim()}return""}function p(){const t=['[data-test-id="ITEM_NUMBER"]',".item-number",'[class*="itemNumber"]'];for(const e of t){const n=document.querySelector(e);if(n!=null&&n.textContent)return n.textContent.trim().replace(/Item #:?/i,"").trim()}const o=window.location.href.match(/item[=\/](\d+)/i);return o?o[1]:""}function x(){const t=['[data-test-id="QUANTITY"]',".quantity",'[class*="qty"]'];for(const o of t){const e=document.querySelector(o);if(e!=null&&e.textContent){const n=e.textContent.match(/\d+/);if(n)return parseInt(n[0])}}return 1}function y(){const t=['[data-test-id="ITEM_PRICE"]',".item-price",'[class*="itemPrice"]',".price"];for(const o of t){const e=document.querySelector(o);if(e!=null&&e.textContent)return a(e.textContent)}return 0}function g(){const t=['[data-test-id="SHIPPING_COST"]',".shipping-cost",'[class*="shippingCost"]','[class*="shipping-price"]'];for(const o of t){const e=document.querySelector(o);if(e!=null&&e.textContent)return a(e.textContent)}return 0}function b(){const t=['[data-test-id="TOTAL_PAID"]',".total-paid",'[class*="totalPaid"]',".order-total"];for(const o of t){const e=document.querySelector(o);if(e!=null&&e.textContent)return a(e.textContent)}return 0}function h(){const t=['[data-test-id="ORDER_STATUS"]',".order-status",'[class*="orderStatus"]',".status"];for(const o of t){const e=document.querySelector(o);if(e!=null&&e.textContent)return e.textContent.trim()}return"Unknown"}function C(){const t={name:"",address:{street:"",city:"",state:"",zipCode:"",country:""}},o=['[data-test-id="BUYER_NAME"]',".buyer-name",'[class*="buyerName"]','[class*="shipping-name"]',".ship-to-name"];for(const i of o){const r=document.querySelector(i);if(r!=null&&r.textContent){t.name=r.textContent.trim();break}}const e=['[data-test-id="SHIPPING_ADDRESS"]',".shipping-address",'[class*="shippingAddress"]',".ship-to-address",".delivery-address"];for(const i of e){const r=document.querySelector(i);if(r!=null&&r.textContent){S(r.textContent,t.address);break}}const n=['[data-test-id="BUYER_PHONE"]',".buyer-phone",'[class*="buyerPhone"]','[class*="phone-number"]'];for(const i of n){const r=document.querySelector(i);if(r!=null&&r.textContent){t.phone=r.textContent.trim().replace(/Phone:?/i,"").trim();break}}const s=['[data-test-id="BUYER_EMAIL"]',".buyer-email",'[class*="buyerEmail"]'];for(const i of s){const r=document.querySelector(i);if(r!=null&&r.textContent){t.email=r.textContent.trim();break}}return t}function S(t,o){const e=t.split(`
`).map(n=>n.trim()).filter(n=>n);if(e.length>=3){o.street=e[0];const s=e[1].match(/^(.+?),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);s&&(o.city=s[1],o.state=s[2],o.zipCode=s[3]),o.country=e[2]||"United States"}}function a(t){const o=t.match(/\$?([\d,]+\.?\d*)/);return o?parseFloat(o[1].replace(/,/g,"")):0}function I(t){const o=document.getElementById("ebay-fulfillment-overlay");o&&o.remove();const e=document.createElement("div");e.id="ebay-fulfillment-overlay",e.style.cssText=`
        position: fixed;
        top: 120px;
        right: 20px;
        z-index: 999999;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        min-width: 300px;
        max-width: 400px;
        font-family: Arial, sans-serif;
        animation: slideIn 0.3s ease-out;
    `,e.innerHTML=`
        <style>
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        </style>
        <h3 style="margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid rgba(255,255,255,0.3); padding-bottom: 10px;">
            📦 Order Fulfillment
        </h3>
        <div style="margin-bottom: 15px; font-size: 13px; line-height: 1.6;">
            <div><strong>Order:</strong> ${t.orderId}</div>
            <div><strong>Item:</strong> ${t.itemTitle.substring(0,50)}...</div>
            <div><strong>Buyer:</strong> ${t.buyer.name}</div>
            <div><strong>Ship To:</strong> ${t.buyer.address.city}, ${t.buyer.address.state}</div>
        </div>
        <button id="fulfill-on-amazon-btn" style="
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            transition: all 0.2s;
            margin-bottom: 10px;
        ">🚀 Fulfill on Amazon</button>
        <button id="copy-address-btn" style="
            width: 100%;
            padding: 10px;
            background: rgba(255,255,255,0.2);
            color: white;
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: 8px;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s;
        ">📋 Copy Address</button>
    `,document.body.appendChild(e);const n=document.getElementById("fulfill-on-amazon-btn");n==null||n.addEventListener("click",()=>{T(t)});const s=document.getElementById("copy-address-btn");s==null||s.addEventListener("click",()=>{w(t.buyer)}),n==null||n.addEventListener("mouseover",()=>{n.style.transform="translateY(-2px)",n.style.boxShadow="0 6px 20px rgba(0,0,0,0.3)"}),n==null||n.addEventListener("mouseout",()=>{n.style.transform="translateY(0)",n.style.boxShadow="0 4px 15px rgba(0,0,0,0.2)"})}async function T(t){console.log("🚀 Starting fulfillment for order:",t.orderId),await chrome.storage.local.set({currentFulfillmentOrder:t,fulfillmentTimestamp:Date.now()}),chrome.runtime.sendMessage({type:"startFulfillment",orderData:t},e=>{e!=null&&e.success&&(console.log("✅ Fulfillment workflow started"),chrome.runtime.sendMessage({type:"showNotification",title:"Fulfillment Started",message:`Searching Amazon for: ${t.itemTitle.substring(0,50)}...`}))});const o=`https://www.amazon.com/s?k=${encodeURIComponent(t.itemTitle)}`;window.open(o,"_blank")}function w(t){const o=`${t.name}
${t.address.street}
${t.address.city}, ${t.address.state} ${t.address.zipCode}
${t.address.country}
${t.phone?"Phone: "+t.phone:""}`;navigator.clipboard.writeText(o).then(()=>{console.log("✅ Address copied to clipboard");const e=document.getElementById("copy-address-btn");if(e){const n=e.textContent;e.textContent="✅ Copied!",setTimeout(()=>{e.textContent=n},2e3)}})}function c(){if(!d()){console.log("Not an order page, skipping overlay");return}console.log("✅ Order page detected"),setTimeout(()=>{const t=l();t&&I(t)},2e3)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",c):c();export{C as extractBuyerInfo,l as extractOrderInfo,d as isOrderPage};
