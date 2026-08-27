const { WebpayPlus, Options, Environment, IntegrationCommerceCodes, IntegrationApiKeys } = require('transbank-sdk');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async (req, res) => {
  try {
    let token = req.body?.token_ws || req.query?.token_ws;

    if (!token) {
      return res.redirect('https://www.dicontal.cl/pago-cancelado');
    }

    const commerceCode = process.env.WEBPAY_COMMERCE_CODE || IntegrationCommerceCodes.WEBPAY_PLUS;
    const apiKey = process.env.WEBPAY_API_KEY || IntegrationApiKeys.WEBPAY;
    const environment = process.env.WEBPAY_ENVIRONMENT === 'production' 
      ? Environment.Production 
      : Environment.Integration;

    const tx = new WebpayPlus.Transaction(new Options(commerceCode, apiKey, environment));
    const response = await tx.commit(token);

    if (response && response.status === 'AUTHORIZED') {
      
      // CORREO #2: PAGO CONFIRMADO
      try {
        await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: 'cathycota@gmail.com',
          subject: `[PAGO CONFIRMADO] Webpay - Orden #${response.buy_order}`,
          html: `
            <h2>¡Pago Aprobado en DICONTAL!</h2>
            <p><strong>Orden de Compra:</strong> ${response.buy_order}</p>
            <p><strong>Monto Pagado:</strong> $${response.amount} CLP</p>
            <p><strong>Código Autorización:</strong> ${response.authorization_code}</p>
            <p><strong>Tarjeta:</strong> **** ${response.card_detail?.card_number || 'N/A'}</p>
            <p><strong>Fecha/Hora:</strong> ${new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })}</p>
          `
        });
      } catch (eError) {
        console.error("Error enviando Correo #2:", eError);
      }

      return res.redirect(`https://www.dicontal.cl/pago-exitoso?buy_order=${response.buy_order}&amount=${response.amount}`);
    } else {
      return res.redirect('https://www.dicontal.cl/pago-fallido');
    }

  } catch (error) {
    console.error("Error en webpay-commit:", error);
    return res.redirect('https://www.dicontal.cl/pago-fallido');
  }
};
