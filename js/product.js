 // ============================================
// PRODUCT PAGE JAVASCRIPT
// ============================================

document.addEventListener("DOMContentLoaded", function () {

  /* ---------- Product data ----------
     Backend note: once Supabase is connected, this whole block is replaced
     by a fetch() call using the product ID from the URL.

     Right now: the rich hand-built demo below ("blazer-classic") shows the
     full pattern (multi-view gallery, real color photos, chest sizing).
     Every other product clicked from a category page arrives here with its
     own name/price/division/images passed in the URL and gets a simpler,
     but still fully dynamic, generic version of this same page — correct
     name, price, logo, and a size type chosen automatically for its
     division/category (collar for shirts, chest for other M. Samuels
     items, S–XXL for Mollys items). */

  const BLAZER_DEMO = {
    name: "Tailored Corporate Blazer",
    division: "msamuels",
    category: "unisex-blazers",
    price: 32000,
    currency: "₦",
    colors: {
      navy: {
        label: "Navy",
        hex: "#1B2A4A",
        views: ["front", "back", "model"],
        images: {
          front: "assets/images/msamuels/prod-blazer-navy-front.svg",
          back:  "assets/images/msamuels/prod-blazer-navy-back.svg",
          model: "assets/images/msamuels/prod-blazer-navy-model.svg",
        }
      },
      charcoal: { label: "Charcoal", hex: "#3A3A3A", views: ["front"], images: { front: "assets/images/msamuels/prod-blazer-charcoal-front.svg" } },
      black:    { label: "Black",    hex: "#181410", views: ["front"], images: { front: "assets/images/msamuels/prod-blazer-black-front.svg" } },
      orange:   { label: "Orange",   hex: "#B85C2E", views: ["front"], images: { front: "assets/images/msamuels/prod-blazer-orange-front.svg" } },
      blue:     { label: "Blue",     hex: "#2A4E8C", views: ["front"], images: { front: "assets/images/msamuels/prod-blazer-blue-front.svg" } },
      oxblood:  { label: "Oxblood",  hex: "#5A1F22", views: ["front"], images: { front: "assets/images/msamuels/prod-blazer-oxblood-front.svg" } },
    },
    defaultColor: "navy",
    sizesAvailable: [24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46],
  };

  const params = new URLSearchParams(window.location.search);
  const itemParam = params.get("item");
  const isBlazerDemo = !itemParam || itemParam === "blazer-classic";

  let PRODUCT;
  if (isBlazerDemo) {
    PRODUCT = BLAZER_DEMO;
  } else {
    // Generic product, fully built from what the category page passed in the URL.
    const division = params.get("division") || "mollys";
    const category = params.get("category") || "";
    const name = params.get("name") ? decodeURIComponent(params.get("name")) : "Product";
    const price = parseInt(params.get("price"), 10) || 0;
    const img1 = params.get("img1") ? decodeURIComponent(params.get("img1")) : (division === "msamuels" ? "assets/images/category/msamuels-product.svg" : "assets/images/category/mollys-product.svg");

    PRODUCT = {
      name, division, category, price, currency: "₦",
      colors: { default: { label: "Default", hex: "#000000", views: ["front"], images: { front: img1 } } },
      defaultColor: "default",
      sizesAvailable: null, // generic items don't use the blazer's chest-size disabled-list logic
    };
  }

  /* ---------- Header logo: swap to the M. Samuels logo on M. Samuels products ---------- */
  const headerLogo = document.getElementById("prodHeaderLogo");
  if (headerLogo && PRODUCT.division === "msamuels") {
    headerLogo.href = "msamuels.html";
    headerLogo.classList.add("ms-section-logo");
    headerLogo.innerHTML = '<img src="assets/images/msamuels/logo.png" alt="M. Samuels">';
  }

  /* ---------- Title, price, breadcrumb, division tag, page <title> ---------- */
  document.title = `${PRODUCT.name} — Molly Samuels`;
  const titleEl = document.getElementById("prodTitle");
  if (titleEl) titleEl.textContent = PRODUCT.name;
  const priceEl = document.getElementById("prodPrice");
  if (priceEl) priceEl.textContent = `₦${PRODUCT.price.toLocaleString()}`;
  const divisionTagEl = document.getElementById("prodDivisionTag");
  if (divisionTagEl) {
    divisionTagEl.textContent = PRODUCT.division === "msamuels" ? "M. SAMUELS — SCHOOL UNIFORM" : "MOLLYS — FASHION & LIFESTYLE";
  }
  const bcDivision = document.getElementById("prodBreadcrumbDivision");
  if (bcDivision) {
    bcDivision.textContent = PRODUCT.division === "msamuels" ? "M. Samuels" : "Mollys";
    bcDivision.href = PRODUCT.division === "msamuels" ? "msamuels.html" : "mollys.html";
  }
  const bcCategory = document.getElementById("prodBreadcrumbCategory");
  if (bcCategory && PRODUCT.category) {
    bcCategory.textContent = PRODUCT.category.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
    bcCategory.href = `category.html?category=${PRODUCT.category}`;
  }
  const bcCurrent = document.getElementById("prodBreadcrumbCurrent");
  if (bcCurrent) bcCurrent.textContent = PRODUCT.name;

  /* ---------- Color swatches: hide the blazer's specific real colors for generic items ---------- */
  if (!isBlazerDemo) {
    document.querySelectorAll(".blazer-only").forEach((el) => { el.style.display = "none"; });
    // Auto-select "Other" so the custom-colour field is the only option shown
    const otherSwatch = document.querySelector('.color-swatch[data-color="other"]');
    if (otherSwatch) otherSwatch.classList.add("active");
    const nameEl = document.querySelector(".selected-color-name");
    if (nameEl) nameEl.textContent = "Specify below";
    document.querySelector(".custom-color-field")?.classList.add("show");
  }

  /* ---------- Size dropdown: rebuild it for generic items based on division/category ---------- */
  if (!isBlazerDemo) {
    const ONE_SIZE_SLUGS = new Set([
      "school-bags", "ties", "water-bottles", "hair-accessories",
      "name-tab-kit-and-hem-web-kit", "hats-and-scarves", "swimwear-accessories",
      "shin-guards-and-gum-shields", "caps", "socks-and-sport-socks", "socks-and-tights",
    ]);
    const SHOE_SLUGS = new Set(["plimsolls"]);

    const sizeBlock = document.querySelector(".size-dropdown")?.closest(".option-block");
    const sizeLabel = document.getElementById("sizeLabel");
    const menu = document.getElementById("sizeDropdownMenu");
    const valueEl = document.querySelector(".size-dropdown-value");
    const sizeDropdownEl = document.querySelector(".size-dropdown");

    if (ONE_SIZE_SLUGS.has(PRODUCT.category)) {
      // Accessories like bags, ties, bottles, caps — no garment sizing needed.
      if (sizeLabel) sizeLabel.textContent = "Size";
      if (sizeDropdownEl) sizeDropdownEl.style.display = "none";
      if (sizeBlock) {
        const note = document.createElement("p");
        note.style.cssText = "font-size:0.9rem;color:var(--ink-soft);margin:0;";
        note.textContent = "One size";
        sizeBlock.appendChild(note);
      }
    } else {
      let sizeOptions, labelText;
      if (PRODUCT.division === "mollys") {
        labelText = "Size";
        sizeOptions = ["S", "M", "L", "XL", "XXL"];
      } else if (SHOE_SLUGS.has(PRODUCT.category)) {
        labelText = "Shoe size (UK)";
        sizeOptions = ["10", "11", "12", "13", "1", "2", "3", "4", "5", "6"];
      } else if (PRODUCT.category.includes("shirt") && !PRODUCT.category.includes("sweatshirt")) {
        labelText = "Collar size (in)";
        sizeOptions = ["11", "11½", "12", "12½", "13", "13½", "14", "14½", "15", "15½", "16", "16½", "17"];
      } else {
        labelText = "Chest size (in)";
        sizeOptions = ["24", "26", "28", "30", "32", "34", "36", "38", "40", "42", "44", "46"];
      }

      if (sizeLabel) sizeLabel.textContent = labelText;
      if (menu) {
        const suffix = (PRODUCT.division === "mollys") ? "" : " in";
        menu.innerHTML = sizeOptions.map((s, i) =>
          `<button class="size-dropdown-option${i === 0 ? " active" : ""}" data-size="${s}">${s}${labelText.includes("Shoe") ? "" : suffix}</button>`
        ).join("");
      }
      if (valueEl) valueEl.textContent = sizeOptions[0] + (PRODUCT.division === "mollys" || labelText.includes("Shoe") ? "" : " in");
    }
  }

  const ALL_VIEWS = ["front", "back", "model"];
  let currentViews = ["front", "back", "model"];
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
  const galleryHint = gallery.querySelector(".gallery-hint");
  const galleryLabel = gallery.querySelector(".gallery-label");
  const thumbRow = document.querySelector(".thumbnail-row");
  const thumbButtons = document.querySelectorAll(".thumbnail");
  const thumbImgs = {
    front: document.querySelector('.thumbnail img[data-thumb="front"]'),
    back: document.querySelector('.thumbnail img[data-thumb="back"]'),
    model: document.querySelector('.thumbnail img[data-thumb="model"]'),
  };

  function loadColorImages(colorKey) {
    const color = PRODUCT.colors[colorKey];
    currentViews = color.views && color.views.length ? color.views : ["front"];

    // Fill every view's image — views not offered for this colour just reuse
    // the front photo, so nothing breaks if something still references them.
    ALL_VIEWS.forEach((view) => {
      const src = color.images[view] || color.images.front;
      frameEls[view].src = src;
      frameEls[view].alt = `${PRODUCT.name} — ${color.label} — ${view} view`;
      if (thumbImgs[view]) {
        thumbImgs[view].src = src;
        thumbImgs[view].alt = `${color.label} — ${view} view thumbnail`;
      }
    });

    // Show only the thumbnails / dots this colour actually has photography for.
    const multiView = currentViews.length > 1;
    thumbButtons.forEach((t) => {
      t.style.display = currentViews.includes(t.dataset.view) ? "" : "none";
    });
    dots.forEach((d, i) => { d.style.display = i < currentViews.length ? "" : "none"; });
    if (thumbRow) thumbRow.style.display = multiView ? "" : "none";
    if (galleryHint) galleryHint.style.display = multiView ? "" : "none";
    if (galleryLabel) galleryLabel.style.display = multiView ? "" : "none";
  }

  function showFrame(index) {
    if (currentViews.length <= 1) { frameIndex = 0; }
    else {
      frameIndex = ((index % currentViews.length) + currentViews.length) % currentViews.length;
    }
    const view = currentViews[frameIndex];
    Object.values(frameWrappers).forEach((el) => el.classList.remove("active"));
    frameWrappers[view].classList.add("active");
    dots.forEach((d, i) => d.classList.toggle("active", i === frameIndex));
    thumbButtons.forEach((t) => t.classList.toggle("active", t.dataset.view === view));
    if (galleryLabel) galleryLabel.textContent = view;
  }

  function startAutoCycle() {
    clearInterval(autoTimer);
    autoTimer = setInterval(() => {
      if (!userHasInteracted && currentViews.length > 1) showFrame(frameIndex + 1);
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

  /* ---------- Thumbnail clicks (jump straight to that view) ---------- */
  thumbButtons.forEach((thumb) => {
    thumb.addEventListener("click", () => {
      stopAutoCycle();
      const view = thumb.dataset.view;
      showFrame(currentViews.indexOf(view));
    });
  });

  /* ---------- Color swatches ---------- */
  const customColorField = document.querySelector(".custom-color-field");
  const customColorInput = document.querySelector(".custom-color-input");

  document.querySelectorAll(".color-swatch").forEach((swatch) => {
    swatch.addEventListener("click", () => {
      const colorKey = swatch.dataset.color;
      document.querySelectorAll(".color-swatch").forEach((s) => s.classList.remove("active"));
      swatch.classList.add("active");

      if (colorKey === "other") {
        // Custom colour: show the text field, keep showing the current photos
        // (no photography exists for an arbitrary typed colour).
        customColorField?.classList.add("show");
        const nameEl = document.querySelector(".selected-color-name");
        if (nameEl) nameEl.textContent = "Custom (specify below)";
        customColorInput?.focus();
        return;
      }

      customColorField?.classList.remove("show");
      currentColor = colorKey;
      const nameEl = document.querySelector(".selected-color-name");
      if (nameEl) nameEl.textContent = PRODUCT.colors[colorKey].label;
      loadColorImages(colorKey);
      showFrame(frameIndex); // keep same view (e.g. stay on "back") but with new color
    });
  });

  /* ---------- Size dropdown ---------- */
  const sizeDropdown = document.querySelector(".size-dropdown");
  if (sizeDropdown) {
    const sizeBtn = sizeDropdown.querySelector(".size-dropdown-btn");
    const sizeValue = sizeDropdown.querySelector(".size-dropdown-value");
    sizeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      sizeDropdown.classList.toggle("open");
    });
    document.addEventListener("click", () => sizeDropdown.classList.remove("open"));
    document.querySelectorAll(".size-dropdown-option:not(.disabled)").forEach((opt) => {
      opt.addEventListener("click", () => {
        document.querySelectorAll(".size-dropdown-option").forEach((o) => o.classList.remove("active"));
        opt.classList.add("active");
        sizeValue.textContent = opt.textContent.trim();
        sizeDropdown.classList.remove("open");
      });
    });
  }

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
      qty = Math.min(50, qty + 1);
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
