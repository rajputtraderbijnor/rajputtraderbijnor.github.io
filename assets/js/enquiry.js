/**
 * Rajput Traders - Enquiry List (static site "cart")
 *
 * A visitor taps "Add to list" on products, adjusts quantities in a side
 * drawer, and sends the whole list to Rajput Traders on WhatsApp. The list is
 * saved on the visitor's own phone (localStorage), so it is still there on the
 * next visit and on every page. Nothing is stored on any server.
 *
 * Page scripts can use  window.RT.enquiry :
 *   add(id), setQty(id, qty), qty(id), count(), clear(), open(),
 *   onChange(fn), message(extraLines), catalog()  (-> Promise of products by id)
 *
 * Any element with  data-add-list="<productId>"  becomes an "Add to list" button.
 * Any element with  data-open-list  opens the drawer.
 */
(function () {
  'use strict';
  var RT = window.RT;
  if (!RT) return;
  var esc = RT.esc;

  var KEY = 'rt_enquiry_v1';       // { "<productId>": quantity }
  var CKEY = 'rt_customer_v1';     // { name, business } remembered for next time
  var MAX_QTY = 9999;

  var items = {};
  var listeners = [];
  var site = null;
  var catalogPromise = null;
  var byId = {};
  var drawer, fab, toast, toastTimer;

  /* ---------------- storage ---------------- */

  function readJson(key) {
    try { var o = JSON.parse(localStorage.getItem(key) || 'null'); return o && typeof o === 'object' ? o : null; }
    catch (e) { return null; }
  }
  function writeJson(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* private mode */ } }

  function load() {
    var o = readJson(KEY) || {};
    items = {};
    Object.keys(o).forEach(function (k) {
      var q = parseInt(o[k], 10);
      if (q > 0) items[k] = Math.min(q, MAX_QTY);
    });
  }

  /* ---------------- product catalogue (names, photos) ---------------- */

  function catalog() {
    if (!catalogPromise) {
      catalogPromise = Promise.all([RT.getData('products'), RT.getData('brands'), RT.getData('categories')]).then(function (r) {
        var brands = {}, cats = {};
        (r[1] || []).forEach(function (b) { brands[b.id] = b; });
        (r[2] || []).forEach(function (c) { cats[c.id] = c; });
        (r[0] || []).forEach(function (p) {
          if (!p || !p.name || (p.status != null && p.status !== 'published')) return;
          var file = (Array.isArray(p.images) && p.images.length ? p.images[0] : p.coverImage) || '';
          byId[String(p.id)] = {
            id: p.id, name: p.name, slug: p.slug || '',
            brand: brands[p.brandId] ? brands[p.brandId].name : '',
            category: cats[p.categoryId] || null,
            pack: p.packagingInfo || '', sortOrder: p.sortOrder || 0, price: parseFloat(p.price) > 0 ? parseFloat(p.price) : 0,
            img: file ? '/assets/images/products/' + encodeURIComponent(file) : '/assets/images/product-placeholder.svg'
          };
        });
        return byId;
      });
    }
    return catalogPromise;
  }

  /* ---------------- list operations ---------------- */

  function qty(id) { return items[String(id)] || 0; }
  function ids() { return Object.keys(items); }
  function count() { return ids().length; }

  function changed() {
    writeJson(KEY, items);
    refresh();
    listeners.forEach(function (fn) { try { fn(); } catch (e) { /* ignore */ } });
  }

  function setQty(id, q) {
    id = String(id);
    q = parseInt(q, 10);
    if (!(q > 0)) delete items[id]; else items[id] = Math.min(q, MAX_QTY);
    changed();
  }

  function add(id) {
    id = String(id);
    if (!items[id]) { items[id] = 1; changed(); }
  }

  /* Sum of MRP x quantity for products that have a price. */
  function total() {
    var t = 0;
    ids().forEach(function (id) { if (byId[id] && byId[id].price) t += byId[id].price * items[id]; });
    return Math.round(t * 100) / 100;
  }
  function item(id) { return byId[String(id)] || null; }

  function clear() { items = {}; changed(); }
  function onChange(fn) { listeners.push(fn); }

  /* Text for WhatsApp. extraLines are added after the product list. */
  function message(head, extraLines) {
    var lines = [head || 'Hello Rajput Traders, I would like the wholesale price for these products:', ''];
    var n = 0;
    ids().forEach(function (id) {
      var p = byId[id];
      if (!p) return;
      n++;
      lines.push(n + '. ' + p.name + (p.brand || p.pack ? ' (' + [p.brand, p.pack].filter(Boolean).join(', ') + ')' : '') + ' x ' + items[id]);
    });
    (extraLines || []).forEach(function (l) { lines.push(l); });
    return lines.join('\n');
  }

  /* ---------------- add-to-list buttons ---------------- */

  function refreshButtons(root) {
    var list = (root || document).querySelectorAll('[data-add-list]');
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      var on = qty(b.getAttribute('data-add-list')) > 0;
      var wanted = on ? '1' : '0';
      if (b.getAttribute('data-state') === wanted) continue;
      b.setAttribute('data-state', wanted);
      b.classList.toggle('is-added', on);
      var addText = b.getAttribute('data-label-add') || 'ADD TO LIST';
      var onText = b.getAttribute('data-label-added') || 'IN LIST';
      b.innerHTML = '<i class="' + (on ? 'ri-check-line' : 'ri-add-line') + '" aria-hidden="true"></i><span>' + esc(on ? onText : addText) + '</span>';
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  /* ---------------- floating button + toast ---------------- */

  function buildFab() {
    fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'enq-fab';
    fab.setAttribute('data-open-list', '');
    fab.setAttribute('aria-label', 'Open your enquiry list');
    fab.hidden = true;
    fab.innerHTML = '<i class="ri-file-list-3-line" aria-hidden="true"></i><span class="enq-fab__badge">0</span>';
    document.body.appendChild(fab);

    toast = document.createElement('div');
    toast.className = 'enq-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = '<span class="enq-toast__text"></span><button type="button" class="enq-toast__btn" data-open-list>View list</button>';
    document.body.appendChild(toast);
  }

  function showToast(text) {
    toast.querySelector('.enq-toast__text').textContent = text;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-visible'); }, 2600);
  }

  function refreshFab() {
    var n = count();
    fab.hidden = n === 0;
    fab.querySelector('.enq-fab__badge').textContent = n;
    if (n === 0) toast.classList.remove('is-visible');
  }

  /* ---------------- drawer ---------------- */

  function buildDrawer() {
        drawer = document.createElement('div');
    drawer.className = 'enq';
    drawer.id = 'enquiryDrawer';
    drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML =
      '<div class="enq__backdrop" data-enq-close></div>' +
      '<aside class="enq__panel" role="dialog" aria-modal="true" aria-labelledby="enqTitle">' +
        '<header class="enq__head">' +
          '<h2 class="enq__title" id="enqTitle">Your Enquiry List <span class="enq__count" data-enq-count></span></h2>' +
          '<button type="button" class="enq__close" data-enq-close aria-label="Close list"><i class="ri-close-line" aria-hidden="true"></i></button>' +
        '</header>' +
        '<div class="enq__body" data-enq-body></div>' +
        '<footer class="enq__foot" data-enq-foot>' +
          '<div class="enq__total"><span>Estimated total (at MRP)</span><strong data-enq-total></strong></div>' +
          '<p class="enq__note">Final wholesale prices are confirmed by us on WhatsApp. <span data-enq-min></span></p>' +
          '<a href="/order.html" class="btn btn--gold enq__send"><i class="ri-shopping-bag-3-line" aria-hidden="true"></i> Place Order</a>' +
          '<button type="button" class="enq__clear" data-enq-clear>Clear list</button>' +
        '</footer>' +
      '</aside>' +
      '<div class="enq-confirm" data-enq-confirm hidden>' +
        '<div class="enq-confirm__box" role="alertdialog" aria-modal="true" aria-labelledby="enqConfirmTitle">' +
          '<i class="ri-delete-bin-line enq-confirm__icon" aria-hidden="true"></i>' +
          '<h3 id="enqConfirmTitle" class="enq-confirm__title">Clear your list?</h3>' +
          '<p class="enq-confirm__text">All products will be removed from your enquiry list.</p>' +
          '<div class="enq-confirm__actions">' +
            '<button type="button" class="btn btn--outline-dark" data-enq-confirm-no>Keep list</button>' +
            '<button type="button" class="btn btn--brown" data-enq-confirm-yes>Yes, clear</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(drawer);

    drawer.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest('[data-enq-close]')) { close(); return; }
      if (t.closest('[data-enq-confirm-no]') || t.matches('[data-enq-confirm]')) { hideConfirm(); return; }
      if (t.closest('[data-enq-confirm-yes]')) { hideConfirm(); clear(); return; }
      var dec = t.closest('[data-enq-dec]');
      var inc = t.closest('[data-enq-inc]');
      var rem = t.closest('[data-enq-remove]');
      if (dec) { var d = dec.getAttribute('data-enq-dec'); setQty(d, qty(d) - 1); }
      else if (inc) { var i = inc.getAttribute('data-enq-inc'); setQty(i, qty(i) + 1); }
      else if (rem) setQty(rem.getAttribute('data-enq-remove'), 0);
      else if (t.closest('[data-enq-clear]')) {
        askClear();
      }
    });
    drawer.addEventListener('change', function (e) {
      var inp = e.target.closest('[data-enq-input]');
      if (inp) setQty(inp.getAttribute('data-enq-input'), inp.value);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen()) { var cf = drawer.querySelector('[data-enq-confirm]'); if (!cf.hidden) hideConfirm(); else close(); } });
  }

  function askClear() {
    var c = drawer.querySelector('[data-enq-confirm]');
    c.hidden = false;
    c.querySelector('[data-enq-confirm-no]').focus();
  }
  function hideConfirm() { drawer.querySelector('[data-enq-confirm]').hidden = true; }

  function isOpen() { return drawer.classList.contains('is-open'); }

  function open() {
    catalog().then(function () {
      renderDrawer();
      drawer.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
      document.body.classList.add('body--drawer-open');
      toast.classList.remove('is-visible');
      var c = drawer.querySelector('.enq__close');
      if (c) c.focus();
    });
  }

  function close() {
    hideConfirm();
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('body--drawer-open');
  }

  function renderDrawer() {
    var n = count();
    drawer.querySelector('[data-enq-count]').textContent = n ? '(' + n + ')' : '';
    var body = drawer.querySelector('[data-enq-body]');
    var foot = drawer.querySelector('[data-enq-foot]');
    foot.hidden = n === 0;
    drawer.querySelector('[data-enq-total]').textContent = '\u20B9' + total().toLocaleString('en-IN');
    if (!n) {
      body.innerHTML = '<div class="enq__empty"><i class="ri-file-list-3-line" aria-hidden="true"></i>' +
        '<p class="enq__empty-title">Your list is empty</p>' +
        '<p>Tap "Add to list" on the products you need. You can then send the whole list to us on WhatsApp.</p>' +
        '<a href="/products.html" class="btn btn--gold">Browse Products</a></div>';
      return;
    }
    var rows = ids().filter(function (id) { return byId[id]; }).sort(function (a, b) {
      return (byId[a].sortOrder - byId[b].sortOrder) || byId[a].name.localeCompare(byId[b].name);
    }).map(function (id) {
      var p = byId[id];
      var href = '/product.html?slug=' + encodeURIComponent(p.slug || p.id);
      return '<li class="enq-item">' +
        '<a href="' + href + '" class="enq-item__img"><img src="' + p.img + '" alt="" loading="lazy" onerror="this.onerror=null;this.src=\'/assets/images/product-placeholder.svg\'"></a>' +
        '<div class="enq-item__main">' +
          '<a href="' + href + '" class="enq-item__name">' + esc(p.name) + '</a>' +
          '<span class="enq-item__meta">' + esc([p.brand, p.pack].filter(Boolean).join(' · ')) + '</span>' +
          '<span class="enq-item__price">' + (p.price ? 'MRP \u20B9' + p.price : 'Price on request') + '</span>' +
          '<div class="enq-stepper">' +
            '<button type="button" data-enq-dec="' + esc(id) + '" aria-label="Fewer ' + esc(p.name) + '"><i class="ri-subtract-line" aria-hidden="true"></i></button>' +
            '<input type="number" inputmode="numeric" min="1" max="' + MAX_QTY + '" value="' + items[id] + '" data-enq-input="' + esc(id) + '" aria-label="Quantity of ' + esc(p.name) + '">' +
            '<button type="button" data-enq-inc="' + esc(id) + '" aria-label="More ' + esc(p.name) + '"><i class="ri-add-line" aria-hidden="true"></i></button>' +
          '</div>' +
        '</div>' +
        '<button type="button" class="enq-item__remove" data-enq-remove="' + esc(id) + '" aria-label="Remove ' + esc(p.name) + '"><i class="ri-delete-bin-line" aria-hidden="true"></i></button>' +
      '</li>';
    }).join('');
    body.innerHTML = '<ul class="enq__items">' + rows + '</ul>';
  }

  /* ---------------- keep everything in sync ---------------- */

  function refresh() {
    if (!fab) return;
    refreshFab();
    refreshButtons();
    if (drawer && isOpen()) {
      // keep the typed values while the list redraws
      var active = document.activeElement;
      var keepId = active && active.getAttribute && active.getAttribute('data-enq-input');
      renderDrawer();
      if (keepId) {
        var again = drawer.querySelector('[data-enq-input="' + keepId + '"]');
        if (again) again.focus();
      }
    }
  }

  function init() {
    load();
    buildFab();
    buildDrawer();
    refresh();

    document.addEventListener('click', function (e) {
      var addBtn = e.target.closest('[data-add-list]');
      if (addBtn) {
        e.preventDefault();
        var id = addBtn.getAttribute('data-add-list');
        if (qty(id) > 0) { open(); return; }
        add(id);
        catalog().then(function () { showToast((byId[String(id)] ? byId[String(id)].name : 'Product') + ' added to your list'); });
        return;
      }
      if (e.target.closest('[data-open-list]')) { e.preventDefault(); open(); }
    });

    // buttons drawn later (product cards are built by page scripts)
    var pending = false;
    new MutationObserver(function () {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () { pending = false; refreshButtons(); });
    }).observe(document.body, { childList: true, subtree: true });

    // another tab changed the list
    window.addEventListener('storage', function (e) { if (e.key === KEY) { load(); changed(); } });

    RT.siteReady.then(function (s) {
      site = s;
      var min = drawer.querySelector('[data-enq-min]');
      if (min && s.minOrderValue) min.textContent = 'Minimum order ₹' + s.minOrderValue + '.';
    });
    catalog().then(function () { if (isOpen()) renderDrawer(); });
  }

  RT.enquiry = {
    add: add, setQty: setQty, qty: qty, count: count, ids: ids, clear: clear,
    open: open, onChange: onChange, message: message, catalog: catalog, total: total, item: item, KEY: KEY, CKEY: CKEY
  };

  init();
})();
