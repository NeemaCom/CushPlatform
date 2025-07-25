// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

// Your web app's Firebase configuration - Using Firebase domain
const firebaseConfig = {
  apiKey: "AIzaSyD06ZHGJlv-1g0WqfymtGkiHAHeX1O1UGI",
  authDomain: "cushportal.firebaseapp.com",
  projectId: "cushportal",
  storageBucket: "cushportal.firebasestorage.app",
  messagingSenderId: "304174661302",
  appId: "1:304174661302:web:8bc1e5f413aae91336f017",
  measurementId: "G-VGYNJNCJ2F"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

// Configure Google provider with standard settings
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('openid');
googleProvider.addScope('email');
googleProvider.addScope('profile');
// Standard provider configuration
googleProvider.setCustomParameters({
  'prompt': 'select_account'
});

export { auth, googleProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged };