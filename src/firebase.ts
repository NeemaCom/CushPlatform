import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD06ZHGJlv-1g0WqfymtGkiHAHeX1O1UGI",
  authDomain: "cushportal.firebaseapp.com",
  projectId: "cushportal",
  storageBucket: "cushportal.firebasestorage.app",
  messagingSenderId: "304174661302",
  appId: "1:304174661302:web:8bc1e5f413aae91336f017",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut };
