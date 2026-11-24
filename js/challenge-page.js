/* Molly Samuels - Bridal Challenge landing page. Builds every section from the admin settings. */
(function () {
  "use strict";
  var C = window.MSChallenge, e = C.esc;
  function $(id) { return document.getElementById(id); }
  var sb = null;
  try { sb = window.supabase.createClient(C.SB_URL, C.SB_KEY); } catch (err) {}
  var settings = null, phase = "coming";

  function show(id, on) { var n = $(id); if (n) n.hidden = !on; }

  C.getSettings(true).then(function (s) {
    if (!s || !s.is_enabled) { off(); return; }
    settings = s; phase = C.phaseOf(s);
    if (phase === "ended") { off(true); return; }
    renderHero(); renderFounder(); renderAbout(); renderRegister(); renderBrides(); renderVote(); renderShare(); renderRules();
  });

  function off(ended) {
    var m = document.querySelector("main.ch");
    m.innerHTML = '<section class="ch-sec"><div class="ch-wrap ch-narrow ch-center"><h1 class="ch-h1">' + (ended ? "The Bridal Challenge has ended" : "The Bridal Challenge is not open right now") + "</h1><p class=\"ch-sub\">" +
      (ended ? "Thank you to everyone who took part." : "Please check back soon.") + '</p><a class="ch-btn" href="/">Back to the store</a></div></section>';
  }

  /* ---------- 1. hero + countdown ---------- */
  function renderHero() {
    var s = settings, t = C.textsFor(s, phase);
    $("chHeroH").textContent = s.hero_headline || "WIN A BRIDAL PACKAGE WORTH UP TO ₦2 MILLION!";
    $("chHeroSub").textContent = s.hero_subtext || "";
    $("chPhase").textContent = C.PHASE_LABEL[phase] || "";
    var img = C.safeImg(s.hero_image_url);
    if (img) { var bg = $("chHeroBg"); var im = document.createElement("img"); im.src = img; im.alt = ""; im.decoding = "async"; im.fetchPriority = "high"; bg.appendChild(im); $("chHero").classList.add("has-img"); }
    var b = $("chHeroBtn"); b.textContent = t.button; b.setAttribute("href", t.href.replace("bridal-challenge", "") || "#top");
    var nm = C.nextMilestone(s, phase);
    if (nm && nm.at > Date.now()) {
      show("chCount", true); $("chCountL").textContent = nm.label;
      var tick = function () {
        var d = Math.max(0, nm.at - Date.now()), x = Math.floor(d / 1000);
        $("cdD").textContent = Math.floor(x / 86400); $("cdH").textContent = Math.floor(x % 86400 / 3600);
        $("cdM").textContent = Math.floor(x % 3600 / 60); $("cdS").textContent = x % 60;
        if (d <= 0) { clearInterval(iv); location.reload(); }
      };
      var iv = setInterval(tick, 1000); tick();
    }
  }

  /* ---------- 2. founder video (loads only after the visitor presses play) ---------- */
  function renderFounder() {
    var s = settings, v = C.parseVideo(s.founder_video_url);
    if (!s.founder_published || !v) return;
    show("founder", true);
    $("chFounderH").textContent = s.founder_heading || "A Special Message From Our Founder";
    $("chFounderT").textContent = s.founder_text || "";
    var box = $("chVideo"), portrait = s.founder_ratio === "9:16";
    box.className = "ch-video " + (portrait ? "is-portrait" : "is-wide");
    var thumb = C.safeImg(s.founder_thumb_url) || (v.thumb || "");
    box.innerHTML = '<button type="button" class="ch-play" aria-label="Play the founder\'s message">' +
      (thumb ? '<img src="' + e(thumb) + '" alt="" loading="lazy" decoding="async">' : "") +
      '<span class="ch-play-ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span></button>';
    box.querySelector("button").addEventListener("click", function () {
      if (v.kind === "file") box.innerHTML = '<video controls playsinline preload="metadata" autoplay src="' + e(v.src) + '"></video>';
      else box.innerHTML = '<iframe src="' + e(v.embed) + '" title="Founder\'s message" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>';
    });
  }

  /* ---------- 3. about ---------- */
  function renderAbout() {
    var s = settings;
    $("chAboutT").textContent = s.about_text || "The Mollys × M. Samuels ₦2 Million Bridal Challenge gives one engaged couple the chance to win a bridal package worth up to ₦2 million.";
    $("chPrize").textContent = s.prize_text || "A bridal package worth up to ₦2 million, from Mollys and M. Samuels.";
    $("chElig").textContent = s.eligibility_text || "Engaged couples who are planning their wedding. We shortlist 3 to 4 couples (6 at most) to take part in the final public vote.";
    var L = function (d) { return C.dayLabel(d); };
    var steps = [["Register", L(s.reg_open) + " to " + L(s.reg_close)], ["Interviews and bridal styling", C.rangeLabel(s.interviews_start, s.interviews_end)],
      ["Public voting", L(s.voting_open) + " to " + L(s.voting_close)], ["Winner announced", L(s.winner_date)], ["Prize presentation", C.rangeLabel(s.prize_start, s.prize_end)]];
    $("chSteps").innerHTML = steps.map(function (x) { return "<li><b>" + e(x[0]) + "</b><span>" + e(x[1]) + "</span></li>"; }).join("");
  }

  /* ---------- registration ---------- */
  function renderRegister() {
    var s = settings, box = $("chRegBox");
    if (phase === "registration") { box.innerHTML = formHtml(); wireForm(); return; }
    var msg = {
      coming: "Registration opens on <b>" + e(C.dayLabel(s.reg_open)) + "</b>. Come back then to register your couple.",
      shortlisting: "Registration is closed. Thank you to every couple who applied. We are choosing our finalists now.",
      interviews: "Registration is closed. Our finalists are being interviewed and styled.",
      voting_soon: "Registration is closed.", voting: "Registration is closed. Voting is open now.",
      counting: "Registration is closed.", winner: "Registration is closed."
    }[phase] || "Registration is closed.";
    box.innerHTML = '<p class="ch-note">' + msg + "</p>";
  }
  function formHtml() {
    return '<p class="ch-sub light">Tell us about you both. Registration closes on ' + e(C.dayLabel(settings.reg_close)) + ' at 11:59 PM (Nigeria time).</p>' +
    '<form id="chForm" class="ch-form" novalidate autocomplete="on">' +
    '<div class="ch-hp" aria-hidden="true"><label>Leave this empty<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>' +
    '<div class="ch-row"><div class="ch-f"><label for="rBride">Bride\'s full name</label><input id="rBride" name="bride" type="text" maxlength="100" required autocomplete="name"></div>' +
    '<div class="ch-f"><label for="rGroom">Groom\'s full name</label><input id="rGroom" name="groom" type="text" maxlength="100" required></div></div>' +
    '<div class="ch-row"><div class="ch-f"><label for="rEmail">Email</label><input id="rEmail" name="email" type="email" maxlength="254" required autocomplete="email" inputmode="email"></div>' +
    '<div class="ch-f"><label for="rPhone">Phone or WhatsApp number</label><input id="rPhone" name="phone" type="tel" maxlength="30" required autocomplete="tel" inputmode="tel" placeholder="+234 …"></div></div>' +
    '<div class="ch-row"><div class="ch-f"><label for="rCity">City and state</label><input id="rCity" name="city" type="text" maxlength="100" required autocomplete="address-level2"></div>' +
    '<div class="ch-f"><label for="rDate">Wedding date <small>(if you have one)</small></label><input id="rDate" name="date" type="date"></div></div>' +
    '<div class="ch-row"><div class="ch-f"><label for="rSocial">Instagram or TikTok <small>(optional)</small></label><input id="rSocial" name="social" type="text" maxlength="100" placeholder="@yourname"></div>' +
    '<div class="ch-f"><label for="rHeard">How did you hear about us?</label><select id="rHeard" name="heard"><option value="">Choose one</option><option>Instagram</option><option>TikTok</option><option>Facebook</option><option>WhatsApp</option><option>Friend or family</option><option>Our store</option><option>Other</option></select></div></div>' +
    '<div class="ch-f"><label for="rStory">Your love story <small>(at least 40 characters)</small></label><textarea id="rStory" name="story" rows="6" maxlength="1500" required></textarea><span class="ch-count-c" id="rStoryN">0 / 1500</span></div>' +
    '<div class="ch-f"><label for="rPhoto">A photo of you both <small>(optional, JPG, PNG or WebP, up to 3 MB)</small></label><input id="rPhoto" name="photo" type="file" accept="image/jpeg,image/png,image/webp"></div>' +
    '<label class="ch-check"><input id="rConsent" name="consent" type="checkbox" required> <span>I confirm we are an engaged couple, the details are true, and I agree to the <a href="#rules">competition rules</a>. If we are shortlisted, our name, photos and love story may be shown publicly on the Molly Samuels website and social media. See the <a href="privacy" target="_blank" rel="noopener">Privacy Policy</a>.</span></label>' +
    '<p class="ch-err" id="chErr" role="alert" hidden></p>' +
    '<button type="submit" class="ch-btn" id="chSubmit">Register our couple</button></form>';
  }
  function wireForm() {
    var f = $("chForm"), story = $("rStory");
    story.addEventListener("input", function () { $("rStoryN").textContent = story.value.length + " / 1500"; });
    f.addEventListener("submit", function (ev) { ev.preventDefault(); submit(f); });
  }
  function fail(msg) { var el = $("chErr"); el.textContent = msg; el.hidden = false; el.scrollIntoView({ block: "nearest", behavior: "smooth" }); $("chSubmit").disabled = false; $("chSubmit").textContent = "Register our couple"; }
  function submit(f) {
    var v = function (n) { return (f.elements[n].value || "").trim(); };
    $("chErr").hidden = true;
    if (v("website")) return; // hidden trap field: real people never fill it
    if (v("bride").length < 2 || v("groom").length < 2) return fail("Please enter both full names.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v("email"))) return fail("Please enter a valid email address.");
    if (v("phone").replace(/[^\d]/g, "").length < 7) return fail("Please enter a valid phone number.");
    if (v("city").length < 2) return fail("Please enter your city and state.");
    if (v("story").length < 40) return fail("Please tell us a little more about your love story (at least 40 characters).");
    if (!f.elements.consent.checked) return fail("Please tick the box to confirm and agree to the rules.");
    var file = f.elements.photo.files[0];
    if (file) {
      if (["image/jpeg", "image/png", "image/webp"].indexOf(file.type) < 0) return fail("The photo must be a JPG, PNG or WebP picture.");
      if (file.size > 3 * 1024 * 1024) return fail("That photo is too large. Please choose one under 3 MB.");
    }
    if (!sb) return fail("Something went wrong loading the page. Please refresh and try again.");
    $("chSubmit").disabled = true; $("chSubmit").textContent = "Sending…";
    var up = Promise.resolve(null);
    if (file) {
      var ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[file.type];
      var p = "registrations/" + (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2)) + "." + ext;
      up = sb.storage.from("challenge-entries").upload(p, file, { contentType: file.type, upsert: false }).then(function (r) { return r.error ? null : p; });
    }
    up.then(function (path) {
      var row = { bride_name: v("bride"), groom_name: v("groom"), email: v("email").toLowerCase(), phone: v("phone"), city: v("city"),
        wedding_date: v("date") || null, social_handle: v("social") || null, how_heard: v("heard") || null, love_story: v("story"),
        couple_photo_path: path, consent_given: true };
      return sb.from("challenge_registrations").insert(row);
    }).then(function (r) {
      if (r.error) {
        var c = r.error.code, m = (r.error.message || "").toLowerCase();
        if (c === "23505" || m.indexOf("duplicate") > -1) return fail("This email address has already been used to register. If you think this is a mistake, message us on WhatsApp.");
        if (c === "42501" || m.indexOf("row-level security") > -1) return fail("Registration is not open at the moment.");
        return fail("We could not save your registration. Please check your details and try again.");
      }
      // Best effort: ask the server to send the confirmation emails. The registration is already saved either way.
      try { fetch(C.SB_URL + "/functions/v1/challenge-notify", { method: "POST", headers: { "Content-Type": "application/json", apikey: C.SB_KEY, Authorization: "Bearer " + C.SB_KEY }, body: JSON.stringify({ email: v("email").toLowerCase() }) }).catch(function () {}); } catch (err) {}
      $("chRegBox").innerHTML = '<div class="ch-done"><h3>Thank you, ' + e(v("bride").split(" ")[0]) + ' and ' + e(v("groom").split(" ")[0]) + '!</h3><p>Your registration has been received. We will contact you on <b>' + e(v("email")) + '</b> if you are shortlisted. Interviews and bridal styling take place ' + e(C.rangeLabel(settings.interviews_start, settings.interviews_end)) + '.</p></div>';
      $("register").scrollIntoView({ behavior: "smooth", block: "start" });
    }).catch(function () { fail("Something went wrong. Please try again."); });
  }

  /* ---------- 4. brides ---------- */
  function renderBrides() {
    var s = settings, grid = $("chBrides");
    $("chBridesT").textContent = phase === "voting" ? "Meet our finalist brides, then vote for your favourite." : "Our finalist brides and their love stories will appear here.";
    C.request("challenge_contestants?is_published=eq.true&select=id,contestant_number,bride_name,groom_name,photo_url,partner_photo_url,story,video_url&order=sort_order.asc,contestant_number.asc")
      .then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }).then(function (rows) {
        if (!rows || !rows.length) { grid.innerHTML = '<p class="ch-note">Finalists will be announced after the interviews.</p>'; return; }
        grid.innerHTML = rows.map(function (c) {
          var img = C.safeImg(c.photo_url), p2 = C.safeImg(c.partner_photo_url), v = C.parseVideo(c.video_url);
          return '<article class="ch-bride" id="bride-' + e(c.id) + '"><div class="ch-bride-img">' + (img ? '<img src="' + e(img) + '" alt="' + e(c.bride_name) + ' in her bridal look" loading="lazy" decoding="async">' : "") +
            '<span class="ch-num">No. ' + e(c.contestant_number) + '</span></div><div class="ch-bride-b"><h3>' + e(c.bride_name) + (c.groom_name ? " &amp; " + e(c.groom_name) : "") + "</h3>" +
            (c.story ? "<p>" + e(c.story) + "</p>" : "") +
            (p2 ? '<img class="ch-bride-p" src="' + e(p2) + '" alt="' + e(c.bride_name) + ' with her partner" loading="lazy" decoding="async">' : "") +
            (v ? '<a class="ch-link" href="' + e(v.kind === "file" ? v.src : "https://" + (v.kind === "youtube" ? "www.youtube.com/watch?v=" : "vimeo.com/") + v.id) + '" target="_blank" rel="noopener noreferrer">Watch her transformation</a>' : "") + "</div></article>";
        }).join("");
      });
  }

  /* ---------- 5. vote ---------- */
  function renderVote() {
    var s = settings, box = $("chVoteBox");
    var info = '<ol class="ch-howto"><li>Sign in with your Google account to verify who you are.</li><li>Choose your favourite bride.</li><li>Cast your vote. Each verified account has one website vote.</li></ol>';
    var status = {
      voting: "Voting is open until 11:59 PM on " + C.dayLabel(s.voting_close) + " (Nigeria time).",
      counting: "Voting has closed. The winner is announced on " + C.dayLabel(s.winner_date) + ".",
      winner: "Voting is closed and the winner has been announced."
    }[phase] || "Voting opens on " + C.dayLabel(s.voting_open) + " and closes at 11:59 PM on " + C.dayLabel(s.voting_close) + " (Nigeria time).";
    box.innerHTML = '<p class="ch-note">' + e(status) + "</p>" + info;
  }

  /* ---------- 6. share ---------- */
  function renderShare() {
    var url = "https://mollysamuels.com/bridal-challenge";
    var msg = "Win a bridal package worth up to ₦2 million! Check out the Mollys × M. Samuels Bridal Challenge: ";
    var row = $("chShareRow");
    row.innerHTML = '<a class="ch-btn" target="_blank" rel="noopener noreferrer" href="https://wa.me/?text=' + encodeURIComponent(msg + url) + '">Share on WhatsApp</a>' +
      '<a class="ch-btn ch-btn-line" target="_blank" rel="noopener noreferrer" href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url) + '">Facebook</a>' +
      '<a class="ch-btn ch-btn-line" target="_blank" rel="noopener noreferrer" href="https://twitter.com/intent/tweet?text=' + encodeURIComponent(msg) + "&url=" + encodeURIComponent(url) + '">X</a>' +
      '<button type="button" class="ch-btn ch-btn-line" id="chCopy">Copy link</button>';
    $("chCopy").addEventListener("click", function () {
      var b = this;
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { b.textContent = "Link copied"; }, function () { window.prompt("Copy this link:", url); });
    });
  }

  /* ---------- 8. rules ---------- */
  function renderRules() {
    var s = settings, L = function (d) { return C.dateTimeLabel(d); };
    var rows = [["Registration opens", s.reg_open], ["Registration closes", s.reg_close], ["Interviews and bridal styling", null, C.rangeLabel(s.interviews_start, s.interviews_end)],
      ["Voting opens", s.voting_open], ["Voting closes", s.voting_close], ["Winner announced", null, C.dayLabel(s.winner_date)], ["Prize presentation", null, C.rangeLabel(s.prize_start, s.prize_end)]];
    $("chSched").innerHTML = rows.map(function (r) { return "<tr><th scope=\"row\">" + e(r[0]) + "</th><td>" + e(r[2] || L(r[1])) + "</td></tr>"; }).join("");
    $("chRulesList").innerHTML = C.rulesList(s).map(function (x) { return "<li>" + e(x) + "</li>"; }).join("");
  }
})();
