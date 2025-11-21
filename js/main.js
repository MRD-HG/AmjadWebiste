// Amjad Association Website - Main JavaScript File

// Language Management
let currentLanguage = 'ar'; // Default to Arabic

const translations = {
    ar: {
        // Navigation
        home: 'الرئيسية',
        about: 'عن الجمعية',
        services: 'الخدمات الإلكترونية',
        programs: 'الخدمات والبرامج',
        news: 'الأخبار',
        contact: 'الاتصال',
        volunteer: 'التطوع',
        join: 'الإنخراط',
        
        // Hero Section
        heroTitle: 'جمعية أمجاد للتربية والأعمال الاجتماعية',
        heroSubtitle: 'سنوات من العطاء... وباقين مستمرين',
        heroDescription: 'نؤمن أن كل فرد قادر على إحداث فرق. انضم إلينا وساهم في بناء مجتمع يسوده التعاون والتكافل.',
        
        // Quick Actions
        zakatHealth: 'زكاة الصحة',
        warmthFeeding: 'دفء وإطعام',
        amjadAcademy: 'أكاديمية أمجاد',
        medrastiHilwa: 'مدرستي الحلوة',
        
        // Statistics
        yearsOfService: 'سنوات من العطاء',
        volunteersCount: 'متطوع',
        beneficiariesCount: 'مستفيد',
        projectsCount: 'مشروع',
        
        // Programs
        programsTitle: 'برامجنا وخدماتنا',
        iftarKhair: 'إفطار الخير',
        africanCup: 'كأس إفريقيا',
        cityMemory: 'ذاكرة المدينة',
        tabeebGhalaba: 'طبيب الغلبة',
        
        // News Section
        latestNews: 'آخر الأخبار',
        readMore: 'إقرأ المزيد',
        
        // Footer
        followUs: 'تابعونا',
        contactInfo: 'معلومات الاتصال',
        
        // Contact Form
        fullName: 'الاسم الكامل',
        email: 'البريد الإلكتروني',
        phone: 'رقم الهاتف',
        message: 'الرسالة',
        sendMessage: 'إرسال الرسالة',
        
        // Volunteer Form
        volunteerWithUs: 'تطوع معنا',
        volunteerDesc: 'كن جزءًا من فريقنا التطوعي وأسهم في خدمة المجتمع',
        
        // Membership Form
        joinUs: 'انضم إلينا',
        joinDesc: 'كن عضوًا في جمعيتنا وساهم في تحقيق أهدافنا التنموية'
    },
    en: {
        // Navigation
        home: 'Home',
        about: 'About Us',
        services: 'E-Services',
        programs: 'Programs',
        news: 'News',
        contact: 'Contact',
        volunteer: 'Volunteer',
        join: 'Join Us',
        
        // Hero Section
        heroTitle: 'Amjad Association for Education and Social Work',
        heroSubtitle: 'Years of Giving... And We Continue',
        heroDescription: 'We believe every individual can make a difference. Join us and help build a community of cooperation and solidarity.',
        
        // Quick Actions
        zakatHealth: 'Zakat Health',
        warmthFeeding: 'Warmth & Feeding',
        amjadAcademy: 'Amjad Academy',
        medrastiHilwa: 'My Sweet School',
        
        // Statistics
        yearsOfService: 'Years of Service',
        volunteersCount: 'Volunteers',
        beneficiariesCount: 'Beneficiaries',
        projectsCount: 'Projects',
        
        // Programs
        programsTitle: 'Our Programs & Services',
        iftarKhair: 'Iftar Al-Khair',
        africanCup: 'African Cup',
        cityMemory: 'City Memory',
        tabeebGhalaba: 'Doctor for All',
        
        // News Section
        latestNews: 'Latest News',
        readMore: 'Read More',
        
        // Footer
        followUs: 'Follow Us',
        contactInfo: 'Contact Information',
        
        // Contact Form
        fullName: 'Full Name',
        email: 'Email',
        phone: 'Phone Number',
        message: 'Message',
        sendMessage: 'Send Message',
        
        // Volunteer Form
        volunteerWithUs: 'Volunteer With Us',
        volunteerDesc: 'Join our volunteer team and contribute to community service',
        
        // Membership Form
        joinUs: 'Join Us',
        joinDesc: 'Become a member of our association and contribute to our development goals'
    },
    fr: {
        // Navigation
        home: 'Accueil',
        about: 'À Propos',
        services: 'Services Numériques',
        programs: 'Programmes',
        news: 'Actualités',
        contact: 'Contact',
        volunteer: 'Bénévolat',
        join: 'Rejoignez-nous',
        
        // Hero Section
        heroTitle: 'Association Amjad pour l\'Éducation et le Travail Social',
        heroSubtitle: 'Des années de don... Et nous continuons',
        heroDescription: 'Nous croyons que chaque individu peut faire une différence. Rejoignez-nous et aidons à construire une communauté de coopération et de solidarité.',
        
        // Quick Actions
        zakatHealth: 'Zakat Santé',
        warmthFeeding: 'Chaleur et Nourriture',
        amjadAcademy: 'Académie Amjad',
        medrastiHilwa: 'Mon École Douce',
        
        // Statistics
        yearsOfService: 'Années de Service',
        volunteersCount: 'Bénévoles',
        beneficiariesCount: 'Bénéficiaires',
        projectsCount: 'Projets',
        
        // Programs
        programsTitle: 'Nos Programmes et Services',
        iftarKhair: 'Iftar Al-Khair',
        africanCup: 'Coupe d\'Afrique',
        cityMemory: 'Mémoire de la Ville',
        tabeebGhalaba: 'Médecin pour Tous',
        
        // News Section
        latestNews: 'Dernières Actualités',
        readMore: 'Lire Plus',
        
        // Footer
        followUs: 'Suivez-nous',
        contactInfo: 'Informations de Contact',
        
        // Contact Form
        fullName: 'Nom Complet',
        email: 'Email',
        phone: 'Numéro de Téléphone',
        message: 'Message',
        sendMessage: 'Envoyer le Message',
        
        // Volunteer Form
        volunteerWithUs: 'Bénévole Avec Nous',
        volunteerDesc: 'Rejoignez notre équipe de bénévoles et contribuez au service communautaire',
        
        // Membership Form
        joinUs: 'Rejoignez-nous',
        joinDesc: 'Devenez membre de notre association et contribuez à nos objectifs de développement'
    }
};

