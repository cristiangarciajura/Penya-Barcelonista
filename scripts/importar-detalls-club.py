#!/usr/bin/env python3
"""Extract existing club detail texts and member lists from index.html."""
from pathlib import Path
import re,json,ast
s=Path('index.html').read_text(encoding='utf-8')
p=Path('data/club.json');d=json.loads(p.read_text(encoding='utf-8'))
def literal(name,opening):
 m=re.search(r'\bconst\s+'+re.escape(name)+r'\s*=\s*'+re.escape(opening),s)
 if not m:raise RuntimeError('Missing '+name)
 pos=m.end()-1;depth=0;quote=None;escaped=False
 for i in range(pos,len(s)):
  ch=s[i]
  if quote:
   if escaped:escaped=False
   elif ch=='\\':escaped=True
   elif ch==quote:quote=None
  elif ch in ('"',"'","`"):quote=ch
  elif ch in '[{':depth+=1
  elif ch in ']}':
   depth-=1
   if depth==0:return s[pos:i+1]
 raise RuntimeError('Unterminated '+name)
def parse(name,opening):
 raw=literal(name,opening)
 try:return json.loads(raw)
 except json.JSONDecodeError:return ast.literal_eval(raw)
details=parse('details','{')
board=parse('clubBoard','[')
sports=parse('clubSports','[')
assert isinstance(details,dict) and len(details)>=5
for section in d['sections']:
 ident=section['id']
 if ident in details:
  entry=details[ident]
  if isinstance(entry,(list,tuple)) and len(entry)>1 and isinstance(entry[1],str):
   section.setdefault('detail',entry[1])
 if ident=='board':section.setdefault('people',board)
 if ident=='sports':section.setdefault('people',sports)
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Extracted detail for',sum(bool(x.get('detail')) for x in d['sections']),'sections and board/sports people')
