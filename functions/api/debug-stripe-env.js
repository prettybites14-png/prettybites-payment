function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function onRequestGet(context) {
  const secret = String(context.env?.STRIPE_SECRET_KEY || '').trim();
  const site = String(context.env?.SITE_URL || '').trim();
  return json({
    ok: !!secret && secret.startsWith('sk_'),
    hasSecret: !!secret,
    secretPrefix: secret ? secret.slice(0, 3) + '_' : '',
    siteUrl: site || new URL(context.request.url).origin
  });
}
