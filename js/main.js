// Amjad Association Website - Main JavaScript File

let currentLanguage = 'ar'; // Default to Arabic

const translations = {
  ar: {
    // Navigation
    home: 'الرئيسية',
    about: 'عن الجمعية',
    services: 'مجالات التدخل والشراكات',
    programs: 'برامجنا',
    news: 'الأخبار',
    contact: 'اتصل بنا',
    volunteer: 'التطوع',
    join: 'الانخراط',

    // Hero Section
    heroTitle: 'جمعية أمجاد للتربية والأعمال الاجتماعية',
    heroSubtitle: 'شعلة معارف.. جذور أمجاد',
    heroDescription:
      'جمعية أمجاد ترافق الأطفال والتلاميذ والشباب والأسر ببرامج تربوية وبيئية واجتماعية منفتحة على الشراكات.',

    // Quick Actions
    zakatHealth: 'المدارس الذكية الإيكولوجية والاجتماعية',
    warmthFeeding: 'أنشطة القيم والدعم التربوي',
    amjadAcademy: 'مخطط تحويل مدرسة إلى مدرسة ذكية في 6 أشهر',
    medrastiHilwa: 'فريق أصيل والمتطوعين',

    // Statistics
    yearsOfService: 'سنوات من الأثر',
    volunteersCount: 'متطوع ومتطوعة',
    beneficiariesCount: 'مستفيد ومستفيدة',
    projectsCount: 'برامج سنوية',

    // Programs
    programsTitle: 'برامجنا الرئيسية',
    iftarKhair: 'برنامج كأس إفريقيا 2025 للأطفال والتلاميذ',
    africanCup: 'ملف الرعاية والشراكات',
    cityMemory: 'فريق التطوع ومجلس الإدارة',
    tabeebGhalaba: 'دعم التلاميذ والأسر',

    // News Section
    latestNews: 'آخر المستجدات',
    readMore: 'المزيد من التفاصيل',

    // Footer
    followUs: 'تابعونا',
    contactInfo: 'معلومات الاتصال',

    // Contact Form
    fullName: 'الاسم الكامل',
    email: 'البريد الإلكتروني',
    phone: 'الهاتف/واتساب',
    message: 'الرسالة',
    sendMessage: 'إرسال الرسالة',

    // Volunteer Form
    volunteerWithUs: 'التطوع معنا',
    volunteerDesc: 'انضموا إلى فريق أصيل لتنشيط البرامج الميدانية ونشر قيم التطوع.',

    // Membership Form
    joinUs: 'الانخراط في الجمعية',
    joinDesc: 'كن عضواً مساهماً في برامج أمجاد وشارِك في صناعة الأثر.'
  },
  en: {
    // Navigation
    home: 'Home',
    about: 'About Amjad',
    services: 'Interventions & Partnerships',
    programs: 'Programs',
    news: 'News',
    contact: 'Contact',
    volunteer: 'Volunteer',
    join: 'Join',

    // Hero Section
    heroTitle: 'Amjad Association for Education & Social Work',
    heroSubtitle: 'A torch of knowledge, rooted in community',
    heroDescription:
      'We design smart-school, social and sports programs for children, students, youth and families.',

    // Quick Actions
    zakatHealth: 'Eco & social smart schools',
    warmthFeeding: 'Values & tutoring',
    amjadAcademy: '6-month smart school roadmap',
    medrastiHilwa: 'Aseel volunteer team',

    // Statistics
    yearsOfService: 'Years of impact',
    volunteersCount: 'Volunteers',
    beneficiariesCount: 'Beneficiaries',
    projectsCount: 'Yearly programs',

    // Programs
    programsTitle: 'Our main programs',
    iftarKhair: 'AFCON 2025 program for kids & students',
    africanCup: 'Sponsorship kit',
    cityMemory: 'Volunteer board',
    tabeebGhalaba: 'Student & family support',

    // News Section
    latestNews: 'Latest News',
    readMore: 'Read more',

    // Footer
    followUs: 'Follow Us',
    contactInfo: 'Contact Information',

    // Contact Form
    fullName: 'Full name',
    email: 'Email',
    phone: 'Phone / WhatsApp',
    message: 'Message',
    sendMessage: 'Send message',

    // Volunteer Form
    volunteerWithUs: 'Volunteer with us',
    volunteerDesc: 'Join Aseel’s volunteer crew and deliver our field activities.',

    // Membership Form
    joinUs: 'Join Amjad',
    joinDesc: 'Become a member and help deliver our programs.'
  },
  fr: {
    // Navigation
    home: 'Accueil',
    about: 'À propos',
    services: 'Champs d’action & partenariats',
    programs: 'Programmes',
    news: 'Actualités',
    contact: 'Contact',
    volunteer: 'Bénévolat',
    join: 'Adhésion',

    // Hero Section
    heroTitle: 'Association Amjad d’éducation et d’action sociale',
    heroSubtitle: 'Flamme du savoir, racines d’Amjad',
    heroDescription:
      'Nous concevons des programmes scolaires intelligents, sociaux et sportifs pour les enfants, élèves, jeunes et familles.',

    // Quick Actions
    zakatHealth: 'Écoles intelligentes éco & sociales',
    warmthFeeding: 'Valeurs & appui scolaire',
    amjadAcademy: 'Feuille de route 6 mois',
    medrastiHilwa: 'Équipe Aseel',

    // Statistics
    yearsOfService: 'Années d’impact',
    volunteersCount: 'Bénévoles',
    beneficiariesCount: 'Bénéficiaires',
    projectsCount: 'Programmes annuels',

    // Programs
    programsTitle: 'Nos programmes principaux',
    iftarKhair: 'Programme CAN 2025 pour enfants et élèves',
    africanCup: 'Dossier de sponsoring',
    cityMemory: 'Équipe de bénévoles',
    tabeebGhalaba: 'Appui scolaire et social',

    // News Section
    latestNews: 'Dernières nouvelles',
    readMore: 'Voir plus',

    // Footer
    followUs: 'Suivez-nous',
    contactInfo: 'Contacts',

    // Contact Form
    fullName: 'Nom complet',
    email: 'Email',
    phone: 'Téléphone / WhatsApp',
    message: 'Message',
    sendMessage: 'Envoyer',

    // Volunteer Form
    volunteerWithUs: 'Bénévolat avec nous',
    volunteerDesc: 'Rejoignez l’équipe Aseel et portez nos actions de terrain.',

    // Membership Form
    joinUs: 'Adhésion Amjad',
    joinDesc: 'Devenez membre et soutenez nos programmes.'
  }
};

