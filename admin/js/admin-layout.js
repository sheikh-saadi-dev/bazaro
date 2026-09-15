import { initTheme, toggleTheme } from "../../js/theme.js";
import { adminLogout } from "./admin-auth.js";

const NAV = [
  ["dashboard.html", "Dashboard"], ["products.html", "Products"], ["categories.html", "Categories"],
  ["orders.html", "Orders"], ["customers.html", "Customers"], ["coupons.html", "Coupons"],
  ["payment-methods.html", "Payment Methods"], ["sliders.html", "Sliders"],
  ["settings.html", "Settings"], ["change-password.html", "Change Password"]
];

export function mountAdminLayout(active) {
  initTheme();
  document.body.insertAdjacentHTML("afterbegin", `
    <div class="admin-topbar">
      <button class="icon-btn" id="admin-hamburger" aria-label="Open menu"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg></button>
      <strong>Bazaro Admin</strong>
      <button class="icon-btn" id="admin-theme-btn" aria-label="Toggle theme">◐</button>
    </div>
  `);
  const shell = document.getElementById("admin-shell");
  shell.insertAdjacentHTML("afterbegin", `
    <aside class="admin-sidebar" id="admin-sidebar">
      <div class="logo">Bazaro<span> Admin</span></div>
      ${NAV.map(([href, label]) => `<a href="${href}" class="${active === href ? "active" : ""}">${label}</a>`).join("")}
      <button class="nav-link" id="sidebar-logout" style="color:var(--danger);margin-top:10px;">Log out</button>
    </aside>
  `);
  document.getElementById("sidebar-logout").addEventListener("click", adminLogout);
  document.getElementById("admin-hamburger")?.addEventListener("click", () => {
    document.getElementById("admin-sidebar").classList.toggle("open");
  });
  document.getElementById("admin-theme-btn")?.addEventListener("click", toggleTheme);
}
