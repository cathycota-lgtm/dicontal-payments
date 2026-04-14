async function crearEnvioShipit(dataCliente) {
  const response = await fetch('https://api.shipit.cl/v2/shipments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SHIPIT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      reference: `pedido-${Date.now()}`,
      items: [{ size: "S", weight: 1 }],
      destiny: {
        name: dataCliente.nombre,
        email: dataCliente.email,
        phone: dataCliente.telefono,
        street: dataCliente.direccion,
        number: dataCliente.numero || "0",
        commune: dataCliente.comuna
      },
      origin: {
        name: "Dicontal",
        email: "TU_EMAIL",
        phone: "TU_TELEFONO",
        street: "Chiloé",
        number: "1268",
        commune: "Santiago"
      }
    })
  });

 const text = await response.text();

console.log("🚚 STATUS:", response.status);
console.log("🚚 RAW:", text);

let result;

try {
  result = JSON.parse(text);
} catch (e) {
  console.log("⚠️ No es JSON válido");
  result = text;
}

return result;
}

module.exports = async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).json({});
  }

  try {

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const {
      items,
      nombre,
      email,
      telefono,
      comuna,
      direccion,
      tipo_documento,
      tipo_entrega, // 👈 agregado
      razon_social,
      rut,
      giro,
      direccion_empresa
    } = body;
    await crearEnvioShipit({
  nombre,
  email,
  telefono,
  direccion,
  numero: "0",
  comuna
});
      // 🔹 Crear pago en Mercado Pago
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.MP_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        items: items
      })
    });

    const data = await response.json();

    // 🔹 Armar detalle (soporta múltiples productos)
    const detalle = items?.map(i => `${i.title} x ${i.quantity}`).join("<br>") || "Sin detalle";

    // 🔹 Enviar email
    console.log("📩 intentando enviar email...");

    try {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "onboarding@resend.dev",
          to: "cathycota@gmail.com",
          subject: "Nuevo pedido web",
          html: `
            <h2>Nuevo pedido</h2>

            <p><strong>Nombre:</strong> ${nombre}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Teléfono:</strong> ${telefono}</p>
            <p><strong>Comuna:</strong> ${comuna}</p>
            <p><strong>Dirección:</strong> ${direccion}</p>

            <p><strong>Entrega:</strong> ${tipo_entrega || "No especificado"}</p>

            <hr>

            <p><strong>Tipo documento:</strong> ${tipo_documento || "boleta"}</p>

            ${tipo_documento === "factura" ? `
              <h3>Datos de facturación</h3>
              <p><strong>Razón social:</strong> ${razon_social}</p>
              <p><strong>RUT:</strong> ${rut}</p>
              <p><strong>Giro:</strong> ${giro}</p>
              <p><strong>Dirección empresa:</strong> ${direccion_empresa}</p>
            ` : ""}

            <hr>

            <p><strong>Detalle:</strong><br>${detalle}</p>
            <p><strong>Total:</strong> $${items[0]?.unit_price}</p>
          `
        })
      });

      const emailData = await emailRes.text();

      if (!emailRes.ok) {
        console.error("❌ Resend error:", emailData);
      }

      console.log("📩 respuesta resend:", emailData);

    } catch (err) {
      console.error("❌ error enviando email:", err);
    }

    // 🔹 Respuesta final
    res.status(200).json({
      init_point: data.init_point
    });

  } catch (error) {

    console.error("❌ ERROR REAL:", error);

res.status(500).json({
  error: error.message || "Error creando pago"
});
  }

}
