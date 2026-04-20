module.exports = async function handler(req, res) {

  try {
    console.log("🔔 Webhook recibido");
    console.log("📩 Method:", req.method);

    let body = req.body;

    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.log("⚠️ No se pudo parsear body");
      }
    }

    console.log("📦 Body:", body);

    // 🟡 SOLO si es merchant_order
    if (body?.topic === "merchant_order" && body?.resource) {

      console.log("🔎 Consultando merchant_order...");

      const response = await fetch(body.resource, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${process.env.MP_ACCESS_TOKEN}`
        }
      });

      const data = await response.json();

      console.log("📦 Merchant Order:", JSON.stringify(data, null, 2));

      // 🔍 Buscar pagos dentro
      const payments = data.payments || [];

      if (payments.length === 0) {
        console.log("⚠️ No hay pagos aún");
      }

      for (const payment of payments) {

        console.log("💰 Payment:", payment.id);
        console.log("📊 Status:", payment.status);

       if (payment.status === "approved") {

  console.log("✅ PAGO APROBADO");

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
        subject: "✅ Pago confirmado - Nuevo pedido",
        html: `
          <h2>Pago confirmado</h2>

          <p><strong>ID de pago:</strong> ${payment.id}</p>
          <p><strong>Monto:</strong> $${payment.transaction_amount}</p>

          <hr>

          <p>Este pedido ya fue pagado correctamente en Mercado Pago.</p>
        `
      })
    });

    const emailData = await emailRes.text();

    if (!emailRes.ok) {
      console.error("❌ Resend error:", emailData);
    } else {
      console.log("📩 Email enviado correctamente");
    }

  } catch (err) {
    console.error("❌ error enviando email:", err);
  }

}
        }

      }
    }

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error("❌ Error webhook:", error);
    return res.status(200).json({ error: "handled" });
  }

};
