import { db, collection, getDocs, query, where, doc, getDoc } from "./firebase.js";
import { bdt, escapeHtml } from "./utils.js";
import { isWishlisted, toggleWishlist } from "./wishlist.js";
import { addToCart } from "./cart.js";

const heartIcon = (filled) => `<svg viewBox="0 0 24 24" fill="${filled ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.8"><path d="M12.1 20.6 3.9 12.9C1.4 10.5 1.7 6.4 4.6 4.5c2.2-1.5 5-1 6.7 1l.7.8.7-.8c1.7-2 4.5-2.5 6.7-1 2.9 1.9 3.2 6 0.7 8.4l-8.2 7.7Z"/></svg>`;

export async function fetchPublishedProducts() {
  const snap = await getDocs(query(collection(db, "products"), where("status", "==", "published")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function fetchCategories(activeOnly = true) {
  const col = collection(db, "categories");
  const snap = await getDocs(activeOnly ? query(col, where("active", "==", true)) : col);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function fetchProduct(id) {
  const snap = await getDoc(doc(db, "products", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function productCard(p) {
  const img = (p.images && p.images[0]) || p.imageUrl || "https://placehold.co/400x400?text=Product";
  const hasDiscount = p.discountPrice && p.discountPrice < p.price;
  const pct = hasDiscount ? Math.round((1 - p.discountPrice / p.price) * 100) : 0;
  const outOfStock = (p.stock ?? 0) <= 0;
  const wished = isWishlisted(p.id);
  return `
  <article class="card-product" data-id="${p.id}">
    <a href="product.html?id=${p.id}" class="card-media">
      <img src="${img}" alt="${escapeHtml(p.name)}" loading="lazy">
      ${hasDiscount ? `<span class="badge-discount">-${pct}%</span>` : ""}
      ${outOfStock ? `<span class="badge-oos">Out of stock</span>` : ""}
      <button class="card-wish ${wished ? "active" : ""}" data-wish="${p.id}" aria-label="Toggle wishlist">${heartIcon(wished)}</button>
    </a>
    <div class="card-body">
      <div class="card-cat">${escapeHtml(p.categoryName || "")}</div>
      <a href="product.html?id=${p.id}"><div class="card-name">${escapeHtml(p.name)}</div></a>
      <div class="card-price-row">
        <span class="price-now">${bdt(hasDiscount ? p.discountPrice : p.price)}</span>
        ${hasDiscount ? `<span class="price-old">${bdt(p.price)}</span>` : ""}
      </div>
    </div>
    <div class="card-actions">
      <button class="btn btn-outline btn-sm" data-view="${p.id}">View</button>
      <button class="btn btn-primary btn-sm" data-add="${p.id}" ${outOfStock ? "disabled" : ""}>${outOfStock ? "Out of stock" : "Add to cart"}</button>
    </div>
  </article>`;
}

export function wireProductCardEvents(root, products) {
  root.querySelectorAll("[data-wish]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const on = toggleWishlist(btn.dataset.wish);
      btn.classList.toggle("active", on);
      btn.innerHTML = heartIcon(on);
    });
  });
  root.querySelectorAll("[data-view]").forEach(btn => {
    btn.addEventListener("click", () => { window.location.href = `product.html?id=${btn.dataset.view}`; });
  });
  root.querySelectorAll("[data-add]").forEach(btn => {
    btn.addEventListener("click", () => {
      const p = products.find(pp => pp.id === btn.dataset.add);
      if (p) addToCart(p, null, 1);
    });
  });
}

export function sortProducts(list, mode) {
  const arr = [...list];
  switch (mode) {
    case "price-asc": return arr.sort((a, b) => (a.discountPrice || a.price) - (b.discountPrice || b.price));
    case "price-desc": return arr.sort((a, b) => (b.discountPrice || b.price) - (a.discountPrice || a.price));
    case "newest": return arr.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    case "best-selling": return arr.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
    default: return arr.sort((a, b) => (b.isTopProduct === true) - (a.isTopProduct === true));
  }
}
export function mountPriceRange(hostId, products, onChange) {
  const host = document.getElementById(hostId);
  if (!host) return null;
  const prices = products.map(p => p.discountPrice || p.price).filter(n => typeof n === "number");
  const min = prices.length ? Math.floor(Math.min(...prices) / 50) * 50 : 0;
  const max = prices.length ? Math.max(min + 50, Math.ceil(Math.max(...prices) / 50) * 50) : 10000;

  host.innerHTML = `
    <div class="price-range-values"><span id="pr-min-label"></span><span id="pr-max-label"></span></div>
    <div class="range-slider">
      <div class="range-track"></div>
      <div class="range-fill" id="pr-fill"></div>
      <input type="range" id="pr-min" min="${min}" max="${max}" step="50" value="${min}">
      <input type="range" id="pr-max" min="${min}" max="${max}" step="50" value="${max}">
    </div>
  `;

  const minInput = host.querySelector("#pr-min");
  const maxInput = host.querySelector("#pr-max");
  const fill = host.querySelector("#pr-fill");
  const minLabel = host.querySelector("#pr-min-label");
  const maxLabel = host.querySelector("#pr-max-label");

  function paint(fire) {
    let lo = +minInput.value, hi = +maxInput.value;
    if (lo > hi) { [lo, hi] = [hi, lo]; minInput.value = lo; maxInput.value = hi; }
    const span = (max - min) || 1;
    fill.style.left = (((lo - min) / span) * 100) + "%";
    fill.style.width = (((hi - lo) / span) * 100) + "%";
    minLabel.textContent = `৳${lo}`;
    maxLabel.textContent = `৳${hi}`;
    if (fire) onChange(lo === min ? null : lo, hi === max ? null : hi);
  }
  minInput.addEventListener("input", () => paint(true));
  maxInput.addEventListener("input", () => paint(true));
  paint(false);

  return { reset: () => { minInput.value = min; maxInput.value = max; paint(false); } };
}
