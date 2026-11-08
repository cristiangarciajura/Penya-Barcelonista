#!/usr/bin/env python3
"""Migrate existing club cards to editable JSON, preserving public source."""
from pathlib import Path
from html.parser import HTMLParser
import json,re
s=Path('index.html').read_text(encoding='utf-8')
m=re.search(r'<section class="view" id="club">(.*?)</section>',s,re.S)
assert m, 'Club section not found'
class Cards(HTMLParser):
 def __init__(self):super().__init__();self.cards=[];self.card=None;self.tag=None
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='article' and 'club-card' in a.get('class',''):
   self.card={'id':a.get('data-detail',''),'name':'','content':'','url':''}
  if self.card is not None and tag in ('h3','p'):self.tag=tag
 def handle_data(self,t):
  if self.card is not None and self.tag:
   k='name' if self.tag=='h3' else 'content'
   self.card[k]+=t
 def handle_endtag(self,tag):
  if tag==self.tag:self.tag=None
  if tag=='article' and self.card:
   self.cards.append(self.card);self.card=None;self.tag=None
parser=Cards();parser.feed(m.group(1))
assert len(parser.cards)>=5, 'Expected existing club cards'
p=Path('data/club.json')
d=json.loads(p.read_text(encoding='utf-8'))
if d.get('sections'):
 print('Club JSON already populated; preserving edits')
else:
 p.write_text(json.dumps({'version':1,'sections':parser.cards},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Imported',len(parser.cards),'club sections')
