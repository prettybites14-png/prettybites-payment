
import { json, stripeGet } from './_common';

export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const sessionId = url.searchParams.get('session_id');
    if (!sessionId) return json({ error: 'Missing session_id.' }, 400);

    const session = await stripeGet(context, `/v1/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=customer_details`);
    return json({
      paid: session.payment_status === 'paid' || session.status === 'complete',
      session,
      id: session.id,
      status: session.status,
      payment_status: session.payment_status,
      metadata: session.metadata || {},
      customer_details: session.customer_details || null,
      amount_total: session.amount_total || 0,
      currency: session.currency || 'cad',
    });
  } catch (err) {
    return json({ error: err.message || 'Payment verification failed.' }, 500);
  }
}
