import {sendWebPush} from './webpush.js';
// PBSV Web Push: subscripcions protegides per Turnstile i prova privada d'enviament a un dispositiu.
const ORIGIN='https://cristiangarciajura.github.io';
const HOSTS=new Set(['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com','api.push.apple.com']);
const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
function response(data,status=200,cors=false){return new Response(JSON.stringify(data),{status,headers:{...headers,...(cors?{'access-control-allow-origin':ORIGIN,'vary':'Origin','access-control-allow-methods':'GET,POST,DELETE,OPTIONS','access-control-allow-headers':'Content-Type'}:{})}})}
const enabled=env=>!!(env.PUSH_SUBSCRIPTIONS_ENABLED==='true'&&env.PUSH_DB&&env.PUSH_VAPID_PUBLIC_KEY&&env.PUSH_TURNSTILE_SECRET&&env.PUSH_TURNSTILE_SITE_KEY);
function b64bytes(s){if(typeof s!=='string'||!/^[a-zA-Z0-9_-]+$/.test(s))return null;try{const t=atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4));return Uint8Array.from(t,c=>c.charCodeAt(0))}catch{return null}}
function endpointValid(raw){try{const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password&&u.port===''&&u.hash===''&&u.href.length<2048&&HOSTS.has(u.hostname)}catch{return false}}
function subscriptionValid(s){return s&&endpointValid(s.endpoint)&&b64bytes(s.keys?.p256dh)?.length===65&&b64bytes(s.keys?.auth)?.length===16}
async function sha(s){const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function body(req){const size=Number(req.headers.get('content-length'));if(size>4096)throw Error('too_large');const txt=await req.text();if(txt.length>4096)throw Error('too_large');return JSON.parse(txt)}
async function verifyTurnstile(token,env,req){
 if(typeof token!=='string'||token.length<10||token.length>2048)return false;
 const form=new FormData();form.set('secret',env.PUSH_TURNSTILE_SECRET);form.set('response',token);
 const ip=req.headers.get('CF-Connecting-IP');if(ip)form.set('remoteip',ip);
 const r=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:form,signal:AbortSignal.timeout(5000)});
 if(!r.ok)return false;const v=await r.json();
 return v.success===true&&v.hostname==='cristiangarciajura.github.io';
}

const TARGETS=new Set(['./index.html','./index.html#noticies','./index.html#partits','./index.html#club','./avisos.html']);
function validNotice(d){return d&&typeof d.title==='string'&&d.title.trim().length>0&&d.title.trim().length<=90&&typeof d.message==='string'&&d.message.trim().length>0&&d.message.trim().length<=240&&['match','news','event','urgent'].includes(d.category)&&TARGETS.has(d.target)}
async function ensureSchedule(env){
 await env.PUSH_DB.prepare("CREATE TABLE IF NOT EXISTS push_schedule (id TEXT PRIMARY KEY, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, due_at TEXT NOT NULL, category TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, target TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', total INTEGER, accepted INTEGER, failed INTEGER, finished_at TEXT)").run();
}
async function dispatchNotice(env,d,id){
 const q=await env.PUSH_DB.prepare('SELECT id,endpoint,p256dh,auth FROM push_subscriptions WHERE disabled_at IS NULL ORDER BY updated_at DESC LIMIT 21').all();
 const rows=q.results||[];
 if(rows.length>20)throw Error('Més de 20 dispositius: enviament aturat fins a habilitar lots');
 let accepted=0,failed=0;
 for(const row of rows){
  try{const r=await sendWebPush(row,{title:d.title,body:d.message,url:d.target,tag:'pbsv-'+id},env);if(r.ok)accepted++;else{failed++;if(r.expired)await env.PUSH_DB.prepare('UPDATE push_subscriptions SET disabled_at=CURRENT_TIMESTAMP WHERE id=?').bind(row.id).run()}}catch{failed++}
 }
 await env.PUSH_DB.prepare('INSERT INTO push_delivery_history (id,category,title,message,target,total,accepted,failed) VALUES (?,?,?,?,?,?,?,?)').bind(id,d.category,d.title,d.message,d.target,rows.length,accepted,failed).run();
 return {total:rows.length,accepted,failed};
}
async function runDue(env){
 if(!env.PUSH_DB||!env.PUSH_VAPID_PRIVATE_KEY||!env.PUSH_VAPID_PUBLIC_KEY)return;
 await ensureSchedule(env);
 const due=await env.PUSH_DB.prepare("SELECT * FROM push_schedule WHERE status='pending' AND due_at<=? ORDER BY due_at LIMIT 10").bind(new Date().toISOString()).all();
 for(const job of due.results||[]){
  const claim=await env.PUSH_DB.prepare("UPDATE push_schedule SET status='processing' WHERE id=? AND status='pending'").bind(job.id).run();
  if(!claim.meta?.changes)continue;
  try{
   const r=await dispatchNotice(env,job,job.id);
   await env.PUSH_DB.prepare("UPDATE push_schedule SET status=?,total=?,accepted=?,failed=?,finished_at=CURRENT_TIMESTAMP WHERE id=?").bind(r.failed?'partial':'sent',r.total,r.accepted,r.failed,job.id).run();
  }catch{
   await env.PUSH_DB.prepare("UPDATE push_schedule SET status='failed',finished_at=CURRENT_TIMESTAMP WHERE id=?").bind(job.id).run();
  }
 }
}

