// show-password.js — adds an eye icon to every password box on the page, so people
// can check what they typed. Nothing is stored or sent.
(function () {
  var EYE = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.6"/></svg>';
  var EYE_OFF = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><path d="M2 12s3.6-7 10-7c2.1 0 3.9.7 5.4 1.7M22 12s-3.6 7-10 7c-2.1 0-3.9-.7-5.4-1.7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M9.9 9.9a3 3 0 004.2 4.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M3 3l18 18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

  function add(input) {
    if (input.dataset.spDone) return;
    input.dataset.spDone = "1";
    var wrap = document.createElement("div");
    wrap.style.cssText = "position:relative;";
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    input.style.paddingRight = "48px";
    input.style.width = "100%";

    var btn = document.createElement("button");
    btn.type = "button";
    btn.innerHTML = EYE;
    btn.setAttribute("aria-label", "Show password");
    btn.setAttribute("aria-pressed", "false");
    btn.title = "Show password";
    btn.style.cssText = "position:absolute;right:6px;top:50%;transform:translateY(-50%);width:36px;height:36px;display:flex;align-items:center;justify-content:center;background:none;border:0;padding:0;color:#58493A;cursor:pointer;border-radius:6px;";

    function set(show) {
      input.type = show ? "text" : "password";
      btn.innerHTML = show ? EYE_OFF : EYE;
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
      btn.title = show ? "Hide password" : "Show password";
      btn.setAttribute("aria-pressed", show ? "true" : "false");
    }
    btn.addEventListener("click", function () {
      set(input.type === "password");
      input.focus();
    });
    wrap.appendChild(btn);
    // Hide again when the form is sent, so browsers save it as a password.
    if (input.form) input.form.addEventListener("submit", function () { set(false); });
  }
  function run() { document.querySelectorAll('input[type="password"]').forEach(add); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
})();
