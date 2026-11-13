"""Diagnòstic de l'enllaç públic Matchapp de l'Amateur A; no consulta APIs privades."""
import urllib.request
import urllib.error
from html.parser import HTMLParser

URL = "https://go.matchapp.es/team/43244/-1/round/CAT/football"

class Inspect(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = []
        self.in_title = False
        self.links = []
        self.text = []
        self.hidden = 0
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "title":
            self.in_title = True
        if tag in ("script", "style"):
            self.hidden += 1
        if tag == "a" and attrs.get("href"):
            self.links.append(attrs["href"])
    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
        if tag in ("script", "style"):
            self.hidden = max(0, self.hidden - 1)
    def handle_data(self, data):
        if self.in_title:
            self.title.append(data)
        if not self.hidden and data.strip():
            self.text.append(data.strip())

try:
    request = urllib.request.Request(URL, headers={
        "User-Agent": "Mozilla/5.0 (compatible; PBSV-Diagnostic/0.1)",
        "Accept": "text/html,application/xhtml+xml",
    })
    with urllib.request.urlopen(request, timeout=20) as response:
        body = response.read(500000).decode("utf-8", "replace")
        print("HTTP:", response.status)
        print("URL final:", response.url)
        print("Content-Type:", response.headers.get("Content-Type"))
        print("Bytes:", len(body.encode("utf-8")))
    parser = Inspect()
    parser.feed(body)
    print("Títol:", " ".join(parser.title)[:180])
    text = " ".join(parser.text)
    for term in ("43244", "Pª BARC", "SANT VICEN", "SANT VICENÇ", "result", "partit"):
        print("Conté", repr(term), "HTML:", term.casefold() in body.casefold(), "text visible:", term.casefold() in text.casefold())
    print("Text visible:", text[:600])
    print("Enllaços públics:", parser.links[:15])
    print("HTML complet (pàgina petita):", body[:3000])
except urllib.error.HTTPError as exc:
    print("HTTP error:", exc.code)
except urllib.error.URLError as exc:
    print("Error de xarxa:", str(exc.reason)[:150])
except Exception as exc:
    print("Error:", type(exc).__name__, str(exc)[:150])

print("\\n--- Destí públic de la redirecció ---")
try:
    req = urllib.request.Request("https://get.matchapp.es/", headers={"User-Agent": "Mozilla/5.0", "Accept": "text/html"})
    with urllib.request.urlopen(req, timeout=20) as response:
        dest = response.read(100000).decode("utf-8", "replace")
        print("HTTP destí:", response.status)
        print("URL final destí:", response.url)
        print("Content-Type destí:", response.headers.get("Content-Type"))
        print("HTML destí (primers 2500 caràcters):", dest[:2500])
except urllib.error.HTTPError as exc:
    print("HTTP error destí:", exc.code)
except Exception as exc:
    print("Error destí:", type(exc).__name__, str(exc)[:150])
