/* Molly Samuels - Bridal Challenge admin (campaign, photos, video, messages, and the couples, who are added by admins only).
   Everything the admin types is shown as plain text, never as code. Only signed-in admins can save (the database enforces this too). */
(function () {
  "use strict";
  var C = window.MSChallenge, e = C.esc;
  var $ = function (id) { return document.getElementById(id); };
  var S = null, regs = [], editing = null, cur = {};
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
      S = r.data; fill(); loadRegs(); loadApps();
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
      if (url && !C.parseVideo(url)) return say("mFounder", "That video link is not accepted. Please paste a YouTube link.", true);
      if ($("vPublished").checked && !url) return say("mFounder", "Add the YouTube link before publishing.", true);
      save({ founder_published: $("vPublished").checked, founder_heading: $("vHeading").value.trim() || "A Special Message From Our Founder", founder_text: $("vText").value.trim(), founder_video_url: url || null, founder_ratio: $("vRatio").value }, "mFounder");
    });
    $("vUrl").addEventListener("input", prevVideo); $("vRatio").addEventListener("change", prevVideo);
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
      var al = $("tApplyLink").value.trim();
      if (al && !/^(https:\/\/[^\s"'<>]+|mailto:[^\s"'<>]+|tel:[+\d\s-]+)$/i.test(al)) return say("mText", "The apply link must start with https://, mailto: or tel:", true);
      save({ hero_headline: $("tHeroH").value.trim() || "WIN A BRIDAL PACKAGE WORTH UP TO ₦2 MILLION!", hero_subtext: $("tHeroS").value.trim(), about_text: $("tAbout").value.trim() || null, prize_text: $("tPrize").value.trim() || null, eligibility_text: $("tElig").value.trim() || null, rules_text: $("tRules").value.trim() || null, apply_text: $("tApply").value.trim() || null, apply_link: $("tApplyLink").value.trim() || null }, "mText");
    });
    $("bAdd").addEventListener("click", function () { openForm(null); });
    $("bCCancel").addEventListener("click", function () { $("cForm").hidden = true; });
    $("bCSave").addEventListener("click", saveCouple);
    $("bCsv").addEventListener("click", csv);
    $("regRows").addEventListener("click", rowClick); $("regRows").addEventListener("change", rowChange);
    $("appRows").addEventListener("click", appClick);
  }

  function refreshPhase() { $("curPhase").textContent = C.PHASE_LABEL[C.phaseOf(S)] + (S.phase_override ? " (forced by the Stage setting)" : " (by the dates)"); }
  function fill() {
    refreshPhase();
    $("fEnabled").checked = !!S.is_enabled; $("fPopup").checked = S.popup_enabled !== false; $("fIcon").checked = S.icon_enabled !== false; $("fOverride").value = S.phase_override || "";
    Object.keys(DATE_FIELDS).forEach(function (id) { $(id).value = toInput(S[DATE_FIELDS[id]]); });
    $("vPublished").checked = !!S.founder_published; $("vHeading").value = S.founder_heading || ""; $("vText").value = S.founder_text || ""; $("vUrl").value = S.founder_video_url || ""; $("vRatio").value = S.founder_ratio || "16:9";
    $("tHeroH").value = S.hero_headline || ""; $("tHeroS").value = S.hero_subtext || ""; $("tAbout").value = S.about_text || ""; $("tPrize").value = S.prize_text || ""; $("tElig").value = S.eligibility_text || ""; $("tApply").value = S.apply_text || ""; $("tApplyLink").value = S.apply_link || ""; $("tRules").value = S.rules_text || "";
    imgBox($("imgBoxes"), "hero_image_url", "Main banner photo (top of the landing page)");
    imgBox($("imgBoxes"), "popup_image_url", "Pop-up photo: the bride");
    imgBox($("imgBoxes"), "popup_image2_url", "Pop-up photo: the groom (optional)");
    imgBox($("thumbBox"), "founder_thumb_url", "Founder video thumbnail");
    loadMsg(); prevVideo();
  }

  /* ---------- pictures (kept in GitHub: assets/images/challenge/) ---------- */
  var FOLDER = "assets/images/challenge/";
  function cleanPath(v) {
    v = String(v || "").trim(); if (!v) return "";
    if (/^https:\/\/[^\s"'<>]+$/i.test(v)) return v;
    if (/^assets\/[^\s"'<>]+$/.test(v)) return /\.(jpe?g|png|webp)$/i.test(v) && v.indexOf("..") < 0 ? v : null;
    return /^[A-Za-z0-9][A-Za-z0-9._-]*\.(jpe?g|png|webp)$/i.test(v) ? FOLDER + v : null;
  }
  // One picture box: shows a preview, and a file-name field. onSet(path|null) is called when the admin presses the button.
  function photoBox(host, title, current, onSet, btnText) {
    host.innerHTML = "<h3>" + e(title) + '</h3><div class="pv">' + (current ? '<img src="' + e(C.safeImg(current)) + '" alt="" onerror="this.parentNode.textContent=\'Picture not found in GitHub yet\'">' : "No photo yet") + "</div>" +
      '<input type="text" class="fn" maxlength="200" placeholder="file name, e.g. banner.webp" aria-label="File name for: ' + e(title) + '" value="' + e(current ? current.replace(FOLDER, "") : "") + '">' +
      '<button type="button" class="use" style="color:#000;background:#F4D900;border:0;border-radius:99px;padding:6px 14px;font-weight:700;text-decoration:none;margin-top:8px">' + e(btnText) + "</button>" +
      (current ? '<button type="button" class="rm">Remove photo</button>' : "");
    host.querySelector(".use").addEventListener("click", function () {
      var v = cleanPath(host.querySelector(".fn").value);
      if (v === null) return alert("Use a file name ending in .jpg, .png or .webp (letters, numbers, dot, dash only), for example banner.webp. Upload the picture to the " + FOLDER + " folder on GitHub first.");
      onSet(v || null);
    });
    var rm = host.querySelector(".rm"); if (rm) rm.addEventListener("click", function () { if (confirm("Remove this photo?")) onSet(null); });
  }
  function imgBox(host, field, title) {
    var id = "ib_" + field, box = document.getElementById(id);
    if (!box) { box = document.createElement("div"); box.className = "ch-a-img"; box.id = id; host.appendChild(box); }
    photoBox(box, title, S[field], function (v) {
      var p = {}; p[field] = v;
      save(p, field === "founder_thumb_url" ? "mFounder" : "mStatus").then(function () { imgBox(host, field, title); prevPop(); });
    }, "Use this photo");
  }
  function removeOld() {}

  /* ---------- previews ---------- */
  function prevVideo() {
    var box = $("vPreview"), u = $("vUrl").value.trim(), v = C.parseVideo(u);
    if (!u) { box.innerHTML = ""; return; }
    if (!v) { box.innerHTML = '<span style="color:#9b1c1c">This link is not accepted. Please paste a YouTube link.</span>'; return; }
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


  /* ---------- applications (couples apply on the website; you approve them) ---------- */
  var apps = [];
  function when(iso) { var d = new Date(new Date(iso).getTime() + 3600000); return d.getUTCDate() + " " + ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getUTCMonth()] + ", " + pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes()); }
  function loadApps() {
    supabaseClient.from("challenge_applications").select("*").order("created_at", { ascending: false }).limit(300).then(function (r) {
      if (r.error) {
        var missing = /relation|does not exist|schema cache|404/i.test(r.error.message || "");
        $("appRows").innerHTML = '<tr><td colspan="5" style="padding:16px;color:#9b1c1c">' + (missing ? "<b>Applications are not set up yet.</b> Run <code>5-APPLICATIONS-SETUP.sql</code> in Supabase, then refresh this page." : "Could not load applications: " + e(r.error.message)) + "</td></tr>";
        return;
      }
      apps = r.data || []; renderApps();
    });
  }
  var APP_LABEL = { "new": "New", approved: "Approved", rejected: "Rejected" };
  function renderApps() {
    var n = apps.filter(function (a) { return a.status === "new"; }).length;
    $("appCount").textContent = "(" + n + " new, " + apps.length + " total)";
    if (!apps.length) { $("appRows").innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--ink-soft);padding:20px;">No applications yet.</td></tr>'; return; }
    $("appRows").innerHTML = apps.map(function (a) {
      var btns = a.status === "approved" ? '<small style="color:#1c6b2f">On the website. Add her photos and YouTube link under “Couples” below.</small>' :
        '<button type="button" class="btn btn-gold" data-act="approve" style="padding:6px 12px;font-size:.78rem">Approve</button> ' +
        (a.status === "rejected" ? '<button type="button" class="btn btn-outline" data-act="restore" style="padding:5px 10px;font-size:.78rem;border-color:var(--line)">Restore</button>' :
          '<button type="button" class="btn btn-outline" data-act="reject" style="padding:5px 10px;font-size:.78rem;border-color:#e6b4b4;color:#9b1c1c">Reject</button>');
      return '<tr data-id="' + e(a.id) + '"><td style="white-space:nowrap">' + e(when(a.created_at)) + "</td>" +
        "<td><b>" + e(a.bride_name) + "</b> &amp; " + e(a.partner_name) + "<br><small>" + e(a.location) + " &middot; " + e(a.word_count) + " words</small>" +
        '<details style="margin-top:6px"><summary style="cursor:pointer;color:#58493A;font-size:.82rem">Read love story and add a note</summary>' +
        '<p style="white-space:pre-wrap;margin:8px 0;max-width:560px;line-height:1.5">' + e(a.story) + "</p>" +
        '<label style="font-size:.78rem;display:block;margin-top:6px">Private note</label><textarea class="appNote" rows="2" maxlength="1000" style="width:100%;max-width:560px;box-sizing:border-box;padding:6px 8px;border:1px solid var(--line);border-radius:8px;font:inherit">' + e(a.admin_note || "") + "</textarea>" +
        '<button type="button" class="btn btn-outline" data-act="note" style="padding:4px 10px;font-size:.76rem;border-color:var(--line);margin-top:4px">Save note</button></details></td>' +
        "<td>" + e(a.phone) + "<br><small>" + e(a.email) + "</small></td>" +
        '<td><span style="font-weight:700;color:' + (a.status === "new" ? "#8a6d00" : a.status === "approved" ? "#1c6b2f" : "#9b1c1c") + '">' + e(APP_LABEL[a.status] || a.status) + "</span></td>" +
        '<td style="min-width:150px">' + btns + "</td></tr>";
    }).join("");
  }
  function appClick(ev) {
    var b = ev.target.closest("button[data-act]"); if (!b) return;
    var tr = b.closest("tr"), id = tr.dataset.id, a = apps.filter(function (x) { return x.id === id; })[0]; if (!a) return;
    var act = b.dataset.act;
    if (act === "note") {
      return supabaseClient.from("challenge_applications").update({ admin_note: tr.querySelector(".appNote").value.trim() || null }).eq("id", id).then(function (r) {
        if (r.error) return say("mApps", "Could not save the note: " + r.error.message, true);
        say("mApps", "Note saved."); loadApps();
      });
    }
    if (act === "approve") {
      if (!confirm("Approve " + a.bride_name + " & " + a.partner_name + "? She will appear on the website with her love story.")) return;
      b.disabled = true; say("mApps", "Approving…");
      return supabaseClient.rpc("challenge_admin_approve_application", { p_id: id }).then(function (r) {
        if (r.error || !r.data || !r.data.ok) { b.disabled = false; return say("mApps", "Could not approve: " + ((r.error && r.error.message) || "not found"), true); }
        say("mApps", "Approved. " + a.bride_name + " is now in “Couples” below and on the website. Add her photos and YouTube link there (press Edit).");
        loadApps(); loadRegs();
      });
    }
    var status = act === "reject" ? "rejected" : "new";
    if (act === "reject" && !confirm("Reject " + a.bride_name + " & " + a.partner_name + "?")) return;
    supabaseClient.from("challenge_applications").update({ status: status, reviewed_at: new Date().toISOString() }).eq("id", id).then(function (r) {
      if (r.error) return say("mApps", "Could not change this: " + r.error.message, true);
      say("mApps", act === "reject" ? "Rejected." : "Restored to New."); loadApps();
    });
  }

  /* ---------- couples (added by admins only) ---------- */
  function loadRegs() {
    Promise.all([
      supabaseClient.from("challenge_contestants").select("*").order("sort_order", { ascending: true }).order("contestant_number", { ascending: true }).limit(200),
      supabaseClient.from("challenge_contestant_private").select("*").limit(200)
    ]).then(function (rs) {
      if (rs[0].error) { $("regRows").innerHTML = '<tr><td colspan="5" style="color:#9b1c1c;padding:16px">Could not load couples: ' + e(rs[0].error.message) + "</td></tr>"; return; }
      var pr = {}; (rs[1].data || []).forEach(function (x) { pr[x.contestant_id] = x; });
      regs = (rs[0].data || []).map(function (c) { c.priv = pr[c.id] || {}; return c; }); renderRegs();
    });
  }
  function renderRegs() {
    $("regCount").textContent = "(" + regs.length + " total, " + regs.filter(function (x) { return x.is_published; }).length + " shown on the website)";
    if (!regs.length) { $("regRows").innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--ink-soft);padding:20px;">No couples yet. Press “Add couple”.</td></tr>'; return; }
    $("regRows").innerHTML = regs.map(function (x, i) {
      var th = C.safeImg(x.photo_url);
      return '<tr data-id="' + e(x.id) + '"><td>' + e(x.contestant_number) + "</td><td>" + (th ? '<img class="ch-th" src="' + e(th) + '" alt="">' : "") + "<b>" + e(x.bride_name) + "</b>" + (x.groom_name ? " &amp; " + e(x.groom_name) : "") + (x.city ? "<br><small>" + e(x.city) + "</small>" : "") + "</td>" +
        "<td>" + e(x.priv.phone || "") + (x.priv.email ? "<br>" + e(x.priv.email) : "") + '</td><td><label><input type="checkbox" data-act="pub"' + (x.is_published ? " checked" : "") + ' aria-label="Show ' + e(x.bride_name) + ' on the website"> ' + (x.is_published ? "Shown" : "Hidden") + "</label></td>" +
        '<td style="white-space:nowrap"><button type="button" class="btn btn-outline" data-act="edit" style="padding:5px 10px;font-size:.78rem;border-color:var(--line)">Edit</button> ' +
        '<button type="button" class="btn btn-outline" data-act="up" aria-label="Move up" style="padding:5px 9px;font-size:.78rem;border-color:var(--line)"' + (i === 0 ? " disabled" : "") + '>&uarr;</button> ' +
        '<button type="button" class="btn btn-outline" data-act="down" aria-label="Move down" style="padding:5px 9px;font-size:.78rem;border-color:var(--line)"' + (i === regs.length - 1 ? " disabled" : "") + '>&darr;</button> ' +
        '<button type="button" class="btn btn-outline" data-act="del" style="padding:5px 10px;font-size:.78rem;border-color:#e6b4b4;color:#9b1c1c">Delete</button></td></tr>';
    }).join("");
  }
  function find(id) { return regs.filter(function (r) { return r.id === id; })[0]; }
  function coupleBox(host, key, title) {
    photoBox(host, title, cur[key], function (v) { cur[key] = v; coupleBox(host, key, title); }, "Use this photo");
  }
  function openForm(x) {
    editing = x ? x.id : null; cur = x ? { photo_url: x.photo_url, partner_photo_url: x.partner_photo_url, orig: [x.photo_url, x.partner_photo_url, x.video_url] } : { photo_url: null, partner_photo_url: null, orig: [] };
    var nextNo = regs.reduce(function (m, r) { return Math.max(m, r.contestant_number); }, 0) + 1;
    $("cFormT").textContent = x ? "Edit couple" : "Add a couple";
    $("cNum").value = x ? x.contestant_number : nextNo; $("cBride").value = x ? x.bride_name : ""; $("cGroom").value = x ? x.groom_name || "" : ""; $("cCity").value = x ? x.city || "" : "";
    $("cStory").value = x ? x.story || "" : ""; $("cVideo").value = x ? x.video_url || "" : ""; $("cPub").checked = x ? !!x.is_published : false;
    var p = x ? x.priv : {}; $("cEmail").value = p.email || ""; $("cPhone").value = p.phone || ""; $("cWed").value = p.wedding_date || ""; $("cSocial").value = p.social_handle || ""; $("cNote").value = p.admin_note || "";
    coupleBox($("cBox1"), "photo_url", "Bride's photo (main card photo)"); coupleBox($("cBox2"), "partner_photo_url", "Partner / couple photo (optional)");
    say("mCouple", ""); $("cForm").hidden = false; $("cForm").scrollIntoView({ behavior: "smooth", block: "start" }); $("cBride").focus();
  }
  function saveCouple() {
    var bride = $("cBride").value.trim(), num = parseInt($("cNum").value, 10), video = $("cVideo").value.trim();
    if (bride.length < 2) return say("mCouple", "Please enter the bride's name.", true);
    if (!(num >= 1 && num <= 99)) return say("mCouple", "The number must be between 1 and 99.", true);
    if (video && !C.parseVideo(video)) return say("mCouple", "That video link is not accepted. Please paste a YouTube link.", true);
    var email = $("cEmail").value.trim().toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return say("mCouple", "That email address does not look right.", true);
    if ($("cPub").checked && !cur.photo_url) return say("mCouple", "Add the bride's photo before showing this couple on the website.", true);
    var row = { contestant_number: num, bride_name: bride, groom_name: $("cGroom").value.trim() || null, city: $("cCity").value.trim() || null, story: $("cStory").value.trim() || null,
      photo_url: cur.photo_url || null, partner_photo_url: cur.partner_photo_url || null, video_url: video || null, is_published: $("cPub").checked };
    var priv = { email: email || null, phone: $("cPhone").value.trim() || null, wedding_date: $("cWed").value || null, social_handle: $("cSocial").value.trim() || null, admin_note: $("cNote").value.trim() || null };
    say("mCouple", "Saving…");
    var q;
    if (editing) q = supabaseClient.from("challenge_contestants").update(row).eq("id", editing).select().single();
    else { row.sort_order = regs.reduce(function (m, r) { return Math.max(m, r.sort_order); }, 0) + 1; q = supabaseClient.from("challenge_contestants").insert(row).select().single(); }
    q.then(function (r) {
      if (r.error || !r.data) { say("mCouple", r.error && r.error.code === "23505" ? "That number is already used by another couple. Please choose a different number." : "Could not save: " + ((r.error && r.error.message) || "no permission"), true); return null; }
      priv.contestant_id = r.data.id;
      return supabaseClient.from("challenge_contestant_private").upsert(priv).then(function (r2) {
        if (r2.error) { say("mCouple", "The couple was saved but the private details were not: " + r2.error.message, true); return null; }
        [["photo_url", 0], ["partner_photo_url", 1], ["video_url", 2]].forEach(function (k) { var o = cur.orig[k[1]]; if (o && o !== row[k[0]]) removeOld(o); });
        say("mCouple", "Saved."); $("cForm").hidden = true; loadRegs(); return true;
      });
    });
  }
  function rowChange(ev) {
    var t = ev.target; if (t.dataset.act !== "pub") return;
    var id = t.closest("tr").dataset.id, x = find(id);
    if (t.checked && !C.safeImg(x.photo_url)) { t.checked = false; return alert("Add the bride's photo first (Edit), then show her on the website."); }
    supabaseClient.from("challenge_contestants").update({ is_published: t.checked }).eq("id", id).then(function (r) {
      if (r.error) { alert("Could not change this: " + r.error.message); loadRegs(); return; }
      x.is_published = t.checked; renderRegs();
    });
  }
  function rowClick(ev) {
    var b = ev.target.closest("button[data-act]"); if (!b) return;
    var id = b.closest("tr").dataset.id, x = find(id), i = regs.indexOf(x); if (!x) return;
    if (b.dataset.act === "edit") return openForm(x);
    if (b.dataset.act === "up" || b.dataset.act === "down") {
      var y = regs[b.dataset.act === "up" ? i - 1 : i + 1]; if (!y) return;
      var a1 = x.sort_order, a2 = y.sort_order; if (a1 === a2) a2 = a1 + (b.dataset.act === "up" ? -1 : 1);
      return supabaseClient.from("challenge_contestants").update({ sort_order: a2 }).eq("id", x.id).then(function (r1) {
        return supabaseClient.from("challenge_contestants").update({ sort_order: a1 }).eq("id", y.id).then(function (r2) { if (r1.error || r2.error) alert("Could not reorder."); loadRegs(); });
      });
    }
    if (b.dataset.act === "del" && confirm("Delete " + x.bride_name + " for good? Her photos will be removed too. To only hide her, untick “On website” instead.")) {
      supabaseClient.from("challenge_contestants").delete().eq("id", id).then(function (r) {
        if (r.error) return alert("Could not delete: " + r.error.message);
        [x.photo_url, x.partner_photo_url, x.video_url].forEach(removeOld); loadRegs();
      });
    }
  }
  function csv() {
    var cols = ["contestant_number", "bride_name", "groom_name", "city", "is_published", "story", "video_url", "email", "phone", "wedding_date", "social_handle", "admin_note"];
    var cell = function (v) { v = String(v == null ? "" : v).replace(/"/g, '""'); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return '"' + v + '"'; };
    var out = [cols.join(",")].concat(regs.map(function (r) { return cols.map(function (c) { return cell(c in r ? r[c] : r.priv[c]); }).join(","); })).join("\r\n");
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + out], { type: "text/csv;charset=utf-8" })); a.download = "bridal-challenge-couples.csv"; document.body.appendChild(a); a.click(); a.remove();
  }
})();
