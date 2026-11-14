/**
 * Rajput Traders - product photo zoom.
 * Tap the big photo on a product page to open it full screen.
 *   - Pinch with two fingers, double-tap, mouse wheel or the + / - buttons to zoom
 *   - Drag to move around when zoomed; swipe (or arrows) to change photo when not zoomed
 *   - Close with the X button, Escape, or the phone's Back button
 * Loaded by product.js. Works with the photos listed in the thumbnail strip.
 */
(function () {
  'use strict';
  var MAX = 5;           // largest zoom
  var DOUBLE = 2.6;      // zoom level for double-tap
  var root, stage, img, counter, hint;
  var list = [], index = 0, open = false, pushed = false;
  var s = 1, tx = 0, ty = 0;
  var pointers = {}, pinch = null, drag = null, lastTap = { t: 0, x: 0, y: 0 };
  var reduce = document.documentElement.getAttribute('data-motion') === 'reduced';

  function photos() {
    var thumbs = Array.prototype.slice.call(document.querySelectorAll('[data-gallery-thumb]'));
    if (thumbs.length) {
      return {
        urls: thumbs.map(function (b) { return b.getAttribute('data-image-url'); }),
        start: Math.max(0, thumbs.findIndex(function (b) { return b.classList.contains('product-gallery__thumb--active'); })),
        thumbs: thumbs
      };
    }
    var m = document.querySelector('[data-gallery-main-image]');
    return { urls: m ? [m.currentSrc || m.src] : [], start: 0, thumbs: [] };
  }

  function build() {
    root = document.createElement('div');
    root.className = 'pz';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Product photo zoom');
    root.hidden = true;
    root.innerHTML =
      '<div class="pz__bar"><span class="pz__count" data-pz-count></span>' +
        '<button type="button" class="pz__btn" data-pz-close aria-label="Close"><i class="ri-close-line" aria-hidden="true"></i></button></div>' +
      '<div class="pz__stage" data-pz-stage><img class="pz__img" alt="" draggable="false"></div>' +
      '<button type="button" class="pz__nav pz__nav--prev" data-pz-prev aria-label="Previous photo"><i class="ri-arrow-left-s-line" aria-hidden="true"></i></button>' +
      '<button type="button" class="pz__nav pz__nav--next" data-pz-next aria-label="Next photo"><i class="ri-arrow-right-s-line" aria-hidden="true"></i></button>' +
      '<div class="pz__tools"><button type="button" class="pz__btn" data-pz-out aria-label="Zoom out"><i class="ri-subtract-line" aria-hidden="true"></i></button>' +
        '<span class="pz__hint" data-pz-hint>Pinch or double-tap to zoom</span>' +
        '<button type="button" class="pz__btn" data-pz-in aria-label="Zoom in"><i class="ri-add-line" aria-hidden="true"></i></button></div>';
    document.body.appendChild(root);
    stage = root.querySelector('[data-pz-stage]');
    img = root.querySelector('.pz__img');
    counter = root.querySelector('[data-pz-count]');
    hint = root.querySelector('[data-pz-hint]');

    root.addEventListener('click', function (e) {
      if (e.target.closest('[data-pz-close]')) close();
      else if (e.target.closest('[data-pz-prev]')) go(index - 1);
      else if (e.target.closest('[data-pz-next]')) go(index + 1);
      else if (e.target.closest('[data-pz-in]')) zoomBy(1.6);
      else if (e.target.closest('[data-pz-out]')) zoomBy(1 / 1.6);
    });
    stage.addEventListener('pointerdown', down);
    stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    stage.addEventListener('wheel', function (e) {
      e.preventDefault();
      zoomAt(s * (e.deltaY < 0 ? 1.2 : 1 / 1.2), e.clientX, e.clientY);
    }, { passive: false });
    img.addEventListener('dblclick', function (e) { e.preventDefault(); });
    document.addEventListener('keydown', function (e) {
      if (!open) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') go(index + 1);
      else if (e.key === 'ArrowLeft') go(index - 1);
      else if (e.key === '+' || e.key === '=') zoomBy(1.6);
      else if (e.key === '-') zoomBy(1 / 1.6);
    });
    window.addEventListener('popstate', function () { if (open) { pushed = false; close(); } });
    window.addEventListener('resize', function () { if (open) { clamp(); apply(false); } });
  }

  /* ---------- transform ---------- */
  function apply(animate) {
    img.style.transition = (animate && !reduce) ? 'transform .22s ease' : 'none';
    img.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + s + ')';
    root.classList.toggle('pz--zoomed', s > 1.01);
  }
  function clamp() {
    var w = img.clientWidth * s, h = img.clientHeight * s;
    var mx = Math.max(0, (w - stage.clientWidth) / 2), my = Math.max(0, (h - stage.clientHeight) / 2);
    tx = Math.max(-mx, Math.min(mx, tx));
    ty = Math.max(-my, Math.min(my, ty));
    if (s <= 1.01) { tx = 0; ty = 0; }
  }
  function zoomAt(ns, cx, cy, animate) {
    ns = Math.max(1, Math.min(MAX, ns));
    var r = stage.getBoundingClientRect();
    var px = cx - (r.left + r.width / 2), py = cy - (r.top + r.height / 2);
    tx = px - (px - tx) * (ns / s);
    ty = py - (py - ty) * (ns / s);
    s = ns;
    clamp();
    apply(animate);
  }
  function zoomBy(f) {
    var r = stage.getBoundingClientRect();
    zoomAt(s * f, r.left + r.width / 2, r.top + r.height / 2, true);
  }
  function reset() { s = 1; tx = 0; ty = 0; apply(false); }

  /* ---------- gestures ---------- */
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function down(e) {
    stage.setPointerCapture(e.pointerId);
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(pointers);
    if (ids.length === 2) {
      pinch = { d: dist(pointers[ids[0]], pointers[ids[1]]), s: s };
      drag = null;
    } else if (ids.length === 1) {
      drag = { x: e.clientX, y: e.clientY, tx: tx, ty: ty, moved: false, t: Date.now() };
    }
  }
  function move(e) {
    if (!pointers[e.pointerId]) return;
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(pointers);
    if (ids.length === 2 && pinch) {
      var a = pointers[ids[0]], b = pointers[ids[1]];
      zoomAt(pinch.s * dist(a, b) / pinch.d, (a.x + b.x) / 2, (a.y + b.y) / 2);
    } else if (drag && ids.length === 1) {
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true;
      if (s > 1.01) { tx = drag.tx + dx; ty = drag.ty + dy; clamp(); apply(false); }
      else { tx = dx; ty = 0; apply(false); }   // follow the finger while swiping between photos
    }
  }
  function up(e) {
    var had = pointers[e.pointerId];
    delete pointers[e.pointerId];
    if (pinch) { if (Object.keys(pointers).length < 2) pinch = null; if (s < 1.05) { s = 1; clamp(); apply(true); } return; }
    if (!drag || !had) return;
    var d = drag; drag = null;
    var dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (s <= 1.01) {
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.2) { tx = 0; apply(false); go(dx < 0 ? index + 1 : index - 1); return; }
      tx = 0; apply(true);
    }
    if (!d.moved) {                                   // a tap: check for double-tap
      var now = Date.now();
      if (now - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 40) {
        lastTap.t = 0;
        if (s > 1.01) { s = 1; tx = 0; ty = 0; apply(true); } else zoomAt(DOUBLE, e.clientX, e.clientY, true);
      } else lastTap = { t: now, x: e.clientX, y: e.clientY };
    }
  }

  /* ---------- show / hide ---------- */
  function show() {
    img.src = list[index];
    counter.textContent = list.length > 1 ? (index + 1) + ' / ' + list.length : '';
    root.classList.toggle('pz--single', list.length < 2);
    reset();
  }
  function go(i) {
    if (list.length < 2) return;
    index = Math.max(0, Math.min(list.length - 1, i));
    show();
  }
  function openAt() {
    var p = photos();
    if (!p.urls.length) return;
    list = p.urls; index = p.start;
    if (!root) build();
    root.hidden = false;
    open = true;
    document.body.classList.add('body--drawer-open');
    show();
    try { history.pushState({ pz: 1 }, ''); pushed = true; } catch (e) { pushed = false; }
    root.querySelector('[data-pz-close]').focus();
    clearTimeout(openAt.t);
    hint.classList.remove('is-off');
    openAt.t = setTimeout(function () { hint.classList.add('is-off'); }, 3500);
  }
  function close() {
    if (!open) return;
    open = false;
    root.hidden = true;
    document.body.classList.remove('body--drawer-open');
    // Keep the page gallery on the photo that was last viewed
    var p = photos();
    if (p.thumbs[index] && !p.thumbs[index].classList.contains('product-gallery__thumb--active')) p.thumbs[index].click();
    if (pushed) { pushed = false; try { history.back(); } catch (e) { /* ignore */ } }
  }

  /* ---------- zoom directly on the product page photo ---------- */
  // Pinch / double-tap to zoom in place, drag to move around when zoomed.
  // A single tap (when not zoomed) opens the full-screen viewer above.
  function initInline(main) {
    var im = main.querySelector('.product-gallery__main-image');
    if (!im) return;
    var is = 1, itx = 0, ity = 0, ptr = {}, pin = null, dr = null, tap = { t: 0, x: 0, y: 0 }, timer = 0;
    main.style.touchAction = 'pan-y';          // page still scrolls up/down; pinch is ours

    function put(animate) {
      im.style.transition = (animate && !reduce) ? 'transform .2s ease' : 'none';
      im.style.transform = is > 1.01 ? 'translate(' + itx + 'px,' + ity + 'px) scale(' + is + ')' : '';
      main.classList.toggle('is-zoomed', is > 1.01);
      main.style.touchAction = is > 1.01 ? 'none' : 'pan-y';
    }
    function fit() {
      var mx = (is - 1) * main.clientWidth / 2, my = (is - 1) * main.clientHeight / 2;
      itx = Math.max(-mx, Math.min(mx, itx));
      ity = Math.max(-my, Math.min(my, ity));
      if (is <= 1.01) { itx = 0; ity = 0; }
    }
    function at(ns, cx, cy, animate) {
      ns = Math.max(1, Math.min(MAX, ns));
      var r = main.getBoundingClientRect();
      var px = cx - (r.left + r.width / 2), py = cy - (r.top + r.height / 2);
      itx = px - (px - itx) * (ns / is);
      ity = py - (py - ity) * (ns / is);
      is = ns; fit(); put(animate);
    }
    function back() { is = 1; itx = 0; ity = 0; put(false); }

    // Stop the page's swipe-to-change-photo while zoomed, so moving the photo does not change it
    ['touchstart', 'touchend'].forEach(function (n) {
      main.addEventListener(n, function (e) { if (is > 1.01 || (e.touches && e.touches.length > 1)) e.stopImmediatePropagation(); }, true);
    });
    new MutationObserver(back).observe(im, { attributes: true, attributeFilter: ['src'] });

    main.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.product-gallery__arrow')) return;
      ptr[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(ptr);
      if (ids.length === 2) {
        clearTimeout(timer);
        pin = { d: dist(ptr[ids[0]], ptr[ids[1]]), s: is };
        dr = null;
        try { main.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
      } else {
        dr = { x: e.clientX, y: e.clientY, tx: itx, ty: ity, moved: false, t: Date.now() };
        if (is > 1.01) { try { main.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } }
      }
    });
    main.addEventListener('pointermove', function (e) {
      if (!ptr[e.pointerId]) return;
      ptr[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(ptr);
      if (ids.length === 2 && pin) {
        var a = ptr[ids[0]], b = ptr[ids[1]];
        at(pin.s * dist(a, b) / pin.d, (a.x + b.x) / 2, (a.y + b.y) / 2);
      } else if (dr && ids.length === 1) {
        var dx = e.clientX - dr.x, dy = e.clientY - dr.y;
        if (Math.abs(dx) + Math.abs(dy) > 8) dr.moved = true;
        if (is > 1.01) { itx = dr.tx + dx; ity = dr.ty + dy; fit(); put(false); }
      }
    });
    function end(e) {
      var had = ptr[e.pointerId];
      delete ptr[e.pointerId];
      if (pin) { if (Object.keys(ptr).length < 2) pin = null; if (is < 1.05) back(); return; }
      if (!dr || !had) return;
      var d = dr; dr = null;
      if (e.type === 'pointercancel' || d.moved || Date.now() - d.t > 450) return;
      var now = Date.now();
      if (now - tap.t < 320 && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 40) {     // double-tap
        clearTimeout(timer); tap.t = 0;
        if (is > 1.01) { is = 1; itx = 0; ity = 0; put(true); } else at(DOUBLE, e.clientX, e.clientY, true);
        return;
      }
      tap = { t: now, x: e.clientX, y: e.clientY };
      if (is <= 1.01) { clearTimeout(timer); timer = setTimeout(openAt, 300); }              // single tap: full screen
    }
    main.addEventListener('pointerup', end);
    main.addEventListener('pointercancel', end);
  }

  /* ---------- hook into the product page ---------- */
  function init() {
    var main = document.querySelector('.product-gallery__main');
    if (!main || main.getAttribute('data-zoom-ready')) return;
    main.setAttribute('data-zoom-ready', '1');
    main.classList.add('product-gallery__main--zoom');
    var badge = document.createElement('span');
    badge.className = 'product-gallery__zoom-hint';
    badge.innerHTML = '<i class="ri-zoom-in-line" aria-hidden="true"></i> Pinch to zoom';
    main.appendChild(badge);
    initInline(main);
  }
  init();
  window.RT = window.RT || {};
  window.RT.zoomInit = init;
})();
