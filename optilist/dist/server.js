"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const puppeteer_1 = __importDefault(require("puppeteer"));
const app = (0, express_1.default)();
app.use(express_1.default.json({ limit: '20mb' }));
let browser;
async function ensureBrowser() {
    if (!browser)
        browser = await puppeteer_1.default.launch({ headless: false, defaultViewport: null });
    return browser;
}
async function downloadToTmp(url) {
    const r = await (0, node_fetch_1.default)(url);
    if (!r.ok)
        throw new Error('download failed');
    const buf = Buffer.from(await r.arrayBuffer());
    const f = path.join(os.tmpdir(), 'optilist-' + Date.now() + Math.random().toString(36).slice(2) + path.extname(new URL(url).pathname));
    await fs.writeFile(f, buf);
    return f;
}
// Endpoint just for uploading images to the currently open eBay listing tab
app.post('/create-listing/images', async (req, res) => {
    const { imageUrls } = req.body;
    const b = await ensureBrowser();
    const pages = await b.pages();
    const ebay = pages.find(p => p.url().includes('ebay.com'));
    if (!ebay)
        return res.status(400).json({ ok: false, error: 'no ebay page' });
    // Download images to temp files
    const files = await Promise.all(imageUrls.slice(0, 12).map(downloadToTmp));
    // Try to find file input and upload
    const input = await ebay.$('input[type=file]');
    if (!input) {
        return res.status(400).json({ ok: false, error: 'no file input' });
    }
    await input.uploadFile(...files);
    res.json({ ok: true, count: files.length });
});
app.listen(3449, () => console.log('Opti‑List agent on http://localhost:3449'));
//# sourceMappingURL=server.js.map