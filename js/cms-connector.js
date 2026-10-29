(function () {
    'use strict';

    const scriptUrl = new URL(document.currentScript.src, document.baseURI);
    const dataBase = new URL('../data/cms/', scriptUrl);
    const collections = ['sections', 'pages', 'media', 'programs', 'news', 'gallery', 'products', 'memory'];
    const state = Object.create(null);
    const allowedAttributes = new Set(['alt', 'aria-label', 'content', 'placeholder', 'title']);
    const categoryLabels = {
        ar: { news: 'أخبار', events: 'فعاليات', announcements: 'إعلانات', programs: 'برامج' },
        fr: { news: 'Actualités', events: 'Événements', announcements: 'Annonces', programs: 'Programmes' },
        en: { news: 'News', events: 'Events', announcements: 'Announcements', programs: 'Programs' }
    };

    function language() {
        const value = (document.documentElement.lang || localStorage.getItem('amjad-language') || 'ar').toLowerCase();
        return ['ar', 'fr', 'en'].includes(value) ? value : 'ar';
    }

    function translated(item, field) {
        const translations = item && item.translations && typeof item.translations === 'object' ? item.translations : {};
        const active = language();
        return String((translations[active] && translations[active][field]) ||
            (translations.ar && translations.ar[field]) || '').trim();
    }

    function publishedItems(name) {
        const documentData = state[name];
        if (!documentData || !Array.isArray(documentData.items)) return [];
        return documentData.items.filter((item) => item && item.status === 'published' && typeof item.id === 'string');
    }

    function mediaUrl(imageId) {
        if (!imageId) return '';
        const item = publishedItems('media').find((media) => media.id === imageId);
        if (!item || typeof item.path !== 'string') return '';
        try {
            const url = new URL(item.path, document.baseURI);
            if (url.origin !== window.location.origin || !url.pathname.startsWith('/images/uploads/')) return '';
            return url.href;
        } catch (_) {
            return '';
        }
    }

    function safeLink(value) {
        if (!value) return '';
        try {
            const url = new URL(value, document.baseURI);
            if (url.protocol !== 'https:' && url.origin !== window.location.origin) return '';
            return url.href;
        } catch (_) {
            return '';
        }
    }

    function setText(target, value) {
        if (target && value) target.textContent = value;
    }

    function currentPage() {
        return location.pathname.split('/').pop() || 'index.html';
    }

    function renderSections() {
        const page = currentPage();
        publishedItems('sections').forEach((item) => {
            if (item.page && item.page !== page && item.page !== '*') return;
            const key = String(item.binding_key || '');
            if (!key) return;
            const value = translated(item, 'text');
            document.querySelectorAll('[data-translate="' + CSS.escape(key) + '"], [data-translate-html="' + CSS.escape(key) + '"]').forEach((target) => {
                if (item.binding_kind === 'attribute') {
                    const attrs = String(target.dataset.translateAttr || '').split(',').map((entry) => entry.trim());
                    attrs.filter((attr) => allowedAttributes.has(attr)).forEach((attr) => value && target.setAttribute(attr, value));
                } else {
                    setText(target, value);
                }
                if (target.tagName === 'A' && item.url) {
                    const href = safeLink(item.url);
                    if (href) target.href = href;
                }
            });
        });
    }

    function renderHero(pageItem) {
        const hero = document.querySelector('.hero-section');
        if (!hero) return;
        setText(hero.querySelector('[data-cms-hero="title"]'), translated(pageItem, 'title'));
        setText(hero.querySelector('[data-cms-hero="subtitle"]'), translated(pageItem, 'subtitle'));
        setText(hero.querySelector('[data-cms-hero="text"]'), translated(pageItem, 'text_block'));
        const cta = hero.querySelector('[data-cms-hero="cta"]');
        setText(cta, translated(pageItem, 'cta_text'));
        const href = safeLink(pageItem.settings && pageItem.settings.cta_link);
        if (cta && href) cta.href = href;
        const image = mediaUrl(pageItem.image_id);
        if (image) hero.style.backgroundImage = "linear-gradient(to bottom, rgba(0,0,0,.36), rgba(0,0,0,.45)), url('" + image.replace(/'/g, '%27') + "')";
        ['years', 'volunteers', 'beneficiaries'].forEach((name, index) => {
            const counter = document.querySelectorAll('.counter')[index];
            const value = Number(pageItem.settings && pageItem.settings[name]);
            if (counter && Number.isFinite(value) && value >= 0) {
                counter.dataset.target = String(value);
                counter.textContent = String(value);
            }
        });
    }

    function renderPresident(item) {
        const bindings = {
            name: 'index_president_signature_title', role: 'index_president_card_title',
            organization: 'index_president_signature_org', motto: 'index_president_motto_text',
            message: 'index_president_paragraph_1', vision: 'index_president_vision_text', mission: 'index_president_mission_text'
        };
        Object.keys(bindings).forEach((field) => {
            document.querySelectorAll('[data-translate="' + bindings[field] + '"]').forEach((node) => setText(node, translated(item, field)));
        });
        const image = mediaUrl(item.image_id);
        const portrait = document.querySelector('[data-translate="index_president_alt"]');
        if (portrait && image) portrait.src = image;
    }

    function renderContact(item) {
        const settings = item.settings || {};
        const address = translated(item, 'address');
        document.querySelectorAll('[data-translate="index_footer_address"]').forEach((node) => setText(node, address));
        if (settings.email) document.querySelectorAll('a[href^="mailto:"]').forEach((node) => { node.href = 'mailto:' + settings.email; setText(node, settings.email); });
        if (settings.phone) document.querySelectorAll('a[href^="tel:"]').forEach((node) => { node.href = 'tel:' + settings.phone.replace(/[^+0-9]/g, ''); setText(node, settings.phone); });
        const networks = { facebook: 'facebook.com', instagram: 'instagram.com', x: 'x.com', youtube: 'youtube.com', tiktok: 'tiktok.com', linkedin: 'linkedin.com' };
        Object.keys(networks).forEach((name) => {
            const href = safeLink(settings[name]);
            if (!href) return;
            document.querySelectorAll('a[href*="' + networks[name] + '"]').forEach((node) => { node.href = href; });
        });
    }

    function renderPages() {
        publishedItems('pages').forEach((item) => {
            if (item.id === 'hero' && currentPage() === 'index.html') renderHero(item);
            if (item.id === 'president' && currentPage() === 'index.html') renderPresident(item);
            if (item.id === 'contact') renderContact(item);
        });
    }

    function updateProgramCard(card, item) {
        setText(card.querySelector('h4'), translated(item, 'title'));
        setText(card.querySelector('.project-card__content p'), translated(item, 'summary'));
        const image = mediaUrl(item.image_id);
        if (image) {
            let img = card.querySelector('img');
            const media = card.querySelector('.project-card__media');
            if (!img && media) { img = document.createElement('img'); img.loading = 'lazy'; media.prepend(img); media.classList.remove('project-card__illustration'); }
            if (img) { img.src = image; img.alt = translated(item, 'title'); }
        }
    }

    function createProgramCard(item) {
        const card = document.createElement('article');
        card.className = 'project-card';
        card.dataset.cmsGenerated = 'true'; card.dataset.cmsId = item.id;
        const media = document.createElement('div'); media.className = 'project-card__media project-card__illustration';
        const icon = document.createElement('i'); icon.className = 'fas fa-hands-helping'; icon.setAttribute('aria-hidden', 'true'); media.append(icon);
        const content = document.createElement('div'); content.className = 'project-card__content';
        const title = document.createElement('h4'); const summary = document.createElement('p');
        const action = document.createElement('a'); action.className = 'project-card__action';
        const detailId = String(item.detail_view_id || item.id).replace(/[^a-z0-9-]/g, '');
        action.href = '#' + detailId + '-detail'; action.dataset.projectDetail = detailId;
        action.textContent = translated(item, 'cta_text') || (language() === 'fr' ? 'Découvrir' : language() === 'en' ? 'Discover' : 'اكتشف المشروع');
        action.addEventListener('click', (event) => { event.preventDefault(); if (window.showProgramDetail) window.showProgramDetail(detailId); });
        content.append(title, summary, action); card.append(media, content); updateProgramCard(card, item);
        return card;
    }

    function updateProgramDetail(detail, item) {
        setText(detail.querySelector('h2'), translated(item, 'title'));
        const body = translated(item, 'body') || translated(item, 'summary');
        const paragraph = detail.querySelector('.prose p, .p-8 p, p');
        setText(paragraph, body);
        const image = mediaUrl(item.image_id);
        const cover = detail.querySelector('.program-image');
        if (cover && image) cover.style.backgroundImage = "url('" + image.replace(/'/g, '%27') + "')";
    }

    function createProgramDetail(item) {
        const detailId = String(item.detail_view_id || item.id).replace(/[^a-z0-9-]/g, '');
        const detail = document.createElement('div'); detail.id = detailId + '-detail'; detail.className = 'program-detail hidden'; detail.dataset.cmsGenerated = 'true';
        const box = document.createElement('div'); box.className = 'p-8 bg-white rounded-lg shadow-lg';
        const title = document.createElement('h2'); title.className = 'text-3xl font-bold text-gray-800 mb-4';
        const body = document.createElement('p'); body.className = 'text-lg text-gray-600 whitespace-pre-line';
        box.append(title, body); detail.append(box); updateProgramDetail(detail, item); return detail;
    }

    function renderPrograms() {
        if (currentPage() !== 'programs.html') return;
        document.querySelectorAll('[data-cms-generated="true"].project-card, [data-cms-generated="true"].program-detail').forEach((node) => node.remove());
        const detailHost = document.querySelector('.program-detail') && document.querySelector('.program-detail').parentElement;
        publishedItems('programs').forEach((item) => {
            const card = document.querySelector('.project-card[data-cms-id="' + CSS.escape(item.id) + '"]');
            const finalCard = card || createProgramCard(item);
            if (!card) document.querySelector('[data-family-panel="' + (item.family_id === 'social' ? 'social' : 'education') + '"]')?.append(finalCard);
            updateProgramCard(finalCard, item);
            const detailId = String(item.detail_view_id || item.id).replace(/[^a-z0-9-]/g, '');
            let detail = document.getElementById(detailId + '-detail');
            if (!detail && detailHost) { detail = createProgramDetail(item); detailHost.append(detail); }
            if (detail) updateProgramDetail(detail, item);
        });
        const hash = location.hash.slice(1).replace(/-detail$/, '');
        if (hash && document.getElementById(hash + '-detail') && window.showProgramDetail) window.showProgramDetail(hash, false);
    }

    function updateNewsCard(card, item) {
        card.dataset.category = item.category || 'news';
        setText(card.querySelector('h3'), translated(item, 'title'));
        setText(card.querySelector('.p-6 > p'), translated(item, 'summary'));
        setText(card.querySelector('.category-badge'), (categoryLabels[language()] || categoryLabels.ar)[item.category] || item.category);
        setText(card.querySelector('.date-badge'), item.published_at || '');
        const image = mediaUrl(item.image_id); const img = card.querySelector('img');
        if (img && image) { img.src = image; img.alt = translated(item, 'title'); }
    }

    function createNewsCard(item) {
        const card = document.createElement('article'); card.className = 'news-card bg-white rounded-lg shadow-lg overflow-hidden fade-in';
        card.id = item.id; card.dataset.cmsId = item.id; card.dataset.cmsGenerated = 'true';
        const img = document.createElement('img'); img.className = 'w-full h-48 object-cover'; img.loading = 'lazy';
        const box = document.createElement('div'); box.className = 'p-6';
        const meta = document.createElement('div'); meta.className = 'flex items-center justify-between mb-3';
        const category = document.createElement('span'); category.className = 'category-badge';
        const date = document.createElement('time'); date.className = 'date-badge'; meta.append(category, date);
        const title = document.createElement('h3'); title.className = 'text-xl font-bold text-gray-800 mb-3';
        const summary = document.createElement('p'); summary.className = 'text-gray-600 mb-4';
        const button = document.createElement('button'); button.type = 'button'; button.className = 'btn-primary';
        button.textContent = language() === 'fr' ? 'Lire la suite' : language() === 'en' ? 'Read more' : 'إقرأ المزيد';
        button.addEventListener('click', () => window.showNewsDetail && window.showNewsDetail(item.id));
        box.append(meta, title, summary, button); card.append(img, box); updateNewsCard(card, item); return card;
    }

    function updateNewsDetail(detail, item) {
        setText(detail.querySelector('h2'), translated(item, 'title'));
        setText(detail.querySelector('.category-badge'), (categoryLabels[language()] || categoryLabels.ar)[item.category] || item.category);
        setText(detail.querySelector('time, .news-overlay p'), item.published_at || '');
        setText(detail.querySelector('.prose p'), translated(item, 'body') || translated(item, 'summary'));
        const image = mediaUrl(item.image_id); const cover = detail.querySelector('.news-image');
        if (cover && image) cover.style.backgroundImage = "url('" + image.replace(/'/g, '%27') + "')";
    }

    function createNewsDetail(item) {
        const detail = document.createElement('section'); detail.id = item.id + '-detail'; detail.className = 'hidden'; detail.dataset.cmsGenerated = 'true';
        const cover = document.createElement('div'); cover.className = 'news-image';
        const overlay = document.createElement('div'); overlay.className = 'news-overlay';
        const heading = document.createElement('div'); const category = document.createElement('span'); category.className = 'category-badge';
        const title = document.createElement('h2'); title.className = 'text-3xl font-bold mb-2'; const date = document.createElement('time'); date.className = 'text-lg';
        heading.append(category, title, date); overlay.append(heading); cover.append(overlay);
        const bodyWrap = document.createElement('div'); bodyWrap.className = 'p-8'; const prose = document.createElement('div'); prose.className = 'prose max-w-none';
        const body = document.createElement('p'); body.className = 'text-lg text-gray-600 mb-6 whitespace-pre-line'; prose.append(body); bodyWrap.append(prose);
        const actions = document.createElement('div'); actions.className = 'flex justify-center mt-8';
        const close = document.createElement('button'); close.type = 'button'; close.className = 'btn-secondary px-6 py-2';
        close.textContent = language() === 'fr' ? 'Fermer' : language() === 'en' ? 'Close' : 'إغلاق'; close.addEventListener('click', () => window.closeNewsModal && window.closeNewsModal());
        actions.append(close); bodyWrap.append(actions);
        detail.append(cover, bodyWrap); updateNewsDetail(detail, item); return detail;
    }

    function renderNews() {
        if (currentPage() !== 'news.html') return;
        document.querySelectorAll('[data-cms-generated="true"].news-card, #news-modal [data-cms-generated="true"]').forEach((node) => node.remove());
        const grid = document.getElementById('news-grid'); const host = document.querySelector('#news-modal .news-detail');
        publishedItems('news').forEach((item) => {
            let card = document.querySelector('.news-card[data-cms-id="' + CSS.escape(item.id) + '"]');
            if (!card && grid) { card = createNewsCard(item); grid.append(card); }
            if (card) updateNewsCard(card, item);
            let detail = document.getElementById(item.id + '-detail');
            if (!detail && host) { detail = createNewsDetail(item); host.append(detail); }
            if (detail) updateNewsDetail(detail, item);
        });
        if (window.applyNewsVisibility) window.applyNewsVisibility();
        const hash = location.hash.slice(1);
        if (hash && document.getElementById(hash + '-detail') && window.showNewsDetail) window.showNewsDetail(hash);
    }

    function updateProductCard(card, item) {
        card.dataset.kind = item.kind || 'product'; card.dataset.product = item.product_code || item.id;
        setText(card.querySelector('h3'), translated(item, 'title')); setText(card.querySelector('.product-body > p'), translated(item, 'summary'));
        setText(card.querySelector('.product-badge'), translated(item, 'availability_label'));
        const image = mediaUrl(item.image_id); const media = card.querySelector('.product-media');
        if (media && image) { media.style.backgroundImage = "url('" + image.replace(/'/g, '%27') + "')"; media.style.backgroundSize = 'cover'; media.style.backgroundPosition = 'center'; }
        card.hidden = item.available === false;
    }

    function createProductCard(item) {
        const card = document.createElement('article'); card.className = 'product-card-v2 fade-in'; card.dataset.cmsGenerated = 'true'; card.dataset.cmsId = item.id;
        const media = document.createElement('div'); media.className = 'product-media'; const badge = document.createElement('div'); badge.className = 'product-badge secondary'; media.append(badge);
        const body = document.createElement('div'); body.className = 'product-body'; const title = document.createElement('h3'); title.className = 'text-xl font-bold text-gray-800';
        const summary = document.createElement('p'); summary.className = 'text-gray-600 mt-2'; const button = document.createElement('button'); button.type = 'button'; button.className = 'btn-primary btn-sm w-full mt-5 select-product';
        button.textContent = language() === 'fr' ? 'Choisir ce produit' : language() === 'en' ? 'Choose this product' : 'اختيار هذا المنتج';
        body.append(title, summary, button); card.append(media, body); updateProductCard(card, item); return card;
    }

    function renderProducts() {
        if (currentPage() !== 'shop.html') return;
        document.querySelectorAll('[data-cms-generated="true"].product-card-v2').forEach((node) => node.remove());
        const host = document.getElementById('shop-products');
        publishedItems('products').forEach((item) => {
            let card = document.querySelector('.product-card-v2[data-cms-id="' + CSS.escape(item.id) + '"]');
            if (!card && host) { card = createProductCard(item); host.append(card); }
            if (card) updateProductCard(card, item);
        });
        document.dispatchEvent(new CustomEvent('amjad:productsrendered'));
    }

    function memoryContainer(type) {
        return document.querySelector('[data-amjad-list="memory-' + ({ article: 'articles', person: 'figures', place: 'places', gallery: 'gallery' }[type] || type) + '"]') ||
            (type === 'timeline' ? document.getElementById('memory-timeline') : null);
    }

    function createMemoryItem(item, index) {
        const type = item.content_type; const titleText = translated(item, 'title'); const summaryText = translated(item, 'summary');
        if (type === 'gallery') {
            const link = document.createElement('a'); link.className = 'memory-photo'; link.dataset.cmsGenerated = 'true';
            const image = document.createElement('img'); image.src = mediaUrl(item.image_id); image.alt = translated(item, 'caption') || titleText; image.loading = 'lazy';
            const caption = document.createElement('span'); caption.textContent = translated(item, 'caption') || titleText; link.href = image.src; link.append(image, caption); return image.src ? link : null;
        }
        const article = document.createElement('article'); article.className = 'memory-card memory-' + type; article.dataset.cmsGenerated = 'true';
        if (type === 'place') { const mark = document.createElement('div'); mark.className = 'memory-place-mark'; mark.textContent = String(index + 1).padStart(2, '0'); article.append(mark); }
        if (type === 'person') { const avatar = document.createElement('div'); avatar.className = 'memory-avatar'; const imageUrl = mediaUrl(item.image_id); if (imageUrl) { const image = document.createElement('img'); image.src = imageUrl; image.alt = titleText; avatar.append(image); } else { const icon = document.createElement('i'); icon.className = 'fas fa-user'; icon.setAttribute('aria-hidden', 'true'); avatar.append(icon); } article.append(avatar); }
        const title = document.createElement('h3'); title.textContent = titleText; const summary = document.createElement('p'); summary.textContent = summaryText; article.append(title, summary);
        if (item.event_date) { const time = document.createElement('time'); time.dateTime = item.event_date; time.textContent = item.event_date; article.prepend(time); }
        const source = safeLink(item.source_url); if (source) { const link = document.createElement('a'); link.href = source; link.rel = 'noopener'; link.textContent = translated(item, 'source_label') || 'المصدر'; article.append(link); }
        return article;
    }

    function renderMemory() {
        if (currentPage() !== 'skhirat-memory.html') return;
        document.querySelectorAll('[data-cms-generated="true"]').forEach((node) => node.remove());
        publishedItems('memory').filter((item) => !item.page_ref || item.page_ref === 'skhirat-memory').forEach((item, index) => {
            const container = memoryContainer(item.content_type); const node = createMemoryItem(item, index); if (container && node) container.append(node);
        });
    }

    function renderGallery() {
        const pageRef = currentPage().replace(/\.html$/, '');
        const host = pageRef === 'index' ? document.getElementById('index-gallery-grid') : document.querySelector('[data-amjad-list="memory-gallery"]');
        if (!host) return;
        host.querySelectorAll('[data-cms-gallery-generated]').forEach((node) => node.remove());
        publishedItems('gallery').filter((item) => !item.page_ref || item.page_ref === pageRef || (pageRef === 'skhirat-memory' && item.page_ref === 'memory')).forEach((item) => {
            const imageUrl = mediaUrl(item.image_id); if (!imageUrl) return;
            const image = document.createElement('img'); image.src = imageUrl; image.alt = translated(item, 'alt'); image.loading = 'lazy'; image.className = 'gallery-image'; image.dataset.cmsGalleryGenerated = 'true'; host.append(image);
        });
    }

    function renderAll() {
        renderSections(); renderPages(); renderPrograms(); renderNews(); renderProducts(); renderMemory(); renderGallery();
    }

    async function loadCollection(name) {
        try {
            const response = await fetch(new URL(name + '.json', dataBase), { credentials: 'same-origin', cache: 'no-cache' });
            if (!response.ok) return;
            const data = await response.json();
            if (!data || !data._meta || !Array.isArray(data.items)) return;
            state[name] = data;
        } catch (_) {
            // Static HTML intentionally remains the complete fallback.
        }
    }

    document.addEventListener('amjad:languagechange', renderAll);
    document.addEventListener('DOMContentLoaded', async function () {
        await Promise.all(collections.map(loadCollection));
        renderAll();
        document.documentElement.dataset.cms = 'ready';
        document.dispatchEvent(new CustomEvent('amjad:cmsready'));
    });
}());
