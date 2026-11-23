
import crypto from "node:crypto";

const SUPABASE_URL =
    "https://fwkewtafidvthvtishax.supabase.co";

export default async function (request) {

    if (request.method !== "POST") {
        return Response.json(
            { error: "Method not allowed." },
            { status: 405 }
        );
    }

    try {

        const webhookSecret =
            process.env.YOCO_WEBHOOK_SECRET;

        const supabaseKey =
            process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!webhookSecret || !supabaseKey) {
            throw new Error(
                "Missing server environment variables."
            );
        }

        // Preserve the original body for signature verification.
        const rawBody = await request.text();

        const webhookId =
            request.headers.get("webhook-id");

        const webhookTimestamp =
            request.headers.get("webhook-timestamp");

        const webhookSignature =
            request.headers.get("webhook-signature");

        if (
            !webhookId ||
            !webhookTimestamp ||
            !webhookSignature
        ) {
            return Response.json(
                { error: "Missing webhook headers." },
                { status: 401 }
            );
        }

        // Reject old webhook deliveries.
        const timestamp = Number(webhookTimestamp);

        if (
            !Number.isFinite(timestamp) ||
            Math.abs(Date.now() / 1000 - timestamp) > 300
        ) {
            return Response.json(
                { error: "Expired webhook." },
                { status: 401 }
            );
        }

        // Verify Yoco's Standard Webhooks signature.
        if (!webhookSecret.startsWith("whsec_")) {
            throw new Error("Invalid webhook secret format.");
        }

        const secret = Buffer.from(
            webhookSecret.slice(6),
            "base64"
        );

        const signedContent =
            `${webhookId}.${webhookTimestamp}.${rawBody}`;

        const expectedSignature =
            crypto
                .createHmac("sha256", secret)
                .update(signedContent)
                .digest("base64");

        const signatures =
            webhookSignature.split(" ");

        const validSignature = signatures.some((entry) => {

            const [version, signature] =
                entry.split(",");

            if (version !== "v1" || !signature) {
                return false;
            }

            const received = Buffer.from(
                signature,
                "base64"
            );

            const expected = Buffer.from(
                expectedSignature,
                "base64"
            );

            return (
                received.length === expected.length &&
                crypto.timingSafeEqual(received, expected)
            );

        });

        if (!validSignature) {
            return Response.json(
                { error: "Invalid webhook signature." },
                { status: 401 }
            );
        }

        // Only parse the body after signature verification.
        const event = JSON.parse(rawBody);

        // Ignore events that do not confirm successful payment.
        if (event.type !== "payment.succeeded") {
            return Response.json({
                received: true,
                processed: false
            });
        }

        const payment = event.payload;

        if (
            !payment ||
            payment.status !== "succeeded" ||
            payment.currency !== "ZAR"
        ) {
            return Response.json(
                { error: "Invalid payment information." },
                { status: 400 }
            );
        }

        const orderNumber =
            payment.metadata?.orderNumber;

        if (!orderNumber) {
            return Response.json(
                { error: "Missing order number." },
                { status: 400 }
            );
        }

        // Retrieve the matching order.
        const orderUrl = new URL(
            `${SUPABASE_URL}/rest/v1/orders`
        );

        orderUrl.searchParams.set(
            "order_number",
            `eq.${orderNumber}`
        );

        orderUrl.searchParams.set(
            "select",
            "order_number,total,payment_status"
        );

        const orderResponse = await fetch(orderUrl, {
            headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`
            }
        });

        if (!orderResponse.ok) {
            throw new Error("Could not retrieve order.");
        }

        const orders = await orderResponse.json();
        const order = orders[0];

        if (!order) {
            return Response.json(
                { error: "Order not found." },
                { status: 404 }
            );
        }

        // Confirm that the payment amount matches the order.
        const expectedAmount = Math.round(
            Number(order.total) * 100
        );

        if (
            !Number.isFinite(expectedAmount) ||
            Number(payment.amount) !== expectedAmount
        ) {
            return Response.json(
                { error: "Payment amount mismatch." },
                { status: 400 }
            );
        }

        // Avoid changing an already-paid order.
        if (
            String(order.payment_status).toLowerCase() === "paid"
        ) {
            return Response.json({
                received: true,
                alreadyPaid: true
            });
        }

        // Update the order in Supabase.
        const updateUrl = new URL(
            `${SUPABASE_URL}/rest/v1/orders`
        );

        updateUrl.searchParams.set(
            "order_number",
            `eq.${orderNumber}`
        );

        const updateResponse = await fetch(updateUrl, {
            method: "PATCH",
            headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                "Content-Type": "application/json",
                Prefer: "return=representation"
            },
            body: JSON.stringify({
                payment_status: "Paid"
            })
        });

        if (!updateResponse.ok) {
            throw new Error("Could not update payment status.");
        }

        const updatedOrders =
            await updateResponse.json();

        if (!updatedOrders.length) {
            throw new Error("Order update was not confirmed.");
        }

        return Response.json({
            received: true,
            paid: true,
            orderNumber
        });

    } catch (error) {

        console.error("YOCO WEBHOOK ERROR:", error);

        return Response.json(
            { error: "Webhook processing failed." },
            { status: 500 }
        );

    }

}