// Initialize the website
document.addEventListener('DOMContentLoaded', function() {
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
    langButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const lang = this.dataset.lang;
            currentLanguage = lang;
            updateLanguage(lang);
            
            // Update button states
            langButtons.forEach(b => b.classList.remove('active'));
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
    elements.forEach(element => {
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
    counters.forEach(counter => {
        const target = parseInt(counter.dataset.target);
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
            entries.forEach(entry => {
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
    const fadeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in');
            }
        });
    }, { threshold: 0.1 });
    
    fadeElements.forEach(element => {
        fadeObserver.observe(element);
    });
}

// Initialize scroll effects
function initializeScrollEffects() {
    // Smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
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
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Show success message
            const successMessage = document.createElement('div');
            successMessage.className = 'alert alert-success mt-4';
            successMessage.textContent = currentLanguage === 'ar' ? 'تم إرسال النموذج بنجاح!' : 
                                       currentLanguage === 'en' ? 'Form submitted successfully!' :
                                       'Formulaire soumis avec succès!';
            
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
    galleryImages.forEach(image => {
        image.addEventListener('click', function() {
            // Simple lightbox effect
            const lightbox = document.createElement('div');
            lightbox.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
            lightbox.innerHTML = `
                <div class="relative max-w-4xl max-h-full p-4">
                    <img src="${this.src}" alt="${this.alt}" class="max-w-full max-h-full object-contain">
                    <button class="absolute top-2 right-2 text-white text-2xl hover:text-gray-300" onclick="this.parentElement.parentElement.remove()">&times;</button>
                </div>
            `;
            document.body.appendChild(lightbox);
            
            // Close on background click
            lightbox.addEventListener('click', function(e) {
                if (e.target === lightbox) {
                    lightbox.remove();
                }
            });
        });
    });
}

// Utility functions
function showComingSoon() {
    const message = currentLanguage === 'ar' ? 'سيتم إطلاق هذه الصفحة قريباً' :
                   currentLanguage === 'en' ? 'This page will be launched soon' :
                   'Cette page sera bientôt lancée';
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
    const email = document.querySelector('#newsletter-email').value;
    if (email) {
        alert(currentLanguage === 'ar' ? 'شكراً للاشتراك في نشرتنا الإخبارية!' :
              currentLanguage === 'en' ? 'Thank you for subscribing to our newsletter!' :
              'Merci de vous être abonné à notre newsletter!');
        document.querySelector('#newsletter-email').value = '';
    }
}