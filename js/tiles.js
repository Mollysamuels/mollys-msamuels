// Category tiles: show one of YOUR real photos for each category.
// Looks for <prefix>-1-main.jpg ... <prefix>-15-main.jpg and uses the first one that exists.
// If none exist, the tile keeps its backup picture. The result is remembered for a day so pages stay fast.
(function () {
  var BASE = "assets/images/mollys/", MAX = 15, DAY = 86400000;
  function probe(src) {
    return new Promise(function (res) {
      var im = new Image(), done = false;
      function f(ok) { if (!done) { done = true; res(ok); } }
      im.onload = function () { f(true); }; im.onerror = function () { f(false); };
      setTimeout(function () { f(false); }, 6000); im.src = src;
    });
  }
  async function pick(img) {
    var prefix = img.getAttribute("data-pick"), key = "tilePick:" + prefix, hit = null;
    try { var c = JSON.parse(localStorage.getItem(key) || "null"); if (c && Date.now() - c.t < DAY) hit = c; } catch (e) {}
    if (hit) { if (hit.src) img.src = hit.src; return; }
    var list = []; for (var n = 1; n <= MAX; n++) list.push(BASE + prefix + "-" + n + "-main.jpg");
    var ok = await Promise.all(list.map(probe)), found = "";
    for (var i = 0; i < list.length; i++) if (ok[i]) { found = list[i]; break; }
    try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), src: found })); } catch (e) {}
    if (found) img.src = found;
  }
  document.querySelectorAll("img[data-pick]").forEach(function (img) { pick(img); });
})();
