const { WebpayPlus, Options, Environment, IntegrationCommerceCodes, IntegrationApiKeys } = require('transbank-sdk');
const { Resend } = require('resend');
const { Redis } = require('@upstash/redis');
const crypto = require('crypto');

const resend = new Resend(process.env.RESEND_API_KEY);

function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.STORAGE_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.STORAGE_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex');
}

async function sendMetaPurchase(response) {
  const datasetId = process.env.META_DATASET_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  const graphVersion = process.env.META_GRAPH_API_VERSION;

  if (!datasetId || !accessToken || !graphVersion) {
    console.error('Meta CAPI omitido: faltan variables de configuración.');
    return;
  }

  let matchData = null;
  const redis = getRedis();

  if (redis) {
    try {
      matchData = await redis.get(`meta-order:${response.buy_order}`);
    } catch (redisError) {
      console.error('Error leyendo datos temporales para Meta:', redisError);
    }
  }

  const userData = {};
  if (matchData?.email) userData.em = [sha256(matchData.email)];
  if (matchData?.userAgent) userData.client_user_agent = matchData.userAgent;

  const payload = {
    data: [{
      event_name: 'Purchase',
      event_time: Math.floor(Date.now() / 1000),
      event_id: String(response.buy_order),
      action_source: 'website',
      event_source_url: 'https://www.dicontal.cl/checkout-custom',
      user_data: userData,
      custom_data: {
        currency: 'CLP',
        value: Number(response.amount)
      }
    }]
  };

  const metaResponse = await fetch(
    `https://graph.facebook.com/${graphVersion}/${datasetId}/events?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }
  );

  if (!metaResponse.ok) {
    const errorText = await metaResponse.text();
    throw new Error(`Meta CAPI HTTP ${metaResponse.status}: ${errorText}`);
  }

  if (redis) {
    try {
      await redis.del(`meta-order:${response.buy_order}`);
    } catch (redisError) {
      console.error('Error eliminando datos temporales para Meta:', redisError);
    }
  }
}

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

      // El pago ya está autorizado. Meta no puede cambiar el resultado de Webpay.
      try {
        await sendMetaPurchase(response);
      } catch (metaError) {
        console.error('Error enviando Purchase a Meta:', metaError);
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
