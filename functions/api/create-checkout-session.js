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

function getSiteUrl(request, env) {
  const configured = String(env?.SITE_URL || '').trim().replace(/\/$/, '');
  if (configured && /^https?:\/\//i.test(configured)) return configured;
  return new URL(request.url).origin;
}

function addLineItem(params, index, name, unitAmountCents, quantity) {
  params.append(`line_items[${index}][price_data][currency]`, 'cad');
  params.append(`line_items[${index}][price_data][product_data][name]`, String(name || 'Item').slice(0, 120));
  params.append(`line_items[${index}][price_data][unit_amount]`, String(Math.round(unitAmountCents)));
  params.append(`line_items[${index}][quantity]`, String(Math.max(1, Number(quantity || 1))));
}

export async function onRequestPost(context) {
  try {
    const secret = getStripeSecret(context.env);
    const body = await context.request.json().catch(() => ({}));
    const siteUrl = getSiteUrl(context.request, context.env);
    const mode = body.mode === 'weekly' ? 'weekly' : 'cart';

    const metadata = {
      order_mode: mode,
      customer_name: String(body.customerName || ''),
      customer_phone: String(body.customerPhone || ''),
      delivery_type: String(body.deliveryType || 'pickup'),
      address: String(body.address || ''),
      day: String(body.day || ''),
      time: String(body.time || body.deliveryTime || ''),
      notes: String(body.notes || '').slice(0, 450),
      total: String(body.total || 0)
    };

    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('success_url', `${siteUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`);
    params.append('cancel_url', `${siteUrl}/${mode === 'weekly' ? 'weekly-meals.html' : 'cancel.html'}`);
    params.append('billing_address_collection', 'auto');
    params.append('allow_promotion_codes', 'false');

    if (String(body.deliveryType || 'pickup') === 'delivery') {
      params.append('shipping_address_collection[allowed_countries][0]', 'CA');
    }

    let idx = 0;

    if (mode === 'weekly') {
      const title = String(body.planTitle || 'Weekly Meal Plan');
      const packagePrice = Number(body.packagePrice || 0);
      const deliveryFee = Number(body.deliveryFee || 0);
      if (packagePrice <= 0) throw new Error('Weekly package price is missing.');

      addLineItem(params, idx++, title, packagePrice * 100, 1);
      if (deliveryFee > 0) addLineItem(params, idx++, 'Delivery Fee', deliveryFee * 100, 1);

      metadata.plan_title = title;
      metadata.package_price = String(packagePrice || 0);
      metadata.delivery_fee = String(deliveryFee || 0);
      metadata.delivery_days = String(body.deliveryDays || 5);
      metadata.items_json = JSON.stringify(body.items || []).slice(0, 450);
    } else {
      const items = Array.isArray(body.items) ? body.items : [];
      if (!items.length) throw new Error('Cart is empty.');
      for (const item of items) {
        const unitAmount = Math.round(Number(item.price || 0) * 100);
        if (unitAmount <= 0) continue;
        addLineItem(params, idx++, item.name || 'Item', unitAmount, item.qty || 1);
      }
      if (!idx) throw new Error('Cart items are invalid.');
      const deliveryFee = Number(body.deliveryFee || 0);
      if (deliveryFee > 0) addLineItem(params, idx++, 'Delivery Fee', deliveryFee * 100, 1);
      metadata.delivery_fee = String(deliveryFee || 0);
      metadata.items_json = JSON.stringify(items).slice(0, 450);
    }

    Object.entries(metadata).forEach(([key, value]) => {
      params.append(`metadata[${key}]`, String(value || ''));
    });

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secret}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const raw = await stripeRes.text();
    let data;
    try { data = JSON.parse(raw); } catch { data = { error: { message: raw || 'Stripe returned an invalid response.' } }; }

    if (!stripeRes.ok) {
      throw new Error(data?.error?.message || 'Could not create checkout session.');
    }

    return json({ id: data.id, url: data.url });
  } catch (error) {
    return json({ error: error.message || 'Checkout session failed' }, 500);
  }
}

export async function onRequest(context) {
  if (context.request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  return onRequestPost(context);
}
