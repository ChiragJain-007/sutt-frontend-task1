/* =========================================================
   SUTT Frontend Task 1 — vanilla JavaScript (no libraries)
   1. Mobile menu toggle
   2. Scroll reveal animations
   3. Infinite carousel (buttons, dots, autoplay, swipe)
   ========================================================= */

/* ---------- 1. Mobile menu ---------- */
const menuToggle = document.getElementById("menu-toggle");
const navLinks = document.getElementById("nav-links");

menuToggle.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("open");
  menuToggle.classList.toggle("active", isOpen);
  menuToggle.setAttribute("aria-expanded", isOpen);
});

// close the dropdown after picking a link
navLinks.querySelectorAll("a").forEach((link) =>
  link.addEventListener("click", () => {
    navLinks.classList.remove("open");
    menuToggle.classList.remove("active");
    menuToggle.setAttribute("aria-expanded", "false");
  })
);

/* ---------- 2. Scroll reveal ---------- */
// IntersectionObserver tells us when an element enters the screen
const revealObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target); // animate only once
      }
    });
  },
  { threshold: 0.15 }
);
document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

/* ---------- 3. Infinite carousel ----------
   Trick: copy the last few slides to the front and the first few
   to the end. When we slide onto a copy, we silently jump (no
   transition) to the matching real slide, so it loops forever. */
const carousel = document.getElementById("carousel");
const track = document.getElementById("track");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const dotsBox = document.getElementById("dots");

const realSlides = Array.from(track.children);
const total = realSlides.length;

let perView = getPerView();
let index = perView;      // position in the track, including clones
let isMoving = false;
let autoplayTimer = null;

// read --per-view from CSS so JS and media queries always agree
function getPerView() {
  return parseInt(getComputedStyle(carousel).getPropertyValue("--per-view")) || 1;
}

function buildClones() {
  track.querySelectorAll(".clone").forEach((c) => c.remove());

  const head = realSlides.slice(-perView).map(makeClone);
  const tail = realSlides.slice(0, perView).map(makeClone);

  head.reverse().forEach((c) => track.prepend(c));
  tail.forEach((c) => track.append(c));
}

function makeClone(slide) {
  const clone = slide.cloneNode(true);
  clone.classList.add("clone");
  clone.setAttribute("aria-hidden", "true");
  return clone;
}

function buildDots() {
  dotsBox.innerHTML = "";
  for (let i = 0; i < total; i++) {
    const dot = document.createElement("button");
    dot.className = "dot";
    dot.setAttribute("role", "tab");
    dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
    dot.addEventListener("click", () => goTo(i + perView));
    dotsBox.append(dot);
  }
}

function slideWidth() {
  return track.children[0].getBoundingClientRect().width;
}

function setPosition(animate = true) {
  track.style.transition = animate ? "" : "none";
  track.style.transform = `translateX(${-index * slideWidth()}px)`;
  updateDots();
}

function updateDots() {
  // convert track index to real slide number (0 … total-1)
  const real = (((index - perView) % total) + total) % total;
  dotsBox.querySelectorAll(".dot").forEach((d, i) => {
    d.classList.toggle("active", i === real);
    d.setAttribute("aria-selected", i === real);
  });
}

function goTo(newIndex) {
  if (isMoving) return;
  isMoving = true;
  index = newIndex;
  setPosition(true);
}

const next = () => goTo(index + 1);
const prev = () => goTo(index - 1);

// after the slide animation ends, jump from a clone to the real slide
track.addEventListener("transitionend", (e) => {
  if (e.target !== track) return; // ignore hover transitions on cards
  if (index >= total + perView) index -= total;
  if (index < perView) index += total;
  setPosition(false);
  isMoving = false;
});

prevBtn.addEventListener("click", () => { prev(); restartAutoplay(); });
nextBtn.addEventListener("click", () => { next(); restartAutoplay(); });

// keyboard arrows when the carousel is focused
carousel.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") next();
  if (e.key === "ArrowLeft") prev();
});

/* Autoplay — pauses while hovering */
function startAutoplay() {
  stopAutoplay();
  autoplayTimer = setInterval(next, 3500);
}
function stopAutoplay() { clearInterval(autoplayTimer); }
function restartAutoplay() { startAutoplay(); }

carousel.addEventListener("mouseenter", stopAutoplay);
carousel.addEventListener("mouseleave", startAutoplay);
document.addEventListener("visibilitychange", () =>
  document.hidden ? stopAutoplay() : startAutoplay()
);

/* Swipe / drag with Pointer Events (works for mouse and touch) */
let startX = 0;
let dragX = 0;
let dragging = false;

track.addEventListener("pointerdown", (e) => {
  if (isMoving) return;
  dragging = true;
  startX = e.clientX;
  dragX = 0;
  track.classList.add("dragging");
  track.setPointerCapture(e.pointerId);
  stopAutoplay();
});

track.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  dragX = e.clientX - startX;
  track.style.transform = `translateX(${-index * slideWidth() + dragX}px)`;
});

function endDrag() {
  if (!dragging) return;
  dragging = false;
  track.classList.remove("dragging");
  const threshold = slideWidth() * 0.2;
  if (dragX < -threshold) next();
  else if (dragX > threshold) prev();
  else setPosition(true);
  startAutoplay();
}
track.addEventListener("pointerup", endDrag);
track.addEventListener("pointercancel", endDrag);

// stop dragged links/images from opening as a "ghost" drag
track.addEventListener("dragstart", (e) => e.preventDefault());

/* Rebuild when the screen size changes the number of visible slides */
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const newPerView = getPerView();
    const real = (((index - perView) % total) + total) % total;
    if (newPerView !== perView) {
      perView = newPerView;
      buildClones();
    }
    index = real + perView;
    isMoving = false;
    setPosition(false);
  }, 150);
});

/* Init */
buildClones();
buildDots();
setPosition(false);
startAutoplay();
