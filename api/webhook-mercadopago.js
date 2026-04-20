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

          // 👉 AQUÍ después:
          // enviar email correcto
          // marcar pedido como pagado
        }

      }
    }

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error("❌ Error webhook:", error);
    return res.status(200).json({ error: "handled" });
  }

};
