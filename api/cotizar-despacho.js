// cotizar-despacho.js
// API Vercel que consulta tarifa real a Correos de Chile según comuna destino
// No tocar crear-pagos.js ni webhook-mercadopago.js

module.exports = async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).json({});
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { comunaDestino } = body;

    if (!comunaDestino) {
      return res.status(400).json({ error: "Falta la comuna de destino" });
    }

    // ─── Datos fijos del cuadro (84x66x5 cm, 5 kg físicos) ───
    const PESO_FISICO = 5;
    const ALTO_CM = 5;
    const ANCHO_CM = 66;
    const LARGO_CM = 84;

    // Peso volumétrico según fórmula Correos Chile: (largo x ancho x alto) / 4000
    const pesoVolumetrico = (LARGO_CM * ANCHO_CM * ALTO_CM) / 4000; // 6.93 kg

    // Se cobra el mayor entre físico y volumétrico
    const kilos = Math.max(PESO_FISICO, pesoVolumetrico);

    // Volumen en m³ para la API: (ancho x largo x alto) / 1.000.000
    const volumen = (ANCHO_CM * LARGO_CM * ALTO_CM) / 1000000;

    console.log(`📦 Peso físico: ${PESO_FISICO} kg | Peso volumétrico: ${pesoVolumetrico.toFixed(2)} kg | Se cobra: ${kilos.toFixed(2)} kg`);
    console.log(`📐 Volumen m³: ${volumen.toFixed(5)}`);
    console.log(`📍 Destino: ${comunaDestino}`);

    // ─── Llamada a API Correos de Chile (ambiente certificación) ───
    // Cambiar URL a producción cuando estés listo:
    // https://apib2bv2.correos.cl/tarifas
   const CC_URL = "https://apib2bv2.correos.cl/tarifas";
    const CC_TOKEN = "F3B31EA9-53D2-4F74-8A7B-9DCCF7ED41E3"; // Guardar en variables de entorno Vercel
console.log("🔑 Token disponible:", !!CC_TOKEN);
    const ccResponse = await fetch(CC_URL, {
      method: "POST",
      headers: {
        "Authorization": `token ${CC_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        comunaRemitente: "SANTIAGO",
        comunaDestino: comunaDestino.toUpperCase(),
        tipoPortes: "P",
        bultos: 1,
        kilos: parseFloat(kilos.toFixed(2)),
        volumen: parseFloat(volumen.toFixed(5)),
        importeReembolso: 0,
        valorAsegurado: 0
      })
    });

   if (!ccResponse.ok) {
  const errorText = await ccResponse.text();
  return res.status(500).json({ 
    error: "Error Correos Chile", 
    detalle: errorText,
    token: !!CC_TOKEN,
    status: ccResponse.status
  });
}

    const tarifas = await ccResponse.json();
    console.log("✅ Tarifas recibidas:", tarifas);

    // ─── Selección de tarifa ───
    // La API devuelve un array con distintos servicios (codServicio).
    // Usamos el primer resultado disponible. Si quieres un servicio específico
    // (ej: "24" = Paquete Express Domicilio), filtra por codServicio aquí.
    // Ejemplo: const tarifa = tarifas.find(t => t.codServicio === "24");

    if (!tarifas || tarifas.length === 0) {
      return res.status(400).json({ error: "No se encontraron tarifas para esta comuna" });
    }

    // Toma la tarifa más baja disponible (puedes cambiar la lógica aquí)
    const tarifaSeleccionada = tarifas.reduce((min, t) =>
      parseInt(t.totalTasacion) < parseInt(min.totalTasacion) ? t : min
    );

    const costoDespacho = parseInt(tarifaSeleccionada.totalTasacion);

    console.log(`💰 Tarifa seleccionada: $${costoDespacho} (servicio ${tarifaSeleccionada.codServicio})`);

    return res.status(200).json({
      costoDespacho,
      codServicio: tarifaSeleccionada.codServicio,
      kilosCalculados: parseFloat(kilos.toFixed(2)),
      comunaDestino: comunaDestino.toUpperCase()
    });

  } catch (error) {
    console.error("❌ Error general cotizar-despacho:", error);
    return res.status(500).json({ error: "Error interno al calcular el despacho" });
  }
};
