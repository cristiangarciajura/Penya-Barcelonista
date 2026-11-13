(()=>{'use strict';
const norm=t=>(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const validImage=s=>/^(?:data:image\/(?:png|jpeg|webp|gif);base64,|https:\/\/|\.\/|assets\/)/i.test(s||'');
function find(day){
 const label=day==='saturday'?'dissabte':'diumenge';
 const heading=[...document.querySelectorAll('#home h3')].find(h=>norm(h.textContent).trim()==='partits de '+label);
 return heading?.closest('article.news-card')||null;
}
function showPoster(src,alt){
 let overlay=document.getElementById('pbsv-poster-viewer');
 if(!overlay){overlay=document.createElement('div');overlay.id='pbsv-poster-viewer';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Cartell dels partits ampliat');overlay.style.cssText='position:fixed;inset:0;z-index:2147483647;background:rgba(2,9,24,.97);display:flex;align-items:center;justify-content:center;padding:48px 8px 12px;overflow:auto';const pic=document.createElement('img');pic.style.cssText='display:block;width:100%;height:100%;max-width:100%;max-height:calc(100dvh - 64px);object-fit:contain';pic.alt='';const close=document.createElement('button');close.type='button';close.textContent='✕ Tancar';close.setAttribute('aria-label','Tancar cartell');close.style.cssText='position:fixed;top:8px;right:10px;z-index:1;padding:10px 14px;border:0;border-radius:10px;background:#fff;color:#07152d;font:600 16px system-ui;cursor:pointer';overlay.append(pic,close);const dismiss=()=>{overlay.remove();document.removeEventListener('keydown',esc)};const esc=e=>{if(e.key==='Escape')dismiss()};close.addEventListener('click',dismiss);overlay.addEventListener('click',e=>{if(e.target===overlay)dismiss()});document.addEventListener('keydown',esc);document.body.append(overlay);close.focus()}
 const pic=overlay.querySelector('img');pic.src=src;pic.alt=alt;
}
function update(card,item,day){
 if(!card||!item||(!item.title&&!item.image&&!item.comment))return;
 const img=card.querySelector('img.news-photo');
 if(img&&validImage(item.image)){img.src=item.image;img.alt='Cartell dels '+(item.title||'partits');img.style.visibility='visible';img.dataset.currentPoster='yes';}
 const title=card.querySelector('.news-body h3');if(title&&item.title)title.textContent=item.title;
 const paragraph=card.querySelector('.news-body p');if(paragraph&&item.comment)paragraph.textContent=item.comment;
 const meta=card.querySelector('.news-body .meta');
 if(meta&&item.date){const [y,m,d]=item.date.split('-');const months=['','GENER','FEBRER','MARÇ','ABRIL','MAIG','JUNY','JULIOL','AGOST','SETEMBRE','OCTUBRE','NOVEMBRE','DESEMBRE'];meta.textContent=Number(d)+' '+months[Number(m)]+' '+y;}
 const open=card.querySelector('.photo-open');
 if(open&&img){open.disabled=false;open.removeAttribute('aria-disabled');}
}
// Eliminar únicament l'avís antic de la portada; conservar els cartells i la resta del contingut.
function removeOutdatedAgendaNotice(){
 const home=document.getElementById('home');if(!home)return;
 const phrase='Agenda del cap de setmana del 7–8 de novembre de 2026. Aquests cartells són d\'aquesta jornada, no un calendari actualitzat automàticament.';
 const normalize=s=>(s||'').replace(/\s+/g,' ').trim().replace(/\u2013/g,'-');
 const expected=normalize(phrase);
 const walker=document.createTreeWalker(home,NodeFilter.SHOW_TEXT);
 const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 for(const node of nodes){
  const text=node.nodeValue||'';
  if(normalize(text).includes(expected)){
   const parent=node.parentElement;
   if(parent&&normalize(parent.textContent)===expected&&/^(P|SMALL|SPAN|DIV)$/.test(parent.tagName))parent.remove();
   else node.nodeValue=text.replace(/Agenda del cap de setmana del 7[–-]8 de novembre de 2026\.\s*Aquests cartells són d.aquesta jornada, no un calendari actualitzat automàticament\./u,'');
  }
 }
}
function cards(){return ['saturday','sunday'].map(find).filter(Boolean)}
function loading(card){const img=card.querySelector('img.news-photo');if(img){img.style.visibility='hidden';img.removeAttribute('data-current-poster')}const meta=card.querySelector('.news-body .meta');if(meta)meta.textContent='ACTUALITZANT';const p=card.querySelector('.news-body p');if(p)p.textContent='Carregant els partits actualitzats…';const btn=card.querySelector('.photo-open');if(btn){btn.disabled=true;btn.setAttribute('aria-disabled','true')}}
function unavailable(card){const meta=card.querySelector('.news-body .meta');if(meta)meta.textContent='INFORMACIÓ PENDENT';const p=card.querySelector('.news-body p');if(p)p.textContent='No es poden consultar els cartells actualitzats ara mateix.';const img=card.querySelector('img.news-photo');if(img)img.style.visibility='hidden'}
// Capture before the old inline page handlers, so only one viewer ever opens.
document.addEventListener('click',e=>{const btn=e.target.closest?.('button.photo-open[data-poster]');if(!btn)return;e.preventDefault();e.stopImmediatePropagation();e.stopPropagation();if(btn.disabled)return;const img=btn.closest('article.news-card')?.querySelector('img.news-photo');if(img&&img.dataset.currentPoster==='yes')showPoster(img.currentSrc||img.src,img.alt||'Cartell dels partits')},true);
async function init(){removeOutdatedAgendaNotice();const all=cards();all.forEach(loading);try{const r=await fetch('./data/club.json?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);const club=await r.json();const entry=club.sections?.find(x=>x.id==='pbsv-weekend-matches');if(!entry?.detail)throw Error('Cartells no configurats');const data=JSON.parse(entry.detail);for(const day of ['saturday','sunday']){const card=find(day),item=data[day];if(item&&validImage(item.image))update(card,item,day);else if(card)unavailable(card)}}catch(e){all.forEach(unavailable);console.warn('PBSV partits:',e)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();