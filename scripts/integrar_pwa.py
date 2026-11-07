#!/usr/bin/env python3
"""Integrate Android-compatible notifications and club crest PWA in existing home page."""
from pathlib import Path
import re,base64
p=Path('index.html')
s=p.read_text(encoding='utf-8')
if 'pbsv-integrated-v1' not in s:
    s=s.replace('</head>','<link rel="manifest" href="./manifest.webmanifest">\n<link rel="icon" type="image/png" href="./pbsv-crest.png">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-title" content="Penya Barcelonista">\n<!-- pbsv-integrated-v1 -->\n</head>',1)
    s=s.replace("function notify(title,body){if(!('Notification' in window)||Notification.permission!=='granted')return false;try{new Notification(title,{body,tag:'pbsv-alert'});return true;}catch(_){return false;}}", """async function notify(title,body){if(!('Notification' in window)||Notification.permission!=='granted)return false;try{const reg=await navigator.serviceWorker.ready;await reg.showNotification(title,{body,icon:'./pbsv-crest.png',badge:'./pbsv-crest.png',tag:'pbsv-alert',data:{url:'./index.html'}});return true;}catch(e){console.warn('Aviso:',e);return false;}}""")
    s=s.replace("const result=await Notification.requestPermission();","if(!('serviceWorker' in navigator)){showMessage('Tu navegador no admite Service Workers.');return;}await navigator.serviceWorker.register('./pbsv-sw.js',{scope:'./'});const result=Notification.permission==='granted'?'granted':await Notification.requestPermission();")
    s=s.replace("document.getElementById('notifyTest').addEventListener('click',()=>{if(!notify('🔔 Penya Barcelonista','Aviso de prueba de la web PBSV'))showMessage('Activa primero los avisos desde una página HTTPS compatible.');});","document.getElementById('notifyTest').addEventListener('click',async()=>{if(!await notify('🔔 Penya Barcelonista','Aviso de prueba de la web PBSV'))showMessage('Activa los avisos desde esta web HTTPS y vuelve a probar.');else showMessage('Notificación enviada al móvil.');});")
    s=s.replace("function check(){const now=Date.now();","async function check(){const now=Date.now();")
    s=s.replace("sent.add(item.id);notify('🔔 '+(item.type==='match'?'Partido del primer equipo':'Evento de la Penya'),item.title+' · '+new Date(when).toLocaleString('es-ES',{dateStyle:'short',timeStyle:'short'}));","if(await notify('🔔 '+(item.type==='match'?'Partido del primer equipo':'Evento de la Penya'),item.title+' · '+new Date(when).toLocaleString('es-ES',{dateStyle:'short',timeStyle:'short'})))sent.add(item.id);")
    s=s.replace("showMessage('Recordatorios de prueba: 1 hora antes de los partidos y 24 horas antes de los eventos, solo con esta web abierta.');","showMessage('Avisos compatibles con Chrome Android. Los recordatorios funcionan mientras la web está abierta.');")
    s=s.replace("</body></html>", """<script>if('serviceWorker' in navigator&&isSecureContext){navigator.serviceWorker.register('./pbsv-sw.js',{scope:'./'}).catch(console.warn)}</script>
</body></html>""",1)
    p.write_text(s,encoding='utf-8')
# Original embedded crest from the official page. Avoid replacing with generic PBSV icon.
m=re.search(r'<a class="brand"[^>]*>\s*<img src="data:image/png;base64,([^"]+)"',s)
if not m:
    m=re.search(r'<img src="data:image/png;base64,([^"]+)"',s)
if not m: raise SystemExit('No se encontró el escudo embebido; no se publicará un icono incorrecto')
Path('pbsv-crest.png').write_bytes(base64.b64decode(m.group(1)))
print('Integración lista, escudo:',Path('pbsv-crest.png').stat().st_size,'bytes')
