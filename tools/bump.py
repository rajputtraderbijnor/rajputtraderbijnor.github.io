"""Bump the file version so browsers load your newest CSS/JS straight away.

Run it once before each push that changes any .css or .js file:
    python3 ~/rajputtraderbijnor.github.io/tools/bump.py

It adds or raises ?v=N on every CSS/JS link in all .html files and on the
scripts that assets/js/site.js loads by itself.  Images and data files do not need it.
"""
import os, re, sys, glob

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE_JS = os.path.join(REPO, 'assets', 'js', 'site.js')

js = open(SITE_JS, encoding='utf-8').read()
m = re.search(r"var ASSET_V = '(\d+)';", js)
if not m:
    sys.exit("Could not find ASSET_V in assets/js/site.js")
new = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else int(m.group(1)) + 1

open(SITE_JS, 'w', encoding='utf-8').write(js.replace(m.group(0), "var ASSET_V = '%d';" % new, 1))

# Make sure every page loads the display-settings script (head) and the dark theme stylesheet.
THEME_TAG = '<script src="/assets/js/theme.js"></script>'
MANIFEST_TAG = '<link rel="manifest" href="/manifest.webmanifest">'
DARK_TAG = '<link rel="stylesheet" href="/assets/css/dark.css">'
for path in glob.glob(os.path.join(REPO, '*.html')):
    text = open(path, encoding='utf-8').read()
    out = text
    if '/assets/css/tokens.css' in out:
        if '/assets/js/theme.js' not in out:
            out = re.sub(r'(\s*)(<link rel="stylesheet" href="/assets/css/tokens\.css)', lambda m: m.group(1) + THEME_TAG + m.group(1) + m.group(2), out, count=1)
        if 'manifest.webmanifest' not in out:
            out = re.sub(r'(<meta name="theme-color"[^>]*>)', lambda m: m.group(1) + '\n  ' + MANIFEST_TAG, out, count=1)
        if '/assets/css/dark.css' not in out:
            out = re.sub(r'(<link rel="stylesheet" href="/assets/css/extras\.css[^"]*">)', lambda m: m.group(1) + '\n  ' + DARK_TAG, out, count=1)
    if out != text:
        open(path, 'w', encoding='utf-8').write(out)

pat = re.compile(r'((?:src|href)=")(/assets/(?:css|js)/[^"?#]+)(?:\?v=[^"]*)?(")')
count = 0
for path in glob.glob(os.path.join(REPO, '*.html')):
    text = open(path, encoding='utf-8').read()
    out, n = pat.subn(lambda x: '%s%s?v=%d%s' % (x.group(1), x.group(2), new, x.group(3)), text)
    if out != text:
        open(path, 'w', encoding='utf-8').write(out)
    count += n
print('File version is now %d (%d links updated).' % (new, count))
