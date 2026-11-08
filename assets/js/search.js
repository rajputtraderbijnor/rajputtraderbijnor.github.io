/**
 * Rajput Traders - Site search (search.html)
 * Searches products, brands, FAQs and main pages in the browser using the
 * same data files as the rest of the site. URL: /search.html?q=bread
 */
(function () {
  'use strict';
  var RT = window.RT;
  if (!RT) return;
  var esc = RT.esc;

  var PAGES = [
    { title: 'Products', url: '/products.html', text: 'wholesale bakery products bread pav bun rusk cake biscuit' },
    { title: 'Brands', url: '/brands.html', text: 'brands we supply distributor' },
    { title: 'About Us', url: '/about.html', text: 'about rajput traders since 2000 bijnor history trust' },
    { title: 'Bulk and Event Orders', url: '/events.html', text: 'bulk event wedding party caterer order quote advance' },
    { title: 'Delivery Network', url: '/delivery.html', text: 'delivery towns areas network bijnor nearby' },
    { title: 'Gallery', url: '/gallery.html', text: 'gallery photos pictures' },
    { title: 'Contact', url: '/contact.html', text: 'contact phone whatsapp address directions map hours' },
    { title: 'FAQ', url: '/faq.html', text: 'faq questions help answers' },
    { title: 'Privacy Policy', url: '/privacy.html', text: 'privacy policy data' },
    { title: 'Terms & Conditions', url: '/terms.html', text: 'terms conditions' },
    { title: 'Return & Refund Policy', url: '/returns.html', text: 'return refund replacement policy' }
  ];
  var POPULAR = ['Bread', 'Pav', 'Rusk', 'Bun', 'Delivery', 'Minimum order', 'Bulk order', 'Contact'];
  var TYPES = [['all', 'All'], ['product', 'Products'], ['brand', 'Brands'], ['faq', 'FAQs'], ['page', 'Pages']];
  var LIMIT = 40;

  var index = [];
  var state = { q: '', type: 'all' };
  var $ = function (id) { return document.getElementById(id); };

  function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9ऀ-ॿ ]+/g, ' ').replace(/\s+/g, ' ').trim(); }

  function build(r) {
    var brands = {}, cats = {};
    (r[1] || []).forEach(function (b) { brands[b.id] = b; });
    (r[2] || []).forEach(function (c) { cats[c.id] = c; });
    (r[0] || []).forEach(function (p) {
      if (!p || !p.name || (p.status != null && p.status !== 'published')) return;
      var b = brands[p.brandId], c = cats[p.categoryId];
      var file = (Array.isArray(p.images) && p.images.length ? p.images[0] : p.coverImage) || '';
      index.push({
        type: 'product', title: p.name, id: p.id,
        sub: [b && b.name, c && c.name, p.packagingInfo].filter(Boolean).join(' · '),
        url: '/product.html?slug=' + encodeURIComponent(p.slug || p.id),
        img: file ? '/assets/images/products/' + encodeURIComponent(file) : '/assets/images/product-placeholder.svg',
        hay: norm(p.name + ' ' + (b ? b.name : '') + ' ' + (c ? c.name : '') + ' ' + (p.packagingInfo || '') + ' ' + (p.description || '')),
        head: norm(p.name)
      });
    });
    (r[1] || []).forEach(function (b) {
      if (!b || !b.name || (b.status != null && b.status !== 'published')) return;
      index.push({
        type: 'brand', title: b.name, sub: 'Brand', url: '/products.html?brand=' + encodeURIComponent(b.id),
        img: b.logo ? '/assets/images/brands/' + encodeURIComponent(b.logo) : '', hay: norm(b.name + ' ' + (b.description || '')), head: norm(b.name)
      });
    });
    (r[3] || []).forEach(function (f) {
      if (!f || !f.question || f.isPublished === false) return;
      index.push({
        type: 'faq', title: f.question, sub: String(f.answer || '').slice(0, 110) + (String(f.answer || '').length > 110 ? '...' : ''),
        url: '/faq.html', hay: norm(f.question + ' ' + f.answer), head: norm(f.question)
      });
    });
    PAGES.forEach(function (p) {
      index.push({ type: 'page', title: p.title, sub: 'Page', url: p.url, hay: norm(p.title + ' ' + p.text), head: norm(p.title) });
    });
  }

  function score(item, words) {
    var s = 0;
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (item.hay.indexOf(w) === -1) return 0;
      if (item.head.indexOf(w) === 0) s += 6;
      else if (item.head.indexOf(w) !== -1) s += 4;
      else s += 1;
    }
    return s;
  }

  function run() {
    var q = norm(state.q);
    var words = q ? q.split(' ') : [];
    var hits = [];
    if (words.length) {
      index.forEach(function (it) { var s = score(it, words); if (s) hits.push({ it: it, s: s }); });
      hits.sort(function (a, b) { return b.s - a.s; });
    }
    return hits.map(function (h) { return h.it; });
  }

  function chips(hits) {
    var counts = { all: hits.length };
    hits.forEach(function (h) { counts[h.type] = (counts[h.type] || 0) + 1; });
    var el = $('search-chips');
    el.hidden = hits.length === 0;
    el.innerHTML = TYPES.filter(function (t) { return t[0] === 'all' || counts[t[0]]; }).map(function (t) {
      return '<button type="button" class="search-chip' + (state.type === t[0] ? ' is-active' : '') + '" data-type="' + t[0] + '">' + t[1] + ' (' + (counts[t[0]] || 0) + ')</button>';
    }).join('');
  }

  function row(it) {
    var icon = { product: 'ri-shopping-basket-2-line', brand: 'ri-award-line', faq: 'ri-question-line', page: 'ri-file-text-line' }[it.type];
    var lead = it.img
      ? '<span class="search-item__img"><img src="' + it.img + '" alt="" loading="lazy" onerror="this.onerror=null;this.src=\'/assets/images/product-placeholder.svg\'"></span>'
      : '<span class="search-item__icon"><i class="' + icon + '" aria-hidden="true"></i></span>';
    var add = it.type === 'product'
      ? '<button type="button" class="search-item__add" data-add-list="' + esc(it.id) + '" aria-label="Add ' + esc(it.title) + ' to enquiry list"><i class="ri-add-line" aria-hidden="true"></i><span>ADD TO LIST</span></button>'
      : '';
    return '<li class="search-item"><a class="search-item__link" href="' + it.url + '">' + lead +
      '<span class="search-item__text"><span class="search-item__title">' + esc(it.title) + '</span>' +
      (it.sub ? '<span class="search-item__sub">' + esc(it.sub) + '</span>' : '') + '</span></a>' + add + '</li>';
  }

  function render() {
    var q = state.q.trim();
    $('search-clear').hidden = !q;
    $('search-start').hidden = !!q;
    if (!q) {
      $('search-chips').hidden = true; $('search-count').textContent = ''; $('search-results').innerHTML = ''; $('search-none').hidden = true;
      return;
    }
    var hits = run();
    chips(hits);
    var shown = state.type === 'all' ? hits : hits.filter(function (h) { return h.type === state.type; });
    $('search-none').hidden = hits.length > 0;
    $('search-count').textContent = hits.length ? shown.length + (shown.length === 1 ? ' result' : ' results') + ' for "' + q + '"' : '';
    $('search-results').innerHTML = shown.length ? '<ul class="search-list">' + shown.slice(0, LIMIT).map(row).join('') + '</ul>' : '';
    document.title = 'Search: ' + q + ' | Rajput Traders';
  }

  function setUrl() {
    try {
      var u = state.q.trim() ? '/search.html?q=' + encodeURIComponent(state.q.trim()) : '/search.html';
      history.replaceState(null, '', u);
    } catch (e) { /* ignore */ }
  }

  function start() {
    var input = $('search-input');
    $('search-popular').innerHTML = POPULAR.map(function (w) { return '<button type="button" class="search-chip" data-q="' + esc(w) + '">' + esc(w) + '</button>'; }).join('');
    var q0 = new URLSearchParams(location.search).get('q') || '';
    input.value = q0; state.q = q0;
    input.addEventListener('input', function () { state.q = input.value; state.type = 'all'; render(); setUrl(); });
    $('search-form').addEventListener('submit', function (e) { e.preventDefault(); input.blur(); });
    $('search-clear').addEventListener('click', function () { input.value = ''; state.q = ''; render(); setUrl(); input.focus(); });
    document.addEventListener('click', function (e) {
      var c = e.target.closest('[data-type]');
      if (c) { state.type = c.getAttribute('data-type'); render(); return; }
      var p = e.target.closest('[data-q]');
      if (p) { input.value = p.getAttribute('data-q'); state.q = input.value; state.type = 'all'; render(); setUrl(); }
    });
    render();
    if (!q0) input.focus();
  }

  Promise.all([RT.getData('products'), RT.getData('brands'), RT.getData('categories'), RT.getData('faqs')]).then(function (r) {
    build(r);
    start();
  });
})();
