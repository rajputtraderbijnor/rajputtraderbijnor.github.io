/**
 * Rajput Traders - Order page (order.html)
 * Shows the visitor's enquiry list as a locked price table (change it with
 * "Edit list"), collects their details and opens WhatsApp with the full order.
 * Prices are MRP from data/products.json; final wholesale price is confirmed on WhatsApp.
 */
(function () {
  'use strict';
  var RT = window.RT;
  if (!RT) return;
  var $ = function (id) { return document.getElementById(id); };
  var esc = RT.esc, E = null, site = null;

  function money(n) { return '₹' + (Math.round(n * 100) / 100).toLocaleString('en-IN'); }

  var d = new Date();
  $('of-date').min = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);

  function lines() {
    return E.ids().map(function (id) { return { id: id, p: E.item(id), q: E.qty(id) }; }).filter(function (r) { return r.p; })
      .sort(function (a, b) { return (a.p.sortOrder - b.p.sortOrder) || a.p.name.localeCompare(b.p.name); });
  }

  function render() {
    var rows = lines();
    $('order-empty').hidden = rows.length > 0;
    $('order-content').hidden = rows.length === 0;
    if (!rows.length) return;
    $('order-count').textContent = '(' + rows.length + ')';
    $('order-rows').innerHTML = rows.map(function (r) {
      var p = r.p;
      return '<tr><td><a href="/product.html?slug=' + encodeURIComponent(p.slug || p.id) + '" class="order-table__name">' + esc(p.name) + '</a>' +
        '<span class="order-table__meta">' + esc([p.brand, p.pack].filter(Boolean).join(' · ')) + '</span></td>' +
        '<td class="num">' + r.q + '</td>' +
        '<td class="num">' + (p.price ? money(p.price) : '<span class="order-table__na">On request</span>') + '</td>' +
        '<td class="num">' + (p.price ? money(p.price * r.q) : '-') + '</td></tr>';
    }).join('');
    $('order-total').textContent = money(E.total());
  }

  function showErr(id, on) {
    var el = document.querySelector('[data-err="' + id + '"]');
    if (el) el.hidden = !on;
    $(id).setAttribute('aria-invalid', on ? 'true' : 'false');
  }
  function validate() {
    var ok = true, first = null;
    function mark(id, bad) { showErr(id, bad); if (bad) { ok = false; if (!first) first = $(id); } }
    mark('of-name', !$('of-name').value.trim());
    var digits = $('of-mobile').value.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
    mark('of-mobile', !/^[6-9]\d{9}$/.test(digits));
    mark('of-city', !$('of-city').value.trim());
    if (first) first.focus();
    return ok;
  }

  function message() {
    var rows = lines();
    var out = ['Hello Rajput Traders, I would like to place an order.', ''];
    out.push('Name: ' + $('of-name').value.trim());
    out.push('Mobile: ' + $('of-mobile').value.trim());
    if ($('of-business').value.trim()) out.push('Shop / business: ' + $('of-business').value.trim());
    out.push('Delivery address: ' + $('of-city').value.trim());
    var dv = $('of-date').value;
    if (dv) { var q = dv.split('-'); out.push('Date needed: ' + q[2] + '/' + q[1] + '/' + q[0]); }
    out.push('', 'Order list:');
    rows.forEach(function (r, i) {
      var p = r.p;
      out.push((i + 1) + '. ' + p.name + (p.brand || p.pack ? ' (' + [p.brand, p.pack].filter(Boolean).join(', ') + ')' : '') +
        ' - Qty ' + r.q + (p.price ? ' x Rs ' + p.price + ' = Rs ' + (Math.round(p.price * r.q * 100) / 100) : ' - price on request'));
    });
    out.push('', 'Estimated total at MRP: Rs ' + E.total());
    out.push('Please confirm the wholesale price and delivery.');
    if ($('of-notes').value.trim()) out.push('', 'Notes: ' + $('of-notes').value.trim());
    return out.join('\n');
  }

  $('of-send').addEventListener('click', function (e) {
    if (!validate()) { e.preventDefault(); return; }
    try { localStorage.setItem(E.CKEY, JSON.stringify({ name: $('of-name').value.trim(), mobile: $('of-mobile').value.trim(), business: $('of-business').value.trim(), city: $('of-city').value.trim() })); } catch (x) { /* ignore */ }
    this.setAttribute('href', RT.waUrl(site || {}, message()));
  });

  function start() {
    E = RT.enquiry;
    if (!E) { setTimeout(start, 80); return; }
    RT.siteReady.then(function (s) {
      site = s;
      if (s.minOrderValue) $('order-note').insertAdjacentHTML('beforeend', ' Minimum order ₹' + esc(s.minOrderValue) + '.');
    });
    try {
      var c = JSON.parse(localStorage.getItem(E.CKEY) || 'null');
      if (c) { $('of-name').value = c.name || ''; $('of-mobile').value = c.mobile || ''; $('of-business').value = c.business || ''; $('of-city').value = c.city || ''; }
    } catch (x) { /* ignore */ }
    E.catalog().then(function () { render(); E.onChange(render); });
  }
  start();
})();
