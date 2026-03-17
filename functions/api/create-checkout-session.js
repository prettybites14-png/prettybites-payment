export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();

    const stripe = require("stripe")(env.STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: body.items,
      mode: "payment",
      success_url: `${env.PUBLIC_SITE_URL}/success.html`,
      cancel_url: `${env.PUBLIC_SITE_URL}/checkout.html`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
