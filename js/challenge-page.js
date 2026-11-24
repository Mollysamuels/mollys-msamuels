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
    var steps = [["Applications", L(s.reg_open) + " to " + L(s.reg_close)], ["Interviews and bridal styling", C.rangeLabel(s.interviews_start, s.interviews_end)],
      ["Public voting", L(s.voting_open) + " to " + L(s.voting_close)], ["Winner announced", L(s.winner_date)], ["Prize presentation", C.rangeLabel(s.prize_start, s.prize_end)]];
    $("chSteps").innerHTML = steps.map(function (x) { return "<li><b>" + e(x[0]) + "</b><span>" + e(x[1]) + "</span></li>"; }).join("");
  }

  /* ---------- how to apply (couples are registered by our team, never on the site) ---------- */
  function safeLink(u) { u = String(u || "").trim(); return /^(https:\/\/[^\s"'<>]+|mailto:[^\s"'<>]+|tel:[+\d\s-]+)$/i.test(u) ? u : ""; }
  function renderRegister() {
    var s = settings, box = $("chRegBox");
    var link = safeLink(s.apply_link), txt = (s.apply_text || "").trim();
    var closed = { shortlisting: "Applications are closed. Thank you to every couple who applied. We are choosing our finalists now.",
      interviews: "Applications are closed. Our finalists are being interviewed and styled.", voting_soon: "Applications are closed.",
      voting: "Applications are closed. Voting is open now.", counting: "Applications are closed.", winner: "Applications are closed." }[phase];
    if (closed) { box.innerHTML = '<p class="ch-note">' + e(closed) + "</p>"; return; }
    var when = phase === "coming" ? "Applications open on <b>" + e(C.dayLabel(s.reg_open)) + "</b>." : "Applications close on <b>" + e(C.dayLabel(s.reg_close)) + "</b> at 11:59 PM (Nigeria time).";
    box.innerHTML = '<p class="ch-note">' + when + " Our team registers every couple personally.</p>" +
      (txt ? '<p class="ch-sub light">' + e(txt) + "</p>" : "") +
      (link && phase === "registration" ? '<p class="ch-center"><a class="ch-btn" href="' + e(link) + '" target="_blank" rel="noopener noreferrer">Apply to take part</a></p>' : "");
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
    var rows = [["Applications open", s.reg_open], ["Applications close", s.reg_close], ["Interviews and bridal styling", null, C.rangeLabel(s.interviews_start, s.interviews_end)],
      ["Voting opens", s.voting_open], ["Voting closes", s.voting_close], ["Winner announced", null, C.dayLabel(s.winner_date)], ["Prize presentation", null, C.rangeLabel(s.prize_start, s.prize_end)]];
    $("chSched").innerHTML = rows.map(function (r) { return "<tr><th scope=\"row\">" + e(r[0]) + "</th><td>" + e(r[2] || L(r[1])) + "</td></tr>"; }).join("");
    $("chRulesList").innerHTML = C.rulesList(s).map(function (x) { return "<li>" + e(x) + "</li>"; }).join("");
  }
})();
