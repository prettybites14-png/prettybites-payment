
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' }
});

function envValue(context, key, fallback = '') {
  return (context && context.env && context.env[key]) || fallback;
}

function baseUrl(context) {
  const configured = envValue(context, 'PUBLIC_SITE_URL');
  if (configured) return configured.replace(/\/$/, '');
  const url = new URL(context.request.url);
  return `${url.protocol}//${url.host}`;
}

function parseNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function moneyToCents(v) {
  return Math.max(0, Math.round(parseNum(v, 0) * 100));
}

function shortText(value, max = 500) {
  return String(value || '').slice(0, max);
}

function stringifyItems(items) {
  try {
    return JSON.stringify(Array.isArray(items) ? items : []).slice(0, 500);
  } catch {
    return '[]';
  }
}

async function stripeFormPost(context, path, body) {
  const secret = envValue(context, 'STRIPE_SECRET_KEY');
  if (!secret) {
    throw new Error('Cloudflare variable STRIPE_SECRET_KEY is missing. Add it in Pages > Settings > Variables and redeploy.');
  }
  const res = await fetch(`https://api.stripe.com${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secret}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data && (data.error?.message || data.message) || `Stripe request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

async function stripeGet(context, path) {
  const secret = envValue(context, 'STRIPE_SECRET_KEY');
  if (!secret) {
    throw new Error('Cloudflare variable STRIPE_SECRET_KEY is missing.');
  }
  const res = await fetch(`https://api.stripe.com${path}`, {
    headers: { 'Authorization': `Bearer ${secret}` }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data && (data.error?.message || data.message) || `Stripe request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

function buildCartLineItems(payload) {
  const items = Array.isArray(payload.items) ? payload.items : [];
  const lineItems = [];
  for (const item of items) {
    const qty = Math.max(1, parseInt(item.qty || item.quantity || 1, 10) || 1);
    const unit = moneyToCents(item.price || item.unitPrice || item.amount || 0);
    if (!unit) continue;
    lineItems.push({
      price_data: {
        currency: 'cad',
        product_data: { name: shortText(item.name || item.label || 'Item', 80) },
        unit_amount: unit,
      },
      quantity: qty,
    });
  }
  return lineItems;
}

function buildWeeklyLineItems(payload) {
  const title = shortText(payload.planTitle || 'Weekly Meal Plan', 80);
  const packagePrice = moneyToCents(payload.packagePrice || 0);
  const deliveryFee = moneyToCents(payload.deliveryFee || 0);
  const lineItems = [];
  if (packagePrice) {
    lineItems.push({
      price_data: {
        currency: 'cad',
        product_data: { name: title },
        unit_amount: packagePrice,
      },
      quantity: 1,
    });
  }
  if (deliveryFee) {
    lineItems.push({
      price_data: {
        currency: 'cad',
        product_data: { name: 'Delivery' },
        unit_amount: deliveryFee,
      },
      quantity: 1,
    });
  }
  return lineItems;
}

function metadataFromPayload(payload) {
  return {
    order_mode: shortText(payload.mode || 'cart', 20),
    customer_name: shortText(payload.customerName, 80),
    customer_phone: shortText(payload.customerPhone, 40),
    delivery_type: shortText(payload.deliveryType || 'pickup', 20),
    address: shortText(payload.address, 200),
    day: shortText(payload.day, 40),
    time: shortText(payload.time || payload.deliveryTime, 40),
    notes: shortText(payload.notes, 300),
    delivery_fee: String(parseNum(payload.deliveryFee, 0)),
    total: String(parseNum(payload.total, 0)),
    tax_rate: String(parseNum(payload.taxRate, 0.13)),
    tax_amount: String(parseNum(payload.taxAmount, 0)),
    items_json: stringifyItems(payload.items),
    package_price: String(parseNum(payload.packagePrice, 0)),
    delivery_days: String(parseNum(payload.deliveryDays, 0)),
    plan_title: shortText(payload.planTitle, 80),
  };
}

export { json, envValue, baseUrl, parseNum, moneyToCents, shortText, stringifyItems, stripeFormPost, stripeGet, buildCartLineItems, buildWeeklyLineItems, metadataFromPayload };
