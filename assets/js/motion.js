/**
 * Rajput Traders - scroll motion (loaded by site.js on every page).
 *
 *  1. Numbers that count up (.stat-counter__value)
 *  2. Parallax on the Home hero picture
 *  3. Same fade-up reveal as Home on every section of every page
 *
 * Card-by-card appearing is done in CSS (extras.css). Everything here is
 * skipped when the visitor has "reduce motion" turned on.
 */
(function () {
  'use strict';
  var GROUPS = '.reveal-scale, .about-credentials__list, .about-timeline, .faq-preview__list, .faq-accordion, .popular-faqs__list, .product-grid, .about-mission-vision__grid, .not-found-nav-grid, .about-process__flow, .brand-grid, .brands-grid';
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* 3. Every card / list item fades up by itself as it scrolls into view (like Home).
        Group containers lose their own fade, and each child gets one instead. */
  (function () {
    var own = '.reveal-up,.reveal-left,.reveal-right,.reveal-scale,.reveal-card';
    var skipTags = /^(SCRIPT|NOSCRIPT|STYLE|NAV|ASIDE)$/;

    // 3a. lone blocks (headings, paragraphs, CTAs) that have no reveal yet
    document.querySelectorAll('.site-main > section:not(.hero):not(.page-hero) > .container > *').forEach(function (el) {
      if (skipTags.test(el.tagName) || el.hidden) return;
      if (el.matches(own) || el.querySelector(own)) return;
      if (el.querySelector(GROUPS)) return;
      el.classList.add('reveal-up');
    });

    // 3b. groups of cards
    var GROUP_SEL = GROUPS;
    function tag(group) {
      var kids = Array.prototype.filter.call(group.children, function (c) { return !skipTags.test(c.tagName) && !c.hidden; });
      kids.forEach(function (c, i) {
        if (c.getAttribute('data-motion-item')) return;
        c.setAttribute('data-motion-item', '1');
        if (!c.matches(own)) c.classList.add('reveal-up');
        c.classList.remove('is-visible');
        c.style.transitionDelay = ((i % 4) * 70) + 'ms';
        c.addEventListener('transitionend', function clear(ev) {
          if (ev.propertyName === 'opacity') { c.style.transitionDelay = ''; c.removeEventListener('transitionend', clear); }
        });
      });
      if (window.RT && window.RT.initReveal) window.RT.initReveal(group);
    }
    document.querySelectorAll(GROUP_SEL).forEach(function (g) {
      g.classList.remove('reveal-scale', 'reveal-up', 'is-visible');
      g.style.opacity = ''; 
      tag(g);
      if ('MutationObserver' in window) new MutationObserver(function () { tag(g); }).observe(g, { childList: true });
    });
    if (window.RT && window.RT.initReveal) window.RT.initReveal();
  })();

  var ticking = false;
  var jobs = [];
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      jobs.forEach(function (j) { j(); });
    });
  }

  /* 1. count-up (reads the number already in the page, e.g. "25+") */
  function countUp(el) {
    var m = /^(\D*)(\d[\d,]*)(.*)$/.exec(el.textContent.trim());
    if (!m) return;
    var end = parseInt(m[2].replace(/,/g, ''), 10);
    if (!end || end > 100000) return;
    var t0 = null, dur = 1200;
    function step(t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = m[1] + Math.round(end * eased) + m[3];
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if ('IntersectionObserver' in window) {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { seen.unobserve(en.target); countUp(en.target); }
      });
    }, { threshold: 0.6 });
    document.querySelectorAll('.stat-counter__value').forEach(function (el) { seen.observe(el); });
    // numbers filled in later by page scripts
    var box = document.querySelector('.about-stats__grid');
    if (box) new MutationObserver(function () {
      box.querySelectorAll('.stat-counter__value').forEach(function (el) {
        if (!el.getAttribute('data-motion')) { el.setAttribute('data-motion', '1'); seen.observe(el); }
      });
    }).observe(box, { childList: true, subtree: true, characterData: true });
  }

  /* 2. hero parallax (Home) */
  var heroImg = document.querySelector('.hero__image img');
  var hero = document.querySelector('.hero');
  if (heroImg && hero) {
    jobs.push(function () {
      var r = hero.getBoundingClientRect();
      if (r.bottom < 0) return;
      var y = Math.min(48, Math.max(0, -r.top * 0.12));
      heroImg.style.translate = '0 ' + y.toFixed(1) + 'px';
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
})();
