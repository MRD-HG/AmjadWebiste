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
    document.documentElement.lang = lang;
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
    initializeNavigationAccessibility();
    initializeIconLinkAccessibility();
    initializeScrollEffects();
    initializeFormAccessibility();
    initializePhotoGallery();
    initializeAmjadArchitecture();
    
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

function initializeNavigationAccessibility() {
    const mobileMenu = document.querySelector('.mobile-menu');
    const toggle = document.querySelector('button[onclick="toggleMobileMenu()"]');
    if (!mobileMenu || !toggle) return;

    if (!mobileMenu.id) mobileMenu.id = 'mobile-navigation';
    toggle.setAttribute('aria-controls', mobileMenu.id);
    toggle.setAttribute('aria-expanded', String(!mobileMenu.classList.contains('hidden')));

    mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
            toggle.setAttribute('aria-expanded', 'false');
        });
    });
}

function initializeIconLinkAccessibility() {
    const labels = {
        'fa-facebook': 'Facebook',
        'fa-instagram': 'Instagram',
        'fa-x': 'X',
        'fa-youtube': 'YouTube',
        'fa-tiktok': 'TikTok'
    };

    document.querySelectorAll('a').forEach(link => {
        if (link.textContent.trim() || link.hasAttribute('aria-label')) return;
        const icon = link.querySelector('i');
        if (!icon) return;
        const name = Object.keys(labels).find(className => icon.classList.contains(className));
        if (name) link.setAttribute('aria-label', labels[name]);
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
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Animate statistics counters
    const counters = document.querySelectorAll('.counter');
    counters.forEach(counter => {
        const target = parseInt(counter.dataset.target);
        if (reduceMotion || !('IntersectionObserver' in window)) {
            counter.textContent = target;
            return;
        }
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
    if (reduceMotion || !('IntersectionObserver' in window)) {
        fadeElements.forEach(element => element.classList.add('animate-fade-in'));
        return;
    }

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
                    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
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

// Associate existing labels with their controls and provide stable field names.
function initializeFormAccessibility() {
    let generatedId = 0;
    document.querySelectorAll('form label').forEach(label => {
        if (label.htmlFor || label.querySelector('input, select, textarea')) return;

        const group = label.parentElement;
        const control = group && group.querySelector('input, select, textarea');
        if (!control) return;

        if (!control.id) {
            generatedId += 1;
            control.id = `form-field-${generatedId}`;
        }
        if (!control.name) control.name = control.id;
        label.htmlFor = control.id;
    });
}

const CONTACT_EMAIL = 'contact@associationamjad.ma';

function getFallbackCopy() {
    if (currentLanguage === 'en') {
        return {
            notice: 'This website does not send forms directly. Use the email link below to review and send your information.',
            link: 'Continue by email',
            subject: 'Website request'
        };
    }
    if (currentLanguage === 'fr') {
        return {
            notice: "Ce site n’envoie pas les formulaires directement. Utilisez le lien ci-dessous pour vérifier et envoyer vos informations.",
            link: 'Continuer par e-mail',
            subject: 'Demande depuis le site'
        };
    }
    return {
        notice: 'الموقع لا يرسل النماذج مباشرة. استخدم رابط البريد أدناه لمراجعة معلوماتك وإرسالها.',
        link: 'المتابعة عبر البريد الإلكتروني',
        subject: 'طلب من موقع جمعية أمجاد'
    };
}

function collectFormLines(form) {
    const lines = [];
    form.querySelectorAll('input, select, textarea').forEach(control => {
        if (control.type === 'submit' || control.type === 'button' || control.type === 'hidden') return;
        if ((control.type === 'checkbox' || control.type === 'radio') && !control.checked) return;

        const explicitLabel = control.id ? form.querySelector(`label[for="${CSS.escape(control.id)}"]`) : null;
        const wrappingLabel = control.closest('label');
        const groupLabel = control.parentElement && control.parentElement.querySelector('.form-label, .variant-label');
        const label = (explicitLabel || wrappingLabel || groupLabel);
        const labelText = label ? label.textContent.trim() : (control.placeholder || control.name || control.type);
        const value = control.type === 'checkbox' || control.type === 'radio'
            ? (wrappingLabel ? wrappingLabel.textContent.trim() : control.value)
            : control.value.trim();

        if (value) lines.push(`${labelText}: ${value}`);
    });
    return lines;
}

function renderEmailFallback(form, subject, body) {
    const copy = getFallbackCopy();
    const previous = form.querySelector('.form-status');
    if (previous) previous.remove();

    const status = document.createElement('div');
    status.className = 'form-status';
    status.setAttribute('role', 'status');
    status.tabIndex = -1;

    const message = document.createElement('p');
    message.textContent = copy.notice;

    const link = document.createElement('a');
    link.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject || copy.subject)}&body=${encodeURIComponent(body || '')}`;
    link.textContent = `${copy.link} — ${CONTACT_EMAIL}`;

    status.append(message, link);
    form.appendChild(status);
    status.focus();
    return link;
}

function submitEmailFallback(event, formType) {
    event.preventDefault();
    const form = event.currentTarget || event.target;
    if (!form.checkValidity()) {
        form.reportValidity();
        return false;
    }

    const copy = getFallbackCopy();
    const type = formType ? ` — ${formType}` : '';
    const body = collectFormLines(form).join('\n');
    if (!body) {
        const previous = form.querySelector('.form-status');
        if (previous) previous.remove();
        const status = document.createElement('div');
        status.className = 'form-status';
        status.setAttribute('role', 'alert');
        status.textContent = currentLanguage === 'en'
            ? 'Enter your information before continuing.'
            : currentLanguage === 'fr'
                ? 'Saisissez vos informations avant de continuer.'
                : 'أدخل معلوماتك قبل المتابعة.';
        form.appendChild(status);
        return false;
    }
    renderEmailFallback(form, `${copy.subject}${type}`, body);
    return false;
}

// Initialize photo gallery
function initializePhotoGallery() {
    const galleryImages = document.querySelectorAll('.gallery-image');
    galleryImages.forEach(image => {
        image.tabIndex = 0;
        image.setAttribute('role', 'button');
        image.addEventListener('click', function() {
            // Simple lightbox effect
            const lightbox = document.createElement('div');
            lightbox.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
            lightbox.innerHTML = `
                <div class="relative max-w-4xl max-h-full p-4">
                    <img src="${this.src}" alt="${this.alt}" class="max-w-full max-h-full object-contain">
                    <button type="button" aria-label="Close image" class="absolute top-2 right-2 text-white text-2xl hover:text-gray-300" onclick="this.parentElement.parentElement.remove()">&times;</button>
                </div>
            `;
            document.body.appendChild(lightbox);
            
            // Close on background click
            lightbox.addEventListener('click', function(e) {
                if (e.target === lightbox) {
                    lightbox.remove();
                }
            });

            const closeButton = lightbox.querySelector('button');
            closeButton.focus();
            lightbox.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') lightbox.remove();
            });
        });
        image.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                image.click();
            }
        });
    });
}

// Shared body-architecture controls for program and news pages.
function initializeAmjadArchitecture() {
    document.querySelectorAll('[data-filter-scope]').forEach(scope => {
        const buttons = scope.querySelectorAll('[data-filter]');
        const section = scope.closest('section');
        const items = section ? section.querySelectorAll('[data-filter-item]') : [];

        buttons.forEach(button => {
            button.addEventListener('click', () => {
                const selected = button.dataset.filter;
                buttons.forEach(btn => btn.classList.toggle('is-active', btn === button));

                items.forEach(item => {
                    const values = (item.dataset.filterItem || '').split(/\s+/);
                    const shouldShow = selected === 'all' || values.includes(selected);
                    item.hidden = !shouldShow;
                });
            });
        });
    });

    const newsSearch = document.querySelector('[data-news-search]');
    if (newsSearch) {
        const newsSection = newsSearch.closest('section');
        const cards = newsSection ? newsSection.querySelectorAll('[data-news-title]') : [];

        newsSearch.addEventListener('input', () => {
            const term = newsSearch.value.trim().toLowerCase();
            cards.forEach(card => {
                const searchable = `${card.dataset.newsTitle || ''} ${card.textContent || ''}`.toLowerCase();
                card.hidden = term.length > 0 && !searchable.includes(term);
            });
        });
    }
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
        const button = document.querySelector('button[onclick="toggleMobileMenu()"]');
        if (button) button.setAttribute('aria-expanded', String(!mobileMenu.classList.contains('hidden')));
    }
}

// Newsletter subscription
function subscribeNewsletter(event) {
    return submitEmailFallback(event, 'newsletter');
}
