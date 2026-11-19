const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

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
    '/usr/bin/google-chrome',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
  ].filter(Boolean);
  const executable = candidates.find(candidate => fs.existsSync(candidate));
  if (!executable) throw new Error('No installed Chromium-family browser found. Set CHROME_PATH.');
  return executable;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const { chromium } = loadPlaywright();
let baseUrl = (process.env.AMJAD_BASE_URL || '').replace(/\/$/, '');
const artifactDirectory = path.join(__dirname, '..', 'artifacts', 'evaluation-qa');
fs.mkdirSync(artifactDirectory, { recursive: true });
let ownedServer = null;
let ownedSandbox = null;

async function startServerIfNeeded() {
  if (baseUrl) return;
  const root = path.resolve(__dirname, '..');
  ownedSandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'amjad-evaluation-browser-'));
  const port = 4700 + Math.floor(Math.random() * 500);
  baseUrl = `http://127.0.0.1:${port}`;
  let serverLog = '';
  ownedServer = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', '.', 'tests/php-router.php'], {
    cwd: root,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      AMJAD_STORAGE_DIR: path.join(ownedSandbox, 'private'),
      AMJAD_PUBLIC_DATA_DIR: path.join(ownedSandbox, 'public'),
      AMJAD_UPLOAD_DIR: path.join(ownedSandbox, 'uploads')
    }
  });
  ownedServer.stderr.on('data', chunk => { serverLog += chunk.toString(); });
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/evaluation.html`);
      if (response.ok) return;
    } catch (error) { /* Keep polling until the short deadline. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Local PHP server did not start: ${serverLog}`);
}

function stopOwnedServer() {
  if (ownedServer) ownedServer.kill();
  if (ownedSandbox && ownedSandbox.startsWith(os.tmpdir() + path.sep + 'amjad-evaluation-browser-')) {
    fs.rmSync(ownedSandbox, { recursive: true, force: true });
  }
}

const viewports = [
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'landscape-1024', width: 1024, height: 768 },
  { name: 'desktop-1440', width: 1440, height: 900 }
];

