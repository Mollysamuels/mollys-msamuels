// ============================================
// MOLLYS PAGE — horizontal scroll arrow controls
// ============================================

document.addEventListener("DOMContentLoaded", function () {
  const track = document.getElementById("moScrollTrack");
  const prevBtn = document.getElementById("moScrollPrev");
  const nextBtn = document.getElementById("moScrollNext");
  if (!track) return;

  const scrollAmount = 300;

  if (prevBtn) prevBtn.addEventListener("click", () => {
    track.scrollBy({ left: -scrollAmount, behavior: "smooth" });
  });
  if (nextBtn) nextBtn.addEventListener("click", () => {
    track.scrollBy({ left: scrollAmount, behavior: "smooth" });
  });

  /* ---------- Continuous auto-drift (pauses on hover/touch) ---------- */
  let autoPaused = false;
  const driftSpeed = 0.6; // pixels per frame — slow, subtle

  function driftLoop() {
    if (!autoPaused) {
      const maxScroll = track.scrollWidth - track.clientWidth;
      if (track.scrollLeft >= maxScroll - 1) {
        track.scrollLeft = 0; // loop back to the start
      } else {
        track.scrollLeft += driftSpeed;
      }
    }
    requestAnimationFrame(driftLoop);
  }
  requestAnimationFrame(driftLoop);

  track.addEventListener("mouseenter", () => { autoPaused = true; });
  track.addEventListener("mouseleave", () => { autoPaused = false; });
  track.addEventListener("touchstart", () => { autoPaused = true; }, { passive: true });
  track.addEventListener("touchend", () => { setTimeout(() => { autoPaused = false; }, 1500); });
});
