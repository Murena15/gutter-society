"use strict";

console.log("Gutter Society cart.js loaded");


/* =========================================
   CART ELEMENTS
========================================= */

const cartButton = document.getElementById("cartButton");
const cartPanel = document.getElementById("cartPanel");
const cartOverlay = document.getElementById("cartOverlay");
const cartClose = document.getElementById("cartClose");

const cartItems = document.getElementById("cartItems");
const cartCount = document.getElementById("cartCount");
const cartTotal = document.getElementById("cartTotal");
const checkoutButton = document.getElementById("checkoutButton");


/* =========================================
   LOAD CART
========================================= */

let cart = JSON.parse(
    localStorage.getItem("gutterCart")
) || [];


/* =========================================
   SAVE CART
========================================= */

function saveCart() {

    localStorage.setItem(
        "gutterCart",
        JSON.stringify(cart)
    );

}


/* =========================================
   LOAD LATEST CART
========================================= */

function loadCart() {

    cart = JSON.parse(
        localStorage.getItem("gutterCart")
    ) || [];

}


/* =========================================
   OPEN CART
========================================= */

function openCart() {

    loadCart();

    renderCart();

    if (cartPanel) {
        cartPanel.classList.add("open");
    }

    if (cartOverlay) {
        cartOverlay.classList.add("show");
    }

}


/* =========================================
   CLOSE CART
========================================= */

function closeCart() {

    if (cartPanel) {
        cartPanel.classList.remove("open");
    }

    if (cartOverlay) {
        cartOverlay.classList.remove("show");
    }

}


/* =========================================
   SHOP PRODUCT SIZE BUTTONS
========================================= */

document
    .querySelectorAll(".shop-card")
    .forEach((card) => {

        const sizeButtons =
            card.querySelectorAll(
                ".size-buttons button"
            );


        sizeButtons.forEach((button) => {

            button.addEventListener(
                "click",
                () => {

                    sizeButtons.forEach(
                        (btn) => {

                            btn.classList.remove(
                                "selected"
                            );

                        }
                    );


                    button.classList.add(
                        "selected"
                    );

                }
            );

        });

    });


/* =========================================
   SHOP PRODUCT QUANTITY
========================================= */

document
    .querySelectorAll(".shop-card")
    .forEach((card) => {

        const minus =
            card.querySelector(
                ".quantity-minus"
            );

        const plus =
            card.querySelector(
                ".quantity-plus"
            );

        const number =
            card.querySelector(
                ".quantity-number"
            );


        if (
            !minus ||
            !plus ||
            !number
        ) {
            return;
        }


        let quantity =
            Number(number.textContent) || 1;


        minus.addEventListener(
            "click",
            () => {

                if (quantity > 1) {

                    quantity--;

                    number.textContent =
                        quantity;

                }

            }
        );


        plus.addEventListener(
            "click",
            () => {

                quantity++;

                number.textContent =
                    quantity;

            }
        );

    });


/* =========================================
   SHOP PAGE — ADD TO CART
========================================= */

document
    .querySelectorAll(".shop-card .add-cart-btn")
    .forEach((button) => {

        button.addEventListener(
            "click",
            () => {

                const card =
                    button.closest(
                        ".shop-card"
                    );


                if (!card) {
                    return;
                }


                const product =
                    button.dataset.product;


                const price =
                    Number(
                        button.dataset.price
                    );


                const quantityElement =
                    card.querySelector(
                        ".quantity-number"
                    );


                const quantity =
                    quantityElement
                        ? Number(
                            quantityElement.textContent
                        ) || 1
                        : 1;


                const selectedSize =
                    card.querySelector(
                        ".size-buttons button.selected"
                    );


                let size = "";


                if (selectedSize) {

                    size =
                        selectedSize.textContent.trim();

                }


                if (!size) {

                    alert(
                        "Please select a size before adding this item to your cart."
                    );

                    return;

                }


                addItemToCart(
                    product,
                    price,
                    quantity,
                    size
                );


                if (quantityElement) {

                    quantityElement.textContent =
                        "1";

                }


                openCart();

            }
        );

    });


/* =========================================
   ADD ITEM TO CART
========================================= */