export default {async scheduled(event,env,ctx){ctx.waitUntil(runDue(env))},async fetch(req,env){
 const u=new URL(req.url),origin=req.headers.get('Origin'),cors=origin===ORIGIN;
 if(u.pathname==='/api/push/status'&&req.method==='GET'){
  let database=false;try{if(env.PUSH_DB){await env.PUSH_DB.prepare('SELECT 1 FROM push_subscriptions LIMIT 1').first();database=true}}catch{}
  return response({service:'pbsv-push',database,publicKeyConfigured:!!env.PUSH_VAPID_PUBLIC_KEY,privateKeyConfigured:!!env.PUSH_VAPID_PRIVATE_KEY,subscriptionsEnabled:enabled(env),sendingEnabled:!!(env.PUSH_VAPID_PRIVATE_KEY&&env.PUSH_INTERNAL_TOKEN&&env.PUSH_DB)});
 }
 if(u.pathname==='/api/push/admin/test'&&req.method==='POST'){
  const auth=req.headers.get('Authorization')||'';
  if(!env.PUSH_INTERNAL_TOKEN||auth!=='Bearer '+env.PUSH_INTERNAL_TOKEN)return response({error:'Accés denegat'},403);
  if(!env.PUSH_DB||!env.PUSH_VAPID_PUBLIC_KEY||!env.PUSH_VAPID_PRIVATE_KEY)return response({error:'Falten configuracions de Web Push al servidor.'},503);
  let data;try{data=await body(req)}catch{return response({error:'Dades de prova incorrectes.'},400)}
  const title=String(data?.title||'').trim(),text=String(data?.body||'').trim();
  if(!title||title.length>90||!text||text.length>240)return response({error:'Títol o missatge incorrectes.'},400);
  // Una sola subscripció activa: evita enviar proves a tots els socis.
  let row;try{row=await env.PUSH_DB.prepare('SELECT id,endpoint,p256dh,auth FROM push_subscriptions WHERE disabled_at IS NULL ORDER BY updated_at DESC LIMIT 1').first()}catch{return response({error:'No s’ha pogut consultar la base de dades.'},503)}
  if(!row)return response({error:'No hi ha cap dispositiu subscrit per fer la prova.'},404);
  try{
   const result=await sendWebPush(row,{title,body:text,url:'./avisos.html'},env);
   if(result.expired)await env.PUSH_DB.prepare('UPDATE push_subscriptions SET disabled_at=CURRENT_TIMESTAMP WHERE id=?').bind(row.id).run();
   if(!result.ok)return response({error:'El servei push ha rebutjat la prova (HTTP '+result.status+').',status:result.status},502);
   return response({ok:true,message:'Prova enviada al dispositiu subscrit més recent. Comprova les notificacions del mòbil.',devices:1},200);
  }catch(e){return response({error:'No s’ha pogut enviar la prova: '+String(e?.message||'error inesperat').slice(0,140)},502)}
 }
 if((u.pathname==='/api/push/admin/send'||u.pathname==='/api/push/admin/history')&&['GET','POST'].includes(req.method)){
  if(!env.PUSH_INTERNAL_TOKEN||req.headers.get('Authorization')!=='Bearer '+env.PUSH_INTERNAL_TOKEN)return response({error:'Accés denegat'},403);
  if(!env.PUSH_DB)return response({error:'Base de dades no disponible'},503);
  try{await env.PUSH_DB.prepare("CREATE TABLE IF NOT EXISTS push_delivery_history (id TEXT PRIMARY KEY, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, category TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, target TEXT NOT NULL, total INTEGER NOT NULL, accepted INTEGER NOT NULL, failed INTEGER NOT NULL)").run()}catch{return response({error:'No es pot preparar l’historial de notificacions.'},503)}
  if(u.pathname==='/api/push/admin/history'&&req.method==='GET'){
   try{const rows=await env.PUSH_DB.prepare('SELECT id,created_at,category,title,message,target,total,accepted,failed FROM push_delivery_history ORDER BY created_at DESC LIMIT 30').all();return response({items:rows.results||[]})}catch{return response({error:'No es pot consultar l’historial.'},503)}
  }
  if(u.pathname!=='/api/push/admin/send'||req.method!=='POST')return response({error:'Mètode no permès'},405);
  if(!env.PUSH_VAPID_PUBLIC_KEY||!env.PUSH_VAPID_PRIVATE_KEY)return response({error:'Claus VAPID no configurades'},503);
  let data;try{data=await body(req)}catch{return response({error:'Dades incorrectes'},400)}
  const title=String(data?.title||'').trim(),message=String(data?.message||'').trim();
  const category=String(data?.category||''),target=String(data?.target||'');
  const targets=new Set(['./index.html','./index.html#noticies','./index.html#partits','./index.html#club','./avisos.html']);
  if(!title||title.length>90||!message||message.length>240||!['match','news','event','urgent'].includes(category)||!targets.has(target))return response({error:'Dades de l’avís incorrectes'},400);
  let rows;
  try{const q=await env.PUSH_DB.prepare('SELECT id,endpoint,p256dh,auth FROM push_subscriptions WHERE disabled_at IS NULL ORDER BY updated_at DESC LIMIT 21').all();rows=q.results||[]}catch{return response({error:'No es poden consultar els dispositius'},503)}
  if(!rows.length)return response({error:'No hi ha dispositius subscrits'},404);
  if(rows.length>20)return response({error:'Hi ha més de 20 dispositius. Enviament aturat per seguretat fins a habilitar lots.'},409);
  const id=crypto.randomUUID();let accepted=0,failed=0;
  for(const row of rows){
   try{const result=await sendWebPush(row,{title,body:message,url:target,tag:'pbsv-'+id},env);if(result.ok)accepted++;else{failed++;if(result.expired)await env.PUSH_DB.prepare('UPDATE push_subscriptions SET disabled_at=CURRENT_TIMESTAMP WHERE id=?').bind(row.id).run()}}catch{failed++}
  }
  try{await env.PUSH_DB.prepare('INSERT INTO push_delivery_history (id,category,title,message,target,total,accepted,failed) VALUES (?,?,?,?,?,?,?,?)').bind(id,category,title,message,target,rows.length,accepted,failed).run()}catch{return response({error:'Enviament processat, però no s’ha pogut desar l’historial.',accepted,failed},500)}
  return response({ok:failed===0,id,total:rows.length,accepted,failed,message:'Acceptats pel servei push: '+accepted+' de '+rows.length+'. Això no confirma la visualització al mòbil.'},200);
 }
 if(u.pathname.startsWith('/api/push/admin/schedule')){
  if(!env.PUSH_INTERNAL_TOKEN||req.headers.get('Authorization')!=='Bearer '+env.PUSH_INTERNAL_TOKEN)return response({error:'Accés denegat'},403);
  if(!env.PUSH_DB)return response({error:'Base de dades no disponible'},503);
  try{await ensureSchedule(env)}catch{return response({error:'No es pot preparar la programació'},503)}
  if(u.pathname==='/api/push/admin/schedule'&&req.method==='GET'){
   const q=await env.PUSH_DB.prepare('SELECT id,created_at,due_at,category,title,message,target,status,total,accepted,failed FROM push_schedule ORDER BY created_at DESC LIMIT 40').all();
   return response({items:q.results||[]});
  }
  if(u.pathname==='/api/push/admin/schedule'&&req.method==='POST'){
   let d;try{d=await body(req)}catch{return response({error:'Dades incorrectes'},400)}
   if(!validNotice(d))return response({error:'Avís incorrecte'},400);
   const due=new Date(d.dueAt);
   if(typeof d.dueAt!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(d.dueAt)||!Number.isFinite(due.getTime())||due.getTime()<Date.now()+120000||due.getTime()>Date.now()+365*86400000)return response({error:'Escull una data entre 2 minuts i 1 any en el futur'},400);
   const id=crypto.randomUUID();
   await env.PUSH_DB.prepare('INSERT INTO push_schedule (id,due_at,category,title,message,target) VALUES (?,?,?,?,?,?)').bind(id,due.toISOString(),d.category,d.title.trim(),d.message.trim(),d.target).run();
   return response({ok:true,id,dueAt:due.toISOString(),message:'Avís programat. El sistema comprova els enviaments cada minut.'},201);
  }
  if(u.pathname==='/api/push/admin/schedule/cancel'&&req.method==='POST'){
   let d;try{d=await body(req)}catch{return response({error:'Dades incorrectes'},400)}
   if(typeof d?.id!=='string'||!/^[a-f0-9-]{36}$/.test(d.id))return response({error:'Identificador incorrecte'},400);
   const r=await env.PUSH_DB.prepare("UPDATE push_schedule SET status='cancelled' WHERE id=? AND status='pending'").bind(d.id).run();
   return response({ok:!!r.meta?.changes,message:r.meta?.changes?'Programació cancel·lada':'Ja no es pot cancel·lar aquest avís'},r.meta?.changes?200:409);
  }
  return response({error:'Mètode no permès'},405);
 }
 if(!cors)return response({error:'Origen no permès'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'access-control-allow-origin':ORIGIN,'access-control-allow-methods':'GET,POST,DELETE,OPTIONS','access-control-allow-headers':'Content-Type','vary':'Origin'}});
 if(u.pathname==='/api/push/public-key'&&req.method==='GET'){
  if(!env.PUSH_VAPID_PUBLIC_KEY)return response({error:'Clau pública no configurada'},503,true);
  return response({publicKey:env.PUSH_VAPID_PUBLIC_KEY,subscriptionsEnabled:enabled(env),turnstileSiteKey:enabled(env)?env.PUSH_TURNSTILE_SITE_KEY:null},200,true);
 }
 if(u.pathname==='/api/push/subscriptions'&&(req.method==='POST'||req.method==='DELETE')){
  if(!enabled(env))return response({error:'Subscripcions no habilitades'},503,true);
  if(!req.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return response({error:'Content-Type incorrecte'},415,true);
  let data;try{data=await body(req)}catch{return response({error:'Dades incorrectes'},400,true)}
  if(!await verifyTurnstile(data?.turnstileToken,env,req))return response({error:'Verificació de seguretat fallida'},403,true);
  if(req.method==='POST'){
   if(!subscriptionValid(data))return response({error:'Subscripció no vàlida'},400,true);
   const id=await sha(data.endpoint);
   await env.PUSH_DB.prepare('INSERT INTO push_subscriptions (id,endpoint,p256dh,auth) VALUES (?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET p256dh=excluded.p256dh,auth=excluded.auth,updated_at=CURRENT_TIMESTAMP,disabled_at=NULL').bind(id,data.endpoint,data.keys.p256dh,data.keys.auth).run();
   return response({ok:true},201,true);
  }
  if(!endpointValid(data?.endpoint)||b64bytes(data?.auth)?.length!==16)return response({error:'Dades incorrectes'},400,true);
  const id=await sha(data.endpoint);
  const row=await env.PUSH_DB.prepare('SELECT auth FROM push_subscriptions WHERE id=?').bind(id).first();
  if(!row||row.auth!==data.auth)return response({error:'Subscripció no trobada'},404,true);
  await env.PUSH_DB.prepare('UPDATE push_subscriptions SET disabled_at=CURRENT_TIMESTAMP WHERE id=?').bind(id).run();
  return response({ok:true},200,true);
 }
 return response({error:'Ruta no disponible'},404,true);
}};
