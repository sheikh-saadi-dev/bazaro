import { auth, db, doc, getDoc, setDoc, onAuthStateChanged } from "./firebase.js";
import { getLocalWishlist, setLocalWishlist, toast } from "./utils.js";

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
  const guest = getLocalWishlist();
  currentUser = user;
  if (user) {
    const ref = doc(db, "wishlists", user.uid);
    const snap = await getDoc(ref);
    const remote = snap.exists() ? (snap.data().productIds || []) : [];
    const merged = [...new Set([...remote, ...guest])];
    setLocalWishlist(merged);
    await setDoc(ref, { productIds: merged }, { merge: true });
  }
});

async function persist(ids) {
  setLocalWishlist(ids);
  if (currentUser) await setDoc(doc(db, "wishlists", currentUser.uid), { productIds: ids }, { merge: true });
}

export function isWishlisted(productId) {
  return getLocalWishlist().includes(productId);
}

export function toggleWishlist(productId) {
  const ids = getLocalWishlist();
  const idx = ids.indexOf(productId);
  if (idx > -1) { ids.splice(idx, 1); persist(ids); toast("Removed from wishlist."); }
  else { ids.push(productId); persist(ids); toast("Added to wishlist."); }
  return ids.includes(productId);
}
