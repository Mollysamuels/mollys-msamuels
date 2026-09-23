// ============================================
// MOLLYS × M. SAMUELS — MAIN JAVASCRIPT
// ============================================

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

// Reads whatever a product card actually displays (works for real Supabase
// products and static placeholder cards alike) and saves a real cart line.
// Used by every "Quick add" button site-wide.
function addToCartFromCard(card) {
  const link = card.querySelector("a[href*='product.html']");
  const href = link ? link.getAttribute("href") : "";
  const params = new URLSearchParams(href.split("?")[1] || "");
  const productId = params.get("id") || params.get("item") || (card.querySelector("h4")?.textContent || "product");
  const name = card.querySelector(".product-info h4, h4")?.textContent.trim() || "Product";
  const priceText = card.querySelector(".product-price .now, .now")?.textContent || "₦0";
  const price = parseInt(priceText.replace(/[^\d]/g, ""), 10) || 0;
  const img = card.querySelector(".product-media img.main, img.main")?.src || "";
  const division = params.get("division") || (href.includes("msamuels") ? "msamuels" : "mollys");

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

  const ANNOUNCE_MESSAGES = [
    "Trusted by 500+ schools&nbsp;&nbsp;|&nbsp;&nbsp;Easy 14-day returns&nbsp;&nbsp;|&nbsp;&nbsp;Bulk uniform orders available",
    "Best selling items&nbsp;&nbsp;|&nbsp;&nbsp;5 star rated&nbsp;&nbsp;|&nbsp;&nbsp;Premium quality products",
    "Free delivery on bulk orders&nbsp;&nbsp;|&nbsp;&nbsp;Discounted prices&nbsp;&nbsp;|&nbsp;&nbsp;Fast processing",
    "Trusted by 500+ schools&nbsp;&nbsp;|&nbsp;&nbsp;Nigeria &amp; UK delivery&nbsp;&nbsp;|&nbsp;&nbsp;Secure checkout",
  ];
  const announceBar = document.querySelector(".announce");
  if (announceBar) {
    let announceIndex = 0;
    announceBar.innerHTML = `<span class="announce-text">${ANNOUNCE_MESSAGES[0]}</span>`;
    const announceSpan = announceBar.querySelector(".announce-text");
    setInterval(() => {
      announceSpan.style.opacity = "0";
      setTimeout(() => {
        announceIndex = (announceIndex + 1) % ANNOUNCE_MESSAGES.length;
        announceSpan.innerHTML = ANNOUNCE_MESSAGES[announceIndex];
        announceSpan.style.opacity = "1";
      }, 400);
    }, 4500);
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

  /* ---------- Wishlist heart toggle ---------- */
  document.querySelectorAll(".wish-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      btn.classList.toggle("active");
      if (btn.classList.contains("active")) {
        showToast("Saved to wishlist");
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

  /* ---------- Chat FAB ---------- */
  const chatFab = document.querySelector(".chat-fab");
  if (chatFab) {
    chatFab.addEventListener("click", () => {
      // Backend/connector note: wire this up to WhatsApp click-to-chat
      // (https://wa.me/YOURNUMBER) or a live-chat widget once ready.
      showToast("Chat support — coming online soon");
    });
  }

});
