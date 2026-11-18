// ============================================
// msamuels-slots.js  -  M. Samuels photos that live on GitHub
// --------------------------------------------
// Photos go in:  assets/images/msamuels/
// Names:  <prefix>-<number>-main.jpg   (required)
//         <prefix>-<number>-alt.jpg    (optional hover photo)
// "ref" = the product that already exists on the site; new products copy its
// category, price, delivery fee and sizes. "newFrom" = the first NEW number
// (the existing product counts as number 1, or 1 and 2).
// A photo that is not uploaded simply does not appear - nothing breaks.
// ============================================
window.MS_PHOTO_SLOTS = [
  { prefix: "school-blazer",    name: "School Blazer",       ref: "School Blazer",      catLabel: "School Blazers (boys + girls)", newFrom: 2, from: 1, to: 20 },
  { prefix: "joggers",          name: "Joggers",             ref: "Joggers",            catLabel: "Joggers",                       newFrom: 2, from: 1, to: 20 },
  { prefix: "varsity-jacket",   name: "Varsity Jacket",      ref: "Varsity Jacket",     catLabel: "Jackets & Coats",               newFrom: 2, from: 1, to: 20 },
  { prefix: "sportswear",       name: "Sportswear",          ref: "Sportswear",         catLabel: "Sportswear (boys + girls)",     newFrom: 3, from: 1, to: 20 },
  { prefix: "customised-socks", name: "Customised Socks",    ref: "Customised Socks",   catLabel: "Customised Socks (boys + girls)", newFrom: 2, from: 1, to: 20 },
  { prefix: "pe-short",         name: "PE Short",            ref: "PE Short",           catLabel: "PE Shorts",                     newFrom: 3, from: 1, to: 20 },
  { prefix: "ties",             name: "Tie",                 ref: "Ties",               catLabel: "Ties (boys + girls)",           newFrom: 2, from: 1, to: 20 },
  { prefix: "polo-tshirt",      name: "Polo T-Shirt",        ref: "Polo T-Shirt",       catLabel: "T-Shirts & Polo Shirts",        newFrom: 2, from: 1, to: 20 },
  { prefix: "knitted-cardigan", name: "Knitted Cardigan",    ref: "Knitted Cardigan",   catLabel: "Knitwear & Cardigans",          newFrom: 3, from: 1, to: 20 },
  { prefix: "girls-shirt",      name: "Girls Shirt",         ref: "Girls Shirt",        catLabel: "Girls Shirts",                  newFrom: 2, from: 1, to: 20 },
  { prefix: "girls-blouse",     name: "Girls Blouse",        ref: "Peterpan Blouse",    catLabel: "Girls Blouses",                 newFrom: 3, from: 1, to: 20 },
  { prefix: "girls-skirt",      name: "Girls Skirt",         ref: "Girls Pleat Skirt",  catLabel: "Skirts & Pinafores (skirts only)", newFrom: 6, from: 1, to: 20 }
];
