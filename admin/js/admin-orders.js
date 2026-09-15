import { requireAdmin } from "./admin-auth.js";
import { mountAdminLayout } from "./admin-layout.js";
import { db, collection, getDocs, doc, updateDoc, deleteDoc } from "../../js/firebase.js";
import { bdt, escapeHtml, toast } from "../../js/utils.js";
import { confirmModal } from "./admin-ui.js";

await requireAdmin();
mountAdminLayout("orders.html");

let orders = [];
let statusFilter = "";
let searchTerm = "";

async function load() {
  const snap = await getDocs(collection(db, "orders"));
  orders = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  render();
}

function render() {
  let list = statusFilter ? orders.filter(o => o.status === statusFilter) : orders;
  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    list = list.filter(o => o.id.toLowerCase().includes(q) || (o.customerName || "").toLowerCase().includes(q) || (o.phone || "").includes(q));
  }
  const tbody = document.getElementById("orders-tbody");
  tbody.innerHTML = list.length ? list.map(o => `
    <tr>
      <td data-label="Order ID">#${o.id.slice(0, 8)}</td>
      <td data-label="Customer">${escapeHtml(o.customerName || "")}</td>
      <td data-label="Phone">${escapeHtml(o.phone || "")}</td>
      <td data-label="Total">${bdt(o.total)}</td>
      <td data-label="Status"><span class="status-badge status-${o.status}">${o.status[0].toUpperCase() + o.status.slice(1)}</span></td>
      <td data-label="Date">${o.createdAt?.toDate ? o.createdAt.toDate().toLocaleDateString() : ""}</td>
      <td data-label="Actions">
        <button class="action-link" data-view="${o.id}">View</button>
        <button class="action-link danger" data-del="${o.id}">Delete</button>
      </td>
    </tr>`).join("") : `<tr><td colspan="7"><div class="empty-state">No orders found.</div></td></tr>`;

  tbody.querySelectorAll("[data-view]").forEach(b => b.addEventListener("click", () => openDetail(orders.find(o => o.id === b.dataset.view))));
  tbody.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", async () => {
    const ok = await confirmModal("Delete this order?", "This can't be undone.");
    if (!ok) return;
    await deleteDoc(doc(db, "orders", b.dataset.del));
    toast("Order deleted.");
    load();
  }));
}

function openDetail(order) {
  const backdrop = document.createElement("div");
  backdrop.className = "drawer-form-backdrop";
  backdrop.innerHTML = `
    <div class="drawer-form" role="dialog" aria-modal="true">
      <h3>Order #${order.id.slice(0, 8)}</h3>
      <p class="muted" style="margin:0 0 10px;">${order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : ""}</p>
      <div class="summary-row"><span>Customer</span><span>${escapeHtml(order.customerName || "")}</span></div>
      <div class="summary-row"><span>Phone</span><span>${escapeHtml(order.phone || "")}</span></div>
      ${order.email ? `<div class="summary-row"><span>Email</span><span>${escapeHtml(order.email)}</span></div>` : ""}
      <div class="summary-row"><span>Address</span><span style="text-align:right;max-width:220px;">${escapeHtml(order.address || "")}, ${escapeHtml(order.area || "")}, ${escapeHtml(order.district || "")}</span></div>
      <h3 style="font-size:.95rem;margin-top:16px;">Items</h3>
      ${(order.items || []).map(i => `
        <div class="summary-row"><span>${escapeHtml(i.name)} × ${i.qty}${i.variant ? ` (${Object.values(i.variant).join(", ")})` : ""}</span><span>${bdt(i.subtotal)}</span></div>
      `).join("")}
      <div class="summary-row"><span>Subtotal</span><span>${bdt(order.subtotal)}</span></div>
      <div class="summary-row"><span>Delivery (${order.deliveryLocation})</span><span>${bdt(order.deliveryCharge)}</span></div>
      ${order.couponCode ? `<div class="summary-row"><span>Coupon (${order.couponCode})</span><span>-${bdt(order.discount)}</span></div>` : ""}
      <div class="summary-row total"><span>Total</span><span>${bdt(order.total)}</span></div>
      <div class="summary-row"><span>Payment method</span><span>${escapeHtml(order.paymentMethod)}</span></div>

      <h3 style="font-size:.95rem;margin-top:16px;">Update status</h3>
      <div class="field"><select id="status-select">
        <option value="pending" ${order.status === "pending" ? "selected" : ""}>Pending</option>
        <option value="confirmed" ${order.status === "confirmed" ? "selected" : ""}>Confirmed</option>
        <option value="delivered" ${order.status === "delivered" ? "selected" : ""}>Delivered</option>
      </select></div>
      <div class="drawer-form-actions">
        <button class="btn btn-outline" id="close-btn">Close</button>
        <button class="btn btn-primary" id="save-status-btn">Update status</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);
  const close = () => backdrop.remove();
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
  backdrop.querySelector("#close-btn").addEventListener("click", close);
  backdrop.querySelector("#save-status-btn").addEventListener("click", async () => {
    const status = backdrop.querySelector("#status-select").value;
    await updateDoc(doc(db, "orders", order.id), { status, updatedAt: new Date() });
    toast("Order status updated.");
    close();
    load();
  });
}

document.getElementById("status-tabs").addEventListener("click", (e) => {
  if (e.target.tagName !== "BUTTON") return;
  document.querySelectorAll("#status-tabs button").forEach(b => b.classList.remove("active"));
  e.target.classList.add("active");
  statusFilter = e.target.dataset.status;
  render();
});
document.getElementById("search-input").addEventListener("input", (e) => { searchTerm = e.target.value; render(); });

load();
