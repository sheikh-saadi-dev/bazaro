import { auth, db, doc, getDoc, onAuthStateChanged, signOut } from "../../js/firebase.js";

// Gate every admin page: must be signed in AND have role "admin" on their users/{uid} doc.
// Real enforcement lives in Firestore Security Rules — this is UX-level gating only.
export function requireAdmin() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) { window.location.href = "index.html"; return; }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const role = snap.exists() ? snap.data().role : null;
        const status = snap.exists() ? snap.data().status : "active";
        if (role !== "admin" || status === "disabled") {
          await signOut(auth);
          window.location.href = "index.html?err=unauthorized";
          return;
        }
        resolve({ user, profile: snap.data() });
      } catch (e) {
        window.location.href = "index.html";
      }
    });
  });
}

export async function adminLogout() {
  await signOut(auth);
  window.location.href = "index.html";
}
