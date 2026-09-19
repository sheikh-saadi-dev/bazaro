import { initTheme, toggleTheme } from "./theme.js";
import { auth, onAuthStateChanged, signOut, db, doc, getDoc, collection, getDocs, query, where } from "./firebase.js";
import { getLocalCart, getLocalWishlist, toast } from "./utils.js";
import { mountSearchTrigger } from "./search.js";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function readCache(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { value, at } = JSON.parse(raw);
    if (Date.now() - at > CACHE_TTL_MS) return null;
    return value;
  } catch (e) { return null; }
}
function writeCache(key, value) {
  try { sessionStorage.setItem(key, JSON.stringify({ value, at: Date.now() })); } catch (e) {}
}

async function getStoreSettings() {
  const cached = readCache("bazaro_cache_settings");
  if (cached) return cached;
  let s = {};
  try {
    const snap = await getDoc(doc(db, "settings", "store"));
    if (snap.exists()) s = snap.data();
  } catch (e) {}
  writeCache("bazaro_cache_settings", s);
  return s;
}

async function getActiveCategories() {
  const cached = readCache("bazaro_cache_categories");
  if (cached) return cached;
  let list = [];
  try {
    const snap = await getDocs(query(collection(db, "categories"), where("active", "==", true)));
    list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {}
  writeCache("bazaro_cache_categories", list);
  return list;
}

async function getActivePaymentMethods() {
  const cached = readCache("bazaro_cache_payments");
  if (cached) return cached;
  let list = [];
  try {
    const snap = await getDocs(query(collection(db, "paymentMethods"), where("active", "==", true)));
    list = snap.docs.map(d => d.data());
  } catch (e) {}
  writeCache("bazaro_cache_payments", list);
  return list;
}

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
function iconHome() {
  return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M3.5 10.5 12 3.5l8.5 7v9a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1Z"/></svg>`;
}
function iconMenu() {
  return `<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>`;
}
function iconChat() {
  return `<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 12a8 8 0 1 1 3.2 6.4L4 20l1.3-3.4A7.96 7.96 0 0 1 4 12Z"/></svg>`;
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
          <a href="products.html" class="${activePage === "products" ? "active" : ""}">Shop</a>
          <a href="products.html">Categories</a>
          <a href="products.html?filter=topsale">Deals</a>
          <a href="products.html?sort=newest">New Arrivals</a>
        </nav>
        <div class="nav-actions">
          <button class="icon-btn" id="search-trigger-btn" aria-label="Search"></button>
          <button class="theme-toggle icon-btn" id="theme-btn" aria-label="Toggle dark mode">${iconSun()}</button>
          <a class="icon-wrap icon-btn" href="cart.html" aria-label="Wishlist" id="wish-icon">${iconHeart()}<span class="badge-count" id="wish-count" hidden>0</span></a>
          <a class="icon-wrap icon-btn" href="cart.html" aria-label="Cart" id="cart-icon">${iconCart()}<span class="badge-count" id="cart-count" hidden>0</span></a>
          <a class="icon-btn" href="account.html" aria-label="Account" id="nl-account">${iconUser()}</a>
          <button class="icon-btn hamburger" id="hamburger-btn" aria-label="Open menu" aria-expanded="false">${iconMenu()}</button>
        </div>
      </div>
    </header>
    <div class="mobile-drawer" id="mobile-drawer">
      <div class="drawer-backdrop"></div>
      <div class="drawer-panel" role="dialog" aria-modal="true">
        <button class="icon-btn drawer-close" id="drawer-close" aria-label="Close menu">✕</button>
        <a href="index.html">Home</a>
        <a href="products.html">Shop</a>
        <a href="products.html">Categories</a>
        <a href="products.html?filter=topsale">Deals</a>
        <a href="products.html?sort=newest">New Arrivals</a>
        <a href="cart.html">Wishlist</a>
        <a href="cart.html">Cart</a>
        <a href="account.html">Account</a>
      </div>
    </div>
  `;

  const themeBtn = document.getElementById("theme-btn");
  const syncThemeIcon = () => { themeBtn.innerHTML = document.documentElement.getAttribute("data-theme") === "dark" ? iconMoon() : iconSun(); };
  syncThemeIcon();
  themeBtn.addEventListener("click", () => { toggleTheme(); syncThemeIcon(); });

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
    if (!user) document.querySelectorAll('a[href="account.html"]').forEach(a => a.setAttribute("href", "login.html"));
  });

  applyStoreBranding();
  mountMobileBottomNav(activePage);
  mountSearchTrigger();
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

async function applyStoreBranding() {
  const s = await getStoreSettings();
  if (!s.storeName) return;
  document.querySelectorAll(".logo").forEach(el => { el.innerHTML = s.storeName + '<span>.</span>'; });
  if (document.title.includes("Bazaro")) document.title = document.title.replace(/Bazaro/g, s.storeName);
}

async function mountMobileBottomNav(activePage) {
  if (document.getElementById("mobile-bottom-nav")) return;
  const s = await getStoreSettings();
  const rawPhone = (s.whatsapp || s.phone || "").replace(/[^\d]/g, "");
  const waNumber = rawPhone.startsWith("0") ? "880" + rawPhone.slice(1) : rawPhone;

  const nav = document.createElement("div");
  nav.className = "mobile-bottom-nav";
  nav.id = "mobile-bottom-nav";
  nav.innerHTML = `
    <button class="mbn-item" id="mbn-category">${iconMenu()}<span>Category</span></button>
    <a class="mbn-item" href="${waNumber ? `https://wa.me/${waNumber}` : "contact.html"}" target="${waNumber ? "_blank" : "_self"}" rel="noopener">${iconChat()}<span>WhatsApp</span></a>
    <a class="mbn-item mbn-home ${activePage === "home" ? "active" : ""}" href="index.html">
      <span class="mbn-home-btn">${iconHome()}</span><span>Home</span>
    </a>
    <a class="mbn-item" href="cart.html" id="mbn-cart">${iconCart()}<span id="mbn-cart-label">Cart (0)</span></a>
    <a class="mbn-item" href="account.html" id="mbn-account">${iconUser()}<span>Login</span></a>
  `;
  document.body.appendChild(nav);

  document.getElementById("mbn-category").addEventListener("click", () => { document.getElementById("hamburger-btn")?.click(); });

  function refreshMbnCart() {
    const qty = getLocalCart().reduce((sum, i) => sum + i.qty, 0);
    document.getElementById("mbn-cart-label").textContent = `Cart (${qty})`;
  }
  refreshMbnCart();
  window.addEventListener("cart:changed", refreshMbnCart);

  onAuthStateChanged(auth, (user) => {
    const acc = document.getElementById("mbn-account");
    if (user) { acc.setAttribute("href", "account.html"); acc.querySelector("span").textContent = "Account"; }
    else { acc.setAttribute("href", "login.html"); acc.querySelector("span").textContent = "Login"; }
  });
}

export async function mountFooter(settings = {}) {
  const host = document.getElementById("app-footer");
  if (!host) return;
  const stored = await getStoreSettings();
  const s = {
    storeName: "Bazaro", description: "Everyday goods, picked for quality and delivered across Bangladesh.",
    phone: "+880 1XXX-XXXXXX", email: "support@bazaro.example", address: "Dhaka, Bangladesh",
    facebook: "#", instagram: "#", youtube: "#", ...stored, ...settings
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
        <div><h4>Quick Links</h4><ul>
          <li><a href="products.html?sort=newest">New Arrivals</a></li>
          <li><a href="products.html?filter=topsale">Deals</a></li>
          <li><a href="cart.html">Wishlist</a></li>
          <li><a href="account.html">Track Order</a></li>
        </ul></div>
        <div><h4>Categories</h4><ul id="footer-categories"><li class="muted">Loading…</li></ul></div>
        <div>
          <h4>Contact</h4>
          <ul><li>${s.phone}</li><li>${s.email}</li><li>${s.address}</li></ul>
          <div class="payment-row" id="footer-payments"></div>
        </div>
      </div>
      <div class="footer-bottom">© ${new Date().getFullYear()} ${s.storeName}. All rights reserved.</div>
    </footer>
  `;
  loadFooterCategories();
  loadFooterPayments();
}

async function loadFooterCategories() {
  const list = document.getElementById("footer-categories");
  if (!list) return;
  const cats = await getActiveCategories();
  list.innerHTML = cats.length ? cats.slice(0, 6).map(c => `<li><a href="products.html?category=${c.id}">${c.name}</a></li>`).join("") : '<li class="muted">No categories yet</li>';
}
async function loadFooterPayments() {
  const row = document.getElementById("footer-payments");
  if (!row) return;
  const methods = await getActivePaymentMethods();
  const names = methods.length ? methods.map(m => m.name) : ["Cash on Delivery"];
  row.innerHTML = names.map(n => `<span class="payment-pill">${n}</span>`).join("");
}

export { signOut, auth };
