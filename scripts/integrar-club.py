#!/usr/bin/env python3
"""Connect existing club cards to JSON without replacing the SPA or its details."""
from pathlib import Path
p=Path('index.html');s=p.read_text(encoding='utf-8')
marker='id="pbsv-club-data-script"'
if marker in s:
 print('Club data already connected');raise SystemExit(0)
assert '</body>' in s
js='''<script id="pbsv-club-data-script">
(function(){
function apply(sections){
 const root=document.getElementById('club');if(!root)return;
 const cards=root.querySelector('.club-grid');if(!cards)return;
 const byId=new Map(Array.from(cards.querySelectorAll('[data-detail]')).map(el=>[el.dataset.detail,el]));
 const selected=new Set();
 for(const item of sections){
  if(!item||typeof item.id!=='string'||typeof item.name!=='string')continue;
  let card=byId.get(item.id);
  if(!card){
   card=document.createElement('article');card.className='club-card';card.dataset.detail=item.id;
   const h=document.createElement('h3');const p=document.createElement('p');card.append(h,p);
   card.addEventListener('click',()=>showDetails(item));cards.append(card);
  }
  const title=card.querySelector('h3');const summary=card.querySelector('p');
  if(title)title.textContent=item.name;
  if(summary&&typeof item.content==='string')summary.textContent=item.content;
  if(item.url&&/^https:\/\//.test(item.url)){let a=card.querySelector('.pbsv-club-link');if(!a){a=document.createElement('a');a.className='pbsv-club-link';a.target='_blank';a.rel='noopener noreferrer';a.textContent='Més informació';card.append(a)}a.href=item.url;a.onclick=e=>e.stopPropagation()}
  selected.add(item.id);
 }
 // Keep original cards visible: never silently delete built-in sections.
 function showDetails(item){const panel=document.getElementById('detailPanel'),title=document.getElementById('detailTitle'),body=document.getElementById('detailText');if(!panel||!title||!body)return;title.textContent=item.name;body.textContent=item.content||'';panel.classList.add('open');panel.scrollIntoView({behavior:'smooth',block:'nearest'})}
}
fetch('./data/club.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('club data unavailable');return r.json()}).then(d=>{if(Array.isArray(d.sections))apply(d.sections)}).catch(e=>console.warn('PBSV club:',e));
})();
</script>'''
s=s.replace('</body>',js+'</body>',1)
assert marker in s
p.write_text(s,encoding='utf-8')
print('Club cards connected to data/club.json')
