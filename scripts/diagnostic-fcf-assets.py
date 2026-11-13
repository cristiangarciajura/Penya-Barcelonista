import html
import re
import urllib.request
from html.parser import HTMLParser

URLS = {
    "Amateur A": "https://www.fcf.cat/ca/competicio/2026-2027/tercera-catalana/grup-12/resultats",
    "Amateur Fem A": "https://www.fcf.cat/ca/competicio/2026-2027/segona-divisio-femeni/grup-5/resultats",
}

class ScriptFinder(HTMLParser):
    def __init__(self):
        super().__init__()
        self.scripts = []
        self.json_scripts = 0
        self.app_containers = 0
        self.csrf_tokens = 0

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == "script":
            if values.get("src"):
                self.scripts.append(values["src"])
            if values.get("type") == "application/json":
                self.json_scripts += 1
        if tag == "div" and values.get("id") in ("app", "__next"):
            self.app_containers += 1
        if tag == "meta" and values.get("name") == "csrf-token":
            self.csrf_tokens += 1

for name, url in URLS.items():
    print("\\n=== " + name + " ===")
    try:
        request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(request, timeout=20) as response:
            page = response.read(1500000).decode("utf-8", "replace")
        finder = ScriptFinder()
        finder.feed(page)
        print("Scripts externs (camins):")
        for src in finder.scripts[:25]:
            print(" ", src.split("?")[0][:160])
        keywords = [
            "__NEXT_DATA__", "__NUXT__", "__INITIAL_STATE__", "application/json",
            "data-page", "axios", "fetch(", "inertia", "livewire",
            "partits", "matches", "fixtures", "resultats",
        ]
        print("Marcadors de dades:", {
            key: len(re.findall(re.escape(key), page, re.I)) for key in keywords
        })
        print("Indicadors HTML:", {
            "json_scripts": finder.json_scripts,
            "app_containers": finder.app_containers,
            "csrf_tokens": finder.csrf_tokens,
        })
        for token in ("TERCERA CATALANA", "SEGONA DIVISIO FEMENI", "resultats"):
            indices = [m.start() for m in re.finditer(re.escape(token), page, re.I)]
            if indices:
                pos = indices[-1]
                excerpt = html.unescape(page[max(0, pos - 150):pos + 250])
                print("Context de", token, ":", " ".join(excerpt.split())[:400])
            else:
                print("Context de", token, ": absent")
    except Exception as exc:
        print("Error:", type(exc).__name__, str(exc)[:150])
