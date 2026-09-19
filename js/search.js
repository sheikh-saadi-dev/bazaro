import { fetchPublishedProducts } from "./products.js";
import { bdt, escapeHtml, debounce } from "./utils.js";

const CACHE_KEY = "bazaro_search_products_cache";
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getSearchableProducts() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (raw) {
      const { value, at } = JSON.parse(raw);
      if (Date.now() - at < CACHE_TTL_MS) return value;
    }
  } catch (e) {}
  let list = [];
  try { list = await fetchPublishedProducts(); } catch (e) {}
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ value: list, at: Date.now() })); } catch (e) {}
  return list;
}

function iconSearch() {
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`;
}

export function mountSearchTrigger(hostSelector = "#search-trigger-btn") {
  const btn = document.querySelector(hostSelector);
  if (!btn) return;
  btn.innerHTML = iconSearch();
  btn.addEventListener("click", openSearchOverlay);
}

function openSearchOverlay() {
  if (document.getElementById("search-overlay")) return;

  const backdrop = document.createElement("div");
  backdrop.className = "search-overlay-backdrop";
  backdrop.id = "search-overlay";
  backdrop.innerHTML = `
    <div class="search-panel" role="dialog" aria-modal="true">
      <div class="search-panel-input-row">
        ${iconSearch()}
        <input type="search" id="global-search-input" placeholder="Search products by name…" autofocus>
        <button class="search-panel-close" id="search-close-btn" aria-label="Close search">✕</button>
      </div>
      <div class="search-results" id="search-results">
        <div class="search-hint">Start typing to search products…</div>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);
  document.body.style.overflow = "hidden";

  const close = () => { backdrop.remove(); document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
  backdrop.querySelector("#search-close-btn").addEventListener("click", close);
  document.addEventListener("keydown", onKey);

  const input = backdrop.querySelector("#global-search-input");
  const resultsHost = backdrop.querySelector("#search-results");
  let allProducts = null;

  const runSearch = debounce(async (raw) => {
    const q = raw.trim().toLowerCase();
    if (!q) { resultsHost.innerHTML = `<div class="search-hint">Start typing to search products…</div>`; return; }
    if (!allProducts) allProducts = await getSearchableProducts();

    const matches = allProducts.filter(p =>
      (p.name || "").toLowerCase().includes(q) ||
      (p.categoryName || "").toLowerCase().includes(q)
    ).slice(0, 40);

    if (!matches.length) {
      resultsHost.innerHTML = `<div class="search-empty">No products found for "${escapeHtml(raw)}".</div>`;
      return;
    }

    const shown = matches.slice(0, 8);
    resultsHost.innerHTML = shown.map(p => {
      const img = (p.images && p.images[0]) || p.imageUrl || "https://placehold.co/100x100?text=Product";
      const price = p.discountPrice && p.discountPrice < p.price ? p.discountPrice : p.price;
      return `
        <div class="search-result-row" data-id="${p.id}">
          <img src="${img}" alt="${escapeHtml(p.name)}">
          <div class="grow">
            <strong>${escapeHtml(p.name)}</strong>
            <span>${escapeHtml(p.categoryName || "")}</span>
          </div>
          <div class="search-result-price">${bdt(price)}</div>
        </div>`;
    }).join("") + (matches.length > shown.length ? `<a class="search-view-all" href="products.html?search=${encodeURIComponent(raw)}">View all ${matches.length} results →</a>` : "");

    resultsHost.querySelectorAll("[data-id]").forEach(row => {
      row.addEventListener("click", () => { window.location.href = `product.html?id=${row.dataset.id}`; });
    });
  }, 200);

  input.addEventListener("input", (e) => runSearch(e.target.value));
}
