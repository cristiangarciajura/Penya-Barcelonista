(()=>{'use strict';
const url='./data/partits-cap-setmana.json?v=';
const normalize=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function candidates(){
 const home=document.querySelector('#home');if(!home)return [];
 return [...home.querySelectorAll('article,.match-card,.partit-card,.event-card')].filter(el=>/dissabte|sabado|sábado|diumenge|domingo/i.test(normalize(el.textContent).slice(0,350)));
}
function dayOf(el){const t=normalize(el.textContent.slice(0,350));return /dissabte|sabado/.test(t)?'saturday':/diumenge|domingo/.test(t)?'sunday':null}
function apply(el,m,day){
 if(!m||!m.title&&!m.comment&&!m.image)return;
 let box=el.querySelector('.pbsv-weekend-content');
 if(!box){box=document.createElement('div');box.className='pbsv-weekend-content';el.append(box)}
 box.replaceChildren();
 if(m.image&&(/^(data:image\/(png|jpeg|webp|gif);base64,|https:\/\/|\.\/|assets\/)/i.test(m.image))){const img=document.createElement('img');img.src=m.image;img.alt=m.title||'Partit del cap de setmana';img.className='pbsv-weekend-photo';box.append(img)}
 if(m.title){const h=document.createElement('h3');h.textContent=m.title;box.append(h)}
 if(m.date||m.time){const p=document.createElement('p');p.className='pbsv-weekend-date';p.textContent=[m.date,m.time].filter(Boolean).join(' · ');box.append(p)}
 if(m.comment){const p=document.createElement('p');p.textContent=m.comment;box.append(p)}
 el.classList.add('pbsv-weekend-managed');
}
async function init(){try{const res=await fetch(url+Date.now(),{cache:'no-store'});if(!res.ok)return;const data=await res.json();const cards=candidates();for(const card of cards){const day=dayOf(card);if(day)apply(card,data[day],day)}}catch(err){console.warn('Partits del cap de setmana:',err)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();