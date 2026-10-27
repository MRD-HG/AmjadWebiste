(function () {
  'use strict';

  const STORAGE_KEY = 'amjad_language';
  const TIME_ZONE = 'Africa/Casablanca';
  const API_METHOD = 21;
  const API_ROOT = 'https://api.aladhan.com/v1/timingsByCity';
  const $ = (selector, root = document) => root.querySelector(selector);

  const CITIES = [
    { api: 'Rabat', ar: 'الرباط', en: 'Rabat', fr: 'Rabat' },
    { api: 'Casablanca', ar: 'الدار البيضاء', en: 'Casablanca', fr: 'Casablanca' },
    { api: 'Sale', ar: 'سلا', en: 'Salé', fr: 'Salé' },
    { api: 'Temara', ar: 'تمارة', en: 'Temara', fr: 'Témara' },
    { api: 'Kenitra', ar: 'القنيطرة', en: 'Kenitra', fr: 'Kénitra' },
    { api: 'Marrakesh', ar: 'مراكش', en: 'Marrakesh', fr: 'Marrakech' },
    { api: 'Fes', ar: 'فاس', en: 'Fez', fr: 'Fès' },
    { api: 'Tangier', ar: 'طنجة', en: 'Tangier', fr: 'Tanger' },
    { api: 'Tetouan', ar: 'تطوان', en: 'Tetouan', fr: 'Tétouan' },
    { api: 'Agadir', ar: 'أكادير', en: 'Agadir', fr: 'Agadir' },
    { api: 'Oujda', ar: 'وجدة', en: 'Oujda', fr: 'Oujda' },
    { api: 'Meknes', ar: 'مكناس', en: 'Meknes', fr: 'Meknès' },
    { api: 'Nador', ar: 'الناظور', en: 'Nador', fr: 'Nador' },
    { api: 'Laayoune', ar: 'العيون', en: 'Laayoune', fr: 'Laâyoune' },
    { api: 'Dakhla', ar: 'الداخلة', en: 'Dakhla', fr: 'Dakhla' }
  ];

  const PRAYERS = [
    { key: 'Fajr', label: 'fajr' },
    { key: 'Dhuhr', label: 'dhuhr' },
    { key: 'Asr', label: 'asr' },
    { key: 'Maghrib', label: 'maghrib' },
    { key: 'Isha', label: 'isha' }
  ];

  const TXT = {
    ar: {
      loading: 'جاري جلب مواقيت اليوم والغد…',
      failed: 'تعذر جلب مواقيت موثوقة الآن. تحقق من الاتصال ثم استخدم زر التحديث.',
      invalidData: 'وصلت بيانات غير مكتملة أو بتاريخ غير صحيح. لم يتم عرض مواقيت بديلة.',
      fajr: 'الفجر', sunrise: 'الشروق', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء',
      sunriseInfo: 'الشروق — وقت معلوماتي وليس صلاة مفروضة',
      hoursMinutes: (hours, minutes) => `${hours} س ${minutes} د`,
      minutesOnly: (minutes) => `${minutes} د`,
      required: 'هذا الحقل مطلوب.',
      invalidNumber: 'أدخل رقماً صالحاً ومحدوداً.',
      nonNegative: 'لا يمكن إدخال قيمة سالبة.',
      positivePrice: 'أدخل سعراً للغرام أكبر من صفر.',
      resultTitle: 'ملخص التقدير',
      assets: 'إجمالي الموجودات', debts: 'الديون المدخلة', net: 'الصافي المستخدم', nisab: 'حد النصاب', estimate: 'تقدير 2.5%',
      reached: 'بلغ الصافي حد النصاب في هذا التقدير المبسط.',
      below: 'لم يبلغ الصافي حد النصاب في هذا التقدير المبسط؛ لا يُعد ذلك حكماً شرعياً نهائياً.',
      gold: 'الذهب (85 غ)', silver: 'الفضة (595 غ)'
    },
    en: {
      loading: 'Fetching today’s and tomorrow’s prayer times…',
      failed: 'Reliable prayer times could not be fetched. Check your connection and use Refresh.',
      invalidData: 'The response was incomplete or for the wrong date. No substitute times are shown.',
      fajr: 'Fajr', sunrise: 'Sunrise', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha',
      sunriseInfo: 'Sunrise — informational time, not an obligatory prayer',
      hoursMinutes: (hours, minutes) => `${hours}h ${minutes}m`,
      minutesOnly: (minutes) => `${minutes}m`,
      required: 'This field is required.',
      invalidNumber: 'Enter a valid, finite number.',
      nonNegative: 'The value cannot be negative.',
      positivePrice: 'Enter a gram price greater than zero.',
      resultTitle: 'Estimate summary',
      assets: 'Total assets', debts: 'Entered debts', net: 'Net used', nisab: 'Nisab threshold', estimate: 'Estimated 2.5%',
      reached: 'The net amount reaches the nisab threshold in this simplified estimate.',
      below: 'The net amount is below the nisab threshold in this simplified estimate; this is not a definitive religious ruling.',
      gold: 'Gold (85g)', silver: 'Silver (595g)'
    },
    fr: {
      loading: 'Récupération des horaires d’aujourd’hui et de demain…',
      failed: 'Impossible de récupérer des horaires fiables. Vérifiez la connexion puis utilisez Actualiser.',
      invalidData: 'La réponse est incomplète ou associée à une mauvaise date. Aucun horaire de substitution n’est affiché.',
      fajr: 'Fajr', sunrise: 'Lever du soleil', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha',
      sunriseInfo: 'Lever du soleil — horaire informatif, pas une prière obligatoire',
      hoursMinutes: (hours, minutes) => `${hours} h ${minutes} min`,
      minutesOnly: (minutes) => `${minutes} min`,
      required: 'Ce champ est obligatoire.',
      invalidNumber: 'Saisissez un nombre valide et fini.',
      nonNegative: 'La valeur ne peut pas être négative.',
      positivePrice: 'Saisissez un prix au gramme supérieur à zéro.',
      resultTitle: 'Résumé de l’estimation',
      assets: 'Total des avoirs', debts: 'Dettes saisies', net: 'Net utilisé', nisab: 'Seuil du nisab', estimate: 'Estimation de 2,5 %',
      reached: 'Le montant net atteint le seuil du nisab dans cette estimation simplifiée.',
      below: 'Le montant net est inférieur au seuil du nisab dans cette estimation simplifiée ; ceci ne constitue pas un avis religieux définitif.',
      gold: 'Or (85 g)', silver: 'Argent (595 g)'
    }
  };

  let prayerState = null;
  let activeRequest = null;
  let requestSequence = 0;
  let countdownTimer = null;
  let lastZakatResult = null;

  function getLang() {
    let stored = 'ar';
    try { stored = localStorage.getItem(STORAGE_KEY) || document.documentElement.lang || 'ar'; } catch (error) { stored = document.documentElement.lang || 'ar'; }
    return ['ar', 'en', 'fr'].includes(stored) ? stored : 'ar';
  }

  function t(key) {
    const table = TXT[getLang()] || TXT.ar;
    return table[key] !== undefined ? table[key] : TXT.ar[key];
  }

  function locale() {
    return getLang() === 'fr' ? 'fr-MA' : getLang() === 'en' ? 'en-GB' : 'ar-MA';
  }

  function cityLabel(apiName) {
    const city = CITIES.find((item) => item.api === apiName) || CITIES[0];
    return city[getLang()] || city.ar;
  }

  function getZonedParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIME_ZONE,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(date);
    const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]));
    return { year: values.year, month: values.month, day: values.day, hour: values.hour, minute: values.minute, second: values.second };
  }

  function dateKey(parts) {
    return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
  }

  function apiDate(parts) {
    return `${String(parts.day).padStart(2, '0')}-${String(parts.month).padStart(2, '0')}-${parts.year}`;
  }

  function addDays(parts, days) {
    const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, 12));
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
  }

  function zonedDateTimeToDate(parts, hour, minute) {
    const target = Date.UTC(parts.year, parts.month - 1, parts.day, hour, minute, 0);
    let guess = target;
    for (let index = 0; index < 3; index += 1) {
      const represented = getZonedParts(new Date(guess));
      const representedUtc = Date.UTC(represented.year, represented.month - 1, represented.day, represented.hour, represented.minute, represented.second);
      guess = target - (representedUtc - guess);
    }
    return new Date(guess);
  }

  function parseTime(value) {
    const match = typeof value === 'string' ? value.match(/^(\d{1,2}):(\d{2})/) : null;
    if (!match) throw new Error('Malformed prayer time');
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) throw new Error('Malformed prayer time');
    return { value: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`, hour, minute };
  }

  function validatePrayerResponse(json, expectedParts) {
    if (!json || json.code !== 200 || !json.data || !json.data.timings || !json.data.date || !json.data.meta) throw new Error('Invalid API response');
    if (json.data.date.gregorian.date !== apiDate(expectedParts)) throw new Error('Unexpected data date');
    if (json.data.meta.timezone !== TIME_ZONE || Number(json.data.meta.method && json.data.meta.method.id) !== API_METHOD) throw new Error('Unexpected API metadata');
    const timings = {};
    [...PRAYERS.map((prayer) => prayer.key), 'Sunrise'].forEach((key) => { timings[key] = parseTime(json.data.timings[key]); });
    return { parts: expectedParts, timings, apiDate: json.data.date.gregorian.date };
  }

  async function fetchPrayerDay(city, parts, signal) {
    const url = `${API_ROOT}/${apiDate(parts)}?city=${encodeURIComponent(city)}&country=Morocco&method=${API_METHOD}`;
    const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Prayer API HTTP ${response.status}`);
    return validatePrayerResponse(await response.json(), parts);
  }

  function fillCities() {
    const select = $('#pt-city');
    if (!select) return;
    const selected = select.value || 'Rabat';
    select.replaceChildren();
    CITIES.forEach((city) => {
      const option = document.createElement('option');
      option.value = city.api;
      option.textContent = cityLabel(city.api);
      option.selected = city.api === selected;
      select.append(option);
    });
    $('#pt-city-name').textContent = cityLabel(select.value);
  }

  function setPrayerStatus(message, isError) {
    const status = $('#pt-status');
    status.textContent = message;
    status.classList.toggle('is-error', Boolean(isError));
  }

  function formatDay(parts) {
    const instant = zonedDateTimeToDate(parts, 12, 0);
    return new Intl.DateTimeFormat(locale(), { timeZone: TIME_ZONE, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(instant);
  }

  function formatUpdateTime(date) {
    return new Intl.DateTimeFormat(locale(), { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(date);
  }

  function findNextPrayer(today, tomorrow, now = new Date()) {
    const todayCandidates = PRAYERS.map((prayer) => ({
      key: prayer.key,
      label: prayer.label,
      date: zonedDateTimeToDate(today.parts, today.timings[prayer.key].hour, today.timings[prayer.key].minute),
      fromTomorrow: false
    }));
    const nextToday = todayCandidates.find((candidate) => candidate.date.getTime() > now.getTime());
    if (nextToday) return nextToday;
    const fajr = tomorrow.timings.Fajr;
    return { key: 'Fajr', label: 'fajr', date: zonedDateTimeToDate(tomorrow.parts, fajr.hour, fajr.minute), fromTomorrow: true };
  }

  function createPrayerTile(prayer, time, isNext) {
    const tile = document.createElement('div');
    tile.className = `prayer-time${isNext ? ' is-next' : ''}`;
    tile.dataset.prayer = prayer.key;
    const name = document.createElement('span');
    name.className = 'prayer-time__name';
    name.textContent = t(prayer.label);
    const value = document.createElement('strong');
    value.className = 'prayer-time__value';
    value.textContent = time.value;
    tile.append(name, value);
    return tile;
  }

  function updateCountdown() {
    if (!prayerState) return;
    const now = new Date();
    if (dateKey(getZonedParts(now)) !== dateKey(prayerState.today.parts) || now.getTime() >= prayerState.next.date.getTime()) {
      fetchTimes();
      return;
    }
    const totalMinutes = Math.max(0, Math.ceil((prayerState.next.date.getTime() - now.getTime()) / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    $('#pt-countdown').textContent = hours > 0 ? t('hoursMinutes')(hours, minutes) : t('minutesOnly')(minutes);
  }

  function renderPrayerState() {
    if (!prayerState) return;
    const { today, next, city, updatedAt } = prayerState;
    $('#pt-content').hidden = false;
    $('#pt-city-name').textContent = cityLabel(city);
    $('#pt-date').textContent = formatDay(today.parts);
    $('#pt-data-date').textContent = formatDay(today.parts);
    $('#pt-next-name').textContent = t(next.label);
    $('#pt-last-update').textContent = formatUpdateTime(updatedAt);

    const grid = $('#pt-grid');
    grid.replaceChildren(...PRAYERS.map((prayer) => createPrayerTile(prayer, today.timings[prayer.key], !next.fromTomorrow && next.key === prayer.key)));

    const sunrise = $('#pt-sunrise');
    sunrise.replaceChildren();
    const sunriseLabel = document.createElement('span');
    sunriseLabel.textContent = t('sunriseInfo');
    const sunriseTime = document.createElement('strong');
    sunriseTime.textContent = today.timings.Sunrise.value;
    sunrise.append(sunriseLabel, sunriseTime);
    updateCountdown();
  }

  async function fetchTimes() {
    const select = $('#pt-city');
    const button = $('#pt-fetch');
    const city = select ? select.value : 'Rabat';
    const sequence = ++requestSequence;
    if (activeRequest) activeRequest.abort();
    activeRequest = new AbortController();

    prayerState = null;
    $('#pt-content').hidden = true;
    $('#pt-city-name').textContent = cityLabel(city);
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    setPrayerStatus(t('loading'), false);

    const startedParts = getZonedParts(new Date());
    const todayParts = { year: startedParts.year, month: startedParts.month, day: startedParts.day };
    const tomorrowParts = addDays(todayParts, 1);

    try {
      const [today, tomorrow] = await Promise.all([
        fetchPrayerDay(city, todayParts, activeRequest.signal),
        fetchPrayerDay(city, tomorrowParts, activeRequest.signal)
      ]);
      if (sequence !== requestSequence) return;
      if (dateKey(getZonedParts(new Date())) !== dateKey(todayParts)) {
        fetchTimes();
        return;
      }
      const updatedAt = new Date();
      prayerState = { city, today, tomorrow, updatedAt, next: findNextPrayer(today, tomorrow, updatedAt) };
      setPrayerStatus('', false);
      renderPrayerState();
    } catch (error) {
      if (error && error.name === 'AbortError') return;
      if (sequence !== requestSequence) return;
      setPrayerStatus(error && /Invalid|Unexpected|Malformed/.test(error.message) ? t('invalidData') : t('failed'), true);
    } finally {
      if (sequence === requestSequence) {
        button.disabled = false;
        button.removeAttribute('aria-busy');
        activeRequest = null;
      }
    }
  }

  function formatMoney(value) {
    return new Intl.NumberFormat(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  }

  function clearFieldError(input) {
    input.removeAttribute('aria-invalid');
    const error = $(`#${input.id}-error`);
    if (error) error.textContent = '';
  }

  function readNumber(input, positiveOnly) {
    clearFieldError(input);
    const raw = input.value.trim();
    let message = '';
    let value = Number.NaN;
    if (!raw) message = t('required');
    else {
      value = Number(raw);
      if (!Number.isFinite(value)) message = t('invalidNumber');
      else if (value < 0) message = t('nonNegative');
      else if (positiveOnly && value <= 0) message = t('positivePrice');
    }
    if (message) {
      input.setAttribute('aria-invalid', 'true');
      $(`#${input.id}-error`).textContent = message;
      return null;
    }
    return value;
  }

  function calculateEstimate(assets, debts, price, base) {
    const grams = base === 'silver' ? 595 : 85;
    const net = Math.max(0, assets - debts);
    const threshold = grams * price;
    const reached = net >= threshold;
    return { assets, debts, price, base, grams, net, threshold, reached, estimate: reached ? net * .025 : null };
  }

  function resultRow(term, value) {
    const wrapper = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = term;
    dd.textContent = value;
    wrapper.append(dt, dd);
    return wrapper;
  }

  function renderZakatResult() {
    if (!lastZakatResult) return;
    const result = $('#z-result');
    result.hidden = false;
    result.classList.toggle('is-below', !lastZakatResult.reached);
    result.replaceChildren();

    const title = document.createElement('h4');
    title.textContent = t('resultTitle');
    const list = document.createElement('dl');
    list.append(
      resultRow(t('assets'), `${formatMoney(lastZakatResult.assets)} MAD`),
      resultRow(t('debts'), `${formatMoney(lastZakatResult.debts)} MAD`),
      resultRow(t('net'), `${formatMoney(lastZakatResult.net)} MAD`),
      resultRow(t('nisab'), `${t(lastZakatResult.base)} — ${formatMoney(lastZakatResult.threshold)} MAD`)
    );
    if (lastZakatResult.reached) list.append(resultRow(t('estimate'), `${formatMoney(lastZakatResult.estimate)} MAD`));
    const status = document.createElement('p');
    status.className = 'zakat-result__status';
    status.textContent = lastZakatResult.reached ? t('reached') : t('below');
    result.append(title, list, status);
  }

  function computeZakat(event) {
    event.preventDefault();
    const assetsInput = $('#z-assets');
    const debtsInput = $('#z-debts');
    const priceInput = $('#z-price');
    const assets = readNumber(assetsInput, false);
    const debts = readNumber(debtsInput, false);
    const price = readNumber(priceInput, true);
    if ([assets, debts, price].some((value) => value === null)) {
      lastZakatResult = null;
      $('#z-result').hidden = true;
      const firstInvalid = $('#zakat-form [aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
      return;
    }
    const base = $('input[name="z-nisab-base"]:checked').value;
    lastZakatResult = calculateEstimate(assets, debts, price, base);
    renderZakatResult();
  }

  function handleLanguageChange() {
    window.setTimeout(() => {
      fillCities();
      if (prayerState) {
        prayerState.next = findNextPrayer(prayerState.today, prayerState.tomorrow, new Date());
        renderPrayerState();
      } else if ($('#pt-fetch').disabled) setPrayerStatus(t('loading'), false);
      if (lastZakatResult) renderZakatResult();
      ['z-assets', 'z-debts', 'z-price'].forEach((id) => {
        const input = $(`#${id}`);
        if (input && input.hasAttribute('aria-invalid')) readNumber(input, id === 'z-price');
      });
    }, 0);
  }

  function attach() {
    if (!$('#islamic-tools')) return;
    fillCities();
    $('#pt-city').addEventListener('change', fetchTimes);
    $('#pt-fetch').addEventListener('click', fetchTimes);
    $('#zakat-form').addEventListener('submit', computeZakat);
    ['z-assets', 'z-debts', 'z-price'].forEach((id) => {
      $(`#${id}`).addEventListener('input', (event) => {
        clearFieldError(event.currentTarget);
        lastZakatResult = null;
        $('#z-result').hidden = true;
      });
    });
    document.querySelectorAll('input[name="z-nisab-base"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        lastZakatResult = null;
        $('#z-result').hidden = true;
      });
    });
    document.querySelectorAll('.lang-btn').forEach((button) => button.addEventListener('click', handleLanguageChange));
    countdownTimer = window.setInterval(updateCountdown, 30000);
    fetchTimes();
  }

  window.addEventListener('pagehide', () => {
    if (activeRequest) activeRequest.abort();
    if (countdownTimer) window.clearInterval(countdownTimer);
  });

  window.AmjadIslamicToolsTest = Object.freeze({ getZonedParts, addDays, zonedDateTimeToDate, parseTime, calculateEstimate, findNextPrayer });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach);
  else attach();
})();
