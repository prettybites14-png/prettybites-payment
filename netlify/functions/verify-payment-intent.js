const Stripe = require("stripe");

exports.handler = async (event) => {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const paymentIntentId = event.queryStringParameters && event.queryStringParameters.payment_intent;
    if (!paymentIntentId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing payment_intent' }) };
    }
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paid: intent.status === 'succeeded',
        intent: {
          id: intent.id,
          status: intent.status,
          amount: intent.amount,
          currency: intent.currency,
          receipt_email: intent.receipt_email,
          metadata: intent.metadata || {}
        }
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message || 'Verification failed' })
    };
  }
};
