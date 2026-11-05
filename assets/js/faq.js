/**
 * Rajput Traders - FAQ page script.
 *
 * Questions come from data/faqs.json. Visitors can search, filter by category
 * (chips) and open one answer at a time. Search engine data (FAQPage) is
 * generated from the same list.
 *
 * To add a question, add a block to data/faqs.json in Acode.
 */
(function () {
  'use strict';
  var RT = window.RT;
  if (!RT) return;
  var esc = RT.esc;

  // Nice names for the category codes used in data/faqs.json
  var LABELS = { products: 'Products', delivery: 'Delivery', bulk: 'Wholesale', payments: 'Payments', events: 'Events', returns: 'Returns', general: 'General' };
  var ORDER = ['products', 'delivery', 'bulk', 'payments', 'events', 'returns', 'general'];
  var POPULAR_LIMIT = 5;

  var all = [];
  var state = { q: '', category: '' };

  function $(id) { return document.getElementById(id); }
  function label(c) { return LABELS[c] || (c ? c.charAt(0).toUpperCase() + c.slice(1) : 'Other'); }

  function item(f, withName) {
    return '<details class="faq-item"' + (withName ? ' name="faqAccordion"' : '') + '>' +
      '<summary class="faq-item__question">' + esc(f.question) + '</summary>' +
      '<div class="faq-item__answer"><p>' + RT.escWithBreaks(f.answer) + '</p></div></details>';
  }

  function readUrl() {
    var u = new URLSearchParams(location.search);
    state.q = (u.get('q') || '').trim();
    state.category = u.get('category') || '';
  }

  function writeUrl() {
    var u = new URLSearchParams();
    if (state.q) u.set('q', state.q);
    if (state.category) u.set('category', state.category);
    var qs = u.toString();
    try { history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '')); } catch (e) { /* ignore */ }
  }

  function renderChips(cats) {
    var html = '<a href="?" data-chip="" class="chip' + (!state.category ? ' chip--active' : '') + '">All</a>' +
      cats.map(function (c) {
        return '<a href="?category=' + encodeURIComponent(c) + '" data-chip="' + esc(c) + '" class="chip' +
          (state.category === c ? ' chip--active' : '') + '">' + esc(label(c)) + '</a>';
      }).join('');
    $('faq-chips').innerHTML = html;
    $('faq-chips-section').hidden = cats.length < 2;
  }

  function matches(f) {
    if (state.category && f.category !== state.category) return false;
    var terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
    for (var i = 0; i < terms.length; i++) if (f.search.indexOf(terms[i]) === -1) return false;
    return true;
  }

  function updateJsonLd(list) {
    var old = $('faq-jsonld');
    if (old) old.remove();
    if (!list.length) return;
    var s = document.createElement('script');
    s.type = 'application/ld+json';
    s.id = 'faq-jsonld';
    s.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: list.map(function (f) {
        return { '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } };
      })
    }).replace(/</g, '\\u003c');
    document.head.appendChild(s);
  }

  function render() {
    var list = all.filter(matches);
    $('faq-list').innerHTML = list.map(function (f) { return item(f, true); }).join('');
    $('faq-no-results').hidden = !(all.length && list.length === 0);
    $('faq-empty').hidden = all.length !== 0;
    $('faq-list-title').textContent = state.category ? label(state.category) + ' Questions' : (state.q ? 'Search Results' : 'All Questions');

    // Popular questions only on the plain, unfiltered page
    var showPopular = !state.q && !state.category;
    var popular = all.filter(function (f) { return f.isPopular; }).slice(0, POPULAR_LIMIT);
    $('faq-popular').innerHTML = popular.map(function (f) { return item(f, false); }).join('');
    $('faq-popular-section').hidden = !(showPopular && popular.length);

    $('faq-chips').querySelectorAll('.chip').forEach(function (a) {
      a.classList.toggle('chip--active', a.getAttribute('data-chip') === state.category);
    });
    RT.initReveal();
    updateJsonLd(all);   // search engines get the complete list
    writeUrl();
  }

  function bind() {
    var input = $('faqSearchInput');
    var timer;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { state.q = input.value.trim(); render(); }, 120);
    });
    $('faq-chips').addEventListener('click', function (e) {
      var a = e.target.closest('a[data-chip]');
      if (!a) return;
      e.preventDefault();
      state.category = a.getAttribute('data-chip');
      render();
    });
  }

  Promise.all([RT.getData('faqs'), RT.siteReady]).then(function (r) {
    var rows = Array.isArray(r[0]) ? r[0] : [];
    all = rows.filter(function (f) { return f && f.question && f.answer && f.isPublished !== false; })
      .sort(function (a, b) {
        var ca = ORDER.indexOf(a.category), cb = ORDER.indexOf(b.category);
        return (ca < 0 ? 99 : ca) - (cb < 0 ? 99 : cb) || (a.sortOrder || 0) - (b.sortOrder || 0);
      })
      .map(function (f) {
        return { question: f.question, answer: f.answer, category: f.category || '', isPopular: !!f.isPopular,
                 search: (f.question + ' ' + f.answer + ' ' + label(f.category)).toLowerCase() };
      });

    var cats = [];
    all.forEach(function (f) { if (f.category && cats.indexOf(f.category) < 0) cats.push(f.category); });
    cats.sort(function (a, b) { var x = ORDER.indexOf(a), y = ORDER.indexOf(b); return (x < 0 ? 99 : x) - (y < 0 ? 99 : y); });

    readUrl();
    if (state.category && cats.indexOf(state.category) < 0) state.category = '';
    $('faqSearchInput').value = state.q;
    renderChips(cats);
    bind();
    render();
    RT.bind(r[1], document);
  });
})();
