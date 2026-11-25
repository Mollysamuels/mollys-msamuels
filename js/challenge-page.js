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
    var wrap = $("chFounderWrap"), sec = $("founder");
    if (wrap) wrap.classList.toggle("ch-split", portrait);   /* portrait video: small card with the words beside it */
    if (portrait && sec && !sec.getAttribute("data-rev") && "IntersectionObserver" in window && !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) {
      sec.setAttribute("data-rev", "1"); sec.classList.add("ch-rev");
      var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { sec.classList.add("in"); io.disconnect(); } }, { threshold: 0.2 });
      io.observe(sec);
    }
    var thumb = C.safeImg(s.founder_thumb_url) || (v.thumb || "");
    box.innerHTML = '<button type="button" class="ch-play" aria-label="Play the founder\'s message">' +
      (thumb ? '<img src="' + e(thumb) + '" alt="" loading="lazy" decoding="async">' : "") +
      '<span class="ch-play-ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span></button>';
    box.querySelector("button").addEventListener("click", function () {
      box.classList.add("is-playing");
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

  /* ---------- how to apply (couples apply on this page; our team reviews every application) ---------- */
  function safeLink(u) { u = String(u || "").trim(); return /^(https:\/\/[^\s"'<>]+|mailto:[^\s"'<>]+|tel:[+\d\s-]+)$/i.test(u) ? u : ""; }
  function renderRegister() {
    var s = settings, box = $("chRegBox");
    var link = safeLink(s.apply_link), txt = (s.apply_text || "").trim();
    var closed = { shortlisting: "Applications are closed. Thank you to every couple who applied. We are choosing our finalists now.",
      interviews: "Applications are closed. Our finalists are being interviewed and styled.", voting_soon: "Applications are closed.",
      voting: "Applications are closed. Voting is open now.", counting: "Applications are closed.", winner: "Applications are closed." }[phase];
    if (closed) { box.innerHTML = '<p class="ch-note">' + e(closed) + "</p>"; return; }
    var open = phase === "registration";
    var when = open ? "Applications close on <b>" + e(C.dayLabel(s.reg_close)) + "</b> at 11:59 PM (Nigeria time)." : "Applications open on <b>" + e(C.dayLabel(s.reg_open)) + "</b>. You will apply right here on this page.";
    box.innerHTML = '<p class="ch-note">' + when + "</p>" +
      '<ol class="ch-howto ch-howto-light"><li>' + (open ? "Press <b>Apply now</b> and sign in" : "Sign in") + ' with Google or an email code.</li><li>Tell us your names, your location and your love story (50 to 500 words).</li><li>Our team reads every application and contacts the couples we shortlist.</li></ol>' +
      (txt ? '<p class="ch-sub light">' + e(txt) + "</p>" : "") +
      (open ? '<div class="ch-apply-row"><button type="button" class="ch-btn ch-apply">Apply now</button>' +
        (link ? '<a class="ch-help" href="' + e(link) + '" target="_blank" rel="noopener noreferrer">Need help? Message us</a>' : "") + "</div>" : "");
    if (open && window.ChApply) window.ChApply.start({ sb: sb, settings: s, phase: phase });
  }

  /* ---------- 4. brides ---------- */
  function renderBrides() {
    var s = settings, grid = $("chBrides");
    $("chBridesT").textContent = phase === "voting" ? "Meet our finalist brides, then vote for your favourite." : "Meet our brides and read their love stories.";
    C.request("challenge_contestants?is_published=eq.true&select=id,contestant_number,bride_name,groom_name,photo_url,partner_photo_url,city,story,video_url&order=sort_order.asc,contestant_number.asc")
      .then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }).then(function (rows) {
        if (!rows || !rows.length) { grid.innerHTML = '<p class="ch-note">Love stories will appear here as couples are approved.</p>'; return; }
        grid.innerHTML = rows.map(function (c) {
          var img = C.safeImg(c.photo_url), p2 = C.safeImg(c.partner_photo_url), v = C.parseVideo(c.video_url);
          var url = "https://mollysamuels.com/bridal-challenge#bride-" + c.id, nm = c.bride_name + (c.groom_name ? " & " + c.groom_name : "");
          var msg = "Vote for " + c.bride_name + " in the Mollys \u00d7 M. Samuels Bridal Challenge! ";
          return '<article class="ch-bride" id="bride-' + e(c.id) + '" data-id="' + e(c.id) + '" data-name="' + e(c.bride_name) + '"><div class="ch-bride-img' + (img ? "" : " is-empty") + '">' + (img ? '<img src="' + e(img) + '" alt="' + e(c.bride_name) + ' in her bridal look" loading="lazy" decoding="async">' : '<span class="ch-init" aria-hidden="true">' + e(String(c.bride_name).charAt(0).toUpperCase()) + "</span>") +
            '<span class="ch-num">No. ' + e(c.contestant_number) + '</span></div><div class="ch-bride-b"><h3>' + e(nm) + "</h3>" +
            (c.city ? '<p class="ch-city">' + e(c.city) + "</p>" : "") +
            (c.story ? '<p class="ch-story">' + e(c.story) + "</p>" + (c.story.length > 260 ? '<button type="button" class="ch-more" aria-expanded="false">Read her love story</button>' : "") : "") +
            (p2 ? '<img class="ch-bride-p" src="' + e(p2) + '" alt="' + e(c.bride_name) + ' with her partner" loading="lazy" decoding="async">' : "") +
            (v && v.kind === "youtube" ? '<a class="ch-link" href="https://www.youtube.com/watch?v=' + e(v.id) + '" target="_blank" rel="noopener noreferrer">Watch her transformation</a>' : "") +
            '<div class="ch-live" hidden aria-live="polite"></div>' +
            (phase === "voting" ? '<button type="button" class="ch-vote" data-id="' + e(c.id) + '" data-name="' + e(c.bride_name) + '">VOTE FOR THIS BRIDE</button>' : "") +
            '<div class="ch-bshare"><span>Share</span><a target="_blank" rel="noopener noreferrer" aria-label="Share ' + e(c.bride_name) + ' on WhatsApp" href="https://wa.me/?text=' + encodeURIComponent(msg + url) + '">WhatsApp</a>' +
            '<a target="_blank" rel="noopener noreferrer" aria-label="Share ' + e(c.bride_name) + ' on Facebook" href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url) + '">Facebook</a>' +
            '<a target="_blank" rel="noopener noreferrer" aria-label="Share ' + e(c.bride_name) + ' on X" href="https://twitter.com/intent/tweet?text=' + encodeURIComponent(msg) + "&url=" + encodeURIComponent(url) + '">X</a></div></div></article>';
        }).join("");
        grid.addEventListener("click", function (ev) {
          var m = ev.target.closest && ev.target.closest(".ch-more"); if (!m) return;
          var card = m.closest(".ch-bride"), on = card.classList.toggle("ch-open");
          m.setAttribute("aria-expanded", on ? "true" : "false"); m.textContent = on ? "Show less" : "Read her love story";
        });
        if (window.ChVote) window.ChVote.start({ sb: sb, settings: settings, phase: phase });
      });
  }

  /* ---------- 5. vote ---------- */
  function renderVote() {
    var s = settings, box = $("chVoteBox");
    var info = '<ol class="ch-howto"><li>Choose your favourite bride and press &ldquo;Vote for this bride&rdquo;.</li><li>Confirm it is you with Google, or with a code we email you.</li><li>Your vote is counted. Each email, phone number and device can vote once.</li></ol>';
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
    var s = settings;
    $("chSched").innerHTML = C.stages(s, phase).map(function (x, i) {
      var mark = x.state === "done" ? "&#10003;" : String(i + 1);
      return '<li class="is-' + x.state + '"><span class="ch-tl-dot" aria-hidden="true">' + mark + '</span><div class="ch-tl-b"><b>' + e(x.name) + "</b><span>" + e(x.when) + "</span>" +
        (x.state === "now" ? '<em class="ch-tl-tag" style="font-style:normal">Happening now</em>' : "") + "</div></li>";
    }).join("");
    var n = 0;
    $("chRulesBox").innerHTML = "<h3>Rules</h3>" + C.rulesGroups(s).map(function (g) {
      return '<div class="ch-rg">' + (g.h ? "<h4>" + e(g.h) + "</h4>" : "") + "<ol>" + g.items.map(function (x) { n++; return '<li data-n="' + n + '">' + e(x) + "</li>"; }).join("") + "</ol></div>";
    }).join("");
  }
})();
