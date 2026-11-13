"""Prova controlada de les dues rutes de competició FCF, sense publicar marcadors."""
import json
import urllib.parse
import urllib.request
import urllib.error

BASE = "https://www.fcf.cat"
TEAMS = {
    "Amateur A": ("2026-2027", "tercera-catalana", "grup-12"),
    "Amateur Fem A": ("2026-2027", "segona-divisio-femeni", "grup-5"),
}

def get_json(path, params):
    url = BASE + path + "?" + urllib.parse.urlencode(params)
    request = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
        "Referer": BASE + "/ca/competicio",
    })
    with urllib.request.urlopen(request, timeout=20) as response:
        payload = response.read(1000000)
        print("HTTP:", response.status, "bytes:", len(payload), "content-type:", response.headers.get("Content-Type"))
    return json.loads(payload)

def shape(value, depth=0):
    if depth >= 3:
        return type(value).__name__
    if isinstance(value, dict):
        return {str(k): shape(v, depth + 1) for k, v in list(value.items())[:25]}
    if isinstance(value, list):
        return {"type": "list", "length": len(value), "first": shape(value[0], depth + 1) if value else None}
    return type(value).__name__

def find_group_ids(value, depth=0):
    if depth > 4:
        return []
    found = []
    if isinstance(value, dict):
        for k, v in value.items():
            if k.lower() in ("grupid", "grup_id", "grupo_id", "grupoid", "idgrupo") and isinstance(v, (str, int)):
                found.append((k, v))
            elif isinstance(v, (dict, list)):
                found.extend(find_group_ids(v, depth + 1))
    elif isinstance(value, list):
        for v in value[:5]:
            found.extend(find_group_ids(v, depth + 1))
    return found

for name, (season, competition, group) in TEAMS.items():
    print("\n===", name, "===")
    try:
        resolved = get_json("/api/competition/resolve-slug", {
            "temporada": season,
            "competicioUrl": competition,
            "grupoUrl": group,
        })
        print("Resolve estructura:", json.dumps(shape(resolved), ensure_ascii=False)[:2500])
        ids = find_group_ids(resolved)
        print("Identificadors de grup:", ids[:10])
        if len(set(str(v) for _, v in ids)) != 1:
            print("Sense identificador inequívoc: no es consulten partits.")
            continue
        group_id = ids[0][1]
        partidos = get_json("/api/competition/partidos", {"grupId": group_id})
        print("Partits estructura:", json.dumps(shape(partidos), ensure_ascii=False)[:3500])
        print("No es publiquen resultats fins validar equip, rival i jornada.")
    except (urllib.error.URLError, ValueError, KeyError, TypeError) as exc:
        print("Error:", type(exc).__name__, str(exc)[:180])
