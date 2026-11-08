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

pat = re.compile(r'((?:src|href)=")(/assets/(?:css|js)/[^"?#]+)(?:\?v=[^"]*)?(")')
count = 0
for path in glob.glob(os.path.join(REPO, '*.html')):
    text = open(path, encoding='utf-8').read()
    out, n = pat.subn(lambda x: '%s%s?v=%d%s' % (x.group(1), x.group(2), new, x.group(3)), text)
    if out != text:
        open(path, 'w', encoding='utf-8').write(out)
    count += n
print('File version is now %d (%d links updated).' % (new, count))
