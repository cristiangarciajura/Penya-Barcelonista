/* Publicació guiada: cap credencial ni token al navegador. */
(function(){
 const repo='https://github.com/cristiangarciajura/Penya-Barcelonista/edit/main/data/';
 const files={'editor-equips.html':'equips.json','editor-club.html':'club.json','editor-noticies.html':'noticies.json','editor-patrocinadors.html':'patrocinadors.json','editor-partits.html':'partits-cap-setmana.json'};
 const page=location.pathname.split('/').pop(),file=files[page];
 if(!file)return;
 const section=document.createElement('section');section.id='publishGuide';
 section.innerHTML='<h2>Publicar els canvis a GitHub</h2><p>Primer desa la fitxa. Després prem el botó per copiar totes les dades i obrir GitHub. Allà enganxa les dades al fitxer i confirma amb <strong>Commit changes</strong>.</p><button type="button" id="publishGithub">Copiar dades i obrir GitHub</button><p id="publishResult" role="status" class="muted"></p><p class="muted">Només qui tingui permisos al repositori podrà publicar. Aquest pas no desa contrasenyes ni tokens.</p>';
 const main=document.querySelector('main');if(!main)return;
 const old=Array.from(main.querySelectorAll('section')).find(el=>/Publicar|Publicació/.test(el.querySelector('h2')?.textContent||''));
 if(old)old.replaceWith(section);else main.append(section);
 const auto=document.createElement('button');auto.type='button';auto.id='publishAutomatic';auto.textContent='Guardar i publicar automàticament';auto.hidden=true;auto.style.marginRight='8px';section.insertBefore(auto,document.getElementById('publishGithub'));
 const manual=document.getElementById('publishGithub');
 fetch('./api/me',{credentials:'same-origin',cache:'no-store'}).then(r=>r.ok?r.json():null).then(me=>{
  if(!me?.authenticated)return;
  auto.hidden=false;manual.hidden=true;
  const description=section.querySelector('p');if(description)description.textContent='Sessió GitHub autoritzada: '+me.login+'. Desa la fitxa i prem el botó per publicar els canvis a la web.';
 }).catch(()=>{});
 auto.onclick=async()=>{
  const output=document.getElementById('publishResult');
  let value;
  try{value=page==='editor-noticies.html'?exportData():page==='editor-club.html'?json():data();JSON.parse(value)}
  catch(e){output.textContent='Error en preparar les dades: '+e.message;return}
  if(!confirm('Publicar ara els canvis de '+file+' a la web?'))return;
  auto.disabled=true;output.textContent='Publicant a GitHub…';
  try{
   const r=await fetch('./api/publish',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-PBSV-Action':'publish'},body:JSON.stringify({file,content:value})});
   const body=await r.text();
   if(!r.ok)throw Error(body);
   output.textContent='Publicat correctament a GitHub. La web pot trigar uns minuts a actualitzar-se.';
  }catch(e){output.textContent='No s’ha pogut publicar: '+e.message}
  finally{auto.disabled=false}
 };
 document.getElementById('publishGithub').onclick=async()=>{
  const output=document.getElementById('publishResult');
  let value;
  try{
   if(page==='editor-noticies.html')value=exportData();
   else if(page==='editor-club.html')value=json();
   else value=data();
   JSON.parse(value);
  }catch(e){output.textContent='No es poden preparar les dades: '+e.message;return}
  const tab=window.open(repo+file,'_blank','noopener,noreferrer');
  try{
   await navigator.clipboard.writeText(value);
   output.textContent='Dades copiades. Obrint GitHub… Enganxa-les al fitxer i prem Commit changes.';
   if(!tab)output.textContent='Dades copiades. El navegador ha bloquejat la pestanya: obre GitHub amb l’enllaç següent.';
  }catch(e){
   output.textContent='No s’han pogut copiar automàticament. Prem «Descarregar JSON» i utilitza el fitxer a GitHub.';
  }
 };
 const link=document.createElement('a');link.href=repo+file;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Obrir fitxer a GitHub';section.append(link);
})();
