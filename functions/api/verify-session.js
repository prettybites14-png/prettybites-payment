function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function getStripeSecret(env) {
  const raw = String(env?.STRIPE_SECRET_KEY || '').trim();
  if (!raw) throw new Error('Missing STRIPE_SECRET_KEY in Cloudflare Pages environment variables.');
  if (raw.startsWith('pk_')) throw new Error('STRIPE_SECRET_KEY is wrong. Use the secret key that starts with sk_.');
  if (!raw.startsWith('sk_')) throw new Error('STRIPE_SECRET_KEY must start with sk_.');
  return raw;
}

async function stripeGet(path, secret) {
  const res = await fetch(`https://api.stripe.com${path}`, {
    headers: { 'Authorization': `Bearer ${secret}` }
  });
  const raw = await res.text();
  let data;
  try { data = JSON.parse(raw); } catch { data = { error: { message: raw || 'Stripe returned an invalid response.' } }; }
  if (!res.ok) throw new Error(data?.error?.message || 'Stripe request failed.');
  return data;
}

export async function onRequestGet(context) {
  try {
    const secret = getStripeSecret(context.env);
    const url = new URL(context.request.url);
    const sessionId = url.searchParams.get('session_id');
    if (!sessionId) return json({ error: 'Missing session_id' }, 400);

    const session = await stripeGet(`/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, secret);
    let lineItems = [];
    try {
      const li = await stripeGet(`/v1/checkout/sessions/${encodeURIComponent(sessionId)}/line_items`, secret);
      lineItems = Array.isArray(li?.data) ? li.data.map(item => ({
        description: item.description,
        quantity: item.quantity,
        amount_total: item.amount_total
      })) : [];
    } catch (_) {}

    return json({
      paid: session.payment_status === 'paid',
      session: {
        id: session.id,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
        customer_details: session.customer_details,
        metadata: session.metadata || {},
        line_items: lineItems
      }
    });
  } catch (error) {
    return json({ error: error.message || 'Verification failed' }, 500);
  }
}

export async function onRequest(context) {
  if (context.request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
  return onRequestGet(context);
}
