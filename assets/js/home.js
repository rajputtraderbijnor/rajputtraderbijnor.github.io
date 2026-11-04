/**
 * Rajput Traders - Home page script.
 *
 * The HTML already contains default wording. This script replaces it with
 * values from the JSON files in /data (so content is edited on GitHub) and
 * fills the lists: featured categories, brands, why us, who we serve,
 * delivery areas and FAQs.
 */
(function () {
  'use strict';
  var RT = window.RT;
  if (!RT) return;

  var FEATURED = [
    { slug: 'bread', emoji: '🍞' },
    { slug: 'pav', emoji: '🥖' },
    { slug: 'burger-bun', emoji: '🍔' },
    { slug: 'kulcha', emoji: '🫓' },
    { slug: 'toast', emoji: '🍞' }
  ];
  var MAX_BRANDS = 6;
  var MAX_FAQS = 6;
  var esc = RT.esc;

  function byId(id) { return document.getElementById(id); }
  function sorted(rows) {
    return rows.slice().sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0) || String(a.name || '').localeCompare(String(b.name || '')); });
  }

  /* Text from data/page-settings: elements with data-setting="hero.title" */
  function applySettings(settings) {
    document.querySelectorAll('[data-setting]').forEach(function (el) {
      var v = settings[el.getAttribute('data-setting')];
      if (v) el.textContent = v;
    });
  }

  function renderCategories(categories) {
    var box = byId('home-categories');
    if (!box || !categories || !categories.length) return;
    var html = '';
    FEATURED.forEach(function (f) {
      var c = categories.filter(function (x) { return x.slug === f.slug; })[0];
      if (!c) return;
      html += '<a href="/products.html?category=' + encodeURIComponent(c.slug) + '" class="category-card">' +
        '<span class="category-card__icon" aria-hidden="true">' + f.emoji + '</span>' +
        '<span class="category-card__name">' + esc(c.name) + '</span></a>';
    });
    if (html) box.innerHTML = html;
  }

  function renderBrands(brands) {
    var box = byId('home-brands');
    if (!box) return;
    var list = sorted((brands || []).filter(function (b) { return b.isActive !== false; }));
    if (!list.length) return;
    var html = list.slice(0, MAX_BRANDS).map(function (b) {
      var logo = b.logo
        ? '<img src="/assets/images/brands/' + encodeURIComponent(b.logo) + '" alt="' + esc(b.name) + '" class="showcase-brand__logo" loading="lazy" onerror="this.remove()">'
        : '';
      return '<div class="showcase-brand">' + logo + '<span class="showcase-brand__name">' + esc(b.name) + '</span></div>';
    }).join('');
    if (list.length > MAX_BRANDS) html += '<div class="showcase-brand showcase-brand--more">and more brands…</div>';
    box.innerHTML = html;
  }

  function renderCards(boxId, rows, withText) {
    var box = byId(boxId);
    if (!box || !rows.length) return;
    box.innerHTML = rows.map(function (r) {
      var icon = '<i class="' + RT.safeIcon(r.icon) + (withText ? ' why-us__icon' : ' serve-card__icon') + '" aria-hidden="true"></i>';
      if (withText) {
        return '<div class="why-us__card">' + icon + '<h3>' + esc(r.title) + '</h3>' +
          (r.description ? '<p>' + esc(r.description) + '</p>' : '') + '</div>';
      }
      return '<div class="serve-card">' + icon + '<h3>' + esc(r.title) + '</h3></div>';
    }).join('');
  }

  function renderDelivery(delivery) {
    var chips = byId('home-delivery-chips');
    var text = byId('home-delivery-text');
    var areas = delivery && Array.isArray(delivery.areas) ? delivery.areas.filter(Boolean) : [];
    if (areas.length && chips) {
      chips.innerHTML = areas.map(function (a) {
        return '<span class="delivery-chip"><i class="ri-map-pin-2-line" aria-hidden="true"></i> ' + esc(a) + '</span>';
      }).join('');
      chips.hidden = false;
    } else if (text && !text.getAttribute('data-has-setting')) {
      text.textContent = 'We deliver fresh bakery products across Bijnor and nearby areas. Call or WhatsApp us to check delivery to your location.';
    }
  }

  function renderFaqs(faqs) {
    var section = byId('home-faq-section');
    var box = byId('home-faqs');
    if (!box) return;
    var list = (faqs || []).filter(function (f) { return f.isPublished !== false && f.question; });
    if (!list.length) { if (section) section.hidden = true; return; }
    list.sort(function (a, b) {
      return (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0) || (a.sortOrder || 0) - (b.sortOrder || 0);
    });
    box.innerHTML = list.slice(0, MAX_FAQS).map(function (f) {
      return '<details class="faq-item"><summary class="faq-item__question">' + esc(f.question) + '</summary>' +
        '<div class="faq-item__answer"><p>' + RT.escWithBreaks(f.answer) + '</p></div></details>';
    }).join('');
  }

  Promise.all([
    RT.getData('pageSetting'), RT.getData('pageContentItem'), RT.getData('categories'),
    RT.getData('brands'), RT.getData('faqs'), RT.getData('delivery'), RT.siteReady
  ]).then(function (r) {
    var settings = RT.settingsFor(r[0], 'home');
    if (settings['delivery-network.text']) byId('home-delivery-text').setAttribute('data-has-setting', '1');
    applySettings(settings);
    renderCategories(r[2]);
    renderBrands(r[3]);
    renderCards('home-why-us', RT.itemsFor(r[1], 'home', 'why-us'), true);
    renderCards('home-who-we-serve', RT.itemsFor(r[1], 'home', 'who-we-serve'), false);
    renderDelivery(r[5]);
    renderFaqs(r[4]);
    RT.bind(r[6], document);
    RT.initReveal();
  });
})();
