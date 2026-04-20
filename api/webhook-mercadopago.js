module.exports = async function handler(req, res) {

  try {
    console.log("🔔 Webhook recibido");
    console.log("📩 Method:", req.method);

    let body = req.body;

    // intentar parsear si viene como string
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.log("⚠️ No se pudo parsear body");
      }
    }

    console.log("📦 Body:", body);

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error("❌ Error webhook:", error);

    // 👇 IMPORTANTE: igual devolver 200 para que MP no falle
    return res.status(200).json({ error: "handled" });
  }

};
