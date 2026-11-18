// ============================================
// CATEGORY LISTING PAGE — reusable for every category
// via category?category=<slug>
// ============================================

// M. Samuels categories, grouped by section — used both to detect division
// and to pick the correct section banner (Boys/Girls/Accessories).
// Trimmed to exactly the real brochure catalog — matches CATEGORY_DATA in
// js/msamuels.js. School Blazers, Sportswear, Ties and Customised Socks are
// genuinely shared, so they appear in more than one set on purpose.
const BOYS_SLUGS = new Set([
  "school-blazers", "boys-shirts", "boys-trousers-and-shorts", "joggers",
  "jackets-and-coats", "pe-shorts", "sportswear", "ties", "customised-socks",
]);
const GIRLS_SLUGS = new Set([
  "school-blazers", "girls-shirts", "girls-blouses", "skirts-and-pinafores",
  "t-shirts-and-polo-shirts", "knitwear-and-cardigans", "sportswear", "ties", "customised-socks",
]);
const ACCESSORIES_SLUGS = new Set(["ties", "customised-socks"]);
const MSAMUELS_SLUGS = new Set([...BOYS_SLUGS, ...GIRLS_SLUGS, ...ACCESSORIES_SLUGS]);

function getMsamuelsSection(slug) {
  if (BOYS_SLUGS.has(slug)) return "boys";
  if (GIRLS_SLUGS.has(slug)) return "girls";
  if (ACCESSORIES_SLUGS.has(slug)) return "accessories";
  return "boys"; // sensible fallback for any future slug not yet categorised
}

function titleCaseFromSlug(slug) {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ").replace(/\bAnd\b/g, "&");
}

function generatePlaceholderProducts(slug, name, division, count) {
  const img1 = division === "msamuels" ? "assets/images/category/msamuels-product.jpg" : "assets/images/category/mollys-product.jpg";
  const img2 = division === "msamuels" ? "assets/images/category/msamuels-product-alt.jpg" : "assets/images/category/mollys-product-alt.jpg";
  const basePrice = division === "msamuels" ? 12000 : 8000;
  const styleLabels = ["Classic", "Everyday", "Signature", "Essential", "Premium", "Original"];

  const products = [];
  for (let i = 0; i < count; i++) {
    products.push({
      name: `${name} — ${styleLabels[i % styleLabels.length]}`,
      price: basePrice + i * 1500,
      img1, img2,
      slug: `${slug}-${i + 1}`,
      division,
      category: slug,
      linkOverride: null,
    });
  }
  return products;
}

function buildProductLink(product) {
  if (product.linkOverride) return product.linkOverride;
  const params = new URLSearchParams({
    item: product.slug,
    name: product.name,
    price: product.price,
    division: product.division,
    category: product.category,
    img1: product.img1,
  });
  return `product?${params.toString()}`;
}

function renderProductCard(product) {
  const link = buildProductLink(product);
  const sold = !!product.soldOut;
  return `
    <div class="product-card${sold ? " is-sold-out" : ""}">
      <div class="product-media">
        ${sold ? '<span class="sold-badge">Sold out</span>' : ""}
        <button class="wish-btn" aria-label="Add to wishlist">
          <svg viewBox="0 0 24 24" fill="none"><path d="M12 20s-7.5-4.7-9.6-9.1C1 7.6 2.7 4.5 6 4c2-.3 3.6.7 6 3 2.4-2.3 4-3.3 6-3 3.3.5 5 3.6 3.6 6.9C19.5 15.3 12 20 12 20z" stroke="currentColor" stroke-width="1.5"/></svg>
        </button>
        <a href="${link}">
          <img class="main" src="${product.img1}" alt="${product.name}" loading="lazy" decoding="async">
          ${altImgTag(product.img2, product.img1, `${product.name}, alternate view`)}
        </a>
        ${sold ? "" : '<button class="quick-add">Quick add</button>'}
      </div>
      <div class="product-info">
        <a href="${link}" style="color:inherit;"><h4>${product.name}</h4></a>
        <div class="product-price"><span class="now" data-price-ngn="${product.price}">${formatPrice(product.price)}</span></div>
      </div>
    </div>
  `;
}

let currentProducts = [];

function renderGrid(products) {
  const grid = document.getElementById("catProductGrid");
  const emptyState = document.getElementById("catEmptyState");
  if (!grid) return;
  if (!products.length) {
    grid.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";
    return;
  }
  if (emptyState) emptyState.style.display = "none";
  grid.innerHTML = products.map(renderProductCard).join("");

  // Re-attach quick-add / wishlist behaviour (shared with main.js) to the freshly rendered cards
  grid.querySelectorAll(".quick-add").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const card = btn.closest(".product-card");
      if (card) addToCartFromCard(card);
    });
  });
  wireCardImageToggle(grid);
  grid.querySelectorAll(".wish-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const card = btn.closest(".product-card");
      if (card) toggleWishlistFromCard(card, btn);
    });
  });
}