async function layoutAudit(browser, viewport) {
  const context = await browser.newContext({ viewport, locale: 'ar-MA', reducedMotion: 'reduce' });
  const page = await context.newPage();
  const pageErrors = [];
  const externalRequests = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('request', request => {
    const url = new URL(request.url());
    const base = new URL(baseUrl);
    if (url.origin !== base.origin) externalRequests.push(request.url());
  });
  await page.goto(`${baseUrl}/evaluation.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('#hero-mission-map .mission-tile').first().waitFor();

  assert(await page.locator('#hero-mission-map .mission-tile').count() === 10, `${viewport.name}: hero dashboard must expose ten mission buttons`);
  assert(await page.evaluate(() => document.fonts.check('16px Cairo')), `${viewport.name}: self-hosted Cairo font is not available`);
  assert(await page.locator('h1').textContent().then(text => text.includes('رحلة أمجاد')), `${viewport.name}: page heading is missing`);
  assert(!await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1), `${viewport.name}: page has horizontal overflow`);

  const heroNodeTargets = await page.locator('#hero-mission-map .mission-tile').evaluateAll(nodes => nodes.map(node => {
    const rectangle = node.getBoundingClientRect();
    return { width: rectangle.width, height: rectangle.height };
  }));
  assert(heroNodeTargets.every(target => target.width >= 43 && target.height >= 43), `${viewport.name}: mission-map touch targets are below 44px`);

  const menuToggleVisible = await page.locator('.evaluation-menu-toggle').isVisible();
  if (viewport.width < 1200) {
    assert(menuToggleVisible, `${viewport.name}: responsive menu toggle is missing`);
    await page.locator('.evaluation-menu-toggle').click();
    assert(await page.locator('#evaluation-mobile-nav a[href="evaluation.html"]').isVisible(), `${viewport.name}: evaluation link is missing from mobile navigation`);
    await page.locator('.evaluation-menu-toggle').click();
    assert(await page.locator('#evaluation-mobile-nav').isHidden(), `${viewport.name}: responsive menu did not close`);
  } else {
    assert(!menuToggleVisible, `${viewport.name}: desktop should not show the mobile menu toggle`);
    assert(await page.locator('#evaluation-desktop-nav a[aria-current="page"]').isVisible(), `${viewport.name}: current evaluation link is missing from desktop navigation`);
  }

  const motion = await page.locator('.mission-tile').first().evaluate(element => ({
    animation: getComputedStyle(element).animationDuration,
    transition: getComputedStyle(element).transitionDuration
  }));
  assert(Number.parseFloat(motion.animation) <= 0.001 && Number.parseFloat(motion.transition) <= 0.001, `${viewport.name}: reduced-motion preference is not respected`);
  assert(externalRequests.length === 0, `${viewport.name}: anonymous evaluation made third-party requests: ${externalRequests.join(', ')}`);
  await page.screenshot({ path: path.join(artifactDirectory, `${viewport.name}-hero.png`), fullPage: true });

  await page.locator('[data-action="start-journey"]').click();
  assert(await page.locator('body').getAttribute('class').then(value => value.includes('is-journey-active')), `${viewport.name}: starting did not enter focused journey mode`);
  assert(await page.locator('#question-title').isVisible(), `${viewport.name}: focused journey does not show the question`);
  if (viewport.width < 1024) {
    await page.locator('.journey-toolbar__missions').click();
    assert(await page.locator('#journey-sidebar.is-open').isVisible(), `${viewport.name}: mobile mission drawer did not open`);
    assert(await page.locator('#compact-mission-map .mission-tile').count() === 10, `${viewport.name}: mobile journey has no direct mission navigation`);
    await page.locator('#compact-mission-map [data-mission-section="1"]').click();
    assert((await page.locator('#question-number').textContent()).trim() === 'س04', `${viewport.name}: mobile mission navigation did not open its axis`);
  }
  assert(!await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1), `${viewport.name}: focused journey has horizontal overflow`);
  await page.screenshot({ path: path.join(artifactDirectory, `${viewport.name}-journey.png`), fullPage: false });
  assert(pageErrors.length === 0, `${viewport.name}: page errors: ${pageErrors.join(' | ')}`);
  await context.close();
}

async function functionalAudit(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar-MA' });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(`${baseUrl}/evaluation.html`, { waitUntil: 'domcontentloaded' });

  const schema = await page.evaluate(() => ({
    sections: window.AMJAD_EVALUATION.sections.length,
    questions: window.AMJAD_EVALUATION.sections.flatMap(section => section.questions).length,
    ids: window.AMJAD_EVALUATION.sections.flatMap(section => section.questions.map(question => question.id)),
    types: window.AMJAD_EVALUATION.sections.flatMap(section => section.questions).reduce((counts, question) => {
      counts[question.type] = (counts[question.type] || 0) + 1;
      return counts;
    }, {})
  }));
  assert(schema.sections === 11, 'Survey must have a briefing plus ten axes');
  assert(schema.questions === 40 && new Set(schema.ids).size === 40 && schema.ids.every((id, index) => id === index + 1), 'Survey must expose unique sequential Q1-Q40');
  assert(schema.types.scale === 22 && schema.types.radio === 11 && schema.types.checkbox === 2 && schema.types.text === 5, 'Survey question-type inventory changed');

  await page.locator('[data-action="start-journey"]').click();
  await page.locator('#question-title').waitFor();
  assert((await page.locator('#question-title').textContent()).includes('المصدر الأساسي'), 'Journey did not start on Q1');
  assert(await page.locator('#answer-area fieldset').count() === 1, 'Radio question lacks fieldset grouping');
  await page.locator('#answer-area input[type="radio"]').first().check();
  assert(await page.evaluate(() => Boolean(sessionStorage.getItem('amjad_evaluation_draft_v2'))), 'Versioned draft was not saved in sessionStorage');
  assert(await page.locator('#answer-clear').isVisible(), 'Answered optional question does not expose a clear-answer control');
  await page.locator('#answer-clear').click();
  assert(await page.locator('#answer-area input[type="radio"]:checked').count() === 0, 'Clear-answer control did not return the optional question to blank');
  await page.locator('#answer-area input[type="radio"]').first().check();

  await page.reload({ waitUntil: 'domcontentloaded' });
  assert(await page.locator('#draft-resume:not([hidden])').isVisible(), 'Reload did not offer to resume the tab draft');
  await page.locator('#draft-resume [data-action="resume-draft"]').click();
  assert(await page.locator('#answer-area input[type="radio"]:checked').count() === 1, 'Q1 answer was not restored after reload');
  assert(await page.evaluate(() => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(JSON.parse(sessionStorage.getItem('amjad_evaluation_draft_v2')).responseId)), 'Draft lacks a stable UUIDv4 response reference');

  await page.locator('#compact-mission-map [data-mission-section="1"]').click();
  assert((await page.locator('#question-number').textContent()).trim() === 'س04', 'Mission map did not navigate to Q4');
  await page.locator('#answer-area input[value="4"]').check();
  await page.locator('[data-action="next-question"]').click();
  await page.locator('#answer-area input[value="3"]').check();
  await page.locator('[data-action="next-question"]').click();
  await page.locator('[data-action="skip-question"]').click();
  await page.locator('#answer-area textarea').fill('تجربة مفيدة من دون ذكر أسماء.');
  await page.locator('[data-action="next-question"]').click();
  assert((await page.locator('#question-number').textContent()).trim() === 'س08', 'Ordinary mission completion should continue without a blocking celebration');
  assert(await page.locator('#compact-mission-map [data-mission-section="1"]').getAttribute('class').then(value => value.includes('is-complete')), 'Completed mission did not update the useful 3D map');

  await page.locator('#compact-mission-map [data-mission-section="4"]').click();
  assert((await page.locator('#question-number').textContent()).trim() === 'س16', 'Direct mission navigation did not open axis four');
  await page.locator('[data-action="skip-question"]').click();
  await page.locator('[data-action="skip-question"]').click();
  assert((await page.locator('#question-number').textContent()).trim() === 'س18', 'Axis four did not reach Q18');
  const checkboxes = page.locator('#answer-area input[type="checkbox"]');
  await checkboxes.nth(0).check();
  await checkboxes.nth(1).check();
  await checkboxes.nth(2).click();
  assert(await page.locator('#answer-area input[type="checkbox"]:checked').count() === 2, 'Q18 allowed more than two choices');
  assert(await page.locator('#evaluation-toast.is-visible').isVisible(), 'Q18 limit did not announce feedback');

  await page.locator('.journey-toolbar__review').click();
  assert(await page.locator('.review-answer').count() === 40, 'Review does not contain all 40 questions');
  await page.locator('#review-unanswered-only').check();
  assert(await page.locator('.review-answer').count() < 40, 'Unanswered-only review filter did not reduce the review list');
  await page.locator('#review-unanswered-only').uncheck();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#draft-resume [data-action="resume-draft"]').click();
  assert(await page.locator('#review-screen').isVisible(), 'Reloading a review draft did not restore the review screen');
  assert(!await page.locator('#submission-consent').isChecked(), 'Submission consent must not be restored from a draft');
  await page.locator('[data-edit-question="7"]').click();
  await page.locator('#answer-area textarea').fill('راسلوني على member@example.com');
  await page.locator('.journey-toolbar__review').click();
  await page.locator('#submission-consent').check();
  await page.waitForTimeout(8500);
  await page.locator('[data-action="submit-evaluation"]').click();
  await page.locator('#submission-status.is-error').waitFor();
  assert((await page.locator('#submission-status').textContent()).includes('البريد الإلكتروني'), 'Server did not reject direct contact details in free text');
  assert(await page.locator('#success-screen').isHidden(), 'Rejected response incorrectly showed success');

  await page.locator('[data-edit-question="7"]').click();
  await page.locator('#answer-area textarea').fill('تجربة مفيدة ومقترح عام لتحسين المشاركة.');
  await page.locator('.journey-toolbar__review').click();
  await page.locator('[data-action="submit-evaluation"]').click();
  await page.locator('#success-screen:not([hidden])').waitFor();
  assert((await page.locator('#confirmation-code').textContent()).trim().length >= 8, 'Successful submission lacks a confirmation code');
  assert(!await page.evaluate(() => sessionStorage.getItem('amjad_evaluation_draft_v2')), 'Successful submission did not clear the tab draft');
  await page.screenshot({ path: path.join(artifactDirectory, 'desktop-success.png'), fullPage: true });
  assert(pageErrors.length === 0, `Functional flow page errors: ${pageErrors.join(' | ')}`);

  await context.close();
}

async function gameAudit(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar-MA' });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(`${baseUrl}/evaluation.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('#hero-board-stage .game-board__path').waitFor({ state: 'attached' });
  assert(await page.locator('#hero-board-stage .game-board__avatar').count() === 1, 'Game board lacks the Asil player token');
  await page.locator('[data-action="start-journey"]').click();
  await page.keyboard.press('1');
  await page.waitForFunction(() => document.getElementById('question-number').textContent.trim() === 'س02', null, { timeout: 4000 });
  await page.locator('#auto-advance-toggle').uncheck({ force: true });
  await page.keyboard.press('2');
  await page.waitForTimeout(1300);
  assert((await page.locator('#question-number').textContent()).trim() === 'س02', 'Auto-advance toggle did not stop automatic navigation');
  assert(await page.locator('#answer-area input[type="radio"]:checked').count() === 1, 'Number-key shortcut did not select an option');
  await page.keyboard.press('Enter');
  assert((await page.locator('#question-number').textContent()).trim() === 'س03', 'Enter shortcut did not move to the next question');
  await page.locator('#compact-mission-map [data-mission-section="2"]').click();
  for (let step = 0; step < 4; step += 1) await page.locator('[data-action="skip-question"]').click();
  assert(await page.locator('#stamp-burst.is-visible').isVisible(), 'Finishing a station did not show its non-blocking stamp');
  assert((await page.locator('#question-number').textContent()).trim() === 'س12', 'Stamp celebration blocked the journey');
  assert((await page.locator('#hud-stamps').textContent()).trim() === '1/10', 'HUD stamp counter did not update');
  assert(pageErrors.length === 0, `Game flow page errors: ${pageErrors.join(' | ')}`);
  await context.close();
}

async function homepageNavigationAudit(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar-MA' });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
  assert(await page.locator('.evaluation-invite a[href="evaluation.html"]').isVisible(), 'Homepage evaluation invitation is missing');
  await page.locator('button[onclick*="toggleMobileMenu"]').click();
  assert(await page.locator('.mobile-menu a[href="evaluation.html"]').isVisible(), 'Homepage mobile navbar lacks the evaluation link');
  assert(!await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1), 'Homepage gained horizontal overflow after navbar integration');
  await context.close();
}

