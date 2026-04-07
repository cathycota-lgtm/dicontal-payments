module.exports = async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).json({});
  }

  try {

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { items, nombre, email, telefono, comuna, direccion } = body;

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

    // 🔹 Enviar email (NO rompe el flujo si falla)
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
            <hr>
            <p><strong>Detalle:</strong> ${items[0]?.title}</p>
            <p><strong>Total:</strong> $${items[0]?.unit_price}</p>
          `
        })
      });

      const emailData = await emailRes.text();
      console.log("📩 respuesta resend:", emailData);

    } catch (err) {
      console.error("❌ error enviando email:", err);
    }

    // 🔹 Responder al frontend (SIEMPRE AL FINAL)
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
