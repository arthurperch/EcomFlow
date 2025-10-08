import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
    manifest_version: 3,
    name: "EcomFlow",
    version: "0.0.1",
    action: {
        default_popup: "index.html"
    },
    background: {
        service_worker: "src/background-service.ts"
    },
    permissions: ["storage", "alarms", "tabs", "scripting"],
    host_permissions: [
        "http://localhost:3000/*",
        "http://localhost:8080/*",
        "https://www.ebay.com/*",
        "https://www.amazon.com/*"
    ],
    content_scripts: [
        // COMPETITOR RESEARCH - Must be FIRST so it gets priority on /sch/ pages
        {
            matches: [
                "https://www.ebay.com/usr/*",
                "https://www.ebay.com/str/*",
                "https://www.ebay.com/sch/*/m.html*",
                "https://www.ebay.com/sch/i.html*"  // Sold items search pages!
            ],
            js: ["src/content/competitor-research.ts"],
            run_at: "document_end"
        },
        // GENERAL EBAY AUTOMATION - Exclude /sch/ pages to avoid conflicts
        {
            matches: [
                "https://www.ebay.com/itm/*",
                "https://www.ebay.com/b/*",
                "https://www.ebay.com/p/*",
                "https://www.ebay.com/deals/*",
                "https://www.ebay.com/myb/*",
                "https://www.ebay.com/sh/*"
            ],
            js: ["src/content/automation-commands.ts", "src/content/ebay-automation.ts", "src/content/ebay-sold-items-scanner.ts", "src/content/ebay-order-extractor.ts", "src/content/ebay-image-search.ts"],
            run_at: "document_end"
        },
        // AMAZON
        {
            matches: ["https://www.amazon.com/*"],
            js: ["src/content/automation-commands.ts", "src/content/amazon-scraper.ts", "src/content/amazon-product-overlay.ts"],
            run_at: "document_end"
        }
    ]
});
