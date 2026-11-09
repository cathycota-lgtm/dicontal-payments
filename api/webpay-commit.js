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


function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

async function sendCustomerConfirmation(token, response) {
  const redis = getRedis();
  if (!redis) throw new Error('Almacenamiento de pedidos no configurado');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const key = `customer-order:${tokenHash}`;
  const order = await redis.get(key);
  if (!order) throw new Error('No se encontró el pedido para confirmación');
  if (order.emailSent) return;
  if (order.buyOrder !== response.buy_order || Number(order.amount) !== Number(response.amount)) {
    throw new Error('El pedido guardado no coincide con el pago aprobado');
  }
  const amount = '$' + Number(response.amount).toLocaleString('es-CL') + ' CLP';
  const delivery = order.tipo_entrega === 'despacho'
    ? 'Despacho a: ' + order.direccion + '. Te contactaremos para coordinar la entrega.'
    : 'Retiro en Chiloé 1268, Santiago. Te avisaremos cuando tu pedido esté listo para retirar.';
  const text = [
    'Hola ' + order.nombre + ',',
    'Confirmamos que recibimos tu pago en Dicontal.',
    'Número de pedido: ' + response.buy_order,
    'Productos: ' + order.detalle,
    'Total pagado: ' + amount,
    delivery,
    'Si tienes alguna consulta, responde a este correo o escríbenos al +56 9 8232 4044.',
    'Gracias por tu compra.',
    'Dicontal'
  ].join('\n\n');
  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(8000),
    headers: {
      Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
      'Content-Type': 'application/json',
      'Idempotency-Key': 'customer-confirmation/' + tokenHash
    },
    body: JSON.stringify({
      from: 'Dicontal <compras@notificaciones.dicontal.cl>',
      to: [order.email],
      reply_to: 'ventas@dicontal.cl',
      subject: 'Confirmación de compra Dicontal — Pedido ' + response.buy_order,
      text,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;color:#222;line-height:1.6">
        <h1 style="font-size:24px">Gracias por tu compra</h1>
        <p>Hola ${escapeHtml(order.nombre)}, confirmamos que recibimos tu pago en Dicontal.</p>
        <p><strong>Número de pedido:</strong> ${escapeHtml(response.buy_order)}</p>
        <p><strong>Productos:</strong> ${escapeHtml(order.detalle)}</p>
        <p><strong>Total pagado:</strong> ${escapeHtml(amount)}</p>
        <p>${escapeHtml(delivery)}</p>
        <p>Si tienes alguna consulta, responde a este correo o escríbenos al +56 9 8232 4044.</p>
        <p>Dicontal · Chiloé 1268, Santiago</p>
      </div>`
    })
  });
  if (!emailResponse.ok) throw new Error('Resend rechazó la confirmación: HTTP ' + emailResponse.status);
  const sent = await emailResponse.json();
  if (!sent.id) throw new Error('Resend no devolvió identificador del correo');
  await redis.set(key, { ...order, emailSent: true, emailId: sent.id }, { ex: 604800 });
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
        const { error } = await resend.emails.send({
          from: 'Dicontal <compras@notificaciones.dicontal.cl>',
          to: 'ccorrea@dicontal.cl',
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
        if (error) throw new Error(error.message);
      } catch (eError) {
        console.error("Error enviando Correo #2:", eError);
      }

      // Un error de correo no cambia el resultado del pago.
      try {
        await sendCustomerConfirmation(token, response);
      } catch (customerError) {
        console.error('Confirmación al comprador pendiente:', customerError.message);
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
