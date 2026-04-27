// src/firebase.js
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc 
} from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA88zg4gWBC6khYsKS7UPmt6r1Dd1qryRM",
  authDomain: "bolao2026-695ec.firebaseapp.com",
  projectId: "bolao2026-695ec",
  storageBucket: "bolao2026-695ec.firebasestorage.app",
  messagingSenderId: "902119426344",
  appId: "1:902119426344:web:fa2726e308bcaa6633681d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// Email/Password authentication functions
export const loginWithEmail = (email, password) => 
  signInWithEmailAndPassword(auth, email, password);

export const registerWithEmail = async (email, password, displayName) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  // Create user document in Firestore
  await setDoc(doc(db, "users", userCredential.user.uid), {
    email,
    displayName: displayName || email.split("@")[0],
    createdAt: new Date().toISOString(),
  });
  return userCredential;
};