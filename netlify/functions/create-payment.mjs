"use strict";

import crypto from "crypto";


/* =========================================
   SETTINGS
========================================= */

const PAYFAST_URL =
    "https://www.payfast.co.za/eng/process";

const SITE_URL =
    "https://gutter-society.netlify.app";

const SUPABASE_URL =
    "https://fwkewtafidvthvtishax.supabase.co";

const SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY;


/* =========================================
   CREATE PAYFAST SIGNATURE
========================================= */

function generateSignature(data, passphrase = "") {

    let parameterString = "";

    for (const [key, value] of Object.entries(data)) {

        if (
            value !== undefined &&
            value !== null &&
            String(value).trim() !== ""
        ) {

            parameterString +=
                `${key}=${encodeURIComponent(
                    String(value).trim()
                ).replace(/%20/g, "+")}&`;

        }

    }


    parameterString =
        parameterString.slice(0, -1);


    if (passphrase) {

        parameterString +=
            `&passphrase=${encodeURIComponent(
                passphrase.trim()
            ).replace(/%20/g, "+")}`;

    }


    return crypto
        .createHash("md5")
        .update(parameterString)
        .digest("hex");

}


/* =========================================
   NETLIFY FUNCTION
========================================= */

export default async (request) => {

    try {

        /* =========================================
           METHOD CHECK
        ========================================= */

        if (request.method !== "POST") {

            return new Response(
                JSON.stringify({
                    error: "Method not allowed."
                }),
                {
                    status: 405,
                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }
            );

        }


        /* =========================================
           CHECK ENVIRONMENT VARIABLES
        ========================================= */

        const merchantId =
            process.env.PAYFAST_MERCHANT_ID;

        const merchantKey =
            process.env.PAYFAST_MERCHANT_KEY;

        const passphrase =
            process.env.PAYFAST_PASSPHRASE || "";


        if (
            !merchantId ||
            !merchantKey ||
            !SUPABASE_SERVICE_ROLE_KEY
        ) {

            console.error(
                "Required payment environment variables are missing."
            );

            return new Response(
                JSON.stringify({
                    error:
                        "Payment system is not configured correctly."
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }
            );

        }


        /* =========================================
           READ REQUEST
        ========================================= */

        const body =
            await request.json();


        const {
            orderNumber,
            firstName,
            lastName,
            email,
            phone
        } = body;


        /* =========================================
           VALIDATE REQUEST
        ========================================= */

        if (
            !orderNumber ||
            !firstName ||
            !email
        ) {

            return new Response(
                JSON.stringify({
                    error:
                        "Missing required payment information."
                }),
                {
                    status: 400,
                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }
            );

        }


        /* =========================================
           FIND ORDER IN SUPABASE
        ========================================= */

        const orderResponse =
            await fetch(
                `${SUPABASE_URL}/rest/v1/orders?order_number=eq.${encodeURIComponent(
                    orderNumber
                )}&select=id,order_number,total,payment_status`,
                {
                    method: "GET",

                    headers: {
                        "apikey":
                            SUPABASE_SERVICE_ROLE_KEY,

                        "Authorization":
                            `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
                    }
                }
            );


        if (!orderResponse.ok) {

            const errorText =
                await orderResponse.text();

            console.error(
                "Supabase order lookup failed:",
                errorText
            );

            return new Response(
                JSON.stringify({
                    error:
                        "Could not find the order."
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }
            );

        }


        const orders =
            await orderResponse.json();


        if (
            !Array.isArray(orders) ||
            orders.length === 0
        ) {

            return new Response(
                JSON.stringify({
                    error:
                        "Order not found."
                }),
                {
                    status: 404,
                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }
            );

        }


        const order =
            orders[0];


        /* =========================================
           CHECK PAYMENT STATUS
        ========================================= */

        if (
            order.payment_status === "Paid"
        ) {

            return new Response(
                JSON.stringify({
                    error:
                        "This order has already been paid."
                }),
                {
                    status: 400,
                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }
            );

        }


        /* =========================================
           GET TOTAL FROM DATABASE
        ========================================= */

        const numericAmount =
            Number(order.total);


        if (
            !Number.isFinite(numericAmount) ||
            numericAmount <= 0
        ) {

            return new Response(
                JSON.stringify({
                    error:
                        "Invalid order total."
                }),
                {
                    status: 400,
                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }
            );

        }


        /* =========================================
           FORMAT CUSTOMER DETAILS
        ========================================= */

        const safeFirstName =
            String(firstName).trim();

        const safeLastName =
            String(lastName || "").trim();

        const safeEmail =
            String(email).trim();

        const safePhone =
            String(phone || "").trim();


        /* =========================================
           PAYFAST PAYMENT DATA
        ========================================= */

        const paymentData = {

            merchant_id:
                merchantId,

            merchant_key:
                merchantKey,

            return_url:
                `${SITE_URL}/payment-success.html?order=${encodeURIComponent(
                    orderNumber
                )}`,

            cancel_url:
                `${SITE_URL}/checkout.html?payment=cancelled`,

            notify_url:
                `${SITE_URL}/.netlify/functions/payfast-itn`,

            name_first:
                safeFirstName,

            name_last:
                safeLastName,

            email_address:
                safeEmail,

            cell_number:
                safePhone,

            m_payment_id:
                String(orderNumber),

            amount:
                numericAmount.toFixed(2),

            item_name:
                `Gutter Society Order ${orderNumber}`,

            item_description:
                "Gutter Society online order"

        };


        /* =========================================
           GENERATE SIGNATURE
        ========================================= */

        paymentData.signature =
            generateSignature(
                paymentData,
                passphrase
            );


        /* =========================================
           CREATE AUTO-SUBMIT FORM
        ========================================= */

        let formFields = "";


        for (
            const [key, value]
            of Object.entries(paymentData)
        ) {

            formFields += `
                <input
                    type="hidden"
                    name="${escapeHtml(key)}"
                    value="${escapeHtml(value)}"
                >
            `;

        }


        const html = `

<!DOCTYPE html>

<html lang="en">

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>
        Secure Payment - Gutter Society
    </title>

</head>

<body>

    <p>
        Redirecting you to secure payment...
    </p>

    <form
        id="payfastForm"
        action="${PAYFAST_URL}"
        method="post"
    >

        ${formFields}

        <noscript>

            <button type="submit">
                Continue to Payment
            </button>

        </noscript>

    </form>


    <script>

        document
            .getElementById("payfastForm")
            .submit();

    </script>

</body>

</html>

        `;


        return new Response(
            html,
            {
                status: 200,

                headers: {
                    "Content-Type":
                        "text/html; charset=UTF-8"
                }
            }
        );


    } catch (error) {

        console.error(
            "PAYFAST CREATE PAYMENT ERROR:",
            error
        );


        return new Response(
            JSON.stringify({
                error:
                    "Could not create PayFast payment."
            }),
            {
                status: 500,

                headers: {
                    "Content-Type":
                        "application/json"
                }
            }
        );

    }

};


/* =========================================
   HTML ESCAPING
========================================= */

function escapeHtml(value) {

    return String(value)

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");

}