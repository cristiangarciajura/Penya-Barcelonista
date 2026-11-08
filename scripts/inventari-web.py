#!/usr/bin/env python3
"""Read-only inventory of current SPA sections; never rewrites index.html."""
from html.parser import HTMLParser
from pathlib import Path
import json,re
class Inventory(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.sections=[];self.current=None;self.depth=0;self.capture=None
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if self.current is not None:
            self.depth+=1
            if tag in ('h1','h2','h3') and not self.current['title']:
                self.capture=tag
        elif tag=='section' and 'view' in a.get('class','').split() and a.get('id'):
            self.current={'id':a['id'],'title':'','preview':''}
            self.depth=1
    def handle_data(self,data):
        if self.current is not None:
            t=' '.join(data.split())
            if self.capture and t:self.current['title']+=' '+t
            if t and len(self.current['preview'])<450:self.current['preview']+=' '+t[:150]
    def handle_endtag(self,tag):
        if self.current is None:return
        if tag==self.capture:self.capture=None
        self.depth-=1
        if self.depth<=0:
            self.current['title']=self.current['title'].strip()[:160]
            self.current['preview']=self.current['preview'].strip()[:450]
            self.sections.append(self.current);self.current=None;self.capture=None;self.depth=0
s=Path('index.html').read_text(encoding='utf-8')
parser=Inventory();parser.feed(s)
out={'version':1,'source':'index.html','sections':parser.sections}
Path('data').mkdir(exist_ok=True)
Path('data/site-inventory.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Detected',len(parser.sections),'views:',[(v['id'],v['title']) for v in parser.sections])
