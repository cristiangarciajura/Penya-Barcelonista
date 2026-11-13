"""Captura diagnòstica de la FCF amb Browserless. No publica resultats."""
import json
import os
import pathlib
import sys
import urllib.error
import urllib.request
from urllib.parse import urlencode

token = os.environ.get("BROWSERLESS_TOKEN", "").strip()
if not token:
    sys.exit("Falta el secret BROWSERLESS_TOKEN a GitHub Actions.")
target = "https://www.fcf.cat/ca/competicio/2026-2027/tercera-catalana/grup-12/resultats"
endpoint = "https://production-sfo.browserless.io/screenshot?" + urlencode({"token": token})
payload = json.dumps({
    "url": target,
    "options": {"type": "png", "fullPage": True},
    "gotoOptions": {"waitUntil": "domcontentloaded", "timeout": 30000},
}).encode()
req = urllib.request.Request(endpoint, data=payload, headers={
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
}, method="POST")
try:
    with urllib.request.urlopen(req, timeout=65) as resp:
        content = resp.read(12_000_000)
        print("HTTP Browserless:", resp.status)
        print("HTTP web FCF (X-Response-Code):", resp.headers.get("X-Response-Code", "desconegut"))
        print("Content-Type:", resp.headers.get("Content-Type"))
        print("Recursos fallits:", resp.headers.get("X-Failed-Resource-Count", "desconegut"))
        print("Fulls d'estil fallits:", resp.headers.get("X-Failed-Stylesheet-Count", "desconegut"))
        if not content.startswith(b"\\x89PNG\\r\\n\\x1a\\n"):
            print("No s'ha rebut una imatge PNG. Cos:", content[:180].decode("utf-8", "replace"))
            sys.exit(1)
        pathlib.Path("captures-fcf").mkdir(exist_ok=True)
        path = pathlib.Path("captures-fcf/amateur-a-fcf.png")
        path.write_bytes(content)
        print("Captura generada:", path, "bytes:", len(content))
        if resp.headers.get("X-Response-Code") == "403":
            print("La FCF ha rebutjat l'accés automatitzat; la captura pot mostrar el bloqueig.")
except urllib.error.HTTPError as exc:
    print("HTTP Browserless:", exc.code)
    print("Error (sense mostrar URL ni token):", exc.read(300).decode("utf-8", "replace"))
    sys.exit(1)
except Exception as exc:
    print("Error:", type(exc).__name__, str(exc).replace(token, "[SECRET]")[:300])
    sys.exit(1)
