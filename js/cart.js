import { auth, db, doc, getDoc, setDoc, onAuthStateChanged } from "./firebase.js";
import { getLocalCart, setLocalCart, cartLineKey, toast } from "./utils.js";

let currentUser = null;
let ready = false;
const readyWaiters = [];

const MERGE_FLAG_KEY = "bazaro_cart_merge_done_uid";

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    const ref = doc(db, "carts", user.uid);
    const snap = await getDoc(ref);
    const remoteItems = snap.exists() ? (snap.data().items || []) : [];
    const alreadyMerged = localStorage.getItem(MERGE_FLAG_KEY) === user.uid;

    if (!alreadyMerged) {
      // First time this device sees this user logged in — merge any guest cart in, once.
      const guestCart = getLocalCart();
      const merged = mergeCarts(remoteItems, guestCart);
      setLocalCart(merged);
      await setDoc(ref, { items: merged, updatedAt: new Date().toISOString() }, { merge: true });
      localStorage.setItem(MERGE_FLAG_KEY, user.uid);
    } else {
      // Already synced before — just trust Firestore, don't re-merge/re-sum.
      setLocalCart(remoteItems);
    }
  } else {
    localStorage.removeItem(MERGE_FLAG_KEY);
  }
  ready = true;
  readyWaiters.splice(0).forEach(fn => fn());
});

function mergeCarts(a, b) {
  const map = new Map();
  [...a, ...b].forEach(item => {
    const key = cartLineKey(item.productId, item.variant);
    if (map.has(key)) map.get(key).qty += item.qty;
    else map.set(key, { ...item });
  });
  return [...map.values()];
}

async function persist(items) {
  setLocalCart(items);
  if (currentUser) {
    await setDoc(doc(db, "carts", currentUser.uid), { items, updatedAt: new Date().toISOString() }, { merge: true });
  }
}

export function addToCart(product, variant, qty = 1) {
  const items = getLocalCart();
  const key = cartLineKey(product.id, variant);
  const existing = items.find(i => cartLineKey(i.productId, i.variant) === key);
  const maxStock = product.stock ?? Infinity;
  if (existing) {
    existing.qty = Math.min(existing.qty + qty, maxStock);
  } else {
    items.push({
      productId: product.id,
      name: product.name,
      image: (product.images && product.images[0]) || product.imageUrl || "",
      price: product.discountPrice || product.price,
      variant: variant || null,
      qty: Math.min(qty, maxStock),
      stock: maxStock
    });
  }
  persist(items);
  toast("Added to cart.");
}

export function removeFromCart(productId, variant) {
  const items = getLocalCart().filter(i => cartLineKey(i.productId, i.variant) !== cartLineKey(productId, variant));
  persist(items);
  toast("Removed from cart.");
}

export function updateQty(productId, variant, qty) {
  const items = getLocalCart();
  const line = items.find(i => cartLineKey(i.productId, i.variant) === cartLineKey(productId, variant));
  if (!line) return;
  line.qty = Math.max(1, Math.min(qty, line.stock ?? 999));
  persist(items);
}

export function clearCart() {
  persist([]);
}

export function cartTotals(items, deliveryCharge = 0, discount = 0) {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const total = Math.max(0, subtotal + deliveryCharge - discount);
  return { subtotal, deliveryCharge, discount, total };
}

export function onCartReady(fn) {
  if (ready) fn(); else readyWaiters.push(fn);
}
