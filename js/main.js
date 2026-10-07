// ============================================
// MOLLYS × M. SAMUELS — MAIN JAVASCRIPT
// ============================================

// ---------- Currency: one admin-set exchange rate, applied live everywhere ----------
const CURRENCY_KEY = "molly_samuels_currency"; // "NGN" or "GBP"
let _exchangeRate = null; // Naira per 1 GBP, loaded once from site_settings

function getCurrency() {
  return localStorage.getItem(CURRENCY_KEY) || "NGN";
}
function setCurrency(code) {
  localStorage.setItem(CURRENCY_KEY, code);
  updateMarketUI();
  document.dispatchEvent(new CustomEvent("currencyChanged"));
}
// Public project address + public key (safe to be in the page; same ones every page already uses).
const MS_SUPABASE_URL = "https://vdlwnflklclenavtpamp.supabase.co";
const MS_SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkbHduZmxrbGNsZW5hdnRwYW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5OTg5NTksImV4cCI6MjEwNTU3NDk1OX0.OfZ8QHqzaRepBc6pghvK6fbH1N6TqsD5AS4370CaBfU";

async function loadExchangeRate() {
  if (_exchangeRate !== null) return _exchangeRate;
  try {
    let rate = null;
    if (typeof supabaseClient !== "undefined") {
      const { data } = await supabaseClient.from("site_settings").select("exchange_rate").eq("id", 1).single();
      rate = data && data.exchange_rate;
    } else {
      // Pages that don't load the Supabase library (some static pages) still need the
      // admin-set rate — otherwise their £ prices would use a different number.
      const res = await fetch(`${MS_SUPABASE_URL}/rest/v1/site_settings?select=exchange_rate&id=eq.1`, { headers: { apikey: MS_SUPABASE_ANON } });
      const rows = await res.json();
      rate = rows && rows[0] && rows[0].exchange_rate;
    }
    _exchangeRate = Number(rate) || 1800;
  } catch (e) {
    _exchangeRate = 1800; // safe fallback if the fetch fails for any reason
  }
  return _exchangeRate;
}
// Converts a Naira amount to the currently selected currency and formats it
// for display — the one function every price on the site should go through.
function formatPrice(ngnAmount) {
  if (getCurrency() === "GBP" && _exchangeRate) {
    return `£${(ngnAmount / _exchangeRate).toFixed(2)}`;
  }
  return `₦${Number(ngnAmount).toLocaleString()}`;
}
function updateMarketUI() {
  const isGBP = getCurrency() === "GBP";
  document.querySelectorAll(".market-btn .label").forEach((el) => { el.textContent = isGBP ? "United Kingdom" : "Nigeria"; });
  document.querySelectorAll(".market-btn span:first-child").forEach((el) => { el.textContent = isGBP ? "🇬🇧" : "🇳🇬"; });
}
// Any price element tagged with data-price-ngn="<raw naira amount>" gets
// reformatted automatically, whether it was rendered by JS or typed directly
// into the page's HTML — this is what makes switching currency actually
// update every price already on screen, not just ones rendered afterward.
function refreshAllPrices() {
  document.querySelectorAll("[data-price-ngn]").forEach((el) => {
    el.textContent = formatPrice(el.dataset.priceNgn);
  });
}
document.addEventListener("currencyChanged", refreshAllPrices);
document.addEventListener("DOMContentLoaded", async () => {
  await loadExchangeRate();
  updateMarketUI();
  refreshAllPrices();
  document.querySelectorAll('.market-menu button[data-short="Nigeria"]').forEach((b) => b.addEventListener("click", () => setCurrency("NGN")));
  document.querySelectorAll('.market-menu button[data-short="UK"]').forEach((b) => b.addEventListener("click", () => setCurrency("GBP")));
  document.querySelectorAll('.mobile-market[data-market="nigeria"]').forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); setCurrency("NGN"); }));
  document.querySelectorAll('.mobile-market[data-market="uk"]').forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); setCurrency("GBP"); }));
});

