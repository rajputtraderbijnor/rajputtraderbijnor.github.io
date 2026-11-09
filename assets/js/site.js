/**
 * Rajput Traders - shared site script (static site)
 *
 * Builds the header, footer, floating WhatsApp button and mobile bottom nav
 * on every page, fills phone/WhatsApp/address links from data/site.json,
 * and exposes helpers on window.RT for page scripts.
 *
 * Change business details in data/site.json - not in this file.
 */
(function () {
  'use strict';

  /* File version. Do not edit by hand: run  python3 tools/bump.py  before each push. */
  var ASSET_V = '9';

  document.documentElement.classList.add('js');

  /* Fallback details, used only if data/site.json cannot be loaded. */
  var FALLBACK = {
    phone: '9927637594',
    whatsapp: '919927637594',
    email: 'rajputtraderbijnor@gmail.com',
    address: "Rajput Traders, Ring Road, near Saint Mary's School, Bijnor, Uttar Pradesh, India",
    businessHoursText: 'Open daily, 6:00 AM – 10:00 PM',
    gstNumber: '',
    mapUrl: 'https://maps.app.goo.gl/nxFcbxE5aT9cv1zm8?g_st=ac',
    lat: 29.388162,
    lng: 78.148803
  };

  var DEFAULT_WA_TEXT = 'Hello Rajput Traders, I would like to know more about your wholesale bakery products.';

  /* Navigation. Home is "/", every other page is a .html file. */
  var NAV_MAIN = [
    { href: '/', label: 'Home', icon: 'ri-home-4-line', match: function (p) { return p === '/' || p === '/index.html'; } },
    { href: '/products.html', label: 'Products', icon: 'ri-store-2-line', match: starts('/products') },
    { href: '/brands.html', label: 'Brands', icon: 'ri-award-line', match: starts('/brands') },
    { href: '/about.html', label: 'About Us', icon: 'ri-information-line', match: starts('/about') },
    { href: '/contact.html', label: 'Contact', icon: 'ri-phone-line', match: starts('/contact') }
  ];
  var NAV_MORE = [
    { href: '/gallery.html', label: 'Gallery', icon: 'ri-image-2-line', match: starts('/gallery') },
    { href: '/events.html', label: 'Bulk Orders', icon: 'ri-calendar-event-line', match: starts('/events') },
    { href: '/delivery.html', label: 'Delivery Network', icon: 'ri-truck-line', match: starts('/delivery') },
    { href: '/faq.html', label: 'FAQ', icon: 'ri-question-line', match: starts('/faq') }
  ];
  var NAV_LEGAL = [
    { href: '/privacy.html', label: 'Privacy Policy', icon: 'ri-shield-check-line', match: starts('/privacy') },
    { href: '/terms.html', label: 'Terms & Conditions', icon: 'ri-file-text-line', match: starts('/terms') },
    { href: '/returns.html', label: 'Return & Refund Policy', icon: 'ri-arrow-go-back-line', match: starts('/returns') }
  ];

  function starts(prefix) {
    return function (p) { return p.indexOf(prefix) === 0; };
  }

  var path = location.pathname || '/';

  /* ---------------- helpers ---------------- */

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* Escape, then turn line breaks into <br> (for text typed in JSON files). */
  function escWithBreaks(v) {
    return esc(v).replace(/\r?\n/g, '<br>');
  }

  function digits(v) { return String(v || '').replace(/\D/g, ''); }

  function intlPhone(v) {
    var d = digits(v);
    if (d.length === 10) d = '91' + d;
    return d;
  }

  function formatPhone(v) {
    var d = intlPhone(v);
    if (d.length === 12 && d.indexOf('91') === 0) {
      return '+91 ' + d.slice(2, 7) + ' ' + d.slice(7);
    }
    return v ? String(v) : '';
  }

  function telUrl(v) { return 'tel:+' + intlPhone(v); }

  function waUrl(site, text) {
    var num = intlPhone((site && site.whatsapp) || FALLBACK.whatsapp);
    return 'https://wa.me/' + num + '?text=' + encodeURIComponent(text || DEFAULT_WA_TEXT);
  }

  // Directions go to the real "RAJPUT TRADERS" Google Maps listing (so the name shows, not a
  // nearby street address). To use a different link, put it in data/site.json as "directionsUrl".
  var PLACE_ID = '0x390beffe93423987:0x986745e8266851a5';
  function directionsUrl(site) {
    if (site.directionsUrl) return site.directionsUrl;
    return 'https://www.google.com/maps/dir//RAJPUT+TRADERS/@' + site.lat + ',' + site.lng + ',17z/data=!4m8!4m7!1m0!1m5!1m1!1s' +
      PLACE_ID + '!2m2!1d' + site.lng + '!2d' + site.lat;
  }

  /* Icons come from JSON files, so accept only safe Remix Icon class names. */
  function safeIcon(name, fallback) {
    return /^ri-[a-z0-9-]+$/.test(String(name || '')) ? name : (fallback || 'ri-checkbox-circle-line');
  }

  var cache = {};
  /* Loads /data/<name>.json. Resolves to null if missing or invalid. */
  function getData(name) {
    if (!cache[name]) {
      cache[name] = fetch('/data/' + name + '.json', { cache: 'no-cache' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    }
    return cache[name];
  }

  /* pageSetting rows -> { key: value } for one page */
  function settingsFor(rows, page) {
    var out = {};
    (rows || []).forEach(function (r) {
      if (r && r.page === page && r.key) out[r.key] = r.value;
    });
    return out;
  }

  /* pageContentItem rows for one page + section, active only, sorted */
  function itemsFor(rows, page, section) {
    return (rows || [])
      .filter(function (r) {
        return r && r.page === page && r.section === section && r.isActive !== false;
      })
      .sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });
  }

  /* Merged business details (fallback + data/site.json). */
  var siteReady = getData('site').then(function (s) {
    var site = {};
    Object.keys(FALLBACK).forEach(function (k) { site[k] = FALLBACK[k]; });
    if (s) Object.keys(s).forEach(function (k) {
      if (k.charAt(0) !== '_' && s[k] !== '' && s[k] != null) site[k] = s[k];
    });
    return site;
  });

  /* ---------------- binding ---------------- */

  /*
   * data-cta="call | whatsapp | directions | map | email"  -> sets href
   * data-wa-text="..."  (optional, with data-cta="whatsapp") custom message
   * data-site-text="phone | address | hours | gst | email | minorder" -> sets text
   * data-prefix="..." (optional) text put before the value
   */
  function bind(site, root) {
    root = root || document;
    var list = root.querySelectorAll('[data-cta]');
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      var what = el.getAttribute('data-cta');
      if (what === 'call') {
        el.setAttribute('href', telUrl(site.phone));
      } else if (what === 'whatsapp') {
        el.setAttribute('href', waUrl(site, el.getAttribute('data-wa-text')));
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener');
      } else if (what === 'directions') {
        el.setAttribute('href', directionsUrl(site));
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener');
      } else if (what === 'map') {
        el.setAttribute('href', site.mapUrl);
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener');
      } else if (what === 'email') {
        if (site.email) { el.setAttribute('href', 'mailto:' + site.email); el.hidden = false; }
        else el.hidden = true;
      }
    }

    list = root.querySelectorAll('[data-site-text]');
    for (var j = 0; j < list.length; j++) {
      var node = list[j];
      var key = node.getAttribute('data-site-text');
      var text = '';
      if (key === 'phone') text = formatPhone(site.phone);
      else if (key === 'address') text = site.address || '';
      else if (key === 'hours') text = site.businessHoursText || '';
      else if (key === 'gst') text = site.gstNumber || '';
      else if (key === 'email') text = site.email || '';
      else if (key === 'minorder') text = site.minOrderValue ? '\u20B9' + site.minOrderValue : '';
      if (text) {
        node.textContent = (node.getAttribute('data-prefix') || '') + text;
        node.hidden = false;
      } else if (key === 'gst' || key === 'email') {
        node.hidden = true;
      }
    }
  }

  /* ---------------- header ---------------- */

  function navLink(item, extraClass) {
    var active = item.match(path);
    return '<a href="' + item.href + '" class="navbar__link' + (active ? ' navbar__link--active' : '') +
      (extraClass ? ' ' + extraClass : '') + '"' + (active ? ' aria-current="page"' : '') + '>' +
      (item.icon ? '<i class="navbar__ico ' + item.icon + '" aria-hidden="true"></i>' : '') + esc(item.label) + '</a>';
  }

  function buildHeader() {
    var host = document.getElementById('site-header');
    if (!host) return;

    var main = NAV_MAIN.map(function (i) { return '<li>' + navLink(i) + '</li>'; }).join('');
    var mainInMenu = NAV_MAIN.map(function (i) {
      return '<li class="navbar__dropdown-item--primary">' + navLink(i) + '</li>';
    }).join('');
    var more = NAV_MORE.map(function (i) { return '<li>' + navLink(i) + '</li>'; }).join('');
    var legal = NAV_LEGAL.map(function (i) { return '<li>' + navLink(i) + '</li>'; }).join('');

    host.innerHTML =
      '<nav class="navbar" aria-label="Primary">' +
        '<a href="/" class="navbar__brand">' +
          '<img src="/assets/images/logo.webp" alt="Rajput Traders" class="navbar__logo" width="54" height="56">' +
          '<span class="navbar__brand-name">Rajput Traders<small>Since 2000</small></span>' +
        '</a>' +
        '<ul class="navbar__links">' +
          '<li class="navbar__links-close-item"><button type="button" class="navbar__links-close" data-mobile-nav-close aria-label="Close menu"><i class="ri-close-line" aria-hidden="true"></i></button></li>' +
          main +
          '<li class="navbar__more">' +
            '<button type="button" class="navbar__more-toggle" aria-haspopup="true" aria-expanded="false" aria-label="More pages"><i class="ri-more-2-fill navbar__more-icon" aria-hidden="true"></i></button>' +
            '<div class="navbar__dropdown-backdrop" data-dropdown-close></div>' +
            '<ul class="navbar__dropdown">' +
              '<button type="button" class="navbar__dropdown-close" data-dropdown-close aria-label="Close menu"><i class="ri-close-line" aria-hidden="true"></i></button>' +
              mainInMenu +
              '<li class="navbar__dropdown-divider navbar__dropdown-item--primary" role="separator"></li>' +
              more +
              '<li><a href="#settings" class="navbar__link" data-open-settings><i class="navbar__ico ri-settings-3-line" aria-hidden="true"></i>Settings</a></li>' +
              '<li class="navbar__dropdown-divider" role="separator"></li>' +
              '<li class="navbar__dropdown-label">Legal &amp; Policies</li>' +
              legal +
            '</ul>' +
          '</li>' +
        '</ul>' +
        '<div class="navbar__actions">' +
          '<a href="/search.html" class="navbar__search" aria-label="Search the website"><i class="ri-search-line" aria-hidden="true"></i></a>' +
          '<button type="button" class="navbar__settings" data-open-settings aria-label="Settings"><i class="ri-settings-3-line" aria-hidden="true"></i></button>' +
          '<button type="button" class="navbar__toggle" aria-label="Open menu" aria-expanded="false"><i class="ri-more-2-fill" aria-hidden="true"></i></button>' +
        '</div>' +
      '</nav>';
  }

  /* ---------------- footer, floating button, bottom nav ---------------- */

  function buildFooter() {
    var host = document.getElementById('site-footer');
    if (!host) return;
    var year = new Date().getFullYear();
    function fl(href, label, match) {
      var on = match(path);
      return '<a href="' + href + '" class="footer-link' + (on ? ' footer-link--active' : '') + '">' + label + '</a>';
    }
    host.innerHTML =
      '<div class="footer-grid">' +
        '<div class="footer-col footer-col--about">' +
          '<h3>Rajput Traders</h3>' +
          '<p>Your trusted bakery distribution partner since 2000, proudly serving Bijnor, Uttar Pradesh and surrounding regions.</p>' +
        '</div>' +
        '<div class="footer-col footer-col--links">' +
          '<h3>Quick Links</h3>' +
          fl('/products.html', 'Products', starts('/products')) +
          fl('/brands.html', 'Brands', starts('/brands')) +
          fl('/about.html', 'About Us', starts('/about')) +
          fl('/faq.html', 'FAQ', starts('/faq')) +
          fl('/contact.html', 'Contact', starts('/contact')) +
          fl('/privacy.html', 'Privacy Policy', starts('/privacy')) +
          fl('/terms.html', 'Terms &amp; Conditions', starts('/terms')) +
          fl('/returns.html', 'Return &amp; Refund Policy', starts('/returns')) +
        '</div>' +
        '<div class="footer-col footer-col--contact">' +
          '<h3><a href="/contact.html">Contact</a></h3>' +
          '<a data-cta="call" href="' + telUrl(FALLBACK.phone) + '"><i class="ri-phone-line" aria-hidden="true"></i> <span data-site-text="phone">' + formatPhone(FALLBACK.phone) + '</span></a>' +
          '<a data-cta="email" href="#" hidden><i class="ri-mail-line" aria-hidden="true"></i> <span data-site-text="email"></span></a>' +
          '<a data-cta="map" href="' + esc(FALLBACK.mapUrl) + '" target="_blank" rel="noopener"><i class="ri-map-pin-line" aria-hidden="true"></i> <span data-site-text="address">' + esc(FALLBACK.address) + '</span></a>' +
          '<p><i class="ri-time-line" aria-hidden="true"></i> <span data-site-text="hours">' + esc(FALLBACK.businessHoursText) + '</span></p>' +
          '<p class="footer-gst" data-site-text="gst" data-prefix="GST No. " hidden></p>' +
        '</div>' +
      '</div>' +
      '<div class="footer-bottom">&copy; ' + year + ' Rajput Traders.<br>Wholesale Bakery Distribution Partner.<br>All Rights Reserved.</div>';
  }

  function buildFloating() {
    var home = path === '/' || path === '/index.html';
    var prod = starts('/products')(path);
    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<div class="floating-actions">' +
        '<a data-cta="whatsapp" href="#" class="floating-btn floating-btn--whatsapp" aria-label="Chat on WhatsApp" title="WhatsApp"><i class="ri-whatsapp-line" aria-hidden="true"></i></a>' +
      '</div>' +
      '<nav class="mobile-bottom-nav" aria-label="Mobile">' +
        '<a href="/" class="mobile-bottom-nav__item' + (home ? ' mobile-bottom-nav__item--active' : '') + '" aria-label="Home"><i class="' + (home ? 'ri-home-5-fill' : 'ri-home-5-line') + '" aria-hidden="true"></i><span>Home</span></a>' +
        '<a href="/products.html" class="mobile-bottom-nav__item' + (prod ? ' mobile-bottom-nav__item--active' : '') + '" aria-label="Products"><i class="' + (prod ? 'ri-store-2-fill' : 'ri-store-2-line') + '" aria-hidden="true"></i><span>Products</span></a>' +
        '<a data-cta="call" href="' + telUrl(FALLBACK.phone) + '" class="mobile-bottom-nav__item" aria-label="Call us"><i class="ri-phone-line" aria-hidden="true"></i><span>Call</span></a>' +
        '<a data-cta="whatsapp" href="#" class="mobile-bottom-nav__item" aria-label="Chat on WhatsApp"><i class="ri-whatsapp-line" aria-hidden="true"></i><span>WhatsApp</span></a>' +
      '</nav>';
    while (wrap.firstChild) document.body.appendChild(wrap.firstChild);
  }

  /* ---------------- behaviour ---------------- */

  function initMobileNav() {
    var toggle = document.querySelector('.navbar__toggle');
    var links = document.querySelector('.navbar__links');
    if (!toggle || !links) return;
    function setOpen(open) {
      links.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    }
    toggle.addEventListener('click', function () { setOpen(!links.classList.contains('is-open')); });
    links.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
    var closeBtn = links.querySelector('[data-mobile-nav-close]');
    if (closeBtn) closeBtn.addEventListener('click', function () { setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
  }

  function initMoreDropdown() {
    var wrapper = document.querySelector('.navbar__more');
    if (!wrapper) return;
    var btn = wrapper.querySelector('.navbar__more-toggle');
    function setOpen(open) {
      wrapper.classList.toggle('navbar__more--open', open);
      btn.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('body--drawer-open', open);
    }
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(!wrapper.classList.contains('navbar__more--open'));
    });
    wrapper.querySelectorAll('.navbar__dropdown a, [data-dropdown-close]').forEach(function (el) {
      el.addEventListener('click', function () { setOpen(false); });
    });
    document.addEventListener('click', function (e) { if (!wrapper.contains(e.target)) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
  }

  function initHeaderShadow() {
    var header = document.querySelector('.site-header');
    if (!header) return;
    function update() { header.classList.toggle('site-header--scrolled', window.scrollY > 10); }
    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  /* Fade/slide elements in once. Safe to call again after rendering new content. */
  function initReveal(root) {
    root = root || document;
    var els = root.querySelectorAll('.reveal-up, .reveal-left, .reveal-right, .reveal-scale, .reveal-card');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); obs.unobserve(en.target); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
    els.forEach(function (el) {
      if (el.getAttribute('data-reveal-seen')) return;
      el.setAttribute('data-reveal-seen', '1');
      obs.observe(el);
    });
  }

  /* Hide floating buttons while the footer is on screen. */
  function initFloatingHide() {
    var fab = document.querySelector('.floating-actions');
    var footer = document.querySelector('.site-footer');
    if (!fab || !footer || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { fab.classList.toggle('floating-actions--hidden', en.isIntersecting); });
    }).observe(footer);
  }

  /* ---------------- start ---------------- */

  buildHeader();
  buildFooter();
  buildFloating();
  initMobileNav();
  initMoreDropdown();
  initHeaderShadow();
  initFloatingHide();

  // Scroll animations (progress bar, count-up, parallax, pinned steps)
  (function () {
    var m = document.createElement('script');
    m.src = '/assets/js/motion.js?v=' + ASSET_V;
    m.defer = true;
    document.body.appendChild(m);
  })();

  // Settings panel (dark mode, Hindi, text size, report a problem)
  (function () {
    var e = document.createElement('script');
    e.src = '/assets/js/settings.js?v=' + ASSET_V;
    e.defer = true;
    document.body.appendChild(e);
  })();

  // Enquiry list (add products, send list on WhatsApp)
  (function () {
    var e = document.createElement('script');
    e.src = '/assets/js/enquiry.js?v=' + ASSET_V;
    e.defer = true;
    document.body.appendChild(e);
  })();

  siteReady.then(function (site) { bind(site, document); });
  bind(FALLBACK, document);
  initReveal();

  window.RT = {
    esc: esc, escWithBreaks: escWithBreaks, safeIcon: safeIcon, getData: getData,
    settingsFor: settingsFor, itemsFor: itemsFor, siteReady: siteReady, bind: bind,
    initReveal: initReveal, waUrl: waUrl, telUrl: telUrl, formatPhone: formatPhone,
    DEFAULT_WA_TEXT: DEFAULT_WA_TEXT
  };
})();
