const { WebpayPlus, Options, Environment, IntegrationCommerceCodes, IntegrationApiKeys } = require('transbank-sdk');

module.exports = async (req, res) => {
  try {
    // Captura el token sin importar si Transbank lo envía por POST (body) o GET (query)
    let token = null;
    
    if (req.body && req.body.token_ws) {
      token = req.body.token_ws;
    } else if (req.query && req.query.token_ws) {
      token = req.query.token_ws;
    }

    // Si el usuario canceló la compra en Transbank o no existe el token
    if (!token) {
      return res.redirect('https://www.dicontal.cl/pago-cancelado');
    }

    // Carga dinámica según las variables de entorno de Vercel
    const commerceCode = process.env.WEBPAY_COMMERCE_CODE || IntegrationCommerceCodes.WEBPAY_PLUS;
    const apiKey = process.env.WEBPAY_API_KEY || IntegrationApiKeys.WEBPAY;
    const environment = process.env.WEBPAY_ENVIRONMENT === 'production' 
      ? Environment.Production 
      : Environment.Integration;

    // Inicializar Transbank SDK con credenciales de producción/integración
    const tx = new WebpayPlus.Transaction(
      new Options(commerceCode, apiKey, environment)
    );

    // Confirmar la transacción con el token
    const response = await tx.commit(token);

    // Validar el estado de la transacción
    if (response && response.status === 'AUTHORIZED') {
      return res.redirect(`https://www.dicontal.cl/pago-exitoso?buy_order=${response.buy_order}&amount=${response.amount}`);
    } else {
      return res.redirect('https://www.dicontal.cl/pago-fallido');
    }

  } catch (error) {
    console.error("Error en webpay-commit:", error);
    // En lugar de arrojar un error 500, redirige limpiamente a la página de pago fallido
    return res.redirect('https://www.dicontal.cl/pago-fallido');
  }
};
