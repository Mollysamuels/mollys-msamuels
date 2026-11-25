/* Molly Samuels - Bridal Challenge application (sign in, then share your names, location and love story).
   Every rule (50 to 500 words, one application per person, the closing date) is enforced by the database;
   this file only shows the steps and tells the person, clearly, what to fix. */
(function () {
  "use strict";
  var C = window.MSChallenge, e = C.esc;
  var sb = null, phase = "", box, bodyEl, lastFocus = null;
  var PEND_KEY = "ms_ch_apply_pending_v1", DRAFT_KEY = "ms_ch_apply_draft_v1", LINK_KEY = "ms_ch_apply_link_v1", LINK_MAX_MS = 60 * 60 * 1000;
  var MIN_W = 50, MAX_W = 500, MAX_C = 4000;
  function $(id) { return document.getElementById(id); }

  /* ---------- helpers ---------- */
  function words(t) { t = String(t || "").trim(); return t ? t.split(/\s+/).length : 0; }
  function normPhone(p) { return String(p || "").replace(/\D/g, ""); }
  function emailOk(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 254; }
  function getDraft() { try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "{}") || {}; } catch (x) { return {}; } }
  function setDraft(o) { try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(o)); } catch (x) {} }
  function clearDraft() { try { sessionStorage.removeItem(DRAFT_KEY); } catch (x) {} }

  /* ---------- the box ---------- */
  function makeBox() {
    if (box) return;
    box = document.createElement("div"); box.id = "chAM"; box.hidden = true;
    box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-labelledby", "chAMT");
    box.innerHTML = '<div class="chvm-box chvm-wide"><button type="button" class="chvm-x" aria-label="Close">&times;</button><div id="chAMBody"></div></div>';
    document.body.appendChild(box); bodyEl = $("chAMBody");
    box.addEventListener("click", function (ev) { if (ev.target === box) close(); });
    box.querySelector(".chvm-x").addEventListener("click", close);
    document.addEventListener("keydown", function (ev) {
      if (box.hidden) return;
      if (ev.key === "Escape") { close(); return; }
      if (ev.key === "Tab") {
        var f = box.querySelectorAll("button:not([disabled]),input:not([disabled]),textarea:not([disabled]),a[href]"); if (!f.length) return;
        var a = f[0], z = f[f.length - 1];
        if (ev.shiftKey && document.activeElement === a) { ev.preventDefault(); z.focus(); } else if (!ev.shiftKey && document.activeElement === z) { ev.preventDefault(); a.focus(); }
      }
    });
  }
  function open() { makeBox(); lastFocus = document.activeElement; box.hidden = false; document.body.style.overflow = "hidden"; }
  function close() { if (!box) return; box.hidden = true; document.body.style.overflow = ""; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  function show(html, focusSel) { bodyEl.innerHTML = html; var f = focusSel && bodyEl.querySelector(focusSel); if (f) f.focus(); box.firstChild.scrollTop = 0; }
  function err(msg) { var n = $("chAMErr"); if (n) { n.innerHTML = msg ? "<strong>" + e(msg) + "</strong>" : ""; n.hidden = !msg; if (msg && n.scrollIntoView) n.scrollIntoView({ block: "nearest" }); } }
  function busy(on) { bodyEl.querySelectorAll("button,input,textarea").forEach(function (x) { x.disabled = on; }); }
  var EYE = '<p class="chvm-eye">Mollys &times; M. Samuels</p>';
  var G_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.3 0-.6-.1-1.1-.2-1.6H12z"/></svg>';

  var MSG = {
    closed: "Applications are closed.",
    already_applied: "You have already applied with this account. We will be in touch.",
    bad_name: "Please enter both names (at least 2 letters each).",
    bad_location: "Please enter your location (city or state).",
    bad_phone: "Please enter a valid phone number so we can reach you.",
    no_consent: "Please tick the box to agree that your story may be shown on the website.",
    email_not_verified: "Your email is not verified yet. Please sign in again.",
    not_signed_in: "Please sign in first."
  };

  /* ---------- step 1: sign in (Google first, or an emailed code) ---------- */
  function stepSignin(prefEmail) {
    show(EYE + '<h2 id="chAMT">Apply to the Bridal Challenge</h2><p class="chvm-note">First, confirm it is really you. Then you will share your names, location and love story. Applying takes about 5 minutes.</p>' +
      '<p class="chvm-err" id="chAMErr" role="alert" hidden></p>' +
      '<button type="button" class="chvm-g" id="aGoogle">' + G_ICON + 'Continue with Google</button><p class="chvm-or"><span>or use your email</span></p>' +
      '<div class="chvm-f"><label for="aEmail">Email address</label><input id="aEmail" type="email" autocomplete="email" maxlength="254" value="' + e(prefEmail || "") + '"></div>' +
      '<button type="button" class="chvm-go" id="aCode">Email me a code</button>', "#aGoogle");
    $("aGoogle").addEventListener("click", function () {
      try { sessionStorage.setItem(PEND_KEY, "1"); } catch (x) {}
      busy(true);
      sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname } }).then(function (r) {
        if (r && r.error) { busy(false); try { sessionStorage.removeItem(PEND_KEY); } catch (x) {} err("Google sign-in is not available right now. Please use the email code instead."); }
      });
    });
    $("aCode").addEventListener("click", function () {
      var em = $("aEmail").value.trim().toLowerCase();
      if (!emailOk(em)) return err("Please enter a valid email address.");
      sendCode(em);
    });
    $("aEmail").addEventListener("keydown", function (ev) { if (ev.key === "Enter") $("aCode").click(); });
  }
  function sendCode(em) {
    err(""); busy(true);
    /* The emailed link opens a new tab and returns to this page (not the home page). The flag lives in localStorage so that tab can pick the application up again. */
    try { localStorage.setItem(LINK_KEY, String(Date.now())); } catch (x) {}
    sb.auth.signInWithOtp({ email: em, options: { shouldCreateUser: true, emailRedirectTo: location.origin + location.pathname } }).then(function (r) {
      if (r.error) {
        try { localStorage.removeItem(LINK_KEY); } catch (x) {}
        busy(false); var m = String(r.error.message || "").toLowerCase();
        return err(/after \d+ seconds|rate limit|too many/.test(m) ? "Too many codes were requested. Please wait a minute and try again, or continue with Google." : "We could not send the code. Please check the email address or continue with Google.");
      }
      stepCode(em);
    });
  }
  function stepCode(em) {
    show(EYE + '<h2 id="chAMT">Enter your code</h2><p class="chvm-note">We sent a code to <b>' + e(em) + '</b>. It can take a minute. Check your spam folder too.</p>' +
      '<div class="chvm-f"><label for="aTok">Code from your email</label><input id="aTok" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="123456"></div>' +
      '<p class="chvm-err" id="chAMErr" role="alert" hidden></p><button type="button" class="chvm-go" id="aVerify">Verify and continue</button>' +
      '<p class="chvm-small"><button type="button" class="chvm-link" id="aResend" disabled>Send a new code in <span id="aWait">60</span>s</button> &nbsp; <button type="button" class="chvm-link" id="aChange">Change email</button></p>', "#aTok");
    var left = 60, t = setInterval(function () {
      left--; var w = $("aWait"), rb = $("aResend"); if (!w || !rb) { clearInterval(t); return; }
      if (left <= 0) { clearInterval(t); rb.disabled = false; rb.textContent = "Send a new code"; } else w.textContent = left;
    }, 1000);
    $("aVerify").addEventListener("click", function () {
      var tok = $("aTok").value.replace(/\s/g, "");
      if (!/^\d{6,10}$/.test(tok)) return err("Please type the code from your email.");
      err(""); busy(true);
      sb.auth.verifyOtp({ email: em, token: tok, type: "email" }).then(function (r) {
        if (r.error) return sb.auth.verifyOtp({ email: em, token: tok, type: "signup" });
        return r;
      }).then(function (r) {
        if (!r || r.error || !r.data || !r.data.session) { busy(false); return err("That code is not right or has expired. Please try again or ask for a new code."); }
        try { localStorage.removeItem(LINK_KEY); } catch (x) {}
        stepForm(r.data.session.user);
      });
    });
    $("aTok").addEventListener("keydown", function (ev) { if (ev.key === "Enter") $("aVerify").click(); });
    $("aResend").addEventListener("click", function () { clearInterval(t); stepSignin(em); });
    $("aChange").addEventListener("click", function () { clearInterval(t); stepSignin(""); });
  }

  /* ---------- step 2: names, location, phone and the love story ---------- */
  function counterText(n) {
    if (n === 0) return { t: "Your love story: 0 words. Write at least " + MIN_W + " words.", bad: true };
    if (n < MIN_W) return { t: "Too short: " + n + " words. Please write at least " + MIN_W + " words (" + (MIN_W - n) + " more).", bad: true };
    if (n > MAX_W) return { t: "Too long: " + n + " words. Please keep it to " + MAX_W + " words or fewer (remove " + (n - MAX_W) + ").", bad: true };
    return { t: n + " words. This is a good length.", bad: false };
  }
  function stepForm(user) {
    var meta = (user && user.user_metadata) || {}, d = getDraft();
    var nm = d.bride || meta.full_name || meta.name || "";
    show(EYE + '<h2 id="chAMT">Share your love story</h2><p class="chvm-note">Signed in as <b>' + e((user && user.email) || "") + '</b>. <button type="button" class="chvm-link" id="aOut">Not you?</button></p>' +
      '<div class="chvm-row"><div class="chvm-f"><label for="aBride">Your name *</label><input id="aBride" type="text" autocomplete="name" maxlength="100" value="' + e(nm) + '"></div>' +
      '<div class="chvm-f"><label for="aPartner">Your partner\'s name *</label><input id="aPartner" type="text" maxlength="100" value="' + e(d.partner || "") + '"></div></div>' +
      '<div class="chvm-row"><div class="chvm-f"><label for="aLoc">Location (city or state) *</label><input id="aLoc" type="text" autocomplete="address-level2" maxlength="100" value="' + e(d.loc || "") + '"></div>' +
      '<div class="chvm-f"><label for="aPhone">Phone number *</label><input id="aPhone" type="tel" inputmode="tel" autocomplete="tel" maxlength="30" placeholder="0803 123 4567" value="' + e(d.phone || "") + '"></div></div>' +
      '<div class="chvm-f"><label for="aStory">Your love story * <small>(' + MIN_W + " to " + MAX_W + ' words)</small></label><textarea id="aStory" rows="9" maxlength="' + MAX_C + '" placeholder="How did you meet? What makes your love special?">' + e(d.story || "") + '</textarea>' +
      '<p class="chvm-wc" id="aWC" aria-live="polite"></p></div>' +
      '<label class="chvm-ck"><input type="checkbox" id="aConsent"' + (d.consent ? " checked" : "") + '> I agree that my names, location and love story, and the photos and video we make together, may be shown on the Molly Samuels website and social media.</label>' +
      '<p class="chvm-err" id="chAMErr" role="alert" hidden></p><button type="button" class="chvm-go" id="aSubmit">Submit my application</button>', "#aBride");
    function paint() {
      var c = counterText(words($("aStory").value)), n = $("aWC");
      n.textContent = c.t; n.className = "chvm-wc " + (c.bad ? "bad" : "good");
    }
    function keep() { setDraft({ bride: $("aBride").value, partner: $("aPartner").value, loc: $("aLoc").value, phone: $("aPhone").value, story: $("aStory").value, consent: $("aConsent").checked }); }
    ["aBride", "aPartner", "aLoc", "aPhone", "aStory", "aConsent"].forEach(function (id) { $(id).addEventListener("input", keep); $(id).addEventListener("change", keep); });
    $("aStory").addEventListener("input", paint); paint();
    $("aOut").addEventListener("click", function () { sb.auth.signOut().then(function () { stepSignin(""); }); });
    $("aSubmit").addEventListener("click", function () { submit(user); });
  }
  function validate() {
    var br = $("aBride").value.trim(), pa = $("aPartner").value.trim(), lo = $("aLoc").value.trim(), ph = $("aPhone").value.trim(), st = $("aStory").value.trim(), pn = normPhone(ph);
    if (br.length < 2 || pa.length < 2) return "Please enter both names (at least 2 letters each).";
    if (lo.length < 2) return "Please enter your location (city or state).";
    if (pn.length < 10 || pn.length > 15) return "Please enter a valid phone number so we can reach you.";
    var n = words(st);
    if (n < MIN_W) return "Your love story is too short (" + n + " words). Please write at least " + MIN_W + " words.";
    if (n > MAX_W || st.length > MAX_C) return "Your love story is too long (" + n + " words). Please keep it to " + MAX_W + " words or fewer.";
    if (!$("aConsent").checked) return "Please tick the box to agree that your story may be shown on the website.";
    return "";
  }
  function submit(user) {
    var bad = validate(); if (bad) return err(bad);
    err(""); busy(true);
    var v = { p_bride: $("aBride").value.trim(), p_partner: $("aPartner").value.trim(), p_location: $("aLoc").value.trim(), p_phone: $("aPhone").value.trim(), p_story: $("aStory").value.trim(), p_consent: true };
    sb.rpc("challenge_submit_application", v).then(function (r) {
      var d = r.data;
      if (r.error || !d) { busy(false); return err("Something went wrong. Please try again in a moment."); }
      if (!d.ok) {
        busy(false);
        if (d.code === "story_short") return err("Your love story is too short (" + d.words + " words). Please write at least " + MIN_W + " words.");
        if (d.code === "story_long") return err("Your love story is too long. Please keep it to " + MAX_W + " words or fewer.");
        if (d.code === "already_applied" || d.code === "closed") return done(d.code, v.p_bride);
        return err(MSG[d.code] || "Your application could not be sent. Please check your details and try again.");
      }
      clearDraft();
      try { fetch(C.SB_URL + "/functions/v1/challenge-alert", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json", apikey: C.SB_KEY, Authorization: "Bearer " + C.SB_KEY }, body: JSON.stringify({ id: d.id }) }).catch(function () {}); } catch (x) {}
      done("ok", v.p_bride, user);
    });
  }

  /* ---------- the end screens ---------- */
  function done(kind, name, user) {
    var h = { ok: "Thank you, " + e(String(name || "").split(" ")[0]) + "!", already_applied: "You have already applied", closed: "Applications are closed" }[kind];
    var p = { ok: "We received your application. Our team will read your love story and contact you on the phone number you gave. Please keep your phone close, and good luck!",
      already_applied: "We already have an application from this account. Our team will be in touch on the phone number you gave.",
      closed: "Applications are closed. Thank you for your interest in the Bridal Challenge." }[kind];
    show(EYE + '<h2 id="chAMT">' + h + '</h2><p class="chvm-note">' + p + '</p>' + (kind === "ok" ? '<p class="chvm-note">You also now have a free Molly Samuels account.</p>' : "") +
      '<button type="button" class="chvm-go" id="aDone">Close</button>', "#aDone");
    $("aDone").addEventListener("click", close);
  }

  /* ---------- opening it ---------- */
  function start() {
    open();
    show("<h2 id=\"chAMT\">One moment…</h2>");
    sb.auth.getSession().then(function (s) {
      var u = s.data.session && s.data.session.user;
      if (!u || !u.email_confirmed_at) return stepSignin("");
      sb.rpc("challenge_my_application").then(function (r) {
        if (r.data) return done("already_applied", r.data.bride_name || "");
        stepForm(u);
      });
    }).catch(function () { stepSignin(""); });
  }
  function resumeGoogle() {
    var p = null; try { p = sessionStorage.getItem(PEND_KEY); } catch (x) {}
    var lk = null; try { lk = localStorage.getItem(LINK_KEY); } catch (x) {}
    if (lk && !(Date.now() - Number(lk) < LINK_MAX_MS)) { lk = null; try { localStorage.removeItem(LINK_KEY); } catch (x) {} }
    if (!p && !lk) return;
    sb.auth.getSession().then(function (s) {
      try { sessionStorage.removeItem(PEND_KEY); localStorage.removeItem(LINK_KEY); } catch (x) {}
      if (s.data.session) { start(); }
    });
  }

  window.ChApply = {
    start: function (o) {
      sb = o.sb; phase = o.phase; if (!sb || phase !== "registration") return;
      document.addEventListener("click", function (ev) {
        var b = ev.target.closest && ev.target.closest(".ch-apply"); if (!b) return; ev.preventDefault(); start();
      });
      resumeGoogle();
      if (location.hash === "#apply") start();
    }
  };
})();
