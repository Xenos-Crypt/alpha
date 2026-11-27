// Actual production bundle, real WebGL, no account changes or world API writes.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({ headless: true,
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const mobile = process.env.TEST_MOBILE === '1';
    const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 720 },
      isMobile: mobile, hasTouch: mobile, serviceWorkers: 'block', reducedMotion: 'reduce' });
    const errors = [], failedRequests = [];
    page.on('pageerror', e => { errors.push(e.message); console.log('Page error:', e.message); });
    page.on('response', r => { if (r.url().startsWith('http://localhost:8080/') && r.status() >= 400) failedRequests.push({ url: r.url(), status: r.status() }); });
    await page.addInitScript(() => {
      window.startupLongTasks = [];
      new PerformanceObserver(list => { for (const entry of list.getEntries()) startupLongTasks.push(entry.duration); }).observe({ type: 'longtask', buffered: true });
    });
    const start = Date.now();
    await page.goto(process.env.TEST_URL || 'http://localhost:8080/?debug', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => document.querySelector('#auth')?.style.display !== 'none' && document.querySelector('#gameLoading')?.hidden, null, { timeout: 120000 });
    const elapsed = Date.now() - start;
    await page.locator('#authGuest').click();
    await page.waitForFunction(() => document.querySelector('#menu')?.style.display === 'block');
    const reputationCheck = await page.evaluate(() => {
      const r = window.__aw.diagnostics.reputation;
      const initial = r.score;
      r.record('theft');
      const negative = r.standing();
      const yatan = r.standing('yatan');
      const saved = Object.keys(localStorage).filter(k => k.startsWith('alignment:')).some(k => JSON.parse(localStorage.getItem(k)).reputation === -15);
      for(let i=0;i<15;i++)r.record('kindness');
      return {initial, negative:negative.title, yatan:yatan.relationship, saved, restored:r.score};
    });
    assert.deepEqual(reputationCheck, {initial:0, negative:'Unfavorable', yatan:'Friend', saved:true, restored:0});
    const metrics = await page.evaluate(() => ({ longTasks: startupLongTasks.length,
      longestTaskMs: Math.max(0, ...startupLongTasks),
      meshes: window.__aw?.renderer.info.memory.geometries,
      videoPaused: document.querySelector('#gameLoading video').paused,
      overflow: document.documentElement.scrollWidth > innerWidth }));
    fs.mkdirSync('test-results', { recursive: true });
    const reportName = mobile ? 'website-startup-mobile' : 'website-startup';
    await page.screenshot({ path: `test-results/${reportName}.png` });
    const report = { elapsedMs: elapsed, mobile, guestMenu: true, ...metrics, errors, failedRequests, note: 'Local software-rendered startup; not a player-device FPS claim' };
    fs.writeFileSync(`test-results/${reportName}.json`, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
    assert.deepEqual(errors, []);
    assert.deepEqual(failedRequests, []);
    assert.equal(metrics.videoPaused, true);
    assert.equal(metrics.overflow, false);
    assert.equal(metrics.meshes, 0, 'World must not render behind loading, sign-in or guest menu');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
