import { initTheme, toggleTheme } from "./theme.js";
import { auth, onAuthStateChanged, signOut, db, doc, getDoc } from "./firebase.js";
import { getLocalCart, getLocalWishlist, toast } from "./utils.js";

const NAV_LINKS = [
  { href: "index.html", label: "Home" },
  { href: "products.html", label: "Products" },
  { href: "cart.html", label: "Wishlist", wishlist: true },
];

function iconHeart(filled = false) {
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="${filled ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.8"><path d="M12.1 20.6 3.9 12.9C1.4 10.5 1.7 6.4 4.6 4.5c2.2-1.5 5-1 6.7 1l.7.8.7-.8c1.7-2 4.5-2.5 6.7-1 2.9 1.9 3.2 6 0.7 8.4l-8.2 7.7Z"/></svg>`;
}
function iconCart() {
  return `<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="21" r="1.4"/><circle cx="18" cy="21" r="1.4"/><path d="M2.5 3h2.4l2.2 11.4a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L20.5 7H6"/></svg>`;
}
function iconUser() {
  return `<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20.2c1.6-3.6 4.4-5.4 7.5-5.4s5.9 1.8 7.5 5.4"/></svg>`;
}
function iconSun() {
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19v2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2.5 12h2.4M19 12h2.4M4.9 19l1.7-1.7M17.4 6.6l1.7-1.7"/></svg>`;
}
function iconMoon() {
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.5 14.5a8.5 8.5 0 1 1-9-11 6.7 6.7 0 0 0 9 11Z"/></svg>`;
}

export function mountHeader(activePage = "") {
  initTheme();
  const host = document.getElementById("app-header");
  if (!host) return;
  host.innerHTML = `
    <header class="site-header">
      <div class="wrap nav">
        <a class="logo" href="index.html">Bazaro<span>.</span></a>
        <nav class="nav-links">
          <a href="index.html" class="${activePage === "home" ? "active" : ""}">Home</a>
          <a href="products.html" class="${activePage === "products" ? "active" : ""}">Products</a>
          <a href="cart.html" class="${activePage === "wishlist" ? "active" : ""}" id="nl-wishlist">Wishlist</a>
          <a href="account.html" class="${activePage === "account" ? "active" : ""}" id="nl-account">Account</a>
        </nav>
        <div class="nav-actions">
          <button class="theme-toggle icon-btn" id="theme-btn" aria-label="Toggle dark mode">${iconSun()}</button>
          <a class="icon-wrap icon-btn" href="cart.html" aria-label="Wishlist" id="wish-icon">${iconHeart()}<span class="badge-count" id="wish-count" hidden>0</span></a>
          <a class="icon-wrap icon-btn" href="cart.html" aria-label="Cart" id="cart-icon">${iconCart()}<span class="badge-count" id="cart-count" hidden>0</span></a>
          <a class="icon-btn" href="account.html" aria-label="Account">${iconUser()}</a>
          <button class="icon-btn hamburger" id="hamburger-btn" aria-label="Open menu" aria-expanded="false">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
          </button>
        </div>
      </div>
    </header>
    <div class="mobile-drawer" id="mobile-drawer">
      <div class="drawer-backdrop"></div>
      <div class="drawer-panel" role="dialog" aria-modal="true">
        <button class="icon-btn drawer-close" id="drawer-close" aria-label="Close menu">✕</button>
        <a href="index.html">Home</a>
        <a href="products.html">Products</a>
        <a href="cart.html">Wishlist</a>
        <a href="cart.html">Cart</a>
        <a href="account.html">Account</a>
        <a href="products.html">Categories</a>
      </div>
    </div>
  `;

  const themeBtn = document.getElementById("theme-btn");
  const syncThemeIcon = () => {
    themeBtn.innerHTML = document.documentElement.getAttribute("data-theme") === "dark" ? iconMoon() : iconSun();
  };
  syncThemeIcon();
  themeBtn.addEventListener("click", () => { toggleTheme(); syncThemeIcon(); });

  // mobile drawer
  const drawer = document.getElementById("mobile-drawer");
  const openDrawer = () => { drawer.classList.add("open"); document.getElementById("hamburger-btn").setAttribute("aria-expanded", "true"); document.body.style.overflow = "hidden"; };
  const closeDrawer = () => { drawer.classList.remove("open"); document.getElementById("hamburger-btn").setAttribute("aria-expanded", "false"); document.body.style.overflow = ""; };
  document.getElementById("hamburger-btn").addEventListener("click", openDrawer);
  document.getElementById("drawer-close").addEventListener("click", closeDrawer);
  drawer.querySelector(".drawer-backdrop").addEventListener("click", closeDrawer);
  drawer.querySelectorAll("a").forEach(a => a.addEventListener("click", closeDrawer));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });

  refreshCounts();
  window.addEventListener("cart:changed", refreshCounts);
  window.addEventListener("wishlist:changed", refreshCounts);

  onAuthStateChanged(auth, (user) => {
    const accLinks = [document.getElementById("nl-account")];
    accLinks.forEach(a => { if (a) a.textContent = user ? "Account" : "Login"; });
    if (!user) {
      document.querySelectorAll('a[href="account.html"]').forEach(a => a.setAttribute("href", "login.html"));
    }
  });
}

