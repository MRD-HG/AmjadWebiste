(function(){
  const STORAGE_KEY = 'amjad_language';
  const $ = (s, r=document)=>r.querySelector(s);

  function getLang(){
    try { return localStorage.getItem(STORAGE_KEY) || 'ar'; } catch(e){ return 'ar'; }
  }

  const CITIES = [
    { ar:"الرباط", api:"Rabat" },
    { ar:"الدار البيضاء", api:"Casablanca" },
    { ar:"سلا", api:"Sale" },
    { ar:"تمارة", api:"Temara" },
    { ar:"القنيطرة", api:"Kenitra" },
    { ar:"مراكش", api:"Marrakesh" },
    { ar:"فاس", api:"Fes" },
    { ar:"طنجة", api:"Tangier" },
    { ar:"تطوان", api:"Tetouan" },
    { ar:"أكادير", api:"Agadir" },
    { ar:"وجدة", api:"Oujda" },
    { ar:"مكناس", api:"Meknes" },
    { ar:"الناظور", api:"Nador" },
    { ar:"العيون", api:"Laayoune" },
    { ar:"الداخلة", api:"Dakhla" }
  ];

  const TXT = {
    ar: {
      loading: "جاري جلب أوقات الصلاة...",
      failed: "تعذر جلب أوقات الصلاة. تحقق من الاتصال ثم أعد المحاولة.",
      fajr:"الفجر", sunrise:"الشروق", dhuhr:"الظهر", asr:"العصر", maghrib:"المغرب", isha:"العشاء",
      result:"النتيجة",
      net:"الصافي",
      nisab:"النصاب",
      zakatDue:"الزكاة الواجبة (2.5%)",
      notReached:"لم يبلغ الصافي النصاب، لا زكاة واجبة."
    },
    en: {
      loading: "Fetching prayer times...",
      failed: "Could not fetch prayer times. Check connection and try again.",
      fajr:"Fajr", sunrise:"Sunrise", dhuhr:"Dhuhr", asr:"Asr", maghrib:"Maghrib", isha:"Isha",
      result:"Result",
      net:"Net",
      nisab:"Nisab",
      zakatDue:"Zakat due (2.5%)",
      notReached:"Net is below nisab — no zakat due."
    },
    fr: {
      loading: "Récupération des heures de prière...",
      failed: "Impossible de récupérer les horaires. Vérifiez la connexion et réessayez.",
      fajr:"Fajr", sunrise:"Lever", dhuhr:"Dhuhr", asr:"Asr", maghrib:"Maghrib", isha:"Isha",
      result:"Résultat",
      net:"Net",
      nisab:"Nisab",
      zakatDue:"Zakat due (2,5%)",
      notReached:"Le net est inférieur au nisab — pas de zakat due."
    }
  };

  function t(key){
    const lang=getLang();
    return (TXT[lang] && TXT[lang][key]) ? TXT[lang][key] : TXT.ar[key];
  }

  // --- Prayer Times ---
  let lastPrayerJson = null;

  function fillCities(){
    const sel = $('#pt-city');
    if(!sel) return;
    sel.innerHTML = '';
    CITIES.forEach((c, i)=>{
      const opt=document.createElement('option');
      opt.value=c.api;
      opt.textContent=c.ar;
      if(i===0) opt.selected=true;
      sel.appendChild(opt);
    });
  }

  function tile(label, time, icon){
    return `
      <div class="border rounded-2xl p-3 bg-white flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gray-50 border flex items-center justify-center text-gray-700">
          <i class="fas ${icon}"></i>
        </div>
        <div class="flex-1">
          <div class="text-xs text-gray-500">${label}</div>
          <div class="text-lg font-bold text-gray-800">${time || '--:--'}</div>
        </div>
      </div>`;
  }

  function renderTimes(json){
    const grid = $('#pt-grid');
    if(!grid) return;
    const timings = json?.data?.timings || {};
    grid.innerHTML = [
      tile(t('fajr'), timings.Fajr, 'fa-moon'),
      tile(t('sunrise'), timings.Sunrise, 'fa-sun'),
      tile(t('dhuhr'), timings.Dhuhr, 'fa-cloud-sun'),
      tile(t('asr'), timings.Asr, 'fa-clock'),
      tile(t('maghrib'), timings.Maghrib, 'fa-sunset'),
      tile(t('isha'), timings.Isha, 'fa-star')
    ].join('');
  }

  async function fetchTimes(){
    const city = $('#pt-city')?.value || 'Rabat';
    const status = $('#pt-status');
    const grid = $('#pt-grid');
    if(status) status.textContent = t('loading');
    if(grid) grid.innerHTML = '';
    try{
      const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=Morocco&method=3`;
      const res = await fetch(url);
      const json = await res.json();
      lastPrayerJson = json;
      renderTimes(json);
      if(status) status.textContent = '';
    }catch(e){
      if(status) status.textContent = t('failed');
    }
  }

  // --- Zakat ---
  function setDefaultGrams(){
    const base = document.querySelector('input[name="z-nisab-base"]:checked')?.value || 'gold';
    const gramsInput = $('#z-grams');
    if(!gramsInput) return;
    gramsInput.value = base === 'silver' ? 595 : 85;
  }

  function fmt(n){
    const lang = getLang();
    const locale = lang==='fr' ? 'fr-FR' : (lang==='en' ? 'en-US' : 'ar-MA');
    try{ return new Intl.NumberFormat(locale, {maximumFractionDigits:2}).format(n); }
    catch(e){ return String(Math.round(n*100)/100); }
  }

  function computeZakat(){
    const assets = parseFloat($('#z-assets')?.value || '0') || 0;
    const debts  = parseFloat($('#z-debts')?.value || '0') || 0;
    const grams  = parseFloat($('#z-grams')?.value || '0') || 0;
    const price  = parseFloat($('#z-price')?.value || '0') || 0;

    const net = Math.max(0, assets - debts);
    const nisab = Math.max(0, grams * price);

    const box = $('#z-result');
    if(!box) return;

    if(nisab <= 0){
      box.innerHTML = `
        <div class="p-4 rounded-2xl bg-amber-50 border text-sm">
          <div class="font-bold mb-1">${t('result')}</div>
          <div>${t('net')}: <b>${fmt(net)}</b> MAD</div>
          <div class="mt-2">يرجى إدخال سعر الغرام لحساب النصاب.</div>
        </div>`;
      return;
    }

    if(net < nisab){
      box.innerHTML = `
        <div class="p-4 rounded-2xl bg-amber-50 border text-sm">
          <div class="font-bold mb-1">${t('result')}</div>
          <div>${t('net')}: <b>${fmt(net)}</b> MAD</div>
          <div>${t('nisab')}: <b>${fmt(nisab)}</b> MAD</div>
          <div class="mt-2">${t('notReached')}</div>
        </div>`;
      return;
    }

    const zakat = net * 0.025;
    box.innerHTML = `
      <div class="p-4 rounded-2xl bg-green-50 border text-sm">
        <div class="font-bold mb-1">${t('result')}</div>
        <div>${t('net')}: <b>${fmt(net)}</b> MAD</div>
        <div>${t('nisab')}: <b>${fmt(nisab)}</b> MAD</div>
        <div class="mt-2">${t('zakatDue')}: <b>${fmt(zakat)}</b> MAD</div>
      </div>`;
  }

  function attach(){
    if(!$('#islamic-tools')) return;

    fillCities();

    // default grams based on base
    setDefaultGrams();

    // prayer handlers
    $('#pt-fetch')?.addEventListener('click', fetchTimes);
    // auto fetch on load
    fetchTimes();

    // zakat handlers
    document.querySelectorAll('input[name="z-nisab-base"]').forEach(r=>{
      r.addEventListener('change', ()=>{
        setDefaultGrams();
        // clear result on change to avoid confusion
        const box=$('#z-result');
        if(box) box.innerHTML='';
      });
    });

    $('#z-compute')?.addEventListener('click', computeZakat);

    // Update dynamic parts on language change
    document.querySelectorAll('.lang-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        setTimeout(()=>{
          if(lastPrayerJson) renderTimes(lastPrayerJson);
          // recompute result with translated labels (if already computed)
          if($('#z-result')?.innerHTML?.trim()) computeZakat();
        }, 60);
      });
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', attach);
  else attach();
})();
