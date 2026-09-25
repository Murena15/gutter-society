"use strict";

/* ==========================================
   PRODUCT IMAGE GALLERY
========================================== */

document.querySelectorAll(".shop-card").forEach((card) => {

    const mainImage = card.querySelector(".main-product-image");

    const thumbnails = card.querySelectorAll(".gallery-image");

    thumbnails.forEach((thumbnail) => {

        thumbnail.addEventListener("click", () => {

            mainImage.src = thumbnail.src;

            thumbnails.forEach((img) => {

                img.classList.remove("active");

            });

            thumbnail.classList.add("active");

        });

    });

});


/* ======================================
   PRODUCT SEARCH
====================================== */

const searchInput = document.getElementById("searchInput");

if (searchInput) {

    searchInput.addEventListener("keyup", () => {

        const value = searchInput.value.toLowerCase();

        document.querySelectorAll(".shop-card").forEach((card) => {

            const title =
                card.querySelector("h2").textContent.toLowerCase();

            card.style.display =
                title.includes(value)
                ? "block"
                : "none";

        });

    });

}


/* ======================================
   PRODUCT FILTERS
====================================== */

const filterButtons =
document.querySelectorAll(".filter-btn");

const products =
document.querySelectorAll(".shop-card");

filterButtons.forEach((button) => {

    button.addEventListener("click", () => {

        filterButtons.forEach((btn) => {

            btn.classList.remove("active");

        });

        button.classList.add("active");

        const filter =
            button.dataset.filter;

        products.forEach((product) => {

            if (
                filter === "all" ||
                product.dataset.category === filter
            ) {

                product.style.display = "block";

            } else {

                product.style.display = "none";

            }

        });

    });

});