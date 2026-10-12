/* Molly Samuels — storage notice.
   The site only keeps what it needs to work (your cart, wishlist, chosen country/currency and login).
   There are no advertising or tracking cookies, so nothing here needs a yes/no consent. This banner tells
   visitors that, honestly, and remembers that it was seen.
   IF YOU EVER ADD ANALYTICS, ADS OR A PIXEL: this notice is no longer enough. You will need real
   consent (Accept / Decline) that blocks those tools until the visitor agrees. */
(function () {
  "use strict";
  var KEY = "ms_storage_notice_v1";
  try { if (localStorage.getItem(KEY) === "1") return; } catch (e) { /* storage blocked: show it every time */ }
  if (document.getElementById("msStorageNotice")) return;

  var css = document.createElement("style");
  css.textContent =
    "#msStorageNotice{position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:560px;margin:0 auto;background:#000;color:#fff;border-radius:10px;padding:16px 18px;box-shadow:0 8px 30px rgba(0,0,0,.35);font:14px/1.55 'Work Sans',Arial,sans-serif;display:flex;gap:14px;align-items:center;flex-wrap:wrap}" +
    "#msStorageNotice p{margin:0;flex:1 1 260px}" +
    "#msStorageNotice a{color:#F4D900;text-decoration:underline}" +
    "#msStorageNotice button{background:#F4D900;color:#000;border:0;border-radius:8px;padding:10px 20px;font:600 14px 'Work Sans',Arial,sans-serif;cursor:pointer;min-height:44px}" +
    "#msStorageNotice button:focus-visible,#msStorageNotice a:focus-visible{outline:3px solid #fff;outline-offset:2px}";
  document.head.appendChild(css);

  var box = document.createElement("div");
  box.id = "msStorageNotice";
  box.setAttribute("role", "region");
  box.setAttribute("aria-label", "Cookies and storage notice");
  box.innerHTML =
    '<p>We only use essential cookies and browser storage, to keep your cart, wishlist, country and login working. ' +
    'We don’t use advertising or tracking cookies. <a href="privacy.html#cookies">Read how we use them</a>.</p>' +
    '<button type="button">OK, got it</button>';
  box.querySelector("button").addEventListener("click", function () {
    try { localStorage.setItem(KEY, "1"); } catch (e) {}
    box.parentNode && box.parentNode.removeChild(box);
  });
  function show() { document.body.appendChild(box); }
  if (document.body) show(); else document.addEventListener("DOMContentLoaded", show);
})();
