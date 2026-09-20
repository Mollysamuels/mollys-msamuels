// ============================================
// CATEGORY LISTING PAGE — reusable for every category
// via category.html?category=<slug>
// ============================================

// Every M. Samuels category slug, so we can tell at a glance which
// division a given category belongs to (anything not in this set
// is treated as a Mollys category).
const MSAMUELS_SLUGS = new Set([
  "unisex-blazers", "boys-shirts", "boys-trousers-and-shorts", "t-shirts-and-polo-shirts",
  "sweatshirts-and-bottoms", "knitwear-and-fleeces", "pe-shorts", "boys-swimwear",
  "socks-and-sport-socks", "jackets-and-coats", "rugby-jerseys",
  "girls-blazers", "blouses", "skirts-and-pinafores", "tartans", "girls-trousers",
  "socks-and-tights", "girls-swimwear", "summer-dresses", "pe-shorts-and-skorts",
  "leggings-and-leotards", "multicultural-clothing",
  "school-bags", "plimsolls", "shin-guards-and-gum-shields", "swimwear-accessories",
  "hair-accessories", "aprons-and-lab-coats", "caps", "hats-and-scarves",
  "name-tab-kit-and-hem-web-kit", "ties", "water-bottles",
  "bespoke-blazers-and-jackets", "bespoke-shirts-and-blouses", "bespoke-knitwear",
  "bespoke-tartan-skirts-and-pinafores",
]);

function titleCaseFromSlug(slug) {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ").replace(/\bAnd\b/g, "&");
}

function generatePlaceholderProducts(slug, name, division, count) {
  const img1 = division === "msamuels" ? "assets/images/category/msamuels-product.svg" : "assets/images/category/mollys-product.svg";
  const img2 = division === "msamuels" ? "assets/images/category/msamuels-product-alt.svg" : "assets/images/category/mollys-product-alt.svg";
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
      name: isRichDemo ? "Tailored Corporate Blazer" : `${name} — ${styleLabels[i % styleLabels.length]}`,
      price: isRichDemo ? 32000 : basePrice + i * 1500,
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
      const toast = document.querySelector(".toast");
      if (toast) {
        toast.querySelector("span").textContent = "Added to cart";
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 2400);
      }
      const badge = document.querySelector(".cart-badge");
      if (badge) badge.textContent = parseInt(badge.textContent || "0", 10) + 1;
    });
  });
  grid.querySelectorAll(".wish-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      btn.classList.toggle("active");
    });
  });
}

document.addEventListener("DOMContentLoaded", function () {
  const grid = document.getElementById("catProductGrid");
  if (!grid) return; // not on category.html

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("category") || "gowns";
  const division = MSAMUELS_SLUGS.has(slug) ? "msamuels" : "mollys";
  const name = titleCaseFromSlug(slug);

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
      ? "assets/images/category/msamuels-banner.svg"
      : "assets/images/category/mollys-banner.svg";
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

  // Generate and render placeholder products (6 per category, demo data)
  currentProducts = generatePlaceholderProducts(slug, name, division, 6);
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
