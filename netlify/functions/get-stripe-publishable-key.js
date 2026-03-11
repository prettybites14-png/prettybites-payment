exports.handler = async () => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '' })
});
