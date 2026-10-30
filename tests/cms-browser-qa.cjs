const fs = require('fs');

function loadPlaywright() {
  for (const candidate of [process.env.PLAYWRIGHT_CORE_PATH, 'playwright', 'playwright-core', 'M:/Saas_Mobile/mobile/E-learninng-SASS-master/frontend/node_modules/playwright-core'].filter(Boolean)) {
    try { return require(candidate); } catch (_) {}
  }
  throw new Error('Playwright is unavailable.');
}
function chromePath() {
  const paths = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
  const found = paths.find((path) => fs.existsSync(path));
  if (!found) throw new Error('A Chromium browser is required.');
  return found;
}
function assert(value, message) { if (!value) throw new Error(message); }

(async () => {
  const base = (process.env.AMJAD_CMS_BASE_URL || 'http://127.0.0.1:4188').replace(/\/$/, '');
  const username = process.env.AMJAD_QA_USERNAME;
  const password = process.env.AMJAD_QA_PASSWORD;
  const itemId = `qa-news-${Date.now()}`;
  const screenshotDir = process.env.AMJAD_QA_SCREENSHOT_DIR;
  if (screenshotDir) fs.mkdirSync(screenshotDir, { recursive: true });
  if (!username || !password) throw new Error('AMJAD_QA_USERNAME and AMJAD_QA_PASSWORD are required.');
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: true, executablePath: chromePath() });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) errors.push(message.text()); });
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  try {
    let response = await page.goto(`${base}/admin/dashboard.php`, { waitUntil: 'domcontentloaded' });
    assert(page.url().includes('/admin/login.php'), 'Protected page did not redirect to login.');
    assert((response.headers()['content-security-policy'] || '').includes("frame-ancestors 'none'"), 'CSP header missing.');
    for (const path of ['/admin/storage/credentials.json', '/admin/includes/config.php', '/admin/bin/setup.php']) {
      const denied = await context.request.get(base + path);
      assert(denied.status() === 403, `Private path not denied: ${path}`);
    }

    await page.fill('[name="username"]', username);
    await page.fill('[name="password"]', 'definitely-wrong-password');
    await page.click('button[type="submit"]');
    assert((await page.locator('[role="alert"]').innerText()).includes('غير صحيحة'), 'Generic login error not shown.');
    await page.fill('[name="username"]', username);
    await page.fill('[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin/dashboard.php');
    assert(await page.locator('h1').filter({ hasText: 'لوحة التحكم' }).count() === 1, 'Dashboard not reached.');
    if (screenshotDir) await page.screenshot({ path: `${screenshotDir}/cms-desktop.png`, fullPage: true });

    const badCsrf = await context.request.post(`${base}/admin/logout.php`, { form: {} });
    assert(badCsrf.status() === 403, 'Missing CSRF token was not rejected.');

    await page.goto(`${base}/admin/news.php?action=new`, { waitUntil: 'domcontentloaded' });
    await page.fill('[name="stable_id"]', 'INVALID ID');
    await page.fill('[name="title_ar"]', 'خبر اختبار الجودة');
    await page.fill('[name="summary_ar"]', 'ملخص مخصص لاختبار سير التحرير');
    await page.click('button[name="save_status"][value="draft"]');
    assert(await page.locator('[role="alert"]').count() === 1, 'Invalid form did not show a validation error.');
    await page.fill('[name="stable_id"]', itemId);
    await page.fill('[name="body_ar"]', 'محتوى تجريبي آمن.');
    await page.click('button[name="save_status"][value="draft"]');
    await page.waitForURL('**/admin/news.php');
    assert(await page.getByText('خبر اختبار الجودة').count() > 0, 'Draft news item missing from list.');
    assert(await page.locator('.badge--draft').count() > 0, 'Draft status missing.');

    await page.goto(`${base}/admin/news.php?action=edit&id=${itemId}`, { waitUntil: 'domcontentloaded' });
    await page.click('button[name="save_status"][value="published"]');
    await page.waitForURL('**/admin/news.php');
    assert(await page.locator('.badge--published').count() > 0, 'Published status missing.');
    const projection = await context.request.get(`${base}/data/cms/news.json`);
    assert(projection.ok() && (await projection.text()).includes(itemId), 'Published projection not generated.');

    await page.goto(`${base}/admin/news.php?action=edit&id=${itemId}`, { waitUntil: 'domcontentloaded' });
    await page.click('button[name="save_status"][value="draft"]');
    await page.waitForURL('**/admin/news.php');
    const unpublished = await context.request.get(`${base}/data/cms/news.json`);
    const unpublishedDocument = await unpublished.json();
    assert(!unpublishedDocument.items.some((item) => item.id === itemId), 'Unpublished draft leaked into public projection.');
    assert(unpublishedDocument._meta.managed_ids.includes(itemId), 'Unpublished ownership tombstone is missing.');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/admin/dashboard.php`, { waitUntil: 'domcontentloaded' });
    assert(await page.locator('.menu-toggle').isVisible(), 'Mobile menu button is not visible.');
    await page.locator('.menu-toggle').click();
    assert(await page.locator('#admin-sidebar').evaluate((el) => el.classList.contains('is-open')), 'Mobile sidebar did not open.');
    await page.waitForTimeout(250);
    const sidebarBox = await page.locator('#admin-sidebar').boundingBox();
    assert(sidebarBox && sidebarBox.x >= -1 && sidebarBox.x + sidebarBox.width <= 391, 'Mobile sidebar remained outside the viewport.');
    if (screenshotDir) await page.screenshot({ path: `${screenshotDir}/cms-mobile.png`, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    assert(!overflow, 'Dashboard has viewport-level horizontal overflow.');

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${base}/admin/news.php`, { waitUntil: 'domcontentloaded' });
    const row = page.locator('tr', { hasText: itemId });
    page.once('dialog', (dialog) => dialog.accept());
    await row.getByRole('button', { name: 'أرشفة' }).click();
    await page.waitForURL('**/admin/news.php');
    await page.goto(`${base}/admin/dashboard.php`, { waitUntil: 'domcontentloaded' });
    await page.locator('.sidebar-footer form button').click();
    await page.waitForURL('**/admin/login.php');
    assert(errors.length === 0, `Browser errors: ${errors.join(' | ')}`);
    console.log('CMS browser QA passed: auth, CSRF, content workflow, projections, responsive UI, logout.');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error.stack || error); process.exit(1); });
