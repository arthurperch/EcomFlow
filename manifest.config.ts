import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
    manifest_version: 3,
    name: "EcomFlow",
    version: "0.0.1",
    action: {
        default_popup: "index.html"
    },
    background: {
        service_worker: "background.js"
    },
    permissions: ["storage", "alarms", "tabs", "scripting"],
    host_permissions: [
        "http://localhost:3000/*", 
        "http://localhost:8080/*",
        "https://www.ebay.com/*",
        "https://www.amazon.com/*"
    ],
    content_scripts: [
        {
            matches: ["https://www.ebay.com/*"],
            js: ["src/content/ebay-automation.ts"],
            run_at: "document_end"
        }
    ]
});
