"""Diagnòstic de rutes públiques de resultats FCF, sense publicar dades."""
import re
import urllib.request
from html.parser import HTMLParser
from urllib.parse import urljoin

BASE = "https://www.fcf.cat"
PAGE = BASE + "/ca/competicio/2026-2027/tercera-catalana/grup-12/resultats"

class Scripts(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []
    def handle_starttag(self, tag, attrs):
        if tag == "script":
            src = dict(attrs).get("src", "")
            if src.startswith("/_next/static/chunks/"):
                self.urls.append(urljoin(BASE, src))

def fetch(url, limit=500000):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as response:
        return response.read(limit).decode("utf-8", "replace")

try:
    parser = Scripts()
    parser.feed(fetch(PAGE))
    interesting = ("result", "partit", "match", "jornada", "calend", "fixture", "competition")
    for url in parser.urls[:20]:
        try:
            body = fetch(url)
            paths = sorted(set(re.findall(r"/api/[a-zA-Z0-9_/$./-]{3,140}", body)))
            filtered = [p for p in paths if any(word in p.lower() for word in interesting)]
            if filtered:
                print(url.rsplit("/", 1)[-1], "rutes candidates:")
                for path in filtered[:35]:
                    print(" ", path)
            for match in list(re.finditer(r"/api/competition/[a-zA-Z0-9_/-]+", body))[:15]:
                snippet = body[max(0, match.start() - 100):match.end() + 180]
                if any(word in snippet.lower() for word in ("result", "partit", "jornada", "match")):
                    print("  Context tècnic:", snippet[:280])
        except Exception as exc:
            print("Chunk no disponible:", type(exc).__name__)
except Exception as exc:
    print("Error general:", type(exc).__name__, str(exc)[:140])
