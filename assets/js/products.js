/**
 * Rajput Traders - Products page script.
 *
 * Reads data/products.json, data/categories.json and data/brands.json, then
 * shows searchable, filterable product cards. Every card has a
 * "Contact for price" button that opens WhatsApp with the product name typed in.
 *
 * Filters are kept in the address bar (?category=pav&brand=loaf&q=bun), so a
 * filtered page can be bookmarked or shared, and the Home page category cards
 * open this page already filtered.
 */
(function () {
  'use strict';
  var RT = window.RT;
  if (!RT) return;

  var PAGE_SIZE = 12;
  // true  = list every category, even ones with no products yet
  // false = list only categories that have at least one product
  var SHOW_EMPTY_CATEGORIES = true;
  var esc = RT.esc;

  var state = { q: '', category: '', brand: '', sort: 'featured', shown: PAGE_SIZE };
  var all = [];        // visible products, with category/brand names attached
  var categories = [];
  var brands = [];
  var site = null;

  function $(id) { return document.getElementById(id); }

  /* ---------- load + prepare data ---------- */

  function prepare(products, cats, brs) {
    var catById = {}, brandById = {};
    cats.forEach(function (c) { catById[c.id] = c; });
    brs.forEach(function (b) { brandById[b.id] = b; });
    return products
      .filter(function (p) { return p && p.name && (p.status == null || p.status === 'published'); })
      .map(function (p) {
        var c = catById[p.categoryId] || null;
        var b = brandById[p.brandId] || null;
        return {
          id: p.id, name: p.name, slug: p.slug || '',
          category: c, brand: b,
          packagingInfo: p.packagingInfo || '', description: p.description || '',
          coverImage: p.coverImage || '', price: p.price || null,
          isSeasonal: !!p.isSeasonal, sortOrder: p.sortOrder || 0,
          search: (p.name + ' ' + (b ? b.name : '') + ' ' + (c ? c.name : '') + ' ' + (p.packagingInfo || '')).toLowerCase()
        };
      });
  }

  /* ---------- URL <-> state ---------- */

  function readUrl() {
    var u = new URLSearchParams(location.search);
    state.q = (u.get('q') || '').trim();
    state.category = u.get('category') || '';
    state.brand = u.get('brand') || '';
    state.sort = u.get('sort') || 'featured';
  }

  function writeUrl() {
    var u = new URLSearchParams();
    if (state.q) u.set('q', state.q);
    if (state.category) u.set('category', state.category);
    if (state.brand) u.set('brand', state.brand);
    if (state.sort && state.sort !== 'featured') u.set('sort', state.sort);
    var qs = u.toString();
    try { history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '')); } catch (e) { /* ignore */ }
  }

  /* ---------- filter panel + chips ---------- */

  function radio(name, value, label, checked) {
    return '<label class="product-filters__option"><input type="radio" name="' + name + '" value="' + esc(value) + '"' +
      (checked ? ' checked' : '') + '><span>' + esc(label) + '</span></label>';
  }

  function renderFilterOptions() {
    var usedCats = {}, usedBrands = {};
    all.forEach(function (p) {
      if (p.category) usedCats[p.category.slug] = 1;
      if (p.brand) usedBrands[p.brand.slug] = 1;
    });
    var catList = categories.filter(function (c) { return SHOW_EMPTY_CATEGORIES || usedCats[c.slug]; })
      .sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0) || a.name.localeCompare(b.name); });
    var brandList = brands.filter(function (b) { return usedBrands[b.slug] && b.isActive !== false; })
      .sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0) || a.name.localeCompare(b.name); });

    var catBox = $('filter-categories');
    catBox.innerHTML = '<legend class="product-filters__legend">Category</legend>' +
      radio('category', '', 'All', !state.category) +
      catList.map(function (c) { return radio('category', c.slug, c.name, state.category === c.slug); }).join('');

    var brandBox = $('filter-brands');
    brandBox.innerHTML = '<legend class="product-filters__legend">Brand</legend>' +
      radio('brand', '', 'All', !state.brand) +
      brandList.map(function (b) { return radio('brand', b.slug, b.name, state.brand === b.slug); }).join('');
    brandBox.hidden = brandList.length < 2;

    var chips = '<a href="?" data-chip="" class="chip' + (!state.category ? ' chip--active' : '') + '">All</a>' +
      catList.map(function (c) {
        return '<a href="?category=' + encodeURIComponent(c.slug) + '" data-chip="' + esc(c.slug) + '" class="chip' +
          (state.category === c.slug ? ' chip--active' : '') + '">' + esc(c.name) + '</a>';
      }).join('');
    $('chip-scroll').innerHTML = chips;
    $('chip-bar').hidden = catList.length < 2;
  }

  /* ---------- filtering, sorting, cards ---------- */

  function filtered() {
    var q = state.q.toLowerCase();
    var terms = q ? q.split(/\s+/) : [];
    var list = all.filter(function (p) {
      if (state.category && !(p.category && p.category.slug === state.category)) return false;
      if (state.brand && !(p.brand && p.brand.slug === state.brand)) return false;
      for (var i = 0; i < terms.length; i++) if (p.search.indexOf(terms[i]) === -1) return false;
      return true;
    });
    if (state.sort === 'name-asc') list.sort(function (a, b) { return a.name.localeCompare(b.name); });
    else if (state.sort === 'name-desc') list.sort(function (a, b) { return b.name.localeCompare(a.name); });
    else list.sort(function (a, b) { return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name); });
    return list;
  }

  function waText(p) {
    var t = 'Hello Rajput Traders, I would like the wholesale price for ' + p.name;
    if (p.brand) t += ' (' + p.brand.name + ')';
    if (p.packagingInfo) t += ', ' + p.packagingInfo;
    return t + '.';
  }

  function card(p) {
    var img = p.coverImage ? '/assets/images/products/' + encodeURIComponent(p.coverImage) : '/assets/images/product-placeholder.svg';
    var badges = '';
    if (p.category || p.isSeasonal) {
      badges = '<div class="product-card__badges">' +
        (p.category ? '<span class="product-card__badge product-card__badge--category">' + esc(p.category.name) + '</span>' : '') +
        (p.isSeasonal ? '<span class="product-card__badge product-card__badge--seasonal">Seasonal</span>' : '') +
        '</div>';
    }
    var price = p.price
      ? '<span class="product-card__mrp">MRP: &#8377;' + esc(p.price) + '</span>'
      : '<span class="product-card__mrp product-card__mrp--unpriced">Contact for price</span>';
    return '<article class="product-card reveal-card">' +
      '<div class="product-card__image-link">' +
        '<img src="' + img + '" alt="' + esc(p.name) + '" class="product-card__image" loading="lazy" decoding="async" ' +
          'onerror="this.onerror=null;this.src=\'/assets/images/product-placeholder.svg\'">' + badges +
      '</div>' +
      '<div class="product-card__body">' +
        (p.brand ? '<span class="product-card__brand">' + esc(p.brand.name) + '</span>' : '') +
        '<h3 class="product-card__name">' + esc(p.name) + '</h3>' +
        (p.packagingInfo ? '<p class="product-card__pack">' + esc(p.packagingInfo) + '</p>' : '') +
        '<div class="product-card__footer">' + price +
          '<a class="product-card__add-cart" data-cta="whatsapp" data-wa-text="' + esc(waText(p)) + '" href="#" ' +
            'aria-label="Ask price of ' + esc(p.name) + ' on WhatsApp">' +
            '<i class="ri-whatsapp-line" aria-hidden="true"></i><span>ENQUIRE</span></a>' +
        '</div>' +
      '</div></article>';
  }

  function render() {
    var list = filtered();
    var visible = list.slice(0, state.shown);
    var grid = $('product-grid');

    grid.innerHTML = visible.map(card).join('');
    if (site) RT.bind(site, grid);
    RT.initReveal(grid);
    grid.querySelectorAll('.reveal-card').forEach(function (el) { el.classList.add('is-visible'); });

    var n = list.length;
    $('result-count').textContent = all.length === 0
      ? ''
      : n + ' product' + (n === 1 ? '' : 's') + ' found';

    var empty = $('products-empty');
    if (n === 0) {
      $('products-empty-text').textContent = all.length === 0
        ? 'New products are coming soon. Call or WhatsApp us for our full list.'
        : (state.category && !state.q && !state.brand
            ? 'Products in this category are coming soon. Call or WhatsApp us to ask about availability.'
            : 'No products found matching your filters.');
      $('empty-clear').hidden = all.length === 0;
    }
    empty.hidden = n !== 0;
    $('load-more-wrap').hidden = n <= visible.length;
    grid.hidden = n === 0;

    $('chip-scroll').querySelectorAll('.chip').forEach(function (a) {
      a.classList.toggle('chip--active', a.getAttribute('data-chip') === state.category);
    });
    writeUrl();
  }

  function changed() { state.shown = PAGE_SIZE; render(); }

  function clearAll() {
    state.q = ''; state.category = ''; state.brand = ''; state.sort = 'featured';
    $('products-q').value = '';
    $('filter-sort').value = 'featured';
    renderFilterOptions();
    changed();
  }

  /* ---------- events ---------- */

  function bindEvents() {
    var q = $('products-q');
    var timer;
    q.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { state.q = q.value.trim(); changed(); }, 150);
    });

    $('filters-form').addEventListener('change', function (e) {
      var t = e.target;
      if (t.name === 'category') state.category = t.value;
      else if (t.name === 'brand') state.brand = t.value;
      else return;
      renderFilterOptions();
      changed();
    });

    $('filter-sort').addEventListener('change', function (e) { state.sort = e.target.value; changed(); });

    $('chip-scroll').addEventListener('click', function (e) {
      var a = e.target.closest('a[data-chip]');
      if (!a) return;
      e.preventDefault();
      state.category = a.getAttribute('data-chip');
      renderFilterOptions();
      changed();
    });

    $('load-more').addEventListener('click', function () { state.shown += PAGE_SIZE; render(); });
    $('filters-clear').addEventListener('click', clearAll);
    $('empty-clear').addEventListener('click', clearAll);

    // Filter panel (bottom/side sheet on phones, static sidebar on desktop)
    var panel = $('productFilters');
    function setPanel(open) {
      panel.classList.toggle('product-filters--open', open);
      panel.setAttribute('aria-hidden', open ? 'false' : 'true');
      document.body.classList.toggle('body--filters-open', open);
    }
    document.querySelectorAll('[data-filters-open]').forEach(function (b) { b.addEventListener('click', function () { setPanel(true); }); });
    panel.querySelectorAll('[data-filters-close]').forEach(function (b) { b.addEventListener('click', function () { setPanel(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setPanel(false); });
  }

  /* ---------- start ---------- */

  Promise.all([RT.getData('products'), RT.getData('categories'), RT.getData('brands'), RT.siteReady]).then(function (r) {
    site = r[3];
    categories = Array.isArray(r[1]) ? r[1] : [];
    brands = Array.isArray(r[2]) ? r[2] : [];
    all = Array.isArray(r[0]) ? prepare(r[0], categories, brands) : [];
    readUrl();
    $('products-q').value = state.q;
    $('filter-sort').value = ['featured', 'name-asc', 'name-desc'].indexOf(state.sort) > -1 ? state.sort : 'featured';
    renderFilterOptions();
    bindEvents();
    render();
    RT.bind(site, document);
  });
})();
