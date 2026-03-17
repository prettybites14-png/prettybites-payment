
import { json, baseUrl, stripeFormPost, buildCartLineItems, buildWeeklyLineItems, metadataFromPayload, moneyToCents } from './_common.js';

export async function onRequestPost(context) {
  try {
    const payload = await context.request.json().catch(() => null);
    if (!payload) return json({ error: 'Invalid JSON payload.' }, 400);

    const mode = String(payload.mode || 'cart');
    const lineItems = mode === 'weekly' ? buildWeeklyLineItems(payload) : buildCartLineItems(payload);
    if (!lineItems.length) return json({ error: 'Cart is empty.' }, 400);

    const origin = baseUrl(context);
    const metadata = metadataFromPayload(payload);
    const successUrl = `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/cancel.html`;

    const form = {
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      'billing_address_collection': 'required',
      'payment_method_types[0]': 'card',
      'phone_number_collection[enabled]': 'true',
      'customer_creation': 'always',
      'shipping_address_collection[allowed_countries][0]': 'CA',
      'automatic_tax[enabled]': 'true',
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
      'submit_type': 'pay',
    };

    lineItems.forEach((item, idx) => {
      form[`line_items[${idx}][price_data][currency]`] = item.price_data.currency;
      form[`line_items[${idx}][price_data][product_data][name]`] = item.price_data.product_data.name;
      form[`line_items[${idx}][price_data][unit_amount]`] = String(item.price_data.unit_amount);
      form[`line_items[${idx}][quantity]`] = String(item.quantity || 1);
    });

    const expectedTotal = moneyToCents(payload.total || 0);
    if (expectedTotal > 0) {
      form['metadata[expected_total_cents]'] = String(expectedTotal);
    }

    const data = await stripeFormPost(context, '/v1/checkout/sessions', form);
    return json({ id: data.id, url: data.url });
  } catch (err) {
    return json({ error: err.message || 'Could not create checkout session.' }, 500);
  }
}
