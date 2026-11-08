#!/usr/bin/env python3
"""Use imported team JSON in the existing SPA without replacing its team UI."""
from pathlib import Path
import re,ast,json
p=Path('index.html');s=p.read_text(encoding='utf-8')
marker='/* pbsv-teams-json-integration-v1 */'
if marker in s:print('Teams already connected');raise SystemExit(0)
start=s.index('const teamAssets=')
end=s.index('</script>',start)
block=s[start:end]
candidates=[]
for m in re.finditer(r'\bconst\s+(\w+)\s*=\s*(\[)',block):
 fragment=block[m.start(2):m.start(2)+7000]
 stop=fragment.find('];')
 if stop<0:continue
 try:obj=ast.literal_eval(fragment[:stop+1])
 except (SyntaxError,ValueError):continue
 if isinstance(obj,list) and len(obj)==25 and all(isinstance(x,(list,tuple)) and len(x)==2 and x[1] in ('masc','fem','genuine') for x in obj):
  candidates.append(m.group(1))
assert len(candidates)==1, f'Expected one 25-team list: {candidates}'
name=candidates[0]
js="""
/* pbsv-teams-json-integration-v1 */
(function(){
 fetch('./data/equips.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('No team data');return r.json()}).then(d=>{
  if(!Array.isArray(d.teams)||!d.teams.length)return;
  const valid=d.teams.filter(t=>t&&typeof t.name==='string'&&['masc','fem','genuine'].includes(t.category));
  if(!valid.length)return;
  TEAM_LIST.splice(0,TEAM_LIST.length,...valid.map(t=>[t.name,t.category]));
  for(const k of Object.keys(teamAssets))delete teamAssets[k];
  for(const k of Object.keys(teamRosters))delete teamRosters[k];
  for(const k of Object.keys(fcfLinks))delete fcfLinks[k];
  for(const t of valid){
   if(t.image&&typeof t.image==='string'&&(/^(\.\/)?assets\//.test(t.image)||t.image.startsWith('data:image/')))teamAssets[t.name]=t.image;
   teamRosters[t.name]={players:Array.isArray(t.players)?t.players:Array.isArray(t.members)?t.members.map(name=>({name,number:null})):[],staff:Array.isArray(t.staff)?t.staff:[]};
   if(t.url&&/^https:\/\//.test(t.url))fcfLinks[t.name]=t.url;
  }
  const selected=document.querySelector('#teamFilters .team-filter.selected');
  if(selected)selected.click();
 }).catch(e=>console.warn('PBSV teams:',e));
})();
""".replace('TEAM_LIST',name)
s=s[:end]+js+s[end:]
assert marker in s
p.write_text(s,encoding='utf-8')
print('Connected teams using existing list:',name)
