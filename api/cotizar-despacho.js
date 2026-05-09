export default async function handler(req, res) {

  try {

    console.log("Iniciando test Shipit");

    const response = await fetch("https://api.shipit.cl/v/quotes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.SHIPIT_TOKEN}`
      },
      body: JSON.stringify({
        origin_id: 1,
        destiny_id: 308,
        package: {
          length: 20,
          width: 20,
          height: 10,
          weight: 1
        }
      })
    });

    console.log("Status:", response.status);

    const text = await response.text();

    console.log("Respuesta:", text);

    return res.status(200).json({
      ok: true,
      status: response.status,
      response: text
    });

  } catch (error) {

    console.error("ERROR REAL:", error);

    return res.status(500).json({
      ok: false,
      error: String(error),
      message: error.message,
      stack: error.stack
    });

  }

}
