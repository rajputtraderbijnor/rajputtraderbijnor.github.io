/**
 * Rajput Traders - Settings panel
 *
 *  - Appearance: Light / Dark / Auto (follows the phone)
 *  - Language: English / Hindi. Hindi uses Google's automatic page translation,
 *    loaded only when Hindi is chosen. Business, brand and product names stay in English.
 *  - Text size: Normal / Large; High contrast; Reduce animations
 *  - My details: remember / forget the name, mobile, shop and address typed in the order forms
 *  - Contact shortcuts, Install app (home screen), Share website, Clear enquiry list, About
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

  /* ---------------- helpers for the new rows ---------------- */

  function row(icon, label, attrs, extra) {
    return '<button type="button" class="set-row" ' + attrs + '><i class="' + icon + '" aria-hidden="true"></i><span>' + label + '</span>' + (extra || '') + '</button>';
  }
  function sw(key, label, hint, on) {
    return '<button type="button" class="set-switch' + (on ? ' is-on' : '') + '" role="switch" aria-checked="' + on + '" data-set-switch="' + key + '">' +
      '<span class="set-switch__text"><strong>' + label + '</strong><small>' + hint + '</small></span><span class="set-switch__track" aria-hidden="true"><span></span></span></button>';
  }
  function chev() { return '<i class="ri-arrow-down-s-line set-row__chev" aria-hidden="true"></i>'; }

  function tel(v) { try { return RT.telUrl ? RT.telUrl(v) : 'tel:+91' + String(v).replace(/\D/g, '').slice(-10); } catch (e) { return 'tel:' + v; } }
  function wa(st, text) { try { if (RT.waUrl) return RT.waUrl(st, text); } catch (e) { /* fall through */ } return 'https://wa.me/' + String((st && st.whatsapp) || '919927637594').replace(/\D/g, ''); }
  function dirUrl(st) { try { if (RT.directionsUrl) return RT.directionsUrl(st); } catch (e) { /* fall through */ } return st.mapUrl || ('https://www.google.com/maps/search/?api=1&query=' + st.lat + ',' + st.lng); }

  function isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  }
  function isIos() { return /iphone|ipad|ipod/i.test(navigator.userAgent || ''); }

  function savedName() {
    var E = RT.enquiry;
    var c = E && E.customer ? E.customer.get() : {};
    return c && c.name ? c.name : '';
  }
  function listCount() { return RT.enquiry && RT.enquiry.count ? RT.enquiry.count() : 0; }

  function flash(text) {
    var f = panel.querySelector('[data-set-flash]');
    if (!f) return;
    f.textContent = text;
    f.classList.add('is-on');
    clearTimeout(flash.t);
    flash.t = setTimeout(function () { f.classList.remove('is-on'); }, 2400);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise(function (ok, fail) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        var done = document.execCommand('copy');
        document.body.removeChild(ta);
        done ? ok() : fail();
      } catch (e) { fail(e); }
    });
  }

  var SHARE = { title: 'Rajput Traders - Wholesale Bakery Distributor, Bijnor', text: 'Wholesale bakery products in Bijnor since 2000 - Rajput Traders' };
  function shareUrl() { return location.origin + '/'; }

  function doShare() {
    if (navigator.share) { navigator.share({ title: SHARE.title, text: SHARE.text, url: shareUrl() }).catch(function () { /* cancelled */ }); return; }
    window.open('https://wa.me/?text=' + encodeURIComponent(SHARE.text + '\n' + shareUrl()), '_blank', 'noopener');
  }

  function doInstall() {
    var evt = window.__rtInstallEvt;
    if (evt && evt.prompt) {
      evt.prompt();
      evt.userChoice.then(function (r) {
        window.__rtInstallEvt = null;
        if (r && r.outcome === 'accepted') flash('Installing - check your home screen');
        render();
      });
      return;
    }
    var how = panel.querySelector('[data-set-install-how]');
    how.hidden = !how.hidden;
  }

  function setSwitch(key, on) {
    if (key === 'contrast') {
      if (on) { root.setAttribute('data-contrast', 'high'); set('rt_contrast', 'high'); }
      else { root.removeAttribute('data-contrast'); set('rt_contrast', null); }
    } else if (key === 'motion') {
      if (on) { root.setAttribute('data-motion', 'reduced'); set('rt_motion', 'reduced'); }
      else { root.removeAttribute('data-motion'); set('rt_motion', null); }
    } else if (key === 'remember') {
      set('rt_remember', on ? null : 'off');
      if (!on && RT.enquiry && RT.enquiry.customer) RT.enquiry.customer.clear();
    }
    render();
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
        '<div class="set-flash" data-set-flash role="status" aria-live="polite"></div>' +
      '</section>';
    document.body.appendChild(panel);
  }

  function render() {
    var theme = get('rt_theme', 'light');
    var lang = get('rt_lang', 'en');
    var size = get('rt_fs', 'normal');
    var contrast = get('rt_contrast', '') === 'high';
    var motion = get('rt_motion', '') === 'reduced';
    var remember = get('rt_remember', '') !== 'off';
    var body = panel.querySelector('[data-set-body]');
    var keep = body.querySelector('#setReportText');
    var keepVal = keep ? keep.value : '';
    function openState(sel) { var el = body.querySelector(sel); return !!el && !el.hidden; }
    var reportOpen = openState('.set-report'), aboutOpen = openState('.set-about'), howOpen = openState('[data-set-install-how]'), clearAsk = openState('[data-set-clear-ask]');

    var s = site || {};
    var phone = s.phone || '';
    var name = savedName();
    var n = listCount();
    var canInstall = !isStandalone();
    var installHow = isIos()
      ? 'In Safari, tap the Share button, then “Add to Home Screen”.'
      : 'In Chrome, tap the three dots ⋮, then “Add to Home screen” or “Install app”.';

    body.innerHTML =
      '<div class="set-group"><h3>Appearance</h3><div class="set-seg">' +
        seg('theme', 'light', theme, 'ri-sun-line', 'Light') +
        seg('theme', 'dark', theme, 'ri-moon-line', 'Dark') +
        seg('theme', 'auto', theme, 'ri-contrast-2-line', 'Auto') +
      '</div><p class="set-hint">Auto follows your phone’s setting.</p>' +
      '<h3 class="set-sub">Text size</h3><div class="set-seg">' +
        seg('size', 'normal', size, '', 'Normal') +
        seg('size', 'lg', size, '', 'Large') +
      '</div>' +
      sw('contrast', 'High contrast', 'Stronger colours and borders, easier to read', contrast) +
      sw('motion', 'Reduce animations', 'Fewer moving effects, lighter on slow phones', motion) +
      '</div>' +

      '<div class="set-group"><h3>Language</h3><div class="set-seg">' +
        seg('lang', 'en', lang, '', 'English') +
        seg('lang', 'hi', lang, '', '<span class="notranslate" translate="no">हिन्दी</span>') +
      '</div><p class="set-hint">Hindi uses automatic translation. Business, brand and product names stay in English.</p></div>' +

      '<div class="set-group"><h3>My details</h3>' +
        sw('remember', 'Remember my details', 'Fills your name, mobile and address in the order forms next time', remember) +
        row('ri-user-unfollow-line', name ? 'Clear saved details (' + esc(name) + ')' : 'Clear saved details', 'data-set-forget') +
      '</div>' +

      '<div class="set-group"><h3>Contact us</h3><div class="set-contact">' +
        (phone ? '<a class="set-contact__btn" href="' + esc(tel(phone)) + '"><i class="ri-phone-line" aria-hidden="true"></i><span>Call</span></a>' : '') +
        '<a class="set-contact__btn" href="' + esc(wa(s, RT.DEFAULT_WA_TEXT)) + '" target="_blank" rel="noopener"><i class="ri-whatsapp-line" aria-hidden="true"></i><span>WhatsApp</span></a>' +
        (s.lat ? '<a class="set-contact__btn" href="' + esc(dirUrl(s)) + '" target="_blank" rel="noopener"><i class="ri-map-pin-2-line" aria-hidden="true"></i><span>Directions</span></a>' : '') +
        (s.email ? '<a class="set-contact__btn" href="mailto:' + esc(s.email) + '"><i class="ri-mail-line" aria-hidden="true"></i><span>Email</span></a>' : '') +
      '</div></div>' +

      '<div class="set-group"><h3>App &amp; sharing</h3>' +
        (canInstall ? row('ri-install-line', 'Install app on home screen', 'data-set-install') +
          '<p class="set-hint set-how" data-set-install-how' + (howOpen ? '' : ' hidden') + '>' + installHow + '</p>' : '') +
        row('ri-share-forward-line', 'Share this website', 'data-set-share') +
        row('ri-links-line', 'Copy website link', 'data-set-copy') +
      '</div>' +

      '<div class="set-group"><h3>Help</h3>' +
        row('ri-flag-line', 'Report a problem', 'data-set-report-toggle', chev()) +
        '<div class="set-report"' + (reportOpen ? '' : ' hidden') + '>' +
          '<label for="setReportText">What went wrong?</label>' +
          '<textarea id="setReportText" rows="3" placeholder="For example: a photo is not loading on the Products page"></textarea>' +
          '<span class="form-error-text" id="setReportErr" hidden>Please describe the problem in a few words.</span>' +
          '<a href="#" class="btn btn--whatsapp set-report__send" data-set-report-send target="_blank" rel="noopener"><i class="ri-whatsapp-line" aria-hidden="true"></i> Send report on WhatsApp</a>' +
        '</div>' +
        (n ? row('ri-delete-bin-line', 'Clear enquiry list (' + n + ')', 'data-set-clear-list') +
          '<div class="set-ask" data-set-clear-ask' + (clearAsk ? '' : ' hidden') + '><p>Remove all ' + n + ' products from your list?</p>' +
          '<div><button type="button" class="btn btn--outline-dark" data-set-clear-no>Keep list</button><button type="button" class="btn btn--brown" data-set-clear-yes>Yes, clear</button></div></div>' : '') +
        row('ri-restart-line', 'Reset settings', 'data-set-reset') +
      '</div>' +

      '<div class="set-group"><h3>About</h3>' +
        row('ri-information-line', 'About this site', 'data-set-about-toggle', chev()) +
        '<div class="set-about"' + (aboutOpen ? '' : ' hidden') + '>' +
          '<p><strong class="notranslate" translate="no">Rajput Traders</strong><br>Wholesale bakery distributor, Bijnor, since 2000</p>' +
          (s.gstNumber ? '<p>GST No. <span class="notranslate" translate="no">' + esc(s.gstNumber) + '</span></p>' : '') +
          (s.businessHoursText ? '<p>' + esc(s.businessHoursText) + '</p>' : '') +
          '<p class="set-about__links"><a href="/privacy.html">Privacy Policy</a> · <a href="/terms.html">Terms</a> · <a href="/returns.html">Returns</a> · <a href="/delivery.html">Delivery</a></p>' +
          '<p class="set-about__ver">Website version ' + esc(String(RT.version || '')) + '</p>' +
        '</div>' +
      '</div>' +
      '<p class="set-foot">Settings are saved on this phone only.</p>';

    var ta = body.querySelector('#setReportText');
    if (ta && keepVal) ta.value = keepVal;
    var chevs = body.querySelectorAll('.set-row__chev');
    if (reportOpen && chevs[0]) chevs[0].style.transform = 'rotate(180deg)';
    if (aboutOpen && chevs[1]) chevs[1].style.transform = 'rotate(180deg)';
  }

  function refresh() { if (panel && panel.classList.contains('is-open')) { try { render(); } catch (e) { /* shown on next open */ } } }

  function open() {
    panel.classList.add('is-open');
    try { render(); } catch (err) {
      panel.querySelector('[data-set-body]').innerHTML = '<p class="set-hint">Settings could not load fully. Please refresh the page and try again.<br><small>' + esc(err && err.message) + '</small></p>';
      if (window.console) console.error('Settings render failed:', err);
    }
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
    return wa(site || {}, msg);
  }

  function toggleBlock(sel, chevIndex) {
    var el = panel.querySelector(sel);
    el.hidden = !el.hidden;
    var c = panel.querySelectorAll('.set-row__chev')[chevIndex];
    if (c) c.style.transform = el.hidden ? '' : 'rotate(180deg)';
  }

  function resetAll() {
    ['rt_theme', 'rt_fs', 'rt_contrast', 'rt_motion', 'rt_remember'].forEach(function (k) { set(k, null); });
    applyTheme('light');
    root.removeAttribute('data-fs'); root.removeAttribute('data-contrast'); root.removeAttribute('data-motion');
    if (get('rt_lang', 'en') === 'hi') setLang('en'); else { render(); flash('Settings reset'); }
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
    else if ((b = t.closest('[data-set-switch]'))) setSwitch(b.getAttribute('data-set-switch'), b.getAttribute('aria-checked') !== 'true');
    else if (t.closest('[data-set-forget]')) {
      if (RT.enquiry && RT.enquiry.customer) RT.enquiry.customer.clear();
      render(); flash('Saved details cleared');
    }
    else if (t.closest('[data-set-install]')) doInstall();
    else if (t.closest('[data-set-share]')) doShare();
    else if (t.closest('[data-set-copy]')) {
      copyText(shareUrl()).then(function () { flash('Website link copied'); }, function () { flash('Could not copy the link'); });
    }
    else if (t.closest('[data-set-report-toggle]')) toggleBlock('.set-report', 0);
    else if (t.closest('[data-set-about-toggle]')) toggleBlock('.set-about', 1);
    else if ((b = t.closest('[data-set-report-send]'))) {
      var link = reportLink();
      if (!link) e.preventDefault(); else b.setAttribute('href', link);
    }
    else if (t.closest('[data-set-clear-list]')) panel.querySelector('[data-set-clear-ask]').hidden = false;
    else if (t.closest('[data-set-clear-no]')) panel.querySelector('[data-set-clear-ask]').hidden = true;
    else if (t.closest('[data-set-clear-yes]')) { RT.enquiry.clear(); render(); flash('Enquiry list cleared'); }
    else if (t.closest('[data-set-reset]')) resetAll();
  }

  function registerWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
    navigator.serviceWorker.register('/sw.js').catch(function () { /* optional */ });
  }

  function init() {
    build();
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('is-open')) close(); });
    RT.siteReady.then(function (s) { site = s; refresh(); });
    window.addEventListener('appinstalled', function () { window.__rtInstallEvt = null; refresh(); });
    if (get('rt_lang', 'en') === 'hi') startHindi();
    registerWorker();
  }

  RT.settings = { open: open, close: close, setTheme: setTheme };
  init();
})();
