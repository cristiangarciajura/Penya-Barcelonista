#!/usr/bin/env python3
"""Safely add PBSV menu links to the existing large index without rebuilding it."""
from pathlib import Path
import re
p=Path("index.html")
s=p.read_text(encoding="utf-8")
if "patrocinadors.html" in s and "admin.html" in s:
    print("Menu already integrated");raise SystemExit(0)
# Only alter a recognized navigation element, preserving all other content.
navs=list(re.finditer(r"<nav\b[^>]*>[\s\S]*?</nav\s*>",s,re.I))
if not navs:
    print("No <nav> found; leaving main page untouched");raise SystemExit(0)
candidates=[]
for m in navs:
    fragment=m.group()
    if re.search(r'botiga|tienda|equips|equipos|club|avisos',fragment,re.I):
        candidates.append(m)
if not candidates:
    print("No recognized main navigation; leaving main page untouched");raise SystemExit(0)
m=candidates[0];nav=m.group()
# Match link/button style used by this navigation where possible.
links=re.findall(r'<a\b[^>]*>.*?</a>',nav,re.I|re.S)
if not links:
    print("No anchor links in navigation; leaving main page untouched");raise SystemExit(0)
sample=links[-1]
class_match=re.search(r'\bclass\s*=\s*(["\'])(.*?)\1',sample,re.I)
cls=' class="'+class_match.group(2)+'"' if class_match else ''
# Use same class as current nav anchors; bilingual text selected from document language at runtime.
new=''
if 'patrocinadors.html' not in nav:
    new+=f'<a{cls} href="./patrocinadors.html" data-pbsv-menu="sponsors">Patrocinadors</a>'
if 'admin.html' not in nav:
    new+=f'<a{cls} href="./admin.html" data-pbsv-menu="admin">Administració</a>'
close=re.search(r'</nav\s*>$',nav,re.I)
assert close
nav=nav[:close.start()]+new+nav[close.start():]
s=s[:m.start()]+nav+s[m.end():]
# Keep translation compatible without altering existing language handling.
helper="""<script id="pbsv-menu-i18n">
(function(){
 function sync(){
  var es=(document.documentElement.lang||'').toLowerCase().startsWith('es');
  var a=document.querySelector('[data-pbsv-menu="sponsors"]');
  var b=document.querySelector('[data-pbsv-menu="admin"]');
  if(a)a.textContent=es?'Patrocinadores':'Patrocinadors';
  if(b)b.textContent=es?'Administración':'Administració';
 }
 document.addEventListener('DOMContentLoaded',function(){
  sync();
  new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 });
})();
</script>"""
if 'id="pbsv-menu-i18n"' not in s:
    s=re.sub(r'</body\s*>',lambda m:helper+'\n'+m.group(),s,count=1,flags=re.I)
p.write_text(s,encoding="utf-8")
print("Added sponsor/admin menu links, preserved original page and notifications.")
