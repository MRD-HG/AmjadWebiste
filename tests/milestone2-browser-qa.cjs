const fs = require('fs');

function loadPlaywright() {
  const candidates = [
    process.env.PLAYWRIGHT_CORE_PATH,
    'playwright',
    'playwright-core',
    'M:/Saas_Mobile/mobile/E-learninng-SASS-master/frontend/node_modules/playwright-core'
  ].filter(Boolean);
  for (const candidate of candidates) {
    try { return require(candidate); } catch (error) { /* Try the next installed copy. */ }
  }
  throw new Error('Playwright is unavailable. Set PLAYWRIGHT_CORE_PATH to an installed playwright-core module.');
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
  ].filter(Boolean);
  const executable = candidates.find((candidate) => fs.existsSync(candidate));
  if (!executable) throw new Error('No installed Chromium-family browser found. Set CHROME_PATH.');
  return executable;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const { chromium } = loadPlaywright();
const baseUrl = (process.env.AMJAD_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'landscape', width: 1024, height: 768 },
  { name: 'desktop', width: 1440, height: 900 }
];
const languages = ['ar', 'en', 'fr'];

async function collectPageErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  return errors;
}

async function switchLanguage(page, language) {
  await page.locator(`.lang-btn[data-lang="${language}"]`).first().click();
  await page.waitForFunction((expected) => document.documentElement.lang === expected, language);
  assert(await page.locator('html').getAttribute('lang') === language, `Language did not switch to ${language}`);
  assert(await page.locator('html').getAttribute('dir') === (language === 'ar' ? 'rtl' : 'ltr'), `Direction is wrong for ${language}`);
}

async function testPrograms(page, viewportName) {
  const errors = await collectPageErrors(page);
  await page.goto(`${baseUrl}/programs.html#programs-structure`, { waitUntil: 'domcontentloaded' });
  await page.locator('#programs-structure').waitFor();
  assert(await page.locator('#education-projects .project-card').count() === 5, 'Educational project count changed');
  await page.locator('#social-family-tab').click();
  assert(await page.locator('#social-projects:not([hidden]) .project-card').count() === 6, 'Social project count changed');
  await page.locator('#social-family-tab').press('ArrowLeft');
  assert(await page.locator('#education-family-tab').getAttribute('aria-selected') === 'true', 'Program tabs are not keyboard operable');

  for (const language of languages) {
    await switchLanguage(page, language);
    await page.locator('#social-family-tab').click();
    assert(await page.locator('#social-projects:not([hidden])').isVisible(), `Program switching failed in ${language}`);
  }

  for (const id of ['academy', 'school', 'warmth', 'iftar', 'zakat']) {
    await page.evaluate((detailId) => { window.location.hash = `${detailId}-detail`; }, id);
    await page.locator(`#${id}-detail:not(.hidden)`).waitFor();
  }
  await page.locator('#zakat-detail .program-detail__back').click();
  assert(await page.locator('#zakat-detail').isHidden(), 'Detail back-navigation did not close the detail');

  await page.locator('#smart-eco-school').scrollIntoViewIfNeeded();
  await Promise.race([
    page.locator('#eco-school-visual.is-three-ready').waitFor({ timeout: 15000 }),
    page.locator('#eco-school-fallback').waitFor({ state: 'visible', timeout: 15000 })
  ]);
  for (const pillar of ['green', 'digital', 'clubs', 'community']) {
    await page.locator(`[data-eco-pillar="${pillar}"]`).click();
    assert(await page.locator(`[data-eco-panel="${pillar}"]`).isVisible(), `Eco-School pillar ${pillar} did not disclose its HTML content`);
    assert(await page.locator(`[data-eco-hotspot="${pillar}"]`).getAttribute('aria-pressed') === 'true', `Eco-School hotspot ${pillar} did not synchronize`);
  }
  await page.locator('[data-eco-hotspot="digital"]').click();
  assert(await page.locator('#eco-digital-tab').getAttribute('aria-selected') === 'true', 'Eco-School map hotspot did not control the explanatory panel');
  assert((await page.locator('#eco-visual-active-title').textContent()).trim().length > 0, 'Eco-School active area is not identified');
  assert(await page.locator('#eco-school-canvas').evaluate((element) => getComputedStyle(element).pointerEvents) === 'none', 'Eco-School canvas blocks touch input');
  assert(!await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), `Programs overflow at ${viewportName}`);
  assert(errors.length === 0, `Programs console errors at ${viewportName}: ${errors.join(' | ')}`);
}

