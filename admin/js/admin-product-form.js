import { requireAdmin } from "./admin-auth.js";
import { mountAdminLayout } from "./admin-layout.js";
import {
  db, storage, collection, getDocs, getDoc, doc, addDoc, updateDoc, serverTimestamp,
  ref, uploadBytes, getDownloadURL
} from "../../js/firebase.js";
import { escapeHtml, toast } from "../../js/utils.js";

await requireAdmin();
mountAdminLayout("products.html");

const params = new URLSearchParams(location.search);
const editId = params.get("id");
let categories = [];
let images = [];
let variantGroups = []; // [{ name, options: [] }]

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
  host.innerHTML = variantGroups.map((g, gi) => `
    <div class="variant-row" data-gi="${gi}">
      <div class="form-grid">
        <div class="field"><label>Group name (e.g. Size)</label><input class="vg-name" value="${escapeHtml(g.name)}"></div>
        <div class="field"><label>Options (comma-separated)</label><input class="vg-options" value="${escapeHtml(g.options.join(", "))}"></div>
      </div>
      <button type="button" class="action-link danger" data-remove-group="${gi}">Remove group</button>
    </div>
  `).join("");
  host.querySelectorAll(".vg-name").forEach((el, i) => el.addEventListener("input", () => variantGroups[i].name = el.value));
  host.querySelectorAll(".vg-options").forEach((el, i) => el.addEventListener("input", () => variantGroups[i].options = el.value.split(",").map(s => s.trim()).filter(Boolean)));
  host.querySelectorAll("[data-remove-group]").forEach(b => b.addEventListener("click", () => { variantGroups.splice(+b.dataset.removeGroup, 1); renderVariants(); }));
}
document.getElementById("add-variant-btn").addEventListener("click", () => { variantGroups.push({ name: "", options: [] }); renderVariants(); });

function renderImagePreview() {
  document.getElementById("img-preview").innerHTML = images.map((src, i) => `<img src="${src}" data-i="${i}" title="Click to remove">`).join("");
  document.getElementById("img-preview").querySelectorAll("img").forEach(img => img.addEventListener("click", () => { images.splice(+img.dataset.i, 1); renderImagePreview(); }));
}

document.getElementById("p-image-url").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); const v = e.target.value.trim(); if (v) { images.push(v); e.target.value = ""; renderImagePreview(); } }
});
document.getElementById("p-image-file").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    toast("Uploading image…");
    const path = `products/${Date.now()}_${file.name}`;
    const sref = ref(storage, path);
    await uploadBytes(sref, file);
    const url = await getDownloadURL(sref);
    images.push(url);
    renderImagePreview();
    toast("Image uploaded.");
  } catch (err) {
    toast("Image upload failed — check Firebase Storage is enabled.", "err");
  }
  e.target.value = "";
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
  images = p.images && p.images.length ? [...p.images] : (p.imageUrl ? [p.imageUrl] : []);
  variantGroups = p.variants ? p.variants.map(v => ({ name: v.name, options: [...v.options] })) : [];
  renderImagePreview();
  renderVariants();
}

document.getElementById("product-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const urlBox = document.getElementById("p-image-url").value.trim();
  if (urlBox) images.push(urlBox);
  if (!images.length) { toast("Add at least one product image.", "err"); return; }

  const categoryId = document.getElementById("p-category").value;
  const category = categories.find(c => c.id === categoryId);
  const validVariants = variantGroups.filter(g => g.name && g.options.length);

  const data = {
    name: document.getElementById("p-name").value.trim(),
    description: document.getElementById("p-desc").value.trim(),
    categoryId, categoryName: category ? category.name : "",
    price: Number(document.getElementById("p-price").value) || 0,
    discountPrice: document.getElementById("p-discount").value ? Number(document.getElementById("p-discount").value) : null,
    stock: Number(document.getElementById("p-stock").value) || 0,
    images, imageUrl: images[0],
    variants: validVariants,
    isTopProduct: document.getElementById("p-top-product").checked,
    isTopSale: document.getElementById("p-top-sale").checked,
    status: document.getElementById("p-status").value,
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
