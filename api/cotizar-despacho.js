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
        package: {
          length: 20,
          width: 20,
          height: 10,
          weight: 1,
          destiny: {
            commune_id: 308
          }
        }
      })
    });

  const data = await response.json();

return res.status(200).json({
  ok: true,
  status: response.status,
  data
});

    return res.status(200).json({
      ok: true,
      status: response.status,
      response: text
    });

  } catch (error) {

    return res.status(500).json({
      ok: false,
      error: error.message
    });

  }

}
