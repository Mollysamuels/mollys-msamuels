// ============================================
// photo-slots.js  —  Mollys photos that live on GitHub
// --------------------------------------------
// Each category page looks for photos with these exact names inside
// assets/images/mollys/ :
//      <prefix>-<number>-main.jpg   (required for the item to appear)
//      <prefix>-<number>-alt.jpg    (optional hover photo)
// A photo that is not uploaded yet simply does not show - nothing breaks.
// An item with no -alt photo just keeps showing its main photo on hover.
//
// To change a displayed name or price before the item is set up in Admin,
// edit the lines below. (name = what the card says, price = naira.)
// ============================================
window.PHOTO_SLOTS = {
  "gowns":       [ { prefix: "gown", newFrom: 6,      from: 1, to: 100, name: "Gown",      price: 25000 } ],
  "tops":        [ { prefix: "top", newFrom: 6,       from: 1, to: 100, name: "Top",       price: 12000 } ],
  "bridal":      [ { prefix: "bridal", newFrom: 1,    from: 1, to: 100, name: "Bridal",    price: 85000 } ],
  "two-piece":   [ { prefix: "two-piece", newFrom: 1, from: 1, to: 100, name: "Two Piece", price: 22000 } ],
  "shoes":       [ { prefix: "heel", newFrom: 6,      from: 1, to: 100,  name: "Heel",      price: 17800 },
                   { prefix: "croc", newFrom: 4,      from: 1, to: 100,  name: "Croc",      price: 11800 },
                   { prefix: "sandal", newFrom: 1,    from: 1, to: 100,  name: "Sandal",    price: 13200 },
                   { prefix: "shoe", newFrom: 1,      from: 1, to: 100, name: "Shoe",      price: 15000 } ],
  "bags":        [ { prefix: "bag", newFrom: 6,       from: 1, to: 100, name: "Bag",       price: 19500 } ],
  "jewellery":   [ { prefix: "jewellery", newFrom: 6, from: 1, to: 100, name: "Jewellery", price: 8000 } ],
  "accessories": [ { prefix: "accessory", newFrom: 6, from: 1, to: 100,  name: "Accessory", price: 9500 },
                   { prefix: "purse", newFrom: 1,     from: 1, to: 100, name: "Purse",     price: 14000 },
                   { prefix: "brooch", newFrom: 1,    from: 1, to: 100, name: "Brooch",    price: 4500 },
                   { prefix: "belt", newFrom: 1,      from: 1, to: 100,  name: "Belt",      price: 7000 } ],
  "polo":        [ { prefix: "polo", newFrom: 1,      from: 1, to: 100, name: "Polo",      price: 9500 } ],
  "jeans":       [ { prefix: "jean", newFrom: 1,      from: 1, to: 100, name: "Jeans",     price: 15000 } ]
};

// What customers SEE as the category name (the web address stays the same).
window.CATEGORY_LABELS = { "gowns": "Dresses" };

// ---- Bridal page extras ----
// Paste the YouTube link of the bridal collection film between the quotes ("" = no film shown).
window.BRIDAL_VIDEO_URL = "";
// WhatsApp number for the "Ask about this gown" button (country code, no + sign).
window.BRIDAL_WHATSAPP = "2348037865059";

// Photos that are on GitHub but not yet created as products stay HIDDEN from
// customers (they could not be bought). Turn this on only for previewing.
window.SHOW_UNSYNCED_PHOTOS = false;

// Old links to Heels / Sandals / Crocs now open the single Shoes page.
window.CATEGORY_ALIASES = { "heels": "shoes", "sandals": "shoes", "crocs": "shoes" };
window.CATEGORY_GROUPS  = { "shoes": ["shoes", "heels", "sandals", "crocs"] };

// Returns the cards whose main photo really exists, in order.
window.findPhotoSlots = function (slug) {
  var groups = window.PHOTO_SLOTS[slug];
  if (!groups) return Promise.resolve([]);
  var base = "assets/images/mollys/";
  var slots = [];
  groups.forEach(function (g) {
    for (var n = g.from; n <= g.to; n++) {
      slots.push({
        name: g.name + " " + n, price: g.price,
        img1: base + g.prefix + "-" + n + "-main.jpg",
        img2: base + g.prefix + "-" + n + "-alt.jpg",
        slug: g.prefix + "-" + n, division: "mollys", category: slug, linkOverride: null
      });
    }
  });
  return Promise.all(slots.map(function (s) {
    return new Promise(function (resolve) {
      var im = new Image();
      var done = false;
      function fin(ok) { if (!done) { done = true; resolve(ok ? s : null); } }
      im.onload = function () { fin(true); };
      im.onerror = function () { fin(false); };
      setTimeout(function () { fin(false); }, 8000);
      im.src = s.img1;
    });
  })).then(function (list) { return list.filter(Boolean); });
};
