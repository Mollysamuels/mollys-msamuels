// ============================================
// Bridal extras (Bridal category ONLY)
//   __bridal.category() : big uncropped gown cards, banner, collection video (BRIDAL_VIDEO_URL)
//   __bridal.product(P) : photo gallery (main, alt, then -3 ... -6 found by name), full-screen zoom,
//                         per-gown YouTube video, "Ask about this gown" WhatsApp button
// Nothing here runs on other categories.
// ============================================
(function () {
  var WA = window.BRIDAL_WHATSAPP || "2348037865059";
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function css() {
    if (document.getElementById("bridalCss")) return;
    var l = document.createElement("link"); l.id = "bridalCss"; l.rel = "stylesheet"; l.href = "css/bridal.css"; document.head.appendChild(l);
  }
  function ytId(u) {
    var m = String(u || "").match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/);
    return m ? m[1] : "";
  }
  function videoBox(id, onPlay) {
    var d = document.createElement("div");
    d.className = "vid-box"; d.style.backgroundImage = "url(https://img.youtube.com/vi/" + id + "/hqdefault.jpg)";
    d.innerHTML = '<button type="button" class="vid-play" aria-label="Play video"></button>';
    d.addEventListener("click", function () {
      d.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0" title="Video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
      d.style.cursor = "default"; if (onPlay) onPlay();
    }, { once: true });
    return d;
  }
  function probe(src) {
    return new Promise(function (res) {
      var im = new Image(), done = false;
      function f(ok) { if (!done) { done = true; res(ok); } }
      im.onload = function () { f(true); }; im.onerror = function () { f(false); };
      setTimeout(function () { f(false); }, 8000); im.src = src;
    });
  }

  window.__bridal = {
    category: function () {
      css(); document.body.classList.add("bridal-page");
      var bd = document.getElementById("catBannerDesc"); if (bd) bd.textContent = "Timeless gowns for your most important day.";
      var id = ytId(window.BRIDAL_VIDEO_URL);
      var wrap = document.querySelector(".cat-section .wrap");
      if (id && wrap && !document.getElementById("bridalFilm")) {
        var s = document.createElement("div"); s.id = "bridalFilm"; s.className = "bridal-film";
        s.innerHTML = "<h2>Watch the bridal collection</h2>";
        s.appendChild(videoBox(id));
        wrap.insertBefore(s, wrap.firstChild);
      }
    },

    product: async function (P) {
      css();
      var col = document.querySelector(".gallery-col");
      if (!col || !P) return;
      var urls = [P.mainImage];
      if (P.altImage && P.altImage !== P.mainImage) urls.push(P.altImage);
      var m = String(P.mainImage || "").match(/^(.*\/[a-z0-9-]+-\d+)-main\.jpg$/i);
      if (m) {
        var tries = [3, 4, 5, 6].map(function (n) { return m[1] + "-" + n + ".jpg"; });
        var ok = await Promise.all(tries.map(probe));
        tries.forEach(function (u, i) { if (ok[i]) urls.push(u); });
      }
      var vid = ytId(P.videoUrl);
      var items = urls.map(function (u) { return { type: "img", src: u }; });
      if (vid) items.push({ type: "video", id: vid });

      var cur = 0;
      col.innerHTML = '<div class="bg-wrap"><div class="bg-main" id="bgMain"></div>' +
        (items.length > 1 ? '<button class="bg-arrow prev" aria-label="Previous">&#8249;</button><button class="bg-arrow next" aria-label="Next">&#8250;</button><span class="bg-count" id="bgCount"></span>' : "") +
        '</div><div class="bg-thumbs" id="bgThumbs"></div>';
      var main = col.querySelector("#bgMain"), thumbs = col.querySelector("#bgThumbs"), count = col.querySelector("#bgCount");
      thumbs.innerHTML = items.map(function (it, i) {
        return it.type === "video"
          ? '<button class="bg-thumb is-video" data-i="' + i + '" style="background-image:url(https://img.youtube.com/vi/' + it.id + '/default.jpg)" aria-label="Watch video"></button>'
          : '<button class="bg-thumb" data-i="' + i + '" aria-label="Photo ' + (i + 1) + '"><img src="' + esc(it.src) + '" alt="" loading="lazy"></button>';
      }).join("");
      if (items.length < 2) thumbs.style.display = "none";

      function show(i) {
        cur = (i + items.length) % items.length;
        var it = items[cur];
        main.innerHTML = "";
        if (it.type === "video") main.appendChild(videoBox(it.id));
        else { var im = new Image(); im.src = it.src; im.alt = P.name + (cur ? " (view " + (cur + 1) + ")" : ""); im.addEventListener("click", function () { lightbox(cur); }); main.appendChild(im); }
        thumbs.querySelectorAll(".bg-thumb").forEach(function (b, k) { b.classList.toggle("active", k === cur); });
        if (count) count.textContent = (cur + 1) + " / " + items.length;
      }
      function lightbox(start) {
        var imgs = items.filter(function (x) { return x.type === "img"; }); if (!imgs.length) return;
        var k = Math.min(start, imgs.length - 1);
        var lb = document.createElement("div"); lb.className = "bg-lightbox";
        lb.innerHTML = '<button class="lb-x" aria-label="Close">&times;</button>' + (imgs.length > 1 ? '<button class="lb-p" aria-label="Previous">&#8249;</button><button class="lb-n" aria-label="Next">&#8250;</button>' : "") + '<img alt="">';
        var img = lb.querySelector("img");
        function set(n) { k = (n + imgs.length) % imgs.length; img.src = imgs[k].src; lb.classList.remove("zoom"); }
        function close() { lb.remove(); document.removeEventListener("keydown", key); }
        function key(e) { if (e.key === "Escape") close(); else if (e.key === "ArrowRight") set(k + 1); else if (e.key === "ArrowLeft") set(k - 1); }
        lb.querySelector(".lb-x").addEventListener("click", close);
        var p = lb.querySelector(".lb-p"), n = lb.querySelector(".lb-n");
        if (p) p.addEventListener("click", function () { set(k - 1); }); if (n) n.addEventListener("click", function () { set(k + 1); });
        img.addEventListener("click", function () { lb.classList.toggle("zoom"); });
        document.addEventListener("keydown", key); document.body.appendChild(lb); set(k);
      }
      thumbs.addEventListener("click", function (e) { var b = e.target.closest(".bg-thumb"); if (b) show(parseInt(b.dataset.i, 10)); });
      var pv = col.querySelector(".prev"), nx = col.querySelector(".next");
      if (pv) pv.addEventListener("click", function () { show(cur - 1); }); if (nx) nx.addEventListener("click", function () { show(cur + 1); });
      var x0 = null;
      main.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      main.addEventListener("touchend", function (e) { if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 50 && items.length > 1) show(cur + (dx < 0 ? 1 : -1)); });
      show(0);

      // "Ask about this gown" on WhatsApp
      var buy = document.getElementById("buyNowBtn");
      if (buy && !document.getElementById("waAsk")) {
        var a = document.createElement("a");
        a.id = "waAsk"; a.className = "wa-ask"; a.target = "_blank"; a.rel = "noopener noreferrer";
        a.href = "https://wa.me/" + WA + "?text=" + encodeURIComponent("Hello Molly Samuels, I'd like to ask about this gown: " + P.name + " - " + location.href);
        a.textContent = "Ask about this gown on WhatsApp";
        buy.parentNode.insertBefore(a, buy.nextSibling);
      }
    },
  };
})();
