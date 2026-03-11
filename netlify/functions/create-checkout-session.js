const Stripe = require("stripe");

function getStripeSecret() {
  const raw = String(process.env.STRIPE_SECRET_KEY || "").trim();
  if (!raw) {
    throw new Error("Missing STRIPE_SECRET_KEY in Netlify Environment Variables.");
  }
  if (raw.startsWith("pk_")) {
    throw new Error("STRIPE_SECRET_KEY is wrong. You entered a publishable key (pk_) instead of a secret key (sk_).");
  }
  if (!raw.startsWith("sk_")) {
    throw new Error("STRIPE_SECRET_KEY must start with sk_.");
  }
  return raw;
}

function getSiteUrl() {
  const siteUrl = String(process.env.SITE_URL || "").trim().replace(/\/$/, "");
  if (!siteUrl) {
    throw new Error("Missing SITE_URL in Netlify Environment Variables.");
  }
  if (!/^https?:\/\//i.test(siteUrl)) {
    throw new Error("SITE_URL must start with http:// or https://");
  }
  return siteUrl;
}

exports.handler = async (event) => {
  if (event.httpMethod && event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const stripe = new Stripe(getStripeSecret());
    const body = JSON.parse(event.body || "{}");
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

      if (packagePrice <= 0) {
        throw new Error("Weekly package price is missing.");
      }

      line_items.push({
        price_data: {
          currency,
          product_data: { name: title },
          unit_amount: Math.round(packagePrice * 100)
        },
        quantity: 1
      });

      if (deliveryFee > 0) {
        line_items.push({
          price_data: {
            currency,
            product_data: { name: "Delivery Fee" },
            unit_amount: Math.round(deliveryFee * 100)
          },
          quantity: 1
        });
      }

      metadata.plan_title = title;
      metadata.package_price = String(packagePrice || 0);
      metadata.delivery_fee = String(deliveryFee || 0);
      metadata.delivery_days = String(body.deliveryDays || 5);
      metadata.items_json = JSON.stringify(body.items || []).slice(0, 450);
    } else {
      const items = Array.isArray(body.items) ? body.items : [];
      if (!items.length) throw new Error("Cart is empty.");

      for (const item of items) {
        const unitAmount = Math.round(Number(item.price || 0) * 100);
        if (unitAmount <= 0) continue;
        line_items.push({
          price_data: {
            currency,
            product_data: { name: String(item.name || "Item").slice(0, 120) },
            unit_amount: unitAmount
          },
          quantity: Math.max(1, Number(item.qty || 1))
        });
      }

      if (!line_items.length) {
        throw new Error("Cart items are invalid.");
      }

      const deliveryFee = Number(body.deliveryFee || 0);
      if (deliveryFee > 0) {
        line_items.push({
          price_data: {
            currency,
            product_data: { name: "Delivery Fee" },
            unit_amount: Math.round(deliveryFee * 100)
          },
          quantity: 1
        });
      }
      metadata.delivery_fee = String(deliveryFee || 0);
      metadata.items_json = JSON.stringify(items).slice(0, 450);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url: `${siteUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/${mode === "weekly" ? "weekly-meals.html" : "cancel.html"}`,
      metadata,
      billing_address_collection: "auto",
      phone_number_collection: { enabled: false },
      shipping_address_collection: body.deliveryType === "delivery" ? { allowed_countries: ["CA"] } : undefined,
      allow_promotion_codes: false
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: session.id, url: session.url })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message || "Checkout session failed" })
    };
  }
};
