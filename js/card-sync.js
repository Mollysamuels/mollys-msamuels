// ============================================
// card-sync.js
// Connects the old, hand-typed product cards (links like
// product.html?item=heels-1&name=...) to the REAL products in your database,
// so they can be ordered and their price/name follow what you set in admin.
//
// - Matches by a hidden label (products.legacy_keys) first, then by name, so
//   renaming a product in admin never breaks the link.
// - Cards with no matching real product are left exactly as they were.
// - Safe to load on every page: does nothing (and makes no request) unless the
//   page actually has an old-style card.
// ============================================
(function () {
  var SUPABASE_URL = "https://vdlwnflklclenavtpamp.supabase.co";
  var SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkbHduZmxrbGNsZW5hdnRwYW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5OTg5NTksImV4cCI6MjEwNTU3NDk1OX0.OfZ8QHqzaRepBc6pghvK6fbH1N6TqsD5AS4370CaBfU";

  var OLD_LINK = 'a[href*="product.html?"]';
  var clientPromise = null;
  var productsPromise = null;
  var timer = null;

  function norm(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }

  // The link params of an old-style card, or null if it's already a real (?id=) card.
  function oldStyleInfo(card) {
    if (card.dataset.synced) return null;
    var a = card.querySelector(OLD_LINK);
    if (!a) return null;
    var qs;
    try { qs = new URLSearchParams(a.getAttribute("href").split("?")[1] || ""); } catch (e) { return null; }
    if (qs.get("id")) return null;
    var h4 = card.querySelector("h4");
    return { item: qs.get("item") || "", name: qs.get("name") || (h4 ? h4.textContent : "") };
  }

  function getClient() {
    if (clientPromise) return clientPromise;
    clientPromise = new Promise(function (resolve) {
      if (typeof supabaseClient !== "undefined" && supabaseClient) return resolve(supabaseClient);
      function make() {
        try { resolve(window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON)); } catch (e) { resolve(null); }
      }
      if (window.supabase && window.supabase.createClient) return make();
      var s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
      s.onload = make;
      s.onerror = function () { resolve(null); };
      document.head.appendChild(s);
    });
    return clientPromise;
  }

  function loadProducts() {
    if (productsPromise) return productsPromise;
    productsPromise = getClient().then(function (c) {
      if (!c) return [];
      return c.from("products").select("id, name, price_ngn, legacy_keys, status").neq("status", "discontinued")
        .then(function (r) {
          if (r && !r.error && r.data) return r.data;
          // legacy_keys column not added yet — still allow matching by name
          return c.from("products").select("id, name, price_ngn, status").neq("status", "discontinued")
            .then(function (r2) { return r2 && r2.data ? r2.data : []; });
        });
    }).catch(function () { return []; });
    return productsPromise;
  }

  function findProduct(products, info) {
    var i, p;
    if (info.item) {
      for (i = 0; i < products.length; i++) {
        p = products[i];
        if (Array.isArray(p.legacy_keys) && p.legacy_keys.indexOf(info.item) !== -1) return p;
      }
    }
    var n = norm(info.name);
    if (n) for (i = 0; i < products.length; i++) { if (norm(products[i].name) === n) return products[i]; }
    return null;
  }

  function money(ngn) {
    if (typeof formatPrice === "function") return formatPrice(ngn);
    return "\u20A6" + Number(ngn).toLocaleString();
  }

  function hydrate(card, p) {
    card.querySelectorAll(OLD_LINK).forEach(function (a) { a.setAttribute("href", "product.html?id=" + p.id); });
    var h4 = card.querySelector("h4");
    if (h4 && p.name) h4.textContent = p.name;
    var img = card.querySelector(".product-media img.main");
    if (img && p.name) img.alt = p.name;
    var price = card.querySelector(".product-price .now");
    if (price) { price.dataset.priceNgn = p.price_ngn; price.textContent = money(p.price_ngn); }
    card.dataset.synced = "1";
  }

  // The same real product must not appear twice side by side (e.g. the live
  // copy and an old typed-in copy of it) — keep the first, drop the rest.
  function dedupe() {
    var seen = new Map();
    document.querySelectorAll(".product-card").forEach(function (card) {
      var a = card.querySelector('a[href*="product.html?id="]');
      if (!a || !card.parentElement) return;
      var id = (a.getAttribute("href").split("id=")[1] || "").split("&")[0];
      var scope = seen.get(card.parentElement) || new Set();
      seen.set(card.parentElement, scope);
      if (scope.has(id)) card.remove(); else scope.add(id);
    });
  }

  function sync() {
    var cards = Array.prototype.filter.call(document.querySelectorAll(".product-card"), function (c) { return oldStyleInfo(c); });
    if (!cards.length) return;
    loadProducts().then(function (products) {
      if (!products.length) return;
      cards.forEach(function (card) {
        var info = oldStyleInfo(card);
        if (!info) return;
        var p = findProduct(products, info);
        if (p) hydrate(card, p);
      });
      dedupe();
    });
  }

  function schedule() { clearTimeout(timer); timer = setTimeout(sync, 150); }

  function start() {
    sync();
    // Pages like the shop add their cards a moment after loading.
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
