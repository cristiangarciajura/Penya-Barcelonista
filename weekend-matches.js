(()=>{'use strict';
const norm=t=>(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const validImage=s=>/^(?:data:image\/(?:png|jpeg|webp|gif);base64,|https:\/\/|\.\/|assets\/)/i.test(s||'');
function find(day){
 const label=day==='saturday'?'dissabte':'diumenge';
 const heading=[...document.querySelectorAll('#home h3')].find(h=>norm(h.textContent).trim()==='partits de '+label);
 return heading?.closest('article.news-card')||null;
}
function update(card,item,day){
 if(!card||!item||(!item.title&&!item.image&&!item.comment))return;
 const img=card.querySelector('img.news-photo');
 if(img&&validImage(item.image)){img.src=item.image;img.alt='Cartell dels '+(item.title||'partits');}
 const title=card.querySelector('.news-body h3');if(title&&item.title)title.textContent=item.title;
 const paragraph=card.querySelector('.news-body p');if(paragraph&&item.comment)paragraph.textContent=item.comment;
 const meta=card.querySelector('.news-body .meta');
 if(meta&&item.date){const [y,m,d]=item.date.split('-');const months=['','GENER','FEBRER','MARÇ','ABRIL','MAIG','JUNY','JULIOL','AGOST','SETEMBRE','OCTUBRE','NOVEMBRE','DESEMBRE'];meta.textContent=Number(d)+' '+months[Number(m)]+' '+y;}
 const open=card.querySelector('.photo-open');
 if(open&&img){open.onclick=e=>{e.preventDefault();e.stopPropagation();const src=img.currentSrc||img.src;const w=window.open('','_blank');if(w){w.document.write('<!doctype html><title>Cartell del partit</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#101c32;display:grid;place-items:center;min-height:100vh}img{max-width:100%;height:auto}</style><img alt="Cartell" src="'+src.replace(/"/g,'&quot;')+'">');w.document.close();}else window.location.href=src};}
}
async function init(){try{const r=await fetch('./data/partits-cap-setmana.json?t='+Date.now(),{cache:'no-store'});if(!r.ok)return;const data=await r.json();for(const day of ['saturday','sunday'])update(find(day),data[day],day)}catch(e){console.warn('PBSV partits:',e)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();