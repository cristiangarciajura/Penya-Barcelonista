# PBSV · preparació Web Push

Aquesta fase **no activa enviaments** ni modifica el Worker OAuth actual.

## Components preparats
- `push-schema.sql`: taules D1 per a subscripcions i avisos.
- `push-worker.js`: API de registre i baixa de subscripcions; no inclou enviament.
- `pbsv-sw.js`: recepció d'esdeveniments push i obertura de l'apartat de l'app.
- `editor-notificacions.html`: esborranys locals, sense enviar.

## Per desplegar més endavant
1. Crear una base D1 privada i executar `push-schema.sql`.
2. Crear un Worker separat i vincular la D1 com a `PUSH_DB`.
3. Generar claus VAPID al servidor; guardar la privada només en secrets i exposar només la pública amb `PUSH_VAPID_PUBLIC_KEY`.
4. Abans d'activar altes públiques: afegir límit de peticions, comprovació de subscripció real, control d'abusos i política de retenció/privacitat.
5. Implementar l'enviament Web Push signat amb VAPID, la cua de programació, reintents, eliminació d'endpoints caducats i un endpoint administratiu autenticat. No fer servir CORS com a autenticació.
6. Connectar el navegador amb l'API només després de desplegar i verificar el servei.
7. Provar Android Chrome i iOS Safari PWA instal·lada (iOS 16.4+) amb l'app tancada abans d'activar els botons d'enviament.

**Advertiment:** el Worker inclòs és un punt de partida per a desenvolupament, no està preparat per exposar-se públicament. El desplegament de producció ha de quedar bloquejat fins que s'afegeixin les proteccions de l'apartat 4.
