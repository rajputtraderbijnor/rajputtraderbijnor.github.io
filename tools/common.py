"""Shared helpers for the product tools (addproduct.py, addphoto.py).
Run them from Termux like:  python3 ~/rajputtraderbijnor.github.io/tools/addproduct.py
"""
import json, os, re, shutil, select, sys, time

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


SHARED = os.path.expanduser('~/storage/shared')
# Folders where phone photos usually are (Termux sees them after termux-setup-storage)
PHOTO_ROOTS = [os.path.join(SHARED, d) for d in ('DCIM', 'Pictures', 'Download')]


def _all_photos():
    """Every photo in the usual phone folders, newest first, as (modified time, path)."""
    found = []
    for root in PHOTO_ROOTS:
        for folder, dirs, files in os.walk(root):
            dirs[:] = [d for d in dirs if not d.startswith('.')]
            if folder[len(root):].count(os.sep) > 3:
                dirs[:] = []
                continue
            for f in files:
                if f.startswith('.') or not f.lower().endswith(PHOTO_EXT):
                    continue
                p = os.path.join(folder, f)
                try:
                    found.append((os.path.getmtime(p), p))
                except OSError:
                    pass
    found.sort(reverse=True)
    return found


def find_photo(name):
    """Find a photo by file name (capitals and the .jpg/.png ending do not matter),
    or by full path."""
    raw = name.strip().strip('"').strip("'")
    if not raw:
        return None
    full = os.path.expanduser(raw)
    if os.path.isfile(full):
        return full
    want = raw.lower()
    for _, p in _all_photos():
        f = os.path.basename(p).lower()
        if f == want or os.path.splitext(f)[0] == want:
            return p
    return None


def list_photos(limit=15):
    return _all_photos()[:limit]


OUT_W, OUT_H = 800, 1200     # finished photos are portrait 2:3 (tall enough for a whole pack)
MARGIN = 50                  # breathing space around the product on white backgrounds


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


def _focus_range(im, axis):
    """Where the sharp, detailed part of the photo (the product) is: (start, end) as
    0..1 positions along the axis (0 = top to bottom, 1 = left to right).
    Blurry backgrounds count for little."""
    from PIL import ImageFilter
    small = im.convert('L')
    small.thumbnail((120, 300))
    edges = small.filter(ImageFilter.FIND_EDGES)
    px = edges.load()
    w, h = edges.size
    if axis == 0:
        energy = [sum(px[x, y] for x in range(w)) for y in range(h)]
    else:
        energy = [sum(px[x, y] for y in range(h)) for x in range(w)]
    peak = max(energy) or 1
    hot = [i for i, e in enumerate(energy) if e >= 0.35 * peak]
    if not hot:
        return 0.0, 1.0
    return hot[0] / float(len(energy)), (hot[-1] + 1) / float(len(energy))


def _window(start, end, length, total):
    """Place a window of `length` pixels over the subject (start..end as 0..1 of total).
    Centre it on the subject."""
    s, e = start * total, end * total
    top = (s + e) / 2.0 - length / 2.0
    return int(min(max(top, 0), total - length))


