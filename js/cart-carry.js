// cart-carry.js — keeps a shopper's cart when they create an account.
// The cart normally lives only in this browser. When someone signs up, the
// confirmation email often opens in a DIFFERENT browser (e.g. the Gmail app),
// where the cart would be empty. So at sign-up we save a copy of the cart on
// the account itself, and put it back the first time they're signed in with
// an empty cart. Prices are never trusted from here: checkout re-reads every
// price from the database.
(function () {
  var KEY = "molly_samuels_cart";
  var MAX = 50;

  function str(v, n) { return String(v == null ? "" : v).replace(/[<>]/g, "").slice(0, n); }
  function cleanItem(i) {
    if (!i || typeof i !== "object") return null;
    var id = str(i.product_id, 80);
    if (!id) return null;
    var img = str(i.img, 300);
    if (img && !/^(assets\/|https:\/\/)/.test(img)) img = "";
    var qty = Math.min(50, Math.max(1, parseInt(i.qty, 10) || 1));
    return {
      product_id: id, name: str(i.name, 120), price: Number(i.price) || 0, img: img,
      division: str(i.division, 20), size: str(i.size, 40), color: str(i.color, 40), qty: qty,
    };
  }
  function cleanCart(c) {
    if (!Array.isArray(c)) return [];
    return c.slice(0, MAX).map(cleanItem).filter(Boolean);
  }
  function localCart() {
    try { return cleanCart(JSON.parse(localStorage.getItem(KEY)) || []); } catch (e) { return []; }
  }

  window.CartCarry = {
    // Used by register.html: a clean copy of the cart to store on the new account.
    snapshot: function () { return localCart(); },

    // Used after sign-in: if this browser's cart is empty but the account has a
    // saved cart, bring it back, then remove the saved copy.
    restore: async function (client) {
      try {
        if (!client) return false;
        var res = await client.auth.getUser();
        var user = res && res.data && res.data.user;
        var saved = user && user.user_metadata && user.user_metadata.cart;
        if (!saved) return false;
        var restored = false;
        if (!localCart().length) {
          var items = cleanCart(saved);
          if (items.length) {
            localStorage.setItem(KEY, JSON.stringify(items));
            if (typeof updateCartBadges === "function") updateCartBadges();
            restored = true;
          }
        }
        await client.auth.updateUser({ data: { cart: null } });
        return restored;
      } catch (e) { return false; }
    },

    // Remembers that this browser has an account, so checkout can say "Log in" first next time.
    markKnown: function () { try { localStorage.setItem("ms_has_account", "1"); } catch (e) {} },
    isKnown: function () { try { return localStorage.getItem("ms_has_account") === "1"; } catch (e) { return false; } },
  };
})();
