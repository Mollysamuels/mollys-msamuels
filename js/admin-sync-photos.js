// ============================================
// ADMIN - Add products from photos
// Looks for the photos you uploaded to GitHub (names listed in js/photo-slots.js),
// and creates one real, buyable product for each photo that exists and has no
// product yet. Nothing is created for a photo that is not there.
// Photos stay on GitHub - nothing is uploaded to Supabase storage.
// ============================================
(function () {
  var BASE = "assets/images/mollys/";
  var CAT_NAMES = { gowns: "Gowns", tops: "Tops", bridal: "Bridal", "two-piece": "Two Piece", shoes: "Shoes", bags: "Bags",
                    jewellery: "Jewellery", accessories: "Accessories", polo: "Polo", jeans: "Jeans" };
  var CLOTHING = { gowns: 1, tops: 1, bridal: 1, "two-piece": 1, polo: 1, jeans: 1 };
  var SIZES = { clothing: ["S", "M", "L", "XL", "XXL"], onesize: ["One Size"] };
  var groups = [];        // { key, label, slug, prefix, name, price, stock, items:[{n,main,alt|null}] }
  var admin = null;
  var MODE = "mollys";                       // "mollys" or "ms" (M. Samuels)
  var BASE_MS = "assets/images/msamuels/";

  function $(id) { return document.getElementById(id); }
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function probe(src) {
    return new Promise(function (resolve) {
      var im = new Image(), done = false;
      function fin(ok) { if (!done) { done = true; resolve(ok); } }
      im.onload = function () { fin(true); }; im.onerror = function () { fin(false); };
      setTimeout(function () { fin(false); }, 8000);
      im.src = src + "?v=" + Date.now();
    });
  }
  // runs async tasks a few at a time
  async function pool(tasks, size) {
    var out = new Array(tasks.length), i = 0;
    async function run() { while (i < tasks.length) { var k = i++; out[k] = await tasks[k](); } }
    var w = []; for (var j = 0; j < size; j++) w.push(run());
    await Promise.all(w); return out;
  }

  document.addEventListener("adminReady", function (e) {
    admin = e.detail;
    $("asCheckBtn").addEventListener("click", check);
    $("asCreateBtn").addEventListener("click", create);
    document.querySelectorAll("input[name='asDivision']").forEach(function (r) {
      r.addEventListener("change", function () {
        MODE = r.value; groups = [];
        $("asResultPanel").style.display = "none"; $("asDone").style.display = "none"; $("asStatus").textContent = "";
        $("asCreateBtn").style.display = ""; $("asCreateBtn").disabled = false;
        $("asFolderNote").textContent = MODE === "ms" ? "assets/images/msamuels" : "assets/images/mollys";
        $("asExample").textContent = MODE === "ms" ? "school-blazer-2-main.jpg" : "gown-6-main.jpg";
      });
    });
  });

  // M. Samuels: the existing product in each category is the template for new ones
  async function loadRefs() {
    var names = (window.MS_PHOTO_SLOTS || []).map(function (g) { return g.ref; });
    var r = await supabaseClient.from("products")
      .select("name, category_id, price_ngn, delivery_fee_ngn, size_type, product_sizes(size_label)")
      .eq("division", "msamuels").in("name", names);
    if (r.error) throw r.error;
    var out = {};
    (r.data || []).forEach(function (p) { out[p.name] = p; });
    return out;
  }

  async function check() {
    var btn = $("asCheckBtn"), st = $("asStatus");
    btn.disabled = true; $("asResultPanel").style.display = "none"; $("asDone").style.display = "none";
    st.style.color = ""; st.textContent = "Looking at your GitHub photos…";
    try {
      var includeOld = $("asIncludeOld").checked;
      // photos that already have a product (matched by their photo address)
      var have = new Set();
      var r = await supabaseClient.from("products").select("main_image_url");
      if (r.error) throw r.error;
      (r.data || []).forEach(function (p) { if (p.main_image_url) have.add(String(p.main_image_url).replace(/^\/+/, "")); });

      groups = [];
      var tasks = [], meta = [];
      var refs = {};
      if (MODE === "ms") refs = await loadRefs();
      var list = [];
      if (MODE === "ms") {
        (window.MS_PHOTO_SLOTS || []).forEach(function (g) { list.push({ slug: g.prefix, g: g, base: BASE_MS, ms: true }); });
      } else {
        Object.keys(window.PHOTO_SLOTS).forEach(function (slug) {
          window.PHOTO_SLOTS[slug].forEach(function (g) { list.push({ slug: slug, g: g, base: BASE, ms: false }); });
        });
      }
      var missingRefs = [];
      list.forEach(function (x) {
        var g = x.g, slug = x.slug;
        (function () {
          var price = g.price;
          if (x.ms) { var rf = refs[g.ref]; if (rf) price = rf.price_ngn; else { price = 0; missingRefs.push(g.ref); } }
          var grp = { key: g.prefix, label: g.name, slug: slug, prefix: g.prefix, name: g.name, price: price, stock: 5, items: [],
                      base: x.base, ms: x.ms, ref: g.ref, catLabel: g.catLabel };
          groups.push(grp);
          var start = includeOld ? g.from : Math.max(g.from, g.newFrom || g.from);
          for (var n = start; n <= g.to; n++) {
            (function (n) {
              var main = x.base + g.prefix + "-" + n + "-main.jpg";
              if (have.has(main)) return;
              meta.push({ grp: grp, n: n, main: main });
              tasks.push(function () { return probe(main); });
            })(n);
          }
        })();
      });
      var res = await pool(tasks, 8);
      var altTasks = [], altMeta = [];
      res.forEach(function (ok, i) {
        if (!ok) return;
        var m = meta[i], it = { n: m.n, main: m.main, alt: null };
        m.grp.items.push(it);
        var alt = m.grp.base + m.grp.prefix + "-" + m.n + "-alt.jpg";
        altMeta.push({ it: it, alt: alt }); altTasks.push(function () { return probe(alt); });
      });
      var altRes = await pool(altTasks, 8);
      altRes.forEach(function (ok, i) { if (ok) altMeta[i].it.alt = altMeta[i].alt; });

      groups = groups.filter(function (g) { return g.items.length; });
      if (!groups.length) {
        st.textContent = "No new photos found. (Photos that already have a product are skipped.) Upload photos named like " + (MODE === "ms" ? "school-blazer-2-main.jpg to assets/images/msamuels" : "gown-6-main.jpg to assets/images/mollys") + " on GitHub, wait a minute, then check again.";
        btn.disabled = false; return;
      }
      var total = groups.reduce(function (a, g) { return a + g.items.length; }, 0);
      st.textContent = "Found " + total + " new photos." + (missingRefs.length ? " Note: could not find the existing product(s) " + missingRefs.join(", ") + " to copy the price from, so their price starts at 0 - type the price in." : "");
      $("asGroups").innerHTML = groups.map(function (g, gi) {
        var first = g.items[0].n, last = g.items[g.items.length - 1].n;
        var rowsHtml = g.items.map(function (it, ii) {
          return "<tr><td><img src='" + esc(it.main) + "' alt='' style='width:44px;height:55px;object-fit:cover;border-radius:4px;'></td>" +
            "<td><input type='text' class='asName' data-g='" + gi + "' data-i='" + ii + "' value='" + esc(g.name + " " + it.n) + "' style='width:170px;'></td>" +
            "<td><input type='number' min='0' step='100' class='asPrice' data-g='" + gi + "' data-i='" + ii + "' value='" + g.price + "' style='width:110px;'></td>" +
            "<td><input type='number' min='0' step='1' class='asStock' data-g='" + gi + "' data-i='" + ii + "' value='" + g.stock + "' style='width:70px;'></td></tr>";
        }).join("");
        return "<div style='margin-bottom:26px;'><h3 style='font-size:1rem;margin-bottom:8px;'>" + esc(g.name) + " " + first + (last !== first ? "–" + last : "") +
          " <span style='color:var(--ink-soft);font-size:0.8rem;font-weight:400;'>(" + esc(g.ms ? g.catLabel : CAT_NAMES[g.slug]) + " · " + g.items.length + " photos)</span></h3>" +
          "<div style='display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap;'><span style='font-size:0.85rem;'>Same price for all:</span>" +
          "<input type='number' min='0' step='100' id='asAll" + gi + "' placeholder='&#8358;' style='width:110px;'>" +
          "<button type='button' class='btn btn-outline asApply' data-g='" + gi + "' style='padding:6px 12px;font-size:0.8rem;color:var(--ink);border-color:var(--line);'>Apply to all</button></div>" +
          "<table class='admin-table'><tr><th></th><th>Name</th><th>Price (&#8358;)</th><th>Stock</th></tr>" + rowsHtml + "</table></div>";
      }).join("");
      document.querySelectorAll(".asApply").forEach(function (b) {
        b.addEventListener("click", function () {
          var gi = b.dataset.g, v = $("asAll" + gi).value;
          if (v === "") return;
          document.querySelectorAll(".asPrice[data-g='" + gi + "']").forEach(function (el) { el.value = v; });
        });
      });
      $("asCreateBtn").textContent = "Create " + total + " products";
      $("asCreateBtn").disabled = false;
      $("asResultPanel").style.display = "block";
    } catch (err) {
      console.error(err);
      st.style.color = "#B23A3A"; st.textContent = "Couldn't check right now. Please try again.";
    }
    btn.disabled = false;
  }

  async function createMs(btn) {
    var refs = await loadRefs();
    var rows = [], missing = [];
    groups.forEach(function (g) {
      var rf = refs[g.ref];
      if (!rf) { missing.push(g.ref); return; }
      g.items.forEach(function (it) {
        rows.push({
          name: it.name, description: "", details: "", division: "msamuels", category_id: rf.category_id,
          price_ngn: it.price, delivery_fee_ngn: rf.delivery_fee_ngn, stock_qty: it.stock, is_featured: false, is_new: false,
          size_type: rf.size_type, main_image_url: it.main, alt_image_url: it.alt, _sizes: (rf.product_sizes || []).map(function (x) { return x.size_label; })
        });
      });
    });
    if (missing.length) throw new Error("Could not find the existing product(s): " + missing.join(", "));
    var made = 0;
    for (var i = 0; i < rows.length; i += 40) {
      btn.textContent = "Creating products… " + made + " of " + rows.length;
      var chunk = rows.slice(i, i + 40);
      var sizesFor = chunk.map(function (r) { return r._sizes; });
      var clean = chunk.map(function (r) { var c = Object.assign({}, r); delete c._sizes; return c; });
      var r = await supabaseClient.from("products").insert(clean).select("id, size_type");
      if (r.error) throw r.error;
      var sizeRows = [];
      (r.data || []).forEach(function (p, idx) {
        var labels = sizesFor[idx] && sizesFor[idx].length ? sizesFor[idx] : (SIZES[p.size_type] || []);
        labels.forEach(function (lab) { sizeRows.push({ product_id: p.id, size_label: lab, in_stock: true }); });
      });
      if (sizeRows.length) {
        var sr = await supabaseClient.from("product_sizes").insert(sizeRows);
        if (sr.error) throw sr.error;
      }
      made += chunk.length;
    }
    $("asGroups").innerHTML = ""; $("asCreateBtn").style.display = "none";
    $("asDone").innerHTML = "Done — " + made + " M. Samuels products created and live. <a href='admin-products.html'>Open Products</a> to rename them or change prices, sizes and colours.";
    $("asDone").style.display = "block";
  }

  async function create() {
    var btn = $("asCreateBtn"), errEl = $("asError");
    errEl.style.display = "none";
    if (admin && !admin.can_edit_pricing) {
      errEl.textContent = "Only the pricing-authorised admin can create products with prices."; errEl.style.display = "block"; return;
    }
    var bad = false;
    document.querySelectorAll(".asName").forEach(function (el) { groups[el.dataset.g].items[el.dataset.i].name = el.value.trim(); });
    document.querySelectorAll(".asPrice").forEach(function (el) { var p = parseFloat(el.value) || 0; if (!(p > 0)) bad = true; groups[el.dataset.g].items[el.dataset.i].price = p; });
    document.querySelectorAll(".asStock").forEach(function (el) { groups[el.dataset.g].items[el.dataset.i].stock = Math.max(0, parseInt(el.value, 10) || 0); });
    groups.forEach(function (g) { g.items.forEach(function (it) { if (!it.name) bad = true; }); });
    if (bad) {
      errEl.textContent = "Every product needs a name and a price above 0."; errEl.style.display = "block"; return;
    }
    btn.disabled = true;
    try {
      if (MODE === "ms") { await createMs(btn); return; }
      btn.textContent = "Setting up categories…";
      var c = await supabaseClient.from("categories").select("id, slug, division");
      if (c.error) throw c.error;
      var catId = {};
      (c.data || []).forEach(function (x) { if (x.division === "mollys") catId[x.slug] = x.id; });
      var slugs = Array.from(new Set(groups.map(function (g) { return g.slug; })));
      for (var s = 0; s < slugs.length; s++) {
        if (catId[slugs[s]]) continue;
        var ins = await supabaseClient.from("categories").insert({ name: CAT_NAMES[slugs[s]], slug: slugs[s], division: "mollys" }).select("id").single();
        if (ins.error) throw ins.error;
        catId[slugs[s]] = ins.data.id;
      }

      var rows = [];
      groups.forEach(function (g) {
        var type = CLOTHING[g.slug] ? "clothing" : "onesize";
        g.items.forEach(function (it) {
          rows.push({
            name: it.name, description: "", details: "", division: "mollys", category_id: catId[g.slug],
            price_ngn: it.price, delivery_fee_ngn: 2500, stock_qty: it.stock, is_featured: false, is_new: true,
            size_type: type, main_image_url: it.main, alt_image_url: it.alt
          });
        });
      });

      var made = 0;
      for (var i = 0; i < rows.length; i += 40) {
        btn.textContent = "Creating products… " + made + " of " + rows.length;
        var chunk = rows.slice(i, i + 40);
        var r = await supabaseClient.from("products").insert(chunk).select("id, size_type");
        if (r.error) throw r.error;
        var sizeRows = [];
        (r.data || []).forEach(function (p) {
          (SIZES[p.size_type] || []).forEach(function (lab) { sizeRows.push({ product_id: p.id, size_label: lab, in_stock: true }); });
        });
        if (sizeRows.length) {
          var sr = await supabaseClient.from("product_sizes").insert(sizeRows);
          if (sr.error) throw sr.error;
        }
        made += chunk.length;
      }
      $("asGroups").innerHTML = ""; $("asCreateBtn").style.display = "none";
      $("asDone").innerHTML = "Done — " + made + " products created and live. <a href='admin-products.html'>Open Products</a> to rename them or change prices, sizes and colours.";
      $("asDone").style.display = "block";
    } catch (err) {
      console.error(err);
      var msg = String((err && err.message) || "");
      errEl.textContent = /row-level security|permission|403/i.test(msg)
        ? "This account isn't allowed to create products or categories (pricing-authorised admin only)."
        : "Something went wrong part-way. Press Check photos again — photos that already became products are skipped, so nothing is doubled.";
      errEl.style.display = "block";
      btn.disabled = false; btn.textContent = "Try again";
    }
  }
})();
