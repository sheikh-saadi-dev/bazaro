import { mountHeader, mountFooter } from "./layout.js";
import {
  db, auth, collection, getDocs, getDoc, doc, query, where, addDoc, updateDoc, serverTimestamp
} from "./firebase.js";
import { getLocalCart, bdt, escapeHtml, toast } from "./utils.js";
import { cartTotals, clearCart } from "./cart.js";

mountHeader();
mountFooter();

const root = document.getElementById("checkout-root");
let settings = { deliveryInsideDhaka: 60, deliveryOutsideDhaka: 120 };
let paymentMethods = [];
let appliedCoupon = null;
let couponDiscount = 0;

async function loadSettings() {
  try {
    const snap = await getDoc(doc(db, "settings", "store"));
    if (snap.exists()) settings = { ...settings, ...snap.data() };
  } catch (e) {}
}
async function loadPaymentMethods() {
  try {
    const snap = await getDocs(query(collection(db, "paymentMethods"), where("active", "==", true)));
    paymentMethods = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {}
  if (!paymentMethods.length) paymentMethods = [{ id: "cod", name: "Cash on Delivery" }];
}

function render() {
  const items = getLocalCart();
  if (!items.length) {
    root.innerHTML = `<h1 class="display" style="font-size:1.7rem">Checkout</h1><div class="empty-state"><p>Your cart is empty.</p><a class="btn btn-primary" href="products.html">Continue shopping</a></div>`;
    return;
  }
  root.innerHTML = `
    <h1 class="display" style="font-size:1.7rem">Checkout</h1>
    <div class="checkout-grid">
      <form id="checkout-form" novalidate>
        <div class="form-grid">
          <div class="field"><label for="f-name">Full name</label><input id="f-name" required><div class="field-error"></div></div>
          <div class="field"><label for="f-phone">Mobile number</label><input id="f-phone" required pattern="^(\\+?880|0)1[3-9][0-9]{8}$"><div class="field-error"></div></div>
          <div class="field"><label for="f-email">Email (optional)</label><input id="f-email" type="email"><div class="field-error"></div></div>
          <div class="field"><label for="f-district">District</label><input id="f-district" required><div class="field-error"></div></div>
          <div class="field"><label for="f-area">Area / Thana</label><input id="f-area" required><div class="field-error"></div></div>
        </div>
        <div class="field" style="margin-top:10px;"><label for="f-address">Full delivery address</label><textarea id="f-address" rows="3" required></textarea><div class="field-error"></div></div>

        <h3 style="font-size:1rem;margin-top:20px;">Delivery location</h3>
        <label class="radio-card active"><input type="radio" name="loc" value="inside" checked> Inside Dhaka — ${bdt(settings.deliveryInsideDhaka)}</label>
        <label class="radio-card"><input type="radio" name="loc" value="outside"> Outside Dhaka — ${bdt(settings.deliveryOutsideDhaka)}</label>

        <h3 style="font-size:1rem;margin-top:20px;">Payment method</h3>
        <div id="payment-options">
          ${paymentMethods.map((m, i) => `<label class="radio-card ${i === 0 ? "active" : ""}"><input type="radio" name="pay" value="${m.id}" ${i === 0 ? "checked" : ""}> ${escapeHtml(m.name)}</label>`).join("")}
        </div>
      </form>

      <div class="summary-card">
        <h3 style="font-size:1rem;">Order summary</h3>
        <div id="summary-items"></div>
        <div class="coupon-row" style="margin:12px 0 4px;">
          <input class="field-input" id="coupon-input" placeholder="Coupon code">
          <button class="btn btn-outline btn-sm" id="apply-coupon-btn">Apply</button>
        </div>
        <div class="coupon-msg" id="coupon-msg"></div>
        <div class="summary-row"><span>Subtotal</span><span id="s-subtotal"></span></div>
        <div class="summary-row"><span>Delivery</span><span id="s-delivery"></span></div>
        <div class="summary-row"><span>Discount</span><span id="s-discount">−৳0</span></div>
        <div class="summary-row total"><span>Total</span><span id="s-total"></span></div>
        <button class="btn btn-primary btn-block" id="place-order-btn" style="margin-top:14px;">Place order</button>
      </div>
    </div>
  `;

  root.querySelectorAll('input[name="loc"]').forEach(r => r.addEventListener("change", () => {
    root.querySelectorAll('input[name="loc"]').forEach(x => x.closest(".radio-card").classList.toggle("active", x.checked));
    updateSummary();
  }));
  root.querySelectorAll('input[name="pay"]').forEach(r => r.addEventListener("change", () => {
    root.querySelectorAll('input[name="pay"]').forEach(x => x.closest(".radio-card").classList.toggle("active", x.checked));
  }));
  document.getElementById("apply-coupon-btn").addEventListener("click", applyCoupon);
  document.getElementById("place-order-btn").addEventListener("click", placeOrder);

  updateSummary();
}

function currentDeliveryCharge() {
  const loc = root.querySelector('input[name="loc"]:checked')?.value || "inside";
  return loc === "inside" ? (settings.deliveryInsideDhaka || 0) : (settings.deliveryOutsideDhaka || 0);
}

function updateSummary() {
  const items = getLocalCart();
  document.getElementById("summary-items").innerHTML = items.map(i => `
    <div class="summary-row"><span>${escapeHtml(i.name)} × ${i.qty}</span><span>${bdt(i.price * i.qty)}</span></div>
  `).join("");
  const delivery = currentDeliveryCharge();
  const { subtotal, total } = cartTotals(items, delivery, couponDiscount);
  document.getElementById("s-subtotal").textContent = bdt(subtotal);
  document.getElementById("s-delivery").textContent = bdt(delivery);
  document.getElementById("s-discount").textContent = "−" + bdt(couponDiscount);
  document.getElementById("s-total").textContent = bdt(total);
}

async function applyCoupon() {
  const code = document.getElementById("coupon-input").value.trim().toUpperCase();
  const msg = document.getElementById("coupon-msg");
  if (!code) return;
  try {
    const snap = await getDocs(query(collection(db, "coupons"), where("code", "==", code)));
    if (snap.empty) { msg.textContent = "Invalid coupon code."; msg.className = "coupon-msg err"; return; }
    const coupon = { id: snap.docs[0].id, ...snap.docs[0].data() };
    const now = new Date();
    const subtotal = cartTotals(getLocalCart()).subtotal;
    if (!coupon.active) { msg.textContent = "This coupon is no longer active."; msg.className = "coupon-msg err"; return; }
    if (coupon.startDate && now < new Date(coupon.startDate)) { msg.textContent = "This coupon isn't active yet."; msg.className = "coupon-msg err"; return; }
    if (coupon.expiryDate && now > new Date(coupon.expiryDate)) { msg.textContent = "This coupon has expired."; msg.className = "coupon-msg err"; return; }
    if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) { msg.textContent = `Minimum order of ${bdt(coupon.minOrderAmount)} required.`; msg.className = "coupon-msg err"; return; }
    if (coupon.usageLimit && (coupon.usedCount || 0) >= coupon.usageLimit) { msg.textContent = "This coupon has reached its usage limit."; msg.className = "coupon-msg err"; return; }

    let discount = coupon.discountType === "percentage" ? subtotal * (coupon.discountAmount / 100) : coupon.discountAmount;
    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
    discount = Math.min(discount, subtotal);

    appliedCoupon = coupon;
    couponDiscount = discount;
    msg.textContent = `Coupon applied: ${bdt(discount)} off.`;
    msg.className = "coupon-msg ok";
    toast("Coupon applied.");
    updateSummary();
  } catch (e) {
    msg.textContent = "Couldn't validate the coupon right now.";
    msg.className = "coupon-msg err";
  }
}

