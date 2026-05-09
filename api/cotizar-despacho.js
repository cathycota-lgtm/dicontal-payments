export default async function handler(req, res) {

  try {

    const response = await fetch("https://api.shipit.cl/v/rates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/vnd.shipit.v4",
        "X-Shipit-Email": process.env.SHIPIT_EMAIL,
        "X-Shipit-Access-Token": process.env.SHIPIT_TOKEN
      },
      body: JSON.stringify({
        parcel: {
          length: 10,
          width: 10,
          height: 10,
          weight: 1,
          origin_id: 308,
          destiny_id: 308,
          type_of_destiny: "domicilio",
          algorithm: "1",
          algorithm_days: "2"
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
      error: error.message
    });

  }

}
