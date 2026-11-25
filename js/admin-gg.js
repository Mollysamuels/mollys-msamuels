/* Gg Ad API (Mollys advert report) - admin only. Reads the saved ad numbers and shows them.
   Totals, rates and charts are worked out here from your numbers. Nothing is invented. Everything typed by an admin is shown as plain text. */
(function () {
  "use strict";
  var A = window.MSAds, e = A.esc;
  var $ = function (id) { return document.getElementById(id); };
  var D = null, cur = "NGN", range = { from: "", to: "", p: "all" }, timer = null, showAllComments = false;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function sum(rows) { return rows.reduce(function (t, r) { t.imp += +r.impressions; t.clk += +r.clicks; t.views += +r.views; t.cost += +r.cost; return t; }, { imp: 0, clk: 0, views: 0, cost: 0 }); }
  function rates(t) { return { ctr: A.ratio(t.clk, t.imp), cpv: A.ratio(t.cost, t.views), cpc: A.ratio(t.cost, t.clk), cpm: t.imp > 0 ? t.cost / t.imp * 1000 : null }; }

  /* ---------- what counts: ads in the chosen money, entries whose dates fall inside the chosen range ---------- */
  function slice() {
    var ads = D.ads.filter(function (a) { return a.currency === cur; }), ids = {};
    ads.forEach(function (a) { ids[a.id] = a; });
    var mine = D.results.filter(function (r) { return ids[r.ad_id]; });
    var inside = mine.filter(function (r) { return r.date_from >= range.from && r.date_to <= range.to; });
    var partial = mine.filter(function (r) { return !(r.date_from >= range.from && r.date_to <= range.to) && r.date_from <= range.to && r.date_to >= range.from; }).length;
    var coms = D.comments.filter(function (c) { return ids[c.ad_id] && (!c.commented_on || (c.commented_on >= range.from && c.commented_on <= range.to)); });
    return { ads: ads, ids: ids, res: inside, partial: partial, coms: coms };
  }
  function placeOf(id) { return D.places.filter(function (p) { return p.id === id; })[0] || { name: "Other", kind: "other_website" }; }

  function setRange(from, to, p) { range = { from: from, to: to, p: p }; $("gFrom").value = from; $("gTo").value = to; paintRangeButtons(); render(); }
  function allRange() {
    var f = D.results.map(function (r) { return r.date_from; }).sort()[0], t = D.results.map(function (r) { return r.date_to; }).sort().slice(-1)[0];
    var today = A.ymd(new Date());
    return f ? { from: f, to: t > today ? t : today } : { from: A.addDays(today, -29), to: today };
  }
  function preset(p) {
    var today = A.ymd(new Date());
    if (p === "7") return setRange(A.addDays(today, -6), today, p);
    if (p === "30") return setRange(A.addDays(today, -29), today, p);
    if (p === "month") return setRange(today.slice(0, 8) + "01", today, p);
    var r = allRange(); setRange(r.from, r.to, "all");
  }
  function paintRangeButtons() { document.querySelectorAll(".gg-range button[data-p]").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-p") === range.p ? "true" : "false"); }); }
  function paintCur() { $("curNGN").setAttribute("aria-pressed", cur === "NGN"); $("curUSD").setAttribute("aria-pressed", cur === "USD"); }

  /* ---------- pieces ---------- */
  function kpis(t) {
    var r = rates(t), c = [
      ["Impressions", A.int(t.imp), "times an ad was shown"], ["Clicks", A.int(t.clk), "times a link was tapped"], ["CTR", A.pct(r.ctr), "clicks ÷ impressions"],
      ["Views", A.int(t.views), "times a video was watched"], ["Cost", A.money(t.cost, cur), "total spent"], ["CPV", A.cash(r.cpv, cur), "cost per view"],
      ["CPC", A.cash(r.cpc, cur), "cost per click"], ["CPM", A.cash(r.cpm, cur), "cost per 1,000 impressions"]];
    $("ggKpis").innerHTML = c.map(function (k) { return '<div class="gg-kpi"><span>' + e(k[0]) + "</span><b>" + e(k[1]) + "</b><small>" + e(k[2]) + "</small></div>"; }).join("");
  }
  function statsHtml(t) {
    var r = rates(t);
    return '<div class="gg-stats">' + [["Impressions", A.int(t.imp)], ["Clicks", A.int(t.clk)], ["CTR", A.pct(r.ctr)], ["Views", A.int(t.views)], ["CPV", A.cash(r.cpv, cur)], ["Cost", A.money(t.cost, cur)]]
      .map(function (s) { return "<div><span>" + e(s[0]) + "</span><b>" + e(s[1]) + "</b></div>"; }).join("") + "</div>";
  }
  function platforms(S) {
    $("ggPlats").innerHTML = A.PLATFORMS.map(function (pl) {
      var ads = S.ads.filter(function (a) { return a.platform === pl.code; }), ids = {}; ads.forEach(function (a) { ids[a.id] = 1; });
      var t = sum(S.res.filter(function (r) { return ids[r.ad_id]; })), on = ads.filter(function (a) { return a.status === "ongoing"; }).length;
      return '<div class="gg-plat' + (pl.code === "youtube" ? " big" : "") + '"><div class="gg-plat-top">' + A.logo(pl.code, D.platforms, pl.code === "youtube" ? 44 : 32) +
        '<span class="gg-status' + (on ? "" : " ended") + '">' + (on ? on + " ongoing" : ads.length ? "none ongoing" : "no ads yet") + "</span></div>" + statsHtml(t) + "</div>";
    }).join("");
  }
  function places(S) {
    var by = {};
    S.res.forEach(function (r) { (by[r.place_id] = by[r.place_id] || []).push(r); });
    var rows = Object.keys(by).map(function (id) { return { p: placeOf(id), t: sum(by[id]) }; }).sort(function (a, b) { return b.t.imp - a.t.imp; });
    if (!rows.length) { $("ggPlaces").innerHTML = '<p class="gg-empty">No results in these dates yet.</p>'; return; }
    var max = rows[0].t.imp || 1;
    $("ggPlaces").innerHTML = '<div class="gg-place head"><span>Place</span><span class="bar">Share of impressions</span><span>Impressions</span><span>Clicks</span><span>CTR</span><span>Views</span><span>Cost</span></div>' +
      rows.map(function (x) {
        var r = rates(x.t);
        return '<div class="gg-place"><b>' + e(x.p.name) + '</b><span class="gg-bar" aria-hidden="true"><i style="width:' + Math.max(2, Math.round(x.t.imp / max * 100)) + '%"></i></span><span>' + A.int(x.t.imp) + "</span><span>" + A.int(x.t.clk) + "</span><span>" + A.pct(r.ctr) + "</span><span>" + A.int(x.t.views) + "</span><span>" + A.money(x.t.cost, cur) + "</span></div>";
      }).join("");
  }
  function ongoing(S) {
    var ads = S.ads.filter(function (a) { return a.status === "ongoing"; });
    if (!ads.length) { $("ggOngoing").innerHTML = '<p class="gg-empty">No ongoing ads in this currency.</p>'; return; }
    var order = { youtube: 0, tiktok: 1, facebook: 2, instagram: 3 };
    ads.sort(function (a, b) { return (order[a.platform] - order[b.platform]) || a.name.localeCompare(b.name); });
    $("ggOngoing").innerHTML = ads.map(function (a) {
      var yt = A.parseYouTube(a.video_url), link = A.safeHttps(a.video_url), t = sum(S.res.filter(function (r) { return r.ad_id === a.id; }));
      var vid = yt ? '<iframe src="' + e(yt.embed) + '" title="' + e(a.video_name || a.name) + '" loading="lazy" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'
        : '<div class="noVid">' + (link ? '<a href="' + e(link) + '" target="_blank" rel="noopener noreferrer" style="color:#fff;text-decoration:underline">Open the video</a>' : "No video link added") + "</div>";
      return '<article class="gg-ad"><div class="vid">' + vid + '</div><div class="body"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px">' + A.logo(a.platform, D.platforms, 24) +
        '<span class="gg-status"><span class="gg-live-dot" aria-hidden="true"></span>Ongoing</span></div><h4>' + e(a.name) + '</h4><p class="vn">' + (a.video_name ? "Video: " + e(a.video_name) : "&nbsp;") + "</p>" + statsHtml(t) + "</div></article>";
    }).join("");
  }
  function comments(S) {
    var list = S.coms.slice().sort(function (a, b) { var x = a.commented_on || a.created_at.slice(0, 10), y = b.commented_on || b.created_at.slice(0, 10); return x < y ? 1 : x > y ? -1 : 0; });
    var box = $("ggComments");
    if (!list.length) { box.innerHTML = '<p class="gg-empty">No comments in these dates yet.</p>'; return; }
    var shown = showAllComments ? list : list.slice(0, 8);
    box.innerHTML = shown.map(function (c) {
      var a = S.ids[c.ad_id] || {};
      return '<div class="gg-cm"><div>' + A.logo(a.platform, D.platforms, 24) + '</div><div><div class="who"><b>' + e(c.author || "Anonymous") + "</b> on " + e(a.name || "") + (c.commented_on ? " · " + e(A.dLabel(c.commented_on)) : "") + "</div><p>" + e(c.body) + "</p></div></div>";
    }).join("") + (list.length > 8 ? '<p style="margin:10px 0 0"><button type="button" class="btn btn-outline ina-small" id="ggMore" style="border-color:var(--line)">' + (showAllComments ? "Show fewer" : "Show all " + list.length + " comments") + "</button></p>" : "");
    var m = $("ggMore"); if (m) m.addEventListener("click", function () { showAllComments = !showAllComments; comments(S); });
  }

  /* ---------- replay pop-ups (every one is built from a real entry) ---------- */
  function replay(S) {
    clearInterval(timer); var box = $("ggToasts"); box.innerHTML = "";
    var pools = { view: [], imp: [], click: [] };
    S.res.forEach(function (r) {
      var a = S.ids[r.ad_id]; if (!a) return;
      if (r.views > 0) pools.view.push({ r: r, a: a, w: +r.views }); if (r.impressions > 0) pools.imp.push({ r: r, a: a, w: +r.impressions }); if (r.clicks > 0) pools.click.push({ r: r, a: a, w: +r.clicks });
    });
    var kinds = ["view", "imp", "click"].filter(function (k) { return pools[k].length; });
    if (!kinds.length) { box.innerHTML = '<p class="gg-empty">Nothing to replay yet for these dates.</p>'; return; }
    var base = { view: .45, imp: .35, click: .2 };
    function pickKind() { var tot = kinds.reduce(function (s, k) { return s + base[k]; }, 0), x = Math.random() * tot; for (var i = 0; i < kinds.length; i++) { x -= base[kinds[i]]; if (x <= 0) return kinds[i]; } return kinds[0]; }
    function pickRow(list) { var tot = list.reduce(function (s, q) { return s + q.w; }, 0), x = Math.random() * tot; for (var i = 0; i < list.length; i++) { x -= list[i].w; if (x <= 0) return list[i]; } return list[0]; }
    function text(k, q) {
      var pl = placeOf(q.r.place_id).name, vn = q.a.video_name || q.a.name;
      return k === "view" ? "Someone watched “" + vn + "” on " + pl : k === "imp" ? "Someone saw your ad “" + q.a.name + "” on " + pl : "Someone tapped the link in “" + q.a.name + "” (" + pl + ")";
    }
    function add() {
      if (document.hidden) return;
      var k = pickKind(), q = pickRow(pools[k]), m = A.meta(q.a.platform, D.platforms), d = document.createElement("div");
      d.className = "gg-toast"; d.innerHTML = '<span class="dot" style="background:' + e(m.colour) + '"></span><span class="t"></span><span class="w"></span>';
      d.querySelector(".t").textContent = text(k, q); d.querySelector(".w").textContent = m.name;
      box.insertBefore(d, box.firstChild);
      var all = box.querySelectorAll(".gg-toast:not(.out)");
      if (all.length > 4) { var old = all[all.length - 1]; old.classList.add("out"); setTimeout(function () { if (old.parentNode) old.parentNode.removeChild(old); }, reduced ? 0 : 520); }
    }
    add(); setTimeout(add, 700);
    timer = setInterval(add, 2200 + Math.floor(Math.random() * 900));
  }

  /* ---------- the moving line (impressions per day, from your numbers) ---------- */
  function daily(res, from, to) {
    var n = A.daysIn(from, to); if (!(n > 0) || n > 3660) return [];
    var arr = new Array(n).fill(0);
    res.forEach(function (r) {
      var len = A.daysIn(r.date_from, r.date_to), per = +r.impressions / len, s = A.daysIn(from, r.date_from) - 1;
      for (var i = 0; i < len; i++) if (s + i >= 0 && s + i < n) arr[s + i] += per;
    });
    if (n <= 90) return arr;
    var b = new Array(90).fill(0), c = new Array(90).fill(0);
    arr.forEach(function (v, i) { var k = Math.min(89, Math.floor(i * 90 / n)); b[k] += v; c[k]++; });
    return b.map(function (v, i) { return c[i] ? v / c[i] : 0; });
  }
  function pulse(S) {
    var series = daily(S.res, range.from, range.to), mx = Math.max.apply(null, series.concat([0])), W = 600, H = 150, base = 98;
    var slots = Math.max(series.length, 10), sw = W / slots, pts = [];
    var shape = [[0, 0], [.22, 0], [.3, .2], [.38, 0], [.46, -.14], [.52, 1], [.6, -.5], [.68, 0], [.8, .22], [.9, 0], [1, 0]];
    for (var i = 0; i < slots; i++) {
      var v = series.length ? series[i % series.length] : 0, vn = mx > 0 ? v / mx : 0, a = 14 + 66 * vn;
      shape.forEach(function (p) { pts.push([(i + p[0]) * sw, mx > 0 ? base - p[1] * a : base]); });
    }
    var d = "M" + pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" L");
    var svg = '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" aria-hidden="true"><path d="' + d + '"/></svg>';
    $("ggPulse").innerHTML = '<div class="track">' + svg + svg + '</div><div class="fade"></div>';
    var peak = series.length ? series.indexOf(mx) : -1, tot = S.res.reduce(function (s, r) { return s + (+r.impressions); }, 0);
    $("ggPulseL").textContent = mx > 0 ? "Busiest day: " + A.dLabel(A.addDays(range.from, series.length === A.daysIn(range.from, range.to) ? peak : Math.round(peak * A.daysIn(range.from, range.to) / series.length))) : "No impressions in these dates";
    $("ggPulseR").textContent = A.int(tot) + " impressions in total";
  }

  /* ---------- draw everything ---------- */
  function render() {
    var S = slice(), t = sum(S.res);
    paintCur();
    var latest = D.ads.concat(D.results, D.comments).map(function (x) { return x.updated_at || x.created_at; }).sort().slice(-1)[0];
    $("ggMeta").innerHTML = "Showing <b>" + e(A.rangeLabel(range.from, range.to)) + "</b> · ads priced in <b>" + e(A.CUR[cur].sym + " " + A.CUR[cur].name) + "</b> · " + (latest ? "Last updated " + e(A.stampLabel(latest)) : "No data yet");
    var notes = [];
    if (!S.ads.length) notes.push("There are no ads priced in " + A.CUR[cur].name + " yet." + (D.ads.length ? " Switch the money above to see the others." : ""));
    if (S.partial) notes.push(S.partial + " entr" + (S.partial === 1 ? "y is" : "ies are") + " only partly inside these dates, so " + (S.partial === 1 ? "it is" : "they are") + " not counted. Widen the dates to include " + (S.partial === 1 ? "it" : "them") + ".");
    $("ggNote").innerHTML = notes.map(function (n) { return '<p class="gg-note">' + e(n) + "</p>"; }).join("");
    kpis(t); platforms(S); places(S); ongoing(S); comments(S); replay(S); pulse(S);
  }

  document.addEventListener("adminReady", function () {
    $("ggMark").innerHTML = A.ggMark(70);
    A.loadAll(supabaseClient).then(function (r) {
      if (r.error) {
        $("ggSetup").innerHTML = '<div class="admin-panel"><p style="color:#9b1c1c"><b>' + (r.setup ? "Gg Ad API is not set up yet." : "Could not load the report.") + "</b> " +
          (r.setup ? "Run <code>7-ADS-SETUP.sql</code> in Supabase (SQL Editor), then refresh this page." : e(r.error.message || "")) + "</p></div>";
        return;
      }
      D = r; $("ggApp").hidden = false;
      var ngn = D.ads.filter(function (a) { return a.currency === "NGN"; }).length, usd = D.ads.filter(function (a) { return a.currency === "USD"; }).length;
      cur = !ngn && usd ? "USD" : "NGN";
      $("curNGN").addEventListener("click", function () { cur = "NGN"; render(); });
      $("curUSD").addEventListener("click", function () { cur = "USD"; render(); });
      document.querySelectorAll(".gg-range button[data-p]").forEach(function (b) { b.addEventListener("click", function () { preset(b.getAttribute("data-p")); }); });
      function custom() { var f = $("gFrom").value, t = $("gTo").value; if (!f || !t) return; if (t < f) { $("ggNote").innerHTML = '<p class="gg-note">The end date cannot be before the start date.</p>'; return; } setRange(f, t, "custom"); }
      $("gFrom").addEventListener("change", custom); $("gTo").addEventListener("change", custom);
      document.addEventListener("visibilitychange", function () { /* pop-ups simply pause while the tab is hidden */ });
      preset("all");
    });
  });
})();
