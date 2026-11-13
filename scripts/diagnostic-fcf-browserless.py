"""Diagnòstic de càrrega de dades FCF en navegador gestionat (sense evasió)."""
import json
import os
import pathlib
import sys
import urllib.error
import urllib.request
from urllib.parse import urlencode

token = os.environ.get("BROWSERLESS_TOKEN", "").strip()
if not token:
    sys.exit("Falta BROWSERLESS_TOKEN")
endpoint = "https://production-sfo.browserless.io/function?" + urlencode({"token": token})
browser_code = r"""
export default async ({ page }) => {
  const target = 'https://www.fcf.cat/ca/competicio/2026-2027/tercera-catalana/grup-12/resultats';
  const events = [];
  const record = (type, url, status) => {
    if (!url.includes('fcf.cat')) return;
    if (/api\/|partidos|competicio|resultats/i.test(url)) {
      events.push({type, path: url.replace(/^https?:\/\/[^/]+/, '').split('?')[0], status});
    }
  };
  page.on('response', r => record('response', r.url(), r.status()));
  page.on('requestfailed', r => record('failed', r.url(), r.failure()?.errorText || 'failed'));
  let navigation = '';
  try {
    const response = await page.goto(target, {waitUntil: 'domcontentloaded', timeout: 30000});
    navigation = String(response?.status() || 'no-response');
  } catch (e) { navigation = String(e).slice(0, 180); }
  await new Promise(r => setTimeout(r, 7000));
  const before = await page.evaluate(() => ({
    title: document.title,
    text: document.body?.innerText?.slice(0, 1400) || '',
    iframes: Array.from(document.querySelectorAll('iframe')).map(x => x.title || x.src.split('?')[0]).slice(0, 8)
  }));
  // No s'accepten consentiments automàticament; només es detecten.
  const consent = /Do Not Process My Personal Information|privacy|privacitat/i.test(before.text);
  await new Promise(r => setTimeout(r, 8000));
  const after = await page.evaluate(() => ({
    text: document.body?.innerText?.slice(0, 1600) || '',
    teamVisible: /SANT ANDREU DE LA BARCA|Pª BARC\. SANT VICENÇ/i.test(document.body?.innerText || ''),
    noResults: /Sense resultats disponibles/i.test(document.body?.innerText || '')
  }));
  return {data: {navigation, consentVisible: consent, before, after, events: events.slice(-45)}, type: 'application/json'};
};
"""
payload = json.dumps({"code": browser_code}).encode("utf-8")
request = urllib.request.Request(endpoint, data=payload, method="POST", headers={"Content-Type": "application/json"})
try:
    with urllib.request.urlopen(request, timeout=85) as response:
        raw = response.read(150000)
        result = json.loads(raw)
        pathlib.Path("captures-fcf").mkdir(exist_ok=True)
        pathlib.Path("captures-fcf/diagnostic.json").write_text(json.dumps(result, ensure_ascii=False, indent=2))
        print("Diagnòstic guardat a captures-fcf/diagnostic.json")
        print("Resposta del servei:", response.status)
        print("Resum:", json.dumps(result, ensure_ascii=False)[:4000])
except urllib.error.HTTPError as error:
    print("Browserless HTTP:", error.code)
    print("Detall:", error.read(600).decode("utf-8", "replace").replace(token, "[SECRET]"))
    sys.exit(1)
except Exception as error:
    print("Error:", str(error).replace(token, "[SECRET]"))
    sys.exit(1)
