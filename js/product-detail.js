import { mountHeader, mountFooter } from "./layout.js";
import { fetchProduct } from "./products.js";
import { addToCart } from "./cart.js";
import { isWishlisted, toggleWishlist } from "./wishlist.js";
import { bdt, escapeHtml, toast } from "./utils.js";

mountHeader();
mountFooter();

const heartIcon = (filled) => `<svg viewBox="0 0 24 24" fill="${filled ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.8" width="18" height="18"><path d="M12.1 20.6 3.9 12.9C1.4 10.5 1.7 6.4 4.6 4.5c2.2-1.5 5-1 6.7 1l.7.8.7-.8c1.7-2 4.5-2.5 6.7-1 2.9 1.9 3.2 6 0.7 8.4l-8.2 7.7Z"/></svg>`;

const id = new URLSearchParams(location.search).get("id");
const root = document.getElementById("product-root");

let selectedVariant = {};

async function init() {
  if (!id) { renderMissing(); return; }
  let p;
  try { p = await fetchProduct(id); } catch (e) { renderMissing(); return; }
  if (!p || p.status !== "published") { renderMissing(); return; }
  render(p);
}

function renderMissing() {
  root.innerHTML = `<div class="empty-state"><p>This product isn't available anymore.</p><a class="btn btn-primary" href="products.html">Browse products</a></div>`;
}

function render(p) {
  document.getElementById("page-title").textContent = `${p.name} — Bazaro`;
  document.getElementById("meta-desc").setAttribute("content", (p.description || "").slice(0, 155));

  const images = (p.images && p.images.length) ? p.images : [p.imageUrl || "https://placehold.co/600x600?text=Product"];
  const hasDiscount = p.discountPrice && p.discountPrice < p.price;
  const outOfStock = (p.stock ?? 0) <= 0;
  const variants = p.variants || [];

  root.innerHTML = `
    <div class="product-detail">
      <div>
        <div class="gallery-main"><img id="main-img" src="${images[0]}" alt="${escapeHtml(p.name)}"></div>
        ${images.length > 1 ? `<div class="gallery-thumbs">${images.map((src, i) => `<img src="${src}" class="${i === 0 ? "active" : ""}" data-i="${i}">`).join("")}</div>` : ""}
      </div>
      <div>
        <div class="card-cat">${escapeHtml(p.categoryName || "")}</div>
        <h1 style="font-size:1.6rem">${escapeHtml(p.name)}</h1>
        <div class="pd-price">
          <span>${bdt(hasDiscount ? p.discountPrice : p.price)}</span>
          ${hasDiscount ? `<span class="price-old" style="font-size:1rem">${bdt(p.price)}</span>` : ""}
        </div>
        <span class="stock-pill ${outOfStock ? "stock-out" : "stock-in"}">${outOfStock ? "Out of stock" : `In stock (${p.stock})`}</span>
        <p style="margin-top:16px">${escapeHtml(p.description || "")}</p>
        <div id="variant-host"></div>
        <div style="display:flex;align-items:center;gap:14px;margin-top:16px;">
          <div class="qty-stepper">
            <button type="button" id="qty-dec">−</button>
            <input type="number" id="qty-input" value="1" min="1" max="${p.stock || 1}">
            <button type="button" id="qty-inc">+</button>
          </div>
          <button class="icon-btn" id="wish-btn" style="border:1px solid var(--border);border-radius:999px;">
            ${heartIcon(isWishlisted(p.id))} <span style="margin-left:6px;font-size:.85rem">Wishlist</span>
          </button>
        </div>
        <div class="pd-actions">
          <button class="btn btn-outline" id="add-cart-btn" ${outOfStock ? "disabled" : ""}>Add to cart</button>
          <button class="btn btn-primary" id="buy-now-btn" ${outOfStock ? "disabled" : ""}>Buy now</button>
        </div>
      </div>
    </div>
  `;

  // gallery
  root.querySelectorAll(".gallery-thumbs img").forEach(img => {
    img.addEventListener("click", () => {
      document.getElementById("main-img").src = img.src;
      root.querySelectorAll(".gallery-thumbs img").forEach(t => t.classList.remove("active"));
      img.classList.add("active");
    });
  });

  // variants
  const variantHost = document.getElementById("variant-host");
  if (variants.length) {
    variantHost.innerHTML = variants.map(v => `
      <div class="variant-group" data-group="${escapeHtml(v.name)}">
        <h5>${escapeHtml(v.name)}</h5>
        <div class="variant-options">
          ${v.options.map(opt => `<button type="button" class="variant-opt" data-group="${escapeHtml(v.name)}" data-value="${escapeHtml(opt)}">${escapeHtml(opt)}</button>`).join("")}
        </div>
      </div>`).join("");
    variantHost.querySelectorAll(".variant-opt").forEach(btn => {
      btn.addEventListener("click", () => {
        const group = btn.dataset.group;
        variantHost.querySelectorAll(`.variant-opt[data-group="${CSS.escape(group)}"]`).forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        selectedVariant[group] = btn.dataset.value;
      });
    });
  }

  function readyVariant() {
    if (!variants.length) return true;
    return variants.every(v => selectedVariant[v.name]);
  }

  const qtyInput = document.getElementById("qty-input");
  document.getElementById("qty-dec").addEventListener("click", () => { qtyInput.value = Math.max(1, +qtyInput.value - 1); });
  document.getElementById("qty-inc").addEventListener("click", () => { qtyInput.value = Math.min(p.stock || 999, +qtyInput.value + 1); });

  document.getElementById("wish-btn").addEventListener("click", (e) => {
    const on = toggleWishlist(p.id);
    e.currentTarget.innerHTML = `${heartIcon(on)} <span style="margin-left:6px;font-size:.85rem">Wishlist</span>`;
  });

  function handleAdd(goToCheckout) {
    if (!readyVariant()) { toast("Please select all product options.", "err"); return; }
    addToCart(p, variants.length ? { ...selectedVariant } : null, +qtyInput.value || 1);
    if (goToCheckout) window.location.href = "checkout.html";
  }
  document.getElementById("add-cart-btn").addEventListener("click", () => handleAdd(false));
  document.getElementById("buy-now-btn").addEventListener("click", () => handleAdd(true));
}

init();
