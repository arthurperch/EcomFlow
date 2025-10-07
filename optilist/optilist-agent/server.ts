import express from 'express';
import fetch from 'node-fetch';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import puppeteer from 'puppeteer';

const app = express();
app.use(express.json({ limit: '20mb' }));

let browser: puppeteer.Browser | undefined;
async function ensureBrowser(){
  if(!browser) browser = await puppeteer.launch({ headless: false, defaultViewport: null });
  return browser;
}

async function downloadToTmp(url: string){
  const r = await fetch(url);
  if(!r.ok) throw new Error('download failed');
  const buf = Buffer.from(await r.arrayBuffer());
  const f = path.join(os.tmpdir(), 'optilist-'+Date.now()+Math.random().toString(36).slice(2)+path.extname(new URL(url).pathname));
  await fs.writeFile(f, buf);
  return f;
}

// Endpoint just for uploading images to the currently open eBay listing tab
app.post('/create-listing/images', async (req: express.Request, res: express.Response) => {
  const { imageUrls } = req.body as { imageUrls: string[] };
  const b = await ensureBrowser();
  const pages = await b.pages();
  const ebay = pages.find(p => p.url().includes('ebay.com'));
  if(!ebay) return res.status(400).json({ ok:false, error:'no ebay page' });

  // Download images to temp files
  const files = await Promise.all(imageUrls.slice(0,12).map(downloadToTmp));

  // Try to find file input and upload
  const input = await ebay.$('input[type=file]');
  if(!input){ return res.status(400).json({ ok:false, error:'no file input' }); }
  await (input as any).uploadFile(...files);

  res.json({ ok:true, count: files.length });
});

app.listen(3449, ()=> console.log('Opti‑List agent on http://localhost:3449'));
