// show-password.js — adds a "Show / Hide" button to every password box on the page,
// so people can check what they typed before logging in. Nothing is stored or sent.
(function () {
  function add(input) {
    if (input.dataset.spDone) return;
    input.dataset.spDone = "1";
    var wrap = document.createElement("div");
    wrap.style.cssText = "position:relative;";
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    input.style.paddingRight = "64px";
    input.style.width = "100%";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Show";
    btn.setAttribute("aria-label", "Show password");
    btn.setAttribute("aria-pressed", "false");
    btn.style.cssText = "position:absolute;right:6px;top:50%;transform:translateY(-50%);background:none;border:0;padding:6px 8px;font:600 0.78rem 'Work Sans',sans-serif;letter-spacing:.04em;color:#58493A;cursor:pointer;text-transform:uppercase;";
    btn.addEventListener("click", function () {
      var show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.textContent = show ? "Hide" : "Show";
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
      btn.setAttribute("aria-pressed", show ? "true" : "false");
      input.focus();
    });
    wrap.appendChild(btn);
    // Always hide it again when the form is sent, so browsers save it as a password.
    if (input.form) input.form.addEventListener("submit", function () {
      input.type = "password"; btn.textContent = "Show"; btn.setAttribute("aria-pressed", "false");
    });
  }
  function run() { document.querySelectorAll('input[type="password"]').forEach(add); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
})();
