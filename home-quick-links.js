(()=>{'use strict';function init(){const grid=document.querySelector('#home .quick-grid');if(!grid)return;const cards=[...grid.querySelectorAll(':scope > .quick')];for(const card of cards){const heading=card.querySelector('h3')?.textContent?.trim();if(heading==='Els nostres equips'){card.remove();continue}const target=heading==='Botiga oficial'?'store':heading==='La nostra història'?'club':null;if(!target)continue;card.setAttribute('role','button');card.tabIndex=0;card.dataset.quickTarget=target;card.setAttribute('aria-label',heading);card.addEventListener('click',()=>document.querySelector('#mainNav [data-view="'+target+'"]')?.click());card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();card.click()}})}}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init()})();
/* PBSV: logotips dels patrocinadors del menú principal. */
(()=>{'use strict';
async function updateSponsorImages(){
 const grid=document.getElementById('pbsvSponsorGrid');if(!grid)return;
 try{
  const response=await fetch('./data/patrocinadors.json?v='+Date.now(),{cache:'no-store'});
  if(!response.ok)throw Error('No es poden carregar els patrocinadors');
  const data=await response.json();
  if(!Array.isArray(data.sponsors))return;
  const items=data.sponsors.filter(s=>typeof s.name==='string'&&typeof s.url==='string'&&/^https:\/\//.test(s.url));
  if(!items.length)return;
  const cards=items.map(s=>{
   const card=document.createElement('article');card.className='pbsv-sponsor-card';
   const logo=document.createElement('div');logo.className='pbsv-sponsor-logo';
   const valid=typeof s.image==='string'&&(/^(?:assets\/|\.\/|https:\/\/)/.test(s.image)||/^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(s.image));
   if(valid){const img=document.createElement('img');img.src=s.image;img.alt=s.name;img.loading='lazy';img.onerror=()=>logo.replaceChildren(document.createTextNode(s.name));logo.append(img)}
   else logo.textContent=s.name;
   const body=document.createElement('div');body.className='pbsv-sponsor-content';
   const name=document.createElement('h3');name.textContent=s.name;
   const link=document.createElement('a');link.href=s.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Visitar ↗';
   body.append(name,link);card.append(logo,body);return card;
  });
  grid.replaceChildren(...cards);
 }catch(err){console.warn('PBSV sponsor logos:',err)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',updateSponsorImages,{once:true});else updateSponsorImages();
})();
