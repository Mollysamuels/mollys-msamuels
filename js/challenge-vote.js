/* Molly Samuels - Bridal Challenge voting (live counts + the vote steps).
   Every rule (one vote per email, phone and device, voting dates) is enforced by the database; this file only shows the steps. */
(function () {
  "use strict";
  var C = window.MSChallenge, e = C.esc;
  var sb = null, S = null, phase = "", tally = {}, counting = false, voted = null, pend = null, last = null;
  var DEV_KEY = "ms_ch_dev_v1", VOTED_KEY = "ms_ch_voted_v1", PEND_KEY = "ms_ch_pending_v1", LINK_KEY = "ms_ch_vote_link_v1", LINK_MAX_MS = 60 * 60 * 1000;
  function $(id) { return document.getElementById(id); }

  /* ---------- this device's private id (only a scrambled copy is ever stored) ---------- */
  function deviceId() {
    var v = null;
    try { v = localStorage.getItem(DEV_KEY); } catch (x) {}
    if (!v) { var m = document.cookie.match(/(?:^|; )ms_ch_dev=([A-Za-z0-9-]{16,64})/); if (m) v = m[1]; }
    if (!v) v = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : "d" + Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    try { localStorage.setItem(DEV_KEY, v); } catch (x) {}
    document.cookie = "ms_ch_dev=" + v + "; max-age=31536000; path=/; SameSite=Lax; Secure";
    return v;
  }
  function getVoted() { try { return JSON.parse(localStorage.getItem(VOTED_KEY) || "null"); } catch (x) { return null; } }
  function setVoted(o) { voted = o; try { localStorage.setItem(VOTED_KEY, JSON.stringify(o)); } catch (x) {} paintButtons(); }

  /* ---------- live counts ---------- */
  function paintCounts() {
    var ids = Object.keys(tally); if (!counting || !ids.length) return;
    var sorted = ids.map(function (k) { return tally[k]; }).sort(function (a, b) { return b - a; });
    document.querySelectorAll(".ch-bride[data-id]").forEach(function (card) {
      var id = card.getAttribute("data-id"), n = tally[id]; if (n == null) return;
      var box = card.querySelector(".ch-live"); if (!box) return;
      var rank = sorted.indexOf(n) + 1, top = sorted[0] > 0 && n === sorted[0];
      box.hidden = false;
      box.innerHTML = '<b class="ch-live-n">' + Number(n).toLocaleString("en-GB") + "</b><span>" + (n === 1 ? "vote" : "votes") + "</span>" + (sorted[0] > 0 ? '<i class="ch-rank' + (top ? " top" : "") + '">' + (top ? "Leading" : "Rank " + rank) + "</i>" : "");
    });
  }
  function loadTally() {
    return C.request("challenge_tally?select=contestant_id,total_votes").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }).then(function (rows) {
      if (!rows || !rows.length) return;
      rows.forEach(function (x) { tally[x.contestant_id] = x.total_votes; }); paintCounts();
    });
  }
  function live() {
    loadTally();
    var tick = setInterval(function () { if (!document.hidden) loadTally(); }, 20000); // backup in case the live link drops
    try {
      sb.channel("ch_tally").on("postgres_changes", { event: "*", schema: "public", table: "challenge_tally" }, function (p) {
        var r = p && p.new; if (r && r.contestant_id) { tally[r.contestant_id] = r.total_votes; paintCounts(); }
      }).subscribe();
    } catch (x) {}
    return tick;
  }

  /* ---------- buttons on the cards ---------- */
  function paintButtons() {
    document.querySelectorAll(".ch-vote[data-id]").forEach(function (b) {
      if (voted) {
        var mine = voted.id === b.getAttribute("data-id");
        b.disabled = true; b.classList.toggle("is-mine", mine);
        b.textContent = mine ? "Your vote ✓" : "You have voted";
      }
    });
  }

  /* ---------- the vote box ---------- */
  var box, bodyEl, lastFocus = null;
  function makeBox() {
    if (box) return;
    box = document.createElement("div"); box.id = "chVM"; box.hidden = true;
    box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-labelledby", "chVMT");
    box.innerHTML = '<div class="chvm-box"><button type="button" class="chvm-x" aria-label="Close">&times;</button><div id="chVMBody"></div></div>';
    document.body.appendChild(box); bodyEl = $("chVMBody");
    box.addEventListener("click", function (ev) { if (ev.target === box) close(); });
    box.querySelector(".chvm-x").addEventListener("click", close);
    document.addEventListener("keydown", function (ev) {
      if (box.hidden) return;
      if (ev.key === "Escape") { close(); return; }
      if (ev.key === "Tab") {
        var f = box.querySelectorAll("button:not([disabled]),input,a[href]"); if (!f.length) return;
        var a = f[0], z = f[f.length - 1];
        if (ev.shiftKey && document.activeElement === a) { ev.preventDefault(); z.focus(); } else if (!ev.shiftKey && document.activeElement === z) { ev.preventDefault(); a.focus(); }
      }
    });
  }
  function open() { makeBox(); lastFocus = document.activeElement; box.hidden = false; document.body.style.overflow = "hidden"; }
  function close() { if (!box) return; box.hidden = true; document.body.style.overflow = ""; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  function show(html, focusSel) {
    bodyEl.innerHTML = html;
    var f = focusSel && bodyEl.querySelector(focusSel); if (f) f.focus();
  }
  function err(msg) { var n = $("chVMErr"); if (n) { n.textContent = msg; n.hidden = !msg; } }
  function busy(on) { bodyEl.querySelectorAll("button,input").forEach(function (x) { x.disabled = on; }); }

  var MSG = {
    closed: "Voting is not open right now.",
    email_used: "This email address has already been used to vote. Each email can vote once.",
    phone_used: "This phone number has already been used to vote. Each phone number can vote once.",
    device_used: "This device has already voted. Each device can vote once.",
    already_voted: "You have already voted.",
    bad_phone: "Please enter a valid phone number.", bad_name: "Please enter your name.",
    bad_contestant: "That bride is not available for voting.", email_not_verified: "Your email is not verified yet. Please try again.",
    not_signed_in: "Please verify your email first.", bad_device: "Your browser could not be checked. Please refresh and try again."
  };

  function normPhone(p) { return String(p || "").replace(/\D/g, ""); }
  function emailOk(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 254; }

  /* step 1: who is voting? */
  function stepForm(user) {
    var b = last;
    var meta = (user && user.user_metadata) || {};
    var nm = (user && (meta.full_name || meta.name)) || last.name || "", ph = (user && meta.phone) || last.phone || "";
    var head = '<p class="chvm-eye">Mollys &times; M. Samuels</p><h2 id="chVMT">Vote for ' + e(b.bride) + '</h2>';
    var fields = '<div class="chvm-f"><label for="vName">Your name</label><input id="vName" type="text" autocomplete="name" maxlength="100" value="' + e(nm) + '"></div>' +
      '<div class="chvm-f"><label for="vPhone">Phone number</label><input id="vPhone" type="tel" inputmode="tel" autocomplete="tel" maxlength="30" placeholder="0803 123 4567" value="' + e(ph) + '"></div>';
    var optin = '<label class="chvm-ck"><input type="checkbox" id="vOpt"> Send me news and offers from Molly Samuels (optional)</label>';
    if (user && user.email) {
      show(head + '<p class="chvm-note">Signed in as <b>' + e(user.email) + '</b>. <button type="button" class="chvm-link" id="vOut">Not you?</button></p>' + fields + optin +
        '<p class="chvm-err" id="chVMErr" role="alert" hidden></p><button type="button" class="chvm-go" id="vCast">Cast my vote</button>', "#vName");
      $("vCast").addEventListener("click", function () {
        var v = read(); if (!v) return;
        cast(v, (user.app_metadata && user.app_metadata.provider === "google") ? "google" : "email");
      });
      $("vOut").addEventListener("click", function () { sb.auth.signOut().then(function () { stepForm(null); }); });
      return;
    }
    show(head + '<p class="chvm-note">Confirm it is really you. Each email, phone number and device can vote once. You will also get a free Molly Samuels account.</p>' + fields +
      '<div class="chvm-f"><label for="vEmail">Email address</label><input id="vEmail" type="email" autocomplete="email" maxlength="254" value="' + e(last.email || "") + '"></div>' + optin +
      '<p class="chvm-err" id="chVMErr" role="alert" hidden></p>' +
      '<button type="button" class="chvm-go" id="vCode">Email me a code</button><p class="chvm-or"><span>or</span></p>' +
      '<button type="button" class="chvm-g" id="vGoogle"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.3 0-.6-.1-1.1-.2-1.6H12z"/></svg>Continue with Google</button>', "#vName");
    $("vCode").addEventListener("click", function () {
      var v = read(); if (!v) return;
      var em = $("vEmail").value.trim().toLowerCase();
      if (!emailOk(em)) return err("Please enter a valid email address.");
      v.email = em; last.email = em; sendCode(v);
    });
    $("vGoogle").addEventListener("click", function () {
      var v = read(); if (!v) return;
      try { sessionStorage.setItem(PEND_KEY, JSON.stringify({ id: last.id, bride: last.bride, name: v.name, phone: v.phone, optin: v.optin })); } catch (x) {}
      busy(true);
      sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname } }).then(function (r) {
        if (r && r.error) { busy(false); err("Google sign-in is not available right now. Please use the email code instead."); }
      });
    });
  }
  function read() {
    var name = $("vName").value.trim(), phone = $("vPhone").value.trim(), n = normPhone(phone);
    if (name.length < 2) { err("Please enter your name."); return null; }
    if (n.length < 10 || n.length > 15) { err("Please enter a valid phone number."); return null; }
    last.name = name; last.phone = phone;
    var o = $("vOpt"); return { name: name, phone: phone, optin: !!(o && o.checked) };
  }

  /* step 2 (email path): the code */
  function sendCode(v) {
    err(""); busy(true);
    /* The emailed link opens a new tab and returns to this page (not the home page). The details live in localStorage so that tab can finish the vote. */
    try { localStorage.setItem(LINK_KEY, JSON.stringify({ t: Date.now(), id: last.id, bride: last.bride, name: v.name, phone: v.phone, optin: v.optin })); } catch (x) {}
    sb.auth.signInWithOtp({ email: v.email, options: { shouldCreateUser: true, emailRedirectTo: location.origin + location.pathname, data: { full_name: v.name, phone: v.phone } } }).then(function (r) {
      if (r.error) {
        try { localStorage.removeItem(LINK_KEY); } catch (x) {}
        busy(false); var m = String(r.error.message || "").toLowerCase();
        return err(/after \d+ seconds|rate limit|too many/.test(m) ? "Too many codes were requested. Please wait a minute and try again, or continue with Google." : "We could not send the code. Please check the email address or continue with Google.");
      }
      last.v = v; stepCode(v);
    });
  }
  function stepCode(v) {
    show('<p class="chvm-eye">Mollys &times; M. Samuels</p><h2 id="chVMT">Enter your code</h2><p class="chvm-note">We sent a code to <b>' + e(v.email) + '</b>. It can take a minute. Check your spam folder too.</p>' +
      '<div class="chvm-f"><label for="vTok">Code from your email</label><input id="vTok" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="123456"></div>' +
      '<p class="chvm-err" id="chVMErr" role="alert" hidden></p><button type="button" class="chvm-go" id="vVerify">Verify and vote</button>' +
      '<p class="chvm-small"><button type="button" class="chvm-link" id="vResend" disabled>Send a new code in <span id="vWait">60</span>s</button> &nbsp; <button type="button" class="chvm-link" id="vChange">Change email</button></p>', "#vTok");
    var left = 60, t = setInterval(function () {
      left--; var w = $("vWait"), rb = $("vResend"); if (!w || !rb) { clearInterval(t); return; }
      if (left <= 0) { clearInterval(t); rb.disabled = false; rb.textContent = "Send a new code"; } else w.textContent = left;
    }, 1000);
    $("vVerify").addEventListener("click", function () {
      var tok = $("vTok").value.replace(/\s/g, "");
      if (!/^\d{6,10}$/.test(tok)) return err("Please type the code from your email.");
      err(""); busy(true);
      sb.auth.verifyOtp({ email: v.email, token: tok, type: "email" }).then(function (r) {
        if (r.error) return sb.auth.verifyOtp({ email: v.email, token: tok, type: "signup" });
        return r;
      }).then(function (r) {
        if (!r || r.error || !r.data || !r.data.session) { busy(false); return err("That code is not right or has expired. Please try again or ask for a new code."); }
        try { localStorage.removeItem(LINK_KEY); } catch (x) {}
        cast(v, "email");
      });
    });
    $("vTok").addEventListener("keydown", function (ev) { if (ev.key === "Enter") $("vVerify").click(); });
    $("vResend").addEventListener("click", function () { clearInterval(t); stepForm(null); });
    $("vChange").addEventListener("click", function () { clearInterval(t); stepForm(null); });
  }

  /* step 3: the vote itself */
  function cast(v, provider) {
    show('<p class="chvm-eye">Mollys &times; M. Samuels</p><h2 id="chVMT">Casting your vote…</h2><p class="chvm-note">One moment please.</p>');
    sb.rpc("challenge_cast_vote", { p_contestant: last.id, p_name: v.name, p_phone: v.phone, p_device: deviceId(), p_optin: !!v.optin, p_provider: provider }).then(function (r) {
      var d = r.data;
      if (r.error || !d) return blocked("Something went wrong. Please try again in a moment.", true);
      if (!d.ok) return blocked(MSG[d.code] || "Your vote could not be counted.", d.code === "bad_phone" || d.code === "bad_name");
      setVoted({ id: last.id, bride: last.bride });
      var url = "https://mollysamuels.com/bridal-challenge#bride-" + last.id;
      var txt = "I just voted for " + last.bride + " in the Mollys × M. Samuels Bridal Challenge! Vote for your favourite bride: ";
      show('<p class="chvm-eye">Thank you</p><h2 id="chVMT">Your vote for ' + e(last.bride) + ' is in!</h2><p class="chvm-note">You are now signed in to your Molly Samuels account too. Share the love and ask your friends to vote.</p>' +
        '<a class="chvm-go" target="_blank" rel="noopener noreferrer" href="https://wa.me/?text=' + encodeURIComponent(txt + url) + '">Share on WhatsApp</a>' +
        '<p class="chvm-small"><button type="button" class="chvm-link" id="vDone">Close</button></p>', "#vDone");
      $("vDone").addEventListener("click", close);
      loadTally();
    });
  }
  function blocked(msg, retry) {
    show('<p class="chvm-eye">Mollys &times; M. Samuels</p><h2 id="chVMT">We could not count that vote</h2><p class="chvm-err">' + e(msg) + '</p>' +
      (retry ? '<button type="button" class="chvm-go" id="vBack">Go back</button>' : '<button type="button" class="chvm-go" id="vBack">Close</button>'), "#vBack");
    $("vBack").addEventListener("click", function () { if (retry) { sb.auth.getSession().then(function (s) { stepForm(s.data.session && s.data.session.user); }); } else close(); });
  }

  /* ---------- clicking "VOTE FOR THIS BRIDE" ---------- */
  function startVote(btn) {
    last = { id: btn.getAttribute("data-id"), bride: btn.getAttribute("data-name") || "this bride" };
    open();
    if (voted || getVoted()) { voted = voted || getVoted(); return show('<h2 id="chVMT">You have already voted</h2><p class="chvm-note">This device has already voted for <b>' + e(voted.bride || "a bride") + '</b>. Each device can vote once.</p><button type="button" class="chvm-go" id="vBack">Close</button>', "#vBack"), $("vBack").addEventListener("click", close); }
    show('<h2 id="chVMT">One moment…</h2>');
    Promise.all([sb.auth.getSession(), sb.rpc("challenge_device_used", { p_device: deviceId() })]).then(function (rs) {
      if (rs[1] && rs[1].data === true) return blocked(MSG.device_used, false);
      var u = rs[0].data.session && rs[0].data.session.user;
      stepForm(u && u.email_confirmed_at ? u : null);
    }).catch(function () { stepForm(null); });
  }

  /* ---------- coming back from Google ---------- */
  function resumeGoogle() {
    var raw = null, viaLink = false; try { raw = sessionStorage.getItem(PEND_KEY); } catch (x) {}
    if (!raw) { try { raw = localStorage.getItem(LINK_KEY); viaLink = !!raw; } catch (x) {} }
    if (!raw) return;
    try { pend = JSON.parse(raw); } catch (x) { pend = null; }
    if (viaLink && (!pend || !(Date.now() - Number(pend.t) < LINK_MAX_MS))) { pend = null; try { localStorage.removeItem(LINK_KEY); } catch (x) {} return; }
    sb.auth.getSession().then(function (s) {
      try { sessionStorage.removeItem(PEND_KEY); localStorage.removeItem(LINK_KEY); } catch (x) {}
      var u = s.data.session && s.data.session.user;
      if (!pend || !u) return;
      last = { id: pend.id, bride: pend.bride, name: pend.name, phone: pend.phone };
      open(); cast({ name: pend.name, phone: pend.phone, optin: pend.optin }, viaLink ? ((u.app_metadata && u.app_metadata.provider === "google") ? "google" : "email") : "google");
    });
  }

  /* ---------- start ---------- */
  window.ChVote = {
    start: function (o) {
      sb = o.sb; S = o.settings; phase = o.phase; if (!sb) return;
      voted = getVoted();
      counting = phase === "voting" || phase === "counting" || phase === "winner";
      if (counting && S.show_vote_counts !== false) live();
      document.addEventListener("click", function (ev) {
        var b = ev.target.closest && ev.target.closest(".ch-vote[data-id]"); if (!b || b.disabled) return; ev.preventDefault(); startVote(b);
      });
      if (phase === "voting") {
        paintButtons();
        sb.auth.getSession().then(function (s) {
          if (s.data.session) sb.rpc("challenge_my_vote").then(function (r) {
            if (r.data) { var card = document.querySelector('.ch-bride[data-id="' + r.data + '"]'); setVoted({ id: r.data, bride: card ? card.getAttribute("data-name") : "" }); }
          });
        });
        resumeGoogle();
      }
    }
  };
})();
