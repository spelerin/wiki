import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAnqTbj57QwyTww3wgtG2RJ9nr8AGzSmSQ",
  authDomain: "pyupyu-3f062.firebaseapp.com",
  projectId: "pyupyu-3f062",
  storageBucket: "pyupyu-3f062.firebasestorage.app",
  messagingSenderId: "87433048178",
  appId: "1:87433048178:web:023065b0abe97dd92f92eb"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);