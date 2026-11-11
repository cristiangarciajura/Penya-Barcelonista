(()=>{'use strict';
const $=id=>document.getElementById(id);
const text=(el,value)=>{if(el)el.textContent=value};
const fetchJSON=async path=>{const r=await fetch('./data/'+path+'?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);return r.json()};
const formatDate=s=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))return s||'Data pendent';const [y,m,d]=s.split('-').map(Number);return new Intl.DateTimeFormat('ca-ES',{day:'numeric',month:'short',year:'numeric'}).format(new Date(y,m-1,d))};
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
  const sat=data.saturday||{},sun=data.sunday||{};
  text($('dashSaturday'),(sat.title||'Dissabte sense configurar')+' · '+formatDate(sat.date));
  text($('dashSunday'),(sun.title||'Diumenge sense configurar')+' · '+formatDate(sun.date));
  const today=new Date();today.setHours(0,0,0,0);
  const days=[sat.date,sun.date].filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x||'')).map(x=>{const [y,m,d]=x.split('-').map(Number);return new Date(y,m-1,d)});
  text($('dashMatchesDetail'),days.length&&days.every(d=>d<today)?'Els cartells tenen dates passades. Revisa el proper cap de setmana.':'Cartells configurats a l’editor');
 }else{text($('dashSaturday'),'No s’han pogut carregar els partits');text($('dashSunday'),'');text($('dashMatchesDetail'),'Torna-ho a provar més tard')}
 const updated=$('dashUpdated');if(updated)updated.textContent='Dades consultades: '+new Intl.DateTimeFormat('ca-ES',{dateStyle:'short',timeStyle:'short'}).format(new Date());
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();