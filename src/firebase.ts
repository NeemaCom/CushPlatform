import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  reload,
  signOut,
} from "firebase/auth";
import { firebaseConfig } from "@shared/firebase-config";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export {
  signInWithPopup,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  reload,
  signOut,
};
