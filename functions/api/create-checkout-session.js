const Stripe = require("stripe");

function getStripeSecret() {
  const raw = String(process.env.STRIPE_SECRET_KEY || "").trim();
  if (!raw) throw new Error("Missing STRIPE_SECRET_KEY.");
  if (raw.startsWith("pk_")) throw new Error("STRIPE_SECRET_KEY must be sk_.");
  if (!raw.startsWith("sk_")) throw new Error("STRIPE_SECRET_KEY must start with sk_.");
  return raw;
}

function getSiteUrl() {
  const siteUrl = String(process.env.SITE_URL || "").trim().replace(/\/$/, "");
  if (!siteUrl) throw new Error("Missing SITE_URL.");
  if (!/^https?:\/\//i.test(siteUrl)) throw new Error("SITE_URL must start with http:// or https://");
  return siteUrl;
}

async function handleRequest(request, env) {
  try {
    const stripe = new Stripe(getStripeSecret());
    const body = await request.json().catch(() => ({}));
    const siteUrl = getSiteUrl();
    const mode = body.mode === "weekly" ? "weekly" : "cart";
    const currency = "cad";

    let line_items = [];
    const metadata = {
      order_mode: mode,
      customer_name: String(body.customerName || ""),
      customer_phone: String(body.customerPhone || ""),
      delivery_type: String(body.deliveryType || "pickup"),
      address: String(body.address || ""),
      day: String(body.day || ""),
      time: String(body.time || body.deliveryTime || ""),
      notes: String(body.notes || "").slice(0, 450),
      total: String(body.total || 0)
    };

    if (mode === "weekly") {
      const title = String(body.planTitle || "Weekly Meal Plan");
      const packagePrice = Number(body.packagePrice || 0);
      const deliveryFee = Number(body.deliveryFee || 0);

      if (packagePrice <= 0) throw new Error("Weekly package price is missing.");

      line_items.push({
        quantity: 1,
        price_data: {
          currency,
          product_data: { name: title },
          unit_amount: Math.round(packagePrice * 100)
        }
      });

      if (deliveryFee > 0 && String(body.deliveryType || "").toLowerCase() === "delivery") {
        line_items.push({
          quantity: 1,
          price_data: {
            currency,
            product_data: { name: "Weekly delivery fee" },
            unit_amount: Math.round(deliveryFee * 100)
          }
        });
      }

      metadata.plan_title = title;
      metadata.package_price = String(packagePrice);
      metadata.delivery_fee = String(deliveryFee);
    } else {
      const items = Array.isArray(body.items) ? body.items : [];
      if (!items.length) throw new Error("Cart is empty.");
      line_items = items.map((item) => ({
        quantity: Math.max(1, Number(item.qty || 1)),
        price_data: {
          currency,
          product_data: { name: String(item.name || "Item") },
          unit_amount: Math.round(Number(item.price || 0) * 100)
        }
      }));
    }

    const session = await stripe.checkout.sessions.create({
      automatic_tax: { enabled: true },
      billing_address_collection: 'required',
      shipping_address_collection: { allowed_countries: ['CA'] },
      payment_method_types: ['card'],
      mode: 'payment',
      line_items,
      success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/cancel`,
      metadata
    });

    return new Response(JSON.stringify({ id: session.id, url: session.url }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Checkout failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function onRequestPost(context) {
  return handleRequest(context.request, context.env);
}
