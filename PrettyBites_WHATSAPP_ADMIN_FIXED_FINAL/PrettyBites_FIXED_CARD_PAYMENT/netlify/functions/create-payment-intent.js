const Stripe = require("stripe");

exports.handler = async (event) => {
  if (event.httpMethod && event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const body = JSON.parse(event.body || "{}");
    const mode = body.mode === 'weekly' ? 'weekly' : 'cart';
    const total = Number(body.total || 0);
    if (!(total > 0)) throw new Error('Invalid total amount');

    const metadata = {
      order_mode: mode,
      customer_name: String(body.customerName || '').slice(0, 120),
      customer_phone: String(body.customerPhone || '').slice(0, 60),
      customer_email: String(body.customerEmail || '').slice(0, 120),
      delivery_type: String(body.deliveryType || 'pickup').slice(0, 30),
      address: String(body.address || '').slice(0, 450),
      day: String(body.day || '').slice(0, 40),
      time: String(body.time || body.deliveryTime || '').slice(0, 80),
      notes: String(body.notes || '').slice(0, 450),
      total: String(total),
      delivery_fee: String(Number(body.deliveryFee || 0)),
      items_json: JSON.stringify(body.items || []).slice(0, 450)
    };

    if (mode === 'weekly') {
      metadata.plan_title = String(body.planTitle || 'Weekly Meal Plan').slice(0, 120);
      metadata.package_price = String(Number(body.packagePrice || 0));
      metadata.delivery_days = String(Number(body.deliveryDays || 5));
    }

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100),
      currency: 'cad',
      payment_method_types: ['card'],
      receipt_email: body.customerEmail || undefined,
      metadata,
      description: mode === 'weekly' ? (body.planTitle || 'Weekly Meal Plan') : 'Pretty Bites order'
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientSecret: intent.client_secret, paymentIntentId: intent.id })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message || 'Could not create payment intent' })
    };
  }
};
