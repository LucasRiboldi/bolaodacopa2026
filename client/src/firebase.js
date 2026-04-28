import { initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA88zg4gWBC6khYsKS7UPmt6r1Dd1qryRM",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "bolao2026-695ec.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "bolao2026-695ec",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "bolao2026-695ec.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "902119426344",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:902119426344:web:fa2726e308bcaa6633681d",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

const normalizeDisplayName = (value, fallbackEmail = "") => {
  const trimmed = (value || "").trim();
  if (trimmed) {
    return trimmed;
  }

  if (fallbackEmail.includes("@")) {
    return fallbackEmail.split("@")[0];
  }

  return "Apostador";
};

export const ensureUserDocument = async (user, nickname) => {
  if (!user) {
    return null;
  }

  const displayName = normalizeDisplayName(nickname || user.displayName, user.email || "");
  const userRef = doc(db, "users", user.uid);

  await setDoc(
    userRef,
    {
      email: user.email || "",
      displayName,
      photoURL: user.photoURL || "",
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );

  return displayName;
};

export const updateUserNickname = async (user, nickname) => {
  if (!user) {
    return null;
  }

  const displayName = normalizeDisplayName(nickname, user.email || "");

  if (auth.currentUser && auth.currentUser.uid === user.uid) {
    await updateProfile(auth.currentUser, { displayName });
  }

  await setDoc(
    doc(db, "users", user.uid),
    {
      displayName,
      email: user.email || "",
      photoURL: user.photoURL || "",
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return displayName;
};

export const loginWithEmail = (email, password) => signInWithEmailAndPassword(auth, email, password);

export const registerWithEmail = async (email, password, displayName) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const nickname = normalizeDisplayName(displayName, email);

  await updateProfile(userCredential.user, { displayName: nickname });
  await ensureUserDocument(userCredential.user, nickname);

  return userCredential;
};
