// ============================================
// new-live.js - New Arrivals page + "New this season" row on the Mollys page
// Shows your newest real Mollys products (newest first). Sold-out and
// discontinued products are left out. Prices carry data-price-ngn so they
// switch between Naira and Pounds instantly. If the products can't be loaded,
// the old cards stay as they were.
// ============================================
(function () {
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  async function fetchNewest(limit) {
    var url = MS_SUPABASE_URL + "/rest/v1/products?select=*,product_colors(*),product_sizes(in_stock)" +
      "&status=eq.active&division=eq.mollys&order=created_at.desc&limit=" + (limit * 2);
    var res = await fetch(url, { headers: { apikey: MS_SUPABASE_ANON } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    var rows = await res.json();
    return rows.filter(function (p) { return !isSoldOutProduct(p); }).slice(0, limit);
  }

  function card(p) {
    var link = "product?id=" + encodeURIComponent(p.id);
    var swatches = (p.product_colors || []).slice(0, 3).map(function (c) { return '<span style="background:' + esc(c.hex_code || "#ccc") + '"></span>'; }).join("");
    var fallback = "assets/images/category/mollys-product.jpg";
    var img = cardImg(p.main_image_url) || fallback;
    var alt = cardImg(p.alt_image_url) || img;
    return '<div class="product-card">' +
      '<div class="product-media"><span class="product-tag">New</span>' +
      '<button class="wish-btn" aria-label="Add to wishlist"><svg viewBox="0 0 24 24" fill="none"><path d="M12 20s-7.5-4.7-9.6-9.1C1 7.6 2.7 4.5 6 4c2-.3 3.6.7 6 3 2.4-2.3 4-3.3 6-3 3.3.5 5 3.6 3.6 6.9C19.5 15.3 12 20 12 20z" stroke="currentColor" stroke-width="1.5"/></svg></button>' +
      '<a href="' + link + '"><img class="main" src="' + esc(img) + '" alt="' + esc(p.name) + '" loading="lazy" decoding="async">' + altImgTag(alt, img, "") + '</a>' +
      '<button class="quick-add">Quick add</button></div>' +
      '<div class="product-info"><a href="' + link + '" style="color:inherit;"><h4>' + esc(p.name) + '</h4></a>' +
      '<div class="product-price"><span class="now" data-price-ngn="' + Number(p.price_ngn) + '">' + formatPrice(p.price_ngn) + '</span></div>' +
      (swatches ? '<div class="swatches">' + swatches + '</div>' : "") + '</div></div>';
  }

  function wire(scope) {
    scope.querySelectorAll(".quick-add").forEach(function (btn) {
      btn.addEventListener("click", function (e) { e.preventDefault(); var c = btn.closest(".product-card"); if (c) addToCartFromCard(c); });
    });
    scope.querySelectorAll(".wish-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) { e.preventDefault(); var c = btn.closest(".product-card"); if (c) toggleWishlistFromCard(c, btn); });
    });
  }

  async function fill(id, limit, autoAlt) {
    var grid = document.getElementById(id);
    if (!grid) return;
    try {
      await loadExchangeRate();
      var list = await fetchNewest(limit);
      if (!list.length) return;                       // nothing real yet: leave the old cards
      grid.innerHTML = list.map(card).join("");
      wire(grid);
      refreshAllPrices();
      if (autoAlt) grid.querySelectorAll(".product-card").forEach(function (c, i) {
        setInterval(function () { c.classList.toggle("auto-alt"); }, 2600 + i * 350);
      });
    } catch (e) { console.error("New products could not be loaded, keeping the old cards:", e); }
  }

  document.addEventListener("DOMContentLoaded", function () {
    fill("newArrivalsGrid", 48, true);
    fill("moScrollTrack", 12, false);
  });
})();
