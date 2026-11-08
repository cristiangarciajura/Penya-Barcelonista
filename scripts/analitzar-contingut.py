#!/usr/bin/env python3
"""Non-destructive inspection of existing teams/club content in the large SPA."""
from pathlib import Path
import re,json,html
s=Path('index.html').read_text(encoding='utf-8')
def excerpt(pos, radius=220):
    return re.sub(r'\s+',' ',s[max(0,pos-radius):pos+radius])[:440]
terms=['id="teams"','id="club"','25 equips','plantilla','teamData','teamsData','const teams','const TEAM','clubCards','Història','Junta directiva','Palmarès']
hits={}
for term in terms:
    matches=list(re.finditer(re.escape(term),s,re.I))
    hits[term]={'count':len(matches),'examples':[excerpt(m.start()) for m in matches[:5]]}
# Extract literal opening tags in the teams section, without rewriting original HTML
m=re.search(r'<section\b[^>]*\bid=["\']teams["\'][^>]*>',s,re.I)
teams=''
if m:
    end=s.find('</section>',m.end())
    teams=s[m.start():end+10] if end!=-1 else s[m.start():m.start()+10000]
report={'version':1,'source':'index.html','size':len(s),'terms':hits,'teams_section_excerpt':re.sub(r'\s+',' ',teams[:14000])}
Path('data/site-analysis.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Wrote inspection report; source unchanged')
