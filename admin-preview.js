(()=>{'use strict';
function init(){
 const list=document.getElementById('list');if(!list)return;
 const container=list.parentElement;
 const toolbar=document.createElement('div');toolbar.style.margin='12px 0';
 const button=document.createElement('button');button.type='button';button.className='pbsv-preview-toggle';button.textContent='👁 Vista prèvia dels continguts';button.setAttribute('aria-expanded','false');
 const panel=document.createElement('div');panel.className='pbsv-preview-wrap';panel.hidden=true;
 const heading=document.createElement('h3');heading.textContent='Vista prèvia';
 const note=document.createElement('p');note.className='pbsv-preview-note';note.textContent='Mostra les fitxes que hi ha actualment a l’editor. No publica cap canvi.';
 const items=document.createElement('div');items.className='pbsv-preview-items';
 panel.append(heading,note,items);toolbar.append(button);container.insertBefore(toolbar,list);container.insertBefore(panel,list);
 function update(){
   if(panel.hidden)return;
   items.replaceChildren();
   const cards=[...list.children].filter(el=>el.nodeType===1);
   if(!cards.length){items.textContent='Encara no hi ha continguts per previsualitzar.';return}
   for(const card of cards){const clone=card.cloneNode(true);clone.querySelectorAll('button,input,select,textarea').forEach(el=>el.remove());clone.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));items.append(clone)}
 }
 button.addEventListener('click',()=>{panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));update()});
 new MutationObserver(update).observe(list,{childList:true,subtree:false});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();