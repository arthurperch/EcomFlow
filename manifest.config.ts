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
    permissions: ["storage", "alarms"],
    host_permissions: ["http://localhost:8080/*"]
});
