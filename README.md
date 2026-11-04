# Rajput Traders – static website

Plain HTML, CSS and JavaScript. No server, no database. Hosted free on GitHub Pages.

## Where to edit things

| What you want to change | File |
|---|---|
| Phone, WhatsApp, email, address, hours, GST, map link | `data/site.json` |
| Delivery towns / areas | `data/delivery.json` |
| Products, categories, brands, FAQs, page wording | the other files in `data/` |
| Photos | `assets/images/` |

Phone/address also appear in the `LocalBusiness` block inside `index.html` (for Google). Change both when the number changes.

## Folder structure

```
index.html            Home page
404.html              "Page not found" page
robots.txt            Tells Google it may crawl everything
sitemap.xml           List of pages for Google (add each new page)
assets/css/           tokens.css (colours), base.css, components.css, extras.css
assets/js/            site.js (header, footer, buttons, helpers), home.js (home page only)
assets/images/        logo, hero, favicon, social-share image, product placeholder
data/                 All editable content as JSON
```

## Preview on your computer
`python3 -m http.server 8000` in this folder, then open http://localhost:8000

## When you buy a custom domain
Replace `rajputtraderbijnor.github.io` with the new domain in `index.html`, `robots.txt` and `sitemap.xml`:
`sed -i 's/rajputtraderbijnor.github.io/YOURDOMAIN.com/g' index.html robots.txt sitemap.xml`
