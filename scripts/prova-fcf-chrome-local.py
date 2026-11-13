"""Prova local FCF: captura de la pàgina pública amb Chrome instal·lat.

Execució voluntària en un ordinador amb Chrome:
    pip install playwright==1.56.0
    python scripts/prova-fcf-chrome-local.py

No utilitza credencials, proxies ni mètodes per evitar restriccions.
No publica dades ni modifica el web. La captura queda a l'ordinador.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

URL = "https://www.fcf.cat/ca/competicio/2026-2027/tercera-catalana/grup-12/resultats"
NEEDLES = ("SANT VICENÇ HORTS", "SANT VICEN", "Pª BARC", "SANT ANDREU DE LA BARCA")
OUTPUT = Path("fcf-amateur-a-prova.png")

with sync_playwright() as p:
    try:
        browser = p.chromium.launch(channel="chrome", headless=False)
    except Exception as exc:
        raise SystemExit("Cal tenir Google Chrome instal·lat. Detall: " + str(exc))
    page = browser.new_page(viewport={"width": 1440, "height": 1000}, device_scale_factor=1)
    try:
        response = page.goto(URL, wait_until="domcontentloaded", timeout=30000)
        print("HTTP:", response.status if response else "sense resposta")
        try:
            page.wait_for_function(
                """() => /SANT VICEN|Pª BARC|SANT ANDREU DE LA BARCA/i.test(document.body.innerText)""",
                timeout=20000,
            )
        except PlaywrightTimeout:
            print("No s'ha detectat el partit després de 20 segons.")
        text = page.locator("body").inner_text(timeout=10000)
        print("Longitud del text:", len(text))
        lines = text.splitlines()
        for i, line in enumerate(lines):
            if any(needle.casefold() in line.casefold() for needle in NEEDLES):
                print("Coincidència:", " | ".join(lines[max(0, i-2):i+3])[:450])
        page.screenshot(path=str(OUTPUT), full_page=True)
        print("Captura desada:", OUTPUT.resolve())
        print("Partit detectat:", any(n.casefold() in text.casefold() for n in NEEDLES))
    finally:
        browser.close()
