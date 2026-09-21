// ============================================
// SHOP.HTML — all products across both divisions
// ============================================

const SHOP_PRODUCTS = [
  { name: "School Blazer", price: 35500, division: "msamuels", category: "unisex-blazers", img: "assets/images/msamuels/prod-blazer-navy-front.svg", isRich: true },
  { name: "Emerald Wrap Gown", price: 26500, division: "mollys", category: "gowns", img: "assets/images/mollys/prod-gown-1.svg" },
  { name: "Structured Crossbody Bag", price: 19500, division: "mollys", category: "bags", img: "assets/images/mollys/prod-bag-1.svg" },
  { name: "Ankle-Strap Heels", price: 17800, division: "mollys", category: "heels", img: "assets/images/mollys/prod-heels-1.svg" },
  { name: "Layered Gold Necklace", price: 10500, division: "mollys", category: "jewellery", img: "assets/images/mollys/prod-necklace-1.svg" },
  { name: "Woven Slide Sandals", price: 13200, division: "mollys", category: "sandals", img: "assets/images/mollys/prod-sandals-1.svg" },
  { name: "Linen Wrap Top", price: 12800, division: "mollys", category: "tops", img: "assets/images/mollys/prod-top-1.svg" },
  { name: "Gold Hoop Earrings", price: 6200, division: "mollys", category: "jewellery", img: "assets/images/mollys/prod-earrings-1.svg" },
  { name: "Boys Short Sleeve Shirt", price: 9800, division: "msamuels", category: "boys-shirts", img: "assets/images/msamuels/prod-labcoat-1.svg" },
  { name: "Classic Lab Coat", price: 19500, division: "msamuels", category: "aprons-and-lab-coats", img: "assets/images/msamuels/prod-labcoat-1.svg" },
  { name: "Zip Front Pinafore", price: 16500, division: "msamuels", category: "skirts-and-pinafores", img: "assets/images/msamuels/prod-uniform-1.svg" },
  { name: "Varsity Jacket", price: 21500, division: "msamuels", category: "jackets-and-coats", img: "assets/images/msamuels/prod-sportswear-1.svg" },
];

function renderShopCard(p, index) {
  const params = new URLSearchParams({
    item: p.isRich ? "blazer-classic" : `shop-${index}`,
    name: p.name, price: p.price, division: p.division, category: p.category, img1: p.img,
  });
  const link = p.isRich ? "product.html?item=blazer-classic" : `product.html?${params.toString()}`;
  return `
    <div class="product-card" data-division="${p.division}" data-price="${p.price}">
      <div class="product-media">
        <button class="wish-btn" aria-label="Add to wishlist"><svg viewBox="0 0 24 24" fill="none"><path d="M12 20s-7.5-4.7-9.6-9.1C1 7.6 2.7 4.5 6 4c2-.3 3.6.7 6 3 2.4-2.3 4-3.3 6-3 3.3.5 5 3.6 3.6 6.9C19.5 15.3 12 20 12 20z" stroke="currentColor" stroke-width="1.5"/></svg></button>
        <a href="${link}"><img class="main" src="${p.img}" alt="${p.name}"><img class="alt" src="${p.img}" alt=""></a>
        <button class="quick-add">Quick add</button>
      </div>
      <div class="product-info">
        <a href="${link}" style="color:inherit;"><h4>${p.name}</h4></a>
        <div class="product-price"><span class="now">₦${p.price.toLocaleString()}</span></div>
      </div>
    </div>`;
}

document.addEventListener("DOMContentLoaded", function () {
  const grid = document.getElementById("shopGrid");
  if (!grid) return;

  function render(list) {
    grid.innerHTML = list.map(renderShopCard).join("");
    document.getElementById("shopCount").textContent = `${list.length} products`;
    grid.querySelectorAll(".quick-add").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const toast = document.querySelector(".toast");
        if (toast) { toast.querySelector("span").textContent = "Added to cart"; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 2400); }
        const badge = document.querySelector(".cart-badge");
        if (badge) badge.textContent = parseInt(badge.textContent || "0", 10) + 1;
      });
    });
    grid.querySelectorAll(".wish-btn").forEach((btn) => btn.addEventListener("click", (e) => { e.preventDefault(); btn.classList.toggle("active"); }));
  }

  let currentDivision = "all";
  function apply() {
    let list = SHOP_PRODUCTS.filter((p) => currentDivision === "all" || p.division === currentDivision);
    const sortVal = document.getElementById("shopSort").value;
    if (sortVal === "price-low") list = [...list].sort((a, b) => a.price - b.price);
    if (sortVal === "price-high") list = [...list].sort((a, b) => b.price - a.price);
    render(list);
  }

  document.querySelectorAll(".shop-filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".shop-filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentDivision = btn.dataset.division;
      apply();
    });
  });
  document.getElementById("shopSort").addEventListener("change", apply);

  apply();
});
