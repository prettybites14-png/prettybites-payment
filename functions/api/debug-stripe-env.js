
import { json, envValue } from './_common.js';

export async function onRequestGet(context) {
  const hasSecret = !!envValue(context, 'STRIPE_SECRET_KEY');
  const hasPublic = !!envValue(context, 'PUBLIC_SITE_URL');
  return json({
    ok: hasSecret,
    stripeSecretConfigured: hasSecret,
    publicSiteUrlConfigured: hasPublic,
    message: hasSecret ? 'Stripe secret key is configured.' : 'Add STRIPE_SECRET_KEY in Cloudflare Pages > Settings > Variables and redeploy.'
  });
}
