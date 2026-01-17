// Amjad Association Website - Main JavaScript File

// Language Management
const LANGUAGE_STORAGE_KEY = 'amjad_language';
const DEFAULT_LANGUAGE = 'ar';

const translations = window.TRANSLATIONS || { ar: {}, en: {}, fr: {} };
const supportedLanguages = Object.keys(translations);

function getStoredLanguage() {
    try {
        return localStorage.getItem(LANGUAGE_STORAGE_KEY);
    } catch (error) {
        return null;
    }
}

function storeLanguage(lang) {
    try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch (error) {
        // Ignore storage errors (private mode, disabled storage, etc.).
    }
}

function normalizeLanguage(lang) {
    return supportedLanguages.includes(lang) ? lang : DEFAULT_LANGUAGE;
}

function setDocumentDirection(lang) {
    if (lang === 'ar') {
        document.documentElement.dir = 'rtl';
        document.body.classList.add('rtl');
        document.body.classList.remove('ltr');
    } else {
        document.documentElement.dir = 'ltr';
        document.body.classList.remove('rtl');
        document.body.classList.add('ltr');
    }
}

function setActiveLangButton(lang) {
    const langButtons = document.querySelectorAll('.lang-btn');
    langButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.lang === lang);
    });
}

let currentLanguage = normalizeLanguage(getStoredLanguage() || DEFAULT_LANGUAGE);

// Initialize the website
document.addEventListener('DOMContentLoaded', function() {
    initializeAnimations();
    initializeLanguageSwitcher();
    initializeScrollEffects();
    initializeForms();
    initializePhotoGallery();
    
    // Set initial language
    setDocumentDirection(currentLanguage);
    setActiveLangButton(currentLanguage);
    updateLanguage(currentLanguage);
});

// Language switching functionality
function initializeLanguageSwitcher() {
    const langButtons = document.querySelectorAll('.lang-btn');
    langButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const lang = this.dataset.lang;
            currentLanguage = normalizeLanguage(lang);
            storeLanguage(currentLanguage);
            updateLanguage(lang);
            
            setActiveLangButton(currentLanguage);
            setDocumentDirection(currentLanguage);
        });
    });
}

function updateLanguage(lang) {
    const htmlElements = document.querySelectorAll('[data-translate-html]');
    htmlElements.forEach(element => {
        if (!element.dataset.originalHtml) {
            element.dataset.originalHtml = element.innerHTML;
        }
        const key = element.dataset.translateHtml;
        const value = translations[lang] && translations[lang][key];
        if (value) {
            element.innerHTML = value;
        } else if (lang === 'ar' && element.dataset.originalHtml) {
            element.innerHTML = element.dataset.originalHtml;
        }
    });

    const elements = document.querySelectorAll('[data-translate]');
    elements.forEach(element => {
        const key = element.dataset.translate;
        const value = translations[lang] && translations[lang][key];
        const attrName = element.dataset.translateAttr;

        if (attrName) {
            if (!element.dataset.originalAttr) {
                element.dataset.originalAttr = element.getAttribute(attrName) || '';
            }
            if (value) {
                attrName.split(',').map(item => item.trim()).forEach(attr => {
                    if (attr) {
                        element.setAttribute(attr, value);
                    }
                });
            } else if (lang === 'ar' && element.dataset.originalAttr) {
                element.setAttribute(attrName, element.dataset.originalAttr);
            }
            return;
        }

        if ((element.tagName === 'INPUT' && element.type !== 'submit') || element.tagName === 'TEXTAREA') {
            if (!element.dataset.originalPlaceholder) {
                element.dataset.originalPlaceholder = element.placeholder || '';
            }
            if (value) {
                element.placeholder = value;
            } else if (lang === 'ar') {
                element.placeholder = element.dataset.originalPlaceholder;
            }
            return;
        }

        if (!element.dataset.originalText) {
            element.dataset.originalText = element.textContent;
        }

        if (value) {
            element.textContent = value;
        } else if (lang === 'ar') {
            element.textContent = element.dataset.originalText;
        }
    });

    // Update page title when it uses a translation key
    const titleElement = document.querySelector('title[data-translate]');
    if (titleElement) {
        if (!titleElement.dataset.originalText) {
            titleElement.dataset.originalText = titleElement.textContent;
        }
        const key = titleElement.dataset.translate;
        const value = translations[lang] && translations[lang][key];
        if (value) {
            titleElement.textContent = value;
        } else if (lang === 'ar') {
            titleElement.textContent = titleElement.dataset.originalText || titleElement.textContent;
        }
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
