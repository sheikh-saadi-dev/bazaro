import { requireAdmin } from "./admin-auth.js";
import { mountAdminLayout } from "./admin-layout.js";
import {
  db, collection, getDocs, getDoc, doc, addDoc, updateDoc, serverTimestamp
} from "../../js/firebase.js";
import { escapeHtml, toast } from "../../js/utils.js";
import { openMediaPicker } from "./media-picker.js";

await requireAdmin();
mountAdminLayout("products.html");

const params = new URLSearchParams(location.search);
const editId = params.get("id");
let categories = [];
let images = [];
let variantGroups = []; // [{ name, type: 'size'|'color'|'custom', options: string[] | {value,hex}[] }]
let bannerImage = "";

if (editId) {
  document.getElementById("page-title").textContent = "Edit Product — Bazaro Admin";
  document.getElementById("form-heading").textContent = "Edit product";
}

async function loadCategories() {
  const snap = await getDocs(collection(db, "categories"));
  categories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  document.getElementById("p-category").innerHTML = categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("") || `<option value="">Add a category first</option>`;
}

function renderVariants() {
  const host = document.getElementById("variants-host");
  host.innerHTML = variantGroups.map((g, gi) => {
    const optionsText = g.type === "color"
      ? g.options.map(o => `${o.value}:${o.hex}`).join(", ")
      : g.options.join(", ");
    return `
    <div class="variant-row" data-gi="${gi}">
      <div class="form-grid">
        <div class="field"><label>Preset</label>
          <select class="vg-preset">
            <option value="size" ${g.type === "size" ? "selected" : ""}>Size</option>
            <option value="color" ${g.type === "color" ? "selected" : ""}>Color</option>
            <option value="custom" ${g.type === "custom" ? "selected" : ""}>Custom</option>
          </select>
        </div>
        <div class="field"><label>Group name</label><input class="vg-name" value="${escapeHtml(g.name)}" ${g.type !== "custom" ? "readonly" : ""}></div>
      </div>
      <div class="field" style="margin-top:8px;">
        <label>${g.type === "color" ? "Options — Name:hex, comma-separated (e.g. Charcoal Gray:#3b3b3f, Black:#111111)" : "Options (comma-separated)"}</label>
        <input class="vg-options" value="${escapeHtml(optionsText)}">
      </div>
      <button type="button" class="action-link danger" data-remove-group="${gi}" style="margin-top:6px;">Remove group</button>
    </div>
  `;
  }).join("");

  host.querySelectorAll(".variant-row").forEach((row, i) => {
    const presetSel = row.querySelector(".vg-preset");
    const nameInput = row.querySelector(".vg-name");
    const optionsInput = row.querySelector(".vg-options");

    presetSel.addEventListener("change", () => {
      variantGroups[i].type = presetSel.value;
      if (presetSel.value === "size") variantGroups[i].name = "Size";
      if (presetSel.value === "color") variantGroups[i].name = "Color";
      variantGroups[i].options = [];
      renderVariants();
    });
    nameInput.addEventListener("input", () => { variantGroups[i].name = nameInput.value; });
    optionsInput.addEventListener("input", () => {
      const raw = optionsInput.value.split(",").map(s => s.trim()).filter(Boolean);
      if (variantGroups[i].type === "color") {
        variantGroups[i].options = raw.map(pair => {
          const [value, hex] = pair.split(":").map(s => s.trim());
          return { value: value || "", hex: hex || "#cccccc" };
        });
      } else {
        variantGroups[i].options = raw;
      }
    });
    row.querySelector("[data-remove-group]").addEventListener("click", () => { variantGroups.splice(i, 1); renderVariants(); });
  });
}
document.getElementById("add-variant-btn").addEventListener("click", () => {
  variantGroups.push({ name: "Size", type: "size", options: [] });
  renderVariants();
});

function renderImagePreview() {
  document.getElementById("img-preview").innerHTML = images.map((src, i) => `<img src="${src}" data-i="${i}" title="Click to remove">`).join("");
  document.getElementById("img-preview").querySelectorAll("img").forEach(img => img.addEventListener("click", () => { images.splice(+img.dataset.i, 1); renderImagePreview(); }));
}
function renderBannerPreview() {
  document.getElementById("banner-preview").innerHTML = bannerImage
    ? `<img src="${bannerImage}" style="width:100px;height:60px;object-fit:cover;border-radius:8px;cursor:pointer;" title="Click to remove">`
    : "";
  const img = document.getElementById("banner-preview").querySelector("img");
  if (img) img.addEventListener("click", () => { bannerImage = ""; renderBannerPreview(); });
}

