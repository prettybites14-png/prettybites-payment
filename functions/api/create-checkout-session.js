import Stripe from "stripe";

export async function onRequestPost(context) {
  const { request, env } = context;

  const body = await request.json();

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
  });

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
}
