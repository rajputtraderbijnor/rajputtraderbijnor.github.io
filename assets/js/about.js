/**
 * Rajput Traders - About page script.
 *
 * Page wording comes from data/pageSetting.json (page "about") and the card
 * lists from data/pageContentItem.json (page "about", sections timeline,
 * mission-vision, core-values, credentials, process). If those files are
 * missing, the built-in defaults below are used. Brands, categories,
 * products and delivery areas come from their own data files.
 */
(function () {
  'use strict';
  var RT = window.RT;
  if (!RT) return;
  var esc = RT.esc;
  var FOUNDED = 2000;

  var DEFAULTS = {
    'timeline': [
      { title: 'Business Started', description: 'Rajput Traders began supplying fresh bakery products to local retailers in 2000.' },
      { title: 'Distribution Expanded', description: 'Our delivery network grew to serve more retailers across Bijnor and nearby areas.' },
      { title: 'Growing Every Year', description: 'We continue to grow our brands, products, and delivery network every year.' }
    ],
    'mission-vision': [
      { icon: 'ri-flag-2-line', title: 'Our Mission', description: 'Deliver fresh bakery products to every retailer with reliable service, fair business practices, and long-term relationships.' },
      { icon: 'ri-eye-line', title: 'Our Vision', description: "Become Western Uttar Pradesh's most trusted bakery distribution network." }
    ],
    'core-values': [
      { icon: 'ri-shield-check-line', title: 'Trust' }, { icon: 'ri-leaf-line', title: 'Freshness' },
      { icon: 'ri-award-line', title: 'Quality' }, { icon: 'ri-truck-line', title: 'Fast Delivery' },
      { icon: 'ri-user-heart-line', title: 'Customer First' }
    ],
    'credentials': [
      { icon: 'ri-checkbox-circle-fill', title: 'GST Registered Business' },
      { icon: 'ri-checkbox-circle-fill', title: 'Wholesale Distributor' },
      { icon: 'ri-checkbox-circle-fill', title: 'Fresh Daily Supply' }
    ],
    'process': [
      { icon: 'ri-factory-line', title: 'Manufacturer' }, { icon: 'ri-home-8-line', title: 'Rajput Traders Warehouse' },
      { icon: 'ri-store-2-line', title: 'Retail Shop' }, { icon: 'ri-user-line', title: 'Customer' }
    ]
  };

  function byId(id) { return document.getElementById(id); }

  function items(rows, section) {
    var list = RT.itemsFor(rows, 'about', section);
    return list.length ? list : DEFAULTS[section];
  }

  function applySettings(s) {
    document.querySelectorAll('[data-setting]').forEach(function (el) {
      var v = s[el.getAttribute('data-setting')];
      if (v) el.textContent = v;
    });
  }

  function icon(name, cls) {
    return name ? '<i class="' + RT.safeIcon(name) + (cls ? ' ' + cls : '') + '" aria-hidden="true"></i>' : '';
  }

  function render(rows) {
    byId('about-timeline').innerHTML = items(rows, 'timeline').map(function (t) {
      return '<li class="about-timeline__step"><span class="about-timeline__step-title">' + esc(t.title) + '</span>' +
        (t.description ? '<p class="about-timeline__step-desc">' + esc(t.description) + '</p>' : '') + '</li>';
    }).join('');

    byId('about-mission-vision').innerHTML = items(rows, 'mission-vision').map(function (c, i) {
      return '<div class="about-mission-vision__card ' + (i % 2 === 0 ? 'reveal-left' : 'reveal-right') + '">' +
        icon(c.icon, 'about-mission-vision__icon') + '<h3>' + esc(c.title) + '</h3>' +
        (c.description ? '<p>' + esc(c.description) + '</p>' : '') + '</div>';
    }).join('');

    byId('about-values').innerHTML = items(rows, 'core-values').map(function (c) {
      return '<div class="about-value-card">' + icon(c.icon, 'about-value-card__icon') + '<h3>' + esc(c.title) + '</h3></div>';
    }).join('');

    byId('about-credentials').innerHTML = items(rows, 'credentials').map(function (c) {
      return '<li>' + icon(c.icon || 'ri-checkbox-circle-fill') + ' ' + esc(c.title) + '</li>';
    }).join('');

    var proc = items(rows, 'process');
    byId('about-process').innerHTML = proc.map(function (s, i) {
      return '<div class="about-process__step">' + icon(s.icon) + '<span>' + esc(s.title) + '</span></div>' +
        (i < proc.length - 1 ? '<i class="ri-arrow-down-line about-process__arrow" aria-hidden="true"></i>' : '');
    }).join('');
  }

  function renderLists(brands, categories, products, delivery, faqs, site) {
    var years = new Date().getFullYear() - FOUNDED;
    byId('stat-years').textContent = years + '+';

    var liveProducts = (products || []).filter(function (p) { return p && (p.status == null || p.status === 'published'); });
    var liveBrands = (brands || []).filter(function (b) { return b && b.isActive !== false; })
      .sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0) || a.name.localeCompare(b.name); });
    byId('stat-products').textContent = liveProducts.length ? liveProducts.length + '+' : '–';
    byId('stat-brands').textContent = liveBrands.length ? liveBrands.length + '+' : '–';

    if (liveBrands.length) {
      byId('about-brands').innerHTML = liveBrands.map(function (b) {
        var logo = b.logo ? '<img src="/assets/images/brands/' + encodeURIComponent(b.logo) + '" alt="' + esc(b.name) + '" class="showcase-brand__logo" loading="lazy" onerror="this.remove()">' : '';
        return '<div class="showcase-brand">' + logo + '<span class="showcase-brand__name">' + esc(b.name) + '</span></div>';
      }).join('');
      byId('about-brands-section').hidden = false;
    }

    var cats = (categories || []).slice().sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });
    if (cats.length) {
      byId('about-categories').innerHTML = cats.map(function (c) {
        return '<a class="delivery-chip" href="/products.html?category=' + encodeURIComponent(c.slug) + '">' + esc(c.name) + '</a>';
      }).join('');
      byId('about-categories-section').hidden = false;
    }

    var areas = delivery && Array.isArray(delivery.areas) ? delivery.areas.filter(Boolean) : [];
    if (areas.length) {
      byId('about-delivery-chips').innerHTML = areas.map(function (a) {
        return '<span class="delivery-chip"><i class="ri-map-pin-2-line" aria-hidden="true"></i> ' + esc(a) + '</span>';
      }).join('');
      byId('about-delivery-chips').hidden = false;
    }

    var f = (faqs || []).filter(function (x) { return x && x.question && x.isPublished !== false; });
    f.sort(function (a, b) { return (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0) || (a.sortOrder || 0) - (b.sortOrder || 0); });
    if (f.length) {
      byId('about-faqs').innerHTML = f.slice(0, 3).map(function (q) {
        return '<details class="faq-item"><summary class="faq-item__question">' + esc(q.question) + '</summary>' +
          '<div class="faq-item__answer"><p>' + RT.escWithBreaks(q.answer) + '</p></div></details>';
      }).join('');
      byId('about-faq-section').hidden = false;
    }

    if (site && site.gstNumber) {
      var g = byId('about-gst');
      g.textContent = 'GST No. ' + site.gstNumber;
      g.hidden = false;
    }
  }

  function arr(x) { return Array.isArray(x) ? x : []; }

  Promise.all([
    RT.getData('pageSetting'), RT.getData('pageContentItem'), RT.getData('brands'), RT.getData('categories'),
    RT.getData('products'), RT.getData('delivery'), RT.getData('faqs'), RT.siteReady
  ]).then(function (r) {
    applySettings(RT.settingsFor(r[0], 'about'));
    render(arr(r[1]));
    renderLists(arr(r[2]), arr(r[3]), arr(r[4]), r[5], arr(r[6]), r[7]);
    RT.bind(r[7], document);
    RT.initReveal();
  });
})();
