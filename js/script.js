"use strict";

/* =====================================
   GUTTER SOCIETY - MAIN JAVASCRIPT
===================================== */

const loader = document.getElementById("loader");
const header = document.getElementById("header");

const menuButton = document.getElementById("menuButton");
const navLinks = document.getElementById("navLinks");
const navLinkItems = document.querySelectorAll(".nav-link");


/* =====================================
   LOADING SCREEN
===================================== */

if (loader) {

    document.body.classList.add("no-scroll");

    window.addEventListener("load", () => {

        setTimeout(() => {

            loader.classList.add("hidden");

            document.body.classList.remove("no-scroll");

        }, 1800);

    });

}


/* =====================================
   HEADER SCROLL
===================================== */

function updateHeader() {

    if (!header) {
        return;
    }

    if (window.scrollY > 40) {

        header.classList.add("scrolled");

    } else {

        header.classList.remove("scrolled");

    }

}

window.addEventListener("scroll", updateHeader);


/* =====================================
   MOBILE MENU
===================================== */

if (menuButton && navLinks) {

    menuButton.addEventListener("click", () => {

        const menuIsOpen =
            navLinks.classList.toggle("open");

        menuButton.classList.toggle(
            "active",
            menuIsOpen
        );

        menuButton.setAttribute(
            "aria-expanded",
            menuIsOpen
        );

        document.body.classList.toggle(
            "no-scroll",
            menuIsOpen
        );

    });

}


/* =====================================
   CLOSE MENU AFTER CLICKING LINK
===================================== */

navLinkItems.forEach((link) => {

    link.addEventListener("click", () => {

        navLinks?.classList.remove("open");

        menuButton?.classList.remove("active");

        menuButton?.setAttribute(
            "aria-expanded",
            "false"
        );

        document.body.classList.remove("no-scroll");

    });

});


/* =====================================
   RESET MENU ON DESKTOP
===================================== */

window.addEventListener("resize", () => {

    if (window.innerWidth > 900) {

        navLinks?.classList.remove("open");

        menuButton?.classList.remove("active");

        menuButton?.setAttribute(
            "aria-expanded",
            "false"
        );

        document.body.classList.remove("no-scroll");

    }

});