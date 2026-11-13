(()=>{
'use strict';
const ID='pbsv-news-carousel';
if(document.getElementById(ID))return;
const section=document.createElement('section');
section.id=ID;
section.className='pbsv-carousel';
section.hidden=true;
section.innerHTML='<div class="pbsv-carousel-head"><h2>Últimes notícies</h2><span class="pbsv-carousel-counter"></span></div><div class="pbsv-carousel-stage" aria-live="off"></div><div class="pbsv-carousel-nav"><div class="pbsv-carousel-dots"></div><div><button type="button" class="pbsv-carousel-prev" aria-label="Notícia anterior">‹</button><button type="button" class="pbsv-carousel-next" aria-label="Notícia següent">›</button></div></div><div class="pbsv-carousel-progress"><span></span></div>';
const modal=document.createElement('div');
modal.className='pbsv-news-modal';
modal.hidden=true;
modal.innerHTML='<div class="pbsv-news-modal-backdrop" data-close="true"></div><div class="pbsv-news-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="pbsv-news-modal-title" tabindex="-1"><button type="button" class="pbsv-news-modal-close" aria-label="Tancar notícia">×</button><div class="pbsv-news-modal-body"></div></div>';
let items=[],pos=0,timer=null,paused=false,startX=null,returnFocus=null;
const stage=section.querySelector('.pbsv-carousel-stage');
const dots=section.querySelector('.pbsv-carousel-dots');
const count=section.querySelector('.pbsv-carousel-counter');
const bar=section.querySelector('.pbsv-carousel-progress span');
const dialog=modal.querySelector('.pbsv-news-modal-dialog');
const modalBody=modal.querySelector('.pbsv-news-modal-body');
function stop(){clearInterval(timer);timer=null}
function allowedImage(src){return typeof src==='string'&&(/^(https:\/\/|\.\/|\.\.\/|assets\/|images\/|img\/|data:image\/(png|jpeg|webp);base64,)/i.test(src))}
function image(src,cls){if(!allowedImage(src))return null;const el=document.createElement('img');el.src=src;el.alt='';el.loading=cls?'eager':'eager';if(cls)el.className=cls;return el}
function makeText(tag,value,cls){const el=document.createElement(tag);el.textContent=value||'';if(cls)el.className=cls;return el}
function storyText(n){return n.contenido||n.contingut||n.texto||n.cos||n.descripcio||n.descripcion||n.resumen||''}
function storyLink(n){const url=n.enlace||n.enllac||n.url;return typeof url==='string'&&/^https:\/\//i.test(url)?url:null}
function closeModal(){if(modal.hidden)return;modal.hidden=true;document.body.classList.remove('pbsv-news-modal-open');paused=false;if(returnFocus&&returnFocus.isConnected)returnFocus.focus({preventScroll:true});paint();start()}
function openModal(n){returnFocus=document.activeElement;paused=true;stop();bar.style.animationPlayState='paused';modalBody.replaceChildren();const pic=image(n.imagen,'pbsv-news-modal-image');if(pic)modalBody.append(pic);modalBody.append(makeText('small',n.fecha||'PENYA BARCELONISTA'));const heading=makeText('h2',n.titulo);heading.id='pbsv-news-modal-title';modalBody.append(heading);const body=makeText('div',storyText(n),'pbsv-news-modal-text');modalBody.append(body);const url=storyLink(n);if(url){const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Obrir enllaç ↗';modalBody.append(a)}modal.hidden=false;document.body.classList.add('pbsv-news-modal-open');dialog.focus()}
modal.querySelector('.pbsv-news-modal-close').onclick=closeModal;
modal.querySelector('.pbsv-news-modal-backdrop').onclick=closeModal;
modal.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closeModal()}if(e.key==='Tab'){const focusables=[...dialog.querySelectorAll('button,a[href]')];if(!focusables.length)return;const first=focusables[0],last=focusables[focusables.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)closeModal()});
function paint(){
 if(!items.length)return;
 const n=items[pos];stage.replaceChildren();
 const article=document.createElement('article');article.className='pbsv-carousel-slide';
 const media=document.createElement('div');media.className='pbsv-carousel-media';
 const pic=image(n.imagen);if(pic)media.append(pic);article.append(media);
 const copy=document.createElement('div');copy.className='pbsv-carousel-copy';
 copy.append(makeText('small',n.fecha||'PENYA BARCELONISTA'));
 copy.append(makeText('h3',n.titulo));
 copy.append(makeText('p',n.resumen||n.descripcio||n.descripcion||''));
 const read=document.createElement('button');read.type='button';read.className='pbsv-carousel-read';read.textContent='Llegir notícia completa';read.onclick=()=>openModal(n);copy.append(read);
 article.append(copy);stage.append(article);
 article.addEventListener('click',e=>{if(e.target.closest('button,a'))return;openModal(n)});
 article.tabIndex=0;article.setAttribute('role','button');article.setAttribute('aria-label','Llegir notícia completa: '+n.titulo);
 article.addEventListener('keydown',e=>{if(e.target!==article)return;if(e.key==='Enter'||e.key===' '){e.preventDefault();openModal(n)}});
 count.textContent=(pos+1)+' / '+items.length;
 dots.replaceChildren();items.forEach((_,i)=>{const b=document.createElement('button');b.type='button';b.className=i===pos?'active':'';b.setAttribute('aria-label','Notícia '+(i+1));b.setAttribute('aria-current',String(i===pos));b.onclick=()=>move(i);dots.append(b)});
 bar.style.animation='none';void bar.offsetWidth;
 if(items.length>1&&!paused&&!document.hidden)bar.style.animation='pbsv-carousel-fill 10s linear forwards';
}
function start(){stop();if(items.length>1&&!paused&&!document.hidden)timer=setInterval(()=>{pos=(pos+1)%items.length;paint()},10000)}
function move(i){pos=(i+items.length)%items.length;paint();start()}
section.querySelector('.pbsv-carousel-prev').onclick=()=>move(pos-1);
section.querySelector('.pbsv-carousel-next').onclick=()=>move(pos+1);
section.addEventListener('mouseenter',()=>{paused=true;stop();bar.style.animationPlayState='paused'});
section.addEventListener('mouseleave',()=>{if(!modal.hidden)return;paused=false;paint();start()});
section.addEventListener('focusin',()=>{paused=true;stop()});
section.addEventListener('focusout',e=>{if(!section.contains(e.relatedTarget)&&modal.hidden){paused=false;paint();start()}});
stage.addEventListener('touchstart',e=>{startX=e.changedTouches[0].screenX},{passive:true});
stage.addEventListener('touchend',e=>{if(startX==null)return;const dx=e.changedTouches[0].screenX-startX;startX=null;if(Math.abs(dx)>45)move(pos+(dx<0?1:-1))},{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else if(modal.hidden){paint();start()}});
function init(){
 const home=document.getElementById('home')||document.querySelector('main');if(!home)return;
 home.prepend(section);document.body.append(modal);
 const key='pbsv-news-cache-v1';
 function apply(d){const next=(Array.isArray(d)?d:Array.isArray(d.noticias)?d.noticias:Array.isArray(d.noticies)?d.noticies:[]).filter(n=>n&&n.portada!==false&&n.activa!==false&&typeof n.titulo==='string'&&n.titulo.trim()).sort((a,b)=>String(b.fecha||'').localeCompare(String(a.fecha||'')));if(!next.length){items=[];section.hidden=true;stop();return}items=next;pos=Math.min(pos,items.length-1);section.hidden=false;paint();start()}
 try{const saved=sessionStorage.getItem(key);if(saved)apply(JSON.parse(saved))}catch{}
 fetch('./data/noticies.json',{cache:'default'}).then(r=>{if(!r.ok)throw Error('Noticias no disponibles');return r.json()}).then(d=>{try{sessionStorage.setItem(key,JSON.stringify(d))}catch{}apply(d)}).catch(e=>console.warn('Carrusel PBSV:',e));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();