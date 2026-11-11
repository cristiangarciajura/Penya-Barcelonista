// Service worker compartit per la PWA PBSV. Compatible amb proves locals i Web Push.
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
const HOME=new URL('./index.html',self.registration.scope);
function destination(raw){
 try{
  const u=new URL(typeof raw==='string'?raw:'./index.html',self.registration.scope);
  // Mai permetre que un avís redirigeixi fora de l'app.
  if(u.origin!==HOME.origin||!u.pathname.startsWith(new URL(self.registration.scope).pathname))return HOME.href;
  if(u.protocol!=='https:'&&u.protocol!=='http:')return HOME.href;
  return u.href;
 }catch{return HOME.href}
}
self.addEventListener('push',event=>{
 event.waitUntil((async()=>{
  let data={};try{data=event.data?.json()||{}}catch{data={body:event.data?.text()||''}}
  const title=String(data.title||'Penya Barcelonista').slice(0,90);
  const body=String(data.body||data.message||'Nou avís de la Penya').slice(0,240);
  const url=destination(data.url||data?.data?.url);
  await self.registration.showNotification(title,{
   body,icon:new URL('./pbsv-icon-padded.png',self.registration.scope).href,
   badge:new URL('./pbsv-icon-padded.png',self.registration.scope).href,
   tag:String(data.tag||data.id||'pbsv-avís').slice(0,100),
   data:{url},renotify:false
  });
 })());
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil((async()=>{
  const url=destination(event.notification.data?.url);
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of windows){
   try{if(new URL(client.url).origin===new URL(url).origin){
    await client.navigate(url);return client.focus();
   }}catch{}
  }
  return self.clients.openWindow(url);
 })());
});
