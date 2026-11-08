"""Add, list or remove a Latest Update shown on the Home page.
Run:  python3 ~/rajputtraderbijnor.github.io/tools/addupdate.py"""
import os, sys, json, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as c

PATH = os.path.join(c.REPO, 'data', 'updates.json')
try:
    ups = c.load('updates.json')
except Exception:
    ups = []

def save():
    with open(PATH, 'w', encoding='utf-8') as f:
        json.dump(ups, f, indent=2, ensure_ascii=False)

print('\nLatest Updates (shown on the Home page)')
for i, u in enumerate(ups, 1):
    print('  %d. %s%s' % (i, u['title'], '' if u.get('isActive', True) else '  [hidden]'))
if not ups:
    print('  (none yet - the strip stays hidden)')
print('\n  A = add a new update\n  D = delete an update\n  H = hide / show an update\n  Q = quit')
choice = input('Choose: ').strip().lower()

if choice == 'a':
    title = c.ask_line('Title (short, e.g. New stock arrived): ').strip()
    if not title:
        sys.exit('Title is needed. Nothing saved.')
    text = c.ask_line('One line of details (optional): ').strip()
    link = input('Link when tapped (e.g. /products.html, or Enter for none): ').strip()
    days = input('Show for how many days? (Enter = no end date): ').strip()
    u = {'id': (max([x.get('id', 0) for x in ups] or [0]) + 1), 'title': title, 'text': text,
         'date': datetime.date.today().isoformat(), 'isActive': True}
    if link:
        u['link'] = link
    if days.isdigit():
        u['expiresOn'] = (datetime.date.today() + datetime.timedelta(days=int(days))).isoformat()
    ups.insert(0, u)
    save()
    print('\nSaved. It will show on the Home page after you push.')
elif choice in ('d', 'h') and ups:
    n = input('Which number? ').strip()
    if n.isdigit() and 1 <= int(n) <= len(ups):
        i = int(n) - 1
        if choice == 'd':
            print('Deleted:', ups.pop(i)['title'])
        else:
            ups[i]['isActive'] = not ups[i].get('isActive', True)
            print('Now', 'visible' if ups[i]['isActive'] else 'hidden')
        save()
    else:
        print('Not a valid number.')
else:
    print('Nothing changed.')
