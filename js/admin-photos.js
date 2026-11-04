// ============================================
// admin-photos.js — product photo upload for the Add/Edit Product page.
//
// For each photo slot (Main, Hover):
//  - Pick any JPG/PNG/WebP (phone photos are fine).
//  - It shows inside the SAME 4:5 frame the shop cards use. Drag to move it,
//    use the slider to zoom. What you see in the frame is what customers see.
//  - On Save it is cropped to that frame, shrunk, re-saved (which also strips
//    hidden phone data such as GPS location), and uploaded in two sizes:
//      large  1200 x 1500  -> product page
//      small   600 x  750  -> shop grids and cards (much less data per visit)
//  - The old photo is deleted from storage once the new one is saved.
// Uploading only works for admins: the database itself checks this.
// ============================================
(function () {
  "use strict";

  var BUCKET = "product-images";
  var LG = { w: 1200, h: 1500 };
  var SM = { w: 600, h: 750 };
  var MAX_INPUT_BYTES = 25 * 1024 * 1024;
  var MAX_UPLOAD_BYTES = 1.9 * 1024 * 1024;
  var OK_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

  var slots = {};

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // ---------- one photo slot ----------
  function Slot(key, title, hint, root) {
    var s = this;
    s.key = key;
    s.existingUrl = null; // URL already saved on the product
    s.img = null;         // newly picked photo (HTMLImageElement)
    s.zoom = 1; s.cx = 0.5; s.cy = 0.5;
    s.removed = false;

    var box = el("div", "apf-photo-slot");
    box.appendChild(el("div", "apf-photo-title", title));
    var frame = el("div", "apf-photo-frame");
    frame.setAttribute("tabindex", "0");
    frame.setAttribute("aria-label", title + " photo. Drag or use arrow keys to move it in the frame.");
    var pic = el("img", "apf-photo-img"); pic.alt = ""; pic.draggable = false;
    var empty = el("div", "apf-photo-empty", "No photo yet");
    frame.appendChild(pic); frame.appendChild(empty);
    box.appendChild(frame);

    var zoomRow = el("label", "apf-photo-zoom");
    zoomRow.appendChild(el("span", null, "Zoom"));
    var zoom = document.createElement("input");
    zoom.type = "range"; zoom.min = "1"; zoom.max = "3"; zoom.step = "0.01"; zoom.value = "1";
    zoomRow.appendChild(zoom);
    box.appendChild(zoomRow);

    var actions = el("div", "apf-photo-actions");
    var file = document.createElement("input");
    file.type = "file"; file.accept = "image/jpeg,image/png,image/webp,image/heic,image/heif"; file.hidden = true;
    var pick = el("button", "btn btn-outline apf-photo-pick", "Choose photo"); pick.type = "button";
    var remove = el("button", "apf-photo-remove", "Remove"); remove.type = "button";
    actions.appendChild(pick); actions.appendChild(remove); actions.appendChild(file);
    box.appendChild(actions);
    var msg = el("p", "apf-photo-msg");
    box.appendChild(msg);
    box.appendChild(el("p", "apf-photo-hint", hint));
    root.appendChild(box);

    s.frame = frame; s.pic = pic; s.empty = empty; s.zoomInput = zoom; s.zoomRow = zoomRow;
    s.remove = remove; s.msg = msg;

    pick.addEventListener("click", function () { file.click(); });
    file.addEventListener("change", function () {
      var f = file.files && file.files[0];
      file.value = "";
      if (f) s.load(f);
    });
    remove.addEventListener("click", function () {
      s.img = null; s.removed = true; s.say("");
      s.render();
    });
    zoom.addEventListener("input", function () { s.zoom = parseFloat(zoom.value) || 1; s.render(); });

    // drag to move
    var drag = null;
    frame.addEventListener("pointerdown", function (e) {
      if (!s.img) return;
      drag = { x: e.clientX, y: e.clientY };
      frame.setPointerCapture(e.pointerId);
      frame.classList.add("dragging");
    });
    frame.addEventListener("pointermove", function (e) {
      if (!drag || !s.img) return;
      var g = s.geom();
      s.cx -= (e.clientX - drag.x) / g.dw;
      s.cy -= (e.clientY - drag.y) / g.dh;
      drag = { x: e.clientX, y: e.clientY };
      s.render();
    });
    function endDrag() { drag = null; frame.classList.remove("dragging"); }
    frame.addEventListener("pointerup", endDrag);
    frame.addEventListener("pointercancel", endDrag);
    frame.addEventListener("keydown", function (e) {
      if (!s.img) return;
      var step = 0.02, used = true;
      if (e.key === "ArrowLeft") s.cx -= step; else if (e.key === "ArrowRight") s.cx += step;
      else if (e.key === "ArrowUp") s.cy -= step; else if (e.key === "ArrowDown") s.cy += step;
      else used = false;
      if (used) { e.preventDefault(); s.render(); }
    });
    window.addEventListener("resize", function () { s.render(); });
    s.render();
  }

  Slot.prototype.say = function (text, bad) {
    this.msg.textContent = text || "";
    this.msg.style.color = bad ? "#B23A3A" : "var(--ink-soft)";
  };

  Slot.prototype.load = function (f) {
    var s = this;
    if (f.type && OK_TYPES.indexOf(f.type) === -1) { s.say("Please choose a JPG, PNG or WebP photo.", true); return; }
    if (f.size > MAX_INPUT_BYTES) { s.say("That file is over 25 MB. Please choose a smaller photo.", true); return; }
    var url = URL.createObjectURL(f);
    var im = new Image();
    im.onload = function () {
      s.img = im; s.removed = false;
      s.zoom = 1; s.cx = 0.5; s.cy = 0.5; s.zoomInput.value = "1";
      s.say("New photo. Drag to position it, then save the product.");
      s.render();
      var g = s.geom();
      if (g.iw * (g.W / g.dw) < SM.w) s.say("This photo is quite small, so it may look blurry. A larger photo is better.", true);
    };
    im.onerror = function () {
      URL.revokeObjectURL(url);
      s.say("This photo can't be opened in this browser (iPhone HEIC photos sometimes can't). Please save it as JPG and try again.", true);
    };
    im.src = url;
  };

  Slot.prototype.geom = function () {
    var W = this.frame.clientWidth || 240, H = W * 1.25;
    var iw = this.img.naturalWidth, ih = this.img.naturalHeight;
    var base = Math.max(W / iw, H / ih);
    var scale = base * this.zoom;
    return { W: W, H: H, iw: iw, ih: ih, scale: scale, dw: iw * scale, dh: ih * scale };
  };

  Slot.prototype.clamp = function (g) {
    var hx = (g.W / 2) / g.dw, hy = (g.H / 2) / g.dh; // half the frame, as a fraction of the image
    this.cx = Math.min(1 - hx, Math.max(hx, this.cx));
    this.cy = Math.min(1 - hy, Math.max(hy, this.cy));
  };

  Slot.prototype.render = function () {
    var s = this, p = s.pic;
    s.remove.style.display = (s.img || (s.existingUrl && !s.removed)) ? "" : "none";
    s.zoomRow.style.display = s.img ? "" : "none";
    s.frame.classList.toggle("editable", !!s.img);
    if (s.img) {
      var g = s.geom(); s.clamp(g);
      p.src = s.img.src;
      p.style.cssText = "position:absolute;max-width:none;width:" + g.dw + "px;height:" + g.dh + "px;left:" +
        (g.W / 2 - s.cx * g.dw) + "px;top:" + (g.H / 2 - s.cy * g.dh) + "px;object-fit:fill;";
      s.empty.style.display = "none";
    } else if (s.existingUrl && !s.removed) {
      p.src = s.existingUrl;
      p.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;";
      s.empty.style.display = "none";
    } else {
      p.removeAttribute("src"); p.style.cssText = "display:none;";
      s.empty.style.display = "";
      s.empty.textContent = s.removed && s.existingUrl ? "Photo will be removed when you save" : "No photo yet";
    }
  };

  // Draws the framed area of the picked photo onto a canvas of the given size.
  Slot.prototype.drawTo = function (size, source) {
    var c = document.createElement("canvas");
    c.width = size.w; c.height = size.h;
    var ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, size.w, size.h); // PNGs with transparency get a white background
    if (source) { ctx.drawImage(source, 0, 0, size.w, size.h); return c; }
    var g = this.geom(); this.clamp(g);
    var sw = g.W / g.scale, sh = g.H / g.scale;
    var sx = this.cx * g.iw - sw / 2, sy = this.cy * g.ih - sh / 2;
    ctx.drawImage(this.img, sx, sy, sw, sh, 0, 0, size.w, size.h);
    return c;
  };

  // ---------- helpers ----------
  function toBlob(canvas, type, q) {
    return new Promise(function (res) { canvas.toBlob(function (b) { res(b); }, type, q); });
  }
  // WebP where the browser can make it (much smaller), otherwise JPEG.
  async function encode(canvas) {
    var q = 0.82, b = await toBlob(canvas, "image/webp", q), ext = "webp";
    if (!b || b.type !== "image/webp") { ext = "jpg"; b = await toBlob(canvas, "image/jpeg", 0.85); }
    while (b && b.size > MAX_UPLOAD_BYTES && q > 0.45) {
      q -= 0.1;
      b = await toBlob(canvas, ext === "webp" ? "image/webp" : "image/jpeg", q);
    }
    return { blob: b, ext: ext, type: ext === "webp" ? "image/webp" : "image/jpeg" };
  }
  // Storage path of a photo we uploaded (null for older photos kept in the website files).
  function storagePath(url) {
    if (!url) return null;
    var m = String(url).match(/\/storage\/v1\/object\/public\/product-images\/([^?#]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }
  function smallOf(path) { return path ? path.replace(/-lg\.(webp|jpg)$/, "-sm.$1") : null; }

  // ---------- public API used by admin-product-form.js ----------
  window.ApfPhotos = {
    mount: function (root) {
      root.textContent = "";
      var grid = el("div", "apf-photo-grid");
      root.appendChild(grid);
      slots.main = new Slot("main", "Main photo", "Shown on shop cards and first on the product page.", grid);
      slots.alt = new Slot("alt", "Hover photo (optional)", "Shown when a shopper hovers over the card, e.g. the back or a model shot.", grid);
    },

    setExisting: function (mainUrl, altUrl) {
      slots.main.existingUrl = mainUrl || null;
      slots.alt.existingUrl = altUrl || null;
      slots.main.render(); slots.alt.render();
    },

    hasChanges: function () {
      return ["main", "alt"].some(function (k) { return slots[k].img || slots[k].removed; });
    },

    // Uploads new photos for this product and returns the product fields to save,
    // e.g. { main_image_url: "...", alt_image_url: null }. Also returns the old
    // files to delete AFTER the product has been saved successfully.
    upload: async function (client, productId, onStatus) {
      var fields = {}, oldFiles = [], newFiles = [];
      var store = client.storage.from(BUCKET);
      for (var k of ["main", "alt"]) {
        var s = slots[k], col = k === "main" ? "main_image_url" : "alt_image_url";
        var oldPath = storagePath(s.existingUrl);
        if (s.img) {
          onStatus && onStatus("Preparing " + (k === "main" ? "main" : "hover") + " photo…");
          var lgCanvas = s.drawTo(LG);
          var lg = await encode(lgCanvas);
          var sm = await encode(s.drawTo(SM, lgCanvas));
          if (!lg.blob || !sm.blob) throw new Error("Couldn't prepare the photo in this browser.");
          var stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
          var base = "products/" + productId + "/" + k + "-" + stamp;
          var lgPath = base + "-lg." + lg.ext, smPath = base + "-sm." + sm.ext;
          onStatus && onStatus("Uploading " + (k === "main" ? "main" : "hover") + " photo…");
          var opts = { cacheControl: "31536000", upsert: false };
          var r1 = await store.upload(lgPath, lg.blob, Object.assign({ contentType: lg.type }, opts));
          if (r1.error) throw r1.error;
          newFiles.push(lgPath);
          var r2 = await store.upload(smPath, sm.blob, Object.assign({ contentType: sm.type }, opts));
          if (r2.error) throw r2.error;
          newFiles.push(smPath);
          fields[col] = store.getPublicUrl(lgPath).data.publicUrl;
          if (oldPath) oldFiles.push(oldPath, smallOf(oldPath));
        } else if (s.removed && s.existingUrl) {
          fields[col] = null;
          if (oldPath) oldFiles.push(oldPath, smallOf(oldPath));
        }
      }
      return { fields: fields, oldFiles: oldFiles.filter(Boolean), newFiles: newFiles };
    },

    // Best-effort cleanup; a failure here never affects the product itself.
    removeFiles: async function (client, paths) {
      if (!paths || !paths.length) return;
      try { await client.storage.from(BUCKET).remove(paths); } catch (e) { console.warn("Photo cleanup skipped:", e); }
    },
  };
})();
