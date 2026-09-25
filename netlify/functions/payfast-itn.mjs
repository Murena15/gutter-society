"use strict";

import crypto from "crypto";


/* =========================================
   SETTINGS
========================================= */

const SUPABASE_URL =
    "https://fwkewtafidvthvtishax.supabase.co";

const SUPABASE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

const PAYFAST_PASSPHRASE =
    process.env.PAYFAST_PASSPHRASE || "";


/* =========================================
   PAYFAST IP RANGES
========================================= */

const PAYFAST_IP_RANGES = [
    "197.97.145.144/28",
    "41.74.179.192/27"
];


/* =========================================
   CHECK IP ADDRESS
========================================= */

function ipToNumber(ip) {

    const parts =
        ip.split(".").map(Number);

    if (
        parts.length !== 4 ||
        parts.some(
            part =>
                !Number.isInteger(part) ||
                part < 0 ||
                part > 255
        )
    ) {

        return null;

    }

    return (
        ((parts[0] << 24) >>> 0) +
        ((parts[1] << 16) >>> 0) +
        ((parts[2] << 8) >>> 0) +
        (parts[3] >>> 0)
    );

}


function ipInRange(
    ip,
    cidr
) {

    const [range, bitsText] =
        cidr.split("/");

    const bits =
        Number(bitsText);

    const ipNumber =
        ipToNumber(ip);

    const rangeNumber =
        ipToNumber(range);


    if (
        ipNumber === null ||
        rangeNumber === null ||
        !Number.isInteger(bits) ||
        bits < 0 ||
        bits > 32
    ) {

        return false;

    }


    if (bits === 0) {

        return true;

    }


    const mask =
        (0xffffffff << (32 - bits)) >>> 0;


    return (
        (ipNumber & mask) ===
        (rangeNumber & mask)
    );

}


function isPayFastIp(ip) {

    return PAYFAST_IP_RANGES.some(
        range =>
            ipInRange(
                ip,
                range
            )
    );

}


/* =========================================
   GET CLIENT IP
========================================= */

function getClientIp(request) {

    const forwardedFor =
        request.headers.get(
            "x-forwarded-for"
        );

    if (forwardedFor) {

        return forwardedFor
            .split(",")[0]
            .trim();

    }


    const realIp =
        request.headers.get(
            "x-real-ip"
        );

    if (realIp) {

        return realIp.trim();

    }


    return "";

}


/* =========================================
   PAYFAST SIGNATURE
========================================= */

function generateSignature(
    data
) {

    let parameterString = "";


    for (
        const [key, value]
        of Object.entries(data)
    ) {

        if (
            value !== undefined &&
            value !== null &&
            String(value).trim() !== ""
        ) {

            parameterString +=
                `${key}=${encodeURIComponent(
                    String(value).trim()
                ).replace(
                    /%20/g,
                    "+"
                )}&`;

        }

    }


    parameterString =
        parameterString.slice(0, -1);


    if (PAYFAST_PASSPHRASE) {

        parameterString +=
            `&passphrase=${encodeURIComponent(
                PAYFAST_PASSPHRASE.trim()
            ).replace(
                /%20/g,
                "+"
            )}`;

    }


    return crypto
        .createHash("md5")
        .update(parameterString)
        .digest("hex");

}


/* =========================================
   NETLIFY FUNCTION
========================================= */

