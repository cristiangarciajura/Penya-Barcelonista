const OWNER='cristiangarciajura', REPO='Penya-Barcelonista';
const SITE='https://cristiangarciajura.github.io/Penya-Barcelonista/';
const ALLOWED=new Set(['equips.json','club.json','noticies.json','patrocinadors.json','partits-cap-setmana.json']);
const encoder=new TextEncoder();
function cookies(req){return Object.fromEntries((req.headers.get('Cookie')||'').split(';').map(x=>x.trim()).filter(Boolean).map(x=>{const i=x.indexOf('=');return [x.slice(0,i),x.slice(i+1)]}))}
function respond(body,status=200,headers={}){return new Response(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}})}
function redirect(url,headers={}){return Response.redirect(url,302)}
function cookie(name,value,maxAge){return name+'='+value+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age='+maxAge}
function b64(bytes){let value='';for(let i=0;i<bytes.length;i+=8192)value+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(value).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function unb64(s){const str=atob(s.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(str,c=>c.charCodeAt(0))}
async function key(env){if(!env.SESSION_KEY)throw Error('SESSION_KEY missing');const hash=await crypto.subtle.digest('SHA-256',encoder.encode(env.SESSION_KEY));return crypto.subtle.importKey('raw',hash,'AES-GCM',false,['encrypt','decrypt'])}
async function seal(value,env){const iv=crypto.getRandomValues(new Uint8Array(12));const bytes=await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(env),encoder.encode(JSON.stringify(value)));return b64(iv)+'.'+b64(new Uint8Array(bytes))}
async function unseal(value,env){try{const [a,b]=value.split('.');const raw=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(a)},await key(env),unb64(b));return JSON.parse(new TextDecoder().decode(raw))}catch{return null}}
async function github(path,token,options={}){return fetch('https://api.github.com'+path,{...options,headers:{'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'PBSV-Admin',...(options.headers||{})}})}
function config(env){return !!(env.GITHUB_CLIENT_ID&&env.GITHUB_CLIENT_SECRET&&env.SESSION_KEY)}
async function session(req,env){const value=cookies(req).pbsv_session;if(!value)return null;const s=await unseal(value,env);return s&&s.exp>Date.now()?s:null}
export default {async fetch(req,env){
 const url=new URL(req.url),origin=url.origin,path=url.pathname;
 if(!config(env)){const missing=['GITHUB_CLIENT_ID','GITHUB_CLIENT_SECRET','SESSION_KEY'].filter(k=>!env[k]);return respond('Configuració pendent. Variables absents: '+missing.join(', ')+'. Revisa Production → Settings → Variables and Secrets.',503);}
 if(path==='/auth/login'){
  const state=b64(crypto.getRandomValues(new Uint8Array(24)));
  const auth=new URL('https://github.com/login/oauth/authorize');
  auth.searchParams.set('client_id',env.GITHUB_CLIENT_ID);
  auth.searchParams.set('redirect_uri',origin+'/auth/callback');
  auth.searchParams.set('scope','public_repo');auth.searchParams.set('state',state);
  return respond(null,302,{'Location':auth.toString(),'Set-Cookie':cookie('pbsv_state',state,600)});
 }
 if(path==='/auth/callback'){
  const state=cookies(req).pbsv_state;
  if(!state||state!==url.searchParams.get('state'))return respond('Validació OAuth incorrecta.',403);
  const tokenResponse=await fetch('https://github.com/login/oauth/access_token',{method:'POST',headers:{'Accept':'application/json','Content-Type':'application/json'},body:JSON.stringify({client_id:env.GITHUB_CLIENT_ID,client_secret:env.GITHUB_CLIENT_SECRET,code:url.searchParams.get('code'),redirect_uri:origin+'/auth/callback'})});
  const result=await tokenResponse.json();
  if(!result.access_token)return respond('No s’ha pogut completar l’accés a GitHub.',403);
  const userResponse=await github('/user',result.access_token);
  if(!userResponse.ok)return respond('No s’ha pogut verificar GitHub.',403);
  const user=await userResponse.json();
  if(user.login?.toLowerCase()!==OWNER.toLowerCase())return respond('Només el compte propietari pot publicar.',403);
  const value=await seal({token:result.access_token,login:user.login,exp:Date.now()+8*3600000},env);
  const headers=new Headers({'Location':origin+'/admin.html','Cache-Control':'no-store'});
  headers.append('Set-Cookie',cookie('pbsv_session',value,8*3600));
  headers.append('Set-Cookie',cookie('pbsv_state','',0));
  return new Response(null,{status:302,headers});
 }
 if(path==='/auth/logout')return respond(null,302,{'Location':origin+'/','Set-Cookie':cookie('pbsv_session','',0)});
 const s=await session(req,env);
 if(path==='/api/me')return respond(JSON.stringify({authenticated:!!s,login:s?.login||null}),200,{'Content-Type':'application/json'});
 if(path==='/api/push/send'||path==='/api/push/history'){
  const sending=path==='/api/push/send';
  if(req.method!==(sending?'POST':'GET'))return respond('Method not allowed',405);
  if(sending&&(req.headers.get('Origin')!==origin||req.headers.get('X-PBSV-Action')!=='push-send'))return respond('Forbidden',403);
  const json=(data,status)=>respond(JSON.stringify(data),status,{'Content-Type':'application/json'});
  if(!s)return json({error:'Inicia sessió amb GitHub.'},401);
  const identityResponse=await github('/user',s.token);
  if(!identityResponse.ok)return json({error:'Sessió GitHub caducada.'},401);
  const identity=await identityResponse.json();
  if(identity.login?.toLowerCase()!==OWNER.toLowerCase())return json({error:'Accés denegat.'},403);
  if(!env.PUSH_SERVICE||!env.PUSH_INTERNAL_TOKEN)return json({error:'Connexió privada PUSH_SERVICE no configurada.'},503);
  let payload=null;
  if(sending){try{const raw=await req.text();if(raw.length>4096)return json({error:'Dades massa grans.'},413);payload=JSON.parse(raw)}catch{return json({error:'JSON incorrecte.'},400)}}
  try{
   const upstream=await env.PUSH_SERVICE.fetch('https://pbsv-push.internal/api/push/admin/'+(sending?'send':'history'),{method:sending?'POST':'GET',headers:{'Authorization':'Bearer '+env.PUSH_INTERNAL_TOKEN,...(sending?{'Content-Type':'application/json'}:{})},...(sending?{body:JSON.stringify(payload)}:{})});
   return respond(await upstream.text(),upstream.status,{'Content-Type':'application/json'});
  }catch{return json({error:'No es pot contactar amb el servidor de notificacions.'},502)}
 }
 if(path==='/api/push/test'){
  if(req.method!=='POST')return respond('Method not allowed',405);
  if(req.headers.get('Origin')!==origin||req.headers.get('X-PBSV-Action')!=='push-test')return respond('Forbidden',403);
  if(!s)return respond(JSON.stringify({error:'Inicia sessió amb GitHub.'}),401,{'Content-Type':'application/json'});
  const identityResponse=await github('/user',s.token);
  if(!identityResponse.ok)return respond(JSON.stringify({error:'Sessió GitHub caducada.'}),401,{'Content-Type':'application/json'});
  const identity=await identityResponse.json();
  if(identity.login?.toLowerCase()!==OWNER.toLowerCase())return respond(JSON.stringify({error:'Accés denegat.'}),403,{'Content-Type':'application/json'});
  if(!env.PUSH_SERVICE||!env.PUSH_INTERNAL_TOKEN)return respond(JSON.stringify({error:!env.PUSH_SERVICE?'Falta el Service Binding PUSH_SERVICE al Worker pbsv-admin.':'Falta el secret PUSH_INTERNAL_TOKEN al Worker pbsv-admin.'}),503,{'Content-Type':'application/json'});
  let data;try{data=await req.json()}catch{return respond(JSON.stringify({error:'JSON incorrecte.'}),400,{'Content-Type':'application/json'})}
  const title=String(data?.title||'').trim(),body=String(data?.body||'').trim();
  if(!title||title.length>90||!body||body.length>240)return respond(JSON.stringify({error:'Títol o missatge incorrectes.'}),400,{'Content-Type':'application/json'});
  try{
   const upstream=await env.PUSH_SERVICE.fetch('https://pbsv-push.internal/api/push/admin/test',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+env.PUSH_INTERNAL_TOKEN},body:JSON.stringify({title,body,url:'./avisos.html'})});
   const result=await upstream.text();
   return respond(result,upstream.status,{'Content-Type':'application/json'});
  }catch{return respond(JSON.stringify({error:'No es pot contactar amb el servidor de notificacions.'}),502,{'Content-Type':'application/json'})}
 }
 if(path==='/api/publish'){
  if(req.method!=='POST')return respond('Method not allowed',405);
  if(req.headers.get('Origin')!==origin||req.headers.get('X-PBSV-Action')!=='publish')return respond('Forbidden',403);
  if(!s)return respond('Inicia sessió amb GitHub.',401);
  if(Number(req.headers.get('Content-Length')||0)>1500000)return respond('Fitxer massa gran.',413);
  let payload;try{payload=await req.json()}catch{return respond('JSON incorrecte.',400)}
  const file=payload?.file,content=payload?.content;
  if(!ALLOWED.has(file)||typeof content!=='string'||content.length>1500000)return respond('Dades no permeses.',400);
  try{const parsed=JSON.parse(content);const collections={'equips.json':'teams','club.json':'sections','noticies.json':'noticias','patrocinadors.json':'sponsors'};if(file==='partits-cap-setmana.json' ? !(parsed.saturday&&typeof parsed.saturday==='object'&&parsed.sunday&&typeof parsed.sunday==='object') : !Array.isArray(parsed[collections[file]]))return respond('Format de dades incorrecte.',400)}catch{return respond('JSON incorrecte.',400)}
  const user=await github('/user',s.token);if(!user.ok)return respond('Sessió GitHub caducada.',401);
  const identity=await user.json();if(identity.login?.toLowerCase()!==OWNER.toLowerCase())return respond('Accés denegat.',403);
  const api='/repos/'+OWNER+'/'+REPO+'/contents/data/'+file;
  const current=await github(api,s.token);if(!current.ok)return respond('No es pot llegir el fitxer a GitHub.',502);
  const metadata=await current.json();
  const bytes=encoder.encode(content);if(bytes.length>1100000)return respond('Fitxer massa gran.',413);
  const encoded=b64(bytes).replace(/-/g,'+').replace(/_/g,'/');const padded=encoded+'='.repeat((4-encoded.length%4)%4);
  const save=await github(api,s.token,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'Actualitzar '+file+' des de l’administració PBSV',content:padded,sha:metadata.sha,branch:'main'})});
  if(!save.ok)return respond(save.status===409?'Conflicte: el fitxer ha canviat. Recarrega abans de publicar.':'GitHub ha rebutjat la publicació ('+save.status+').',save.status===409?409:502);
  const out=await save.json();
  return respond(JSON.stringify({ok:true,commit:out.commit?.sha}),200,{'Content-Type':'application/json'});
 }
 if(path==='/'&&!s)return respond('<!doctype html><html lang="ca"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Administració PBSV</title><body style="font:18px system-ui;max-width:520px;margin:60px auto;padding:20px"><h1>Administració de la Penya</h1><p>Accés reservat al compte autoritzat de GitHub.</p><a style="display:inline-block;padding:14px 20px;background:#174b9d;color:white;border-radius:9px" href="/auth/login">Entrar amb GitHub</a></body></html>',200,{'Content-Type':'text/html;charset=utf-8'});
 if(!s)return respond(null,302,{'Location':origin+'/'});
 if(req.method!=='GET'&&req.method!=='HEAD')return respond('Method not allowed',405);
 const safe=path==='/'?'admin.html':decodeURIComponent(path.slice(1));
 if(safe.includes('..')||safe.startsWith('/')||safe.includes('\\'))return respond('Bad path',400);
 const upstream=await fetch(SITE+safe+url.search,{redirect:'follow'});
 if(!upstream.ok)return respond('No es pot carregar la pàgina.',upstream.status);
 const headers=new Headers({'Content-Type':upstream.headers.get('Content-Type')||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
 return new Response(upstream.body,{status:upstream.status,headers});
}};
