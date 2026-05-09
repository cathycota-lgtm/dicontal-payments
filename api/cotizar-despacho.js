export default async function handler(req, res) {

  try {

    const response = await fetch("https://api.shipit.cl/v/communes", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/vnd.shipit.v4",
        "X-Shipit-Email": process.env.SHIPIT_EMAIL,
        "X-Shipit-Access-Token": process.env.SHIPIT_TOKEN
      }
    });

    const data = await response.json();

    const simplified = data.map(commune => ({
  id: commune.id,
  name: commune.name,
  region: commune.region_name
}));

return res.status(200).json(simplified);

  } catch (error) {

    return res.status(500).json({
      ok: false,
      error: error.message
    });

  }

}
