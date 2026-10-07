// ============================================
// newsletter.js — makes the "Stay updated" box (any email box with a "Subscribe"
// button) really work. It asks for a confirmation email; the person only joins
// the list after tapping the link in it. Does nothing on pages without such a box.
// ============================================
(function () {
  var ENDPOINT = "https://vdlwnflklclenavtpamp.supabase.co/functions/v1/newsletter-signup";
  var ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkbHduZmxrbGNsZW5hdnRwYW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5OTg5NTksImV4cCI6MjEwNTU3NDk1OX0.OfZ8QHqzaRepBc6pghvK6fbH1N6TqsD5AS4370CaBfU";

  function looksLikeEmail(v) { return v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }

  // Finds the email box that belongs to a Subscribe button (inside its form, or up to 3 levels around it).
  function findInput(button) {
    var scope = button.closest("form") || button.parentElement;
    for (var i = 0; i < 4 && scope; i++, scope = scope.parentElement) {
      var input = scope.querySelector('input[type="email"], input[name*="email" i]');
      if (input) return { input: input, scope: button.closest("form") || scope };
    }
    return null;
  }

  function wire(button) {
    if (button.dataset.newsletterWired) return;
    var found = findInput(button);
    if (!found) return;
    button.dataset.newsletterWired = "1";
    var input = found.input, scope = found.scope, form = button.closest("form");
    var busy = false, label = button.textContent;

    // Hidden field only a robot fills in.
    var trap = document.createElement("input");
    trap.type = "text"; trap.name = "website"; trap.tabIndex = -1; trap.autocomplete = "off";
    trap.setAttribute("aria-hidden", "true");
    trap.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px;opacity:0;";
    scope.appendChild(trap);

    // Plain-words consent line + a place for the result message (inherits the section's colours).
    var holder = form || scope;
    var consent = document.createElement("p");
    consent.className = "newsletter-consent";
    consent.style.cssText = "font-size:0.78rem;opacity:0.8;margin:10px 0 0;line-height:1.5;";
    consent.innerHTML = 'By subscribing you agree to get news and offers from Molly Samuels by email. Unsubscribe any time. <a href="privacy.html" style="text-decoration:underline;color:inherit;">Privacy Policy</a>';
    var msg = document.createElement("p");
    msg.className = "newsletter-msg"; msg.setAttribute("role", "status");
    msg.style.cssText = "font-size:0.88rem;font-weight:600;margin:10px 0 0;line-height:1.5;display:none;";
    holder.insertAdjacentElement("afterend", consent);
    consent.insertAdjacentElement("afterend", msg);

    function say(text, good) { msg.textContent = (good ? "✓ " : "! ") + text; msg.style.display = "block"; }

    function submit(e) {
      if (e) e.preventDefault();
      if (busy) return;
      var email = input.value.trim().toLowerCase();
      if (!looksLikeEmail(email)) { say("Please enter a valid email address.", false); return; }
      busy = true; button.disabled = true; button.textContent = "Sending…";
      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": ANON, "Authorization": "Bearer " + ANON },
        body: JSON.stringify({ email: email, website: trap.value }),
      })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (res.ok && res.j && res.j.ok) { say("Almost done — we've emailed you. Tap the link in that email to confirm.", true); input.value = ""; }
          else if (res.j && res.j.error && /valid email/i.test(res.j.error)) say("Please enter a valid email address.", false);
          else say("Sorry, something went wrong. Please try again in a little while.", false);
        })
        .catch(function () { say("Sorry, we couldn't reach the server. Please check your connection and try again.", false); })
        .then(function () { busy = false; button.disabled = false; button.textContent = label; });
    }

    if (form) form.addEventListener("submit", submit);
    else button.addEventListener("click", submit);
  }

  function start() {
    Array.prototype.forEach.call(document.querySelectorAll("button, input[type=submit]"), function (b) {
      var text = (b.tagName === "INPUT" ? b.value : b.textContent) || "";
      if (/^\s*subscribe\s*$/i.test(text)) wire(b);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
