const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = 'http://loading.test';

(async () => {
  const browser = await chromium.launch({ headless: true,
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  try {
    async function pageFor({ mobile = false, reducedMotion = 'no-preference', broken = false } = {}) {
      const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 720 },
        hasTouch: mobile, isMobile: mobile, reducedMotion, serviceWorkers: 'block' });
      await page.addInitScript(() => {
        window.videoPlays = 0;
        HTMLMediaElement.prototype.play = function () { window.videoPlays++; return Promise.resolve(); };
        HTMLMediaElement.prototype.pause = function () {};
      });
      await page.route('**/*', route => {
        const pathname = new URL(route.request().url()).pathname;
        if (pathname === '/') return route.fulfill({ contentType: 'text/html', body:
          '<style>[hidden]{display:none!important}</style><body><script src="/game-loading.js"></script><script type="module" src="/dist/bundle.js"></script>' });
        if (pathname === '/game-loading.js') return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(__dirname, 'game-loading.js'), 'utf8') });
        if (pathname === '/dist/bundle.js') return broken ? route.abort('failed') : route.fulfill({ contentType: 'text/javascript', body: '' });
        return route.fulfill({ status: 404, body: '' }); // optional assets may fail
      });
      await page.goto(root);
      return page;
    }
    for (const mobile of [false, true]) {
      const page = await pageFor({ mobile });
      await page.evaluate(() => { gameLoading.show(60, 'Preparing world'); window.finished = false; gameLoading.complete().then(() => finished = true); });
      if (mobile) {
        await page.waitForFunction(() => document.querySelector('#loadingMessage').textContent.includes('Rotate'));
        assert.equal(await page.evaluate(() => finished), false);
        await page.setViewportSize({ width: 844, height: 390 });
      }
      await page.waitForFunction(() => finished);
      assert.equal(await page.locator('#gameLoading').isHidden(), true);
      assert.equal(await page.locator('#loadingPercent').textContent(), '100%');
      await page.close();
    }
    const failed = await pageFor({ broken: true });
    await failed.waitForFunction(() => !document.querySelector('#loadingRetry').hidden);
    assert.match(await failed.locator('#loadingMessage').textContent(), /game files could not download/);
    await failed.evaluate(() => gameLoading.complete());
    assert.equal(await failed.locator('#gameLoading').isVisible(), true);
    // Retry performs a real navigation and a recovered bundle starts cleanly.
    await failed.route('**/dist/bundle.js', route => route.fulfill({ contentType: 'text/javascript', body: '' }));
    await Promise.all([failed.waitForNavigation(), failed.locator('#loadingRetry').click()]);
    assert.equal(await failed.locator('#loadingRetry').isHidden(), true);
    await failed.evaluate(() => gameLoading.complete());
    assert.equal(await failed.locator('#gameLoading').isHidden(), true);
    await failed.close();

    const rotating = await pageFor({ mobile: true });
    await rotating.evaluate(() => { window.finished = false; gameLoading.complete().then(() => finished = true); });
    await rotating.waitForFunction(() => document.querySelector('#loadingMessage').textContent.includes('Rotate'));
    await rotating.evaluate(() => gameLoading.fail('Connection lost'));
    await rotating.waitForFunction(() => finished);
    await rotating.setViewportSize({ width: 844, height: 390 });
    assert.match(await rotating.locator('#loadingMessage').textContent(), /Connection lost/);
    assert.equal(await rotating.locator('#loadingRetry').isVisible(), true);
    await rotating.close();

    const reduced = await pageFor({ reducedMotion: 'reduce' });
    assert.equal(await reduced.evaluate(() => videoPlays), 0);
    assert.equal(await reduced.locator('video').getAttribute('autoplay'), null);
    await reduced.emulateMedia({ reducedMotion: 'no-preference' });
    await reduced.waitForFunction(() => videoPlays > 0);
    await reduced.evaluate(() => gameLoading.hide());
    const plays = await reduced.evaluate(() => videoPlays);
    await reduced.emulateMedia({ reducedMotion: 'reduce' });
    await reduced.emulateMedia({ reducedMotion: 'no-preference' });
    assert.equal(await reduced.evaluate(() => videoPlays), plays);
    await reduced.close();
    console.log('PASS: desktop/mobile loading, optional asset failures, bundle retry, failure during rotation, reduced-motion and hidden video');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
