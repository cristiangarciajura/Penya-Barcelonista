/* Publicació guiada: cap credencial ni token al navegador. */
(function(){
 const repo='https://github.com/cristiangarciajura/Penya-Barcelonista/edit/main/data/';
 const files={'editor-equips.html':'equips.json','editor-club.html':'club.json','editor-noticies.html':'noticies.json','editor-patrocinadors.html':'patrocinadors.json'};
 const page=location.pathname.split('/').pop(),file=files[page];
 if(!file)return;
 const section=document.createElement('section');section.id='publishGuide';
 section.innerHTML='<h2>Publicar els canvis a GitHub</h2><p>Primer desa la fitxa. Després prem el botó per copiar totes les dades i obrir GitHub. Allà enganxa les dades al fitxer i confirma amb <strong>Commit changes</strong>.</p><button type="button" id="publishGithub">Copiar dades i obrir GitHub</button><p id="publishResult" role="status" class="muted"></p><p class="muted">Només qui tingui permisos al repositori podrà publicar. Aquest pas no desa contrasenyes ni tokens.</p>';
 const main=document.querySelector('main');if(!main)return;
 const old=Array.from(main.querySelectorAll('section')).find(el=>/Publicar|Publicació/.test(el.querySelector('h2')?.textContent||''));
 if(old)old.replaceWith(section);else main.append(section);
 document.getElementById('publishGithub').onclick=async()=>{
  const output=document.getElementById('publishResult');
  let value;
  try{
   if(page==='editor-noticies.html')value=exportData();
   else if(page==='editor-club.html')value=json();
   else value=data();
   JSON.parse(value);
  }catch(e){output.textContent='No es poden preparar les dades: '+e.message;return}
  try{
   await navigator.clipboard.writeText(value);
   output.textContent='Dades copiades. Obrint GitHub… Enganxa-les al fitxer i prem Commit changes.';
   const tab=window.open(repo+file,'_blank','noopener,noreferrer');
   if(!tab)output.textContent='Dades copiades. El navegador ha bloquejat la pestanya: obre GitHub amb l’enllaç següent.';
  }catch(e){
   output.textContent='No s’han pogut copiar automàticament. Prem «Descarregar JSON» i utilitza el fitxer a GitHub.';
  }
 };
 const link=document.createElement('a');link.href=repo+file;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Obrir fitxer a GitHub';section.append(link);
})();
