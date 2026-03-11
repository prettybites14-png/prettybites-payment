const Stripe = require("stripe");

function getStripeSecret() {
  const raw = String(process.env.STRIPE_SECRET_KEY || "").trim();
  if (!raw) throw new Error("Missing STRIPE_SECRET_KEY in Netlify Environment Variables.");
  if (raw.startsWith("pk_")) throw new Error("STRIPE_SECRET_KEY is wrong. You entered a publishable key (pk_) instead of a secret key (sk_).");
  if (!raw.startsWith("sk_")) throw new Error("STRIPE_SECRET_KEY must start with sk_.");
  return raw;
}

exports.handler = async (event) => {
  try {
    const stripe = new Stripe(getStripeSecret());
    const sessionId = event.queryStringParameters && event.queryStringParameters.session_id;
    if (!sessionId) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing session_id" }) };
    }
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["line_items"] });
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paid: session.payment_status === "paid",
        session: {
          id: session.id,
          payment_status: session.payment_status,
          amount_total: session.amount_total,
          customer_details: session.customer_details,
          metadata: session.metadata || {},
          line_items: (session.line_items && session.line_items.data)
            ? session.line_items.data.map(li => ({
                description: li.description,
                quantity: li.quantity,
                amount_total: li.amount_total
              }))
            : []
        }
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message || "Verification failed" })
    };
  }
};