function validateForm() {
  let ok = true;
  const fields = [
    ["f-name", v => v.trim().length > 0, "Name is required."],
    ["f-phone", v => /^(\+?880|0)1[3-9][0-9]{8}$/.test(v.trim()), "Enter a valid Bangladeshi mobile number."],
    ["f-email", v => v.trim() === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), "Enter a valid email."],
    ["f-district", v => v.trim().length > 0, "District is required."],
    ["f-area", v => v.trim().length > 0, "Area/Thana is required."],
    ["f-address", v => v.trim().length > 0, "Address is required."],
  ];
  fields.forEach(([id, test, message]) => {
    const el = document.getElementById(id);
    const err = el.closest(".field").querySelector(".field-error");
    if (!test(el.value)) { err.textContent = message; el.classList.add("touched"); ok = false; }
    else { err.textContent = ""; }
  });
  return ok;
}

async function placeOrder() {
  if (!validateForm()) { toast("Please fix the highlighted fields.", "err"); return; }
  const btn = document.getElementById("place-order-btn");
  btn.disabled = true; btn.textContent = "Placing order…";

  try {
    const localItems = getLocalCart();
    if (!localItems.length) { toast("Your cart is empty.", "err"); return; }

    // Re-validate every item against live Firestore data — never trust cached client prices/stock.
    const verifiedItems = [];
    for (const item of localItems) {
      const pSnap = await getDoc(doc(db, "products", item.productId));
      if (!pSnap.exists() || pSnap.data().status !== "published") {
        toast(`"${item.name}" is no longer available — please review your cart.`, "err");
        window.location.href = "cart.html";
        return;
      }
      const p = pSnap.data();
      if ((p.stock ?? 0) < item.qty) {
        toast(`Only ${p.stock} of "${p.name}" left in stock — please update your cart.`, "err");
        window.location.href = "cart.html";
        return;
      }
      const truePrice = p.discountPrice && p.discountPrice < p.price ? p.discountPrice : p.price;
      verifiedItems.push({
        productId: item.productId, name: p.name, variant: item.variant || null,
        qty: item.qty, unitPrice: truePrice, subtotal: truePrice * item.qty
      });
    }

    const subtotal = verifiedItems.reduce((s, i) => s + i.subtotal, 0);
    const deliveryCharge = currentDeliveryCharge();
    const discount = appliedCoupon ? Math.min(couponDiscount, subtotal) : 0;
    const total = Math.max(0, subtotal + deliveryCharge - discount);
    const paymentMethod = root.querySelector('input[name="pay"]:checked')?.value || "cod";
    const deliveryLocation = root.querySelector('input[name="loc"]:checked')?.value || "inside";

    const orderData = {
      userId: auth.currentUser ? auth.currentUser.uid : null,
      customerName: document.getElementById("f-name").value.trim(),
      email: document.getElementById("f-email").value.trim(),
      phone: document.getElementById("f-phone").value.trim(),
      district: document.getElementById("f-district").value.trim(),
      area: document.getElementById("f-area").value.trim(),
      address: document.getElementById("f-address").value.trim(),
      items: verifiedItems,
      subtotal, deliveryLocation, deliveryCharge,
      couponCode: appliedCoupon ? appliedCoupon.code : null,
      discount, total, paymentMethod,
      status: "pending",
      createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    };

    const orderRef = await addDoc(collection(db, "orders"), orderData);

    // Decrement stock (best-effort client-side; move to a Cloud Function for guaranteed atomicity in production).
    for (const item of verifiedItems) {
      const pRef = doc(db, "products", item.productId);
      const pSnap = await getDoc(pRef);
      if (pSnap.exists()) {
        await updateDoc(pRef, { stock: Math.max(0, (pSnap.data().stock || 0) - item.qty) });
      }
    }
    if (appliedCoupon) {
      await updateDoc(doc(db, "coupons", appliedCoupon.id), { usedCount: (appliedCoupon.usedCount || 0) + 1 });
    }

    clearCart();
    sessionStorage.setItem("lastOrder", JSON.stringify({ id: orderRef.id, ...orderData, createdAt: null }));
    window.location.href = `order-success.html?id=${orderRef.id}`;
  } catch (e) {
    toast("Something went wrong placing your order. Please try again.", "err");
    btn.disabled = false; btn.textContent = "Place order";
  }
}

async function init() {
  await Promise.all([loadSettings(), loadPaymentMethods()]);
  render();
}
init();
