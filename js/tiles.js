// Category tiles: show one of YOUR real photos for each category.
// Uses the photo number set in window.TILE_PICKS (js/photo-slots.js). If it is missing, tries the NEXT numbers up
// (newer photos first), then the lower ones. If nothing exists the tile keeps its backup picture.
// The result is remembered for a day so pages stay fast.
(function () {
  var BASE = "assets/images/mollys/", MAX = 30, DAY = 86400000, VER = "v2";
  var picks = window.TILE_PICKS || {};
  function probe(src) {
    return new Promise(function (res) {
      var im = new Image(), done = false;
      function f(ok) { if (!done) { done = true; res(ok); } }
      im.onload = function () { f(true); }; im.onerror = function () { f(false); };
      setTimeout(function () { f(false); }, 6000); im.src = src;
    });
  }
  async function pick(img) {
    var prefix = img.getAttribute("data-pick"), want = parseInt(picks[prefix], 10) || 1;
    var key = "tilePick:" + VER + ":" + prefix + ":" + want, hit = null;
    try { var c = JSON.parse(localStorage.getItem(key) || "null"); if (c && Date.now() - c.t < DAY) hit = c; } catch (e) {}
    if (hit) { if (hit.src) img.src = hit.src; return; }
    var order = [], n;
    for (n = want; n <= MAX; n++) order.push(n);
    for (n = 1; n < want; n++) order.push(n);
    var list = order.map(function (k) { return BASE + prefix + "-" + k + "-main.jpg"; });
    var ok = await Promise.all(list.map(probe)), found = "";
    for (var i = 0; i < list.length; i++) if (ok[i]) { found = list[i]; break; }
    try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), src: found })); } catch (e) {}
    if (found) img.src = found;
  }
  document.querySelectorAll("img[data-pick]").forEach(function (img) { pick(img); });
})();
