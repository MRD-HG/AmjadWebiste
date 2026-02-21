// Amjad Shop - Enhanced UX

const WHATSAPP_NUMBER = '212600000000'; // TODO: replace with the association WhatsApp number

const STORAGE_KEY = 'amjad_language';

const I18N = {
  ar: {
    namePh: 'الاسم الكامل',
    cityPh: 'المدينة',
    phonePh: 'رقم الهاتف (اختياري)',
    notePh: 'ملاحظة (اختياري): اللون/المقاس/تفاصيل إضافية...',
    orderBtn: 'إرسال الطلب عبر واتساب',
    chooseBtn: 'اختيار هذا المنتج',
    selected: 'المنتج المختار',
    size: 'المقاس',
    color: 'اللون',
    qty: 'الكمية',
    oneSize: 'مقاس واحد',
    searchPh: 'ابحث عن منتج...',
    filterAll: 'الكل',
    filterTshirt: 'تيشرت',
    filterCap: 'قبعة',
    products: { 'T-shirt': 'تيشرت أمجاد', 'Cap': 'قبعة أمجاد' },
    colors: { Black:'أسود', White:'أبيض', Green:'أخضر' }
  },
  en: {
    namePh: 'Full name',
    cityPh: 'City',
    phonePh: 'Phone (optional)',
    notePh: 'Note (optional): color/size/extra details...',
    orderBtn: 'Send order on WhatsApp',
    chooseBtn: 'Choose this product',
    selected: 'Selected product',
    size: 'Size',
    color: 'Color',
    qty: 'Quantity',
    oneSize: 'One size',
    searchPh: 'Search a product...',
    filterAll: 'All',
    filterTshirt: 'T-shirt',
    filterCap: 'Cap',
    products: { 'T-shirt': 'Amjad T‑shirt', 'Cap': 'Amjad Cap' },
    colors: { Black:'Black', White:'White', Green:'Green' }
  },
  fr: {
    namePh: 'Nom complet',
    cityPh: 'Ville',
    phonePh: 'Téléphone (optionnel)',
    notePh: 'Note (optionnel) : couleur/taille/détails...',
    orderBtn: 'Envoyer la commande sur WhatsApp',
    chooseBtn: 'Choisir ce produit',
    selected: 'Produit sélectionné',
    size: 'Taille',
    color: 'Couleur',
    qty: 'Quantité',
    oneSize: 'Taille unique',
    searchPh: 'Rechercher un produit...',
    filterAll: 'Tous',
    filterTshirt: 'T‑shirt',
    filterCap: 'Casquette',
    products: { 'T-shirt': 'T‑shirt Amjad', 'Cap': 'Casquette Amjad' },
    colors: { Black:'Noir', White:'Blanc', Green:'Vert' }
  }
};

function getLang() {
  try { return localStorage.getItem(STORAGE_KEY) || 'ar'; } catch(e) { return 'ar'; }
}

function tr() {
  const lang = getLang();
  return I18N[lang] || I18N.ar;
}

function $(sel, root=document){ return root.querySelector(sel); }
function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

function setActivePill(groupEl, value){
  $all('.pill', groupEl).forEach(btn => btn.classList.toggle('active', btn.dataset.value === value));
}

function currentLabels(){
  const lang = getLang();
  const dict = tr();
  return {
    product: (val) => dict.products[val] || val,
    color: (val) => dict.colors[val] || val,
    size: (val) => val === 'OneSize' ? dict.oneSize : val,
  };
}

function syncLanguagePlaceholders(){
  const d = tr();
  const name = $('#shop-name');
  const city = $('#shop-city');
  const phone = $('#shop-phone');
  const note = $('#shop-note');
  const btn = $('#shop-order-btn');
  const search = $('#shop-search');

  if (name) name.placeholder = d.namePh;
  if (city) city.placeholder = d.cityPh;
  if (phone) phone.placeholder = d.phonePh;
  if (note) note.placeholder = d.notePh;
  if (btn) btn.textContent = d.orderBtn;
  if (search && !search.dataset.translate) search.placeholder = d.searchPh;

  // buttons on cards
  $all('.select-product').forEach(b => {
    if (!b.dataset.translate) b.textContent = d.chooseBtn;
  });
}

function setSelected(product){
  const hiddenProduct = $('#shop-product');
  if (hiddenProduct) hiddenProduct.value = product;

  // visual selection
  $all('.product-card-v2').forEach(card => {
    card.classList.toggle('selected', card.dataset.product === product);
  });

  // variants behavior
  const sizeWrap = $('#size-wrap');
  const hiddenSize = $('#shop-size');

  if (product === 'Cap') {
    if (sizeWrap) sizeWrap.style.display = 'none';
    if (hiddenSize) hiddenSize.value = 'OneSize';
  } else {
    if (sizeWrap) sizeWrap.style.display = '';
    if (hiddenSize && hiddenSize.value === 'OneSize') hiddenSize.value = 'M';
  }

  updateSummary();
}

