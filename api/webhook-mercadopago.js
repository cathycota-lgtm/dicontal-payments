module.exports = async function handler(req, res) {

  // Permitir requests
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    console.log("🔔 Webhook recibido");

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    console.log("📦 Body:", body);

    return res.status(200).json({ received: true });

  } catch (error) {
    console.error("❌ Error webhook:", error);
    return res.status(500).json({ error: "Error en webhook" });
  }

};