// ---------- Real, persistent shopping cart (shared by every page) ----------
const CART_KEY = "molly_samuels_cart";

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch (e) { return []; }
}
function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadges();
}
// item: { product_id, name, price, img, division, size, color, qty }
function addToCart(item) {
  const cart = getCart();
  const existing = cart.find((c) => c.product_id === item.product_id && c.size === item.size && c.color === item.color);
  if (existing) { existing.qty += item.qty || 1; }
  else { cart.push({ ...item, qty: item.qty || 1 }); }
  saveCart(cart);
}
function removeFromCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
}
function updateCartQty(index, qty) {
  const cart = getCart();
  if (cart[index]) { cart[index].qty = Math.max(1, qty); saveCart(cart); }
}
function clearCart() { saveCart([]); }
function cartCount() { return getCart().reduce((sum, item) => sum + item.qty, 0); }
function updateCartBadges() {
  const count = cartCount();
  document.querySelectorAll(".cart-badge").forEach((el) => { el.textContent = count; });
}
document.addEventListener("DOMContentLoaded", updateCartBadges);

// ---------- Real, persistent wishlist (shared by every page, same pattern as the cart) ----------
const WISHLIST_KEY = "molly_samuels_wishlist";

function getWishlist() {
  try { return JSON.parse(localStorage.getItem(WISHLIST_KEY)) || []; }
  catch (e) { return []; }
}
function saveWishlist(list) { localStorage.setItem(WISHLIST_KEY, JSON.stringify(list)); }
function isInWishlist(productId) { return getWishlist().some((w) => w.product_id === productId); }
function toggleWishlist(item) {
  const list = getWishlist();
  const existingIndex = list.findIndex((w) => w.product_id === item.product_id);
  if (existingIndex > -1) { list.splice(existingIndex, 1); }
  else { list.push(item); }
  saveWishlist(list);
  return existingIndex === -1; // true = just added, false = just removed
}
function removeFromWishlist(productId) {
  saveWishlist(getWishlist().filter((w) => w.product_id !== productId));
}

// Reads a card the same way addToCartFromCard does, and toggles it in the
// real wishlist — used by every heart/wish-btn site-wide.
function toggleWishlistFromCard(card, btn) {
  const link = card.querySelector("a[href*='product.html']");
  const href = link ? link.getAttribute("href") : "";
  const cardParams = new URLSearchParams(href.split("?")[1] || "");
  const productId = cardParams.get("id") || cardParams.get("item") || (card.querySelector("h4")?.textContent || "product");
  const name = card.querySelector(".product-info h4, h4")?.textContent.trim() || "Product";
  // Use the raw Naira amount kept on the price tag. Reading digits out of the displayed
  // text breaks for customers viewing pounds ("£26.50" would become 2650).
  const priceEl = card.querySelector(".product-price .now, .now");
  const price = Number(priceEl?.dataset.priceNgn) || parseInt((priceEl?.textContent || "").replace(/[^\d]/g, ""), 10) || 0;
  const img = card.querySelector(".product-media img.main, img.main")?.src || "";
  const link_href = link ? link.getAttribute("href") : "product.html";
  // Real division, not always "mollys" — checks the URL's own division= param
  // first (older-style links), then falls back to the image path itself,
  // which always contains "msamuels" or "mollys" as its folder name.
  const division = cardParams.get("division") || (img.includes("msamuels") ? "msamuels" : "mollys");

  const wasAdded = toggleWishlist({ product_id: productId, name, price, img, division, link: link_href });
  btn.classList.toggle("active", wasAdded);
}


// Card image clicks used to toggle an alt-photo preview. That's retired —
// clicking a product image now simply opens the product, like any store.
// Kept as a harmless no-op because a few pages still call it.
function wireCardImageToggle() {}

