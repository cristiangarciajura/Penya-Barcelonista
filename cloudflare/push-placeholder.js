// PBSV: comprovacio de configuracio. Cap subscripcio ni enviament habilitat encara.
const ORIGIN='https://cristiangarciajura.github.io';
function reply(data,status=200,origin=false){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...(origin?{'access-control-allow-origin':ORIGIN,'vary':'Origin'}:{})}})}
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  const sameOrigin=request.headers.get('Origin')===ORIGIN;
  if(request.method!=='GET')return reply({error:'Method not allowed'},405);
  if(url.pathname==='/api/push/status'){
   let database=false;
   try{if(env.PUSH_DB){await env.PUSH_DB.prepare('SELECT 1 FROM push_subscriptions LIMIT 1').first();database=true}}catch{}
   return reply({service:'pbsv-push',database,publicKeyConfigured:typeof env.PUSH_VAPID_PUBLIC_KEY==='string'&&env.PUSH_VAPID_PUBLIC_KEY.length>0,privateKeyConfigured:typeof env.PUSH_VAPID_PRIVATE_KEY==='string'&&env.PUSH_VAPID_PRIVATE_KEY.length>0,subscriptionsEnabled:false,sendingEnabled:false});
  }
  if(url.pathname==='/api/push/public-key'){
   if(!sameOrigin)return reply({error:'Origin not allowed'},403);
   if(!env.PUSH_VAPID_PUBLIC_KEY)return reply({error:'Public key not configured'},503,true);
   return reply({publicKey:env.PUSH_VAPID_PUBLIC_KEY,subscriptionsEnabled:false},200,true);
  }
  return reply({service:'pbsv-push',status:'setup_pending'},503);
 }
};
