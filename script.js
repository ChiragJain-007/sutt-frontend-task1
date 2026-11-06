/* =========================================================
   SUTT Frontend Task 1 — vanilla JavaScript (no libraries)
   0. Hero sliding panels + Share section loop
   1. Mobile menu toggle
   2. Scroll reveal animations
   3. Testimonial carousel (arrows, swipe, endless loop)
   ========================================================= */

/* ---------- 0. Hero sliding panels ----------
   Copy every panel once. CSS slides the track up by half its
   height, so the copies take over exactly where the originals
   started and the loop never shows a gap. */
function duplicateChildren(track) {
  Array.from(track.children).forEach((item) => track.append(item.cloneNode(true)));
}
duplicateChildren(document.getElementById("panels-track"));

/* ---------- 0a. "Trusted by" strip: endless + draggable ----------
   The cards are copied once, so the track holds two identical sets.
   "offset" is how far the track has moved left. Whenever it passes
   one full set, we wrap it back with %, which looks identical, so the
   strip never ends. Every frame:
     - normally it creeps left at AUTO_SPEED (stopped while a mouse is over it)
     - while you drag, it follows your finger / mouse exactly
     - after you let go, it keeps your swipe's speed ("momentum"),
       which fades away until it's back to the normal creep */
const marquee = document.querySelector(".marquee");
const marqueeTrack = document.getElementById("marquee-track");
duplicateChildren(marqueeTrack);

const AUTO_SPEED = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 40; // px per second
let offset = 0;
let momentum = 0;          // extra px per second left over from a swipe
let mqDragging = false;
let mqHovered = false;     // mouse is over the strip: stop auto-scroll
let downX = 0;             // where / when the finger went down, to spot a tap
let downTime = 0;
let lastX = 0;
let lastMoveTime = 0;
let lastFrame = performance.now();

function marqueeFrame(now) {
  const dt = Math.min((now - lastFrame) / 1000, 0.05); // seconds since last frame
  lastFrame = now;
  if (!mqDragging) {
    const paused = mqHovered || marquee.querySelector(".flipped"); // hover, or a tapped card is open
    offset += ((paused ? 0 : AUTO_SPEED) + momentum) * dt;
    momentum *= Math.pow(0.05, dt);   // fades to ~5% each second
  }
  const setWidth = marqueeTrack.scrollWidth / 2;       // one full set of cards
  offset = ((offset % setWidth) + setWidth) % setWidth; // wrap: works both directions
  marqueeTrack.style.transform = `translate3d(${-offset}px, 0, 0)`;
  requestAnimationFrame(marqueeFrame);
}
requestAnimationFrame(marqueeFrame);

marquee.addEventListener("pointerdown", (e) => {
  mqDragging = true;
  momentum = 0;
  lastX = e.clientX;
  lastMoveTime = performance.now();
  downX = e.clientX;
  downTime = lastMoveTime;
  marquee.classList.add("dragging");
  marquee.setPointerCapture(e.pointerId);
});

marquee.addEventListener("pointermove", (e) => {
  if (!mqDragging) return;
  const now = performance.now();
  const dx = e.clientX - lastX;           // how far the pointer moved
  if (Math.abs(e.clientX - downX) > 8) unflipAll(); // it's a swipe: close any open card
  offset -= dx;                           // drag right = move strip right
  const dt = Math.max((now - lastMoveTime) / 1000, 0.001);
  momentum = -dx / dt - AUTO_SPEED;       // remember the swipe speed
  lastX = e.clientX;
  lastMoveTime = now;
});

function endMarqueeDrag() {
  if (!mqDragging) return;
  mqDragging = false;
  marquee.classList.remove("dragging");
  // a pause before letting go means no fling
  if (performance.now() - lastMoveTime > 100) momentum = 0;
  momentum = Math.max(-3000, Math.min(3000, momentum)); // keep flings sane
}
marquee.addEventListener("pointerup", (e) => {
  endMarqueeDrag();
  // Phone tap = finger barely moved and lifted quickly -> flip that card.
  // (A mouse uses hover instead, so only touch / pen taps count here.)
  const isTap = Math.abs(e.clientX - downX) < 8 && performance.now() - downTime < 350;
  if (e.pointerType !== "mouse" && isTap) {
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const card = under && under.closest(".profile-card");
    if (!card) return;
    const wasFlipped = card.classList.contains("flipped");
    unflipAll();                                   // only one card open at a time
    if (!wasFlipped) card.classList.add("flipped");
  }
});

