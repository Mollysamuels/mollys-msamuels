/* Molly Samuels — "Explore the Collection" (coming soon) pop-up.
   Any link with  data-explore-collection  opens it. Keyboard friendly: Esc closes, Tab stays inside,
   focus returns to the link that opened it. Remove the shop.html card and this file when the archive goes live. */
(function () {
  "use strict";
  var css = document.createElement("style");
  css.textContent =
    "#msExploreBackdrop{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;visibility:hidden;transition:opacity .2s ease,visibility .2s}" +
    "#msExploreBackdrop.show{opacity:1;visibility:visible}" +
    "#msExploreCard{position:relative;background:var(--cream,#FAF6EE);color:var(--ink,#211A12);width:100%;max-width:470px;border-radius:14px;padding:40px 32px 32px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.35);transform:translateY(12px) scale(.98);transition:transform .2s ease}" +
    "#msExploreBackdrop.show #msExploreCard{transform:none}" +
    "#msExploreCard .ms-ex-eyebrow{display:inline-block;background:#000;color:#F4D900;font-size:.72rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:6px 14px;border-radius:20px}" +
    "#msExploreCard h2{font-family:var(--font-display,Georgia,serif);font-style:italic;font-weight:500;font-size:2rem;margin:16px 0 12px;color:#000}" +
    "#msExploreCard p{color:var(--ink-soft,#58493A);font-size:.95rem;line-height:1.65;margin:0 0 24px}" +
    "#msExploreCard .ms-ex-close{position:absolute;top:10px;right:10px;width:44px;height:44px;border:0;background:transparent;color:#000;cursor:pointer;border-radius:50%;display:flex;align-items:center;justify-content:center}" +
    "#msExploreCard .ms-ex-close:hover{background:rgba(0,0,0,.07)}" +
    "#msExploreCard .ms-ex-ok{background:#F4D900;color:#000;border:0;border-radius:8px;padding:12px 28px;font:600 .95rem var(--font-body,Arial,sans-serif);cursor:pointer;min-height:44px}" +
    "#msExploreCard button:focus-visible{outline:3px solid #000;outline-offset:2px}" +
    "@media (prefers-reduced-motion:reduce){#msExploreBackdrop,#msExploreCard{transition:none}}";
  document.head.appendChild(css);

  var backdrop = document.createElement("div");
  backdrop.id = "msExploreBackdrop";
  backdrop.innerHTML =
    '<div id="msExploreCard" role="dialog" aria-modal="true" aria-labelledby="msExploreTitle" aria-describedby="msExploreText">' +
    '<button type="button" class="ms-ex-close" aria-label="Close"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>' +
    '<span class="ms-ex-eyebrow">Explore the Mollys Collection</span>' +
    '<h2 id="msExploreTitle">Coming Soon</h2>' +
    '<p id="msExploreText">A dedicated fashion archive where customers can discover everything Mollys has featured, from current collections to past designs and photoshoot highlights.</p>' +
    '<button type="button" class="ms-ex-ok">Got it</button></div>';
  backdrop.hidden = true;

  var opener = null;
  var card, closeBtn, okBtn;
  function focusables() { return [closeBtn, okBtn]; }

  function open(from) {
    opener = from || null;
    backdrop.hidden = false;
    void backdrop.offsetWidth;               // lets the fade-in run
    backdrop.classList.add("show");
    document.documentElement.style.overflow = "hidden";
    // focus once the box is actually visible (focusing a hidden element silently does nothing)
    setTimeout(function () { okBtn.focus(); }, 30);
  }
  function close() {
    backdrop.classList.remove("show");
    document.documentElement.style.overflow = "";
    setTimeout(function () { if (!backdrop.classList.contains("show")) backdrop.hidden = true; }, 220);
    if (opener && opener.focus) opener.focus();
    opener = null;
  }

  function init() {
    document.body.appendChild(backdrop);
    card = backdrop.firstChild; closeBtn = card.querySelector(".ms-ex-close"); okBtn = card.querySelector(".ms-ex-ok");
    closeBtn.addEventListener("click", close); okBtn.addEventListener("click", close);
    backdrop.addEventListener("click", function (e) { if (e.target === backdrop) close(); });
    document.addEventListener("keydown", function (e) {
      if (!backdrop.classList.contains("show")) return;
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key === "Tab") {
        var f = focusables(), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        else if (f.indexOf(document.activeElement) === -1) { e.preventDefault(); first.focus(); }
      }
    });
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("[data-explore-collection]");
      if (!a) return;
      e.preventDefault();
      open(a);
    });
  }
  if (document.body) init(); else document.addEventListener("DOMContentLoaded", init);
})();
