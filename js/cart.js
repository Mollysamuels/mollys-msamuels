document.addEventListener("DOMContentLoaded", function () {
  const items = document.querySelectorAll(".cart-item");
  if (!items.length) return;

  const subtotalEl = document.getElementById("cartSubtotal");
  const totalEl = document.getElementById("cartTotal");
  const deliveryFee = 2500;

  function recalc() {
    let subtotal = 0;
    document.querySelectorAll(".cart-item").forEach((item) => {
      const price = parseInt(item.dataset.price, 10);
      const qty = parseInt(item.querySelector(".cart-qty-stepper span").textContent, 10);
      subtotal += price * qty;
    });
    if (subtotalEl) subtotalEl.textContent = `₦${subtotal.toLocaleString()}`;
    if (totalEl) totalEl.textContent = `₦${(subtotal + (subtotal ? deliveryFee : 0)).toLocaleString()}`;
    const badge = document.querySelector(".cart-badge");
    const count = document.querySelectorAll(".cart-item").length;
    if (badge) badge.textContent = count;
    if (!count) {
      document.getElementById("cartHasItems").style.display = "none";
      document.getElementById("cartEmptyState").style.display = "block";
    }
  }

  document.querySelectorAll(".cart-item").forEach((item) => {
    const minus = item.querySelector(".qty-minus");
    const plus = item.querySelector(".qty-plus");
    const span = item.querySelector(".cart-qty-stepper span");
    const priceEl = item.querySelector(".cart-item-price");
    const unitPrice = parseInt(item.dataset.price, 10);

    function updateLinePrice() {
      const qty = parseInt(span.textContent, 10);
      priceEl.textContent = `₦${(unitPrice * qty).toLocaleString()}`;
    }
    minus.addEventListener("click", () => {
      let qty = Math.max(1, parseInt(span.textContent, 10) - 1);
      span.textContent = qty; updateLinePrice(); recalc();
    });
    plus.addEventListener("click", () => {
      let qty = Math.min(20, parseInt(span.textContent, 10) + 1);
      span.textContent = qty; updateLinePrice(); recalc();
    });
    item.querySelector(".cart-remove").addEventListener("click", () => {
      item.remove(); recalc();
    });
  });

  recalc();
});
