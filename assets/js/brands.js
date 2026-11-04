/**
 * Rajput Traders - Brands page script.
 *
 * Builds the brand cards from data/brands.json (product counts come from
 * data/products.json) and the FAQ preview from data/faqs.json.
 */
(function () {
  'use strict';
  var RT = window.RT;
  if (!RT) return;
  var esc = RT.esc;
  var MAX_FAQS = 3;

  function byId(id) { return document.getElementById(id); }

  function renderBrands(brands, products) {
    var counts = {};
    (products || []).forEach(function (p) {
      if (p && (p.status == null || p.status === 'published')) counts[p.brandId] = (counts[p.brandId] || 0) + 1;
    });
    var list = (brands || []).filter(function (b) { return b && b.name && b.isActive !== false; })
      .sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0) || a.name.localeCompare(b.name); });

    if (!list.length) { byId('brands-empty').hidden = false; return; }

    byId('brands-listing').innerHTML = list.map(function (b) {
      var n = counts[b.id] || 0;
      var logo = b.logo
        ? '<img src="/assets/images/brands/' + encodeURIComponent(b.logo) + '" alt="' + esc(b.name) + ' logo" class="brand-card__logo" loading="lazy" decoding="async" onerror="this.remove()">'
        : '';
      var url = '/products.html?brand=' + encodeURIComponent(b.slug);
      return '<article class="brand-card reveal-up">' + logo +
        '<h3 class="brand-card__name">' + esc(b.name) + '</h3>' +
        (b.description ? '<p class="brand-card__description">' + esc(b.description) + '</p>' : '') +
        '<p class="brand-card__count">' + n + ' Product' + (n === 1 ? '' : 's') + '</p>' +
        '<a href="' + url + '" class="brand-card__cta" aria-label="View products from ' + esc(b.name) + '">View Products</a>' +
        '</article>';
    }).join('');

    if (list.length > 1) {
      byId('brands-chips').innerHTML = list.map(function (b) {
        return '<a href="/products.html?brand=' + encodeURIComponent(b.slug) + '" class="chip">' + esc(b.name) + '</a>';
      }).join('');
      byId('brands-chips-section').hidden = false;
    }
  }

  function renderFaqs(faqs) {
    var list = (faqs || []).filter(function (f) { return f && f.question && f.isPublished !== false; });
    if (!list.length) return;
    list.sort(function (a, b) {
      return (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0) || (a.sortOrder || 0) - (b.sortOrder || 0);
    });
    byId('brands-faqs').innerHTML = list.slice(0, MAX_FAQS).map(function (f) {
      return '<details class="faq-item"><summary class="faq-item__question">' + esc(f.question) + '</summary>' +
        '<div class="faq-item__answer"><p>' + RT.escWithBreaks(f.answer) + '</p></div></details>';
    }).join('');
    byId('brands-faq-section').hidden = false;
  }

  Promise.all([RT.getData('brands'), RT.getData('products'), RT.getData('faqs'), RT.siteReady]).then(function (r) {
    renderBrands(Array.isArray(r[0]) ? r[0] : [], Array.isArray(r[1]) ? r[1] : []);
    renderFaqs(Array.isArray(r[2]) ? r[2] : []);
    RT.bind(r[3], document);
    RT.initReveal();
  });
})();
