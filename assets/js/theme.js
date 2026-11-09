/**
 * Rajput Traders - saved display settings, applied before the page is drawn.
 * Loaded in the <head> of every page so there is no flash of the wrong theme.
 * Stored on the visitor's own phone (localStorage):
 *   rt_theme : light | dark | auto   (default light)
 *   rt_fs    : lg                    (text size; missing = normal)
 *   rt_lang  : en | hi               (Hindi uses automatic translation, see settings.js)
 * The settings panel itself lives in settings.js.
 */
(function () {
  'use strict';
  var d = document.documentElement;
  try {
    var t = localStorage.getItem('rt_theme') || 'light';
    var dark = t === 'dark' || (t === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    d.setAttribute('data-theme', dark ? 'dark' : 'light');
    d.setAttribute('data-theme-pref', t);
    var fs = localStorage.getItem('rt_fs');
    if (fs === 'lg') d.setAttribute('data-fs', fs);
    if (localStorage.getItem('rt_lang') === 'hi') d.setAttribute('data-lang', 'hi');
  } catch (e) {
    d.setAttribute('data-theme', 'light');
  }
})();
