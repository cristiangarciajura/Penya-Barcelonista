# Publicació automàtica PBSV (GitHub + Cloudflare)

El lloc públic continua a GitHub Pages. El Worker ofereix un **accés d'administració separat** i autenticat. No hi ha tokens al codi públic ni a localStorage.

## Configuració inicial (una sola vegada)

1. Entra a Cloudflare i crea un Worker anomenat `pbsv-admin`. Puja el contingut de `cloudflare/worker.js` com a codi del Worker (o desplega aquesta carpeta amb Wrangler). La seva URL serà de la forma `https://pbsv-admin.<subdomini>.workers.dev`.
2. A GitHub, ves a **Settings → Developer settings → OAuth Apps → New OAuth App**. Nom: `PBSV Administració`. Homepage URL: l'URL exacta del Worker. Authorization callback URL: `https://pbsv-admin.<subdomini>.workers.dev/auth/callback`. Activa l'aplicació i copia el **Client ID**. La petició OAuth demana només `public_repo`.
3. A Cloudflare, a **Settings → Variables and Secrets**, afegeix:
   - `GITHUB_CLIENT_ID` (text): el Client ID anterior.
   - `GITHUB_CLIENT_SECRET` (secret): el Client Secret generat per GitHub.
   - `SESSION_KEY` (secret): cadena aleatòria de 32 bytes o més (per exemple, generada per un gestor de contrasenyes). No la publiquis a GitHub.
4. Desplega el Worker i visita la seva URL. Prem **Entrar amb GitHub**, autoritza l'OAuth App amb el compte `cristiangarciajura` i obre **Administració**.
5. A qualsevol editor, desa els canvis i prem **Guardar i publicar automàticament**. Es crea un commit directament a `main` i GitHub Pages es desplega com fins ara.

## Notes importants

- **No** entris al panell per la URL pública de GitHub Pages quan vulguis publicar automàticament: entra per la URL del Worker. A GitHub Pages el botó manual continua disponible.
- Les dades es desen al navegador de l'origen actual: els esborranys creats abans a GitHub Pages no es traslladen automàticament al domini del Worker. Per començar, carrega les dades publicades des del nou panell. Exporta els esborranys antics abans de canviar si tens canvis pendents.
- La sessió dura fins a 8 hores i utilitza una cookie HttpOnly xifrada. Tanca la sessió a `/auth/logout`. No comparteix credencials amb la web pública.
- Només es poden modificar quatre fitxers JSON: `data/equips.json`, `data/club.json`, `data/noticies.json` i `data/patrocinadors.json`. El Worker comprova el compte GitHub abans de publicar.
- El compte GitHub autoritzat és `cristiangarciajura`; per canviar-lo cal modificar el valor `OWNER` del Worker i revisar els permisos.
- El codi del Worker s'ha preparat al repositori, però **no està desplegat ni configurat** fins que completis aquests passos. No comparteixis els secrets en aquest xat.
