/* Molly Samuels - Bridal Challenge admin (Phase 1: campaign, photos, video, messages, registrations).
   Everything the admin types is shown as plain text, never as code. Only signed-in admins can save (the database enforces this too). */
(function () {
  "use strict";
  var C = window.MSChallenge, e = C.esc;
  var $ = function (id) { return document.getElementById(id); };
  var S = null, regs = [];
  var DATE_FIELDS = { dRegOpen: "reg_open", dRegClose: "reg_close", dIntStart: "interviews_start", dIntEnd: "interviews_end", dVoteOpen: "voting_open", dVoteClose: "voting_close", dWinner: "winner_date", dPrizeStart: "prize_start", dPrizeEnd: "prize_end", dEnd: "campaign_end" };

  function say(id, msg, bad) { var m = $(id); m.textContent = msg; m.style.color = bad ? "#9b1c1c" : "#1c6b2f"; m.className = "adm-msg"; }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function toInput(iso) { var d = new Date(new Date(iso).getTime() + 3600000); return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()) + "T" + pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes()); }
  function fromInput(v) { var d = new Date(v + ":00+01:00"); return isNaN(d) ? null : d.toISOString(); }
  function forget() { try { sessionStorage.removeItem("ms_ch_settings_v1"); } catch (x) {} }

  function save(patch, msgId) {
    say(msgId, "Saving…");
    return supabaseClient.from("challenge_settings").update(patch).eq("id", 1).select().single().then(function (r) {
      if (r.error || !r.data) { say(msgId, "Could not save: " + ((r.error && r.error.message) || "you may not have permission"), true); return false; }
      S = r.data; forget(); say(msgId, "Saved."); refreshPhase(); return true;
    });
  }

  document.addEventListener("adminReady", init);
  function init() {
    var sel = $("fOverride"), ms = $("mPhase");
    C.PHASES.forEach(function (p) { sel.insertAdjacentHTML("beforeend", '<option value="' + p + '">' + e(C.PHASE_LABEL[p]) + "</option>"); if (p !== "ended") ms.insertAdjacentHTML("beforeend", '<option value="' + p + '">' + e(C.PHASE_LABEL[p]) + "</option>"); });
    supabaseClient.from("challenge_settings").select("*").eq("id", 1).single().then(function (r) {
      if (r.error || !r.data) { document.querySelector(".admin-content").insertAdjacentHTML("afterbegin", '<div class="admin-panel"><p style="color:#9b1c1c"><b>The Bridal Challenge database is not set up yet.</b> Run <code>1-CHALLENGE-SETUP.sql</code> in Supabase, then refresh this page.</p></div>'); return; }
      S = r.data; fill(); loadRegs();
    });
    $("bStatus").addEventListener("click", function () { save({ is_enabled: $("fEnabled").checked, popup_enabled: $("fPopup").checked, icon_enabled: $("fIcon").checked, phase_override: $("fOverride").value || null }, "mStatus"); });
    $("bDates").addEventListener("click", function () {
      var p = {}, bad = false;
      Object.keys(DATE_FIELDS).forEach(function (id) { var v = fromInput($(id).value); if (!v) bad = true; p[DATE_FIELDS[id]] = v; });
      if (bad) return say("mDates", "Please fill in every date and time.", true);
      var order = ["reg_open", "reg_close", "interviews_start", "interviews_end", "voting_open", "voting_close", "winner_date", "prize_start", "prize_end", "campaign_end"];
      for (var i = 1; i < order.length; i++) if (new Date(p[order[i]]) < new Date(p[order[i - 1]])) return say("mDates", "The dates must follow in order. Please check “" + order[i].replace(/_/g, " ") + "”.", true);
      save(p, "mDates");
    });
    $("bFounder").addEventListener("click", function () {
      var url = $("vUrl").value.trim();
      if (url && !C.parseVideo(url)) return say("mFounder", "That video link is not accepted. Use a YouTube or Vimeo link, or upload an MP4/WebM file.", true);
      if ($("vPublished").checked && !url) return say("mFounder", "Add a video link or upload a video before publishing.", true);
      save({ founder_published: $("vPublished").checked, founder_heading: $("vHeading").value.trim() || "A Special Message From Our Founder", founder_text: $("vText").value.trim(), founder_video_url: url || null, founder_ratio: $("vRatio").value }, "mFounder");
    });
    $("vUrl").addEventListener("input", prevVideo); $("vRatio").addEventListener("change", prevVideo);
    $("vFile").addEventListener("change", function () {
      var f = this.files[0]; if (!f) return;
      if (["video/mp4", "video/webm"].indexOf(f.type) < 0) return say("mFounder", "The video must be an MP4 or WebM file.", true);
      if (f.size > 50 * 1024 * 1024) return say("mFounder", "That file is over 50 MB. Please upload it to YouTube and paste the link instead.", true);
      say("mFounder", "Uploading video…");
      upload(f, "founder").then(function (u) { if (u) { $("vUrl").value = u; prevVideo(); say("mFounder", "Video uploaded. Press “Save founder's video” to use it."); } });
    });
    $("mPhase").addEventListener("change", loadMsg);
    ["mTitle", "mBody", "mBtn"].forEach(function (id) { $(id).addEventListener("input", prevPop); });
    $("bMsgs").addEventListener("click", function () {
      var pt = Object.assign({}, S.phase_texts || {}), p = $("mPhase").value;
      var o = { title: $("mTitle").value.trim(), text: $("mBody").value.trim(), button: $("mBtn").value.trim() };
      Object.keys(o).forEach(function (k) { if (!o[k]) delete o[k]; });
      if (Object.keys(o).length) pt[p] = o; else delete pt[p];
      save({ phase_texts: pt }, "mMsgs");
    });
    $("bText").addEventListener("click", function () {
      save({ hero_headline: $("tHeroH").value.trim() || "WIN A BRIDAL PACKAGE WORTH UP TO ₦2 MILLION!", hero_subtext: $("tHeroS").value.trim(), about_text: $("tAbout").value.trim() || null, prize_text: $("tPrize").value.trim() || null, eligibility_text: $("tElig").value.trim() || null, rules_text: $("tRules").value.trim() || null }, "mText");
    });
    $("rSearch").addEventListener("input", renderRegs); $("rFilter").addEventListener("change", renderRegs);
    $("bCsv").addEventListener("click", csv);
    $("regRows").addEventListener("click", rowClick); $("regRows").addEventListener("change", rowChange);
  }

  function refreshPhase() { $("curPhase").textContent = C.PHASE_LABEL[C.phaseOf(S)] + (S.phase_override ? " (forced by the Stage setting)" : " (by the dates)"); }
  function fill() {
    refreshPhase();
    $("fEnabled").checked = !!S.is_enabled; $("fPopup").checked = S.popup_enabled !== false; $("fIcon").checked = S.icon_enabled !== false; $("fOverride").value = S.phase_override || "";
    Object.keys(DATE_FIELDS).forEach(function (id) { $(id).value = toInput(S[DATE_FIELDS[id]]); });
    $("vPublished").checked = !!S.founder_published; $("vHeading").value = S.founder_heading || ""; $("vText").value = S.founder_text || ""; $("vUrl").value = S.founder_video_url || ""; $("vRatio").value = S.founder_ratio || "16:9";
    $("tHeroH").value = S.hero_headline || ""; $("tHeroS").value = S.hero_subtext || ""; $("tAbout").value = S.about_text || ""; $("tPrize").value = S.prize_text || ""; $("tElig").value = S.eligibility_text || ""; $("tRules").value = S.rules_text || "";
    imgBox($("imgBoxes"), "hero_image_url", "Main banner photo (top of the landing page)", "hero");
    imgBox($("imgBoxes"), "popup_image_url", "Pop-up photo: the bride", "popup");
    imgBox($("imgBoxes"), "popup_image2_url", "Pop-up photo: the groom (optional)", "popup");
    imgBox($("thumbBox"), "founder_thumb_url", "Founder video thumbnail", "thumb");
    loadMsg(); prevVideo();
  }

  /* ---------- pictures ---------- */
  function imgBox(host, field, title, kind) {
    var id = "ib_" + field, box = document.getElementById(id);
    if (!box) { box = document.createElement("div"); box.className = "ch-a-img"; box.id = id; host.appendChild(box); }
    var url = S[field];
    box.innerHTML = "<h3>" + e(title) + '</h3><div class="pv">' + (url ? '<img src="' + e(C.safeImg(url)) + '" alt="">' : "No photo yet") + '</div><input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose a photo: ' + e(title) + '">' + (url ? '<button type="button">Remove this photo</button>' : "");
    box.querySelector("input").addEventListener("change", function () {
      var f = this.files[0]; if (!f) return;
      if (["image/jpeg", "image/png", "image/webp"].indexOf(f.type) < 0) return alert("Please choose a JPG, PNG or WebP picture.");
      if (f.size > 4 * 1024 * 1024) return alert("That picture is over 4 MB. Please shrink it first (for example with squoosh.app).");
      box.querySelector(".pv").textContent = "Uploading…";
      var old = S[field];
      upload(f, kind).then(function (u) {
        if (!u) { box.querySelector(".pv").textContent = "Upload failed"; return; }
        var p = {}; p[field] = u;
        save(p, field === "founder_thumb_url" ? "mFounder" : "mStatus").then(function (ok) { if (ok) removeOld(old); imgBox(host, field, title, kind); prevPop(); });
      });
    });
    var rm = box.querySelector("button");
    if (rm) rm.addEventListener("click", function () { if (!confirm("Remove this photo?")) return; var old = S[field], p = {}; p[field] = null; save(p, "mStatus").then(function (ok) { if (ok) removeOld(old); imgBox(host, field, title, kind); prevPop(); }); });
  }
  function upload(file, kind) {
    var ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "video/mp4": "mp4", "video/webm": "webm" }[file.type];
    var path = kind + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
    return supabaseClient.storage.from("challenge-media").upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false }).then(function (r) {
      if (r.error) { alert("Upload failed: " + r.error.message); return null; }
      return supabaseClient.storage.from("challenge-media").getPublicUrl(path).data.publicUrl;
    });
  }
  function removeOld(url) {
    var m = String(url || "").match(/\/storage\/v1\/object\/public\/challenge-media\/(.+)$/);
    if (m) supabaseClient.storage.from("challenge-media").remove([decodeURIComponent(m[1])]);
  }

  /* ---------- previews ---------- */
  function prevVideo() {
    var box = $("vPreview"), u = $("vUrl").value.trim(), v = C.parseVideo(u);
    if (!u) { box.innerHTML = ""; return; }
    if (!v) { box.innerHTML = '<span style="color:#9b1c1c">This link is not accepted. Use YouTube, Vimeo or an MP4/WebM link.</span>'; return; }
    var w = $("vRatio").value === "9:16" ? "max-width:240px" : "max-width:480px", ar = $("vRatio").value === "9:16" ? "9/16" : "16/9";
    if (v.kind === "file") box.innerHTML = '<video controls preload="metadata" src="' + e(v.src) + '" style="' + w + '"></video>';
    else box.innerHTML = '<div style="' + w + ';aspect-ratio:' + ar + '"><iframe src="' + e(v.embed.replace("autoplay=1", "autoplay=0")) + '" title="Preview" style="width:100%;height:100%;border:0" allowfullscreen loading="lazy"></iframe></div>';
  }
  function loadMsg() {
    var p = $("mPhase").value || "coming", o = (S.phase_texts && S.phase_texts[p]) || {}, d = C.DEFAULT_TEXTS[p];
    $("mTitle").value = o.title || ""; $("mBody").value = o.text || ""; $("mBtn").value = o.button || "";
    $("mTitle").placeholder = d.title; $("mBody").placeholder = d.text; $("mBtn").placeholder = d.button;
    prevPop();
  }
  function prevPop() {
    var p = $("mPhase").value || "coming", d = C.DEFAULT_TEXTS[p];
    var t = { title: $("mTitle").value.trim() || d.title, text: $("mBody").value.trim() || d.text, button: $("mBtn").value.trim() || d.button };
    var s2 = Object.assign({}, S), img = C.safeImg(S.popup_image_url);
    $("popPrev").innerHTML = '<p style="margin:0 0 8px;color:#777">Preview of the pop-up for this stage' + (img ? "" : " (no pop-up photo yet, so the pop-up is hidden on the site)") + ':</p><div class="mock"><div class="i" style="' + (img ? "background-image:url('" + e(img) + "')" : "") + '"></div><div class="t"><b>' + e(C.fill(t.title, s2)) + "</b>" + e(C.fill(t.text, s2)) + '<br><span class="b">' + e(C.fill(t.button, s2)) + "</span></div></div>";
  }

  /* ---------- registrations ---------- */
  function loadRegs() {
    supabaseClient.from("challenge_registrations").select("*").order("created_at", { ascending: false }).limit(1000).then(function (r) {
      if (r.error) { $("regRows").innerHTML = '<tr><td colspan="6" style="color:#9b1c1c;padding:16px">Could not load registrations: ' + e(r.error.message) + "</td></tr>"; return; }
      regs = r.data || []; renderRegs();
    });
  }
  function renderRegs() {
    var q = $("rSearch").value.trim().toLowerCase(), f = $("rFilter").value;
    var list = regs.filter(function (x) { return (!f || x.status === f) && (!q || [x.bride_name, x.groom_name, x.email, x.city, x.phone].join(" ").toLowerCase().indexOf(q) > -1); });
    var n = { new: 0, shortlisted: 0, reserve: 0, declined: 0 }; regs.forEach(function (x) { n[x.status]++; });
    $("regCount").textContent = "(" + regs.length + " total: " + n.new + " new, " + n.shortlisted + " shortlisted, " + n.reserve + " reserve, " + n.declined + " declined)";
    if (!list.length) { $("regRows").innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--ink-soft);padding:20px;">' + (regs.length ? "No match." : "No registrations yet.") + "</td></tr>"; return; }
    $("regRows").innerHTML = list.map(function (x) {
      var d = new Date(x.created_at).toLocaleString("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
      return '<tr data-id="' + e(x.id) + '"><td>' + e(d) + "</td><td><b>" + e(x.bride_name) + "</b><br>& " + e(x.groom_name) + "</td><td>" + e(x.email) + "<br>" + e(x.phone) + "</td><td>" + e(x.city) + "</td>" +
        '<td><select class="reg-st" aria-label="Status for ' + e(x.bride_name) + '">' + ["new", "shortlisted", "reserve", "declined"].map(function (s) { return '<option value="' + s + '"' + (s === x.status ? " selected" : "") + ">" + s + "</option>"; }).join("") + "</select></td>" +
        '<td><button type="button" class="btn btn-outline" data-act="view" style="padding:5px 12px;font-size:.78rem;border-color:var(--line)">Details</button></td></tr>';
    }).join("");
  }
  function rowChange(ev) {
    if (!ev.target.classList.contains("reg-st")) return;
    var tr = ev.target.closest("tr"), id = tr.dataset.id, st = ev.target.value;
    supabaseClient.from("challenge_registrations").update({ status: st }).eq("id", id).then(function (r) {
      if (r.error) { alert("Could not change the status: " + r.error.message); loadRegs(); return; }
      regs.forEach(function (x) { if (x.id === id) x.status = st; }); renderRegs();
    });
  }
  function rowClick(ev) {
    var b = ev.target.closest("button[data-act]"); if (!b) return;
    var tr = b.closest("tr"), id = tr.dataset.id, x = regs.filter(function (r) { return r.id === id; })[0]; if (!x) return;
    var nx = tr.nextElementSibling;
    if (nx && nx.classList.contains("reg-det")) { nx.remove(); return; }
    var wa = "https://wa.me/" + String(x.phone).replace(/[^\d]/g, "");
    var row = document.createElement("tr"); row.className = "reg-det";
    row.innerHTML = '<td colspan="6"><p><b>Love story:</b><br>' + e(x.love_story).replace(/\n/g, "<br>") + "</p><p><b>Wedding date:</b> " + e(x.wedding_date || "not given") + " &nbsp; <b>Social:</b> " + e(x.social_handle || "none") + " &nbsp; <b>Heard about us:</b> " + e(x.how_heard || "not said") +
      '</p><p><a href="mailto:' + e(x.email) + '">Email</a> &nbsp; <a href="' + e(wa) + '" target="_blank" rel="noopener">WhatsApp</a></p><div class="ph"></div>' +
      '<label>Private note<textarea rows="2" maxlength="1000">' + e(x.admin_note || "") + '</textarea></label><p><button type="button" class="btn btn-gold" data-act="note" style="padding:6px 14px;font-size:.8rem">Save note</button> &nbsp; <button type="button" class="btn btn-outline" data-act="del" style="padding:6px 14px;font-size:.8rem;border-color:#9b1c1c;color:#9b1c1c">Delete registration</button></p></td>';
    tr.after(row);
    if (x.couple_photo_path) supabaseClient.storage.from("challenge-entries").createSignedUrl(x.couple_photo_path, 600).then(function (r) { if (r.data) row.querySelector(".ph").innerHTML = '<a href="' + e(r.data.signedUrl) + '" target="_blank" rel="noopener"><img src="' + e(r.data.signedUrl) + '" alt="Photo of ' + e(x.bride_name) + ' and ' + e(x.groom_name) + '" style="max-width:220px;border-radius:10px"></a>'; });
    row.addEventListener("click", function (e2) {
      var a = e2.target.closest("button[data-act]"); if (!a) return;
      if (a.dataset.act === "note") supabaseClient.from("challenge_registrations").update({ admin_note: row.querySelector("textarea").value.trim() || null }).eq("id", id).then(function (r) { a.textContent = r.error ? "Failed" : "Saved"; x.admin_note = row.querySelector("textarea").value.trim(); });
      if (a.dataset.act === "del" && confirm("Delete this registration for good?")) {
        var paths = x.couple_photo_path ? [x.couple_photo_path] : [];
        supabaseClient.from("challenge_registrations").delete().eq("id", id).then(function (r) { if (r.error) return alert("Could not delete: " + r.error.message); if (paths.length) supabaseClient.storage.from("challenge-entries").remove(paths); regs = regs.filter(function (z) { return z.id !== id; }); renderRegs(); });
      }
    });
  }
  function csv() {
    var cols = ["created_at", "status", "bride_name", "groom_name", "email", "phone", "city", "wedding_date", "social_handle", "how_heard", "love_story", "admin_note"];
    var cell = function (v) { v = String(v == null ? "" : v).replace(/"/g, '""'); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return '"' + v + '"'; };
    var out = [cols.join(",")].concat(regs.map(function (r) { return cols.map(function (c) { return cell(r[c]); }).join(","); })).join("\r\n");
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + out], { type: "text/csv;charset=utf-8" })); a.download = "bridal-challenge-registrations.csv"; document.body.appendChild(a); a.click(); a.remove();
  }
})();