document.getElementById("p-select-image-btn").addEventListener("click", () => {
  openMediaPicker((url) => { images.push(url); renderImagePreview(); });
});
document.getElementById("p-select-banner-btn").addEventListener("click", () => {
  openMediaPicker((url) => { bannerImage = url; renderBannerPreview(); });
});

async function loadExisting() {
  if (!editId) return;
  const snap = await getDoc(doc(db, "products", editId));
  if (!snap.exists()) { toast("Product not found.", "err"); window.location.href = "products.html"; return; }
  const p = snap.data();
  document.getElementById("p-name").value = p.name || "";
  document.getElementById("p-desc").value = p.description || "";
  document.getElementById("p-category").value = p.categoryId || "";
  document.getElementById("p-stock").value = p.stock ?? 0;
  document.getElementById("p-price").value = p.price ?? "";
  document.getElementById("p-discount").value = p.discountPrice ?? "";
  document.getElementById("p-top-product").checked = !!p.isTopProduct;
  document.getElementById("p-top-sale").checked = !!p.isTopSale;
  document.getElementById("p-status").value = p.status || "draft";
  document.getElementById("p-rating").value = p.rating ?? "";
  document.getElementById("p-review-count").value = p.reviewCount ?? "";
  document.getElementById("p-materials").value = p.materials || "";
  document.getElementById("p-sizefit").value = p.sizeFit || "";
  document.getElementById("p-shipping").value = p.shippingReturns || "";
  images = p.images && p.images.length ? [...p.images] : (p.imageUrl ? [p.imageUrl] : []);
  bannerImage = p.detailImage || "";
  // Backward-compatible: old variants had plain string options only.
  variantGroups = p.variants ? p.variants.map(v => ({
    name: v.name,
    type: v.type || (v.name?.toLowerCase() === "size" ? "size" : v.name?.toLowerCase() === "color" ? "color" : "custom"),
    options: v.options ? [...v.options] : []
  })) : [];
  renderImagePreview();
  renderBannerPreview();
  renderVariants();
}

document.getElementById("product-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!images.length) { toast("Add at least one product image.", "err"); return; }

  const categoryId = document.getElementById("p-category").value;
  const category = categories.find(c => c.id === categoryId);
  const validVariants = variantGroups.filter(g => g.name && g.options.length);

  const ratingVal = document.getElementById("p-rating").value;
  const reviewVal = document.getElementById("p-review-count").value;

  const data = {
    name: document.getElementById("p-name").value.trim(),
    description: document.getElementById("p-desc").value.trim(),
    categoryId, categoryName: category ? category.name : "",
    price: Number(document.getElementById("p-price").value) || 0,
    discountPrice: document.getElementById("p-discount").value ? Number(document.getElementById("p-discount").value) : null,
    stock: Number(document.getElementById("p-stock").value) || 0,
    images, imageUrl: images[0],
    detailImage: bannerImage || null,
    variants: validVariants,
    isTopProduct: document.getElementById("p-top-product").checked,
    isTopSale: document.getElementById("p-top-sale").checked,
    status: document.getElementById("p-status").value,
    rating: ratingVal ? Number(ratingVal) : null,
    reviewCount: reviewVal ? Number(reviewVal) : null,
    materials: document.getElementById("p-materials").value.trim(),
    sizeFit: document.getElementById("p-sizefit").value.trim(),
    shippingReturns: document.getElementById("p-shipping").value.trim(),
    updatedAt: serverTimestamp()
  };

  try {
    if (editId) {
      await updateDoc(doc(db, "products", editId), data);
      toast("Product updated successfully.");
    } else {
      await addDoc(collection(db, "products"), { ...data, createdAt: serverTimestamp() });
      toast("Product added successfully.");
    }
    window.location.href = "products.html";
  } catch (err) {
    toast("Something went wrong saving the product.", "err");
  }
});

async function init() {
  await loadCategories();
  await loadExisting();
}
init();
