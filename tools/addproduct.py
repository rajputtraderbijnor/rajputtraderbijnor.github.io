"""Add a new product.  Run:  python3 ~/rajputtraderbijnor.github.io/tools/addproduct.py"""
import os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as c

cats = {x['id']: x['name'] for x in c.load('categories.json')}
brands = {x['id']: x['name'] for x in c.load('brands.json') if x.get('isActive', True)}
prods = c.load('products.json')

name = input('Product name (example: Milk Bread): ').strip()
if not name:
    sys.exit('Name is needed.')
brand = c.pick('Which brand?', brands)
cat = c.pick('Which category?', cats)
pack = input('Pack size (example: 400 g) or press Enter to skip: ').strip()
price_raw = input('MRP printed on the pack in rupees, numbers only (example: 10) or press Enter to skip: ').strip()
price = int(price_raw) if price_raw.isdigit() else None
# A long description can be pasted with line breaks: the lines are joined into one.
desc = c.ask_line('Short description (optional, press Enter to skip): ')

slug = re.sub(r'[^a-z0-9]+', '-', (brands[brand] + ' ' + name).lower()).strip('-')
if any(p.get('slug') == slug for p in prods):
    sys.exit('A product with this brand and name already exists. Use addphoto.py to add photos to it.')
photos = c.ask_photos(slug)

pid = max([p.get('id', 0) for p in prods] + [0]) + 1
prod = {'id': pid, 'name': name, 'slug': slug, 'categoryId': cat, 'brandId': brand,
        'packagingInfo': pack or None, 'description': desc or None,
        'coverImage': photos[0] if photos else None, 'images': photos,
        'price': price, 'isSeasonal': False, 'sortOrder': pid, 'status': 'published'}
prods.append(prod)
c.save_products(prods)
print('\nAdded: %s (%s, %s) with %d photo(s). Total products: %d' % (name, brands[brand], cats[cat], len(photos), len(prods)))
