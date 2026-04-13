export default async function handler(req, res) {
  // 1. Configurar CORS para que Webflow pueda preguntar
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  // 2. Obtener el ID que viene de Webflow
  const { comuna_id } = req.query;

  if (!comuna_id) {
    return res.status(400).json({ error: "Falta el ID de comuna" });
  }

  try {
    // 3. Consultar a la API de Shipit
    const response = await fetch(`https://api.shipit.cl/v/communes/${comuna_id}/shipping_rates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shipit-Email": process.env.SHIPIT_EMAIL,
        "X-Shipit-AccessToken": process.env.SHIPIT_TOKEN
      },
      // Paquete estándar para cotizar (1kg, 10x10x10cm)
      body: JSON.stringify({
        parcel: {
          weight: 1.0,
          length: 10,
          width: 10,
          height: 10
        }
      })
    });

    const data = await response.json();

    // Validar si Shipit devolvió tarifas
    if (!Array.isArray(data) || data.length === 0) {
        return res.status(200).json({ precio: 0, error: "No hay tarifas disponibles" });
    }

    // 4. Buscar el precio más bajo entre todos los couriers (Starken, Chilepost, etc)
    const precios = data.map(rate => rate.lower_price);
    const precioMasBajo = Math.min(...precios);

    return res.status(200).json({ precio: precioMasBajo });

  } catch (error) {
    console.error("Error en servidor:", error);
    return res.status(500).json({ error: "Error al conectar con Shipit" });
  }
}
