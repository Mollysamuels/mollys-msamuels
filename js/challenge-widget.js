/* Molly Samuels - Bridal Challenge pop-up and floating icon.
   Loaded on store pages by cookie-notice.js. It stays silent unless the challenge is switched on in the admin,
   never shows during cart/checkout/payment, and never touches the store's own code. */
(function () {
  "use strict";
  var path = location.pathname.replace(/\/+$/, "").split("/").pop().replace(/\.html$/, "") || "index";
  var NEVER = /^(admin|cart|checkout|payment-callback|order-success|login|register|reset-password|account|track-order|newsletter-confirm|unsubscribe)/;
  if (NEVER.test(path)) return;
  var onChallenge = path === "bridal-challenge";
  var checkoutish = /^(cart|checkout|payment|order)/.test(path);
  if (checkoutish) return;

  function boot() {
    if (!window.MSChallenge) return;
    var C = window.MSChallenge;
    C.getSettings().then(function (s) {
      if (!s || !s.is_enabled) return;
      var phase = C.phaseOf(s);
      if (phase === "ended") return;
      var t = C.textsFor(s, phase);
      injectCss();
      if (s.icon_enabled !== false) addIcon(phase, t);
      if (!onChallenge && s.popup_enabled !== false) schedulePopup(s, phase, t);
    });
  }

  function injectCss() {
    if (document.getElementById("msChCss")) return;
    var st = document.createElement("style"); st.id = "msChCss";
    st.textContent =
      "#msChIcon{position:fixed;left:16px;bottom:20px;z-index:900;display:flex;align-items:center;gap:10px;background:#000;color:#F4D900;border:2px solid #F4D900;border-radius:999px;padding:10px 18px 10px 12px;font:600 13px/1.2 'Work Sans',Arial,sans-serif;text-decoration:none;box-shadow:0 6px 20px rgba(0,0,0,.28);transition:transform .2s}" +
      "#msChIcon:hover{transform:translateY(-2px)}#msChIcon:focus-visible{outline:3px solid #fff;outline-offset:2px}" +
      "#msChIcon svg{width:26px;height:26px;flex:none}#msChIcon small{display:block;color:#fff;font-weight:500;font-size:11px;opacity:.9}" +
      "@media(max-width:640px){#msChIcon{bottom:92px;padding:11px;gap:0}#msChIcon span{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}}" +
      "#msChPop{position:fixed;inset:0;z-index:10000;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.72)}" +
      "#msChPop.open{display:flex}" +
      "#msChPop .box{position:relative;display:grid;grid-template-columns:62% 38%;width:min(1240px,100%);height:min(90vh,780px);background:#0b0b0b;color:#fff;border-radius:18px;overflow:hidden;border:2px solid #F4D900;box-shadow:0 24px 70px rgba(0,0,0,.55)}" +
      "#msChPop .imgs{position:relative;background:#1a1a1a;min-height:0}" +
      "#msChPop .imgs img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top center}" +
      "#msChPop .imgs.two img:first-child{width:62%}#msChPop .imgs.two img:last-child{left:auto;right:0;width:40%;border-left:3px solid #F4D900}" +
      "#msChPop .info{padding:44px 40px;display:flex;flex-direction:column;justify-content:center;gap:14px;overflow:auto}" +
      "#msChPop .brand{display:flex;gap:10px;align-items:center;font:600 12px 'Work Sans',Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#F4D900}" +
      "#msChPop .brand i{display:block;width:26px;height:1px;background:#F4D900}" +
      "#msChPop h2{font:600 clamp(1.7rem,3vw,2.5rem)/1.12 'Fraunces',Georgia,serif;margin:0;color:#fff}" +
      "#msChPop p{margin:0;font:400 16px/1.6 'Work Sans',Arial,sans-serif;color:#e8e2c8}" +
      "#msChPop .go{display:inline-block;align-self:flex-start;background:#F4D900;color:#000;border-radius:999px;padding:15px 32px;font:700 15px 'Work Sans',Arial,sans-serif;text-decoration:none}" +
      "#msChPop .go:hover{background:#fff}#msChPop .go:focus-visible,#msChPop .x:focus-visible{outline:3px solid #fff;outline-offset:2px}" +
      "#msChPop .x{position:absolute;top:10px;right:10px;z-index:3;width:42px;height:42px;border-radius:50%;border:2px solid #F4D900;background:#000;color:#F4D900;font:400 26px/1 Arial,sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center}" +
      "#msChPop .later{background:none;border:0;color:#bdb79b;font:500 13px 'Work Sans',Arial,sans-serif;text-decoration:underline;cursor:pointer;align-self:flex-start;padding:0}" +
      "@media(max-width:700px){#msChPop{padding:8px}#msChPop .box{grid-template-columns:1fr;grid-template-rows:minmax(0,1fr) auto;width:100%;height:calc(100vh - 16px);height:calc(100dvh - 16px)}#msChPop .imgs{min-height:0;height:100%}#msChPop .info{padding:20px 20px 22px;gap:10px}#msChPop h2{font-size:1.45rem}#msChPop p{font-size:14.5px}}";
    document.head.appendChild(st);
  }

  function addIcon(phase, t) {
    if (document.getElementById("msChIcon")) return;
    var a = document.createElement("a");
    a.id = "msChIcon"; a.href = onChallenge ? "#top" : t.href;
    a.setAttribute("aria-label", "Bridal Challenge: win a bridal package worth up to 2 million naira");
    a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="9" cy="14" r="5" stroke="currentColor" stroke-width="1.6"/><circle cx="15" cy="14" r="5" stroke="currentColor" stroke-width="1.6"/><path d="M12 3l1.2 2.4L12 8l-1.2-2.6L12 3z" fill="currentColor"/></svg><span>₦2M Bridal Challenge<small>' + window.MSChallenge.esc(window.MSChallenge.PHASE_LABEL[phase] || "") + "</small></span>";
    document.body.appendChild(a);
  }

  function schedulePopup(s, phase, t) {
    var C = window.MSChallenge;
    var img1 = C.safeImg(s.popup_image_url), img2 = C.safeImg(s.popup_image2_url);
    if (!img1) return; // no real campaign photo uploaded yet: stay quiet rather than show a placeholder
    var KEY = "ms_ch_popup_closed_v1";
    try { if (sessionStorage.getItem(KEY) === phase) return; } catch (e) {}
    setTimeout(function () { show(img1, img2, t, phase, KEY); }, 5000);
  }

  var lastFocus = null;
  function show(img1, img2, t, phase, KEY) {
    if (document.getElementById("msChPop")) return;
    if (/^(cart|checkout|payment|order)/.test(location.pathname.split("/").pop())) return;
    var C = window.MSChallenge, e = C.esc;
    lastFocus = document.activeElement;
    var d = document.createElement("div");
    d.id = "msChPop"; d.setAttribute("role", "dialog"); d.setAttribute("aria-modal", "true"); d.setAttribute("aria-labelledby", "msChT");
    d.innerHTML =
      '<div class="box"><button type="button" class="x" aria-label="Close this message">&times;</button>' +
      '<div class="imgs' + (img2 ? " two" : "") + '"><img src="' + e(img1) + '" alt="A bride in a luxury wedding gown" decoding="async">' + (img2 ? '<img src="' + e(img2) + '" alt="A groom in a premium suit" decoding="async">' : "") + "</div>" +
      '<div class="info"><div class="brand"><i></i>Mollys &times; M. Samuels</div><h2 id="msChT">' + e(t.title) + "</h2><p>" + e(t.text) + '</p>' +
      '<a class="go" href="' + e(t.href) + '">' + e(t.button) + '</a><button type="button" class="later">Maybe later</button></div></div>';
    document.body.appendChild(d);
    function close() {
      try { sessionStorage.setItem(KEY, phase); } catch (err) {}
      d.remove(); document.removeEventListener("keydown", onKey);
      if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (err) {}
    }
    function onKey(ev) {
      if (ev.key === "Escape") close();
      if (ev.key === "Tab") { // keep keyboard focus inside the pop-up while it is open
        var f = d.querySelectorAll("a[href],button"); if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
        else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
      }
    }
    d.querySelector(".x").addEventListener("click", close);
    d.querySelector(".later").addEventListener("click", close);
    d.querySelector(".go").addEventListener("click", function () { try { sessionStorage.setItem(KEY, phase); } catch (err) {} });
    d.addEventListener("click", function (ev) { if (ev.target === d) close(); });
    document.addEventListener("keydown", onKey);
    d.classList.add("open");
    d.querySelector(".go").focus();
  }

  // Load the shared logic, then start.
  if (window.MSChallenge) boot();
  else {
    var sc = document.createElement("script"); sc.src = "js/challenge-core.js"; sc.async = true; sc.onload = boot;
    document.head.appendChild(sc);
  }
})();
