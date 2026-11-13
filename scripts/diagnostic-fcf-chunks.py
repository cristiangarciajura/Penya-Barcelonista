"""Diagnòstic limitat de referències a dades de partits als chunks públics FCF."""
import html.parser
import re
import urllib.parse
import urllib.request

BASE = "https://www.fcf.cat"
PAGE = BASE + "/ca/competicio/2026-2027/tercera-catalana/grup-12/resultats"
LIMIT = 16
MAX_BYTES = 750000

class Scripts(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []
    def handle_starttag(self, tag, attrs):
        if tag == "script":
            src = dict(attrs).get("src")
            if src and src.startswith("/_next/static/chunks/"):
                self.urls.append(urllib.parse.urljoin(BASE, src))

def read(url):
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=15) as response:
        return response.read(MAX_BYTES).decode("utf-8", "replace")

try:
    page = read(PAGE)
    parser = Scripts()
    parser.feed(page)
    print("Chunks detectats:", len(parser.urls))
    for url in parser.urls[:LIMIT]:
        name = url.rsplit("/", 1)[-1]
        try:
            body = read(url)
            tokens = ("partits", "matches", "resultats", "competicio", "jornada")
            counts = {token: len(re.findall(re.escape(token), body, re.I)) for token in tokens}
            print(name, "bytes", len(body), "referencies", counts)
            # Only report URL path shapes, never raw payloads or sensitive query parameters.
            paths = set()
            for match in re.finditer(r'/(?:api|ca/competicio)/[a-zA-Z0-9_/$./-]{3,110}', body):
                paths.add(match.group(0).split("?")[0])
            if paths:
                print("  possibles rutes:", sorted(paths)[:8])
        except Exception as exc:
            print(name, "error", type(exc).__name__, str(exc)[:90])
except Exception as exc:
    print("Error general:", type(exc).__name__, str(exc)[:120])
