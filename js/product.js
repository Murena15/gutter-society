"use strict";

/* ============================
   PRODUCT INFORMATION
============================ */

const addToCartButton =
    document.getElementById("addProductToCart");

const productName =
    addToCartButton?.dataset.product || "";

const productPrice =
    Number(addToCartButton?.dataset.price) || 0;


/* ============================
   QUANTITY
============================ */

let quantity = 1;

const quantityDisplay =
    document.getElementById("quantity");

const plusBtn =
    document.getElementById("plusBtn");

const minusBtn =
    document.getElementById("minusBtn");


if (plusBtn) {

    plusBtn.addEventListener("click", () => {

        quantity++;

        quantityDisplay.textContent = quantity;

    });

}


if (minusBtn) {

    minusBtn.addEventListener("click", () => {

        if (quantity > 1) {

            quantity--;

            quantityDisplay.textContent = quantity;

        }

    });

}


/* ============================
   IMAGE GALLERY
============================ */

const mainImage =
    document.querySelector(".product-main-image");

const thumbnails =
    document.querySelectorAll(".thumbnail");


thumbnails.forEach((thumbnail) => {

    thumbnail.addEventListener("click", () => {

        if (mainImage) {

            mainImage.src = thumbnail.src;

        }

        thumbnails.forEach((img) => {

            img.classList.remove("active");

        });

        thumbnail.classList.add("active");

    });

});


/* ============================
   SIZE SELECTION
============================ */

const sizeButtons =
    document.querySelectorAll(".size-btn");


sizeButtons.forEach((button) => {

    button.addEventListener("click", function () {

        sizeButtons.forEach((btn) => {

            btn.classList.remove("selected");

        });

        this.classList.add("selected");

        console.log(
            "Selected size:",
            this.dataset.size
        );

    });

});


/* ============================
   ADD PRODUCT TO CART
============================ */

if (addToCartButton) {

    addToCartButton.addEventListener("click", () => {

        const selectedSize =
            document.querySelector(".size-btn.selected");


        /* CHECK SIZE */

        if (!selectedSize) {

            alert("Please select a size.");

            return;

        }


        const size =
            selectedSize.dataset.size;


        /* PRODUCT */

        const product = {

            product: productName,

            price: productPrice,

            size: size,

            quantity: quantity

        };


        /* GET EXISTING CART */

        let cart =
            JSON.parse(
                localStorage.getItem("gutterCart")
            ) || [];


        /* CHECK IF PRODUCT ALREADY EXISTS */

        const existingProduct =
            cart.find(
                (item) =>
                    item.product === product.product &&
                    item.size === product.size
            );


        if (existingProduct) {

            existingProduct.quantity +=
                product.quantity;

        } else {

            cart.push(product);

        }


        /* SAVE CART */

        localStorage.setItem(
            "gutterCart",
            JSON.stringify(cart)
        );


        console.log(
            "Added to cart:",
            product
        );


        /* RESET QUANTITY */

        quantity = 1;

        if (quantityDisplay) {

            quantityDisplay.textContent = "1";

        }
        if (typeof renderCart === "function") {
    renderCart();
}

if (typeof openCart === "function") {
    openCart();
}


       showOrderPopup(
    productName,
    product.quantity
);

    });

}

/* =========================================
   PROFESSIONAL CART POPUP
========================================= */

const orderPopup =
    document.getElementById("orderPopup");

const orderPopupMessage =
    document.getElementById("orderPopupMessage");

const continueShopping =
    document.getElementById("continueShopping");

const popupViewCart =
    document.getElementById("popupViewCart");


function showOrderPopup(productName, quantity) {

    if (!orderPopup) {
        return;
    }

    orderPopupMessage.textContent =
        `${quantity} × ${productName} has been added to your cart.`;

    orderPopup.classList.add("show");

}


function closeOrderPopup() {

    if (orderPopup) {

        orderPopup.classList.remove("show");

    }

}


if (continueShopping) {

    continueShopping.addEventListener(
        "click",
        closeOrderPopup
    );

}


if (popupViewCart) {

    popupViewCart.addEventListener(
        "click",
        () => {

            closeOrderPopup();

            if (typeof openCart === "function") {

                openCart();

            }

        }
    );

}


if (orderPopup) {

    orderPopup.addEventListener(
        "click",
        (event) => {

            if (event.target === orderPopup) {

                closeOrderPopup();

            }

        }
    );

}

