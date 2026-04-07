import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
module.exports = async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
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
    await resend.emails.send({
  from: "onboarding@resend.dev",
  to: "ccorrea@dicontal.cl",
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
});

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
