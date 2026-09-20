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
});
