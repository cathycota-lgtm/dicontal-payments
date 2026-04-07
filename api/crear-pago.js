module.exports = async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
res.setHeader("Access-Control-Allow-Headers", "Content-Type");

// manejar preflight correctamente
if (req.method === "OPTIONS") {
  res.status(200).json({});
  return;
}

  try {

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
   const { items, nombre, email, telefono, comuna, direccion } = body;

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
    try {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "onboarding@resend.dev",
      to: "ccorrea@dicontal.cl",
      subject: "Nuevo pedido web",
      html: `
        <h2>Nuevo pedido</h2>
        <p><strong>Detalle:</strong> ${items[0]?.title}</p>
        <p><strong>Total:</strong> $${items[0]?.unit_price}</p>
      `
    })
  });
} catch (err) {
  console.error("Error enviando email:", err);
}
    res.status(200).json({
  init_point: data.init_point
});

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Error creando pago"
    });

  }

}