// Initialize the website
document.addEventListener('DOMContentLoaded', function () {
  initializeAnimations();
  initializeLanguageSwitcher();
  initializeScrollEffects();
  initializeForms();
  initializePhotoGallery();

  // Set initial language
  updateLanguage(currentLanguage);
});

// Language switching functionality
function initializeLanguageSwitcher() {
  const langButtons = document.querySelectorAll('.lang-btn');
  langButtons.forEach((btn) => {
    btn.addEventListener('click', function () {
      const lang = this.dataset.lang;
      currentLanguage = lang;
      updateLanguage(lang);

      // Update button states
      langButtons.forEach((b) => b.classList.remove('active'));
      this.classList.add('active');

      // Update HTML direction for Arabic
      if (lang === 'ar') {
        document.documentElement.dir = 'rtl';
        document.body.classList.add('rtl');
      } else {
        document.documentElement.dir = 'ltr';
        document.body.classList.remove('rtl');
      }
    });
  });
}

function updateLanguage(lang) {
  const elements = document.querySelectorAll('[data-translate]');
  elements.forEach((element) => {
    const key = element.dataset.translate;
    if (translations[lang] && translations[lang][key]) {
      if (element.tagName === 'INPUT' && element.type !== 'submit') {
        element.placeholder = translations[lang][key];
      } else {
        element.textContent = translations[lang][key];
      }
    }
  });

  // Update page title
  const titleElement = document.querySelector('title');
  if (titleElement && translations[lang].heroTitle) {
    titleElement.textContent = translations[lang].heroTitle;
  }
}