export default async (
    request
) => {

    try {

        /* =========================================
           METHOD CHECK
        ========================================= */

        if (
            request.method !== "POST"
        ) {

            return new Response(
                "Method Not Allowed",
                {
                    status: 405
                }
            );

        }


        /* =========================================
           CHECK SUPABASE KEY
        ========================================= */

        if (
            !SUPABASE_KEY
        ) {

            console.error(
                "SUPABASE_SERVICE_ROLE_KEY is missing."
            );

            return new Response(
                "Server configuration error",
                {
                    status: 500
                }
            );

        }


        /* =========================================
           VERIFY SOURCE IP
        ========================================= */

        const sourceIp =
            getClientIp(request);


        console.log(
            "PayFast ITN source IP:",
            sourceIp
        );


        /*
         * Netlify may place the original
         * request IP in x-forwarded-for.
         *
         * If no IP is available, reject
         * the notification.
         */

        if (
            !sourceIp
        ) {

            console.error(
                "Could not determine PayFast source IP."
            );

            return new Response(
                "Invalid source",
                {
                    status: 403
                }
            );

        }


        /*
         * IMPORTANT:
         * Do not rely on the browser or
         * customer for this notification.
         */

        if (
            !isPayFastIp(sourceIp)
        ) {

            console.error(
                "Rejected ITN from unknown IP:",
                sourceIp
            );

            return new Response(
                "Forbidden",
                {
                    status: 403
                }
            );

        }


        /* =========================================
           READ PAYFAST DATA
        ========================================= */

        const rawBody =
            await request.text();


        const params =
            new URLSearchParams(
                rawBody
            );


        const receivedData = {};


        for (
            const [key, value]
            of params.entries()
        ) {

            receivedData[key] =
                value;

        }


        console.log(
            "PayFast ITN received:",
            receivedData
        );


        /* =========================================
           BASIC VALIDATION
        ========================================= */

        if (
            !receivedData.m_payment_id ||
            !receivedData.amount_gross ||
            !receivedData.payment_status ||
            !receivedData.signature
        ) {

            return new Response(
                "Invalid payment notification",
                {
                    status: 400
                }
            );

        }


        /* =========================================
           VERIFY SIGNATURE
        ========================================= */

        const receivedSignature =
            receivedData.signature;


        const signatureData = {
            ...receivedData
        };


        delete signatureData.signature;


        const calculatedSignature =
            generateSignature(
                signatureData
            );


        if (
            calculatedSignature.toLowerCase() !==
            receivedSignature.toLowerCase()
        ) {

            console.error(
                "PayFast signature verification failed."
            );

            return new Response(
                "Invalid signature",
                {
                    status: 400
                }
            );

        }


        /* =========================================
           VERIFY PAYMENT STATUS
        ========================================= */

        if (
            receivedData.payment_status !==
            "COMPLETE"
        ) {

            console.log(
                "Payment is not complete:",
                receivedData.payment_status
            );

            return new Response(
                "Payment not complete",
                {
                    status: 200
                }
            );

        }


        /* =========================================
           ORDER NUMBER
        ========================================= */

        const orderNumber =
            receivedData.m_payment_id;


        /* =========================================
           PAYMENT AMOUNT
        ========================================= */

        const paidAmount =
            Number(
                receivedData.amount_gross
            );


        if (
            !Number.isFinite(
                paidAmount
            ) ||
            paidAmount <= 0
        ) {

            return new Response(
                "Invalid payment amount",
                {
                    status: 400
                }
            );

        }


        /* =========================================
           LOOK UP ORDER
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
                            SUPABASE_KEY,

                        "Authorization":
                            `Bearer ${SUPABASE_KEY}`

                    }
                }
            );


        if (
            !orderResponse.ok
        ) {

            const errorText =
                await orderResponse.text();

            console.error(
                "Could not retrieve order:",
                errorText
            );

            return new Response(
                "Could not retrieve order",
                {
                    status: 500
                }
            );

        }


        const orders =
            await orderResponse.json();


        if (
            !Array.isArray(orders) ||
            orders.length === 0
        ) {

            console.error(
                "Order not found:",
                orderNumber
            );

            return new Response(
                "Order not found",
                {
                    status: 404
                }
            );

        }


        const order =
            orders[0];


        /* =========================================
           CHECK IF ALREADY PAID
        ========================================= */

        if (
            order.payment_status ===
            "Paid"
        ) {

            console.log(
                `Order ${orderNumber} is already marked Paid.`
            );

            return new Response(
                "OK",
                {
                    status: 200
                }
            );

        }


        /* =========================================
           VERIFY ORDER TOTAL
        ========================================= */

        const orderTotal =
            Number(
                order.total
            );


        if (
            !Number.isFinite(
                orderTotal
            )
        ) {

            console.error(
                "Invalid order total:",
                order.total
            );

            return new Response(
                "Invalid order total",
                {
                    status: 500
                }
            );

        }


        /* =========================================
           COMPARE PAYMENT WITH ORDER
        ========================================= */

        if (
            Math.abs(
                paidAmount -
                orderTotal
            ) > 0.01
        ) {

            console.error(
                "Payment amount mismatch.",
                {
                    orderNumber,
                    orderTotal,
                    paidAmount
                }
            );

            return new Response(
                "Payment amount mismatch",
                {
                    status: 400
                }
            );

        }


        /* =========================================
           UPDATE ORDER
        ========================================= */

        const updateResponse =
            await fetch(
                `${SUPABASE_URL}/rest/v1/orders?order_number=eq.${encodeURIComponent(
                    orderNumber
                )}`,
                {
                    method: "PATCH",

                    headers: {

                        "apikey":
                            SUPABASE_KEY,

                        "Authorization":
                            `Bearer ${SUPABASE_KEY}`,

                        "Content-Type":
                            "application/json",

                        "Prefer":
                            "return=minimal"

                    },

                    body:
                        JSON.stringify({

                            payment_status:
                                "Paid"

                        })

                }
            );


        if (
            !updateResponse.ok
        ) {

            const errorText =
                await updateResponse.text();

            console.error(
                "Could not update order:",
                errorText
            );

            return new Response(
                "Could not update order",
                {
                    status: 500
                }
            );

        }


        console.log(
            `Order ${orderNumber} marked as Paid.`
        );


        return new Response(
            "OK",
            {
                status: 200
            }
        );


    } catch (error) {

        console.error(
            "PAYFAST ITN ERROR:",
            error
        );


        return new Response(
            "Server error",
            {
                status: 500
            }
        );

    }

};
