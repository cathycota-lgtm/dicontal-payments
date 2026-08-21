const { WebpayPlus, Options, Environment, IntegrationCommerceCodes, IntegrationApiKeys } = require('transbank-sdk');

module.exports = async (req, res) => {
  // Configuración de cabeceras CORS para permitir consultas desde dicontal.cl
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Responder a la verificación previa del navegador (preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { amount, buyOrder, sessionId } = req.body;

    const tx = new WebpayPlus.Transaction(
      new Options(IntegrationCommerceCodes.WEBPAY_PLUS, IntegrationApiKeys.WEBPAY, Environment.Integration)
    );

    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const returnUrl = `${protocol}://${host}/api/webpay-commit`;

    const response = await tx.create(
      buyOrder || 'ORDEN-' + Date.now(),
      sessionId || 'SESION-' + Date.now(),
      amount,
      returnUrl
    );

    res.status(200).json(response);
  } catch (error) {
    console.error("Error al crear transacción Webpay:", error);
    res.status(500).json({ error: error.message });
  }
};
