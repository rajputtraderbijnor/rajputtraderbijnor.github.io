/**
 * Rajput Traders - saved display settings, applied before the page is drawn.
 * Loaded in the <head> of every page so there is no flash of the wrong theme.
 * Stored on the visitor's own phone (localStorage):
 *   rt_theme : light | dark | auto   (default light)
 *   rt_fs    : lg                    (text size; missing = normal)
 *   rt_lang  : en | hi               (Hindi uses automatic translation, see settings.js)
 *   rt_motion: reduced               (fewer animations; missing = normal)
 *   rt_contrast: high                (stronger colours; missing = normal)
 *   rt_remember: off                 (do not remember form details; missing = remember)
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
    if (localStorage.getItem('rt_motion') === 'reduced') d.setAttribute('data-motion', 'reduced');
    if (localStorage.getItem('rt_contrast') === 'high') d.setAttribute('data-contrast', 'high');
  } catch (e) {
    d.setAttribute('data-theme', 'light');
  }
  /* Keep Chrome's install offer so Settings > Install app can use it later. */
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); window.__rtInstallEvt = e; });
})();
