/* ===================================================================
   help.js — interactions for the on-page Install Guide & FAQ
   (the .rpr-help article rendered below the generator in index.html)

   Loaded as an external file because the page CSP is `script-src 'self'`
   — inline scripts are blocked. Wrapped in an IIFE so nothing leaks into
   the global scope shared with generator.js.

   Provides: sticky-TOC active-section highlighting, platform/mode tabs,
   copy-to-clipboard on the sample embed code, and live FAQ search.
   =================================================================== */
(function () {
  'use strict';

  const root = document.querySelector('.rpr-help');
  if (!root) return;

  /* ---- Sticky TOC: highlight the section currently in view ---- */
  (function () {
    const links = Array.prototype.slice.call(root.querySelectorAll('.toc a[data-toc]'));
    const sections = [];
    links.forEach(function (l) {
      const id = l.getAttribute('href').slice(1);
      const el = document.getElementById(id);
      if (el) sections.push({ el: el, link: l });
    });
    if (!sections.length) return;

    function topOf(el) { return el.getBoundingClientRect().top + window.scrollY; }

    function onScroll() {
      const y = window.scrollY + 120;
      let current = sections[0];
      for (let i = 0; i < sections.length; i++) {
        if (topOf(sections[i].el) <= y) current = sections[i];
      }
      links.forEach(function (l) { l.classList.remove('active'); });
      if (current) current.link.classList.add('active');
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
  })();

  /* ---- Platform / display-mode tabs (scoped to nearest .step-body) ---- */
  root.querySelectorAll('.tab').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const name = btn.getAttribute('data-tab');
      const container = btn.closest('.step-body') || root;
      container.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
      container.querySelectorAll('.tabpanel').forEach(function (p) { p.classList.remove('active'); });
      btn.classList.add('active');
      const panel = container.querySelector('[data-panel="' + name + '"]');
      if (panel) panel.classList.add('active');
    });
  });

  /* ---- Copy-to-clipboard on the sample embed code ---- */
  root.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      const code = btn.closest('[data-copy-target]');
      if (!code) return;
      const text = code.innerText
        .replace(/^\s*Copy\s*/, '')
        .replace(/^\s*Copied!\s*/, '')
        .trim();
      function flash() {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(function () {
          btn.textContent = 'Copy';
          btn.classList.remove('copied');
        }, 1600);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(flash).catch(function () {
          btn.textContent = 'Press Ctrl+C';
        });
      } else {
        btn.textContent = 'Press Ctrl+C';
      }
    });
  });

  /* ---- Live FAQ search ---- */
  (function () {
    const input = document.getElementById('faqSearch');
    if (!input) return;
    const details = Array.prototype.slice.call(root.querySelectorAll('details.faq'));
    const groups = Array.prototype.slice.call(root.querySelectorAll('.faq-group'));

    input.addEventListener('input', function () {
      const q = input.value.trim().toLowerCase();
      if (!q) {
        details.forEach(function (d) { d.classList.remove('faq-hidden'); d.open = false; });
        groups.forEach(function (g) { g.classList.remove('faq-hidden'); });
        return;
      }
      groups.forEach(function (g) {
        let anyVisible = false;
        g.querySelectorAll('details.faq').forEach(function (d) {
          // textContent (not innerText) so closed answers are searchable too
          const match = d.textContent.toLowerCase().indexOf(q) !== -1;
          d.classList.toggle('faq-hidden', !match);
          d.open = match;
          if (match) anyVisible = true;
        });
        g.classList.toggle('faq-hidden', !anyVisible);
      });
    });
  })();
})();
