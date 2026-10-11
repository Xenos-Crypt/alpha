const { chromium } = require('playwright');

async function run(url, label, viewport) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push('console.error: ' + msg.text()); });
  await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(6000);
  console.log(`\n=== ${label} (${url}) ===`);
  console.log('title:', await page.title());
  console.log('errors (' + errors.length + '):');
  for (const e of errors.slice(0, 20)) console.log(' -', e);
  await browser.close();
  return errors.length;
}

(async () => {
  const base = process.argv[2] || 'http://localhost:8080';
  let fail = 0;
  fail += await run(base + '/index.html#test-systems', 'desktop #test-systems', { width: 1280, height: 800 });
  fail += await run(base + '/index.html#test', 'desktop #test (plain boot)', { width: 1280, height: 800 });
  process.exit(fail > 0 ? 1 : 0);
})();
