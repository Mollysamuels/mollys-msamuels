 // ============================================
// M. SAMUELS LANDING PAGE — MEGA MENU LOGIC
// Categories are rendered from data below, using a small
// shared set of placeholder line-icons. Swap the ICONS paths
// for real Zeco-style illustrations later — nothing else
// needs to change.
// ============================================

const ICONS = {
  jacket:  '<path d="M10 8 L16 5 L20 7 L24 5 L30 8 L30 16 L26 14 L26 34 L14 34 L14 14 L10 16 Z"/><line x1="20" y1="10" x2="20" y2="30"/>',
  shirt:   '<path d="M12 7 L17 5 L20 7 L23 5 L28 7 L26 13 L23 11 L23 34 L17 34 L17 11 L14 13 Z"/>',
  trouser: '<path d="M13 6 H27 L26 34 H21 L20 16 L19 34 H14 Z"/>',
  shorts:  '<path d="M13 6 H27 L26 22 H21 L20 16 L19 22 H14 Z"/>',
  skirt:   '<path d="M13 8 H27 L30 32 H10 Z"/><line x1="20" y1="8" x2="20" y2="20"/>',
  dress:   '<path d="M15 6 L20 4 L25 6 L23 14 L28 32 H12 L17 14 Z"/>',
  sock:    '<path d="M16 4 H24 V22 L28 34 H18 L16 26 Z"/>',
  shoe:    '<path d="M6 28 H22 L30 24 Q34 24 34 28 V30 H6 Z"/><path d="M6 28 V16 L14 14 L16 20 L22 22 Z"/>',
  bag:     '<rect x="8" y="14" width="24" height="20" rx="2"/><path d="M14 14 V10 Q14 5 20 5 Q26 5 26 10 V14"/>',
  tie:     '<path d="M17 6 H23 L21 12 L26 30 L20 36 L14 30 L19 12 Z"/>',
  cap:     '<path d="M6 22 Q20 8 34 22 L34 24 H6 Z"/><path d="M34 22 Q40 22 40 26 Q40 28 34 27"/>',
  bottle:  '<rect x="15" y="10" width="10" height="24" rx="2"/><path d="M17 10 V6 H23 V10"/>',
  generic: '<rect x="8" y="8" width="24" height="24" rx="3"/>',
};

const TAB_ICONS = {
  boys:        '<circle cx="20" cy="10" r="4"/><path d="M12 34 L14 18 H26 L28 34"/><line x1="20" y1="18" x2="20" y2="30"/>',
  girls:       '<circle cx="20" cy="9" r="4"/><path d="M13 34 L16 15 H24 L27 34 L20 28 Z"/>',
  accessories: ICONS.bag,
  bespoke:     '<circle cx="10" cy="28" r="3"/><circle cx="10" cy="12" r="3"/><line x1="13" y1="14" x2="30" y2="30"/><line x1="13" y1="26" x2="30" y2="10"/>',
};

const CATEGORY_DATA = {
  boys: [
    ["Unisex Blazers", "jacket"], ["Boys Shirts", "shirt"], ["Boys Trousers & Shorts", "trouser"],
    ["T-Shirts & Polo Shirts", "shirt"], ["Sweatshirts & Bottoms", "jacket"], ["Knitwear & Fleeces", "jacket"],
    ["PE Shorts", "shorts"], ["Boys Swimwear", "dress"], ["Socks & Sport Socks", "sock"],
    ["Jackets & Coats", "jacket"], ["Rugby Jerseys", "shirt"],
  ],
  girls: [
    ["Girls Blazers", "jacket"], ["Blouses", "shirt"], ["T-Shirts & Polo Shirts", "shirt"],
    ["Knitwear & Fleeces", "jacket"], ["Sweatshirts & Bottoms", "jacket"], ["Skirts & Pinafores", "skirt"],
    ["Tartans", "skirt"], ["Girls Trousers", "trouser"], ["Socks & Tights", "sock"],
    ["Girls Swimwear", "dress"], ["Summer Dresses", "dress"], ["PE Shorts & Skorts", "shorts"],
    ["Leggings & Leotards", "trouser"], ["Jackets & Coats", "jacket"], ["Multicultural Clothing", "dress"],
  ],
  accessories: [
    ["School Bags", "bag"], ["Socks & Sport Socks", "sock"], ["Plimsolls", "shoe"],
    ["Shin Guards & Gum Shields", "generic"], ["Swimwear Accessories", "generic"], ["Hair Accessories", "generic"],
    ["Aprons & Lab Coats", "jacket"], ["Caps", "cap"], ["Hats & Scarves", "cap"],
    ["Name Tab Kit & Hem Web Kit", "generic"], ["Ties", "tie"], ["Water Bottles", "bottle"],
  ],
  bespoke: [
    ["Bespoke Blazers & Jackets", "jacket"], ["Bespoke Shirts & Blouses", "shirt"],
    ["Bespoke Knitwear", "jacket"], ["Bespoke Tartan Skirts & Pinafores", "skirt"],
  ],
};

function slugify(name) {
  return name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function renderCategoryGrids() {
  Object.keys(CATEGORY_DATA).forEach((tabKey) => {
    const panel = document.querySelector(`.ms-mega-panel[data-panel="${tabKey}"] .ms-cat-grid`);
    if (!panel) return;
    panel.innerHTML = CATEGORY_DATA[tabKey].map(([name, icon]) => `
      <a class="ms-cat-item" href="category.html?category=${slugify(name)}">
        <svg viewBox="0 0 40 40">${ICONS[icon] || ICONS.generic}</svg>
        <span>${name}</span>
      </a>
    `).join("");
  });

  document.querySelectorAll(".ms-tab").forEach((tab) => {
    const key = tab.dataset.tab;
    const iconEl = tab.querySelector("svg");
    if (iconEl && TAB_ICONS[key]) iconEl.innerHTML = TAB_ICONS[key];
  });
}

document.addEventListener("DOMContentLoaded", function () {
  renderCategoryGrids();

  const overlay = document.querySelector(".ms-mega-overlay");
  const openBtn = document.querySelector(".ms-menu-btn");
  const closeBtn = document.querySelector(".ms-mega-close");

  if (openBtn && overlay) {
    openBtn.addEventListener("click", () => overlay.classList.add("open"));
  }
  if (closeBtn && overlay) {
    closeBtn.addEventListener("click", () => overlay.classList.remove("open"));
  }
  // Clicking the dimmed background (outside the side panel) also closes it
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.classList.remove("open");
    });
  }

  const tabs = document.querySelectorAll(".ms-tab");
  const panels = document.querySelectorAll(".ms-mega-panel");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;
      tabs.forEach((t) => t.classList.toggle("active", t === tab));
      panels.forEach((p) => p.classList.toggle("active", p.dataset.panel === target));
    });
  });
});
