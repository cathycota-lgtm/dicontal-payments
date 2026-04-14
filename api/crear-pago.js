module.exports = async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).json({});
  }

  try {

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    // console.log("BODY:", body);
console.log("BODY:", body);
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
  
// ✅ VALIDACIONES
if (!items || items.length === 0) {
  return res.status(400).json({ error: "No hay productos en el pedido" });
}

if (!nombre || !email) {
  return res.status(400).json({ error: "Faltan datos del cliente" });
}
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
if (!response.ok) {
  const errorText = await response.text();
  console.error("❌ MP error:", errorText);
  return res.status(500).json({ error: "Error en Mercado Pago" });
}
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
            <p><strong>Total:</strong> $${total}</p>
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

    console.error("❌ error general:", error);

    res.status(500).json({
      error: "Error creando pago"
    });

  }

}
