/* motion.js - Molly Samuels animation layer.
   Safe by design: no outside libraries, no data collection, never touches
   checkout/payment/login/account/admin pages, never blocks real actions.
   MODE: "preview" = only visitors who opened any page with ?motion=on (remembered in their browser)
         "on"      = everyone
         "off"     = nobody (kill switch)  -- change this one word to switch. */
(function () {
  "use strict";
  var MODE = "preview";
  var WA_NUMBER = "2348037865059";
  var FREE_DELIVERY_THRESHOLD = 0; // reserved (unused)

  try {
    var q = location.search;
    if (/[?&]motion=on/.test(q)) localStorage.setItem("gv_motion", "1");
    if (/[?&]motion=off/.test(q)) localStorage.removeItem("gv_motion");
  } catch (e) {}
  var preview = false;
  try { preview = localStorage.getItem("gv_motion") === "1"; } catch (e) {}
  if (MODE === "off" || (MODE === "preview" && !preview)) return;

  var path = location.pathname.toLowerCase();
  if (/(checkout|payment-callback|order-success|login|register|account|admin|reset-password|track-order|newsletter|unsubscribe)/.test(path)) return;

  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var saver = navigator.connection && navigator.connection.saveData;
  var lowMem = navigator.deviceMemory && navigator.deviceMemory < 2;
  var light = reduce || saver || lowMem;
  var touch = window.matchMedia && matchMedia("(hover: none)").matches;

  var root = document.documentElement;
  root.classList.add("mo-on");
  var link = document.createElement("link");
  link.rel = "stylesheet"; link.href = "css/motion.css";
  document.head.appendChild(link);

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function raf(fn) { requestAnimationFrame(fn); }

  /* ---------- reveals ---------- */
  var io = null;
  if ("IntersectionObserver" in window && !light) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("mo-in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  }
  function watch(el, kind, delay) {
    if (!io || el.__mo) return;
    el.__mo = 1;
    var r = el.getBoundingClientRect();
    if (r.top < innerHeight * 0.9 && r.bottom > 0 && !kind) return; // already visible: leave alone
    el.setAttribute(kind === "mask" ? "data-mo-mask" : "data-mo-wait", "");
    if (delay) el.style.setProperty("--mo-d", delay + "ms");
    io.observe(el);
  }
  function scan(rootEl) {
    rootEl = rootEl || document;
    $$("h1,h2,.section-title,.eyebrow,.founder-story-body,.about-section > *,.promo-band", rootEl).forEach(function (el) {
      if (el.closest(".site-header,.mobile-menu,.ms-mega-overlay,.toast")) return;
      watch(el, "", 0);
    });
    $$(".founder-photo-block,.cat-tile,.category-strip a,.about-division-card,.lookbook img", rootEl).forEach(function (el) { watch(el, "mask", 0); });
    // staggered product grids
    $$(".product-grid,.mo-scroll-track,.products-grid,#productGrid,#newArrivalsGrid", rootEl).forEach(function (g) {
      $$(".product-card", g).forEach(function (c, i) { watch(c, "", Math.min(i % 8, 7) * 90); });
    });
    $$(".product-card", rootEl).forEach(function (c) { watch(c, "", 0); });
    $$(".product-media img", rootEl).forEach(function (im) {
      if (im.__ld) return; im.__ld = 1;
      if (im.complete) im.classList.add("mo-loaded");
      else im.addEventListener("load", function () { im.classList.add("mo-loaded"); }, { once: true });
    });
    if (touch) peekInit(rootEl);
  }

  /* ---------- touch hover-swap: centred card crossfades ---------- */
  var peekIO = null;
  function peekInit(rootEl) {
    if (!("IntersectionObserver" in window) || light) return;
    if (!peekIO) peekIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.target.classList.toggle("mo-peek", e.isIntersecting && e.intersectionRatio > 0.6); });
    }, { threshold: [0, 0.6], rootMargin: "-30% 0px -30% 0px" });
    $$(".product-card", rootEl).forEach(function (c) {
      if (c.__pk) return; c.__pk = 1;
      var m = $("img.main", c), a = $("img.alt", c);
      if (m && a && m.getAttribute("src") !== a.getAttribute("src")) peekIO.observe(c);
    });
  }

  /* ---------- announcement ticker ---------- */
  function ticker() {
    var bar = $(".announce");
    if (!bar || light) return;
    var seen = [];
    function build() {
      var sp = $(".announce-text", bar);
      var t = (sp ? sp.textContent : bar.textContent).replace(/\s+/g, " ").trim();
      if (!t || seen.indexOf(t) > -1) return;
      seen.push(t);
      var tr = $(".mo-ticker-track", bar);
      if (!tr) { tr = document.createElement("div"); tr.className = "mo-ticker-track"; bar.appendChild(tr); }
      var txt = seen.join("   \u2022   ");
      tr.textContent = "";
      for (var i = 0; i < 4; i++) { var s = document.createElement("span"); s.textContent = txt; tr.appendChild(s); }
      bar.classList.add("mo-ticker");
      tr.style.setProperty("--mo-tick", Math.max(30, txt.length * 0.45) + "s");
    }
    build();
    new MutationObserver(build).observe(bar, { childList: true, subtree: true, characterData: true });
  }

  /* ---------- drag-to-scroll with momentum ---------- */
  function dragRails() {
    if (touch) return;
    $$(".mo-scroll-track").forEach(function (t) {
      if (t.__dr) return; t.__dr = 1;
      var down = false, sx = 0, sl = 0, v = 0, lx = 0, moved = false, af = 0;
      t.addEventListener("pointerdown", function (e) {
        if (e.button !== 0) return;
        down = true; moved = false; sx = lx = e.clientX; sl = t.scrollLeft; v = 0; cancelAnimationFrame(af);
      });
      window.addEventListener("pointermove", function (e) {
        if (!down) return;
        var dx = e.clientX - sx;
        if (Math.abs(dx) > 5) { moved = true; t.classList.add("mo-drag"); }
        if (moved) { t.scrollLeft = sl - dx; v = e.clientX - lx; lx = e.clientX; }
      });
      window.addEventListener("pointerup", function () {
        if (!down) return; down = false;
        t.classList.remove("mo-drag");
        if (!moved) return;
        (function glide() { if (Math.abs(v) < 0.5) return; t.scrollLeft -= v; v *= 0.94; af = requestAnimationFrame(glide); })();
      });
      t.addEventListener("click", function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    });
  }

  /* ---------- fly to cart + badge bounce ---------- */
  function badge() { return $(".site-header .cart-badge") || $(".cart-badge"); }
  function bounce() { var b = badge(); if (!b) return; b.classList.remove("mo-bounce"); void b.offsetWidth; b.classList.add("mo-bounce"); }
  function fly(src, item) {
    try {
      var b = badge(); if (!b || light) { bounce(); return; }
      var tgt = (b.closest("a,button") || b).getBoundingClientRect();
      var from = src && src.getBoundingClientRect ? src.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
      var d = document.createElement("div"); d.className = "mo-fly";
      var img = item && item.img ? String(item.img) : "";
      if (/^(https?:|assets\/|\/|data:image\/)/.test(img)) d.style.backgroundImage = "url(\"" + img.replace(/["\\]/g, "") + "\")";
      var x0 = from.left + from.width / 2 - 28, y0 = from.top + from.height / 2 - 28;
      d.style.left = x0 + "px"; d.style.top = y0 + "px";
      document.body.appendChild(d);
      raf(function () { raf(function () {
        d.style.transform = "translate(" + (tgt.left + tgt.width / 2 - 28 - x0) + "px," + (tgt.top + tgt.height / 2 - 28 - y0) + "px) scale(.2)";
        d.style.opacity = ".3";
      }); });
      setTimeout(function () { d.remove(); bounce(); }, 820);
    } catch (e) { bounce(); }
  }
  var lastClick = null;
  document.addEventListener("click", function (e) { lastClick = e.target; }, true);
  function patchCart() {
    if (typeof window.addToCart !== "function" || window.addToCart.__mo) return;
    var orig = window.addToCart;
    var wrapped = function (item) {
      var r = orig.apply(this, arguments); // real add happens first, always
      try {
        var src = null;
        if (lastClick && lastClick.closest) {
          var card = lastClick.closest(".product-card");
          src = (card && $(".product-media img.main", card)) || $(".gallery-frame img,.gallery img");
        }
        fly(src, item);
      } catch (e) {}
      return r;
    };
    wrapped.__mo = 1;
    window.addToCart = wrapped;
  }

  /* ---------- wishlist heart pop ---------- */
  document.addEventListener("click", function (e) {
    var w = e.target.closest && e.target.closest(".wish-btn");
    if (!w) return;
    w.classList.remove("mo-pop"); void w.offsetWidth; w.classList.add("mo-pop");
  });

  /* ---------- product page: sticky bar + WhatsApp ---------- */
  function productPage() {
    var btn = $("#addToCartBtn");
    if (!btn || $(".mo-sticky")) return;
    var bar = document.createElement("div"); bar.className = "mo-sticky";
    var info = document.createElement("div"); info.className = "mo-sticky-info";
    var nm = document.createElement("div"); nm.className = "mo-sticky-name";
    var pr = document.createElement("div"); pr.className = "mo-sticky-price";
    info.appendChild(nm); info.appendChild(pr);
    var go = document.createElement("button"); go.type = "button"; go.textContent = "Add to Cart";
    bar.appendChild(info); bar.appendChild(go); document.body.appendChild(bar);
    function sync() {
      var t = $("#prodTitle"), p = $("#prodPrice") || $(".product-info-col .now") || $(".product-info-col [data-price-ngn]");
      nm.textContent = t ? t.textContent : "";
      pr.textContent = p ? p.textContent : "";
    }
    sync();
    go.addEventListener("click", function () { lastClick = btn; btn.click(); }); // uses the real button: size checks etc. still apply
    var vis = true;
    function upd() {
      var r = btn.getBoundingClientRect();
      vis = r.bottom > 0 && r.top < innerHeight;
      bar.classList.toggle("mo-show", !vis && scrollY > 400);
      sync();
    }
    addEventListener("scroll", upd, { passive: true }); addEventListener("resize", upd); upd();
    // WhatsApp order link
    var wa = document.createElement("a"); wa.className = "mo-wa"; wa.target = "_blank"; wa.rel = "noopener";
    wa.textContent = "Order on WhatsApp";
    function waHref() {
      var t = $("#prodTitle");
      wa.href = "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent("Hello Molly Samuels, I'd like to order: " + (t ? t.textContent : "") + " (" + location.href.replace(/[?&]motion=(on|off)/, "") + ")");
    }
    waHref(); btn.parentNode.insertBefore(wa, btn.nextSibling);
    wa.addEventListener("click", waHref);
  }

  /* ---------- scroll effects ---------- */
  function scrollFx() {
    var prog = document.createElement("div"); prog.className = "mo-progress"; document.body.appendChild(prog);
    var top = document.createElement("button"); top.className = "mo-top"; top.type = "button"; top.setAttribute("aria-label", "Back to top");
    top.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><path d="M6 15l6-6 6 6" stroke="currentColor" stroke-width="1.6"/></svg>';
    top.addEventListener("click", function () { scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); });
    document.body.appendChild(top);
    var hdr = $(".site-header"), lastY = scrollY, tick = false;
    var par = light || touch ? [] : $$(".founder-photo-block img,[data-parallax]");
    function frame() {
      tick = false;
      var y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
      prog.style.transform = "scaleX(" + (h > 0 ? y / h : 0) + ")";
      top.classList.toggle("mo-show", y > 900);
      if (hdr) {
        var menuOpen = document.body.classList.contains("menu-open") || (hdr.querySelector(".menu-toggle[aria-expanded='true']"));
        hdr.classList.toggle("mo-hide", y > 300 && y > lastY + 4 && !menuOpen);
        if (y < lastY - 4 || y <= 300) hdr.classList.remove("mo-hide");
      }
      lastY = y;
      par.forEach(function (im) {
        var r = im.parentNode.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        im.style.transform = "translateY(" + ((r.top + r.height / 2 - innerHeight / 2) * -0.06).toFixed(1) + "px) scale(1.1)";
      });
    }
    addEventListener("scroll", function () { if (!tick) { tick = true; raf(frame); } }, { passive: true });
    frame();
  }

  /* ---------- boot ---------- */
  function init() {
    patchCart(); ticker(); scan(); dragRails(); productPage(); scrollFx();
    var pend = 0;
    new MutationObserver(function () {
      if (pend) return;
      pend = setTimeout(function () { pend = 0; scan(); dragRails(); patchCart(); productPage(); }, 120);
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