function refreshCounts() {
  const cart = getLocalCart();
  const wish = getLocalWishlist();
  const cc = document.getElementById("cart-count");
  const wc = document.getElementById("wish-count");
  const cartQty = cart.reduce((s, i) => s + i.qty, 0);
  if (cc) { cc.hidden = cartQty === 0; cc.textContent = cartQty; }
  if (wc) { wc.hidden = wish.length === 0; wc.textContent = wish.length; }
}

export function mountFooter(settings = {}) {
  const host = document.getElementById("app-footer");
  if (!host) return;
  const s = {
    storeName: "Bazaro",
    description: "Everyday goods, picked for quality and delivered across Bangladesh.",
    phone: "+880 1XXX-XXXXXX",
    email: "support@bazaro.example",
    address: "Dhaka, Bangladesh",
    facebook: "#", instagram: "#", youtube: "#",
    ...settings
  };
  host.innerHTML = `
    <footer class="site-footer">
      <div class="wrap footer-grid">
        <div>
          <div class="logo">${s.storeName}<span>.</span></div>
          <p>${s.description}</p>
          <div class="social-row">
            <a href="${s.facebook}" aria-label="Facebook">f</a>
            <a href="${s.instagram}" aria-label="Instagram">ig</a>
            <a href="${s.youtube}" aria-label="YouTube">yt</a>
          </div>
        </div>
        <div>
          <h4>Quick links</h4>
          <ul>
            <li><a href="index.html">Home</a></li>
            <li><a href="products.html">Products</a></li>
            <li><a href="cart.html">Wishlist</a></li>
            <li><a href="cart.html">Cart</a></li>
            <li><a href="account.html">Account</a></li>
          </ul>
        </div>
        <div>
          <h4>Categories</h4>
          <ul id="footer-categories"><li class="muted">Loading…</li></ul>
        </div>
        <div>
          <h4>Contact</h4>
          <ul>
            <li>${s.phone}</li>
            <li>${s.email}</li>
            <li>${s.address}</li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">© ${new Date().getFullYear()} ${s.storeName}. All rights reserved.</div>
    </footer>
  `;
  loadFooterCategories();
}

async function loadFooterCategories() {
  try {
    const { collection, getDocs, query, where } = await import("./firebase.js");
    const snap = await getDocs(query(collection(db, "categories"), where("active", "==", true)));
    const list = document.getElementById("footer-categories");
    if (!list) return;
    if (snap.empty) { list.innerHTML = '<li class="muted">No categories yet</li>'; return; }
    list.innerHTML = snap.docs.slice(0, 6).map(d => `<li><a href="products.html?category=${d.id}">${d.data().name}</a></li>`).join("");
  } catch (e) { /* footer categories are non-critical */ }
}

export { signOut, auth };
