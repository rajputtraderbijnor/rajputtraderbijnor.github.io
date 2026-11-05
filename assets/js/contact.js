/**
 * Rajput Traders - Contact page script.
 *
 * - Shows "Open now / Closed now" using Indian time.
 * - Quick contact buttons choose the inquiry type and jump to the form.
 * - The message form checks the details, then opens WhatsApp (or the email app)
 *   with the message already written. Nothing is sent to or stored on a server.
 * - You can also link here with ?type=bulk_event_order to pre-select a topic.
 */
(function () {
  'use strict';
  var RT = window.RT;
  if (!RT) return;
  var esc = RT.esc;

  // Opening hours (24-hour clock, Indian time). Keep in step with data/site.json text.
  var OPEN_HOUR = 6;
  var CLOSE_HOUR = 22;

  var TYPE_LABELS = {
    general: 'General Inquiry', product_inquiry: 'Product Inquiry', wholesale_supply: 'Wholesale Supply',
    bulk_event_order: 'Bulk Event Order', retail_partnership: 'Retail Partnership',
    brand_partnership: 'Brand Partnership', complaint: 'Complaint', feedback: 'Feedback', other: 'Other'
  };

  var site = null;
  function $(id) { return document.getElementById(id); }

  /* ---------- open now badge ---------- */
  function renderOpenBadge() {
    var hour;
    try {
      hour = parseInt(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }).format(new Date()), 10);
    } catch (e) { return; }
    if (isNaN(hour)) return;
    var open = hour >= OPEN_HOUR && hour < CLOSE_HOUR;
    var badge = $('open-badge');
    badge.classList.toggle('business-status-badge--open', open);
    badge.classList.toggle('business-status-badge--closed', !open);
    badge.querySelector('i').className = open ? 'ri-checkbox-circle-fill' : 'ri-close-circle-fill';
    $('open-badge-text').textContent = open ? 'Open Now' : 'Closed Now';
    badge.hidden = false;
  }

  /* ---------- form ---------- */
  function showError(id, msg) {
    var el = $(id + '-error');
    var input = $(id);
    el.textContent = msg || '';
    el.hidden = !msg;
    if (msg) { input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', id + '-error'); }
    else { input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby'); }
  }

  function validPhone(v) {
    var d = String(v).replace(/[\s\-()]/g, '');
    return /^(\+?91|0)?[6-9]\d{9}$/.test(d);
  }

  function readForm() {
    return {
      name: $('fullName').value.trim(),
      mobile: $('mobile').value.trim(),
      business: $('businessName').value.trim(),
      type: $('inquiryType').value,
      message: $('message').value.trim()
    };
  }

  function validate(f) {
    var ok = true;
    showError('fullName', f.name.length < 2 ? 'Please enter your name.' : '');
    showError('mobile', !validPhone(f.mobile) ? 'Please enter a valid 10-digit mobile number.' : '');
    showError('message', f.message.length < 5 ? 'Please write your message.' : '');
    ['fullName', 'mobile', 'message'].forEach(function (id) { if (!$(id + '-error').hidden) ok = false; });
    if (!ok) {
      var first = ['fullName', 'mobile', 'message'].filter(function (id) { return !$(id + '-error').hidden; })[0];
      $(first).focus();
    }
    return ok;
  }

  function buildText(f) {
    var lines = ['Hello Rajput Traders,', '', 'Inquiry type: ' + (TYPE_LABELS[f.type] || 'General Inquiry'), 'Name: ' + f.name, 'Mobile: ' + f.mobile];
    if (f.business) lines.push('Business: ' + f.business);
    lines.push('', 'Message:', f.message);
    return lines.join('\n');
  }

  function showSuccess(text) {
    $('form-success-text').textContent = text;
    $('form-success').hidden = false;
    $('form-success').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function onSubmit(e) {
    e.preventDefault();
    var f = readForm();
    if (!validate(f)) return;
    window.open(RT.waUrl(site, buildText(f)), '_blank', 'noopener');
    showSuccess('WhatsApp should open with your message ready. Just tap Send. If it did not open, please call us on ' + RT.formatPhone(site.phone) + '.');
  }

  function onEmail() {
    var f = readForm();
    if (!validate(f)) return;
    var subject = (TYPE_LABELS[f.type] || 'Inquiry') + ' - ' + f.name;
    location.href = 'mailto:' + site.email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(buildText(f));
    showSuccess('Your email app should open with the message ready. Just tap Send.');
  }

  function selectType(value) {
    if (TYPE_LABELS[value]) $('inquiryType').value = value;
  }

  function bindQuick() {
    document.querySelectorAll('[data-quick-contact]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectType(btn.getAttribute('data-quick-contact'));
        var form = $('contact-form');
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(function () { $('fullName').focus({ preventScroll: true }); }, 450);
      });
    });
  }

  function renderFaqs(faqs) {
    var list = (faqs || []).filter(function (f) { return f && f.question && f.isPublished !== false; });
    if (!list.length) return;
    list.sort(function (a, b) { return (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0) || (a.sortOrder || 0) - (b.sortOrder || 0); });
    $('contact-faqs').innerHTML = list.slice(0, 3).map(function (q) {
      return '<details class="faq-item"><summary class="faq-item__question">' + esc(q.question) + '</summary>' +
        '<div class="faq-item__answer"><p>' + RT.escWithBreaks(q.answer) + '</p></div></details>';
    }).join('');
    $('contact-faq-section').hidden = false;
  }

  Promise.all([RT.getData('faqs'), RT.siteReady]).then(function (r) {
    site = r[1];
    renderOpenBadge();
    renderFaqs(Array.isArray(r[0]) ? r[0] : []);
    $('enquiry-form').addEventListener('submit', onSubmit);
    if (site.email) { $('send-email').hidden = false; $('send-email').addEventListener('click', onEmail); }
    if (site.gstNumber) $('gst-card').hidden = false;
    bindQuick();
    var t = new URLSearchParams(location.search).get('type');
    if (t) selectType(t);
    RT.bind(site, document);
    RT.initReveal();
  });
})();
