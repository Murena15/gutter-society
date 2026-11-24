
import crypto from "node:crypto";

export default async function (request) {
    if (request.method !== "POST") {
        return Response.json(
            { error: "Method not allowed." },
            { status: 405 }
        );
    }

    try {
        const yocoKey = process.env.YOCO_SECRET_KEY;
        const setupToken = process.env.YOCO_WEBHOOK_SETUP_TOKEN;

        // Identify missing variables without exposing their values.
        if (!yocoKey || !setupToken) {
            console.error("YOCO REGISTRATION CONFIGURATION:", {
                yocoSecretKeyAvailable: Boolean(yocoKey),
                setupTokenAvailable: Boolean(setupToken)
            });

            return Response.json(
                {
                    error: "Missing environment variables.",
                    yocoSecretKeyAvailable: Boolean(yocoKey),
                    setupTokenAvailable: Boolean(setupToken)
                },
                { status: 500 }
            );
        }

        if (!yocoKey.startsWith("sk_test_")) {
            return Response.json(
                { error: "The Yoco test secret key is required." },
                { status: 400 }
            );
        }

        const suppliedToken =
            request.headers.get("x-setup-token") || "";

        const supplied = Buffer.from(suppliedToken);
        const expected = Buffer.from(setupToken);

        if (
            supplied.length !== expected.length ||
            !crypto.timingSafeEqual(supplied, expected)
        ) {
            return Response.json(
                { error: "Unauthorized." },
                { status: 401 }
            );
        }

        const response = await fetch(
            "https://payments.yoco.com/api/webhooks",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${yocoKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: "Gutter Society payments",
                    url: "https://gutter-society.netlify.app/.netlify/functions/yoco-webhook"
                })
            }
        );

        const result = await response.json();

        if (!response.ok) {
            console.error(
                "YOCO REGISTRATION API ERROR:",
                response.status,
                JSON.stringify(result)
            );

            return Response.json(
                {
                    error: "Yoco rejected webhook registration.",
                    status: response.status
                },
                { status: response.status }
            );
        }

        if (!result.secret) {
            console.error(
                "Yoco registration response did not contain a secret."
            );

            return Response.json(
                { error: "Registration response missing signing secret." },
                { status: 502 }
            );
        }

        return Response.json({
            success: true,
            webhookId: result.id,
            secret: result.secret
        });

    } catch (error) {
        console.error(
            "YOCO REGISTRATION ERROR:",
            error.message
        );

        return Response.json(
            { error: "Registration failed. Check Netlify function logs." },
            { status: 500 }
        );
    }
}
