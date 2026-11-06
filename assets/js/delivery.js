/**
 * Rajput Traders - Delivery Network page script.
 *
 * Reads data/delivery.json. While "areas" is empty the page keeps its general
 * sentence ("contact us to check your area"). When you add towns to the list
 * they appear as chips and the sentence changes to introduce them.
 */
(function () {
  'use strict';
  var RT = window.RT;
  if (!RT) return;

  Promise.all([RT.getData('delivery'), RT.siteReady]).then(function (r) {
    var areas = r[0] && Array.isArray(r[0].areas) ? r[0].areas.filter(Boolean) : [];
    var chips = document.getElementById('delivery-chips');
    var text = document.getElementById('delivery-text');
    if (areas.length && chips) {
      chips.innerHTML = areas.map(function (a) {
        return '<span class="delivery-chip"><i class="ri-map-pin-2-line" aria-hidden="true"></i> ' + RT.esc(a) + '</span>';
      }).join('');
      chips.hidden = false;
      if (text) text.textContent = 'We deliver fresh bakery products to the areas below, and our network keeps growing. Not on the list? Message us your location and we will check.';
    }
    RT.bind(r[1], document);
  });
})();
