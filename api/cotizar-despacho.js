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
        shipment: {
          kind: 0,
          platform: 2,
          reference: "TEST-DICONTAL",
          items: 1,
          sizes: {
            width: 10,
            height: 10,
            length: 10,
            weight: 1
          },
          courier: {
            client: "chilexpress"
          },
          destiny: {
            street: "Providencia",
            number: "100",
            complement: "",
            commune_id: 308,
            commune_name: "LAS CONDES",
            full_name: "Cathy",
            email: "cathycota@gmail.com",
            phone: "999999999",
            kind: "home_delivery"
          },
          insurance: {
            ticket_amount: 0,
            ticket_number: "",
            price: 0,
            detail: null,
            extra: false
          }
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
