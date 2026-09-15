export function bdt(n) {
  const v = Number(n) || 0;
  return "৳" + v.toLocaleString("en-BD", { maximumFractionDigits: 0 });
}

export function toast(msg, kind = "default") {
  let host = document.getElementById("toast-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "toast-host";
    document.body.appendChild(host);
  }
  const el = document.createElement("div");
  el.className = `toast toast-${kind}`;
  el.textContent = msg;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 250);
  }, 2600);
}

export function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function qs(sel, root = document) { return root.querySelector(sel); }
export function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }

export function debounce(fn, ms = 250) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ---- Guest cart / wishlist persisted in localStorage; merged into Firestore on login ----
const CART_KEY = "bazaro_cart_v1";
const WISH_KEY = "bazaro_wishlist_v1";

export function getLocalCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; }
}
export function setLocalCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("cart:changed"));
}
export function getLocalWishlist() {
  try { return JSON.parse(localStorage.getItem(WISH_KEY)) || []; } catch { return []; }
}
export function setLocalWishlist(items) {
  localStorage.setItem(WISH_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("wishlist:changed"));
}

export function cartLineKey(productId, variant) {
  return productId + "::" + (variant ? JSON.stringify(variant) : "");
}
