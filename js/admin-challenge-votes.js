/* Molly Samuels - Bridal Challenge VOTES dashboard (admin only).
   Results, flags, social votes, voter list, activity log. Everything typed or loaded is shown as plain text, never as code.
   Only signed-in admins can read or change any of this (the database enforces it too). */
(function () {
  "use strict";
  var C = window.MSChallenge, e = C.esc;
  var $ = function (id) { return document.getElementById(id); };
  var S = null, stats = null, brides = {}, voters = [], vShown = 0, PAGE = 100, soc = [];

  function say(id, msg, bad) { var m = $(id); m.textContent = msg; m.style.color = bad ? "#9b1c1c" : "#1c6b2f"; m.className = "adm-msg"; }
  function fmt(d) { return new Date(d).toLocaleString("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
  function num(n) { return Number(n || 0).toLocaleString("en-GB"); }
  function forget() { try { sessionStorage.removeItem("ms_ch_settings_v1"); } catch (x) {} }
  function frozen() { return !!(S && S.results_frozen); }
  function audit(action, detail) { return supabaseClient.from("challenge_audit").insert({ action: action, detail: String(detail || "").slice(0, 900) }); }

  document.addEventListener("adminReady", init);
  function init() {
    supabaseClient.from("challenge_settings").select("*").eq("id", 1).single().then(function (r) {
      if (r.error || !r.data) { document.querySelector(".admin-content").insertAdjacentHTML("afterbegin", '<div class="admin-panel"><p style="color:#9b1c1c"><b>The Bridal Challenge database is not set up yet.</b> Run the SQL files in the RUN-IN-SUPABASE folder first.</p></div>'); return; }
      S = r.data; paintCtl(); loadAll();
    });
    $("bCtl").addEventListener("click", saveCtl);
    $("bReset").addEventListener("click", resetVotes);
    $("bRefresh").addEventListener("click", loadAll);
    $("sPlat").addEventListener("change", function () { $("sOtherBox").hidden = this.value !== "__other"; });
    $("bSocAdd").addEventListener("click", addSocial);
    $("socRows").addEventListener("click", socClick);
    $("votRows").addEventListener("click", votClick);
    $("vSearch").addEventListener("input", function () { vShown = 0; paintVoters(); });
    $("bMore").addEventListener("click", function () { vShown += PAGE; paintVoters(true); });
    $("bVCsv").addEventListener("click", csv);
  }

  /* ---------- controls ---------- */
  function paintCtl() {
    $("cShow").checked = S.show_vote_counts !== false; $("cFreeze").checked = !!S.results_frozen; $("frozenBanner").hidden = !S.results_frozen;
    ["bSocAdd", "bReset"].forEach(function (id) { $(id).disabled = !!S.results_frozen; });
  }
  function saveCtl() {
    say("mCtl", "Saving…");
    var patch = { show_vote_counts: $("cShow").checked, results_frozen: $("cFreeze").checked };
    supabaseClient.from("challenge_settings").update(patch).eq("id", 1).select().single().then(function (r) {
      if (r.error || !r.data) return say("mCtl", "Could not save: " + ((r.error && r.error.message) || "no permission"), true);
      var jobs = [];
      if (patch.results_frozen !== !!S.results_frozen) jobs.push(audit(patch.results_frozen ? "results_frozen" : "results_unfrozen", ""));
      if (patch.show_vote_counts !== (S.show_vote_counts !== false)) jobs.push(audit(patch.show_vote_counts ? "counts_shown" : "counts_hidden", ""));
      S = r.data; forget(); paintCtl(); say("mCtl", "Saved.");
      Promise.all(jobs).then(loadAll, loadAll);
    });
  }
  function resetVotes() {
    if (frozen()) return;
    var t = prompt("This deletes EVERY website vote and cannot be undone. Type RESET to confirm.");
    if (t === null) return;
    supabaseClient.rpc("challenge_admin_reset_votes", { p_confirm: t.trim() }).then(function (r) {
      if (r.error) return alert(r.error.message);
      alert(r.data + " website votes were deleted."); loadAll();
    });
  }

  /* ---------- everything else ---------- */
  function loadAll() {
    $("resAt").textContent = "just now";
    supabaseClient.rpc("challenge_admin_stats").then(function (r) {
      if (r.error) { $("resRows").innerHTML = '<tr><td colspan="7" style="color:#9b1c1c;padding:16px">Could not load results: ' + e(r.error.message) + ". Run 3-VOTING-SETUP.sql first.</td></tr>"; return; }
      stats = r.data; brides = {}; (stats.per || []).forEach(function (p) { brides[p.id] = p; });
      paintResults(); paintHours(); fillBrideSelect();
      loadVoters().then(function () { paintVoters(); paintFlags(); });
    });
    loadSocial(); loadAudit();
  }
  function paintResults() {
    var per = stats.per || [], max = Math.max.apply(null, per.map(function (p) { return p.website + p.social; }).concat([1]));
    if (!per.length) { $("resRows").innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--ink-soft)">No couples yet.</td></tr>'; return; }
    var top = Math.max.apply(null, per.map(function (p) { return p.website + p.social; }));
    $("resRows").innerHTML = per.map(function (p) {
      var t = p.website + p.social;
      return "<tr><td>" + e(p.number) + "</td><td><b>" + e(p.name) + "</b>" + (t > 0 && t === top ? ' <span class="ch-pill a">Leading</span>' : "") + "</td><td>" + num(p.website) + (p.voided ? ' <small style="color:#9b1c1c">(' + p.voided + " removed)</small>" : "") + "</td><td>" + num(p.social) + "</td><td><b>" + num(t) + '</b></td><td><div class="ch-bar"><i style="width:' + Math.round(t / max * 100) + '%"></i></div></td><td>' + (p.social_pending ? '<span class="ch-pill p">' + num(p.social_pending) + " pending</span>" : "&ndash;") + "</td></tr>";
    }).join("");
    var all = per.reduce(function (a, p) { return a + p.website + p.social; }, 0), pr = stats.providers || {};
    $("resSum").textContent = "Total votes: " + num(all) + ". Website voters: " + num(stats.voters) + " (Google " + num(pr.google) + ", email code " + num(pr.email) + "). Agreed to receive offers: " + num(stats.optin) + ".";
  }
  function paintHours() {
    var h = stats.hourly || [], m = Math.max.apply(null, h.map(function (x) { return x.n; }).concat([1]));
    $("hourChart").innerHTML = h.map(function (x) { return '<div style="height:' + Math.max(2, Math.round(x.n / m * 130)) + 'px" title="' + e(x.h) + ": " + x.n + ' votes"></div>'; }).join("");
    $("hourNote").textContent = h.length ? "Busiest hour: " + Math.max.apply(null, h.map(function (x) { return x.n; })) + " votes. Hover a bar to see its hour." : "No website votes yet.";
  }
  function fillBrideSelect() {
    var sel = $("sBride"), cur = sel.value;
    sel.innerHTML = (stats.per || []).map(function (p) { return '<option value="' + e(p.id) + '">No. ' + e(p.number) + " " + e(p.name) + "</option>"; }).join("");
    if (cur) sel.value = cur;
  }

  /* ---------- voters ---------- */
  function loadVoters() {
    voters = [];
    function page(from) {
      return supabaseClient.from("challenge_votes").select("*").order("created_at", { ascending: false }).range(from, from + 999).then(function (r) {
        if (r.error) { $("votRows").innerHTML = '<tr><td colspan="6" style="color:#9b1c1c;padding:16px">Could not load voters: ' + e(r.error.message) + "</td></tr>"; return; }
        voters = voters.concat(r.data || []);
        if ((r.data || []).length === 1000 && voters.length < 20000) return page(from + 1000);
      });
    }
    return page(0);
  }
  function paintVoters(more) {
    var q = $("vSearch").value.trim().toLowerCase();
    var list = voters.filter(function (v) { return !q || [v.name, v.email, v.phone].join(" ").toLowerCase().indexOf(q) > -1; });
    $("votCount").textContent = "(" + voters.length + " total, " + voters.filter(function (v) { return v.voided; }).length + " removed)";
    if (!vShown) vShown = PAGE;
    var part = list.slice(0, vShown);
    $("bMore").hidden = list.length <= vShown;
    if (!part.length) { $("votRows").innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--ink-soft)">' + (voters.length ? "No match." : "No website votes yet.") + "</td></tr>"; return; }
    $("votRows").innerHTML = part.map(function (v) {
      var b = brides[v.contestant_id];
      return '<tr data-id="' + e(v.id) + '"' + (v.voided ? ' class="ch-void"' : "") + "><td>" + e(fmt(v.created_at)) + "</td><td><b>" + e(v.name) + "</b>" + (v.marketing_optin ? " <small>(offers: yes)</small>" : "") + "</td><td>" + e(v.email) + "<br>" + e(v.phone) + "</td><td>" + e(b ? b.name : "?") + "</td><td>" + e(v.provider === "google" ? "Google" : "Email code") + (v.voided ? "<br><small>Removed: " + e(v.void_reason || "") + "</small>" : "") + "</td>" +
        '<td><button type="button" class="btn btn-outline" data-act="' + (v.voided ? "restore" : "void") + '" style="padding:5px 10px;font-size:.78rem;border-color:var(--line)"' + (frozen() ? " disabled" : "") + ">" + (v.voided ? "Restore" : "Remove") + "</button></td></tr>";
    }).join("");
  }
  function votClick(ev) {
    var b = ev.target.closest("button[data-act]"); if (!b || frozen()) return;
    var id = b.closest("tr").dataset.id, v = voters.filter(function (x) { return x.id === id; })[0]; if (!v) return;
    var restore = b.dataset.act === "restore", reason = "";
    if (!restore) { reason = prompt("Why is this vote being removed? (a short reason is saved in the activity log)"); if (reason === null) return; }
    else if (!confirm("Put this vote back into the count?")) return;
    supabaseClient.rpc("challenge_admin_void", { p_vote: id, p_void: !restore, p_reason: reason }).then(function (r) {
      if (r.error) return alert(r.error.message); loadAll();
    });
  }

  /* ---------- things worth checking ---------- */
  function paintFlags() {
    var out = [];
    (stats.shared_networks || []).forEach(function (s) {
      out.push('<div class="ch-flag"><b>' + s.n + " votes from one network</b> (network code " + e(s.net) + "). Could be a shared Wi-Fi or a mobile network, or someone voting with several accounts.</div>");
    });
    // quick bursts: 5 or more votes from the same network within 3 minutes
    var by = {};
    voters.forEach(function (v) { if (v.ip_hash && !v.voided) (by[v.ip_hash] = by[v.ip_hash] || []).push(new Date(v.created_at).getTime()); });
    Object.keys(by).forEach(function (k) {
      var t = by[k].sort(function (a, b) { return a - b; });
      for (var i = 0; i + 4 < t.length; i++) if (t[i + 4] - t[i] <= 180000) { out.push('<div class="ch-flag"><b>5 or more votes within 3 minutes</b> from one network (code ' + e(k.slice(0, 8)) + "), starting " + e(fmt(t[i])) + ".</div>"); break; }
    });
    // one bride suddenly far ahead in the last hour
    var recent = {}, cut = Date.now() - 3600000, tot = 0;
    voters.forEach(function (v) { if (!v.voided && new Date(v.created_at).getTime() > cut) { recent[v.contestant_id] = (recent[v.contestant_id] || 0) + 1; tot++; } });
    Object.keys(recent).forEach(function (id) { if (tot >= 20 && recent[id] / tot >= 0.9 && brides[id]) out.push('<div class="ch-flag"><b>' + e(brides[id].name) + " got " + recent[id] + " of the last " + tot + " votes</b> in the past hour. A sudden surge is worth a look.</div>"); });
    $("flags").innerHTML = out.length ? out.join("") : "<p>Nothing unusual found.</p>";
  }

  /* ---------- social votes ---------- */
  function loadSocial() {
    supabaseClient.from("challenge_social_votes").select("*").order("created_at", { ascending: false }).limit(300).then(function (r) {
      if (r.error) { $("socRows").innerHTML = '<tr><td colspan="7" style="color:#9b1c1c;padding:16px">' + e(r.error.message) + "</td></tr>"; return; }
      soc = r.data || []; paintSocial();
    });
  }
  function paintSocial() {
    if (!soc.length) { $("socRows").innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--ink-soft)">No social media votes entered yet.</td></tr>'; return; }
    var dis = frozen() ? " disabled" : "";
    $("socRows").innerHTML = soc.map(function (x) {
      var b = brides[x.contestant_id], cls = { pending: "p", approved: "a", rejected: "r" }[x.status];
      return '<tr data-id="' + e(x.id) + '"><td>' + e(fmt(x.created_at)) + "</td><td>" + e(b ? b.name : "?") + "</td><td>" + e(x.platform) + "</td><td><b>" + num(x.votes) + "</b></td><td>" + e(x.note || "") + '</td><td><span class="ch-pill ' + cls + '">' + e(x.status) + "</span></td><td style=\"white-space:nowrap\">" +
        (x.status !== "approved" ? '<button type="button" class="btn btn-gold" data-act="approved" style="padding:5px 10px;font-size:.78rem"' + dis + ">Approve</button> " : "") +
        (x.status === "pending" ? '<button type="button" class="btn btn-outline" data-act="rejected" style="padding:5px 10px;font-size:.78rem;border-color:var(--line)"' + dis + ">Reject</button> " : "") +
        (x.status === "approved" ? '<button type="button" class="btn btn-outline" data-act="pending" style="padding:5px 10px;font-size:.78rem;border-color:var(--line)"' + dis + ">Undo approval</button> " : "") +
        '<button type="button" class="btn btn-outline" data-act="del" style="padding:5px 10px;font-size:.78rem;border-color:#e6b4b4;color:#9b1c1c"' + dis + ">Delete</button></td></tr>";
    }).join("");
  }
  function addSocial() {
    if (frozen()) return;
    var plat = $("sPlat").value === "__other" ? $("sOther").value.trim() : $("sPlat").value, n = parseInt($("sVotes").value, 10);
    if (!$("sBride").value) return say("mSoc", "Add a couple first.", true);
    if (plat.length < 2) return say("mSoc", "Please type the platform name.", true);
    if (!(n >= 1 && n <= 1000000)) return say("mSoc", "Enter a number of votes between 1 and 1,000,000.", true);
    say("mSoc", "Saving…");
    supabaseClient.from("challenge_social_votes").insert({ contestant_id: $("sBride").value, platform: plat, votes: n, note: $("sNote").value.trim() || null }).then(function (r) {
      if (r.error) return say("mSoc", "Could not save: " + r.error.message, true);
      $("sVotes").value = ""; $("sNote").value = ""; say("mSoc", "Added. Press Approve in the list to count it.");
      audit("social_added", plat + " | " + n + " | " + (brides[$("sBride").value] || {}).name).then(loadAll, loadAll);
    });
  }
  function socClick(ev) {
    var b = ev.target.closest("button[data-act]"); if (!b || frozen()) return;
    var id = b.closest("tr").dataset.id, x = soc.filter(function (s) { return s.id === id; })[0]; if (!x) return;
    var name = (brides[x.contestant_id] || {}).name, info = x.platform + " | " + x.votes + " | " + name;
    if (b.dataset.act === "del") {
      if (!confirm("Delete this entry for good?")) return;
      return supabaseClient.from("challenge_social_votes").delete().eq("id", id).then(function (r) { if (r.error) return alert(r.error.message); audit("social_deleted", info).then(loadAll, loadAll); });
    }
    supabaseClient.from("challenge_social_votes").update({ status: b.dataset.act, reviewed_at: new Date().toISOString() }).eq("id", id).then(function (r) {
      if (r.error) return alert(r.error.message); audit("social_" + b.dataset.act, info).then(loadAll, loadAll);
    });
  }

  /* ---------- activity log ---------- */
  function loadAudit() {
    supabaseClient.from("challenge_audit").select("*").order("created_at", { ascending: false }).limit(60).then(function (r) {
      if (r.error || !(r.data || []).length) { $("audRows").innerHTML = '<tr><td colspan="3" style="text-align:center;padding:20px;color:var(--ink-soft)">' + (r.error ? e(r.error.message) : "Nothing yet.") + "</td></tr>"; return; }
      $("audRows").innerHTML = r.data.map(function (a) { return "<tr><td>" + e(fmt(a.created_at)) + "</td><td>" + e(String(a.action).replace(/_/g, " ")) + "</td><td>" + e(a.detail || "") + "</td></tr>"; }).join("");
    });
  }

  /* ---------- CSV ---------- */
  function csv() {
    var cols = ["created_at", "name", "email", "phone", "contestant", "provider", "marketing_optin", "voided", "void_reason"];
    var cell = function (v) { v = String(v == null ? "" : v).replace(/"/g, '""'); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return '"' + v + '"'; };
    var rows = voters.map(function (v) { var o = Object.assign({}, v, { contestant: (brides[v.contestant_id] || {}).name }); return cols.map(function (c) { return cell(o[c]); }).join(","); });
    var out = [cols.join(",")].concat(rows).join("\r\n");
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + out], { type: "text/csv;charset=utf-8" })); a.download = "bridal-challenge-voters.csv"; document.body.appendChild(a); a.click(); a.remove();
  }
})();
