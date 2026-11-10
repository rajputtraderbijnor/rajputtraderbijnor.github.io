"""Add a new product category.  Run:  python3 ~/rajputtraderbijnor.github.io/tools/addcategory.py
A category shows on the Products page filters as soon as it has at least one product."""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as c

cats = c.load('categories.json')
name = input('Category name (example: Cakes): ').strip()
if not name:
    sys.exit('Name is needed.')
slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
if any(x.get('slug') == slug or x.get('name', '').lower() == name.lower() for x in cats):
    sys.exit('This category already exists.')
cid = max([x.get('id', 0) for x in cats] + [0]) + 1
row = {'id': cid, 'name': name, 'slug': slug}
if any('sortOrder' in x for x in cats):
    row['sortOrder'] = max([x.get('sortOrder', 0) for x in cats] + [0]) + 1
cats.append(row)
with open(os.path.join(c.REPO, 'data', 'categories.json'), 'w', encoding='utf-8') as f:
    json.dump(cats, f, indent=2, ensure_ascii=False)
print('\nAdded category: %s. Total categories: %d' % (name, len(cats)))
print('Now add products to it:  python3 ~/rajputtraderbijnor.github.io/tools/addproduct.py')
