export default async function handler(req, res) {

  const { items } = req.body;

  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.MP_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      items: items,
      back_urls: {
        success: "https://dicontal.cl/pago-exitoso",
        failure: "https://dicontal.cl/pago-error",
        pending: "https://dicontal.cl/pago-pendiente"
      }
    })
  });

  const data = await response.json();

  res.status(200).json({
    link: data.init_point
  });

}
