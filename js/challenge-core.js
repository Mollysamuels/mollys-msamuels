/* Molly Samuels - Bridal Challenge shared logic (settings, phases, messages, dates, video links).
   Used by the pop-up/icon, the landing page and the admin page. Nothing here touches the store. */
(function (w) {
  "use strict";
  var SB_URL = "https://vdlwnflklclenavtpamp.supabase.co";
  var SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkbHduZmxrbGNsZW5hdnRwYW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5OTg5NTksImV4cCI6MjEwNTU3NDk1OX0.OfZ8QHqzaRepBc6pghvK6fbH1N6TqsD5AS4370CaBfU";

  var PHASES = ["coming", "registration", "shortlisting", "interviews", "voting_soon", "voting", "counting", "winner", "ended"];
  var PHASE_LABEL = {
    coming: "Opening soon", registration: "Registration open", shortlisting: "Finalists being chosen",
    interviews: "Interviews and bridal styling", voting_soon: "Voting opens soon", voting: "Voting is open",
    counting: "Voting closed", winner: "Winner announced", ended: "Campaign ended"
  };
  var PHASE_BUTTON_TARGET = {
    coming: "bridal-challenge", registration: "bridal-challenge#register", shortlisting: "bridal-challenge",
    interviews: "bridal-challenge", voting_soon: "bridal-challenge#brides", voting: "bridal-challenge#vote",
    counting: "bridal-challenge#brides", winner: "bridal-challenge#brides"
  };
  // Default pop-up / banner messages. {tokens} are replaced with the real dates from the settings.
  var DEFAULT_TEXTS = {
    coming:       { title: "WIN A BRIDAL PACKAGE WORTH UP TO ₦2 MILLION!", text: "The Mollys × M. Samuels ₦2 Million Bridal Challenge opens for engaged couples on {reg_open}. Get ready to register.", button: "Learn more" },
    registration: { title: "WIN A BRIDAL PACKAGE WORTH UP TO ₦2 MILLION!", text: "Engaged and planning your wedding? Register your couple by {reg_close_day} for a chance to be one of our finalists.", button: "Register your couple" },
    shortlisting: { title: "WIN A BRIDAL PACKAGE WORTH UP TO ₦2 MILLION!", text: "Registration is closed. We are reviewing every couple and will announce our finalists soon.", button: "See the challenge" },
    interviews:   { title: "OUR FINALISTS ARE IN THE SPOTLIGHT", text: "Interviews and bridal styling are happening from {interviews_range}. Voting opens on {voting_open_day}.", button: "See the challenge" },
    voting_soon:  { title: "MEET OUR FINALIST BRIDES", text: "Voting opens on {voting_open_day}. Get to know our brides before you choose your favourite.", button: "Meet the brides" },
    voting:       { title: "VOTE FOR YOUR FAVOURITE BRIDE", text: "Voting is open until 11:59 PM on {voting_close_day} (Nigeria time). Sign in with Google and cast your vote.", button: "VOTE NOW" },
    counting:     { title: "VOTING IS NOW CLOSED", text: "Thank you for voting! We are counting the votes. The winner will be announced on {winner_day}.", button: "See the brides" },
    winner:       { title: "THE WINNER HAS BEEN ANNOUNCED", text: "Congratulations to our winning couple. Thank you to everyone who took part.", button: "Meet the brides" }
  };
  var DEFAULT_RULES = [
    "Open to engaged couples who are planning their wedding. Register between {reg_open_day} and {reg_close_day}.",
    "Our team will shortlist 3 to 4 couples (6 at most). shortlisted couples take part in interviews and bridal styling from {interviews_range}.",
    "Anyone can vote, including people who have never shopped with us. Voters must verify their identity by signing in with Google.",
    "Each verified account has one website vote. Voting runs from {voting_open_day} to 11:59 PM on {voting_close_day} (Nigeria time).",
    "Votes from social media are also counted. They are collected and reviewed by our team before they are added.",
    "The winner is announced on {winner_day}. The prize presentation takes place from {prize_range}.",
    "Votes found to be fake, bought or duplicated are removed. Molly Samuels Limited's decision on the result is final."
  ];

  function ms(v) { return v ? new Date(v).getTime() : NaN; }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  // Show every date in Nigeria time (UTC+1, no daylight saving), whatever the visitor's own clock says.
  function wat(d) { return new Date(new Date(d).getTime() + 3600000); }
  var MON = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  function dayLabel(d) { var x = wat(d); return x.getUTCDate() + " " + MON[x.getUTCMonth()]; }
  function dateTimeLabel(d) { var x = wat(d); var h = x.getUTCHours(), ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; return x.getUTCDate() + " " + MON[x.getUTCMonth()] + " " + x.getUTCFullYear() + ", " + h + ":" + pad(x.getUTCMinutes()) + " " + ap; }
  function rangeLabel(a, b) { var x = wat(a), y = wat(b); return x.getUTCMonth() === y.getUTCMonth() ? x.getUTCDate() + " to " + y.getUTCDate() + " " + MON[x.getUTCMonth()] : dayLabel(a) + " to " + dayLabel(b); }
  function tokens(s) {
    return {
      reg_open: dayLabel(s.reg_open), reg_open_day: dayLabel(s.reg_open), reg_close_day: dayLabel(s.reg_close),
      interviews_range: rangeLabel(s.interviews_start, s.interviews_end), voting_open_day: dayLabel(s.voting_open),
      voting_close_day: dayLabel(s.voting_close), winner_day: dayLabel(s.winner_date), prize_range: rangeLabel(s.prize_start, s.prize_end)
    };
  }
  function fill(str, s) { var t = tokens(s); return String(str || "").replace(/\{(\w+)\}/g, function (m, k) { return t[k] || m; }); }

  function phaseOf(s, nowMs) {
    if (!s) return "ended";
    if (!s.is_enabled) return "ended";
    if (s.phase_override && PHASES.indexOf(s.phase_override) > -1) return s.phase_override;
    var n = nowMs == null ? Date.now() : nowMs;
    if (n >= ms(s.campaign_end)) return "ended";
    if (n >= ms(s.winner_date)) return "winner";
    if (n >= ms(s.voting_close)) return "counting";
    if (n >= ms(s.voting_open)) return "voting";
    if (n >= ms(s.interviews_end)) return "voting_soon";
    if (n >= ms(s.interviews_start)) return "interviews";
    if (n >= ms(s.reg_close)) return "shortlisting";
    if (n >= ms(s.reg_open)) return "registration";
    return "coming";
  }
  // The next date worth counting down to.
  function nextMilestone(s, phase) {
    var m = { coming: ["Registration opens in", s.reg_open], registration: ["Registration closes in", s.reg_close],
      shortlisting: ["Interviews begin in", s.interviews_start], interviews: ["Voting opens in", s.voting_open],
      voting_soon: ["Voting opens in", s.voting_open], voting: ["Voting closes in", s.voting_close],
      counting: ["Winner announced in", s.winner_date] }[phase];
    return m ? { label: m[0], at: ms(m[1]) } : null;
  }
  function textsFor(s, phase) {
    var base = DEFAULT_TEXTS[phase] || DEFAULT_TEXTS.coming;
    var over = (s && s.phase_texts && s.phase_texts[phase]) || {};
    function pick(k) { return (over[k] && String(over[k]).trim()) || base[k]; }
    return { title: fill(pick("title"), s), text: fill(pick("text"), s), button: fill(pick("button"), s), href: PHASE_BUTTON_TARGET[phase] || "bridal-challenge" };
  }
  function rulesList(s) {
    var raw = s && s.rules_text && s.rules_text.trim();
    var lines = raw ? raw.split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean) : DEFAULT_RULES;
    return lines.map(function (l) { return fill(l, s); });
  }

  function request(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ apikey: SB_KEY, Authorization: "Bearer " + SB_KEY }, opts.headers || {});
    return fetch(SB_URL + "/rest/v1/" + path, opts);
  }
  // Settings are kept for 5 minutes in this browser tab so browsing the store never hammers the database.
  function getSettings(force) {
    var KEY = "ms_ch_settings_v1";
    try {
      if (!force) { var c = JSON.parse(sessionStorage.getItem(KEY) || "null"); if (c && Date.now() - c.t < 300000) return Promise.resolve(c.d); }
    } catch (e) {}
    return request("challenge_settings?id=eq.1&select=*").then(function (r) { return r.ok ? r.json() : []; })
      .then(function (a) { var d = a && a[0] ? a[0] : null; try { if (d) sessionStorage.setItem(KEY, JSON.stringify({ t: Date.now(), d: d })); } catch (e) {} return d; })
      .catch(function () { return null; });
  }

  // Turns a pasted video link into something safe to show. Only YouTube, Vimeo or a direct .mp4/.webm file are accepted.
  function parseVideo(url) {
    if (!url) return null;
    url = String(url).trim();
    var m = url.match(/^https:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (m) return { kind: "youtube", id: m[1], embed: "https://www.youtube-nocookie.com/embed/" + m[1] + "?autoplay=1&rel=0&modestbranding=1&playsinline=1", thumb: "https://i.ytimg.com/vi/" + m[1] + "/hqdefault.jpg" };
    m = url.match(/^https:\/\/(?:www\.)?vimeo\.com\/(?:video\/)?(\d{6,12})/);
    if (m) return { kind: "vimeo", id: m[1], embed: "https://player.vimeo.com/video/" + m[1] + "?autoplay=1&title=0&byline=0&portrait=0", thumb: null };
    if (/^https:\/\/[^\s"'<>]+\.(mp4|webm)(\?[^\s"'<>]*)?$/i.test(url)) return { kind: "file", src: url, thumb: null };
    return null;
  }
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  // Only allow image addresses that are our own storage, or a normal https picture.
  function safeImg(u) { u = String(u || "").trim(); return /^https:\/\/[^\s"'<>]+$/i.test(u) || /^assets\/[^\s"'<>]+$/.test(u) ? u : ""; }

  w.MSChallenge = { SB_URL: SB_URL, SB_KEY: SB_KEY, PHASES: PHASES, PHASE_LABEL: PHASE_LABEL, DEFAULT_TEXTS: DEFAULT_TEXTS, DEFAULT_RULES: DEFAULT_RULES,
    phaseOf: phaseOf, nextMilestone: nextMilestone, textsFor: textsFor, rulesList: rulesList, getSettings: getSettings, request: request,
    parseVideo: parseVideo, esc: esc, safeImg: safeImg, fill: fill, dayLabel: dayLabel, dateTimeLabel: dateTimeLabel, rangeLabel: rangeLabel, ms: ms };
})(window);
