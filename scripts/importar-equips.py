#!/usr/bin/env python3
"""Import the 25 existing team records and their images without changing index.html."""
from pathlib import Path
import re, json, ast, hashlib, base64
s=Path('index.html').read_text(encoding='utf-8')
def json_object(name):
 m=re.search(r'\bconst\s+'+re.escape(name)+r'\s*=\s*(\{)',s)
 if not m: raise RuntimeError('Missing '+name)
 obj,_=json.JSONDecoder().raw_decode(s[m.start(1):])
 return obj
assets=json_object('teamAssets')
rosters=json_object('teamRosters')
links_match=re.search(r'\bconst\s+fcfLinks\s*=\s*(\{.*?\})\s*;',s,re.S)
links=ast.literal_eval(links_match.group(1)) if links_match else {}
candidates=[]
for m in re.finditer(r'\bconst\s+(\w+)\s*=\s*(\[)',s):
 if m.group(1) in ('clubBoard','clubSports'):continue
 fragment=s[m.start(2):m.start(2)+7000]
 end=fragment.find('];')
 if end<0:continue
 try: obj=ast.literal_eval(fragment[:end+1])
 except (SyntaxError,ValueError):continue
 if isinstance(obj,list) and len(obj)>=20 and all(isinstance(x,(list,tuple)) and len(x)==2 and x[1] in ('masc','fem','genuine') for x in obj):
  candidates.append((m.group(1),obj))
assert len(candidates)==1, f'Expected one team array, found {len(candidates)}'
_,raw=candidates[0]
assert len(raw)==25, f'Expected 25 teams, got {len(raw)}'
p=Path('data/equips.json')
existing=json.loads(p.read_text(encoding='utf-8'))
if existing.get('teams'):
 print('Teams JSON already contains edits; leaving it unchanged');raise SystemExit(0)
folder=Path('assets/equips');folder.mkdir(parents=True,exist_ok=True)
teams=[]
for name,group in raw:
 photo=assets.get(name)
 image=None
 if isinstance(photo,str) and photo.startswith('data:image/') and ';base64,' in photo:
  head,encoded=photo.split(',',1)
  ext={'data:image/jpeg;base64':'.jpg','data:image/png;base64':'.png','data:image/webp;base64':'.webp'}.get(head)
  if not ext:raise RuntimeError('Unexpected image type for '+name)
  blob=base64.b64decode(encoded,validate=True)
  digest=hashlib.sha256(name.encode()).hexdigest()[:12]
  image_path=folder/(digest+ext)
  image_path.write_bytes(blob)
  image='./'+str(image_path)
 elif isinstance(photo,str) and photo:image=photo
 roster=rosters.get(name) or {}
 players=roster.get('players') or []
 staff=roster.get('staff') or []
 teams.append({'id':'team-'+hashlib.sha256(name.encode()).hexdigest()[:12],'name':name,'category':group,'coach':', '.join(p['name'] for p in staff if 'ENTRENAD' in p.get('role','').upper()),'schedule':'','url':links.get(name,''),'image':image,'members':[p.get('name','') for p in players if p.get('name')],'players':players,'staff':staff})
p.write_text(json.dumps({'version':1,'teams':teams},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Imported',len(teams),'teams;',sum(bool(t['image']) for t in teams),'images;',sum(bool(t['players']) for t in teams),'rosters')
