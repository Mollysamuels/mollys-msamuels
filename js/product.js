// ============================================
// PRODUCT PAGE JAVASCRIPT
// ============================================
// Every product — including the former "blazer demo" — now works the same
// way: one product-level main photo + one alt photo (never tied to colour),
// colours are simple name+swatch order-instructions with no images of their
// own, and sizing works exactly as it already did. This removes the old
// blazer-only special case entirely, and makes the "editing wipes the photo"
// bug structurally impossible, since colour edits never touch image fields
// at all anymore.

document.addEventListener("DOMContentLoaded", async function () {

  const params = new URLSearchParams(window.location.search);
  const supabaseId = params.get("id");

  let isLiveProduct = false;
  let liveSizes = null; // [{label, inStock}] when loaded from Supabase

  let PRODUCT;
  if (supabaseId) {
    isLiveProduct = true;
    const { data, error } = await supabaseClient
      .from("products")
      .select("*, categories(slug), product_colors(*), product_sizes(*)")
      .eq("id", supabaseId)
      .single();

    if (error || !data) {
      console.error("Supabase product fetch failed:", error);
      PRODUCT = { name: "Product not found", division: "mollys", category: "", price: 0, currency: "₦",
        mainImage: "assets/images/category/mollys-product.svg", altImage: "", colorList: [] };
    } else if (data.status === "discontinued") {
      PRODUCT = { name: "This product is no longer available", division: data.division, category: "", price: 0, currency: "₦",
        mainImage: "assets/images/category/mollys-product.svg", altImage: "", colorList: [] };
    } else {
      const fallbackImg = data.division === "msamuels" ? "assets/images/category/msamuels-product.svg" : "assets/images/category/mollys-product.svg";
      liveSizes = (data.product_sizes || []).map((s) => ({ label: s.size_label, inStock: s.in_stock }));

      PRODUCT = {
        name: data.name, division: data.division, category: (data.categories && data.categories.slug) || "",
        price: data.price_ngn, currency: "₦",
        description: data.description, sizeType: data.size_type,
        mainImage: data.main_image_url || fallbackImg,
        altImage: data.alt_image_url || data.main_image_url || fallbackImg,
        colorList: (data.product_colors || []).map((c) => ({ name: c.color_name, hex: c.hex_code || "#000000" })),
      };
    }
  } else {
    // Generic product, built from what a category/shop card passed in the URL —
    // used for anything not in Supabase yet.
    const division = params.get("division") || "mollys";
    const category = params.get("category") || "";
    const name = params.get("name") ? decodeURIComponent(params.get("name")) : "Product not found";
    const price = parseInt(params.get("price"), 10) || 0;
    const img1 = params.get("img1") ? decodeURIComponent(params.get("img1")) : (division === "msamuels" ? "assets/images/category/msamuels-product.svg" : "assets/images/category/mollys-product.svg");

    PRODUCT = { name, division, category, price, currency: "₦", mainImage: img1, altImage: img1, colorList: [] };
  }

  /* ---------- Header logo: swap to the M. Samuels logo on M. Samuels products ---------- */
  const headerLogo = document.getElementById("prodHeaderLogo");
  if (headerLogo && PRODUCT.division === "msamuels") {
    headerLogo.href = "msamuels.html";
    headerLogo.classList.add("ms-section-logo");
    headerLogo.innerHTML = '<img src="assets/images/msamuels/logo.png" alt="M. Samuels">';
  }

  /* ---------- Floating M. Samuels dashboard button: only on M. Samuels products ---------- */
  const prodFab = document.getElementById("prodMsFab");
  if (prodFab) prodFab.style.display = PRODUCT.division === "msamuels" ? "flex" : "none";

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

  /* ---------- Colour swatches — pure order-instructions, never affect the photo ---------- */
  const colorRow = document.getElementById("colorSwatchesRow");
  const selectedColorNameEl = document.querySelector(".selected-color-name");
  let selectedColor = null;

  if (colorRow) {
    if (PRODUCT.colorList.length > 0) {
      const buttons = PRODUCT.colorList.map((c, i) => `
        <button class="color-swatch${i === 0 ? " active" : ""}" data-color="${c.name}" aria-label="${c.name}">
          <span class="swatch-fill" style="background:${c.hex};"></span>
        </button>`).join("");
      colorRow.innerHTML = buttons + `
        <button class="color-swatch color-swatch-other" data-color="other" aria-label="Other — specify your own colour">
          <span class="swatch-fill swatch-other-fill">+</span>
        </button>`;
      selectedColor = PRODUCT.colorList[0].name;
      if (selectedColorNameEl) selectedColorNameEl.textContent = selectedColor;
    } else {
      colorRow.innerHTML = `
        <button class="color-swatch color-swatch-other active" data-color="other" aria-label="Other — specify your own colour">
          <span class="swatch-fill swatch-other-fill">+</span>
        </button>`;
      if (selectedColorNameEl) selectedColorNameEl.textContent = "Specify below";
      document.querySelector(".custom-color-field")?.classList.add("show");
    }

    colorRow.querySelectorAll(".color-swatch").forEach((swatch) => {
      swatch.addEventListener("click", () => {
        colorRow.querySelectorAll(".color-swatch").forEach((s) => s.classList.remove("active"));
        swatch.classList.add("active");
        const customColorField = document.querySelector(".custom-color-field");
        if (swatch.dataset.color === "other") {
          customColorField?.classList.add("show");
          if (selectedColorNameEl) selectedColorNameEl.textContent = "Custom (specify below)";
          document.querySelector(".custom-color-input")?.focus();
          selectedColor = "other";
          return;
        }
        customColorField?.classList.remove("show");
        selectedColor = swatch.dataset.color;
        if (selectedColorNameEl) selectedColorNameEl.textContent = selectedColor;
        // Deliberately does NOT touch the photo — colour here is purely
        // what gets written on the order, not a different picture.
      });
    });
  }

  /* ---------- Size dropdown: real products use real sizes + real stock from Supabase ---------- */
  if (isLiveProduct && liveSizes && liveSizes.length) {
    const sizeLabel = document.getElementById("sizeLabel");
    const menu = document.getElementById("sizeDropdownMenu");
    const valueEl = document.querySelector(".size-dropdown-value");
    const LABELS = { clothing: "Size", chest: "Chest size (in)", collar: "Collar size (in)", age: "Age", shoe: "Shoe size (UK)", onesize: "Size" };
    if (sizeLabel) sizeLabel.textContent = LABELS[PRODUCT.sizeType] || "Size";
    const firstInStock = liveSizes.find((s) => s.inStock) || liveSizes[0];
    if (menu) {
      menu.innerHTML = liveSizes.map((s) =>
        `<button class="size-dropdown-option${s === firstInStock ? " active" : ""}${s.inStock ? "" : " disabled"}" ${s.inStock ? `data-size="${s.label}"` : "disabled"}>${s.label}${s.inStock ? "" : " — sold out"}</button>`
      ).join("");
    }
    if (valueEl) valueEl.textContent = firstInStock.label;
  } else {
    const ONE_SIZE_SLUGS = new Set([
      "school-bags", "ties", "water-bottles", "hair-accessories",
      "name-tab-kit-and-hem-web-kit", "hats-and-scarves", "swimwear-accessories",
      "shin-guards-and-gum-shields", "caps", "socks-and-sport-socks", "socks-and-tights",
    ]);
    const SHOE_SLUGS = new Set(["plimsolls"]);
    const AGE_RANGE_SLUGS = new Set([
      "skirts-and-pinafores", "tartans", "summer-dresses", "leggings-and-leotards",
      "multicultural-clothing", "pe-shorts-and-skorts", "boys-swimwear", "girls-swimwear",
      "pe-shorts", "girls-trousers", "boys-trousers-and-shorts", "bespoke-tartan-skirts-and-pinafores",
    ]);

    const sizeBlock = document.querySelector(".size-dropdown")?.closest(".option-block");
    const sizeLabel = document.getElementById("sizeLabel");
    const menu = document.getElementById("sizeDropdownMenu");
    const valueEl = document.querySelector(".size-dropdown-value");
    const sizeDropdownEl = document.querySelector(".size-dropdown");

    if (ONE_SIZE_SLUGS.has(PRODUCT.category)) {
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
      } else if (AGE_RANGE_SLUGS.has(PRODUCT.category)) {
        labelText = "Age";
        sizeOptions = ["3/4", "4/5", "5/6", "6/7", "7/8", "8/9", "9/10", "10/11", "11/12", "12/13", "13/14", "15/16", "17/18"];
      } else if (PRODUCT.category.includes("shirt") && !PRODUCT.category.includes("sweatshirt")) {
        labelText = "Collar size (in)";
        sizeOptions = ["11", "11½", "12", "12½", "13", "13½", "14", "14½", "15", "15½", "16", "16½", "17"];
      } else {
        labelText = "Chest size (in)";
        sizeOptions = ["24", "26", "28", "30", "32", "34", "36", "38", "40", "42", "44", "46"];
      }

      if (sizeLabel) sizeLabel.textContent = labelText;
      if (menu) {
        const noSuffix = PRODUCT.division === "mollys" || labelText.includes("Shoe") || labelText.includes("Age");
        const suffix = noSuffix ? "" : " in";
        menu.innerHTML = sizeOptions.map((s, i) =>
          `<button class="size-dropdown-option${i === 0 ? " active" : ""}" data-size="${s}">${s}${labelText.includes("Age") ? " yrs" : suffix}</button>`
        ).join("");
      }
      if (valueEl) {
        const noSuffix = PRODUCT.division === "mollys" || labelText.includes("Shoe") || labelText.includes("Age");
        valueEl.textContent = sizeOptions[0] + (labelText.includes("Age") ? " yrs" : (noSuffix ? "" : " in"));
      }
    }
  }

  /* ---------- Description / Product Details ---------- */
  if (isLiveProduct && PRODUCT.description) {
    const descEl = document.getElementById("prodDescription");
    if (descEl) descEl.textContent = PRODUCT.description;
  } else {
    const descEl = document.getElementById("prodDescription");
    if (descEl) {
      descEl.textContent = PRODUCT.division === "msamuels"
        ? `A ${PRODUCT.name.toLowerCase()} made for daily school wear — durable fabric, built to handle regular washing and everyday use.`
        : `${PRODUCT.name} — a considered piece from the Mollys collection, selected for everyday style.`;
    }
    const detailsEl = document.getElementById("prodDetails");
    if (detailsEl) {
      detailsEl.innerHTML = PRODUCT.division === "msamuels"
        ? `<ul><li>Fabric: durable, easy-care blend</li><li>Fit: true to size</li><li>Care: machine washable</li><li>Custom school branding available on request</li></ul>`
        : `<ul><li>Fabric: quality blend, selected for comfort</li><li>Fit: true to size</li><li>Care: see garment label</li></ul>`;
    }
  }

  /* ---------- Gallery: one product-level photo, no per-colour switching ----------
     The multi-frame/dots/thumbnails/swipe machinery still exists in the HTML
     for layout reasons, but always shows a single photo now — nothing to
     cycle through, since colour never changes the picture anymore. */
  const gallery = document.querySelector(".gallery");
  if (!gallery) return; // not on a product page

  const frameEls = {
    front: gallery.querySelector('[data-view="front"] img'),
    back: gallery.querySelector('[data-view="back"] img'),
    model: gallery.querySelector('[data-view="model"] img'),
  };
  const dots = gallery.querySelectorAll(".gallery-dots span");
  const galleryHint = gallery.querySelector(".gallery-hint");
  const galleryLabel = gallery.querySelector(".gallery-label");
  const thumbRow = document.querySelector(".thumbnail-row");
  const thumbButtons = document.querySelectorAll(".thumbnail");

  if (frameEls.front) { frameEls.front.src = PRODUCT.mainImage; frameEls.front.alt = PRODUCT.name; }
  if (frameEls.back) { frameEls.back.src = PRODUCT.altImage; frameEls.back.alt = `${PRODUCT.name}, alternate view`; }
  if (frameEls.model) { frameEls.model.src = PRODUCT.mainImage; frameEls.model.alt = PRODUCT.name; }

  // Single view always — hide every multi-image control.
  thumbButtons.forEach((t) => { t.style.display = "none"; });
  dots.forEach((d) => { d.style.display = "none"; });
  if (thumbRow) thumbRow.style.display = "none";
  if (galleryHint) galleryHint.style.display = "none";
  if (galleryLabel) galleryLabel.style.display = "none";

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

  /* ---------- Info accordion tabs: handled globally by js/main.js ---------- */

  // Everything above is now correctly filled in — safe to show the page.
  document.body.style.visibility = "visible";

});
