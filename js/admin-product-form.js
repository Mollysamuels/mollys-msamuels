// ============================================
// ADMIN PRODUCT FORM — real create + edit, backed by Supabase
// ============================================

const SIZE_SETS = {
  clothing: ["S", "M", "L", "XL", "XXL"],
  chest: ["22", "24", "26", "28", "30", "32", "34", "36", "38", "40", "42", "44", "46", "48", "50"],
  collar: ["11", "11½", "12", "12½", "13", "13½", "14", "14½", "15", "15½", "16", "16½", "17"],
  age: ["3/4", "5/6", "7/8", "9/10", "11/12", "13/14", "15/16", "17/18"],
  shoe: ["10", "11", "12", "13", "1", "2", "3", "4", "5", "6"],
  onesize: ["One Size"],
};

const params = new URLSearchParams(window.location.search);
let editingId = params.get("id");

let categoriesCache = [];

document.addEventListener("adminReady", async (e) => {
  const admin = e.detail;

  if (!admin.can_edit_pricing) {
    ["apfPriceNgn"].forEach((id) => {
      const el = document.getElementById(id);
      el.disabled = true;
      el.placeholder = "Only the pricing-authorised admin can edit this";
    });
  }

  ApfPhotos.mount(document.getElementById("apfPhotos"));
  await loadCategories();
  wireDivisionChange();
  wireSizeTypeChange();
  wireColorRows();

  if (editingId) {
    document.getElementById("apfFormTitle").textContent = "Edit Product";
    document.getElementById("apfSaveBtn").textContent = "Save Changes";
    await loadExistingProduct(editingId);
  } else {
    renderSizeGrid();
  }

  document.getElementById("apfSaveBtn").addEventListener("click", saveProduct);
});

async function loadCategories() {
  const { data, error } = await supabaseClient.from("categories").select("id, name, division").order("name");
  if (error) { console.error("Failed to load categories:", error); return; }
  categoriesCache = data || [];
  populateCategoryDropdown();
}

function populateCategoryDropdown() {
  const division = document.getElementById("apfDivision").value;
  const select = document.getElementById("apfCategory");
  const matching = categoriesCache.filter((c) => c.division === division);
  if (!matching.length) {
    select.innerHTML = `<option value="">No categories yet for this division — add one in Categories first</option>`;
    return;
  }
  select.innerHTML = matching.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
}

function wireDivisionChange() {
  document.getElementById("apfDivision").addEventListener("change", populateCategoryDropdown);
}

function wireSizeTypeChange() {
  document.getElementById("apfSizeType").addEventListener("change", () => renderSizeGrid());
}

function renderSizeGrid(preservedSizes) {
  const sizeType = document.getElementById("apfSizeType").value;
  const grid = document.getElementById("apfSizeGrid");
  const stockQtyField = document.getElementById("apfStockQtyField");
  stockQtyField.style.display = sizeType === "onesize" ? "" : "none";

  const sizes = SIZE_SETS[sizeType] || [];
  grid.innerHTML = sizes.map((label) => {
    const existing = preservedSizes && preservedSizes.find((s) => s.size_label === label);
    const checked = existing ? existing.in_stock : true;
    return `<label class="apf-size-chip"><input type="checkbox" data-label="${label}" ${checked ? "checked" : ""}>${label}</label>`;
  }).join("");

  grid.querySelectorAll(".apf-size-chip").forEach((chip) => {
    const box = chip.querySelector("input");
    const update = () => chip.classList.toggle("sold-out", !box.checked);
    box.addEventListener("change", update);
    update();
  });
}

function wireColorRows() {
  const addBtn = document.getElementById("apfAddColor");
  const list = document.getElementById("apfColorList");
  const template = document.getElementById("apfColorTemplate");

  addBtn.addEventListener("click", () => addColorRow());

  function addColorRow(name, hex) {
    const clone = template.content.cloneNode(true);
    const row = clone.querySelector(".apf-color-row");
    row.querySelector(".apf-color-name").value = name || "";
    row.querySelector(".apf-color-hex").value = hex || "#1B2A4A";
    row.querySelector(".apf-remove-color").addEventListener("click", () => row.remove());
    list.appendChild(clone);
  }
  window._apfAddColorRow = addColorRow;
}

async function loadExistingProduct(id) {
  const { data, error } = await supabaseClient
    .from("products")
    .select("*, product_colors(*), product_sizes(*)")
    .eq("id", id)
    .single();

  if (error || !data) {
    const errorEl = document.getElementById("apfSaveError");
    errorEl.textContent = "Could not load this product — it may have been removed.";
    errorEl.style.display = "block";
    return;
  }

  document.getElementById("apfName").value = data.name || "";
  document.getElementById("apfDescription").value = data.description || "";
  document.getElementById("apfDetails").value = data.details || "";
  document.getElementById("apfDivision").value = data.division;
  populateCategoryDropdown();
  document.getElementById("apfCategory").value = data.category_id || "";
  document.getElementById("apfPriceNgn").value = data.price_ngn;
  document.getElementById("apfDeliveryFee").value = data.delivery_fee_ngn;
  document.getElementById("apfStockQty").value = data.stock_qty;
  document.getElementById("apfFeatured").checked = data.is_featured;
  document.getElementById("apfNew").checked = data.is_new;
  document.getElementById("apfSizeType").value = data.size_type;

  (data.product_colors || []).forEach((c) => window._apfAddColorRow(c.color_name, c.hex_code));
  renderSizeGrid(data.product_sizes || []);
  ApfPhotos.setExisting(data.main_image_url, data.alt_image_url);
}

