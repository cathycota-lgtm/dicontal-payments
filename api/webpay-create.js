const { WebpayPlus, Options, Environment, IntegrationCommerceCodes, IntegrationApiKeys } = require('transbank-sdk');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { amount, buyOrder, sessionId } = req.body;

    // Entorno de Integración (Pruebas)
    const tx = new WebpayPlus.Transaction(
      new Options(IntegrationCommerceCodes.WEBPAY_PLUS, IntegrationApiKeys.WEBPAY, Environment.Integration)
    );

    // Obtiene la URL dinámica de Vercel para la respuesta de Transbank
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
    res.status(500).json({ error: error.message });
  }
};
