// ============================================
// ADMIN PRODUCTS LIST — real data, real actions
// ============================================

let allProducts = [];

document.addEventListener("adminReady", async () => {
  await loadProducts();
  document.getElementById("apSearch").addEventListener("input", render);
  document.getElementById("apDivisionFilter").addEventListener("change", render);
});

async function loadProducts() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("*, categories(name)")
    .order("created_at", { ascending: false });

  if (error) {
    document.getElementById("apProductRows").innerHTML =
      `<tr><td colspan="6" style="text-align:center;color:#B23A3A;padding:30px;">Couldn't load products.</td></tr>`;
    console.error(error);
    return;
  }
  allProducts = data || [];
  render();
}

function render() {
  const search = document.getElementById("apSearch").value.toLowerCase();
  const division = document.getElementById("apDivisionFilter").value;
  const tbody = document.getElementById("apProductRows");

  const filtered = allProducts.filter((p) => {
    if (division && p.division !== division) return false;
    if (search && !p.name.toLowerCase().includes(search)) return false;
    return true;
  });

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--ink-soft);padding:30px;">No products found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((p) => {
    const statusPill = p.status === "discontinued"
      ? `<span class="admin-status-pill low">Discontinued</span>`
      : `<span class="admin-status-pill active">Active</span>`;
    const divisionLabel = p.division === "msamuels" ? "M. Samuels" : "Mollys";
    return `
      <tr>
        <td>${p.name}${p.categories ? `<div style="font-size:0.76rem;color:var(--ink-soft);">${p.categories.name}</div>` : ""}</td>
        <td>${divisionLabel}</td>
        <td>₦${Number(p.price_ngn).toLocaleString()}</td>
        <td>${p.size_type === "onesize" ? p.stock_qty : "per size"}</td>
        <td>${statusPill}</td>
        <td class="admin-table-actions">
          <a href="admin-product-form.html?id=${p.id}" aria-label="Edit"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" stroke-width="1.5"/></svg></a>
          <button class="ap-toggle-status" data-id="${p.id}" data-status="${p.status || 'active'}" aria-label="${p.status === 'discontinued' ? 'Reactivate' : 'Discontinue'}">
            ${p.status === "discontinued"
              ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 12l5 5L20 6" stroke="currentColor" stroke-width="1.5"/></svg>`
              : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="currentColor" stroke-width="1.5"/></svg>`}
          </button>
        </td>
      </tr>`;
  }).join("");

  document.querySelectorAll(".ap-toggle-status").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const isDiscontinued = btn.dataset.status === "discontinued";
      const newStatus = isDiscontinued ? "active" : "discontinued";
      const confirmMsg = isDiscontinued
        ? "Make this product visible on the site again?"
        : "Discontinue this product? It will disappear from the live shop, but past orders that included it are kept intact.";
      if (!confirm(confirmMsg)) return;

      const { error } = await supabaseClient.from("products").update({ status: newStatus }).eq("id", id);
      if (error) { alert("Something went wrong — please try again."); console.error(error); return; }
      await loadProducts();
    });
  });
}