async function sitewideNavigationAudit(browser) {
  const paths = [
    '/index.html', '/about.html', '/services.html', '/programs.html', '/news.html',
    '/shop.html', '/contact.html', '/404.html', '/resources/skhirat.html',
    '/resources/skhirat-memory.html', '/resources/Cup.html'
  ];
  for (const width of [1024, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'ar-MA' });
    const page = await context.newPage();
    for (const route of paths) {
      await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
      const evaluationLinks = page.locator('nav.navbar a[href$="evaluation.html"]');
      assert(await evaluationLinks.count() >= 2, `${route}: evaluation link is not present in both navigation variants`);
      if (width < 1200) {
        const toggle = page.locator('nav.navbar button[onclick*="toggleMobileMenu"]').first();
        assert(await toggle.isVisible(), `${route}: 1024px navigation toggle is not visible`);
        await toggle.click();
        assert(await page.locator('nav.navbar .mobile-menu a[href$="evaluation.html"]').isVisible(), `${route}: mobile evaluation link is not visible`);
      } else {
        assert(await page.locator('nav.navbar > div:first-child a[href$="evaluation.html"]').isVisible(), `${route}: desktop evaluation link is not visible`);
      }
      assert(!await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2), `${route}: navbar integration causes horizontal overflow at ${width}px`);
    }
    await context.close();
  }
}

