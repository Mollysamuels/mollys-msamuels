// ============================================
// CART PAGE — renders the real cart, live, from js/main.js's cart store
// ============================================

document.addEventListener("DOMContentLoaded", function () {
  const col = document.getElementById("cartItemsCol");
  if (!col) return; // not on cart.html

  const deliveryFee = 2500;

  function render() {
    const cart = getCart();

    if (!cart.length) {
      document.getElementById("cartHasItems").style.display = "none";
      document.getElementById("cartEmptyState").style.display = "block";
      return;
    }

    document.getElementById("cartHasItems").style.display = "block";
    document.getElementById("cartEmptyState").style.display = "none";

    col.innerHTML = cart.map((item, i) => `
      <div class="cart-item">
        <img src="${item.img || 'assets/images/category/mollys-product.jpg'}" alt="${item.name}">
        <div class="cart-item-info">
          <h4>${item.name}</h4>
          <div class="cart-item-meta">${item.division === "msamuels" ? "M. Samuels" : "Mollys"}${item.color ? ` &nbsp;·&nbsp; ${item.color}` : ""}${item.size ? ` &nbsp;·&nbsp; ${item.size}` : ""}</div>
          <div class="cart-item-qty">
            <div class="cart-qty-stepper">
              <button class="qty-minus" data-index="${i}" type="button" aria-label="Decrease">−</button>
              <span>${item.qty}</span>
              <button class="qty-plus" data-index="${i}" type="button" aria-label="Increase">+</button>
            </div>
            <button class="cart-remove" data-index="${i}" type="button">Remove</button>
          </div>
        </div>
        <div class="cart-item-price">₦${(item.price * item.qty).toLocaleString()}</div>
      </div>`).join("");

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    document.getElementById("cartSubtotal").textContent = `₦${subtotal.toLocaleString()}`;
    document.getElementById("cartTotal").textContent = `₦${(subtotal + deliveryFee).toLocaleString()}`;

    col.querySelectorAll(".qty-minus").forEach((btn) => {
      btn.addEventListener("click", () => {
        const cart = getCart();
        const i = parseInt(btn.dataset.index, 10);
        updateCartQty(i, cart[i].qty - 1);
        render();
      });
    });
    col.querySelectorAll(".qty-plus").forEach((btn) => {
      btn.addEventListener("click", () => {
        const cart = getCart();
        const i = parseInt(btn.dataset.index, 10);
        updateCartQty(i, cart[i].qty + 1);
        render();
      });
    });
    col.querySelectorAll(".cart-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        removeFromCart(parseInt(btn.dataset.index, 10));
        render();
      });
    });
  }

  render();
});
