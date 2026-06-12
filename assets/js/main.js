// Raúl Carneros · Portfolio
// Vanilla JS: scroll reveals, nav state, mobile menu, project dialogs.

(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Scroll reveals (IntersectionObserver, no scroll listeners) ----------
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  } else {
    // Anything already in the initial viewport reveals right away (staggered
    // via --i); the observer only handles elements below the fold.
    var belowFold = revealEls.filter(function (el) {
      var rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
        el.classList.add('in');
        return false;
      }
      return true;
    });
    if (belowFold.length) {
      var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
      belowFold.forEach(function (el) { revealObserver.observe(el); });
    }
  }

  // ---------- Active section in nav ----------
  var navLinks = document.querySelectorAll('.nav-menu a[href^="#"]');
  var sections = [];
  navLinks.forEach(function (link) {
    var section = document.querySelector(link.getAttribute('href'));
    if (section) sections.push({ link: link, section: section });
  });
  if ('IntersectionObserver' in window && sections.length) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (l) { l.removeAttribute('aria-current'); });
        var match = sections.find(function (s) { return s.section === entry.target; });
        if (match) match.link.setAttribute('aria-current', 'true');
        // The hero is observed too: back at the top, no link stays active.
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    sections.forEach(function (s) { sectionObserver.observe(s.section); });
    var hero = document.querySelector('.hero');
    if (hero) sectionObserver.observe(hero);
  }

  // ---------- Mobile menu ----------
  var header = document.querySelector('.nav');
  var toggle = document.querySelector('.nav-toggle');
  if (toggle && header) {
    toggle.addEventListener('click', function () {
      var open = header.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    navLinks.forEach(function (link) {
      link.addEventListener('click', function () {
        header.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ---------- Project dialogs ----------
  document.querySelectorAll('[data-dialog]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var dlg = document.getElementById(btn.getAttribute('data-dialog'));
      if (dlg && typeof dlg.showModal === 'function') dlg.showModal();
    });
  });

  document.querySelectorAll('.dlg').forEach(function (dlg) {
    var closeBtn = dlg.querySelector('[data-close]');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () { dlg.close(); });
    }
    // Click on the backdrop (outside the frame) closes the dialog.
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg) dlg.close();
    });
  });
})();
