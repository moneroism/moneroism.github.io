const coin = document.querySelector("#coin");
const hero = document.querySelector(".hero");
const logo = document.querySelector(".monero-logo");
const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
);

let targetRotation = 0;
let currentRotation = 0;
let scrollY = window.scrollY;
let targetTilt = 0;
let currentTilt = 0;
let rafPending = false;

function updateScroll() {
  scrollY = window.scrollY;

  const heroHeight = Math.max(hero.offsetHeight, 1);
  const progress = Math.min(scrollY / heroHeight, 1);

  targetRotation = progress * 360 + scrollY * 0.12;
  targetTilt = Math.sin(scrollY * 0.002) * 8;

  hero.style.setProperty("--scroll-progress", progress);

  if (!rafPending) {
    rafPending = true;
    requestAnimationFrame(animate);
  }
}

function animate() {
  rafPending = false;

  if (reducedMotion.matches) {
    coin.style.transform = "";
    return;
  }

  currentRotation += (targetRotation - currentRotation) * 0.09;
  currentTilt += (targetTilt - currentTilt) * 0.08;

  coin.style.transform = `
    rotate(${currentRotation}deg)
    rotateX(${currentTilt}deg)
  `;

  const glow = 0.2 + Math.abs(Math.sin(currentRotation * 0.025)) * 0.3;
  coin.style.filter = `drop-shadow(0 0 25px rgba(242, 104, 34, ${glow}))`;

  if (
    Math.abs(targetRotation - currentRotation) > 0.05 ||
    Math.abs(targetTilt - currentTilt) > 0.05
  ) {
    rafPending = true;
    requestAnimationFrame(animate);
  }
}

window.addEventListener("scroll", updateScroll, { passive: true });

window.addEventListener("resize", updateScroll, { passive: true });

if (!reducedMotion.matches) {
  window.addEventListener("pointermove", (event) => {
    const x = (event.clientX / window.innerWidth - 0.5) * 2;
    const y = (event.clientY / window.innerHeight - 0.5) * 2;

    logo.style.transform = `
      translate(${x * 2}px, ${y * 2}px)
    `;
  }, { passive: true });
}

reducedMotion.addEventListener("change", updateScroll);

updateScroll();
