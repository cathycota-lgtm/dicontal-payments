const { WebpayPlus, Options, Environment, IntegrationCommerceCodes, IntegrationApiKeys } = require('transbank-sdk');

module.exports = async (req, res) => {
  const token = req.body.token_ws || req.query.token_ws;

  // Si el cliente cancela la compra en Transbank
  if (!token) {
    return res.redirect('https://www.dicontal.cl/pago-cancelado');
  }

  try {
    const tx = new WebpayPlus.Transaction(
      new Options(IntegrationCommerceCodes.WEBPAY_PLUS, IntegrationApiKeys.WEBPAY, Environment.Integration)
    );

    const response = await tx.commit(token);

    if (response.status === 'AUTHORIZED') {
      // Pago Aprobado: Redirige a la página de éxito de Dicontal
      res.redirect(`https://www.dicontal.cl/pago-exitoso?buy_order=${response.buy_order}&amount=${response.amount}`);
    } else {
      // Pago Rechazado
      res.redirect('https://www.dicontal.cl/pago-fallido');
    }
  } catch (error) {
    res.redirect('https://www.dicontal.cl/pago-fallido');
  }
};
