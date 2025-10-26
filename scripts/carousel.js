document.addEventListener("DOMContentLoaded", function () {
  /* Carousel Manager - Main module for handling carousel functionality */
  const CarouselManager = (function () {
    /* DOM elements and state variables */
    const carousel = document.querySelector(".carousel");
    const slidesContainer = document.querySelector(".slidescar");
    const navigationContainer = document.querySelector(".navigation");
    const leftArrow = document.querySelector(".left-arrow");
    const rightArrow = document.querySelector(".right-arrow");

    let slides = [];
    let navigationDots = [];
    let slideImages = [];
    let currentSlide = 0;
    let startX = 0;
    let endX = 0;
    let isDragging = false;
    let touchMoveHandler = null;
    let mouseMoveHandler = null;
    let totalSlides = 0;

    /* Configuration constants */
    const SWIPE_THRESHOLD = 30;
    const PASSIVE_SUPPORT = checkPassiveSupport();
    const IMAGE_BASE_URL = "./assets/images/slideshow/";
      // "https://ik.imagekit.io/wsoltani/DEVCarousel/";
    const IMAGE_FORMATS = ["png", "jpg", "jpeg", "webp"]; // Try multiple image formats

    /* Responsive image sizes - disabled due to ImageKit compatibility
    const IMAGE_SIZES = {
      small: '400',
      medium: '800',
      large: '1200'
    };
    */

    // Cache for loaded images
    const imageCache = new Map();

    /* Browser feature detection */
    function checkPassiveSupport() {
      let supportsPassive = false;
      try {
        // Test via a getter in the options object to see if the passive property is accessed
        const opts = Object.defineProperty({}, "passive", {
          get: function () {
            supportsPassive = true;
            return true;
          },
        });
        window.addEventListener("testPassive", null, opts);
        window.removeEventListener("testPassive", null, opts);
      } catch (e) {}
      return supportsPassive;
    }

    /* Module initialization */
    function init() {
      // First, dynamically load images
      loadImagesFromImageKit()
        .then(() => {
          // Set up event listeners after images are loaded
          setupEventListeners();

          // Set initial state
          initializeCurrentSlide();

          // Update ARIA attributes for initial state
          updateAriaAttributes();
        })
        .catch((error) => {
          console.error("Failed to load images:", error);
          displayErrorMessage(
            `Failed to load images: ${
              error.message || "Unknown error"
            }. Please check your connection and try again.`
          );
        });

      // Return API
      return {
        goToSlide,
        getCurrentSlide: () => currentSlide,
        getTotalSlides: () => totalSlides,
      };
    }

    /* Parallel image loading from ImageKit */
    async function loadImagesFromImageKit() {
      try {
        // We'll try up to a reasonable maximum number of images
        const MAX_IMAGES = 10;
        const imagePromises = [];

        // Create promises for checking all possible images in parallel
        for (let imageNum = 1; imageNum <= MAX_IMAGES; imageNum++) {
          // For each image number, create a promise that resolves with the image info if found
          const imagePromise = (async () => {
            for (const format of IMAGE_FORMATS) {
              const imageUrl = `${IMAGE_BASE_URL}${imageNum}.${format}`;
              try {
                const exists = await checkImageExists(imageUrl);
                if (exists) {
                  return {
                    url: imageUrl,
                    index: imageNum - 1,
                    format: format,
                    number: imageNum,
                  };
                }
              } catch (error) {
                console.warn(
                  `Failed to check image ${imageNum}.${format}:`,
                  error
                );
              }
            }
            return null; // No format worked for this image number
          })();

          imagePromises.push(imagePromise);
        }

        // Wait for all promises to resolve (with a timeout for better UX)
        const timeoutPromise = new Promise((resolve) =>
          setTimeout(() => resolve("timeout"), 15000)
        );
        const results = await Promise.race([
          Promise.all(imagePromises),
          timeoutPromise,
        ]);

        if (results === "timeout") {
          console.warn(
            "Image loading timed out after 15 seconds, using partial results"
          );
          // Get results from promises that have already resolved
          const partialResults = await Promise.allSettled(imagePromises);
          const loadedImages = partialResults
            .filter((result) => result.status === "fulfilled" && result.value)
            .map((result) => result.value)
            .sort((a, b) => a.number - b.number); // Sort by image number

          if (loadedImages.length > 0) {
            console.log(
              `Found ${loadedImages.length} images (partial results due to timeout)`
            );
            buildCarousel(loadedImages);
            return true;
          }
        } else {
          // Filter out nulls and sort by image number
          const loadedImages = results
            .filter(Boolean)
            .sort((a, b) => a.number - b.number);

          if (loadedImages.length > 0) {
            console.log(`Found ${loadedImages.length} images`);
            buildCarousel(loadedImages);
            return true;
          }
        }

        throw new Error(
          "No images found in the specified folder. Please check the URL and image formats."
        );
      } catch (error) {
        console.error("Error loading images:", error);
        throw error;
      }
    }

    /* Image existence check with caching */
    function checkImageExists(url) {
      // Check cache first
      if (imageCache.has(url)) {
        return Promise.resolve(imageCache.get(url));
      }

      return new Promise((resolve) => {
        const img = new Image();

        img.onload = () => {
          // Store in cache
          imageCache.set(url, true);
          resolve(true);
        };
        img.onerror = () => {
          // Store in cache
          imageCache.set(url, false);
          resolve(false);
        };

        img.src = url;
      });
    }

    /* Carousel construction with loaded images */
    function buildCarousel(images) {
      totalSlides = images.length;

      // Clear existing content
      slidesContainer.innerHTML = "";
      navigationContainer.innerHTML = "";

      // Remove any existing dynamic style for slides
      const existingStyle = document.getElementById("dynamic-carousel-style");
      if (existingStyle) existingStyle.remove();

      // Create dynamic CSS for the slides based on number of images
      generateDynamicCSS(images.length);

      // Create radio inputs for each slide
      const radioFragment = document.createDocumentFragment();

      images.forEach((image, index) => {
        // Create radio input
        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "carousel";
        radio.id = `slide${index + 1}`;
        radio.setAttribute("aria-label", `Slide ${index + 1}`);
        if (index === 0) radio.checked = true;

        // Add to DOM before the slides container
        radioFragment.appendChild(radio);
      });

      carousel.insertBefore(radioFragment, slidesContainer);

      // Create slides
      images.forEach((image, index) => {
        // Create slide
        const slide = document.createElement("div");
        slide.className = "slide";
        slide.setAttribute("role", "group");
        slide.setAttribute("aria-roledescription", "slide");
        slide.setAttribute("aria-label", `${index + 1} of ${images.length}`);

        // Create image (without responsive srcset since ImageKit doesn't support the size format we tried)
        const img = document.createElement("img");
        img.src = image.url;
        img.alt = `Cat image ${index + 1} (${image.format.toUpperCase()})`;
        img.loading = index === 0 ? "eager" : "lazy";
        img.setAttribute("data-index", index);
        img.setAttribute("data-format", image.format);

        // Add fallback for no JS
        const noscript = document.createElement("noscript");
        const fallbackP = document.createElement("p");
        fallbackP.className = "fallback-message";
        fallbackP.textContent =
          "Please enable JavaScript to view the carousel.";
        noscript.appendChild(fallbackP);

        // Assemble slide
        slide.appendChild(img);
        slide.appendChild(noscript);
        slidesContainer.appendChild(slide);
      });

      // Create navigation dots
      images.forEach((image, index) => {
        const label = document.createElement("label");
        label.setAttribute("for", `slide${index + 1}`);
        label.setAttribute("tabindex", "0");
        label.setAttribute("role", "tab");
        label.setAttribute("aria-label", `Go to slide ${index + 1}`);
        label.setAttribute("aria-selected", index === 0 ? "true" : "false");

        navigationContainer.appendChild(label);
      });

      // Update references to the newly created elements
      slides = document.querySelectorAll('input[name="carousel"]');
      navigationDots = document.querySelectorAll(".navigation label");
      slideImages = document.querySelectorAll(".slide img");

      // Set up error handling for the images
      setupImageErrorHandling();

      // Hide loading indicator
      const loadingIndicator = document.querySelector(".loading-indicator");
      if (loadingIndicator) loadingIndicator.classList.add("hidden");
    }

    /* Generate dynamic CSS based on number of slides */
    function generateDynamicCSS(numSlides) {
      // Calculate width percentage for each slide
      const slideWidth = 100 / numSlides;
      const totalWidth = numSlides * 100;

      // Create CSS rules for slides container width and individual slides
      let cssRules = `
        .slidescar {
          width: ${totalWidth}%;
        }
        
        .slide {
          width: ${slideWidth}%;
        }
      `;

      // Create CSS rules for slide positioning
      for (let i = 1; i <= numSlides; i++) {
        const translateX = (i - 1) * -slideWidth;
        cssRules += `
        #slide${i}:checked ~ .slidescar {
          transform: translateX(${translateX}%);
        }
        `;
      }

      // Create CSS rules for active navigation dots
      for (let i = 1; i <= numSlides; i++) {
        cssRules += `
        #slide${i}:checked ~ .navigation label:nth-child(${i}) {
          background-color: white;
          transform: scale(1.5);
        }
        `;
      }

      // Add high contrast mode rules
      cssRules += `
      @media (prefers-contrast: more) {
      `;

      for (let i = 1; i <= numSlides; i++) {
        cssRules += `
        #slide${i}:checked ~ .navigation label:nth-child(${i}) {
          background-color: white;
          border: 2px solid black;
        }
        `;
      }

      cssRules += `
      }
      `;

      // Create and append the style element
      const styleElement = document.createElement("style");
      styleElement.id = "dynamic-carousel-style";
      styleElement.textContent = cssRules;
      document.head.appendChild(styleElement);
    }

    /* Display error message */
    function displayErrorMessage(message) {
      const errorDiv = document.createElement("div");
      errorDiv.className = "carousel-error";
      errorDiv.textContent = message;

      // Clear carousel and show error
      carousel.innerHTML = "";
      carousel.appendChild(errorDiv);
    }

    function initializeCurrentSlide() {
      if (slides.length === 0) return;

      slides.forEach((slide, index) => {
        if (slide.checked) {
          currentSlide = index;
        }
      });
    }

    function setupEventListeners() {
      if (leftArrow) leftArrow.addEventListener("click", handlePrevSlide);
      if (rightArrow) rightArrow.addEventListener("click", handleNextSlide);

      navigationDots.forEach((dot, index) => {
        dot.addEventListener("click", () => goToSlide(index));
        dot.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            goToSlide(index);
          }
        });
      });

      setupTouchEvents();

      setupMouseEvents();

      slides.forEach((slide, index) => {
        slide.addEventListener("change", function () {
          if (this.checked) {
            currentSlide = index;
            updateAriaAttributes();
          }
        });
      });

      document.addEventListener("keydown", handleKeyNavigation);
    }

    // Handle image loading errors
    function setupImageErrorHandling() {
      slideImages.forEach((img) => {
        img.addEventListener("error", function () {
          this.classList.add("error");
          this.alt = "Image failed to load";
          this.src =
            'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100"%3E%3Crect fill="%23f5f5f5" width="100%" height="100%"%3E%3C/rect%3E%3Ctext fill="%23999" x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif"%3EImage not available%3C/text%3E%3C/svg%3E';
        });
      });
    }

    /* Accessibility updates */
    function updateAriaAttributes() {
      if (navigationDots.length === 0) return;

      navigationDots.forEach((dot, index) => {
        dot.setAttribute(
          "aria-selected",
          index === currentSlide ? "true" : "false"
        );
      });

      const liveRegion = document.createElement("div");
      liveRegion.setAttribute("aria-live", "polite");
      liveRegion.setAttribute("aria-atomic", "true");
      liveRegion.classList.add("sr-only");
      liveRegion.textContent = `Slide ${currentSlide + 1} of ${totalSlides}`;
      document.body.appendChild(liveRegion);

      setTimeout(() => {
        document.body.removeChild(liveRegion);
      }, 1000);
    }

    /* Navigation and slide control functions */

    function goToSlide(index) {
      if (slides.length === 0) return;

      if (index < 0) {
        index = totalSlides - 1;
      } else if (index >= totalSlides) {
        index = 0;
      }
      slides[index].checked = true;
      currentSlide = index;
      updateAriaAttributes();

      // Preload adjacent slides
      preloadAdjacentSlides(index);
    }

    /* Preload adjacent slides for smoother experience */
    function preloadAdjacentSlides(currentIndex) {
      if (slideImages.length === 0) return;

      // Calculate next and previous indices with wraparound
      const nextIndex = (currentIndex + 1) % totalSlides;
      const prevIndex = (currentIndex - 1 + totalSlides) % totalSlides;

      // Get the current, next and previous images
      const nextImg = slideImages[nextIndex];
      const prevImg = slideImages[prevIndex];

      // Function to preload an image
      const preloadImage = (img) => {
        if (!img || !img.src || imageCache.has(img.src)) return;

        // Preload the image
        const preloader = new Image();
        preloader.onload = () => imageCache.set(img.src, true);
        preloader.src = img.src;
      };

      // Preload next and previous images
      preloadImage(nextImg);
      preloadImage(prevImg);
    }

    function handlePrevSlide() {
      goToSlide(currentSlide - 1);
    }

    function handleNextSlide() {
      goToSlide(currentSlide + 1);
    }

    function handleKeyNavigation(e) {
      if (
        e.target.tagName.toLowerCase() === "input" ||
        e.target.tagName.toLowerCase() === "textarea"
      ) {
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevSlide();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNextSlide();
      }
    }

    /* Touch interaction */
    function setupTouchEvents() {
      carousel.addEventListener(
        "touchstart",
        handleTouchStart,
        PASSIVE_SUPPORT ? { passive: true } : false
      );

      touchMoveHandler = throttle(handleTouchMove, 16);
      carousel.addEventListener("touchmove", touchMoveHandler, {
        passive: false,
      });

      carousel.addEventListener(
        "touchend",
        handleTouchEnd,
        PASSIVE_SUPPORT ? { passive: true } : false
      );
    }

    function handleTouchStart(e) {
      startX = e.touches[0].clientX;
      isDragging = true;
    }

    function handleTouchMove(e) {
      if (!isDragging) return;

      const currentX = e.touches[0].clientX;
      const diffX = Math.abs(currentX - startX);
      const diffY = Math.abs(e.touches[0].clientY - e.touches[0].clientY);

      if (diffX > diffY && diffX > 10) {
        e.preventDefault();
      }
    }

    function handleTouchEnd(e) {
      if (!isDragging) return;
      endX = e.changedTouches[0].clientX;
      handleSwipe();
      isDragging = false;
    }

    /* Mouse interaction */
    function setupMouseEvents() {
      carousel.addEventListener("mousedown", handleMouseDown);

      mouseMoveHandler = throttle(handleMouseMove, 16);
      carousel.addEventListener("mousemove", mouseMoveHandler);

      carousel.addEventListener("mouseup", handleMouseUp);
      carousel.addEventListener("mouseleave", handleMouseLeave);
    }

    function handleMouseDown(e) {
      if (e.button !== 0) return;

      startX = e.clientX;
      isDragging = true;

      carousel.style.cursor = "grabbing";

      e.preventDefault();
    }

    function handleMouseMove(e) {
      if (!isDragging) return;
      e.preventDefault();
    }

    function handleMouseUp(e) {
      if (!isDragging) return;
      endX = e.clientX;
      handleSwipe();
      isDragging = false;

      carousel.style.cursor = "grab";
    }

    function handleMouseLeave(e) {
      if (isDragging) {
        isDragging = false;
        carousel.style.cursor = "grab";
      }
    }

    /* Swipe detection */
    function handleSwipe() {
      const swipeDistance = endX - startX;

      if (swipeDistance < -SWIPE_THRESHOLD) {
        handleNextSlide();
      } else if (swipeDistance > SWIPE_THRESHOLD) {
        handlePrevSlide();
      }
    }

    /* Helper utility functions */

    function throttle(func, limit) {
      let inThrottle;
      return function (e) {
        if (!inThrottle) {
          func(e);
          inThrottle = true;
          setTimeout(() => (inThrottle = false), limit);
        }
      };
    }

    return {
      init,
    };
  })();

  /* Initialize carousel */
  CarouselManager.init();
});