// Initialize animations
function initializeAnimations() {
  // Animate statistics counters
  const counters = document.querySelectorAll('.counter');
  counters.forEach((counter) => {
    const target = parseInt(counter.dataset.target, 10);
    const duration = 2000;
    const increment = target / (duration / 16);
    let current = 0;

    const updateCounter = () => {
      if (current < target) {
        current += increment;
        counter.textContent = Math.ceil(current);
        requestAnimationFrame(updateCounter);
      } else {
        counter.textContent = target;
      }
    };

    // Start animation when element is visible
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          updateCounter();
          observer.unobserve(entry.target);
        }
      });
    });

    observer.observe(counter);
  });

  // Fade in animations
  const fadeElements = document.querySelectorAll('.fade-in');
  const fadeObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fade-in');
        }
      });
    },
    { threshold: 0.1 }
  );

  fadeElements.forEach((element) => {
    fadeObserver.observe(element);
  });
}

// Initialize scroll effects
function initializeScrollEffects() {
  // Smooth scrolling for navigation links
  const navLinks = document.querySelectorAll('a[href^="#"]');
  navLinks.forEach((link) => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  // Navbar background on scroll
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 100) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });
  }
}

// Initialize forms
function initializeForms() {
  const forms = document.querySelectorAll('form');
  forms.forEach((form) => {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // Show success message
      const successMessage = document.createElement('div');
      successMessage.className = 'alert alert-success mt-4';
      successMessage.textContent =
        currentLanguage === 'ar'
          ? 'تم إرسال النموذج بنجاح. سنعود إليكم في أقرب وقت.'
          : currentLanguage === 'en'
          ? 'Form submitted successfully. We will get back to you shortly.'
          : 'Formulaire soumis avec succès. Nous vous répondrons bientôt.';

      form.appendChild(successMessage);

      // Reset form after delay
      setTimeout(() => {
        form.reset();
        successMessage.remove();
      }, 3000);
    });
  });
}

// Initialize photo gallery
function initializePhotoGallery() {
  const galleryImages = document.querySelectorAll('.gallery-image');
  galleryImages.forEach((image) => {
    image.addEventListener('click', function () {
      const lightbox = document.createElement('div');
      lightbox.className =
        'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
      lightbox.innerHTML = `
                <div class="relative max-w-4xl max-h-full p-4">
                    <img src="${this.src}" alt="${this.alt}" class="max-w-full max-h-full object-contain">
                    <button class="absolute top-2 right-2 text-white text-2xl hover:text-gray-300" onclick="this.parentElement.parentElement.remove()">&times;</button>
                </div>
            `;
      document.body.appendChild(lightbox);

      lightbox.addEventListener('click', function (e) {
        if (e.target === lightbox) {
          lightbox.remove();
        }
      });
    });
  });
}

// Utility functions
function showComingSoon() {
  const message =
    currentLanguage === 'ar'
      ? 'سيتم نشر هذه الصفحة أو الملف قريبًا.'
      : currentLanguage === 'en'
      ? 'This page will be published soon.'
      : 'Cette page sera publiée bientôt.';
  alert(message);
}

// Mobile menu toggle
function toggleMobileMenu() {
  const mobileMenu = document.querySelector('.mobile-menu');
  if (mobileMenu) {
    mobileMenu.classList.toggle('hidden');
  }
}

// Newsletter subscription
function subscribeNewsletter() {
  const emailInput = document.querySelector('#newsletter-email');
  const email = emailInput ? emailInput.value : '';
  if (email) {
    alert(
      currentLanguage === 'ar'
        ? 'شكراً لانضمامكم إلى نشرتنا البريدية.'
        : currentLanguage === 'en'
        ? 'Thank you for subscribing to our newsletter!'
        : 'Merci pour votre inscription à notre newsletter.'
    );
    emailInput.value = '';
  }
}
