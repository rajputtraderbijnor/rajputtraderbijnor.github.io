"""Add more photos to an existing product.  Run:  python3 ~/rajputtraderbijnor.github.io/tools/addphoto.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as c

prods = c.load('products.json')
if not prods:
    sys.exit('No products yet. Use addproduct.py first.')
options = {p['id']: '%s (%d photo(s))' % (p['name'], len(p.get('images') or ([p['coverImage']] if p.get('coverImage') else []))) for p in prods}
pid = c.pick('Which product?', options)
prod = [p for p in prods if p['id'] == pid][0]
imgs = list(prod.get('images') or ([prod['coverImage']] if prod.get('coverImage') else []))
new = c.ask_photos(prod['slug'], existing=len(imgs))
if not new:
    sys.exit('No photos added.')
imgs += new
prod['images'] = imgs
prod['coverImage'] = imgs[0]
c.save_products(prods)
print('\nDone. %s now has %d photo(s).' % (prod['name'], len(imgs)))
