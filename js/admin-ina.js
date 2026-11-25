/* INA (Input Ads) - admin only. You type in ads, results by date range, comments and platform logos.
   Everything shows on the Gg Ad API page by itself. Only signed-in admins can save (the database enforces this too). */
(function () {
  "use strict";
  var A = window.MSAds, e = A.esc;
  var $ = function (id) { return document.getElementById(id); };
  var D = { platforms: [], places: [], ads: [], results: [], comments: [] };
  var editAd = null, editRes = null, editCom = null;
  var sb = function () { return supabaseClient; };

  function say(id, msg, bad) { var m = $(id); if (!m) return; m.textContent = msg || ""; m.style.color = bad ? "#9b1c1c" : "#1c6b2f"; }
  function adById(id) { return D.ads.filter(function (a) { return a.id === id; })[0]; }
  function placeById(id) { return D.places.filter(function (p) { return p.id === id; })[0]; }
  function today() { return A.ymd(new Date()); }
  function num(v) { v = String(v == null ? "" : v).replace(/[,\s]/g, ""); if (v === "") return 0; return /^\d{1,12}$/.test(v) ? Number(v) : NaN; }
  function money(v) { v = String(v == null ? "" : v).replace(/[,\s]/g, ""); if (v === "") return 0; return /^\d{1,12}(\.\d{1,2})?$/.test(v) ? Number(v) : NaN; }
  function plats() { return D.platforms.length ? D.platforms : A.PLATFORMS; }
  function errText(r) { return (r.error && (r.error.message || r.error.details)) || "you may not have permission"; }

  /* ---------- load + draw ---------- */
  function reload() {
    return A.loadAll(sb()).then(function (r) {
      if (r.error) {
        var box = $("inaSetup");
        box.innerHTML = '<div class="admin-panel"><p style="color:#9b1c1c"><b>' + (r.setup ? "INA is not set up yet." : "Could not load your ads.") + "</b> " +
          (r.setup ? "Run <code>7-ADS-SETUP.sql</code> in Supabase (SQL Editor), then refresh this page." : e(r.error.message || "")) + "</p></div>";
        ["pAd", "pRes", "pCom", "pLogo"].forEach(function (id) { $(id).hidden = true; });
        return false;
      }
      D = r; draw(); return true;
    });
  }
  function draw() { drawPlatformSelect(); drawAds(); drawAdSelects(); drawPlaces(); drawResults(); drawComments(); drawLogos(); curTag(); }

  function drawPlatformSelect() {
    var s = $("aPlat"), v = s.value;
    s.innerHTML = plats().map(function (p) { return '<option value="' + e(p.code) + '">' + e(p.name) + "</option>"; }).join("");
    if (v) s.value = v;
  }
  function drawAds() {
    var body = $("adRows");
    if (!D.ads.length) { body.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--ink-soft);padding:20px;">No ads yet. Add your first ad above.</td></tr>'; return; }
    body.innerHTML = D.ads.slice().reverse().map(function (a) {
      var st = ["ongoing", "paused", "ended"].map(function (k) { return '<option value="' + k + '"' + (a.status === k ? " selected" : "") + ">" + k.charAt(0).toUpperCase() + k.slice(1) + "</option>"; }).join("");
      return "<tr><td>" + A.logo(a.platform, D.platforms, 24) + ' <b style="margin-left:6px">' + e(a.name) + "</b>" + (a.video_name ? '<br><span class="ina-note">' + e(a.video_name) + "</span>" : "") + "</td>" +
        '<td><select class="ina-st" data-act="st" data-id="' + e(a.id) + '" aria-label="Status of ' + e(a.name) + '">' + st + "</select></td>" +
        '<td><span class="ina-curtag">' + e((A.CUR[a.currency] || A.CUR.NGN).sym + " " + a.currency) + "</span></td>" +
        "<td>" + (a.start_date ? e(A.dLabel(a.start_date)) : "—") + (a.end_date ? " → " + e(A.dLabel(a.end_date)) : "") + "</td>" +
        '<td class="ina-row-actions"><button type="button" class="btn btn-outline ina-small" data-act="editAd" data-id="' + e(a.id) + '" style="border-color:var(--line)">Edit</button>' +
        '<button type="button" class="btn btn-outline ina-small ina-danger" data-act="delAd" data-id="' + e(a.id) + '">Delete</button></td></tr>';
    }).join("");
  }
  function adLabel(a) { return a.name + " — " + A.meta(a.platform, D.platforms).name + " (" + (A.CUR[a.currency] || A.CUR.NGN).sym + ")"; }
  function drawAdSelects() {
    ["rAd", "cAd"].forEach(function (id) {
      var s = $(id), v = s.value;
      s.innerHTML = D.ads.length ? D.ads.map(function (a) { return '<option value="' + e(a.id) + '">' + e(adLabel(a)) + "</option>"; }).join("") : '<option value="">Add an ad first</option>';
      if (v && adById(v)) s.value = v;
    });
    var f = $("fRes"), fv = f.value;
    f.innerHTML = '<option value="">All ads</option>' + D.ads.map(function (a) { return '<option value="' + e(a.id) + '">' + e(adLabel(a)) + "</option>"; }).join("");
    if (fv && adById(fv)) f.value = fv;
  }
  function curTag() { var a = adById($("rAd").value); $("rCur").textContent = a ? (A.CUR[a.currency] || A.CUR.NGN).sym : "₦"; }
  function drawPlaces() {
    var s = $("rPlace"), v = s.value;
    s.innerHTML = D.places.slice().sort(function (a, b) { return (b.is_builtin - a.is_builtin) || a.name.localeCompare(b.name); }).map(function (p) {
      return '<option value="' + e(p.id) + '">' + e(p.name) + (p.is_builtin ? "" : p.kind === "other_app" ? " (app)" : " (website)") + "</option>";
    }).join("");
    if (v && placeById(v)) s.value = v;
    var custom = D.places.filter(function (p) { return !p.is_builtin; });
    $("placeList").innerHTML = custom.length ? "Your added places: " + custom.map(function (p) {
      return '<span class="ina-curtag" style="margin:2px 4px 2px 0">' + e(p.name) + ' <button type="button" data-act="delPlace" data-id="' + e(p.id) + '" aria-label="Delete ' + e(p.name) + '" style="border:0;background:none;cursor:pointer;color:#9b1c1c;font-weight:700">×</button></span>';
    }).join("") : "";
  }
  function drawResults() {
    var body = $("resRows"), f = $("fRes").value;
    var rows = D.results.filter(function (r) { return !f || r.ad_id === f; }).sort(function (a, b) { return a.date_from < b.date_from ? 1 : a.date_from > b.date_from ? -1 : 0; });
    if (!rows.length) { body.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--ink-soft);padding:20px;">No results typed in yet.</td></tr>'; return; }
    body.innerHTML = rows.map(function (r) {
      var a = adById(r.ad_id) || {}, p = placeById(r.place_id) || {};
      return "<tr><td>" + e(A.rangeLabel(r.date_from, r.date_to)) + "</td><td><b>" + e(a.name || "") + "</b><br><span class=\"ina-note\">" + e(p.name || "") + (r.note ? " · " + e(r.note) : "") + "</span></td>" +
        "<td>" + A.int(r.impressions) + "</td><td>" + A.int(r.clicks) + "</td><td>" + A.int(r.views) + "</td><td>" + A.money(r.cost, a.currency) + "</td>" +
        '<td class="ina-row-actions"><button type="button" class="btn btn-outline ina-small" data-act="editRes" data-id="' + e(r.id) + '" style="border-color:var(--line)">Edit</button>' +
        '<button type="button" class="btn btn-outline ina-small ina-danger" data-act="delRes" data-id="' + e(r.id) + '">Delete</button></td></tr>';
    }).join("");
  }
  function drawComments() {
    var box = $("comList");
    if (!D.comments.length) { box.innerHTML = '<p class="ina-note">No comments yet.</p>'; return; }
    box.innerHTML = D.comments.slice().reverse().map(function (c) {
      var a = adById(c.ad_id) || {};
      return '<div class="ina-cm">' + A.logo(a.platform, D.platforms, 20) + ' <b style="margin-left:6px">' + e(a.name || "") + "</b>" +
        '<span class="ina-note"> · ' + e(c.author || "Anonymous") + (c.commented_on ? " · " + e(A.dLabel(c.commented_on)) : "") + "</span><p>" + e(c.body) + "</p>" +
        '<button type="button" class="btn btn-outline ina-small" data-act="editCom" data-id="' + e(c.id) + '" style="border-color:var(--line);margin-right:6px">Edit</button>' +
        '<button type="button" class="btn btn-outline ina-small ina-danger" data-act="delCom" data-id="' + e(c.id) + '">Delete</button></div>';
    }).join("");
  }
  function drawLogos() {
    $("logoRows").innerHTML = plats().map(function (p) {
      return '<div class="ina-logo-row"><div class="pv">' + A.logo(p.code, D.platforms, 38) + '</div><div><label class="ina-note" for="lf_' + e(p.code) + '">' + e(p.name) + ' logo file</label><br>' +
        '<input type="file" id="lf_' + e(p.code) + '" accept="image/png,image/jpeg,image/webp"></div>' +
        '<button type="button" class="btn btn-gold ina-small" data-act="upLogo" data-code="' + e(p.code) + '">Upload</button>' +
        (A.meta(p.code, D.platforms).logo ? '<button type="button" class="btn btn-outline ina-small ina-danger" data-act="rmLogo" data-code="' + e(p.code) + '">Remove logo</button>' : "") + "</div>";
    }).join("");
  }

  /* ---------- ads ---------- */
  function resetAd() { editAd = null; ["aName", "aVideo", "aUrl", "aStart", "aEnd", "aNotes"].forEach(function (i) { $(i).value = ""; }); $("aStatus").value = "ongoing"; $("aCur").value = "NGN"; $("adTitle").textContent = "1. Add an ad"; $("bAd").textContent = "Save ad"; $("bAdCancel").hidden = true; }
  function saveAd() {
    var name = $("aName").value.trim(), url = $("aUrl").value.trim(), plat = $("aPlat").value, s = $("aStart").value, en = $("aEnd").value;
    if (!name) return say("mAd", "Please type the ad name.", true);
    if (url && !A.safeHttps(url)) return say("mAd", "The video link must start with https://", true);
    if (url && plat === "youtube" && !A.parseYouTube(url)) return say("mAd", "That does not look like a YouTube video link. Paste the link from the YouTube share button.", true);
    if (s && en && en < s) return say("mAd", "The end date cannot be before the start date.", true);
    var row = { platform: plat, name: name, video_name: $("aVideo").value.trim() || null, video_url: url || null, status: $("aStatus").value, currency: $("aCur").value, start_date: s || null, end_date: en || null, notes: $("aNotes").value.trim() || null };
    say("mAd", "Saving…");
    var q = editAd ? sb().from("ad_campaigns").update(row).eq("id", editAd) : sb().from("ad_campaigns").insert(row);
    q.then(function (r) {
      if (r.error) return say("mAd", "Could not save: " + errText(r), true);
      var was = !!editAd; resetAd(); say("mAd", was ? "Ad updated." : "Ad saved. Now add its results below.");
      reload();
    });
  }
  function startEditAd(id) {
    var a = adById(id); if (!a) return; editAd = id;
    $("aPlat").value = a.platform; $("aName").value = a.name; $("aVideo").value = a.video_name || ""; $("aUrl").value = a.video_url || ""; $("aStatus").value = a.status; $("aCur").value = a.currency;
    $("aStart").value = a.start_date || ""; $("aEnd").value = a.end_date || ""; $("aNotes").value = a.notes || "";
    $("adTitle").textContent = "1. Edit this ad"; $("bAd").textContent = "Save changes"; $("bAdCancel").hidden = false; say("mAd", ""); $("pAd").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function delAd(id) {
    var a = adById(id); if (!a) return;
    var nr = D.results.filter(function (r) { return r.ad_id === id; }).length, nc = D.comments.filter(function (c) { return c.ad_id === id; }).length;
    if (!window.confirm('Delete the ad "' + a.name + '"?' + (nr || nc ? "\n\nThis also deletes its " + nr + " result entries and " + nc + " comments." : "") + "\n\nThis cannot be undone.")) return;
    sb().from("ad_campaigns").delete().eq("id", id).then(function (r) { if (r.error) return say("mAd", "Could not delete: " + errText(r), true); if (editAd === id) resetAd(); say("mAd", "Ad deleted."); reload(); });
  }

  /* ---------- results ---------- */
  function resetRes() { editRes = null; ["rFrom", "rTo", "rImp", "rClk", "rViews", "rCost", "rNote"].forEach(function (i) { $(i).value = ""; }); $("resTitle").textContent = "2. Add results for a date range"; $("bRes").textContent = "Save results"; $("bResCancel").hidden = true; }
  function saveRes() {
    var ad = $("rAd").value, place = $("rPlace").value, from = $("rFrom").value, to = $("rTo").value;
    if (!ad) return say("mRes", "Add an ad first (section 1).", true);
    if (!place) return say("mRes", "Please choose where it appeared.", true);
    if (!from || !to) return say("mRes", "Please choose the From and To dates.", true);
    if (to < from) return say("mRes", "The To date cannot be before the From date.", true);
    var imp = num($("rImp").value), clk = num($("rClk").value), vw = num($("rViews").value), cost = money($("rCost").value);
    if ([imp, clk, vw].some(isNaN)) return say("mRes", "Impressions, clicks and views must be whole numbers (digits only).", true);
    if (isNaN(cost)) return say("mRes", "The cost must be a number like 15000 or 15000.50.", true);
    if (clk > imp && !window.confirm("Clicks (" + A.int(clk) + ") are more than impressions (" + A.int(imp) + "). Save anyway?")) return;
    var clash = D.results.filter(function (r) { return r.id !== editRes && r.ad_id === ad && r.place_id === place && r.date_from <= to && r.date_to >= from; });
    if (clash.length && !window.confirm("This ad already has an entry for the same place with dates that overlap (" + A.rangeLabel(clash[0].date_from, clash[0].date_to) + "). Saving may count the same days twice. Save anyway?")) return;
    var row = { ad_id: ad, place_id: place, date_from: from, date_to: to, impressions: imp, clicks: clk, views: vw, cost: cost, note: $("rNote").value.trim() || null };
    say("mRes", "Saving…");
    var q = editRes ? sb().from("ad_results").update(row).eq("id", editRes) : sb().from("ad_results").insert(row);
    q.then(function (r) {
      if (r.error) return say("mRes", "Could not save: " + errText(r), true);
      var was = !!editRes; resetRes(); say("mRes", was ? "Entry updated." : "Saved. It now shows on the Gg Ad API page."); reload();
    });
  }
  function startEditRes(id) {
    var r = D.results.filter(function (x) { return x.id === id; })[0]; if (!r) return; editRes = id;
    $("rAd").value = r.ad_id; $("rPlace").value = r.place_id; $("rFrom").value = r.date_from; $("rTo").value = r.date_to; $("rImp").value = r.impressions; $("rClk").value = r.clicks; $("rViews").value = r.views; $("rCost").value = r.cost; $("rNote").value = r.note || "";
    curTag(); $("resTitle").textContent = "2. Edit this entry"; $("bRes").textContent = "Save changes"; $("bResCancel").hidden = false; say("mRes", ""); $("pRes").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function delRes(id) {
    if (!window.confirm("Delete this result entry? This cannot be undone.")) return;
    sb().from("ad_results").delete().eq("id", id).then(function (r) { if (r.error) return say("mRes", "Could not delete: " + errText(r), true); if (editRes === id) resetRes(); say("mRes", "Entry deleted."); reload(); });
  }
  function addPlace() {
    var name = $("pName").value.trim().replace(/\s+/g, " "), kind = $("pKind").value;
    if (!name) return say("mPlace", "Please type the full name of the website or app.", true);
    if (D.places.some(function (p) { return p.name.toLowerCase() === name.toLowerCase(); })) return say("mPlace", "That place is already in the list.", true);
    sb().from("ad_places").insert({ name: name, kind: kind }).select().single().then(function (r) {
      if (r.error) return say("mPlace", "Could not add: " + errText(r), true);
      $("pName").value = ""; say("mPlace", "Added. You can now choose it in “Where it appeared”.");
      reload().then(function () { $("rPlace").value = r.data.id; });
    });
  }
  function delPlace(id) {
    var p = placeById(id); if (!p || p.is_builtin) return;
    if (!window.confirm('Remove "' + p.name + '" from the list?')) return;
    sb().from("ad_places").delete().eq("id", id).then(function (r) {
      if (r.error) return say("mPlace", /foreign key|violates/i.test(r.error.message || "") ? "This place is used by result entries. Delete or change those entries first." : "Could not remove: " + errText(r), true);
      say("mPlace", "Removed."); reload();
    });
  }

  /* ---------- comments ---------- */
  function resetCom() { editCom = null; ["cAuthor", "cDate", "cBody"].forEach(function (i) { $(i).value = ""; }); $("comTitle").textContent = "3. Add comments people wrote"; $("bCom").textContent = "Save comment"; $("bComCancel").hidden = true; }
  function saveCom() {
    var ad = $("cAd").value, body = $("cBody").value.trim();
    if (!ad) return say("mCom", "Add an ad first (section 1).", true);
    if (!body) return say("mCom", "Please paste the comment.", true);
    if (body.length > 1000) return say("mCom", "The comment is too long (1000 letters at most).", true);
    var row = { ad_id: ad, author: $("cAuthor").value.trim() || null, body: body, commented_on: $("cDate").value || null };
    say("mCom", "Saving…");
    var q = editCom ? sb().from("ad_comments").update(row).eq("id", editCom) : sb().from("ad_comments").insert(row);
    q.then(function (r) { if (r.error) return say("mCom", "Could not save: " + errText(r), true); var was = !!editCom; resetCom(); say("mCom", was ? "Comment updated." : "Comment saved."); reload(); });
  }
  function startEditCom(id) {
    var c = D.comments.filter(function (x) { return x.id === id; })[0]; if (!c) return; editCom = id;
    $("cAd").value = c.ad_id; $("cAuthor").value = c.author || ""; $("cDate").value = c.commented_on || ""; $("cBody").value = c.body;
    $("comTitle").textContent = "3. Edit this comment"; $("bCom").textContent = "Save changes"; $("bComCancel").hidden = false; say("mCom", ""); $("pCom").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function delCom(id) {
    if (!window.confirm("Delete this comment?")) return;
    sb().from("ad_comments").delete().eq("id", id).then(function (r) { if (r.error) return say("mCom", "Could not delete: " + errText(r), true); if (editCom === id) resetCom(); say("mCom", "Comment deleted."); reload(); });
  }

  /* ---------- logos (stored in your Supabase "ad-logos" picture bucket) ---------- */
  var EXT = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
  function logoPath(url) { var m = /\/ad-logos\/([^?#]+)/.exec(url || ""); return m ? decodeURIComponent(m[1]) : null; }
  function upLogo(code) {
    var inp = $("lf_" + code), f = inp && inp.files && inp.files[0];
    if (!f) return say("mLogo", "Choose a picture file first.", true);
    if (!EXT[f.type]) return say("mLogo", "Only PNG, JPG or WEBP pictures are accepted.", true);
    if (f.size > 1048576) return say("mLogo", "That picture is bigger than 1 MB. Please use a smaller one.", true);
    var old = (D.platforms.filter(function (p) { return p.code === code; })[0] || {}).logo_url;
    var path = code + "-" + Date.now().toString(36) + "." + EXT[f.type];
    say("mLogo", "Uploading…");
    sb().storage.from("ad-logos").upload(path, f, { contentType: f.type, cacheControl: "3600", upsert: false }).then(function (r) {
      if (r.error) return say("mLogo", "Upload failed: " + errText(r) + ". Make sure 7-ADS-SETUP.sql was run.", true);
      var url = sb().storage.from("ad-logos").getPublicUrl(path).data.publicUrl;
      return sb().from("ad_platforms").update({ logo_url: url }).eq("code", code).then(function (u) {
        if (u.error) return say("mLogo", "Uploaded, but could not save: " + errText(u), true);
        var op = logoPath(old); if (op) sb().storage.from("ad-logos").remove([op]);
        say("mLogo", A.meta(code, D.platforms).name + " logo saved."); reload();
      });
    });
  }
  function rmLogo(code) {
    var old = (D.platforms.filter(function (p) { return p.code === code; })[0] || {}).logo_url;
    if (!window.confirm("Remove this logo? The page will show a coloured badge instead.")) return;
    sb().from("ad_platforms").update({ logo_url: null }).eq("code", code).then(function (u) {
      if (u.error) return say("mLogo", "Could not remove: " + errText(u), true);
      var op = logoPath(old); if (op) sb().storage.from("ad-logos").remove([op]);
      say("mLogo", "Logo removed."); reload();
    });
  }

  /* ---------- wiring ---------- */
  document.addEventListener("adminReady", function () {
    reload().then(function (ok) {
      if (!ok) return;
      $("bAd").addEventListener("click", saveAd); $("bAdCancel").addEventListener("click", function () { resetAd(); say("mAd", ""); });
      $("bRes").addEventListener("click", saveRes); $("bResCancel").addEventListener("click", function () { resetRes(); say("mRes", ""); });
      $("bCom").addEventListener("click", saveCom); $("bComCancel").addEventListener("click", function () { resetCom(); say("mCom", ""); });
      $("bPlace").addEventListener("click", addPlace);
      $("rAd").addEventListener("change", curTag); $("fRes").addEventListener("change", drawResults);
      $("pName").addEventListener("keydown", function (ev) { if (ev.key === "Enter") { ev.preventDefault(); addPlace(); } });
      document.addEventListener("click", function (ev) {
        var b = ev.target.closest && ev.target.closest("[data-act]"); if (!b || b.tagName === "SELECT") return;
        var id = b.getAttribute("data-id"), code = b.getAttribute("data-code");
        ({ editAd: startEditAd, delAd: delAd, editRes: startEditRes, delRes: delRes, delPlace: delPlace, editCom: startEditCom, delCom: delCom }[b.getAttribute("data-act")] || function () {})(id);
        if (b.getAttribute("data-act") === "upLogo") upLogo(code);
        if (b.getAttribute("data-act") === "rmLogo") rmLogo(code);
      });
      document.addEventListener("change", function (ev) {
        var s = ev.target; if (!s.matches || !s.matches('select[data-act="st"]')) return;
        sb().from("ad_campaigns").update({ status: s.value }).eq("id", s.getAttribute("data-id")).then(function (r) { if (r.error) say("mAd", "Could not change the status: " + errText(r), true); else say("mAd", "Status updated."); reload(); });
      });
    });
  });
})();
