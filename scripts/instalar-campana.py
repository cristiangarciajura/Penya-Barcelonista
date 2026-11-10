from pathlib import Path
p=Path("index.html")
s=p.read_text(encoding="utf-8")
if 'id="pbsvBell"' in s:
    print("Campana ja integrada")
    raise SystemExit(0)
start=s.index('<section class="notify-panel" id="avisos"')
end=s.index('</section>',start)+len('</section>')
panel=s[start:end]
s=s[:start]+s[end:]
bell='''<button class="pbsv-bell" id="pbsvBell" type="button" aria-label="Obrir avisos" aria-haspopup="dialog" aria-controls="pbsvAlertOverlay" aria-expanded="false" title="Avisos"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg></button>'''
needle='<button class="menu-toggle" id="menuToggle"'
assert needle in s
s=s.replace(needle,bell+'\n   '+needle,1)
style='''.pbsv-bell{display:grid;place-items:center;flex:0 0 auto;width:40px;height:40px;border:1px solid #ffffff55;border-radius:50%;background:#ffffff12;color:#fff;cursor:pointer}.pbsv-bell:hover,.pbsv-bell:focus-visible{background:#ffffff2a;outline:2px solid #f2c51d;outline-offset:2px}.pbsv-bell svg{width:21px;height:21px}.pbsv-alert-overlay{position:fixed;inset:0;z-index:100;background:#06132bc9;display:none;align-items:flex-start;justify-content:center;overflow-y:auto;padding:clamp(16px,5vh,50px) 14px}.pbsv-alert-overlay.open{display:flex}.pbsv-alert-dialog{background:#07152d;border-radius:20px;width:min(760px,100%);max-height:90vh;overflow:auto;padding:18px;box-shadow:0 20px 70px #0008}.pbsv-alert-head{display:flex;justify-content:space-between;align-items:center;color:#fff;gap:12px}.pbsv-alert-head h2{margin:0;font-size:20px}.pbsv-alert-close{background:#ffffff22;color:#fff;border:1px solid #ffffff55;border-radius:50%;width:38px;height:38px;cursor:pointer;font-size:24px}.pbsv-alert-dialog .notify-panel{margin:14px 0 0}@media(max-width:520px){.pbsv-alert-dialog{padding:12px}.pbsv-alert-overlay{padding:10px}.pbsv-bell{width:36px;height:36px}}'''
s=s.replace('</style>',style+'\n</style>',1)
modal='''<div class="pbsv-alert-overlay" id="pbsvAlertOverlay" aria-hidden="true"><div class="pbsv-alert-dialog" role="dialog" aria-modal="true" aria-labelledby="pbsvAlertTitle" tabindex="-1"><div class="pbsv-alert-head"><h2 id="pbsvAlertTitle">🔔 Avisos de la Penya</h2><button type="button" class="pbsv-alert-close" id="pbsvAlertClose" aria-label="Tancar avisos">×</button></div>'''+panel+'''</div></div>'''
s=s.replace('</main>','</main>\n'+modal,1)
js='''<script id="pbsv-bell-controller">(function(){const bell=document.getElementById('pbsvBell'),overlay=document.getElementById('pbsvAlertOverlay'),close=document.getElementById('pbsvAlertClose'),dialog=overlay.querySelector('.pbsv-alert-dialog');let previous=null;function toggle(open){overlay.classList.toggle('open',open);overlay.setAttribute('aria-hidden',String(!open));bell.setAttribute('aria-expanded',String(open));document.body.style.overflow=open?'hidden':'';if(open){previous=document.activeElement;dialog.focus()}else{(previous&&previous.isConnected?previous:bell).focus()}}bell.addEventListener('click',()=>toggle(true));close.addEventListener('click',()=>toggle(false));overlay.addEventListener('click',e=>{if(e.target===overlay)toggle(false)});document.addEventListener('keydown',e=>{if(!overlay.classList.contains('open'))return;if(e.key==='Escape')toggle(false);if(e.key==='Tab'){const controls=[...dialog.querySelectorAll('button,input,select,summary,a[href]')].filter(el=>el.getClientRects().length&&!el.disabled);if(!controls.length)return;const first=controls[0],last=controls[controls.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}})})();</script>'''
s=s.replace('</body>',js+'</body>',1)
assert s.count('id="avisos"')==1 and s.index('id="avisos"')>s.index('</main>')
p.write_text(s,encoding="utf-8")
print("Campana integrada; avisos retirats de la portada")
