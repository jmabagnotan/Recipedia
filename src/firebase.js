import { initializeApp } from "firebase/app";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  getRedirectResult, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDp8Tds3R9QnezVGqNNbJWIjSxshSFGgsM",
  authDomain: "recipedia-a37b0.firebaseapp.com",
  projectId: "recipedia-a37b0",
  storageBucket: "recipedia-a37b0.appspot.com",
  messagingSenderId: "459895287309",
  appId: "1:459895287309:web:2b6ddca1901172bd05af44",
  measurementId: "G-C8G95L2SNW",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

setPersistence(auth, browserLocalPersistence).catch(() => {});

export {
  auth, provider, signInWithPopup, signInWithRedirect, getRedirectResult,
  signOut, onAuthStateChanged
};
