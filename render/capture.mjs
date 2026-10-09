// Render frames [from,to) to out dir as JPEG. usage: node capture.mjs <outDir> <fromFrame> <toFrame> [step] [port]
import { chromium } from 'playwright';
import fs from 'fs';
import http from 'http';
import path from 'path';
const [outDir, from = '0', to = '1200', step = '1', portArg] = process.argv.slice(2);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (err, data) => { if (err) { console.log('404', req.url); res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); res.end(data); });
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:${port}/render/index.html`);
await page.waitForFunction(() => window.READY || window.ERR, null, { timeout: 120000 });
const err = await page.evaluate(() => window.ERR); if (err) { console.error(err); process.exit(1); }
const fps = 30; const t0 = Date.now();
const frames = process.env.FRAMES ? process.env.FRAMES.split(',').map(Number) : (() => { const a = []; for (let f = +from; f < +to; f += +step) a.push(f); return a; })();
for (const f of frames) {
  const t = f / fps;
  await page.evaluate(t => window.renderAt(t), t);
  const data = await page.evaluate(() => window.grab(0.95));
  fs.writeFileSync(path.join(outDir, `f${String(f).padStart(5, '0')}.jpg`), Buffer.from(data.split(',')[1], 'base64'));
  if ((f - +from) % (30 * +step) === 0) console.log(`frame ${f} t=${t.toFixed(2)} avg ${((Date.now() - t0) / ((f - +from) / +step + 1) / 1000).toFixed(2)}s/frame`);
}
await browser.close(); server.close();
