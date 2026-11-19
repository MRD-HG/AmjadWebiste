// Amjad Shop - CMS-driven product selection and email ordering.
'use strict';

const SHOP_LANGUAGE_KEY = 'amjad_language';
const productCatalog = new Map();
const SHOP_COPY = {
  ar: { name: 'الاسم الكامل', city: 'المدينة', phone: 'رقم الهاتف (اختياري)', note: 'ملاحظة إضافية (اختياري)', order: 'متابعة الطلب عبر البريد الإلكتروني', choose: 'اختيار هذا المنتج', oneSize: 'مقاس واحد' },
  en: { name: 'Full name', city: 'City', phone: 'Phone (optional)', note: 'Additional note (optional)', order: 'Continue order by email', choose: 'Choose this product', oneSize: 'One size' },
  fr: { name: 'Nom complet', city: 'Ville', phone: 'Téléphone (facultatif)', note: 'Note supplémentaire (facultatif)', order: 'Continuer la commande par e-mail', choose: 'Choisir ce produit', oneSize: 'Taille unique' }
};

function shopLang() {
  try { const value = localStorage.getItem(SHOP_LANGUAGE_KEY); return ['ar', 'en', 'fr'].includes(value) ? value : 'ar'; } catch (_) { return 'ar'; }
}
function shopCopy() { return SHOP_COPY[shopLang()] || SHOP_COPY.ar; }
function shopQuery(selector, root = document) { return root.querySelector(selector); }
function shopQueryAll(selector, root = document) { return Array.from(root.querySelectorAll(selector)); }
function cleanOptions(value) { return Array.isArray(value) ? value.map(String).map(v => v.trim()).filter(Boolean) : String(value || '').split(',').map(v => v.trim()).filter(Boolean); }
function translatedProduct(item, field) {
  const translations = item.translations || {};
  return String(translations[shopLang()]?.[field] || translations.ar?.[field] || '').trim();
}

function productFromCard(card) {
  const code = String(card.dataset.product || card.dataset.cmsId || '').trim();
  if (!code) return null;
  return { id: card.dataset.cmsId || code, code, kind: card.dataset.kind || 'product', title: shopQuery('h3', card)?.textContent.trim() || code, price: Number(card.dataset.price) || 0, currency: card.dataset.currency || 'MAD', sizes: cleanOptions(card.dataset.sizes), colors: cleanOptions(card.dataset.colors), available: card.dataset.available !== 'false' && !card.hidden };
}
function cmsProduct(item) {
  return { id: item.id, code: String(item.product_code || item.id), kind: String(item.kind || 'product'), title: translatedProduct(item, 'title') || String(item.product_code || item.id), price: Number(item.price) || 0, currency: String(item.currency || 'MAD'), sizes: cleanOptions(item.sizes), colors: cleanOptions(item.colors), available: item.available !== false };
}
function rebuildCatalog(cmsItems = []) {
  productCatalog.clear();
  shopQueryAll('.product-card-v2').forEach(card => { const product = productFromCard(card); if (product?.available) productCatalog.set(product.code, product); });
  cmsItems.forEach(item => { const product = cmsProduct(item); if (product.available) productCatalog.set(product.code, product); });
}
function formatMoney(product, quantity = 1) { return new Intl.NumberFormat(shopLang(), { style: 'currency', currency: product.currency }).format(product.price * quantity); }

function renderPills(container, values, handler) {
  if (!container) return;
  container.replaceChildren();
  values.forEach((value, index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'pill' + (index === 0 ? ' active' : ''); button.dataset.value = value;
    button.textContent = value === 'OneSize' ? shopCopy().oneSize : value;
    button.addEventListener('click', () => handler(value)); container.append(button);
  });
}
function setActivePill(container, value) { shopQueryAll('.pill', container || document.createElement('div')).forEach(button => button.classList.toggle('active', button.dataset.value === value)); }
function setSize(value) { const field = shopQuery('#shop-size'); if (field) field.value = value; setActivePill(shopQuery('#size-pills'), value); updateShopSummary(); }
function setColor(value) { const field = shopQuery('#shop-color'); if (field) field.value = value; setActivePill(shopQuery('#color-pills'), value); updateShopSummary(); }
function setQuantity(value) { const quantity = Math.max(1, Number.parseInt(value, 10) || 1); const field = shopQuery('#shop-qty'); if (field) field.value = String(quantity); const output = shopQuery('#qty-value'); if (output) output.textContent = String(quantity); updateShopSummary(); }

function setSelectedProduct(code) {
  const product = productCatalog.get(code); if (!product?.available) return false;
  const field = shopQuery('#shop-product'); if (field) field.value = product.code;
  shopQueryAll('.product-card-v2').forEach(card => card.classList.toggle('selected', card.dataset.product === product.code));
  const sizes = product.sizes.length ? product.sizes : ['OneSize']; const colors = product.colors.length ? product.colors : ['Standard'];
  renderPills(shopQuery('#size-pills'), sizes, setSize); renderPills(shopQuery('#color-pills'), colors, setColor);
  const sizeWrap = shopQuery('#size-wrap'); if (sizeWrap) sizeWrap.hidden = sizes.length === 1 && sizes[0] === 'OneSize';
  const sizeField = shopQuery('#shop-size'); if (sizeField) sizeField.value = sizes[0];
  const colorField = shopQuery('#shop-color'); if (colorField) colorField.value = colors[0];
  updateShopSummary(); return true;
}

