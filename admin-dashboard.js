(()=>{'use strict';
const $=id=>document.getElementById(id);
const text=(el,value)=>{if(el)el.textContent=value};
const fetchJSON=async path=>{const r=await fetch('./data/'+path+'?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);return r.json()};
const formatDate=s=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))return s||'Data pendent';const [y,m,d]=s.split('-').map(Number);return new Intl.DateTimeFormat('ca-ES',{day:'numeric',month:'short',year:'numeric'}).format(new Date(y,m-1,d))};

// Calendari de la Penya en hora local de Catalunya (no depèn del fus del dispositiu).
function penyaToday(){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const get=k=>Number(parts.find(p=>p.type===k).value);
 return new Date(Date.UTC(get('year'),get('month')-1,get('day')));
}
function isoUTC(d){return d.toISOString().slice(0,10)}
function renderWeekendAlerts(data,failed){
 const summary=$('adminAlertsSummary'),list=$('adminAlertsList');
 if(!summary||!list)return;
 list.replaceChildren();
 function row(title,detail,kind,link){
  const el=document.createElement('div');el.className='alert-row '+(kind||'');
  const strong=document.createElement('strong');strong.textContent=title;
  const p=document.createElement('p');p.textContent=detail;el.append(strong,p);
  if(link){const a=document.createElement('a');a.href='./editor-partits.html';a.className='alert-link';a.textContent='Actualitzar cartells ↗';el.append(a)}
  list.append(el);
 }
 if(failed){summary.textContent='No s’han pogut comprovar els cartells publicats.';row('Comprovació no disponible','Revisa la connexió i torna a obrir el panell. No es considera cap tasca resolta.','alert-error',true);return}
 const today=penyaToday(),weekday=today.getUTCDay();
 // De dilluns a dimarts no es generen recordatoris. Dimecres-diumenge es comprova el dissabte i diumenge d'aquesta setmana.
 if(weekday===1||weekday===2){summary.textContent='Cap recordatori programat avui. La revisió comença dimecres.';return}
 const saturday=new Date(today);saturday.setUTCDate(today.getUTCDate()+(weekday===0?-1:6-weekday));
 const sunday=new Date(saturday);sunday.setUTCDate(saturday.getUTCDate()+1);
 const targets=[['Dissabte',data?.saturday,isoUTC(saturday)],['Diumenge',data?.sunday,isoUTC(sunday)]];
 let pending=0;
 for(const [day,item,date] of targets){
  const ready=item&&item.date===date&&typeof item.image==='string'&&item.image.trim()&&typeof item.title==='string'&&item.title.trim();
  if(!ready){pending++;row('Pendent: cartell de '+day.toLowerCase(),'Cal publicar el cartell amb data '+formatDate(date)+', imatge i títol.','',true)}
 }
 if(pending){summary.textContent=pending+' cartell'+(pending===1?' pendent':'s pendents')+' per al cap de setmana del '+formatDate(isoUTC(saturday))+'.'}
 else{summary.textContent='Tot al dia: els cartells de dissabte i diumenge estan configurats per a aquest cap de setmana.';row('Cartells actualitzats','Els dos cartells tenen la data, el títol i la imatge correctes.','alert-ok',false)}
}
async function load(){
 const results=await Promise.allSettled([fetchJSON('noticies.json'),fetchJSON('patrocinadors.json'),fetchJSON('club.json')]);
 const [news,sponsors,club]=results;
 if(news.status==='fulfilled'){
  const all=Array.isArray(news.value.noticias)?news.value.noticias:[];
  const active=all.filter(n=>n.activa!==false&&n.activo!==false&&n.active!==false&&n.publicada!==false);
  text($('dashNewsCount'),String(active.length));
  const latest=[...active].sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''))[0];
  text($('dashNewsDetail'),latest?((latest.titulo||'Sense títol')+' · '+formatDate(latest.fecha)):'Cap notícia disponible');
 }else{text($('dashNewsCount'),'—');text($('dashNewsDetail'),'No s’han pogut carregar les notícies')}
 if(sponsors.status==='fulfilled'){
  const all=Array.isArray(sponsors.value.sponsors)?sponsors.value.sponsors:[];
  const active=all.filter(x=>x.active!==false&&x.activo!==false);
  text($('dashSponsorsCount'),String(active.length));
  text($('dashSponsorsDetail'),active.length?'Patrocinadors disponibles a la web':'Cap patrocinador disponible');
 }else{text($('dashSponsorsCount'),'—');text($('dashSponsorsDetail'),'No s’han pogut carregar els patrocinadors')}
 if(club.status==='fulfilled'){
  let data={};try{const section=club.value.sections?.find(x=>x.id==='pbsv-weekend-matches');data=section?.detail?JSON.parse(section.detail):{}}catch{}
  const sat=data.saturday||{},sun=data.sunday||{};renderWeekendAlerts(data,false);
  text($('dashSaturday'),(sat.title||'Dissabte sense configurar')+' · '+formatDate(sat.date));
  text($('dashSunday'),(sun.title||'Diumenge sense configurar')+' · '+formatDate(sun.date));
  const today=new Date();today.setHours(0,0,0,0);
  const days=[sat.date,sun.date].filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x||'')).map(x=>{const [y,m,d]=x.split('-').map(Number);return new Date(y,m-1,d)});
  text($('dashMatchesDetail'),days.length&&days.every(d=>d<today)?'Els cartells tenen dates passades. Revisa el proper cap de setmana.':'Cartells configurats a l’editor');
 }else{renderWeekendAlerts(null,true);text($('dashSaturday'),'No s’han pogut carregar els partits');text($('dashSunday'),'');text($('dashMatchesDetail'),'Torna-ho a provar més tard')}
 const updated=$('dashUpdated');if(updated)updated.textContent='Dades consultades: '+new Intl.DateTimeFormat('ca-ES',{dateStyle:'short',timeStyle:'short'}).format(new Date());
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();