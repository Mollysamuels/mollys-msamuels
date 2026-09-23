// ============================================
// HOMEPAGE — real products, prepended before the static placeholder cards
// New Arrivals: is_new = true, any division
// Mollys Featured: division = mollys, is_featured = true
// M. Samuels Featured: division = msamuels, is_featured = true
// ============================================

function renderHomeCard(p) {
  const link = `product.html?id=${p.id}`;
  const swatches = (p.product_colors || []).slice(0, 3)
    .map((c) => `<span style="background:${c.hex_code || '#ccc'}"></span>`).join("");
  const fallbackImg = p.division === "msamuels" ? "assets/images/category/msamuels-product.jpg" : "assets/images/category/mollys-product.jpg";
  const firstColor = (p.product_colors && p.product_colors[0]) || null;
  const img = (firstColor && firstColor.front_image_url) || fallbackImg;

  return `
    <div class="product-card">
      <div class="product-media">
        <span class="product-tag">New</span>
        <button class="wish-btn" aria-label="Add to wishlist"><svg viewBox="0 0 24 24" fill="none"><path d="M12 20s-7.5-4.7-9.6-9.1C1 7.6 2.7 4.5 6 4c2-.3 3.6.7 6 3 2.4-2.3 4-3.3 6-3 3.3.5 5 3.6 3.6 6.9C19.5 15.3 12 20 12 20z" stroke="currentColor" stroke-width="1.5"/></svg></button>
        <a href="${link}"><img class="main" src="${img}" alt="${p.name}"><img class="alt" src="${img}" alt=""></a>
        <button class="quick-add">Quick add</button>
      </div>
      <div class="product-info">
        <a href="${link}" style="color:inherit;"><h4>${p.name}</h4></a>
        <div class="product-price"><span class="now">₦${Number(p.price_ngn).toLocaleString()}</span></div>
        ${swatches ? `<div class="swatches">${swatches}</div>` : ""}
      </div>
    </div>`;
}

async function fetchAndPrepend(gridId, filterFn) {
  const grid = document.getElementById(gridId);
  if (!grid) return;

  try {
    const { data, error } = await supabaseClient
      .from("products")
      .select("*, product_colors(*)")
      .neq("status", "discontinued");

    if (error || !data) return;
    const matching = data.filter(filterFn);
    if (!matching.length) return; // nothing real yet — leave the static placeholder cards as-is

    grid.insertAdjacentHTML("afterbegin", matching.map(renderHomeCard).join(""));
    wireCardInteractions(grid);
  } catch (e) {
    console.error(`Homepage: fetch for #${gridId} failed, showing placeholders only:`, e);
  }
}

function wireCardInteractions(scope) {
  scope.querySelectorAll(".quick-add").forEach((btn) => {
    if (btn.dataset.wired) return;
    btn.dataset.wired = "1";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const toast = document.querySelector(".toast");
      if (toast) { toast.querySelector("span").textContent = "Added to cart"; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 2400); }
      const badge = document.querySelector(".cart-badge");
      if (badge) badge.textContent = parseInt(badge.textContent || "0", 10) + 1;
    });
  });
  scope.querySelectorAll(".wish-btn").forEach((btn) => {
    if (btn.dataset.wired) return;
    btn.dataset.wired = "1";
    btn.addEventListener("click", (e) => { e.preventDefault(); btn.classList.toggle("active"); });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // New Arrivals is Mollys-only — M. Samuels' uniform-focused products
  // don't fit a "new arrivals" fashion concept, per the boss's direction.
  fetchAndPrepend("newArrivalsGrid", (p) => p.is_new && p.division === "mollys");
  fetchAndPrepend("mollysFeaturedGrid", (p) => p.division === "mollys" && p.is_featured);
  fetchAndPrepend("msamuelsFeaturedGrid", (p) => p.division === "msamuels" && p.is_featured);
});