async function testIslamicTools(page, viewportName) {
  const errors = await collectPageErrors(page);
  const prayerRequests = [];
  page.on('request', (request) => { if (request.url().includes('api.aladhan.com')) prayerRequests.push(request.url()); });
  await page.goto(`${baseUrl}/index.html#islamic-tools`, { waitUntil: 'domcontentloaded' });
  assert(await page.locator('.islamic-gateway').count() === 1, 'Compact Islamic tools gateway is missing');
  assert(await page.evaluate(() => {
    const gateway = document.querySelector('.islamic-gateway');
    const programs = document.querySelector('.programs-bg');
    const tools = document.querySelector('#islamic-tools');
    const gallery = document.querySelector('.gallery-image').closest('section');
    return gateway.compareDocumentPosition(programs) & Node.DOCUMENT_POSITION_FOLLOWING
      && gallery.compareDocumentPosition(tools) & Node.DOCUMENT_POSITION_FOLLOWING;
  }), 'Islamic tools were not moved below the homepage content');
  await page.locator('#pt-content:not([hidden])').waitFor({ timeout: 30000 });
  assert(await page.locator('#pt-grid .prayer-time').count() === 5, 'Prayer dashboard must show five obligatory prayers');
  assert(await page.locator('#pt-sunrise').isVisible(), 'Sunrise must be separate and visible');
  assert(prayerRequests.length >= 2 && prayerRequests.every((url) => url.includes('method=21')), 'Prayer requests must use Morocco method 21');

  for (const language of languages) {
    await switchLanguage(page, language);
    assert(await page.locator('#pt-grid .prayer-time').count() === 5, `Prayer tiles broke in ${language}`);
    await page.locator('#z-assets').fill('100000');
    await page.locator('#z-debts').fill('10000');
    await page.locator('#z-price').fill('900');
    await page.locator('#z-compute').click();
    assert(await page.locator('#z-result:not([hidden])').isVisible(), `Zakat result missing in ${language}`);
  }

  await page.locator('#z-assets').fill('');
  await page.locator('#z-debts').fill('');
  await page.locator('#z-price').fill('');
  await page.locator('#z-compute').click();
  assert(await page.locator('#zakat-form [aria-invalid="true"]').count() === 3, 'Missing Zakat inputs were not rejected');

  const arithmetic = await page.evaluate(() => ({
    gold: window.AmjadIslamicToolsTest.calculateEstimate(100000, 10000, 900, 'gold'),
    silver: window.AmjadIslamicToolsTest.calculateEstimate(10000, 0, 10, 'silver')
  }));
  assert(arithmetic.gold.threshold === 76500 && arithmetic.gold.estimate === 2250, 'Gold Zakat arithmetic failed');
  assert(arithmetic.silver.threshold === 5950 && arithmetic.silver.estimate === 250, 'Silver Zakat arithmetic failed');
  assert(!await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), `Islamic tools overflow at ${viewportName}`);
  assert(errors.length === 0, `Islamic tools console errors at ${viewportName}: ${errors.join(' | ')}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: findChrome() });
  const results = [];
  try {
    for (const viewport of viewports) {
      const programsPage = await browser.newPage({ viewport, locale: 'ar-MA' });
      await testPrograms(programsPage, viewport.name);
      await programsPage.close();

      const islamicPage = await browser.newPage({ viewport, locale: 'ar-MA' });
      await testIslamicTools(islamicPage, viewport.name);
      await islamicPage.close();
      results.push({ viewport: `${viewport.width}x${viewport.height}`, languages, status: 'passed' });
    }
    process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
