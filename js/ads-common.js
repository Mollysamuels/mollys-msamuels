/* Molly Samuels - shared helpers for the two admin ad pages (INA = where ad numbers are typed in, Gg Ad API = the report).
   Everything typed by an admin is shown as plain text, never as code. */
(function (w) {
  "use strict";
  var PLATFORMS = [
    { code: "youtube", name: "YouTube", colour: "#FF0000", ink: "#FFFFFF" },
    { code: "tiktok", name: "TikTok", colour: "#25F4EE", ink: "#000000" },
    { code: "facebook", name: "Facebook", colour: "#1877F2", ink: "#FFFFFF" },
    { code: "instagram", name: "Instagram", colour: "#E1306C", ink: "#FFFFFF" }
  ];
  var CUR = { NGN: { sym: "₦", name: "Naira" }, USD: { sym: "$", name: "US Dollar" } };

  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function int(n) { return Math.round(Number(n) || 0).toLocaleString("en-US"); }
  function money(n, cur) {
    var c = CUR[cur] || CUR.NGN;
    return c.sym + (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function ratio(a, b) { return b > 0 ? a / b : null; }
  function pct(x) { return x == null ? "—" : (x * 100).toFixed(2) + "%"; }
  function cash(x, cur) { return x == null ? "—" : money(x, cur); }

  /* ---- dates are plain "YYYY-MM-DD" strings, so they compare correctly as text ---- */
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function parseYmd(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null; }
  function addDays(s, n) { var d = parseYmd(s); d.setUTCDate(d.getUTCDate() + n); return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()); }
  function daysIn(a, b) { return Math.round((parseYmd(b) - parseYmd(a)) / 86400000) + 1; }
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function dLabel(s) { var d = parseYmd(s); return d ? d.getUTCDate() + " " + MON[d.getUTCMonth()] + " " + d.getUTCFullYear() : ""; }
  function rangeLabel(a, b) { return a === b ? dLabel(a) : dLabel(a) + " – " + dLabel(b); }
  function stampLabel(iso) {
    try { return new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) + " (Nigeria time)"; } catch (x) { return ""; }
  }

  /* ---- YouTube link -> safe embed (youtube-nocookie) ---- */
  function parseYouTube(url) {
    url = String(url || "").trim();
    var m = url.match(/^https:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    return m ? { id: m[1], embed: "https://www.youtube-nocookie.com/embed/" + m[1] + "?rel=0&modestbranding=1&playsinline=1", thumb: "https://i.ytimg.com/vi/" + m[1] + "/hqdefault.jpg" } : null;
  }
  function safeHttps(u) { u = String(u || "").trim(); return /^https:\/\/[^\s"'<>]+$/i.test(u) ? u : ""; }

  /* ---- platform logo (picture you uploaded) or a clean coloured badge with the name ---- */
  function meta(code, platforms) {
    var p = (platforms || []).filter(function (x) { return x.code === code; })[0];
    var base = PLATFORMS.filter(function (x) { return x.code === code; })[0] || { code: code, name: code, colour: "#58493A", ink: "#fff" };
    return { code: base.code, name: (p && p.name) || base.name, colour: (p && p.colour) || base.colour, ink: base.ink, logo: p && safeHttps(p.logo_url) };
  }
  function logo(code, platforms, size) {
    var m = meta(code, platforms), s = size || 28;
    if (m.logo) return '<img class="ads-logo" src="' + esc(m.logo) + '" alt="' + esc(m.name) + '" style="height:' + s + 'px">';
    return '<span class="ads-badge" style="background:' + esc(m.colour) + ';color:' + esc(m.ink) + ';font-size:' + Math.max(11, Math.round(s * 0.46)) + 'px">' + esc(m.name) + "</span>";
  }

  /* ---- loading everything (admin only; the database refuses anyone else) ---- */
  function notSetUp(err) { return !!err && (err.code === "42P01" || err.code === "PGRST205" || /does not exist|schema cache|Could not find the table/i.test(err.message || "")); }
  function loadAll(sb) {
    var q = function (t, o) { var x = sb.from(t).select("*"); return o ? x.order(o, { ascending: true }) : x; };
    return Promise.all([q("ad_platforms", "sort_order"), q("ad_places", "created_at"), q("ad_campaigns", "created_at"), q("ad_results", "date_from"), q("ad_comments", "created_at")]).then(function (rs) {
      for (var i = 0; i < rs.length; i++) if (rs[i].error) return { error: rs[i].error, setup: notSetUp(rs[i].error) };
      return { platforms: rs[0].data || [], places: rs[1].data || [], ads: rs[2].data || [], results: rs[3].data || [], comments: rs[4].data || [] };
    });
  }

  /* the "Gg" mark: my own letters in red, blue and yellow (not any company's logo) */
  function ggMark(h) {
    h = h || 64;
    return '<svg class="ads-gg" viewBox="0 0 120 80" height="' + h + '" width="' + Math.round(h * 1.5) + '" role="img" aria-label="Gg">' +
      '<text x="4" y="62" font-family="Fraunces,Georgia,serif" font-weight="700" font-size="74" fill="#E53935">G</text>' +
      '<text x="58" y="62" font-family="Fraunces,Georgia,serif" font-weight="700" font-size="62" fill="#1E6BE6">g</text>' +
      '<rect x="8" y="70" width="104" height="7" rx="3.5" fill="#FBBC04"/></svg>';
  }

  w.MSAds = { PLATFORMS: PLATFORMS, CUR: CUR, esc: esc, int: int, money: money, ratio: ratio, pct: pct, cash: cash, ymd: ymd, parseYmd: parseYmd, addDays: addDays, daysIn: daysIn,
    dLabel: dLabel, rangeLabel: rangeLabel, stampLabel: stampLabel, parseYouTube: parseYouTube, safeHttps: safeHttps, meta: meta, logo: logo, loadAll: loadAll, notSetUp: notSetUp, ggMark: ggMark };
})(window);
