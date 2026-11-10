"""Add a new brand.  Run:  python3 ~/rajputtraderbijnor.github.io/tools/addbrand.py
Brands without a logo are fine: the Brands page shows the brand name instead."""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as c

brands = c.load('brands.json')
name = input('Brand name (example: Britannia): ').strip()
if not name:
    sys.exit('Name is needed.')
slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
if any(b.get('slug') == slug or b.get('name', '').lower() == name.lower() for b in brands):
    sys.exit('This brand already exists. Add products to it with addproduct.py.')
bid = max([b.get('id', 0) for b in brands] + [100]) + 1
brands.append({'id': bid, 'name': name, 'slug': slug, 'isActive': True})
with open(os.path.join(c.REPO, 'data', 'brands.json'), 'w', encoding='utf-8') as f:
    json.dump(brands, f, indent=2, ensure_ascii=False)
print('\nAdded brand: %s. Total brands: %d' % (name, len(brands)))
print('Now add its products:  python3 ~/rajputtraderbijnor.github.io/tools/addproduct.py')
