
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

// const photoSlides = document.querySelector("#slideshow-section .slideshow-container")
// if (photoSlides) {
//     const photoSlideShow = new SlideShow(photoSlides, true, 10000)
// }

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

const reviewContainer = document.querySelector(".review-container")
if (reviewContainer) {
    const reviewSlideShow = new SlideShow(reviewContainer, true, 10000)
}


function onHeaderClickOutside(e){

    if (!collapseHeaderItems.contains(e.target)){
        toggleHeader()
    }

}


function toggleHeader(){
    // console.log("Colappse", isHeaderCollapsed)
    if (isHeaderCollapsed){
        // collapseHeaderItems.classList.remove("max-md:tw-opacity-0")
        collapseHeaderItems.classList.add("opacity-100")
        collapseHeaderItems.style.width = "60vw"
        collapseBtn.classList.remove("bi-list")
        collapseBtn.classList.add("bi-x")
        isHeaderCollapsed = false

        setTimeout(() => window.addEventListener("click", onHeaderClickOutside), 1)

    }else{
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

function responsive(){
    if (window.innerWidth > 750){
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

function handleStarClicked(event){
    /**
     * If the rating is above 4 request the user to write a public review, else
     * a private review
     */
    const rating = event.currentTarget.getAttribute('data-value')

    if (!reviewModal) return

    if (rating < 4){
        reviewModal.updateModal("We are sorry, you are disappointed", 
                            "Please let us know what we can improve.")
        reviewModal.showModalInput()
        reviewModal.updateButton("Submit")
    }else{
        reviewModal.updateModal("Thank you!", 
                            `We are pleased to hear you like us. 
                            Could you please rate us on Google maps?`)
        reviewModal.hideModalInput()
        reviewModal.updateButton("Open maps", "https://maps.app.goo.gl/")
    }

    reviewModal.show()

}

function hideActiveStar(){
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