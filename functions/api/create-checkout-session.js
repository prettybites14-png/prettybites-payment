import { json, baseUrl, stripeFormPost, metadataFromPayload, moneyToCents, shortText } from './_common';

export async function onRequestPost(context) {
  try {
    const payload = await context.request.json().catch(() => null);
    if (!payload) return json({ error: 'Invalid JSON payload.' }, 400);

    const origin = baseUrl(context);
    const metadata = metadataFromPayload(payload);
    const successUrl = `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/cancel.html`;

    const totalCents = moneyToCents(payload.total || 0);
    if (!totalCents) return json({ error: 'Total amount is missing.' }, 400);

    const orderTitle = String(payload.mode || 'cart') === 'weekly'
      ? shortText(payload.planTitle || 'Weekly Meal Plan', 80)
      : shortText(payload.orderTitle || 'Pretty Bites Order', 80);

    const form = {
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      'payment_method_types[0]': 'card',
      'metadata[order_mode]': metadata.order_mode,
      'metadata[customer_name]': metadata.customer_name,
      'metadata[customer_phone]': metadata.customer_phone,
      'metadata[delivery_type]': metadata.delivery_type,
      'metadata[address]': metadata.address,
      'metadata[day]': metadata.day,
      'metadata[time]': metadata.time,
      'metadata[notes]': metadata.notes,
      'metadata[delivery_fee]': metadata.delivery_fee,
      'metadata[total]': metadata.total,
      'metadata[tax_rate]': metadata.tax_rate,
      'metadata[tax_amount]': metadata.tax_amount,
      'metadata[items_json]': metadata.items_json,
      'metadata[package_price]': metadata.package_price,
      'metadata[delivery_days]': metadata.delivery_days,
      'metadata[plan_title]': metadata.plan_title,
      'metadata[expected_total_cents]': String(totalCents),
      'line_items[0][price_data][currency]': 'cad',
      'line_items[0][price_data][product_data][name]': orderTitle,
      'line_items[0][price_data][unit_amount]': String(totalCents),
      'line_items[0][quantity]': '1',
      'submit_type': 'pay',
    };

    const data = await stripeFormPost(context, '/v1/checkout/sessions', form);
    return json({ id: data.id, url: data.url });
  } catch (err) {
    return json({ error: err.message || 'Could not create checkout session.' }, 500);
  }
}
