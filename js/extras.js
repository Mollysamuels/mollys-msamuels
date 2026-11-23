// ============================================
// extras.js — real "You may also like" suggestions + Recently viewed
// Loaded automatically by js/main.js. Pages call it through whenExtras().
// ============================================
(function () {
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }
  var HEART = '<svg viewBox="0 0 24 24" fill="none"><path d="M12 20s-7.5-4.7-9.6-9.1C1 7.6 2.7 4.5 6 4c2-.3 3.6.7 6 3 2.4-2.3 4-3.3 6-3 3.3.5 5 3.6 3.6 6.9C19.5 15.3 12 20 12 20z" stroke="currentColor" stroke-width="1.5"/></svg>';

  // What to suggest alongside each Mollys category ("complete the look"). M. Samuels never uses this —
  // it only ever suggests other M. Samuels products.
  var RELATED = {
    gowns: ["shoes", "bags", "jewellery"],
    bridal: ["jewellery", "shoes", "bags"],
    tops: ["jeans", "shoes", "bags"],
    "two-piece": ["shoes", "bags", "jewellery"],
    shoes: ["bags", "jewellery", "gowns", "tops"],
    bags: ["shoes", "jewellery"],
    jewellery: ["gowns", "tops"],
    jeans: ["tops", "shoes"]
  };
  function group(slug) { return ({ heels: "shoes", sandals: "shoes", crocs: "shoes" })[slug] || slug || ""; }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  function cardHTML(p) {
    var fallback = p.division === "msamuels" ? "assets/images/category/msamuels-product.jpg" : "assets/images/category/mollys-product.jpg";
    var img = cardImg(p.img) || fallback;
    var alt = cardImg(p.alt) || "";
    var link = p.link || ("product?id=" + encodeURIComponent(p.id));
    var sold = !!p.soldOut;
    return '<div class="product-card' + (sold ? " is-sold-out" : "") + '"><div class="product-media">' +
      (sold ? '<span class="sold-badge">Sold out</span>' : "") +
      '<button class="wish-btn" aria-label="Add to wishlist">' + HEART + '</button>' +
      '<a href="' + esc(link) + '"><img class="main" src="' + esc(img) + '" alt="' + esc(p.name) + '" loading="lazy" decoding="async">' +
      altImgTag(alt, img, esc(p.name) + ", alternate view") + '</a>' +
      (sold ? "" : '<button class="quick-add">Quick add</button>') + '</div>' +
      '<div class="product-info"><a href="' + esc(link) + '" style="color:inherit;"><h4>' + esc(p.name) + '</h4></a>' +
      '<div class="product-price"><span class="now" data-price-ngn="' + Number(p.price || 0) + '">' + formatPrice(Number(p.price || 0)) + '</span></div></div></div>';
  }
  function wireCards(root) {
    root.querySelectorAll(".quick-add").forEach(function (b) {
      b.addEventListener("click", function (e) { e.preventDefault(); var c = b.closest(".product-card"); if (c) addToCartFromCard(c); });
    });
    root.querySelectorAll(".wish-btn").forEach(function (b) {
      b.addEventListener("click", function (e) { e.preventDefault(); var c = b.closest(".product-card"); if (c) toggleWishlistFromCard(c, b); });
    });
  }

  // ---------- Suggestions (real products only) ----------
  async function loadSuggestions(cur) {
    var sec = document.querySelector(".related-section");
    if (!sec) return;
    var grid = sec.querySelector(".product-grid");
    if (!grid) return;
    grid.innerHTML = skeletonCardsHTML(8);
    var head = sec.querySelector(".section-head p");
    try {
      var r = await supabaseClient.from("products")
        .select("id, name, price_ngn, main_image_url, alt_image_url, division, is_sold_out, categories(slug), product_sizes(in_stock)")
        .eq("division", cur.division).neq("status", "discontinued").limit(500);
      if (r.error) throw r.error;
      var rows = (r.data || []).filter(function (p) { return String(p.id) !== String(cur.id) && !isSoldOutProduct(p) && p.main_image_url; });
      var byCat = {};
      shuffle(rows.slice()).forEach(function (p) {
        var c = group(p.categories && p.categories.slug);
        (byCat[c] = byCat[c] || []).push(p);
      });
      var mine = group(cur.category), picked = [], used = {}, TARGET = 10;
      function take(arr, n) {
        while (n > 0 && arr && arr.length) { var p = arr.shift(); if (!used[p.id]) { used[p.id] = 1; picked.push(p); n--; } }
      }
      take(byCat[mine], 4);                                  // more from the same category
      var rel = cur.division === "mollys" ? (RELATED[mine] || []) : [];
      for (var g = 0; g < 40 && picked.length < TARGET; g++) { // then one at a time from each related category
        var moved = false;
        rel.forEach(function (c) { if (picked.length < TARGET && byCat[c] && byCat[c].length) { take(byCat[c], 1); moved = true; } });
        if (!moved) break;
      }
      take(byCat[mine], TARGET - picked.length);             // still short: more of the same category
      if (picked.length < TARGET) {                          // last resort: anything from this division
        var rest = []; Object.keys(byCat).forEach(function (c) { rest = rest.concat(byCat[c]); });
        take(shuffle(rest), TARGET - picked.length);
      }
      if (picked.length < 2) { sec.style.display = "none"; return; }
      shuffle(picked);
      if (head) head.textContent = cur.division === "msamuels" ? "More from M. Samuels" : "More like this, plus pieces to complete the look";
      grid.innerHTML = picked.map(function (p) {
        return cardHTML({ id: p.id, name: p.name, price: p.price_ngn, img: p.main_image_url, alt: p.alt_image_url, division: p.division, soldOut: false });
      }).join("");
      wireCards(grid);
    } catch (e) {
      console.error("Suggestions failed:", e);
      sec.style.display = "none";
    }
  }

  // ---------- Recently viewed (kept on this device) ----------
  var KEY = "molly_recent_v1";
  function getRecent() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function trackRecent(item) {
    if (!item || !item.id || !item.name) return;
    try {
      var list = getRecent().filter(function (x) { return String(x.id) !== String(item.id); });
      list.unshift(item);
      localStorage.setItem(KEY, JSON.stringify(list.slice(0, 12)));
    } catch (e) {}
  }
  function showRecent(excludeId) {
    var list = getRecent().filter(function (x) { return String(x.id) !== String(excludeId); }).slice(0, 8);
    if (!list.length || document.getElementById("recentSection")) return;
    var sec = document.createElement("section");
    sec.className = "recent-section"; sec.id = "recentSection";
    sec.innerHTML = '<div class="section-head"><div><h2>Recently viewed</h2><p>Pick up where you left off</p></div></div><div class="product-grid">' +
      list.map(function (x) { return cardHTML({ id: x.id, name: x.name, price: x.price, img: x.img, alt: "", division: x.division, link: x.link, soldOut: false }); }).join("") + '</div>';
    var anchor = document.querySelector(".related-section") || document.querySelector(".site-footer");
    if (!anchor) return;
    if (anchor.classList.contains("related-section")) anchor.parentNode.insertBefore(sec, anchor.nextSibling);
    else anchor.parentNode.insertBefore(sec, anchor);
    wireCards(sec);
  }

  window.__extras = { loadSuggestions: loadSuggestions, trackRecent: trackRecent, showRecent: showRecent };
  document.dispatchEvent(new Event("extrasReady"));

  // The cart page shows "Recently viewed" on its own.
  if (/(^|\/)cart(\.html)?$/.test(location.pathname)) {
    document.addEventListener("DOMContentLoaded", function () { showRecent(null); });
    if (document.readyState !== "loading") showRecent(null);
  }
})();