function setSize(size){
  const hidden = $('#shop-size');
  if (hidden) hidden.value = size;
  setActivePill($('#size-pills'), size);
  updateSummary();
}

function setColor(color){
  const hidden = $('#shop-color');
  if (hidden) hidden.value = color;
  setActivePill($('#color-pills'), color);
  updateSummary();
}

function setQty(qty){
  const hidden = $('#shop-qty');
  const v = Math.max(1, parseInt(qty, 10) || 1);
  if (hidden) hidden.value = String(v);
  const view = $('#qty-value');
  if (view) view.textContent = String(v);
  updateSummary();
}

function updateSummary(){
  const labels = currentLabels();
  const product = $('#shop-product')?.value || 'T-shirt';
  const size = $('#shop-size')?.value || 'M';
  const color = $('#shop-color')?.value || 'Black';
  const qty = $('#shop-qty')?.value || '1';

  const p = $('#selected-product');
  const s = $('#selected-size');
  const c = $('#selected-color');
  const q = $('#selected-qty');

  if (p) p.textContent = labels.product(product);
  if (s) s.textContent = labels.size(size);
  if (c) c.textContent = labels.color(color);
  if (q) q.textContent = qty;
}

function buildWhatsAppMessage(form){
  const labels = currentLabels();
  const dict = tr();

  const product = form.product.value || 'T-shirt';
  const size = form.size.value || 'M';
  const color = form.color.value || 'Black';
  const qty = form.qty.value || '1';

  const name = form.name.value?.trim() || '';
  const city = form.city.value?.trim() || '';
  const phone = form.phone.value?.trim() || '';
  const note = form.note.value?.trim() || '';
  const support = form.support?.value?.trim() || '';
  const delivery = form.delivery?.value?.trim() || '';

  // Keep a friendly bilingual style regardless of UI language
  const lines = [
    'السلام عليكم،',
    'أريد طلب منتج من متجر جمعية أمجاد:',
    `• المنتج: ${labels.product(product)} (${product})`,
    `• المقاس: ${labels.size(size)} (${size})`,
    `• اللون: ${labels.color(color)} (${color})`,
    `• الكمية: ${qty}`,
    '',
    `الاسم: ${name}`,
    `المدينة: ${city}`,
  ];

  if (phone) lines.push(`الهاتف: ${phone}`);
  if (support) lines.push(`مبلغ دعم إضافي: ${support} MAD`);
  if (delivery) lines.push(`عنوان/ملاحظة للتسليم: ${delivery}`);
  if (note) lines.push(`ملاحظة: ${note}`);

  lines.push('', 'شكراً 🙏');

  return lines.join('\n');
}

function setupFAQ(){
  $all('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const ans = btn.nextElementSibling;
      const isOpen = btn.classList.toggle('open');
      if (ans && ans.classList) {
        ans.classList.toggle('open', isOpen);
      }
    });
  });
}

function applyFilter(){
  const query = ($('#shop-search')?.value || '').trim().toLowerCase();
  const filter = $('#shop-filter')?.value || 'all';

  $all('.product-card-v2').forEach(card => {
    const kind = card.dataset.kind;
    const title = card.textContent.toLowerCase();

    const matchFilter = filter === 'all' || filter === kind;
    const matchQuery = !query || title.includes(query);

    card.style.display = (matchFilter && matchQuery) ? '' : 'none';
  });
}

function init(){
  const form = $('#amjad-shop-form');
  if (!form) return;

  // Initial state
  syncLanguagePlaceholders();
  setSelected('T-shirt');
  setSize('M');
  setColor('Black');
  setQty(1);

  // Card selection
  $all('.product-card-v2').forEach(card => {
    card.querySelector('.select-product')?.addEventListener('click', () => {
      setSelected(card.dataset.product);
      // scroll to order panel on small screens
      const panel = $('.order-panel');
      if (window.innerWidth < 1024 && panel) {
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Size pills
  const sizePills = $('#size-pills');
  if (sizePills) {
    $all('.pill', sizePills).forEach(btn => btn.addEventListener('click', () => setSize(btn.dataset.value)));
  }

  // Color pills
  const colorPills = $('#color-pills');
  if (colorPills) {
    $all('.pill', colorPills).forEach(btn => btn.addEventListener('click', () => setColor(btn.dataset.value)));
  }

  // Quantity stepper
  $all('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const step = parseInt(btn.dataset.step, 10) || 0;
      const current = parseInt($('#shop-qty')?.value || '1', 10) || 1;
      setQty(current + step);
    });
  });

  // Search/filter
  $('#shop-search')?.addEventListener('input', applyFilter);
  $('#shop-filter')?.addEventListener('change', applyFilter);

  // FAQ accordion
  setupFAQ();

  // Submit
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // basic validation
    if (!form.name.value.trim() || !form.city.value.trim()) {
      form.name.focus();
      return;
    }

    const message = buildWhatsAppMessage(form);
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  });

  // When language changes
  $all('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setTimeout(() => {
        syncLanguagePlaceholders();
        updateSummary();
      }, 60);
    });
  });
}

document.addEventListener('DOMContentLoaded', init);
