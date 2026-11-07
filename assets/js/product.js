/**
 * Rajput Traders - Product details page script.
 *
 * Page address: /product.html?slug=loaf-india-gattoo-bread
 * Reads data/products.json, categories.json and brands.json, finds the product
 * and builds the photo gallery (many photos allowed), details, WhatsApp and
 * call buttons, share button and related products. Page title, description
 * and search-engine data (Product + Breadcrumb) are filled in for each product.
 *
 * A product can have many photos: "images": ["a.webp", "b.webp"].
 * If "images" is missing, "coverImage" is used as the only photo.
 */
(function () {
  'use strict';
  var RT = window.RT;
  if (!RT) return;
  var esc = RT.esc;
  var ORIGIN = 'https://rajputtraderbijnor.github.io';
  var PLACEHOLDER = '/assets/images/product-placeholder.svg';

  function $(id) { return document.getElementById(id); }
  function imgUrl(f) { return '/assets/images/products/' + encodeURIComponent(f); }
  function productUrl(p) { return '/product.html?slug=' + encodeURIComponent(p.slug || p.id); }

  function photos(p) {
    var list = Array.isArray(p.images) && p.images.length ? p.images.slice() : [];
    if (p.coverImage && list.indexOf(p.coverImage) < 0) list.unshift(p.coverImage);
    return list.filter(Boolean);
  }

  function setMeta(sel, attr, value) {
    var el = document.querySelector(sel);
    if (el) el.setAttribute(attr, value);
  }

  function addJsonLd(id, data) {
    var old = $(id);
    if (old) old.remove();
    var s = document.createElement('script');
    s.type = 'application/ld+json';
    s.id = id;
    s.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
    document.head.appendChild(s);
  }

  function waText(p, brand) {
    var t = 'Hello Rajput Traders, I would like the wholesale price for ' + p.name;
    if (brand) t += ' (' + brand.name + ')';
    if (p.packagingInfo) t += ', ' + p.packagingInfo;
    return t + '.';
  }

  function notFound() {
    $('pd-loading').hidden = true;
    $('pd-notfound').hidden = false;
    document.title = 'Product not found | Rajput Traders';
    var m = document.createElement('meta');
    m.name = 'robots'; m.content = 'noindex';
    document.head.appendChild(m);
  }

  function renderGallery(p, list) {
    var first = list.length ? imgUrl(list[0]) : PLACEHOLDER;
    var thumbs = list.length > 1
      ? '<div class="product-gallery__thumbs">' + list.map(function (f, i) {
          return '<button type="button" class="product-gallery__thumb' + (i === 0 ? ' product-gallery__thumb--active' : '') +
            '" data-gallery-thumb data-image-url="' + esc(imgUrl(f)) + '" aria-label="View image ' + (i + 1) + '">' +
            '<img src="' + imgUrl(f) + '" alt="" loading="lazy" decoding="async"></button>';
        }).join('') + '</div>'
      : '';
    return '<div class="product-detail__gallery"><div class="product-gallery" data-product-gallery>' +
      '<div class="product-gallery__main"><img src="' + first + '" alt="' + esc(p.name) + '" class="product-gallery__main-image" ' +
      'data-gallery-main-image decoding="async" onerror="this.onerror=null;this.src=\'' + PLACEHOLDER + '\'"></div>' + thumbs + '</div></div>';
  }

  function renderInfo(p, brand, cat) {
    return '<div class="product-detail__info">' +
      (brand ? '<span class="product-detail__brand">' + esc(brand.name) + '</span>' : '') +
      '<h1 class="product-detail__name" id="product-title">' + esc(p.name) + '</h1>' +
      (cat ? '<span class="product-detail__badge product-detail__badge--category">' + esc(cat.name) + '</span>' : '') +
      (p.isSeasonal ? ' <span class="product-detail__badge product-detail__badge--seasonal">Seasonal</span>' : '') +
      (p.description ? '<p class="product-detail__description">' + esc(p.description) + '</p>' : '') +
      (p.packagingInfo ? '<p class="product-detail__packaging"><i class="ri-box-3-line" aria-hidden="true"></i> ' + esc(p.packagingInfo) + '</p>' : '') +
      (p.price ? '<p class="product-detail__mrp">MRP: &#8377;' + esc(p.price) + '</p>' : '') +
      '<p class="product-detail__price-note">Contact us for wholesale pricing and bulk orders.</p>' +
      '<div class="product-detail__actions">' +
        '<a href="#" class="btn btn--whatsapp" data-cta="whatsapp" data-wa-text="' + esc(waText(p, brand)) + '"><i class="ri-whatsapp-line" aria-hidden="true"></i> Ask Wholesale Price</a>' +
        '<a href="#" class="btn btn--outline-dark" data-cta="call"><i class="ri-phone-line" aria-hidden="true"></i> Call</a>' +
        '<button type="button" class="product-detail__share" id="pd-share" title="Share" aria-label="Share ' + esc(p.name) + '"><i class="ri-share-line" aria-hidden="true"></i></button>' +
      '</div>' +
      '<p class="product-detail__price-note" id="pd-share-note" role="status" aria-live="polite"></p>' +
      '</div>';
  }

  function relatedCard(p) {
    var f = photos(p)[0];
    var img = f ? imgUrl(f) : PLACEHOLDER;
    return '<article class="product-card reveal-card">' +
      '<a class="product-card__image-link" href="' + productUrl(p) + '" aria-label="View ' + esc(p.name) + '">' +
      '<img src="' + img + '" alt="' + esc(p.name) + '" class="product-card__image" loading="lazy" decoding="async" ' +
      'onerror="this.onerror=null;this.src=\'' + PLACEHOLDER + '\'"></a>' +
      '<div class="product-card__body">' +
      (p._brand ? '<span class="product-card__brand">' + esc(p._brand.name) + '</span>' : '') +
      '<h3 class="product-card__name"><a href="' + productUrl(p) + '">' + esc(p.name) + '</a></h3>' +
      (p.packagingInfo ? '<p class="product-card__pack">' + esc(p.packagingInfo) + '</p>' : '') +
      '</div></article>';
  }

  function seo(p, brand, cat, list) {
    var url = ORIGIN + '/product.html?slug=' + encodeURIComponent(p.slug || p.id);
    var title = p.name + (brand ? ' - ' + brand.name : '') + ' | Wholesale in Bijnor | Rajput Traders';
    var desc = (p.description ||
      (p.name + (brand ? ' by ' + brand.name : '') + (p.packagingInfo ? ', ' + p.packagingInfo : '') +
       '. Wholesale bakery supply in Bijnor from Rajput Traders. Contact for price on WhatsApp.')).slice(0, 300);
    var image = ORIGIN + (list.length ? imgUrl(list[0]) : '/assets/images/og-image.jpg');
    document.title = title;
    setMeta('meta[name="description"]', 'content', desc);
    setMeta('link[rel="canonical"]', 'href', url);
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[property="og:description"]', 'content', desc);
    setMeta('meta[property="og:url"]', 'content', url);
    setMeta('meta[property="og:image"]', 'content', image);
    var data = {
      '@context': 'https://schema.org', '@type': 'Product', name: p.name, description: desc, url: url,
      image: list.length ? list.map(function (f) { return ORIGIN + imgUrl(f); }) : [image]
    };
    if (brand) data.brand = { '@type': 'Brand', name: brand.name };
    if (cat) data.category = cat.name;
    addJsonLd('product-jsonld', data);
    addJsonLd('crumb-jsonld', {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: ORIGIN + '/' },
        { '@type': 'ListItem', position: 2, name: 'Products', item: ORIGIN + '/products.html' },
        { '@type': 'ListItem', position: 3, name: p.name, item: url }
      ]
    });
    // the page's own static breadcrumb data is replaced by the one above
    document.querySelectorAll('script[type="application/ld+json"]:not([id])').forEach(function (s) { s.remove(); });
  }

  function bindPage(p) {
    document.querySelector('[data-product-gallery]').addEventListener('click', function (e) {
      var t = e.target.closest('[data-gallery-thumb]');
      if (!t) return;
      document.querySelector('[data-gallery-main-image]').src = t.getAttribute('data-image-url');
      document.querySelectorAll('[data-gallery-thumb]').forEach(function (b) {
        b.classList.toggle('product-gallery__thumb--active', b === t);
      });
    });
    $('pd-share').addEventListener('click', function () {
      var url = location.href, note = $('pd-share-note');
      if (navigator.share) {
        navigator.share({ title: p.name + ' - Rajput Traders', url: url }).catch(function () {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(function () { note.textContent = 'Link copied.'; });
      } else {
        note.textContent = url;
      }
    });
  }

  Promise.all([RT.getData('products'), RT.getData('categories'), RT.getData('brands'), RT.siteReady]).then(function (r) {
    var products = Array.isArray(r[0]) ? r[0] : [];
    var cats = Array.isArray(r[1]) ? r[1] : [];
    var brands = Array.isArray(r[2]) ? r[2] : [];
    var key = (new URLSearchParams(location.search).get('slug') || '').trim();
    var visible = products.filter(function (x) { return x && x.name && (x.status == null || x.status === 'published'); });
    visible.forEach(function (x) {
      x._brand = brands.filter(function (b) { return b.id === x.brandId; })[0] || null;
    });
    var p = key ? visible.filter(function (x) { return x.slug === key || String(x.id) === key; })[0] : null;
    if (!p) { notFound(); RT.bind(r[3], document); return; }

    var brand = p._brand;
    var cat = cats.filter(function (c) { return c.id === p.categoryId; })[0] || null;
    var list = photos(p);

    $('pd-root').innerHTML = renderGallery(p, list) + renderInfo(p, brand, cat);
    $('pd-section').hidden = false;
    $('pd-loading').hidden = true;
    $('pd-breadcrumb').insertAdjacentHTML('beforeend',
      '<li class="breadcrumb__separator" aria-hidden="true">/</li><li class="breadcrumb__item"><span aria-current="page">' + esc(p.name) + '</span></li>');
    seo(p, brand, cat, list);
    bindPage(p);

    var related = visible.filter(function (x) { return x !== p && x.categoryId === p.categoryId; });
    if (related.length < 4) {
      visible.forEach(function (x) { if (x !== p && related.indexOf(x) < 0 && x.brandId === p.brandId) related.push(x); });
    }
    related = related.slice(0, 4);
    if (related.length) {
      $('pd-related').innerHTML = related.map(relatedCard).join('');
      $('pd-related-section').hidden = false;
    }
    RT.bind(r[3], document);
    RT.initReveal();
  });
})();
