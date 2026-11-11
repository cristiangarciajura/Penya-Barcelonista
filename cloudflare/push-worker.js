// PBSV Web Push: preparació de subscripcions (NO envia notificacions encara).
// Desplegar com a Worker separat, amb binding D1 "PUSH_DB" i secret PUSH_VAPID_PUBLIC_KEY.
// El panell de publicació GitHub existent no es modifica.
const HEADERS={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const json=(obj,status=200,extra={})=>new Response(JSON.stringify(obj),{status,headers:{...HEADERS,'Content-Type':'application/json; charset=utf-8',...extra}});
const allowedOrigin='https://cristiangarciajura.github.io';
const appPrefix='/Penya-Barcelonista/';
function cors(req){const origin=req.headers.get('Origin');return origin===allowedOrigin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Methods':'GET, POST, DELETE, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}:{}}
function validEndpoint(url){try{const u=new URL(url);return u.protocol==='https:'&&u.username===''&&u.password===''&&u.hostname.length>3&&u.href.length<2048}catch{return false}}
function validKey(value){return typeof value==='string'&&value.length>=16&&value.length<=256&&/^[a-zA-Z0-9_-]+$/.test(value)}
async function hash(endpoint){const bytes=new TextEncoder().encode(endpoint);const digest=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('')}
export default {async fetch(req,env){
 const url=new URL(req.url),origin=req.headers.get('Origin'),headers=cors(req);
 if(req.method==='OPTIONS')return origin===allowedOrigin?new Response(null,{status:204,headers:{...HEADERS,...headers}}):json({error:'Origin no permès'},403);
 if(origin!==allowedOrigin)return json({error:'Origin no permès'},403);
 if(!env.PUSH_DB)return json({error:'Servei encara no configurat'},503,headers);
 if(url.pathname==='/api/push/public-key'&&req.method==='GET'){
  return env.PUSH_VAPID_PUBLIC_KEY?json({publicKey:env.PUSH_VAPID_PUBLIC_KEY},200,headers):json({error:'VAPID pendent de configurar'},503,headers);
 }
 if(url.pathname==='/api/push/subscriptions'&&req.method==='POST'){
  if((Number(req.headers.get('Content-Length'))||0)>4096)return json({error:'Massa dades'},413,headers);
  let data;try{data=await req.json()}catch{return json({error:'JSON incorrecte'},400,headers)}
  if(!validEndpoint(data?.endpoint)||!validKey(data?.keys?.p256dh)||!validKey(data?.keys?.auth))return json({error:'Subscripció no vàlida'},400,headers);
  const id=await hash(data.endpoint);
  await env.PUSH_DB.prepare('INSERT INTO push_subscriptions (id,endpoint,p256dh,auth) VALUES (?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET p256dh=excluded.p256dh,auth=excluded.auth,updated_at=CURRENT_TIMESTAMP,disabled_at=NULL').bind(id,data.endpoint,data.keys.p256dh,data.keys.auth).run();
  return json({ok:true},201,headers);
 }
 if(url.pathname==='/api/push/subscriptions'&&req.method==='DELETE'){
  let data;try{data=await req.json()}catch{return json({error:'JSON incorrecte'},400,headers)}
  if(!validEndpoint(data?.endpoint))return json({error:'Subscripció no vàlida'},400,headers);
  await env.PUSH_DB.prepare('UPDATE push_subscriptions SET disabled_at=CURRENT_TIMESTAMP WHERE id=?').bind(await hash(data.endpoint)).run();
  return json({ok:true},200,headers);
 }
 return json({error:'Ruta no disponible'},404,headers);
}};