// ---------- Login-aware prompts ----------
// UI hint only (never used for security): shows "My Account" instead of
// "Login / Register" when a saved session exists in this browser. The real
// check still happens on account.html and in the database.
function isLikelyLoggedIn() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (/^sb-.*-auth-token$/.test(key)) {
        const saved = JSON.parse(localStorage.getItem(key));
        if (saved && saved.refresh_token) return true;
      }
    }
  } catch (e) { /* storage unavailable — treat as logged out */ }
  return false;
}
function applyAuthAwareUI() {
  if (!isLikelyLoggedIn()) return;
  document.querySelectorAll(".ms-mega-auth").forEach((box) => {
    box.innerHTML = '<a href="account.html" class="register">MY ACCOUNT</a>';
  });
  document.querySelectorAll('.ms-action-btn[href="login.html"]').forEach((link) => {
    const icon = link.querySelector("svg");
    link.setAttribute("href", "account.html");
    link.innerHTML = (icon ? icon.outerHTML : "") + "MY<br>ACCOUNT";
  });
}
document.addEventListener("DOMContentLoaded", applyAuthAwareUI);

// ---------- Site search ----------
// Opens a search box from any Search button; submitting sends the visitor
// to shop.html?q=... which filters real products by name/category.
function openSiteSearch(scopeDivision) {
  let overlay = document.getElementById("siteSearchOverlay");
  if (!overlay) {
    const style = document.createElement("style");
    style.textContent = `
      #siteSearchOverlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 500; display: none; align-items: flex-start; justify-content: center; padding: 12vh 20px 20px; }
      #siteSearchOverlay.open { display: flex; }
      #siteSearchBox { background: #fff; width: 100%; max-width: 560px; border-radius: 12px; padding: 22px; box-shadow: 0 20px 50px rgba(0,0,0,0.3); }
      #siteSearchBox form { display: flex; gap: 10px; }
      #siteSearchBox input { flex: 1; padding: 14px 16px; border: 1px solid #E6DCC6; border-radius: 8px; font-size: 1rem; font-family: inherit; }
      #siteSearchBox input:focus { outline: none; border-color: #F4D900; }
      #siteSearchBox .ss-hint { margin: 12px 2px 0; font-size: 0.8rem; color: #58493A; }
      #siteSearchBox .ss-close { background: none; border: none; font-size: 0.8rem; cursor: pointer; color: #58493A; float: right; margin: -8px -4px 8px 0; }
    `;
    document.head.appendChild(style);

    overlay = document.createElement("div");
    overlay.id = "siteSearchOverlay";
    overlay.innerHTML = '<div id="siteSearchBox"><button type="button" class="ss-close">Close ✕</button><form><input type="search" placeholder="Search products…" aria-label="Search products" required><button type="submit" class="btn btn-gold">Search</button></form><p class="ss-hint"></p></div>';
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.classList.remove("open"); });
    overlay.querySelector(".ss-close").addEventListener("click", () => overlay.classList.remove("open"));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") overlay.classList.remove("open"); });
    overlay.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      const q = overlay.querySelector("input").value.trim();
      if (!q) return;
      const scope = overlay.dataset.scope;
      window.location.href = "shop.html?q=" + encodeURIComponent(q) + (scope ? "&division=" + scope : "");
    });
  }
  overlay.dataset.scope = scopeDivision || "";
  overlay.querySelector(".ss-hint").textContent =
    scopeDivision === "msamuels" ? "Searching M. Samuels uniforms" :
    scopeDivision === "mollys" ? "Searching Mollys" : "Searching all of Molly Samuels";
  overlay.classList.add("open");
  const input = overlay.querySelector("input");
  input.value = "";
  input.focus();
}
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('[aria-label="Search"]').forEach((btn) => {
    btn.addEventListener("click", (e) => { e.preventDefault(); openSiteSearch(btn.dataset.searchDivision); });
  });
});

// Reads whatever a product card actually displays (works for real Supabase
// products and static placeholder cards alike) and saves a real cart line.
// Used by every "Quick add" button site-wide.
function addToCartFromCard(card) {
  const link = card.querySelector("a[href*='product.html']");
  const href = link ? link.getAttribute("href") : "";
  const params = new URLSearchParams(href.split("?")[1] || "");
  const productId = params.get("id") || params.get("item") || (card.querySelector("h4")?.textContent || "product");
  const name = card.querySelector(".product-info h4, h4")?.textContent.trim() || "Product";
  // Use the raw Naira amount kept on the price tag. Reading digits out of the displayed
  // text breaks for customers viewing pounds ("£26.50" would become 2650).
  const priceEl = card.querySelector(".product-price .now, .now");
  const price = Number(priceEl?.dataset.priceNgn) || parseInt((priceEl?.textContent || "").replace(/[^\d]/g, ""), 10) || 0;
  const img = card.querySelector(".product-media img.main, img.main")?.src || "";
  const division = params.get("division") || ((href.includes("msamuels") || img.includes("msamuels")) ? "msamuels" : "mollys");

  addToCart({ product_id: productId, name, price, img, division, size: "", color: "", qty: 1 });

  const toast = document.querySelector(".toast");
  if (toast) {
    toast.querySelector("span").textContent = "Added to cart";
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2400);
  }
}

