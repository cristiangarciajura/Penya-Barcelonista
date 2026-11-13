// RFC 8291 aes128gcm + RFC 8292 VAPID. Only called from the private admin route.
const enc=new TextEncoder();
const b64=s=>{let out='';for(const b of s)out+=String.fromCharCode(b);return btoa(out).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
const from64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));
const concat=(...parts)=>{const r=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let offset=0;for(const p of parts){r.set(p,offset);offset+=p.length}return r};
const uint32=n=>new Uint8Array([(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255]);
async function hkdf(ikm,salt,info,length){
 const key=await crypto.subtle.importKey('raw',ikm,'HKDF',false,['deriveBits']);
 return new Uint8Array(await crypto.subtle.deriveBits({name:'HKDF',hash:'SHA-256',salt,info},key,length*8));
}
async function vapidToken(endpoint,publicKey,privateKey){
 const pub=from64(publicKey);
 if(pub.length!==65||pub[0]!==4)throw Error('Clau pública VAPID incorrecta');
 const raw=privateKey.includes('BEGIN')?null:from64(privateKey.trim());
 let key;
 if(raw&&raw.length===32){
  key=await crypto.subtle.importKey('jwk',{kty:'EC',crv:'P-256',x:b64(pub.slice(1,33)),y:b64(pub.slice(33)),d:b64(raw),ext:false}, {name:'ECDSA',namedCurve:'P-256'},false,['sign']);
 }else{
  const der=privateKey.replace(/-----[^-]+-----/g,'').replace(/\s/g,'');
  const bytes=Uint8Array.from(atob(der),c=>c.charCodeAt(0));
  key=await crypto.subtle.importKey('pkcs8',bytes,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
 }
 const aud=new URL(endpoint).origin;
 const header=b64(enc.encode(JSON.stringify({typ:'JWT',alg:'ES256'})));
 const payload=b64(enc.encode(JSON.stringify({aud,exp:Math.floor(Date.now()/1000)+3600,sub:'https://cristiangarciajura.github.io/Penya-Barcelonista/'})));
 const input=header+'.'+payload;
 const signature=new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,enc.encode(input)));
 return 'vapid t='+input+'.'+b64(signature)+', k='+publicKey;
}
async function encrypt(subscription,message){
 const ua=from64(subscription.p256dh),auth=from64(subscription.auth);
 if(ua.length!==65||ua[0]!==4||auth.length!==16)throw Error('Subscripció incorrecta');
 const sender=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
 const senderPublic=new Uint8Array(await crypto.subtle.exportKey('raw',sender.publicKey));
 const receiver=await crypto.subtle.importKey('raw',ua,{name:'ECDH',namedCurve:'P-256'},false,[]);
 const shared=new Uint8Array(await crypto.subtle.deriveBits({name:'ECDH',public:receiver},sender.privateKey,256));
 const ikm=await hkdf(shared,auth,concat(enc.encode('WebPush: info'),new Uint8Array([0]),ua,senderPublic),32);
 const salt=crypto.getRandomValues(new Uint8Array(16));
 const cek=await hkdf(ikm,salt,enc.encode('Content-Encoding: aes128gcm\0'),16);
 const nonce=await hkdf(ikm,salt,enc.encode('Content-Encoding: nonce\0'),12);
 const key=await crypto.subtle.importKey('raw',cek,{name:'AES-GCM'},false,['encrypt']);
 const plain=concat(enc.encode(JSON.stringify(message)),new Uint8Array([2]));
 const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce,tagLength:128},key,plain));
 return concat(salt,uint32(4096),new Uint8Array([senderPublic.length]),senderPublic,encrypted);
}
export async function sendWebPush(row,message,env){
 const endpoint=new URL(row.endpoint);
 if(endpoint.protocol!=='https:'||!['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com','api.push.apple.com'].includes(endpoint.hostname))throw Error('Endpoint no permès');
 const [authorization,payload]=await Promise.all([
  vapidToken(row.endpoint,env.PUSH_VAPID_PUBLIC_KEY,env.PUSH_VAPID_PRIVATE_KEY),
  encrypt(row,message)
 ]);
 const result=await fetch(row.endpoint,{method:'POST',headers:{Authorization:authorization,'Content-Encoding':'aes128gcm','Content-Type':'application/octet-stream',TTL:'60'},body:payload,signal:AbortSignal.timeout(12000)});
 return {status:result.status,ok:result.ok,expired:result.status===404||result.status===410};
}
