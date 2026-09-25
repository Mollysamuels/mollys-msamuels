// ============================================
// CATEGORY LISTING PAGE — reusable for every category
// via category.html?category=<slug>
// ============================================

// M. Samuels categories, grouped by section — used both to detect division
// and to pick the correct section banner (Boys/Girls/Accessories/Bespoke).
const BOYS_SLUGS = new Set([
  "unisex-blazers", "boys-shirts", "boys-trousers-and-shorts", "t-shirts-and-polo-shirts",
  "sweatshirts-and-bottoms", "knitwear-and-fleeces", "pe-shorts", "boys-swimwear",
  "socks-and-sport-socks", "jackets-and-coats", "rugby-jerseys", "joggers", "sportswear",
]);
const GIRLS_SLUGS = new Set([
  "girls-blazers", "blouses", "girls-blouses", "skirts-and-pinafores", "tartans", "girls-trousers",
  "socks-and-tights", "girls-swimwear", "summer-dresses", "pe-shorts-and-skorts",
  "leggings-and-leotards", "multicultural-clothing",
]);
const ACCESSORIES_SLUGS = new Set([
  "school-bags", "plimsolls", "shin-guards-and-gum-shields", "swimwear-accessories",
  "hair-accessories", "aprons-and-lab-coats", "caps", "hats-and-scarves",
  "name-tab-kit-and-hem-web-kit", "ties", "water-bottles", "knitwear-and-cardigans",
]);
const BESPOKE_SLUGS = new Set([
  "bespoke-blazers-and-jackets", "bespoke-shirts-and-blouses", "bespoke-knitwear",
  "bespoke-tartan-skirts-and-pinafores",
]);
const MSAMUELS_SLUGS = new Set([...BOYS_SLUGS, ...GIRLS_SLUGS, ...ACCESSORIES_SLUGS, ...BESPOKE_SLUGS]);

function getMsamuelsSection(slug) {
  if (BOYS_SLUGS.has(slug)) return "boys";
  if (GIRLS_SLUGS.has(slug)) return "girls";
  if (ACCESSORIES_SLUGS.has(slug)) return "accessories";
  if (BESPOKE_SLUGS.has(slug)) return "bespoke";
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
    // The very first Unisex Blazers card links to the fully-built rich
    // demo page instead of the generic template, so there's at least one
    // complete example of the full pattern (multi-view gallery, real
    // colour photos) reachable from an actual category page.
    const isRichDemo = slug === "unisex-blazers" && i === 0;

    products.push({
      name: isRichDemo ? "School Blazer" : `${name} — ${styleLabels[i % styleLabels.length]}`,
      price: isRichDemo ? 35500 : basePrice + i * 1500,
      img1, img2,
      slug: `${slug}-${i + 1}`,
      division,
      category: slug,
      linkOverride: isRichDemo ? "product.html?item=blazer-classic" : null,
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
  return `product.html?${params.toString()}`;
}

function renderProductCard(product) {
  const link = buildProductLink(product);
  return `
    <div class="product-card">
      <div class="product-media">
        <button class="wish-btn" aria-label="Add to wishlist">
          <svg viewBox="0 0 24 24" fill="none"><path d="M12 20s-7.5-4.7-9.6-9.1C1 7.6 2.7 4.5 6 4c2-.3 3.6.7 6 3 2.4-2.3 4-3.3 6-3 3.3.5 5 3.6 3.6 6.9C19.5 15.3 12 20 12 20z" stroke="currentColor" stroke-width="1.5"/></svg>
        </button>
        <a href="${link}">
          <img class="main" src="${product.img1}" alt="${product.name}">
          <img class="alt" src="${product.img2}" alt="${product.name}, alternate view">
        </a>
        <button class="quick-add">Quick add</button>
      </div>
      <div class="product-info">
        <a href="${link}" style="color:inherit;"><h4>${product.name}</h4></a>
        <div class="product-price"><span class="now">₦${product.price.toLocaleString()}</span></div>
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
  const grid = document.getElementById("catProductGrid");
  if (!grid) return; // not on category.html

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("category") || "gowns";
  const division = MSAMUELS_SLUGS.has(slug) ? "msamuels" : "mollys";
  const name = titleCaseFromSlug(slug);

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
      .select("*, categories!inner(slug)")
      .eq("categories.slug", slug)
      .neq("status", "discontinued");

    if (!error && data && data.length > 0) {
      currentProducts = data.map((p) => {
        const fallbackImg = division === "msamuels" ? "assets/images/category/msamuels-product.jpg" : "assets/images/category/mollys-product.jpg";
        return {
          name: p.name, price: p.price_ngn, division: p.division, category: slug,
          img1: p.main_image_url || fallbackImg,
          img2: p.alt_image_url || p.main_image_url || fallbackImg,
          linkOverride: `product.html?id=${p.id}`,
        };
      });
    }
  } catch (e) {
    console.error("Supabase category fetch failed, using placeholders:", e);
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
    breadcrumbDivision.href = division === "msamuels" ? "msamuels.html" : "mollys.html";
  }
  const breadcrumbCurrent = document.getElementById("catBreadcrumbCurrent");
  if (breadcrumbCurrent) breadcrumbCurrent.textContent = name;

  // Swap the header logo to the M. Samuels logo image on M. Samuels categories;
  // stays as the standard "Molly Samuels" wordmark on Mollys categories.
  const headerLogo = document.getElementById("catHeaderLogo");
  if (headerLogo && division === "msamuels") {
    headerLogo.href = "msamuels.html";
    headerLogo.classList.add("ms-section-logo");
    headerLogo.innerHTML = '<img src="assets/images/msamuels/logo.png" alt="M. Samuels">';
  }

  const bannerImg = document.getElementById("catBannerImg");
  if (bannerImg) {
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
  if (countEl) countEl.textContent = `${currentProducts.length} products`;
  renderGrid(currentProducts);

  const sortSelect = document.getElementById("catSort");
  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      let sorted = [...currentProducts];
      if (sortSelect.value === "price-low") sorted.sort((a, b) => a.price - b.price);
      else if (sortSelect.value === "price-high") sorted.sort((a, b) => b.price - a.price);
      renderGrid(sorted);
    });
  }
});
