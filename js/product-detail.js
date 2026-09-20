import { mountHeader, mountFooter } from "./layout.js";
import { fetchProduct, fetchPublishedProducts, productCard, wireProductCardEvents } from "./products.js";
import { addToCart } from "./cart.js";
import { isWishlisted, toggleWishlist } from "./wishlist.js";
import { db, doc, getDoc } from "./firebase.js";
import { bdt, escapeHtml, toast } from "./utils.js";

mountHeader();
mountFooter();

const heartIcon = (filled) => `<svg viewBox="0 0 24 24" fill="${filled ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.8" width="18" height="18"><path d="M12.1 20.6 3.9 12.9C1.4 10.5 1.7 6.4 4.6 4.5c2.2-1.5 5-1 6.7 1l.7.8.7-.8c1.7-2 4.5-2.5 6.7-1 2.9 1.9 3.2 6 0.7 8.4l-8.2 7.7Z"/></svg>`;
const zoomIcon = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/><path d="M11 8v6M8 11h6"/></svg>`;

const id = new URLSearchParams(location.search).get("id");
const root = document.getElementById("product-root");
let selectedVariant = {};

async function init() {
  if (!id) { renderMissing(); return; }
  let p;
  try { p = await fetchProduct(id); } catch (e) { renderMissing(); return; }
  if (!p || p.status !== "published") { renderMissing(); return; }
  render(p);
  loadRelated(p);
}

function renderMissing() {
  root.innerHTML = `<div class="empty-state"><p>This product isn't available anymore.</p><a class="btn btn-primary" href="products.html">Browse products</a></div>`;
}

