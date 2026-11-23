
const SITE_URL = "https://gutter-society.netlify.app";
const SUPABASE_URL = "https://fwkewtafidvthvtishax.supabase.co";

export default async function (request) {
  if (request.method !== "POST") {
    return Response.json(
      { error: "Method not allowed." },
      { status: 405 }
    );
  }

  try {
    const YOCO_SECRET_KEY = process.env.YOCO_SECRET_KEY;
    const SUPABASE_SERVICE_ROLE_KEY =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!YOCO_SECRET_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing server environment variables.");
    }

    const { orderNumber } = await request.json();

    if (!orderNumber || typeof orderNumber !== "string") {
      return Response.json(
        { error: "A valid order number is required." },
        { status: 400 }
      );
    }

    // Retrieve the order from Supabase.
    const orderUrl = new URL(`${SUPABASE_URL}/rest/v1/orders`);

    orderUrl.searchParams.set(
      "order_number",
      `eq.${orderNumber}`
    );

    orderUrl.searchParams.set(
      "select",
      "order_number,total,payment_status"
    );

    const orderResponse = await fetch(orderUrl, {
      method: "GET",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    if (!orderResponse.ok) {
      throw new Error("Could not retrieve the order.");
    }

    const orders = await orderResponse.json();
    const order = orders[0];

    if (!order) {
      return Response.json(
        { error: "Order not found." },
        { status: 404 }
      );
    }

    if (
      String(order.payment_status).toLowerCase() === "paid"
    ) {
      return Response.json(
        { error: "This order has already been paid." },
        { status: 409 }
      );
    }

    const total = Number(order.total);

    if (!Number.isFinite(total) || total <= 0) {
      return Response.json(
        { error: "Invalid order total." },
        { status: 400 }
      );
    }

    // Yoco expects the amount in cents, not rands.
    const amountInCents = Math.round(total * 100);

    const checkoutResponse = await fetch(
      "https://payments.yoco.com/api/checkouts",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${YOCO_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amountInCents,
          currency: "ZAR",

          successUrl:
            `${SITE_URL}/payment-success.html?order=${encodeURIComponent(orderNumber)}`,

          cancelUrl:
            `${SITE_URL}/checkout.html?payment=cancelled`,

          failureUrl:
            `${SITE_URL}/checkout.html?payment=failed`,

          metadata: {
            orderNumber: orderNumber,
          },
        }),
      }
    );

    const checkoutData = await checkoutResponse.json();

    if (!checkoutResponse.ok) {
      console.error("Yoco checkout error:", checkoutData);

      return Response.json(
        { error: "Yoco could not create the payment session." },
        { status: 502 }
      );
    }

    if (!checkoutData.redirectUrl) {
      throw new Error("Yoco did not return a payment URL.");
    }

    return Response.json({
      success: true,
      redirectUrl: checkoutData.redirectUrl,
    });

  } catch (error) {
    console.error("Create payment error:", error);

    return Response.json(
      { error: "Unable to start payment. Please try again." },
      { status: 500 }
    );
  }
}
