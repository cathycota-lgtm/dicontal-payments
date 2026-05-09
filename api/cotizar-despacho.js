export default async function handler(req, res) {

  try {

    const response = await fetch("https://api.shipit.cl/v/rates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/vnd.shipit.v3",
        "X-Shipit-Email": process.env.SHIPIT_EMAIL,
        "X-Shipit-Access-Token": process.env.SHIPIT_TOKEN
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

    const raw = await response.text();

    return res.status(200).json({
      ok: true,
      status: response.status,
      raw
    });

  } catch (error) {

    return res.status(500).json({
      ok: false,
      error: error.message,
      stack: error.stack
    });

  }

}
