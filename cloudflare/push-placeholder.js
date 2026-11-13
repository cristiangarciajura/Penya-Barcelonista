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
export default {async fetch(req,env){
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
