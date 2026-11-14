// ============================================
// ADMIN - Build sitemap.xml (all live products) + one tiny share page per product
// Share page: p/<id>.html has the product photo/name/price for WhatsApp etc, then sends people to the real product page.
// ============================================
(function () {
  var SITE = "https://mollysamuels.com/";
  var sitemapXml = "", shareFiles = [];
  function $(id) { return document.getElementById(id); }
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function abs(u) { return /^https?:/i.test(u || "") ? u : SITE + String(u || "").replace(/^\/+/, ""); }
  function download(name, blob) {
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function sharePage(p) {
    var id = encodeURIComponent(p.id), url = SITE + "product?id=" + id;
    var brand = p.division === "msamuels" ? "M. Samuels" : "Mollys";
    var price = "₦" + Number(p.price_ngn || 0).toLocaleString("en-NG");
    var desc = (p.description ? String(p.description).replace(/\s+/g, " ").trim().slice(0, 160) : brand + " by Molly Samuels") + " — " + price;
    var img = abs(p.main_image_url);
    return '<!DOCTYPE html>\n<html lang="en"><head><meta charset="UTF-8">\n<title>' + esc(p.name) + ' — Molly Samuels</title>\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<link rel="canonical" href="' + esc(url) + '">\n' +
      '<meta name="description" content="' + esc(desc) + '">\n' +
      '<meta property="og:site_name" content="Molly Samuels">\n<meta property="og:type" content="product">\n' +
      '<meta property="og:title" content="' + esc(p.name) + '">\n<meta property="og:description" content="' + esc(desc) + '">\n' +
      '<meta property="og:url" content="' + esc(url) + '">\n<meta property="og:image" content="' + esc(img) + '">\n' +
      '<meta name="twitter:card" content="summary_large_image">\n' +
      '<meta http-equiv="refresh" content="0;url=/product?id=' + id + '">\n' +
      '<script>location.replace("/product?id=' + id + '");</script>\n</head>\n<body><p><a href="/product?id=' + id + '">View ' + esc(p.name) + '</a></p></body></html>\n';
  }

  document.addEventListener("adminReady", function () {
    $("smBuildBtn").addEventListener("click", build);
    $("smDlSitemap").addEventListener("click", function () { download("sitemap.xml", new Blob([sitemapXml], { type: "application/xml" })); });
    $("smDlShare").addEventListener("click", async function () {
      if (!window.JSZip) { alert("Zip tool did not load - check your internet and refresh."); return; }
      var z = new JSZip(); shareFiles.forEach(function (f) { z.file("p/" + f.name, f.html); });
      download("share-pages.zip", await z.generateAsync({ type: "blob" }));
    });
  });

  async function build() {
    var st = $("smStatus"); st.style.color = ""; st.textContent = "Reading your products…";
    try {
      var r = await supabaseClient.from("products").select("id,name,description,division,price_ngn,main_image_url,status,created_at").neq("status", "discontinued");
      if (r.error) throw r.error;
      var prods = (r.data || []).filter(function (p) { return p.main_image_url; });
      // keep your existing page entries, drop old product entries, add current ones
      var old = "";
      try { old = await (await fetch("sitemap.xml?v=" + Date.now())).text(); } catch (e) {}
      var blocks = (old.match(/<url>[\s\S]*?<\/url>/g) || []).filter(function (b) { return b.indexOf("product?id=") === -1; });
      var today = new Date().toISOString().slice(0, 10);
      var prodBlocks = prods.map(function (p) {
        var lm = (p.created_at || today).slice(0, 10);
        return "  <url>\n    <loc>" + esc(SITE + "product?id=" + encodeURIComponent(p.id)) + "</loc>\n    <lastmod>" + lm + "</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>";
      });
      sitemapXml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        blocks.map(function (b) { return "  " + b.trim(); }).concat(prodBlocks).join("\n") + "\n</urlset>\n";
      shareFiles = prods.map(function (p) { return { name: p.id + ".html", html: sharePage(p) }; });
      st.textContent = "Ready: " + blocks.length + " site pages + " + prods.length + " products in the sitemap, and " + shareFiles.length + " share pages.";
      $("smButtons").style.display = "flex";
      $("smSample").innerHTML = prods[0] ? 'Example share link: <b>' + esc(SITE + "p/" + prods[0].id) + "</b>" : "";
    } catch (e) { console.error(e); st.style.color = "#B23A3A"; st.textContent = "Something went wrong: " + (e.message || e); }
  }
})();
