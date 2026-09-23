// ============================================
// SHOP.HTML — all products across both divisions
// Real Supabase products are fetched first; these hardcoded ones fill in
// for everything not in the database yet. The School Blazer placeholder
// below is intentionally removed — it's now the real Supabase product.
// ============================================

const SHOP_PRODUCTS = [
  { name: "Emerald Wrap Gown", price: 26500, division: "mollys", category: "gowns", img: "assets/images/mollys/prod-gown-1.jpg" },
  { name: "Structured Crossbody Bag", price: 19500, division: "mollys", category: "bags", img: "assets/images/mollys/prod-bag-1.jpg" },
  { name: "Ankle-Strap Heels", price: 17800, division: "mollys", category: "heels", img: "assets/images/mollys/prod-heels-1.jpg" },
  { name: "Layered Gold Necklace", price: 10500, division: "mollys", category: "jewellery", img: "assets/images/mollys/prod-necklace-1.jpg" },
  { name: "Woven Slide Sandals", price: 13200, division: "mollys", category: "sandals", img: "assets/images/mollys/prod-sandals-1.jpg" },
  { name: "Linen Wrap Top", price: 12800, division: "mollys", category: "tops", img: "assets/images/mollys/prod-top-1.jpg" },
  { name: "Gold Hoop Earrings", price: 6200, division: "mollys", category: "jewellery", img: "assets/images/mollys/prod-earrings-1.jpg" },
  { name: "Boys Short Sleeve Shirt", price: 9800, division: "msamuels", category: "boys-shirts", img: "assets/images/msamuels/prod-labcoat-1.jpg" },
  { name: "Classic Lab Coat", price: 19500, division: "msamuels", category: "aprons-and-lab-coats", img: "assets/images/msamuels/prod-labcoat-1.jpg" },
  { name: "Zip Front Pinafore", price: 16500, division: "msamuels", category: "skirts-and-pinafores", img: "assets/images/msamuels/prod-uniform-1.jpg" },
  { name: "Varsity Jacket", price: 21500, division: "msamuels", category: "jackets-and-coats", img: "assets/images/msamuels/prod-sportswear-1.jpg" },
];

async function fetchRealProducts() {
  try {
    const { data, error } = await supabaseClient
      .from("products")
      .select("*, categories(slug), product_colors(*)")
      .neq("status", "discontinued");
    if (error || !data) return [];
    return data.map((p) => {
      const firstColor = (p.product_colors && p.product_colors[0]) || null;
      const fallbackImg = p.division === "msamuels" ? "assets/images/category/msamuels-product.jpg" : "assets/images/category/mollys-product.jpg";
      return {
        name: p.name, price: p.price_ngn, division: p.division,
        category: (p.categories && p.categories.slug) || "",
        img: (firstColor && firstColor.front_image_url) || fallbackImg,
        linkOverride: `product.html?id=${p.id}`,
      };
    });
  } catch (e) {
    console.error("Shop: Supabase fetch failed, using placeholders only:", e);
    return [];
  }
}

function renderShopCard(p, index) {
  const params = new URLSearchParams({
    item: `shop-${index}`,
    name: p.name, price: p.price, division: p.division, category: p.category, img1: p.img,
  });
  const link = p.linkOverride || `product.html?${params.toString()}`;
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

document.addEventListener("DOMContentLoaded", async function () {
  const grid = document.getElementById("shopGrid");
  if (!grid) return;

  const realProducts = await fetchRealProducts();
  const ALL_PRODUCTS = [...realProducts, ...SHOP_PRODUCTS]; // real products shown first

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

  let currentDivision = "mollys";
  function apply() {
    let list = ALL_PRODUCTS.filter((p) => p.division === currentDivision);
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
