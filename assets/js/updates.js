/**
 * Rajput Traders - Latest Updates strip (Home page)
 * Reads data/updates.json: [{ id, title, text, date, link, isActive, expiresOn }]
 * The strip is hidden when there is nothing active. Add updates with
 * tools/addupdate.py or by editing the JSON file.
 */
(function () {
  'use strict';
  var RT = window.RT;
  var host = document.getElementById('home-updates');
  if (!RT || !host) return;
  var esc = RT.esc;

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function safeLink(l) { return /^(\/|https?:\/\/)/.test(l || '') ? l : ''; }

  RT.getData('updates').then(function (rows) {
    var t = today();
    var list = (Array.isArray(rows) ? rows : []).filter(function (u) {
      return u && u.title && u.isActive !== false && (!u.expiresOn || u.expiresOn >= t);
    }).slice(0, 6);
    if (!list.length) return;

    var slides = list.map(function (u) {
      var link = safeLink(u.link);
      var inner = '<i class="ri-megaphone-line updates__icon" aria-hidden="true"></i>' +
        '<span class="updates__text"><strong>' + esc(u.title) + '</strong>' + (u.text ? '<span>' + esc(u.text) + '</span>' : '') + '</span>' +
        (link ? '<i class="ri-arrow-right-s-line updates__go" aria-hidden="true"></i>' : '');
      return link
        ? '<a class="updates__slide" href="' + esc(link) + '">' + inner + '</a>'
        : '<div class="updates__slide">' + inner + '</div>';
    });

    host.innerHTML = '<div class="container"><div class="updates__bar" role="region" aria-label="Latest updates">' +
      '<span class="updates__label">Latest<br>Update</span><div class="updates__viewport">' +
      slides.map(function (s, i) { return '<div class="updates__item' + (i === 0 ? ' is-active' : '') + '">' + s + '</div>'; }).join('') +
      '</div></div></div>';
    host.hidden = false;

    var items = host.querySelectorAll('.updates__item');
    if (items.length < 2) return;
    var i = 0, timer;
    function go(n) {
      items[i].classList.remove('is-active');
      i = (n + items.length) % items.length;
      items[i].classList.add('is-active');
    }
    function play() { timer = setInterval(function () { go(i + 1); }, 4500); }
    if (!window.matchMedia || !window.matchMedia('(prefers-reduced-motion: reduce)').matches) play();
    host.addEventListener('mouseenter', function () { clearInterval(timer); });
    host.addEventListener('mouseleave', function () { clearInterval(timer); if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) play(); });
    var x0 = null;
    host.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; clearInterval(timer); }, { passive: true });
    host.addEventListener('touchend', function (e) {
      if (x0 !== null) { var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1)); }
      x0 = null; play();
    }, { passive: true });
  });
})();
