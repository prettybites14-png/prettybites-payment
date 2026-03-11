exports.handler = async () => {
  const secret = String(process.env.STRIPE_SECRET_KEY || "").trim();
  const publishable = String(process.env.STRIPE_PUBLISHABLE_KEY || "").trim();
  const siteUrl = String(process.env.SITE_URL || "").trim();

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      hasSecret: !!secret,
      secretPrefix: secret ? secret.slice(0, 3) : "",
      hasPublishable: !!publishable,
      publishablePrefix: publishable ? publishable.slice(0, 3) : "",
      siteUrl,
      ok: !!secret && secret.startsWith("sk_") && !!siteUrl
    })
  };
};
