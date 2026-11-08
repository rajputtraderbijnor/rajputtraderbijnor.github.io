/**
 * Rajput Traders - Bulk / Event order form (events.html)
 * Product picker shares the visitor's enquiry list (RT.enquiry), validates the
 * form and opens WhatsApp with the full order text. Nothing is stored on a server.
 */
(function () {
  'use strict';
  var form = document.getElementById('bulkForm');
  if (!form) return;

  function $(id) { return document.getElementById(id); }
  var search = $('bf-search'), results = $('bf-results'), chosen = $('bf-chosen'), empty = $('bf-empty'), send = $('bf-send');
  var date = $('bf-date');
  var products = [], site = null, E = null;

  // today as YYYY-MM-DD (local) so past dates cannot be picked
  var d = new Date();
  date.min = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);

  function esc(s) { return window.RT.esc(s); }

  function renderChosen() {
    var ids = E.ids().filter(function (id) { return products[id]; });
    empty.hidden = ids.length > 0;
    chosen.innerHTML = ids.map(function (id) {
      var p = products[id];
      return '<li class="enq-item">' +
        '<div class="enq-item__main"><span class="enq-item__name">' + esc(p.name) + '</span>' +
        '<span class="enq-item__meta">' + esc([p.brand, p.pack].filter(Boolean).join(' · ')) + '</span></div>' +
        '<div class="enq-stepper">' +
          '<button type="button" data-dec="' + esc(id) + '" aria-label="Fewer"><i class="ri-subtract-line" aria-hidden="true"></i><span class="sr-only">-</span></button>' +
          '<input type="number" inputmode="numeric" min="1" value="' + E.qty(id) + '" data-q="' + esc(id) + '" aria-label="Quantity of ' + esc(p.name) + '">' +
          '<button type="button" data-inc="' + esc(id) + '" aria-label="More"><i class="ri-add-line" aria-hidden="true"></i><span class="sr-only">+</span></button>' +
        '</div>' +
        '<button type="button" class="enq-item__remove" data-rm="' + esc(id) + '" aria-label="Remove ' + esc(p.name) + '"><i class="ri-delete-bin-line" aria-hidden="true"></i></button>' +
      '</li>';
    }).join('');
  }

  function renderResults() {
    var q = search.value.trim().toLowerCase();
    if (!q) { results.hidden = true; results.innerHTML = ''; return; }
    var words = q.split(/\s+/);
    var hits = Object.keys(products).map(function (id) { return products[id]; }).filter(function (p) {
      var hay = (p.name + ' ' + p.brand + ' ' + (p.category ? p.category.name : '')).toLowerCase();
      return words.every(function (w) { return hay.indexOf(w) !== -1; });
    }).slice(0, 8);
    results.hidden = false;
    results.innerHTML = hits.length ? hits.map(function (p) {
      var on = E.qty(p.id) > 0;
      return '<li><button type="button" data-pick="' + esc(p.id) + '"' + (on ? ' disabled' : '') + '>' +
        '<span>' + esc(p.name) + '<small>' + esc([p.brand, p.pack].filter(Boolean).join(' · ')) + '</small></span>' +
        '<em>' + (on ? 'Added' : '+ Add') + '</em></button></li>';
    }).join('') : '<li class="bulk-picker__none">No product found. Describe it in the notes instead.</li>';
  }

  chosen.addEventListener('click', function (e) {
    var t = e.target;
    var b;
    if ((b = t.closest('[data-dec]'))) E.setQty(b.getAttribute('data-dec'), E.qty(b.getAttribute('data-dec')) - 1);
    else if ((b = t.closest('[data-inc]'))) E.setQty(b.getAttribute('data-inc'), E.qty(b.getAttribute('data-inc')) + 1);
    else if ((b = t.closest('[data-rm]'))) E.setQty(b.getAttribute('data-rm'), 0);
  });
  chosen.addEventListener('change', function (e) {
    var i = e.target.closest('[data-q]');
    if (i) E.setQty(i.getAttribute('data-q'), i.value);
  });
  results.addEventListener('click', function (e) {
    var b = e.target.closest('[data-pick]');
    if (!b) return;
    E.add(b.getAttribute('data-pick'));
    search.value = '';
    renderResults();
    search.focus();
  });
  search.addEventListener('input', renderResults);

  function showErr(id, on) {
    var el = form.querySelector('[data-err="' + id + '"]');
    if (el) el.hidden = !on;
    var f = $(id);
    if (f) f.setAttribute('aria-invalid', on ? 'true' : 'false');
  }

  function validate() {
    var ok = true, first = null;
    function mark(id, bad) { showErr(id, bad); if (bad) { ok = false; if (!first) first = $(id); } }
    mark('bf-name', !$('bf-name').value.trim());
    var digits = $('bf-mobile').value.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
    mark('bf-mobile', !/^[6-9]\d{9}$/.test(digits));
    mark('bf-city', !$('bf-city').value.trim());
    mark('bf-notes', E.count() === 0 && !$('bf-notes').value.trim());
    if (first) first.focus();
    return ok;
  }

  function dateText(v) {
    if (!v) return '';
    var p = v.split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  send.addEventListener('click', function (e) {
    if (!validate()) { e.preventDefault(); return; }
    var lines = ['Hello Rajput Traders, I would like a bulk / event order quote.', ''];
    lines.push('Name: ' + $('bf-name').value.trim());
    lines.push('Mobile: ' + $('bf-mobile').value.trim());
    if ($('bf-business').value.trim()) lines.push('Business: ' + $('bf-business').value.trim());
    lines.push('Delivery city / area: ' + $('bf-city').value.trim());
    if (date.value) lines.push('Date needed: ' + dateText(date.value));
    if ($('bf-time').value.trim()) lines.push('Preferred time: ' + $('bf-time').value.trim());
    lines.push('');
    if (E.count()) {
      lines.push('Products:');
      var n = 0;
      E.ids().forEach(function (id) {
        var p = products[id];
        if (!p) return;
        n++;
        lines.push(n + '. ' + p.name + (p.brand || p.pack ? ' (' + [p.brand, p.pack].filter(Boolean).join(', ') + ')' : '') + ' x ' + E.qty(id));
      });
    }
    if ($('bf-notes').value.trim()) { lines.push(''); lines.push('Notes: ' + $('bf-notes').value.trim()); }
    send.setAttribute('href', window.RT.waUrl(site || {}, lines.join('\n')));
  });

  function start() {
    E = window.RT && window.RT.enquiry;
    if (!E) { setTimeout(start, 80); return; }
    window.RT.siteReady.then(function (s) { site = s; });
    E.catalog().then(function (c) {
      products = c;
      renderChosen();
      E.onChange(function () { renderChosen(); renderResults(); });
    });
  }
  start();
})();
