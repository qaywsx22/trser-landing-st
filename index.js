
let isHeaderCollapsed = window.innerWidth < 1024
const collapseHeaderItems = document.getElementById("collapsed-items")
const collapseBtn = document.getElementById("collapse-btn")
if (collapseBtn) {
    collapseBtn.setAttribute("aria-expanded", String(!isHeaderCollapsed));
}

const heroSlides = document.querySelector(".slideshow-container")
if (heroSlides) {
    const heroSlideShow = new SlideShow(heroSlides, true, 10000)
}

const bookingDate = document.querySelector("#date")
if (bookingDate) {
    const today = new Date().toISOString().split('T')[0]
    bookingDate.setAttribute('min', today)
}


/**
 * Set booking timing
 */
const timings = document.querySelector("#timings")
if (timings) {
    for (let h = 7; h <= 19; h++) {
        ["00", "30"].forEach((m) => {
            const t = `${String(h).padStart(2, "0")}:${m}`
            const opt = document.createElement("option")
            opt.value = t
            opt.textContent = t
            timings.appendChild(opt)
        })
    }
}

async function populateReviewsFromJSON() {
    const reviewContainerEl = document.querySelector(".review-container");
    const slidesHost = document.getElementById("reviews-slides");
    const dotsHost = document.getElementById("reviews-dots");
    if (!reviewContainerEl || !slidesHost || !dotsHost) return;

    slidesHost.innerHTML = "";
    dotsHost.innerHTML = "";

    let items = [];
    try {
        const resp = await fetch("./assets/reviews.json", { cache: "no-cache" });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (Array.isArray(data)) items = data;
    } catch (err) {
        console.error("Failed to load reviews.json:", err);
    }

    if (items.length === 0) {
        const slide = document.createElement("div");
        slide.className = "slides fade tw-text-justify tw-text-lg";
        slide.innerHTML = `
      <q class="tw-italic tw-text-gray-600">Aktuell liegen keine Bewertungen vor.</q>
    `;
        slidesHost.appendChild(slide);
        const dot = document.createElement("span");
        dot.className = "dot";
        dotsHost.appendChild(dot);
        new SlideShow(reviewContainerEl, true, 10000);
        return;
    }

    const clampRating = (n) => {
        const r = Math.floor(Number(n) || 0);
        return Math.max(0, Math.min(5, r));
    };

    items.forEach((r) => {
        const slide = document.createElement("div");
        slide.className = "slides fade tw-text-justify tw-text-lg";

        const rating = clampRating(r?.rating);
        const starsHTML = Array.from({ length: 5 })
            .map((_, i) => (i < rating ? '<i class="bi bi-star-fill"></i>' : '<i class="bi bi-star"></i>'))
            .join("");

        slide.innerHTML = `
      <q class="tw-italic tw-text-gray-600">${(r?.text ?? "").toString()}</q>
      <div class="tw-mt-2 tw-text-yellow-400">
        ${starsHTML}
      </div>
      <p class="tw-mt-3">- ${(r?.author ?? "Anonym").toString()}</p>
    `;
        slidesHost.appendChild(slide);
    });

    items.forEach(() => {
        const dot = document.createElement("span");
        dot.className = "dot";
        dotsHost.appendChild(dot);
    });

    new SlideShow(reviewContainerEl, true, 10000);
}

document.addEventListener("DOMContentLoaded", populateReviewsFromJSON);


function onHeaderClickOutside(e) {

    if (!collapseHeaderItems.contains(e.target)) {
        toggleHeader()
    }

}

function toggleHeader() {
    if (isHeaderCollapsed) {
        collapseHeaderItems.classList.add("opacity-100")
        collapseHeaderItems.style.width = "60vw"
        collapseBtn.classList.remove("bi-list")
        collapseBtn.classList.add("bi-x")
        isHeaderCollapsed = false
        setTimeout(() => window.addEventListener("click", onHeaderClickOutside), 1)
    } else {
        collapseHeaderItems.classList.remove("opacity-100")
        collapseHeaderItems.style.width = "0vw"
        collapseBtn.classList.remove("bi-x")
        collapseBtn.classList.add("bi-list")
        isHeaderCollapsed = true
        window.removeEventListener("click", onHeaderClickOutside)

    }
    const expanded = !isHeaderCollapsed;
    collapseBtn.setAttribute("aria-expanded", String(expanded));
}

function responsive() {
    if (window.innerWidth > 750) {
        collapseHeaderItems.style.width = ""
    }
}

// function

window.addEventListener("resize", responsive)

// review section
const modalEl = document.querySelector("#modal")
const reviewModal = modalEl ? new Modal(modalEl) : null // asks for user review

const starContainer = document.querySelector('.stars')
const stars = starContainer ? starContainer.querySelectorAll('.star') : []

function handleStarHover(event) {
    const rating = event.currentTarget.getAttribute('data-value')
    stars.forEach(star => {
        if (parseInt(star.getAttribute('data-value')) <= rating) {
            star.classList.add('active')
        } else {
            star.classList.remove('active')
        }
    })
}

function handleStarClicked(event) {
    /**
     * If the rating is above 4 request the user to write a public review, else
     * a private review
     */
    const rating = event.currentTarget.getAttribute('data-value')

    if (!reviewModal) return

    if (rating < 4) {
        reviewModal.updateModal("We are sorry, you are disappointed",
            "Please let us know what we can improve.")
        reviewModal.showModalInput()
        reviewModal.updateButton("Submit")
    } else {
        reviewModal.updateModal("Thank you!",
            `We are pleased to hear you like us. 
                            Could you please rate us on Google maps?`)
        reviewModal.hideModalInput()
        reviewModal.updateButton("Open maps", "https://maps.app.goo.gl/")
    }

    reviewModal.show()

}

function hideActiveStar() {
    stars.forEach(star => {

        star.classList.remove('active')
    })
}

if (starContainer && reviewModal) {
    stars.forEach((star) => {
        star.addEventListener('mouseover', handleStarHover)
        star.addEventListener('click', handleStarClicked)
    })
    starContainer.addEventListener('mouseleave', hideActiveStar)
}

async function sendData(formElement) {
    const action = "https://api.staticforms.xyz/submit"
    const formData = new FormData(formElement);
    try {
        const response = await fetch(action, {
            method: "POST",
            // Set the FormData instance as the request body
            body: formData,
        });
        // console.log(await response.json());
        let resp = await response.json();
        if (resp?.message != null) {
            alert(resp.message);
        }
    } catch (e) {
        console.error(e);
    }
}

document.querySelectorAll("form").forEach((form) => {
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        sendData(event.target);
    });
});