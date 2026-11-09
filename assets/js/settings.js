/**
 * Rajput Traders - Settings panel
 *
 *  - Appearance: Light / Dark / Auto (follows the phone)
 *  - Language: English / Hindi. Hindi uses Google's automatic page translation,
 *    loaded only when Hindi is chosen. Business, brand and product names stay in English.
 *  - Text size: Normal / Large
 *  - Report a problem: opens WhatsApp with the page address and the visitor's note
 *  - Reset: back to the default look
 *
 * All choices are saved on the visitor's phone (localStorage, keys rt_theme, rt_fs, rt_lang).
 * theme.js applies them in the <head> so pages do not flash. Open the panel from any
 * element with  data-open-settings.
 */
(function () {
  'use strict';
  var RT = window.RT;
  if (!RT) return;
  var esc = RT.esc;
  var root = document.documentElement;
  var panel, site = null;

  /* ---------------- storage ---------------- */

  function get(k, fallback) {
    try { return localStorage.getItem(k) || fallback; } catch (e) { return fallback; }
  }
  function set(k, v) {
    try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* private mode */ }
  }

  /* ---------------- theme ---------------- */

  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function applyTheme(pref) {
    var dark = pref === 'dark' || (pref === 'auto' && mq && mq.matches);
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    root.setAttribute('data-theme-pref', pref);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#1b1209' : '#3F2505');
  }
  function setTheme(pref) { set('rt_theme', pref === 'light' ? null : pref); applyTheme(pref); refresh(); }
  if (mq && mq.addEventListener) {
    mq.addEventListener('change', function () { if (get('rt_theme', 'light') === 'auto') applyTheme('auto'); });
  }

  /* ---------------- text size ---------------- */

  function setSize(v) {
    if (v === 'lg') { root.setAttribute('data-fs', v); set('rt_fs', v); }
    else { root.removeAttribute('data-fs'); set('rt_fs', null); }
    refresh();
  }

  /* ---------------- language (Hindi = automatic translation) ---------------- */

  var PROTECT_FIXED = ['Rajput Traders', 'WhatsApp', 'Loaf India'];
  var protectRe = null;

  function cookieSet(name, value, days) {
    var host = location.hostname;
    var exp = days ? '; max-age=' + days * 86400 : '; max-age=0';
    document.cookie = name + '=' + value + exp + '; path=/';
    if (host.indexOf('.') !== -1) document.cookie = name + '=' + value + exp + '; path=/; domain=' + host;
  }

  function setLang(code) {
    if (code === 'hi') { set('rt_lang', 'hi'); cookieSet('googtrans', '/en/hi', 365); }
    else { set('rt_lang', null); cookieSet('googtrans', '', 0); }
    location.reload();
  }

  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  /* Wrap names that must not be translated, so Google leaves them alone. */
  function protectText(rootNode) {
    if (!protectRe) return;
    var walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode;
        if (!p || !n.nodeValue || n.nodeValue.length < 3) return NodeFilter.FILTER_REJECT;
        if (/^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|INPUT|OPTION)$/.test(p.nodeName)) return NodeFilter.FILTER_REJECT;
        if (p.closest && p.closest('.notranslate,[translate="no"]')) return NodeFilter.FILTER_REJECT;
        protectRe.lastIndex = 0;
        return protectRe.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(function (node) {
      var text = node.nodeValue, frag = document.createDocumentFragment(), last = 0, m;
      protectRe.lastIndex = 0;
      while ((m = protectRe.exec(text))) {
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        var s = document.createElement('span');
        s.className = 'notranslate';
        s.setAttribute('translate', 'no');
        s.textContent = m[0];
        frag.appendChild(s);
        last = m.index + m[0].length;
      }
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      if (node.parentNode) node.parentNode.replaceChild(frag, node);
    });
    var keep = rootNode.querySelectorAll ? rootNode.querySelectorAll('a[href^="tel:"],a[href^="mailto:"],a[href*="wa.me"]') : [];
    for (var i = 0; i < keep.length; i++) {
      if (!/[\d@]/.test(keep[i].textContent)) continue;   // only links that show a number or e-mail
      keep[i].setAttribute('translate', 'no');
      keep[i].classList.add('notranslate');
    }
  }

  function startHindi() {
    root.setAttribute('data-lang', 'hi');
    cookieSet('googtrans', '/en/hi', 365);   // keeps the choice on every page
    // Hindi letters: Poppins has none, so load a matching font
    var f = document.createElement('link');
    f.rel = 'stylesheet';
    f.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap';
    document.head.appendChild(f);

    Promise.all([RT.getData('brands'), RT.getData('products')]).then(function (r) {
      var names = PROTECT_FIXED.slice();
      (r[0] || []).forEach(function (b) { if (b && b.name) names.push(b.name); });
      (r[1] || []).forEach(function (p) { if (p && p.name) names.push(p.name); });
      names = names.filter(function (v, i, a) { return v && a.indexOf(v) === i; })
        .sort(function (a, b) { return b.length - a.length; });
      protectRe = new RegExp(names.map(escRe).join('|'), 'gi');
      protectText(document.body);
      var timer;
      new MutationObserver(function () {
        clearTimeout(timer);
        timer = setTimeout(function () { protectText(document.body); }, 150);
      }).observe(document.body, { childList: true, subtree: true });

      // load Google's translator after the names are protected
      var holder = document.createElement('div');
      holder.id = 'rt_gt';
      holder.className = 'rt-gt notranslate';
      document.body.appendChild(holder);
      window.rtTranslateInit = function () {
        /* global google */
        new google.translate.TranslateElement({ pageLanguage: 'en', includedLanguages: 'en,hi', autoDisplay: false }, 'rt_gt');
      };
      var s = document.createElement('script');
      s.src = 'https://translate.google.com/translate_a/element.js?cb=rtTranslateInit';
      s.async = true;
      document.body.appendChild(s);
    });
  }

  /* ---------------- panel ---------------- */

  function seg(group, value, current, icon, label) {
    var on = value === current;
    return '<button type="button" class="set-seg__btn' + (on ? ' is-on' : '') + '" data-set-' + group + '="' + value + '" aria-pressed="' + on + '">' +
      (icon ? '<i class="' + icon + '" aria-hidden="true"></i>' : '') + '<span>' + label + '</span></button>';
  }

  function build() {
    panel = document.createElement('div');
    panel.className = 'set';
    panel.id = 'settingsPanel';
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML =
      '<div class="set__backdrop" data-set-close></div>' +
      '<section class="set__sheet" role="dialog" aria-modal="true" aria-labelledby="setTitle">' +
        '<header class="set__head"><h2 id="setTitle"><i class="ri-settings-3-line" aria-hidden="true"></i> Settings</h2>' +
          '<button type="button" class="set__close" data-set-close aria-label="Close settings"><i class="ri-close-line" aria-hidden="true"></i></button></header>' +
        '<div class="set__body" data-set-body></div>' +
      '</section>';
    document.body.appendChild(panel);
  }

  function render() {
    var theme = get('rt_theme', 'light');
    var lang = get('rt_lang', 'en');
    var size = get('rt_fs', 'normal');
    var body = panel.querySelector('[data-set-body]');
    var keep = body.querySelector('#setReportText');
    var keepVal = keep ? keep.value : '';
    var reportOpen = body.querySelector('.set-report') && !body.querySelector('.set-report').hidden;

    body.innerHTML =
      '<div class="set-group"><h3>Appearance</h3><div class="set-seg">' +
        seg('theme', 'light', theme, 'ri-sun-line', 'Light') +
        seg('theme', 'dark', theme, 'ri-moon-line', 'Dark') +
        seg('theme', 'auto', theme, 'ri-contrast-2-line', 'Auto') +
      '</div><p class="set-hint">Auto follows your phone’s setting.</p></div>' +

      '<div class="set-group"><h3>Language</h3><div class="set-seg">' +
        seg('lang', 'en', lang, '', 'English') +
        seg('lang', 'hi', lang, '', '<span class="notranslate" translate="no">हिन्दी</span>') +
      '</div><p class="set-hint">Hindi uses automatic translation. Business, brand and product names stay in English.</p></div>' +

      '<div class="set-group"><h3>Text size</h3><div class="set-seg">' +
        seg('size', 'normal', size, '', 'Normal') +
        seg('size', 'lg', size, '', 'Large') +
      '</div></div>' +

      '<div class="set-group"><h3>Help</h3>' +
        '<button type="button" class="set-row" data-set-report-toggle><i class="ri-flag-line" aria-hidden="true"></i><span>Report a problem</span><i class="ri-arrow-down-s-line set-row__chev" aria-hidden="true"></i></button>' +
        '<div class="set-report"' + (reportOpen ? '' : ' hidden') + '>' +
          '<label for="setReportText">What went wrong?</label>' +
          '<textarea id="setReportText" rows="3" placeholder="For example: a photo is not loading on the Products page"></textarea>' +
          '<span class="form-error-text" id="setReportErr" hidden>Please describe the problem in a few words.</span>' +
          '<a href="#" class="btn btn--whatsapp set-report__send" data-set-report-send target="_blank" rel="noopener"><i class="ri-whatsapp-line" aria-hidden="true"></i> Send report on WhatsApp</a>' +
        '</div>' +
        '<button type="button" class="set-row" data-set-reset><i class="ri-restart-line" aria-hidden="true"></i><span>Reset settings</span></button>' +
      '</div>' +
      '<p class="set-foot">Settings are saved on this phone only.</p>';

    var ta = body.querySelector('#setReportText');
    if (ta && keepVal) ta.value = keepVal;
  }

  function refresh() { if (panel && panel.classList.contains('is-open')) render(); }

  function open() {
    render();
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('body--drawer-open');
    var c = panel.querySelector('.set__close');
    if (c) c.focus();
  }
  function close() {
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('body--drawer-open');
  }

  function reportLink() {
    var ta = panel.querySelector('#setReportText');
    var err = panel.querySelector('#setReportErr');
    var text = ta.value.trim();
    if (text.length < 4) { err.hidden = false; ta.focus(); return null; }
    err.hidden = true;
    var ua = (navigator.userAgent || '').replace(/\s+/g, ' ').slice(0, 120);
    var msg = 'Hello Rajput Traders, I want to report a problem on your website.\n\n' +
      'Problem: ' + text + '\n\nPage: ' + location.href + '\nScreen: ' + window.innerWidth + 'x' + window.innerHeight +
      '\nTheme: ' + root.getAttribute('data-theme') + ', Language: ' + get('rt_lang', 'en') + '\nDevice: ' + ua;
    return RT.waUrl(site || {}, msg);
  }

  function onClick(e) {
    var t = e.target;
    var opener = t.closest('[data-open-settings]');
    if (opener) { e.preventDefault(); var dd = document.querySelector('.navbar__more--open'); if (dd) dd.classList.remove('navbar__more--open'); open(); return; }
    if (!panel.contains(t)) return;
    var b;
    if (t.closest('[data-set-close]')) close();
    else if ((b = t.closest('[data-set-theme]'))) setTheme(b.getAttribute('data-set-theme'));
    else if ((b = t.closest('[data-set-size]'))) setSize(b.getAttribute('data-set-size'));
    else if ((b = t.closest('[data-set-lang]'))) { var l = b.getAttribute('data-set-lang'); if (l !== get('rt_lang', 'en')) setLang(l); }
    else if (t.closest('[data-set-report-toggle]')) {
      var r = panel.querySelector('.set-report');
      r.hidden = !r.hidden;
      var chev = panel.querySelector('.set-row__chev');
      if (chev) chev.style.transform = r.hidden ? '' : 'rotate(180deg)';
    }
    else if ((b = t.closest('[data-set-report-send]'))) {
      var link = reportLink();
      if (!link) e.preventDefault(); else b.setAttribute('href', link);
    }
    else if (t.closest('[data-set-reset]')) {
      set('rt_theme', null); set('rt_fs', null);
      applyTheme('light'); root.removeAttribute('data-fs');
      if (get('rt_lang', 'en') === 'hi') setLang('en'); else render();
    }
  }

  function init() {
    build();
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('is-open')) close(); });
    RT.siteReady.then(function (s) { site = s; });
    if (get('rt_lang', 'en') === 'hi') startHindi();
  }

  RT.settings = { open: open, close: close, setTheme: setTheme };
  init();
})();