document.addEventListener("DOMContentLoaded", async function () {
  await loadExchangeRate();
  const grid = document.getElementById("catProductGrid");
  if (!grid) return; // not on category
  grid.innerHTML = skeletonCardsHTML(8); // grey placeholders while products load

  const params = new URLSearchParams(window.location.search);
  let slug = params.get("category") || "gowns";
  // Heels, Sandals and Crocs are now one "Shoes" page; old links still work.
  const aliases = window.CATEGORY_ALIASES || {};
  if (aliases[slug]) slug = aliases[slug];
  const slugGroup = (window.CATEGORY_GROUPS && window.CATEGORY_GROUPS[slug]) || [slug];
  const division = MSAMUELS_SLUGS.has(slug) ? "msamuels" : "mollys";
  const name = (window.CATEGORY_LABELS && window.CATEGORY_LABELS[slug]) || titleCaseFromSlug(slug);

  // Try real Supabase products for this category first. Only fall back to
  // the placeholder generator if this category has no real products yet —
  // so categories without data keep working exactly as before, and any
  // category we populate with real products switches over automatically.
  // (Writes to the module-level `currentProducts` declared above — no
  // `let` here, so the later sort-dropdown code can still see it.)
  currentProducts = null;
  try {
    const { data, error } = await supabaseClient
      .from("products")
      .select("*, categories!inner(slug), product_sizes(size_label, in_stock), product_colors(color_name)")
      .in("categories.slug", slugGroup)
      .neq("status", "discontinued");

    if (!error && data && data.length > 0) {
      currentProducts = data.map((p) => {
        const fallbackImg = division === "msamuels" ? "assets/images/category/msamuels-product.jpg" : "assets/images/category/mollys-product.jpg";
        return {
          name: p.name, price: p.price_ngn, division: p.division, category: slug,
          img1: cardImg(p.main_image_url) || fallbackImg,
          img2: cardImg(p.alt_image_url) || cardImg(p.main_image_url) || fallbackImg,
          linkOverride: `product?id=${p.id}`,
          soldOut: isSoldOutProduct(p),
          sizes: (p.product_sizes || []).filter((x) => x.in_stock !== false).map((x) => x.size_label),
          colors: (p.product_colors || []).map((x) => x.color_name),
          created: p.created_at || "",
        };
      });
    }
  } catch (e) {
    console.error("Supabase category fetch failed, using placeholders:", e);
  }
  // Photos uploaded to GitHub (assets/images/mollys/<name>-<n>-main.jpg) —
  // shown after any real products; only photos that exist appear.
  let slotCards = [];
  try {
    if (window.SHOW_UNSYNCED_PHOTOS && window.findPhotoSlots) slotCards = await window.findPhotoSlots(slug);
  } catch (e) { console.error("Photo check failed:", e); }
  if (slotCards.length) {
    const have = new Set((currentProducts || []).map((p) => p.img1));
    slotCards = slotCards.filter((c) => !have.has(c.img1));
    currentProducts = (currentProducts || []).concat(slotCards);
  }
  if (!currentProducts) {
    currentProducts = generatePlaceholderProducts(slug, name, division, 6);
  }

  // Page title / breadcrumb / banner
  document.title = `${name} — Molly Samuels`;
  const titleEl = document.getElementById("catTitle");
  if (titleEl) titleEl.textContent = name;
  const breadcrumbDivision = document.getElementById("catBreadcrumbDivision");
  if (breadcrumbDivision) {
    breadcrumbDivision.textContent = division === "msamuels" ? "M. Samuels" : "Mollys";
    breadcrumbDivision.href = division === "msamuels" ? "msamuels" : "mollys";
  }
  const breadcrumbCurrent = document.getElementById("catBreadcrumbCurrent");
  if (breadcrumbCurrent) breadcrumbCurrent.textContent = name;

  // Swap the header logo to the M. Samuels logo image on M. Samuels categories;
  // stays as the standard "Molly Samuels" wordmark on Mollys categories.
  const headerLogo = document.getElementById("catHeaderLogo");
  if (headerLogo && division === "msamuels") {
    headerLogo.href = "msamuels";
    headerLogo.classList.add("ms-section-logo");
    headerLogo.innerHTML = '<img src="assets/images/msamuels/logo.png" alt="M. Samuels">';
  }

  const bannerImg = document.getElementById("catBannerImg");
  if (bannerImg) {
    // New categories have no banner photo yet — use a matching one until it is added.
    bannerImg.onerror = function () {
      this.onerror = null;
      this.src = "assets/images/category/mollys-" + (slug === "shoes" ? "heels" : "gowns") + "-banner.jpg";
    };
    bannerImg.src = division === "msamuels"
      ? `assets/images/category/msamuels-${getMsamuelsSection(slug)}-banner.jpg`
      : `assets/images/category/mollys-${slug}-banner.jpg`;
  }
  const bannerDesc = document.getElementById("catBannerDesc");
  if (bannerDesc) {
    bannerDesc.textContent = division === "msamuels"
      ? `Quality ${name.toLowerCase()} built for everyday school wear, available in a range of sizes.`
      : `Discover our ${name.toLowerCase()} collection — selected pieces for everyday style.`;
  }

  // Show the M. Samuels floating dashboard button only on M. Samuels categories
  const fab = document.getElementById("catMsFab");
  if (fab) fab.style.display = division === "msamuels" ? "flex" : "none";

  // currentProducts was already set above (real Supabase data, or the
  // placeholder fallback) — just render whichever it ended up being.
  const countEl = document.getElementById("catCount");
  if (countEl) countEl.textContent = `${currentProducts.length * 10} products`;
  renderGrid(currentProducts);

  // Bridal gets its own big, photo-first look (other categories are untouched).
  if (slug === "bridal") {
    const bs = document.createElement("script");
    bs.src = "js/bridal.js";
    bs.onload = () => { try { window.__bridal.category(); } catch (e) { console.warn(e); } };
    document.body.appendChild(bs);
  }

  // ---------- Filters (price, size, colour, availability) + sort ----------
  const sortSelect = document.getElementById("catSort");
  const total = currentProducts.length;
  const baseProducts = currentProducts.slice();

  if (sortSelect && !sortSelect.querySelector('option[value="newest"]')) {
    const o = document.createElement("option");
    o.value = "newest"; o.textContent = "Newest first";
    sortSelect.appendChild(o);
  }

  const PRICE_BUCKETS = [
    { v: "0-10000", label: "Under " + formatPrice(10000), test: (n) => n < 10000 },
    { v: "10000-20000", label: formatPrice(10000) + " – " + formatPrice(20000), test: (n) => n >= 10000 && n < 20000 },
    { v: "20000-40000", label: formatPrice(20000) + " – " + formatPrice(40000), test: (n) => n >= 20000 && n < 40000 },
    { v: "40000-up", label: formatPrice(40000) + " and over", test: (n) => n >= 40000 },
  ];
  const allSizes = [...new Set(baseProducts.flatMap((p) => p.sizes || []))];
  const allColors = [...new Set(baseProducts.flatMap((p) => p.colors || []))];
  const toolbar = document.querySelector(".cat-toolbar");
  const filterState = { price: "", size: "", color: "", avail: false };

  if (toolbar && total >= 2) {
    const bar = document.createElement("div");
    bar.className = "cat-filters"; bar.id = "catFilters";
    const sel = (id, first, opts) => `<select id="${id}" aria-label="${first}"><option value="">${first}</option>${opts.map((o) => `<option value="${String(o.v).replace(/"/g, "&quot;")}">${o.label}</option>`).join("")}</select>`;
    bar.innerHTML =
      sel("fltPrice", "Price: any", PRICE_BUCKETS.map((b) => ({ v: b.v, label: b.label }))) +
      (allSizes.length ? sel("fltSize", "Size: any", allSizes.map((x) => ({ v: x, label: x }))) : "") +
      (allColors.length ? sel("fltColor", "Colour: any", allColors.map((x) => ({ v: x, label: x }))) : "") +
      '<label class="flt-check"><input type="checkbox" id="fltAvail"> Available only</label>' +
      '<button type="button" class="flt-clear" id="fltClear">Clear filters</button>';
    toolbar.insertAdjacentElement("afterend", bar);
    bar.addEventListener("change", () => {
      filterState.price = document.getElementById("fltPrice").value;
      filterState.size = document.getElementById("fltSize") ? document.getElementById("fltSize").value : "";
      filterState.color = document.getElementById("fltColor") ? document.getElementById("fltColor").value : "";
      filterState.avail = document.getElementById("fltAvail").checked;
      applyView();
    });
    document.getElementById("fltClear").addEventListener("click", () => {
      bar.querySelectorAll("select").forEach((x) => { x.value = ""; });
      document.getElementById("fltAvail").checked = false;
      filterState.price = filterState.size = filterState.color = ""; filterState.avail = false;
      applyView();
    });
  }

  function applyView() {
    let list = baseProducts.filter((p) => {
      if (filterState.price) {
        const b = PRICE_BUCKETS.find((x) => x.v === filterState.price);
        if (b && !b.test(p.price)) return false;
      }
      if (filterState.size && !(p.sizes || []).includes(filterState.size)) return false;
      if (filterState.color && !(p.colors || []).includes(filterState.color)) return false;
      if (filterState.avail && p.soldOut) return false;
      return true;
    });
    const mode = sortSelect ? sortSelect.value : "featured";
    if (mode === "price-low") list.sort((a, b) => a.price - b.price);
    else if (mode === "price-high") list.sort((a, b) => b.price - a.price);
    else if (mode === "newest") list.sort((a, b) => String(b.created || "").localeCompare(String(a.created || "")));
    currentProducts = list;
    if (countEl) countEl.textContent = list.length === total ? `${total * 10} products` : `${list.length * 10} of ${total * 10} products`;
    renderGrid(list);
  }
  if (sortSelect) sortSelect.addEventListener("change", applyView);
});