function updateShopSummary() {
  const product = productCatalog.get(shopQuery('#shop-product')?.value || ''); if (!product) return;
  const quantity = Number.parseInt(shopQuery('#shop-qty')?.value || '1', 10) || 1;
  const values = { '#selected-product': product.title, '#selected-size': shopQuery('#shop-size')?.value || '', '#selected-color': shopQuery('#shop-color')?.value || '', '#selected-qty': String(quantity) };
  Object.entries(values).forEach(([selector, value]) => { const node = shopQuery(selector); if (node) node.textContent = value; });
  let price = shopQuery('#selected-price');
  if (!price) { price = document.createElement('div'); price.id = 'selected-price'; price.className = 'font-bold text-emerald-700 mt-3'; shopQuery('.order-summary')?.append(price); }
  if (price) price.textContent = formatMoney(product, quantity);
}

function bindProductCards() {
  shopQueryAll('.product-card-v2').forEach(card => {
    const button = shopQuery('.select-product', card); if (!button || button.dataset.shopBound === 'true') return;
    button.dataset.shopBound = 'true'; button.addEventListener('click', () => {
      if (!setSelectedProduct(card.dataset.product)) return;
      if (window.innerWidth < 1024) shopQuery('.order-panel')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    });
  });
}
function applyShopFilter() {
  const query = (shopQuery('#shop-search')?.value || '').trim().toLowerCase(); const filter = shopQuery('#shop-filter')?.value || 'all';
  shopQueryAll('.product-card-v2').forEach(card => {
    if (card.dataset.cmsPublication === 'unpublished' || card.dataset.available === 'false') return;
    card.style.display = ((filter === 'all' || filter === card.dataset.kind) && (!query || card.textContent.toLowerCase().includes(query))) ? '' : 'none';
  });
}

function buildOrderMessage(form) {
  const code = form.elements.namedItem('product').value; const product = productCatalog.get(code); if (!product) return '';
  const quantity = Number.parseInt(form.elements.namedItem('qty').value, 10) || 1;
  const lines = ['السلام عليكم،', 'أريد طلب منتج من متجر جمعية أمجاد:', `• المنتج: ${product.title}`, `• الرمز: ${product.code}`, `• السعر: ${formatMoney(product)}`, `• المقاس: ${form.elements.namedItem('size').value}`, `• اللون: ${form.elements.namedItem('color').value}`, `• الكمية: ${quantity}`, `• المجموع: ${formatMoney(product, quantity)}`, '', `الاسم: ${form.elements.namedItem('name').value.trim()}`, `المدينة: ${form.elements.namedItem('city').value.trim()}`];
  ['phone', 'support', 'delivery', 'note'].forEach(name => { const value = form.elements.namedItem(name)?.value.trim(); if (value) lines.push(`${name}: ${value}`); });
  return lines.join('\n');
}
function syncShopLanguage() {
  const copy = shopCopy(); const placeholders = { '#shop-name': copy.name, '#shop-city': copy.city, '#shop-phone': copy.phone, '#shop-note': copy.note };
  Object.entries(placeholders).forEach(([selector, value]) => { const node = shopQuery(selector); if (node) node.placeholder = value; });
  const order = shopQuery('#shop-order-btn'); if (order) order.textContent = copy.order;
  shopQueryAll('.select-product').forEach(button => { if (!button.dataset.translate) button.textContent = copy.choose; });
  const current = shopQuery('#shop-product')?.value; if (current && productCatalog.has(current)) setSelectedProduct(current);
}

function initializeShop() {
  const form = shopQuery('#amjad-shop-form'); if (!form) return;
  rebuildCatalog(); bindProductCards(); syncShopLanguage(); setQuantity(1);
  const first = productCatalog.keys().next().value; if (first) setSelectedProduct(first);
  shopQueryAll('.qty-btn').forEach(button => button.addEventListener('click', () => setQuantity((Number.parseInt(shopQuery('#shop-qty')?.value || '1', 10) || 1) + (Number.parseInt(button.dataset.step, 10) || 0))));
  shopQuery('#shop-search')?.addEventListener('input', applyShopFilter); shopQuery('#shop-filter')?.addEventListener('change', applyShopFilter);
  shopQueryAll('.faq-q').forEach(button => button.addEventListener('click', () => { const open = button.classList.toggle('open'); button.nextElementSibling?.classList.toggle('open', open); button.setAttribute('aria-expanded', String(open)); }));
  form.addEventListener('submit', event => {
    event.preventDefault(); if (!form.checkValidity()) { form.reportValidity(); return; }
    const message = buildOrderMessage(form); if (!message) return;
    const subjects = { ar: 'طلب من متجر جمعية أمجاد', en: 'Amjad shop order request', fr: 'Demande de commande — Boutique Amjad' };
    window.renderEmailFallback?.(form, subjects[shopLang()] || subjects.ar, message);
  });
}

document.addEventListener('DOMContentLoaded', initializeShop);
document.addEventListener('amjad:productsrendered', event => {
  rebuildCatalog(event.detail?.products || []); bindProductCards(); syncShopLanguage();
  const current = shopQuery('#shop-product')?.value;
  if (!productCatalog.has(current)) { const first = productCatalog.keys().next().value; if (first) setSelectedProduct(first); }
});
document.addEventListener('amjad:languagechange', syncShopLanguage);