document.addEventListener("DOMContentLoaded", function () {

  /* ---------- Homepage hero: 5-image crossfade (endless loop) ---------- */
  const homeHeroImgs = document.querySelectorAll(".home-hero-bg");
  if (homeHeroImgs.length) {
    let homeHeroIndex = 0;
    setInterval(() => {
      homeHeroImgs[homeHeroIndex].classList.remove("active");
      homeHeroIndex = (homeHeroIndex + 1) % homeHeroImgs.length;
      homeHeroImgs[homeHeroIndex].classList.add("active");
    }, 4500);
  }

  /* ---------- Homepage "Two Divisions" — M. Samuels 3-image crossfade ---------- */
  const divisionSlides = document.querySelectorAll(".division-slide");
  if (divisionSlides.length) {
    let divIndex = 0;
    setInterval(() => {
      divisionSlides[divIndex].classList.remove("active");
      divIndex = (divIndex + 1) % divisionSlides.length;
      divisionSlides[divIndex].classList.add("active");
    }, 4000);
  }

  /* ---------- Generic accordion (FAQ, and any other info-tab usage) ---------- */
  document.querySelectorAll(".info-tab-head").forEach((head) => {
    head.addEventListener("click", () => {
      head.closest(".info-tab").classList.toggle("open");
    });
  });

  // Real, admin-set promo messages — falls back to sensible defaults if the
  // fetch fails for any reason, so the bar is never empty.
  const DEFAULT_ANNOUNCE = [
    "Trusted by 500+ schools&nbsp;&nbsp;|&nbsp;&nbsp;Easy 14-day returns&nbsp;&nbsp;|&nbsp;&nbsp;Bulk uniform orders available",
    "Best selling items&nbsp;&nbsp;|&nbsp;&nbsp;5 star rated&nbsp;&nbsp;|&nbsp;&nbsp;Premium quality products",
    "Free delivery on bulk orders&nbsp;&nbsp;|&nbsp;&nbsp;Discounted prices&nbsp;&nbsp;|&nbsp;&nbsp;Fast processing",
  ];
  const announceBar = document.querySelector(".announce");
  if (announceBar) {
    (async () => {
      let ANNOUNCE_MESSAGES = DEFAULT_ANNOUNCE;
      try {
        if (typeof supabaseClient !== "undefined") {
          const { data } = await supabaseClient.from("site_settings").select("promo_bar_text").eq("id", 1).single();
          if (data && data.promo_bar_text) {
            const msgs = data.promo_bar_text.split(" | ").map((m) => m.trim()).filter(Boolean);
            if (msgs.length) ANNOUNCE_MESSAGES = msgs.map((m) => m.replace(/\s*\|\s*/g, "&nbsp;&nbsp;|&nbsp;&nbsp;"));
          }
        }
      } catch (e) { /* fall back to defaults */ }

      let announceIndex = 0;
      announceBar.innerHTML = `<span class="announce-text">${ANNOUNCE_MESSAGES[0]}</span>`;
      const announceSpan = announceBar.querySelector(".announce-text");
      if (ANNOUNCE_MESSAGES.length > 1) {
        setInterval(() => {
          announceSpan.style.opacity = "0";
          setTimeout(() => {
            announceIndex = (announceIndex + 1) % ANNOUNCE_MESSAGES.length;
            announceSpan.innerHTML = ANNOUNCE_MESSAGES[announceIndex];
            announceSpan.style.opacity = "1";
          }, 400);
        }, 4500);
      }
    })();
  }


  /* ---------- Hero rotating quotes ---------- */
  const quotes = document.querySelectorAll(".hero-quote");
  const dots = document.querySelectorAll(".hero-dots button");
  let quoteIndex = 0;
  let quoteTimer;

  function showQuote(i) {
    quotes.forEach((q, idx) => q.classList.toggle("active", idx === i));
    dots.forEach((d, idx) => d.classList.toggle("active", idx === i));
    quoteIndex = i;
  }

  function nextQuote() {
    showQuote((quoteIndex + 1) % quotes.length);
  }

  function startQuoteRotation() {
    clearInterval(quoteTimer);
    quoteTimer = setInterval(nextQuote, 5000);
  }

  if (quotes.length) {
    showQuote(0);
    startQuoteRotation();
    dots.forEach((dot, idx) => {
      dot.addEventListener("click", () => {
        showQuote(idx);
        startQuoteRotation();
      });
    });
  }

  /* ---------- Market selector dropdown ---------- */
  const marketSelector = document.querySelector(".market-selector");
  const marketBtn = document.querySelector(".market-btn");
  if (marketBtn) {
    marketBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      marketSelector.classList.toggle("open");
    });
    document.addEventListener("click", () => marketSelector.classList.remove("open"));

    document.querySelectorAll(".market-menu button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const flag = btn.querySelector("span:first-child")?.textContent || "";
        const shortLabel = btn.dataset.short || "";
        marketBtn.querySelector("span:first-child").textContent = flag;
        marketBtn.querySelector(".label").textContent = shortLabel;
        marketSelector.classList.remove("open");
        // Backend note: when Supabase is connected, store the chosen market
        // (e.g. localStorage + user profile) and re-fetch prices/availability here.
      });
    });
  }

  /* ---------- Mobile menu ---------- */
  const menuToggle = document.querySelector(".menu-toggle");
  const mobileMenu = document.querySelector(".mobile-menu");
  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener("click", () => {
      mobileMenu.classList.toggle("open");
    });
  }

  /* ---------- Wishlist heart toggle: real, persistent ---------- */
  document.querySelectorAll(".wish-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const card = btn.closest(".product-card");
      if (card) {
        toggleWishlistFromCard(card, btn);
        showToast(btn.classList.contains("active") ? "Saved to wishlist" : "Removed from wishlist");
      } else {
        btn.classList.toggle("active"); // no card context (e.g. product.html) — visual only
      }
    });
  });

  /* ---------- Quick add to cart ---------- */
  document.querySelectorAll(".quick-add").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const card = btn.closest(".product-card");
      if (card) { addToCartFromCard(card); }
      else { showToast("Added to cart"); }
    });
  });

  /* ---------- Toast ---------- */
  function showToast(message) {
    const toast = document.querySelector(".toast");
    if (!toast) return;
    toast.querySelector("span").textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("show"), 2400);
  }

  /* ---------- Promo popup (once per session) ---------- */
  const popupBackdrop = document.querySelector(".promo-popup-backdrop");
  if (popupBackdrop) {
    const alreadyShown = sessionStorage.getItem("promoShown");
    if (!alreadyShown) {
      setTimeout(() => {
        popupBackdrop.classList.add("show");
        sessionStorage.setItem("promoShown", "1");
      }, 3500);
    }
    popupBackdrop.addEventListener("click", (e) => {
      if (e.target === popupBackdrop) popupBackdrop.classList.remove("show");
    });
    document.querySelectorAll(".close-x, .popup-dismiss").forEach((el) => {
      el.addEventListener("click", () => popupBackdrop.classList.remove("show"));
    });
  }

  // (The chat button is a real WhatsApp link now — it needs no script.)

});

// Two small helpers that do nothing on pages that don't need them:
//  - card-sync.js: connects the old hand-typed product cards to real products (so they can be
//    ordered and follow admin prices);
//  - newsletter.js: makes the "Stay updated" Subscribe box work.
(function () {
  ["js/card-sync.js", "js/newsletter.js"].forEach(function (src) {
    var s = document.createElement("script");
    s.src = src;
    document.head.appendChild(s);
  });
})();
