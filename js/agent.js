(function(){
  const STORAGE_KEY = 'amjad_language';
  const $ = (sel, root=document)=>root.querySelector(sel);

  const UI_TEXT = {
    ar: {
      title: "مساعد أمجاد",
      hello: "أهلًا! أنا مساعد أمجاد (بدون إنترنت/بدون API). اسألني عن التطوع، العضوية، التبرع، الزكاة، أوقات الصلاة، المتجر، أو التواصل.",
      placeholder: "اكتب سؤالك هنا...",
      send: "إرسال",
      close: "إغلاق",
      chips: ["التطوع","العضوية","التبرع","المتجر","الصلاة","الزكاة","التواصل"]
    },
    en: {
      title: "Amjad Assistant",
      hello: "Hi! I'm the Amjad offline assistant (no API). Ask about volunteering, membership, donations, zakat, prayer times, shop, or contact.",
      placeholder: "Type your question...",
      send: "Send",
      close: "Close",
      chips: ["Volunteering","Membership","Donation","Shop","Prayer times","Zakat","Contact"]
    },
    fr: {
      title: "Assistant Amjad",
      hello: "Salut ! Je suis l’assistant Amjad hors-ligne (sans API). Demande sur le bénévolat, l’adhésion, les dons, la zakat, les heures de prière, la boutique ou le contact.",
      placeholder: "Écrivez votre question...",
      send: "Envoyer",
      close: "Fermer",
      chips: ["Bénévolat","Adhésion","Don","Boutique","Prières","Zakat","Contact"]
    }
  };

  const ANSWERS = {
    volunteering: {
      kw: ["تطوع","متطوع","volunteer","volunteering","bénévole","bénévolat"],
      ar: "للتطوع: افتح صفحة «الاتصال» واترك معلوماتك (الاسم/المدينة/رقم الهاتف) وسنتواصل معك. يمكنك أيضًا المشاركة في الأنشطة والبرامج حسب التوفر.",
      en: "To volunteer: go to the Contact page and leave your info (name/city/phone). You can join activities and programs based on availability.",
      fr: "Pour le bénévolat : allez à la page Contact et laissez vos infos (nom/ville/téléphone). Vous pouvez rejoindre nos activités selon la disponibilité."
    },
    membership: {
      kw: ["انخراط","عضوية","عضو","join","membership","adhésion","inscription"],
      ar: "للعضوية/الانخراط: تواصل معنا عبر صفحة «الاتصال»، أو أرسل رسالة للعنوان البريدي. سنشارك معك شروط الانخراط والوثائق المطلوبة.",
      en: "For membership: contact us via the Contact page or email. We'll share the membership requirements and documents.",
      fr: "Pour l’adhésion : contactez-nous via la page Contact ou par e-mail. Nous vous communiquerons les conditions et documents."
    },
    donation: {
      kw: ["تبرع","don","donate","donation","تبرعات","تبرعاتكم","soutien"],
      ar: "للتبرع: يمكنك دعم برامج الجمعية ماليًا أو عينيًا. تواصل معنا عبر صفحة «الاتصال» لتحديد الطريقة الأنسب (تبرع مباشر/مواد/خدمات).",
      en: "To donate: you can support our programs financially or in-kind. Contact us to choose the best method.",
      fr: "Pour faire un don : vous pouvez soutenir nos programmes financièrement ou en nature. Contactez-nous pour choisir la meilleure option."
    },
    zakat: {
      kw: ["زكاة","zakat","zakat al maal","zakât"],
      ar: "لحساب الزكاة: توجه للصفحة الرئيسية، قسم «الزكاة وأوقات الصلاة» وستجد حاسبة بسيطة (2.5% إذا بلغ المال النصاب).",
      en: "For zakat: go to the Home page section “Zakat & Prayer Times” for a simple calculator (2.5% if you reach nisab).",
      fr: "Pour la zakat : allez sur la page d’accueil, section « Zakat & Heures de prière » pour un calculateur (2,5% si le nisab est atteint)."
    },
    prayer: {
      kw: ["صلاة","اوقات الصلاة","الأذان","adhan","prayer","prayer times","prières","horaires"],
      ar: "أوقات الصلاة: في الصفحة الرئيسية، قسم «الزكاة وأوقات الصلاة»، اختر المدينة ثم اضغط «جلب أوقات اليوم».",
      en: "Prayer times: on the Home page, section “Zakat & Prayer Times”, pick a city then fetch today’s times.",
      fr: "Heures de prière : sur la page d’accueil, section « Zakat & Heures de prière », choisissez la ville puis récupérez les horaires."
    },
    shop: {
      kw: ["متجر","shop","boutique","t-shirt","cap","قبعة","تيشرت","تي شيرت"],
      ar: "متجر أمجاد: افتح صفحة «متجر أمجاد»، اختر المنتج والمقاس/اللون والكمية، ثم اضغط «طلب عبر واتساب».",
      en: "Amjad Shop: open the Shop page, choose product/size/color/qty, then “Order via WhatsApp”.",
      fr: "Boutique Amjad : ouvrez la page Boutique, choisissez produit/taille/couleur/quantité, puis “Commander via WhatsApp”."
    },
    sponsorship: {
      kw: ["رعاية","شراكة","sponsor","sponsorship","partenariat","sponsoring","csr"],
      ar: "الرعاية والشراكة (CSR): راسلنا عبر صفحة «الاتصال» وسنشارك معك ملف الرعاية والباقات المتاحة.",
      en: "Sponsorship (CSR): contact us via the Contact page and we will share our sponsorship packages.",
      fr: "Sponsoring (CSR) : contactez-nous via la page Contact, nous partagerons les packs disponibles."
    },
    contact: {
      kw: ["تواصل","اتصال","contact","adresse","email","phone","هاتف","بريد"],
      ar: "للتواصل: افتح صفحة «الاتصال». يمكنك مراسلتنا على: a.amjad.eos@gmail.com",
      en: "Contact: open the Contact page. Email: a.amjad.eos@gmail.com",
      fr: "Contact : ouvrez la page Contact. E-mail : a.amjad.eos@gmail.com"
    }
  };

  function getLang(){
    try { return localStorage.getItem(STORAGE_KEY) || 'ar'; } catch(e){ return 'ar'; }
  }

  function t(key){
    const lang = getLang();
    return (UI_TEXT[lang] && UI_TEXT[lang][key]) ? UI_TEXT[lang][key] : UI_TEXT.ar[key];
  }

  function bestAnswer(q){
    const text = (q||"").toLowerCase();
    for(const k of Object.keys(ANSWERS)){
      const item = ANSWERS[k];
      if(item.kw.some(w => text.includes(w.toLowerCase()))){
        const lang = getLang();
        return item[lang] || item.ar;
      }
    }
    const lang = getLang();
    if(lang==='en') return "I can help with: volunteering, membership, donations, zakat, prayer times, shop, contact.";
    if(lang==='fr') return "Je peux aider sur : bénévolat, adhésion, dons, zakat, prières, boutique, contact.";
    return "أقدر نعاونك في: التطوع، العضوية، التبرع، الزكاة، أوقات الصلاة، المتجر، التواصل.";
  }

  function el(tag, attrs={}, children=[]){
    const e=document.createElement(tag);
    Object.entries(attrs).forEach(([k,v])=>{
      if(k==='class') e.className=v;
      else if(k==='text') e.textContent=v;
      else e.setAttribute(k,v);
    });
    children.forEach(c=>e.appendChild(c));
    return e;
  }

  function addMessage(container, text, who){
    const msg = el('div', {class:`amjad-msg ${who}`, text});
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
  }

  function build(){
    if($('#amjad-agent-btn')) return;

    const btn = el('button', {id:'amjad-agent-btn', type:'button', 'aria-label':'Amjad Assistant'}, []);
    btn.innerHTML = '<i class="fas fa-comment-dots"></i>';

    const panel = el('div', {id:'amjad-agent-panel'}, []);
    const header = el('div', {id:'amjad-agent-header'}, []);
    const title = el('div', {id:'amjad-agent-title', text: t('title')}, []);
    const close = el('button', {id:'amjad-agent-close', type:'button', 'aria-label':t('close')}, []);
    close.innerHTML = '&times;';

    header.appendChild(title);
    header.appendChild(close);

    const body = el('div', {id:'amjad-agent-body'}, []);
    const messages = el('div', {id:'amjad-agent-messages'}, []);
    const quick = el('div', {id:'amjad-agent-quick'}, []);
    (UI_TEXT[getLang()]?.chips || UI_TEXT.ar.chips).forEach((label)=>{
      const chip = el('button', {type:'button', class:'amjad-chip', text: label}, []);
      chip.addEventListener('click', ()=>{
        addMessage(messages, label, 'user');
        addMessage(messages, bestAnswer(label), 'bot');
      });
      quick.appendChild(chip);
    });

    const form = el('div', {id:'amjad-agent-form'}, []);
    const input = el('input', {id:'amjad-agent-input', type:'text', placeholder: t('placeholder')}, []);
    const send = el('button', {id:'amjad-agent-send', type:'button', text: t('send')}, []);
    send.addEventListener('click', ()=>{
      const q = input.value.trim();
      if(!q) return;
      addMessage(messages, q, 'user');
      addMessage(messages, bestAnswer(q), 'bot');
      input.value='';
    });
    input.addEventListener('keydown', (e)=>{
      if(e.key==='Enter'){ e.preventDefault(); send.click(); }
    });

    form.appendChild(input);
    form.appendChild(send);

    body.appendChild(messages);
    body.appendChild(quick);
    body.appendChild(form);

    panel.appendChild(header);
    panel.appendChild(body);

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    function open(){ panel.classList.add('open'); }
    function closePanel(){ panel.classList.remove('open'); }

    btn.addEventListener('click', ()=>{
      if(panel.classList.contains('open')) closePanel(); else open();
    });
    close.addEventListener('click', closePanel);

    addMessage(messages, t('hello'), 'bot');

    // update UI on language switch buttons
    const langButtons = document.querySelectorAll('.lang-btn');
    langButtons.forEach(b=>{
      b.addEventListener('click', ()=>{
        // small timeout to allow main.js to update storage
        setTimeout(()=>{
          title.textContent = t('title');
          input.placeholder = t('placeholder');
          send.textContent = t('send');
          // rebuild chips
          quick.innerHTML='';
          (UI_TEXT[getLang()]?.chips || UI_TEXT.ar.chips).forEach((label)=>{
            const chip = el('button', {type:'button', class:'amjad-chip', text: label}, []);
            chip.addEventListener('click', ()=>{
              addMessage(messages, label, 'user');
              addMessage(messages, bestAnswer(label), 'bot');
            });
            quick.appendChild(chip);
          });
        }, 50);
      });
    });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', build);
  } else build();
})();
