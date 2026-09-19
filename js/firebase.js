// Central Firebase setup — imported by every page as an ES module.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, sendPasswordResetEmail, updateProfile, EmailAuthProvider,
  reauthenticateWithCredential, updatePassword, GoogleAuthProvider, signInWithPopup,
  sendEmailVerification, reload
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp, increment, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// TODO: replace with your own project's config (safe to keep public client keys here).
const firebaseConfig = {
  apiKey: "AIzaSyB_QTj1opQmNcoxqM3cXEwvxtQe52HVnD0",
  authDomain: "web-app-59b9b.firebaseapp.com",
  projectId: "web-app-59b9b",
  storageBucket: "web-app-59b9b.firebasestorage.app",
  messagingSenderId: "89773492981",
  appId: "1:89773492981:web:093921a00c27562d5893bc"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, sendPasswordResetEmail, updateProfile, EmailAuthProvider,
  reauthenticateWithCredential, updatePassword, GoogleAuthProvider, signInWithPopup,
  sendEmailVerification, reload,
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp, increment, writeBatch,
  ref, uploadBytes, getDownloadURL, deleteObject
};
