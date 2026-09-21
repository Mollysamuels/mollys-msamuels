document.addEventListener("DOMContentLoaded", function () {

  /* ---------- Add / remove colour rows ---------- */
  const addColorBtn = document.getElementById("apfAddColor");
  const colorList = document.getElementById("apfColorList");
  const colorTemplate = document.getElementById("apfColorTemplate");

  if (addColorBtn && colorList && colorTemplate) {
    addColorBtn.addEventListener("click", () => {
      const clone = colorTemplate.content.cloneNode(true);
      const row = clone.querySelector(".apf-color-row");
      row.querySelector(".apf-remove-color").addEventListener("click", () => row.remove());
      colorList.appendChild(clone);
    });
  }

  /* ---------- Dynamic size grid based on selected size type ---------- */
  const sizeType = document.getElementById("apfSizeType");
  const sizeGrid = document.getElementById("apfSizeGrid");

  const SIZE_SETS = {
    clothing: ["S", "M", "L", "XL", "XXL"],
    chest: ["22", "24", "26", "28", "30", "32", "34", "36", "38", "40", "42", "44", "46", "48", "50"],
    collar: ["11", "11½", "12", "12½", "13", "13½", "14", "14½", "15", "15½", "16", "16½", "17"],
    age: ["3/4", "5/6", "7/8", "9/10", "11/12", "13/14", "15/16", "17/18"],
    shoe: ["10", "11", "12", "13", "1", "2", "3", "4", "5", "6"],
    onesize: ["One Size"],
  };

  function renderSizeGrid() {
    const sizes = SIZE_SETS[sizeType.value] || [];
    sizeGrid.innerHTML = sizes.map((s) => `
      <label class="apf-size-chip">
        <input type="checkbox" checked>${s}
      </label>
    `).join("");

    sizeGrid.querySelectorAll(".apf-size-chip").forEach((chip) => {
      const box = chip.querySelector("input");
      const update = () => chip.classList.toggle("sold-out", !box.checked);
      box.addEventListener("change", update);
      update();
    });
  }

  if (sizeType && sizeGrid) {
    sizeType.addEventListener("change", renderSizeGrid);
    renderSizeGrid();
  }

});