function addItemToCart(
    product,
    price,
    quantity,
    size
) {

    loadCart();


    const existingProduct =
        cart.find(
            (item) =>
                item.product === product &&
                item.size === size
        );


    if (existingProduct) {

        existingProduct.quantity +=
            quantity;

    } else {

        cart.push({

            product: product,

            price: price,

            quantity: quantity,

            size: size

        });

    }


    saveCart();

    renderCart();

}


/* =========================================
   RENDER CART
========================================= */

function renderCart() {

    loadCart();


    if (!cartItems) {
        return;
    }


    cartItems.innerHTML = "";


    /* CART COUNT */

    const totalQuantity =
        cart.reduce(
            (total, item) =>
                total +
                Number(item.quantity),
            0
        );


    if (cartCount) {

        cartCount.textContent =
            totalQuantity;

    }


    /* EMPTY CART */

    if (cart.length === 0) {

        cartItems.innerHTML = `
            <p class="empty-cart-message">
                Your cart is empty.
            </p>
        `;


        if (cartTotal) {

            cartTotal.textContent =
                "R0";

        }


        return;

    }


    /* CART PRODUCTS */

    cart.forEach(
        (item, index) => {

            const div =
                document.createElement(
                    "div"
                );


            div.className =
                "cart-item";


            div.innerHTML = `

                <div class="cart-item-details">

                    <div class="cart-item-info">

                        <h3>
                            ${item.product}
                        </h3>

                        <p>
                            Size:
                            ${item.size || "One Size"}
                        </p>

                        <p>
                            R${item.price}
                        </p>

                    </div>


                    <div class="cart-item-quantity">

                        <button
                            class="cart-quantity-btn cart-minus"
                            data-index="${index}"
                            type="button"
                        >
                            −
                        </button>


                        <span
                            class="cart-quantity-number"
                        >
                            ${item.quantity}
                        </span>


                        <button
                            class="cart-quantity-btn cart-plus"
                            data-index="${index}"
                            type="button"
                        >
                            +
                        </button>

                    </div>

                </div>


                <button
                    class="remove-item"
                    data-index="${index}"
                    type="button"
                >
                    Remove
                </button>

            `;


            cartItems.appendChild(
                div
            );

        }
    );


    /* TOTAL */

    const total =
        cart.reduce(
            (sum, item) =>
                sum +
                Number(item.price) *
                Number(item.quantity),
            0
        );


    if (cartTotal) {

        cartTotal.textContent =
            `R${total}`;

    }

}


/* =========================================
   CART QUANTITY + REMOVE
========================================= */

if (cartItems) {

    cartItems.addEventListener(
        "click",
        (event) => {

            const button =
                event.target.closest(
                    "button"
                );


            if (!button) {
                return;
            }


            const index =
                Number(
                    button.dataset.index
                );


            if (
                Number.isNaN(index) ||
                !cart[index]
            ) {
                return;
            }


            /* PLUS */

            if (
                button.classList.contains(
                    "cart-plus"
                )
            ) {

                cart[index].quantity++;

                saveCart();

                renderCart();

                return;

            }


            /* MINUS */

            if (
                button.classList.contains(
                    "cart-minus"
                )
            ) {

                if (
                    cart[index].quantity > 1
                ) {

                    cart[index].quantity--;

                } else {

                    cart.splice(
                        index,
                        1
                    );

                }


                saveCart();

                renderCart();

                return;

            }


            /* REMOVE */

            if (
                button.classList.contains(
                    "remove-item"
                )
            ) {

                cart.splice(
                    index,
                    1
                );


                saveCart();

                renderCart();

            }

        }
    );

}


/* =========================================
   CART BUTTON
========================================= */

if (cartButton) {

    cartButton.addEventListener(
        "click",
        openCart
    );

}


/* =========================================
   CLOSE CART
========================================= */

if (cartClose) {

    cartClose.addEventListener(
        "click",
        closeCart
    );

}


if (cartOverlay) {

    cartOverlay.addEventListener(
        "click",
        closeCart
    );

}


/* =========================================
   CHECKOUT
========================================= */

if (checkoutButton) {

    checkoutButton.addEventListener(
        "click",
        () => {

            loadCart();


            if (cart.length === 0) {

                alert(
                    "Your cart is empty. Add an item before checking out."
                );

                return;

            }


            window.location.href =
                "checkout.html";

        }
    );

}


/* =========================================
   INITIAL CART DISPLAY
========================================= */

renderCart();