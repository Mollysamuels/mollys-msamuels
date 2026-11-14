// ============================================
// ADMIN - Match hover ("alt") photos to products
// 1) Scan: finds products using GitHub photos + every *-alt.jpg photo that really exists.
// 2) Auto-attach: gown-6-alt.jpg -> product whose photo is gown-6-main.jpg (only where no hover photo yet).
// 3) Review: side-by-side main + hover photo; pick a different one or clear. Saved instantly.
// ============================================
(function () {
  var BASE = "assets/images/mollys/";
  var products = [];            // {id,name,main,alt,prefix,n}
  var altPool = [];             // [{path,prefix,n}] all alt photos that exist
  var altSet = {};
  function $(id) { return document.getElementById(id); }
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function norm(u) { return String(u || "").replace(/^\/+/, ""); }
  function probe(src) {
    return new Promise(function (resolve) {
      var im = new Image(), done = false;
      function fin(ok) { if (!done) { done = true; resolve(ok); } }
      im.onload = function () { fin(true); }; im.onerror = function () { fin(false); };
      setTimeout(function () { fin(false); }, 8000);
      im.src = src + "?v=" + Date.now();
    });
  }
  async function pool(tasks, size) {
    var out = new Array(tasks.length), i = 0;
    async function run() { while (i < tasks.length) { var k = i++; out[k] = await tasks[k](); } }
    var w = []; for (var j = 0; j < size; j++) w.push(run());
    await Promise.all(w); return out;
  }
  function parse(path) {
    var m = /([a-z0-9-]+?)-(\d+)-(main|alt)\.jpg$/i.exec(path || "");
    return m ? { prefix: m[1].toLowerCase(), n: parseInt(m[2], 10), kind: m[3].toLowerCase() } : null;
  }
  function label(path) { var p = parse(path); return p ? p.prefix + "-" + p.n : path; }

  document.addEventListener("adminReady", function () {
    $("mpScanBtn").addEventListener("click", scan);
    $("mpAutoBtn").addEventListener("click", autoAttach);
    $("mpOnlyIssues").addEventListener("change", render);
  });

  async function scan() {
    var st = $("mpStatus"), btn = $("mpScanBtn");
    btn.disabled = true; st.style.color = ""; st.textContent = "Loading your products…";
    try {
      var r = await supabaseClient.from("products").select("id,name,main_image_url,alt_image_url").eq("division", "mollys");
      if (r.error) throw r.error;
      products = [];
      (r.data || []).forEach(function (p) {
        var main = norm(p.main_image_url);
        if (main.indexOf(BASE) !== 0) return;
        var info = parse(main); if (!info) return;
        products.push({ id: p.id, name: p.name, main: main, alt: norm(p.alt_image_url) || "", prefix: info.prefix, n: info.n });
      });
      products.sort(function (a, b) { return a.prefix === b.prefix ? a.n - b.n : a.prefix < b.prefix ? -1 : 1; });

      st.textContent = "Looking for hover photos on GitHub…";
      var tasks = [], meta = [], seen = {};
      products.forEach(function (p) { var k = p.prefix + "-" + p.n; if (!seen[k]) { seen[k] = 1; meta.push({ prefix: p.prefix, n: p.n }); } });
      // also any alt numbers that products might not have (range from photo-slots)
      Object.keys(window.PHOTO_SLOTS || {}).forEach(function (slug) {
        window.PHOTO_SLOTS[slug].forEach(function (g) {
          for (var n = g.from; n <= g.to; n++) { var k = g.prefix + "-" + n; if (!seen[k]) { seen[k] = 1; meta.push({ prefix: g.prefix, n: n }); } }
        });
      });
      meta.forEach(function (m) { tasks.push(function () { return probe(BASE + m.prefix + "-" + m.n + "-alt.jpg"); }); });
      var res = await pool(tasks, 8);
      altPool = []; altSet = {};
      res.forEach(function (ok, i) { if (ok) { var path = BASE + meta[i].prefix + "-" + meta[i].n + "-alt.jpg"; altPool.push({ path: path, prefix: meta[i].prefix, n: meta[i].n }); altSet[path] = 1; } });
      altPool.sort(function (a, b) { return a.prefix === b.prefix ? a.n - b.n : a.prefix < b.prefix ? -1 : 1; });
      var todo = products.filter(function (p) { return !p.alt && altSet[BASE + p.prefix + "-" + p.n + "-alt.jpg"]; }).length;
      st.textContent = "Found " + products.length + " products and " + altPool.length + " hover photos. " + todo + " can be attached automatically.";
      $("mpAutoBtn").disabled = false; $("mpListPanel").style.display = "block";
      render();
    } catch (e) {
      console.error(e); st.style.color = "#B23A3A"; st.textContent = "Something went wrong: " + (e.message || e);
    }
    btn.disabled = false;
  }

  async function save(p, newAlt) {
    var r = await supabaseClient.from("products").update({ alt_image_url: newAlt || null }).eq("id", p.id);
    if (r.error) { alert("Could not save: " + r.error.message); return false; }
    p.alt = newAlt || ""; return true;
  }

  async function autoAttach() {
    var st = $("mpStatus"), btn = $("mpAutoBtn");
    var todo = products.filter(function (p) { return !p.alt && altSet[BASE + p.prefix + "-" + p.n + "-alt.jpg"]; });
    if (!todo.length) { st.textContent = "Nothing to attach: every product that has a matching hover photo already has one."; return; }
    btn.disabled = true; var ok = 0;
    for (var i = 0; i < todo.length; i++) {
      st.textContent = "Attaching " + (i + 1) + " of " + todo.length + "…";
      if (await save(todo[i], BASE + todo[i].prefix + "-" + todo[i].n + "-alt.jpg")) ok++;
    }
    st.textContent = "Done: attached " + ok + " hover photo" + (ok === 1 ? "" : "s") + ". Check the pairs below.";
    btn.disabled = false; render();
  }

  function isOdd(p) {
    if (!p.alt) return true;
    var a = parse(p.alt); return !a || a.prefix !== p.prefix || a.n !== p.n;
  }

  function render() {
    var only = $("mpOnlyIssues").checked, host = $("mpList");
    var list = products.filter(function (p) { return !only || isOdd(p); });
    if (!list.length) { host.innerHTML = '<p style="color:var(--ink-soft);">Nothing to show.</p>'; return; }
    var usedBy = {}; products.forEach(function (p) { if (p.alt) usedBy[p.alt] = (usedBy[p.alt] || 0) + 1; });
    host.innerHTML = list.map(function (p) {
      var odd = p.alt ? isOdd(p) : false;
      var opts = '<option value="">— no hover photo —</option>' + altPool.map(function (a) {
        return '<option value="' + esc(a.path) + '"' + (a.path === p.alt ? " selected" : "") + ">" + esc(a.prefix + "-" + a.n) + "</option>";
      }).join("");
      if (p.alt && !altSet[p.alt]) opts += '<option value="' + esc(p.alt) + '" selected>' + esc(label(p.alt)) + " (file not found)</option>";
      var warn = !p.alt ? '<span style="color:#9a6b00;">No hover photo</span>'
        : odd ? '<span style="color:#B23A3A;">Different number &mdash; check it</span>'
        : usedBy[p.alt] > 1 ? '<span style="color:#B23A3A;">Used on 2 products</span>' : '<span style="color:#2f7a3d;">Matched</span>';
      return '<div class="mp-row" data-id="' + esc(p.id) + '" style="display:flex;gap:14px;align-items:center;padding:10px 0;border-bottom:1px solid #eee;flex-wrap:wrap;">' +
        '<img src="' + esc(p.main) + '" alt="" loading="lazy" style="width:78px;height:104px;object-fit:cover;border-radius:4px;background:#f2f2f2;">' +
        (p.alt ? '<img src="' + esc(p.alt) + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'" style="width:78px;height:104px;object-fit:cover;border-radius:4px;background:#f2f2f2;">'
               : '<div style="width:78px;height:104px;border:1px dashed #ccc;border-radius:4px;"></div>') +
        '<div style="flex:1;min-width:180px;"><div style="font-weight:600;">' + esc(p.name) + '</div>' +
        '<div style="font-size:0.78rem;color:var(--ink-soft);">main: ' + esc(label(p.main)) + ' &middot; ' + warn + '</div>' +
        '<select class="mp-pick" style="margin-top:6px;max-width:100%;">' + opts + '</select> ' +
        '<button type="button" class="mp-clear" style="font-size:0.78rem;margin-left:4px;">Clear</button></div></div>';
    }).join("");
    host.querySelectorAll(".mp-row").forEach(function (row) {
      var p = products.filter(function (x) { return String(x.id) === row.dataset.id; })[0];
      row.querySelector(".mp-pick").addEventListener("change", async function (e) { if (await save(p, e.target.value)) render(); });
      row.querySelector(".mp-clear").addEventListener("click", async function () { if (await save(p, "")) render(); });
    });
  }
})();
