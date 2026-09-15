import {
  auth, db, doc, setDoc, getDoc, serverTimestamp,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile,
  sendPasswordResetEmail, signOut, onAuthStateChanged
} from "./firebase.js";

export async function registerUser({ name, email, phone, password }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  await setDoc(doc(db, "users", cred.user.uid), {
    name, email, phone: phone || "", address: "", role: "customer", status: "active",
    createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  });
  return cred.user;
}

export async function loginUser(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

export async function logoutUser() {
  return signOut(auth);
}

export function requireAuth(redirectTo = "login.html") {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (!user) { window.location.href = redirectTo + "?next=" + encodeURIComponent(location.pathname); }
      else resolve(user);
    });
  });
}

export function friendlyAuthError(code) {
  const map = {
    "auth/email-already-in-use": "An account already exists with this email.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/too-many-requests": "Too many attempts — please try again later."
  };
  return map[code] || "Something went wrong. Please try again.";
}

export { onAuthStateChanged, auth };
