"""Shared helpers for the product tools (addproduct.py, addphoto.py).
Run them from Termux like:  python3 ~/rajputtraderbijnor.github.io/tools/addproduct.py
"""
import json, os, re, shutil

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DL = os.path.expanduser('~/storage/shared/Download')
ORIGIN = 'https://rajputtraderbijnor.github.io'
PHOTO_EXT = ('.png', '.jpg', '.jpeg', '.webp')


def load(name):
    with open(os.path.join(REPO, 'data', name), encoding='utf-8') as f:
        return json.load(f)


def save_products(prods):
    with open(os.path.join(REPO, 'data', 'products.json'), 'w', encoding='utf-8') as f:
        json.dump(prods, f, indent=2, ensure_ascii=False)
    rebuild_sitemap(prods)


def pick(title, options):
    print('\n' + title)
    for k, v in options.items():
        print('  %s = %s' % (k, v))
    while True:
        try:
            n = int(input('Number: ').strip())
            if n in options:
                return n
        except ValueError:
            pass
        print('Please type one of the numbers above.')


def find_photo(name):
    """Find a photo in Download even if the ending (.png/.jpg) or capitals differ."""
    want = name.strip().strip('"').strip("'").lower()
    if not want:
        return None
    try:
        files = os.listdir(DL)
    except OSError:
        return None
    for f in files:
        if f.lower() == want:
            return os.path.join(DL, f)
    for f in files:
        base, ext = os.path.splitext(f)
        if base.lower() == want and ext.lower() in PHOTO_EXT:
            return os.path.join(DL, f)
    return None


def list_photos():
    try:
        return sorted(f for f in os.listdir(DL) if f.lower().endswith(PHOTO_EXT) and not f.startswith('.'))
    except OSError:
        return []


SIZE = 1000      # finished photos are SIZE x SIZE pixels (square, as the site shows them)
MARGIN = 40      # breathing space around the product


def _plain_light_border(im):
    """True when the photo has a plain white / very light edge (a studio-style shot)."""
    w, h = im.size
    px = im.load()
    pts = []
    for i in range(0, w, max(1, w // 40)):
        pts += [(i, 1), (i, h - 2)]
    for j in range(0, h, max(1, h // 40)):
        pts += [(1, j), (w - 2, j)]
    ok = sum(1 for p in pts if min(px[p]) >= 232)
    return ok / float(len(pts)) >= 0.95


def _square(im):
    """Make a SIZE x SIZE photo without cutting the product.
    - Plain light background: trim the empty margin, centre the product on white.
    - Busy background (kitchen, table...): keep the whole picture and fill the sides
      with a soft blurred copy of it."""
    from PIL import Image, ImageChops, ImageFilter
    if _plain_light_border(im):
        diff = ImageChops.difference(im, Image.new('RGB', im.size, (255, 255, 255))).convert('L')
        box = diff.point(lambda p: 255 if p > 14 else 0).getbbox()
        if box:
            im = im.crop(box)
        fg = im.copy()
        fg.thumbnail((SIZE - 2 * MARGIN, SIZE - 2 * MARGIN), Image.LANCZOS)
        canvas = Image.new('RGB', (SIZE, SIZE), (255, 255, 255))
        canvas.paste(fg, ((SIZE - fg.width) // 2, (SIZE - fg.height) // 2))
        return canvas
    scale = SIZE / float(min(im.size))
    bg = im.resize((max(SIZE, int(im.width * scale)), max(SIZE, int(im.height * scale))), Image.LANCZOS)
    left, top = (bg.width - SIZE) // 2, (bg.height - SIZE) // 2
    bg = bg.crop((left, top, left + SIZE, top + SIZE)).filter(ImageFilter.GaussianBlur(28))
    fg = im.copy()
    fg.thumbnail((SIZE, SIZE), Image.LANCZOS)
    bg.paste(fg, ((SIZE - fg.width) // 2, (SIZE - fg.height) // 2))
    return bg


def save_photo(src, out_base):
    """Save a photo into assets/images/products.
    With Pillow installed it is made square (see _square) and saved as a small .webp.
    Without Pillow it is simply copied. Returns the saved file name."""
    folder = os.path.join(REPO, 'assets', 'images', 'products')
    os.makedirs(folder, exist_ok=True)
    try:
        from PIL import Image
        im = Image.open(src)
        if im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info):
            im = im.convert('RGBA')
            bg = Image.new('RGB', im.size, (255, 255, 255))
            bg.paste(im, mask=im.split()[-1])
            im = bg
        else:
            im = im.convert('RGB')
        name = out_base + '.webp'
        _square(im).save(os.path.join(folder, name), 'WEBP', quality=84)
        return name
    except ImportError:
        name = out_base + os.path.splitext(src)[1].lower()
        shutil.copy(src, os.path.join(folder, name))
        print('   (tip: run  pip install pillow  once, and photos will be made square and small automatically)')
        return name


def ask_photos(slug, existing=0):
    """Ask for photo names (comma separated). Returns the list of saved file names."""
    raw = input('Photo file names in Download, separated by commas (or press Enter to skip): ').strip()
    saved = []
    for part in [p for p in raw.split(',') if p.strip()]:
        src = find_photo(part)
        if not src:
            print('   NOT found: %s' % part.strip())
            continue
        n = existing + len(saved) + 1
        saved.append(save_photo(src, slug if n == 1 else '%s-%d' % (slug, n)))
        print('   photo saved: %s' % saved[-1])
    if raw and len(saved) < len([p for p in raw.split(',') if p.strip()]):
        print('Photos in your Download folder:')
        for f in list_photos():
            print('   ', f)
    return saved


def rebuild_sitemap(prods):
    path = os.path.join(REPO, 'sitemap.xml')
    try:
        text = open(path, encoding='utf-8').read()
    except OSError:
        return
    text = re.sub(r'\s*<url>\s*<loc>[^<]*product\.html\?slug=[^<]*</loc>\s*</url>', '', text)
    blocks = ''.join('\n  <url>\n    <loc>%s/product.html?slug=%s</loc>\n  </url>' % (ORIGIN, p['slug'])
                     for p in prods if p.get('slug') and p.get('status') in (None, 'published'))
    text = text.replace('</urlset>', blocks.lstrip('\n') + '\n</urlset>' if blocks else '</urlset>')
    open(path, 'w', encoding='utf-8').write(text)
