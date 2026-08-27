const { WebpayPlus, Options, Environment, IntegrationCommerceCodes, IntegrationApiKeys } = require('transbank-sdk');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { amount, buyOrder, sessionId, cliente } = req.body;

    // CORREO #1: FORMULARIO DE COMPRA
    if (cliente) {
      try {
        await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: 'cathycota@gmail.com',
          subject: `[Intento de Pago] Webpay - Orden #${buyOrder}`,
          html: `
            <h3>Nuevo Formulario de Compra - DICONTAL</h3>
            <p><strong>Cliente:</strong> ${cliente.nombre}</p>
            <p><strong>Email:</strong> ${cliente.email}</p>
            <p><strong>Teléfono:</strong> ${cliente.telefono}</p>
            <p><strong>Entrega:</strong> ${cliente.tipo_entrega}</p>
            <p><strong>Comuna / Dirección:</strong> ${cliente.comuna} / ${cliente.direccion}</p>
            <p><strong>Documento:</strong> ${cliente.tipo_documento.toUpperCase()}</p>
            ${cliente.tipo_documento === 'factura' ? `
              <p><strong>RUT Empresa:</strong> ${cliente.rut}</p>
              <p><strong>Razón Social:</strong> ${cliente.razon_social}</p>
              <p><strong>Giro:</strong> ${cliente.giro}</p>
              <p><strong>Dirección Empresa:</strong> ${cliente.direccion_empresa}</p>
            ` : ''}
            <p><strong>Detalle:</strong> ${cliente.detalle}</p>
            <p><strong>Monto Total:</strong> $${amount} CLP</p>
          `
        });
      } catch (eError) {
        console.error("Error enviando Correo #1:", eError);
      }
    }

    const commerceCode = process.env.WEBPAY_COMMERCE_CODE || IntegrationCommerceCodes.WEBPAY_PLUS;
    const apiKey = process.env.WEBPAY_API_KEY || IntegrationApiKeys.WEBPAY;
    const environment = process.env.WEBPAY_ENVIRONMENT === 'production' 
      ? Environment.Production 
      : Environment.Integration;

    const tx = new WebpayPlus.Transaction(new Options(commerceCode, apiKey, environment));

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
    console.error("Error en webpay-create:", error);
    res.status(500).json({ error: error.message });
  }
};
