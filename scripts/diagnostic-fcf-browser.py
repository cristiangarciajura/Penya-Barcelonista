"""Prova de lectura de la pàgina de resultats renderitzada amb navegador real."""
import asyncio
from playwright.async_api import async_playwright

URL = "https://www.fcf.cat/ca/competicio/2026-2027/tercera-catalana/grup-12/resultats"
TERMS = ("Pª BARC", "SANT VICENÇ HORTS", "SANT ANDREU DE LA BARCA")

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(locale="ca-ES", viewport={"width": 1280, "height": 900})
        response = await page.goto(URL, wait_until="domcontentloaded", timeout=45000)
        print("HTTP pàgina:", response.status if response else "sense resposta")
        try:
            await page.wait_for_function(
                "() => document.body && /SANT VICEN|SANT VICENÇ|Pª BARC/i.test(document.body.innerText)",
                timeout=18000,
            )
        except Exception:
            print("El nom del club no ha aparegut abans del temps límit.")
        text = await page.locator("body").inner_text(timeout=15000)
        print("Text renderitzat:", len(text), "caràcters")
        for term in TERMS:
            print("Coincidència", repr(term), term.casefold() in text.casefold())
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        for i, line in enumerate(lines):
            if any(term.casefold() in line.casefold() for term in TERMS):
                print("Context de partit:", " | ".join(lines[max(0, i-5):i+6])[:700])
        await browser.close()

asyncio.run(main())