function unflipAll() {
  marquee.querySelectorAll(".flipped").forEach((c) => c.classList.remove("flipped"));
}

// stop while a MOUSE is over the strip (touch has no hover, so it keeps going)
marquee.addEventListener("pointerenter", (e) => {
  if (e.pointerType === "mouse") mqHovered = true;
});
marquee.addEventListener("pointerleave", () => (mqHovered = false));
marquee.addEventListener("pointercancel", endMarqueeDrag);

/* ---------- 0b. Share section loop ----------
   Starts as a fanned stack of 5 cards (a 6th waits hidden at the back).
   Loop:
     1. the FRONT card vanishes into the white bar, the others shift
        forward one place, and the hidden card pops up at the back
        (repeated 3 times, one card at a time)
     2. all 6 cards scatter into the photo collage, hold 3s
     3. they merge back into the fanned stack, and it repeats
   Every position is [left, top, width, height] in % of the box. */
const shareComp = document.getElementById("share-comp");
const shareCards = Array.from(shareComp.querySelectorAll(".sh"));
const sharePill = shareComp.querySelector(".sh-pill");

const FAN = [                 // front ... back
  [14, 34, 50, 52],
  [22, 26, 50, 52],
  [30, 18, 50, 52],
  [38, 10, 50, 52],
  [46, 2, 50, 52],
];
const HIDDEN = [50, 4, 40, 40];   // tucked behind the back card, invisible
const IN_BAR = [10, 58, 22, 6];   // fully inside the white bar, hidden behind it
const COLLAGE = [               // 3 staggered columns filling the box
  [34, 0, 32, 30],    // middle column, top
  [36, 60, 30, 36],   // middle column, bottom
  [70, 12, 28, 32],   // right column, top
  [70, 52, 28, 38],   // right column, bottom
  [2, 6, 28, 36],     // left column, top
  [2, 50, 28, 40],    // left column, bottom
];
const PILL = { fan: [2, 56, 40, 10], collage: [31, 40, 38, 10] };
const FAN_COLORS = ["#e22c2c", "#666b70", "#ff2a78", "#b6a3b6", "#d02bd8", "#3b6fe0"];
const COLLAGE_COLORS = ["#8a8f99", "#9aa6b6", "#a8b0a0", "#7a5c46", "#d9a42c", "#5c4033"];

let order = [0, 1, 2, 3, 4];  // card numbers in the fan, front to back
let hidden = 5;               // card waiting at the back
let vanishCount = 0;
let shareTimer = null;

function place(el, [x, y, w, h]) {
  el.style.left = x + "%";
  el.style.top = y + "%";
  el.style.width = w + "%";
  el.style.height = h + "%";
}

function showFan() {
  order.forEach((n, slot) => {
    const card = shareCards[n];
    place(card, FAN[slot]);
    card.style.background = FAN_COLORS[n];
    card.style.opacity = 1;
    card.style.zIndex = 10 - slot;   // front card on top
    card.classList.add("in-fan");
  });
  place(sharePill, PILL.fan);
}

function hideCard(n) {
  const card = shareCards[n];
  card.style.transition = "none";   // jump instantly, nobody sees it
  place(card, HIDDEN);
  card.style.opacity = 0;
  card.style.zIndex = 1;
  card.style.background = FAN_COLORS[n];
  card.classList.add("in-fan");
  card.classList.remove("vanishing");
  card.offsetWidth;                 // apply the jump before turning transitions back on
  card.style.transition = "";
}

function vanishFront() {
  const front = order.shift();      // front card leaves the fan...
  const card = shareCards[front];
  card.classList.add("vanishing");
  card.style.zIndex = 15;           // above the stack, below the bar (20), so you SEE it dive in
  place(card, IN_BAR);              // ...dives into the bar...
  card.style.opacity = 0;
  order.push(hidden);               // ...and the hidden card joins at the back
  hidden = front;
  showFan();                        // everyone else shifts forward one place
  setTimeout(() => hideCard(front), 1300); // after the 1.1s dive + fade
}

function scatter() {
  shareCards.forEach((card, n) => {
    place(card, COLLAGE[n]);
    card.style.background = COLLAGE_COLORS[n];
    card.style.opacity = 1;
    card.style.zIndex = 5;
    card.classList.remove("in-fan", "vanishing");
  });
  place(sharePill, PILL.collage);
}

function merge() {
  shareCards[hidden].style.opacity = 0;
  place(shareCards[hidden], HIDDEN);
  shareCards[hidden].style.zIndex = 1;
  showFan();
}