async function saveProduct() {
  const errorEl = document.getElementById("apfSaveError");
  errorEl.style.display = "none";
  const btn = document.getElementById("apfSaveBtn");
  btn.disabled = true;
  btn.textContent = "Saving...";

  const productData = {
    name: document.getElementById("apfName").value.trim(),
    description: document.getElementById("apfDescription").value.trim(),
    details: document.getElementById("apfDetails").value.trim(),
    division: document.getElementById("apfDivision").value,
    category_id: document.getElementById("apfCategory").value || null,
    price_ngn: parseFloat(document.getElementById("apfPriceNgn").value) || 0,
    delivery_fee_ngn: parseFloat(document.getElementById("apfDeliveryFee").value) || 2500,
    stock_qty: parseInt(document.getElementById("apfStockQty").value, 10) || 0,
    is_featured: document.getElementById("apfFeatured").checked,
    is_new: document.getElementById("apfNew").checked,
    size_type: document.getElementById("apfSizeType").value,
  };

  if (!productData.name) {
    errorEl.textContent = "Product name is required.";
    errorEl.style.display = "block";
    btn.disabled = false; btn.textContent = "Publish Product";
    return;
  }

  let productId = editingId;

  if (editingId) {
    const { error } = await supabaseClient.from("products").update(productData).eq("id", editingId);
    if (error) return handleSaveError(error, btn);
    await supabaseClient.from("product_colors").delete().eq("product_id", editingId);
    await supabaseClient.from("product_sizes").delete().eq("product_id", editingId);
  } else {
    const { data, error } = await supabaseClient.from("products").insert(productData).select("id").single();
    if (error) return handleSaveError(error, btn);
    productId = data.id;
  }

  // Colours are just name + swatch — never images. Since productData never
  // includes main_image_url/alt_image_url, this save can NEVER touch a
  // product's photo, no matter what else gets edited here — that's what
  // actually makes the old "editing wipes the image" bug impossible now,
  // rather than something to carefully preserve.
  const colorRows = Array.from(document.querySelectorAll(".apf-color-row")).map((row) => ({
    product_id: productId,
    color_name: row.querySelector(".apf-color-name").value.trim(),
    hex_code: row.querySelector(".apf-color-hex").value,
  })).filter((c) => c.color_name);
  if (colorRows.length) await supabaseClient.from("product_colors").insert(colorRows);

  const sizeRows = Array.from(document.querySelectorAll(".apf-size-chip")).map((chip) => ({
    product_id: productId,
    size_label: chip.querySelector("input").dataset.label,
    in_stock: chip.querySelector("input").checked,
  }));
  if (sizeRows.length) await supabaseClient.from("product_sizes").insert(sizeRows);

  // Photos: uploaded only after the product itself is safely saved.
  if (ApfPhotos.hasChanges()) {
    const ok = await savePhotos(productId, btn);
    if (!ok) return;
  }

  window.location.href = "admin-products.html";
}

async function savePhotos(productId, btn) {
  const errorEl = document.getElementById("apfSaveError");
  let result = null;
  try {
    result = await ApfPhotos.upload(supabaseClient, productId, (t) => { btn.textContent = t; });
    btn.textContent = "Saving photos…";
    const { error } = await supabaseClient.from("products").update(result.fields).eq("id", productId);
    if (error) throw error;
    await ApfPhotos.removeFiles(supabaseClient, result.oldFiles); // old photos no longer used
    return true;
  } catch (err) {
    console.error("Photo upload failed:", err);
    if (result) await ApfPhotos.removeFiles(supabaseClient, result.newFiles);
    // The product WAS saved. Switch this page to "edit" so trying again
    // updates the same product instead of creating a second one.
    if (!editingId) {
      editingId = productId;
      history.replaceState(null, "", `admin-product-form.html?id=${encodeURIComponent(productId)}`);
      document.getElementById("apfFormTitle").textContent = "Edit Product";
    }
    const msg = String((err && err.message) || "");
    errorEl.textContent = /row-level security|not authorized|403|Unauthorized/i.test(msg)
      ? "The product was saved, but the photo wasn't: this account isn't allowed to upload photos. (Has the photo storage SQL been run in Supabase?)"
      : /bucket not found/i.test(msg)
        ? "The product was saved, but the photo wasn't: the photo storage hasn't been set up yet. Run 01-product-photos-storage.sql in Supabase, then save again."
        : "The product was saved, but the photo didn't upload. Check your connection and press Save Changes to try again.";
    errorEl.style.display = "block";
    btn.disabled = false;
    btn.textContent = "Save Changes";
    return false;
  }
}

function handleSaveError(error, btn) {
  const errorEl = document.getElementById("apfSaveError");
  console.error("Save failed:", error);
  errorEl.textContent = error.message.includes("row-level security")
    ? "You don't have permission to save price changes — only the pricing-authorised admin can."
    : "Something went wrong saving this product. Please try again.";
  errorEl.style.display = "block";
  btn.disabled = false;
  btn.textContent = "Publish Product";
}
