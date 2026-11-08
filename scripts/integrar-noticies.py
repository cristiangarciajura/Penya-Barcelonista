#!/usr/bin/env python3
"""Insert a small, idempotent news renderer into the existing PBSV SPA."""
from pathlib import Path
p=Path("index.html")
s=p.read_text(encoding="utf-8")
marker='id="pbsv-public-news"'
if marker in s:
    print("News already integrated")
    raise SystemExit(0)
assert "</body>" in s and "</head>" in s
css='''<style id="pbsv-news-css">
#pbsv-public-news{max-width:1200px;margin:22px auto;padding:20px;background:#fff;border:1px solid #dfe6f0;border-radius:18px;box-shadow:0 4px 20px #10244b12}
#pbsv-public-news h2{margin:0 0 15px;color:#17376c;font-size:clamp(22px,4vw,30px)}
.pbsv-news-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}
.pbsv-news-item{border:1px solid #dfe6f0;border-radius:14px;overflow:hidden;background:white}
.pbsv-news-item img{width:100%;height:160px;object-fit:cover}
.pbsv-news-item-body{padding:15px}.pbsv-news-item h3{font-size:18px;margin:7px 0}.pbsv-news-item p{line-height:1.5}.pbsv-news-item time{color:#65748d;font-size:13px}
.pbsv-news-item a{color:#174b9d;font-weight:700}
</style>'''
js='''<script id="pbsv-news-script">
(function(){
const section=document.createElement('section');section.id='pbsv-public-news';section.hidden=true;
const heading=document.createElement('h2');heading.textContent='Notícies de la Penya';
const list=document.createElement('div');list.className='pbsv-news-list';section.append(heading,list);
function home(){return document.querySelector('#home, #inicio, #inici, [data-view="home"].view, [data-view="inicio"].view, [data-view="inici"].view');}
function place(){const target=home();if(target){target.prepend(section)}else{const main=document.querySelector('main');if(main)main.prepend(section)}}
function visible(){const parent=section.parentElement;if(!parent)return false;if(parent.matches('.view'))return !parent.hidden && !parent.classList.contains('hidden') && (parent.classList.contains('active')||parent.classList.contains('show')||getComputedStyle(parent).display!=='none');return true}
function render(items){
list.replaceChildren();
items.filter(n=>n&&n.portada!==false&&typeof n.titulo==='string'&&typeof n.resumen==='string').sort((a,b)=>String(b.fecha||'').localeCompare(String(a.fecha||''))).slice(0,6).forEach(n=>{
const card=document.createElement('article');card.className='pbsv-news-item';
if(typeof n.imagen==='string'&&(/^(https:\/\/|assets\/|\.\/)/.test(n.imagen)||n.imagen.startsWith('data:image/jpeg;base64,'))){const img=document.createElement('img');img.src=n.imagen;img.alt='';img.loading='lazy';card.append(img)}
const body=document.createElement('div');body.className='pbsv-news-item-body';const time=document.createElement('time');time.textContent=n.fecha||'';const title=document.createElement('h3');title.textContent=n.titulo;const summary=document.createElement('p');summary.textContent=n.resumen;body.append(time,title,summary);
if(typeof n.enlace==='string'&&/^https:\/\//.test(n.enlace)){const a=document.createElement('a');a.href=n.enlace;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Llegir més';body.append(a)}
card.append(body);list.append(card)});
section.hidden=!list.childElementCount;
}
function init(){place();fetch('./data/noticies.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('News unavailable');return r.json()}).then(d=>{if(Array.isArray(d.noticias))render(d.noticias)}).catch(e=>console.warn('PBSV news:',e))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
</script>'''
s=s.replace("</head>",css+"</head>",1)
s=s.replace("</body>",js+"</body>",1)
assert marker in s
p.write_text(s,encoding="utf-8")
print("News renderer integrated")