// one step of the loop, then schedule the next one
function nextShareStep() {
  let wait;
  if (vanishCount < 3) {
    vanishFront();
    vanishCount++;
    wait = 1600;
  } else if (vanishCount === 3) {
    scatter();
    vanishCount++;
    wait = 900 + 3000;              // scatter, then hold 3s
  } else {
    merge();
    vanishCount = 0;
    wait = 1500;
  }
  shareTimer = setTimeout(nextShareStep, wait);
}

// put everything into the starting fan instantly (no animation)
function resetToFan() {
  clearTimeout(shareTimer);
  shareTimer = null;
  order = [0, 1, 2, 3, 4];
  hidden = 5;
  vanishCount = 0;
  shareCards.forEach((c) => {
    c.style.transition = "none";
    c.classList.remove("vanishing");
  });
  sharePill.style.transition = "none";
  showFan();
  hideCard(hidden);
  shareComp.offsetWidth;            // apply the jump before turning transitions back on
  shareCards.forEach((c) => (c.style.transition = ""));
  sharePill.style.transition = "";
}
resetToFan();

// Start only once the visual is mostly on screen, so you always see it
// begin from the fan. Leaving the screen resets it to the fan.
const prefersReducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!prefersReducedMotion) {
  new IntersectionObserver(
    ([entry]) => {
      if (entry.intersectionRatio >= 0.6 && !shareTimer) {
        shareTimer = setTimeout(nextShareStep, 800); // short look at the fan first
      } else if (entry.intersectionRatio === 0) {
        resetToFan();
      }
    },
    { threshold: [0, 0.6] }
  ).observe(shareComp);
}

/* ---------- 0c. Rotating word in the "trusted by" heading ----------
   Every 2s: the current word gets "is-leaving" (shoots up), the next
   word gets "is-current" (rises in). After the exit animation, the old
   word drops its class and snaps back below, out of sight. */
const rotatorWords = Array.from(document.querySelectorAll(".rotator .word"));
let wordIndex = 0;
setInterval(() => {
  const leaving = rotatorWords[wordIndex];
  leaving.classList.replace("is-current", "is-leaving");
  setTimeout(() => leaving.classList.remove("is-leaving"), 300);
  wordIndex = (wordIndex + 1) % rotatorWords.length;
  rotatorWords[wordIndex].classList.add("is-current");
}, 2000);

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

/* ---------- 3. Testimonial carousel (infinite) ----------
   Shows one testimonial at a time. Trick for the endless loop: copy
   the last slide to the front and the first slide to the end. When we
   slide onto a copy, we silently jump (no animation) to the matching
   real slide, so the arrows can go round forever. */
const carousel = document.getElementById("carousel");
const track = document.getElementById("track");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");

const realSlides = Array.from(track.children);
const total = realSlides.length;

let index = 1;         // position in the track, counting the copy at the front
let isMoving = false;

function makeClone(slide) {
  const clone = slide.cloneNode(true);
  clone.setAttribute("aria-hidden", "true");
  return clone;
}
track.prepend(makeClone(realSlides[total - 1]));
track.append(makeClone(realSlides[0]));

function slideWidth() {
  return track.children[0].getBoundingClientRect().width;
}

function setPosition(animate = true) {
  track.style.transition = animate ? "" : "none";
  track.style.transform = `translateX(${-index * slideWidth()}px)`;
}

function goTo(newIndex) {
  if (isMoving) return;
  isMoving = true;
  index = newIndex;
  setPosition(true);
}
const next = () => goTo(index + 1);
const prev = () => goTo(index - 1);

// after the slide animation ends, jump from a copy to the real slide
track.addEventListener("transitionend", (e) => {
  if (e.target !== track) return; // ignore hover transitions inside slides
  if (index > total) index = 1;
  if (index < 1) index = total;
  setPosition(false);
  isMoving = false;
});

prevBtn.addEventListener("click", prev);
nextBtn.addEventListener("click", next);

// keyboard arrows when the carousel is focused
carousel.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") next();
  if (e.key === "ArrowLeft") prev();
});

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
}
track.addEventListener("pointerup", endDrag);
track.addEventListener("pointercancel", endDrag);

// stop dragged elements from opening as a "ghost" drag
track.addEventListener("dragstart", (e) => e.preventDefault());

// keep the current slide in place when the window is resized
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    isMoving = false;
    setPosition(false);
  }, 150);
});

setPosition(false);
