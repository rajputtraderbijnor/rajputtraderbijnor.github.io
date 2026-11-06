/**
 * Rajput Traders - Gallery page script.
 *
 * Reads data/gallery.json, shows photo grids (featured + browse with category
 * chips) and opens photos in a full-size viewer with previous / next, swipe,
 * keyboard arrows and Esc to close. Pictures live in assets/images/gallery/.
 */
(function () {
  'use strict';
  var RT = window.RT;
  if (!RT) return;
  var esc = RT.esc;

  var LABELS = { products: 'Products', delivery: 'Deliveries', warehouse: 'Warehouse', events: 'Events', shop: 'Retail Showcase' };
  var ORDER = ['products', 'delivery', 'warehouse', 'events', 'shop'];

  var all = [];
  var state = { section: '' };
  var current = { list: [], index: 0, opener: null };

  function $(id) { return document.getElementById(id); }
  function src(i) { return '/assets/images/gallery/' + encodeURIComponent(i.image); }

  function cardHtml(item, index, group) {
    var badge = LABELS[item.section] ? '<span class="gallery-card__badge">' + esc(LABELS[item.section]) + '</span>' : '';
    var title = item.title ? '<span class="gallery-card__title">' + esc(item.title) + '</span>' : '';
    return '<button type="button" class="gallery-card" data-lightbox-open data-group="' + group + '" data-index="' + index + '" ' +
      'aria-label="View ' + esc(item.title || 'gallery photo') + ' in full size">' +
      '<img src="' + src(item) + '" alt="' + esc(item.title || 'Rajput Traders gallery photo') + '" class="gallery-card__image" loading="lazy" decoding="async" ' +
      'onerror="this.closest(\'.gallery-card\').remove()">' + badge + title + '</button>';
  }

  function visibleItems() {
    return all.filter(function (i) { return !state.section || i.section === state.section; });
  }

  function render() {
    var featured = all.filter(function (i) { return i.isFeatured; });
    var main = visibleItems();
    $('gallery-featured').innerHTML = featured.map(function (i, n) { return cardHtml(i, n, 'featured'); }).join('');
    $('gallery-featured-section').hidden = !featured.length;
    $('gallery-grid').innerHTML = main.map(function (i, n) { return cardHtml(i, n, 'main'); }).join('');
    $('gallery-empty').hidden = all.length > 0;
    $('gallery-grid').hidden = main.length === 0;
    $('gallery-chips').querySelectorAll('.chip').forEach(function (a) {
      a.classList.toggle('chip--active', a.getAttribute('data-chip') === state.section);
    });
  }

  function renderChips() {
    var used = ORDER.filter(function (s) { return all.some(function (i) { return i.section === s; }); });
    $('gallery-chips').innerHTML = '<a href="#" data-chip="" class="chip chip--active">All</a>' +
      used.map(function (s) { return '<a href="#" data-chip="' + s + '" class="chip">' + esc(LABELS[s]) + '</a>'; }).join('');
    $('gallery-chips-bar').hidden = used.length < 2;
  }

  /* ---------- viewer ---------- */
  var box;
  function listFor(group) { return group === 'featured' ? all.filter(function (i) { return i.isFeatured; }) : visibleItems(); }

  function show(n) {
    var list = current.list;
    if (!list.length) return;
    current.index = (n + list.length) % list.length;
    var it = list[current.index];
    var img = box.querySelector('[data-lightbox-image]');
    img.src = src(it);
    img.alt = it.title || 'Rajput Traders gallery photo';
    box.querySelector('[data-lightbox-title]').textContent = it.title || '';
    var many = list.length > 1;
    box.querySelector('[data-lightbox-prev]').hidden = !many;
    box.querySelector('[data-lightbox-next]').hidden = !many;
  }

  function open(group, index, opener) {
    current.list = listFor(group);
    current.opener = opener;
    box.classList.add('lightbox--open');
    box.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    show(index);
    box.querySelector('.lightbox__panel').focus();
  }

  function close() {
    box.classList.remove('lightbox--open');
    box.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (current.opener && current.opener.focus) current.opener.focus();
  }

  function bindViewer() {
    box = $('galleryLightbox');
    document.addEventListener('click', function (e) {
      var card = e.target.closest('[data-lightbox-open]');
      if (card) { open(card.getAttribute('data-group'), parseInt(card.getAttribute('data-index'), 10) || 0, card); return; }
      if (!box.classList.contains('lightbox--open')) return;
      if (e.target.closest('[data-lightbox-close]')) close();
      else if (e.target.closest('[data-lightbox-prev]')) show(current.index - 1);
      else if (e.target.closest('[data-lightbox-next]')) show(current.index + 1);
    });
    document.addEventListener('keydown', function (e) {
      if (!box.classList.contains('lightbox--open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(current.index - 1);
      else if (e.key === 'ArrowRight') show(current.index + 1);
    });
    var x0 = null;
    box.addEventListener('touchstart', function (e) { x0 = e.changedTouches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 50) show(current.index + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }

  Promise.all([RT.getData('gallery'), RT.siteReady]).then(function (r) {
    var rows = r[0] && Array.isArray(r[0].items) ? r[0].items : (Array.isArray(r[0]) ? r[0] : []);
    all = rows.filter(function (i) { return i && i.image && i.isActive !== false; })
      .sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });
    renderChips();
    render();
    bindViewer();
    $('gallery-chips').addEventListener('click', function (e) {
      var a = e.target.closest('a[data-chip]');
      if (!a) return;
      e.preventDefault();
      state.section = a.getAttribute('data-chip');
      render();
    });
    RT.bind(r[1], document);
  });
})();