def _portrait(im):
    """Make an 800 x 1200 (2:3) photo.
    - Plain light background: trim the empty margin, centre the product on white.
    - Busy background (kitchen, table...): crop to 2:3 around the product, no blur, no bars."""
    from PIL import Image, ImageChops
    ratio = OUT_W / float(OUT_H)
    if _plain_light_border(im):
        diff = ImageChops.difference(im, Image.new('RGB', im.size, (255, 255, 255))).convert('L')
        box = diff.point(lambda p: 255 if p > 14 else 0).getbbox()
        if box:
            im = im.crop(box)
        fg = im.copy()
        fg.thumbnail((OUT_W - 2 * MARGIN, OUT_H - 2 * MARGIN), Image.LANCZOS)
        canvas = Image.new('RGB', (OUT_W, OUT_H), (255, 255, 255))
        canvas.paste(fg, ((OUT_W - fg.width) // 2, (OUT_H - fg.height) // 2))
        return canvas
    w, h = im.size
    if w / float(h) < ratio:                    # taller than 4:5: choose the height window
        ch = int(round(w / ratio))
        s, e = _focus_range(im, 0)
        # a tall product: grow the window so the whole pack fits (with a small margin)
        ch = int(min(h, w / 0.6, max(ch, (e - s) * h + 0.07 * h)))   # never taller than 3:5
        top = _window(s, e, ch, h)
        box = (0, top, w, top + ch)
    else:                                       # wider than 4:5: choose the width window
        cw = int(round(h * ratio))
        s, e = _focus_range(im, 1)
        left = _window(s, e, cw, w)
        box = (left, 0, left + cw, h)
    im = im.crop(box)
    if im.width > OUT_W:
        im = im.resize((OUT_W, OUT_H), Image.LANCZOS)
    return im


def save_photo(src, out_base):
    """Save a photo into assets/images/products.
    With Pillow installed it is made portrait 2:3 (see _portrait) and saved as a small .webp.
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
        _portrait(im).save(os.path.join(folder, name), 'WEBP', quality=84)
        return name
    except ImportError:
        name = out_base + os.path.splitext(src)[1].lower()
        shutil.copy(src, os.path.join(folder, name))
        print('   (tip: run  pip install pillow  once, and photos will be made the right shape and small automatically)')
        return name


def _show_list(items):
    import time
    for i, (t, p) in enumerate(items, 1):
        where = os.path.relpath(os.path.dirname(p), SHARED)
        print('  %2d = %s   (%s, %s)' % (i, os.path.basename(p), where, time.strftime('%d %b %H:%M', time.localtime(t))))


def ask_photos(slug, existing=0):
    """Show the newest photos of the phone and let the user pick them by number.
    Returns the list of saved file names."""
    if not os.path.isdir(SHARED):
        print('Termux cannot see your phone storage yet. Run   termux-setup-storage   once, tap Allow, then try again.')
        return []
    items = list_photos(15)
    if not items:
        print('No photos found in DCIM, Pictures or Download.')
        return []
    print('\nYour newest photos:')
    _show_list(items)
    drain_input()
    while True:
        raw = input('Type the numbers of the photos for this product, separated by commas (example: 1,3),\n'
                    'or file names, or "more" to see older photos, or press Enter to skip: ').strip()
        if raw.lower() == 'more':
            items = list_photos(45)
            _show_list(items)
            continue
        bad = [p.strip() for p in raw.split(',') if p.strip() and not (
            (p.strip().isdigit() and 1 <= int(p.strip()) <= len(items)) or find_photo(p.strip()))]
        if bad:
            print('   That is not a photo number or file name: "%s"' % raw[:60])
            print('   Type only numbers from the list, like  1,2,3')
            drain_input()
            continue
        break
    saved = []
    parts = [p for p in raw.split(',') if p.strip()]
    for part in parts:
        part = part.strip()
        src = None
        if part.isdigit() and 1 <= int(part) <= len(items):
            src = items[int(part) - 1][1]
        else:
            src = find_photo(part)
        if not src:
            print('   NOT found: %s' % part)
            continue
        n = existing + len(saved) + 1
        saved.append(save_photo(src, slug if n == 1 else '%s-%d' % (slug, n)))
        print('   photo saved: %s' % saved[-1])
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


def ask_line(prompt):
    """Ask one question. If the person pastes several lines (a long description with
    Enter inside it), the extra lines are joined into the same answer instead of
    spilling into the next questions."""
    # read the terminal directly: input() swallows pasted extra lines on some phones
    sys.stdout.write(prompt)
    sys.stdout.flush()
    parts = [sys.stdin.readline().strip()]
    time.sleep(0.5)
    while True:
        ready, _, _ = select.select([sys.stdin], [], [], 0.4)
        if not ready:
            break
        line = sys.stdin.readline()
        if not line:
            break
        parts.append(line.strip())
    return ' '.join(p for p in parts if p)


def drain_input(wait=0.8):
    """Throw away anything still waiting in the keyboard buffer (leftover pasted lines)."""
    try:
        import termios
        time.sleep(wait)
        termios.tcflush(sys.stdin.fileno(), termios.TCIFLUSH)
    except Exception:
        pass
