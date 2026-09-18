// ============================================
// PRODUCT PAGE JAVASCRIPT
// ============================================

document.addEventListener("DOMContentLoaded", function () {

  /* ---------- Product data (demo: Tailored Corporate Blazer) ----------
     Backend note: once Supabase is connected, this object is replaced
     by a fetch() call using the product ID from the URL (?id=...). */
  const PRODUCT = {
    name: "Tailored Corporate Blazer",
    division: "msamuels", // "mollys" or "msamuels" — controls size system + gallery behaviour
    price: 32000,
    currency: "₦",
    colors: {
      navy: {
        label: "Navy",
        hex: "#1B2A4A",
        images: {
          front: "assets/images/msamuels/prod-blazer-navy-front.svg",
          back:  "assets/images/msamuels/prod-blazer-navy-back.svg",
          model: "assets/images/msamuels/prod-blazer-navy-model.svg",
        }
      },
      charcoal: {
        label: "Charcoal",
        hex: "#3A3A3A",
        images: {
          front: "assets/images/msamuels/prod-blazer-charcoal-front.svg",
          back:  "assets/images/msamuels/prod-blazer-charcoal-back.svg",
          model: "assets/images/msamuels/prod-blazer-charcoal-model.svg",
        }
      },
      black: {
        label: "Black",
        hex: "#181410",
        images: {
          front: "assets/images/msamuels/prod-blazer-black-front.svg",
          back:  "assets/images/msamuels/prod-blazer-black-back.svg",
          model: "assets/images/msamuels/prod-blazer-black-model.svg",
        }
      }
    },
    defaultColor: "navy",
    sizesAvailable: [24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46], // sold out sizes simply omitted from this list
  };

  const VIEW_ORDER = ["front", "back", "model"];
  let currentColor = PRODUCT.defaultColor;
  let frameIndex = 0;
  let autoTimer;
  let userHasInteracted = false;

  const gallery = document.querySelector(".gallery");
  if (!gallery) return; // not on a product page

  const frameEls = {
    front: gallery.querySelector('[data-view="front"] img'),
    back: gallery.querySelector('[data-view="back"] img'),
    model: gallery.querySelector('[data-view="model"] img'),
  };
  const frameWrappers = {
    front: gallery.querySelector('[data-view="front"]'),
    back: gallery.querySelector('[data-view="back"]'),
    model: gallery.querySelector('[data-view="model"]'),
  };
  const dots = gallery.querySelectorAll(".gallery-dots span");
  const galleryLabel = gallery.querySelector(".gallery-label");

  function loadColorImages(colorKey) {
    const color = PRODUCT.colors[colorKey];
    VIEW_ORDER.forEach((view) => {
      frameEls[view].src = color.images[view];
      frameEls[view].alt = `${PRODUCT.name} — ${color.label} — ${view} view`;
    });
  }

  function showFrame(index) {
    frameIndex = ((index % VIEW_ORDER.length) + VIEW_ORDER.length) % VIEW_ORDER.length;
    const view = VIEW_ORDER[frameIndex];
    Object.values(frameWrappers).forEach((el) => el.classList.remove("active"));
    frameWrappers[view].classList.add("active");
    dots.forEach((d, i) => d.classList.toggle("active", i === frameIndex));
    if (galleryLabel) galleryLabel.textContent = view;
  }

  function startAutoCycle() {
    clearInterval(autoTimer);
    autoTimer = setInterval(() => {
      if (!userHasInteracted) showFrame(frameIndex + 1);
    }, 2800);
  }

  function stopAutoCycle() {
    userHasInteracted = true;
    gallery.classList.add("interacted");
    clearInterval(autoTimer);
  }

  /* ---------- Swipe / drag / hold handling ---------- */
  let dragStartX = null;

  gallery.addEventListener("pointerdown", (e) => {
    dragStartX = e.clientX;
    stopAutoCycle(); // any touch stops auto-cycle permanently (per spec: stays where user leaves it)
  });

  gallery.addEventListener("pointerup", (e) => {
    if (dragStartX === null) return;
    const delta = e.clientX - dragStartX;
    const threshold = 40;
    if (delta > threshold) {
      showFrame(frameIndex - 1); // swiped right -> previous
    } else if (delta < -threshold) {
      showFrame(frameIndex + 1); // swiped left -> next
    }
    // else: small movement or none = treated as a "hold" -> stays on current frame
    dragStartX = null;
  });

  gallery.addEventListener("pointerleave", () => { dragStartX = null; });

  dots.forEach((dot, i) => {
    dot.style.cursor = "pointer";
    dot.addEventListener("click", () => {
      stopAutoCycle();
      showFrame(i);
    });
  });

  /* ---------- Color swatches ---------- */
  document.querySelectorAll(".color-swatch").forEach((swatch) => {
    swatch.addEventListener("click", () => {
      const colorKey = swatch.dataset.color;
      currentColor = colorKey;
      document.querySelectorAll(".color-swatch").forEach((s) => s.classList.remove("active"));
      swatch.classList.add("active");
      const nameEl = document.querySelector(".selected-color-name");
      if (nameEl) nameEl.textContent = PRODUCT.colors[colorKey].label;
      loadColorImages(colorKey);
      showFrame(frameIndex); // keep same view (e.g. stay on "back") but with new color
    });
  });

  /* ---------- Size selection ---------- */
  document.querySelectorAll(".size-option:not(.disabled)").forEach((opt) => {
    opt.addEventListener("click", () => {
      document.querySelectorAll(".size-option").forEach((o) => o.classList.remove("active"));
      opt.classList.add("active");
    });
  });

  /* ---------- Quantity stepper ---------- */
  const qtyDisplay = document.querySelector(".qty-stepper span");
  const qtyMinus = document.querySelector(".qty-minus");
  const qtyPlus = document.querySelector(".qty-plus");
  let qty = 1;
  if (qtyDisplay) {
    qtyMinus.addEventListener("click", () => {
      qty = Math.max(1, qty - 1);
      qtyDisplay.textContent = qty;
    });
    qtyPlus.addEventListener("click", () => {
      qty = Math.min(20, qty + 1);
      qtyDisplay.textContent = qty;
    });
  }

  /* ---------- Info accordion tabs ---------- */
  document.querySelectorAll(".info-tab-head").forEach((head) => {
    head.addEventListener("click", () => {
      head.closest(".info-tab").classList.toggle("open");
    });
  });

  /* ---------- Init ---------- */
  loadColorImages(currentColor);
  showFrame(0);
  startAutoCycle();

});