function starString(rating) {
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

function render(p) {
  document.getElementById("page-title").textContent = `${p.name} — Bazaro`;
  document.getElementById("meta-desc").setAttribute("content", (p.description || "").slice(0, 155));

  const images = (p.images && p.images.length) ? p.images : [p.imageUrl || "https://placehold.co/600x600?text=Product"];
  const hasDiscount = p.discountPrice && p.discountPrice < p.price;
  const pct = hasDiscount ? Math.round((1 - p.discountPrice / p.price) * 100) : 0;
  const outOfStock = (p.stock ?? 0) <= 0;
  const variants = p.variants || [];

  root.innerHTML = `
    <div class="product-detail">
      <div class="pd-media">
        ${images.length > 1 ? `<div class="pd-thumbs-col">${images.map((src, i) => `<img src="${src}" class="${i === 0 ? "active" : ""}" data-i="${i}">`).join("")}</div>` : ""}
        <div class="pd-main-wrap">
          <div class="gallery-main"><img id="main-img" src="${images[0]}" alt="${escapeHtml(p.name)}"></div>
          <button class="pd-zoom-btn" id="zoom-btn" aria-label="Zoom image">${zoomIcon}</button>
        </div>
      </div>
      <div>
        ${hasDiscount ? `<span class="badge-discount" style="position:static;display:inline-block;margin-bottom:8px;">New</span>` : ""}
        <h1 style="font-size:1.6rem">${escapeHtml(p.name)}</h1>
        ${p.rating ? `
          <div class="pd-rating-row">
            <span class="pd-stars">${starString(p.rating)}</span>
            <span class="pd-rating-count">${p.rating.toFixed(1)}${p.reviewCount ? ` (${p.reviewCount} reviews)` : ""}</span>
          </div>` : ""}
        <div class="pd-price">
          <span>${bdt(hasDiscount ? p.discountPrice : p.price)}</span>
          ${hasDiscount ? `<span class="price-old" style="font-size:1rem">${bdt(p.price)}</span><span class="badge-discount" style="position:static;display:inline-block;">-${pct}% OFF</span>` : ""}
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

        <div class="feature-row-inline">
          <div class="feature-item"><div class="feature-icon">🚚</div><div><strong style="font-size:.82rem;display:block;">Free Shipping</strong><span style="font-size:.74rem;color:var(--ink-soft);">On qualifying orders</span></div></div>
          <div class="feature-item"><div class="feature-icon">↩️</div><div><strong style="font-size:.82rem;display:block;">Easy Returns</strong><span style="font-size:.74rem;color:var(--ink-soft);">30-day return policy</span></div></div>
          <div class="feature-item"><div class="feature-icon">🔒</div><div><strong style="font-size:.82rem;display:block;">Secure Payment</strong><span style="font-size:.74rem;color:var(--ink-soft);">Cash on delivery</span></div></div>
        </div>
      </div>
    </div>

    <div class="pd-tabs" id="pd-tabs">
      <button class="pd-tab-btn active" data-tab="details">Details</button>
      <button class="pd-tab-btn" data-tab="materials">Materials</button>
      <button class="pd-tab-btn" data-tab="sizefit">Size &amp; Fit</button>
      <button class="pd-tab-btn" data-tab="shipping">Shipping &amp; Returns</button>
    </div>
    <div class="pd-tab-panel" id="pd-tab-panel"></div>

    ${p.detailImage ? `<div class="pd-banner-img"><img src="${p.detailImage}" alt=""></div>` : ""}

    <div class="section" style="padding-top:0;">
      <div class="section-head"><h2 style="font-size:1.2rem;">You May Also Like</h2></div>
      <div class="grid-products" id="related-grid"><div class="skel skel-card"></div><div class="skel skel-card"></div><div class="skel skel-card"></div><div class="skel skel-card"></div></div>
    </div>
  `;

  // gallery
  root.querySelectorAll(".pd-thumbs-col img").forEach(img => {
    img.addEventListener("click", () => {
      document.getElementById("main-img").src = img.src;
      root.querySelectorAll(".pd-thumbs-col img").forEach(t => t.classList.remove("active"));
      img.classList.add("active");
    });
  });
  document.getElementById("zoom-btn").addEventListener("click", () => {
    const backdrop = document.createElement("div");
    backdrop.className = "pd-lightbox-backdrop";
    backdrop.innerHTML = `<img src="${document.getElementById("main-img").src}" alt="">`;
    backdrop.addEventListener("click", () => backdrop.remove());
    document.body.appendChild(backdrop);
  });

  // tabs
  const tabContent = {
    details: p.description ? `<p>${escapeHtml(p.description)}</p>` : `<p>No additional details provided.</p>`,
    materials: p.materials ? `<p>${escapeHtml(p.materials)}</p>` : `<p>No materials information provided.</p>`,
    sizefit: p.sizeFit ? `<p>${escapeHtml(p.sizeFit)}</p>` : `<p>No size & fit information provided.</p>`,
    shipping: p.shippingReturns ? `<p>${escapeHtml(p.shippingReturns)}</p>` : `<p>Cash on delivery available. Contact us for return eligibility on this item.</p>`
  };
  const panel = document.getElementById("pd-tab-panel");
  panel.innerHTML = tabContent.details;
  document.getElementById("pd-tabs").addEventListener("click", (e) => {
    if (e.target.tagName !== "BUTTON") return;
    document.querySelectorAll(".pd-tab-btn").forEach(b => b.classList.remove("active"));
    e.target.classList.add("active");
    panel.innerHTML = tabContent[e.target.dataset.tab];
  });

  // variants
  const variantHost = document.getElementById("variant-host");
  if (variants.length) {
    variantHost.innerHTML = variants.map(v => {
      if (v.type === "color") {
        return `
        <div class="variant-group" data-group="${escapeHtml(v.name)}">
          <h5>${escapeHtml(v.name)}: <span class="pd-color-label" id="color-label-${escapeHtml(v.name)}" style="display:inline;"></span></h5>
          <div class="swatch-row">
            ${v.options.map(opt => `<span class="swatch" data-group="${escapeHtml(v.name)}" data-value="${escapeHtml(opt.value)}" style="background:${opt.hex}" title="${escapeHtml(opt.value)}"></span>`).join("")}
          </div>
        </div>`;
      }
      const opts = v.options.map(o => typeof o === "string" ? o : o.value);
      return `
        <div class="variant-group" data-group="${escapeHtml(v.name)}">
          <h5>${escapeHtml(v.name)}</h5>
          <div class="variant-options">
            ${opts.map(opt => `<button type="button" class="variant-opt" data-group="${escapeHtml(v.name)}" data-value="${escapeHtml(opt)}">${escapeHtml(opt)}</button>`).join("")}
          </div>
        </div>`;
    }).join("");

    variantHost.querySelectorAll(".variant-opt").forEach(btn => {
      btn.addEventListener("click", () => {
        const group = btn.dataset.group;
        variantHost.querySelectorAll(`.variant-opt[data-group="${CSS.escape(group)}"]`).forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        selectedVariant[group] = btn.dataset.value;
      });
    });
    variantHost.querySelectorAll(".swatch").forEach(sw => {
      sw.addEventListener("click", () => {
        const group = sw.dataset.group;
        variantHost.querySelectorAll(`.swatch[data-group="${CSS.escape(group)}"]`).forEach(s => s.classList.remove("active"));
        sw.classList.add("active");
        selectedVariant[group] = sw.dataset.value;
        const label = document.getElementById(`color-label-${group}`);
        if (label) label.textContent = sw.dataset.value;
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

async function loadRelated(p) {
  const host = document.getElementById("related-grid");
  try {
    const all = await fetchPublishedProducts();
    const related = all.filter(x => x.categoryId === p.categoryId && x.id !== p.id).slice(0, 4);
    host.innerHTML = related.length ? related.map(productCard).join("") : `<p class="muted">No related products yet.</p>`;
    wireProductCardEvents(host, related);
  } catch (e) {
    host.innerHTML = "";
  }
}

init();
