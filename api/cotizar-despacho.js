export default async function handler(req, res) {
  try {

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

    const data = await response.json();

    res.status(200).json({
      ok: true,
      status: response.status,
      data
    });

  } catch (error) {

    res.status(500).json({
      ok: false,
      error: error.message
    });

  }
}
};
