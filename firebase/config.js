// firebase/config.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBAEb1W5_xlPSwxYNt77_fZsXSHRuEmhq0",
  authDomain: "talmzo-attendance.firebaseapp.com",
  projectId: "talmzo-attendance",
  storageBucket: "talmzo-attendance.firebasestorage.app",
  messagingSenderId: "264925864306",
  appId: "1:264925864306:web:99a61550d13746ad197deb"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
