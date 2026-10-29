const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

function loadPlaywright() {
  for (const candidate of [process.env.PLAYWRIGHT_CORE_PATH, 'playwright', 'playwright-core', 'M:/Saas_Mobile/mobile/E-learninng-SASS-master/frontend/node_modules/playwright-core'].filter(Boolean)) {
    try { return require(candidate); } catch (_) {}
  }
  throw new Error('Playwright is unavailable.');
}
function browserPath() {
  const choices = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'];
  const found = choices.find((file) => file && fs.existsSync(file));
  if (!found) throw new Error('Chromium/Edge is unavailable.');
  return found;
}
function assert(value, message) { if (!value) throw new Error(message); }
const translations = (values) => ({ ar: values.ar, fr: values.fr || {}, en: values.en || {} });
const doc = (items) => ({ _meta: { schema_version: 1, revision: 1, generated_at: new Date().toISOString() }, items });

(async () => {
  const root = path.resolve(__dirname, '..');
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'amjad-frontend-e2e-'));
  const publicDir = path.join(sandbox, 'public');
  const uploadDir = path.join(sandbox, 'uploads');
  const privateDir = path.join(sandbox, 'private');
  const screenshots = path.join(root, 'artifacts', 'cms-m2-qa');
  fs.mkdirSync(publicDir, { recursive: true }); fs.mkdirSync(uploadDir, { recursive: true }); fs.mkdirSync(screenshots, { recursive: true });
  fs.copyFileSync(path.join(root, 'images', 'bg.png'), path.join(uploadDir, 'qa.png'));
  const now = new Date().toISOString();
  const common = (id, extra = {}) => ({ id, status: 'published', image_id: '', order: 1, created_at: now, updated_at: now, ...extra });
  const data = {
    media: doc([common('qa-image', { path: '/images/uploads/qa.png', thumbnail_path: '', mime: 'image/png', width: 1, height: 1 })]),
    pages: doc([
      common('hero', { image_id: 'qa-image', translations: translations({ ar: { title: 'واجهة أمجاد المنشورة', subtitle: 'نص عربي منشور', cta_text: 'تواصل الآن', text_block: 'مرجع صغير موثوق' }, fr: { title: 'Accueil Amjad publié', subtitle: 'Texte français publié', cta_text: 'Nous contacter', text_block: 'Repère concis' }, en: { title: '', subtitle: '', cta_text: '', text_block: '' } }), settings: { cta_link: 'contact.html', years: 5, volunteers: 90, beneficiaries: 2600 } }),
      common('contact', { translations: translations({ ar: { address: 'عنوان CMS', opening_hours: '09:00–17:00' }, fr: { address: 'Adresse CMS', opening_hours: '' } }), settings: { email: 'cms@example.org', phone: '+212500000000', facebook: 'https://facebook.com/amjad.qa', instagram: '', x: '', youtube: '', tiktok: '', linkedin: '', map_url: '', secondary_email: '' } })
    ]),
    sections: doc([common('section-about-who-title', { translations: translations({ ar: { text: 'عنوان تعريفي منشور' }, fr: { text: 'Titre institutionnel publié' } }), page: 'about.html', group: 'about', binding_key: 'about_who_title', binding_kind: 'text', url: '' })]),
    programs: doc([common('academy', { image_id: 'qa-image', translations: translations({ ar: { title: 'أكاديمية أمجاد المحدثة', summary: 'ملخص البطاقة المحدث', body: 'تفاصيل البرنامج المنشورة', cta_text: 'اكتشف' }, fr: { title: 'Académie Amjad actualisée', summary: 'Résumé actualisé', body: 'Détails publiés', cta_text: 'Découvrir' } }), family_id: 'education', detail_view_id: 'academy' })]),
    news: doc([
      common('qa-news', { image_id: 'qa-image', translations: translations({ ar: { title: '<img src=x onerror=window.__cmsXss=1> خبر آمن', summary: 'خبر قابل للبحث', body: 'تفاصيل الخبر المنشور' }, fr: { title: 'Actualité de test', summary: 'Actualité recherchable', body: 'Détails publiés' } }), category: 'events', published_at: '2026-10-29' }),
      { ...common('draft-leak', { translations: translations({ ar: { title: 'مسودة سرية', summary: 'لا تظهر', body: '' } }), category: 'news', published_at: '2026-10-29' }), status: 'draft' }
    ]),
    products: doc([common('qa-bag', { translations: translations({ ar: { title: 'حقيبة أمجاد', summary: 'منتج جديد', availability_label: 'متوفر' }, fr: { title: 'Sac Amjad', summary: 'Nouveau produit', availability_label: 'Disponible' } }), kind: 'bag', product_code: 'AMJAD-BAG', price: 100, currency: 'MAD', sizes: [], colors: ['Green'], available: true })]),
    memory: doc([common('memory-qa', { image_id: 'qa-image', translations: translations({ ar: { title: 'حكاية من الصخيرات', summary: 'ملخص الذاكرة', body: 'النص', caption: '', source_label: 'المصدر' }, fr: { title: 'Récit de Skhirat', summary: 'Résumé mémoire', body: '', caption: '', source_label: 'Source' } }), content_type: 'article', source_url: 'https://example.org/source', event_date: '2020-01-01', page_ref: 'skhirat-memory' })]),
    gallery: doc([])
  };
  for (const [name, value] of Object.entries(data)) fs.writeFileSync(path.join(publicDir, `${name}.json`), JSON.stringify(value));

  const port = 4200 + Math.floor(Math.random() * 400);
  const server = spawn('php', ['-S', `127.0.0.1:${port}`, 'tests/php-router.php'], { cwd: root, env: { ...process.env, AMJAD_PUBLIC_DATA_DIR: publicDir, AMJAD_UPLOAD_DIR: uploadDir, AMJAD_STORAGE_DIR: privateDir }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let serverLog = ''; server.stderr.on('data', (chunk) => { serverLog += chunk.toString(); });
  const base = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 50; attempt++) {
    try { const response = await fetch(`${base}/index.html`); if (response.ok) break; } catch (_) {}
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (attempt === 49) throw new Error(`PHP server did not start: ${serverLog}`);
  }

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: true, executablePath: browserPath() });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-cms="ready"]');
    assert(await page.locator('[data-cms-hero="title"]').innerText() === 'واجهة أمجاد المنشورة', 'Published hero did not render.');
    assert(await page.locator('.counter').first().getAttribute('data-target') === '5', 'Published hero statistics did not render.');
    assert((await page.locator('.hero-section').getAttribute('style') || '').includes('qa.png'), 'Published hero image did not render.');
    await page.locator('[data-lang="fr"]').first().click();
    assert(await page.locator('[data-cms-hero="title"]').innerText() === 'Accueil Amjad publié', 'French CMS translation did not render.');
    await page.locator('[data-lang="en"]').first().click();
    assert(await page.locator('[data-cms-hero="title"]').innerText() === 'واجهة أمجاد المنشورة', 'Arabic CMS fallback did not render for missing English.');
    await page.screenshot({ path: path.join(screenshots, 'home-1440-en-fallback.png'), fullPage: true });

    await page.goto(`${base}/about.html`, { waitUntil: 'domcontentloaded' }); await page.waitForSelector('html[data-cms="ready"]');
    assert(await page.locator('[data-translate="about_who_title"]').innerText() === 'عنوان تعريفي منشور', 'Section binding did not render.');

    await page.goto(`${base}/programs.html#academy-detail`, { waitUntil: 'domcontentloaded' }); await page.waitForSelector('html[data-cms="ready"]');
    assert(await page.locator('[data-cms-id="academy"] h4').innerText() === 'أكاديمية أمجاد المحدثة', 'Program card did not update.');
    assert(await page.locator('#academy-detail').isVisible(), 'Program hash detail did not open.');
    assert((await page.locator('#academy-detail').innerText()).includes('تفاصيل البرنامج المنشورة'), 'Program detail did not update.');

    await page.goto(`${base}/news.html#qa-news`, { waitUntil: 'domcontentloaded' }); await page.waitForSelector('html[data-cms="ready"]');
    assert(await page.locator('[data-cms-id="qa-news"]').count() === 1, 'New published news card was not created.');
    assert(await page.locator('[data-cms-id="draft-leak"]').count() === 0, 'Draft record rendered publicly.');
    assert(await page.locator('[data-cms-id="qa-news"] h3 img').count() === 0 && !(await page.evaluate(() => window.__cmsXss)), 'CMS text executed as HTML.');
    assert(await page.locator('#news-modal').isVisible(), 'News hash did not open the modal.');
    await page.evaluate(() => closeNewsModal());
    await page.fill('#news-search', 'قابل للبحث');
    assert(await page.locator('[data-cms-id="qa-news"]').isVisible(), 'News search lost generated content.');
    await page.evaluate(() => filterNews('programs'));
    assert(!(await page.locator('[data-cms-id="qa-news"]').isVisible()), 'News category filter ignored generated content.');

    await page.goto(`${base}/shop.html`, { waitUntil: 'domcontentloaded' }); await page.waitForSelector('html[data-cms="ready"]');
    assert(await page.locator('[data-cms-id="qa-bag"]').count() === 1, 'Published product card was not created.');
    await page.locator('[data-cms-id="qa-bag"] .select-product').click();
    assert(await page.locator('#shop-product').inputValue() === 'AMJAD-BAG', 'Generated product did not integrate with order selection.');

    await page.goto(`${base}/resources/skhirat-memory.html`, { waitUntil: 'domcontentloaded' }); await page.waitForSelector('html[data-cms="ready"]');
    assert((await page.locator('[data-amjad-list="memory-articles"]').innerText()).includes('حكاية من الصخيرات'), 'Memory article did not render.');

    for (const width of [390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 }); await page.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded' }); await page.waitForSelector('html[data-cms="ready"]');
      assert(!(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2)), `Homepage overflows at ${width}px.`);
      await page.screenshot({ path: path.join(screenshots, `home-${width}.png`), fullPage: true });
    }

    const fallback = await context.newPage();
    await fallback.route('**/data/cms/*.json', (route) => route.abort());
    await fallback.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded' }); await fallback.waitForSelector('html[data-cms="ready"]');
    const fallbackTitle = await fallback.locator('[data-cms-hero="title"]').innerText();
    assert(fallbackTitle.length > 5 && fallbackTitle !== 'واجهة أمجاد المنشورة', 'Static fallback disappeared when endpoints failed.');
    await fallback.close();
    assert(errors.length === 0, `Browser page errors: ${errors.join(' | ')}`);
    console.log('CMS frontend E2E passed: projections, fallback, AR/FR/EN, components, XSS, hashes, filters, products, memory, responsive layouts.');
    console.log(`Screenshots: ${screenshots}`);
  } finally {
    await browser.close();
    server.kill();
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
})().catch((error) => { console.error(error.stack || error); process.exit(1); });
