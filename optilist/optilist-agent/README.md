Run a local agent to handle image uploads & (optionally) full listing creation.

1) npm i express node-fetch puppeteer
2) node server.js (or ts-node server.ts)
3) Keep an eBay listing page open; the extension calls POST /create-listing/images with image URLs

Why needed? Browsers block programmatic file selection in content scripts. Puppeteer can upload files via the DevTools protocol, staying fully local.