(async () => {
  await startServerIfNeeded();
  const browser = await chromium.launch({ headless: true, executablePath: findChrome() });
  const evidence = [];
  try {
    for (const viewport of viewports) {
      await layoutAudit(browser, viewport);
      evidence.push({ scope: 'evaluation-layout', viewport: `${viewport.width}x${viewport.height}`, status: 'passed' });
    }
    await functionalAudit(browser);
    evidence.push({ scope: 'evaluation-functional-flow', browser: 'installed Chromium-family', status: 'passed' });
    await gameAudit(browser);
    evidence.push({ scope: 'evaluation-game-mechanics', checks: ['board token', 'auto-advance', 'shortcuts', 'stamp'], status: 'passed' });
    if (process.env.AMJAD_SKIP_SITEWIDE === '1') { process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`); return; }
    await homepageNavigationAudit(browser);
    evidence.push({ scope: 'homepage-integration', viewport: '390x844', status: 'passed' });
    await sitewideNavigationAudit(browser);
    evidence.push({ scope: 'sitewide-navbar-integration', viewports: ['1024x900', '1440x900'], pages: 11, status: 'passed' });
    process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
  } finally {
    await browser.close();
    stopOwnedServer();
  }
})().catch(error => {
  stopOwnedServer();
  console.error(error.stack || error.message);
  process.exit(1);
});
