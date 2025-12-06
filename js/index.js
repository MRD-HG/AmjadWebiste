// js/main.js - improved accessibility & smooth scroll
document.addEventListener('DOMContentLoaded', function () {
  const navToggle = document.getElementById('nav-toggle');
  const mobileMenu = document.getElementById('mobile-menu');

  if (navToggle && mobileMenu) {
    navToggle.addEventListener('click', function () {
      const expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      mobileMenu.classList.toggle('hidden');
    });

    // close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!mobileMenu.contains(e.target) && !navToggle.contains(e.target) && !mobileMenu.classList.contains('hidden')) {
        mobileMenu.classList.add('hidden');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });

    // close with escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !mobileMenu.classList.contains('hidden')) {
        mobileMenu.classList.add('hidden');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.focus();
      }
    });
  }

  // smooth scroll for internal anchors
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', function (e) {
      const target = this.getAttribute('href').slice(1);
      if (!target) return;
      const el = document.getElementById(target);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({behavior: 'smooth', block: 'start'});
        // if mobile menu is open close it
        if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
          mobileMenu.classList.add('hidden');
          navToggle.setAttribute('aria-expanded', 'false');
        }
      }
    });
  });

  // add loading=lazy to large images that don't already have it
  document.querySelectorAll('img').forEach(img => {
    if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
  });
});
