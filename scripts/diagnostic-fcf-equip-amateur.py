"""Comprova la fitxa oficial de l'Amateur A sense eludir controls d'accés."""
import re
import urllib.error
import urllib.request
from html.parser import HTMLParser

URL = "https://www.fcf.cat/ca/clubs/2259/categories/43244"
WORDS = ("Pª BARC", "SANT VICEN", "SANT VICENÇ", "2259", "43244", "partits", "calendari", "resultats")

class Visible(HTMLParser):
    def __init__(self):
        super().__init__()
        self.hidden = 0
        self.text = []
        self.links = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ("script", "style"):
            self.hidden += 1
        if tag == "a" and a.get("href"):
            self.links.append((a["href"], ""))
    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self.hidden = max(0, self.hidden - 1)
    def handle_data(self, value):
        if not self.hidden and value.strip():
            self.text.append(value.strip())

try:
    req = urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0", "Accept": "text/html"})
    with urllib.request.urlopen(req, timeout=20) as response:
        body = response.read(1500000).decode("utf-8", "replace")
        print("HTTP", response.status, "bytes", len(body), "url final", response.url)
    parser = Visible()
    parser.feed(body)
    text = " ".join(parser.text)
    title = re.search(r"<title[^>]*>(.*?)</title>", body, re.I | re.S)
    print("Títol:", title.group(1)[:160] if title else "no trobat")
    print("Coincidències HTML:", {word: len(re.findall(re.escape(word), body, re.I)) for word in WORDS})
    print("Coincidències text visible:", {word: len(re.findall(re.escape(word), text, re.I)) for word in WORDS})
    print("Text visible final:", text[-1100:])
    links = sorted(set(href for href, _ in parser.links if any(w in href.lower() for w in ("partit", "result", "calend", "club", "competicio"))))
    print("Enllaços relacionats:", links[:35])
except urllib.error.HTTPError as exc:
    print("HTTP error", exc.code)
except Exception as exc:
    print("Error", type(exc).__name__, str(exc)[:160])
