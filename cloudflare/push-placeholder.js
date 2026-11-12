// PBSV: despliegue inicial seguro. No se habilitan endpoints push hasta completar autenticacion y protecciones.
export default {
  async fetch() {
    return new Response(JSON.stringify({service:"pbsv-push",status:"setup_pending"}), {
      status:503,
      headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}
    });
  }
};
