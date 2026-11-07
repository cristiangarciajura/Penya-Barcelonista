from pathlib import Path
from PIL import Image
import io
p=Path('index.html')
s=p.read_text(encoding='utf-8')
old="async function notify(title,body){if(!('Notification' in window)||Notification.permission!=='granted)return false;try{const reg=await navigator.serviceWorker.ready;await reg.showNotification(title,{body,icon:'./pbsv-crest.png',badge:'./pbsv-crest.png',tag:'pbsv-alert',data:{url:'./index.html'}});return true;}catch(e){console.warn('Aviso:',e);return false;}}"
new="""async function notify(title,body){
 if(!('Notification' in window))throw Error('Chrome no admite notificaciones en este contexto');
 if(Notification.permission!=='granted')throw Error('Permiso actual: '+Notification.permission+'. Pulsa Activar avisos.');
 if(!('serviceWorker' in navigator))throw Error('El navegador no admite Service Worker');
 const reg=await navigator.serviceWorker.register('./pbsv-sw.js',{scope:'./'});
 await reg.showNotification(title,{body,icon:'./pbsv-icon-padded.png',tag:'pbsv-alert',data:{url:'./index.html'}});
 return true;
}"""
if old in s:s=s.replace(old,new)
oldtest="document.getElementById('notifyTest').addEventListener('click',async()=>{if(!await notify('🔔 Penya Barcelonista','Aviso de prueba de la web PBSV'))showMessage('Activa los avisos desde esta web HTTPS y vuelve a probar.');else showMessage('Notificación enviada al móvil.');});"
newtest="""document.getElementById('notifyTest').addEventListener('click',async()=>{
 try{await notify('🔔 Penya Barcelonista','Aviso de prueba de la web PBSV');showMessage('Notificación enviada al móvil.');}
 catch(e){console.error(e);showMessage('No se pudo enviar: '+e.message);}
});"""
if oldtest in s:s=s.replace(oldtest,newtest)
# Make background reminders resilient to permission errors
s=s.replace("if(await notify('🔔 '+(item.type==='match'?'Partido del primer equipo':'Evento de la Penya'),item.title+' · '+new Date(when).toLocaleString('es-ES',{dateStyle:'short',timeStyle:'short'})))sent.add(item.id);","try{if(await notify('🔔 '+(item.type==='match'?'Partido del primer equipo':'Evento de la Penya'),item.title+' · '+new Date(when).toLocaleString('es-ES',{dateStyle:'short',timeStyle:'short'})))sent.add(item.id);}catch(e){console.warn('Recordatorio pendiente:',e);}")
if 'pbsv-android-fix-v2' not in s:
 s=s.replace('<!-- pbsv-integrated-v1 -->','<!-- pbsv-integrated-v1 --><!-- pbsv-android-fix-v2 -->')
p.write_text(s,encoding='utf-8')
crest=Image.open('pbsv-crest.png').convert('RGBA')
crest.thumbnail((350,350),Image.Resampling.LANCZOS)
canvas=Image.new('RGBA',(512,512),(7,21,45,255))
canvas.alpha_composite(crest,((512-crest.width)//2,(512-crest.height)//2))
canvas.convert('RGB').save('pbsv-icon-padded.png',optimize=True)
import json
m=json.loads(Path('manifest.webmanifest').read_text())
m['icons']=[{'src':'./pbsv-icon-padded.png','sizes':'512x512','type':'image/png','purpose':'any maskable'}]
Path('manifest.webmanifest').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
print('Reparación aplicada; icono con márgenes 512px; avisos de portada revisados')
